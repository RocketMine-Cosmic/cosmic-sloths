import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { OmenXServerSDK } from 'npm:@omen.foundation/game-sdk@1.0.33';

const GAME_ID = 'cosmic-sloths';
const GAME_NAME = 'Cosmic Sloths';
const CHAIN_ID = '56';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

        const { period_id, period_type } = await req.json();
        if (!period_id || !period_type) {
            return Response.json({ error: 'Missing period_id or period_type' }, { status: 400 });
        }

        const apiKey = Deno.env.get('OMENX_API_KEY');
        if (!apiKey) {
            console.error('[manuallyDistributeRewards] OMENX_API_KEY not set');
            return Response.json({ error: 'OMENX_API_KEY not configured' }, { status: 500 });
        }

        const sdk = new OmenXServerSDK({
            apiKey,
            apiBaseUrl: 'https://api.omen.foundation',
        });

        // Fetch the pool
        const pools = await base44.asServiceRole.entities.TokenPool.filter({ 
            period_id, 
            period_type 
        });

        if (pools.length === 0) {
            return Response.json({ error: 'No pool found for this period' }, { status: 404 });
        }

        const pool = pools[0];
        console.log(`[manuallyDistributeRewards] Distributing ${period_type} ${period_id}, pool total_spent=${pool.total_spent}`);

        let result;
        if (period_type === 'weekly') {
            result = await distributeWeekly(base44, sdk, pool);
        } else if (period_type === 'seasonal') {
            result = await distributeSeasonal(base44, sdk, pool);
        } else {
            return Response.json({ error: 'Invalid period_type' }, { status: 400 });
        }

        return Response.json({ success: true, ...result });
    } catch (error) {
        console.error('[manuallyDistributeRewards] ERROR:', error);
        console.error('[manuallyDistributeRewards] Stack:', error?.stack);
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

async function distributeWeekly(base44, sdk, pool) {
    const rewardPool = Math.floor(pool.total_spent * 0.25);
    const scores = await base44.asServiceRole.entities.RunScore.filter({ week_id: pool.period_id }, '-score', 300);

    const payments = buildRankedPayments(scores, rewardPool, getWeeklyRewardPercentage, 30);

    if (payments.length === 0) {
        await base44.asServiceRole.entities.TokenPool.update(pool.id, { distributed: true });
        return { paid: 0, skipped: 'no eligible wallets' };
    }

    console.log(`[manuallyDistributeRewards] Weekly ${pool.period_id}: paying ${payments.length} players, pool=${rewardPool} OMENX`);

    try {
        const batchResult = await sdk.grantGameRewardBatch({
            payments: payments.map(p => ({ 
                walletAddress: p.walletAddress, 
                amount: p.amount,
                token: 'OMENX'
            })),
            gameId: GAME_ID,
            gameName: GAME_NAME,
            chainId: CHAIN_ID,
        });
        console.log(`[manuallyDistributeRewards] Batch result:`, JSON.stringify(batchResult));
    } catch (sdkErr) {
        console.error('[manuallyDistributeRewards] SDK grant error:', sdkErr?.message);
        console.error('[manuallyDistributeRewards] SDK error response:', sdkErr?.response?.data || sdkErr?.response);
        throw sdkErr;
    }

    await base44.asServiceRole.entities.TokenPool.update(pool.id, { distributed: true });
    return { paid: payments.length, totalOmenx: payments.reduce((s, p) => s + p.amount, 0), payments };
}

async function distributeSeasonal(base44, sdk, pool) {
    const rewardPool = Math.floor(pool.total_spent * 0.35);
    const scores = await base44.asServiceRole.entities.RunScore.filter({ season_id: pool.period_id }, '-score', 400);

    const payments = buildRankedPayments(scores, rewardPool, getSeasonalRewardPercentage, 40);

    if (payments.length === 0) {
        await base44.asServiceRole.entities.TokenPool.update(pool.id, { distributed: true });
        return { paid: 0, skipped: 'no eligible wallets' };
    }

    console.log(`[manuallyDistributeRewards] Seasonal ${pool.period_id}: paying ${payments.length} players, pool=${rewardPool} OMENX`);

    try {
        const batchResult = await sdk.grantGameRewardBatch({
            payments: payments.map(p => ({ 
                walletAddress: p.walletAddress, 
                amount: p.amount,
                token: 'OMENX'
            })),
            gameId: GAME_ID,
            gameName: GAME_NAME,
            chainId: CHAIN_ID,
        });
        console.log(`[manuallyDistributeRewards] Batch result:`, JSON.stringify(batchResult));
    } catch (sdkErr) {
        console.error('[manuallyDistributeRewards] SDK grant error:', sdkErr?.message);
        console.error('[manuallyDistributeRewards] SDK error response:', sdkErr?.response?.data || sdkErr?.response);
        throw sdkErr;
    }

    await base44.asServiceRole.entities.TokenPool.update(pool.id, { distributed: true });
    return { paid: payments.length, totalOmenx: payments.reduce((s, p) => s + p.amount, 0), payments };
}