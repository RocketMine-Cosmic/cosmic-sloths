import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Auth: Base44 session. Wallet: from linked User.wallet_address.

// 429-aware retry for individual entity ops. Per-row failure no longer just
// drops the row — we retry up to 3× before giving up. This eliminated the
// "30/117 RunScore updates failed" we saw during peak hours.
async function with429Retry(fn) {
    let lastErr;
    for (let attempt = 0; attempt < 4; attempt++) {
        try { return await fn(); }
        catch (err) {
            lastErr = err;
            const status = err?.status || err?.response?.status;
            const msg = String(err?.message || '').toLowerCase();
            const is429 = status === 429 || msg.includes('rate limit') || msg.includes('429');
            if (!is429 || attempt === 3) throw err;
            const backoff = 300 * Math.pow(2, attempt) + Math.random() * 200;
            await new Promise(r => setTimeout(r, backoff));
        }
    }
    throw lastErr;
}

// Helper: update all records matching wallet_address with the given patch.
// Sequential with a tiny delay to avoid hitting the Base44 per-second rate limit
// (Hugo bug 2026-05-03: parallel updates of 700+ TokenSpendLog rows triggered 429s
// that left the rest of the sync — including the PlayerSave write — half-applied,
// which is why the player's chosen name kept "resetting" on reload).
// Each update now retries on 429 (was previously dropping silently).
async function bulkUpdateByWallet(entity, walletAddress, patch, label, cap = 500) {
    try {
        const records = await with429Retry(() => entity.filter({ wallet_address: walletAddress }));
        if (records.length === 0) return;
        const slice = records.slice(0, cap);
        let failed = 0;
        for (const r of slice) {
            try { await with429Retry(() => entity.update(r.id, patch)); }
            catch { failed++; }
            // 25 rps ceiling — well under Base44's limit
            await new Promise(res => setTimeout(res, 40));
        }
        if (failed > 0) console.warn(`[syncProfileName] ${label}: ${failed}/${slice.length} updates failed`);
    } catch (e) {
        console.warn(`[syncProfileName] ${label} bulk update failed:`, e.message);
    }
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const me = await base44.auth.me();
        if (!me) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const walletAddress = me.wallet_address;
        if (!walletAddress) return Response.json({ error: 'No wallet linked to user' }, { status: 400 });

        const { newName, newTitle, newIcon, titleOnly } = await req.json();
        // Allow title/icon-only updates — Titles page calls this without a name change
        // when the player just wants to equip/unequip a callsign (Hugo bug 2026-05-02).
        if (newName === undefined && newTitle === undefined && newIcon === undefined) {
            return Response.json({ error: 'Nothing to update' }, { status: 400 });
        }

        // Fast path for callsign equip/unequip: only update PlayerSave, skip the
        // RunScore/SquadMember/SquadMessage bulk fan-out. The fan-out hammers the
        // rate limiter (700+ rows/player) and is the reason title syncs were
        // silently 429ing for hours. The title shown next to a player on
        // leaderboards/squad chat will refresh on their NEXT run/message — that's
        // an acceptable trade for instant, reliable equip persistence.
        // (Hugo bug 2026-05-07: every syncProfileName call rate-limited.)
        if (titleOnly === true) {
            const saves = await with429Retry(() => base44.asServiceRole.entities.PlayerSave.filter({ wallet_address: walletAddress }));
            if (saves.length === 0) {
                const seedData = { updated_at: Date.now() };
                if (newTitle !== undefined) seedData.player_title = newTitle;
                if (newIcon !== undefined) seedData.pilot_icon = newIcon;
                await with429Retry(() => base44.asServiceRole.entities.PlayerSave.create({
                    wallet_address: walletAddress,
                    save_data: seedData,
                    updated_at: Date.now(),
                }));
            } else {
                const save = saves[0];
                const existing = typeof save.save_data === 'string' ? JSON.parse(save.save_data) : save.save_data;
                const merged = { ...existing, updated_at: Date.now() };
                if (newTitle !== undefined) merged.player_title = newTitle;
                if (newIcon !== undefined) merged.pilot_icon = newIcon;
                await with429Retry(() => base44.asServiceRole.entities.PlayerSave.update(save.id, { save_data: merged }));
            }
            console.log('[syncProfileName] titleOnly fast-path for wallet:', walletAddress);
            return Response.json({ success: true });
        }

        // 1. Update PlayerSave — create if missing (new users who haven't played yet
        // can still set a name/title/icon on the profile page).
        const saves = await with429Retry(() => base44.asServiceRole.entities.PlayerSave.filter({ wallet_address: walletAddress }));
        if (saves.length === 0) {
            const seedData = { updated_at: Date.now() };
            if (newName !== undefined) seedData.player_name = newName;
            if (newTitle !== undefined) seedData.player_title = newTitle;
            if (newIcon !== undefined) seedData.pilot_icon = newIcon;
            const createPayload = {
                wallet_address: walletAddress,
                save_data: seedData,
                updated_at: Date.now(),
            };
            if (newName !== undefined) createPayload.player_name = newName;
            await with429Retry(() => base44.asServiceRole.entities.PlayerSave.create(createPayload));
        } else {
            const save = saves[0];
            const existingSaveData = typeof save.save_data === 'string' ? JSON.parse(save.save_data) : save.save_data;
            const mergedData = { ...existingSaveData, updated_at: Date.now() };
            if (newName !== undefined) mergedData.player_name = newName;
            if (newTitle !== undefined) mergedData.player_title = newTitle;
            if (newIcon !== undefined) mergedData.pilot_icon = newIcon;

            const updatePayload = { save_data: mergedData };
            if (newName !== undefined) updatePayload.player_name = newName;
            await with429Retry(() => base44.asServiceRole.entities.PlayerSave.update(save.id, updatePayload));
        }

        // 2. Update related records in parallel — only patch fields that were provided.
        const scorePatch = {};
        if (newName !== undefined) scorePatch.player_name = newName;
        if (newTitle !== undefined) scorePatch.player_title = newTitle;
        if (newIcon !== undefined) scorePatch.pilot_icon = newIcon;

        const memberPatch = {};
        if (newName !== undefined) memberPatch.player_name = newName;
        if (newTitle !== undefined) memberPatch.player_title = newTitle;

        const messagePatch = {};
        if (newName !== undefined) messagePatch.player_name = newName;
        if (newTitle !== undefined) messagePatch.player_title = newTitle;

        // Note: TokenSpendLog is intentionally NOT rewritten — those are immutable
        // historical audit records (700+ per long-time player). Trying to bulk-rewrite
        // them was hammering the rate limiter and breaking the rest of the sync.
        // The name shown there is meant to reflect the name at the time of the spend.
        const tasks = [];
        if (Object.keys(scorePatch).length) tasks.push(bulkUpdateByWallet(base44.asServiceRole.entities.RunScore, walletAddress, scorePatch, 'RunScore'));
        if (Object.keys(memberPatch).length) tasks.push(bulkUpdateByWallet(base44.asServiceRole.entities.SquadMember, walletAddress, memberPatch, 'SquadMember'));
        if (Object.keys(messagePatch).length) tasks.push(bulkUpdateByWallet(base44.asServiceRole.entities.SquadMessage, walletAddress, messagePatch, 'SquadMessage'));
        await Promise.all(tasks);

        console.log('[syncProfileName] Synced for wallet:', walletAddress);
        return Response.json({ success: true });
    } catch (error) {
        console.error('[syncProfileName]', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});