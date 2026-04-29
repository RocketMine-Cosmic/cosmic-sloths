// Pool Bias system — players earn points from permanent upgrades and spend
// them to bias the level-up upgrade pool toward SPECIFIC weapons or stats
// (not broad categories). Each point = +10% draw weight on that exact upgrade.
//
// Allocations are stored as a flat map { [targetId]: points }, where targetId
// is either a weapon id (e.g. 'napBeam') or a stat id (e.g. 'damageMult').

import { UPGRADES, WEAPONS } from '../game/Constants';

export const BIAS_PER_POINT = 0.10;             // +10% weight per point
export const POINTS_PER_UPGRADE = 3;            // 3 points granted per permanent upgrade level
export const RESPEC_COST_OMENX = 10;
export const GOLD_RESPEC_TIERS = [2000, 4000, 8000, 16000];

export function getGoldRespecCost(save) {
    const count = Number(save?.poolBiasGoldRespecCount || 0);
    return GOLD_RESPEC_TIERS[Math.min(count, GOLD_RESPEC_TIERS.length - 1)];
}

// Build a list of bias-able targets from the upgrade pool itself so this stays
// in sync if UPGRADES/WEAPONS change.
function buildTargets() {
    const stats = [];
    const seenStats = new Set();
    const STAT_LABELS = {
        damageMult:    { label: 'Damage',          icon: '⚔️' },
        speedMult:     { label: 'Move Speed',      icon: '🏃' },
        maxHp:         { label: 'Max HP',          icon: '❤️' },
        areaMult:      { label: 'Area of Effect',  icon: '💫' },
        cooldownMult:  { label: 'Cooldown',        icon: '⏱️' },
        magnetRange:   { label: 'Pickup Range',    icon: '🧲' },
        regen:         { label: 'HP Regen',        icon: '🌿' },
        armor:         { label: 'Armor',           icon: '🛡️' },
        goldMult:      { label: 'Gold Drops',      icon: '💰' },
        projSpeedMult: { label: 'Projectile Speed',icon: '🚀' },
        xpMult:        { label: 'XP Gain',         icon: '🧠' },
    };
    for (const u of UPGRADES) {
        if (u.type === 'passive' && u.stat && !seenStats.has(u.stat)) {
            seenStats.add(u.stat);
            const meta = STAT_LABELS[u.stat] || { label: u.stat, icon: '✦' };
            stats.push({ id: u.stat, kind: 'stat', label: meta.label, icon: meta.icon });
        }
    }

    const weapons = [];
    const seenWpns = new Set();
    for (const u of UPGRADES) {
        if (u.type === 'weapon' && u.weaponId && !seenWpns.has(u.weaponId)) {
            seenWpns.add(u.weaponId);
            const w = WEAPONS[u.weaponId];
            weapons.push({ id: u.weaponId, kind: 'weapon', label: w?.name || u.weaponId, icon: '🔫' });
        }
    }
    return { stats, weapons };
}

let _cachedTargets = null;
export function getBiasTargets() {
    if (!_cachedTargets) _cachedTargets = buildTargets();
    return _cachedTargets;
}

// Total points = (sum of permanent stat upgrade levels + permanent weapon upgrade levels + permanent talents) * POINTS_PER_UPGRADE
export function getTotalBiasPoints(save) {
    if (!save) return 0;
    let levels = 0;
    const stats = save.permanentUpgrades || {};
    for (const k of Object.keys(stats)) levels += Number(stats[k] || 0);
    const wpns = save.permanentWeaponUpgrades || {};
    for (const wId of Object.keys(wpns)) {
        const w = wpns[wId] || {};
        levels += Number(w.damage || 0) + Number(w.area || 0) + Number(w.cooldown || 0);
    }
    const talents = save.permanentTalents || {};
    for (const cId of Object.keys(talents)) {
        const list = talents[cId];
        if (Array.isArray(list)) levels += list.length;
    }
    return levels * POINTS_PER_UPGRADE;
}

export function getAllocations(save) {
    return save?.poolBiasAllocations || {};
}

export function getSpentPoints(save) {
    const a = getAllocations(save);
    let total = 0;
    for (const k of Object.keys(a)) total += Number(a[k] || 0);
    return total;
}

export function getRemainingPoints(save) {
    return Math.max(0, getTotalBiasPoints(save) - getSpentPoints(save));
}

// Resolve which target id (if any) an upgrade matches.
export function getUpgradeTargetId(upgrade) {
    if (!upgrade) return null;
    if (upgrade.type === 'weapon' && upgrade.weaponId) return upgrade.weaponId;
    if (upgrade.type === 'passive' && upgrade.stat) return upgrade.stat;
    return null;
}

// Weight multiplier for an upgrade given the player's current allocation.
// Unused params kept for backwards-compatible call site signature.
export function getBiasMultiplier(upgrade, save /*, evolutions, playerWeapons, playerPassives */) {
    const targetId = getUpgradeTargetId(upgrade);
    if (!targetId) return 1;
    const pts = Number(getAllocations(save)[targetId] || 0);
    return 1 + pts * BIAS_PER_POINT;
}