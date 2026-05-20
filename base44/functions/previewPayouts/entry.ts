import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Auth: Base44 session → linked wallet → AdminWallet lookup.

// Must match distributeRewards.js — payouts capped at top 20, per-player cap 10000.
const MAX_PAYOUT_PER_PLAYER_CAP = 10000;

function getWeeklyRewardPercentage(rank) {
    if (rank === 1) return 0.10;
    if (rank === 2) return 0.08;
    if (rank === 3) return 0.06;
    if (rank >= 4 && rank <= 10) return 0.04;
    if (rank >= 11 && rank <= 20) return 0.03;
    return 0;
}

function getSeasonalRewardPercentage(rank) {
    if (rank === 1) return 0.10;
    if (rank === 2) return 0.075;
    if (rank === 3) return 0.06;
    if (rank >= 4 && rank <= 10) return 0.032;
    if (rank >= 11 && rank <= 20) return 0.022;
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
        const me = await base44.auth.me();
        if (!me) return Response.json({ error: 'Unauthorized' }, { status: 401 });
        const callerWallet = me.wallet_address?.toLowerCase();
        if (!callerWallet) return Response.json({ error: 'No wallet linked' }, { status: 401 });

        const adminWallets = await base44.asServiceRole.entities.AdminWallet.filter({ wallet_address: callerWallet });
        if (adminWallets.length === 0) return Response.json({ error: 'Forbidden' }, { status: 403 });

        const { period_id, period_type } = await req.json();
        if (!period_id || !period_type) return Response.json({ error: 'period_id and period_type required' }, { status: 400 });

        const pools = await base44.asServiceRole.entities.TokenPool.filter({ period_id, period_type });
        if (pools.length === 0) return Response.json({ error: 'No pool found for that period' }, { status: 404 });

        const pool = pools[0];
        let payments = [];
        let rewardPool = 0;

        let staffPayments = [];

        if (period_type === 'weekly') {
            rewardPool = Math.floor(pool.total_spent * 0.20);
            const allScores = await base44.asServiceRole.entities.RunScore.filter({ week_id: period_id }, '-score', 1000);
            const scores = allScores.filter(s => s.arena_id !== 'endless');
            payments = buildRankedPayments(scores, rewardPool, getWeeklyRewardPercentage, 20);

            // Mirror distributeRewards.js — only weekly payouts include staff cuts.
            // Staff % is configurable via AppConfig.staff_pct_per_wallet (default 2%),
            // with optional per-wallet override on AdminWallet.payout_pct_override.
            let STAFF_PCT_PER_WALLET = 0.02;
            try {
                const cfg = await base44.asServiceRole.entities.AppConfig.filter({ key: 'staff_pct_per_wallet' });
                const v = Number(cfg[0]?.value?.pct);
                if (isFinite(v) && v >= 0 && v <= 0.10) STAFF_PCT_PER_WALLET = v;
            } catch {}
            const adminWallets = await base44.asServiceRole.entities.AdminWallet.list();
            const resolveStaffPct = (a) => {
                const o = a.payout_pct_override;
                if (o !== null && o !== undefined && isFinite(Number(o)) && Number(o) >= 0 && Number(o) <= 0.10) {
                    return Number(o);
                }
                return STAFF_PCT_PER_WALLET;
            };
            staffPayments = adminWallets
                .filter(a => a.wallet_address)
                .map(a => ({
                    wallet_address: a.wallet_address,
                    amount: Math.floor(pool.total_spent * resolveStaffPct(a)),
                    player_name: a.admin_name || a.wallet_address,
                    pct: resolveStaffPct(a),
                }))
                .filter(p => p.amount >= 1);
        } else if (period_type === 'seasonal') {
            // Seasonal pool split: 30% to top players, 10% to Squad Wars Champions (separate fn).
            rewardPool = Math.floor(pool.total_spent * 0.30);
            const allScores = await base44.asServiceRole.entities.RunScore.filter({ season_id: period_id }, '-score', 1000);
            const scores = allScores.filter(s => s.arena_id !== 'endless');
            payments = buildRankedPayments(scores, rewardPool, getSeasonalRewardPercentage, 20);
        } else {
            return Response.json({ error: 'Invalid period_type' }, { status: 400 });
        }

        // RESUME-AWARE: look up existing PayoutLog rows for this period so the
        // preview can show exactly which wallets a retry would skip vs pay.
        // Mirrors the resume logic in manuallyDistributeRewards.
        const playerLogType = period_type === 'weekly' ? 'weekly' : 'seasonal';
        const existingPlayerLogs = await base44.asServiceRole.entities.PayoutLog.filter({ period_id, period_type: playerLogType }, '-created_date', 1000);
        const alreadyPaidPlayers = new Set(existingPlayerLogs.map(l => (l.wallet_address || '').toLowerCase()));

        let alreadyPaidStaff = new Set();
        if (period_type === 'weekly') {
            const existingStaffLogs = await base44.asServiceRole.entities.PayoutLog.filter({ period_id, period_type: 'staff_weekly' }, '-created_date', 1000);
            alreadyPaidStaff = new Set(existingStaffLogs.map(l => (l.wallet_address || '').toLowerCase()));
        }

        // Annotate each payment so the UI can show paid vs pending rows.
        const annotatedPayments = payments.map(p => ({
            ...p,
            already_paid: alreadyPaidPlayers.has((p.wallet_address || '').toLowerCase()),
        }));
        const annotatedStaff = staffPayments.map(p => ({
            ...p,
            already_paid: alreadyPaidStaff.has((p.wallet_address || '').toLowerCase()),
        }));

        const playerPayout = payments.reduce((s, p) => s + p.amount, 0);
        const staffPayout = staffPayments.reduce((s, p) => s + p.amount, 0);
        const pendingPlayerPayout = annotatedPayments.filter(p => !p.already_paid).reduce((s, p) => s + p.amount, 0);
        const pendingStaffPayout = annotatedStaff.filter(p => !p.already_paid).reduce((s, p) => s + p.amount, 0);
        const paidPlayerCount = annotatedPayments.filter(p => p.already_paid).length;
        const paidStaffCount = annotatedStaff.filter(p => p.already_paid).length;

        return Response.json({
            period_id, period_type,
            total_spent: pool.total_spent,
            reward_pool: rewardPool,
            distributed: pool.distributed,
            total_payout: playerPayout,
            staff_payout: staffPayout,
            grand_total: playerPayout + staffPayout,
            player_count: payments.length,
            staff_count: staffPayments.length,
            // New resume-aware fields
            paid_player_count: paidPlayerCount,
            paid_staff_count: paidStaffCount,
            pending_player_count: payments.length - paidPlayerCount,
            pending_staff_count: staffPayments.length - paidStaffCount,
            pending_player_payout: pendingPlayerPayout,
            pending_staff_payout: pendingStaffPayout,
            pending_grand_total: pendingPlayerPayout + pendingStaffPayout,
            payments: annotatedPayments,
            staff_payments: annotatedStaff,
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});