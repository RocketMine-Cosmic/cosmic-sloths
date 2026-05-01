import { CHARACTERS, WEAPONS, ARENAS, CHARACTER_TALENTS, DIFFICULTIES, SKIN_COSMETICS, RELICS, getCharacterMastery, getWeaponStatsAndMastery } from './Constants';
import { SFXManager } from './SFXManager';
import { ParticleManager } from './ParticleManager';
import { SaveManager } from './SaveManager';
import { fireWeaponLogic } from './WeaponSystem';
import { renderGame } from './GameEngineDraw';
import { triggerSquadUltimate, updateSquadClones } from './SquadUltimate';
import { spawnEnemies as spawnEnemiesLogic } from './EnemySpawner';
import { updateProjectiles as updateProjectilesLogic } from './ProjectileSystem';
import { updateEnemies as updateEnemiesLogic } from './EnemyAI';
import { updatePickups as updatePickupsLogic } from './PickupSystem';
import { levelUp as levelUpLogic, generateChoices as generateChoicesLogic, applyUpgrade as applyUpgradeLogic, checkSynergies as checkSynergiesLogic, checkEvolutions as checkEvolutionsLogic } from './UpgradeSystem';
import { updateCharacterMechanics } from './CharacterMechanics';

export class GameEngine {
    constructor(canvas, characterId, arenaId, difficultyId, save, callbacks, isEndless = false, worldBossId = null, worldBossName = null, startingWeaponId = null, isNGPlus = false) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.callbacks = callbacks;
        this.characterId = characterId;
        this.save = save;
        this.isNGPlus = isNGPlus;
        this.worldBossId = worldBossId || 'world_boss_0';
        this.worldBossName = worldBossName || 'The World Eater';
        this.difficulty = { ...(DIFFICULTIES.find(d => d.id === difficultyId) || DIFFICULTIES[0]) };
        
        if (this.isNGPlus) {
            this.difficulty.enemyHpMult *= 3.0;
            this.difficulty.enemyDmgMult *= 2.0;
            this.difficulty.goldMult *= 2.0;
            this.difficulty.xpMult *= 1.5;
            this.difficulty.speedMult = (this.difficulty.speedMult || 1.0) * 1.2;
        }
        
        const saveStats = save.permanentUpgrades || {};
        const weeklyStats = save.weeklyUpgrades || {};
        const seasonalStats = save.seasonalUpgrades || {};
        
        const getStatBonus = (stat) => {
            const perm = (saveStats[stat] || 0);
            const week = (weeklyStats[stat] || 0);
            const season = (seasonalStats[stat] || 0);
            
            if (stat === 'health') return (perm * 5) + (week * 10) + (season * 20);
            if (stat === 'speed') return (perm * 0.02) + (week * 0.05) + (season * 0.1);
            if (stat === 'damage') return (perm * 0.02) + (week * 0.05) + (season * 0.1);
            if (stat === 'magnet') return (perm * 5) + (week * 15) + (season * 30);
            if (stat === 'regen') return (perm * 0.1) + (week * 0.2) + (season * 0.5);
            if (stat === 'cooldown') return (perm * 0.02) + (week * 0.05) + (season * 0.1);
            if (stat === 'luck') return (perm * 1) + (week * 2) + (season * 3);
            return 0;
        };

        const permTalents = save.permanentTalents?.[characterId] || [];
        const weekTalents = save.weeklyTalents?.[characterId] || [];
        const seasonTalents = save.seasonalTalents?.[characterId] || [];
        const charTalents = [...new Set([...permTalents, ...weekTalents, ...seasonTalents])];
        const talentsData = CHARACTER_TALENTS[characterId] || [];
        
        let talentBonus = {
            maxHp: 0, speedMult: 0, damageMult: 0, magnetRange: 0, regen: 0, armor: 0, areaMult: 0, cooldownMult: 0, projSpeedMult: 0, goldMult: 0, xpMult: 0, luck: 0
        };

        charTalents.forEach(tId => {
            const t = talentsData.find(td => td.id === tId);
            if (t) {
                talentBonus[t.stat] = (talentBonus[t.stat] || 0) + t.value;
            }
        });

        const charKills = save.characterKills?.[characterId] || 0;
        const mastery = getCharacterMastery(charKills, characterId);
        // Apply ALL unlocked tiers (not just the highest) so they stack as a long-term grind reward.
        // - `stat` + `value`: single-stat bump (legacy tiers 1–5)
        // - `multiStat`: object of {stat: value} pairs (tier 6 character-flavoured stat package)
        // - `allStats`: applies the value to a curated set of core stat multipliers (NeoByte tier 6)
        // - `abilityBoost`: read elsewhere by CharacterMechanics / GameEngine to tweak active skills
        // Note: tier 7 ability boosts are stored on `this.masteryAbilityBoost` for runtime use.
        this.masteryAbilityBoost = {};
        const allStatsKeys = ['speedMult', 'damageMult', 'areaMult', 'cooldownMult', 'magnetRange', 'xpMult', 'goldMult'];
        (mastery.unlockedTiers || [mastery.current]).forEach(tier => {
            if (!tier) return;
            if (tier.stat && tier.value) {
                talentBonus[tier.stat] = (talentBonus[tier.stat] || 0) + tier.value;
            }
            if (tier.multiStat) {
                for (const [k, v] of Object.entries(tier.multiStat)) {
                    talentBonus[k] = (talentBonus[k] || 0) + v;
                }
            }
            if (tier.stat === 'allStats' && tier.value) {
                allStatsKeys.forEach(k => {
                    // magnetRange is a flat-add stat (default 60-72) so apply value as %.
                    if (k === 'magnetRange') talentBonus[k] = (talentBonus[k] || 0) + Math.round(60 * tier.value);
                    // cooldownMult is a "lower is better" stat — invert.
                    else if (k === 'cooldownMult') talentBonus[k] = (talentBonus[k] || 0) - tier.value;
                    else talentBonus[k] = (talentBonus[k] || 0) + tier.value;
                });
            }
            if (tier.abilityBoost) Object.assign(this.masteryAbilityBoost, tier.abilityBoost);
        });

        const equippedRelics = save.equippedRelics || [];
        const relicBonus = {
            maxHp: 0, speedMult: 0, damageMult: 0, magnetRange: 0, regen: 0, armor: 0, areaMult: 0, cooldownMult: 0, projSpeedMult: 0, goldMult: 0, xpMult: 0, luck: 0
        };

