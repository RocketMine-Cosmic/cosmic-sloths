import { createClient } from 'npm:@base44/sdk@0.8.25';

const db = createClient({ appId: Deno.env.get('BASE44_APP_ID') });

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

        const deleteAll = async (entityName) => {
            let deleted = 0;
            let batch;
            do {
                batch = await db.entities[entityName].list(null, 50);
                if (batch.length === 0) break;
                await Promise.all(batch.map(r => db.entities[entityName].delete(r.id)));
                deleted += batch.length;
            } while (batch.length > 0);
            return deleted;
        };

        results.RunScore                 = await deleteAll('RunScore');
        results.PlayerSave               = await deleteAll('PlayerSave');
        results.TokenPool                = await deleteAll('TokenPool');
        results.TokenSpendLog            = await deleteAll('TokenSpendLog');
        results.PayoutLog                = await deleteAll('PayoutLog');
        results.Squad                    = await deleteAll('Squad');
        results.SquadMember              = await deleteAll('SquadMember');
        results.SquadMessage             = await deleteAll('SquadMessage');
        results.GlobalBoss               = await deleteAll('GlobalBoss');
        results.GlobalBossContribution   = await deleteAll('GlobalBossContribution');
        results.GlobalBossEvent          = await deleteAll('GlobalBossEvent');

        console.log('[resetAllPlayerData] Complete:', JSON.stringify(results));
        return Response.json({ success: true, deleted: results });

    } catch (error) {
        console.error('[resetAllPlayerData]', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});