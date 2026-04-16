import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const BASE_URL = 'https://staging.api.omen.foundation/v1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const { skuId, quantity = 1, walletAddress, week_id, season_id } = await req.json();

        if (!skuId) return Response.json({ error: 'Missing skuId' }, { status: 400 });
        if (!walletAddress) return Response.json({ error: 'Missing walletAddress' }, { status: 400 });

        const apiKey = Deno.env.get('OMENX_API_KEY');
        if (!apiKey) return Response.json({ error: 'API key not configured' }, { status: 500 });

        console.log(`[purchaseSku] User ${user.email} purchasing SKU: ${skuId} x${quantity} wallet: ${walletAddress}`);

        // Call OmenX createPurchase endpoint
        const purchaseRes = await fetch(`${BASE_URL}/purchases`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'X-Game-Id': 'cosmic-sloths',
            },
            body: JSON.stringify({
                playerWallet: walletAddress,
                skuId: skuId,
                quantity: quantity,
            }),
        });

        const purchaseText = await purchaseRes.text();
        let purchaseData;
        try { purchaseData = JSON.parse(purchaseText); } catch { purchaseData = { error: purchaseText }; }

        if (!purchaseRes.ok) {
            console.error(`[purchaseSku] OmenX purchase failed: ${purchaseRes.status}`, purchaseData);
            return Response.json({ error: purchaseData.error || purchaseData.message || 'Purchase failed', details: purchaseData }, { status: purchaseRes.status });
        }

        console.log(`[purchaseSku] Purchase successful for ${user.email}, SKU: ${skuId}`);

        // Also record the token spend for leaderboard pools if amounts provided
        if (week_id && season_id && purchaseData.tokenCost) {
            const amount = purchaseData.tokenCost * quantity;
            await base44.asServiceRole.entities.TokenSpendLog.create({
                user_id: user.id,
                player_name: user.full_name || user.email || 'Unknown',
                amount,
                week_id,
                season_id,
            }).catch(err => console.warn('[purchaseSku] TokenSpendLog create failed:', err.message));
        }

        return Response.json({ success: true, purchase: purchaseData });
    } catch (error) {
        console.error('[purchaseSku] Error:', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});