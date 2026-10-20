// Live USD spot prices for OMCADE (formerly OMENX), GMT and BNB on BNB Smart Chain.
// Primary source: Omen's own price feed (GET /v1/prices/tokens, needs `prices:read`
// on the balance keys). This is the same price Omen uses when it converts a USD-priced
// item into OMCADE at checkout, so it's the most accurate number for our store.
// GMT falls back to CoinGecko → DexScreener if Omen is unavailable.
//
// Note: while OMCADE has no live liquidity pool yet, Omen reports its price with
// source "env_fallback" (a fixed peg). Once the pool goes live this becomes a market price.
//
// Cached server-side (60s TTL).

const CHAIN_ID = 56;

// Token contract addresses on BSC. BNB is native — zero address by convention.
const TOKENS = {
    OMENX: '0x995586c1ef10c3cbaf155a62f62d65310d0d4c1f', // OMCADE (rebranded from OMENX)
    GMT:   '0x7Ddc52c4De30e94Be3A6A0A2b259b2850f421989',
    BNB:   '0x0000000000000000000000000000000000000000',
};

const CACHE_TTL_MS = 60 * 1000;
let _cache = null;
let _cacheExpiresAt = 0;

function getBalanceKeys() {
    const keys = [];
    const first = Deno.env.get('OMENX_BALANCE_API_KEY');
    if (first) keys.push(first);
    for (let i = 2; i <= 9; i++) {
        const k = Deno.env.get(`OMENX_BALANCE_API_KEY_${i}`);
        if (k) keys.push(k);
    }
    return keys;
}

async function fetchOmenPrices() {
    let base = Deno.env.get('DEVELOPER_API_BASE_URL') || 'https://api.omen.foundation';
    if (!base.startsWith('http')) base = `https://${base}`;
    const url = `${base}/v1/prices/tokens?chainId=${CHAIN_ID}&addresses=${Object.values(TOKENS).join(',')}`;
    for (const key of getBalanceKeys()) {
        const res = await fetch(url, { headers: { Authorization: `Bearer ${key}` } });
        if (res.ok) {
            const data = await res.json();
            const out = {};
            for (const [symbol, addr] of Object.entries(TOKENS)) {
                const t = (data?.tokens || []).find(x => x?.address?.toLowerCase() === addr.toLowerCase());
                if (t && typeof t.priceUsd === 'number' && t.priceUsd > 0) {
                    out[symbol] = { usd: t.priceUsd, source: `omen:${t.source || 'unknown'}` };
                }
            }
            return out;
        }
        if (res.status !== 429 && res.status < 500) {
            console.warn('[getTokenPrices] Omen price feed HTTP', res.status);
            return {};
        }
    }
    return {};
}

async function fetchGmtFallback() {
    try {
        const cgRes = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=gomining-token&vs_currencies=usd');
        if (cgRes.ok) {
            const price = (await cgRes.json())?.['gomining-token']?.usd;
            if (typeof price === 'number' && price > 0) return { usd: price, source: 'coingecko' };
        }
    } catch (_) { /* try next */ }
    try {
        const dsRes = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${TOKENS.GMT}`);
        if (dsRes.ok) {
            const best = ((await dsRes.json())?.pairs || [])
                .filter(p => p?.priceUsd)
                .sort((a, b) => (b?.liquidity?.usd || 0) - (a?.liquidity?.usd || 0))[0];
            const price = best?.priceUsd ? parseFloat(best.priceUsd) : null;
            if (price && price > 0) return { usd: price, source: 'dexscreener' };
        }
    } catch (_) { /* give up */ }
    return null;
}

Deno.serve(async (_req) => {
    try {
        const now = Date.now();
        if (_cache && now < _cacheExpiresAt) {
            return Response.json({ ..._cache, cached: true });
        }

        const prices = await fetchOmenPrices();
        if (!prices.GMT) {
            const gmt = await fetchGmtFallback();
            if (gmt) prices.GMT = gmt;
        }

        if (!prices.GMT) {
            console.error('[getTokenPrices] all price sources failed');
            return Response.json({ error: 'Could not fetch token prices right now.' }, { status: 502 });
        }

        console.log('[getTokenPrices]', JSON.stringify(prices));
        const payload = { chainId: CHAIN_ID, fetchedAt: now, prices };
        _cache = payload;
        _cacheExpiresAt = now + CACHE_TTL_MS;
        return Response.json(payload);
    } catch (error) {
        console.error('[getTokenPrices]', error?.message || error);
        return Response.json({ error: error?.message || 'Failed to fetch token prices' }, { status: 500 });
    }
});