import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function getCurrentWeekId() {
    const now = new Date();
    const startOfYear = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    const startOfWeek = new Date(startOfYear);
    startOfWeek.setUTCDate(startOfYear.getUTCDate() - startOfYear.getUTCDay() + 1);
    const isoWeek = Math.ceil(((now - startOfWeek) / 86400000 + 1) / 7);
    return `${now.getUTCFullYear()}-W${String(isoWeek).padStart(2, '0')}`;
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Authentication required' }, { status: 401 });
        }

        const wallet = user.data?.omenx_wallet;
        if (!wallet) {
            return Response.json({ error: 'OmenX wallet not linked' }, { status: 400 });
        }

        const currentWeekId = getCurrentWeekId();
        const contribs = await base44.asServiceRole.entities.GlobalBossContribution.filter({ user_id: wallet });
        
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