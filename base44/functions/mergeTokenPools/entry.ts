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

        // Fetch all weekly pools
        const weeklyPools = await base44.asServiceRole.entities.TokenPool.filter({ 
            period_id: week_id, 
            period_type: 'weekly' 
        });

        // Fetch all seasonal pools
        const seasonalPools = await base44.asServiceRole.entities.TokenPool.filter({ 
            period_id: season_id, 
            period_type: 'seasonal' 
        });

        let weeklyMerged = 0;
        let seasonalMerged = 0;

        // Merge weekly pools
        if (weeklyPools.length > 1) {
            const totalSpent = weeklyPools.reduce((sum, p) => sum + (p.total_spent || 0), 0);
            const keepPool = weeklyPools[0];
            
            // Update the first pool with the sum
            await base44.asServiceRole.entities.TokenPool.update(keepPool.id, {
                total_spent: totalSpent,
                distributed: false
            });
            
            // Delete the rest
            for (let i = 1; i < weeklyPools.length; i++) {
                await base44.asServiceRole.entities.TokenPool.delete(weeklyPools[i].id);
            }
            
            weeklyMerged = weeklyPools.length - 1;
            console.log(`[mergeTokenPools] Merged ${weeklyMerged} duplicate weekly pools into ${keepPool.id}. New total: ${totalSpent}`);
        }

        // Merge seasonal pools
        if (seasonalPools.length > 1) {
            const totalSpent = seasonalPools.reduce((sum, p) => sum + (p.total_spent || 0), 0);
            const keepPool = seasonalPools[0];
            
            // Update the first pool with the sum
            await base44.asServiceRole.entities.TokenPool.update(keepPool.id, {
                total_spent: totalSpent,
                distributed: false
            });
            
            // Delete the rest
            for (let i = 1; i < seasonalPools.length; i++) {
                await base44.asServiceRole.entities.TokenPool.delete(seasonalPools[i].id);
            }
            
            seasonalMerged = seasonalPools.length - 1;
            console.log(`[mergeTokenPools] Merged ${seasonalMerged} duplicate seasonal pools into ${keepPool.id}. New total: ${totalSpent}`);
        }

        return Response.json({ 
            success: true, 
            message: `Merged ${weeklyMerged} weekly and ${seasonalMerged} seasonal duplicate pools`,
            weekly: { period_id: week_id, merged: weeklyMerged, total: weeklyPools.length },
            seasonal: { period_id: season_id, merged: seasonalMerged, total: seasonalPools.length }
        });
    } catch (error) {
        console.error('[mergeTokenPools]', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});