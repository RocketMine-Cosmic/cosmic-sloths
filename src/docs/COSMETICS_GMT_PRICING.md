# Cosmetics GMT Pricing Feature

**Status:** Documented, not implemented yet.

## Overview
When a cosmetic SKU is configured to accept GMT payment (dev side), display the live GMT price equivalent next to the USD price on cosmetic purchase buttons in the Upgrades page.

## Location
- **Page:** `pages/Upgrades` 
- **Component:** Cosmetics tab / cosmetic purchase buttons

## Implementation Details

### Data Flow
1. Cosmetic SKU already has `Price (USD)` and `Allowed payment currencies` (BNB, OMENX, GMT) configured in OmenX dev dashboard.
2. Frontend calls `getTokenPrices` → receives `{ prices: { GMT: { usd: 0.2932, source: 'dexscreener' } } }`
3. Convert USD to GMT: `gmtAmount = usdPrice / gmtUsd`
4. Button displays: `"Buy for $3.00 or ~10.23 GMT"` (when GMT is enabled as a payment option)

### Edge Cases to Handle
- **Price lock vs re-quote:** Decide if GMT amount locks at render-time or updates before settlement
- **Rounding buffer:** Consider +2% buffer to protect against mid-transaction price drops
- **Confirmation:** Verify OmenX SDK actually settles GMT payments before wiring purchaseSku

### Related Backend Function
- `getTokenPrices` - Already deployed, returns live GMT/USD rate with fallback (CoinGecko → DexScreener)

## Wireframe
```
[Fire Trail] $3.00
Buy for ~10.23 GMT
[Select Payment] ▼
```

## Notes
- OmenX SKU config already supports multi-currency, so no backend changes needed
- Just a display layer — `purchaseSku` already handles the OmenX settlement with the selected currency