        const charAugments = save.forgeCharAugments?.[characterId] || [];
        const hasAug = (id) => charAugments.includes(id);
        const augBonus = {
            maxHp: 0, speedMult: (hasAug('holo_speed') ? 0.1 : 0) + (hasAug('sky_speed') ? 0.15 : 0),
            damageMult: 0, magnetRange: 0, regen: hasAug('holo_regen') ? 0.3 : 0,
            armor: hasAug('pan_armor') ? 3 : 0, areaMult: hasAug('nova_aoe') ? 0.2 : 0,
            cooldownMult: 0, projSpeedMult: 0, goldMult: hasAug('syn_gold') ? 0.2 : 0,
            xpMult: hasAug('code_xp') ? 0.15 : 0, luck: 0, critBonus: hasAug('neo_crit') ? 0.08 : 0
        };

        const relicLevels = save.relicLevels || {};
        equippedRelics.forEach(rId => {
            const r = RELICS.find(rd => rd.id === rId);
            if (r) {
                const level = relicLevels[rId] || 1;
                const val = r.values ? r.values[Math.min(level, 5) - 1] : r.value;
                relicBonus[r.stat] = (relicBonus[r.stat] || 0) + val;
            }
        });

        const baseCharRaw = CHARACTERS.find(c => c.id === characterId) || CHARACTERS[0];
        const skinId = save.cosmetics?.skins?.[characterId] || `${characterId}_default`;
        const skinColor = SKIN_COSMETICS.find(s => s.id === skinId)?.color;
        const baseChar = skinColor ? { ...baseCharRaw, color: skinColor } : (save.skinColorOverride ? { ...baseCharRaw, color: save.skinColorOverride } : baseCharRaw);

        if (arenaId === 'world_boss_arena') {
            this.arena = { id: 'world_boss_arena', name: 'Global Raid', bg: '#1a0000', image: 'https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/887e8de50_image-48.jpg', duration: Infinity, effect: 'none' };
        } else {
            this.arena = ARENAS.find(a => a.id === arenaId) || ARENAS[0];
            if (isEndless) {
                this.arena = { ...this.arena, duration: Infinity };
            }
        }
        
        this.envEffect = this.arena.effect || 'none';
        this.envParticles = [];
        this.envModifiers = {
            playerSpeed: 1,
            enemySpawnRate: 1,
            enemySpeed: 1
        };

        if (this.envEffect === 'neon_rain') {
            this.envModifiers.playerSpeed = 1.1;
            this.envModifiers.enemySpeed = 1.1;
        } else if (this.envEffect === 'fog') {
            this.envModifiers.playerSpeed = 0.9;
            this.envModifiers.enemySpawnRate = 0.9;
        } else if (this.envEffect === 'solar_flare') {
            this.envModifiers.enemySpawnRate = 1.2;
        }

        this.arenaImage = null;
        if (this.arena.image) {
            this.arenaImage = new Image();
            this.arenaImage.crossOrigin = "Anonymous";
            this.arenaImage.src = this.arena.image;
        }

        let playerImage = null;
        if (baseChar.image) {
            playerImage = new Image();
            playerImage.src = baseChar.image;
        }
        
        let idleImage = null;
        if (baseChar.idleSprite) {
            idleImage = new Image();
            idleImage.src = baseChar.idleSprite;
        }
        
        let walkImage = null;
        if (baseChar.walkSprite) {
            walkImage = new Image();
            walkImage.src = baseChar.walkSprite;
        }
        
        this.killEffect = save.cosmetics?.killEffect || 'none';

        const initialWeaponId = startingWeaponId || 'neoBlaster';

        let sectorPenalty = 1.0;
        if (arenaId !== 'world_boss_arena' && !isEndless) {
            const currentIndex = ARENAS.findIndex(a => a.id === arenaId);
            const unlockedCount = save.unlockedArenasByCharacter?.[characterId]?.length || 1;
            const maxUnlockedIndex = unlockedCount - 1;
            const diff = Math.max(0, maxUnlockedIndex - currentIndex);
            sectorPenalty = Math.max(0.5, 1.0 - (diff * 0.10));
        }

        // VIP bonus: 1% damage + 1% HP per VIP level (stored in save.vipLevel)
        const vipLevel = save.vipLevel || 0;
        const vipDmgBonus = vipLevel * 0.01;
        const vipHpBonus = Math.floor((baseChar.hp + getStatBonus('health') + (talentBonus.maxHp || 0) + (relicBonus.maxHp || 0)) * vipLevel * 0.01);

        // Title buff: small permanent bonuses while a title is equipped (save.titleBuff
        // is set by Game.jsx from the OmenX user record before constructing the engine).
        const titleBuff = save.titleBuff || {};
        const titleHpBase = baseChar.hp + getStatBonus('health') + (talentBonus.maxHp || 0) + (relicBonus.maxHp || 0);
        const titleHpBonus = Math.floor(titleHpBase * (titleBuff.hpMult || 0));

        // Admin perk: tiny flat +N% to base stats (client-side, set in Game.jsx).
        // Layered as additive multipliers — kept very small (default 2%).
        const adminMult = (save.adminBuff?.mult) || 0;
        const adminHpBonus = Math.floor(titleHpBase * adminMult);

