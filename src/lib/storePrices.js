// Live store prices, in OMCADE, from the Omen portal.
//
// WHY (2026-10-20): purchaseSku charges whatever the Omen portal says each SKU costs
// (portal prices are set in USD; Omen converts to tokens at the token's price). Until
// now every screen showed a price typed into the code, so a portal change or a token
// price move made the screen and the charge disagree. Every price shown to players,
// and every "can you afford it" check, now reads skuPrice(sku).
//
// FALLBACK is used only until the first live load (or if Omen is unreachable). It is
// the prices the game showed before this change — not a second source of truth.
import React from 'react';
import { base44 } from '@/api/base44Client';

export const FALLBACK_PRICES = {
    // In-run
    'ingame-reroll': 2,
    'ingame-banish': 2, 'ingame-banish-2': 4, 'ingame-banish-3': 6,
    'ingame-revive': 4, 'ingame-revive-8': 8, 'ingame-revive-15': 15, 'ingame-revive-25': 25,
    'ingame-squad-ult-lite': 5, 'ingame-squad-ult-full': 10,
    'ingame-xp-buff': 10,
    'globalraid-retries': 10,
    'ingame-star-fragments': 10, 'ingame-star-fragments-10': 100,
    'bias-respec': 10,
    // Talent respecs
    'talent-respec-permanent': 10, 'talent-respec-weekly': 4, 'talent-respec-seasonal': 20,
    // Cosmetics
    'character-trails-basic': 30, 'character-trails-advanced': 100, 'character-trails-epic': 200, 'character-trails-leg': 300,
    'character-kill-effects-basic': 30, 'character-kill-effects-advanced': 120, 'character-kill-effects-epic': 250,
    'character-skins-basic': 50, 'character-skins-advance': 200,
};
// Upgrades: lvl1..5 per tier (stat and weapon share the ladder); talents use lvl1..3.
const UPGRADE_LADDERS = {
    permanent: [15, 30, 60, 120, 240],
    weekly:    [4, 8, 15, 30, 60],
    seasonal:  [10, 20, 40, 80, 160],
};
for (const [tier, ladder] of Object.entries(UPGRADE_LADDERS)) {
    ladder.forEach((p, i) => {
        FALLBACK_PRICES[`stat-upgrade-${tier}-lvl${i + 1}`] = p;
        FALLBACK_PRICES[`weapon-upgrades-${tier}-lvl${i + 1}`] = p;
    });
    // Talent tiers 1/2/3 were shown at ladder entries 0/2/4.
    [0, 2, 4].forEach((idx, i) => { FALLBACK_PRICES[`character-talents-${tier}-lvl${i + 1}`] = ladder[idx]; });
}

const REFRESH_MS = 5 * 60 * 1000;
let live = {};
let loadedAt = 0;
let inflight = null;
let timer = null;
const listeners = new Set();

function notify() { listeners.forEach(fn => { try { fn(); } catch {} }); }

export async function loadStorePrices(force = false) {
    if (!force && inflight) return inflight;
    if (!force && Date.now() - loadedAt < REFRESH_MS && Object.keys(live).length) return live;
    inflight = (async () => {
        try {
            const res = await base44.functions.invoke('getSkuPrices', {});
            const prices = res?.data?.prices;
            if (prices && typeof prices === 'object' && Object.keys(prices).length) {
                live = prices;
                loadedAt = Date.now();
                notify();
            }
        } catch (e) {
            console.warn('[storePrices] live prices unavailable, using built-in prices', e?.message || e);
        } finally {
            inflight = null;
        }
        return live;
    })();
    return inflight;
}

// Start once at app boot; keeps prices fresh while the game is open.
export function startStorePrices() {
    loadStorePrices();
    if (!timer) timer = setInterval(() => loadStorePrices(true), REFRESH_MS);
}

// Price of one SKU in OMCADE. Live if loaded, otherwise the old built-in price.
export function skuPrice(skuId) {
    const v = live[skuId];
    if (typeof v === 'number' && v > 0) return v;
    return FALLBACK_PRICES[skuId] ?? 0;
}

// Prices can be fractions now (e.g. $0.05 at a $0.10 token = 0.5). Show up to 2 decimals.
export function formatTokens(n) {
    const x = Number(n) || 0;
    return x.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

// <Price sku="ingame-reroll" /> — live price as text, for help/guide copy that is
// written as static JSX (Info page, Welcome modal). Updates when prices load.
export function Price({ sku }) {
    useStorePrices();
    return formatTokens(skuPrice(sku));
}

// React: re-render when live prices arrive. Returns skuPrice for convenience.
export function useStorePrices() {
    const [, setTick] = React.useState(0);
    React.useEffect(() => {
        const fn = () => setTick(t => t + 1);
        listeners.add(fn);
        loadStorePrices();
        return () => listeners.delete(fn);
    }, []);
    return skuPrice;
}
