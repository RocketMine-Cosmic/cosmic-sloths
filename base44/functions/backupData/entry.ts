import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { OmenXServerSDK } from 'npm:@omen.foundation/game-sdk@1.0.33';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const body = await req.json();
        const { adminKey, accessToken, backup_notes, is_automated } = body;

        // Auth: automated/emergency-key bypass, OR OAuth + manage_backups permission
        let callerWallet = is_automated ? 'AUTOMATION' : 'EMERGENCY_KEY';
        if (!is_automated && !(adminKey && adminKey === Deno.env.get('AdminDash'))) {
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

        console.log('[backupData] Starting backup...');

        const [playerSaves, runScores, squads, squadMembers, tokenPools, payoutLogs, globalBosses] = await Promise.all([
            base44.asServiceRole.entities.PlayerSave.list('', 10000),
            base44.asServiceRole.entities.RunScore.list('', 10000),
            base44.asServiceRole.entities.Squad.list('', 10000),
            base44.asServiceRole.entities.SquadMember.list('', 10000),
            base44.asServiceRole.entities.TokenPool.list('', 10000),
            base44.asServiceRole.entities.PayoutLog.list('', 10000),
            base44.asServiceRole.entities.GlobalBoss.list('', 10000),
        ]);

        const snapshot_data = {
            playerSaves,
            runScores,
            squads,
            squadMembers,
            tokenPools,
            payoutLogs,
            globalBosses,
            backup_timestamp: new Date().toISOString(),
        };

        const entity_counts = {
            PlayerSave: playerSaves.length,
            RunScore: runScores.length,
            Squad: squads.length,
            SquadMember: squadMembers.length,
            TokenPool: tokenPools.length,
            PayoutLog: payoutLogs.length,
            GlobalBoss: globalBosses.length,
        };

        const backup_name = `backup-${new Date().toISOString().split('T')[0]}-${Math.random().toString(36).substring(7)}`;

        const backup = await base44.asServiceRole.entities.DataBackup.create({
            backup_name,
            backup_type: 'manual',
            snapshot_data,
            entity_counts,
            restore_available: true,
            notes: backup_notes || '',
        });

        console.log(`[backupData] Backup complete: ${backup_name} with ${Object.values(entity_counts).reduce((a, b) => a + b, 0)} total records`);

        return Response.json({
            success: true,
            backup_id: backup.id,
            backup_name,
            entity_counts,
        });
    } catch (error) {
        console.error('[backupData] Error:', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});