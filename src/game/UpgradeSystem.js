// Level-up, upgrade choices, synergies, and evolutions extracted from GameEngine.
import { UPGRADES, WEAPONS, SYNERGIES, EVOLUTIONS } from './Constants';
import { SFXManager } from './SFXManager';
import { SaveManager } from './SaveManager';
import { getBiasMultiplier } from '@/lib/poolBias';
import { getWeaponLevelUpEffect } from './WeaponLevelEffects';
import { isS6OrLater } from '@/lib/seasonGate';

// S6+ "Overcharge" filler picks — used once the normal upgrade pool is
// exhausted (max passives + all weapons owned + banished). These bypass the
// usual passive cap so endless players past 20 minutes still get meaningful
// picks instead of hundreds of identical "+25 HP" options. Each pick stacks
// indefinitely. Values match the magnitude of normal Common-rarity passives —
// rarity scaling in generateChoices() multiplies them up to 3× for Legendary.
const OVERCHARGE_FILLERS = [
    { id: 'oc_dmg',    name: 'Overcharge: Damage',     desc: '+3% Damage (uncapped)',         type: 'passive', stat: 'damageMult',   value: 0.03 },
    { id: 'oc_armor',  name: 'Reinforced Plating',     desc: '+1 Armor (uncapped)',           type: 'passive', stat: 'armor',        value: 1 },
    { id: 'oc_hp',     name: 'Vital Surge',            desc: '+30 Max HP (uncapped)',         type: 'passive', stat: 'maxHp',        value: 30 },
    { id: 'oc_cd',     name: 'Adrenaline Injector',    desc: '-2% Cooldown (uncapped)',       type: 'passive', stat: 'cooldownMult', value: -0.02 },
    { id: 'oc_gold',   name: 'Scavenger Protocol',     desc: '+5% Gold (uncapped)',           type: 'passive', stat: 'goldMult',     value: 0.05 },
    { id: 'oc_luck',   name: 'Lucky Find',             desc: '+1 Luck (uncapped)',            type: 'passive', stat: 'luck',         value: 1 },
];

// S6+ — hard cap on simultaneously equipped weapons. Industry standard for the
// vampire-survivors-likes (VS / Brotato / Halls of Torment all use 6). Past 6,
// frame rate dies on mobile, screen clutter blocks vision, and DPS dilutes
// because none of the weapons get leveled. Once at the cap, the level-up pool
// only offers level-ups for weapons the player already owns. Synergies (2→1)
// free up a slot; evolutions are in-place. Players carrying 7+ from S5/early-S6
// are grandfathered — they keep what they have but can't add an 8th.
export const WEAPON_SLOT_CAP = 6;

// Pool weight is now driven by the player's allocated bias points (Loadouts page).
// See lib/poolBias.js for the math + category mapping.
function getUpgradeWeight(upgrade, save, characterId, playerWeapons, playerPassives) {
    return getBiasMultiplier(upgrade, save, EVOLUTIONS, playerWeapons, playerPassives);
}

// S6+ silent autobalance — soft-corrects the level-up pool toward a balanced
// loadout. ~45% of the raw pool is weapons (9 of 20 picks), so a player with 1
// passive and 4 weapons would otherwise keep drowning in weapon offers. This
// multiplier is layered on top of the player's allocated bias (which can still
// dominate at 5–10× for dedicated builds), so it's a quality-of-life floor for
// the 80% of players who don't engage with bias allocation.
//
// Evolutions are EXEMPT — they're rare game-changing weapon-type picks and we
// shouldn't penalise them for being weapons.
//
//   ≥4 weapons + ≤2 passives → weapons 0.6×, passives 1.6× (push toward passives)
//   ≤2 weapons + ≥3 passives → weapons 1.4×, passives 1.0× (push toward weapons)
//   otherwise                → 1.0× (no nudge)
function getRebalanceMultiplier(upgrade, playerWeapons, playerPassives) {
    if (!isS6OrLater()) return 1;
    // Distinct passives owned (each upgrade.id can stack to MAX_PASSIVE_LEVEL).
    const distinctPassives = new Set((playerPassives || []).map(p => p.id)).size;
    const weaponCount = (playerWeapons || []).length;

    // Evolutions never get penalised/boosted by autobalance.
    const isEvolution = upgrade.type === 'weapon' &&
        EVOLUTIONS.some(e => e.evolvedWeapon === upgrade.weaponId);
    if (isEvolution) return 1;

    if (weaponCount >= 4 && distinctPassives <= 2) {
        if (upgrade.type === 'weapon') return 0.6;
        if (upgrade.type === 'passive') return 1.6;
    } else if (weaponCount <= 2 && distinctPassives >= 3) {
        if (upgrade.type === 'weapon') return 1.4;
    }
    return 1;
}

