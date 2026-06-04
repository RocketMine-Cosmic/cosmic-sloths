import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { OmenXServerSDK } from 'npm:@omen.foundation/game-sdk@1.0.33';

const GAME_ID = 'cosmic-sloths';
const GAME_NAME = 'Cosmic Sloths';
const MAX_PAYOUT_PER_PLAYER_CAP = 10000;

// S7 pool re-split gate (2026-06-04). Periods >= S7 use AppConfig-driven pool
// %s (15% weekly + 20% seasonal + 5% weekly kill pool); earlier periods keep
// the legacy 20/30 / no-kill split untouched. See docs/OMENX_POOL_RESPLIT_PLAN.md.
const NEW_POOL_SEASON = '2026-S7';
function getPeriodSeason(period_id, period_type) {
    if (period_type === 'seasonal') return period_id;
    const m = String(period_id || '').match(/^(\d{4})-W(\d{1,2})$/);
    if (!m) return null;
    const seasonNum = Math.floor((Number(m[2]) - 1) / 4) + 1;
    return m[1] + '-S' + seasonNum;
}
function isNewPoolPeriod(period_id, period_type) {
    const s = getPeriodSeason(period_id, period_type);
    if (!s) return false;
    // Numeric compare — string compare breaks at 2026-S10 vs 2026-S7 ('1' < '7').
    const m = s.match(/^(\d{4})-S(\d{1,2})$/);
    if (!m) return false;
    const year = Number(m[1]);
    const seas = Number(m[2]);
    if (year > 2026) return true;
    if (year < 2026) return false;
    return seas >= 7;
}

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

// Payout config loaded from AppConfig at distribution time. Defaults match
// distributeRewards.js. Admin edits via functions/leaderboardPayoutConfig.
const DEFAULT_PAYOUT_CONFIG = {
    top_n: 20,
    weekly_pool_pct: 0.15,
    seasonal_pool_pct: 0.20,
    kill_pool_pct: 0.05,
    weekly_tiers: [
        { min: 1,  max: 1,  pct: 0.10 },
        { min: 2,  max: 2,  pct: 0.08 },
        { min: 3,  max: 3,  pct: 0.06 },
        { min: 4,  max: 10, pct: 0.04 },
        { min: 11, max: 20, pct: 0.03 },
    ],
    seasonal_tiers: [
        { min: 1,  max: 1,  pct: 0.10 },
        { min: 2,  max: 2,  pct: 0.075 },
        { min: 3,  max: 3,  pct: 0.06 },
        { min: 4,  max: 10, pct: 0.032 },
        { min: 11, max: 20, pct: 0.022 },
    ],
    weekly_kill_tiers: [
        { min: 1,  max: 1,  pct: 0.15 },
        { min: 2,  max: 2,  pct: 0.10 },
        { min: 3,  max: 3,  pct: 0.08 },
        { min: 4,  max: 10, pct: 0.05 },
        { min: 11, max: 20, pct: 0.025 },
    ],
};

async function loadPayoutConfig(base44) {
    try {
        const rows = await base44.asServiceRole.entities.AppConfig.filter({ key: 'leaderboard_payout_config' });
        return rows[0]?.value || DEFAULT_PAYOUT_CONFIG;
    } catch {
        return DEFAULT_PAYOUT_CONFIG;
    }
}

