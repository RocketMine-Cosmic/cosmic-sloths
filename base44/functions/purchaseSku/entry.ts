import { OmenXServerSDK } from 'npm:@omen.foundation/game-sdk@1.0.33';

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
        const { skuId, quantity = 1, walletAddress: clientWallet, userId, playerName: playerNameParam, accessToken } = await req.json();

        if (!skuId || !clientWallet || !accessToken) {
            return Response.json({ error: 'skuId, walletAddress, and accessToken required' }, { status: 400 });
        }

        const sdk = new OmenXServerSDK({
            apiKey: Deno.env.get('OMENX_PAYMENT_API_KEY'),
            apiBaseUrl: Deno.env.get('DEVELOPER_API_BASE_URL') || 'https://api.omen.foundation'
        });

        const verifyResult = await verifyToken(sdk, accessToken);
        if (!verifyResult.success) return Response.json({ error: 'Invalid OAuth token' }, { status: 401 });

        const { week_id, season_id } = getCurrentPeriodIds();

        const productsRes = await sdk.getProducts();
        const products = productsRes?.products || productsRes || [];
        const product = products.find(p => p.sku === skuId);
        if (!product) return Response.json({ error: `SKU not found: ${skuId}` }, { status: 400 });

        const amount = product.pricesInCurrency?.OMENX;
        if (typeof amount !== 'number' || amount <= 0) {
            return Response.json({ error: `No OMENX price for SKU: ${skuId}` }, { status: 400 });
        }

        const idempotencyKey = `${verifyResult.walletAddress}-${skuId}-${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36)}`;

        console.log(`[purchaseSku] Purchasing SKU: ${skuId} x${quantity} amount: ${amount} OMENX wallet: ${verifyResult.walletAddress}`);

        const purchaseData = await sdk.createPurchase({
            playerWallet: verifyResult.walletAddress,
            skuId,
            quantity,
            idempotencyKey,
            paymentCurrency: 'OMENX',
            paymentAmount: amount * quantity,
        });

        const totalAmount = amount * quantity;
        const appId = Deno.env.get('BASE44_APP_ID');
        const syncSecret = Deno.env.get('SYNC_SAVE_SECRET');

        // Ensure PlayerSave exists
        const playerSaveUrl = `https://api.base44.com/apps/${appId}/entities/PlayerSave`;
        await fetch(playerSaveUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Sync-Secret': syncSecret
            },
            body: JSON.stringify({
                wallet_address: verifyResult.walletAddress,
                save_data: {
                    unlockedCharacters: ['neobyte'],
                    unlockedArenasByCharacter: { neobyte: ['station'] },
                    unlockedCosmetics: ['default'],
                    gold: 0,
                    relicFragments: 0
                },
                updated_at: Date.now()
            })
        }).catch(e => console.error('[purchaseSku] PlayerSave ensure failed:', e.message));

        // Log token spend
        const tokenSpendUrl = `https://api.base44.com/apps/${appId}/entities/TokenSpendLog`;
        await fetch(tokenSpendUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Sync-Secret': syncSecret
            },
            body: JSON.stringify({
                user_id: userId || verifyResult.walletAddress,
                player_name: playerNameParam || verifyResult.walletAddress,
                wallet_address: verifyResult.walletAddress,
                amount: totalAmount,
                week_id,
                season_id
            })
        }).catch(e => console.error('[purchaseSku] TokenSpendLog failed:', e.message));

        // Update or create TokenPool entries
        const tokenPoolUrl = `https://api.base44.com/apps/${appId}/entities/TokenPool`;
        await Promise.all([
            fetch(tokenPoolUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Sync-Secret': syncSecret
                },
                body: JSON.stringify({
                    period_id: week_id,
                    period_type: 'weekly',
                    total_spent: totalAmount,
                    distributed: false
                })
            }).catch(e => console.error('[purchaseSku] Weekly TokenPool failed:', e.message)),
            fetch(tokenPoolUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Sync-Secret': syncSecret
                },
                body: JSON.stringify({
                    period_id: season_id,
                    period_type: 'seasonal',
                    total_spent: totalAmount,
                    distributed: false
                })
            }).catch(e => console.error('[purchaseSku] Seasonal TokenPool failed:', e.message))
        ]);

        // Don't expose raw OmenX transaction data to client
        return Response.json({ success: true, amount: totalAmount });
    } catch (error) {
        console.error('[purchaseSku] Error:', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});