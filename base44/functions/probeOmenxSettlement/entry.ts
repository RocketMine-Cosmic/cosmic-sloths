import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { OmenXServerSDK } from 'npm:@omen.foundation/game-sdk@1.0.34';

// Admin-only one-shot probe of OmenX's /v1/purchases endpoint, bypassing our
// internal kill-switch and circuit breaker.
//
// Status semantics (post 2026-05-14 OmenX change — confirmed with Emilio):
//   • 5xx (502/503/504) → settlement is DOWN. Keep purchases disabled.
//   • 422 → PAYMENT_FAILED (was previously "still settling"). This is now a
//     HEALTHY signal — OmenX accepted the request, looked up the wallet, and
//     rejected it for insufficient funds. That proves the service is up.
//   • 400/404 → also HEALTHY (request validation working).
// We send paymentAmount=1 against the dead-wallet `0x...dEaD` so a real charge
// can never go through — we only care about which error class comes back.

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
        // Use a wallet that definitely has zero OMENX so the probe can't accidentally charge.
        // OmenX should reject with INSUFFICIENT_FUNDS (proving settlement is live) instead of
        // succeeding. Real player wallets are NOT used here.
        const wallet = '0x000000000000000000000000000000000000dEaD';
        const idempotencyKey = `probe-${Date.now()}-${Math.random().toString(36).slice(2)}`;

        const start = Date.now();
        try {
            const res = await sdk.createPurchase({
                playerWallet: wallet,
                skuId: 'ingame-xp-buff',
                quantity: 1,
                idempotencyKey,
                paymentCurrency: 'OMENX',
                paymentAmount: 1,
            });
            return Response.json({ healthy: true, durationMs: Date.now() - start, res });
        } catch (err) {
            const msg = err?.message || String(err);
            const is5xx = /\b50[02-4]\b/.test(msg) || /bad gateway|gateway timeout|service unavailable/i.test(msg);
            // 422 PAYMENT_FAILED is the new "expected healthy rejection" for our
            // dead-wallet probe (post 2026-05-14). 400/404 are also healthy.
            const is422 = /\b422\b/.test(msg) || /payment[_ ]?failed|insufficient/i.test(msg);
            const is4xx = /\b40[0-9]\b/.test(msg);
            const healthy = !is5xx && (is422 || is4xx);
            return Response.json({
                healthy,
                settlementDown: is5xx,
                durationMs: Date.now() - start,
                error: msg.slice(0, 500),
                verdict: is5xx
                    ? '🔴 Settlement still DOWN (5xx from OmenX)'
                    : is422
                        ? '🟢 Settlement is UP — OmenX returned 422 PAYMENT_FAILED for the dead wallet (expected)'
                        : healthy
                            ? '🟢 Settlement is UP — OmenX rejected our fake SKU as expected'
                            : '🟡 Unexpected response — neither 5xx nor a clean 4xx',
            });
        }
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});