        this.player = {
            name: baseChar.name,
            image: playerImage,
            idleImage: idleImage,
            walkImage: walkImage,
            frameTimer: 0,
            currentFrame: 0,
            x: 0, y: 0, radius: 16,
            maxHp: baseChar.hp + getStatBonus('health') + (talentBonus.maxHp || 0) + (relicBonus.maxHp || 0) + vipHpBonus + titleHpBonus + adminHpBonus,
            hp: baseChar.hp + getStatBonus('health') + (talentBonus.maxHp || 0) + (relicBonus.maxHp || 0) + vipHpBonus + titleHpBonus + adminHpBonus,
            speed: baseChar.speed,
            speedMult: (1 + getStatBonus('speed') + (talentBonus.speedMult || 0) + (relicBonus.speedMult || 0) + augBonus.speedMult + (titleBuff.speedMult || 0) + adminMult) * this.envModifiers.playerSpeed,
            damageMult: (baseChar.damageMult || 1) + getStatBonus('damage') + (talentBonus.damageMult || 0) + (relicBonus.damageMult || 0) + vipDmgBonus + (titleBuff.damageMult || 0) + adminMult,
            magnetRange: (baseChar.magnetRange || 60) + 30 + getStatBonus('magnet') + (talentBonus.magnetRange || 0) + (relicBonus.magnetRange || 0) + (titleBuff.magnetRange || 0) + Math.floor(((baseChar.magnetRange || 60) + 30) * adminMult),
            regen: baseChar.regen + getStatBonus('regen') + (talentBonus.regen || 0) + (relicBonus.regen || 0) + augBonus.regen + (titleBuff.regen || 0),
            armor: baseChar.armor + (talentBonus.armor || 0) + (relicBonus.armor || 0) + augBonus.armor + (titleBuff.armor || 0),
            areaMult: (baseChar.areaMult || 1) + (talentBonus.areaMult || 0) + (relicBonus.areaMult || 0) + augBonus.areaMult + (titleBuff.areaMult || 0) + adminMult,
            cooldownMult: (baseChar.cooldownMult || 1) - getStatBonus('cooldown') + (talentBonus.cooldownMult || 0) + (relicBonus.cooldownMult || 0) + (titleBuff.cooldownMult || 0),
            projSpeedMult: (baseChar.projSpeedMult || 1) + (talentBonus.projSpeedMult || 0) + (relicBonus.projSpeedMult || 0),
            goldMult: ((baseChar.goldMult || 1) + (talentBonus.goldMult || 0) + (relicBonus.goldMult || 0) + augBonus.goldMult + (titleBuff.goldMult || 0) + adminMult) * this.difficulty.goldMult * sectorPenalty,
            xpMult: ((baseChar.xpMult || 1) + (talentBonus.xpMult || 0) + (relicBonus.xpMult || 0) + augBonus.xpMult + (titleBuff.xpMult || 0) + adminMult) * this.difficulty.xpMult,
            luck: (baseChar.luck || 0) + getStatBonus('luck') + (talentBonus.luck || 0) + (relicBonus.luck || 0) + (titleBuff.luck || 0) + adminMult,
            critBonus: augBonus.critBonus + (titleBuff.critBonus || 0),
            charAugments: charAugments,
            color: baseChar.color,
            trail: save.cosmetics?.trail || 'default',
            weapons: [{ ...WEAPONS[initialWeaponId], level: 1, timer: 0 }],
            passives: [],
            passiveLevels: {},
            // Stored for the buff-aura renderer (purely visual; stat math above
            // already mixed these values into the relevant player fields).
            titleBuff: titleBuff && Object.keys(titleBuff).length ? titleBuff : null
        };
        
        const sessionBuffs = save.sessionBuffs || {};
        const now = Date.now();
        const hasXpBuff = sessionBuffs.xpExpiry > now;
        const xpBuffMultiplier = hasXpBuff ? 1.5 : 1.0;

        this.player.goldMult = ((baseChar.goldMult || 1) + (talentBonus.goldMult || 0) + (relicBonus.goldMult || 0) + augBonus.goldMult + (titleBuff.goldMult || 0) + adminMult) * this.difficulty.goldMult * sectorPenalty;
        this.player.xpMult = ((baseChar.xpMult || 1) + (talentBonus.xpMult || 0) + (relicBonus.xpMult || 0) + augBonus.xpMult + (titleBuff.xpMult || 0) + adminMult) * this.difficulty.xpMult * xpBuffMultiplier;

        if (hasAug('dat_ghost')) {
            this.player.iFrames = 5.0;
            this.player.invincibleTimer = 5.0;
        }
        
        this.camera = { x: 0, y: 0 };
        this.joystick = { x: 0, y: 0 };
        this.enemies = [];
        this.projectiles = [];
        this.pickups = [];
        this.particleManager = new ParticleManager();
        this.damageTexts = [];
        
        this.stars = Array.from({length: 150}, () => ({ x: Math.random() * 2000, y: Math.random() * 2000, size: Math.random() * 2 + 0.5, parallax: Math.random() * 0.4 + 0.1 }));
        
        this.keys = {};
        this.time = 0;
        this.frameCount = 0;
        this.level = 1;
        this.xp = 25;
        this.banishedUpgrades = new Set();
        this.xpRequired = 25;
        this.gold = 0;
        this.kills = 0;

        if (arenaId === 'world_boss_arena') {
            let totalXpNeeded = 0;
            let currentReq = 10;
            for (let i = 1; i < 20; i++) {
                totalXpNeeded += currentReq;
                currentReq = Math.floor(currentReq * 1.1 + 20);
            }
            this.xp = totalXpNeeded;
        }
        
        this.isPaused = false;
        this.isGameOver = false;
        this.isVictory = false;
        this.encounteredEnemies = new Set();
        this.enemyKills = {};
        
        this.lockedCharacters = ['glitch', 'holodrift', 'codebreaker', 'dataphantom', 'neonvortex', 'synthbeats', 'skybyte']
            .filter(id => !(save.foundCharacters || []).includes(id));
        this.characterPickupSpawned = false;
        this.characterPickup = null;
        this.bossSpawned = false;
        this.enemyProjectiles = [];
        this.hazards = [];
        
        this.shakeX = 0;
        this.shakeY = 0;
        this.shakeTimer = 0;
        this.hitStopTimer = 0;
        this.zoom = window.innerWidth < 768 ? 0.5 : 0.8;
        this.bossModifiers = save.bossModifiers || {};
        this.worldBossDamage = 0;
        this.totalDamageDealt = 0;
        this.bossesKilled = 0;
        this.elitesKilled = 0;
        // Per-weapon stat tracking — credit damage on every hit, credit kill on the killing blow.
        this.weaponDamage = {};
        this.weaponKills = {};

        // Rolling 10-second damage window. Each entry is { t, dmg }; we sum entries
        // whose timestamp is within the last DPS_WINDOW seconds. Lets the HUD's DPS
        // value reflect *recent* output so post-boss buffs / new evolutions show up
        // in real time instead of being averaged-out across the whole run.
        this.dpsWindow = [];
        this.DPS_WINDOW = 10;
        
        this.characterMechanics = {
            bannerTimer: 0,
            banners: [],
            scrapArmor: 0,
            decoyTimer: 0,
            decoys: [],
            hackTimer: 0,
            hackedEnemies: [],
            sonicCharge: 0,
            lastMoveDir: { x: 0, y: 0 }
        };
        
