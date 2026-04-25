import { createClient } from 'npm:@base44/sdk@0.8.25';
import { OmenXServerSDK } from 'npm:@omen.foundation/game-sdk@1.0.33';

const db = createClient({ serviceRole: true, appId: Deno.env.get('BASE44_APP_ID') });

const GAME_ID = 'cosmic-sloths';
const GAME_NAME = 'Cosmic Sloths';

Deno.serve(async (req) => {
    try {
        const { period_id, period_type, adminKey } = await req.json();
        const expectedKey = Deno.env.get('AdminDash');
        if (!adminKey || adminKey !== expectedKey) return Response.json({ error: 'Forbidden' }, { status: 403 });
        if (!period_id || !period_type) {
            return Response.json({ error: 'Missing period_id or period_type' }, { status: 400 });
        }

        const apiKey = Deno.env.get('OMENX_REWARDS_API_KEY');
        const apiBaseUrl = Deno.env.get('DEVELOPER_API_BASE_URL') || 'https://api.omen.foundation';
        if (!apiKey) return Response.json({ error: 'OMENX_API_KEY not configured' }, { status: 500 });

        const sdk = new OmenXServerSDK({ apiKey, apiBaseUrl });

        const pools = await db.entities.TokenPool.filter({ period_id, period_type });
        if (pools.length === 0) return Response.json({ error: 'No pool found for this period' }, { status: 404 });

        const pool = pools[0];
        console.log(`[manuallyDistributeRewards] Distributing ${period_type} ${period_id}, pool total_spent=${pool.total_spent}`);

        let result;
        if (period_type === 'weekly') {
            result = await distributeWeekly(sdk, pool, apiBaseUrl, apiKey);
        } else if (period_type === 'seasonal') {
            result = await distributeSeasonal(sdk, pool, apiBaseUrl, apiKey);
        } else {
            return Response.json({ error: 'Invalid period_type' }, { status: 400 });
        }

        return Response.json({ success: true, ...result });
    } catch (error) {
        console.error('[manuallyDistributeRewards] ERROR:', error);
        return Response.json({ error: error?.message || String(error) }, { status: 500 });
    }
});

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
            payments.push({ walletAddress: uniqueScores[i].wallet_address, amount, rank: i + 1, player_name: uniqueScores[i].player_name });
        }
    }
    return payments;
}

async function distributeWeekly(sdk, pool, apiBaseUrl, apiKey) {
    const rewardPool = Math.floor(pool.total_spent * 0.25);
    const allScores = await db.entities.RunScore.filter({ week_id: pool.period_id }, '-score', 300);
    // Endless mode runs are NOT eligible for OMENX payouts (display-only leaderboard)
    const scores = allScores.filter(s => s.arena_id !== 'endless');
    const payments = buildRankedPayments(scores, rewardPool, getWeeklyRewardPercentage, 30);

    if (payments.length === 0) {
        await db.entities.TokenPool.update(pool.id, { distributed: true });
        return { paid: 0, skipped: 'no eligible wallets' };
    }

    const response = await fetch(`${apiBaseUrl}/v1/game-rewards/grant-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
            payments: payments.map(p => ({ walletAddress: p.walletAddress, amount: p.amount.toString() })),
            gameId: GAME_ID, gameName: GAME_NAME, note: `weekly payout ${pool.period_id}`,
        }),
    });
    const batchResult = await response.json();
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${JSON.stringify(batchResult)}`);

    for (const p of payments) {
        await db.entities.PayoutLog.create({
            period_id: pool.period_id, period_type: 'weekly',
            wallet_address: p.walletAddress, player_name: p.player_name || p.walletAddress,
            amount: p.amount, rank: p.rank, tx_id: batchResult?.transactionId || batchResult?.txHash || ''
        });
    }

    await db.entities.TokenPool.update(pool.id, { distributed: true });
    return { paid: payments.length, totalOmenx: payments.reduce((s, p) => s + p.amount, 0), payments };
}

async function distributeSeasonal(sdk, pool, apiBaseUrl, apiKey) {
    const rewardPool = Math.floor(pool.total_spent * 0.35);
    const allScores = await db.entities.RunScore.filter({ season_id: pool.period_id }, '-score', 400);
    // Endless mode runs are NOT eligible for OMENX payouts (display-only leaderboard)
    const scores = allScores.filter(s => s.arena_id !== 'endless');
    const payments = buildRankedPayments(scores, rewardPool, getSeasonalRewardPercentage, 40);

    if (payments.length === 0) {
        await db.entities.TokenPool.update(pool.id, { distributed: true });
        return { paid: 0, skipped: 'no eligible wallets' };
    }

    const response = await fetch(`${apiBaseUrl}/v1/game-rewards/grant-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
            payments: payments.map(p => ({ walletAddress: p.walletAddress, amount: p.amount.toString() })),
            gameId: GAME_ID, gameName: GAME_NAME, note: `seasonal payout ${pool.period_id}`,
        }),
    });
    const batchResult = await response.json();
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${JSON.stringify(batchResult)}`);

    for (const p of payments) {
        await db.entities.PayoutLog.create({
            period_id: pool.period_id, period_type: 'seasonal',
            wallet_address: p.walletAddress, player_name: p.player_name || p.walletAddress,
            amount: p.amount, rank: p.rank, tx_id: batchResult?.transactionId || batchResult?.txHash || ''
        });
    }

    await db.entities.TokenPool.update(pool.id, { distributed: true });
    return { paid: payments.length, totalOmenx: payments.reduce((s, p) => s + p.amount, 0), payments };
}