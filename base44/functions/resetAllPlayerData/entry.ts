import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { OmenXServerSDK } from 'npm:@omen.foundation/game-sdk@1.0.33';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const body = await req.json();
        const { adminKey, accessToken, confirm } = body;

        // Auth: OAuth + wipe_data permission, OR emergency admin key
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
            if (!perms.includes('wipe_data') && !perms.includes('owner')) {
                return Response.json({ error: "Forbidden — 'wipe_data' permission required" }, { status: 403 });
            }
        }

        if (confirm !== 'RESET_ALL_PLAYER_DATA') {
            return Response.json({ error: 'Must pass confirm: "RESET_ALL_PLAYER_DATA"' }, { status: 400 });
        }

        try {
            await base44.asServiceRole.entities.AdminChangesLog.create({
                wallet_address: callerWallet,
                action_type: 'other',
                description: 'FULL DATA WIPE triggered',
                details: {}
            });
        } catch {}

        const results = {};

        const deleteAll = async (entityName, listFn) => {
            let deleted = 0;
            let batch;
            do {
                batch = await listFn();
                await Promise.all(batch.map(r => base44.asServiceRole.entities[entityName].delete(r.id)));
                deleted += batch.length;
            } while (batch.length > 0);
            return deleted;
        };

        results.RunScore       = await deleteAll('RunScore',       () => base44.asServiceRole.entities.RunScore.list(null, 50));
        results.PlayerSave     = await deleteAll('PlayerSave',     () => base44.asServiceRole.entities.PlayerSave.list(null, 50));
        results.TokenPool      = await deleteAll('TokenPool',      () => base44.asServiceRole.entities.TokenPool.list(null, 50));
        results.TokenSpendLog  = await deleteAll('TokenSpendLog',  () => base44.asServiceRole.entities.TokenSpendLog.list(null, 50));
        results.PayoutLog      = await deleteAll('PayoutLog',      () => base44.asServiceRole.entities.PayoutLog.list(null, 50));
        results.Squad          = await deleteAll('Squad',          () => base44.asServiceRole.entities.Squad.list(null, 50));
        results.SquadMember    = await deleteAll('SquadMember',    () => base44.asServiceRole.entities.SquadMember.list(null, 50));
        results.SquadMessage   = await deleteAll('SquadMessage',   () => base44.asServiceRole.entities.SquadMessage.list(null, 50));
        results.GlobalBoss               = await deleteAll('GlobalBoss',               () => base44.asServiceRole.entities.GlobalBoss.list(null, 50));
        results.GlobalBossContribution   = await deleteAll('GlobalBossContribution',   () => base44.asServiceRole.entities.GlobalBossContribution.list(null, 50));
        results.GlobalBossEvent          = await deleteAll('GlobalBossEvent',          () => base44.asServiceRole.entities.GlobalBossEvent.list(null, 50));

        console.log('[resetAllPlayerData] Complete:', JSON.stringify(results));
        return Response.json({ success: true, deleted: results });

    } catch (error) {
        console.error('[resetAllPlayerData]', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});