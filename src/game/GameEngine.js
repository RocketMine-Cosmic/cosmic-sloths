import { CHARACTERS, WEAPONS, UPGRADES, ENEMIES, ARENAS, SYNERGIES, CHARACTER_TALENTS, DIFFICULTIES, EVOLUTIONS, SKIN_COSMETICS, RELICS } from './Constants';
import { drawEnemy } from './EnemyRenderer';
import { SoundManager } from './SoundManager';
import { ParticleManager } from './ParticleManager';
import { selectBossForArena, updateBossAbilities } from './BossSystem';
import { SaveManager } from './SaveManager';
import { drawUI } from './UIRenderer';
import { drawPickups } from './PickupRenderer';
import { fireWeaponLogic } from './WeaponSystem';
import { drawProjectiles } from './ProjectileRenderer';

export class GameEngine {
    constructor(canvas, characterId, arenaId, difficultyId, save, callbacks, isEndless = false, worldBossId = null, worldBossName = null, startingWeaponId = null) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.callbacks = callbacks;
        this.characterId = characterId;
        this.save = save;
        this.worldBossId = worldBossId || 'world_boss_0';
        this.worldBossName = worldBossName || 'The World Eater';
        this.difficulty = DIFFICULTIES.find(d => d.id === difficultyId) || DIFFICULTIES[0];
        
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

        const equippedRelics = save.equippedRelics || [];
        const relicBonus = {
            maxHp: 0, speedMult: 0, damageMult: 0, magnetRange: 0, regen: 0, armor: 0, areaMult: 0, cooldownMult: 0, projSpeedMult: 0, goldMult: 0, xpMult: 0, luck: 0
        };

