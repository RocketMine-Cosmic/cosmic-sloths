import { createClient } from 'npm:@base44/sdk@0.8.25';

const db = createClient({ serviceRole: true, appId: Deno.env.get('BASE44_APP_ID') });

Deno.serve(async (req) => {
    try {
        const { adminKey } = await req.json();
        const expectedKey = Deno.env.get('AdminDash');
        if (!adminKey || adminKey !== expectedKey) {
            return Response.json({ error: 'Admin access required' }, { status: 403 });
        }

        console.log('[consolidateTokenPools] Starting consolidation...');

        const allLogs = await db.entities.TokenSpendLog.list('', 10000);
        const totalSpent = allLogs.reduce((sum, log) => sum + (log.amount || 0), 0);
        console.log(`[consolidateTokenPools] Total spent: ${totalSpent} OMENX`);

        const allPools = await db.entities.TokenPool.list('', 10000);
        for (const pool of allPools) {
            await db.entities.TokenPool.delete(pool.id);
        }

        const weeklyPool = await db.entities.TokenPool.create({ period_id: '2026-W01', period_type: 'weekly', total_spent: totalSpent, distributed: false });
        const seasonalPool = await db.entities.TokenPool.create({ period_id: '2026-S1', period_type: 'seasonal', total_spent: totalSpent, distributed: false });

        return Response.json({
            success: true, totalSpent,
            logsConsolidated: allLogs.length,
            poolsDeleted: allPools.length,
            weeklyPoolId: weeklyPool.id,
            seasonalPoolId: seasonalPool.id
        });
    } catch (error) {
        console.error('[consolidateTokenPools] Error:', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});