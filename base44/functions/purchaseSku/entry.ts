import { OmenXServerSDK } from 'npm:@omen.foundation/game-sdk@1.0.33';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Auth: Base44 session. Wallet: from linked User.wallet_address.
// No OmenX accessToken required — Base44 session is the proof of identity,
// and the wallet was verified at link-time via linkWalletToUser.

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
        const me = await base44.auth.me();
        if (!me) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const walletAddress = me.wallet_address;
        if (!walletAddress) return Response.json({ error: 'No wallet linked to user' }, { status: 400 });

        const { skuId, quantity = 1, playerName: playerNameParam } = await req.json();
        if (!skuId) return Response.json({ error: 'skuId required' }, { status: 400 });

        let apiBaseUrl = Deno.env.get('DEVELOPER_API_BASE_URL') || 'https://api.omen.foundation';
        if (!apiBaseUrl.startsWith('http')) apiBaseUrl = `https://${apiBaseUrl}`;

        const sdk = new OmenXServerSDK({
            apiKey: Deno.env.get('OMENX_PAYMENT_API_KEY'),
            apiBaseUrl,
        });

        const { week_id, season_id } = getCurrentPeriodIds();

        const productsRes = await sdk.getProducts();
        const products = productsRes?.products || productsRes || [];
        const product = products.find(p => p.sku === skuId);
        if (!product) return Response.json({ error: `SKU not found: ${skuId}` }, { status: 400 });

        const amount = product.pricesInCurrency?.OMENX;
        if (typeof amount !== 'number' || amount <= 0) {
            return Response.json({ error: `No OMENX price for SKU: ${skuId}` }, { status: 400 });
        }

        const idempotencyKey = `${walletAddress}-${skuId}-${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36)}`;

        console.log(`[purchaseSku] SKU: ${skuId} x${quantity} amount: ${amount} OMENX wallet: ${walletAddress}`);

        let purchaseData;
        try {
            purchaseData = await sdk.createPurchase({
                playerWallet: walletAddress,
                skuId,
                quantity,
                idempotencyKey,
                paymentCurrency: 'OMENX',
                paymentAmount: amount * quantity,
            });
        } catch (err) {
            if (err.status === 429 || err.message?.includes('rate limit') || err.message?.includes('throttle')) {
                return Response.json({ error: 'Rate limited by payment processor' }, { status: 429 });
            }
            throw err;
        }

        const totalAmount = amount * quantity;

        // Log token spend
        try {
            await base44.asServiceRole.entities.TokenSpendLog.create({
                user_id: me.id,
                player_name: playerNameParam || me.full_name || walletAddress,
                wallet_address: walletAddress,
                amount: totalAmount,
                week_id,
                season_id
            });
        } catch (err) {
            console.error('[purchaseSku] TokenSpendLog create failed:', err.message);
            throw err;
        }

        // Update or create TokenPool entries (single efficient fetch)
        try {
            const allPools = await base44.asServiceRole.entities.TokenPool.filter({});
            const weeklyPool = allPools.find(p => p.period_id === week_id && p.period_type === 'weekly');
            const seasonalPool = allPools.find(p => p.period_id === season_id && p.period_type === 'seasonal');

            if (weeklyPool) {
                await base44.asServiceRole.entities.TokenPool.update(weeklyPool.id, {
                    total_spent: (weeklyPool.total_spent || 0) + totalAmount
                });
            } else {
                await base44.asServiceRole.entities.TokenPool.create({
                    period_id: week_id,
                    period_type: 'weekly',
                    total_spent: totalAmount,
                    distributed: false
                });
            }

            if (seasonalPool) {
                await base44.asServiceRole.entities.TokenPool.update(seasonalPool.id, {
                    total_spent: (seasonalPool.total_spent || 0) + totalAmount
                });
            } else {
                await base44.asServiceRole.entities.TokenPool.create({
                    period_id: season_id,
                    period_type: 'seasonal',
                    total_spent: totalAmount,
                    distributed: false
                });
            }
        } catch (err) {
            console.error('[purchaseSku] TokenPool upsert failed:', err.message);
            // Non-fatal — pools are reporting only
        }

        console.log('[purchaseSku] Purchase logged for wallet:', walletAddress);
        return Response.json({ success: true, amount: totalAmount });
    } catch (error) {
        console.error('[purchaseSku] Error:', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});