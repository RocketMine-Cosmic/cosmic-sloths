import { createClientFromRequest } from 'npm:@base44/sdk@0.8.24';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        const body = await req.json();
        const { week_id, claim_level } = body;
        
        if (!claim_level || claim_level < 1) return Response.json({ error: 'Invalid level' }, { status: 400 });
        
        const bossRecords = await base44.asServiceRole.entities.GlobalBoss.filter({ week_id });
        if (bossRecords.length === 0) return Response.json({ error: 'No boss' }, { status: 404 });
        
        const boss = bossRecords[0];
        
        if (claim_level >= (boss.level || 1)) {
            return Response.json({ error: 'Boss level not defeated yet' }, { status: 400 });
        }
        
        const contribs = await base44.asServiceRole.entities.GlobalBossContribution.filter({ week_id, user_id: user.id });
        if (contribs.length === 0) return Response.json({ error: 'No contribution' }, { status: 400 });
        
        const cont = contribs[0];
        const claimed_milestones = cont.claimed_milestones || [];
        if (claimed_milestones.includes(claim_level)) return Response.json({ error: 'Already claimed' }, { status: 400 });
        
        claimed_milestones.push(claim_level);
        await base44.asServiceRole.entities.GlobalBossContribution.update(cont.id, { claimed_milestones });
        
        const goldReward = claim_level * 1000;
        return Response.json({ status: 'success', reward: { type: 'gold', id: goldReward.toString() } });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});