        equippedRelics.forEach(rId => {
            const r = RELICS.find(rd => rd.id === rId);
            if (r) {
                relicBonus[r.stat] = (relicBonus[r.stat] || 0) + r.value;
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
            speedMult: (1 + getStatBonus('speed') + (talentBonus.speedMult || 0) + (relicBonus.speedMult || 0)) * this.envModifiers.playerSpeed,
            damageMult: (baseChar.damageMult || 1) + getStatBonus('damage') + (talentBonus.damageMult || 0) + (relicBonus.damageMult || 0),
            magnetRange: (baseChar.magnetRange || 60) + getStatBonus('magnet') + (talentBonus.magnetRange || 0) + (relicBonus.magnetRange || 0),
            regen: baseChar.regen + getStatBonus('regen') + (talentBonus.regen || 0) + (relicBonus.regen || 0),
            armor: baseChar.armor + (talentBonus.armor || 0) + (relicBonus.armor || 0),
            areaMult: (baseChar.areaMult || 1) + (talentBonus.areaMult || 0) + (relicBonus.areaMult || 0),
            cooldownMult: (baseChar.cooldownMult || 1) - getStatBonus('cooldown') + (talentBonus.cooldownMult || 0) + (relicBonus.cooldownMult || 0),
            projSpeedMult: (baseChar.projSpeedMult || 1) + (talentBonus.projSpeedMult || 0) + (relicBonus.projSpeedMult || 0),
            goldMult: ((baseChar.goldMult || 1) + (talentBonus.goldMult || 0) + (relicBonus.goldMult || 0)) * this.difficulty.goldMult,
            xpMult: ((baseChar.xpMult || 1) + (talentBonus.xpMult || 0) + (relicBonus.xpMult || 0)) * this.difficulty.xpMult,
            luck: (baseChar.luck || 0) + getStatBonus('luck') + (talentBonus.luck || 0) + (relicBonus.luck || 0),
            color: baseChar.color,
            trail: save.cosmetics?.trail || 'default',
            weapons: [{ ...WEAPONS[initialWeaponId], level: 1, timer: 0 }],
            passives: [],
            passiveLevels: {}
        };
        
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
        this.xp = 0;
        this.banishedUpgrades = new Set();
        this.xpRequired = 10;
        this.gold = 0;
        this.kills = 0;

        if (arenaId === 'world_boss_arena') {
            // Instead of random upgrades, grant enough XP to reach Level 20
            // so the player can build their character properly!
            let totalXpNeeded = 0;
            let currentReq = 10;
            for (let i = 1; i < 20; i++) {
                totalXpNeeded += currentReq;
                currentReq = Math.floor(currentReq * 1.15 + 30);
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
        
        this.bindEvents();
        this.lastTime = performance.now();
        this.animationId = requestAnimationFrame(this.loop.bind(this));
    }

    takeDamage(amount) {
        if (this.player.invincibleTimer > 0 || this.player.iFrames > 0) return;
        const actualDmg = Math.max(1, amount - this.player.armor);
        this.player.hp -= actualDmg;
        this.player.iFrames = 0.2;
        this.callbacks.onHpChange(this.player.hp, this.player.maxHp);
        this.addDamageText(this.player.x, this.player.y - 20, actualDmg, '#ff0000');
        SoundManager.playPlayerHit();
        
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
            this.isPaused = true; // Safety net: auto-pause if a rendering or logic error occurs
        }
        this.lastTime = timestamp;
        this.animationId = requestAnimationFrame(this.loop.bind(this));
    }

    update(dt) {
        if (dt > 0.1) dt = 0.1; // Cap dt to prevent huge jumps
        this.lastDt = dt;
        
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
        
        if (this.joystick.x !== 0 || this.joystick.y !== 0) {
            dx = this.joystick.x;
            dy = this.joystick.y;
        } else if (dx !== 0 && dy !== 0) {
            const len = Math.sqrt(dx*dx + dy*dy);
            dx /= len; dy /= len;
        }
        
        const actualSpeed = this.player.speed * this.player.speedMult * 60 * dt;
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
        
        this.zoom = window.innerWidth < 768 ? 0.55 : 1;
        this.camera.x = this.player.x - (this.canvas.width / this.zoom) / 2;
        this.camera.y = this.player.y - (this.canvas.height / this.zoom) / 2;

        this.spawnEnemies(dt);
        this.updateWeapons(dt);
        this.updateProjectiles(dt);
        this.updateEnemies(dt);
        this.updatePickups(dt);
        this.updateHazards(dt);
        
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
        } else if (this.envEffect === 'solar_flare' && Math.random() < 0.02) {
            this.envParticles.push({ x: this.player.x + (Math.random() * vWidth - vWidth/2), y: this.player.y + (Math.random() * vHeight - vHeight/2), life: 1.5, maxLife: 1.5, size: 50 + Math.random() * 100 });
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
                    ...baseBossTemplate, id: 'world_boss', name: this.worldBossName, hp: 50000000, maxHp: 50000000, damage: 20 * this.difficulty.enemyDmgMult, isBoss: true, isWorldBoss: true, originalBossId: baseBossTemplate.id
                };
                const angle = Math.random() * Math.PI * 2;
                const dist = 600;
                boss.x = this.player.x + Math.cos(angle) * dist;
                boss.y = this.player.y + Math.sin(angle) * dist;
                this.enemies.push(boss);
                this.isBossActive = true;
                this.addDamageText(this.player.x, this.player.y - 60, `WARNING: WORLD BOSS DETECTED!`, '#ff0000');
                SoundManager.playBossSpawn();
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
                    const bossHpMult = 1.5 * this.difficulty.enemyHpMult * (1.0 + progress) * (this.bossModifiers.hide ? 2.0 : 1.0);
                    const bossDmgMult = 1.0 * this.difficulty.enemyDmgMult * (1.0 + progress * 0.5) * (this.bossModifiers.fury ? 1.5 : 1.0);
                    const speedMult = this.bossModifiers.frenzy ? 1.5 : 1.0;
                    this.enemies.push({ ...boss, x: ex, y: ey, maxHp: boss.hp * bossHpMult, hp: boss.hp * bossHpMult, damage: boss.damage * bossDmgMult, speedMult });
                    this.encounteredEnemies.add(boss.id);
                    this.addDamageText(this.player.x, this.player.y - 60, `WARNING: ${boss.name} APPROACHING!`, '#ff0000');
                    SoundManager.playBossSpawn();
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
                    
                    const sectorDifficultyScale = Math.pow(1.2, arenaIndex);
                    
                    const bossHpMult = 1.5 * this.difficulty.enemyHpMult * (this.bossModifiers.hide ? 2.0 : 1.0) * sectorDifficultyScale;
                    const bossDmgMult = 1.0 * this.difficulty.enemyDmgMult * (this.bossModifiers.fury ? 1.5 : 1.0) * sectorDifficultyScale;
                    const speedMult = this.bossModifiers.frenzy ? 1.5 : 1.0;
                    this.enemies.push({ ...boss, x: ex, y: ey, maxHp: boss.hp * bossHpMult, hp: boss.hp * bossHpMult, damage: boss.damage * bossDmgMult, speedMult });
                    this.encounteredEnemies.add(boss.id);
                    this.addDamageText(this.player.x, this.player.y - 60, `WARNING: ${boss.name} APPROACHING!`, '#ff0000');
                    SoundManager.playBossSpawn();
                }
            }
        }

        if (this.isBossActive) return; // Prevent normal enemy spawns while boss is active

        const progress = this.arena.duration === Infinity ? this.time / 300 : Math.min(1, this.time / this.arena.duration);
        const effectiveProgress = Math.min(1, progress);
        const spawnRate = Math.max(0.05, (1.2 - (1.1 * Math.pow(effectiveProgress, 1.5))) / this.envModifiers.enemySpawnRate);
        
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
            
            const hpMult = (1.0 + (3.0 * Math.pow(progress, 1.8))) * this.difficulty.enemyHpMult * sectorDifficultyScale;
            const dmgMult = (1.0 + (2.2 * Math.pow(progress, 1.5))) * this.difficulty.enemyDmgMult * sectorDifficultyScale;
            
            if (this.time > 60 && Math.random() < 0.01 + (progress * 0.04)) {
                const elites = ENEMIES.filter(e => !e.isBoss && e.tier === Math.min(10, maxTier + 2));
                if (elites.length > 0) {
                    const elite = elites[Math.floor(Math.random() * elites.length)];
                    this.enemies.push({
                        ...elite,
                        x: ex, y: ey,
                        maxHp: elite.hp * hpMult * 2.5,
                        hp: elite.hp * hpMult * 2.5,
                        damage: elite.damage * dmgMult * 1.5,
                        radius: elite.radius * 1.4,
                        speed: elite.speed * 1.2,
                        xp: elite.xp * 4,
                        isElite: true,
                        eliteGoldBonus: 3,
                    });
                    this.encounteredEnemies.add(elite.id);
                    SoundManager.playEnemySpawn();
                    return;
                }
            }
            
            this.enemies.push({ ...type, x: ex, y: ey, maxHp: type.hp * hpMult, hp: type.hp * hpMult, damage: type.damage * dmgMult });
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
        this.player.weapons.forEach(w => {
            w.timer -= dt;
            if (w.timer <= 0) {
                this.fireWeapon(w);
                
                const getWeaponUpgrade = (wId, stat) => {
                    const perm = this.save.permanentWeaponUpgrades?.[wId]?.[stat] || 0;
                    const week = this.save.weeklyWeaponUpgrades?.[wId]?.[stat] || 0;
                    const season = this.save.seasonalWeaponUpgrades?.[wId]?.[stat] || 0;
                    return perm + week + season;
                };
                const cdUpgradeLevel = getWeaponUpgrade(w.id, 'cooldown');
                const cdMultiplier = 1 - (cdUpgradeLevel * 0.05); // -5% per level
                
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
            
            // Trails
            if (!p.isAoe && this.frameCount % 2 === 0) {
                if (p.type === 'dual_laser') this.addParticle(p.x, p.y, p.color, 1, 'spark', 0.5);
                else if (p.type === 'lightning') this.addParticle(p.x + (Math.random()-0.5)*10, p.y + (Math.random()-0.5)*10, p.color, 1, 'spark', 0.8);
                else if (p.type === 'glitch_slash') this.addParticle(p.x, p.y, p.color, 2, 'spark', 1.0);
                else if (p.type === 'repair_beam') this.addParticle(p.x, p.y, '#ffffff', 1, 'spark', 0.5);
                else if (p.type === 'missile') this.addParticle(p.x, p.y, '#ff4500', 3, 'spark', 1.0);
                else if (p.type === 'data_pulse') this.addParticle(p.x, p.y, p.color, 1, 'spark', 0.5);
                else if (p.type === 'phantom_orb') this.addParticle(p.x, p.y, p.color, 2, 'spark', 0.8);
                else if (p.type === 'railgun') this.addParticle(p.x, p.y, '#ffffff', 1, 'spark', 1.2);
                else if (p.type === 'sonic_wave') this.addParticle(p.x, p.y, p.color, 1, 'spark', 0.5);
                else if (p.type === 'supernova_beam') {
                    this.addParticle(p.x, p.y, '#ffffff', 2, 'spark', 1.5);
                    this.addParticle(p.x, p.y, p.color, 2, 'spark', 1.0);
                }
                else this.addParticle(p.x, p.y, p.color, 1, 'spark', 0.5);
            }

            if (!p.isAoe) {
                this.enemies.forEach(e => {
                    if (p.pierce > 0 && Math.hypot(e.x - p.x, e.y - p.y) < e.radius + p.radius) {
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
                                }
                            }
                        }
                    }
                });
            } else {
                if (p.pulse) {
                    p.radius += 500 * dt;
                    this.enemies.forEach(e => {
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
                    this.enemies.forEach(e => {
                        const dist = Math.hypot(e.x - p.x, e.y - p.y);
                        if (dist < p.radius) {
                            if (this.frameCount % 15 === 0) {
                                this.damageEnemy(e, p.damage);
                                if (p.burn) {
                                    this.addParticle(e.x, e.y, '#ff4500', 3);
                                }
                            }
                            const pushResist = e.isTank ? 0.2 : 1;
                            const isUnstoppable = e.isBoss && this.bossModifiers.unstoppable;
                            if (!isUnstoppable) {
                                const angle = Math.atan2(e.y - p.y, e.x - p.x);
                                e.x += Math.cos(angle) * p.pushback * pushResist * dt;
                                e.y += Math.sin(angle) * p.pushback * pushResist * dt;
                            }
                        }
                    });
                    
                    if (p.isMastered && p.weaponId === 'shieldBubble' && this.frameCount % 30 === 0) {
                        const inRange = this.enemies.filter(e => Math.hypot(e.x - p.x, e.y - p.y) < p.radius * 2);
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
                                color: '#FFD700'
                            });
                        }
                    }
                } else {
                    if (this.frameCount % 15 === 0) {
                        this.enemies.forEach(e => {
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
        this.enemies = this.enemies.filter(e => {
            if (e.hp <= 0) {
                SoundManager.playEnemyDeath();
                this.kills++;
                this.enemyKills[e.id] = (this.enemyKills[e.id] || 0) + 1;
                
                let xpValue = e.xp;
                if (e.isBoss && this.bossModifiers.hide) {
                    xpValue *= 1.5;
                }
                this.pickups.push({ x: e.x, y: e.y, type: 'xp', value: xpValue, color: '#00ffcc' });
                
                // Death Splatter + Kill Effect cosmetic
                this.particleManager.createExplosion(e.x, e.y, e.color, e.isBoss ? 2 : 0.6, e.id);
                this.shake(e.isBoss ? 0.5 : 0.05);


                if (this.killEffect !== 'none') {
                    this.particleManager.createKillEffect(e.x, e.y, this.killEffect);
                }

                if (e.isBoss) {
                    const rerollReward = 1 + (this.bossModifiers.frenzy ? 1 : 0);
                    this.pickups.push({ x: e.x, y: e.y, type: 'reroll', value: rerollReward, color: '#ff00ff' });
                    
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
                    if (Math.random() < 0.50 + (this.player.luck * 0.05)) {
                        const goldValue = 5 + Math.floor(this.time / 15);
                        const goldMultiplier = e.isElite ? (e.eliteGoldBonus || 3) : 1;
                        const goldCount = e.isElite ? 3 : 1;
                        for (let gi = 0; gi < goldCount; gi++) {
                            this.pickups.push({ x: e.x + Math.random()*20-10, y: e.y + Math.random()*20-10, type: 'gold', value: goldValue * goldMultiplier, color: '#ffd700' });
                        }
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
                return false;
            }
            
            const dx = this.player.x - e.x;
            const dy = this.player.y - e.y;
            const dist = Math.hypot(dx, dy);
            
            // --- Custom Enemy Mechanics ---
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
                this.enemies.forEach(other => {
                    if (other.id === 'quantum_swarm' && Math.hypot(other.x - e.x, other.y - e.y) < 100) nearby++;
                });
                e.speedMult = 1 + (nearby * 0.2);
            }
            if (e.id === 'rift_stalker') {
                if (!e.teleportTimer) e.teleportTimer = 4;
                e.teleportTimer -= dt;
                if (e.teleportTimer <= 0 && dist > 100 && dist < 400) {
                    e.x += (dx / dist) * 100;
                    e.y += (dy / dist) * 100;
                    e.teleportTimer = 4;
                    this.addParticle(e.x, e.y, e.color, 10);
                }
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
            
            // Movement
            if (dist > 0 && !e.latched && !e.burrowed) {
                const baseSpeed = e.speedMult ? e.speed * e.speedMult : e.speed;
                let currentSpeed = baseSpeed;
                if (e.slowTimer > 0 && !(e.isBoss && this.bossModifiers.unstoppable)) {
                    currentSpeed *= 0.5;
                }
                currentSpeed *= this.envModifiers.enemySpeed;
                e.x += (dx / dist) * currentSpeed * 60 * dt;
                e.y += (dy / dist) * currentSpeed * 60 * dt;
            }
            if (e.slowTimer > 0) e.slowTimer -= dt;
            
            if (dist < this.player.radius + e.radius && !e.burrowed) {
                if (!e.attackTimer || e.attackTimer <= 0) {
                    this.takeDamage(e.damage);
                    e.attackTimer = 1.0;
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

            return true;
        });
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
                    SoundManager.playPickup();
                    this.xp += p.value * this.player.xpMult;
                    if (this.xp >= this.xpRequired && !this.isPaused) this.levelUp();
                } else if (p.type === 'gold') {
                    SoundManager.playGoldPickup();
                    this.gold += Math.floor(p.value * this.player.goldMult);
                    this.callbacks.onGoldChange(this.gold);
                } else if (p.type === 'reroll') {
                    SoundManager.playGoldPickup();
                    if (this.callbacks.onRerollFound) this.callbacks.onRerollFound();
                    this.addDamageText(this.player.x, this.player.y - 40, `+1 Reroll Token!`, '#ff00ff');

                } else if (p.type === 'nuke') {
                    SoundManager.playWeaponFire('novaPulse');
                    this.enemies.forEach(e => {
                        if (!e.isBoss) {
                            e.hp = 0;
                        }
                    });
                    this.addDamageText(this.player.x, this.player.y - 60, `NUCLEAR DETONATION`, '#ff0000');
                    this.shake(1.0);
                } else if (p.type === 'magnet_power') {
                    SoundManager.playLevelUp();
                    this.pickups.forEach(otherP => {
                        if (otherP.type === 'xp' || otherP.type === 'gold') {
                            otherP.x = this.player.x;
                            otherP.y = this.player.y;
                        }
                    });
                    this.addDamageText(this.player.x, this.player.y - 60, `MAGNETIC SURGE`, '#0000ff');
                } else if (p.type === 'shield_power') {
                    SoundManager.playGoldPickup();
                    this.player.invincibleTimer = 10;
                    this.addDamageText(this.player.x, this.player.y - 60, `SHIELD OVERCHARGE`, '#ffff00');
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

        const critChance = 0.05 + (this.player.luck * 0.02); // 5% base + 2% per luck
        if (Math.random() < critChance) {
            isCrit = true;
            finalDamage *= 1.5;
        }
        
        enemy.hp -= finalDamage;
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
            if (Math.random() < 0.1) SoundManager.playEnemyHit(); // Throttle sound
            return;
        }

        let color = isCrit ? '#ff4444' : (isFullyMastered ? '#ff00ff' : '#ffffff');
        if (isWeakHit) {
            color = '#ffdd00';
            this.addDamageText(enemy.x, enemy.y - 30, 'WEAK SPOT!', '#ffdd00', false);
        }
        this.addDamageText(enemy.x, enemy.y - 10, Math.floor(finalDamage), color, isCrit);
        SoundManager.playEnemyHit();
    }

    shake(amount) {
        this.shakeTimer = Math.max(this.shakeTimer, amount);
    }

    addParticle(x, y, color, count, type = 'spark', sizeMult = 1) {
        this.particleManager.addParticle(x, y, color, count, type, sizeMult);
    }

    addDamageText(x, y, text, color, isCrit = false) {
        const offsetX = (Math.random() - 0.5) * 20;
        this.damageTexts.push({ x: x + offsetX, y, text, color, life: 0.8, isCrit });
    }

    banishUpgrade(upgradeId) {
        if (!this.banishedUpgrades) this.banishedUpgrades = new Set();
        this.banishedUpgrades.add(upgradeId);
    }

    levelUp() {
        this.xp -= this.xpRequired;
        this.level++;
        this.xpRequired = Math.floor(this.xpRequired * 1.15 + 30);
        
        // Scale stats and fully heal
        this.player.maxHp = Math.floor(this.player.maxHp * 1.05);
        this.player.damageMult += 0.04;
        this.player.armor += 1;
        this.player.hp = this.player.maxHp;
        this.callbacks.onHpChange(this.player.hp, this.player.maxHp);
        
        this.isPaused = true;
        
        // Skip VFX/SFX entirely in Global Raids, or if leveling up instantly at the start to prevent lag bursts
        if (this.time > 0.5 && this.arena.id !== 'world_boss_arena') {
            SoundManager.playLevelUp();
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
        SoundManager.playGameOver();
        this.callbacks.onGameOver({
            time: Math.floor(this.time),
            level: this.level,
            kills: this.kills,
            gold: this.gold,
            encountered: Array.from(this.encounteredEnemies),
            enemyKills: this.enemyKills,
            worldBossDamage: this.worldBossDamage || 0
        });
    }

    victory() {
        this.isVictory = true;
        SoundManager.playVictory();
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
        if (this.arenaImage && this.arenaImage.complete && this.arenaImage.naturalWidth > 0) {
            // Cache the rendered background to avoid expensive scaling and blending every frame
            if (!this.cachedArenaImage || this.cachedArenaImage.width !== this.canvas.width || this.cachedArenaImage.height !== this.canvas.height) {
                this.cachedArenaImage = document.createElement('canvas');
                this.cachedArenaImage.width = this.canvas.width;
                this.cachedArenaImage.height = this.canvas.height;
                const oCtx = this.cachedArenaImage.getContext('2d');
                
                // Draw base color
                oCtx.fillStyle = this.arena.bg;
                oCtx.fillRect(0, 0, this.canvas.width, this.canvas.height);
                
                // Draw scaled image with opacity
                const scale = Math.max(this.canvas.width / this.arenaImage.naturalWidth, this.canvas.height / this.arenaImage.naturalHeight);
                const drawW = this.arenaImage.naturalWidth * scale;
                const drawH = this.arenaImage.naturalHeight * scale;
                const x = (this.canvas.width - drawW) / 2;
                const y = (this.canvas.height - drawH) / 2;
                
                oCtx.globalAlpha = 0.9;
                oCtx.drawImage(this.arenaImage, x, y, drawW, drawH);
                oCtx.globalAlpha = 1.0;
            }
            // Draw the pre-rendered, screen-sized background (extremely fast)
            this.ctx.drawImage(this.cachedArenaImage, 0, 0);
        } else {
            this.ctx.fillStyle = this.arena.bg;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }

        this.ctx.fillStyle = '#ffffff';
        this.stars.forEach(star => {
            let sx = (star.x - this.camera.x * star.parallax) % 2000;
            let sy = (star.y - this.camera.y * star.parallax) % 2000;
            if (sx < 0) sx += 2000;
            if (sy < 0) sy += 2000;
            
            const screenX = (sx / 2000) * this.canvas.width;
            const screenY = (sy / 2000) * this.canvas.height;
            
            this.ctx.globalAlpha = star.parallax;
            this.ctx.fillRect(screenX, screenY, star.size, star.size);
        });
        this.ctx.globalAlpha = 1.0;

        this.ctx.save();
        this.ctx.scale(this.zoom, this.zoom);
        this.ctx.translate(-this.camera.x + this.shakeX, -this.camera.y + this.shakeY);

        const vWidth = this.canvas.width / this.zoom;
        const vHeight = this.canvas.height / this.zoom;
        const camX = this.camera.x;
        const camY = this.camera.y;

        drawPickups(this.ctx, this.pickups, this.time);

        if (this.characterPickup) {
            this.ctx.fillStyle = this.characterPickup.color;
            this.ctx.fillRect(this.characterPickup.x - 15, this.characterPickup.y - 15, 30, 30);
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '16px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('🦥', this.characterPickup.x, this.characterPickup.y + 5);
            
            const dx = this.characterPickup.x - this.player.x;
            const dy = this.characterPickup.y - this.player.y;
            const dist = Math.hypot(dx, dy);
            if (dist > Math.min(this.canvas.width / this.zoom, this.canvas.height / this.zoom) / 2 - 50) {
                const angle = Math.atan2(dy, dx);
                const arrowDist = Math.min(this.canvas.width / this.zoom, this.canvas.height / this.zoom) / 2 - 50;
                const ax = this.player.x + Math.cos(angle) * arrowDist;
                const ay = this.player.y + Math.sin(angle) * arrowDist;
                
                this.ctx.save();
                this.ctx.translate(ax, ay);
                this.ctx.rotate(angle);
                this.ctx.fillStyle = this.characterPickup.color;
                this.ctx.beginPath();
                this.ctx.moveTo(15, 0);
                this.ctx.lineTo(-10, 10);
                this.ctx.lineTo(-10, -10);
                this.ctx.fill();
                this.ctx.restore();
            }
        }

        drawProjectiles(this.ctx, this.projectiles, this.particleManager, this.time, camX, camY, vWidth, vHeight);

        if (this.hazards) {
            this.hazards.forEach(h => {
                this.ctx.save();
                this.ctx.translate(h.x, h.y);
                this.ctx.rotate(this.time);
                this.ctx.beginPath();
                const spikes = 12;
                for (let i = 0; i < spikes * 2; i++) {
                    const a = (Math.PI * 2 / (spikes * 2)) * i;
                    const r = i % 2 === 0 ? h.radius : h.radius * 0.8;
                    this.ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
                }
                this.ctx.closePath();
                if (h.active) {
                    this.ctx.fillStyle = 'rgba(255, 69, 0, 0.8)';
                    this.ctx.fill();
                } else {
                    this.ctx.fillStyle = `rgba(255, 0, 0, ${0.1 + (2 - h.timer) * 0.2})`;
                    this.ctx.fill();
                    this.ctx.strokeStyle = '#ff0000';
                    this.ctx.lineWidth = 2;
                    this.ctx.stroke();
                }
                this.ctx.restore();
            });
        }

        if (this.enemyProjectiles) {
            this.ctx.globalCompositeOperation = 'screen';
            const texStar = this.particleManager?.textures?.star;
            this.enemyProjectiles.forEach(p => {
                this.ctx.save();
                this.ctx.translate(p.x, p.y);
                if (p.vx || p.vy) {
                    this.ctx.rotate(Math.atan2(p.vy, p.vx));
                }
                
                this.ctx.globalAlpha = 0.3;
                this.ctx.fillStyle = p.color || '#ff0000';
                this.ctx.beginPath();
                this.ctx.arc(0, 0, p.radius * 2, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.globalAlpha = 0.6;
                this.ctx.beginPath();
                this.ctx.arc(0, 0, p.radius * 1.2, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.globalAlpha = 1.0;

                if (texStar && texStar.isReady) {
                    this.ctx.drawImage(texStar, -p.radius*1.5, -p.radius*1.5, p.radius*3, p.radius*3);
                } else {
                    this.ctx.fillStyle = '#ffffff';
                    this.ctx.beginPath();
                    this.ctx.moveTo(p.radius, 0);
                    this.ctx.lineTo(-p.radius, p.radius*0.5);
                    this.ctx.lineTo(-p.radius*0.5, 0);
                    this.ctx.lineTo(-p.radius, -p.radius*0.5);
                    this.ctx.fill();
                }
                this.ctx.restore();
            });
            this.ctx.globalCompositeOperation = 'source-over';
        }

        const swarm = this.player.weapons.find(w => w.id === 'slothSwarm');
        if (swarm) {
            const getWeaponUpgrade = (wId, stat) => {
                const perm = this.save.permanentWeaponUpgrades?.[wId]?.[stat] || 0;
                const week = this.save.weeklyWeaponUpgrades?.[wId]?.[stat] || 0;
                const season = this.save.seasonalWeaponUpgrades?.[wId]?.[stat] || 0;
                return perm + week + season;
            };
            const dmgLevel = getWeaponUpgrade('slothSwarm', 'damage');
            const areaLevel = getWeaponUpgrade('slothSwarm', 'area');
            const cdLevel = getWeaponUpgrade('slothSwarm', 'cooldown');
            const isMastered = dmgLevel >= 5 && areaLevel >= 5 && cdLevel >= 5;
            
            const count = 1 + Math.floor(swarm.level / 2);
            const area = swarm.baseArea * this.player.areaMult * (1 + (swarm.level-1)*0.1) * (1 + areaLevel * 0.1);
            const speedMult = isMastered ? 6 : 3;
            for(let i=0; i<count; i++) {
                const angle = (Math.PI * 2 / count) * i + this.time * speedMult;
                const px = this.player.x + Math.cos(angle) * (60 * area);
                const py = this.player.y + Math.sin(angle) * (60 * area);
                
                this.ctx.save();
                this.ctx.translate(px, py);
                this.ctx.rotate(angle + Math.PI/2); // Face direction of orbit

                // Add HD aura - optimized
                this.ctx.globalCompositeOperation = 'lighter';
                const auraCol = isMastered ? '#ff0000' : '#8B4513';
                this.ctx.fillStyle = auraCol;
                this.ctx.globalAlpha = 0.1;
                this.ctx.beginPath();
                this.ctx.arc(0, 0, 25, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.globalAlpha = 0.2;
                this.ctx.beginPath();
                this.ctx.arc(0, 0, 15, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.globalCompositeOperation = 'source-over';
                this.ctx.globalAlpha = 1.0;
                
                // Draw Sloth Head shape
                this.ctx.fillStyle = isMastered ? '#FF0000' : '#8B4513';
                this.ctx.beginPath();
                this.ctx.ellipse(0, 0, 8, 6, 0, 0, Math.PI*2); // Head
                this.ctx.fill();
                // Ears
                this.ctx.beginPath(); this.ctx.arc(-6, -4, 3, 0, Math.PI*2); this.ctx.fill();
                this.ctx.beginPath(); this.ctx.arc(6, -4, 3, 0, Math.PI*2); this.ctx.fill();
                // Face
                this.ctx.fillStyle = '#d2b48c';
                this.ctx.beginPath(); this.ctx.ellipse(0, 1, 5, 4, 0, 0, Math.PI*2); this.ctx.fill();
                
                this.ctx.restore();
            }
        }

        const thornySwarm = this.player.weapons.find(w => w.id === 'thornySwarm');
        if (thornySwarm) {
            const count = 2 + Math.floor(thornySwarm.level / 2);
            const area = thornySwarm.baseArea * this.player.areaMult * (1 + (thornySwarm.level-1)*0.1);
            for(let i=0; i<count; i++) {
                const angle = (Math.PI * 2 / count) * i + this.time * 4;
                const px = this.player.x + Math.cos(angle) * (80 * area);
                const py = this.player.y + Math.sin(angle) * (80 * area);
                
                this.ctx.save();
                this.ctx.translate(px, py);
                this.ctx.rotate(this.time * 5); // Spin
                
                // Add HD aura - optimized
                this.ctx.globalCompositeOperation = 'lighter';
                this.ctx.fillStyle = '#32CD32';
                this.ctx.globalAlpha = 0.1;
                this.ctx.beginPath();
                this.ctx.arc(0, 0, 25, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.globalAlpha = 0.2;
                this.ctx.beginPath();
                this.ctx.arc(0, 0, 15, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.globalCompositeOperation = 'source-over';
                this.ctx.globalAlpha = 1.0;
                
                // Spiky Ball
                this.ctx.fillStyle = '#32CD32';
                this.ctx.beginPath();
                const spikes = 8;
                for(let j=0; j<spikes*2; j++) {
                    const a = (Math.PI*2/(spikes*2))*j;
                    const r = j%2===0 ? 10 : 5;
                    this.ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r);
                }
                this.ctx.fill();
                this.ctx.strokeStyle = '#006400';
                this.ctx.lineWidth = 1;
                this.ctx.stroke();
                
                this.ctx.restore();
            }
        }

        const orbitalLasers = this.player.weapons.find(w => w.id === 'orbitalLasers');
        if (orbitalLasers) {
            const count = 2 + Math.floor(orbitalLasers.level / 2);
            const area = orbitalLasers.baseArea * this.player.areaMult * (1 + (orbitalLasers.level-1)*0.1);
            for(let i=0; i<count; i++) {
                const angle = (Math.PI * 2 / count) * i + this.time * 2;
                const px = this.player.x + Math.cos(angle) * (60 * area);
                const py = this.player.y + Math.sin(angle) * (60 * area);
                
                this.ctx.save();
                this.ctx.translate(px, py);
                this.ctx.rotate(this.time * 3);
                
                this.ctx.globalCompositeOperation = 'lighter';
                this.ctx.fillStyle = '#00ffff';
                this.ctx.globalAlpha = 0.15;
                this.ctx.beginPath(); this.ctx.arc(0, 0, 15, 0, Math.PI * 2); this.ctx.fill();
                this.ctx.globalAlpha = 1.0;
                this.ctx.globalCompositeOperation = 'source-over';
                
                this.ctx.fillStyle = '#00ffff';
                this.ctx.beginPath(); this.ctx.arc(0, 0, 6, 0, Math.PI * 2); this.ctx.fill();
                this.ctx.strokeStyle = '#ffffff';
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
                
                this.ctx.restore();
            }
        }

        const orbitalDefense = this.player.weapons.find(w => w.id === 'orbitalDefense');
        if (orbitalDefense) {
            const count = 4 + Math.floor(orbitalDefense.level / 2);
            const area = orbitalDefense.baseArea * this.player.areaMult * (1 + (orbitalDefense.level-1)*0.1);
            for(let i=0; i<count; i++) {
                const angle = (Math.PI * 2 / count) * i + this.time * 3;
                const px = this.player.x + Math.cos(angle) * (70 * area);
                const py = this.player.y + Math.sin(angle) * (70 * area);
                
                this.ctx.save();
                this.ctx.translate(px, py);
                this.ctx.rotate(this.time * -4);
                
                this.ctx.globalCompositeOperation = 'lighter';
                this.ctx.fillStyle = '#ff00ff';
                this.ctx.globalAlpha = 0.2;
                this.ctx.beginPath(); this.ctx.arc(0, 0, 25, 0, Math.PI * 2); this.ctx.fill();
                this.ctx.globalAlpha = 1.0;
                this.ctx.globalCompositeOperation = 'source-over';
                
                this.ctx.fillStyle = '#111111';
                this.ctx.beginPath();
                this.ctx.moveTo(15, 0);
                this.ctx.lineTo(0, 15);
                this.ctx.lineTo(-15, 0);
                this.ctx.lineTo(0, -15);
                this.ctx.fill();
                
                this.ctx.strokeStyle = '#ff00ff';
                this.ctx.lineWidth = 3;
                this.ctx.stroke();
                
                this.ctx.fillStyle = '#ffffff';
                this.ctx.beginPath();
                this.ctx.arc(0, 0, 5, 0, Math.PI * 2);
                this.ctx.fill();
                
                this.ctx.restore();
            }
        }

        this.particleManager.draw(this.ctx, camX, camY, vWidth, vHeight);

        this.enemies.forEach(e => {
            if (!e.burrowed) {
                drawEnemy(this.ctx, e, this.time, this.player.x);
                
                if (e.hp < e.maxHp) {
                    const barW = e.isBoss ? 60 : 20;
                    this.ctx.fillStyle = '#ff0000'; this.ctx.fillRect(e.x - barW/2, e.y - e.radius - 8, barW, 4);
                    this.ctx.fillStyle = '#00ff00'; this.ctx.fillRect(e.x - barW/2, e.y - e.radius - 8, barW * (e.hp / e.maxHp), 4);
                }
                if (e.isBoss && e.weakSide && e.weakDesc) {
                    this.ctx.fillStyle = '#ffdd00';
                    this.ctx.font = 'bold 11px monospace';
                    this.ctx.textAlign = 'center';
                    this.ctx.fillText(`⚡ WEAK: ${e.weakDesc}`, e.x, e.y - e.radius - 14);
                }
            } else {
                // Draw burrowed indicator
                this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
                this.ctx.beginPath(); this.ctx.ellipse(e.x, e.y, e.radius, e.radius * 0.5, 0, 0, Math.PI * 2); this.ctx.fill();
            }
        });

        if (this.player.trail !== 'default' && this.frameCount % 6 === 0) {
            this.particleManager.createTrail(this.player.x, this.player.y, this.player.trail, this.frameCount);
        }

        // Advance sprite animation frame
        const SPRITE_FRAMES = 25;
        const FRAME_DURATION = 1 / 12; // 12 fps
        this.player.frameTimer += this.lastDt || 0;
        if (this.player.frameTimer >= FRAME_DURATION) {
            this.player.frameTimer -= FRAME_DURATION;
            this.player.currentFrame = (this.player.currentFrame + 1) % SPRITE_FRAMES;
        }

        const spriteSheet = this.player.isMoving
            ? (this.player.walkImage && this.player.walkImage.complete ? this.player.walkImage : null)
            : (this.player.idleImage && this.player.idleImage.complete ? this.player.idleImage : null);

        if (this.player.iFrames > 0 && Math.floor(this.time * 15) % 2 === 0) {
            this.ctx.globalAlpha = 0.5;
        }

        if (spriteSheet) {
            const size = this.player.radius * 5;
            const frame = this.player.currentFrame;
            const col = frame % 5;
            const row = Math.floor(frame / 5);
            const frameWidth = spriteSheet.width / 5;
            const frameHeight = spriteSheet.height / 5;
            const sx = col * frameWidth;
            const sy = row * frameHeight;
            
            this.ctx.save();
            this.ctx.translate(this.player.x, this.player.y);
            // The base sprite sheets are drawn facing left. 
            // So if we are facing right (!facingLeft), we need to mirror them.
            if (!this.player.facingLeft) this.ctx.scale(-1, 1);
            
            // Neon Silhouette Outline
            this.ctx.shadowColor = this.player.color;
            this.ctx.shadowBlur = 15;
            this.ctx.drawImage(spriteSheet, sx, sy, frameWidth, frameHeight, -size/2, -size/2, size, size);
            
            // Draw again with a tighter blur to create a solid neon edge
            this.ctx.shadowBlur = 5;
            this.ctx.drawImage(spriteSheet, sx, sy, frameWidth, frameHeight, -size/2, -size/2, size, size);
            
            this.ctx.restore();
        } else if (this.player.image && this.player.image.complete) {
            const size = this.player.radius * 3;
            
            this.ctx.save();
            this.ctx.translate(this.player.x, this.player.y);
            
            if (this.player.facingLeft) {
                this.ctx.scale(-1, 1);
            }
            
            // Neon Silhouette Outline
            this.ctx.shadowColor = this.player.color;
            this.ctx.shadowBlur = 15;
            this.ctx.drawImage(this.player.image, -size/2, -size/2, size, size);
            
            // Tighter blur for solid edge
            this.ctx.shadowBlur = 5;
            this.ctx.drawImage(this.player.image, -size/2, -size/2, size, size);
            
            this.ctx.restore();
        } else {
            this.ctx.fillStyle = this.player.color;
            this.ctx.beginPath();
            this.ctx.roundRect(this.player.x - this.player.radius, this.player.y - this.player.radius, this.player.radius * 2, this.player.radius * 2, 8);
            this.ctx.fill();
            this.ctx.fillStyle = 'rgba(173, 216, 230, 0.5)';
            this.ctx.beginPath();
            this.ctx.roundRect(this.player.x - this.player.radius + 2, this.player.y - this.player.radius + 2, this.player.radius * 2 - 4, this.player.radius - 2, 4);
            this.ctx.fill();
        }

        this.ctx.globalAlpha = 1.0;

        if (this.player.invincibleTimer > 0) {
            this.ctx.strokeStyle = '#ffff00';
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.arc(this.player.x, this.player.y, this.player.radius + 10 + Math.sin(this.time * 10) * 5, 0, Math.PI * 2);
            this.ctx.stroke();
            this.ctx.fillStyle = 'rgba(255, 255, 0, 0.2)';
            this.ctx.fill();
        }

        this.ctx.textAlign = 'center';
        this.damageTexts.forEach(t => {
            this.ctx.globalAlpha = Math.max(0, t.life);
            this.ctx.strokeStyle = '#000000';
            this.ctx.lineWidth = t.isCrit ? 4 : 3;
            this.ctx.font = t.isCrit ? 'bold 20px "Courier New", Courier, monospace' : 'bold 14px "Courier New", Courier, monospace';
            const displayY = t.isCrit ? t.y - 10 * (1 - t.life) : t.y;
            const textToDraw = t.text + (t.isCrit ? '!' : '');
            this.ctx.strokeText(textToDraw, t.x, displayY);
            this.ctx.fillStyle = t.color;
            this.ctx.fillText(textToDraw, t.x, displayY);
            this.ctx.globalAlpha = 1.0;
        });

        // Draw Environmental Effects
        this.ctx.globalCompositeOperation = 'screen';
        const texSmoke = this.particleManager?.textures?.smoke;

        if (this.envEffect === 'neon_rain') {
            this.envParticles.forEach(p => {
                this.ctx.strokeStyle = p.color;
                this.ctx.lineWidth = 3;
                this.ctx.globalAlpha = (p.life / 2) * 0.8;
                this.ctx.beginPath();
                this.ctx.moveTo(p.x, p.y);
                this.ctx.lineTo(p.x - p.vx * 0.05, p.y - p.vy * 0.05);
                this.ctx.stroke();
                
                // Add a little glow at the tip
                this.ctx.fillStyle = '#ffffff';
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
                this.ctx.fill();
            });
            this.ctx.globalAlpha = 1.0;
        } else if (this.envEffect === 'fog') {
            this.envParticles.forEach(p => {
                this.ctx.globalAlpha = 0.15 * (p.life / 10);
                if (texSmoke && texSmoke.isReady) {
                    this.ctx.drawImage(texSmoke, p.x - p.size, p.y - p.size, p.size * 2, p.size * 2);
                } else {
                    const gradient = this.ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
                    gradient.addColorStop(0, 'rgba(200, 200, 220, 1)');
                    gradient.addColorStop(1, 'transparent');
                    this.ctx.fillStyle = gradient;
                    this.ctx.beginPath();
                    this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            });
            this.ctx.globalAlpha = 1.0;
        } else if (this.envEffect === 'solar_flare') {
            this.envParticles.forEach(p => {
                const alpha = Math.sin((p.life / p.maxLife) * Math.PI) * 0.4;
                this.ctx.globalAlpha = alpha;
                
                if (texSmoke && texSmoke.isReady) {
                    // Tint the smoke orange
                    this.ctx.fillStyle = '#ff6600';
                    this.ctx.beginPath();
                    this.ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
                    this.ctx.fill();
                    
                    this.ctx.drawImage(texSmoke, p.x - p.size, p.y - p.size, p.size * 2, p.size * 2);
                } else {
                    const gradient = this.ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
                    gradient.addColorStop(0, 'rgba(255, 100, 0, 1)');
                    gradient.addColorStop(1, 'transparent');
                    this.ctx.fillStyle = gradient;
                    this.ctx.beginPath();
                    this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            });
            this.ctx.globalAlpha = 1.0;
            this.ctx.globalCompositeOperation = 'source-over';
            
            // Global orange tint pulsing
            this.ctx.fillStyle = `rgba(255, 69, 0, ${Math.sin(this.time * 0.5) * 0.05 + 0.05})`;
            this.ctx.fillRect(this.camera.x - this.shakeX, this.camera.y - this.shakeY, this.canvas.width / this.zoom, this.canvas.height / this.zoom);
        }
        this.ctx.globalCompositeOperation = 'source-over';

        this.ctx.restore();

        drawUI(this.ctx, this.canvas, this.time, this.player, this.hazards, this.enemies, this.characterPickup, this.camera, this.zoom);
    }
}