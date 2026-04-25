import { OmenXServerSDK } from 'npm:@omen.foundation/game-sdk@1.0.33';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const verifyCache = new Map();
const VERIFY_CACHE_TTL = 60 * 60 * 1000;

async function verifyToken(sdk, accessToken) {
    const now = Date.now();
    const cached = verifyCache.get(accessToken);
    if (cached && cached.expiresAt > now) return { success: true, walletAddress: cached.walletAddress };
    const result = await sdk.verifyOAuthUser(accessToken);
    if (result.success) {
        verifyCache.set(accessToken, { walletAddress: result.user.walletAddress, expiresAt: now + VERIFY_CACHE_TTL });
        if (verifyCache.size > 500) {
            for (const [k, v] of verifyCache) { if (v.expiresAt <= now) verifyCache.delete(k); }
        }
    }
    return result.success ? { success: true, walletAddress: result.user.walletAddress } : { success: false };
}

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
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Authentication required' }, { status: 401 });
        }

        const wallet = user.data?.omenx_wallet;
        if (!wallet) {
            return Response.json({ error: 'OmenX wallet required. Please link your wallet.' }, { status: 400 });
        }

        const { skuId, quantity = 1, playerName: playerNameParam } = await req.json();
        if (!skuId) {
            return Response.json({ error: 'skuId required' }, { status: 400 });
        }

        const { week_id, season_id } = getCurrentPeriodIds();

        const sdk = new OmenXServerSDK({
            apiKey: Deno.env.get('OMENX_PAYMENT_API_KEY'),
            apiBaseUrl: Deno.env.get('DEVELOPER_API_BASE_URL') || 'https://api.omen.foundation'
        });

        const productsRes = await sdk.getProducts();
        const products = productsRes?.products || productsRes || [];
        const product = products.find(p => p.sku === skuId);
        if (!product) return Response.json({ error: `SKU not found: ${skuId}` }, { status: 400 });

        const amount = product.pricesInCurrency?.OMENX;
        if (typeof amount !== 'number' || amount <= 0) {
            return Response.json({ error: `No OMENX price for SKU: ${skuId}` }, { status: 400 });
        }

        const idempotencyKey = `${wallet}-${skuId}-${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36)}`;

        console.log(`[purchaseSku] Purchasing SKU: ${skuId} x${quantity} amount: ${amount} OMENX wallet: ${wallet}`);

        let purchaseData;
        try {
            purchaseData = await sdk.createPurchase({
                playerWallet: wallet,
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
                user_id: wallet,
                player_name: playerNameParam || wallet,
                wallet_address: wallet,
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
            // Fetch all pools once
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
            // Don't throw—pools are optional logging
        }

        console.log('[purchaseSku] Purchase logged for wallet:', wallet);
        return Response.json({ success: true, amount: totalAmount });
    } catch (error) {
        console.error('[purchaseSku] Error:', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});