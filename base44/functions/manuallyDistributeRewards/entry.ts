import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { OmenXServerSDK } from 'npm:@omen.foundation/game-sdk@1.0.33';

const GAME_ID = 'cosmic-sloths';
const GAME_NAME = 'Cosmic Sloths';
const MAX_PAYOUT_PER_PLAYER_CAP = 10000;

// Auth: Base44 session + 'distribute_rewards' permission, OR emergency master key.

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const body = await req.json();
        const { period_id, period_type, adminKey } = body;

        let callerWallet = 'EMERGENCY_KEY';
        if (!(adminKey && adminKey === Deno.env.get('AdminDash'))) {
            const me = await base44.auth.me();
            if (!me) return Response.json({ error: 'Unauthorized' }, { status: 401 });
            callerWallet = me.wallet_address?.toLowerCase();
            if (!callerWallet) return Response.json({ error: 'No wallet linked' }, { status: 401 });
            const records = await base44.asServiceRole.entities.AdminWallet.filter({ wallet_address: callerWallet });
            if (records.length === 0) return Response.json({ error: 'Forbidden — not an admin' }, { status: 403 });
            const perms = records[0].permissions || [];
            if (!perms.includes('distribute_rewards') && !perms.includes('owner')) {
                return Response.json({ error: "Forbidden — 'distribute_rewards' permission required" }, { status: 403 });
            }
        }

        try {
            await base44.asServiceRole.entities.AdminChangesLog.create({
                wallet_address: callerWallet,
                action_type: 'reward_adjustment',
                description: `Manual ${period_type} payout for ${period_id}`,
                details: { period_id, period_type }
            });
        } catch {}

        if (!period_id || !period_type) {
            return Response.json({ error: 'Missing period_id or period_type' }, { status: 400 });
        }

        const apiKey = Deno.env.get('OMENX_REWARDS_API_KEY');
        const apiBaseUrl = Deno.env.get('DEVELOPER_API_BASE_URL') || 'https://api.omen.foundation';
        if (!apiKey) return Response.json({ error: 'OMENX_API_KEY not configured' }, { status: 500 });

        const sdk = new OmenXServerSDK({ apiKey, apiBaseUrl });

        const pools = await base44.asServiceRole.entities.TokenPool.filter({ period_id, period_type });
        if (pools.length === 0) return Response.json({ error: 'No pool found for this period' }, { status: 404 });

        const pool = pools[0];
        console.log(`[manuallyDistributeRewards] Distributing ${period_type} ${period_id}, pool total_spent=${pool.total_spent}`);

        let result;
        if (period_type === 'weekly') {
            result = await distributeWeekly(base44, sdk, pool, apiBaseUrl, apiKey);
        } else if (period_type === 'seasonal') {
            result = await distributeSeasonal(base44, sdk, pool, apiBaseUrl, apiKey);
        } else {
            return Response.json({ error: 'Invalid period_type' }, { status: 400 });
        }

        return Response.json({ success: true, ...result });
    } catch (error) {
        console.error('[manuallyDistributeRewards] ERROR:', error);
        return Response.json({ error: error?.message || String(error) }, { status: 500 });
    }
});

// Must match distributeRewards.js — payouts capped at top 45.
function getWeeklyRewardPercentage(rank) {
    if (rank === 1) return 0.10;
    if (rank === 2) return 0.08;
    if (rank === 3) return 0.06;
    if (rank >= 4 && rank <= 10) return 0.04;
    if (rank >= 11 && rank <= 20) return 0.03;
    if (rank >= 21 && rank <= 30) return 0.018;
    if (rank >= 31 && rank <= 45) return 0.012;
    return 0;
}

