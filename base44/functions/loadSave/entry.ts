import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { walletAddress: clientWallet, accessToken } = await req.json();

        if (!clientWallet) {
            return Response.json({ saveData: null });
        }

        const walletAddress = clientWallet;

        const existing = await base44.asServiceRole.entities.PlayerSave.filter({ wallet_address: walletAddress });
        if (existing.length > 0) {
            return Response.json({ saveData: existing[0].save_data });
        }

        return Response.json({ saveData: null });
    } catch (error) {
        console.error('[loadSave]', error.message);
        return Response.json({ saveData: null });
    }
});