// Admin-only audit: compares every locally-known SKU price (lib/skuMap.js mirror)
// against the live OmenX dev-portal catalog. Flags any drift so we know exactly
// which SKU is causing 422s when paymentAmount disagrees with their catalog.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Mirror of lib/skuMap.js — keep these in sync with the client-side map.
const EXPECTED_PRICES = {
    // In-game consumables
    'ingame-banish': 2,
    'ingame-banish-2': 4,
    'ingame-banish-3': 6,
    'ingame-reroll': 2,
    'ingame-revive': 4,
    'ingame-squad-ult-lite': 5,
    'ingame-squad-ult-full': 10,
    'ingame-xp-buff': 10,
    'bias-respec': 10,

    // Talent respecs
    'talent-respec-permanent': 10,
    'talent-respec-weekly': 4,
    'talent-respec-seasonal': 20,

    // Stat upgrades (5/10/20/40/80 OMENX per level, all tiers same)
    'stat-upgrade-permanent-lvl1': 5,
    'stat-upgrade-permanent-lvl2': 10,
    'stat-upgrade-permanent-lvl3': 20,
    'stat-upgrade-permanent-lvl4': 40,
    'stat-upgrade-permanent-lvl5': 80,
    'stat-upgrade-weekly-lvl1': 5,
    'stat-upgrade-weekly-lvl2': 10,
    'stat-upgrade-weekly-lvl3': 20,
    'stat-upgrade-weekly-lvl4': 40,
    'stat-upgrade-weekly-lvl5': 80,
    'stat-upgrade-seasonal-lvl1': 5,
    'stat-upgrade-seasonal-lvl2': 10,
    'stat-upgrade-seasonal-lvl3': 20,
    'stat-upgrade-seasonal-lvl4': 40,
    'stat-upgrade-seasonal-lvl5': 80,

    // Weapon upgrades (same curve)
    'weapon-upgrades-permanent-lvl1': 5,
    'weapon-upgrades-permanent-lvl2': 10,
    'weapon-upgrades-permanent-lvl3': 20,
    'weapon-upgrades-permanent-lvl4': 40,
    'weapon-upgrades-permanent-lvl5': 80,
    'weapon-upgrades-weekly-lvl1': 5,
    'weapon-upgrades-weekly-lvl2': 10,
    'weapon-upgrades-weekly-lvl3': 20,
    'weapon-upgrades-weekly-lvl4': 40,
    'weapon-upgrades-weekly-lvl5': 80,
    'weapon-upgrades-seasonal-lvl1': 5,
    'weapon-upgrades-seasonal-lvl2': 10,
    'weapon-upgrades-seasonal-lvl3': 20,
    'weapon-upgrades-seasonal-lvl4': 40,
    'weapon-upgrades-seasonal-lvl5': 80,

    // Character talents (10/20/40 OMENX by tier)
    'character-talents-permanent-lvl1': 10,
    'character-talents-permanent-lvl2': 20,
    'character-talents-permanent-lvl3': 40,
    'character-talents-weekly-lvl1': 10,
    'character-talents-weekly-lvl2': 20,
    'character-talents-weekly-lvl3': 40,
    'character-talents-seasonal-lvl1': 10,
    'character-talents-seasonal-lvl2': 20,
    'character-talents-seasonal-lvl3': 40,

    // Cosmetics — map goldCost tier → OMENX cost
    'character-trails-basic': 3,
    'character-trails-advanced': 10,
    'character-trails-epic': 20,
    'character-trails-leg': 30,
    'character-kill-effects-basic': 3,
    'character-kill-effects-advanced': 12,
    'character-kill-effects-epic': 25,
    'character-skins-basic': 5,
    'character-skins-advance': 20,
};

function getCatalogKeys() {
    const keys = [
        Deno.env.get('OMENX_PAYMENT_API_KEY'),
        Deno.env.get('OMENX_PAYMENT_API_KEY_2'),
        Deno.env.get('OMENX_PAYMENT_API_KEY_3'),
        Deno.env.get('OMENX_PAYMENT_API_KEY_4'),
    ].filter(Boolean);
    return keys;
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        let me = null;
        try { me = await base44.auth.me(); } catch {}
        if (!me) return Response.json({ error: 'Unauthorized' }, { status: 401 });
        if (me.role !== 'admin') return Response.json({ error: 'Forbidden: Admin only' }, { status: 403 });

        let apiBaseUrl = Deno.env.get('DEVELOPER_API_BASE_URL') || 'https://api.omen.foundation';
        if (!apiBaseUrl.startsWith('http')) apiBaseUrl = `https://${apiBaseUrl}`;

        const keys = getCatalogKeys();
        if (keys.length === 0) return Response.json({ error: 'No payment API keys configured' }, { status: 500 });

        // Fetch the live catalog
        let res, lastStatus = 0;
        for (const key of keys) {
            res = await fetch(`${apiBaseUrl}/v1/products`, {
                headers: { 'Authorization': `Bearer ${key}` },
            });
            if (res.ok) break;
            lastStatus = res.status;
            if (res.status !== 429 && res.status < 500) break;
        }
        if (!res || !res.ok) {
            return Response.json({ error: `Couldn't fetch OmenX catalog (HTTP ${lastStatus || res?.status})` }, { status: 502 });
        }
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data?.products || data?.skus || data?.items || []);

        // Build live price map
        const livePrices = {};
        for (const sku of list) {
            const id = sku.sku || sku.skuId || sku.id || sku.productId;
            const price = parseFloat(sku.pricesInCurrency?.OMENX ?? sku.priceInOmenx ?? sku.price ?? 0);
            if (id) livePrices[id] = price;
        }

        // Compare
        const matches = [];
        const mismatches = [];
        const missingFromLive = [];
        for (const [skuId, expected] of Object.entries(EXPECTED_PRICES)) {
            if (!(skuId in livePrices)) {
                missingFromLive.push({ skuId, expected });
            } else if (livePrices[skuId] !== expected) {
                mismatches.push({ skuId, expected, live: livePrices[skuId] });
            } else {
                matches.push({ skuId, price: expected });
            }
        }

        // Live SKUs we don't know about locally
        const extraOnLive = [];
        for (const [skuId, live] of Object.entries(livePrices)) {
            if (!(skuId in EXPECTED_PRICES)) {
                extraOnLive.push({ skuId, live });
            }
        }

        return Response.json({
            summary: {
                totalExpected: Object.keys(EXPECTED_PRICES).length,
                totalLive: Object.keys(livePrices).length,
                matches: matches.length,
                mismatches: mismatches.length,
                missingFromLive: missingFromLive.length,
                extraOnLive: extraOnLive.length,
            },
            mismatches,
            missingFromLive,
            extraOnLive,
            matches,
        });
    } catch (error) {
        console.error('[auditSkuPrices] error:', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
});