function makeTierLookup(tiers) {
    return (rank) => {
        const t = tiers.find(t => rank >= t.min && rank <= t.max);
        return t ? t.pct : 0;
    };
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
    // S7 gate — periods >= S7 use config-driven pool % (15%); earlier use 20%.
    const useNewPools = isNewPoolPeriod(pool.period_id, 'weekly');
    const cfg = await loadPayoutConfig(base44);
    const weeklyPoolPct = useNewPools
        ? (Number.isFinite(Number(cfg.weekly_pool_pct)) ? Number(cfg.weekly_pool_pct) : 0.15)
        : 0.20;
    const rewardPool = Math.floor(pool.total_spent * weeklyPoolPct);
    const allScores = await base44.asServiceRole.entities.RunScore.filter({ week_id: pool.period_id }, '-score', 1000);
    const scores = allScores.filter(s => s.arena_id !== 'endless');
    const payments = buildRankedPayments(scores, rewardPool, makeTierLookup(cfg.weekly_tiers), cfg.top_n);

    // RESUME-SAFE: if a previous attempt partially paid this period, skip wallets
    // that already have a PayoutLog row so we don't double-pay. Three buckets:
    // weekly (score), staff_weekly, and weekly_kills (S7+ only).
    const [existingLogs, existingStaffLogs, existingKillLogs] = await Promise.all([
        base44.asServiceRole.entities.PayoutLog.filter({ period_id: pool.period_id, period_type: 'weekly' }, '-created_date', 1000),
        base44.asServiceRole.entities.PayoutLog.filter({ period_id: pool.period_id, period_type: 'staff_weekly' }, '-created_date', 1000),
        base44.asServiceRole.entities.PayoutLog.filter({ period_id: pool.period_id, period_type: 'weekly_kills' }, '-created_date', 1000),
    ]);
    const alreadyPaidWallets = new Set(existingLogs.map(l => (l.wallet_address || '').toLowerCase()));
    const alreadyPaidStaff = new Set(existingStaffLogs.map(l => (l.wallet_address || '').toLowerCase()));
    const alreadyPaidKills = new Set(existingKillLogs.map(l => (l.wallet_address || '').toLowerCase()));

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

    // S7+ weekly kill leaderboard pool — built here so the early-return below
    // also accounts for empty kill pools (rare but possible if no one ran sectors).
    let killPayments = [];
    if (useNewPools) {
        const killPoolPct = Number.isFinite(Number(cfg.kill_pool_pct)) ? Number(cfg.kill_pool_pct) : 0.05;
        const killRewardPool = Math.floor(pool.total_spent * killPoolPct);
        if (killRewardPool > 0) {
            const killRows = await base44.asServiceRole.entities.PlayerSave.filter(
                { weekly_sector_kills_week: pool.period_id },
                '-weekly_sector_kills',
                100
            );
            const killCandidates = killRows
                .filter(p => (p.weekly_sector_kills || 0) > 0 && p.wallet_address)
                .map(p => ({
                    wallet_address: p.wallet_address,
                    player_name: p.player_name || p.wallet_address,
                    score: p.weekly_sector_kills,
                    user_id: null,
                }));
            killPayments = buildRankedPayments(
                killCandidates,
                killRewardPool,
                makeTierLookup(cfg.weekly_kill_tiers || []),
                cfg.top_n
            );
        }
    }

    if (payments.length === 0 && staffPayments.length === 0 && killPayments.length === 0) {
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

    // S7+ kill leaderboard payout — resume-safe via existing 'weekly_kills' PayoutLogs.
    // Runs AFTER players + staff so a 502 here doesn't lose the player/staff audit trail.
    let killTxId = '';
    if (killPayments.length > 0) {
        const killBase = `Cosmic Sloths weekly KILL payout ${pool.period_id}`;
        const onKillTierSuccess = async (tierPayments, tierTxId) => {
            for (const p of tierPayments) {
                await base44.asServiceRole.entities.PayoutLog.create({
                    period_id: pool.period_id, period_type: 'weekly_kills',
                    wallet_address: p.walletAddress, player_name: p.player_name || p.walletAddress,
                    amount: p.amount, rank: p.rank, tx_id: tierTxId
                });
            }
        };
        const r = await postTieredBatches(killPayments, apiBaseUrl, apiKey, killBase, alreadyPaidKills, onKillTierSuccess);
        killTxId = r.txId;
    }
    const remainingKills = killPayments.filter(p => !alreadyPaidKills.has(p.walletAddress.toLowerCase()));

    await base44.asServiceRole.entities.TokenPool.update(pool.id, { distributed: true });
    return {
        paid: payments.length - alreadyPaidWallets.size,
        skipped_already_paid: alreadyPaidWallets.size,
        staff_paid: remainingStaff.length,
        staff_skipped_already_paid: staffPayments.length - remainingStaff.length,
        kill_paid: remainingKills.length,
        kill_skipped_already_paid: killPayments.length - remainingKills.length,
        totalOmenx: payments.filter(p => !alreadyPaidWallets.has(p.walletAddress.toLowerCase())).reduce((s, p) => s + p.amount, 0),
        staffOmenx: remainingStaff.reduce((s, p) => s + p.amount, 0),
        killOmenx: remainingKills.reduce((s, p) => s + p.amount, 0),
        kill_tx_id: killTxId,
    };
}

async function distributeSeasonal(base44, sdk, pool, apiBaseUrl, apiKey) {
    // Seasonal pool split: pre-S7 = 30% top players, S7+ = 20% (config-driven).
    // 10% Squad Wars Champions (separate fn) unchanged regardless of season.
    const useNewPools = isNewPoolPeriod(pool.period_id, 'seasonal');
    const cfg = await loadPayoutConfig(base44);
    const seasonalPoolPct = useNewPools
        ? (Number.isFinite(Number(cfg.seasonal_pool_pct)) ? Number(cfg.seasonal_pool_pct) : 0.20)
        : 0.30;
    const rewardPool = Math.floor(pool.total_spent * seasonalPoolPct);
    const allScores = await base44.asServiceRole.entities.RunScore.filter({ season_id: pool.period_id }, '-score', 1000);
    const scores = allScores.filter(s => s.arena_id !== 'endless');
    const payments = buildRankedPayments(scores, rewardPool, makeTierLookup(cfg.seasonal_tiers), cfg.top_n);

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