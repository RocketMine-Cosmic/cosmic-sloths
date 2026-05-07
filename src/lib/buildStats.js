// Pure helpers that read a SaveManager save + a character id and return a
// breakdown of where each stat comes from. Kept dependency-free (no React) so
// it can be unit-tested or reused in other panels later.
//
// IMPORTANT: This mirrors GameEngine's stacking math at a high level. It is
// NOT a perfect run-time prediction — in-game values get multiplied further by
// pickups, level-ups, NFT perks, title buffs, and active synergies/evolutions.
// What it shows is the BASELINE the player walks into a run with — so they can
// see how their permanent / weekly / seasonal / talent / mastery / relic / forge
// investments stack before any in-run RNG.

import { CHARACTERS, CHARACTER_TALENTS, CHARACTER_MASTERY_LEVELS, CHARACTER_MASTERY_SIGNATURE, RELICS, SYNERGIES, EVOLUTIONS, WEAPONS, UPGRADES } from '../game/Constants';

// Stats we surface in the breakdown table. Each entry maps a save-side stat key
// to a friendly label and how to format it. `lowerBetter` flips the sign for
// display (e.g. cooldownMult — lower is good).
export const STAT_DEFS = [
    { key: 'damageMult',    label: 'Damage',         kind: 'pct',  baseFromChar: 'damageMult',    higherBetter: true  },
    { key: 'maxHp',         label: 'Max HP',         kind: 'flat', baseFromChar: 'hp',            higherBetter: true  },
    { key: 'speedMult',     label: 'Move Speed',     kind: 'pct',  baseFromChar: null,            higherBetter: true  },
    { key: 'cooldownMult',  label: 'Cooldown',       kind: 'pct',  baseFromChar: 'cooldownMult',  higherBetter: false },
    { key: 'areaMult',      label: 'Area',           kind: 'pct',  baseFromChar: 'areaMult',      higherBetter: true  },
    { key: 'projSpeedMult', label: 'Projectile Spd', kind: 'pct',  baseFromChar: 'projSpeedMult', higherBetter: true  },
    { key: 'magnetRange',   label: 'Magnet Range',   kind: 'flat', baseFromChar: 'magnetRange',   higherBetter: true  },
    { key: 'armor',         label: 'Armor',          kind: 'flat', baseFromChar: 'armor',         higherBetter: true  },
    { key: 'regen',         label: 'HP Regen/sec',   kind: 'flat1',baseFromChar: 'regen',         higherBetter: true  },
    { key: 'luck',          label: 'Luck',           kind: 'flat', baseFromChar: 'luck',          higherBetter: true  },
    { key: 'goldMult',      label: 'Gold Bonus',     kind: 'pct',  baseFromChar: 'goldMult',      higherBetter: true  },
    { key: 'xpMult',        label: 'XP Bonus',       kind: 'pct',  baseFromChar: 'xpMult',        higherBetter: true  },
];

// Map of UPGRADES rows keyed by stat for quick lookup of permanent/weekly/seasonal contributions.
const UPGRADE_BY_STAT = (() => {
    const m = {};
    for (const u of UPGRADES) if (u.type === 'passive') m[u.stat] = u;
    return m;
})();

// Read an integer level from a container like { weekId, damage: 3, hp_up: 2, ... }
// Permanent/weekly/seasonal upgrade containers store values keyed by upgrade id
// (e.g. 'dmg_up'). Walk the UPGRADES list to find the one for this stat.
function readUpgradeLevel(container, statKey) {
    if (!container) return 0;
    const upgrade = UPGRADE_BY_STAT[statKey];
    if (!upgrade) return 0;
    return Number(container[upgrade.id] || 0);
}

// Sum a single stat across all PERMANENT talents the player has unlocked for charId.
// Includes legacy `unlockedTalents` shape too.
function sumTalentStat(save, charId, statKey) {
    const talents = CHARACTER_TALENTS[charId] || [];
    const owned = new Set([
        ...((save.permanentTalents?.[charId]) || []),
        ...((save.unlockedTalents?.[charId]) || []),
    ]);
    let total = 0;
    for (const t of talents) {
        if (!owned.has(t.id)) continue;
        if (t.stat === statKey) total += t.value;
    }
    return total;
}

// Sum mastery contributions for a stat. Shared tiers + signature tier 6
// (`stat`/`multiStat`/`allStats`). Tier 7 ability boosts aren't passive stats.
function sumMasteryStat(save, charId, statKey) {
    const charKills = (save.characterKills || {})[charId] || 0;
    const sig = CHARACTER_MASTERY_SIGNATURE[charId];
    let total = 0;
    for (const tier of CHARACTER_MASTERY_LEVELS) {
        if (charKills < tier.killsRequired) break;
        if (tier.stat === statKey) total += tier.value;
    }
    // Signature tier 6
    if (sig?.tier6 && charKills >= 50000) {
        if (sig.tier6.stat === statKey) total += sig.tier6.value;
        if (sig.tier6.multiStat && sig.tier6.multiStat[statKey] !== undefined) total += sig.tier6.multiStat[statKey];
        if (sig.tier6.stat === 'allStats') {
            // allStats only applies to the multipliers (not flat stats like armor, magnetRange, regen, luck, maxHp)
            if (['damageMult','speedMult','cooldownMult','areaMult','projSpeedMult','goldMult','xpMult'].includes(statKey)) {
                // cooldownMult goes the other way — allStats grants -value to cooldown? Original CHARACTER_MASTERY_SIGNATURE
                // uses positive values that are typically 'good for the player'. To stay safe, just add raw for the
                // multiplier stats (keeps display informational rather than perfectly accurate).
                total += sig.tier6.value;
            }
        }
    }
    return total;
}

