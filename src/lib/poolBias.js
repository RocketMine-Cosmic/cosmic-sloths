// Pool Bias system — players earn 1 point per permanent upgrade level (across
// stats AND weapon upgrades) and spend them to bias the level-up upgrade pool
// toward weapons / passives / stats / evolution categories.
//
// Each category's weight multiplier = 1 + (allocatedPoints * BIAS_PER_POINT).
// Respec is refundable but costs gold OR OMENX.

export const BIAS_PER_POINT = 0.05; // +5% draw weight per point allocated to a category
export const RESPEC_COST_GOLD = 200;
export const RESPEC_COST_OMENX = 1;

export const BIAS_CATEGORIES = [
    { id: 'weapons',   label: 'Weapons',   color: 'cyan',    desc: 'Boost weapon-pickup chance' },
    { id: 'passives',  label: 'Passives',  color: 'purple',  desc: 'Boost passive-stat upgrade chance' },
    { id: 'stats',     label: 'Stats',     color: 'amber',   desc: 'Boost generic stat-up upgrades (HP, regen, armor, magnet, etc.)' },
    { id: 'evolution', label: 'Evolution', color: 'rose',    desc: 'Boost upgrades that complete a weapon evolution' },
];

// Total points the player has available is the sum of all permanent investment levels.
// Mirrors what the old PERMANENT_BIAS_PER_LEVEL used to read implicitly.
export function getTotalBiasPoints(save) {
    if (!save) return 0;
    let total = 0;
    // Permanent stat upgrades (e.g. health, speed, damage, magnet, regen, cooldown, luck)
    const stats = save.permanentUpgrades || {};
    for (const k of Object.keys(stats)) total += Number(stats[k] || 0);
    // Permanent weapon upgrades (damage / area / cooldown per weapon)
    const wpns = save.permanentWeaponUpgrades || {};
    for (const wId of Object.keys(wpns)) {
        const w = wpns[wId] || {};
        total += Number(w.damage || 0) + Number(w.area || 0) + Number(w.cooldown || 0);
    }
    // Permanent talents (1 per unlocked talent)
    const talents = save.permanentTalents || {};
    for (const cId of Object.keys(talents)) {
        const list = talents[cId];
        if (Array.isArray(list)) total += list.length;
    }
    return total;
}

export function getAllocations(save) {
    const a = save?.poolBiasAllocations || {};
    const out = {};
    for (const c of BIAS_CATEGORIES) out[c.id] = Number(a[c.id] || 0);
    return out;
}

export function getSpentPoints(save) {
    const a = getAllocations(save);
    return Object.values(a).reduce((s, v) => s + v, 0);
}

export function getRemainingPoints(save) {
    return Math.max(0, getTotalBiasPoints(save) - getSpentPoints(save));
}

// Determine which category an upgrade falls into. `EVOLUTIONS` and `SYNERGIES`
// are passed in so this stays pure / framework-agnostic and doesn't import
// game/Constants.js (which would create a circular dep risk).
export function getUpgradeCategory(upgrade, evolutions = [], playerWeapons = [], playerPassives = []) {
    if (!upgrade) return 'stats';
    if (upgrade.type === 'weapon') {
        // Treat as 'evolution' if picking this upgrade would complete an evolution
        // (player already owns the matching base weapon and the matching passive,
        // OR already owns the passive and would gain the weapon).
        const matchingEvo = evolutions.find(e =>
            (e.baseWeapon === upgrade.weaponId && playerPassives?.some(p => p.id === e.passive))
        );
        if (matchingEvo) return 'evolution';
        return 'weapons';
    }
    if (upgrade.type === 'passive') {
        // If owning this passive would complete an evolution, treat as 'evolution'.
        const matchingEvo = evolutions.find(e =>
            e.passive === upgrade.id && playerWeapons?.some(w => w.id === e.baseWeapon)
        );
        if (matchingEvo) return 'evolution';
        // Generic stat-ups vs character-flavoured passives: anything tagged as 'passive'
        // counts as 'passives'. We keep 'stats' for future use (e.g. relic-flavoured stat boosts).
        return 'passives';
    }
    return 'stats';
}

// Weight multiplier for an upgrade given the player's current allocation.
export function getBiasMultiplier(upgrade, save, evolutions = [], playerWeapons = [], playerPassives = []) {
    const cat = getUpgradeCategory(upgrade, evolutions, playerWeapons, playerPassives);
    const pts = getAllocations(save)[cat] || 0;
    return 1 + pts * BIAS_PER_POINT;
}