import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { OmenXServerSDK } from 'npm:@omen.foundation/game-sdk@1.0.33';

// Service-role db client — set inside the request handler from
// createClientFromRequest(req).asServiceRole. Module-level let so the helper
// functions further down can use it without threading through every call.
// CRITICAL: previously used `createClient({ appId })` which is unauthenticated
// and CANNOT read AdminWallet (admin-only RLS). That silently returned [] →
// staff payouts never fired. Now uses asServiceRole which bypasses RLS.
let db = null;

const GAME_ID = 'cosmic-sloths';
const GAME_NAME = 'Cosmic Sloths';
const MAX_PAYOUT_PER_PLAYER_CAP = 10000;

Deno.serve(async (req) => {
    try {
        const body = await req.json();
        const { adminKey } = body;

        const base44 = createClientFromRequest(req);
        // Always use service-role for entity reads/writes inside this function —
        // we read AdminWallet (admin-only RLS) and write PayoutLog (admin-only).
        db = base44.asServiceRole;

        // Auth: emergency admin key (used by automation/cron), OR Base44 session + 'distribute_rewards' permission.
        if (!(adminKey && adminKey === Deno.env.get('AdminDash'))) {
            const me = await base44.auth.me();
            if (!me) return Response.json({ error: 'Unauthorized' }, { status: 401 });
            const callerWallet = me.wallet_address?.toLowerCase();
            if (!callerWallet) return Response.json({ error: 'No wallet linked' }, { status: 401 });
            const records = await db.entities.AdminWallet.filter({ wallet_address: callerWallet });
            if (records.length === 0) return Response.json({ error: 'Forbidden — not an admin' }, { status: 403 });
            const perms = records[0].permissions || [];
            if (!perms.includes('distribute_rewards') && !perms.includes('owner')) {
                return Response.json({ error: "Forbidden — 'distribute_rewards' permission required" }, { status: 403 });
            }
        }

        const apiKey = Deno.env.get('OMENX_REWARDS_API_KEY');
        const apiBaseUrl = Deno.env.get('DEVELOPER_API_BASE_URL') || 'https://api.omen.foundation';
        const sdk = new OmenXServerSDK({ apiKey, apiBaseUrl });

        const rewardsKeys = [
            Deno.env.get('OMENX_REWARDS_API_KEY'),
            Deno.env.get('OMENX_REWARDS_API_KEY_2'),
            Deno.env.get('OMENX_REWARDS_API_KEY_3'),
            Deno.env.get('OMENX_REWARDS_API_KEY_4'),
        ].filter(Boolean);

        // Proper ISO 8601 (Mon-start, Sun 23:59 UTC end). Old formula rolled over a day early on Sundays.
        const getCurrentPeriodIds = () => {
            const now = new Date();
            const tmp = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
            const dayNum = tmp.getUTCDay() || 7;
            tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
            const isoYear = tmp.getUTCFullYear();
            const yearStart = new Date(Date.UTC(isoYear, 0, 1));
            const isoWeek = Math.ceil(((tmp - yearStart) / 86400000 + 1) / 7);
            const week_id = `${isoYear}-W${String(isoWeek).padStart(2, '0')}`;
            const seasonNum = Math.floor((isoWeek - 1) / 4) + 1;
            const season_id = `${isoYear}-S${seasonNum}`;
            return { week_id, season_id };
        };
        const { week_id: currentWeekId, season_id: currentSeasonId } = getCurrentPeriodIds();

        // Reconciles TokenPool.total_spent against the summed TokenSpendLog total
        // for the period, but ONLY when the discrepancy is small enough that the
        // logs can be trusted. Historically the logs could contain phantom
        // duplicate rows from purchaseSku retries (see TokenSpendLog.idempotency_key)
        // which would cause this routine to silently inflate the pool by 10×+ and
        // wreck payouts. Now it's gated: if logs and pool differ by more than 20%
        // we REFUSE to auto-correct and surface a hard error so an admin can
        // investigate before any OMENX moves.
        const reconcilePoolBeforeDistribution = async (pool) => {
            const filterKey = pool.period_type === 'weekly' ? { week_id: pool.period_id } : { season_id: pool.period_id };
            const logs = await db.entities.TokenSpendLog.filter(filterKey);
            // Exclude admin self-purchases from the reconciled total — they were
            // intentionally not added to the TokenPool in purchaseSku, so summing
            // them here would re-introduce them and undo the exclusion.
            const logTotal = logs
                .filter(log => !log.excluded_from_pool)
                .reduce((sum, log) => sum + (log.amount || 0), 0);
            const diff = logTotal - pool.total_spent;
            if (Math.abs(diff) < 0.01) return; // already in sync
            const poolBase = pool.total_spent > 0 ? pool.total_spent : Math.max(logTotal, 1);
            const driftPct = Math.abs(diff) / poolBase;
            const SAFE_DRIFT = 0.20; // 20% — anything beyond this is almost certainly a dedup/dupe issue, not real drift
            if (driftPct > SAFE_DRIFT) {
                throw new Error(
                    `Reconcile refused: ${pool.period_id} pool=${pool.total_spent} logs=${logTotal} ` +
                    `(drift ${(driftPct * 100).toFixed(1)}%). Likely duplicate TokenSpendLog rows — investigate before distributing.`
                );
            }
            console.warn(`[distributeRewards] Reconcile within safe drift: ${pool.period_id} pool=${pool.total_spent} → logs=${logTotal} (${(driftPct * 100).toFixed(1)}%)`);
            await db.entities.TokenPool.update(pool.id, { total_spent: logTotal });
            pool.total_spent = logTotal;
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
                    const result = await distributeWeekly(sdk, pool, apiBaseUrl, rewardsKeys);
                    results.push({ pool: pool.period_id, type: 'weekly', ...result });
                } catch (err) {
                    console.error('[distributeRewards] WEEKLY FAILED:', err.message);
                    results.push({ pool: pool.period_id, type: 'weekly', error: err.message });
                }
            } else if (isClosedSeasonal) {
                try {
                    await reconcilePoolBeforeDistribution(pool);
                    const result = await distributeSeasonal(sdk, pool, apiBaseUrl, rewardsKeys);
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

// Payouts are capped at top 45 ranks (weekly + seasonal) so top players'
// share of the pool isn't diluted by an unbounded long tail of minimal payouts.
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

const CHUNK_SIZE = 20;

// Rank-tier buckets — each tier becomes its own batch (and own OmenX TX),
// so the batch-level `note` describes the exact rank or rank band being paid.
// Top 3 get individual labels ("Rank #1", "Rank #2", "Rank #3"); the rest get
// band labels ("Ranks #4–10", etc). Out-of-band payments fall through to a
// generic "Other" tier (shouldn't happen — top 45 is capped — but safe fallback).
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

// Group ranked payments into tier buckets and send each tier as its own batch
// so the OmenX-side transaction note reflects the recipient's rank/band.
// Preserves ordering within tiers (rank ascending). Returns combined tx ids + chunk count.
async function grantTieredBatches(payments, apiBaseUrl, rewardsKeys, gameId, gameName, baseNote) {
    if (payments.length === 0) return { txId: '', chunks: 0 };
    const tiers = new Map(); // key -> { label, payments[] }
    for (const p of payments) {
        const { key, label } = rankTierLabel(p.rank);
        if (!tiers.has(key)) tiers.set(key, { label, payments: [] });
        tiers.get(key).payments.push(p);
    }
    // Preserve tier order: r1, r2, r3, r4-10, r11-20, r21-30, r31-40, r41-45, other
    const order = ['r1', 'r2', 'r3', 'r4-10', 'r11-20', 'r21-30', 'r31-40', 'r41-45', 'other'];
    const allTxIds = [];
    let totalChunks = 0;
    for (const key of order) {
        const tier = tiers.get(key);
        if (!tier) continue;
        const tierNote = `${baseNote} — ${tier.label}`;
        const { txId, chunks } = await grantBatchChunked(tier.payments, apiBaseUrl, rewardsKeys, gameId, gameName, tierNote);
        if (txId) allTxIds.push(txId);
        totalChunks += chunks;
    }
    return { txId: allTxIds.join(','), chunks: totalChunks };
}

async function grantBatchChunked(allPayments, apiBaseUrl, rewardsKeys, gameId, gameName, note) {
    if (allPayments.length === 0) return { txId: '', chunks: 0 };
    const chunks = [];
    for (let i = 0; i < allPayments.length; i += CHUNK_SIZE) {
        chunks.push(allPayments.slice(i, i + CHUNK_SIZE));
    }
    const txIds = [];
    for (let ci = 0; ci < chunks.length; ci++) {
        const chunk = chunks[ci];
        // Rotate keys per chunk + retry on 429/5xx across the pool
        const startIdx = ci % rewardsKeys.length;
        let lastErr = null;
        let ok = false;
        for (let attempt = 0; attempt < rewardsKeys.length; attempt++) {
            const key = rewardsKeys[(startIdx + attempt) % rewardsKeys.length];
            const response = await fetch(`${apiBaseUrl}/v1/game-rewards/grant-batch`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
                body: JSON.stringify({
                    payments: chunk.map(p => ({ walletAddress: p.walletAddress, amount: p.amount.toString() })),
                    gameId, gameName, note: `${note} chunk ${ci + 1}/${chunks.length}`,
                }),
            });
            const batchResult = await response.json().catch(() => ({}));
            if (response.ok) {
                txIds.push(batchResult?.transactionId || batchResult?.txHash || '');
                ok = true;
                break;
            }
            lastErr = `HTTP ${response.status}: ${JSON.stringify(batchResult)}`;
            console.warn(`[distributeRewards] chunk ${ci + 1} key ${attempt + 1} failed:`, lastErr);
            if (response.status !== 429 && response.status < 500) break; // don't retry on 4xx (other than 429)
        }
        if (!ok) throw new Error(`Chunk ${ci + 1}/${chunks.length} failed: ${lastErr}`);
    }
    return { txId: txIds.join(','), chunks: chunks.length };
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

async function distributeWeekly(sdk, pool, apiBaseUrl, rewardsKeys) {
     if (!pool.total_spent || pool.total_spent <= 0) {
         await db.entities.TokenPool.update(pool.id, { distributed: true });
         return { paid: 0, skipped: 'zero spend' };
     }
     const adminWallets = await db.entities.AdminWallet.list();
     // Staff % is configurable by owners via setStaffPayoutPct. Falls back to 2%.
     let STAFF_PCT_PER_WALLET = 0.02;
     try {
         const cfg = await db.entities.AppConfig.filter({ key: 'staff_pct_per_wallet' });
         const v = Number(cfg[0]?.value?.pct);
         if (isFinite(v) && v >= 0 && v <= 0.10) STAFF_PCT_PER_WALLET = v;
     } catch {}
     const rewardPool = Math.floor(pool.total_spent * 0.20);
     const allScores = await db.entities.RunScore.filter({ week_id: pool.period_id }, '-score', 10000);
     // Endless mode runs are NOT eligible for OMENX payouts (display-only leaderboard)
     const scores = allScores.filter(s => s.arena_id !== 'endless');
     // Capped at top 45 — protects top players' share from long-tail dilution.
     const payments = buildRankedPayments(scores, rewardPool, getWeeklyRewardPercentage, 45);
    // Per-wallet override on AdminWallet.payout_pct_override (number, 0–0.10)
    // takes priority over the global STAFF_PCT_PER_WALLET — lets owners set
    // different cuts per staff member (e.g. lead mods get more than chat mods).
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
        await db.entities.TokenPool.update(pool.id, { distributed: true });
        return { paid: 0, skipped: 'no eligible wallets' };
    }
    // Players: one batch per rank tier so OmenX TX history shows the exact rank/band.
    // Staff: separate single batch (rank doesn't apply — they're not on the leaderboard).
    const playerBase = `Cosmic Sloths weekly payout ${pool.period_id}`;
    const { txId: playerTxId, chunks: playerChunks } = await grantTieredBatches(payments, apiBaseUrl, rewardsKeys, GAME_ID, GAME_NAME, playerBase);
    const { txId: staffTxId, chunks: staffChunks } = await grantBatchChunked(staffPayments, apiBaseUrl, rewardsKeys, GAME_ID, GAME_NAME, `Cosmic Sloths weekly payout ${pool.period_id} — Staff share`);
    const txId = [playerTxId, staffTxId].filter(Boolean).join(',');
    const chunks = playerChunks + staffChunks;
    await Promise.all([
        db.entities.TokenPool.update(pool.id, { distributed: true }),
        ...payments.map(p => db.entities.PayoutLog.create({ period_id: pool.period_id, period_type: 'weekly', wallet_address: p.walletAddress, player_name: p.player_name || p.walletAddress, amount: p.amount, rank: p.rank, tx_id: txId })),
        ...staffPayments.map(p => db.entities.PayoutLog.create({ period_id: pool.period_id, period_type: 'staff_weekly', wallet_address: p.walletAddress, player_name: p.player_name, amount: p.amount, rank: 0, tx_id: txId })),
    ]);
    return { paid: payments.length, staff_paid: staffPayments.length, chunks, totalOmenx: payments.reduce((s, p) => s + p.amount, 0), staffOmenx: staffPayments.reduce((s, p) => s + p.amount, 0), payments, staffPayments };
}

async function distributeSeasonal(sdk, pool, apiBaseUrl, rewardsKeys) {
     if (!pool.total_spent || pool.total_spent <= 0) {
         await db.entities.TokenPool.update(pool.id, { distributed: true });
         return { paid: 0, skipped: 'zero spend' };
     }
     // Seasonal pool split: 30% to top players (this fn), 10% to Squad Wars Champions
     // (`distributeSquadChampions`). Remaining 60% is retained.
     const rewardPool = Math.floor(pool.total_spent * 0.30);
     const allScores = await db.entities.RunScore.filter({ season_id: pool.period_id }, '-score', 10000);
     // Endless mode runs are NOT eligible for OMENX payouts (display-only leaderboard)
     const scores = allScores.filter(s => s.arena_id !== 'endless');
     // Capped at top 45 — protects top players' share from long-tail dilution.
     const payments = buildRankedPayments(scores, rewardPool, getSeasonalRewardPercentage, 45);
    if (payments.length === 0) {
        await db.entities.TokenPool.update(pool.id, { distributed: true });
        return { paid: 0, skipped: 'no eligible wallets' };
    }
    // One batch per rank tier so OmenX TX history shows the exact rank/band.
    const { txId, chunks } = await grantTieredBatches(payments, apiBaseUrl, rewardsKeys, GAME_ID, GAME_NAME, `Cosmic Sloths seasonal payout ${pool.period_id}`);
    await Promise.all([
        db.entities.TokenPool.update(pool.id, { distributed: true }),
        ...payments.map(p => db.entities.PayoutLog.create({ period_id: pool.period_id, period_type: 'seasonal', wallet_address: p.walletAddress, player_name: p.player_name || p.walletAddress, amount: p.amount, rank: p.rank, tx_id: txId })),
    ]);
    return { paid: payments.length, chunks, totalOmenx: payments.reduce((s, p) => s + p.amount, 0), payments };
}