        this.bindEvents();
        this.lastTime = performance.now();
        this.animationId = requestAnimationFrame(this.loop.bind(this));
    }

    triggerSquadUltimate(tier) {
        triggerSquadUltimate(this, tier);
    }

    triggerSonicBoom() {
        // Tier-7 mastery: charge can build past 100 → 200 ("supercharge"). Released
        // at supercharge it does 2.5× damage in a 1.6× radius and shakes the screen harder.
        const isSuper = (this.characterMechanics.sonicCharge || 0) >= 200;
        this.characterMechanics.sonicCharge = 0;
        const label = isSuper ? "HYPER BOOM!" : "SONIC BOOM!";
        const color = isSuper ? '#FFFFFF' : '#00D4FF';
        const radius = isSuper ? 480 : 300;
        const dmg = isSuper ? 125 : 50;
        const visualScale = isSuper ? 3.5 : 2.0;
        const shockGrowth = isSuper ? 1300 : 800;
        const shockWidth = isSuper ? 14 : 8;
        this.addDamageText(this.player.x, this.player.y - 40, label, color);
        this.particleManager.createExplosion(this.player.x, this.player.y, color, visualScale, 'default');
        this.addParticle(this.player.x, this.player.y, color, 1, 'shockwave', isSuper ? 4.5 : 3.0, { growthRate: shockGrowth, lineWidth: shockWidth });
        this.shake(isSuper ? 1.0 : 0.5);
        this.enemies.forEach(e => {
            if (Math.hypot(e.x - this.player.x, e.y - this.player.y) < radius) {
                this.damageEnemy(e, dmg * this.player.damageMult);
                const angle = Math.atan2(e.y - this.player.y, e.x - this.player.x);
                e.x += Math.cos(angle) * (isSuper ? 180 : 100);
                e.y += Math.sin(angle) * (isSuper ? 180 : 100);
            }
        });
    }

    takeDamage(amount, sourceName = null) {
        if (this.player.invincibleTimer > 0 || this.player.iFrames > 0) return;
        // Remember whatever last hurt the player so we can show "killed by X" on game over.
        if (sourceName) this._lastDamageSource = sourceName;

        if (this.player.charAugments?.includes('glt_phase') && Math.random() < 0.1) {
            this.player.iFrames = 2.0;
            this.addDamageText(this.player.x, this.player.y - 20, "PHASE SHIFT", '#FF00FF');
            return;
        }
        
        if (this.player.charAugments?.includes('dat_shade')) {
            this.player.phantomBoostTimer = 2.0;
            this.player.iFrames = Math.max(this.player.iFrames || 0, 2.0);
            this.addParticle(this.player.x, this.player.y, '#C0C0C0', 20, 'smoke', 2);
        }

        let actualDmg = Math.max(1, amount - this.player.armor - (this.characterMechanics.scrapArmor || 0));
        if (this.player.charAugments?.includes('pan_fortress') && this.player.hp >= this.player.maxHp) {
            actualDmg = Math.max(1, Math.floor(actualDmg * 0.85));
        }

        const bribeCost = this.masteryAbilityBoost?.bribeCost ?? 5;
        if (this.characterId === 'synthbeats' && this.gold >= bribeCost) {
            this.gold -= bribeCost;
            if (this.callbacks.onGoldChange) this.callbacks.onGoldChange(this.gold);
            this.addDamageText(this.player.x, this.player.y - 20, "BRIBED!", '#FFD700');
            this.particleManager.createExplosion(this.player.x, this.player.y, '#FFD700', 1.0, 'default');
            this.player.iFrames = 0.5;
            return;
        }

        const phaseShiftChance = this.masteryAbilityBoost?.phaseShiftChance ?? 0.15;
        if (this.characterId === 'glitch' && Math.random() < phaseShiftChance) {
            this.player.iFrames = 2.0;
            this.player.invincibleTimer = 2.0;
            this.addDamageText(this.player.x, this.player.y - 20, "PHASE SHIFT!", '#FF00FF');
            this.addParticle(this.player.x, this.player.y, '#FF00FF', 15, 'slash', 1.5);
            this.player.weapons.forEach(w => w.timer = 0);
            return;
        }

        this.player.hp -= actualDmg;
        this.player.iFrames = 0.2;
        this.callbacks.onHpChange(this.player.hp, this.player.maxHp);
        this.addDamageText(this.player.x, this.player.y - 20, actualDmg, '#ff0000');
        SFXManager.playPlayerHit();
        
        const aegis = this.player.weapons.find(w => w.id === 'aegisMatrix');
        if (aegis && Math.random() < 0.5) {
            for(let i=0; i<5; i++) {
                const angle = Math.random() * Math.PI * 2;
                this.projectiles.push({
                    x: this.player.x, y: this.player.y,
                    vx: Math.cos(angle) * 500,
                    vy: Math.sin(angle) * 500,
                    radius: 10,
                    damage: aegis.baseDamage * this.player.damageMult * 2,
                    pierce: 1,
                    life: 2,
                    color: '#00ff66',
                    type: 'missile'
                });
            }
        }

        if (this.player.hp <= 0) {
            const currentOmenxBalance = this.save.omenxBalance ?? 0;
            if (!this.player.hasRevivedWithTokens && this.callbacks.onDeathPrompt && currentOmenxBalance >= 4) {
                 this.isPaused = true;
                 this.callbacks.onDeathPrompt();
                 return;
            }

            if (this.player.charAugments?.includes('holo_revive') && !this.player.holoRevived) {
                this.player.holoRevived = true;
                this.player.hp = this.player.maxHp * 0.1;
                this.player.iFrames = 3.0;
                this.callbacks.onHpChange(this.player.hp, this.player.maxHp);
                this.addDamageText(this.player.x, this.player.y - 40, "EMERGENCY REVIVE", '#00FA9A');
                this.particleManager.createExplosion(this.player.x, this.player.y, '#00FA9A', 2);
                return;
            }
            this.particleManager.createExplosion(this.player.x, this.player.y, this.player.color, 3, this.characterId);
            this.gameOver();
        }
    }

    bindEvents() {
        this.handleKeyDown = (e) => { this.keys[e.key.toLowerCase()] = true; };
        this.handleKeyUp = (e) => { this.keys[e.key.toLowerCase()] = false; };
        // Auto-pause when the browser throttles the tab. Without this, requestAnimationFrame
        // fires at ~1Hz in the background — clamped dt makes the game limp along while
        // real time races ahead, which players perceive as "boss HP stuck" or weapons
        // not firing. We just freeze the loop entirely while the tab is hidden.
        this.handleVisibilityChange = () => {
            if (document.hidden) {
                this._wasAutoPaused = !this.isPaused;
                this.isPaused = true;
            } else if (this._wasAutoPaused) {
                this._wasAutoPaused = false;
                this.lastTime = performance.now(); // prevent dt spike on resume
                this.isPaused = false;
            }
        };
        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('keyup', this.handleKeyUp);
        document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }

    cleanup() {
        window.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('keyup', this.handleKeyUp);
        document.removeEventListener('visibilitychange', this.handleVisibilityChange);
        cancelAnimationFrame(this.animationId);
    }

    loop(timestamp) {
        try {
            if (!this.isPaused && !this.isGameOver && !this.isVictory) {
                const dt = (timestamp - this.lastTime) / 1000;
                this.update(dt);
                this.draw();
            }
        } catch (e) {
            console.error("Game loop error:", e);
        }
        this.lastTime = timestamp;
        this.animationId = requestAnimationFrame(this.loop.bind(this));
    }

    update(dt) {
        if (dt > 0.1) dt = 0.1;
        this.lastDt = dt;
        
        // Dynamic Difficulty
        if (!this.dynamicDifficulty) this.dynamicDifficulty = {
            timer: 0, lastKills: 0, damageTaken: 0, lastHp: this.player.hp, speedMult: 1.0, spawnRateMult: 1.0
        };
        this.dynamicDifficulty.timer += dt;
        if (this.player.hp < this.dynamicDifficulty.lastHp) {
            this.dynamicDifficulty.damageTaken += (this.dynamicDifficulty.lastHp - this.player.hp);
        }
        this.dynamicDifficulty.lastHp = this.player.hp;

        if (this.dynamicDifficulty.timer >= 15) {
            const killsDelta = this.kills - this.dynamicDifficulty.lastKills;
            if (this.dynamicDifficulty.damageTaken > this.player.maxHp * 0.3) {
                this.dynamicDifficulty.speedMult = Math.max(0.7, this.dynamicDifficulty.speedMult - 0.1);
                this.dynamicDifficulty.spawnRateMult = Math.max(0.7, this.dynamicDifficulty.spawnRateMult - 0.1);
            } else if (killsDelta > 30 && this.dynamicDifficulty.damageTaken < this.player.maxHp * 0.05) {
                this.dynamicDifficulty.speedMult = Math.min(2.0, this.dynamicDifficulty.speedMult + 0.1);
                this.dynamicDifficulty.spawnRateMult = Math.min(2.0, this.dynamicDifficulty.spawnRateMult + 0.1);
            }
            this.dynamicDifficulty.lastKills = this.kills;
            this.dynamicDifficulty.damageTaken = 0;
            this.dynamicDifficulty.timer = 0;
        }

        if (this.hitStopTimer > 0) {
            this.hitStopTimer -= dt;
            return;
        }
        
        if (this.shakeTimer > 0) {
            this.shakeX = (Math.random() - 0.5) * this.shakeTimer * 20;
            this.shakeY = (Math.random() - 0.5) * this.shakeTimer * 20;
            this.shakeTimer -= dt;
        } else {
            this.shakeX = 0;
            this.shakeY = 0;
        }

        this.frameCount++;
        this.time += dt;
        
        if (this.frameCount % 30 === 0) {
            this.callbacks.onTimeChange(Math.floor(this.time));
        }

        if (this.time >= this.arena.duration && !this.isGameOver && !this.isVictory && !this.isBossActive) {
            this.victory();
            return;
        }

        // Regen
        if (this.player.regen > 0 && this.frameCount % 60 === 0) {
            this.player.hp = Math.min(this.player.maxHp, this.player.hp + this.player.regen);
            this.callbacks.onHpChange(this.player.hp, this.player.maxHp);
        }

        // Endless XP trickle — after 5 minutes, gain a small passive XP stream so
        // levelling isn't entirely boss-gated. Scales with the current XP requirement
        // (~one level every ~3 minutes of pure idling, faster with kills).
        if (this.arena.duration === Infinity && this.time > 300) {
            const trickle = (this.xpRequired / 180) * dt * this.player.xpMult;
            this.xp += trickle;
        }

        // Movement input
        let dx = 0, dy = 0;
        if (this.keys['w'] || this.keys['arrowup']) dy -= 1;
        if (this.keys['s'] || this.keys['arrowdown']) dy += 1;
        if (this.keys['a'] || this.keys['arrowleft']) dx -= 1;
        if (this.keys['d'] || this.keys['arrowright']) dx += 1;
        
        let usingGamepad = false;
        // Skip the (relatively expensive) getGamepads() call entirely when no
        // gamepad has ever been connected this session. GamepadManager flips
        // window.__gamepadConnected on the gamepadconnected event.
        if (typeof navigator !== 'undefined' && navigator.getGamepads && window.__gamepadConnected) {
            const gamepads = navigator.getGamepads();
            for (let i = 0; i < gamepads.length; i++) {
                const gp = gamepads[i];
                if (gp && gp.connected) {
                    const axeX = gp.axes[0] || 0;
                    const axeY = gp.axes[1] || 0;
                    const deadzone = 0.15;
                    
                    if (Math.abs(axeX) > deadzone || Math.abs(axeY) > deadzone) {
                        dx = axeX;
                        dy = axeY;
                        usingGamepad = true;
                    }
                    
                    if (gp.buttons[12] && gp.buttons[12].pressed) { dy = -1; usingGamepad = true; }
                    if (gp.buttons[13] && gp.buttons[13].pressed) { dy = 1; usingGamepad = true; }
                    if (gp.buttons[14] && gp.buttons[14].pressed) { dx = -1; usingGamepad = true; }
                    if (gp.buttons[15] && gp.buttons[15].pressed) { dx = 1; usingGamepad = true; }
                    
                    if (usingGamepad) break;
                }
            }
        }
        
        if (this.joystick.x !== 0 || this.joystick.y !== 0) {
            dx = this.joystick.x;
            dy = this.joystick.y;
        } else if (usingGamepad) {
            const len = Math.sqrt(dx*dx + dy*dy);
            if (len > 1) {
                dx /= len; dy /= len;
            }
        } else if (dx !== 0 && dy !== 0) {
            const len = Math.sqrt(dx*dx + dy*dy);
            dx /= len; dy /= len;
        }
        
        let moveMultiplier = 1.0;
        if (this.characterId === 'dataphantom' && this.player.phantomBoostTimer > 0) moveMultiplier = 1.5;

        const actualSpeed = this.player.speed * this.player.speedMult * 60 * dt * moveMultiplier;
        this.player.x += dx * actualSpeed;
        this.player.y += dy * actualSpeed;

        this.player.isMoving = (dx !== 0 || dy !== 0);
        if (dx < 0) this.player.facingLeft = true;
        else if (dx > 0) this.player.facingLeft = false;
        
        if (this.player.isMoving) {
            this.player.moveTimer = (this.player.moveTimer || 0) + dt * 15;
        } else {
            this.player.moveTimer = 0;
        }

        if (this.player.invincibleTimer > 0) this.player.invincibleTimer -= dt;
        if (this.player.iFrames > 0) this.player.iFrames -= dt;
        if (this.player.synAmpTimer > 0) this.player.synAmpTimer -= dt;
        
        this.zoom = window.innerWidth < 768 ? 0.5 : 0.8;
        this.camera.x = this.player.x - (this.canvas.width / this.zoom) / 2;
        this.camera.y = this.player.y - (this.canvas.height / this.zoom) / 2;

        this.spawnEnemies(dt);
        this.updateWeapons(dt);
        
        if (!this.enemyPool) this.enemyPool = [];

        // Build Spatial Hash for Collision Optimization.
        // Reuse the Map + cell arrays across frames to avoid GC churn — at 200+
        // enemies × 60fps the previous "new Map() + fresh arrays" approach was
        // ~12k allocations/sec and a real source of stutter in long endless runs.
        if (!this.spatialHash) this.spatialHash = new Map();
        // Clear cell arrays in place; keep the Map keys for reuse next frame.
        for (const arr of this.spatialHash.values()) arr.length = 0;
        // Cache active bosses once per frame so projectile code doesn't re-filter
        // engine.enemies for every single bullet (was O(projectiles × enemies)).
        this._activeBosses = [];
        const cellSize = 100;
        for (let i = 0; i < this.enemies.length; i++) {
            const e = this.enemies[i];
            if (e.hp <= 0) continue;
            if (e.isBoss) this._activeBosses.push(e);
            const cx = Math.floor(e.x / cellSize);
            const cy = Math.floor(e.y / cellSize);
            const key = `${cx},${cy}`;
            let cell = this.spatialHash.get(key);
            if (!cell) { cell = []; this.spatialHash.set(key, cell); }
            cell.push(e);
        }

        this.updateProjectiles(dt);
        this.updateEnemies(dt);
        this.updatePickups(dt);
        this.updateHazards(dt);
        updateSquadClones(this, dt);

        updateCharacterMechanics(this, dt, dx, dy);

        if (this.xp >= this.xpRequired && !this.isPaused && !this.isGameOver && !this.isVictory) {
            this.levelUp();
        }
        
        if (!this.characterPickupSpawned && this.lockedCharacters.length > 0) {
            if (this.characterSpawnRoll === undefined) {
                this.characterSpawnRoll = Math.random();
                this.characterSpawnTime = 120 + Math.random() * 120;
            }
            
            if (this.time > this.characterSpawnTime) {
                this.characterPickupSpawned = true;
                
                if (this.characterSpawnRoll < 0.30) {
                    const charIdToSpawn = this.lockedCharacters[Math.floor(Math.random() * this.lockedCharacters.length)];
                    const charData = CHARACTERS.find(c => c.id === charIdToSpawn);
                    
                    const angle = Math.random() * Math.PI * 2;
                    const dist = 3000 + Math.random() * 2000;
                    this.characterPickup = {
                        x: this.player.x + Math.cos(angle) * dist,
                        y: this.player.y + Math.sin(angle) * dist,
                        charId: charIdToSpawn,
                        color: charData.color,
                        name: charData.name
                    };
                }
            }
        }
        
        if (this.characterPickup) {
            const dist = Math.hypot(this.player.x - this.characterPickup.x, this.player.y - this.characterPickup.y);
            if (dist < this.player.radius + 20) {
                if (this.callbacks.onCharacterFound) {
                    this.callbacks.onCharacterFound(this.characterPickup.charId);
                }
                this.addDamageText(this.characterPickup.x, this.characterPickup.y - 20, `UNLOCKED: ${this.characterPickup.name}!`, '#00ffff');
                this.characterPickup = null;
            }
        }

        // Particles & Text
        this.particleManager.update(dt);
        
        this.damageTexts = this.damageTexts.filter(t => {
            t.life -= dt;
            t.y -= 20 * dt;
            return t.life > 0;
        });

        // Environmental Effects Update
        const vWidth = this.canvas.width / this.zoom;
        const vHeight = this.canvas.height / this.zoom;
        
        if (this.envEffect === 'neon_rain' && Math.random() < 0.5) {
            this.envParticles.push({ x: this.player.x + (Math.random() * vWidth * 1.5 - vWidth * 0.75), y: this.player.y - vHeight/2 - 50, vx: 100, vy: 600 + Math.random() * 300, life: 2, color: Math.random() > 0.5 ? '#00ffff' : '#ff00ff', length: 20 + Math.random() * 20 });
        } else if (this.envEffect === 'fog' && Math.random() < 0.05) {
            this.envParticles.push({ x: this.player.x + (Math.random() * vWidth * 2 - vWidth), y: this.player.y + (Math.random() * vHeight * 2 - vHeight), vx: 20 + Math.random() * 30, vy: 10 + Math.random() * 20, life: 10, size: 200 + Math.random() * 300 });
        } else if (this.envEffect === 'solar_flare') {
            if (Math.random() < 0.05) {
                this.envParticles.push({ type: 'flare', x: this.player.x + (Math.random() * vWidth * 1.5 - vWidth * 0.75), y: this.player.y + (Math.random() * vHeight * 1.5 - vHeight * 0.75), life: 2.0, maxLife: 2.0, size: 100 + Math.random() * 200, angle: Math.random() * Math.PI * 2 });
            }
            if (Math.random() < 0.3) {
                this.envParticles.push({ type: 'ember', x: this.player.x + (Math.random() * vWidth * 1.5 - vWidth * 0.75), y: this.player.y + vHeight / 2 + 50, vx: (Math.random() - 0.5) * 200, vy: -200 - Math.random() * 200, life: 3.0, maxLife: 3.0, size: 2 + Math.random() * 3 });
            }
        }

        this.envParticles = this.envParticles.filter(p => {
            p.life -= dt;
            if (p.vx) p.x += p.vx * dt;
            if (p.vy) p.y += p.vy * dt;
            return p.life > 0;
        });
    }

    spawnEnemies(dt) { spawnEnemiesLogic(this, dt); }
    updateProjectiles(dt) { updateProjectilesLogic(this, dt); }
    updateEnemies(dt) { updateEnemiesLogic(this, dt); }
    updatePickups(dt) { updatePickupsLogic(this, dt); }
    levelUp() { levelUpLogic(this); }
    rerollChoices() { this.callbacks.onLevelUp(generateChoicesLogic(this)); }
    generateChoices() { return generateChoicesLogic(this); }
    applyUpgrade(upgrade) { applyUpgradeLogic(this, upgrade); }
    checkSynergies() { checkSynergiesLogic(this); }
    checkEvolutions() { checkEvolutionsLogic(this); }

    updateHazards(dt) {
        if (this.difficulty.hazardChance > 0 && Math.random() < this.difficulty.hazardChance * dt) {
            const hx = this.player.x + (Math.random() * 600 - 300);
            const hy = this.player.y + (Math.random() * 600 - 300);
            this.hazards.push({
                x: hx, y: hy,
                radius: 60,
                damage: 30 * this.difficulty.enemyDmgMult,
                timer: 2.0,
                active: false
            });
        }

        this.hazards = this.hazards.filter(h => {
            h.timer -= dt;
            if (h.timer <= 0 && !h.active) {
                h.active = true;
                h.timer = 0.5;
                if (Math.hypot(this.player.x - h.x, this.player.y - h.y) < this.player.radius + h.radius) {
                    this.takeDamage(h.damage, 'Cosmic Hazard');
                }
                this.addParticle(h.x, h.y, '#ff4500', 20);
            }
            return h.timer > 0;
        });
    }

    updateWeapons(dt) {
        // Tier-7 NeoByte mastery: banner buff +50% stronger (1.3x → 1.45x cooldown speed)
        const bannerBuffMult = this.masteryAbilityBoost?.banner?.buffMult || 1.0;
        const bannerCdBoost = 1.0 + (0.3 * bannerBuffMult);
        const timeMultiplier = (this.characterId === 'neobyte' && this.player.bannerBuff) ? bannerCdBoost : 1.0;
        this.player.weapons.forEach(w => {
            w.timer -= dt * timeMultiplier;
            if (w.timer <= 0) {
                this.fireWeapon(w);
                
                const stats = getWeaponStatsAndMastery(this.save, w.id);
                const cdMultiplier = stats.cdMult;
                
                w.timer = (w.baseCooldown / 60) * Math.max(0.35, this.player.cooldownMult) * Math.max(0.5, cdMultiplier);
            }
        });
    }

    fireWeapon(w) {
        fireWeaponLogic(this, w);
    }

    damageEnemy(enemy, amount, projectile = null) {
        let damageMult = 1.0;
        let isFullyMastered = false;

        if (this.characterId === 'neobyte' && this.player.bannerBuff) {
            // Tier-7 NeoByte mastery: banner damage buff +50% stronger (1.3x → 1.45x)
            const bannerBuffMult = this.masteryAbilityBoost?.banner?.buffMult || 1.0;
            damageMult *= 1.0 + (0.3 * bannerBuffMult);
        }
        if (this.player.charAugments?.includes('neo_surge') && this.time <= 30) {
            damageMult *= 1.25;
        }
        
        if (enemy && enemy.id) {
            const pastKills = this.save?.enemyKills?.[enemy.id] || 0;
            
            let milestones = [
                { kills: 200, bonus: 2 },
                { kills: 500, bonus: 4 },
                { kills: 1000, bonus: 6 },
                { kills: 1500, bonus: 8 },
                { kills: 2000, bonus: 10 }
            ];
            
            if (enemy.isBoss) {
                milestones = [
                    { kills: 5, bonus: 2 }, { kills: 15, bonus: 4 }, { kills: 25, bonus: 6 },
                    { kills: 35, bonus: 8 }, { kills: 50, bonus: 10 }
                ];
            } else if (enemy.tier >= 9) {
                milestones = [
                    { kills: 50, bonus: 2 }, { kills: 125, bonus: 4 }, { kills: 250, bonus: 6 },
                    { kills: 375, bonus: 8 }, { kills: 500, bonus: 10 }
                ];
            } else if (enemy.tier >= 5) {
                milestones = [
                    { kills: 100, bonus: 2 }, { kills: 250, bonus: 4 }, { kills: 500, bonus: 6 },
                    { kills: 750, bonus: 8 }, { kills: 1000, bonus: 10 }
                ];
            }

            let achievedBonus = 0;
            for (let i = milestones.length - 1; i >= 0; i--) {
                if (pastKills >= milestones[i].kills) {
                    achievedBonus = milestones[i].bonus;
                    break;
                }
            }
            damageMult += (achievedBonus / 100);
            isFullyMastered = pastKills >= milestones[milestones.length - 1].kills;
        }

        let finalDamage = amount * damageMult;
        let isCrit = false;
        let isWeakHit = false;

        // Check boss weak side
        if (enemy.isBoss && enemy.weakSide && projectile) {
            const bossForwardAngle = Math.atan2(this.player.y - enemy.y, this.player.x - enemy.x);
            const hitAngle = Math.atan2(-projectile.vy, -projectile.vx);
            let diff = Math.abs(hitAngle - bossForwardAngle);
            if (diff > Math.PI) diff = Math.PI * 2 - diff;

            if (enemy.weakSide === 'back' && diff < Math.PI * 0.35) {
                isWeakHit = true;
            } else if (enemy.weakSide === 'side' && diff > Math.PI * 0.3 && diff < Math.PI * 0.7) {
                isWeakHit = true;
            }

            if (isWeakHit) {
                finalDamage *= 2.0;
            }
        }

        const critChance = 0.05 + (this.player.luck * 0.02) + (this.player.critBonus || 0);
        if (Math.random() < critChance) {
            isCrit = true;
            finalDamage *= 1.5;
        }
        
        enemy.hp -= finalDamage;
        this.totalDamageDealt += finalDamage;

        // Push into rolling DPS window (used by HUD).
        if (this.dpsWindow) {
            this.dpsWindow.push({ t: this.time, dmg: finalDamage });
        }

        // Credit damage to source weapon (if any) and remember last hitter for kill credit.
        const sourceId = projectile?.weaponId || null;
        if (sourceId) {
            this.weaponDamage[sourceId] = (this.weaponDamage[sourceId] || 0) + finalDamage;
            enemy._lastWeaponId = sourceId;
        }

        // Don't let local damage "kill" the world boss — the server handles
        // boss level-ups when this run's total damage is submitted. Clamp at 1 HP
        // so the visual bar can drain to nearly empty without ending the run early.
        if (enemy.isWorldBoss && enemy.hp < 1) enemy.hp = 1;
        
        if (this.player.charAugments?.includes('glt_corrupt') && Math.random() < 0.15 && !enemy.isBoss) {
            enemy.hacked = true;
            enemy.color = '#39FF14';
        }

        const executeThreshold = this.masteryAbilityBoost?.executeThreshold ?? 0.2;
        // Execute exempts bosses + elites — elites have inflated HP in endless and
        // were causing NeonVortex to snowball uncontrollably as runs progressed.
        if (this.characterId === 'neonvortex' && !enemy.isBoss && !enemy.isElite && enemy.hp > 0 && enemy.hp <= enemy.maxHp * executeThreshold) {
            enemy.hp = 0;
            this.addDamageText(enemy.x, enemy.y - 20, "EXECUTED", '#7A00FF');
            for(let i=0; i<3; i++) {
                const angle = (Math.PI * 2 / 3) * i + Math.random();
                this.projectiles.push({
                    x: enemy.x, y: enemy.y,
                    vx: Math.cos(angle) * 800,
                    vy: Math.sin(angle) * 800,
                    radius: 8,
                    damage: this.player.damageMult * 30,
                    pierce: 3,
                    life: 2,
                    color: '#7A00FF',
                    type: 'railgun'
                });
            }
        }

        if (enemy.isWorldBoss) {
            this.worldBossDamage += finalDamage;
            
            enemy.damageBuffer = (enemy.damageBuffer || 0) + finalDamage;
            if (isCrit) enemy.hadCritInBuffer = true;
            if (isWeakHit) enemy.hadWeakInBuffer = true;
            
            if (!enemy.lastDamageTextTime) enemy.lastDamageTextTime = this.time;
            
            if (this.time - enemy.lastDamageTextTime >= 0.25) {
                let color = enemy.hadCritInBuffer ? '#ff4444' : '#ffffff';
                if (enemy.hadWeakInBuffer) {
                    color = '#ffdd00';
                    this.addDamageText(enemy.x, enemy.y - 30, 'WEAK SPOT!', '#ffdd00', false);
                }
                this.addDamageText(enemy.x, enemy.y - 10, Math.floor(enemy.damageBuffer), color, enemy.hadCritInBuffer);
                enemy.damageBuffer = 0;
                enemy.hadCritInBuffer = false;
                enemy.hadWeakInBuffer = false;
                enemy.lastDamageTextTime = this.time;
            }
            if (Math.random() < 0.1) SFXManager.playEnemyHit();
            return;
        }

        let color = isCrit ? '#ff4444' : (isFullyMastered ? '#ff00ff' : '#ffffff');
        if (enemy.isBoss) {
            if (isWeakHit) {
                color = '#ffdd00';
                this.addDamageText(enemy.x, enemy.y - 30, 'WEAK SPOT!', '#ffdd00', false);
            }
            this.addDamageText(enemy.x, enemy.y - 10, Math.floor(finalDamage), color, isCrit);
        }
        SFXManager.playEnemyHit();
    }

    shake(amount) {
        this.shakeTimer = Math.max(this.shakeTimer, amount);
    }

    // Rolling 10s DPS — averages only the most recent damage so the HUD reflects
    // upgrades immediately (vs. dividing total run damage by total run time, which
    // makes late-run buffs invisible).
    getRollingDps() {
        if (!this.dpsWindow || this.dpsWindow.length === 0) return 0;
        const cutoff = this.time - this.DPS_WINDOW;
        // Drop expired entries (cheap — array stays bounded by recent damage rate).
        while (this.dpsWindow.length && this.dpsWindow[0].t < cutoff) {
            this.dpsWindow.shift();
        }
        if (this.dpsWindow.length === 0) return 0;
        let sum = 0;
        for (let i = 0; i < this.dpsWindow.length; i++) sum += this.dpsWindow[i].dmg;
        // Use elapsed window length (clamped to actual observed span) to keep early-run DPS sane.
        const span = Math.max(1, Math.min(this.DPS_WINDOW, this.time));
        return sum / span;
    }

    addParticle(x, y, color, count, type = 'spark', sizeMult = 1) {
        this.particleManager.addParticle(x, y, color, count, type, sizeMult);
    }

    addDamageText(x, y, text, color, isCrit = false) {
        if (this.damageTexts.length > 40 && !isCrit && text !== 'WEAK SPOT!') return;
        const offsetX = (Math.random() - 0.5) * 20;
        this.damageTexts.push({ x: x + offsetX, y, text, color, life: 0.8, isCrit });
        if (this.damageTexts.length > 60) this.damageTexts.shift();
    }

    banishUpgrade(upgradeId) {
        if (!this.banishedUpgrades) this.banishedUpgrades = new Set();
        this.banishedUpgrades.add(upgradeId);
    }

    _runStats(extra = {}) {
        return {
            time: Math.floor(this.time), level: this.level, kills: this.kills, gold: this.gold,
            characterId: this.characterId, arenaId: this.arena?.id,
            encountered: Array.from(this.encounteredEnemies), enemyKills: this.enemyKills,
            worldBossDamage: this.worldBossDamage || 0,
            totalDamageDealt: Math.floor(this.totalDamageDealt || 0),
            bossesKilled: this.bossesKilled || 0, elitesKilled: this.elitesKilled || 0,
            weaponDamage: this.weaponDamage || {},
            weaponKills: this.weaponKills || {},
            killedBy: this._lastDamageSource || null,
            ...extra
        };
    }
    gameOver() {
        this.isGameOver = true;
        if (this.save) { this.save.enemyKills = this.enemyKills; SaveManager.save(this.save); }
        SFXManager.playGameOver();
        this.callbacks.onGameOver(this._runStats());
    }
    victory() {
        this.isVictory = true;
        SFXManager.playVictory();
        this.callbacks.onVictory(this._runStats({ arenaId: this.arena.id }));
    }

    draw() {
        renderGame.call(this);
    }
}