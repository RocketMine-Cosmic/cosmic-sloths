// Store prices from the Omen portal, fetched ONCE for the whole game and saved.
//
// WHY (2026-10-21): the first version (20 Oct) had every open game window ask
// getSkuPrices every 5 minutes, and getSkuPrices called Omen whenever its
// per-instance memory cache had run out — which, with a 5-minute cache and a
// 5-minute poll, was nearly every time. Rob's Omen request log filled with
// GET /v1/products, growing with every player online and sharing the game's one
// Omen rate-limit bucket with purchases and payouts.
//
// Now: the scheduled job refreshSkuPrices fetches the catalogue every 5 minutes
// and stores it in AppConfig (key below). getSkuPrices only READS that row.
// Omen calls = one per 5 minutes, however many players are online.

export const PRICE_CONFIG_KEY = 'omen_store_prices';
// If the saved copy is older than this (scheduled job stopped?), getSkuPrices
// fetches from Omen itself and re-saves, so players never get stuck on old prices.
export const STALE_AFTER_MS = 20 * 60 * 1000;

function getPaymentKeys(): string[] {
    const keys: string[] = [];
    const first = Deno.env.get('OMENX_PAYMENT_API_KEY');
    if (first) keys.push(first);
    for (let i = 2; i <= 8; i++) {
        const k = Deno.env.get(`OMENX_PAYMENT_API_KEY_${i}`);
        if (k) keys.push(k);
    }
    return keys;
}

// One read of Omen's catalogue. Mirrors purchaseSku's own read
// (pricesInCurrency.OMENX — Omen's API still names the currency OMENX) so the
// screen and the charge come from the same field.
export async function fetchOmenPrices(): Promise<{ ok: true; prices: Record<string, number> } | { ok: false; error: string }> {
    let base = Deno.env.get('DEVELOPER_API_BASE_URL') || 'https://api.omen.foundation';
    if (!base.startsWith('http')) base = `https://${base}`;
    let res: Response | null = null;
    for (const key of getPaymentKeys()) {
        res = await fetch(`${base}/v1/products`, { headers: { Authorization: `Bearer ${key}` } });
        if (res.ok) break;
        if (res.status !== 429 && res.status < 500) break;
    }
    if (!res || !res.ok) return { ok: false, error: `catalogue HTTP ${res?.status ?? 'no key'}` };
    const data = await res.json();
    const list = Array.isArray(data) ? data : (data?.products || data?.skus || data?.items || []);
    const prices: Record<string, number> = {};
    for (const p of list) {
        const id = p.sku || p.skuId || p.id || p.productId;
        if (!id || p.active === false) continue;
        const price = parseFloat(p.pricesInCurrency?.OMENX ?? p.priceInOmenx ?? p.price ?? 0);
        // Full precision (the screen rounds) so "can you afford it" matches the charge.
        if (price > 0) prices[id] = Math.round(price * 1e6) / 1e6;
    }
    if (Object.keys(prices).length === 0) return { ok: false, error: 'catalogue returned no priced products' };
    return { ok: true, prices };
}

export async function readSavedPrices(db: any): Promise<{ row: any; value: any }> {
    const rows = await db.entities.AppConfig.filter({ key: PRICE_CONFIG_KEY });
    const row = rows?.[0] || null;
    return { row, value: row?.value || null };
}

// Saves a fresh list (or, on failure, records the error and KEEPS the last good prices).
export async function savePrices(db: any, result: { ok: boolean; prices?: Record<string, number>; error?: string }, source: string) {
    const { row, value } = await readSavedPrices(db);
    const now = Date.now();
    const next = result.ok
        ? { prices: result.prices, fetchedAt: now, count: Object.keys(result.prices!).length, source, lastError: null, lastErrorAt: null }
        : { ...(value || { prices: {}, fetchedAt: null, count: 0 }), lastError: result.error, lastErrorAt: now, source };
    if (row) await db.entities.AppConfig.update(row.id, { value: next });
    else await db.entities.AppConfig.create({ key: PRICE_CONFIG_KEY, value: next, notes: 'Omen store prices, refreshed every 5 min by refreshSkuPrices. Read by getSkuPrices. Safe to delete (it is rebuilt).' });
    return next;
}
