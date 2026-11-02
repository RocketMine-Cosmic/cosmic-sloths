import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { resolvePayoutConfig } from '../../shared/payoutConfig.ts';
import { batchIdempotencyKey, sendGrantBatch, replayPendingBand } from '../../shared/grantBatch.ts';

// Standalone weekly KILL leaderboard payout.
//
// Split out from manuallyDistributeRewards (2026-06-22) because doing players +
// staff + kills in one HTTP call was hitting the gateway 504 (~30s timeout)
// when all three pools were non-empty. Each path makes ~20+ external OmenX
// HTTP calls + per-recipient DB writes — too much for one request.
//
// Behaviour mirrors the kill-pool block in manuallyDistributeRewards EXACTLY:
//   - S7+ gated (legacy weeks have no kill pool by design)
//   - Pool % from AppConfig.leaderboard_payout_config (kill_pool_pct, default 5%)
//   - Tiers from AppConfig.leaderboard_payout_config (weekly_kill_tiers)
//   - Source: WeeklyKillSnapshot merged with live PlayerSave (snapshot wins)
//   - Resume-safe: skips wallets that already have a 'weekly_kills' PayoutLog
//   - Per-tier batches → independent OmenX TX per rank band
//   - Per-tier PayoutLog writes (partial-failure safe)
//
// Does NOT mark the TokenPool as distributed — that's the score-payout fn's job.

const GAME_ID = 'cosmic-sloths';
const GAME_NAME = 'Cosmic Sloths';

// Omen's "never pay twice" key for grant-batch (K-B8) now lives in shared/grantBatch.ts, with the send
// itself (own 50 s timeout) and the replay of an unclear band — see T-002 there.
//
// T-002 (2 Nov 2026) call options, used by the automatic payouts (autoPayoutStep):
//   one_band: true      — pay ONE rank band and return (has_more says if bands remain), so no single call
//                         nears Base44's 120 s edge. An unclear Omen answer comes back as a 200 with
//                         unclear_band: { marker } instead of a 500.
//   replay_marker: '…'  — re-send that one "maybe paid" band, byte-for-byte, with the same key; Omen
//                         answers with the original result, never a second payment.
// Without them (the admin "Kill Pool Only" button) it behaves as before: every band in one call.
const MAX_PAYOUT_PER_PLAYER_CAP = 10000;

function getPeriodSeason(period_id) {
    const m = String(period_id || '').match(/^(\d{4})-W(\d{1,2})$/);
    if (!m) return null;
    const seasonNum = Math.floor((Number(m[2]) - 1) / 4) + 1;
    return m[1] + '-S' + seasonNum;
}
function isNewPoolPeriod(period_id) {
    const s = getPeriodSeason(period_id);
    if (!s) return false;
    const m = s.match(/^(\d{4})-S(\d{1,2})$/);
    if (!m) return false;
    const year = Number(m[1]);
    const seas = Number(m[2]);
    if (year > 2026) return true;
    if (year < 2026) return false;
    return seas >= 7;
}

const DEFAULT_PAYOUT_CONFIG = {
    top_n: 20,
    kill_pool_pct: 0.05,
    weekly_kill_tiers: [
        { min: 1,  max: 1,  pct: 0.15 },
        { min: 2,  max: 2,  pct: 0.10 },
        { min: 3,  max: 3,  pct: 0.08 },
        { min: 4,  max: 10, pct: 0.05 },
        { min: 11, max: 20, pct: 0.025 },
    ],
};

function makeTierLookup(tiers) {
    return (rank) => {
        const t = tiers.find(t => rank >= t.min && rank <= t.max);
        return t ? t.pct : 0;
    };
}

