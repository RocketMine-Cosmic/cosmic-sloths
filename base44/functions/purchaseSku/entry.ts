import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { OmenXServerSDK } from 'npm:@omen.foundation/game-sdk@1.0.33';

Deno.serve(async (req) => {
    try {
        const { skuId, quantity = 1, walletAddress, week_id, season_id, amount, userId, playerName: playerNameParam } = await req.json();

        if (!skuId) return Response.json({ error: 'Missing skuId' }, { status: 400 });
        if (!walletAddress) return Response.json({ error: 'Missing walletAddress' }, { status: 400 });
        if (!week_id || !season_id) return Response.json({ error: 'Missing week_id or season_id' }, { status: 400 });
        if (typeof amount !== 'number' || amount <= 0 || !Number.isInteger(amount) || amount > 100000) {
            return Response.json({ error: 'Invalid amount' }, { status: 400 });
        }

        const apiKey = Deno.env.get('OMENX_API_KEY');
        const apiBaseUrl = Deno.env.get('DEVELOPER_API_BASE_URL') || 'https://api.omen.foundation';
        if (!apiKey) return Response.json({ error: 'API key not configured' }, { status: 500 });

        // Use service-role client (no user auth needed — callers are OmenX-only users)
        const base44 = createClientFromRequest(req);
        const db = base44.asServiceRole;

        const sdk = new OmenXServerSDK({ apiKey, apiBaseUrl });

        const idempotencyKey = `${walletAddress}-${skuId}-${Date.now()}`;

        console.log(`[purchaseSku] Purchasing SKU: ${skuId} x${quantity} amount: ${amount} wallet: ${walletAddress}`);

        // 1. Charge the player via OmenX SDK — this is the source of truth
        const purchaseData = await sdk.createPurchase({
            playerWallet: walletAddress,
            skuId,
            quantity,
            idempotencyKey,
        });

        console.log(`[purchaseSku] OmenX charge confirmed, SKU: ${skuId}, amount: ${amount}`);

        // 2. Only after confirmed charge: log the spend and update pools
        const playerName = playerNameParam || walletAddress;

        await db.entities.TokenSpendLog.create({
            user_id: userId || walletAddress,
            player_name: playerName,
            wallet_address: walletAddress,
            amount,
            week_id,
            season_id,
        });

        // Update weekly pool
        const weeklyPools = await db.entities.TokenPool.filter({ period_id: week_id, period_type: 'weekly' });
        if (weeklyPools.length > 0) {
            const fresh = await db.entities.TokenPool.get(weeklyPools[0].id);
            await db.entities.TokenPool.update(fresh.id, { total_spent: fresh.total_spent + amount });
        } else {
            await db.entities.TokenPool.create({ period_id: week_id, period_type: 'weekly', total_spent: amount, distributed: false });
        }

        // Update seasonal pool
        const seasonalPools = await db.entities.TokenPool.filter({ period_id: season_id, period_type: 'seasonal' });
        if (seasonalPools.length > 0) {
            const fresh = await db.entities.TokenPool.get(seasonalPools[0].id);
            await db.entities.TokenPool.update(fresh.id, { total_spent: fresh.total_spent + amount });
        } else {
            await db.entities.TokenPool.create({ period_id: season_id, period_type: 'seasonal', total_spent: amount, distributed: false });
        }

        console.log(`[purchaseSku] Pool updated: +${amount} to week=${week_id} season=${season_id}`);

        return Response.json({ success: true, purchase: purchaseData });
    } catch (error) {
        console.error('[purchaseSku] Error:', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});