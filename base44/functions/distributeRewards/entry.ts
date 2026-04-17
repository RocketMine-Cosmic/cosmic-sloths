import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { OmenXServerSDK } from 'npm:@omen.foundation/game-sdk@1.0.33';
import moment from 'npm:moment@2.30.1';

const GAME_ID = 'cosmic-sloths';
const GAME_NAME = 'Cosmic Sloths';
const CHAIN_ID = '56';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

        const apiKey = Deno.env.get('OMENX_API_KEY');
        const apiBaseUrl = Deno.env.get('DEVELOPER_API_BASE_URL') || 'https://staging.api.omen.foundation';
        const sdk = new OmenXServerSDK({
            apiKey,
            apiBaseUrl,
        });

        const currentWeekId = moment().format('YYYY-[W]ww');
        const currentSeasonNum = Math.floor(moment().week() / 4) + 1;
        const currentSeasonId = `${moment().format('YYYY')}-S${currentSeasonNum}`;

        const undistributedPools = await base44.asServiceRole.entities.TokenPool.filter({ distributed: false });

        const results = [];

        for (const pool of undistributedPools) {
            if (pool.period_type === 'weekly' && pool.period_id !== currentWeekId) {
                const result = await distributeWeekly(base44, sdk, pool, apiBaseUrl);
                results.push({ pool: pool.period_id, type: 'weekly', ...result });
            } else if (pool.period_type === 'seasonal' && pool.period_id !== currentSeasonId) {
                const result = await distributeSeasonal(base44, sdk, pool, apiBaseUrl);
                results.push({ pool: pool.period_id, type: 'seasonal', ...result });
            }
        }

        return Response.json({ success: true, results });
    } catch (error) {
        console.error('[distributeRewards]', error.message);
        return Response.json({ error: error.message }, { status: 500 });
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
    // Dedup strictly by wallet_address (primary), then user_id fallback
    const uniqueScores = [];
    const seenWallets = new Set();
    const seenUserIds = new Set();

    for (const score of scores) {
        if (uniqueScores.length >= maxRank) break;
        const wallet = score.wallet_address;
        const userId = score.user_id;

        // Must have a wallet to receive on-chain rewards
        if (!wallet) continue;
        if (seenWallets.has(wallet)) continue;
        if (userId && seenUserIds.has(userId)) continue;

        seenWallets.add(wallet);
        if (userId) seenUserIds.add(userId);
        uniqueScores.push(score);
    }

    // Normalise percentages so they sum to 100%
    let totalPct = 0;
    for (let i = 0; i < uniqueScores.length; i++) totalPct += getPercentageFn(i + 1);
    if (totalPct === 0 || uniqueScores.length === 0) return [];

    const multiplier = 1 / totalPct;

    const payments = [];
    for (let i = 0; i < uniqueScores.length; i++) {
        const amount = Math.floor(rewardPool * getPercentageFn(i + 1) * multiplier);
        if (amount >= 1) {
            payments.push({
                walletAddress: uniqueScores[i].wallet_address,
                amount,
                rank: i + 1,
                player_name: uniqueScores[i].player_name,
            });
        }
    }
    return payments;
}

async function distributeWeekly(base44, sdk, pool, apiBaseUrl) {
    const rewardPool = Math.floor(pool.total_spent * 0.25);
    const scores = await base44.asServiceRole.entities.RunScore.filter({ week_id: pool.period_id }, '-score', 300);

    const payments = buildRankedPayments(scores, rewardPool, getWeeklyRewardPercentage, 30);

    if (payments.length === 0) {
        await base44.asServiceRole.entities.TokenPool.update(pool.id, { distributed: true });
        return { paid: 0, skipped: 'no eligible wallets' };
    }

    console.log(`[distributeRewards] Weekly ${pool.period_id}: paying ${payments.length} players, pool=${rewardPool} OMENX`);

    const response = await fetch(`${apiBaseUrl}/v1/games/${GAME_ID}/rewards/batch`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            payments: payments.map(p => ({ 
                walletAddress: p.walletAddress, 
                amount: p.amount
            })),
            gameId: GAME_ID,
            gameName: GAME_NAME,
            chainId: CHAIN_ID,
            note: `weekly payout ${pool.period_id}`,
        }),
    });
    const batchResult = await response.json();
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${JSON.stringify(batchResult)}`);
    }

    console.log(`[distributeRewards] Batch result:`, JSON.stringify(batchResult));

    await base44.asServiceRole.entities.TokenPool.update(pool.id, { distributed: true });
    return { paid: payments.length, totalOmenx: payments.reduce((s, p) => s + p.amount, 0), payments };
}

async function distributeSeasonal(base44, sdk, pool, apiBaseUrl) {
    const rewardPool = Math.floor(pool.total_spent * 0.35);
    const scores = await base44.asServiceRole.entities.RunScore.filter({ season_id: pool.period_id }, '-score', 400);

    const payments = buildRankedPayments(scores, rewardPool, getSeasonalRewardPercentage, 40);

    if (payments.length === 0) {
        await base44.asServiceRole.entities.TokenPool.update(pool.id, { distributed: true });
        return { paid: 0, skipped: 'no eligible wallets' };
    }

    console.log(`[distributeRewards] Seasonal ${pool.period_id}: paying ${payments.length} players, pool=${rewardPool} OMENX`);

    const response = await fetch(`${apiBaseUrl}/v1/games/${GAME_ID}/rewards/batch`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            payments: payments.map(p => ({ 
                walletAddress: p.walletAddress, 
                amount: p.amount
            })),
            gameId: GAME_ID,
            gameName: GAME_NAME,
            chainId: CHAIN_ID,
            note: `seasonal payout ${pool.period_id}`,
        }),
    });
    const batchResult = await response.json();
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${JSON.stringify(batchResult)}`);
    }

    console.log(`[distributeRewards] Batch result:`, JSON.stringify(batchResult));

    await base44.asServiceRole.entities.TokenPool.update(pool.id, { distributed: true });
    return { paid: payments.length, totalOmenx: payments.reduce((s, p) => s + p.amount, 0), payments };
}