function buildRankedPayments(scores, rewardPool, getPercentageFn, maxRank) {
    const uniqueScores = [];
    const seenWallets = new Set();
    for (const score of scores) {
        if (uniqueScores.length >= maxRank) break;
        const wallet = score.wallet_address;
        if (!wallet) continue;
        if (seenWallets.has(wallet)) continue;
        seenWallets.add(wallet);
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
                walletAddress: uniqueScores[i].wallet_address,
                amount, rank: i + 1,
                player_name: uniqueScores[i].player_name,
            });
        }
    }
    return payments;
}

// Checks whether the weekly TokenPool for `period_id` has logs for all
// expected payout types (players + staff + kills for S7+, players + staff
// for legacy weeks). If so, flips `distributed: true`. Idempotent — safe to
// call from any of the three split functions; whichever finishes last closes
// the pool. Returns true if it flipped the flag (or it was already true), false otherwise.
async function maybeMarkWeeklyPoolDistributed(db, period_id) {
    try {
        const pools = await db.entities.TokenPool.filter({ period_id, period_type: 'weekly' });
        const pool = pools[0];
        if (!pool) return false;
        if (pool.distributed) return true;

        const [playerLogs, staffLogs, killLogs] = await Promise.all([
            db.entities.PayoutLog.filter({ period_id, period_type: 'weekly' }, '-created_date', 1),
            db.entities.PayoutLog.filter({ period_id, period_type: 'staff_weekly' }, '-created_date', 1),
            db.entities.PayoutLog.filter({ period_id, period_type: 'weekly_kills' }, '-created_date', 1),
        ]);

        const isS7Plus = isNewPoolPeriod(period_id);
        const hasPlayers = playerLogs.length > 0;
        const hasStaff = staffLogs.length > 0;
        const hasKills = killLogs.length > 0;

        const allDone = isS7Plus
            ? (hasPlayers && hasStaff && hasKills)
            : (hasPlayers && hasStaff);

        if (!allDone) return false;
        await db.entities.TokenPool.update(pool.id, { distributed: true });
        return true;
    } catch (err) {
        console.warn('[maybeMarkWeeklyPoolDistributed]', err?.message);
        return false;
    }
}

