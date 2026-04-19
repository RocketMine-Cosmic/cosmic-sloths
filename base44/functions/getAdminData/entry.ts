import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { type, walletAddress } = await req.json();
        if (!walletAddress) return Response.json({ error: 'walletAddress required' }, { status: 400 });
        
        // Check if wallet is authorized admin
        const adminWallets = await base44.asServiceRole.entities.AdminWallet.filter({ wallet_address: walletAddress });
        if (adminWallets.length === 0) return Response.json({ error: 'Forbidden' }, { status: 403 });

        if (type === 'pools') {
            const pools = await base44.asServiceRole.entities.TokenPool.list('-created_date', 100);
            return Response.json({ pools });
        }

        if (type === 'logs') {
            const logs = await base44.asServiceRole.entities.TokenSpendLog.list('-created_date', 50);
            return Response.json({ logs });
        }

        if (type === 'payouts') {
            const payouts = await base44.asServiceRole.entities.PayoutLog.list('-created_date', 200);
            return Response.json({ payouts });
        }

        return Response.json({ error: 'Invalid type' }, { status: 400 });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});