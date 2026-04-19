import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function getWeeklyRewardPercentage(rank) {
    if (rank === 1) return 0.10;
    if (rank === 2) return 0.08;
    if (rank === 3) return 0.06;
    if (rank >= 4 && rank <= 10) return 0.04;
    if (rank >= 11 && rank <= 20) return 0.03;
    if (rank >= 21 && rank <= 30) return 0.018;
    return 0;
}

function getSeasonalRewardPercentage(rank) {
    if (rank === 1) return 0.08;
    if (rank === 2) return 0.06;
    if (rank === 3) return 0.05;
    if (rank >= 4 && rank <= 10) return 0.03;
    if (rank >= 11 && rank <= 20) return 0.025;
    if (rank >= 21 && rank <= 30) return 0.02;
    if (rank >= 31 && rank <= 40) return 0.015;
    return 0;
}

function buildRankedPayments(scores, rewardPool, getPercentageFn, maxRank) {
    const uniqueScores = [];
    const seenWallets = new Set();
    const seenUserIds = new Set();

    for (const score of scores) {
        if (uniqueScores.length >= maxRank) break;
        const wallet = score.wallet_address;
        const userId = score.user_id;
        if (!wallet) continue;
        if (seenWallets.has(wallet)) continue;
        if (userId && seenUserIds.has(userId)) continue;
        seenWallets.add(wallet);
        if (userId) seenUserIds.add(userId);
        uniqueScores.push(score);
    }

    let totalPct = 0;
    for (let i = 0; i < uniqueScores.length; i++) totalPct += getPercentageFn(i + 1);
    if (totalPct === 0 || uniqueScores.length === 0) return [];

    const multiplier = 1 / totalPct;
    const payments = [];
    for (let i = 0; i < uniqueScores.length; i++) {
        const amount = Math.floor(rewardPool * getPercentageFn(i + 1) * multiplier);
        if (amount >= 1) {
            payments.push({
                rank: i + 1,
                wallet_address: uniqueScores[i].wallet_address,
                player_name: uniqueScores[i].player_name,
                score: uniqueScores[i].score,
                amount,
            });
        }
    }
    return payments;
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { period_id, period_type, adminKey } = await req.json();
        const expectedKey = Deno.env.get('AdminDash');
        if (!adminKey || adminKey !== expectedKey) return Response.json({ error: 'Forbidden' }, { status: 403 });
        if (!period_id || !period_type) return Response.json({ error: 'period_id and period_type required' }, { status: 400 });

        const pools = await base44.asServiceRole.entities.TokenPool.filter({ period_id, period_type });
        if (pools.length === 0) return Response.json({ error: 'No pool found for that period' }, { status: 404 });

        const pool = pools[0];

        let payments = [];
        let rewardPool = 0;

        if (period_type === 'weekly') {
            rewardPool = Math.floor(pool.total_spent * 0.25);
            const scores = await base44.asServiceRole.entities.RunScore.filter({ week_id: period_id }, '-score', 300);
            payments = buildRankedPayments(scores, rewardPool, getWeeklyRewardPercentage, 30);
        } else if (period_type === 'seasonal') {
            rewardPool = Math.floor(pool.total_spent * 0.35);
            const scores = await base44.asServiceRole.entities.RunScore.filter({ season_id: period_id }, '-score', 400);
            payments = buildRankedPayments(scores, rewardPool, getSeasonalRewardPercentage, 40);
        } else {
            return Response.json({ error: 'Invalid period_type' }, { status: 400 });
        }

        return Response.json({
            period_id,
            period_type,
            total_spent: pool.total_spent,
            reward_pool: rewardPool,
            distributed: pool.distributed,
            total_payout: payments.reduce((s, p) => s + p.amount, 0),
            player_count: payments.length,
            payments,
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});