function rankTierLabel(rank) {
    if (rank === 1) return { key: 'r1',   label: 'Rank #1' };
    if (rank === 2) return { key: 'r2',   label: 'Rank #2' };
    if (rank === 3) return { key: 'r3',   label: 'Rank #3' };
    if (rank >= 4  && rank <= 10) return { key: 'r4-10',  label: 'Ranks #4–10' };
    if (rank >= 11 && rank <= 20) return { key: 'r11-20', label: 'Ranks #11–20' };
    return { key: 'other', label: `Rank #${rank}` };
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const body = await req.json();
        const { period_id, adminKey } = body;
        const oneBand = body.one_band === true;
        const replayMarker = typeof body.replay_marker === 'string' ? body.replay_marker : '';

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

        if (!period_id) return Response.json({ error: 'Missing period_id' }, { status: 400 });
        if (!isNewPoolPeriod(period_id)) {
            return Response.json({ error: `Kill pool only exists for S7+ periods (got ${period_id})` }, { status: 400 });
        }

        const apiKey = Deno.env.get('OMENX_REWARDS_API_KEY');
        const apiBaseUrl = Deno.env.get('DEVELOPER_API_BASE_URL') || 'https://api.omen.foundation';
        if (!apiKey) return Response.json({ error: 'OMENX_REWARDS_API_KEY not configured' }, { status: 500 });

        if (replayMarker) {
            const r = await replayPendingBand(base44.asServiceRole, {
                period_id, period_type: 'weekly_kills', marker: replayMarker, apiBaseUrl, apiKey,
                gameId: GAME_ID, gameName: GAME_NAME,
                noteFor: (_band, rows) => `Cosmic Sloths weekly KILL payout ${period_id} — ${rankTierLabel(Number(rows[0]?.rank || 0)).label}`,
            });
            console.log(`[distributeKillPool] replay ${replayMarker}: ${r.resolved ? 'resolved' : 'still unclear'} ${r.reason || ''}`);
            return Response.json({ success: !!r.resolved, ...r, request: undefined });
        }

        const pools = await base44.asServiceRole.entities.TokenPool.filter({ period_id, period_type: 'weekly' });
        if (pools.length === 0) return Response.json({ error: 'No weekly pool found for this period' }, { status: 404 });
        const pool = pools[0];

        // Config — period-locked snapshot wins over the live AppConfig.
        const cfg = (await resolvePayoutConfig(base44.asServiceRole, pool)) || DEFAULT_PAYOUT_CONFIG;

        const killPoolPct = Number.isFinite(Number(cfg.kill_pool_pct)) ? Number(cfg.kill_pool_pct) : 0.05;
        const killRewardPool = Math.floor(pool.total_spent * killPoolPct);
        if (killRewardPool <= 0) {
            return Response.json({ success: true, paid: 0, skipped: 'kill pool is zero' });
        }

        // Resume-safe — skip already-paid wallets
        const existingKillLogs = await base44.asServiceRole.entities.PayoutLog.filter(
            { period_id, period_type: 'weekly_kills' }, '-created_date', 1000
        );
        const alreadyPaidKills = new Set(existingKillLogs.map(l => (l.wallet_address || '').toLowerCase()));

        // Source: snapshot + live PlayerSave (snapshot wins per wallet)
        const [snapshotRows, liveRows] = await Promise.all([
            base44.asServiceRole.entities.WeeklyKillSnapshot.filter({ week_id: period_id }, '-kills', 500),
            base44.asServiceRole.entities.PlayerSave.filter({ weekly_sector_kills_week: period_id }, '-weekly_sector_kills', 500),
        ]);

        const merged = new Map();
        for (const s of snapshotRows) {
            const w = (s.wallet_address || '').toLowerCase();
            if (!w || (s.kills || 0) <= 0) continue;
            merged.set(w, {
                wallet_address: w,
                player_name: s.player_name || w,
                score: Number(s.kills) || 0,
            });
        }
        for (const p of liveRows) {
            const w = (p.wallet_address || '').toLowerCase();
            if (!w || (p.weekly_sector_kills || 0) <= 0) continue;
            if (merged.has(w)) continue;
            merged.set(w, {
                wallet_address: w,
                player_name: p.player_name || w,
                score: Number(p.weekly_sector_kills) || 0,
            });
        }
        const killCandidates = [...merged.values()].sort((a, b) => b.score - a.score);
        const killPayments = buildRankedPayments(
            killCandidates,
            killRewardPool,
            makeTierLookup(cfg.weekly_kill_tiers || []),
            cfg.top_n
        );

        if (killPayments.length === 0) {
            return Response.json({ success: true, paid: 0, skipped: 'no eligible wallets' });
        }

        // Per-tier batches
        const tiers = new Map();
        for (const p of killPayments) {
            if (alreadyPaidKills.has(p.walletAddress.toLowerCase())) continue;
            const { key, label } = rankTierLabel(p.rank);
            if (!tiers.has(key)) tiers.set(key, { label, payments: [] });
            tiers.get(key).payments.push(p);
        }
        const order = ['r1', 'r2', 'r3', 'r4-10', 'r11-20', 'other'];
        const pendingKeys = order.filter(k => (tiers.get(k)?.payments?.length || 0) > 0);
        const baseNote = `Cosmic Sloths weekly KILL payout ${period_id}`;
        const txIds = [];
        let tiersPaid = 0;
        let walletsPaid = 0;
        let omenxPaid = 0;
        let tierLabelPaid = '';

        for (const key of pendingKeys) {
            const tier = tiers.get(key);
            tierLabelPaid = tier.label;

            // Log-first double-pay guard (2026-07-06). Write pending PayoutLog
            // rows BEFORE the fetch — if OmenX settles on-chain but the response
            // is lost (504/network), pending logs stay so retry skips these
            // wallets. See manuallyDistributeRewards.postTieredBatches.
            const pendingMarker = `pending-${period_id}-${Date.now()}-kills-${key}`;
            const createdLogIds = [];
            for (const p of tier.payments) {
                const row = await base44.asServiceRole.entities.PayoutLog.create({
                    period_id, period_type: 'weekly_kills',
                    wallet_address: p.walletAddress, player_name: p.player_name || p.walletAddress,
                    amount: p.amount, rank: p.rank, tx_id: pendingMarker,
                });
                createdLogIds.push(row.id);
            }

            const ans = await sendGrantBatch({
                apiBaseUrl, apiKey, gameId: GAME_ID, gameName: GAME_NAME, note: `${baseNote} — ${tier.label}`,
                payments: tier.payments,
                idempotencyKey: await batchIdempotencyKey(`cs-weekly_kills-${period_id}-${key}`, tier.payments),
            });
            if (ans.outcome === 'rejected') {
                // A clear "no" before paying — safe to remove the pending rows so a retry re-attempts.
                for (const id of createdLogIds) {
                    try { await base44.asServiceRole.entities.PayoutLog.delete(id); } catch {}
                }
                throw new Error(`Tier ${tier.label} failed — HTTP ${ans.status}: ${ans.detail}`);
            }
            if (ans.outcome === 'unclear') {
                // Maybe paid. Pending rows stay (a retry skips these wallets); the replay can settle it.
                const msg = `Kill tier ${tier.label}: unclear answer from Omen (${ans.status || ans.code}) — pending logs retained for safety: ${ans.detail}`;
                if (oneBand) {
                    console.warn('[distributeKillPool]', msg);
                    return Response.json({ success: false, unclear_band: { marker: pendingMarker, band: key, label: tier.label, status: ans.status, code: ans.code },
                        has_more: true, tiers_paid: tiersPaid, paid: walletsPaid, totalOmenx: omenxPaid, error: msg, period_id });
                }
                throw new Error(msg);
            }
            const tierTxId = ans.txId;
            if (tierTxId) txIds.push(tierTxId);
            tiersPaid++;
            for (const id of createdLogIds) {
                try { await base44.asServiceRole.entities.PayoutLog.update(id, { tx_id: tierTxId }); } catch {}
            }
            for (const p of tier.payments) {
                walletsPaid++;
                omenxPaid += p.amount;
            }
            if (oneBand) break; // one band per call; the caller re-invokes while has_more
        }

        try {
            await base44.asServiceRole.entities.AdminChangesLog.create({
                wallet_address: callerWallet,
                action_type: 'reward_adjustment',
                description: `Manual weekly KILL payout for ${period_id}`,
                details: { period_id, walletsPaid, omenxPaid, tiersPaid },
            });
        } catch {}

        // Auto-flip the pool to `distributed: true` if all three weekly payout
        // types now have logs. This is what the score-payout fn normally does,
        // but when the three split fns are run separately, none of them flip
        // the flag — so the pool stays "pending" forever. Whichever of the
        // three runs last (typically this one) closes the loop.
        // Don't close the pool while kill tiers remain — caller will re-invoke.
        const hasMore = pendingKeys.length > tiersPaid;
        const poolDistributed = hasMore
            ? false
            : await maybeMarkWeeklyPoolDistributed(base44.asServiceRole, period_id);

        return Response.json({
            pool_marked_distributed: poolDistributed,
            has_more: hasMore,
            tiers_remaining: Math.max(0, pendingKeys.length - tiersPaid),
            tier_paid: tierLabelPaid,
            success: true,
            period_id,
            paid: walletsPaid,
            skipped_already_paid: alreadyPaidKills.size,
            tiers_paid: tiersPaid,
            totalOmenx: omenxPaid,
            kill_reward_pool: killRewardPool,
            tx_ids: txIds.join(','),
        });
    } catch (error) {
        console.error('[distributeKillPool]', error);
        return Response.json({ error: error?.message || String(error) }, { status: 500 });
    }
});