// Pick + remove a random item from `pool` using `weights` (parallel array). Returns the item.
function weightedPickAndRemove(pool, weights) {
    let total = 0;
    for (let i = 0; i < weights.length; i++) total += weights[i];
    let roll = Math.random() * total;
    for (let i = 0; i < pool.length; i++) {
        roll -= weights[i];
        if (roll <= 0) {
            const item = pool[i];
            pool.splice(i, 1);
            weights.splice(i, 1);
            return item;
        }
    }
    // Fallback (shouldn't happen unless total is 0)
    const idx = pool.length - 1;
    const item = pool[idx];
    pool.splice(idx, 1);
    weights.splice(idx, 1);
    return item;
}

export function levelUp(engine) {
    engine.xp -= engine.xpRequired;
    engine.level++;
    engine.xpRequired = Math.floor(engine.xpRequired * 1.15 + 25);

    engine.player.maxHp = Math.min(2000, Math.floor(engine.player.maxHp * 1.01));
    engine.player.damageMult = Math.min(5.0, engine.player.damageMult + 0.01);
    engine.player.armor = Math.min(30, engine.player.armor + 0.1);
    engine.player.hp = Math.min(engine.player.maxHp, engine.player.hp + (engine.player.maxHp * 0.15));
    engine.callbacks.onHpChange(engine.player.hp, engine.player.maxHp);

    if (engine.player.charAugments?.includes('sky_ace')) {
        engine.player.invincibleTimer = Math.max(engine.player.invincibleTimer || 0, 3.0);
        engine.player.iFrames = Math.max(engine.player.iFrames || 0, 3.0);
        engine.addDamageText(engine.player.x, engine.player.y - 40, "ACE MANEUVER", '#00D4FF');
    }
    if (engine.player.charAugments?.includes('syn_amp')) {
        engine.player.synAmpTimer = 5.0;
    }

    engine.isPaused = true;

    if (engine.time > 0.5 && engine.arena.id !== 'world_boss_arena') {
        SFXManager.playLevelUp();
        engine.particleManager.createLevelUp(engine.player.x, engine.player.y);
    }

    engine.callbacks.onLevelUp(generateChoices(engine));
}

