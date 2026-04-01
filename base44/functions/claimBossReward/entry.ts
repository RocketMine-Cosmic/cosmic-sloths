import { createClientFromRequest } from 'npm:@base44/sdk@0.8.24';

const MILESTONES = {
    25: { type: 'gold', id: '5000' },
    50: { type: 'gold', id: '10000' },
    75: { type: 'gold', id: '15000' },
    100: { type: 'gold', id: '25000' }
};

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        const body = await req.json();
        const { week_id, milestone } = body;
        
        if (!MILESTONES[milestone]) return Response.json({ error: 'Invalid milestone' }, { status: 400 });
        
        const bossRecords = await base44.asServiceRole.entities.GlobalBoss.filter({ week_id });
        if (bossRecords.length === 0) return Response.json({ error: 'No boss' }, { status: 404 });
        
        const boss = bossRecords[0];
        const percentDealt = 100 - (boss.current_hp / boss.max_hp * 100);
        if (percentDealt < milestone && !(milestone === 100 && boss.is_defeated)) {
            return Response.json({ error: 'Milestone not reached yet' }, { status: 400 });
        }
        
        const contribs = await base44.asServiceRole.entities.GlobalBossContribution.filter({ week_id, user_id: user.id });
        if (contribs.length === 0) return Response.json({ error: 'No contribution' }, { status: 400 });
        
        const cont = contribs[0];
        const claimed_milestones = cont.claimed_milestones || [];
        if (claimed_milestones.includes(milestone)) return Response.json({ error: 'Already claimed' }, { status: 400 });
        
        claimed_milestones.push(milestone);
        await base44.asServiceRole.entities.GlobalBossContribution.update(cont.id, { claimed_milestones });
        
        return Response.json({ status: 'success', reward: MILESTONES[milestone] });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});