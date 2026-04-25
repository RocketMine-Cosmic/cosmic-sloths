import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Auth: Base44 session. Wallet: from linked User.wallet_address.
// Pricing: server-side via OmenX dev portal SKU config — we don't send paymentAmount.

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

        const apiKey = Deno.env.get('OMENX_PAYMENT_API_KEY');
        const idempotencyKey = `${walletAddress}-${skuId}-${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36)}`;

        console.log(`[purchaseSku] SKU: ${skuId} x${quantity} wallet: ${walletAddress}`);

        // Single REST call — server resolves price from dev portal SKU config
        const purchaseRes = await fetch(`${apiBaseUrl}/v1/purchases`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'Idempotency-Key': idempotencyKey,
            },
            body: JSON.stringify({
                playerWallet: walletAddress,
                skuId,
                quantity,
                idempotencyKey,
                paymentMethod: 'onchain',
            }),
        });

        if (purchaseRes.status === 429) {
            return Response.json({ error: 'Rate limited by payment processor' }, { status: 429 });
        }

        const purchaseData = await purchaseRes.json().catch(() => ({}));
        if (!purchaseRes.ok) {
            const errMsg = purchaseData?.error || purchaseData?.message || `HTTP ${purchaseRes.status}`;
            console.error('[purchaseSku] Purchase failed:', errMsg);
            return Response.json({ error: errMsg }, { status: purchaseRes.status });
        }

        // Log full response shape so we know which field carries the amount
        console.log('[purchaseSku] OmenX response:', JSON.stringify(purchaseData));

        // Server returns the actual amount charged — try common field names
        const totalAmount = parseFloat(
            purchaseData?.paymentAmount ??
            purchaseData?.amount ??
            purchaseData?.totalAmount ??
            purchaseData?.priceInOmenx ??
            purchaseData?.price ??
            purchaseData?.purchase?.paymentAmount ??
            purchaseData?.purchase?.amount ??
            0
        );
        if (!totalAmount || totalAmount <= 0) {
            console.error('[purchaseSku] Could not find amount in response:', purchaseData);
            return Response.json({ error: 'Invalid amount returned from payment processor', debug: purchaseData }, { status: 500 });
        }

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