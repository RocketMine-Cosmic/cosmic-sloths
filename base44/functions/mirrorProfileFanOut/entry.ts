import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Triggered by the PlayerSave entity automation when save_data.profile or
// player_name changes. Mirrors the new name/title/icon to RunScore +
// SquadMember + SquadMessage (rate-limit-safe sequential writes).
//
// Why an entity automation instead of a direct call from the client:
//   - One write path: clients only call syncSave. They don't have to know
//     "also call syncProfileName for these specific fields."
//   - Failures are isolated: if the fan-out 429s, the player's name/title is
//     already saved on PlayerSave. The fan-out can be retried via this
//     function without the player having to do anything.
//   - No more 700-row synchronous fan-out blocking the user's UI thread.
//
// Auth: invoked by automation (no user session). Uses asServiceRole only.

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

async function bulkUpdateByWallet(entity, walletAddress, patch, label, cap = 500) {
    try {
        const records = await with429Retry(() => entity.filter({ wallet_address: walletAddress }));
        if (records.length === 0) return { updated: 0, failed: 0 };
        const slice = records.slice(0, cap);
        let failed = 0;
        for (const r of slice) {
            try { await with429Retry(() => entity.update(r.id, patch)); }
            catch { failed++; }
            await new Promise(res => setTimeout(res, 40)); // 25 rps ceiling
        }
        if (failed > 0) console.warn(`[mirrorProfileFanOut] ${label}: ${failed}/${slice.length} updates failed`);
        return { updated: slice.length - failed, failed };
    } catch (e) {
        console.warn(`[mirrorProfileFanOut] ${label} bulk update failed:`, e.message);
        return { updated: 0, failed: -1 };
    }
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const body = await req.json().catch(() => ({}));

        // Two invocation modes:
        //   1) Entity automation: { event, data, old_data, changed_fields }
        //   2) Direct/admin call: { wallet_address, player_name?, player_title?, pilot_icon? }
        let walletAddress = null;
        let newName, newTitle, newIcon;

        if (body?.event?.entity_name === 'PlayerSave') {
            // Entity automation payload
            const data = body.data;
            const oldData = body.old_data || {};
            if (!data) {
                console.warn('[mirrorProfileFanOut] no data in event payload (payload_too_large?)');
                return Response.json({ skipped: true, reason: 'no_data' });
            }
            walletAddress = data.wallet_address;

            // Extract profile fields from save_data.profile (new path) with fallback
            // to legacy top-level save_data.player_title / pilot_icon.
            const saveData = typeof data.save_data === 'string'
                ? (() => { try { return JSON.parse(data.save_data); } catch { return {}; } })()
                : (data.save_data || {});
            const oldSaveData = typeof oldData.save_data === 'string'
                ? (() => { try { return JSON.parse(oldData.save_data); } catch { return {}; } })()
                : (oldData.save_data || {});

            const profile = saveData.profile || {};
            const oldProfile = oldSaveData.profile || {};

            const curName = profile.player_name ?? saveData.player_name ?? data.player_name;
            const oldName = oldProfile.player_name ?? oldSaveData.player_name ?? oldData.player_name;
            const curTitle = profile.player_title ?? saveData.player_title;
            const oldTitle = oldProfile.player_title ?? oldSaveData.player_title;
            const curIcon = profile.pilot_icon ?? saveData.pilot_icon;
            const oldIcon = oldProfile.pilot_icon ?? oldSaveData.pilot_icon;

            // Only mirror fields that actually changed.
            if (curName !== undefined && curName !== oldName) newName = curName;
            if (curTitle !== undefined && curTitle !== oldTitle) newTitle = curTitle;
            if (curIcon !== undefined && curIcon !== oldIcon) newIcon = curIcon;

            // Nothing to mirror — bail. Most PlayerSave updates don't touch profile fields.
            if (newName === undefined && newTitle === undefined && newIcon === undefined) {
                return Response.json({ skipped: true, reason: 'no_profile_change' });
            }
        } else {
            // Direct/admin call
            walletAddress = body.wallet_address;
            newName = body.player_name;
            newTitle = body.player_title;
            newIcon = body.pilot_icon;
            if (newName === undefined && newTitle === undefined && newIcon === undefined) {
                return Response.json({ error: 'Nothing to update' }, { status: 400 });
            }
        }

        if (!walletAddress) return Response.json({ error: 'No wallet address' }, { status: 400 });
        const wallet = walletAddress.toLowerCase();

        // Build patches per entity (icon is on RunScore but not SquadMember/Message).
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

        const tasks = [];
        if (Object.keys(scorePatch).length) tasks.push(bulkUpdateByWallet(base44.asServiceRole.entities.RunScore, wallet, scorePatch, 'RunScore'));
        if (Object.keys(memberPatch).length) tasks.push(bulkUpdateByWallet(base44.asServiceRole.entities.SquadMember, wallet, memberPatch, 'SquadMember'));
        if (Object.keys(messagePatch).length) tasks.push(bulkUpdateByWallet(base44.asServiceRole.entities.SquadMessage, wallet, messagePatch, 'SquadMessage'));
        const results = await Promise.all(tasks);

        console.log(`[mirrorProfileFanOut] Mirrored for ${wallet}:`, JSON.stringify({ newName, newTitle, newIcon, results }));
        return Response.json({ success: true, wallet, results });
    } catch (error) {
        console.error('[mirrorProfileFanOut]', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});