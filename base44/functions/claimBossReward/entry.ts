import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Auth: Base44 session. Wallet: from linked User.wallet_address.

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
        const me = await base44.auth.me();
        if (!me) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const walletAddress = me.wallet_address;
        if (!walletAddress) return Response.json({ error: 'No wallet linked to user' }, { status: 400 });

        const { claim_level } = await req.json();
        const levelNum = parseInt(claim_level, 10);
        if (isNaN(levelNum) || levelNum < 1) return Response.json({ error: 'Invalid level' }, { status: 400 });

        const week_id = getCurrentWeekId();

        // Find this player's contribution record for the current week
        const contribs = await base44.asServiceRole.entities.GlobalBossContribution.filter({
            week_id,
            user_id: walletAddress,
        });
        if (!contribs || contribs.length === 0) {
            return Response.json({ error: 'No contribution found for this week' }, { status: 404 });
        }
        const contrib = contribs[0];
        const claimed = Array.isArray(contrib.claimed_milestones) ? contrib.claimed_milestones : [];

        // Already claimed → reject so the client doesn't re-grant the reward
        if (claimed.includes(levelNum)) {
            return Response.json({ status: 'error', error: 'Reward already claimed for this level' }, { status: 409 });
        }

        await base44.asServiceRole.entities.GlobalBossContribution.update(contrib.id, {
            claimed_milestones: [...claimed, levelNum],
        });

        const goldReward = levelNum * 250;
        console.log('[claimBossReward] Claimed level', levelNum, 'for wallet:', walletAddress);
        return Response.json({ status: 'success', reward: { type: 'gold', id: goldReward.toString() } });
    } catch (error) {
        console.error('[claimBossReward]', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});