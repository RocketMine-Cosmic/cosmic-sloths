import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Admin-only one-shot: takes the top N RunScore rows for a given season and
// copies them into the LegendaryRun entity as a permanent archive. Idempotent
// — running it again for the same season replaces existing rows for that
// season (safer than appending duplicates).
//
// Usage from admin dashboard:
//   base44.functions.invoke('snapshotSeasonHallOfFame', { seasonId: '2026-S5', topN: 50 })

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const me = await base44.auth.me();
        if (!me) return Response.json({ error: 'Unauthorized' }, { status: 401 });
        if (me.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

        const { seasonId, topN = 50 } = await req.json();
        if (!seasonId) return Response.json({ error: 'seasonId required' }, { status: 400 });

        // Fetch top N runs for the season, sorted by score desc.
        const runs = await base44.asServiceRole.entities.RunScore.filter(
            { season_id: seasonId },
            '-score',
            Math.min(200, Math.max(1, Number(topN)))
        );
        if (!runs || runs.length === 0) {
            return Response.json({ ok: true, message: 'No runs found for season', seasonId, archived: 0 });
        }

        // Wipe existing rows for this season first (idempotent re-run).
        const existing = await base44.asServiceRole.entities.LegendaryRun.filter({ season_id: seasonId }, '-rank', 200);
        for (const row of (existing || [])) {
            try {
                await base44.asServiceRole.entities.LegendaryRun.delete(row.id);
            } catch (e) {
                console.warn('[snapshotSeasonHallOfFame] delete existing failed:', e.message);
            }
        }

        // Build legendary records, one per run, ranked by their score order.
        const records = runs.map((r, idx) => ({
            season_id: seasonId,
            rank: idx + 1,
            wallet_address: (r.wallet_address || '').toLowerCase(),
            player_name: r.player_name || 'Anonymous',
            player_title: r.player_title || '',
            pilot_icon: r.pilot_icon || '',
            score: Number(r.score) || 0,
            time_survived: Number(r.time_survived) || 0,
            level: Number(r.level) || 0,
            kills: Number(r.kills) || 0,
            character_id: r.character_id || '',
            arena_id: r.arena_id || '',
            original_run_id: r.id,
            original_created_date: r.created_date,
        }));

        // Bulk-create — Base44 SDK supports bulkCreate; falls back to per-row if needed.
        let archived = 0;
        try {
            await base44.asServiceRole.entities.LegendaryRun.bulkCreate(records);
            archived = records.length;
        } catch (bulkErr) {
            console.warn('[snapshotSeasonHallOfFame] bulkCreate failed, falling back:', bulkErr.message);
            for (const rec of records) {
                try {
                    await base44.asServiceRole.entities.LegendaryRun.create(rec);
                    archived++;
                } catch (e) {
                    console.error('[snapshotSeasonHallOfFame] single create failed:', e.message);
                }
            }
        }

        // Log the action to AdminChangesLog so we have an audit trail.
        try {
            await base44.asServiceRole.entities.AdminChangesLog.create({
                wallet_address: (me.wallet_address || '').toLowerCase(),
                action_type: 'other',
                description: `Snapshot Hall of Fame for ${seasonId} (top ${archived})`,
                details: { seasonId, topN, archived, top_player: records[0]?.player_name, top_score: records[0]?.score },
            });
        } catch (e) { console.warn('[snapshotSeasonHallOfFame] log failed:', e.message); }

        console.log(`[snapshotSeasonHallOfFame] season=${seasonId} archived=${archived}`);
        return Response.json({ ok: true, seasonId, archived, top: records.slice(0, 5) });
    } catch (error) {
        console.error('[snapshotSeasonHallOfFame]', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});