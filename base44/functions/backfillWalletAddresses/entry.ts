import { createClient } from 'npm:@base44/sdk@0.8.25';

const db = createClient({ serviceRole: true, appId: Deno.env.get('BASE44_APP_ID') });

Deno.serve(async (req) => {
    try {
        const { adminKey, userIdToWalletMap } = await req.json();
        const expectedKey = Deno.env.get('AdminDash');
        if (!adminKey || adminKey !== expectedKey) return Response.json({ error: 'Forbidden' }, { status: 403 });

        if (!userIdToWalletMap || typeof userIdToWalletMap !== 'object') {
            return Response.json({ error: 'userIdToWalletMap required (object mapping user_id -> walletAddress)' }, { status: 400 });
        }

        const oldScores = await db.entities.RunScore.filter({}, undefined, 1000);
        const scoresToUpdate = oldScores.filter(s => !s.wallet_address);

        console.log(`[backfillWalletAddresses] Found ${scoresToUpdate.length} scores without wallet_address`);

        let updated = 0;
        let skipped = 0;
        const results = [];

        for (const score of scoresToUpdate) {
            const wallet = userIdToWalletMap[score.user_id];
            if (wallet) {
                await db.entities.RunScore.update(score.id, { wallet_address: wallet });
                updated++;
                results.push({ id: score.id, user_id: score.user_id, status: 'updated', wallet_address: wallet });
            } else {
                skipped++;
                results.push({ id: score.id, user_id: score.user_id, status: 'skipped', reason: 'no wallet mapping' });
            }
        }

        return Response.json({ success: true, updated, skipped, results });
    } catch (error) {
        console.error('[backfillWalletAddresses]', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});