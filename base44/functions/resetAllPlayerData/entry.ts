import { createClient } from 'npm:@base44/sdk@0.8.25';

const db = createClient({ serviceRole: true, appId: Deno.env.get('BASE44_APP_ID') });

Deno.serve(async (req) => {
    try {
        const { adminKey, confirm } = await req.json();

        const expectedKey = Deno.env.get('AdminDash');
        if (!adminKey || adminKey !== expectedKey) {
            return Response.json({ error: 'Forbidden' }, { status: 403 });
        }

        if (confirm !== 'RESET_ALL_PLAYER_DATA') {
            return Response.json({ error: 'Must pass confirm: "RESET_ALL_PLAYER_DATA"' }, { status: 400 });
        }

        const results = {};

        const deleteAll = async (entityName, listFn) => {
            let deleted = 0;
            let batch;
            do {
                batch = await listFn();
                await Promise.all(batch.map(r => db.entities[entityName].delete(r.id)));
                deleted += batch.length;
            } while (batch.length > 0);
            return deleted;
        };

        results.RunScore       = await deleteAll('RunScore',       () => db.entities.RunScore.list(null, 50));
        results.PlayerSave     = await deleteAll('PlayerSave',     () => db.entities.PlayerSave.list(null, 50));
        results.TokenPool      = await deleteAll('TokenPool',      () => db.entities.TokenPool.list(null, 50));
        results.TokenSpendLog  = await deleteAll('TokenSpendLog',  () => db.entities.TokenSpendLog.list(null, 50));
        results.PayoutLog      = await deleteAll('PayoutLog',      () => db.entities.PayoutLog.list(null, 50));
        results.Squad          = await deleteAll('Squad',          () => db.entities.Squad.list(null, 50));
        results.SquadMember    = await deleteAll('SquadMember',    () => db.entities.SquadMember.list(null, 50));
        results.SquadMessage   = await deleteAll('SquadMessage',   () => db.entities.SquadMessage.list(null, 50));
        results.GlobalBoss               = await deleteAll('GlobalBoss',               () => db.entities.GlobalBoss.list(null, 50));
        results.GlobalBossContribution   = await deleteAll('GlobalBossContribution',   () => db.entities.GlobalBossContribution.list(null, 50));
        results.GlobalBossEvent          = await deleteAll('GlobalBossEvent',          () => db.entities.GlobalBossEvent.list(null, 50));

        console.log('[resetAllPlayerData] Complete:', JSON.stringify(results));
        return Response.json({ success: true, deleted: results });

    } catch (error) {
        console.error('[resetAllPlayerData]', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});