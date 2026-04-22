import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { OmenXServerSDK } from 'npm:@omen.foundation/game-sdk@1.0.33';

function getCurrentPeriodIds() {
    const now = new Date();
    const year = now.getUTCFullYear();
    const startOfYear = new Date(Date.UTC(year, 0, 1));
    const startOfWeek = new Date(startOfYear);
    startOfWeek.setUTCDate(startOfYear.getUTCDate() - startOfYear.getUTCDay() + 1);
    const isoWeek = Math.ceil(((now - startOfWeek) / 86400000 + 1) / 7);
    const week_id = `${year}-W${String(isoWeek).padStart(2, '0')}`;
    const seasonNum = Math.floor((isoWeek - 1) / 4) + 1;
    const season_id = `${year}-S${seasonNum}`;
    return { week_id, season_id };
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { skuId, quantity = 1, walletAddress: clientWallet, userId, playerName: playerNameParam, accessToken } = await req.json();

        if (!skuId) return Response.json({ error: 'Missing skuId' }, { status: 400 });
        if (!clientWallet) return Response.json({ error: 'Missing walletAddress' }, { status: 400 });

        const { week_id, season_id } = getCurrentPeriodIds();

        const apiKey = Deno.env.get('OMENX_PAYMENT_API_KEY');
        const apiBaseUrl = Deno.env.get('DEVELOPER_API_BASE_URL') || 'https://api.omen.foundation';
        if (!apiKey) return Response.json({ error: 'API key not configured' }, { status: 500 });

        const sdk = new OmenXServerSDK({ apiKey, apiBaseUrl });

        if (!accessToken) {
            return Response.json({ error: 'accessToken required for verification' }, { status: 401 });
        }
        
        const result = await sdk.verifyOAuthUser(accessToken);
        if (!result.success) {
            return Response.json({ error: 'Invalid OAuth token' }, { status: 401 });
        }
        
        const walletAddress = result.user.walletAddress;

        const productsRes = await sdk.getProducts();
        const products = productsRes?.products || productsRes || [];
        const product = products.find(p => p.sku === skuId);
        if (!product) return Response.json({ error: `SKU not found: ${skuId}` }, { status: 400 });

        const amount = product.pricesInCurrency?.OMENX;
        if (typeof amount !== 'number' || amount <= 0) {
            return Response.json({ error: `No OMENX price for SKU: ${skuId}` }, { status: 400 });
        }

        const idempotencyKey = `${walletAddress}-${skuId}-${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36)}`;

        console.log(`[purchaseSku] Purchasing SKU: ${skuId} x${quantity} amount: ${amount} OMENX wallet: ${walletAddress}`);

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

        try {
            const existing = await base44.asServiceRole.entities.PlayerSave.filter({ wallet_address: walletAddress });
            if (existing.length === 0) {
                console.log(`[purchaseSku] PlayerSave missing for ${walletAddress}, creating default...`);
                await base44.asServiceRole.entities.PlayerSave.create({
                    wallet_address: walletAddress,
                    save_data: {
                        unlockedCharacters: ['neobyte'],
                        unlockedArenasByCharacter: { neobyte: ['station'] },
                        unlockedCosmetics: ['default'],
                        gold: 0,
                        relicFragments: 0
                    },
                    updated_at: Date.now()
                });
            }
        } catch (e) {
            console.error(`[purchaseSku] Failed to ensure PlayerSave exists:`, e);
        }

        const playerName = playerNameParam || walletAddress;
        const validUserId = userId || walletAddress;
        if (!validUserId) {
            return Response.json({ error: 'Invalid user identification' }, { status: 400 });
        }

        console.log(`[purchaseSku] Creating TokenSpendLog: week=${week_id}, season=${season_id}, amount=${totalAmount}`);
        
        await base44.asServiceRole.entities.TokenSpendLog.create({
            user_id: validUserId,
            player_name: playerName,
            wallet_address: walletAddress,
            amount: totalAmount,
            week_id,
            season_id,
        });

        const [weeklyPools, seasonalPools] = await Promise.all([
            base44.asServiceRole.entities.TokenPool.filter({ period_id: week_id, period_type: 'weekly' }),
            base44.asServiceRole.entities.TokenPool.filter({ period_id: season_id, period_type: 'seasonal' }),
        ]);

        await Promise.all([
            weeklyPools.length > 0
                ? base44.asServiceRole.entities.TokenPool.update(weeklyPools[0].id, { total_spent: weeklyPools[0].total_spent + totalAmount })
                : base44.asServiceRole.entities.TokenPool.create({ period_id: week_id, period_type: 'weekly', total_spent: totalAmount, distributed: false }),
            seasonalPools.length > 0
                ? base44.asServiceRole.entities.TokenPool.update(seasonalPools[0].id, { total_spent: seasonalPools[0].total_spent + totalAmount })
                : base44.asServiceRole.entities.TokenPool.create({ period_id: season_id, period_type: 'seasonal', total_spent: totalAmount, distributed: false }),
        ]);

        console.log(`[purchaseSku] Pool sync complete: week=${week_id} season=${season_id} amount=${totalAmount}`);

        return Response.json({ success: true, purchase: purchaseData, amount: totalAmount });
    } catch (error) {
        console.error('[purchaseSku] Error:', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});