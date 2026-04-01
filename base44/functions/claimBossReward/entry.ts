import { createClientFromRequest } from 'npm:@base44/sdk@0.8.24';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        const body = await req.json();
        const { week_id } = body;
        
        const bossRecords = await base44.asServiceRole.entities.GlobalBoss.filter({ week_id });
        if (bossRecords.length === 0) return Response.json({ error: 'No boss' }, { status: 404 });
        
        const boss = bossRecords[0];
        if (!boss.is_defeated) return Response.json({ error: 'Boss not defeated yet' }, { status: 400 });
        
        const contribs = await base44.asServiceRole.entities.GlobalBossContribution.filter({ week_id, user_id: user.id });
        if (contribs.length === 0) return Response.json({ error: 'No contribution' }, { status: 400 });
        
        const cont = contribs[0];
        if (cont.claimed) return Response.json({ error: 'Already claimed' }, { status: 400 });
        
        await base44.asServiceRole.entities.GlobalBossContribution.update(cont.id, { claimed: true });
        
        return Response.json({ status: 'success', reward: { type: boss.reward_type, id: boss.reward_id } });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});