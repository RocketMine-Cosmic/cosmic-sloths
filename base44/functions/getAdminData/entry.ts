import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Auth: Base44 session → linked wallet → AdminWallet lookup. (No OmenX OAuth — that goes stale.)

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const me = await base44.auth.me();
        if (!me) return Response.json({ error: 'Unauthorized' }, { status: 401 });
        const wallet = me.wallet_address?.toLowerCase();
        if (!wallet) return Response.json({ error: 'No wallet linked' }, { status: 401 });

        const adminWallets = await base44.asServiceRole.entities.AdminWallet.filter({ wallet_address: wallet });
        if (adminWallets.length === 0) return Response.json({ error: 'Forbidden' }, { status: 403 });

        const { type } = await req.json();

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
        if (type === 'adminWallets') {
            const records = await base44.asServiceRole.entities.AdminWallet.list('-created_date', 200);
            return Response.json({ records });
        }

        return Response.json({ error: 'Invalid type' }, { status: 400 });
    } catch (error) {
        console.error('[getAdminData] Error:', error);
        return Response.json({ error: error.message || 'Internal error' }, { status: 500 });
    }
});