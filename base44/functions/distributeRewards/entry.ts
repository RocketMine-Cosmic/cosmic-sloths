import { createClient } from 'npm:@base44/sdk@0.8.25';
import { OmenXServerSDK } from 'npm:@omen.foundation/game-sdk@1.0.33';

const db = createClient({ appId: Deno.env.get('BASE44_APP_ID') });

const GAME_ID = 'cosmic-sloths';
const GAME_NAME = 'Cosmic Sloths';
const MAX_PAYOUT_PER_PLAYER_CAP = 10000;

Deno.serve(async (req) => {
    try {
        const { adminKey } = await req.json();
        const expectedKey = Deno.env.get('AdminDash');
        if (!adminKey || adminKey !== expectedKey) {
            return Response.json({ error: 'Forbidden' }, { status: 403 });
        }

        const apiKey = Deno.env.get('OMENX_REWARDS_API_KEY');
        const apiBaseUrl = Deno.env.get('DEVELOPER_API_BASE_URL') || 'https://api.omen.foundation';
        const sdk = new OmenXServerSDK({ apiKey, apiBaseUrl });

        const getCurrentPeriodIds = () => {
            const now = new Date();
            const year = now.getUTCFullYear();
            const startOfYear = new Date(Date.UTC(year, 0, 1));
            const startOfWeek = new Date(startOfYear);
            startOfWeek.setUTCDate(startOfYear.getUTCDate() - startOfYear.getUTCDay() + 1);
            const isoWeek = Math.ceil(((now - startOfWeek) / 86400000 + 1) / 7);
            const week_id = `${year}-W${String(isoWeek).padStart(2, '0')}`;
            const seasonNum = Math.floor((isoWeek - 1) / 4) + 1;
            const season_id = `${year}-S${seasonNum}`;
            return { week_id, season_id };
        };
        const { week_id: currentWeekId, season_id: currentSeasonId } = getCurrentPeriodIds();

        const reconcilePoolBeforeDistribution = async (pool) => {
            const filterKey = pool.period_type === 'weekly' ? { week_id: pool.period_id } : { season_id: pool.period_id };
            const logs = await db.entities.TokenSpendLog.filter(filterKey);
            const logTotal = logs.reduce((sum, log) => sum + (log.amount || 0), 0);
            if (Math.abs(logTotal - pool.total_spent) > 0.01) {
                console.warn(`[distributeRewards] MISMATCH: ${pool.period_id} pool=${pool.total_spent}, logs=${logTotal}. Auto-correcting...`);
                await db.entities.TokenPool.update(pool.id, { total_spent: logTotal });
                pool.total_spent = logTotal;
            }
        };

        const undistributedPools = await db.entities.TokenPool.filter({ distributed: false });
        const results = [];

        for (const pool of undistributedPools) {
            const isClosedWeekly = pool.period_type === 'weekly' && pool.period_id !== currentWeekId;
            const isClosedSeasonal = pool.period_type === 'seasonal' && pool.period_id !== currentSeasonId;

            if (!isClosedWeekly && !isClosedSeasonal) {
                results.push({ pool: pool.period_id, type: pool.period_type, skipped: 'current period not yet closed' });
                continue;
            }

            const freshPool = await db.entities.TokenPool.get(pool.id);
            if (freshPool.distributed) {
                results.push({ pool: pool.period_id, type: pool.period_type, skipped: 'already distributed' });
                continue;
            }

            if (isClosedWeekly) {
                try {
                    await reconcilePoolBeforeDistribution(pool);
                    const result = await distributeWeekly(sdk, pool, apiBaseUrl, apiKey);
                    results.push({ pool: pool.period_id, type: 'weekly', ...result });
                } catch (err) {
                    console.error('[distributeRewards] WEEKLY FAILED:', err.message);
                    results.push({ pool: pool.period_id, type: 'weekly', error: err.message });
                }
            } else if (isClosedSeasonal) {
                try {
                    await reconcilePoolBeforeDistribution(pool);
                    const result = await distributeSeasonal(sdk, pool, apiBaseUrl, apiKey);
                    results.push({ pool: pool.period_id, type: 'seasonal', ...result });
                } catch (err) {
                    console.error('[distributeRewards] SEASONAL FAILED:', err.message);
                    results.push({ pool: pool.period_id, type: 'seasonal', error: err.message });
                }
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
        let amount = Math.floor(rewardPool * getPercentageFn(i + 1) * multiplier);
        amount = Math.min(amount, MAX_PAYOUT_PER_PLAYER_CAP);
        if (amount >= 1) {
            payments.push({ walletAddress: uniqueScores[i].wallet_address, amount, rank: i + 1, player_name: uniqueScores[i].player_name });
        }
    }
    return payments;
}

async function distributeWeekly(sdk, pool, apiBaseUrl, apiKey) {
     if (!pool.total_spent || pool.total_spent <= 0) {
         await db.entities.TokenPool.update(pool.id, { distributed: true });
         return { paid: 0, skipped: 'zero spend' };
     }
     const adminWallets = await db.entities.AdminWallet.list();
     const STAFF_PCT_PER_WALLET = 0.02;
     const rewardPool = Math.floor(pool.total_spent * 0.25);
     const scores = await db.entities.RunScore.filter({ week_id: pool.period_id }, '-score', 1000);
     const uniquePlayerCount = new Set(scores.map(s => s.wallet_address)).size;
     const dynamicMaxRank = Math.max(30, Math.ceil(uniquePlayerCount * 0.10));
     const payments = buildRankedPayments(scores, rewardPool, getWeeklyRewardPercentage, dynamicMaxRank);
    const staffPayments = adminWallets
        .filter(a => a.wallet_address)
        .map(a => ({ walletAddress: a.wallet_address, amount: Math.floor(pool.total_spent * STAFF_PCT_PER_WALLET), player_name: a.admin_name || a.wallet_address, isStaff: true }))
        .filter(p => p.amount >= 1);
    const allPayments = [...payments, ...staffPayments];
    if (allPayments.length === 0) {
        await db.entities.TokenPool.update(pool.id, { distributed: true });
        return { paid: 0, skipped: 'no eligible wallets' };
    }
    const response = await fetch(`${apiBaseUrl}/v1/game-rewards/grant-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ payments: allPayments.map(p => ({ walletAddress: p.walletAddress, amount: p.amount.toString() })), gameId: GAME_ID, gameName: GAME_NAME, note: `weekly payout ${pool.period_id}` }),
    });
    const batchResult = await response.json();
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${JSON.stringify(batchResult)}`);
    const txId = batchResult?.transactionId || batchResult?.txHash || '';
    await Promise.all([
        db.entities.TokenPool.update(pool.id, { distributed: true }),
        ...payments.map(p => db.entities.PayoutLog.create({ period_id: pool.period_id, period_type: 'weekly', wallet_address: p.walletAddress, player_name: p.player_name || p.walletAddress, amount: p.amount, rank: p.rank, tx_id: txId })),
        ...staffPayments.map(p => db.entities.PayoutLog.create({ period_id: pool.period_id, period_type: 'staff_weekly', wallet_address: p.walletAddress, player_name: p.player_name, amount: p.amount, rank: 0, tx_id: txId })),
    ]);
    return { paid: payments.length, staff_paid: staffPayments.length, totalOmenx: payments.reduce((s, p) => s + p.amount, 0), staffOmenx: staffPayments.reduce((s, p) => s + p.amount, 0), payments, staffPayments };
}

async function distributeSeasonal(sdk, pool, apiBaseUrl, apiKey) {
     if (!pool.total_spent || pool.total_spent <= 0) {
         await db.entities.TokenPool.update(pool.id, { distributed: true });
         return { paid: 0, skipped: 'zero spend' };
     }
     const rewardPool = Math.floor(pool.total_spent * 0.35);
     const scores = await db.entities.RunScore.filter({ season_id: pool.period_id }, '-score', 1000);
     const uniquePlayerCount = new Set(scores.map(s => s.wallet_address)).size;
     const dynamicMaxRank = Math.max(40, Math.ceil(uniquePlayerCount * 0.08));
     const payments = buildRankedPayments(scores, rewardPool, getSeasonalRewardPercentage, dynamicMaxRank);
    if (payments.length === 0) {
        await db.entities.TokenPool.update(pool.id, { distributed: true });
        return { paid: 0, skipped: 'no eligible wallets' };
    }
    const response = await fetch(`${apiBaseUrl}/v1/game-rewards/grant-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ payments: payments.map(p => ({ walletAddress: p.walletAddress, amount: p.amount.toString() })), gameId: GAME_ID, gameName: GAME_NAME, note: `seasonal payout ${pool.period_id}` }),
    });
    const batchResult = await response.json();
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${JSON.stringify(batchResult)}`);
    const txId = batchResult?.transactionId || batchResult?.txHash || '';
    await Promise.all([
        db.entities.TokenPool.update(pool.id, { distributed: true }),
        ...payments.map(p => db.entities.PayoutLog.create({ period_id: pool.period_id, period_type: 'seasonal', wallet_address: p.walletAddress, player_name: p.player_name || p.walletAddress, amount: p.amount, rank: p.rank, tx_id: txId })),
    ]);
    return { paid: payments.length, totalOmenx: payments.reduce((s, p) => s + p.amount, 0), payments };
}