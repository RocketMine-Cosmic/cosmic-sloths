import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Loads the player save for the currently-authenticated Base44 user,
// using the wallet_address linked on their User record.

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const me = await base44.auth.me();
        if (!me) return Response.json({ saveData: null });

        const wallet = me.wallet_address;
        if (!wallet) {
            console.log('[loadSave] User has no linked wallet yet');
            return Response.json({ saveData: null });
        }

        const records = await base44.asServiceRole.entities.PlayerSave.filter({ wallet_address: wallet.toLowerCase() });
        let saveData = records.length > 0 ? records[0].save_data : null;

        // Belt-and-braces: ensure profile fields (player_name) are present in save_data
        // so cross-device cloud restore works even for legacy saves where the name lives
        // only on the top-level PlayerSave column. SaveManager reads from save_data only.
        if (saveData && records.length > 0) {
            const row = records[0];
            if (typeof saveData === 'string') {
                try { saveData = JSON.parse(saveData); } catch {}
            }
            if (saveData && typeof saveData === 'object') {
                if (!saveData.player_name && row.player_name) {
                    saveData = { ...saveData, player_name: row.player_name };
                }
            }
        }

        console.log('[loadSave] Loaded for wallet:', wallet, '- found:', !!saveData);
        return Response.json({ saveData });
    } catch (error) {
        console.error('[loadSave]', error.message);
        return Response.json({ saveData: null });
    }
});