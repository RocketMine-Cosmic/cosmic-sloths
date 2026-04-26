import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { OmenXServerSDK } from 'npm:@omen.foundation/game-sdk@1.0.33';

// Auth: Base44 session. Wallet: from linked User.wallet_address.
// Pricing: server-side via OmenX dev portal. We cache the SKU→price map in memory
// across invocations so we only hit /v1/skus once per cold start.

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

// In-memory SKU price cache (refreshed every 10 minutes per worker)
let skuPriceCache = null;
let skuPriceCacheExpiresAt = 0;
const SKU_CACHE_TTL = 10 * 60 * 1000;

async function getSkuPrice(skuId, apiBaseUrl, apiKey) {
    const now = Date.now();
    if (!skuPriceCache || now >= skuPriceCacheExpiresAt) {
        const res = await fetch(`${apiBaseUrl}/v1/products`, {
            headers: { 'Authorization': `Bearer ${apiKey}` },
        });
        if (!res.ok) throw new Error(`Failed to fetch SKU catalog: HTTP ${res.status}`);
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data?.products || data?.skus || data?.items || []);
        skuPriceCache = {};
        for (const sku of list) {
            const id = sku.sku || sku.skuId || sku.id || sku.productId;
            const price = parseFloat(
                sku.pricesInCurrency?.OMENX ?? sku.priceInOmenx ?? sku.price ?? 0
            );
            if (id && price > 0) skuPriceCache[id] = price;
        }
        skuPriceCacheExpiresAt = now + SKU_CACHE_TTL;
        console.log(`[purchaseSku] SKU price cache refreshed (${Object.keys(skuPriceCache).length} entries)`);
    }
    return skuPriceCache[skuId] || 0;
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

        const apiKey = Deno.env.get('OMENX_PAYMENT_API_KEY');
        const idempotencyKey = `${walletAddress}-${skuId}-${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36)}`;

        console.log(`[purchaseSku] SKU: ${skuId} x${quantity} wallet: ${walletAddress}`);

        // Use the OmenX SDK to settle on-chain. The SDK handles signing & gas
        // through the developer's payment key and returns a real transaction hash.
        const sdk = new OmenXServerSDK({ apiKey, apiBaseUrl });

        let purchaseData;
        try {
            purchaseData = await sdk.createPurchase({
                playerWallet: walletAddress,
                skuId,
                quantity,
                idempotencyKey,
            });
        } catch (err) {
            const msg = err?.message || String(err);
            if (msg.includes('429')) return Response.json({ error: 'Rate limited by payment processor' }, { status: 429 });
            console.error('[purchaseSku] SDK purchase failed:', msg);
            return Response.json({ error: msg }, { status: 500 });
        }

        const txHash = purchaseData?.transactionHash || purchaseData?.txHash || purchaseData?.tx_id || null;
        const status = purchaseData?.status || 'unknown';
        console.log(`[purchaseSku] OmenX response status=${status} txHash=${txHash || 'NONE'}`);
        if (status !== 'confirmed') {
            console.error('[purchaseSku] Purchase not confirmed:', JSON.stringify(purchaseData).slice(0, 500));
            return Response.json({ error: 'Purchase not confirmed', detail: purchaseData }, { status: 500 });
        }
        if (!txHash) {
            console.warn('[purchaseSku] WARNING: Confirmed but no txHash — SKU may be off-chain. Full response:', JSON.stringify(purchaseData).slice(0, 500));
        }

        // Look up the price from cached SKU catalog (server-truth, set in dev portal)
        const unitPrice = await getSkuPrice(skuId, apiBaseUrl, apiKey);
        if (!unitPrice || unitPrice <= 0) {
            const sampleKeys = skuPriceCache ? Object.keys(skuPriceCache).slice(0, 5) : [];
            console.error('[purchaseSku] Unknown SKU price for:', skuId, 'cache size:', skuPriceCache ? Object.keys(skuPriceCache).length : 'null', 'sample keys:', sampleKeys);
            return Response.json({ error: 'SKU price not configured', skuId, cacheSize: skuPriceCache ? Object.keys(skuPriceCache).length : 0, sampleKeys }, { status: 500 });
        }
        const totalAmount = unitPrice * quantity;

        const { week_id, season_id } = getCurrentPeriodIds();

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

        // Update or create TokenPool entries (targeted queries — no full table scan)
        try {
            const [weeklyPools, seasonalPools] = await Promise.all([
                base44.asServiceRole.entities.TokenPool.filter({ period_id: week_id, period_type: 'weekly' }),
                base44.asServiceRole.entities.TokenPool.filter({ period_id: season_id, period_type: 'seasonal' }),
            ]);

            const weeklyPool = weeklyPools[0];
            const seasonalPool = seasonalPools[0];

            await Promise.all([
                weeklyPool
                    ? base44.asServiceRole.entities.TokenPool.update(weeklyPool.id, { total_spent: (weeklyPool.total_spent || 0) + totalAmount })
                    : base44.asServiceRole.entities.TokenPool.create({ period_id: week_id, period_type: 'weekly', total_spent: totalAmount, distributed: false }),
                seasonalPool
                    ? base44.asServiceRole.entities.TokenPool.update(seasonalPool.id, { total_spent: (seasonalPool.total_spent || 0) + totalAmount })
                    : base44.asServiceRole.entities.TokenPool.create({ period_id: season_id, period_type: 'seasonal', total_spent: totalAmount, distributed: false }),
            ]);
        } catch (err) {
            console.error('[purchaseSku] TokenPool upsert failed:', err.message);
            // Non-fatal — pools are reporting only
        }

        console.log('[purchaseSku] Purchase logged for wallet:', walletAddress, 'amount:', totalAmount);
        return Response.json({ success: true, amount: totalAmount });
    } catch (error) {
        console.error('[purchaseSku] Error:', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});