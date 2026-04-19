import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Admin access required' }, { status: 403 });
        }

        console.log('[syncTokenPools] Starting sync...');

        // Fetch all spend logs
        const allLogs = await base44.asServiceRole.entities.TokenSpendLog.list('', 10000);
        console.log(`[syncTokenPools] Found ${allLogs.length} spend log entries`);

        // Group by week_id and season_id
        const weeklyTotals = {};
        const seasonalTotals = {};

        for (const log of allLogs) {
            const week = log.week_id;
            const season = log.season_id;
            const amount = log.amount || 0;

            if (week) {
                weeklyTotals[week] = (weeklyTotals[week] || 0) + amount;
            }
            if (season) {
                seasonalTotals[season] = (seasonalTotals[season] || 0) + amount;
            }
        }

        console.log(`[syncTokenPools] Calculated ${Object.keys(weeklyTotals).length} weekly periods and ${Object.keys(seasonalTotals).length} seasonal periods`);

        // Delete all existing pools
        const allPools = await base44.asServiceRole.entities.TokenPool.list('', 10000);
        console.log(`[syncTokenPools] Deleting ${allPools.length} existing pools...`);
        for (const pool of allPools) {
            await base44.asServiceRole.entities.TokenPool.delete(pool.id);
        }

        // Create pools for each week
        for (const [week_id, total_spent] of Object.entries(weeklyTotals)) {
            await base44.asServiceRole.entities.TokenPool.create({
                period_id: week_id,
                period_type: 'weekly',
                total_spent,
                distributed: false
            });
            console.log(`[syncTokenPools] Created weekly pool ${week_id}: ${total_spent} OMENX`);
        }

        // Create pools for each season
        for (const [season_id, total_spent] of Object.entries(seasonalTotals)) {
            await base44.asServiceRole.entities.TokenPool.create({
                period_id: season_id,
                period_type: 'seasonal',
                total_spent,
                distributed: false
            });
            console.log(`[syncTokenPools] Created seasonal pool ${season_id}: ${total_spent} OMENX`);
        }

        return Response.json({
            success: true,
            weeklyPools: Object.keys(weeklyTotals).length,
            seasonalPools: Object.keys(seasonalTotals).length,
            logsProcessed: allLogs.length,
            poolsDeleted: allPools.length
        });
    } catch (error) {
        console.error('[syncTokenPools] Error:', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});