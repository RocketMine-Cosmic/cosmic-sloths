// S8 revive escalation — single source of truth for tier boundaries + prices.
// Client uses these to show the price BEFORE the confirmation modal;
// server (purchaseSku) mirrors the same tiers to validate the incoming SKU
// against the run time on death. Any change here MUST be mirrored in
// purchaseSku's REVIVE_TIERS constant.
//
// Design (per docs/s8/PLAN_REVIVE_AND_FRAGMENTS.md §Sink 1):
//   0–4 min      → 4 OMENX  · ingame-revive
//   4–8 min      → 8 OMENX  · ingame-revive-8
//   8–11 min     → 15 OMENX · ingame-revive-15
//   11 min+ / any endless run → 25 OMENX · ingame-revive-25
//
// No weekly cap — one revive per run is already the hard limit, and each
// successive revive within a run is priced by the tier ladder above.
import { isS8OrLater } from '@/lib/seasonGate';
import { skuPrice } from '@/lib/storePrices';

// 2026-10-20: the tier boundaries above are still the design; the PRICE of each
// tier is now whatever the Omen portal charges for its SKU (skuPrice), so the
// prompt always shows what the player will actually pay. Numbers in the table
// above are the old built-in prices.

// timeSec = engine.time at death; arenaId lets us short-circuit endless to top tier.
function tier(skuId, label) {
    return { skuId, cost: skuPrice(skuId), label };
}

export function getReviveTierForRun(timeSec, arenaId) {
    // Endless / world-boss runs → top tier straight away (any death in these
    // long-form modes is a genuine "save my progress" moment).
    if (arenaId === 'endless' || arenaId === 'world_boss_arena') {
        return tier('ingame-revive-25', '11 min+ / Endless');
    }
    const t = Number(timeSec) || 0;
    if (t < 4 * 60)  return tier('ingame-revive',    '0–4 min');
    if (t < 8 * 60)  return tier('ingame-revive-8',  '4–8 min');
    if (t < 11 * 60) return tier('ingame-revive-15', '8–11 min');
    return tier('ingame-revive-25', '11 min+');
}

// S8+ uses the escalation. Before S8, everyone stays on the flat 4-OMENX SKU
// so the in-flight S7 leaderboard experience doesn't change mid-season.
export function getReviveForRun(timeSec, arenaId) {
    if (isS8OrLater()) return getReviveTierForRun(timeSec, arenaId);
    return tier('ingame-revive', 'Flat');
}