// Single source of truth for "are we on S6 or later?" — used by client-side
// gameplay code to switch between S5 (legacy) and S6+ (rebalanced) behaviour
// at the W20→W21 rollover (Mon May 25 2026 00:00 UTC). MUST agree with the
// server-side check in functions/saveScore.js (`runSeasonId !== '2026-S5'`).
//
// Used by: GameEngine.js, PickupSystem.js, pages/Game.js (HUD score mirror).
import { getCurrentPeriodIds } from './periodIds';

export function isS6OrLater() {
    try {
        const { season_id } = getCurrentPeriodIds();
        return season_id !== '2026-S5';
    } catch {
        // Defensive — if period calc ever throws, fall back to legacy behaviour.
        return false;
    }
}