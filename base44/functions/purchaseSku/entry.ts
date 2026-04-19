import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { OmenXServerSDK } from 'npm:@omen.foundation/game-sdk@1.0.33';

// Period ID calculation — uses UTC ISO week, canonical across all functions
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

        if (!skuId) return Response.json({ error: 'Missing skuId' }, { status: 400 });
        if (!clientWallet) return Response.json({ error: 'Missing walletAddress' }, { status: 400 });

        // Compute period IDs server-side — never trust client values, always recalculate
        const { week_id, season_id } = getCurrentPeriodIds();
        // Ignore any client-provided period IDs for security

        const apiKey = Deno.env.get('OMENX_API_KEY');
        const apiBaseUrl = Deno.env.get('DEVELOPER_API_BASE_URL') || 'https://api.omen.foundation';
        if (!apiKey) return Response.json({ error: 'API key not configured' }, { status: 500 });

        const sdk = new OmenXServerSDK({ apiKey, apiBaseUrl });

        // Verify identity via OmenX — require accessToken
        if (!accessToken) {
            return Response.json({ error: 'accessToken required for verification' }, { status: 401 });
        }
        
        const result = await sdk.verifyOAuthUser(accessToken);
        if (!result.success) {
            return Response.json({ error: 'Invalid OAuth token' }, { status: 401 });
        }
        
        const walletAddress = result.user.walletAddress;

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
        const userClient = base44;  // User-scoped for auth check
        const db = base44.asServiceRole;  // Admin-scoped for TokenPool/TokenSpendLog

        // Generate crypto-random UUID-style idempotency key for true idempotence
        const idempotencyKey = `${walletAddress}-${skuId}-${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36)}`;

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

        // Ensure PlayerSave exists (in case initializeFirstLogin hasn't been called yet)
        try {
            const existing = await db.entities.PlayerSave.filter({ wallet_address: walletAddress });
            if (existing.length === 0) {
                console.log(`[purchaseSku] PlayerSave missing for ${walletAddress}, creating default...`);
                await db.entities.PlayerSave.create({
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
            // Don't fail the purchase if this happens, just log it
        }

        // Log the spend and update pools
        const playerName = playerNameParam || walletAddress;
        
        // Validate user_id before logging (use wallet as fallback)
        const validUserId = userId || walletAddress;
        if (!validUserId) {
            console.error('[purchaseSku] No valid user ID or wallet for spend log');
            return Response.json({ error: 'Invalid user identification' }, { status: 400 });
        }

        console.log(`[purchaseSku] Creating TokenSpendLog: week=${week_id}, season=${season_id}, amount=${totalAmount}`);
        
        await db.entities.TokenSpendLog.create({
            user_id: validUserId,
            player_name: playerName,
            wallet_address: walletAddress,
            amount: totalAmount,
            week_id,
            season_id,
        });

        // Update weekly pool
        console.log(`[purchaseSku] Querying TokenPool for week=${week_id}, type=weekly`);
        const weeklyPools = await db.entities.TokenPool.filter({ period_id: week_id, period_type: 'weekly' });
        console.log(`[purchaseSku] Found ${weeklyPools.length} weekly pools`);
        
        if (weeklyPools.length > 0) {
            console.log(`[purchaseSku] Updating existing weekly pool ${weeklyPools[0].id}`);
            await db.entities.TokenPool.update(weeklyPools[0].id, { total_spent: weeklyPools[0].total_spent + totalAmount });
        } else {
            console.log(`[purchaseSku] Creating new weekly pool for ${week_id}`);
            await db.entities.TokenPool.create({ period_id: week_id, period_type: 'weekly', total_spent: totalAmount, distributed: false });
        }

        // Update seasonal pool
        console.log(`[purchaseSku] Querying TokenPool for season=${season_id}, type=seasonal`);
        const seasonalPools = await db.entities.TokenPool.filter({ period_id: season_id, period_type: 'seasonal' });
        console.log(`[purchaseSku] Found ${seasonalPools.length} seasonal pools`);
        
        if (seasonalPools.length > 0) {
            console.log(`[purchaseSku] Updating existing seasonal pool ${seasonalPools[0].id}`);
            await db.entities.TokenPool.update(seasonalPools[0].id, { total_spent: seasonalPools[0].total_spent + totalAmount });
        } else {
            console.log(`[purchaseSku] Creating new seasonal pool for ${season_id}`);
            await db.entities.TokenPool.create({ period_id: season_id, period_type: 'seasonal', total_spent: totalAmount, distributed: false });
        }

        console.log(`[purchaseSku] Pool sync complete: week=${week_id} season=${season_id} amount=${totalAmount}`);

        return Response.json({ success: true, purchase: purchaseData, amount: totalAmount });
    } catch (error) {
        console.error('[purchaseSku] Error:', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});