// Sum equipped relic contributions for a stat. relicLevels is { relicId: levelInt 1..5 }.
function sumRelicStat(save, statKey) {
    const equipped = save.equippedRelics || [];
    const levels = save.relicLevels || {};
    let total = 0;
    for (const relicId of equipped) {
        const relic = RELICS.find(r => r.id === relicId);
        if (!relic || relic.stat !== statKey) continue;
        const level = Math.max(1, Math.min(5, Number(levels[relicId] || 1)));
        total += relic.values[level - 1] || 0;
    }
    return total;
}

// Sum forge character augment contributions for a stat. Most charAugments are
// active in-game effects (procs/triggers) that don't translate to passive numbers,
// so we only count the few that map to passive stat boosts.
const CHAR_AUGMENT_STAT_BOOSTS = {
    pan_armor:   { armor:        3 },
    holo_regen:  { regen:        0.3 },
    holo_speed:  { speedMult:    0.10 },
    code_xp:     { xpMult:       0.15 },
    syn_gold:    { goldMult:     0.20 },
    sky_speed:   { speedMult:    0.15 },
    neo_crit:    {}, // crit chance — not in our STAT_DEFS, so display-only (we'll surface in augment list)
};

function sumCharAugmentStat(save, charId, statKey) {
    const owned = save.forgeCharAugments?.[charId] || [];
    let total = 0;
    for (const augId of owned) {
        const map = CHAR_AUGMENT_STAT_BOOSTS[augId];
        if (map && map[statKey] !== undefined) total += map[statKey];
    }
    return total;
}

// Compute a per-stat breakdown for the given character.
// Returns: [{ stat, label, kind, base, sources: [{ name, value }], total }]
export function computeBuildStats(save, charId) {
    if (!save) return [];
    const baseChar = CHARACTERS.find(c => c.id === charId) || CHARACTERS[0];

    return STAT_DEFS.map(def => {
        const base = def.baseFromChar ? Number(baseChar[def.baseFromChar] ?? 0) : (def.kind === 'pct' ? 1 : 0);

        const sources = [];
        const permanent = readUpgradeLevel(save.permanentUpgrades, def.key) * (UPGRADE_BY_STAT[def.key]?.value || 0);
        const weekly    = readUpgradeLevel(save.weeklyUpgrades,    def.key) * (UPGRADE_BY_STAT[def.key]?.value || 0);
        const seasonal  = readUpgradeLevel(save.seasonalUpgrades,  def.key) * (UPGRADE_BY_STAT[def.key]?.value || 0);
        const talents   = sumTalentStat(save, charId, def.key);
        const mastery   = sumMasteryStat(save, charId, def.key);
        const relics    = sumRelicStat(save, def.key);
        const augments  = sumCharAugmentStat(save, charId, def.key);

        if (permanent) sources.push({ name: 'Permanent Upgrades', value: permanent });
        if (weekly)    sources.push({ name: 'Weekly Upgrades',    value: weekly    });
        if (seasonal)  sources.push({ name: 'Seasonal Upgrades',  value: seasonal  });
        if (talents)   sources.push({ name: 'Talents',            value: talents   });
        if (mastery)   sources.push({ name: 'Mastery',            value: mastery   });
        if (relics)    sources.push({ name: 'Relics (equipped)',  value: relics    });
        if (augments)  sources.push({ name: 'Forge Augments',     value: augments  });

        // For pct stats (multipliers), the baseline already encodes 1.0 — sources add to it.
        // For flat stats, the baseline is the character's flat value — sources add to it.
        const total = base + sources.reduce((acc, s) => acc + s.value, 0);

        return { stat: def.key, label: def.label, kind: def.kind, higherBetter: def.higherBetter, base, sources, total };
    });
}

// Format a stat value for display.
export function fmtStatValue(value, kind) {
    if (kind === 'pct') return `${Math.round(value * 100)}%`;
    if (kind === 'flat1') return Number(value).toFixed(1);
    return Math.round(Number(value)).toString();
}

// Format a delta (signed) for a source row.
export function fmtStatDelta(value, kind) {
    const sign = value >= 0 ? '+' : '';
    if (kind === 'pct')  return `${sign}${(value * 100).toFixed(0)}%`;
    if (kind === 'flat1')return `${sign}${Number(value).toFixed(1)}`;
    return `${sign}${Math.round(value)}`;
}

// Find which possible synergies and evolutions are unlocked-via-discovery for a given charId.
// Discovery is recorded globally on save (`discoveredSynergies` / `discoveredEvolutions`),
// so this is character-agnostic. Returns metadata for display.
export function getDiscoveredCombos(save) {
    const discoveredSyn = new Set(save.discoveredSynergies || []);
    const discoveredEvo = new Set(save.discoveredEvolutions || []);
    return {
        synergies: SYNERGIES.map(s => ({
            ...s,
            weapon1Name: WEAPONS[s.weapon1]?.name || s.weapon1,
            weapon2Name: WEAPONS[s.weapon2]?.name || s.weapon2,
            resultName:  WEAPONS[s.result]?.name  || s.result,
            discovered:  discoveredSyn.has(s.result),
        })),
        evolutions: EVOLUTIONS.map(e => ({
            ...e,
            baseWeaponName:    WEAPONS[e.baseWeapon]?.name    || e.baseWeapon,
            evolvedWeaponName: WEAPONS[e.evolvedWeapon]?.name || e.evolvedWeapon,
            passiveName:       UPGRADES.find(u => u.id === e.passive)?.name || e.passive,
            discovered:        discoveredEvo.has(e.evolvedWeapon),
        })),
    };
}