import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function getCurrentPeriodIds() {
    const now = new Date();
    const year = now.getUTCFullYear();
    const startOfYear = new Date(Date.UTC(year, 0, 1));
    const startOfWeek = new Date(startOfYear);
    startOfWeek.setUTCDate(startOfYear.getUTCDate() - startOfYear.getUTCDay() + 1);
    const isoWeek = Math.ceil(((now - startOfWeek) / 86400000 + 1) / 7);
    const week_id = `${year}-W${String(isoWeek).padStart(2, '0')}`;
    const seasonNum = Math.floor((isoWeek - 1) / 4) + 1;
    const season_id = `${year}-S${seasonNum}`;
    return { week_id, season_id };
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (user?.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const { week_id, season_id } = getCurrentPeriodIds();
        
        // Fetch all pools
        const allPools = await base44.asServiceRole.entities.TokenPool.filter({});
        
        // Group by period_id and period_type to find duplicates
        const poolMap = new Map();
        const toDelete = [];
        let fixedCount = 0;

        for (const pool of allPools) {
            const key = `${pool.period_id}|${pool.period_type}`;
            if (poolMap.has(key)) {
                // Duplicate found - merge and delete
                const existing = poolMap.get(key);
                existing.total_spent = (existing.total_spent || 0) + (pool.total_spent || 0);
                toDelete.push(pool.id);
                fixedCount++;
            } else {
                poolMap.set(key, pool);
            }
        }

        // Update merged pools
        for (const [key, pool] of poolMap.entries()) {
            await base44.asServiceRole.entities.TokenPool.update(pool.id, {
                total_spent: pool.total_spent,
                distributed: pool.distributed
            });
        }

        // Delete duplicates
        for (const id of toDelete) {
            await base44.asServiceRole.entities.TokenPool.delete(id);
        }

        // Ensure current weekly and seasonal pools exist
        const weeklyExists = allPools.some(p => p.period_id === week_id && p.period_type === 'weekly');
        const seasonalExists = allPools.some(p => p.period_id === season_id && p.period_type === 'seasonal');

        if (!weeklyExists) {
            await base44.asServiceRole.entities.TokenPool.create({
                period_id: week_id,
                period_type: 'weekly',
                total_spent: 0,
                distributed: false
            });
        }

        if (!seasonalExists) {
            await base44.asServiceRole.entities.TokenPool.create({
                period_id: season_id,
                period_type: 'seasonal',
                total_spent: 0,
                distributed: false
            });
        }

        return Response.json({
            success: true,
            duplicatesMerged: fixedCount,
            currentWeekId: week_id,
            currentSeasonId: season_id,
            totalPoolsAfterFix: poolMap.size + (weeklyExists ? 0 : 1) + (seasonalExists ? 0 : 1)
        });
    } catch (error) {
        console.error('[fixTokenPools]', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});