export function generateChoices(engine) {
    // S6+ — weapon picks now use a dedicated `weaponLevels` field so the rarity
    // tier feels actually special (Common +1, Rare +2, Epic +3, Legendary +5).
    // Old behaviour reused `mult` for both passive scaling and weapon levels,
    // which gave Rare = 1.5 → truncated to 1 (identical to Common) and made
    // Legendary feel barely different from Epic. S5 keeps the legacy values.
    const s6Weapons = isS6OrLater();
    const rarities = [
        { name: 'Common',    mult: 1,   weight: 60, weaponLevels: s6Weapons ? 1 : 1 },
        { name: 'Rare',      mult: 1.5, weight: 25, weaponLevels: s6Weapons ? 2 : 1 },
        { name: 'Epic',      mult: 2,   weight: 10, weaponLevels: s6Weapons ? 3 : 2 },
        { name: 'Legendary', mult: 3,   weight: 5,  weaponLevels: s6Weapons ? 5 : 3 }
    ];

    const getRarity = () => {
        const roll = Math.random() * 100;
        let sum = 0;
        for (const r of rarities) {
            sum += r.weight;
            if (roll <= sum) return r;
        }
        return rarities[0];
    };

    const MAX_PASSIVE_LEVEL = 5;
    const isEndless = engine.arena?.duration === Infinity;
    const isRaid = engine.arena?.id === 'world_boss_arena';
    // S6+ weapon-slot cap: once at/over the cap, the pool stops offering NEW
    // weapons. Existing weapons can still be leveled. Cap is checked dynamically
    // because synergies (2→1) reduce slot count mid-run.
    const enforceWeaponCap = isS6OrLater() && engine.player.weapons.length >= WEAPON_SLOT_CAP;
    const choices = [];
    const pool = [...UPGRADES].filter(u => {
        if (engine.banishedUpgrades.has(u.id)) return false;
        if (u.characterSpecific && u.characterSpecific !== engine.characterId) return false;
        // Endless caps gold at 5k and regular enemies don't drop gold —
        // gold-multiplier upgrades are useless here, so hide them from the level-up pool.
        if (isEndless && u.stat === 'goldMult') return false;
        // Global Raid: no pickups drop and there are no XP/gold rewards in-run, so
        // pickup-range, XP, gold upgrades are wastes. Bouncing Blade also wastes
        // shots ricocheting into empty space against a single boss.
        if (isRaid) {
            if (u.stat === 'magnetRange' || u.stat === 'xpMult' || u.stat === 'goldMult') return false;
            if (u.type === 'weapon' && u.weaponId === 'bouncingBlade') return false;
        }
        if (u.type === 'passive') {
            const currentCount = engine.player.passives.filter(p => p.id === u.id).length;
            if (currentCount >= MAX_PASSIVE_LEVEL) return false;
        }
        if (u.type === 'weapon') {
            const existing = engine.player.weapons.find(w => w.id === u.weaponId);
            if (existing && existing.level >= 20) return false;
            // S6+ slot cap — once at 6/6 weapons, only allow level-ups for owned weapons.
            if (enforceWeaponCap && !existing) return false;
            // Block base weapons whose evolved form the player already owns —
            // otherwise re-rolling the base weapon would let it evolve a second time
            // with the same passive (Hugo bug 2026-05-02).
            const evo = EVOLUTIONS.find(e => e.baseWeapon === u.weaponId);
            if (evo && engine.player.weapons.some(w => w.id === evo.evolvedWeapon)) return false;
            // Same protection for synergies — block base components if their synergy
            // result is already owned, so re-rolling can't fuse the synergy a 2nd time.
            const syn = SYNERGIES.find(s => (s.weapon1 === u.weaponId || s.weapon2 === u.weaponId));
            if (syn && engine.player.weapons.some(w => w.id === syn.result)) return false;
        }
        return true;
    });
    // Weighted draw: each upgrade's category (weapons / passives / stats / evolution)
    // is biased by the points the player allocated on the Loadouts page, then
    // softly nudged by the S6+ autobalance multiplier (no-op on S5).
    const weights = pool.map(u => {
        const base = getUpgradeWeight(u, engine.save, engine.characterId, engine.player.weapons, engine.player.passives);
        const rebalance = getRebalanceMultiplier(u, engine.player.weapons, engine.player.passives);
        return base * rebalance;
    });

    for (let i = 0; i < 3; i++) {
        if (pool.length === 0) break;
        const baseUpgrade = weightedPickAndRemove(pool, weights);
        if (!baseUpgrade) break;

        const rarity = getRarity();
        const uniqueName = `${engine.player.name}'s ${baseUpgrade.name}`;

        let newValue = baseUpgrade.value;
        let newDesc = baseUpgrade.desc;

        if (baseUpgrade.type === 'passive') {
            newValue = baseUpgrade.value * rarity.mult;
            newDesc = baseUpgrade.desc.replace(/[0-9]+(\.[0-9]+)?/, (match) => {
                const num = parseFloat(match);
                return Number.isInteger(num * rarity.mult) ? (num * rarity.mult).toString() : (num * rarity.mult).toFixed(1);
            });
        } else if (baseUpgrade.type === 'weapon') {
            // Use the rarity's dedicated weapon-level count (S6+ tier amplifies
            // Rare/Legendary; S5 keeps legacy values). applyUpgrade reads
            // `value` as the level increment.
            const levels = rarity.weaponLevels || 1;
            newValue = levels;
            // If the player already owns this weapon, this pick LEVELS it up — show what
            // the level-up actually does (damage/area scaling + per-weapon extras like
            // "+1 drone every 2 levels"). Otherwise it's a fresh weapon, so keep the
            // base description that explains what the weapon is.
            const owned = !!engine.player.weapons.find(w => w.id === baseUpgrade.weaponId);
            if (owned) {
                const effect = getWeaponLevelUpEffect(baseUpgrade.weaponId);
                newDesc = `+${levels} Level${levels > 1 ? 's' : ''} — ${effect}`;
            } else {
                newDesc = `${baseUpgrade.desc} (Starts at Lv.${levels})`;
            }
        }

        choices.push({
            ...baseUpgrade,
            name: uniqueName,
            desc: newDesc,
            value: newValue,
            rarity: rarity.name
        });
    }

    // Pool exhausted (max passives + all weapons owned + banished). Without this
    // the modal renders blank and the player gets stuck (Hugo bug 2026-05-06).
    //
    // S6+: fill remaining slots with rotating "Overcharge" stat boosters that
    // ignore the normal passive cap — late-run endless players were getting
    // spammed with a single +25 HP option for hundreds of level-ups, which
    // killed engagement past the 20-min mark. Each filler is uncapped so they
    // stack indefinitely. Rarity is rolled the same way the main pool does.
    // S5 keeps the legacy single-option behaviour so learned strategies survive.
    if (choices.length < 3) {
        const isS6 = isS6OrLater();
        const fillerPool = isS6 ? OVERCHARGE_FILLERS : [{
            id: 'consolation_hp',
            name: 'Emergency Repair Kit',
            desc: '+25 Max HP (no upgrades left in pool)',
            type: 'passive',
            stat: 'maxHp',
            value: 25,
        }];
        while (choices.length < 3) {
            const base = fillerPool[Math.floor(Math.random() * fillerPool.length)];
            const rarity = isS6 ? getRarity() : { name: 'Common', mult: 1 };
            const scaledValue = base.value * rarity.mult;
            const scaledDesc = base.desc.replace(/[0-9]+(\.[0-9]+)?/, (match) => {
                const num = parseFloat(match);
                const scaled = num * rarity.mult;
                return Number.isInteger(scaled) ? scaled.toString() : scaled.toFixed(1);
            });
            choices.push({
                ...base,
                desc: scaledDesc,
                value: scaledValue,
                rarity: rarity.name,
            });
        }
    }
    return choices;
}

