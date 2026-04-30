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
        if (!me) return Response.json({ error: 'Please sign in to claim your reward.' }, { status: 401 });

        const walletAddress = me.wallet_address;
        if (!walletAddress) return Response.json({ error: 'Your wallet isn\'t linked yet. Sign in with OmenX to continue.' }, { status: 400 });

        const { claim_level } = await req.json();
        const levelNum = parseInt(claim_level, 10);
        if (isNaN(levelNum) || levelNum < 1) return Response.json({ error: 'Couldn\'t process this claim — please refresh and try again.' }, { status: 400 });

        const week_id = getCurrentWeekId();

        // Find ALL of this player's contribution rows for the week.
        // submitBossDamage creates a new row per run, so a player can have many.
        // We must check claimed_milestones across ALL of them to prevent re-claiming.
        const contribs = await base44.asServiceRole.entities.GlobalBossContribution.filter({
            week_id,
            user_id: walletAddress,
        });
        if (!contribs || contribs.length === 0) {
            return Response.json({ error: 'You haven\'t contributed to the raid this week yet.' }, { status: 404 });
        }

        // Already claimed on ANY row → reject
        const alreadyClaimed = contribs.some(c =>
            Array.isArray(c.claimed_milestones) && c.claimed_milestones.includes(levelNum)
        );
        if (alreadyClaimed) {
            return Response.json({ status: 'error', error: 'You\'ve already claimed this reward.' }, { status: 409 });
        }

        // Mark claimed on the first row (sufficient for the check above to catch future attempts)
        const target = contribs[0];
        const targetClaimed = Array.isArray(target.claimed_milestones) ? target.claimed_milestones : [];
        await base44.asServiceRole.entities.GlobalBossContribution.update(target.id, {
            claimed_milestones: [...targetClaimed, levelNum],
        });

        const goldReward = levelNum * 250;
        console.log('[claimBossReward] Claimed level', levelNum, 'for wallet:', walletAddress);
        return Response.json({ status: 'success', reward: { type: 'gold', id: goldReward.toString() } });
    } catch (error) {
        console.error('[claimBossReward]', error.message);
        return Response.json({ error: 'Couldn\'t claim your reward right now. Please try again.' }, { status: 500 });
    }
});