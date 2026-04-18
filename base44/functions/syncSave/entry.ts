import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const { walletAddress, saveData } = await req.json();

        if (!walletAddress || !saveData) {
            return Response.json({ error: 'walletAddress and saveData required' }, { status: 400 });
        }

        const base44 = createClientFromRequest(req);

        const existing = await base44.asServiceRole.entities.PlayerSave.filter({ wallet_address: walletAddress });

        if (existing.length > 0) {
            await base44.asServiceRole.entities.PlayerSave.update(existing[0].id, {
                save_data: saveData,
                updated_at: Date.now()
            });
        } else {
            await base44.asServiceRole.entities.PlayerSave.create({
                wallet_address: walletAddress,
                save_data: saveData,
                updated_at: Date.now()
            });
        }

        return Response.json({ success: true });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});