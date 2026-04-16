/**
 * SKU mapping helpers — maps in-game purchase actions to OmenX developer portal SKU IDs.
 * SKU IDs must match exactly what was registered in the OmenX developer portal.
 */

// In-game consumable SKUs
export const IN_GAME_SKUS = {
    banish:       'IG-BANISH',
    reroll:       'IG-REROLL',
    squadUltimate:'IG-SQUADULT',
    revive:       'IG-EMREVIVE',
    xpSession:    'IG-XPSESSION',
};

const TIER_PREFIX = { permanent: 'PER', weekly: 'WEE', seasonal: 'SEA' };

/**
 * Returns the SKU for a stat upgrade.
 * @param {'permanent'|'weekly'|'seasonal'} tier
 * @param {string} statId  e.g. 'damage', 'health'
 * @param {number} level   1-indexed level being purchased (currentLevel + 1)
 */
export function getStatSku(tier, statId, level) {
    const statMap = {
        damage: 'DAMA', health: 'HEAL', speed: 'SPEE',
        magnet: 'MAGN', regen: 'REGE', cooldown: 'COOL', luck: 'LUCK',
    };
    const t = tier.substring(0, 3).toUpperCase();
    const s = statMap[statId] || statId.substring(0, 4).toUpperCase();
    return `STAT-${t}-${s}-L${level}`;
}

/**
 * Returns the SKU for a weapon upgrade.
 * @param {'permanent'|'weekly'|'seasonal'} tier
 * @param {string} weaponName  e.g. 'Blaster', 'Cosmic Nap Beam'
 * @param {'damage'|'area'|'cooldown'} stat
 * @param {number} level  1-indexed
 */
export function getWeaponSku(tier, weaponName, stat, level) {
    const t = tier.substring(0, 3).toUpperCase();
    const w = weaponName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 6).toUpperCase();
    const s = stat.substring(0, 3).toUpperCase();
    return `WEAP-${t}-${w}-${s}-L${level}`;
}

/**
 * Returns the SKU for a character talent purchase.
 * @param {'permanent'|'weekly'|'seasonal'} tier
 * @param {string} charName   e.g. 'NeoByte'
 * @param {string} talentName e.g. 'Fleet Command'
 */
export function getTalentSku(tier, charName, talentName) {
    const t = tier.substring(0, 3).toUpperCase();
    const c = charName.substring(0, 4).toUpperCase();
    const ta = talentName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 6).toUpperCase();
    return `TALENT-${t}-${c}-${ta}`;
}

/**
 * Returns the SKU for a cosmetic (trail, kill effect, or skin).
 */
export function getCosmeticSku(type, name) {
    const n = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (type === 'trail') return `TRAIL-${n}`;
    if (type === 'kill') return `KILLEFF-${n}`;
    if (type === 'skin') return `SKIN-${n}`;
    return null;
}