import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Admin access required' }, { status: 403 });
        }

        console.log('[consolidateTokenPools] Starting consolidation...');

        // Fetch all spend logs
        const allLogs = await base44.asServiceRole.entities.TokenSpendLog.list('', 10000);
        console.log(`[consolidateTokenPools] Found ${allLogs.length} spend log entries`);

        // Calculate total spent
        const totalSpent = allLogs.reduce((sum, log) => sum + (log.amount || 0), 0);
        console.log(`[consolidateTokenPools] Total spent: ${totalSpent} OMENX`);

        // Delete all existing pools
        const allPools = await base44.asServiceRole.entities.TokenPool.list('', 10000);
        console.log(`[consolidateTokenPools] Deleting ${allPools.length} existing pools...`);
        for (const pool of allPools) {
            await base44.asServiceRole.entities.TokenPool.delete(pool.id);
        }

        // Create consolidated W01/S1 pools
        const weeklyPool = await base44.asServiceRole.entities.TokenPool.create({
            period_id: '2026-W01',
            period_type: 'weekly',
            total_spent: totalSpent,
            distributed: false
        });

        const seasonalPool = await base44.asServiceRole.entities.TokenPool.create({
            period_id: '2026-S1',
            period_type: 'seasonal',
            total_spent: totalSpent,
            distributed: false
        });

        console.log(`[consolidateTokenPools] Created consolidated pools: W01=${weeklyPool.id}, S1=${seasonalPool.id}`);

        return Response.json({
            success: true,
            totalSpent,
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