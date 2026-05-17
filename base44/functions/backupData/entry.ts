import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Auth: automated bypass, OR Base44 session + 'manage_backups' permission, OR emergency master key.

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const body = await req.json();
        const { adminKey, backup_notes, is_automated } = body;

        let callerWallet = is_automated ? 'AUTOMATION' : 'EMERGENCY_KEY';
        if (!is_automated && !(adminKey && adminKey === Deno.env.get('AdminDash'))) {
            const me = await base44.auth.me();
            if (!me) return Response.json({ error: 'Unauthorized' }, { status: 401 });
            callerWallet = me.wallet_address?.toLowerCase();
            if (!callerWallet) return Response.json({ error: 'No wallet linked' }, { status: 401 });
            const records = await base44.asServiceRole.entities.AdminWallet.filter({ wallet_address: callerWallet });
            if (records.length === 0) return Response.json({ error: 'Forbidden — not an admin' }, { status: 403 });
            const perms = records[0].permissions || [];
            if (!perms.includes('manage_backups') && !perms.includes('owner')) {
                return Response.json({ error: "Forbidden — 'manage_backups' permission required" }, { status: 403 });
            }
        }

        console.log('[backupData] Starting backup...');

        const [
            playerSaves, runScores, squads, squadMembers, squadMessages,
            tokenPools, tokenSpendLogs, payoutLogs,
            globalBosses, globalBossContributions, globalBossEvents,
            squadWars, squadChampionsPayoutLogs, squadSeasonRosters
        ] = await Promise.all([
            base44.asServiceRole.entities.PlayerSave.list('', 10000),
            base44.asServiceRole.entities.RunScore.list('', 10000),
            base44.asServiceRole.entities.Squad.list('', 10000),
            base44.asServiceRole.entities.SquadMember.list('', 10000),
            base44.asServiceRole.entities.SquadMessage.list('', 10000),
            base44.asServiceRole.entities.TokenPool.list('', 10000),
            base44.asServiceRole.entities.TokenSpendLog.list('', 10000),
            base44.asServiceRole.entities.PayoutLog.list('', 10000),
            base44.asServiceRole.entities.GlobalBoss.list('', 10000),
            base44.asServiceRole.entities.GlobalBossContribution.list('', 10000),
            base44.asServiceRole.entities.GlobalBossEvent.list('', 10000),
            base44.asServiceRole.entities.SquadWar.list('', 10000),
            base44.asServiceRole.entities.SquadChampionsPayoutLog.list('', 10000),
            base44.asServiceRole.entities.SquadSeasonRoster.list('', 10000),
        ]);

        const snapshot_data = {
            playerSaves,
            runScores,
            squads,
            squadMembers,
            squadMessages,
            tokenPools,
            tokenSpendLogs,
            payoutLogs,
            globalBosses,
            globalBossContributions,
            globalBossEvents,
            squadWars,
            squadChampionsPayoutLogs,
            squadSeasonRosters,
            backup_timestamp: new Date().toISOString(),
        };

        const entity_counts = {
            PlayerSave: playerSaves.length,
            RunScore: runScores.length,
            Squad: squads.length,
            SquadMember: squadMembers.length,
            SquadMessage: squadMessages.length,
            TokenPool: tokenPools.length,
            TokenSpendLog: tokenSpendLogs.length,
            PayoutLog: payoutLogs.length,
            GlobalBoss: globalBosses.length,
            GlobalBossContribution: globalBossContributions.length,
            GlobalBossEvent: globalBossEvents.length,
            SquadWar: squadWars.length,
            SquadChampionsPayoutLog: squadChampionsPayoutLogs.length,
            SquadSeasonRoster: squadSeasonRosters.length,
        };

        const backup_name = `backup-${new Date().toISOString().split('T')[0]}-${Math.random().toString(36).substring(7)}`;

        const backup = await base44.asServiceRole.entities.DataBackup.create({
            backup_name,
            backup_type: is_automated ? 'automated' : 'manual',
            snapshot_data,
            entity_counts,
            restore_available: true,
            notes: backup_notes || '',
        });

        console.log(`[backupData] Backup complete: ${backup_name} with ${Object.values(entity_counts).reduce((a, b) => a + b, 0)} total records`);

        // Free the big snapshot object before the retention prune so we have headroom.
        // Without this, the prune step OOMs because each old DataBackup row carries
        // a ~50-100MB snapshot_data blob and the isolate is still holding everything
        // from the fresh backup we just created.
        for (const k of Object.keys(snapshot_data)) delete snapshot_data[k];

        // Retention: prune AUTOMATED backups older than 14 days. Manual backups are kept indefinitely.
        // Paginate in small chunks (oldest-first) and stop as soon as we hit a row
        // newer than the cutoff — keeps memory tiny even with hundreds of backups.
        let pruned = 0;
        if (is_automated) {
            try {
                const cutoffMs = Date.now() - 14 * 24 * 60 * 60 * 1000;
                const PAGE = 20;
                let done = false;
                while (!done) {
                    const batch = await base44.asServiceRole.entities.DataBackup.filter(
                        { backup_type: 'automated' }, 'created_date', PAGE
                    );
                    if (!batch.length) break;
                    for (const old of batch) {
                        if (new Date(old.created_date).getTime() >= cutoffMs) { done = true; break; }
                        try { await base44.asServiceRole.entities.DataBackup.delete(old.id); pruned++; } catch {}
                    }
                    if (batch.length < PAGE) break;
                }
                if (pruned > 0) console.log(`[backupData] Pruned ${pruned} automated backup(s) older than 14 days`);
            } catch (e) {
                console.error('[backupData] Retention prune failed:', e.message);
            }
        }

        return Response.json({
            success: true,
            backup_id: backup.id,
            backup_name,
            entity_counts,
            pruned,
        });
    } catch (error) {
        console.error('[backupData] Error:', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});