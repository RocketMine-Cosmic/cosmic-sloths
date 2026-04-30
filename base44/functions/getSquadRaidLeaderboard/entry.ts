import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Auth: Base44 session (any authenticated user can view).
// Aggregates GlobalBossContribution by squad_id for the current (or specified) week.
// Returns top squads ranked by total damage to the world boss.

function getCurrentWeekId() {
    const now = new Date();
    const year = now.getUTCFullYear();
    const startOfYear = new Date(Date.UTC(year, 0, 1));
    const startOfWeek = new Date(startOfYear);
    startOfWeek.setUTCDate(startOfYear.getUTCDate() - startOfYear.getUTCDay() + 1);
    const isoWeek = Math.ceil(((now - startOfWeek) / 86400000 + 1) / 7);
    return `${year}-W${String(isoWeek).padStart(2, '0')}`;
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

        // Aggregate by squad_id (skip contributions without a squad)
        const bySquad = new Map();
        for (const c of all) {
            if (!c.squad_id) continue;
            const key = c.squad_id;
            const cur = bySquad.get(key) || {
                squad_id: c.squad_id,
                squad_name: c.squad_name || '',
                squad_tag: c.squad_tag || '',
                squad_icon: c.squad_icon || '🛡️',
                total_damage: 0,
                contributors: new Set(),
            };
            cur.total_damage += Number(c.damage || 0);
            if (c.user_id) cur.contributors.add(c.user_id);
            // Refresh cached display fields with the latest values seen
            if (c.squad_name) cur.squad_name = c.squad_name;
            if (c.squad_tag) cur.squad_tag = c.squad_tag;
            if (c.squad_icon) cur.squad_icon = c.squad_icon;
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