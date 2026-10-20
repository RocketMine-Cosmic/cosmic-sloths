// Live store prices for the game client, in OMCADE (the token formerly OMENX).
//
// WHY (2026-10-20): every price players saw was typed into the client by hand,
// while purchaseSku charges whatever the Omen portal says. Portal prices are set
// in USD and Omen converts them to tokens at the token's USD price — a fixed
// $0.10 peg until the OMCADE liquidity pool opens (21–22 Oct 2026), then a
// market price. From then on the token amount per item moves, so screens must
// show the portal's number, not a typed one.
//
// Returns { prices: { [skuId]: tokenAmount }, fetchedAt } for every active
// fixed-price product. Mirrors purchaseSku's own read of the catalogue
// (pricesInCurrency.OMENX — Omen's API still names the currency OMENX) so the
// screen and the charge come from the same field. No auth: prices aren't secret,
// and the cache means Omen is called at most once per TTL per instance.

const CACHE_TTL_MS = 5 * 60 * 1000;
let _cache = null;
let _expiresAt = 0;

function getPaymentKeys() {
    const keys = [];
    const first = Deno.env.get('OMENX_PAYMENT_API_KEY');
    if (first) keys.push(first);
    for (let i = 2; i <= 8; i++) {
        const k = Deno.env.get(`OMENX_PAYMENT_API_KEY_${i}`);
        if (k) keys.push(k);
    }
    return keys;
}

Deno.serve(async (_req) => {
    try {
        const now = Date.now();
        if (_cache && now < _expiresAt) return Response.json({ ..._cache, cached: true });

        let base = Deno.env.get('DEVELOPER_API_BASE_URL') || 'https://api.omen.foundation';
        if (!base.startsWith('http')) base = `https://${base}`;

        let res = null;
        for (const key of getPaymentKeys()) {
            res = await fetch(`${base}/v1/products`, { headers: { Authorization: `Bearer ${key}` } });
            if (res.ok) break;
            if (res.status !== 429 && res.status < 500) break;
        }
        if (!res || !res.ok) {
            console.error('[getSkuPrices] catalogue HTTP', res?.status);
            // Serve the last good list rather than nothing; the client falls back to built-in numbers if empty.
            if (_cache) return Response.json({ ..._cache, cached: true, stale: true });
            return Response.json({ prices: {}, fetchedAt: null, error: 'catalogue_unavailable' }, { status: 502 });
        }

        const data = await res.json();
        const list = Array.isArray(data) ? data : (data?.products || data?.skus || data?.items || []);
        const prices = {};
        for (const p of list) {
            const id = p.sku || p.skuId || p.id || p.productId;
            if (!id || p.active === false) continue;
            const price = parseFloat(p.pricesInCurrency?.OMENX ?? p.priceInOmenx ?? p.price ?? 0);
            if (price > 0) prices[id] = Math.round(price * 100) / 100;
        }
        _cache = { prices, fetchedAt: now };
        _expiresAt = now + CACHE_TTL_MS;
        console.log(`[getSkuPrices] refreshed ${Object.keys(prices).length} prices`);
        return Response.json(_cache);
    } catch (error) {
        console.error('[getSkuPrices]', error?.message || error);
        if (_cache) return Response.json({ ..._cache, cached: true, stale: true });
        return Response.json({ prices: {}, fetchedAt: null, error: 'exception' }, { status: 500 });
    }
});
