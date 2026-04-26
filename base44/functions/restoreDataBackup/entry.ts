import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { OmenXServerSDK } from 'npm:@omen.foundation/game-sdk@1.0.33';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const body = await req.json();
        const { adminKey, accessToken, backup_id, confirm_restore } = body;

        // Auth: OAuth + manage_backups permission, OR emergency admin key
        let callerWallet = 'EMERGENCY_KEY';
        if (!(adminKey && adminKey === Deno.env.get('AdminDash'))) {
            if (!accessToken) return Response.json({ error: 'accessToken required' }, { status: 401 });
            const sdk = new OmenXServerSDK({
                apiKey: Deno.env.get('OMENX_AUTH_API_KEY'),
                apiBaseUrl: Deno.env.get('DEVELOPER_API_BASE_URL') || 'https://api.omen.foundation',
            });
            const v = await sdk.verifyOAuthUser(accessToken);
            if (!v.success) return Response.json({ error: 'Invalid OAuth token' }, { status: 401 });
            callerWallet = v.user?.walletAddress;
            if (!callerWallet) return Response.json({ error: 'No wallet on token' }, { status: 401 });
            const records = await base44.asServiceRole.entities.AdminWallet.filter({ wallet_address: callerWallet });
            if (records.length === 0) return Response.json({ error: 'Forbidden — not an admin' }, { status: 403 });
            const perms = records[0].permissions || [];
            if (!perms.includes('manage_backups') && !perms.includes('owner')) {
                return Response.json({ error: "Forbidden — 'manage_backups' permission required" }, { status: 403 });
            }
        }

        try {
            await base44.asServiceRole.entities.AdminChangesLog.create({
                wallet_address: callerWallet,
                action_type: 'other',
                description: `Restored backup ${backup_id}`,
                details: { backup_id }
            });
        } catch {}

        if (!backup_id) {
            return Response.json({ error: 'backup_id required' }, { status: 400 });
        }

        if (!confirm_restore) {
            return Response.json({ error: 'Restore must be confirmed with confirm_restore: true' }, { status: 400 });
        }

        console.log('[restoreDataBackup] Fetching backup...');
        const backup = await base44.asServiceRole.entities.DataBackup.get(backup_id);
        if (!backup || !backup.restore_available) {
            return Response.json({ error: 'Backup not available' }, { status: 404 });
        }

        const { snapshot_data } = backup;

        console.log('[restoreDataBackup] Clearing existing data and restoring...');

        // Delete all existing records from critical entities
        const [existingPlayerSaves, existingRunScores, existingSquads, existingSquadMembers, existingTokenPools, existingPayoutLogs, existingGlobalBosses] = await Promise.all([
            base44.asServiceRole.entities.PlayerSave.list('', 10000),
            base44.asServiceRole.entities.RunScore.list('', 10000),
            base44.asServiceRole.entities.Squad.list('', 10000),
            base44.asServiceRole.entities.SquadMember.list('', 10000),
            base44.asServiceRole.entities.TokenPool.list('', 10000),
            base44.asServiceRole.entities.PayoutLog.list('', 10000),
            base44.asServiceRole.entities.GlobalBoss.list('', 10000),
        ]);

        // Delete in parallel
        await Promise.all([
            ...existingPlayerSaves.map(e => base44.asServiceRole.entities.PlayerSave.delete(e.id)),
            ...existingRunScores.map(e => base44.asServiceRole.entities.RunScore.delete(e.id)),
            ...existingSquads.map(e => base44.asServiceRole.entities.Squad.delete(e.id)),
            ...existingSquadMembers.map(e => base44.asServiceRole.entities.SquadMember.delete(e.id)),
            ...existingTokenPools.map(e => base44.asServiceRole.entities.TokenPool.delete(e.id)),
            ...existingPayoutLogs.map(e => base44.asServiceRole.entities.PayoutLog.delete(e.id)),
            ...existingGlobalBosses.map(e => base44.asServiceRole.entities.GlobalBoss.delete(e.id)),
        ]);

        console.log('[restoreDataBackup] Restoring from snapshot...');

        // Restore in parallel (strip out DB-managed fields)
        const restoreTasks = [];

        if (snapshot_data.playerSaves?.length > 0) {
            restoreTasks.push(...snapshot_data.playerSaves.map(e => {
                const { id, created_date, updated_date, created_by, ...data } = e;
                return base44.asServiceRole.entities.PlayerSave.create(data);
            }));
        }

        if (snapshot_data.runScores?.length > 0) {
            restoreTasks.push(...snapshot_data.runScores.map(e => {
                const { id, created_date, updated_date, created_by, ...data } = e;
                return base44.asServiceRole.entities.RunScore.create(data);
            }));
        }

        if (snapshot_data.squads?.length > 0) {
            restoreTasks.push(...snapshot_data.squads.map(e => {
                const { id, created_date, updated_date, created_by, ...data } = e;
                return base44.asServiceRole.entities.Squad.create(data);
            }));
        }

        if (snapshot_data.squadMembers?.length > 0) {
            restoreTasks.push(...snapshot_data.squadMembers.map(e => {
                const { id, created_date, updated_date, created_by, ...data } = e;
                return base44.asServiceRole.entities.SquadMember.create(data);
            }));
        }

        if (snapshot_data.tokenPools?.length > 0) {
            restoreTasks.push(...snapshot_data.tokenPools.map(e => {
                const { id, created_date, updated_date, created_by, ...data } = e;
                return base44.asServiceRole.entities.TokenPool.create(data);
            }));
        }

        if (snapshot_data.payoutLogs?.length > 0) {
            restoreTasks.push(...snapshot_data.payoutLogs.map(e => {
                const { id, created_date, updated_date, created_by, ...data } = e;
                return base44.asServiceRole.entities.PayoutLog.create(data);
            }));
        }

        if (snapshot_data.globalBosses?.length > 0) {
            restoreTasks.push(...snapshot_data.globalBosses.map(e => {
                const { id, created_date, updated_date, created_by, ...data } = e;
                return base44.asServiceRole.entities.GlobalBoss.create(data);
            }));
        }

        await Promise.all(restoreTasks);

        console.log(`[restoreDataBackup] Restore complete: ${restoreTasks.length} records restored`);

        return Response.json({
            success: true,
            backup_name: backup.backup_name,
            records_restored: restoreTasks.length,
        });
    } catch (error) {
        console.error('[restoreDataBackup] Error:', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});