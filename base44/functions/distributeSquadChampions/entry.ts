import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Distributes the Squad Wars Champions Pool (5% of seasonal OMENX) to top 3 squads
// of a season. Idempotent — safe to call repeatedly. Real-money path; every payout
// is logged to SquadChampionsPayoutLog.
//
// Auth:
//   - emergency adminKey (env: AdminDash) — used by automation/cron
//   - OR Base44 admin user with 'distribute_rewards' permission
//
// Body params:
//   { period_id?: string, mode?: 'preview' | 'execute', adminKey?: string }
//   - period_id defaults to the previous completed season
//   - mode defaults to 'preview' (read-only, computes ranking + payout list)

// Service-role db client — set inside the request handler from
// createClientFromRequest(req).asServiceRole. Module-level `let` so the helper
// functions further down can use it without threading through every call.
// CRITICAL: previously used `createClient({ appId })` which is unauthenticated
// and CANNOT read AdminWallet (admin-only RLS) → every admin caller got
// "Forbidden — not an admin" (Texxy/Hugo bug 2026-05-04, mirrors the
// distributeRewards fix).
let db = null;

const GAME_ID = 'cosmic-sloths';
const GAME_NAME = 'Cosmic Sloths';
const CHAMPIONS_POOL_PCT = 0.10; // 10% of seasonal pool
const TOP_3_SHARES = [0.5, 0.3, 0.2]; // 1st, 2nd, 3rd
const MIN_WARS_FOUGHT = 2;
const MIN_SQUAD_MEMBERS = 2;

// Get current and previous season ids based on UTC week.
// Proper ISO 8601 (Mon-start, Sun 23:59 UTC end). Old formula rolled over a day early on Sundays.
function getCurrentPeriodIds() {
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
    return { week_id, season_id, isoWeek, year: isoYear };
}

// Returns the previous season id given the current one (rolls year if needed).
function getPreviousSeasonId() {
    const { season_id, year } = getCurrentPeriodIds();
    const m = /^(\d{4})-S(\d+)$/.exec(season_id);
    if (!m) return null;
    const sNum = parseInt(m[2], 10);
    if (sNum > 1) return `${m[1]}-S${sNum - 1}`;
    // Roll back to last season of previous year (year had 52 weeks → 13 seasons of 4 weeks)
    return `${year - 1}-S13`;
}

// Returns the list of week_ids that belong to a given season_id (4 consecutive ISO weeks).
function getWeekIdsForSeason(seasonId) {
    const m = /^(\d{4})-S(\d+)$/.exec(seasonId);
    if (!m) return [];
    const year = parseInt(m[1], 10);
    const sNum = parseInt(m[2], 10);
    const startWeek = (sNum - 1) * 4 + 1;
    const weeks = [];
    for (let i = 0; i < 4; i++) {
        const wk = startWeek + i;
        if (wk > 53) break; // safety
        weeks.push(`${year}-W${String(wk).padStart(2, '0')}`);
    }
    return weeks;
}

// Aggregates squad performance across all wars in the season, returning a sorted ranking.
async function buildSeasonRanking(periodId) {
    const weekIds = getWeekIdsForSeason(periodId);
    if (weekIds.length === 0) return [];

    // Pull all resolved wars for these 4 weeks
    const allWars = [];
    for (const wid of weekIds) {
        const wars = await db.entities.SquadWar.filter({ week_id: wid });
        allWars.push(...wars.filter(w => w.is_resolved));
    }

    // Aggregate per squad
    const bySquad = new Map();
    const ensure = (squadId, name, tag, icon) => {
        if (!squadId) return null;
        if (!bySquad.has(squadId)) {
            bySquad.set(squadId, {
                squad_id: squadId,
                squad_name: name || '',
                squad_tag: tag || '',
                squad_icon: icon || '🛡️',
                wins: 0, losses: 0, ties: 0, byes: 0,
                total_kills: 0,
                wars_fought: 0,
            });
        }
        return bySquad.get(squadId);
    };

    for (const war of allWars) {
        const a = ensure(war.squad_a_id, war.squad_a_name, war.squad_a_tag, war.squad_a_icon);
        const b = war.squad_b_id ? ensure(war.squad_b_id, war.squad_b_name, war.squad_b_tag, war.squad_b_icon) : null;

        if (a) {
            a.wars_fought++;
            a.total_kills += Number(war.kills_a || 0);
        }
        if (b) {
            b.wars_fought++;
            b.total_kills += Number(war.kills_b || 0);
        }

        if (war.result_kind === 'bye') {
            if (a) a.byes++;
        } else if (war.result_kind === 'tie') {
            if (a) a.ties++;
            if (b) b.ties++;
        } else if (war.result_kind === 'win_a') {
            if (a) a.wins++;
            if (b) b.losses++;
        } else if (war.result_kind === 'win_b') {
            if (b) b.wins++;
            if (a) a.losses++;
        }
    }

    // Compute ranking points, refresh display fields with current squad info, and check member count
    const rows = [];
    for (const sq of bySquad.values()) {
        const points = sq.wins * 3 + sq.ties * 1 + sq.byes * 1;
        // Refresh display fields + member count from current Squad record
        let memberCount = 0;
        try {
            const fresh = await db.entities.Squad.get(sq.squad_id);
            if (fresh) {
                sq.squad_name = fresh.name || sq.squad_name;
                sq.squad_tag = fresh.tag || sq.squad_tag;
                sq.squad_icon = fresh.icon || sq.squad_icon;
                memberCount = fresh.member_count || 0;
            }
        } catch {}
        rows.push({
            ...sq,
            ranking_points: points,
            member_count: memberCount,
            eligible: sq.wars_fought >= MIN_WARS_FOUGHT && memberCount >= MIN_SQUAD_MEMBERS,
        });
    }

    // Sort: points desc, kills desc, wars_fought desc
    rows.sort((a, b) =>
        b.ranking_points - a.ranking_points ||
        b.total_kills - a.total_kills ||
        b.wars_fought - a.wars_fought
    );

    return rows;
}

