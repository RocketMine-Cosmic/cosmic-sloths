import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import moment from 'npm:moment@2.30.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const currentWeekId = moment().format('YYYY-[W]ww');
        
        const contribs = await base44.asServiceRole.entities.GlobalBossContribution.filter({ user_id: user.wallet_address || user.id });
        
        let totalGold = 0;
        let pastUnclaimedCount = 0;

        for (const cont of contribs) {
            if (cont.week_id === currentWeekId) continue;
            
            const bossRecords = await base44.asServiceRole.entities.GlobalBoss.filter({ week_id: cont.week_id });
            if (bossRecords.length === 0) continue;
            
            const boss = bossRecords[0];
            const bossLevel = boss.level || 1;
            
            let claimed_milestones = cont.claimed_milestones || [];
            let newlyClaimed = [];
            
            for (let lvl = 1; lvl < bossLevel; lvl++) {
                if (!claimed_milestones.includes(lvl)) {
                    newlyClaimed.push(lvl);
                    totalGold += (lvl * 1000);
                    claimed_milestones.push(lvl);
                    pastUnclaimedCount++;
                }
            }
            
            if (newlyClaimed.length > 0) {
                await base44.asServiceRole.entities.GlobalBossContribution.update(cont.id, { claimed_milestones });
            }
        }
        
        return Response.json({ status: 'success', totalGold, pastUnclaimedCount });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});