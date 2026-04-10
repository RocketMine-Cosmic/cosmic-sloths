import { CHARACTERS, WEAPONS, UPGRADES, ENEMIES, ARENAS, SYNERGIES, CHARACTER_TALENTS, DIFFICULTIES, EVOLUTIONS, SKIN_COSMETICS, RELICS, getCharacterMastery, getWeaponStatsAndMastery } from './Constants';
import { drawEnemy } from './EnemyRenderer';
import { SoundManager } from './SoundManager';
import { SFXManager } from './SFXManager';
import { ParticleManager } from './ParticleManager';
import { selectBossForArena, updateBossAbilities } from './BossSystem';
import { SaveManager } from './SaveManager';
import { drawUI } from './UIRenderer';
import { drawPickups } from './PickupRenderer';
import { fireWeaponLogic } from './WeaponSystem';
import { drawProjectiles } from './ProjectileRenderer';
import { renderGame } from './GameEngineDraw';
import { triggerSquadUltimate, updateSquadClones } from './SquadUltimate';

export class GameEngine {
    constructor(canvas, pixiCanvas, characterId, arenaId, difficultyId, save, callbacks, isEndless = false, worldBossId = null, worldBossName = null, startingWeaponId = null, isNGPlus = false) {
        this.canvas = canvas;
        this.pixiCanvas = pixiCanvas;
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
        const mastery = getCharacterMastery(charKills);
        if (mastery.current && mastery.current.stat) {
            talentBonus[mastery.current.stat] = (talentBonus[mastery.current.stat] || 0) + mastery.current.value;
        }

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

        this.player = {
            name: baseChar.name,
            image: playerImage,
            idleImage: idleImage,
            walkImage: walkImage,
            frameTimer: 0,
            currentFrame: 0,
            x: 0, y: 0, radius: 16,
            maxHp: baseChar.hp + getStatBonus('health') + (talentBonus.maxHp || 0) + (relicBonus.maxHp || 0),
            hp: baseChar.hp + getStatBonus('health') + (talentBonus.maxHp || 0) + (relicBonus.maxHp || 0),
            speed: baseChar.speed,
            speedMult: (1 + getStatBonus('speed') + (talentBonus.speedMult || 0) + (relicBonus.speedMult || 0) + augBonus.speedMult) * this.envModifiers.playerSpeed,
            damageMult: (baseChar.damageMult || 1) + getStatBonus('damage') + (talentBonus.damageMult || 0) + (relicBonus.damageMult || 0),
            magnetRange: (baseChar.magnetRange || 60) + 30 + getStatBonus('magnet') + (talentBonus.magnetRange || 0) + (relicBonus.magnetRange || 0),
            regen: baseChar.regen + getStatBonus('regen') + (talentBonus.regen || 0) + (relicBonus.regen || 0) + augBonus.regen,
            armor: baseChar.armor + (talentBonus.armor || 0) + (relicBonus.armor || 0) + augBonus.armor,
            areaMult: (baseChar.areaMult || 1) + (talentBonus.areaMult || 0) + (relicBonus.areaMult || 0) + augBonus.areaMult,
            cooldownMult: (baseChar.cooldownMult || 1) - getStatBonus('cooldown') + (talentBonus.cooldownMult || 0) + (relicBonus.cooldownMult || 0),
            projSpeedMult: (baseChar.projSpeedMult || 1) + (talentBonus.projSpeedMult || 0) + (relicBonus.projSpeedMult || 0),
            goldMult: ((baseChar.goldMult || 1) + (talentBonus.goldMult || 0) + (relicBonus.goldMult || 0) + augBonus.goldMult) * this.difficulty.goldMult * sectorPenalty,
            xpMult: ((baseChar.xpMult || 1) + (talentBonus.xpMult || 0) + (relicBonus.xpMult || 0) + augBonus.xpMult) * this.difficulty.xpMult,
            luck: (baseChar.luck || 0) + getStatBonus('luck') + (talentBonus.luck || 0) + (relicBonus.luck || 0),
            critBonus: augBonus.critBonus,
            charAugments: charAugments,
            color: baseChar.color,
            trail: save.cosmetics?.trail || 'default',
            weapons: [{ ...WEAPONS[initialWeaponId], level: 1, timer: 0 }],
            passives: [],
            passiveLevels: {}
        };
        
        const sessionBuffs = save.sessionBuffs || {};
        const now = Date.now();
        const hasXpBuff = sessionBuffs.xpExpiry > now;

        this.player.goldMult = ((baseChar.goldMult || 1) + (talentBonus.goldMult || 0) + (relicBonus.goldMult || 0) + augBonus.goldMult) * this.difficulty.goldMult * sectorPenalty;
        this.player.xpMult = ((baseChar.xpMult || 1) + (talentBonus.xpMult || 0) + (relicBonus.xpMult || 0) + augBonus.xpMult + (hasXpBuff ? 0.5 : 0)) * this.difficulty.xpMult;

        if (hasAug('dat_ghost')) {
            this.player.iFrames = 5.0;
            this.player.invincibleTimer = 5.0;
        }
        
        this.camera = { x: 0, y: 0 };
        this.joystick = { x: 0, y: 0 };
        this.enemies = [];
        this.projectiles = [];
        this.pickups = [];
        this.particleManager = new ParticleManager(this.pixiCanvas);
        this.damageTexts = [];
        
        this.stars = Array.from({length: 150}, () => ({ x: Math.random() * 2000, y: Math.random() * 2000, size: Math.random() * 2 + 0.5, parallax: Math.random() * 0.4 + 0.1 }));
        
        this.keys = {};
        this.time = 0;
        this.frameCount = 0;
        this.level = 1;
        this.xp = 25; // Immediate free level-up at start for fun build crafting
        this.banishedUpgrades = new Set();
        this.xpRequired = 25;
        this.gold = 0;
        this.kills = 0;

        if (arenaId === 'world_boss_arena') {
            // Instead of random upgrades, grant enough XP to reach Level 20
            // so the player can build their character properly!
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
        this.zoom = window.innerWidth < 768 ? 0.55 : 1;
        this.bossModifiers = save.bossModifiers || {};
        this.worldBossDamage = 0;
        
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

    triggerSquadUltimate() {
        triggerSquadUltimate(this);
    }

    triggerSonicBoom() {
        this.characterMechanics.sonicCharge = 0;
        this.addDamageText(this.player.x, this.player.y - 40, "SONIC BOOM!", '#00D4FF');
        this.particleManager.createExplosion(this.player.x, this.player.y, '#00D4FF', 2.0, 'default');
        this.addParticle(this.player.x, this.player.y, '#00D4FF', 1, 'shockwave', 3.0, { growthRate: 800, lineWidth: 8 });
        this.shake(0.5);
        this.enemies.forEach(e => {
            if (Math.hypot(e.x - this.player.x, e.y - this.player.y) < 300) {
                this.damageEnemy(e, 50 * this.player.damageMult);
                const angle = Math.atan2(e.y - this.player.y, e.x - this.player.x);
                e.x += Math.cos(angle) * 100;
                e.y += Math.sin(angle) * 100;
            }
        });
    }

    takeDamage(amount) {
        if (this.player.invincibleTimer > 0 || this.player.iFrames > 0) return;

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

        if (this.characterId === 'synthbeats' && this.gold >= 5) {
            this.gold -= 5;
            if (this.callbacks.onGoldChange) this.callbacks.onGoldChange(this.gold);
            this.addDamageText(this.player.x, this.player.y - 20, "BRIBED!", '#FFD700');
            this.particleManager.createExplosion(this.player.x, this.player.y, '#FFD700', 1.0, 'default');
            this.player.iFrames = 0.5;
            return;
        }

        if (this.characterId === 'glitch' && Math.random() < 0.15) {
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
            const currentTokens = this.save.cosmicTokens || 0;
            if (!this.player.hasRevivedWithTokens && this.callbacks.onDeathPrompt && currentTokens >= 4) {
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
        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('keyup', this.handleKeyUp);
    }

    cleanup() {
        window.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('keyup', this.handleKeyUp);
        cancelAnimationFrame(this.animationId);
        if (this.particleManager && this.particleManager.app) {
            this.particleManager.app.destroy(true, { children: true, texture: true, baseTexture: true });
        }
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
            // Removed auto-pause to prevent permanent game freezes from transient errors
        }
        this.lastTime = timestamp;
        this.animationId = requestAnimationFrame(this.loop.bind(this));
    }

    update(dt) {
        if (dt > 0.1) dt = 0.1; // Cap dt to prevent huge jumps
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
                this.dynamicDifficulty.speedMult = Math.min(1.5, this.dynamicDifficulty.speedMult + 0.1);
                this.dynamicDifficulty.spawnRateMult = Math.min(1.5, this.dynamicDifficulty.spawnRateMult + 0.1);
            }
            this.dynamicDifficulty.lastKills = this.kills;
            this.dynamicDifficulty.damageTaken = 0;
            this.dynamicDifficulty.timer = 0;
        }

        if (this.hitStopTimer > 0) {
            this.hitStopTimer -= dt;
            return; // Pause logic for hit-stop
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

        // Movement
        let dx = 0, dy = 0;
        if (this.keys['w'] || this.keys['arrowup']) dy -= 1;
        if (this.keys['s'] || this.keys['arrowdown']) dy += 1;
        if (this.keys['a'] || this.keys['arrowleft']) dx -= 1;
        if (this.keys['d'] || this.keys['arrowright']) dx += 1;
        
        let usingGamepad = false;
        if (typeof navigator !== 'undefined' && navigator.getGamepads) {
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
                    
                    if (gp.buttons[12] && gp.buttons[12].pressed) { dy = -1; usingGamepad = true; } // D-pad Up
                    if (gp.buttons[13] && gp.buttons[13].pressed) { dy = 1; usingGamepad = true; } // D-pad Down
                    if (gp.buttons[14] && gp.buttons[14].pressed) { dx = -1; usingGamepad = true; } // D-pad Left
                    if (gp.buttons[15] && gp.buttons[15].pressed) { dx = 1; usingGamepad = true; } // D-pad Right
                    
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

        if (this.player.invincibleTimer > 0) {
            this.player.invincibleTimer -= dt;
        }
        if (this.player.iFrames > 0) {
            this.player.iFrames -= dt;
        }
        if (this.player.synAmpTimer > 0) {
            this.player.synAmpTimer -= dt;
        }
        
        this.zoom = window.innerWidth < 768 ? 0.55 : 1;
        this.camera.x = this.player.x - (this.canvas.width / this.zoom) / 2;
        this.camera.y = this.player.y - (this.canvas.height / this.zoom) / 2;

        this.spawnEnemies(dt);
        this.updateWeapons(dt);
        
        // Enemy object pool setup (initialize once)
        if (!this.enemyPool) this.enemyPool = [];

        // Build Spatial Hash for Collision Optimization
        this.spatialHash = new Map();
        const cellSize = 100;
        this.enemies.forEach(e => {
            if (e.hp <= 0) return;
            const cx = Math.floor(e.x / cellSize);
            const cy = Math.floor(e.y / cellSize);
            const key = `${cx},${cy}`;
            if (!this.spatialHash.has(key)) this.spatialHash.set(key, []);
            this.spatialHash.get(key).push(e);
        });

        this.updateProjectiles(dt);
        this.updateEnemies(dt);
        this.updatePickups(dt);
        this.updateHazards(dt);
        updateSquadClones(this, dt);
        
        // --- Character Mechanics Update ---
        if (this.characterId === 'neobyte') {
            this.characterMechanics.bannerTimer += dt;
            if (this.characterMechanics.bannerTimer >= 15) {
                this.characterMechanics.bannerTimer = 0;
                this.characterMechanics.banners.push({ x: this.player.x, y: this.player.y, life: 10, radius: 150 });
            }
            let nearBanner = false;
            this.characterMechanics.banners = this.characterMechanics.banners.filter(b => {
                b.life -= dt;
                if (Math.hypot(this.player.x - b.x, this.player.y - b.y) < b.radius) {
                    nearBanner = true;
                    if (this.frameCount % 10 === 0) this.addParticle(this.player.x + (Math.random()-0.5)*40, this.player.y + (Math.random()-0.5)*40, '#0066FF', 1, 'glow');
                }
                return b.life > 0;
            });
            this.player.bannerBuff = nearBanner;
        }

        if (this.characterId === 'holodrift' || this.player.charAugments?.includes('glt_copy')) {
            this.characterMechanics.decoyTimer += dt;
            const threshold = this.characterId === 'holodrift' ? 20 : 60;
            if (this.characterMechanics.decoyTimer >= threshold) {
                this.characterMechanics.decoyTimer = 0;
                this.characterMechanics.decoys.push({ x: this.player.x, y: this.player.y, hp: 100, maxHp: 100, life: 15 });
                this.addParticle(this.player.x, this.player.y, this.characterId === 'holodrift' ? '#00FA9A' : '#FF00FF', 15, 'spark', 1.5);
            }
            this.characterMechanics.decoys = this.characterMechanics.decoys.filter(d => d.hp > 0 && d.life > 0);
            this.characterMechanics.decoys.forEach(d => {
                d.life -= dt;
                if (this.frameCount % 15 === 0) this.addParticle(d.x, d.y, this.characterId === 'holodrift' ? '#00FA9A' : '#FF00FF', 1, 'glow', 0.5);
            });
        }

        if (this.characterId === 'codebreaker') {
            this.characterMechanics.hackTimer += dt;
            if (this.characterMechanics.hackTimer >= 10) {
                this.characterMechanics.hackTimer = 0;
                const targets = this.enemies.filter(e => !e.isBoss && !e.hacked && Math.hypot(this.player.x - e.x, this.player.y - e.y) < 400);
                if (targets.length > 0) {
                    const target = targets[Math.floor(Math.random() * targets.length)];
                    target.hacked = true;
                    target.color = '#39FF14';
                    this.characterMechanics.hackedEnemies.push(target);
                    this.addDamageText(target.x, target.y - 20, "HACKED", '#39FF14');
                    this.addParticle(target.x, target.y, '#39FF14', 15, 'spark', 2.0);
                }
            }
            this.characterMechanics.hackedEnemies = this.characterMechanics.hackedEnemies.filter(e => e.hp > 0 && this.enemies.includes(e));
        }

        if (this.characterId === 'skybyte') {
            if (this.player.isMoving) {
                this.characterMechanics.sonicCharge = Math.min(100, (this.characterMechanics.sonicCharge || 0) + dt * 20);
                const moveDot = dx * this.characterMechanics.lastMoveDir.x + dy * this.characterMechanics.lastMoveDir.y;
                if (moveDot < 0.5 && this.characterMechanics.sonicCharge >= 100) {
                    this.triggerSonicBoom();
                }
            } else if (this.characterMechanics.sonicCharge >= 100) {
                this.triggerSonicBoom();
            }
            if (dx !== 0 || dy !== 0) {
                this.characterMechanics.lastMoveDir = { x: dx, y: dy };
            }
            if (this.characterMechanics.sonicCharge >= 100 && this.frameCount % 5 === 0) {
                this.addParticle(this.player.x, this.player.y, '#00D4FF', 1, 'spark', 1.5);
            }
        }
        
        if (this.characterId === 'dataphantom') {
            this.player.phantomBoostTimer = (this.player.phantomBoostTimer || 0) - dt;
            if (this.player.phantomBoostTimer > 0 && this.frameCount % 5 === 0) {
                this.addParticle(this.player.x, this.player.y, '#98FF98', 1, 'glow', 1.0);
            }
        }

        if (this.xp >= this.xpRequired && !this.isPaused && !this.isGameOver && !this.isVictory) {
            this.levelUp();
        }
        
        if (!this.characterPickupSpawned && this.lockedCharacters.length > 0) {
            if (this.characterSpawnRoll === undefined) {
                this.characterSpawnRoll = Math.random();
                this.characterSpawnTime = 120 + Math.random() * 120; // 2 to 4 minutes
            }
            
            if (this.time > this.characterSpawnTime) {
                this.characterPickupSpawned = true;
                
                // 30% chance to actually spawn a pod this run
                if (this.characterSpawnRoll < 0.30) {
                    const charIdToSpawn = this.lockedCharacters[Math.floor(Math.random() * this.lockedCharacters.length)];
                    const charData = CHARACTERS.find(c => c.id === charIdToSpawn);
                    
                    const angle = Math.random() * Math.PI * 2;
                    const dist = 3000 + Math.random() * 2000; // 3000 to 5000 units away
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

    spawnEnemies(dt) {
        if (this.arena.id === 'world_boss_arena') {
            if (!this.worldBossSpawned) {
                this.worldBossSpawned = true;
                const baseMap = {'world_boss_0': 'boss_nebula_devourer', 'world_boss_1': 'boss_plasma_kraken', 'world_boss_2': 'boss_stellar_colossus', 'world_boss_3': 'boss_cosmic_wyrm'};
                const baseBossTemplate = ENEMIES.find(e => e.id === (baseMap[this.worldBossId] || 'boss_nebula_devourer'));
                const boss = {
                    ...baseBossTemplate, id: 'world_boss', name: this.worldBossName, hp: 50000000, maxHp: 50000000, damage: 50 * this.difficulty.enemyDmgMult, isBoss: true, isWorldBoss: true, originalBossId: baseBossTemplate.id
                };
                const angle = Math.random() * Math.PI * 2;
                const dist = 600;
                boss.x = this.player.x + Math.cos(angle) * dist;
                boss.y = this.player.y + Math.sin(angle) * dist;
                this.enemies.push(boss);
                this.isBossActive = true;
                this.addDamageText(this.player.x, this.player.y - 60, `WARNING: WORLD BOSS DETECTED!`, '#ff0000');
                SFXManager.playBossSpawn();
            }
            return;
        }

        if (this.arena.duration === Infinity) {
            if (!this.lastBossSpawnTime) this.lastBossSpawnTime = 0;
            if (this.time > 0 && this.time - this.lastBossSpawnTime >= 180) { // Every 3 minutes
                this.lastBossSpawnTime = this.time;
                const boss = selectBossForArena(this.arena.id);
                if (boss) {
                    this.isBossActive = true;
                    this.enemies = []; // Clear all other enemies
                    const angle = Math.random() * Math.PI * 2;
                    const dist = Math.max(this.canvas.width / this.zoom, this.canvas.height / this.zoom) / 2 + 50;
                    const ex = this.player.x + Math.cos(angle) * dist;
                    const ey = this.player.y + Math.sin(angle) * dist;
                    const progress = this.time / 300;
                    const bossHpMult = 1.0 * this.difficulty.enemyHpMult * (1.0 + progress * 0.5) * (this.bossModifiers.hide ? 1.5 : 1.0);
                    const bossDmgMult = 1.0 * this.difficulty.enemyDmgMult * (1.0 + progress * 0.5) * (this.bossModifiers.fury ? 1.3 : 1.0);
                    const speedMult = this.bossModifiers.frenzy ? 1.3 : 1.0;
                    this.enemies.push({ ...boss, x: ex, y: ey, maxHp: boss.hp * bossHpMult, hp: boss.hp * bossHpMult, damage: boss.damage * bossDmgMult, speedMult });
                    this.encounteredEnemies.add(boss.id);
                    this.addDamageText(this.player.x, this.player.y - 60, `WARNING: ${boss.name} APPROACHING!`, '#ff0000');
                    SFXManager.playBossSpawn();
                }
            }
        } else if (this.time >= this.arena.duration - 30 && !this.bossSpawned) {
            this.bossSpawned = true;
            
            const arenaIndex = ARENAS.findIndex(a => a.id === this.arena.id);
            const isBossArena = [1, 3, 5, 7, 9].includes(arenaIndex); // Arenas 2, 4, 6, 8, 10
            
            if (isBossArena) { // Boss encounter
                this.isBossActive = true;
                this.enemies = []; // Clear all other enemies
                const boss = selectBossForArena(this.arena.id);
                if (boss) {
                    const angle = Math.random() * Math.PI * 2;
                    const dist = Math.max(this.canvas.width / this.zoom, this.canvas.height / this.zoom) / 2 + 50;
                    const ex = this.player.x + Math.cos(angle) * dist;
                    const ey = this.player.y + Math.sin(angle) * dist;
                    
                    const sectorDifficultyScale = Math.pow(1.15, arenaIndex);
                    
                    const bossHpMult = 1.0 * this.difficulty.enemyHpMult * (this.bossModifiers.hide ? 1.5 : 1.0) * sectorDifficultyScale;
                    const bossDmgMult = 1.0 * this.difficulty.enemyDmgMult * (this.bossModifiers.fury ? 1.3 : 1.0) * sectorDifficultyScale;
                    const speedMult = this.bossModifiers.frenzy ? 1.3 : 1.0;
                    this.enemies.push({ ...boss, x: ex, y: ey, maxHp: boss.hp * bossHpMult, hp: boss.hp * bossHpMult, damage: boss.damage * bossDmgMult, speedMult });
                    this.encounteredEnemies.add(boss.id);
                    this.addDamageText(this.player.x, this.player.y - 60, `WARNING: ${boss.name} APPROACHING!`, '#ff0000');
                    SFXManager.playBossSpawn();
                }
            }
        }

        if (this.isBossActive) return; // Prevent normal enemy spawns while boss is active

        const progress = this.arena.duration === Infinity ? this.time / 300 : Math.min(1, this.time / this.arena.duration);
        const effectiveProgress = Math.min(1, progress);
        const dynamicRate = this.envModifiers.enemySpawnRate * (this.dynamicDifficulty?.spawnRateMult || 1.0);
        const spawnRate = Math.max(0.05, (1.2 - (1.1 * Math.pow(effectiveProgress, 1.5))) / dynamicRate);
        
        if (Math.random() < dt / spawnRate) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.max(this.canvas.width / this.zoom, this.canvas.height / this.zoom) / 2 + 50;
            const ex = this.player.x + Math.cos(angle) * dist;
            const ey = this.player.y + Math.sin(angle) * dist;
            
            const arenaIndex = this.arena.duration === Infinity ? Math.min(9, Math.floor(progress * 5)) : ARENAS.findIndex(a => a.id === this.arena.id);
            let minTier = Math.max(1, arenaIndex);
            let maxTier = arenaIndex + 1;
            
            if (effectiveProgress > 0.33) maxTier += 1;
            if (effectiveProgress > 0.66) maxTier += 1;
            if (this.arena.duration === Infinity) maxTier += Math.floor(progress * 2);
            
            maxTier = Math.min(10, maxTier);

            let availableEnemies = ENEMIES.filter(e => 
                !e.isBoss && 
                e.tier >= minTier && e.tier <= maxTier
            );
            
            if (availableEnemies.length === 0) {
                availableEnemies = ENEMIES.filter(e => !e.isBoss && e.tier === 1);
            }
            
            const type = availableEnemies[Math.floor(Math.random() * availableEnemies.length)];
            
            // Steeper difficulty curve: exponentially scale HP and Damage based on the sector/arena index
            const sectorDifficultyScale = Math.pow(1.2, arenaIndex); 
            
            const hpMult = (1.0 + (2.0 * Math.pow(progress, 1.6))) * this.difficulty.enemyHpMult * sectorDifficultyScale;
            const dmgMult = (1.0 + (1.5 * Math.pow(progress, 1.4))) * this.difficulty.enemyDmgMult * sectorDifficultyScale;
            const spdMult = this.difficulty.speedMult || 1.0;
            
            if (this.time > 60 && Math.random() < 0.01 + (progress * 0.04)) {
                const elites = ENEMIES.filter(e => !e.isBoss && e.tier === Math.min(10, maxTier + 2));
                if (elites.length > 0) {
                    const elite = elites[Math.floor(Math.random() * elites.length)];
                    let newElite = this.enemyPool.length > 0 ? this.enemyPool.pop() : {};
                    Object.assign(newElite, elite);
                    newElite.x = ex; newElite.y = ey;
                    newElite.maxHp = elite.hp * hpMult * 2.5;
                    newElite.hp = newElite.maxHp;
                    newElite.damage = elite.damage * dmgMult * 1.5;
                    newElite.radius = elite.radius * 1.4;
                    newElite.speed = elite.speed * 1.2 * spdMult;
                    newElite.xp = elite.xp * 4;
                    newElite.isElite = true;
                    newElite.eliteGoldBonus = 3;
                    
                    this.enemies.push(newElite);
                    this.encounteredEnemies.add(elite.id);
                    SFXManager.playEnemySpawn();
                    return;
                }
            }
            
            let newEnemy = this.enemyPool.length > 0 ? this.enemyPool.pop() : {};
            Object.assign(newEnemy, type);
            newEnemy.x = ex; newEnemy.y = ey;
            newEnemy.speed = type.speed * spdMult;
            newEnemy.maxHp = type.hp * hpMult;
            newEnemy.hp = newEnemy.maxHp;
            newEnemy.damage = type.damage * dmgMult;
            
            this.enemies.push(newEnemy);
            this.encounteredEnemies.add(type.id);
        }
    }

    updateHazards(dt) {
        if (this.difficulty.hazardChance > 0 && Math.random() < this.difficulty.hazardChance * dt) {
            const hx = this.player.x + (Math.random() * 600 - 300);
            const hy = this.player.y + (Math.random() * 600 - 300);
            this.hazards.push({
                x: hx, y: hy,
                radius: 60,
                damage: 30 * this.difficulty.enemyDmgMult,
                timer: 2.0, // 2 seconds warning
                active: false
            });
        }

        this.hazards = this.hazards.filter(h => {
            h.timer -= dt;
            if (h.timer <= 0 && !h.active) {
                h.active = true;
                h.timer = 0.5; // active for 0.5 seconds
                // Check collision
                if (Math.hypot(this.player.x - h.x, this.player.y - h.y) < this.player.radius + h.radius) {
                    this.takeDamage(h.damage);
                }
                this.addParticle(h.x, h.y, '#ff4500', 20);
            }
            return h.timer > 0;
        });
    }

    updateWeapons(dt) {
        const timeMultiplier = (this.characterId === 'neobyte' && this.player.bannerBuff) ? 1.3 : 1.0;
        this.player.weapons.forEach(w => {
            w.timer -= dt * timeMultiplier;
            if (w.timer <= 0) {
                this.fireWeapon(w);
                
                const stats = getWeaponStatsAndMastery(this.save, w.id);
                const cdMultiplier = stats.cdMult;
                
                w.timer = (w.baseCooldown / 60) * Math.max(0.2, this.player.cooldownMult) * cdMultiplier;
            }
        });
    }

    fireWeapon(w) {
        fireWeaponLogic(this, w);
    }

    updateProjectiles(dt) {
        this.projectiles = this.projectiles.filter(p => {
            if (p.dead) return false;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;
            if (p.rotSpeed) p.rotation = (p.rotation || 0) + p.rotSpeed * dt;
            
            // Trails
            if (!p.isAoe && this.frameCount % 2 === 0) {
                if (p.type === 'dual_laser') this.addParticle(p.x, p.y, p.color, 1, 'spark', 0.5);
                else if (p.type === 'lightning') this.addParticle(p.x + (Math.random()-0.5)*10, p.y + (Math.random()-0.5)*10, p.color, 1, 'star', 0.5);
                else if (p.type === 'glitch_slash') this.addParticle(p.x, p.y, p.color, 1, 'slash', 0.8);
                else if (p.type === 'repair_beam') this.addParticle(p.x, p.y, '#ffffff', 1, 'hex', 0.5);
                else if (p.type === 'missile') this.addParticle(p.x, p.y, '#cccccc', 1, 'smoke', 0.6, { speed: 10 });
                else if (p.type === 'data_pulse') this.addParticle(p.x, p.y, p.color, 1, 'hex', 0.5);
                else if (p.type === 'phantom_orb') this.addParticle(p.x, p.y, p.color, 1, 'glow', 0.6);
                else if (p.type === 'railgun') this.addParticle(p.x, p.y, '#ffffff', 1, 'spark', 1.2);
                else if (p.type === 'sonic_wave') this.addParticle(p.x, p.y, p.color, 1, 'ring', 0.5);
                else if (p.type === 'supernova_beam') {
                    this.addParticle(p.x, p.y, '#ffffff', 1, 'star', 1.0);
                    this.addParticle(p.x, p.y, p.color, 1, 'spark', 1.0);
                }
                else this.addParticle(p.x, p.y, p.color, 1, 'glow', 0.5);
            }

            if (!p.isAoe) {
                if (p.pierce > 0) {
                    const cellSize = 100;
                    const cx = Math.floor(p.x / cellSize);
                    const cy = Math.floor(p.y / cellSize);
                    for (let x = cx - 1; x <= cx + 1; x++) {
                        for (let y = cy - 1; y <= cy + 1; y++) {
                            const cellEnemies = this.spatialHash?.get(`${x},${y}`);
                            if (cellEnemies) {
                                cellEnemies.forEach(e => {
                                    if (p.pierce <= 0) return;
                                    if (Math.abs(e.x - p.x) > e.radius + (p.radius || 5) || Math.abs(e.y - p.y) > e.radius + (p.radius || 5)) return;
                                    if (Math.hypot(e.x - p.x, e.y - p.y) < e.radius + (p.radius || 5)) {
                                        if (e.id === 'boss_supernova') {
                                            p.pierce = 0;
                                            p.dead = true;
                                            const angle = Math.atan2(this.player.y - e.y, this.player.x - e.x);
                                            this.enemyProjectiles.push({
                                                x: e.x, y: e.y,
                                                vx: Math.cos(angle) * 300,
                                                vy: Math.sin(angle) * 300,
                                                radius: p.radius * 1.5,
                                                damage: e.damage,
                                                life: 3,
                                                color: '#ff4500'
                                            });
                                            return;
                                        }

                                        if (!p.hitList) p.hitList = new Set();
                                        if (!p.hitList.has(e)) {
                                            p.hitList.add(e);
                                            this.damageEnemy(e, p.damage, p);
                                            
                                            // Impact Effects
                                            if (!e.isWorldBoss || Math.random() < 0.1) {
                                                this.shake(0.1);
                                                this.hitStopTimer = 0.02;
                                                this.particleManager.createHitEffect(e.x, e.y, p.color, Math.atan2(p.vy, p.vx), 1.5);
                                            }
                                            
                                            if (p.type === 'dual_laser') this.addParticle(e.x, e.y, p.color, 10, 'spark', 2);
                                            if (p.type === 'stomp') this.addParticle(e.x, e.y, '#888888', 10, 'spark', 2);
                                            if (p.type === 'glitch_slash') this.addParticle(e.x, e.y, p.color, 8, 'spark', 2);
                                            if (p.type === 'missile') this.particleManager.createExplosion(e.x, e.y, '#ff4500', 1.0, 'drone');
                                            if (p.type === 'data_pulse') this.addParticle(e.x, e.y, p.color, 10, 'spark', 2);
                                            if (p.type === 'phantom_orb') this.addParticle(e.x, e.y, p.color, 15, 'spark', 1.5);
                                            if (p.type === 'railgun') this.addParticle(e.x, e.y, '#ffffff', 20, 'spark', 3);
                                            if (p.type === 'sonic_wave') this.addParticle(e.x, e.y, p.color, 10, 'spark', 2);

                                            p.pierce--;
                                            if (p.pierce <= 0) p.dead = true;
                                            
                                            if (p.chainCount > 0) {
                                                p.chainCount--;
                                                let chainTarget = null;
                                                let minChainDist = p.type === 'buzzsaw' ? 600 : 200;
                                                this.enemies.forEach(ce => {
                                                    if (ce !== e && !p.hitList.has(ce)) {
                                                        const d = Math.hypot(ce.x - e.x, ce.y - e.y);
                                                        if (d < minChainDist) { minChainDist = d; chainTarget = ce; }
                                                    }
                                                });
                                                if (chainTarget) {
                                                    const chainAngle = Math.atan2(chainTarget.y - e.y, chainTarget.x - e.x);
                                                    p.x = e.x; p.y = e.y;
                                                    const speed = Math.hypot(p.vx, p.vy) || 300;
                                                    p.vx = Math.cos(chainAngle) * speed;
                                                    p.vy = Math.sin(chainAngle) * speed;
                                                    this.addParticle(e.x, e.y, p.color, 5, 'spark', 1.5);
                                                    if (p.dead) {
                                                        p.dead = false; // keep alive for the chain bounce
                                                        p.pierce = 1;
                                                    }
                                                }
                                            }
                                            
                                            if (p.weaponId === 'supernovaBeam') {
                                                this.particleManager.createExplosion(e.x, e.y, '#ffaa00', 1.5);
                                                this.enemies.forEach(ce => {
                                                    if (ce === e || Math.abs(ce.x - e.x) > 60 || Math.abs(ce.y - e.y) > 60) return;
                                                    if (Math.hypot(ce.x - e.x, ce.y - e.y) < 60) {
                                                        this.damageEnemy(ce, p.damage * 0.3);
                                                    }
                                                });
                                            }
                                            
                                            if (p.isMastered && p.weaponId === 'napBeam') {
                                                let nearest = null;
                                                let minDist = 150;
                                                this.enemies.forEach(ce => {
                                                    if (ce !== e && !p.hitList.has(ce)) {
                                                        const d = Math.hypot(ce.x - e.x, ce.y - e.y);
                                                        if (d < minDist) { minDist = d; nearest = ce; }
                                                    }
                                                });
                                                if (nearest) {
                                                    this.damageEnemy(nearest, p.damage * 0.5);
                                                    p.hitList.add(nearest);
                                                    this.addParticle(nearest.x, nearest.y, '#4169E1', 5);
                                                    const distToNearest = Math.hypot(nearest.x - e.x, nearest.y - e.y);
                                                    const chainAngle = Math.atan2(nearest.y - e.y, nearest.x - e.x);
                                                    this.projectiles.push({
                                            x: e.x + (nearest.x - e.x) / 2,
                                            y: e.y + (nearest.y - e.y) / 2,
                                            vx: Math.cos(chainAngle) * 0.01,
                                            vy: Math.sin(chainAngle) * 0.01,
                                            radius: distToNearest / 3,
                                            damage: 0,
                                            pierce: 0,
                                            life: 0.15,
                                            color: '#4169E1',
                                            type: 'lightning'
                                        });
                                    }
                                }
                            }
                        }
                                });
                            }
                        }
                    }
                }
            } else {
                const checkAoe = (callback, extraRadius = 0) => {
                    const cellSize = 100;
                    const r = p.radius + extraRadius;
                    const minX = Math.floor((p.x - r - 50) / cellSize);
                    const maxX = Math.floor((p.x + r + 50) / cellSize);
                    const minY = Math.floor((p.y - r - 50) / cellSize);
                    const maxY = Math.floor((p.y + r + 50) / cellSize);
                    for (let x = minX; x <= maxX; x++) {
                        for (let y = minY; y <= maxY; y++) {
                            const cellEnemies = this.spatialHash?.get(`${x},${y}`);
                            if (cellEnemies) cellEnemies.forEach(callback);
                        }
                    }
                };

                if (p.pulse) {
                    p.radius += 500 * dt;
                    checkAoe(e => {
                        if (Math.abs(e.x - p.x) > p.radius + e.radius || Math.abs(e.y - p.y) > p.radius + e.radius) return;
                        if (Math.hypot(e.x - p.x, e.y - p.y) < p.radius) {
                            if (!p.hitList) p.hitList = new Set();
                            if (!p.hitList.has(e)) {
                                p.hitList.add(e);
                                this.damageEnemy(e, p.damage);
                                this.addParticle(e.x, e.y, p.color, 5);
                            }
                        }
                    });
                } else if (p.pushback) {
                    p.x = this.player.x;
                    p.y = this.player.y;
                    checkAoe(e => {
                        if (Math.abs(e.x - p.x) > p.radius + e.radius || Math.abs(e.y - p.y) > p.radius + e.radius) return;
                        const dist = Math.hypot(e.x - p.x, e.y - p.y);
                        if (dist < p.radius) {
                            if (this.frameCount % 15 === 0) {
                                this.damageEnemy(e, p.damage);
                                if (p.burn) {
                                    this.addParticle(e.x, e.y, '#ff4500', 3);
                                }
                            }
                            const pushResist = e.isWorldBoss ? 0 : (e.isBoss ? 0.05 : (e.isTank ? 0.2 : 1));
                            const isUnstoppable = e.isBoss && this.bossModifiers.unstoppable;
                            if (!isUnstoppable && pushResist > 0) {
                                const angle = Math.atan2(e.y - p.y, e.x - p.x);
                                e.x += Math.cos(angle) * p.pushback * pushResist * dt;
                                e.y += Math.sin(angle) * p.pushback * pushResist * dt;
                            }
                        }
                    });
                    
                    if (p.isMastered && p.weaponId === 'shieldBubble' && this.frameCount % 30 === 0) {
                        const inRange = [];
                        checkAoe(e => {
                            if (Math.hypot(e.x - p.x, e.y - p.y) < p.radius * 2) inRange.push(e);
                        }, p.radius);
                        if (inRange.length > 0) {
                            const target = inRange[Math.floor(Math.random() * inRange.length)];
                            const angle = Math.atan2(target.y - p.y, target.x - p.x);
                            this.projectiles.push({
                                x: p.x, y: p.y,
                                vx: Math.cos(angle) * 400,
                                vy: Math.sin(angle) * 400,
                                radius: 3,
                                damage: p.damage * 0.5,
                                pierce: 1,
                                life: 1,
                                color: '#FFD700',
                                type: 'beam'
                            });
                        }
                    }
                } else {
                    if (this.frameCount % 15 === 0) {
                        checkAoe(e => {
                            if (Math.abs(e.x - p.x) > p.radius + e.radius || Math.abs(e.y - p.y) > p.radius + e.radius) return;
                            if (Math.hypot(e.x - p.x, e.y - p.y) < p.radius) {
                                this.damageEnemy(e, p.damage);
                                this.addParticle(e.x, e.y, p.weaponId === 'napalm' ? '#ff4500' : p.color, 2);
                                if (p.isMastered && p.weaponId === 'napalm') {
                                    e.slowTimer = 0.5;
                                }
                            }
                        });
                    }
                }
            }
            return p.life > 0;
        });

        if (this.enemyProjectiles) {
            this.enemyProjectiles = this.enemyProjectiles.filter(p => {
                if (p.dead) return false;
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.life -= dt;
                
                if (Math.hypot(this.player.x - p.x, this.player.y - p.y) < this.player.radius + p.radius) {
                    this.takeDamage(p.damage);
                    p.dead = true;
                }
                return p.life > 0;
            });
        }
    }

    updateEnemies(dt) {
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            let e = this.enemies[i];
            if (e.hp <= 0) {
                SFXManager.playEnemyDeath();
                this.kills++;
                this.enemyKills[e.id] = (this.enemyKills[e.id] || 0) + 1;
                
                if (this.player.charAugments?.includes('dat_drain')) {
                    this.player.drainCount = (this.player.drainCount || 0) + 1;
                    if (this.player.drainCount >= 10) {
                        this.player.hp = Math.min(this.player.maxHp, this.player.hp + this.player.maxHp * 0.01);
                        this.callbacks.onHpChange(this.player.hp, this.player.maxHp);
                        this.addParticle(this.player.x, this.player.y, '#8A2BE2', 5, 'glow');
                        this.player.drainCount = 0;
                    }
                }
                if (this.player.charAugments?.includes('code_virus')) {
                    this.enemies.forEach(other => {
                        if (other !== e && Math.hypot(other.x - e.x, other.y - e.y) < 100) {
                            other.hacked = true;
                            other.color = '#39FF14';
                        }
                    });
                }

                if (this.characterId === 'novabyte' && Math.random() < 0.10 && !e.isBoss) {
                    this.particleManager.createExplosion(e.x, e.y, '#FF007F', 1.5 * this.player.areaMult, 'default');
                    this.enemies.forEach(other => {
                        if (other !== e && Math.hypot(other.x - e.x, other.y - e.y) < 100 * this.player.areaMult) {
                            this.damageEnemy(other, 20 * this.player.damageMult);
                        }
                    });
                }
                
                if (this.characterId === 'pandypaws' && Math.random() < 0.05 && !e.isBoss) {
                    this.pickups.push({ x: e.x + Math.random()*20-10, y: e.y + Math.random()*20-10, type: 'scrap', color: '#aaaaaa', icon: '⚙️' });
                }
                
                let xpValue = e.xp;
                if (e.isBoss && this.bossModifiers.hide) {
                    xpValue *= 1.5;
                }
                
                const progress = this.arena?.duration === Infinity ? this.time / 300 : Math.min(1, this.time / (this.arena?.duration || 300));
                xpValue *= (1.0 + (progress * 2.0)); // Scale XP heavily in late game
                
                this.pickups.push({ x: e.x, y: e.y, type: 'xp', value: xpValue, color: '#00ffcc' });
                
                // Death Splatter + Kill Effect cosmetic
                this.particleManager.createExplosion(e.x, e.y, e.color, e.isBoss ? 2 : 0.6, e.id);
                this.shake(e.isBoss ? 0.5 : 0.05);


                if (this.killEffect !== 'none') {
                    this.particleManager.createKillEffect(e.x, e.y, this.killEffect);
                }

                if (e.isBoss) {
                    const fragmentReward = 1 + (this.bossModifiers.frenzy ? 1 : 0);
                    this.pickups.push({ x: e.x, y: e.y, type: 'fragment', value: fragmentReward, color: '#a855f7' });
                    
                    if (this.player.charAugments?.includes('nova_nuke')) {
                        this.pickups.push({ x: e.x - 20, y: e.y + 20, type: 'nuke', color: '#ff0000', icon: '☢️' });
                    }
                    
                    let extraGold = 1000; // Base boss gold
                    if (this.bossModifiers.fury) extraGold += 500;
                    if (this.bossModifiers.unstoppable) extraGold += 1000;
                    if (this.bossModifiers.regen) extraGold += 800;

                    if (extraGold > 0) {
                        this.pickups.push({ x: e.x + 10, y: e.y + 10, type: 'gold', value: extraGold, color: '#ffd700' });
                    }

                    this.addDamageText(e.x, e.y - 20, `BOSS DEFEATED!`, '#ffff00');
                    this.isBossActive = false;
                } else {
                    const baseGoldChance = this.arena.duration === Infinity ? 0.30 : 0.50;
                    if (Math.random() < baseGoldChance + (this.player.luck * 0.02)) {
                        const goldValue = 5 + Math.floor(this.time / 30) * 2;
                        const goldMultiplier = e.isElite ? (e.eliteGoldBonus || 2) : 1;
                        const goldCount = e.isElite ? 2 : 1;
                        for (let gi = 0; gi < goldCount; gi++) {
                            this.pickups.push({ x: e.x + Math.random()*20-10, y: e.y + Math.random()*20-10, type: 'gold', value: goldValue * goldMultiplier, color: '#ffd700' });
                        }
                    }
                    if (this.player.charAugments?.includes('code_hack') && Math.random() < 0.05) {
                        this.pickups.push({ x: e.x, y: e.y, type: 'gold', value: 10, color: '#ffd700' });
                    }
                    if (Math.random() < 0.01 + (this.player.luck * 0.001)) {
                        const pickupTypes = [
                            { type: 'nuke', color: '#ff0000', icon: '☢️' },
                            { type: 'magnet_power', color: '#0000ff', icon: '🧲' },
                            { type: 'shield_power', color: '#ffff00', icon: '🛡️' }
                        ];
                        const pt = pickupTypes[Math.floor(Math.random() * pickupTypes.length)];
                        this.pickups.push({ x: e.x + Math.random()*20-10, y: e.y + Math.random()*20-10, type: pt.type, color: pt.color, icon: pt.icon });
                    }
                }
                
                this.enemyPool.push(e);
                this.enemies[i] = this.enemies[this.enemies.length - 1];
                this.enemies.pop();
                continue;
            }
            
            const dx = this.player.x - e.x;
            const dy = this.player.y - e.y;
            const dist = Math.hypot(dx, dy);
            
            // --- Custom Enemy Mechanics ---
            if (e.hacked) {
                let nearest = null;
                let minDist = 400;
                this.enemies.forEach(other => {
                    if (other !== e && !other.hacked && Math.hypot(other.x - e.x, other.y - e.y) < minDist) {
                        minDist = Math.hypot(other.x - e.x, other.y - e.y);
                        nearest = other;
                    }
                });
                
                if (nearest) {
                    const hx = nearest.x - e.x;
                    const hy = nearest.y - e.y;
                    const hdist = Math.hypot(hx, hy);
                    const currentSpeed = e.speed * (e.speedMult || 1) * 60 * dt;
                    e.x += (hx / hdist) * currentSpeed;
                    e.y += (hy / hdist) * currentSpeed;
                    
                    if (hdist < e.radius + nearest.radius) {
                        if (!e.attackTimer || e.attackTimer <= 0) {
                            this.damageEnemy(nearest, e.damage);
                            e.hp -= nearest.damage; // hacked enemy takes damage back
                            e.attackTimer = 1.0;
                        }
                    }
                } else {
                    const pdx = this.player.x - e.x;
                    const pdy = this.player.y - e.y;
                    const pdist = Math.hypot(pdx, pdy);
                    const currentSpeed = e.speed * (e.speedMult || 1) * 60 * dt;
                    if (pdist > 100) {
                        e.x += (pdx / pdist) * currentSpeed;
                        e.y += (pdy / pdist) * currentSpeed;
                    }
                }
                if (e.attackTimer > 0) e.attackTimer -= dt;
                e.hp -= e.maxHp * 0.05 * dt; // Die over 20 seconds
                continue;
            }

            if (e.isWorldBoss) {
                e.damage += dt * 2; // Damage scales infinitely over time
                e.speedMult = (e.speedMult || 1) + (dt * 0.01); // Slowly gets faster over time to ensure it catches the player
            }
            if (e.id === 'void_crawler') {
                if (!e.burrowTimer) e.burrowTimer = 3;
                e.burrowTimer -= dt;
                if (e.burrowTimer <= 0) {
                    e.burrowed = !e.burrowed;
                    e.burrowTimer = e.burrowed ? 2 : 3;
                }
            }
            if (e.id === 'quantum_swarm') {
                let nearby = 0;
                const cellSize = 100;
                const cx = Math.floor(e.x / cellSize);
                const cy = Math.floor(e.y / cellSize);
                for (let x = cx - 1; x <= cx + 1; x++) {
                    for (let y = cy - 1; y <= cy + 1; y++) {
                        const cellEnemies = this.spatialHash?.get(`${x},${y}`);
                        if (cellEnemies) {
                            cellEnemies.forEach(other => {
                                if (other.id === 'quantum_swarm' && Math.hypot(other.x - e.x, other.y - e.y) < 100) nearby++;
                            });
                        }
                    }
                }
                e.speedMult = 1 + (nearby * 0.2);
            }
            if (e.id === 'eclipse_harpy') {
                if (!e.diveTimer) e.diveTimer = 5;
                e.diveTimer -= dt;
                if (e.diveTimer <= 0) {
                    e.speedMult = 3;
                    e.diveTimer = 5;
                }
                if (e.speedMult > 1) e.speedMult -= dt * 2;
                else e.speedMult = 1;
            }
            if (e.id === 'black_hole_tick') {
                if (dist < this.player.radius + e.radius && !e.latched) {
                    e.latched = true;
                }
                if (e.latched) {
                    e.x = this.player.x;
                    e.y = this.player.y;
                    e.radius += dt * 2; // grow
                    if (this.frameCount % 30 === 0) {
                        this.takeDamage(2 + this.player.armor);
                    }
                }
            }
            if (e.id === 'cosmic_horror_spawn') {
                e.radius += dt * 0.5;
                e.damage += dt * 0.5;
                e.maxHp += dt * 2;
                e.hp += dt * 2;
            }
            if (e.id === 'boss_gravity_behemoth') {
                if (dist < 400) {
                    this.player.x -= (dx / dist) * 50 * dt;
                    this.player.y -= (dy / dist) * 50 * dt;
                }
            }
            if (e.id === 'boss_cosmic_hydra') {
                if (!e.heads) e.heads = 3;
                if (e.hp < e.maxHp * 0.7 && e.heads === 3) e.heads = 4;
                if (e.hp < e.maxHp * 0.4 && e.heads === 4) e.heads = 5;
                if (e.hp < e.maxHp * 0.1 && e.heads === 5) e.heads = 6;
            }
            
            let targetX = this.player.x;
            let targetY = this.player.y;
            let isTargetingDecoy = false;
            let activeDecoy = null;

            if (this.characterId === 'holodrift' && this.characterMechanics?.decoys?.length > 0 && !e.isBoss) {
                let nearestDecoy = null;
                let minDecoyDist = 600;
                this.characterMechanics.decoys.forEach(d => {
                    const distToDecoy = Math.hypot(d.x - e.x, d.y - e.y);
                    if (distToDecoy < minDecoyDist) { minDecoyDist = distToDecoy; nearestDecoy = d; }
                });
                if (nearestDecoy) {
                    targetX = nearestDecoy.x;
                    targetY = nearestDecoy.y;
                    isTargetingDecoy = true;
                    activeDecoy = nearestDecoy;
                }
            }

            const targetDx = targetX - e.x;
            const targetDy = targetY - e.y;
            const targetDist = Math.hypot(targetDx, targetDy);
            
            // Movement
            if (targetDist > 0 && !e.latched && !e.burrowed) {
                const baseSpeed = e.speedMult ? e.speed * e.speedMult : e.speed;
                let currentSpeed = baseSpeed;
                if (e.slowTimer > 0 && !(e.isBoss && this.bossModifiers.unstoppable)) {
                    currentSpeed *= 0.5;
                }
                currentSpeed *= this.envModifiers.enemySpeed * (this.dynamicDifficulty?.speedMult || 1.0);
                e.x += (targetDx / targetDist) * currentSpeed * 60 * dt;
                e.y += (targetDy / targetDist) * currentSpeed * 60 * dt;
            }
            if (e.slowTimer > 0) e.slowTimer -= dt;
            
            if (this.characterId === 'dataphantom' && dist < 150 && !e.burrowed && !e.dataLeeched) {
                e.dataLeeched = true;
                e.speedMult = (e.speedMult || 1) * 0.7;
                this.player.phantomBoostTimer = 2.0;
                this.addParticle(e.x, e.y, '#98FF98', 10, 'spark');
                this.addParticle(e.x, e.y, '#98FF98', 5, 'implode', 1.5, { targetX: this.player.x, targetY: this.player.y });
                this.addDamageText(e.x, e.y - 20, "LEECHED", '#98FF98');
            }

            if (isTargetingDecoy) {
                if (targetDist < 15 + e.radius && !e.burrowed) {
                    if (!e.attackTimer || e.attackTimer <= 0) {
                        activeDecoy.hp -= e.damage;
                        e.attackTimer = 1.0;
                    }
                }
            } else {
                if (dist < this.player.radius + e.radius && !e.burrowed) {
                    if (!e.attackTimer || e.attackTimer <= 0) {
                        this.takeDamage(e.damage);
                        e.attackTimer = 1.0;
                    }
                }
            }
            if (e.attackTimer > 0) e.attackTimer -= dt;

            if (e.isBoss && this.bossModifiers.regen && this.frameCount % 60 === 0) {
                if (e.hp < e.maxHp) {
                    const healAmount = e.maxHp * 0.01;
                    e.hp = Math.min(e.maxHp, e.hp + healAmount);
                    this.addParticle(e.x, e.y, '#00ff00', 5, 'spark', 1);
                    this.addDamageText(e.x, e.y - 20, `+${Math.floor(healAmount)}`, '#00ff00');
                }
            }

            // Projectile attacks
            if (!e.burrowed) {
                if (e.isRanged) {
                    if (!e.shootTimer) e.shootTimer = 2 + Math.random() * 2;
                    e.shootTimer -= dt;
                    if (e.shootTimer <= 0 && dist < 500) {
                        e.shootTimer = 3;
                        const angle = Math.atan2(dy, dx);
                        this.enemyProjectiles.push({
                            x: e.x, y: e.y,
                            vx: Math.cos(angle) * 200,
                            vy: Math.sin(angle) * 200,
                            radius: 6,
                            damage: e.damage * 0.5,
                            life: 3,
                            color: e.color
                        });
                    }
                }
                
                if (e.isBoss) {
                    updateBossAbilities(e, dt, this.player, this.enemyProjectiles, this.addParticle.bind(this), this.addDamageText.bind(this), this.takeDamage.bind(this), this.enemies, this.frameCount, this.arena.id, this.bossModifiers);
                }
            }
        }
    }

    updatePickups(dt) {
        this.pickups = this.pickups.filter(p => {
            if (this.frameCount % 10 === 0 && p.type === 'xp') {
                this.addParticle(p.x, p.y, p.color, 1, 'glow', 0.3); // XP sparkles
            }
            const dist = Math.hypot(this.player.x - p.x, this.player.y - p.y);
            if (dist < this.player.radius + 10) {
                this.particleManager.createPickup(p.x, p.y, p.color); // Collection burst
                if (p.type === 'xp') {
                    SFXManager.playPickup();
                    this.xp += p.value * this.player.xpMult;
                    if (this.xp >= this.xpRequired && !this.isPaused) this.levelUp();
                } else if (p.type === 'gold') {
                    SFXManager.playGoldPickup();
                    this.gold += Math.floor(p.value * this.player.goldMult);
                    this.callbacks.onGoldChange(this.gold);
                } else if (p.type === 'fragment') {
                    SFXManager.playGoldPickup();
                    if (this.callbacks.onFragmentFound) this.callbacks.onFragmentFound(p.value || 1);
                    this.addDamageText(this.player.x, this.player.y - 40, `+${p.value || 1} Relic Fragment!`, '#a855f7');

                } else if (p.type === 'nuke') {
                    SFXManager.playWeaponFire('novaPulse');
                    this.enemies.forEach(e => {
                        if (!e.isBoss) {
                            e.hp = 0;
                        }
                    });
                    this.addDamageText(this.player.x, this.player.y - 60, `NUCLEAR DETONATION`, '#ff0000');
                    this.shake(1.0);
                } else if (p.type === 'magnet_power') {
                    SFXManager.playLevelUp();
                    this.pickups.forEach(otherP => {
                        if (otherP.type === 'xp' || otherP.type === 'gold') {
                            otherP.x = this.player.x;
                            otherP.y = this.player.y;
                        }
                    });
                    this.addDamageText(this.player.x, this.player.y - 60, `MAGNETIC SURGE`, '#0000ff');
                } else if (p.type === 'shield_power') {
                    SFXManager.playGoldPickup();
                    this.player.invincibleTimer = 10;
                    this.addDamageText(this.player.x, this.player.y - 60, `SHIELD OVERCHARGE`, '#ffff00');
                } else if (p.type === 'scrap') {
                    SFXManager.playPickup();
                    this.characterMechanics.scrapArmor = Math.min(10, (this.characterMechanics.scrapArmor || 0) + 0.1);
                    this.addDamageText(this.player.x, this.player.y - 40, `+0.1 ARMOR`, '#aaaaaa');
                }
                return false;
            }
            if (dist < this.player.magnetRange) {
                // Ensure pickups always move faster than the player
                const playerMaxSpeed = this.player.speed * (this.player.speedMult || 1) * 60;
                const speed = Math.max(800, playerMaxSpeed * 2) * dt;
                p.x += ((this.player.x - p.x) / dist) * speed;
                p.y += ((this.player.y - p.y) / dist) * speed;
            }
            return true;
        });
    }

    damageEnemy(enemy, amount, projectile = null) {
        let damageMult = 1.0;
        let isFullyMastered = false;

        if (this.characterId === 'neobyte' && this.player.bannerBuff) {
            damageMult *= 1.3;
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
            // Boss always faces the player — so boss "forward" angle = angle from boss to player
            const bossForwardAngle = Math.atan2(this.player.y - enemy.y, this.player.x - enemy.x);
            // Projectile came from the direction opposite to its velocity
            const hitAngle = Math.atan2(-projectile.vy, -projectile.vx);
            // Angle between hit direction and boss forward
            let diff = Math.abs(hitAngle - bossForwardAngle);
            if (diff > Math.PI) diff = Math.PI * 2 - diff;

            if (enemy.weakSide === 'back' && diff < Math.PI * 0.35) {
                // Hit came from behind (same direction boss is facing = behind it)
                isWeakHit = true;
            } else if (enemy.weakSide === 'side' && diff > Math.PI * 0.3 && diff < Math.PI * 0.7) {
                // Hit came from the sides
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
        
        if (this.player.charAugments?.includes('glt_corrupt') && Math.random() < 0.15 && !enemy.isBoss) {
            enemy.hacked = true;
            enemy.color = '#39FF14';
        }

        if (this.characterId === 'neonvortex' && !enemy.isBoss && enemy.hp > 0 && enemy.hp <= enemy.maxHp * 0.2) {
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
            
            // --- PREVENT DAMAGE TEXT LAG ON WORLD BOSS ---
            enemy.damageBuffer = (enemy.damageBuffer || 0) + finalDamage;
            if (isCrit) enemy.hadCritInBuffer = true;
            if (isWeakHit) enemy.hadWeakInBuffer = true;
            
            if (!enemy.lastDamageTextTime) enemy.lastDamageTextTime = this.time;
            
            if (this.time - enemy.lastDamageTextTime >= 0.25) { // Show damage every 0.25s
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
            if (Math.random() < 0.1) SFXManager.playEnemyHit(); // Throttle sound
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

    levelUp() {
        this.xp -= this.xpRequired;
        this.level++;
        this.xpRequired = Math.floor(this.xpRequired * 1.15 + 25);
        
        // Scale stats slightly and heal a bit (no longer full heal + god mode)
        this.player.maxHp = Math.floor(this.player.maxHp * 1.02);
        this.player.damageMult += 0.02;
        this.player.armor += 0.25;
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + (this.player.maxHp * 0.2));
        this.callbacks.onHpChange(this.player.hp, this.player.maxHp);
        
        if (this.player.charAugments?.includes('sky_ace')) {
            this.player.invincibleTimer = Math.max(this.player.invincibleTimer || 0, 3.0);
            this.player.iFrames = Math.max(this.player.iFrames || 0, 3.0);
            this.addDamageText(this.player.x, this.player.y - 40, "ACE MANEUVER", '#00D4FF');
        }
        if (this.player.charAugments?.includes('syn_amp')) {
            this.player.synAmpTimer = 5.0;
        }
        
        this.isPaused = true;
        
        // Skip VFX/SFX entirely in Global Raids, or if leveling up instantly at the start to prevent lag bursts
        if (this.time > 0.5 && this.arena.id !== 'world_boss_arena') {
            SFXManager.playLevelUp();
            this.particleManager.createLevelUp(this.player.x, this.player.y);
        }
        
        this.callbacks.onLevelUp(this.generateChoices());
    }

    rerollChoices() {
        this.callbacks.onLevelUp(this.generateChoices());
    }

    generateChoices() {
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

        const choices = [];
        const pool = [...UPGRADES].filter(u => 
            !this.banishedUpgrades.has(u.id) && 
            (!u.characterSpecific || u.characterSpecific === this.characterId)
        );
        for(let i=0; i<3; i++) {
            if (pool.length === 0) break;
            const idx = Math.floor(Math.random() * pool.length);
            const baseUpgrade = pool[idx];
            pool.splice(idx, 1);
            
            const rarity = getRarity();
            const uniqueName = `${this.player.name}'s ${baseUpgrade.name}`;
            
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

    applyUpgrade(upgrade) {
        if (upgrade.type === 'passive') {
            this.player[upgrade.stat] += upgrade.value;
            if (upgrade.stat === 'maxHp') {
                this.player.hp += upgrade.value;
                this.callbacks.onHpChange(this.player.hp, this.player.maxHp);
            }
            this.player.passives.push(upgrade);
            if (this.checkEvolutions) this.checkEvolutions();
        } else if (upgrade.type === 'weapon') {
            const levelIncrement = upgrade.value || 1;
            
            // Check if this weapon is part of an active synergy
            let appliedToSynergy = false;
            for (const synergy of SYNERGIES) {
                if (synergy.weapon1 === upgrade.weaponId || synergy.weapon2 === upgrade.weaponId) {
                    const activeSynergy = this.player.weapons.find(w => w.id === synergy.result);
                    if (activeSynergy) {
                        activeSynergy.level += levelIncrement;
                        appliedToSynergy = true;
                        break;
                    }
                }
            }

            if (!appliedToSynergy) {
                const existing = this.player.weapons.find(w => w.id === upgrade.weaponId);
                if (existing) {
                    existing.level += levelIncrement;
                } else {
                    this.player.weapons.push({ ...WEAPONS[upgrade.weaponId], level: levelIncrement, timer: 0 });
                }
                this.checkSynergies();
            }
        }
        this.isPaused = false;
    }

    checkSynergies() {
        for (const synergy of SYNERGIES) {
            const w1 = this.player.weapons.find(w => w.id === synergy.weapon1);
            const w2 = this.player.weapons.find(w => w.id === synergy.weapon2);
            
            if (w1 && w2) {
                // Remove base weapons
                this.player.weapons = this.player.weapons.filter(w => w.id !== synergy.weapon1 && w.id !== synergy.weapon2);
                
                // Add synergy weapon, combining their levels
                const newLevel = Math.max(w1.level, w2.level) + 1;
                this.player.weapons.push({ ...WEAPONS[synergy.result], level: newLevel, timer: 0 });
                
                // Show a notification or effect here if desired
                this.addDamageText(this.player.x, this.player.y - 40, "SYNERGY FORMED!", '#ff00ff');
                
                if (!this.save.discoveredSynergies) this.save.discoveredSynergies = [];
                if (!this.save.discoveredSynergies.includes(synergy.result)) {
                    this.save.discoveredSynergies.push(synergy.result);
                    SaveManager.save(this.save);
                }

                // Check again in case multiple synergies formed (rare but possible)
                this.checkSynergies();
                break;
            }
        }
        if (this.checkEvolutions) this.checkEvolutions();
    }

    checkEvolutions() {
        for (const evolution of EVOLUTIONS) {
            const baseWeapon = this.player.weapons.find(w => w.id === evolution.baseWeapon);
            const passive = this.player.passives.find(p => p.id === evolution.passive);
            
            if (baseWeapon && passive) {
                // Remove base weapon
                this.player.weapons = this.player.weapons.filter(w => w.id !== evolution.baseWeapon);
                
                // Add evolved weapon, keeping the level
                this.player.weapons.push({ ...WEAPONS[evolution.evolvedWeapon], level: baseWeapon.level, timer: 0 });
                
                this.addDamageText(this.player.x, this.player.y - 40, "WEAPON EVOLVED!", '#ff4500');
                
                // Check again in case multiple evolutions formed
                this.checkEvolutions();
                break;
            }
        }
    }

    gameOver() {
        this.isGameOver = true;
        SFXManager.playGameOver();
        this.callbacks.onGameOver({
            time: Math.floor(this.time),
            level: this.level,
            kills: this.kills,
            gold: this.gold,
            characterId: this.characterId,
            arenaId: this.arena?.id,
            encountered: Array.from(this.encounteredEnemies),
            enemyKills: this.enemyKills,
            worldBossDamage: this.worldBossDamage || 0
        });
    }

    victory() {
        this.isVictory = true;
        SFXManager.playVictory();
        this.callbacks.onVictory({
            time: Math.floor(this.time),
            level: this.level,
            kills: this.kills,
            gold: this.gold,
            arenaId: this.arena.id,
            characterId: this.characterId,
            encountered: Array.from(this.encounteredEnemies),
            enemyKills: this.enemyKills,
            worldBossDamage: this.worldBossDamage || 0
        });
    }

    draw() {
        renderGame.call(this);
    }
}