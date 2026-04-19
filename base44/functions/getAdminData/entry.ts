import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const adminKey = req.headers.get('x-admin-key');
        const expectedKey = Deno.env.get('OMENX_API_KEY');
        if (!adminKey || adminKey !== expectedKey) return Response.json({ error: 'Forbidden' }, { status: 403 });

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

        return Response.json({ error: 'Invalid type' }, { status: 400 });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});