// Level-up, upgrade choices, synergies, and evolutions extracted from GameEngine.
import { UPGRADES, WEAPONS, SYNERGIES, EVOLUTIONS } from './Constants';
import { SFXManager } from './SFXManager';
import { SaveManager } from './SaveManager';
import { getBiasMultiplier } from '@/lib/poolBias';
import { getWeaponLevelUpEffect } from './WeaponLevelEffects';

// Pool weight is now driven by the player's allocated bias points (Loadouts page).
// See lib/poolBias.js for the math + category mapping.
function getUpgradeWeight(upgrade, save, characterId, playerWeapons, playerPassives) {
    return getBiasMultiplier(upgrade, save, EVOLUTIONS, playerWeapons, playerPassives);
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
    const rarities = [
        { name: 'Common', mult: 1, weight: 60 },
        { name: 'Rare', mult: 1.5, weight: 25 },
        { name: 'Epic', mult: 2, weight: 10 },
        { name: 'Legendary', mult: 3, weight: 5 }
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
    // is biased by the points the player allocated on the Loadouts page.
    const weights = pool.map(u => getUpgradeWeight(u, engine.save, engine.characterId, engine.player.weapons, engine.player.passives));

    for (let i = 0; i < 3; i++) {
        if (pool.length === 0) break;
        const baseUpgrade = weightedPickAndRemove(pool, weights);

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
            newValue = rarity.mult;
            // If the player already owns this weapon, this pick LEVELS it up — show what
            // the level-up actually does (damage/area scaling + per-weapon extras like
            // "+1 drone every 2 levels"). Otherwise it's a fresh weapon, so keep the
            // base description that explains what the weapon is.
            const owned = !!engine.player.weapons.find(w => w.id === baseUpgrade.weaponId);
            if (owned) {
                const effect = getWeaponLevelUpEffect(baseUpgrade.weaponId);
                newDesc = `+${rarity.mult} Level${rarity.mult > 1 ? 's' : ''} — ${effect}`;
            } else {
                newDesc = `${baseUpgrade.desc} (Starts at Lv.${rarity.mult})`;
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
    return choices;
}

export function applyUpgrade(engine, upgrade) {
    if (upgrade.type === 'passive') {
        const maxLevel = 5;
        const existingCount = engine.player.passives.filter(p => p.id === upgrade.id).length;
        if (existingCount >= maxLevel) return;

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
        checkSynergies(engine);
    }
    engine.isPaused = false;
}

export function checkSynergies(engine) {
    for (const synergy of SYNERGIES) {
        const w1 = engine.player.weapons.find(w => w.id === synergy.weapon1);
        const w2 = engine.player.weapons.find(w => w.id === synergy.weapon2);

        if (w1 && w2) {
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

export function checkEvolutions(engine) {
    for (const evolution of EVOLUTIONS) {
        const baseWeapon = engine.player.weapons.find(w => w.id === evolution.baseWeapon);
        const passive = engine.player.passives.find(p => p.id === evolution.passive);

        if (baseWeapon && passive) {
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