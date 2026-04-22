import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { adminKey } = await req.json();
        const expectedKey = Deno.env.get('AdminDash');
        if (!adminKey || adminKey !== expectedKey) {
            return Response.json({ error: 'Admin access required' }, { status: 403 });
        }

        const actualAmount = 531;
        console.log(`[resetTokenPoolsToActual] Resetting to actual amount: ${actualAmount} OMENX`);

        const allLogs = await base44.asServiceRole.entities.TokenSpendLog.list('', 10000);
        for (const log of allLogs) {
            await base44.asServiceRole.entities.TokenSpendLog.delete(log.id);
        }

        const allPools = await base44.asServiceRole.entities.TokenPool.list('', 10000);
        for (const pool of allPools) {
            await base44.asServiceRole.entities.TokenPool.delete(pool.id);
        }

        const weeklyPool = await base44.asServiceRole.entities.TokenPool.create({ period_id: '2026-W01', period_type: 'weekly', total_spent: actualAmount, distributed: false });
        const seasonalPool = await base44.asServiceRole.entities.TokenPool.create({ period_id: '2026-S1', period_type: 'seasonal', total_spent: actualAmount, distributed: false });

        return Response.json({
            success: true, actualAmount,
            logsDeleted: allLogs.length,
            poolsDeleted: allPools.length,
            weeklyPoolId: weeklyPool.id,
            seasonalPoolId: seasonalPool.id
        });
    } catch (error) {
        console.error('[resetTokenPoolsToActual] Error:', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});