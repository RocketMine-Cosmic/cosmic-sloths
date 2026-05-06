import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Keeps each player's TOP N scores per (week_id, mode) and soft-deletes the rest.
// Mode is "endless" vs "normal" (everything not endless). Archives all deleted
// rows into DeletedRunScore so they're restorable for 7 days.
//
// Modes:
//   - dryRun=true                       → returns counts only (no writes)
//   - dryRun=false, batchSize<=N        → processes ONE batch, returns nextOffset
//                                         so the client can chain calls and avoid 429s
//
// Defaults: keepN=1, batchSize=50.
//
// Auth: Base44 session + 'edit_players' permission, OR emergency master key.

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const body = await req.json();
        const { keepN = 1, periodFilter = 'all', dryRun = true, batchSize = 50, offset = 0, adminKey } = body;

        let callerWallet = 'EMERGENCY_KEY';
        if (!(adminKey && adminKey === Deno.env.get('AdminDash'))) {
            const me = await base44.auth.me();
            if (!me) return Response.json({ error: 'Unauthorized' }, { status: 401 });
            callerWallet = me.wallet_address?.toLowerCase();
            if (!callerWallet) return Response.json({ error: 'No wallet linked' }, { status: 401 });
            const records = await base44.asServiceRole.entities.AdminWallet.filter({ wallet_address: callerWallet });
            if (records.length === 0) return Response.json({ error: 'Forbidden — not an admin' }, { status: 403 });
            const perms = records[0].permissions || [];
            if (!perms.includes('edit_players') && !perms.includes('owner')) {
                return Response.json({ error: "Forbidden — 'edit_players' permission required" }, { status: 403 });
            }
        }

        const keep = Math.max(1, Math.min(10, Number(keepN) || 1));
        const batch = Math.max(1, Math.min(100, Number(batchSize) || 50));
        const startOffset = Math.max(0, Number(offset) || 0);

        // Pull all RunScores in pages (entity .filter caps at 500/call).
        const allScores = [];
        const pageSize = 500;
        let skip = 0;
        for (;;) {
            const filter = periodFilter && periodFilter !== 'all' ? { week_id: periodFilter } : {};
            const page = await base44.asServiceRole.entities.RunScore.filter(filter, '-score', pageSize, skip);
            allScores.push(...page);
            if (page.length < pageSize) break;
            skip += pageSize;
            if (skip > 50000) break; // safety ceiling
        }

        // Bucket by (user_id|wallet_address, week_id, mode).
        const buckets = new Map();
        for (const s of allScores) {
            const owner = s.user_id || s.wallet_address || 'unknown';
            const mode = s.arena_id === 'endless' ? 'endless' : 'normal';
            const key = `${owner}__${s.week_id}__${mode}`;
            if (!buckets.has(key)) buckets.set(key, []);
            buckets.get(key).push(s);
        }

        // For each bucket, sort desc and mark all but the top-N for deletion.
        const toDelete = [];
        const playerSummary = {};
        for (const [key, group] of buckets) {
            if (group.length <= keep) continue;
            group.sort((a, b) => (b.score || 0) - (a.score || 0));
            const losers = group.slice(keep);
            toDelete.push(...losers);
            const ownerKey = key.split('__')[0];
            const name = group[0].player_name || 'Unknown';
            if (!playerSummary[ownerKey]) playerSummary[ownerKey] = { kept: 0, deleted: 0, name };
            playerSummary[ownerKey].kept += keep;
            playerSummary[ownerKey].deleted += losers.length;
        }

        // Stable order so offset-based chaining is consistent across calls.
        // (We re-derive the list each call rather than keep server state.)
        toDelete.sort((a, b) => String(a.id).localeCompare(String(b.id)));

        const summary = {
            scanned: allScores.length,
            buckets: buckets.size,
            bucketsWithExtras: [...buckets.values()].filter(g => g.length > keep).length,
            totalToDelete: toDelete.length,
            uniquePlayersAffected: Object.keys(playerSummary).length,
            keepN: keep,
            periodFilter,
            topAffected: Object.entries(playerSummary)
                .sort((a, b) => b[1].deleted - a[1].deleted)
                .slice(0, 20)
                .map(([owner, info]) => ({ owner: owner.slice(0, 12) + '…', name: info.name, kept: info.kept, deleted: info.deleted })),
        };

        if (dryRun) {
            console.log(`[cleanupKeepTopScoresPerPlayer] DRY-RUN by ${callerWallet}: would delete ${toDelete.length} of ${allScores.length}`);
            return Response.json({ success: true, dryRun: true, summary });
        }

        // Process ONE batch from `offset` and return nextOffset so the client can chain.
        const slice = toDelete.slice(startOffset, startOffset + batch);
        let succeeded = 0;
        const failures = [];
        for (const s of slice) {
            try {
                await base44.asServiceRole.entities.DeletedRunScore.create({
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
                    deleted_by: callerWallet,
                    delete_reason: `bulk_cleanup keep_top_${keep}`,
                });
                await base44.asServiceRole.entities.RunScore.delete(s.id);
                succeeded++;
            } catch (e) {
                console.error('[cleanupKeepTopScoresPerPlayer] failed for', s.id, ':', e.message);
                failures.push({ id: s.id, error: e.message });
            }
        }

        const processedThrough = startOffset + slice.length;
        const isFinalBatch = processedThrough >= toDelete.length;
        const nextOffset = isFinalBatch ? null : processedThrough;

        // Audit log only on the final batch so we don't spam the changelog.
        if (isFinalBatch) {
            try {
                await base44.asServiceRole.entities.AdminChangesLog.create({
                    wallet_address: callerWallet,
                    action_type: 'reward_adjustment',
                    description: `Cleanup: kept top ${keep} per player per (week,mode). Total queued: ${toDelete.length}.`,
                    details: { ...summary, lastBatchSucceeded: succeeded, lastBatchFailed: failures.length },
                });
            } catch (e) { console.error('[cleanupKeepTopScoresPerPlayer] audit log failed:', e.message); }
        }

        console.log(`[cleanupKeepTopScoresPerPlayer] ${callerWallet} batch ${startOffset}-${processedThrough}/${toDelete.length}: archived ${succeeded}`);
        return Response.json({
            success: true,
            dryRun: false,
            summary,
            batchSucceeded: succeeded,
            batchFailed: failures.length,
            failures: failures.slice(0, 10),
            processedThrough,
            nextOffset,
            isFinalBatch,
            totalToDelete: toDelete.length,
        });
    } catch (error) {
        console.error('[cleanupKeepTopScoresPerPlayer]', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});