import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { OmenXServerSDK } from 'npm:@omen.foundation/game-sdk@1.0.33';
import moment from 'npm:moment@2.30.1';

const GAME_ID = 'cosmic-sloths';
const GAME_NAME = 'Cosmic Sloths';
const CHAIN_ID = '56';
const MAX_PAYOUT_PER_PLAYER = 10000; // Cap individual payouts to prevent data corruption exploits

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        // Check admin authorization: role='admin' OR wallet in AdminWallet entity
        let isAdmin = user?.role === 'admin';
        if (!isAdmin && user?.wallet_address) {
            const adminWallets = await base44.asServiceRole.entities.AdminWallet.filter({ wallet_address: user.wallet_address });
            isAdmin = adminWallets.length > 0;
        }
        if (!isAdmin) {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const apiKey = Deno.env.get('OMENX_REWARDS_API_KEY');
        const apiBaseUrl = Deno.env.get('DEVELOPER_API_BASE_URL') || 'https://api.omen.foundation';
        const sdk = new OmenXServerSDK({
            apiKey,
            apiBaseUrl,
        });

        // Use canonical period calculation to ensure uniformity across all systems
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

        // CRITICAL: Reconcile TokenPool with TokenSpendLog — auto-heal any mismatches
        const reconcilePoolBeforeDistribution = async (pool) => {
            const filterKey = pool.period_type === 'weekly' ? { week_id: pool.period_id } : { season_id: pool.period_id };
            const logs = await base44.asServiceRole.entities.TokenSpendLog.filter(filterKey);
            const logTotal = logs.reduce((sum, log) => sum + (log.amount || 0), 0);
            
            if (Math.abs(logTotal - pool.total_spent) > 0.01) {
                console.warn(`[distributeRewards] MISMATCH: ${pool.period_id} (${pool.period_type}): pool=${pool.total_spent}, logs=${logTotal}. Auto-correcting...`);
                // Always use log total as source of truth (it's from purchaseSku which is verified by OmenX)
                await base44.asServiceRole.entities.TokenPool.update(pool.id, { total_spent: logTotal });
                pool.total_spent = logTotal; // Update in-memory reference for distribution
            }
            console.log(`[distributeRewards] RECONCILED ${pool.period_type} ${pool.period_id}: ${pool.total_spent} OMENX`);
        };

        const undistributedPools = await base44.asServiceRole.entities.TokenPool.filter({ distributed: false });

        console.log(`[distributeRewards] Current period: week=${currentWeekId} season=${currentSeasonId}`);
        console.log(`[distributeRewards] Found ${undistributedPools.length} undistributed pools: ${undistributedPools.map(p => `${p.period_id}(${p.period_type})`).join(', ')}`);

        const results = [];

        for (const pool of undistributedPools) {
            const isClosedWeekly = pool.period_type === 'weekly' && pool.period_id !== currentWeekId;
            const isClosedSeasonal = pool.period_type === 'seasonal' && pool.period_id !== currentSeasonId;

            if (!isClosedWeekly && !isClosedSeasonal) {
                console.log(`[distributeRewards] SKIPPING ${pool.period_id} (${pool.period_type}) — still current period, not yet closed`);
                results.push({ pool: pool.period_id, type: pool.period_type, skipped: 'current period not yet closed' });
                continue;
            }

            // Double-distribution guard — re-fetch from DB to confirm still undistributed
            const freshPool = await base44.asServiceRole.entities.TokenPool.get(pool.id);
            if (freshPool.distributed) {
                console.warn(`[distributeRewards] DOUBLE-DISTRIBUTION GUARD: ${pool.period_id} already distributed, skipping`);
                results.push({ pool: pool.period_id, type: pool.period_type, skipped: 'already distributed' });
                continue;
            }

            if (isClosedWeekly) {
                try {
                    await reconcilePoolBeforeDistribution(pool);
                    console.log(`[distributeRewards] PRE-FLIGHT weekly ${pool.period_id}: total_spent=${pool.total_spent} reward_pool=${Math.floor(pool.total_spent * 0.25)} OMENX`);
                    const result = await distributeWeekly(base44, sdk, pool, apiBaseUrl, apiKey);
                    results.push({ pool: pool.period_id, type: 'weekly', ...result });
                } catch (err) {
                    console.error('[distributeRewards] WEEKLY FAILED:', err.message);
                    results.push({ pool: pool.period_id, type: 'weekly', error: err.message });
                }
            } else if (isClosedSeasonal) {
                try {
                    await reconcilePoolBeforeDistribution(pool);
                    console.log(`[distributeRewards] PRE-FLIGHT seasonal ${pool.period_id}: total_spent=${pool.total_spent} reward_pool=${Math.floor(pool.total_spent * 0.35)} OMENX`);
                    const result = await distributeSeasonal(base44, sdk, pool, apiBaseUrl, apiKey);
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
        let amount = Math.floor(rewardPool * getPercentageFn(i + 1) * multiplier);
        // Cap payout per player to prevent corruption exploits
        amount = Math.min(amount, MAX_PAYOUT_PER_PLAYER);
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

async function distributeWeekly(base44, sdk, pool, apiBaseUrl, apiKey) {
    // Ensure pool has valid amount (min 1 OMENX to distribute)
    if (!pool.total_spent || pool.total_spent <= 0) {
        console.warn(`[distributeRewards] Weekly ${pool.period_id}: zero spend, marking as distributed with no payouts`);
        await base44.asServiceRole.entities.TokenPool.update(pool.id, { distributed: true });
        return { paid: 0, skipped: 'zero spend' };
    }

    const rewardPool = Math.floor(pool.total_spent * 0.25);
    const scores = await base44.asServiceRole.entities.RunScore.filter({ week_id: pool.period_id }, '-score', 300);

    const payments = buildRankedPayments(scores, rewardPool, getWeeklyRewardPercentage, 30);

    if (payments.length === 0) {
        await base44.asServiceRole.entities.TokenPool.update(pool.id, { distributed: true });
        return { paid: 0, skipped: 'no eligible wallets' };
    }

    console.log(`[distributeRewards] Weekly ${pool.period_id}: paying ${payments.length} players, pool=${rewardPool} OMENX`);

    const response = await fetch(`${apiBaseUrl}/v1/game-rewards/grant-batch`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            payments: payments.map(p => ({ 
                walletAddress: p.walletAddress, 
                amount: p.amount.toString()
            })),
            gameId: GAME_ID,
            gameName: GAME_NAME,
            note: `weekly payout ${pool.period_id}`,
        }),
    });
    const batchResult = await response.json();
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${JSON.stringify(batchResult)}`);
    }

    console.log(`[distributeRewards] Batch result:`, JSON.stringify(batchResult));

    const txId = batchResult?.transactionId || batchResult?.txHash || '';
    await Promise.all([
        base44.asServiceRole.entities.TokenPool.update(pool.id, { distributed: true }),
        ...payments.map(p => base44.asServiceRole.entities.PayoutLog.create({
            period_id: pool.period_id,
            period_type: 'weekly',
            wallet_address: p.walletAddress,
            player_name: p.player_name || p.walletAddress,
            amount: p.amount,
            rank: p.rank,
            tx_id: txId
        }))
    ]);

    return { paid: payments.length, totalOmenx: payments.reduce((s, p) => s + p.amount, 0), payments };
}

async function distributeSeasonal(base44, sdk, pool, apiBaseUrl, apiKey) {
    // Ensure pool has valid amount (min 1 OMENX to distribute)
    if (!pool.total_spent || pool.total_spent <= 0) {
        console.warn(`[distributeRewards] Seasonal ${pool.period_id}: zero spend, marking as distributed with no payouts`);
        await base44.asServiceRole.entities.TokenPool.update(pool.id, { distributed: true });
        return { paid: 0, skipped: 'zero spend' };
    }

    const rewardPool = Math.floor(pool.total_spent * 0.35);
    const scores = await base44.asServiceRole.entities.RunScore.filter({ season_id: pool.period_id }, '-score', 400);

    const payments = buildRankedPayments(scores, rewardPool, getSeasonalRewardPercentage, 40);

    if (payments.length === 0) {
        await base44.asServiceRole.entities.TokenPool.update(pool.id, { distributed: true });
        return { paid: 0, skipped: 'no eligible wallets' };
    }

    console.log(`[distributeRewards] Seasonal ${pool.period_id}: paying ${payments.length} players, pool=${rewardPool} OMENX`);

    const response = await fetch(`${apiBaseUrl}/v1/game-rewards/grant-batch`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            payments: payments.map(p => ({ 
                walletAddress: p.walletAddress, 
                amount: p.amount.toString()
            })),
            gameId: GAME_ID,
            gameName: GAME_NAME,
            note: `seasonal payout ${pool.period_id}`,
        }),
    });
    const batchResult = await response.json();
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${JSON.stringify(batchResult)}`);
    }

    console.log(`[distributeRewards] Batch result:`, JSON.stringify(batchResult));

    const txId = batchResult?.transactionId || batchResult?.txHash || '';
    await Promise.all([
        base44.asServiceRole.entities.TokenPool.update(pool.id, { distributed: true }),
        ...payments.map(p => base44.asServiceRole.entities.PayoutLog.create({
            period_id: pool.period_id,
            period_type: 'seasonal',
            wallet_address: p.walletAddress,
            player_name: p.player_name || p.walletAddress,
            amount: p.amount,
            rank: p.rank,
            tx_id: txId
        }))
    ]);

    return { paid: payments.length, totalOmenx: payments.reduce((s, p) => s + p.amount, 0), payments };
}