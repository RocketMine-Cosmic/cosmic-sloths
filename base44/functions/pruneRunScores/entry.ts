import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// One-off / on-demand cleanup. Reduces RunScore table size by keeping only each
// player's TOP 5 runs per bucket:
//   • Weekly normal runs:  (wallet, week_id, arena ∉ endless/raid) → top 5
//   • Endless runs:        (wallet, arena_id='endless')            → top 5 (no week)
//   • World boss arena:    never pruned (contribution log)
//
// Modes:
//   { dryRun: true }        — preview deletion counts only
//   { dryRun: false }       — actually delete
//   { weekId: '2026-W18' }  — restrict to a specific week's normal runs (endless still scoped globally)
//
// Auth: emergency admin key OR Base44 session + 'owner' permission.

Deno.serve(async (req) => {
    try {
        const body = await req.json().catch(() => ({}));
        const { adminKey, dryRun = true, weekId = null } = body;

        const base44 = createClientFromRequest(req);
        const db = base44.asServiceRole;

        if (!(adminKey && adminKey === Deno.env.get('AdminDash'))) {
            const me = await base44.auth.me();
            if (!me) return Response.json({ error: 'Unauthorized' }, { status: 401 });
            const callerWallet = me.wallet_address?.toLowerCase();
            if (!callerWallet) return Response.json({ error: 'No wallet linked' }, { status: 401 });
            const records = await db.entities.AdminWallet.filter({ wallet_address: callerWallet });
            if (records.length === 0) return Response.json({ error: 'Forbidden — not an admin' }, { status: 403 });
            const perms = records[0].permissions || [];
            if (!perms.includes('owner')) {
                return Response.json({ error: "Forbidden — owner permission required" }, { status: 403 });
            }
        }

        // Page through ALL relevant runs once, group in-memory, then prune per group.
        const PAGE = 1000;
        const MAX_PAGES = 200;
        const all = [];
        const baseFilter = weekId
            ? { week_id: weekId }
            : {}; // global — endless runs (no week) included
        for (let page = 1; page <= MAX_PAGES; page++) {
            const batch = await db.entities.RunScore.filter(baseFilter, '-created_date', PAGE, page);
            if (!batch || batch.length === 0) break;
            all.push(...batch);
            if (batch.length < PAGE) break;
            // Throttle slightly between pages — table scans of tens of thousands
            // of rows otherwise trip the SDK rate limiter mid-scan.
            await new Promise(r => setTimeout(r, 250));
        }

        // Group: key = wallet + bucket
        // bucket = `endless` | `weekly:${week_id}` | skip raid
        const groups = new Map();
        for (const r of all) {
            const wallet = (r.wallet_address || '').toLowerCase();
            if (!wallet) continue;
            if (r.arena_id === 'world_boss_arena') continue; // raid contribution log — keep all
            const bucket = r.arena_id === 'endless' ? 'endless' : `weekly:${r.week_id || 'unknown'}`;
            const key = `${wallet}|${bucket}`;
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key).push(r);
        }

        const idsToDelete = [];
        let bucketsAffected = 0;
        let runsScanned = all.length;
        for (const [_key, runs] of groups) {
            if (runs.length <= 5) continue;
            runs.sort((a, b) => (b.score || 0) - (a.score || 0));
            const excess = runs.slice(5);
            for (const r of excess) idsToDelete.push(r.id);
            bucketsAffected++;
        }

        if (dryRun) {
            return Response.json({
                dryRun: true,
                weekId,
                runsScanned,
                bucketsTotal: groups.size,
                bucketsAffected,
                runsToDelete: idsToDelete.length,
            });
        }

        // Delete in chunks to keep Base44 happy.
        const CHUNK = 25;
        let deleted = 0;
        let failed = 0;
        for (let i = 0; i < idsToDelete.length; i += CHUNK) {
            const chunk = idsToDelete.slice(i, i + CHUNK);
            const results = await Promise.all(chunk.map(id =>
                db.entities.RunScore.delete(id).then(() => true).catch(e => {
                    console.warn(`[pruneRunScores] delete ${id} failed:`, e.message);
                    return false;
                })
            ));
            deleted += results.filter(Boolean).length;
            failed += results.filter(r => !r).length;
        }

        return Response.json({
            dryRun: false,
            weekId,
            runsScanned,
            bucketsTotal: groups.size,
            bucketsAffected,
            deleted,
            failed,
        });
    } catch (error) {
        console.error('[pruneRunScores]', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});