function getSeasonalRewardPercentage(rank) {
    if (rank === 1) return 0.10;
    if (rank === 2) return 0.075;
    if (rank === 3) return 0.06;
    if (rank >= 4 && rank <= 10) return 0.032;
    if (rank >= 11 && rank <= 20) return 0.022;
    if (rank >= 21 && rank <= 30) return 0.015;
    if (rank >= 31 && rank <= 40) return 0.009;
    if (rank >= 41 && rank <= 45) return 0.007;
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

// Rank-tier buckets — each tier becomes its own batch (and own OmenX TX),
// so the batch-level `note` describes the exact rank or rank band being paid.
function rankTierLabel(rank) {
    if (rank === 1) return { key: 'r1',   label: 'Rank #1' };
    if (rank === 2) return { key: 'r2',   label: 'Rank #2' };
    if (rank === 3) return { key: 'r3',   label: 'Rank #3' };
    if (rank >= 4  && rank <= 10) return { key: 'r4-10',  label: 'Ranks #4–10' };
    if (rank >= 11 && rank <= 20) return { key: 'r11-20', label: 'Ranks #11–20' };
    if (rank >= 21 && rank <= 30) return { key: 'r21-30', label: 'Ranks #21–30' };
    if (rank >= 31 && rank <= 40) return { key: 'r31-40', label: 'Ranks #31–40' };
    if (rank >= 41 && rank <= 45) return { key: 'r41-45', label: 'Ranks #41–45' };
    return { key: 'other', label: `Rank #${rank}` };
}

// Group ranked payments into tier buckets and send each tier as its own
// grant-batch HTTP call so the OmenX-side note reflects the recipient's rank.
//
// IDEMPOTENCY (added 2026-05-18 after S5 seasonal payout hit a 502 mid-way):
//   - alreadyPaidWallets is the set of wallets that already have a PayoutLog row
//     for this period_id+period_type. We skip those wallets when retrying.
//   - PayoutLogs are written *per-tier* as each tier succeeds (not all at the
//     end), so a 502 partway through doesn't leave an empty audit trail.
//   - Caller is responsible for passing alreadyPaidWallets and writing logs in
//     the per-tier callback (onTierSuccess).
async function postTieredBatches(payments, apiBaseUrl, apiKey, baseNote, alreadyPaidWallets, onTierSuccess) {
    if (payments.length === 0) return { txId: '', tiersPaid: 0, tiersSkipped: 0 };
    const tiers = new Map();
    for (const p of payments) {
        // Skip wallets already paid in a previous (failed) attempt.
        if (alreadyPaidWallets && alreadyPaidWallets.has(p.walletAddress)) continue;
        const { key, label } = rankTierLabel(p.rank);
        if (!tiers.has(key)) tiers.set(key, { label, payments: [] });
        tiers.get(key).payments.push(p);
    }
    const order = ['r1', 'r2', 'r3', 'r4-10', 'r11-20', 'r21-30', 'r31-40', 'r41-45', 'other'];
    const txIds = [];
    let tiersPaid = 0;
    for (const key of order) {
        const tier = tiers.get(key);
        if (!tier || tier.payments.length === 0) continue;
        const response = await fetch(`${apiBaseUrl}/v1/game-rewards/grant-batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({
                payments: tier.payments.map(p => ({ walletAddress: p.walletAddress, amount: p.amount.toString() })),
                gameId: GAME_ID, gameName: GAME_NAME, note: `${baseNote} — ${tier.label}`,
            }),
        });
        const batchResult = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(`Tier ${tier.label} failed — HTTP ${response.status}: ${JSON.stringify(batchResult)}`);
        const txId = batchResult?.transactionId || batchResult?.txHash || '';
        if (txId) txIds.push(txId);
        tiersPaid++;
        // Write logs for THIS tier immediately so a failure in the next tier
        // doesn't lose the audit trail for tiers that already succeeded.
        if (onTierSuccess) await onTierSuccess(tier.payments, txId);
    }
    return { txId: txIds.join(','), tiersPaid, tiersSkipped: 0 };
}

async function distributeWeekly(base44, sdk, pool, apiBaseUrl, apiKey) {
    const rewardPool = Math.floor(pool.total_spent * 0.20);
    const allScores = await base44.asServiceRole.entities.RunScore.filter({ week_id: pool.period_id }, '-score', 1000);
    const scores = allScores.filter(s => s.arena_id !== 'endless');
    const payments = buildRankedPayments(scores, rewardPool, getWeeklyRewardPercentage, 45);

    // RESUME-SAFE: if a previous attempt partially paid this period, skip wallets
    // that already have a PayoutLog row so we don't double-pay.
    const existingLogs = await base44.asServiceRole.entities.PayoutLog.filter({ period_id: pool.period_id, period_type: 'weekly' }, '-created_date', 1000);
    const existingStaffLogs = await base44.asServiceRole.entities.PayoutLog.filter({ period_id: pool.period_id, period_type: 'staff_weekly' }, '-created_date', 1000);
    const alreadyPaidWallets = new Set(existingLogs.map(l => (l.wallet_address || '').toLowerCase()));
    const alreadyPaidStaff = new Set(existingStaffLogs.map(l => (l.wallet_address || '').toLowerCase()));

    // Staff payments — mirrors distributeRewards. Global default via AppConfig
    // (staff_pct_per_wallet), with per-wallet AdminWallet.payout_pct_override taking priority.
    const adminWallets = await base44.asServiceRole.entities.AdminWallet.list();
    let STAFF_PCT_PER_WALLET = 0.02;
    try {
        const cfg = await base44.asServiceRole.entities.AppConfig.filter({ key: 'staff_pct_per_wallet' });
        const v = Number(cfg[0]?.value?.pct);
        if (isFinite(v) && v >= 0 && v <= 0.10) STAFF_PCT_PER_WALLET = v;
    } catch {}
    const resolveStaffPct = (a) => {
        const o = a.payout_pct_override;
        if (o !== null && o !== undefined && isFinite(Number(o)) && Number(o) >= 0 && Number(o) <= 0.10) {
            return Number(o);
        }
        return STAFF_PCT_PER_WALLET;
    };
    const staffPayments = adminWallets
        .filter(a => a.wallet_address)
        .map(a => ({ walletAddress: a.wallet_address, amount: Math.floor(pool.total_spent * resolveStaffPct(a)), player_name: a.admin_name || a.wallet_address, isStaff: true }))
        .filter(p => p.amount >= 1);

    if (payments.length === 0 && staffPayments.length === 0) {
        await base44.asServiceRole.entities.TokenPool.update(pool.id, { distributed: true });
        return { paid: 0, skipped: 'no eligible wallets' };
    }

    // Players: one batch per rank tier so OmenX TX history shows exact rank/band.
    // PayoutLogs are written per-tier as each tier succeeds (resume-safe).
    const playerBase = `Cosmic Sloths weekly payout ${pool.period_id}`;
    const onTierSuccess = async (tierPayments, tierTxId) => {
        for (const p of tierPayments) {
            await base44.asServiceRole.entities.PayoutLog.create({
                period_id: pool.period_id, period_type: 'weekly',
                wallet_address: p.walletAddress, player_name: p.player_name || p.walletAddress,
                amount: p.amount, rank: p.rank, tx_id: tierTxId
            });
        }
    };
    const { txId: playerTxId } = await postTieredBatches(payments, apiBaseUrl, apiKey, playerBase, alreadyPaidWallets, onTierSuccess);

    // Staff: separate batch, also resume-safe — skip already-paid staff wallets.
    const remainingStaff = staffPayments.filter(p => !alreadyPaidStaff.has(p.walletAddress.toLowerCase()));
    let staffTxId = '';
    if (remainingStaff.length > 0) {
        const staffResponse = await fetch(`${apiBaseUrl}/v1/game-rewards/grant-batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({
                payments: remainingStaff.map(p => ({ walletAddress: p.walletAddress, amount: p.amount.toString() })),
                gameId: GAME_ID, gameName: GAME_NAME, note: `${playerBase} — Staff share`,
            }),
        });
        const staffResult = await staffResponse.json().catch(() => ({}));
        if (!staffResponse.ok) throw new Error(`Staff batch failed — HTTP ${staffResponse.status}: ${JSON.stringify(staffResult)}`);
        staffTxId = staffResult?.transactionId || staffResult?.txHash || '';
        for (const p of remainingStaff) {
            await base44.asServiceRole.entities.PayoutLog.create({
                period_id: pool.period_id, period_type: 'staff_weekly',
                wallet_address: p.walletAddress, player_name: p.player_name,
                amount: p.amount, rank: 0, tx_id: staffTxId
            });
        }
    }

    await base44.asServiceRole.entities.TokenPool.update(pool.id, { distributed: true });
    return {
        paid: payments.length - alreadyPaidWallets.size,
        skipped_already_paid: alreadyPaidWallets.size,
        staff_paid: remainingStaff.length,
        staff_skipped_already_paid: staffPayments.length - remainingStaff.length,
        totalOmenx: payments.filter(p => !alreadyPaidWallets.has(p.walletAddress.toLowerCase())).reduce((s, p) => s + p.amount, 0),
        staffOmenx: remainingStaff.reduce((s, p) => s + p.amount, 0),
    };
}

