import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Admin access required' }, { status: 403 });
        }

        const actualAmount = 531; // Ground truth from wallet
        console.log(`[resetTokenPoolsToActual] Resetting to actual amount: ${actualAmount} OMENX`);

        // Delete all TokenSpendLog entries
        const allLogs = await base44.asServiceRole.entities.TokenSpendLog.list('', 10000);
        console.log(`[resetTokenPoolsToActual] Deleting ${allLogs.length} spend log entries...`);
        for (const log of allLogs) {
            await base44.asServiceRole.entities.TokenSpendLog.delete(log.id);
        }

        // Delete all existing pools
        const allPools = await base44.asServiceRole.entities.TokenPool.list('', 10000);
        console.log(`[resetTokenPoolsToActual] Deleting ${allPools.length} existing pools...`);
        for (const pool of allPools) {
            await base44.asServiceRole.entities.TokenPool.delete(pool.id);
        }

        // Create fresh pools with actual amount
        const weeklyPool = await base44.asServiceRole.entities.TokenPool.create({
            period_id: '2026-W01',
            period_type: 'weekly',
            total_spent: actualAmount,
            distributed: false
        });

        const seasonalPool = await base44.asServiceRole.entities.TokenPool.create({
            period_id: '2026-S1',
            period_type: 'seasonal',
            total_spent: actualAmount,
            distributed: false
        });

        console.log(`[resetTokenPoolsToActual] Created fresh pools with ${actualAmount} OMENX`);

        return Response.json({
            success: true,
            actualAmount,
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