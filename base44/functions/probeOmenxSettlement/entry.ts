import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { OmenXServerSDK } from 'npm:@omen.foundation/game-sdk@1.0.34';

// Admin-only one-shot probe of OmenX's /v1/purchases endpoint, bypassing our
// internal kill-switch and circuit breaker.
//
// Status semantics (confirmed by live probe against dev portal 2026-05-15):
//   • 5xx (502/503/504) → settlement DOWN. Keep purchases disabled.
//   • 402 + code=INSUFFICIENT_FUNDS → HEALTHY. OmenX accepted the request,
//     looked up the wallet, and rejected it for empty balance (expected for
//     our dead-wallet probe). Service is fine.
//   • 402 + any other code (e.g. SETTLEMENT_UNAVAILABLE) → DOWN. Upstream
//     thirdweb / Cloudflare outage; OmenX is alive but can't settle.
//   • 422 PAYMENT_FAILED → HEALTHY (legacy code, same idea as 402 INSUFFICIENT_FUNDS).
//   • 400/404 → HEALTHY (request validation working).
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
            const is402 = /\b402\b/.test(msg);
            const is422 = /\b422\b/.test(msg);
            const is4xxOther = /\b40[01345-9]\b/.test(msg); // 400/401/403/404/405...409

            // Parse the OmenX error code from the body, e.g.
            //   "402 Payment Required - {"error":{"code":"INSUFFICIENT_FUNDS",...}}"
            const codeMatch = msg.match(/"code"\s*:\s*"([A-Z_]+)"/);
            const code = codeMatch ? codeMatch[1] : null;
            // INSUFFICIENT_FUNDS / PAYMENT_FAILED = expected healthy rejection of the dead-wallet probe.
            const isHealthyCode = code === 'INSUFFICIENT_FUNDS' || code === 'PAYMENT_FAILED';
            // Codes that explicitly signal a settlement outage upstream.
            const isDownCode = code === 'SETTLEMENT_UNAVAILABLE' || code === 'UPSTREAM_ERROR' || code === 'GATEWAY_ERROR';

            // 402 is ambiguous on its own — body code decides.
            // If we get 402/422 with a healthy code → UP.
            // If we get 5xx, OR 402 with a down code, OR 402 with no parseable code → DOWN.
            const settlementDown =
                is5xx
                || isDownCode
                || (is402 && !isHealthyCode);
            const healthy =
                !settlementDown
                && (isHealthyCode || is422 || is4xxOther);

            let verdict;
            if (is5xx) verdict = '🔴 Settlement DOWN (5xx from OmenX gateway)';
            else if (isDownCode) verdict = `🔴 Settlement DOWN (${code} — upstream outage)`;
            else if (is402 && isHealthyCode) verdict = `🟢 Settlement is UP — OmenX returned 402 ${code} for the dead wallet (expected)`;
            else if (is402) verdict = `🔴 Settlement DOWN (402 with code=${code || 'unknown'})`;
            else if (is422) verdict = '🟢 Settlement is UP — OmenX returned 422 PAYMENT_FAILED for the dead wallet (expected)';
            else if (healthy) verdict = '🟢 Settlement is UP — OmenX rejected our fake SKU as expected';
            else verdict = '🟡 Unexpected response — neither down-signal nor a clean 4xx';

            return Response.json({
                healthy,
                settlementDown,
                code,
                durationMs: Date.now() - start,
                error: msg.slice(0, 500),
                verdict,
            });
        }
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});