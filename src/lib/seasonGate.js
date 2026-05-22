// Single source of truth for "are we on S6 or later?" — used by client-side
// gameplay code to switch between S5 (legacy) and S6+ (rebalanced) behaviour
// at the W20→W21 rollover (Mon May 18 2026 00:00 UTC). MUST agree with the
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

// Boss-drop XP auto-vacuum feature gate — activates at the W21→W22 weekly
// rollover (Mon May 25 2026 00:00 UTC). When enabled, the XP orb a boss drops
// at death is tagged with `magnetSweep` so it auto-vacuums to the player
// (reuses the existing magnet_power vacuum mechanic in PickupSystem.js — no
// new code paths). Held back until W22 so the in-flight W21 leaderboard
// stays fair. Only the boss's OWN XP drop is swept; scattered mob loot still
// needs walking, so magnet-stat investment still matters throughout the run.
// Used by: game/EnemyAI.js. Anubis feedback 2026-05-22.
export function isBossVacuumEnabled() {
    try {
        const { week_id } = getCurrentPeriodIds();
        return week_id >= '2026-W22';
    } catch {
        return false;
    }
}