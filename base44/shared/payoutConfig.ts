// Shared leaderboard payout config resolution.
//
// A TokenPool row can carry a FROZEN copy of the payout config
// (`locked_payout_config`). When present it wins over the live AppConfig, so an
// owner can change the global percentages for an upcoming week without altering
// an older week/season that hasn't been distributed yet.
//
// Used by: distributeRewards, manuallyDistributeRewards, distributeKillPool,
// previewPayouts — they MUST all resolve the same way or preview and payout
// would disagree.

export const DEFAULT_PAYOUT_CONFIG = {
    top_n: 20,
    weekly_pool_pct: 0.15,
    seasonal_pool_pct: 0.20,
    kill_pool_pct: 0.05,
    weekly_tiers: [
        { min: 1,  max: 1,  pct: 0.10 },
        { min: 2,  max: 2,  pct: 0.08 },
        { min: 3,  max: 3,  pct: 0.06 },
        { min: 4,  max: 10, pct: 0.04 },
        { min: 11, max: 20, pct: 0.03 },
    ],
    seasonal_tiers: [
        { min: 1,  max: 1,  pct: 0.10 },
        { min: 2,  max: 2,  pct: 0.075 },
        { min: 3,  max: 3,  pct: 0.06 },
        { min: 4,  max: 10, pct: 0.032 },
        { min: 11, max: 20, pct: 0.022 },
    ],
    weekly_kill_tiers: [
        { min: 1,  max: 1,  pct: 0.15 },
        { min: 2,  max: 2,  pct: 0.10 },
        { min: 3,  max: 3,  pct: 0.08 },
        { min: 4,  max: 10, pct: 0.05 },
        { min: 11, max: 20, pct: 0.025 },
    ],
};

// `db` must be a service-role client (base44.asServiceRole).
export async function loadGlobalPayoutConfig(db) {
    try {
        const rows = await db.entities.AppConfig.filter({ key: 'leaderboard_payout_config' });
        return rows[0]?.value || DEFAULT_PAYOUT_CONFIG;
    } catch {
        return DEFAULT_PAYOUT_CONFIG;
    }
}

function hasLockedConfig(pool) {
    const c = pool?.locked_payout_config;
    return !!c && typeof c === 'object' && Object.keys(c).length > 0;
}

// Frozen config for this pool if it has one, otherwise the live global config.
export async function resolvePayoutConfig(db, pool) {
    if (hasLockedConfig(pool)) return pool.locked_payout_config;
    return await loadGlobalPayoutConfig(db);
}

export function isConfigLocked(pool) {
    return hasLockedConfig(pool);
}