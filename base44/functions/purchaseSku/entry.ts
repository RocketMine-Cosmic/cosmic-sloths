import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { OmenXServerSDK } from 'npm:@omen.foundation/game-sdk@1.0.33';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { skuId, quantity = 1, walletAddress, week_id, season_id, amount } = await req.json();

        if (!skuId) return Response.json({ error: 'Missing skuId' }, { status: 400 });
        if (!walletAddress) return Response.json({ error: 'Missing walletAddress' }, { status: 400 });
        if (!week_id || !season_id) return Response.json({ error: 'Missing week_id or season_id' }, { status: 400 });
        if (typeof amount !== 'number' || amount <= 0 || !Number.isInteger(amount) || amount > 100000) {
            return Response.json({ error: 'Invalid amount' }, { status: 400 });
        }

        const apiKey = Deno.env.get('OMENX_API_KEY');
        if (!apiKey) return Response.json({ error: 'API key not configured' }, { status: 500 });

        console.log(`[purchaseSku] User ${user.email} purchasing SKU: ${skuId} x${quantity} amount: ${amount} wallet: ${walletAddress}`);

        // 1. Charge the player via OmenX using the SDK
        const sdk = new OmenXServerSDK({
            apiKey,
            apiBaseUrl: 'https://api.omen.foundation',
        });

        const purchaseData = await sdk.purchaseSku({
            playerWallet: walletAddress,
            skuId: skuId,
            quantity: quantity,
        });

        console.log(`[purchaseSku] OmenX charge confirmed for ${user.email}, SKU: ${skuId}, amount: ${amount}`);

        // 2. Only after confirmed charge: log the spend and update pools
        const playerName = user.full_name || user.email || 'Unknown';

        await base44.asServiceRole.entities.TokenSpendLog.create({
            user_id: user.id,
            player_name: playerName,
            wallet_address: walletAddress,
            amount,
            week_id,
            season_id,
        });

        // Update weekly pool
        const weeklyPools = await base44.asServiceRole.entities.TokenPool.filter({ period_id: week_id, period_type: 'weekly' });
        if (weeklyPools.length > 0) {
            const fresh = await base44.asServiceRole.entities.TokenPool.get(weeklyPools[0].id);
            await base44.asServiceRole.entities.TokenPool.update(fresh.id, { total_spent: fresh.total_spent + amount });
        } else {
            await base44.asServiceRole.entities.TokenPool.create({ period_id: week_id, period_type: 'weekly', total_spent: amount, distributed: false });
        }

        // Update seasonal pool
        const seasonalPools = await base44.asServiceRole.entities.TokenPool.filter({ period_id: season_id, period_type: 'seasonal' });
        if (seasonalPools.length > 0) {
            const fresh = await base44.asServiceRole.entities.TokenPool.get(seasonalPools[0].id);
            await base44.asServiceRole.entities.TokenPool.update(fresh.id, { total_spent: fresh.total_spent + amount });
        } else {
            await base44.asServiceRole.entities.TokenPool.create({ period_id: season_id, period_type: 'seasonal', total_spent: amount, distributed: false });
        }

        console.log(`[purchaseSku] Pool updated: +${amount} to week=${week_id} season=${season_id}`);

        return Response.json({ success: true, purchase: purchaseData });
    } catch (error) {
        console.error('[purchaseSku] Error:', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});