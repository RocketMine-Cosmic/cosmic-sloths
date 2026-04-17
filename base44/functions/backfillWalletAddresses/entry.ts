import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

        const { userIdToWalletMap } = await req.json();
        if (!userIdToWalletMap || typeof userIdToWalletMap !== 'object') {
            return Response.json({ error: 'userIdToWalletMap required (object mapping user_id -> walletAddress)' }, { status: 400 });
        }

        // Find all RunScores without wallet_address
        const oldScores = await base44.asServiceRole.entities.RunScore.filter({}, undefined, 1000);
        const scoresToUpdate = oldScores.filter(s => !s.wallet_address);

        console.log(`[backfillWalletAddresses] Found ${scoresToUpdate.length} scores without wallet_address`);

        let updated = 0;
        let skipped = 0;
        const results = [];

        for (const score of scoresToUpdate) {
            const wallet = userIdToWalletMap[score.user_id];
            if (wallet) {
                await base44.asServiceRole.entities.RunScore.update(score.id, { wallet_address: wallet });
                updated++;
                results.push({ id: score.id, user_id: score.user_id, status: 'updated', wallet_address: wallet });
            } else {
                skipped++;
                results.push({ id: score.id, user_id: score.user_id, status: 'skipped', reason: 'no wallet mapping' });
            }
        }

        console.log(`[backfillWalletAddresses] Updated: ${updated}, Skipped: ${skipped}`);

        return Response.json({ 
            success: true, 
            updated, 
            skipped,
            results
        });
    } catch (error) {
        console.error('[backfillWalletAddresses]', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});