async function distributeSeasonal(base44, sdk, pool, apiBaseUrl, apiKey) {
    // Seasonal pool split: 30% to top players, 10% to Squad Wars Champions (separate fn).
    const rewardPool = Math.floor(pool.total_spent * 0.30);
    const allScores = await base44.asServiceRole.entities.RunScore.filter({ season_id: pool.period_id }, '-score', 1000);
    const scores = allScores.filter(s => s.arena_id !== 'endless');
    const payments = buildRankedPayments(scores, rewardPool, getSeasonalRewardPercentage, 45);

    if (payments.length === 0) {
        await base44.asServiceRole.entities.TokenPool.update(pool.id, { distributed: true });
        return { paid: 0, skipped: 'no eligible wallets' };
    }

    // RESUME-SAFE: skip wallets that already have a PayoutLog for this period.
    const existingLogs = await base44.asServiceRole.entities.PayoutLog.filter({ period_id: pool.period_id, period_type: 'seasonal' }, '-created_date', 1000);
    const alreadyPaidWallets = new Set(existingLogs.map(l => (l.wallet_address || '').toLowerCase()));

    // One batch per rank tier so OmenX TX history shows exact rank/band.
    // PayoutLogs written per-tier so partial failures preserve the audit trail.
    const onTierSuccess = async (tierPayments, tierTxId) => {
        for (const p of tierPayments) {
            await base44.asServiceRole.entities.PayoutLog.create({
                period_id: pool.period_id, period_type: 'seasonal',
                wallet_address: p.walletAddress, player_name: p.player_name || p.walletAddress,
                amount: p.amount, rank: p.rank, tx_id: tierTxId
            });
        }
    };
    const { txId, tiersPaid } = await postTieredBatches(
        payments, apiBaseUrl, apiKey,
        `Cosmic Sloths seasonal payout ${pool.period_id}`,
        alreadyPaidWallets, onTierSuccess
    );

    await base44.asServiceRole.entities.TokenPool.update(pool.id, { distributed: true });
    const newlyPaid = payments.filter(p => !alreadyPaidWallets.has(p.walletAddress.toLowerCase()));
    return {
        paid: newlyPaid.length,
        skipped_already_paid: alreadyPaidWallets.size,
        tiersPaid,
        totalOmenx: newlyPaid.reduce((s, p) => s + p.amount, 0),
        payments: newlyPaid,
    };
}