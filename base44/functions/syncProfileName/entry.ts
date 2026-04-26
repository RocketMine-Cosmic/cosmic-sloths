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
        if (!newName) return Response.json({ error: 'newName required' }, { status: 400 });

        // 1. Update PlayerSave — create if missing (new users who haven't played yet
        // can still set a name/title/icon on the profile page).
        const saves = await base44.asServiceRole.entities.PlayerSave.filter({ wallet_address: walletAddress });
        if (saves.length === 0) {
            const seedData = { player_name: newName, updated_at: Date.now() };
            if (newTitle !== undefined) seedData.player_title = newTitle;
            if (newIcon !== undefined) seedData.pilot_icon = newIcon;
            await base44.asServiceRole.entities.PlayerSave.create({
                wallet_address: walletAddress,
                player_name: newName,
                save_data: seedData,
                updated_at: Date.now(),
            });
        } else {
            const save = saves[0];
            const existingSaveData = typeof save.save_data === 'string' ? JSON.parse(save.save_data) : save.save_data;
            const mergedData = { ...existingSaveData, player_name: newName, updated_at: Date.now() };
            if (newTitle !== undefined) mergedData.player_title = newTitle;
            if (newIcon !== undefined) mergedData.pilot_icon = newIcon;

            await base44.asServiceRole.entities.PlayerSave.update(save.id, {
                player_name: newName,
                save_data: mergedData
            });
        }

        // 2. Update related records in parallel
        const scorePatch = { player_name: newName };
        if (newTitle !== undefined) scorePatch.player_title = newTitle;
        if (newIcon !== undefined) scorePatch.pilot_icon = newIcon;

        const memberPatch = { player_name: newName };
        if (newTitle !== undefined) memberPatch.player_title = newTitle;

        const messagePatch = { player_name: newName };
        if (newTitle !== undefined) messagePatch.player_title = newTitle;

        await Promise.all([
            bulkUpdateByWallet(base44.asServiceRole.entities.RunScore, walletAddress, scorePatch, 'RunScore'),
            bulkUpdateByWallet(base44.asServiceRole.entities.SquadMember, walletAddress, memberPatch, 'SquadMember'),
            bulkUpdateByWallet(base44.asServiceRole.entities.SquadMessage, walletAddress, messagePatch, 'SquadMessage'),
            bulkUpdateByWallet(base44.asServiceRole.entities.TokenSpendLog, walletAddress, { player_name: newName }, 'TokenSpendLog'),
        ]);

        console.log('[syncProfileName] Synced for wallet:', walletAddress);
        return Response.json({ success: true });
    } catch (error) {
        console.error('[syncProfileName]', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});