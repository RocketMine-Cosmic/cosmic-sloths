import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Auth: Base44 session (any authenticated user can view).
// Aggregates GlobalBossContribution by squad_id for the current (or specified) week.
// Returns top squads ranked by total damage to the world boss.

// Proper ISO 8601 (Mon-start, Sun 23:59 UTC end). Old formula rolled over a day early on Sundays.
function getCurrentWeekId() {
    const now = new Date();
    const tmp = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const dayNum = tmp.getUTCDay() || 7;
    tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
    const isoYear = tmp.getUTCFullYear();
    const yearStart = new Date(Date.UTC(isoYear, 0, 1));
    const isoWeek = Math.ceil(((tmp - yearStart) / 86400000 + 1) / 7);
    return `${isoYear}-W${String(isoWeek).padStart(2, '0')}`;
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const me = await base44.auth.me();
        if (!me) return Response.json({ error: 'Please sign in to view raid stats.' }, { status: 401 });

        const body = await req.json().catch(() => ({}));
        const weekId = body.weekId || getCurrentWeekId();

        // Pull all contributions for this week. Page in case there's a lot.
        const PAGE = 500;
        let all = [];
        let skip = 0;
        for (let i = 0; i < 20; i++) { // cap at 10k contributions per week
            const page = await base44.asServiceRole.entities.GlobalBossContribution.list(
                '-created_date', PAGE, skip
            );
            const filtered = page.filter(c => c.week_id === weekId);
            all = all.concat(filtered);
            if (page.length < PAGE) break;
            skip += PAGE;
        }

        // Back-fill squad info for contributions missing it (older records were created
        // before submitBossDamage attached squad info). Look up current squad membership
        // by wallet for any contribution with no squad_id.
        const walletsNeedingLookup = new Set();
        for (const c of all) {
            if (!c.squad_id && c.user_id) walletsNeedingLookup.add(c.user_id.toLowerCase());
        }
        const walletToSquad = new Map();
        if (walletsNeedingLookup.size > 0) {
            // Batch in groups so we don't hit a query limit
            const wallets = Array.from(walletsNeedingLookup);
            for (const wallet of wallets) {
                try {
                    const members = await base44.asServiceRole.entities.SquadMember.filter({ wallet_address: wallet });
                    if (members.length > 0) {
                        const sq = await base44.asServiceRole.entities.Squad.get(members[0].squad_id);
                        if (sq) {
                            walletToSquad.set(wallet, {
                                squad_id: sq.id,
                                squad_name: sq.name || '',
                                squad_tag: sq.tag || '',
                                squad_icon: sq.icon || '🛡️',
                            });
                        }
                    }
                } catch (e) {
                    // Skip if lookup fails
                }
            }
        }

        // Aggregate by squad_id (using back-filled lookups when needed)
        const bySquad = new Map();
        for (const c of all) {
            let squadInfo = c.squad_id
                ? { squad_id: c.squad_id, squad_name: c.squad_name, squad_tag: c.squad_tag, squad_icon: c.squad_icon }
                : (c.user_id ? walletToSquad.get(c.user_id.toLowerCase()) : null);
            if (!squadInfo?.squad_id) continue;
            const key = squadInfo.squad_id;
            const cur = bySquad.get(key) || {
                squad_id: squadInfo.squad_id,
                squad_name: squadInfo.squad_name || '',
                squad_tag: squadInfo.squad_tag || '',
                squad_icon: squadInfo.squad_icon || '🛡️',
                total_damage: 0,
                contributors: new Set(),
            };
            cur.total_damage += Number(c.damage || 0);
            if (c.user_id) cur.contributors.add(c.user_id);
            if (squadInfo.squad_name) cur.squad_name = squadInfo.squad_name;
            if (squadInfo.squad_tag) cur.squad_tag = squadInfo.squad_tag;
            if (squadInfo.squad_icon) cur.squad_icon = squadInfo.squad_icon;
            bySquad.set(key, cur);
        }

        const ranking = Array.from(bySquad.values())
            .map(s => ({
                squad_id: s.squad_id,
                squad_name: s.squad_name,
                squad_tag: s.squad_tag,
                squad_icon: s.squad_icon,
                total_damage: Math.floor(s.total_damage),
                contributor_count: s.contributors.size,
            }))
            .sort((a, b) => b.total_damage - a.total_damage)
            .slice(0, 50);

        return Response.json({ success: true, weekId, ranking });
    } catch (error) {
        console.error('[getSquadRaidLeaderboard]', error.message);
        return Response.json({ error: 'Couldn\'t load the raid leaderboard. Please try again.' }, { status: 500 });
    }
});