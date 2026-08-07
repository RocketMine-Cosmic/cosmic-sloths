// Single source of truth for "are we on S6 or later?" — used by client-side
// gameplay code to switch between S5 (legacy) and S6+ (rebalanced) behaviour
// at the W20→W21 rollover (Mon May 18 2026 00:00 UTC). MUST agree with the
// server-side check in functions/saveScore.js (`runSeasonId !== '2026-S5'`).
//
// Used by: GameEngine.js, PickupSystem.js, pages/Game.js (HUD score mirror).
import { getCurrentPeriodIds } from './periodIds';

// Numeric season compare — string compare breaks at 2026-S10 vs 2026-S7 ('1' < '7').
function seasonAtLeast(seasonId, year, seas) {
    const m = String(seasonId || '').match(/^(\d{4})-S(\d{1,2})$/);
    if (!m) return false;
    const y = Number(m[1]);
    const s = Number(m[2]);
    if (y > year) return true;
    if (y < year) return false;
    return s >= seas;
}

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

// S7 rebalance gate — activates at the W24→W25 rollover (Mon Jun 15 2026
// 00:00 UTC, season_id flips '2026-S6' → '2026-S7'). Used for the v4
// brainstorm package (docs/S7_DESIGN_BRAINSTORM.md):
//   §4a   Pushback CD floor (shieldBubble/aegisMatrix/burningBarrier)
//   §4a-bis Softer pushback base damage cuts (15→12, 40→28, 18→15)
//   §4b   Pushback decay in final 25% of shield lifetime
//   §4c   Nuke damage maxHp × 10 → × 2.5
//   §4d   Nuke drop rate halved
//   §4e   Outer Galaxy mob HP curve flattened
//   §4f   DD peak spawn → +1.0× score "heat" bonus (server-side mirror in saveScore.js)
//   §4g   DD enabled on Normal + Hard with scaled params (was Cosmic-only)
//   §4i   Armor → % reduction with sector-scaled cap (25-35%)
//   §4j   Sector-scaled max HP cap (2000 → up to 4600 at S20)
// Used by: GameEngine, WeaponSystem, ProjectileSystem, PickupSystem,
//          EnemyAI, EnemySpawner, UpgradeSystem, functions/saveScore.js
//          (server-side mirrors this against `season_id` it already derives).
// MUST agree with the server-side check in functions/saveScore.js.
export function isS7OrLater() {
    try {
        const { season_id } = getCurrentPeriodIds();
        return seasonAtLeast(season_id, 2026, 7);
    } catch {
        return false;
    }
}

// S8 FPS-fairness gate — activates at the W28→W29 rollover (Mon Jul 13 2026
// 00:00 UTC, season_id flips '2026-S7' → '2026-S8'). Converts frame-rate-dependent
// damage/heal ticks to real-time accumulators so 144Hz PCs, 60Hz laptops, and
// 30Hz phones all deal/heal the same DPS per real second:
//   - AoE damage pools (Flaming Lash / Napalm / Hellfire / Toxic / Venom Lash)
//     → 4Hz fixed tick (0.25s) instead of frameCount % 15
//   - Player HP regen → 1× regen per real second instead of frameCount % 60
//   - Boss HP regen (bossModifiers.regen) → 1% max HP per real second
// Held back until S8 so the in-flight S7 leaderboard stays fair — enabling
// mid-season would retroactively change every high-refresh player's DPS.
// Used by: ProjectileSystem.js, GameEngine.js, EnemyAI.js.
// Force-ON in both the builder-preview iframe AND any *.base44.app preview
// domain so all S8 UI (Sandbox tile, Fragment Express card, revive
// escalation) renders for review before W29. The live custom domain (real
// players) still uses the season check. Server saveScore independently
// enforces season_id → leaderboard safe regardless.
export function isS8OrLater() {
    if (typeof window !== 'undefined') {
        if (window.self !== window.top) return true;
        try {
            if (window.location.hostname.endsWith('.base44.app')) return true;
        } catch {}
    }
    try {
        const { season_id } = getCurrentPeriodIds();
        return seasonAtLeast(season_id, 2026, 8);
    } catch {
        return false;
    }
}

// Hitstop frame-accounting fix (G2) - activates at the S8->S9 rollover
// (Mon Aug 10 2026 00:00 UTC). Named after what it gates rather than the
// season, following isBossVacuumEnabled above: the justification travels with
// the condition, and it retires cleanly when the old path is deleted.
//
// THE BUG. ProjectileSystem sets `engine.hitStopTimer = 0.01` on 5% of hits.
// GameEngine returns early while that timer is positive, and that early return
// sits ABOVE `this.time += dt`. At 60fps dt is ~0.0167 - larger than the 0.01
// timer - so every trigger discards a whole update frame AND that frame never
// advances the run clock. A build landing ~200 hits/sec trips it 10-15 times a
// second: the game micro-stutters exactly when the build is strongest, and
// `this.time` runs ~13-15% slow for precisely the players at the top of the
// board.
//
// WHY IT IS GATED. Fixing the clock changes the effective length of a run for
// heavy builds - sector runs end sooner in wall-clock, endless records more
// time for the same play. Small, but these are boards that pay real OMENX, so
// runs either side of the change are not strictly comparable. Holding it to a
// rollover means no player's week contains both versions, and the publish
// itself can happen whenever.
//
// NO VERSION GATE NEEDED. SaveManager.load() rebuilds the weekly/seasonal
// containers on a period change and runs on essentially every render, so at
// rollover every client re-derives its period state anyway. min_client_version
// stays where it is and nobody sees a forced-update modal.
//
// CHECKED AGAINST LIVE DATA, not assumed: the runs nearest the 7200s ceiling
// are the near-idle ones (6164s / 208 kills) and hitstop only fires on hits, so
// their clocks are already accurate and this does not touch them. The heaviest
// run (5031s / 53912 kills) lands ~5800s. Kill rates move DOWN, away from every
// cap. No server-side mirror is required: saveScore only bounds-checks the
// duration the client reports.
//
// Used by: game/ProjectileSystem.js.
export function isHitstopFrameFixEnabled() {
    try {
        const { season_id } = getCurrentPeriodIds();
        return seasonAtLeast(season_id, 2026, 9);
    } catch {
        // Defensive - if the period calc ever throws, keep today's behaviour.
        return false;
    }
}