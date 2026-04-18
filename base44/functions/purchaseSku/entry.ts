import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { OmenXServerSDK } from 'npm:@omen.foundation/game-sdk@1.0.33';

Deno.serve(async (req) => {
    try {
        const { skuId, quantity = 1, walletAddress, week_id, season_id, userId, playerName: playerNameParam } = await req.json();

        if (!skuId) return Response.json({ error: 'Missing skuId' }, { status: 400 });
        if (!walletAddress) return Response.json({ error: 'Missing walletAddress' }, { status: 400 });
        if (!week_id || !season_id) return Response.json({ error: 'Missing week_id or season_id' }, { status: 400 });

        const apiKey = Deno.env.get('OMENX_API_KEY');
        const apiBaseUrl = Deno.env.get('DEVELOPER_API_BASE_URL') || 'https://api.omen.foundation';
        if (!apiKey) return Response.json({ error: 'API key not configured' }, { status: 500 });

        const sdk = new OmenXServerSDK({ apiKey, apiBaseUrl });

        // Look up the canonical OMENX price from the OmenX product catalog (server-side, tamper-proof)
        const productsRes = await sdk.getProducts();
        const products = productsRes?.products || productsRes || [];
        const product = products.find(p => p.sku === skuId);
        if (!product) return Response.json({ error: `SKU not found: ${skuId}` }, { status: 400 });

        const amount = product.pricesInCurrency?.OMENX;
        if (typeof amount !== 'number' || amount <= 0) {
            return Response.json({ error: `No OMENX price for SKU: ${skuId}` }, { status: 400 });
        }

        const base44 = createClientFromRequest(req);
        const db = base44.asServiceRole;

        const idempotencyKey = `${walletAddress}-${skuId}-${Date.now()}`;

        console.log(`[purchaseSku] Purchasing SKU: ${skuId} x${quantity} amount: ${amount} OMENX wallet: ${walletAddress}`);

        // Charge the player via OmenX SDK — paymentCurrency + paymentAmount triggers on-chain deduction
        const purchaseData = await sdk.createPurchase({
            playerWallet: walletAddress,
            skuId,
            quantity,
            idempotencyKey,
            paymentCurrency: 'OMENX',
            paymentAmount: amount * quantity,
        });

        const totalAmount = amount * quantity;
        console.log(`[purchaseSku] OmenX charge confirmed, txHash: ${purchaseData.transactionId || purchaseData.paymentTxHash}, amount: ${totalAmount}`);

        // Log the spend and update pools
        const playerName = playerNameParam || walletAddress;

        await db.entities.TokenSpendLog.create({
            user_id: userId || walletAddress,
            player_name: playerName,
            wallet_address: walletAddress,
            amount: totalAmount,
            week_id,
            season_id,
        });

        // Update weekly pool
        const weeklyPools = await db.entities.TokenPool.filter({ period_id: week_id, period_type: 'weekly' });
        if (weeklyPools.length > 0) {
            const fresh = await db.entities.TokenPool.get(weeklyPools[0].id);
            await db.entities.TokenPool.update(fresh.id, { total_spent: fresh.total_spent + totalAmount });
        } else {
            await db.entities.TokenPool.create({ period_id: week_id, period_type: 'weekly', total_spent: totalAmount, distributed: false });
        }

        // Update seasonal pool
        const seasonalPools = await db.entities.TokenPool.filter({ period_id: season_id, period_type: 'seasonal' });
        if (seasonalPools.length > 0) {
            const fresh = await db.entities.TokenPool.get(seasonalPools[0].id);
            await db.entities.TokenPool.update(fresh.id, { total_spent: fresh.total_spent + totalAmount });
        } else {
            await db.entities.TokenPool.create({ period_id: season_id, period_type: 'seasonal', total_spent: totalAmount, distributed: false });
        }

        console.log(`[purchaseSku] Pool updated: +${totalAmount} to week=${week_id} season=${season_id}`);

        return Response.json({ success: true, purchase: purchaseData, amount: totalAmount });
    } catch (error) {
        console.error('[purchaseSku] Error:', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});