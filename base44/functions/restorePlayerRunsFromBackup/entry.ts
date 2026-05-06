import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Compare a player's RunScore rows between a DataBackup snapshot and the
// current DB for a given week_id. Surfaces any backup-only runs (i.e. runs
// that were deleted since the backup was taken) and optionally re-creates
// the missing ones in RunScore.
//
// Modes:
//   { mode: 'diff', backupId, wallet, week_id }              → list missing
//   { mode: 'restore', backupId, wallet, week_id }           → re-create missing
//
// Auth: emergency admin key OR Base44 session + 'owner' permission.

Deno.serve(async (req) => {
    try {
        const body = await req.json().catch(() => ({}));
        const { adminKey, mode = 'diff', backupId, wallet, week_id } = body;

        if (!backupId || !wallet || !week_id) {
            return Response.json({ error: 'backupId, wallet, week_id required' }, { status: 400 });
        }

        const base44 = createClientFromRequest(req);
        const db = base44.asServiceRole;

        // Auth
        if (!(adminKey && adminKey === Deno.env.get('AdminDash'))) {
            const me = await base44.auth.me();
            if (!me) return Response.json({ error: 'Unauthorized' }, { status: 401 });
            const callerWallet = me.wallet_address?.toLowerCase();
            if (!callerWallet) return Response.json({ error: 'No wallet linked' }, { status: 401 });
            const records = await db.entities.AdminWallet.filter({ wallet_address: callerWallet });
            if (records.length === 0) return Response.json({ error: 'Forbidden' }, { status: 403 });
            const perms = records[0].permissions || [];
            if (!perms.includes('owner')) {
                return Response.json({ error: "Forbidden — owner permission required" }, { status: 403 });
            }
        }

        const walletLower = wallet.toLowerCase();
        const backup = await db.entities.DataBackup.get(backupId);
        if (!backup) return Response.json({ error: 'Backup not found' }, { status: 404 });

        const snapRunScores = backup.snapshot_data?.runScores || backup.snapshot_data?.RunScores || [];
        const backupRuns = snapRunScores.filter(r => {
            const w = (r.wallet_address || '').toLowerCase();
            return w === walletLower && r.week_id === week_id;
        });

        // Current DB runs for this wallet+week
        const currentRuns = await db.entities.RunScore.filter(
            { wallet_address: walletLower, week_id },
            '-score',
            500
        );
        const currentIds = new Set(currentRuns.map(r => r.id));

        // Backup-only runs: in backup, NOT currently in DB.
        const missing = backupRuns
            .filter(r => !currentIds.has(r.id))
            .sort((a, b) => (b.score || 0) - (a.score || 0));

        const summary = {
            wallet: walletLower,
            week_id,
            backupRunCount: backupRuns.length,
            currentRunCount: currentRuns.length,
            missingCount: missing.length,
            currentTopScore: currentRuns[0]?.score || 0,
            backupTopScore: backupRuns.sort((a, b) => (b.score || 0) - (a.score || 0))[0]?.score || 0,
            missing: missing.map(r => ({
                id: r.id,
                score: r.score,
                kills: r.kills,
                level: r.level,
                time_survived: r.time_survived,
                arena_id: r.arena_id,
                character_id: r.character_id,
                created_date: r.created_date,
            })),
        };

        if (mode === 'diff') {
            return Response.json(summary);
        }

        if (mode === 'restore') {
            const restored = [];
            const failed = [];
            for (const r of missing) {
                try {
                    // Recreate without the original id (DB will assign a new one).
                    // Strip metadata fields the entity doesn't accept on create.
                    const payload = {
                        user_id: r.user_id,
                        wallet_address: r.wallet_address,
                        player_name: r.player_name,
                        player_title: r.player_title || '',
                        pilot_icon: r.pilot_icon || '',
                        score: r.score,
                        time_survived: r.time_survived,
                        level: r.level,
                        kills: r.kills,
                        character_id: r.character_id,
                        arena_id: r.arena_id,
                        week_id: r.week_id,
                        season_id: r.season_id,
                    };
                    const created = await db.entities.RunScore.create(payload);
                    restored.push({ originalId: r.id, newId: created.id, score: r.score });
                    await new Promise(s => setTimeout(s, 200));
                } catch (e) {
                    failed.push({ originalId: r.id, score: r.score, error: e.message });
                }
            }
            return Response.json({
                ...summary,
                restored: restored.length,
                failed: failed.length,
                restoredRuns: restored,
                failures: failed,
            });
        }

        return Response.json({ error: 'Unknown mode' }, { status: 400 });
    } catch (error) {
        console.error('[restorePlayerRunsFromBackup]', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});