export function applyUpgrade(engine, upgrade) {
    if (upgrade.type === 'passive') {
        // Overcharge fillers (S6+ pool-exhausted picks) bypass the 5-stack cap by
        // design — they're the late-game progression path once the normal pool
        // is exhausted. Their ids are namespaced 'oc_*' so they're easy to spot.
        const isOvercharge = typeof upgrade.id === 'string' && upgrade.id.startsWith('oc_');
        const maxLevel = 5;
        if (!isOvercharge) {
            const existingCount = engine.player.passives.filter(p => p.id === upgrade.id).length;
            if (existingCount >= maxLevel) return;
        }

        engine.player[upgrade.stat] += upgrade.value;
        if (upgrade.stat === 'maxHp') {
            engine.player.hp += upgrade.value;
            engine.callbacks.onHpChange(engine.player.hp, engine.player.maxHp);
        }
        engine.player.passives.push(upgrade);
        if (engine.checkEvolutions) engine.checkEvolutions();
    } else if (upgrade.type === 'weapon') {
        const levelIncrement = upgrade.value || 1;

        // If the player already owns this raw weapon, level it (and re-check synergies).
        // If not, add it as a fresh slot — even if it's a component of an active synergy
        // already, so the player can combine it with another weapon to form a NEW synergy
        // (e.g. having Flaming Lash shouldn't lock napalm out of Burning Barrier).
        const existing = engine.player.weapons.find(w => w.id === upgrade.weaponId);
        if (existing) {
            existing.level = Math.min(20, existing.level + levelIncrement);
        } else {
            engine.player.weapons.push({ ...WEAPONS[upgrade.weaponId], level: Math.min(20, levelIncrement), timer: 0 });
        }
        // CHECK EVOLUTIONS FIRST. Otherwise a synergy can consume the base weapon
        // before its evolution has a chance to fire (Hugo bug 2026-05-02 — picked up
        // napBeam with Spatial Expander already owned, but napBeam+drones synergy'd
        // into Orbital Lasers and the Supernova Beam evolution never happened).
        if (engine.checkEvolutions) engine.checkEvolutions();
        checkSynergies(engine);
    }
    engine.isPaused = false;
}

