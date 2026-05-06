import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Auth: Base44 session → linked wallet → AdminWallet lookup.

// Must match distributeRewards.js — payouts capped at top 100.
function getWeeklyRewardPercentage(rank) {
    if (rank === 1) return 0.10;
    if (rank === 2) return 0.08;
    if (rank === 3) return 0.06;
    if (rank >= 4 && rank <= 10) return 0.04;
    if (rank >= 11 && rank <= 20) return 0.03;
    if (rank >= 21 && rank <= 30) return 0.018;
    if (rank >= 31 && rank <= 50) return 0.012;
    if (rank >= 51 && rank <= 100) return 0.008;
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
    if (rank >= 41 && rank <= 60) return 0.010;
    if (rank >= 61 && rank <= 100) return 0.006;
    return 0;
}

function buildRankedPayments(scores, rewardPool, getPercentageFn, maxRank) {
    // Reduce to each player's BEST run, then sort by score and slice to maxRank.
    // Previously this took the first N rows of the input (which was already
    // sorted by score globally) — but with a paginated input that contained the
    // best run for every player, picking each player's best is robust to ordering.
    const bestByPlayer = new Map();
    for (const score of scores) {
        const wallet = score.wallet_address;
        if (!wallet) continue;
        const key = wallet.toLowerCase();
        const existing = bestByPlayer.get(key);
        if (!existing || (score.score || 0) > (existing.score || 0)) {
            bestByPlayer.set(key, score);
        }
    }
    const uniqueScores = Array.from(bestByPlayer.values())
        .sort((a, b) => (b.score || 0) - (a.score || 0))
        .slice(0, maxRank);

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

        // Paginate through all eligible runs in the period (single -score 1000
        // query misses mid-tier players when whales eat hundreds of slots).
        // Reduce-as-we-go: keep only each player's best run to bound memory.
        // Stop early once we go N consecutive pages without seeing any new
        // player — every player's BEST run lives near the top of the sort,
        // so once the new-player rate hits zero we have everyone. Avoids
        // paginating tens of thousands of redundant rows (rate-limit safe).
        // Paginate fully — admin preview/payout MUST find every ranked player
        // (mid-tier players' best runs can sit far down the global -score list
        // when whales own the top 1000s). Stall-detect at 3 pages was bailing
        // early and missing players. We still cap at MAX_PAGES as a safety
        // belt, and stop on a short page (true end of data).
        const fetchEligibleScores = async (filterKey) => {
            const PAGE = 1000;
            const MAX_PAGES = 50;
            const bestByPlayer = new Map();
            for (let page = 1; page <= MAX_PAGES; page++) {
                const batch = await base44.asServiceRole.entities.RunScore.filter(
                    { ...filterKey, arena_id: { $nin: ['endless', 'world_boss_arena'] } },
                    '-score',
                    PAGE,
                    page,
                );
                if (!batch || batch.length === 0) break;
                for (const r of batch) {
                    const key = (r.wallet_address || '').toLowerCase();
                    if (!key) continue;
                    const existing = bestByPlayer.get(key);
                    if (!existing || (r.score || 0) > (existing.score || 0)) {
                        bestByPlayer.set(key, r);
                    }
                }
                if (batch.length < PAGE) break;
                // Tiny pacing between pages to stay under SDK rate limit.
                await new Promise(r => setTimeout(r, 150));
            }
            return Array.from(bestByPlayer.values()).sort((a, b) => (b.score || 0) - (a.score || 0));
        };

        if (period_type === 'weekly') {
            rewardPool = Math.floor(pool.total_spent * 0.20);
            const scores = await fetchEligibleScores({ week_id: period_id });
            payments = buildRankedPayments(scores, rewardPool, getWeeklyRewardPercentage, 100);

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
            const scores = await fetchEligibleScores({ season_id: period_id });
            payments = buildRankedPayments(scores, rewardPool, getSeasonalRewardPercentage, 100);
        } else {
            return Response.json({ error: 'Invalid period_type' }, { status: 400 });
        }

        const playerPayout = payments.reduce((s, p) => s + p.amount, 0);
        const staffPayout = staffPayments.reduce((s, p) => s + p.amount, 0);

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
            payments,
            staff_payments: staffPayments,
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});