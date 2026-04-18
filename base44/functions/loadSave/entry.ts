import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const { walletAddress } = await req.json();

        if (!walletAddress) {
            return Response.json({ error: 'walletAddress required' }, { status: 400 });
        }

        const base44 = createClientFromRequest(req);

        const existing = await base44.asServiceRole.entities.PlayerSave.filter({ wallet_address: walletAddress });

        if (existing.length > 0) {
            return Response.json({ saveData: existing[0].save_data });
        }

        return Response.json({ saveData: null });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});