import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Scheduled wrapper around the cleanup logic. Runs daily and prunes each
// player's RunScore history down to the TOP 5 per (week_id, mode), archiving
// the rest into DeletedRunScore (7-day restore window).
//
// Why top-5 and not top-1: payouts only look at the highest score, but we keep
// a small buffer so admins can still investigate suspicious ranking churn /
// answer support tickets ("my score didn't count"). 5 is plenty.
//
// Loops batches internally (50 deletes / batch, 750ms pause) so a single
// scheduled invocation drains the queue. Hard-capped at 200 iterations
// (10k rows) per run as a safety net — anything more will roll into the
// next day's run.

const KEEP_N = 5;
const BATCH_SIZE = 50;
const PAUSE_MS = 750;
const MAX_ITERATIONS = 200;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const db = base44.asServiceRole;
        const startedAt = Date.now();

        // Derive everything we need locally so the scheduled run doesn't depend
        // on the (auth-gated) cleanupKeepTopScoresPerPlayer function.
        const allScores = [];
        const pageSize = 500;
        let skip = 0;
        for (;;) {
            const page = await db.entities.RunScore.filter({}, '-score', pageSize, skip);
            allScores.push(...page);
            if (page.length < pageSize) break;
            skip += pageSize;
            if (skip > 50000) break;
        }

        // Bucket by (owner, week, mode) and collect everything past the top-N.
        const buckets = new Map();
        for (const s of allScores) {
            const owner = s.user_id || s.wallet_address || 'unknown';
            const mode = s.arena_id === 'endless' ? 'endless' : 'normal';
            const key = `${owner}__${s.week_id}__${mode}`;
            if (!buckets.has(key)) buckets.set(key, []);
            buckets.get(key).push(s);
        }

        const toDelete = [];
        for (const group of buckets.values()) {
            if (group.length <= KEEP_N) continue;
            group.sort((a, b) => (b.score || 0) - (a.score || 0));
            toDelete.push(...group.slice(KEEP_N));
        }

        if (toDelete.length === 0) {
            console.log('[scheduledCleanupTopScores] nothing to clean');
            return Response.json({ success: true, archived: 0, scanned: allScores.length, message: 'already clean' });
        }

        // Process in batches with pauses to stay under rate limits.
        let totalSucceeded = 0;
        let totalFailed = 0;
        const cap = Math.min(toDelete.length, MAX_ITERATIONS * BATCH_SIZE);
        for (let i = 0; i < cap; i += BATCH_SIZE) {
            const slice = toDelete.slice(i, i + BATCH_SIZE);
            for (const s of slice) {
                try {
                    await db.entities.DeletedRunScore.create({
                        original_id: s.id,
                        user_id: s.user_id,
                        wallet_address: s.wallet_address,
                        player_name: s.player_name,
                        player_title: s.player_title,
                        pilot_icon: s.pilot_icon,
                        score: s.score,
                        time_survived: s.time_survived,
                        level: s.level,
                        kills: s.kills,
                        character_id: s.character_id,
                        arena_id: s.arena_id,
                        week_id: s.week_id,
                        season_id: s.season_id,
                        original_created_date: s.created_date,
                        deleted_by: 'SCHEDULED',
                        delete_reason: `scheduled_cleanup keep_top_${KEEP_N}`,
                    });
                    await db.entities.RunScore.delete(s.id);
                    totalSucceeded++;
                } catch (e) {
                    console.error('[scheduledCleanupTopScores] failed for', s.id, ':', e.message);
                    totalFailed++;
                }
            }
            if (i + BATCH_SIZE < cap) await sleep(PAUSE_MS);
        }

        // Single audit-log entry summarising the run.
        try {
            await db.entities.AdminChangesLog.create({
                wallet_address: 'SCHEDULED',
                action_type: 'reward_adjustment',
                description: `Scheduled cleanup: archived ${totalSucceeded} duplicate scores (kept top ${KEEP_N} per player per week×mode).`,
                details: {
                    archived: totalSucceeded,
                    failed: totalFailed,
                    scanned: allScores.length,
                    queued: toDelete.length,
                    keepN: KEEP_N,
                    durationMs: Date.now() - startedAt,
                },
            });
        } catch (e) { console.error('[scheduledCleanupTopScores] audit log failed:', e.message); }

        console.log(`[scheduledCleanupTopScores] archived=${totalSucceeded} failed=${totalFailed} scanned=${allScores.length} in ${Date.now() - startedAt}ms`);

        return Response.json({
            success: true,
            archived: totalSucceeded,
            failed: totalFailed,
            scanned: allScores.length,
            queued: toDelete.length,
            durationMs: Date.now() - startedAt,
        });
    } catch (error) {
        console.error('[scheduledCleanupTopScores]', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});