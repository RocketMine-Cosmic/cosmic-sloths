import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { fetchOmenPrices, readSavedPrices, savePrices, STALE_AFTER_MS } from '../../shared/storePrices.ts';

// Live store prices for the game client, in OMCADE (the token formerly OMENX).
//
// Returns { prices: { [skuId]: tokenAmount }, fetchedAt } for every active
// fixed-price product on the Omen portal.
//
// 2026-10-21: this NO LONGER calls Omen on every request. The scheduled job
// refreshSkuPrices fetches the catalogue every 5 minutes and saves it in
// AppConfig ('omen_store_prices'); this function just reads that saved copy.
// Before, every open game window caused an Omen call every 5 minutes (see
// shared/storePrices.ts). Only if the saved copy is older than 20 minutes (the
// schedule has stopped) does this fetch from Omen itself and re-save, at most
// once per 5 minutes per server instance, so players never get stuck on old prices.
//
// No auth: prices aren't secret. Read-only for the player; no charges.

const MEMO_MS = 60 * 1000;          // per-instance memo of the saved row (saves DB reads)
const FALLBACK_GAP_MS = 5 * 60 * 1000;
let _memo = null;
let _memoAt = 0;
let _lastFallbackAt = 0;

Deno.serve(async (req) => {
    try {
        const now = Date.now();
        if (_memo && now - _memoAt < MEMO_MS) return Response.json({ ..._memo, cached: true });

        const base44 = createClientFromRequest(req);
        const db = base44.asServiceRole;
        const { value } = await readSavedPrices(db);
        const fresh = value?.fetchedAt && now - value.fetchedAt < STALE_AFTER_MS && value.count > 0;

        if (fresh) {
            _memo = { prices: value.prices, fetchedAt: value.fetchedAt };
            _memoAt = now;
            return Response.json(_memo);
        }

        // Saved copy missing or stale: the scheduled refresh isn't running.
        if (now - _lastFallbackAt > FALLBACK_GAP_MS) {
            _lastFallbackAt = now;
            const result = await fetchOmenPrices();
            const saved = await savePrices(db, result, 'getSkuPrices-fallback');
            if (result.ok) {
                console.warn('[getSkuPrices] saved prices were stale/missing — fetched from Omen directly. Is the "Refresh store prices" schedule running?');
                _memo = { prices: saved.prices, fetchedAt: saved.fetchedAt };
                _memoAt = now;
                return Response.json(_memo);
            }
            console.error('[getSkuPrices] fallback fetch failed:', result.error);
        }

        // Serve the last good list rather than nothing; the client falls back to built-in numbers if empty.
        if (value?.prices && Object.keys(value.prices).length) {
            return Response.json({ prices: value.prices, fetchedAt: value.fetchedAt, cached: true, stale: true });
        }
        return Response.json({ prices: {}, fetchedAt: null, error: 'catalogue_unavailable' }, { status: 502 });
    } catch (error) {
        console.error('[getSkuPrices]', error?.message || error);
        if (_memo) return Response.json({ ..._memo, cached: true, stale: true });
        return Response.json({ prices: {}, fetchedAt: null, error: 'exception' }, { status: 500 });
    }
});