async function fetchSquadMemberWallets(squadId) {
    const PAGE = 100;
    const wallets = [];
    let skip = 0;
    for (let i = 0; i < 5; i++) {
        const members = await db.entities.SquadMember.filter({ squad_id: squadId }, '-created_date', PAGE, skip);
        for (const m of members) {
            if (m.wallet_address) wallets.push(m.wallet_address.toLowerCase());
        }
        if (members.length < PAGE) break;
        skip += PAGE;
    }
    return [...new Set(wallets)];
}

async function callOmenxBatch(payments, apiBaseUrl, rewardsKeys, note) {
    const CHUNK_SIZE = 20;
    const chunks = [];
    for (let i = 0; i < payments.length; i += CHUNK_SIZE) {
        chunks.push(payments.slice(i, i + CHUNK_SIZE));
    }
    const txIds = [];
    for (let ci = 0; ci < chunks.length; ci++) {
        const chunk = chunks[ci];
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
                    gameId: GAME_ID, gameName: GAME_NAME,
                    note: `${note} chunk ${ci + 1}/${chunks.length}`,
                }),
            });
            const result = await response.json().catch(() => ({}));
            if (response.ok) {
                txIds.push(result?.transactionId || result?.txHash || '');
                ok = true;
                break;
            }
            lastErr = `HTTP ${response.status}: ${JSON.stringify(result)}`;
            console.warn(`[distributeSquadChampions] chunk ${ci + 1} key ${attempt + 1} failed:`, lastErr);
            if (response.status !== 429 && response.status < 500) break;
        }
        if (!ok) throw new Error(`Chunk ${ci + 1}/${chunks.length} failed: ${lastErr}`);
    }
    return txIds.join(',');
}

