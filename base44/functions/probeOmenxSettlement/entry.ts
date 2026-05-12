import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { OmenXServerSDK } from 'npm:@omen.foundation/game-sdk@1.0.34';

// Admin-only one-shot probe of OmenX's /v1/purchases endpoint, bypassing our
// internal kill-switch and circuit breaker. Uses an obviously-invalid SKU so
// no charge can succeed — we just want to read what kind of error OmenX
// returns. 502/503/504 → still down. 400/404/422 → up (rejecting our fake SKU
// is the expected healthy response).

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (user?.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        let apiBaseUrl = Deno.env.get('DEVELOPER_API_BASE_URL') || 'https://api.omen.foundation';
        if (!apiBaseUrl.startsWith('http')) apiBaseUrl = `https://${apiBaseUrl}`;

        const apiKey = Deno.env.get('OMENX_PAYMENT_API_KEY');
        if (!apiKey) return Response.json({ error: 'No payment key configured' }, { status: 500 });

        const sdk = new OmenXServerSDK({ apiKey, apiBaseUrl });
        const wallet = user.wallet_address || '0x0000000000000000000000000000000000000000';
        const idempotencyKey = `probe-${Date.now()}-${Math.random().toString(36).slice(2)}`;

        const start = Date.now();
        try {
            const res = await sdk.createPurchase({
                playerWallet: wallet,
                skuId: '__health_probe_invalid_sku__',
                quantity: 1,
                idempotencyKey,
                paymentCurrency: 'OMENX',
                paymentAmount: 1,
            });
            return Response.json({ healthy: true, durationMs: Date.now() - start, res });
        } catch (err) {
            const msg = err?.message || String(err);
            const is5xx = /\b50[02-4]\b/.test(msg) || /bad gateway|gateway timeout|service unavailable/i.test(msg);
            return Response.json({
                healthy: !is5xx,
                settlementDown: is5xx,
                durationMs: Date.now() - start,
                error: msg.slice(0, 500),
                verdict: is5xx
                    ? '🔴 Settlement still DOWN (5xx from OmenX)'
                    : '🟢 Settlement is UP — OmenX rejected our fake SKU as expected',
            });
        }
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});