import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const db = base44.asServiceRole;

        const body = await req.json();
        const { week_id, claim_level, walletAddress, userId } = body;

        const levelNum = parseInt(claim_level, 10);
        if (isNaN(levelNum) || levelNum < 1) return Response.json({ error: 'Invalid level' }, { status: 400 });

        const contribUserId = userId || walletAddress;
        if (!contribUserId) return Response.json({ error: 'Missing userId or walletAddress' }, { status: 400 });

        const bossRecords = await db.entities.GlobalBoss.filter({ week_id });
        if (bossRecords.length === 0) return Response.json({ error: 'No boss' }, { status: 404 });

        const boss = bossRecords[0];

        if (levelNum >= (boss.level || 1)) {
            return Response.json({ error: 'Boss level not defeated yet' }, { status: 400 });
        }

        const contribs = await db.entities.GlobalBossContribution.filter({ week_id, user_id: contribUserId });
        if (contribs.length === 0) return Response.json({ error: 'No contribution' }, { status: 400 });

        const freshCont = await db.entities.GlobalBossContribution.get(contribs[0].id);
        const claimed_milestones = freshCont.claimed_milestones || [];

        if (claimed_milestones.includes(levelNum)) return Response.json({ error: 'Already claimed' }, { status: 400 });

        claimed_milestones.push(levelNum);
        const uniqueMilestones = [...new Set(claimed_milestones)].sort((a, b) => a - b);
        await db.entities.GlobalBossContribution.update(freshCont.id, { claimed_milestones: uniqueMilestones });

        const goldReward = levelNum * 250;
        return Response.json({ status: 'success', reward: { type: 'gold', id: goldReward.toString() } });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});