export function checkSynergies(engine) {
    for (const synergy of SYNERGIES) {
        const w1 = engine.player.weapons.find(w => w.id === synergy.weapon1);
        const w2 = engine.player.weapons.find(w => w.id === synergy.weapon2);

        // Belt-and-braces: if the synergy result is somehow already owned (e.g. stale
        // pre-cached choices that picked napBeam after a previous synergy fired), skip
        // — otherwise a second Orbital Lasers gets stacked on top of the existing one.
        const alreadyHasResult = engine.player.weapons.some(w => w.id === synergy.result);
        if (w1 && w2 && !alreadyHasResult) {
            engine.player.weapons = engine.player.weapons.filter(w => w.id !== synergy.weapon1 && w.id !== synergy.weapon2);

            const newLevel = Math.min(20, Math.max(w1.level, w2.level) + 1);
            engine.player.weapons.push({ ...WEAPONS[synergy.result], level: newLevel, timer: 0 });

            engine.addDamageText(engine.player.x, engine.player.y - 40, "SYNERGY FORMED!", '#ff00ff');

            // Dispatch a UI event so the SynergyBanner can show a celebratory toast
            // naming the new weapon and the components that fused. Pure UI signal.
            try {
                const newName = WEAPONS[synergy.result]?.name || 'Synergy';
                const fromNames = [WEAPONS[synergy.weapon1]?.name, WEAPONS[synergy.weapon2]?.name].filter(Boolean);
                window.dispatchEvent(new CustomEvent('synergyFormed', { detail: { name: newName, from: fromNames } }));
            } catch (_) {}

            if (!engine.save.discoveredSynergies) engine.save.discoveredSynergies = [];
            if (!engine.save.discoveredSynergies.includes(synergy.result)) {
                engine.save.discoveredSynergies.push(synergy.result);
                SaveManager.save(engine.save);
            }

            checkSynergies(engine);
            break;
        }
    }
    if (engine.checkEvolutions) engine.checkEvolutions();
}

// S6+ — evolutions require the base weapon to be at least level 8 before they
// fire. Without this, picking the matching passive at level 1 silently evolves
// the weapon, which feels accidental rather than earned. Genre standard
// (Vampire Survivors, Halls of Torment) gates evolution behind weapon mastery.
// S5 keeps the legacy "evolve immediately" behaviour so players who learned the
// old rules aren't surprised mid-season.
export const EVOLUTION_MIN_BASE_LEVEL = 8;

export function checkEvolutions(engine) {
    const requireMinLevel = isS6OrLater();
    for (const evolution of EVOLUTIONS) {
        const baseWeapon = engine.player.weapons.find(w => w.id === evolution.baseWeapon);
        const passive = engine.player.passives.find(p => p.id === evolution.passive);

        if (baseWeapon && passive && (!requireMinLevel || baseWeapon.level >= EVOLUTION_MIN_BASE_LEVEL)) {
            engine.player.weapons = engine.player.weapons.filter(w => w.id !== evolution.baseWeapon);
            engine.player.weapons.push({ ...WEAPONS[evolution.evolvedWeapon], level: baseWeapon.level, timer: 0 });
            engine.addDamageText(engine.player.x, engine.player.y - 40, "WEAPON EVOLVED!", '#ff4500');

            try {
                const newName = WEAPONS[evolution.evolvedWeapon]?.name || 'Evolved Weapon';
                // Resolve the passive's friendly display name (e.g. 'cd_down' → 'Quantum Accelerator')
                // so the evolution banner doesn't show raw backend ids. Hugo bug 2026-04-30.
                const passiveName = UPGRADES.find(u => u.id === evolution.passive)?.name || evolution.passive;
                const fromNames = [WEAPONS[evolution.baseWeapon]?.name, passiveName].filter(Boolean);
                window.dispatchEvent(new CustomEvent('weaponEvolved', { detail: { name: newName, from: fromNames } }));
            } catch (_) {}

            // Track evolution discovery in the player's save (mirrors how synergies are recorded).
            if (!engine.save.discoveredEvolutions) engine.save.discoveredEvolutions = [];
            if (!engine.save.discoveredEvolutions.includes(evolution.evolvedWeapon)) {
                engine.save.discoveredEvolutions.push(evolution.evolvedWeapon);
                SaveManager.save(engine.save);
            }

            checkEvolutions(engine);
            break;
        }
    }
}