import { createClientFromRequest } from 'npm:@base44/sdk@0.8.24';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        const body = await req.json();
        const { week_id, claim_level } = body;
        
        const levelNum = parseInt(claim_level, 10);
        if (isNaN(levelNum) || levelNum < 1) return Response.json({ error: 'Invalid level' }, { status: 400 });
        
        const bossRecords = await base44.asServiceRole.entities.GlobalBoss.filter({ week_id });
        if (bossRecords.length === 0) return Response.json({ error: 'No boss' }, { status: 404 });
        
        const boss = bossRecords[0];
        
        if (levelNum >= (boss.level || 1)) {
            return Response.json({ error: 'Boss level not defeated yet' }, { status: 400 });
        }
        
        const contribs = await base44.asServiceRole.entities.GlobalBossContribution.filter({ week_id, user_id: user.id });
        if (contribs.length === 0) return Response.json({ error: 'No contribution' }, { status: 400 });
        
        const cont = contribs[0];
        // Re-fetch right before update to minimize concurrent claim race condition
        const freshCont = await base44.asServiceRole.entities.GlobalBossContribution.get(cont.id);
        const claimed_milestones = freshCont.claimed_milestones || [];
        
        if (claimed_milestones.includes(levelNum)) return Response.json({ error: 'Already claimed' }, { status: 400 });
        
        claimed_milestones.push(levelNum);
        
        // Remove potential duplicates and sort
        const uniqueMilestones = [...new Set(claimed_milestones)].sort((a,b) => a - b);
        await base44.asServiceRole.entities.GlobalBossContribution.update(cont.id, { claimed_milestones: uniqueMilestones });
        
        const goldReward = levelNum * 250;
        return Response.json({ status: 'success', reward: { type: 'gold', id: goldReward.toString() } });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});