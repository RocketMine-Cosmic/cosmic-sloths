import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Returns the current season's Champions Pool standings (top 10 squads ranked).
// Read-only — used by the Squad Wars UI to show live progress.
// Auth: any signed-in user.

const CHAMPIONS_POOL_PCT = 0.05;
const TOP_3_SHARES = [0.5, 0.3, 0.2];
const MIN_WARS_FOUGHT = 2;
const MIN_SQUAD_MEMBERS = 2;

function getCurrentSeasonId() {
    const now = new Date();
    const year = now.getUTCFullYear();
    const startOfYear = new Date(Date.UTC(year, 0, 1));
    const startOfWeek = new Date(startOfYear);
    startOfWeek.setUTCDate(startOfYear.getUTCDate() - startOfYear.getUTCDay() + 1);
    const isoWeek = Math.ceil(((now - startOfWeek) / 86400000 + 1) / 7);
    const seasonNum = Math.floor((isoWeek - 1) / 4) + 1;
    return `${year}-S${seasonNum}`;
}

function getWeekIdsForSeason(seasonId) {
    const m = /^(\d{4})-S(\d+)$/.exec(seasonId);
    if (!m) return [];
    const year = parseInt(m[1], 10);
    const sNum = parseInt(m[2], 10);
    const startWeek = (sNum - 1) * 4 + 1;
    const weeks = [];
    for (let i = 0; i < 4; i++) {
        const wk = startWeek + i;
        if (wk > 53) break;
        weeks.push(`${year}-W${String(wk).padStart(2, '0')}`);
    }
    return weeks;
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const me = await base44.auth.me();
        if (!me) return Response.json({ error: 'Please sign in.' }, { status: 401 });

        const body = await req.json().catch(() => ({}));
        const periodId = body.period_id || getCurrentSeasonId();

        // Look up the seasonal pool to compute current Champions Pool size
        const pools = await base44.asServiceRole.entities.TokenPool.filter({ period_id: periodId, period_type: 'seasonal' });
        const totalSpent = pools.length > 0 ? (pools[0].total_spent || 0) : 0;
        const championsPool = Math.floor(totalSpent * CHAMPIONS_POOL_PCT * 100) / 100;

        // Aggregate squad performance for the season (resolved + in-progress wars both count for standings)
        const weekIds = getWeekIdsForSeason(periodId);
        const allWars = [];
        for (const wid of weekIds) {
            const wars = await base44.asServiceRole.entities.SquadWar.filter({ week_id: wid });
            allWars.push(...wars);
        }

        const bySquad = new Map();
        const ensure = (id, name, tag, icon) => {
            if (!id) return null;
            if (!bySquad.has(id)) {
                bySquad.set(id, {
                    squad_id: id, squad_name: name || '', squad_tag: tag || '', squad_icon: icon || '🛡️',
                    wins: 0, losses: 0, ties: 0, byes: 0,
                    total_kills: 0, wars_fought: 0,
                });
            }
            return bySquad.get(id);
        };

        for (const war of allWars) {
            const a = ensure(war.squad_a_id, war.squad_a_name, war.squad_a_tag, war.squad_a_icon);
            const b = war.squad_b_id ? ensure(war.squad_b_id, war.squad_b_name, war.squad_b_tag, war.squad_b_icon) : null;
            if (a) { a.wars_fought++; a.total_kills += Number(war.kills_a || 0); }
            if (b) { b.wars_fought++; b.total_kills += Number(war.kills_b || 0); }
            if (!war.is_resolved) continue; // only resolved wars award points
            if (war.result_kind === 'bye' && a) a.byes++;
            else if (war.result_kind === 'tie') { if (a) a.ties++; if (b) b.ties++; }
            else if (war.result_kind === 'win_a') { if (a) a.wins++; if (b) b.losses++; }
            else if (war.result_kind === 'win_b') { if (b) b.wins++; if (a) a.losses++; }
        }

        const rows = [];
        for (const sq of bySquad.values()) {
            const points = sq.wins * 3 + sq.ties * 1 + sq.byes * 1;
            // Use cached display fields from the war record (avoid extra Squad.get N+1)
            rows.push({
                ...sq,
                ranking_points: points,
                eligible: sq.wars_fought >= MIN_WARS_FOUGHT,
            });
        }

        rows.sort((a, b) =>
            b.ranking_points - a.ranking_points ||
            b.total_kills - a.total_kills ||
            b.wars_fought - a.wars_fought
        );

        // Project payouts for the current top 3 (estimate — actual final payout uses snapshot at distribution time)
        const eligible = rows.filter(r => r.eligible);
        const numWinners = Math.min(3, eligible.length);
        const shares = numWinners === 1 ? [1.0]
            : numWinners === 2 ? [0.65, 0.35]
            : numWinners === 3 ? TOP_3_SHARES
            : [];

        const top10 = rows.slice(0, 10).map((r, i) => {
            const isProjectedWinner = r.eligible && i < numWinners;
            const projectedShare = isProjectedWinner
                ? Math.floor(championsPool * shares[i] * 100) / 100
                : 0;
            return {
                rank: i + 1,
                squad_id: r.squad_id,
                squad_name: r.squad_name,
                squad_tag: r.squad_tag,
                squad_icon: r.squad_icon,
                ranking_points: r.ranking_points,
                wins: r.wins, losses: r.losses, ties: r.ties, byes: r.byes,
                total_kills: r.total_kills,
                wars_fought: r.wars_fought,
                eligible: r.eligible,
                projected_squad_share_omenx: projectedShare,
            };
        });

        return Response.json({
            success: true,
            period_id: periodId,
            pool_total_spent: totalSpent,
            champions_pool_omenx: championsPool,
            min_wars_for_eligibility: MIN_WARS_FOUGHT,
            standings: top10,
        });
    } catch (error) {
        console.error('[getSquadChampionsStandings]', error.message);
        return Response.json({ error: 'Could not load standings.' }, { status: 500 });
    }
});