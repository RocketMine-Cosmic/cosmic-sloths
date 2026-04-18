import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { walletAddress, initialSave, vipLevel } = await req.json();

        if (!walletAddress) {
            return Response.json({ error: 'walletAddress required' }, { status: 400 });
        }

        // Check if PlayerSave already exists
        const existing = await base44.asServiceRole.entities.PlayerSave.filter({ wallet_address: walletAddress });
        if (existing.length > 0) {
            return Response.json({ success: false, message: 'PlayerSave already exists' });
        }

        // Fetch VIP level if not provided
        let finalVipLevel = vipLevel || 0;
        if (!vipLevel) {
            try {
                const vipRes = await base44.functions.invoke('getVipLevel', { walletAddress });
                finalVipLevel = vipRes.data?.vipLevel || 0;
            } catch (e) {
                console.error('Failed to fetch VIP level:', e);
            }
        }

        const saveDataWithVip = { ...initialSave, vipLevel: finalVipLevel };

        const result = await base44.asServiceRole.entities.PlayerSave.create({
            wallet_address: walletAddress,
            save_data: saveDataWithVip,
            updated_at: Date.now()
        });

        return Response.json({ success: true, saveId: result.id });
    } catch (error) {
        console.error('[initializeFirstLogin]', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});