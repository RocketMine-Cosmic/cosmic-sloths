import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Server-computed week_id
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
        const db = base44.asServiceRole;

        // Must be authenticated — identity comes from session, not request body
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { claim_level } = body;

        const levelNum = parseInt(claim_level, 10);
        if (isNaN(levelNum) || levelNum < 1) return Response.json({ error: 'Invalid level' }, { status: 400 });

        // Always use server week, not client-supplied week_id
        const week_id = getCurrentWeekId();

        const bossRecords = await db.entities.GlobalBoss.filter({ week_id });
        if (bossRecords.length === 0) return Response.json({ error: 'No boss' }, { status: 404 });

        const boss = bossRecords[0];
        if (levelNum >= (boss.level || 1)) {
            return Response.json({ error: 'Boss level not defeated yet' }, { status: 400 });
        }

        // Look up contribution by authenticated user id only
        const contribs = await db.entities.GlobalBossContribution.filter({ week_id, user_id: user.id });
        if (contribs.length === 0) return Response.json({ error: 'No contribution found' }, { status: 400 });

        const freshCont = await db.entities.GlobalBossContribution.get(contribs[0].id);
        const claimed_milestones = freshCont.claimed_milestones || [];

        if (claimed_milestones.includes(levelNum)) return Response.json({ error: 'Already claimed' }, { status: 400 });

        const uniqueMilestones = [...new Set([...claimed_milestones, levelNum])].sort((a, b) => a - b);
        await db.entities.GlobalBossContribution.update(freshCont.id, { claimed_milestones: uniqueMilestones });

        const goldReward = levelNum * 250;
        return Response.json({ status: 'success', reward: { type: 'gold', id: goldReward.toString() } });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});