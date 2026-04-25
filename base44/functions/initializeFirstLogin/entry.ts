import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Authentication required' }, { status: 401 });
        }

        const wallet = user.data?.omenx_wallet;
        if (!wallet) {
            return Response.json({ error: 'OmenX wallet not linked' }, { status: 400 });
        }

        const { initialSave, vipLevel } = await req.json();

        // Check if PlayerSave already exists
        const existing = await base44.asServiceRole.entities.PlayerSave.filter({ wallet_address: wallet });
        if (existing.length > 0) {
            return Response.json({ success: false, message: 'PlayerSave already exists' });
        }

        const finalVipLevel = vipLevel || 0;
        const saveDataWithVip = { ...initialSave, vipLevel: finalVipLevel };

        const result = await base44.asServiceRole.entities.PlayerSave.create({
            wallet_address: wallet,
            save_data: saveDataWithVip,
            updated_at: Date.now()
        });

        return Response.json({ success: true, saveId: result.id });
    } catch (error) {
        console.error('[initializeFirstLogin]', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});