Deno.serve(async (req) => {
    try {
        const body = await req.json().catch(() => ({}));
        const { adminKey, mode = 'preview' } = body;
        let { period_id } = body;

        // Auth check — always use service-role for entity reads/writes inside this fn
        // (we read AdminWallet which has admin-only RLS, and write PayoutLog/Roster).
        const base44 = createClientFromRequest(req);
        db = base44.asServiceRole;

        let callerWallet = 'EMERGENCY_KEY';
        if (!(adminKey && adminKey === Deno.env.get('AdminDash'))) {
            const me = await base44.auth.me();
            if (!me) return Response.json({ error: 'Unauthorized' }, { status: 401 });
            callerWallet = me.wallet_address?.toLowerCase();
            if (!callerWallet) return Response.json({ error: 'No wallet linked' }, { status: 401 });
            const records = await db.entities.AdminWallet.filter({ wallet_address: callerWallet });
            if (records.length === 0) return Response.json({ error: 'Forbidden — not an admin' }, { status: 403 });
            const perms = records[0].permissions || [];
            if (!perms.includes('distribute_rewards') && !perms.includes('owner')) {
                return Response.json({ error: "Forbidden — 'distribute_rewards' permission required" }, { status: 403 });
            }
        }

        // Default to previous completed season
        // Track whether the caller specified period_id (manual run) vs auto-defaulted (cron run).
        // The 4-week cron isn't anchored to season boundaries, so we MUST guard against it
        // firing mid-season — otherwise it'd target a long-ago season that's already paid
        // and just no-op every time, which is harmless but noisy. The proper guard:
        // only run on automation if the current ISO week is the FIRST week of a new season
        // (i.e. previous season just ended at last Sun 23:59 UTC).
        const explicitPeriod = !!period_id;
        if (!period_id) period_id = getPreviousSeasonId();
        if (!period_id) return Response.json({ error: 'Could not determine season id' }, { status: 400 });

        // Season-end anchor guard (only enforced for automated runs without explicit period_id).
        // Seasons are 4 ISO weeks. Season N covers weeks [(N-1)*4 + 1 .. N*4]. After Sun 23:59 UTC
        // of week N*4, the new season starts. So this fn should ONLY pay out when the current
        // ISO week is the FIRST week of a new season — i.e. (currentIsoWeek - 1) % 4 === 0.
        if (!explicitPeriod) {
            const { isoWeek } = getCurrentPeriodIds();
            const isFirstWeekOfSeason = ((isoWeek - 1) % 4) === 0;
            if (!isFirstWeekOfSeason) {
                return Response.json({
                    success: true,
                    mode,
                    skipped: 'not season-end',
                    reason: `Current ISO week ${isoWeek} is not the first week of a season (must satisfy (week-1) % 4 === 0). Champions payout only fires when the previous season has just closed.`,
                    period_id,
                });
            }
        }

        // Look up the seasonal pool
        const pools = await db.entities.TokenPool.filter({ period_id, period_type: 'seasonal' });
        if (pools.length === 0) {
            return Response.json({ error: `No seasonal pool found for ${period_id}` }, { status: 404 });
        }
        const pool = pools[0];
        const championsPool = Math.floor((pool.total_spent || 0) * CHAMPIONS_POOL_PCT);

        // Idempotency: already distributed?
        const existingPayouts = await db.entities.SquadChampionsPayoutLog.filter({ period_id });
        if (existingPayouts.length > 0 && mode === 'execute') {
            return Response.json({
                error: `Champions Pool already distributed for ${period_id} (${existingPayouts.length} existing payouts).`,
                already_distributed: true,
                existing_count: existingPayouts.length,
            }, { status: 409 });
        }

        // Build season ranking
        const ranking = await buildSeasonRanking(period_id);
        const eligible = ranking.filter(r => r.eligible);
        const top3 = eligible.slice(0, 3);

        // Compute per-squad share
        const numWinners = top3.length;
        let shares;
        if (numWinners === 0) {
            shares = [];
        } else if (numWinners === 1) {
            shares = [1.0];
        } else if (numWinners === 2) {
            shares = [0.65, 0.35];
        } else {
            shares = TOP_3_SHARES;
        }

        // Compute per-squad and per-member payouts
        const squadResults = [];
        const allMemberPayments = []; // for OMENX batch call

        for (let i = 0; i < top3.length; i++) {
            const squad = top3[i];
            const squadShare = Math.floor(championsPool * shares[i]);
            const wallets = await fetchSquadMemberWallets(squad.squad_id);

            // Filter out blacklisted wallets defensively
            const blacklisted = await db.entities.BlacklistedWallet.list();
            const blacklistSet = new Set(blacklisted.map(b => (b.wallet_address || '').toLowerCase()));
            const eligibleWallets = wallets.filter(w => !blacklistSet.has(w));

            const memberCount = eligibleWallets.length;
            const perMember = memberCount > 0
                ? Math.floor(squadShare / memberCount)
                : 0;

            const memberPayouts = eligibleWallets.map(w => ({
                walletAddress: w,
                amount: perMember,
                squad_id: squad.squad_id,
                squad_name: squad.squad_name,
                squad_tag: squad.squad_tag,
                squad_rank: i + 1,
            }));

            squadResults.push({
                rank: i + 1,
                squad_id: squad.squad_id,
                squad_name: squad.squad_name,
                squad_tag: squad.squad_tag,
                squad_icon: squad.squad_icon,
                ranking_points: squad.ranking_points,
                wins: squad.wins, losses: squad.losses, ties: squad.ties, byes: squad.byes,
                total_kills: squad.total_kills,
                wars_fought: squad.wars_fought,
                member_count: memberCount,
                squad_share_omenx: squadShare,
                per_member_omenx: perMember,
                member_wallets: eligibleWallets,
            });

            if (perMember >= 1) {
                allMemberPayments.push(...memberPayouts);
            }
        }

        const totalPayout = allMemberPayments.reduce((s, p) => s + p.amount, 0);

        // ---- PREVIEW MODE: don't pay, just return what would happen ----
        if (mode !== 'execute') {
            return Response.json({
                success: true,
                mode: 'preview',
                period_id,
                pool_total_spent: pool.total_spent,
                champions_pool_omenx: championsPool,
                already_distributed: existingPayouts.length > 0,
                eligible_squads: eligible.length,
                top_squads: squadResults,
                total_member_payouts: allMemberPayments.length,
                total_payout_omenx: totalPayout,
                full_ranking: ranking.slice(0, 20), // top 20 for visibility
            });
        }

        // ---- EXECUTE MODE ----
        if (championsPool <= 0) {
            return Response.json({
                success: true,
                mode: 'execute',
                period_id,
                skipped: 'zero champions pool',
            });
        }
        if (allMemberPayments.length === 0) {
            // Snapshot rosters even when no payout (for audit trail)
            for (const sq of squadResults) {
                await db.entities.SquadSeasonRoster.create({
                    period_id,
                    squad_id: sq.squad_id,
                    squad_name: sq.squad_name,
                    squad_tag: sq.squad_tag,
                    squad_icon: sq.squad_icon,
                    wallet_addresses: sq.member_wallets,
                    ranking_points: sq.ranking_points,
                    total_kills: sq.total_kills,
                    wars_fought: sq.wars_fought,
                    wins: sq.wins, losses: sq.losses, ties: sq.ties, byes: sq.byes,
                    final_rank: sq.rank,
                    champions_pool_share: sq.squad_share_omenx,
                });
            }
            return Response.json({
                success: true,
                mode: 'execute',
                period_id,
                skipped: 'no eligible members',
                champions_pool_omenx: championsPool,
            });
        }

        // Pay via OMENX
        const apiBaseUrl = Deno.env.get('DEVELOPER_API_BASE_URL') || 'https://api.omen.foundation';
        const rewardsKeys = [
            Deno.env.get('OMENX_REWARDS_API_KEY'),
            Deno.env.get('OMENX_REWARDS_API_KEY_2'),
            Deno.env.get('OMENX_REWARDS_API_KEY_3'),
            Deno.env.get('OMENX_REWARDS_API_KEY_4'),
        ].filter(Boolean);
        if (rewardsKeys.length === 0) {
            return Response.json({ error: 'No OMENX rewards API keys configured' }, { status: 500 });
        }

        const txId = await callOmenxBatch(
            allMemberPayments, apiBaseUrl, rewardsKeys,
            `Squad Champions ${period_id}`
        );

        // Persist roster snapshots + payout logs
        for (const sq of squadResults) {
            await db.entities.SquadSeasonRoster.create({
                period_id,
                squad_id: sq.squad_id,
                squad_name: sq.squad_name,
                squad_tag: sq.squad_tag,
                squad_icon: sq.squad_icon,
                wallet_addresses: sq.member_wallets,
                ranking_points: sq.ranking_points,
                total_kills: sq.total_kills,
                wars_fought: sq.wars_fought,
                wins: sq.wins, losses: sq.losses, ties: sq.ties, byes: sq.byes,
                final_rank: sq.rank,
                champions_pool_share: sq.squad_share_omenx,
            });
        }
        for (const p of allMemberPayments) {
            await db.entities.SquadChampionsPayoutLog.create({
                period_id,
                wallet_address: p.walletAddress,
                squad_id: p.squad_id,
                squad_name: p.squad_name,
                squad_tag: p.squad_tag,
                squad_rank: p.squad_rank,
                amount: p.amount,
                tx_id: txId,
                status: 'success',
            });
        }

        // Audit log
        try {
            await db.entities.AdminChangesLog.create({
                wallet_address: callerWallet,
                action_type: 'reward_adjustment',
                description: `Squad Wars Champions Pool distributed for ${period_id}`,
                details: {
                    period_id,
                    champions_pool_omenx: championsPool,
                    total_payout: totalPayout,
                    member_count: allMemberPayments.length,
                    top_squads: squadResults.map(s => ({ rank: s.rank, name: s.squad_name, tag: s.squad_tag, share: s.squad_share_omenx })),
                },
            });
        } catch {}

        return Response.json({
            success: true,
            mode: 'execute',
            period_id,
            champions_pool_omenx: championsPool,
            total_payout_omenx: totalPayout,
            member_count: allMemberPayments.length,
            top_squads: squadResults.map(s => ({
                rank: s.rank,
                squad_name: s.squad_name,
                squad_tag: s.squad_tag,
                squad_share_omenx: s.squad_share_omenx,
                per_member_omenx: s.per_member_omenx,
                member_count: s.member_count,
            })),
            tx_id: txId,
        });
    } catch (error) {
        console.error('[distributeSquadChampions]', error.message, error.stack);
        return Response.json({ error: error.message }, { status: 500 });
    }
});