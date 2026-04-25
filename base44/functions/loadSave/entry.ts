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
        const saveData = records.length > 0 ? records[0].save_data : null;

        console.log('[loadSave] Loaded for wallet:', wallet, '- found:', !!saveData);
        return Response.json({ saveData });
    } catch (error) {
        console.error('[loadSave]', error.message);
        return Response.json({ saveData: null });
    }
});