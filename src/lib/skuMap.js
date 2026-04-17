/**
 * SKU mapping helpers — maps in-game purchase actions to OmenX developer portal SKU IDs.
 * SKU IDs match exactly what was registered in the OmenX developer portal.
 */

// In-game consumable SKUs
export const IN_GAME_SKUS = {
    banish:        'ingame-banish',
    reroll:        'ingame-reroll',
    squadUltimate: 'ingame-squad-buff',
    revive:        'ingame-revive',
    xpSession:     'ingame-xp-buff',
};

// Stat upgrade SKUs — keyed by tier and level
const STAT_SKUS = {
    permanent: ['stat-upgrade-permanent-1-v1-1', 'stat-upgrade-permanent-1-v1-2', 'stat-upgrade-permanent-1-v1-3', 'stat-upgrade-permanent-1-v1-4', 'stat-upgrade-permanent-1-v1-5'],
    weekly:    ['stat-upgrade-weekly-1-v1-1',    'stat-upgrade-weekly-1-v1-2',    'stat-upgrade-weekly-1-v1-3',    'stat-upgrade-weekly-1-v1-4',    'stat-upgrade-weekly-1-v1-5'],
    seasonal:  ['stat-upgrade-seasonal-1-v1-1',  'stat-upgrade-seasonal-1-v1-2',  'stat-upgrade-seasonal-1-v1-3',  'stat-upgrade-seasonal-1-v1-4',  'stat-upgrade-seasonal-1-v1-5'],
};

// Weapon upgrade SKUs — keyed by tier and level
const WEAPON_SKUS = {
    permanent: ['weapon-upgrades-permanent-lvl1', 'weapon-upgrades-permanent-lvl2', 'weapon-upgrades-permanent-lvl3', 'weapon-upgrades-permanent-lvl4', 'weapon-upgrades-permanent-lvl5'],
    weekly:    ['weapon-upgrades-weekly-lvl1',    'weapon-upgrades-weekly-lvl2',    'weapon-upgrades-weekly-lvl3',    'weapon-upgrades-weekly-lvl4',    'weapon-upgrades-weekly-lvl5'],
    seasonal:  ['weapon-upgrades-seasonal-lvl1',  'weapon-upgrades-seasonal-lvl2',  'weapon-upgrades-seasonal-lvl3',  'weapon-upgrades-seasonal-lvl4',  'weapon-upgrades-seasonal-lvl5'],
};

// Talent SKUs — tiers 1/2/3 map to lvl1/lvl2/lvl3
const TALENT_SKUS = {
    permanent: ['character-talents-permanent-lvl1', 'character-talents-permanent-lvl2', 'character-talents-permanent-lvl3'],
    weekly:    ['character-talents-weekly-lvl1',    'character-talents-weekly-lvl2',    'character-talents-weekly-lvl3'],
    seasonal:  ['character-talents-seasonal-lvl1',  'character-talents-seasonal-lvl2',  'character-talents-seasonal-lvl3'],
};

// Cosmetic SKUs
const TRAIL_SKUS = {
    // goldCost tiers: 0=free, 3000=basic, 10000=advanced, 20000=epic, 30000=legendary
    3000:  'character-trails-basic',
    10000: 'character-trails-advanced',
    20000: 'character-trails-epic',
    30000: 'character-trails-leg',
};

const KILL_EFFECT_SKUS = {
    // goldCost tiers: 3000=basic, 12000=advanced, 25000=epic
    3000:  'character-kill-effects-basic',
    12000: 'character-kill-effects-advanced',
    25000: 'character-kill-effects-epic',
};

const SKIN_SKUS = {
    // goldCost tiers: 5000=basic, 20000=advanced
    5000:  'character-skins-basic',
    20000: 'character-skins-advance',
};

/**
 * Returns the SKU for a stat upgrade.
 * @param {'permanent'|'weekly'|'seasonal'} tier
 * @param {string} statId  (unused — all stats share the same SKU per tier/level)
 * @param {number} level   1-indexed level being purchased
 */
export function getStatSku(tier, statId, level) {
    return STAT_SKUS[tier]?.[level - 1] || null;
}

/**
 * Returns the SKU for a weapon upgrade.
 * @param {'permanent'|'weekly'|'seasonal'} tier
 * @param {string} weaponName  (unused — all weapons share the same SKU per tier/level)
 * @param {'damage'|'area'|'cooldown'} stat  (unused)
 * @param {number} level  1-indexed
 */
export function getWeaponSku(tier, weaponName, stat, level) {
    return WEAPON_SKUS[tier]?.[level - 1] || null;
}

/**
 * Returns the SKU for a character talent purchase.
 * @param {'permanent'|'weekly'|'seasonal'} tier
 * @param {string} charName   (unused)
 * @param {string} talentName  (unused)
 * @param {number} talentTier  1, 2, or 3
 */
export function getTalentSku(tier, charName, talentName, talentTier = 1) {
    return TALENT_SKUS[tier]?.[talentTier - 1] || null;
}

/**
 * Returns the SKU for a cosmetic (trail, kill effect, or skin).
 * @param {'trail'|'kill'|'skin'} type
 * @param {string} name  (unused)
 * @param {number} goldCost  used to determine the tier
 */
export function getCosmeticSku(type, name, goldCost) {
    if (type === 'trail')  return TRAIL_SKUS[goldCost] || null;
    if (type === 'kill')   return KILL_EFFECT_SKUS[goldCost] || null;
    if (type === 'skin')   return SKIN_SKUS[goldCost] || null;
    return null;
}