// Level-up, upgrade choices, synergies, and evolutions extracted from GameEngine.
import { UPGRADES, WEAPONS, SYNERGIES, EVOLUTIONS, CHARACTER_TALENTS } from './Constants';
import { SFXManager } from './SFXManager';
import { SaveManager } from './SaveManager';

// How much each level of permanent investment biases an in-run upgrade's draw chance.
// 0.15 = +15% weight per matching permanent level (recommended).
const PERMANENT_BIAS_PER_LEVEL = 0.15;

// Compute a weight multiplier for a given upgrade based on the player's permanent investments.
// - Passive upgrades match by `stat` against unlocked CHARACTER_TALENTS for the active character.
// - Weapon upgrades match by `weaponId` against permanent weapon upgrade levels.
function getUpgradeWeight(upgrade, save, characterId) {
    let bonusLevels = 0;

    if (upgrade.type === 'passive' && upgrade.stat) {
        const unlocked = save?.unlockedTalents?.[characterId] || [];
        if (unlocked.length > 0) {
            const charTalents = CHARACTER_TALENTS[characterId] || [];
            for (const tId of unlocked) {
                const t = charTalents.find(x => x.id === tId);
                if (t && t.stat === upgrade.stat) bonusLevels += 1;
            }
        }
    } else if (upgrade.type === 'weapon' && upgrade.weaponId) {
        const perm = save?.permanentWeaponUpgrades?.[upgrade.weaponId] || {};
        bonusLevels = (perm.damage || 0) + (perm.area || 0) + (perm.cooldown || 0);
    }

    return 1 + (bonusLevels * PERMANENT_BIAS_PER_LEVEL);
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
    const choices = [];
    const pool = [...UPGRADES].filter(u => {
        if (engine.banishedUpgrades.has(u.id)) return false;
        if (u.characterSpecific && u.characterSpecific !== engine.characterId) return false;
        if (u.type === 'passive') {
            const currentCount = engine.player.passives.filter(p => p.id === u.id).length;
            if (currentCount >= MAX_PASSIVE_LEVEL) return false;
        }
        if (u.type === 'weapon') {
            const existing = engine.player.weapons.find(w => w.id === u.weaponId);
            if (existing && existing.level >= 20) return false;
        }
        return true;
    });
    // Weighted draw: upgrades you've permanently invested in are slightly more
    // likely to appear (+15% weight per matching permanent level).
    const weights = pool.map(u => getUpgradeWeight(u, engine.save, engine.characterId));

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
            newDesc = `${baseUpgrade.desc} (+${rarity.mult} Levels)`;
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

        let appliedToSynergy = false;
        for (const synergy of SYNERGIES) {
            if (synergy.weapon1 === upgrade.weaponId || synergy.weapon2 === upgrade.weaponId) {
                const activeSynergy = engine.player.weapons.find(w => w.id === synergy.result);
                if (activeSynergy) {
                    activeSynergy.level += levelIncrement;
                    appliedToSynergy = true;
                    break;
                }
            }
        }

        if (!appliedToSynergy) {
            const existing = engine.player.weapons.find(w => w.id === upgrade.weaponId);
            if (existing) {
                existing.level = Math.min(20, existing.level + levelIncrement);
            } else {
                engine.player.weapons.push({ ...WEAPONS[upgrade.weaponId], level: Math.min(20, levelIncrement), timer: 0 });
            }
            checkSynergies(engine);
        }
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
            checkEvolutions(engine);
            break;
        }
    }
}