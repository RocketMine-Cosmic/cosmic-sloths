import { createClient } from 'npm:@base44/sdk@0.8.25';

const db = createClient({ serviceRole: true, appId: Deno.env.get('BASE44_APP_ID') });

Deno.serve(async (req) => {
    try {
        const { adminKey } = await req.json();
        const expectedKey = Deno.env.get('AdminDash');
        if (!adminKey || adminKey !== expectedKey) {
            return Response.json({ error: 'Admin access required' }, { status: 403 });
        }

        console.log('[syncTokenPools] Starting sync...');

        const allLogs = await db.entities.TokenSpendLog.list('', 10000);
        console.log(`[syncTokenPools] Found ${allLogs.length} spend log entries`);

        const weeklyTotals = {};
        const seasonalTotals = {};

        for (const log of allLogs) {
            const week = log.week_id;
            const season = log.season_id;
            const amount = log.amount || 0;
            if (week) weeklyTotals[week] = (weeklyTotals[week] || 0) + amount;
            if (season) seasonalTotals[season] = (seasonalTotals[season] || 0) + amount;
        }

        const allPools = await db.entities.TokenPool.list('', 10000);
        console.log(`[syncTokenPools] Deleting ${allPools.length} existing pools...`);
        for (const pool of allPools) {
            await db.entities.TokenPool.delete(pool.id);
        }

        for (const [week_id, total_spent] of Object.entries(weeklyTotals)) {
            await db.entities.TokenPool.create({ period_id: week_id, period_type: 'weekly', total_spent, distributed: false });
            console.log(`[syncTokenPools] Created weekly pool ${week_id}: ${total_spent} OMENX`);
        }

        for (const [season_id, total_spent] of Object.entries(seasonalTotals)) {
            await db.entities.TokenPool.create({ period_id: season_id, period_type: 'seasonal', total_spent, distributed: false });
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