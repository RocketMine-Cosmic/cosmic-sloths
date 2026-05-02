import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Auth: Base44 session. Wallet: from linked User.wallet_address.

// Helper: update all records matching wallet_address with the given patch.
// Done in parallel for speed; individual failures are logged but don't fail the whole sync.
async function bulkUpdateByWallet(entity, walletAddress, patch, label) {
    try {
        const records = await entity.filter({ wallet_address: walletAddress });
        if (records.length === 0) return;
        const results = await Promise.allSettled(
            records.map(r => entity.update(r.id, patch))
        );
        const failed = results.filter(r => r.status === 'rejected').length;
        if (failed > 0) console.warn(`[syncProfileName] ${label}: ${failed}/${records.length} updates failed`);
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

        const { newName, newTitle, newIcon } = await req.json();
        // Allow title/icon-only updates — Titles page calls this without a name change
        // when the player just wants to equip/unequip a callsign (Hugo bug 2026-05-02).
        if (newName === undefined && newTitle === undefined && newIcon === undefined) {
            return Response.json({ error: 'Nothing to update' }, { status: 400 });
        }

        // 1. Update PlayerSave — create if missing (new users who haven't played yet
        // can still set a name/title/icon on the profile page).
        const saves = await base44.asServiceRole.entities.PlayerSave.filter({ wallet_address: walletAddress });
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
            await base44.asServiceRole.entities.PlayerSave.create(createPayload);
        } else {
            const save = saves[0];
            const existingSaveData = typeof save.save_data === 'string' ? JSON.parse(save.save_data) : save.save_data;
            const mergedData = { ...existingSaveData, updated_at: Date.now() };
            if (newName !== undefined) mergedData.player_name = newName;
            if (newTitle !== undefined) mergedData.player_title = newTitle;
            if (newIcon !== undefined) mergedData.pilot_icon = newIcon;

            const updatePayload = { save_data: mergedData };
            if (newName !== undefined) updatePayload.player_name = newName;
            await base44.asServiceRole.entities.PlayerSave.update(save.id, updatePayload);
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

        const tokenPatch = {};
        if (newName !== undefined) tokenPatch.player_name = newName;

        const tasks = [];
        if (Object.keys(scorePatch).length) tasks.push(bulkUpdateByWallet(base44.asServiceRole.entities.RunScore, walletAddress, scorePatch, 'RunScore'));
        if (Object.keys(memberPatch).length) tasks.push(bulkUpdateByWallet(base44.asServiceRole.entities.SquadMember, walletAddress, memberPatch, 'SquadMember'));
        if (Object.keys(messagePatch).length) tasks.push(bulkUpdateByWallet(base44.asServiceRole.entities.SquadMessage, walletAddress, messagePatch, 'SquadMessage'));
        if (Object.keys(tokenPatch).length) tasks.push(bulkUpdateByWallet(base44.asServiceRole.entities.TokenSpendLog, walletAddress, tokenPatch, 'TokenSpendLog'));
        await Promise.all(tasks);

        console.log('[syncProfileName] Synced for wallet:', walletAddress);
        return Response.json({ success: true });
    } catch (error) {
        console.error('[syncProfileName]', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});