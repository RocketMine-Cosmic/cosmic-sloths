import { CHARACTERS, WEAPONS, UPGRADES, ENEMIES, ARENAS, SYNERGIES, CHARACTER_TALENTS, DIFFICULTIES } from './Constants';
import { drawEnemy } from './EnemyRenderer';
import { SoundManager } from './SoundManager';
import { ParticleManager } from './ParticleManager';

export class GameEngine {
    constructor(canvas, characterId, arenaId, difficultyId, save, callbacks) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.callbacks = callbacks;
        this.characterId = characterId;
        this.save = save;
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

        const charTalents = save.unlockedTalents?.[characterId] || [];
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

        const baseChar = CHARACTERS.find(c => c.id === characterId) || CHARACTERS[0];
        this.arena = ARENAS.find(a => a.id === arenaId) || ARENAS[0];
        
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
        
        let playerSpriteSheet = null;
        if (baseChar.spriteSheet) {
            playerSpriteSheet = new Image();
            playerSpriteSheet.src = baseChar.spriteSheet;
        }
        
        this.player = {
            name: baseChar.name,
            image: playerImage,
            spriteSheet: playerSpriteSheet,
            frameX: 0,
            frameY: 0,
            animTimer: 0,
            x: 0, y: 0, radius: 16,
            maxHp: baseChar.hp + getStatBonus('health') + (talentBonus.maxHp || 0),
            hp: baseChar.hp + getStatBonus('health') + (talentBonus.maxHp || 0),
            speed: baseChar.speed,
            speedMult: (1 + getStatBonus('speed') + (talentBonus.speedMult || 0)) * this.envModifiers.playerSpeed,
            damageMult: (baseChar.damageMult || 1) + getStatBonus('damage') + (talentBonus.damageMult || 0),
            magnetRange: (baseChar.magnetRange || 60) + getStatBonus('magnet') + (talentBonus.magnetRange || 0),
            regen: baseChar.regen + getStatBonus('regen') + (talentBonus.regen || 0),
            armor: baseChar.armor + (talentBonus.armor || 0),
            areaMult: (baseChar.areaMult || 1) + (talentBonus.areaMult || 0),
            cooldownMult: (baseChar.cooldownMult || 1) - getStatBonus('cooldown') + (talentBonus.cooldownMult || 0),
            projSpeedMult: (baseChar.projSpeedMult || 1) + (talentBonus.projSpeedMult || 0),
            goldMult: ((baseChar.goldMult || 1) + (talentBonus.goldMult || 0)) * this.difficulty.goldMult,
            xpMult: ((baseChar.xpMult || 1) + (talentBonus.xpMult || 0)) * this.difficulty.xpMult,
            luck: (baseChar.luck || 0) + getStatBonus('luck') + (talentBonus.luck || 0),
            color: baseChar.color,
            trail: save.cosmetics?.trail || 'default',
            weapons: [{ ...WEAPONS.napBeam, level: 1, timer: 0 }],
            passives: []
        };
        
        this.camera = { x: 0, y: 0 };
        this.joystick = { x: 0, y: 0 };
        this.enemies = [];
        this.projectiles = [];
        this.pickups = [];
        this.particleManager = new ParticleManager();
        this.damageTexts = [];
        
        this.stars = [];
        for (let i = 0; i < 150; i++) {
            this.stars.push({
                x: Math.random() * 2000,
                y: Math.random() * 2000,
                size: Math.random() * 2 + 0.5,
                parallax: Math.random() * 0.4 + 0.1
            });
        }
        
        this.keys = {};
        this.time = 0;
        this.frameCount = 0;
        this.level = 1;
        this.xp = 0;
        this.xpRequired = 10;
        this.gold = 0;
        this.kills = 0;
        
        this.isPaused = false;
        this.isGameOver = false;
        this.isVictory = false;
        
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
        
        this.bindEvents();
        this.lastTime = performance.now();
        this.animationId = requestAnimationFrame(this.loop.bind(this));
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
        if (!this.isPaused && !this.isGameOver && !this.isVictory) {
            const dt = (timestamp - this.lastTime) / 1000;
            this.update(dt);
            this.draw();
        }
        this.lastTime = timestamp;
        this.animationId = requestAnimationFrame(this.loop.bind(this));
    }

    update(dt) {
        if (dt > 0.1) dt = 0.1; // Cap dt to prevent huge jumps
        
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

        if (this.time >= this.arena.duration && !this.isGameOver && !this.isVictory) {
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
            if (this.player.spriteSheet) {
                this.player.animTimer += dt * 12; // Animation speed
                if (this.player.frameIndex === undefined) this.player.frameIndex = 0;
                
                while (this.player.animTimer > 1) {
                    this.player.animTimer -= 1;
                    // Skip frame 15 as it's usually a duplicate of frame 0 in these sprite sheets
                    this.player.frameIndex = (this.player.frameIndex + 1) % 15;
                }
                
                this.player.frameX = this.player.frameIndex % 4;
                this.player.frameY = Math.floor(this.player.frameIndex / 4);
            }
        } else {
            this.player.moveTimer = 0;
            if (this.player.spriteSheet) {
                this.player.frameIndex = 0;
                this.player.frameX = 0;
                this.player.frameY = 0;
            }
        }
        
        this.camera.x = this.player.x - this.canvas.width / 2;
        this.camera.y = this.player.y - this.canvas.height / 2;

        this.spawnEnemies(dt);
        this.updateWeapons(dt);
        this.updateProjectiles(dt);
        this.updateEnemies(dt);
        this.updatePickups(dt);
        this.updateHazards(dt);
        
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
        if (this.envEffect === 'neon_rain') {
            if (Math.random() < 0.5) {
                this.envParticles.push({
                    x: this.player.x + (Math.random() * this.canvas.width * 1.5 - this.canvas.width * 0.75),
                    y: this.player.y - this.canvas.height/2 - 50,
                    vx: 100,
                    vy: 600 + Math.random() * 300,
                    life: 2,
                    color: Math.random() > 0.5 ? '#00ffff' : '#ff00ff',
                    length: 20 + Math.random() * 20
                });
            }
        } else if (this.envEffect === 'fog') {
            if (Math.random() < 0.05) {
                this.envParticles.push({
                    x: this.player.x + (Math.random() * this.canvas.width * 2 - this.canvas.width),
                    y: this.player.y + (Math.random() * this.canvas.height * 2 - this.canvas.height),
                    vx: 20 + Math.random() * 30,
                    vy: 10 + Math.random() * 20,
                    life: 10,
                    size: 200 + Math.random() * 300
                });
            }
        } else if (this.envEffect === 'solar_flare') {
            if (Math.random() < 0.02) {
                this.envParticles.push({
                    x: this.player.x + (Math.random() * this.canvas.width - this.canvas.width/2),
                    y: this.player.y + (Math.random() * this.canvas.height - this.canvas.height/2),
                    life: 1.5,
                    maxLife: 1.5,
                    size: 50 + Math.random() * 100
                });
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
        if (this.time >= this.arena.duration - 30 && !this.bossSpawned) {
            this.bossSpawned = true;
            const bosses = ENEMIES.filter(e => e.isBoss);
            if (bosses.length > 0) {
                const boss = bosses[Math.floor(Math.random() * bosses.length)];
                const angle = Math.random() * Math.PI * 2;
                const dist = Math.max(this.canvas.width, this.canvas.height) / 2 + 50;
                const ex = this.player.x + Math.cos(angle) * dist;
                const ey = this.player.y + Math.sin(angle) * dist;
                const bossHpMult = 5.0 * this.difficulty.enemyHpMult;
                const bossDmgMult = 3.0 * this.difficulty.enemyDmgMult;
                this.enemies.push({ ...boss, x: ex, y: ey, maxHp: boss.hp * bossHpMult, hp: boss.hp * bossHpMult, damage: boss.damage * bossDmgMult });
                this.addDamageText(this.player.x, this.player.y - 60, `WARNING: ${boss.name} APPROACHING!`, '#ff0000');
                SoundManager.playBossSpawn();
            }
        }

        const progress = Math.min(1, this.time / this.arena.duration);
        const spawnRate = (2.5 - (2.45 * Math.pow(progress, 1.5))) / this.envModifiers.enemySpawnRate; // Slower start
        
        if (Math.random() < dt / Math.max(0.05, spawnRate)) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.max(this.canvas.width, this.canvas.height) / 2 + 50;
            const ex = this.player.x + Math.cos(angle) * dist;
            const ey = this.player.y + Math.sin(angle) * dist;
            
            const arenaIndex = ARENAS.findIndex(a => a.id === this.arena.id);
            let minTier = Math.max(1, arenaIndex);
            let maxTier = arenaIndex + 1;
            
            if (progress > 0.33) maxTier += 1;
            if (progress > 0.66) maxTier += 1;
            
            maxTier = Math.min(10, maxTier);

            let availableEnemies = ENEMIES.filter(e => 
                !e.isBoss && 
                e.tier >= minTier && e.tier <= maxTier
            );
            
            if (availableEnemies.length === 0) {
                availableEnemies = ENEMIES.filter(e => !e.isBoss && e.tier === 1);
            }
            
            const type = availableEnemies[Math.floor(Math.random() * availableEnemies.length)];
            
            const hpMult = (1.0 + (3.0 * Math.pow(progress, 2.0))) * this.difficulty.enemyHpMult;
            const dmgMult = (1.0 + (2.0 * Math.pow(progress, 1.5))) * this.difficulty.enemyDmgMult;
            
            if (this.time > 60 && Math.random() < 0.01 + (progress * 0.04)) {
                const elites = ENEMIES.filter(e => !e.isBoss && e.tier === Math.min(10, maxTier + 2));
                if (elites.length > 0) {
                    const elite = elites[Math.floor(Math.random() * elites.length)];
                    this.enemies.push({ ...elite, x: ex, y: ey, maxHp: elite.hp * hpMult * 2, hp: elite.hp * hpMult * 2, damage: elite.damage * dmgMult, radius: elite.radius * 1.5 });
                    SoundManager.playEnemySpawn();
                    return;
                }
            }
            
            this.enemies.push({ ...type, x: ex, y: ey, maxHp: type.hp * hpMult, hp: type.hp * hpMult, damage: type.damage * dmgMult });
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
                    const actualDmg = Math.max(1, h.damage - this.player.armor);
                    this.player.hp -= actualDmg;
                    this.callbacks.onHpChange(this.player.hp, this.player.maxHp);
                    this.addDamageText(this.player.x, this.player.y - 20, actualDmg, '#ff0000');
                    SoundManager.playPlayerHit();
                    if (this.player.hp <= 0) this.gameOver();
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
                
                const wUpgrades = this.save.weaponUpgrades?.[w.id] || {};
                const cdUpgradeLevel = wUpgrades.cooldown || 0;
                const cdMultiplier = 1 - (cdUpgradeLevel * 0.05); // -5% per level
                
                w.timer = (w.baseCooldown / 60) * Math.max(0.2, this.player.cooldownMult) * cdMultiplier;
            }
        });
    }

    fireWeapon(w) {
        SoundManager.playWeaponFire(w.id);
        const wUpgrades = this.save.weaponUpgrades?.[w.id] || {};
        const dmgUpgradeLevel = wUpgrades.damage || 0;
        const areaUpgradeLevel = wUpgrades.area || 0;
        const cdUpgradeLevel = wUpgrades.cooldown || 0;
        
        const isMastered = dmgUpgradeLevel >= 5 && areaUpgradeLevel >= 5 && cdUpgradeLevel >= 5;
        
        const wDmgMult = 1 + (dmgUpgradeLevel * 0.1); // +10% per level
        const wAreaMult = 1 + (areaUpgradeLevel * 0.1); // +10% per level

        const dmg = w.baseDamage * this.player.damageMult * (1 + (w.level-1)*0.2) * wDmgMult;
        const area = w.baseArea * this.player.areaMult * (1 + (w.level-1)*0.1) * wAreaMult;
        
        if (w.id === 'napBeam') {
            let nearest = null;
            let minDist = Infinity;
            this.enemies.forEach(e => {
                const d = Math.hypot(e.x - this.player.x, e.y - this.player.y);
                if (d < minDist) { minDist = d; nearest = e; }
            });
            
            let angle = nearest ? Math.atan2(nearest.y - this.player.y, nearest.x - this.player.x) : Math.random() * Math.PI * 2;
            
            let projColor = isMastered ? '#4169E1' : '#00ff00';
            let projType = 'beam';
            
            // Character specific flair
            if (this.characterId === 'skybyte') { projColor = '#00ffff'; projType = 'dual_laser'; }
            if (this.characterId === 'neobyte') { projColor = '#4169E1'; projType = 'lightning'; }
            if (this.characterId === 'glitch') { projColor = '#8a2be2'; projType = 'glitch_slash'; }
            if (this.characterId === 'pandypaws') { projColor = '#ff69b4'; projType = 'stomp'; }
            if (this.characterId === 'holodrift') { projColor = '#20b2aa'; projType = 'repair_beam'; }

            this.addParticle(this.player.x, this.player.y, projColor, 10, 'glow', 1.5); // Muzzle flash

            this.projectiles.push({
                x: this.player.x, y: this.player.y,
                vx: Math.cos(angle) * 300 * this.player.projSpeedMult,
                vy: Math.sin(angle) * 300 * this.player.projSpeedMult,
                radius: 5 * area,
                damage: dmg,
                pierce: 2 + Math.floor(w.level/2),
                life: 2,
                color: projColor,
                type: projType,
                isMastered: isMastered,
                weaponId: 'napBeam'
            });
            
            if (projType === 'dual_laser') {
                 this.projectiles.push({
                    x: this.player.x + Math.cos(angle + Math.PI/2)*10, y: this.player.y + Math.sin(angle + Math.PI/2)*10,
                    vx: Math.cos(angle) * 300 * this.player.projSpeedMult, vy: Math.sin(angle) * 300 * this.player.projSpeedMult,
                    radius: 4 * area, damage: dmg, pierce: 2 + Math.floor(w.level/2), life: 2, color: projColor, type: projType, isMastered, weaponId: 'napBeam'
                });
            }
        }
        else if (w.id === 'vineWhip') {
            this.enemies.forEach(e => {
                if (Math.hypot(e.x - this.player.x, e.y - this.player.y) < 100 * area) {
                    this.damageEnemy(e, dmg);
                    this.addParticle(e.x, e.y, isMastered ? '#FF0000' : '#228B22', 10);
                    if (isMastered) {
                        this.player.hp = Math.min(this.player.maxHp, this.player.hp + (dmg * 0.05));
                        this.callbacks.onHpChange(this.player.hp, this.player.maxHp);
                    }
                }
            });
        }
        else if (w.id === 'slothSwarm') {
            const count = 1 + Math.floor(w.level / 2);
            for(let i=0; i<count; i++) {
                const angle = (Math.PI * 2 / count) * i + this.time * 3;
                const px = this.player.x + Math.cos(angle) * (60 * area);
                const py = this.player.y + Math.sin(angle) * (60 * area);
                this.enemies.forEach(e => {
                    if (Math.hypot(e.x - px, e.y - py) < 20) {
                        this.damageEnemy(e, dmg * 0.2);
                        this.addParticle(e.x, e.y, isMastered ? '#FF0000' : '#8B4513', 2);
                    }
                });
                
                if (isMastered) {
                    let nearest = null;
                    let minDist = 200;
                    this.enemies.forEach(e => {
                        const d = Math.hypot(e.x - px, e.y - py);
                        if (d < minDist) { minDist = d; nearest = e; }
                    });
                    if (nearest) {
                        const lAngle = Math.atan2(nearest.y - py, nearest.x - px);
                        this.projectiles.push({
                            x: px, y: py,
                            vx: Math.cos(lAngle) * 300,
                            vy: Math.sin(lAngle) * 300,
                            radius: 3,
                            damage: dmg * 0.5,
                            pierce: 1,
                            life: 1,
                            color: '#FF0000'
                        });
                    }
                }
            }
        }
        else if (w.id === 'napalm') {
            this.projectiles.push({
                x: this.player.x, y: this.player.y,
                vx: 0, vy: 0,
                radius: 40 * area,
                damage: dmg * 0.5,
                pierce: 999,
                life: 3 + w.level,
                color: isMastered ? 'rgba(0, 191, 255, 0.5)' : 'rgba(255, 69, 0, 0.5)',
                isAoe: true,
                isMastered: isMastered,
                weaponId: 'napalm'
            });
        }
        else if (w.id === 'novaPulse') {
            this.projectiles.push({
                x: this.player.x, y: this.player.y,
                vx: 0, vy: 0,
                radius: 10 * area,
                damage: dmg,
                pierce: 999,
                life: 0.5,
                color: isMastered ? 'rgba(138, 43, 226, 0.6)' : 'rgba(0, 255, 255, 0.6)',
                isAoe: true,
                pulse: true
            });
            if (isMastered) {
                setTimeout(() => {
                    if (this.isGameOver || this.isVictory) return;
                    this.projectiles.push({
                        x: this.player.x, y: this.player.y,
                        vx: 0, vy: 0,
                        radius: 10 * area,
                        damage: dmg * 0.5,
                        pierce: 999,
                        life: 0.5,
                        color: 'rgba(138, 43, 226, 0.4)',
                        isAoe: true,
                        pulse: true
                    });
                }, 500);
            }
        }
        else if (w.id === 'shieldBubble') {
            this.projectiles.push({
                x: this.player.x, y: this.player.y,
                vx: 0, vy: 0,
                radius: 80 * area,
                damage: dmg,
                pierce: 999,
                life: 2.0,
                color: isMastered ? 'rgba(255, 215, 0, 0.3)' : 'rgba(255, 255, 255, 0.3)',
                isAoe: true,
                pushback: 250,
                isMastered: isMastered,
                weaponId: 'shieldBubble'
            });
        }
        else if (w.id === 'burningBarrier') {
            // Synergy: Shield Bubble + Napalm
            this.projectiles.push({
                x: this.player.x, y: this.player.y,
                vx: 0, vy: 0,
                radius: 100 * area,
                damage: dmg,
                pierce: 999,
                life: 3.0 + (w.level * 0.5),
                color: 'rgba(255, 69, 0, 0.4)',
                isAoe: true,
                pushback: 150,
                burn: true
            });
        }
        else if (w.id === 'laserNova') {
            // Synergy: Nova Pulse + Nap Beam
            this.projectiles.push({
                x: this.player.x, y: this.player.y,
                vx: 0, vy: 0,
                radius: 15 * area,
                damage: dmg,
                pierce: 999,
                life: 0.8,
                color: 'rgba(0, 255, 255, 0.8)',
                isAoe: true,
                pulse: true
            });
            // Also fire piercing beams in 8 directions
            for (let i = 0; i < 8; i++) {
                const angle = (Math.PI / 4) * i;
                this.projectiles.push({
                    x: this.player.x, y: this.player.y,
                    vx: Math.cos(angle) * 400 * this.player.projSpeedMult,
                    vy: Math.sin(angle) * 400 * this.player.projSpeedMult,
                    radius: 8 * area,
                    damage: dmg * 0.5,
                    pierce: 5 + Math.floor(w.level/2),
                    life: 2,
                    color: '#00ffff'
                });
            }
        }
        else if (w.id === 'thornySwarm') {
            // Synergy: Sloth Swarm + Vine Whip
            const count = 2 + Math.floor(w.level / 2);
            for(let i=0; i<count; i++) {
                const angle = (Math.PI * 2 / count) * i + this.time * 4;
                const px = this.player.x + Math.cos(angle) * (80 * area);
                const py = this.player.y + Math.sin(angle) * (80 * area);
                
                // Orbiting damage
                this.enemies.forEach(e => {
                    if (Math.hypot(e.x - px, e.y - py) < 30) {
                        this.damageEnemy(e, dmg * 0.3);
                        this.addParticle(e.x, e.y, '#228B22', 5);
                    }
                });
                
                // Occasional whip strike from the orbiting sloth
                if (Math.random() < 0.1) {
                    this.enemies.forEach(e => {
                        if (Math.hypot(e.x - px, e.y - py) < 120 * area) {
                            this.damageEnemy(e, dmg);
                            this.addParticle(e.x, e.y, '#32CD32', 10);
                        }
                    });
                }
            }
        }
    }

    updateProjectiles(dt) {
        this.projectiles = this.projectiles.filter(p => {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;
            
            // Trails
            if (!p.isAoe && this.frameCount % 2 === 0) {
                if (p.type === 'dual_laser') this.addParticle(p.x, p.y, p.color, 1, 'glow', 0.5);
                else if (p.type === 'lightning') this.addParticle(p.x + (Math.random()-0.5)*10, p.y + (Math.random()-0.5)*10, p.color, 1, 'spark', 0.8);
                else if (p.type === 'glitch_slash') this.addParticle(p.x, p.y, p.color, 2, 'glitch', 1.0);
                else if (p.type === 'repair_beam') this.addParticle(p.x, p.y, '#ffffff', 1, 'spark', 0.5);
                else this.addParticle(p.x, p.y, p.color, 1, 'spark', 0.5);
            }

            if (!p.isAoe) {
                this.enemies.forEach(e => {
                    if (p.pierce > 0 && Math.hypot(e.x - p.x, e.y - p.y) < e.radius + p.radius) {
                        if (e.id === 'boss_supernova') {
                            p.pierce = 0;
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
                            this.damageEnemy(e, p.damage);
                            
                            // Impact Effects
                            this.shake(0.1);
                            this.hitStopTimer = 0.02;
                            this.particleManager.createHitEffect(e.x, e.y, p.color, Math.atan2(p.vy, p.vx), 1.5);
                            
                            if (p.type === 'dual_laser') this.addParticle(e.x, e.y, p.color, 10, 'glow', 2);
                            if (p.type === 'stomp') this.addParticle(e.x, e.y, '#888888', 10, 'smoke', 2);
                            if (p.type === 'glitch_slash') this.addParticle(e.x, e.y, p.color, 8, 'glitch', 2);

                            p.pierce--;
                            
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
                            const angle = Math.atan2(e.y - p.y, e.x - p.x);
                            e.x += Math.cos(angle) * p.pushback * pushResist * dt;
                            e.y += Math.sin(angle) * p.pushback * pushResist * dt;
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
            return p.life > 0 && p.pierce > 0;
        });

        if (this.enemyProjectiles) {
            this.enemyProjectiles = this.enemyProjectiles.filter(p => {
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.life -= dt;
                
                if (Math.hypot(this.player.x - p.x, this.player.y - p.y) < this.player.radius + p.radius) {
                    const actualDmg = Math.max(1, p.damage - this.player.armor);
                    this.player.hp -= actualDmg;
                    this.callbacks.onHpChange(this.player.hp, this.player.maxHp);
                    this.addDamageText(this.player.x, this.player.y - 20, actualDmg, '#ff0000');
                    SoundManager.playPlayerHit();
                    if (this.player.hp <= 0) this.gameOver();
                    return false;
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
                this.pickups.push({ x: e.x, y: e.y, type: 'xp', value: e.xp, color: '#00ffcc' });
                
                // Death Splatter
                this.particleManager.createExplosion(e.x, e.y, e.color, e.isBoss ? 3 : 1);
                this.shake(e.isBoss ? 0.5 : 0.05);

                if (e.isBoss) {
                    this.pickups.push({ x: e.x, y: e.y, type: 'reroll', value: 1, color: '#ff00ff' });
                    this.addDamageText(e.x, e.y - 20, `BOSS DEFEATED!`, '#ffff00');
                } else {
                    if (Math.random() < 0.50 + (this.player.luck * 0.05)) {
                        const goldValue = 1 + Math.floor(this.time / 30);
                        this.pickups.push({ x: e.x + Math.random()*10-5, y: e.y + Math.random()*10-5, type: 'gold', value: goldValue, color: '#ffd700' });
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
                        this.player.hp -= 2;
                        this.callbacks.onHpChange(this.player.hp, this.player.maxHp);
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
                const currentSpeed = (e.slowTimer > 0 ? baseSpeed * 0.5 : baseSpeed) * this.envModifiers.enemySpeed;
                e.x += (dx / dist) * currentSpeed * 60 * dt;
                e.y += (dy / dist) * currentSpeed * 60 * dt;
            }
            if (e.slowTimer > 0) e.slowTimer -= dt;
            
            if (dist < this.player.radius + e.radius && !e.burrowed) {
                if (!e.attackTimer || e.attackTimer <= 0) {
                    const actualDmg = Math.max(1, e.damage - this.player.armor);
                    this.player.hp -= actualDmg;
                    this.callbacks.onHpChange(this.player.hp, this.player.maxHp);
                    this.addDamageText(this.player.x, this.player.y - 20, actualDmg, '#ff0000');
                    SoundManager.playPlayerHit();
                    e.attackTimer = 1.0;
                    if (this.player.hp <= 0) this.gameOver();
                }
            }
            if (e.attackTimer > 0) e.attackTimer -= dt;

            // Projectile attacks
            if (!e.burrowed) {
                if (e.isRanged || e.id === 'nebula_serpent' || e.id === 'asteroid_kraken' || e.id === 'solar_mantis' || e.id === 'starspine_urchin' || e.id === 'cryo_wraith' || e.id === 'pulsar_anglerfish' || e.id === 'ion_stingray' || e.id === 'elite_solar_drake') {
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
                    if (!e.skillTimer) e.skillTimer = 0;
                    e.skillTimer -= dt;
                    if (e.skillTimer <= 0) {
                        e.skillTimer = 3.0;
                        for(let i=0; i<8; i++) {
                            const angle = (Math.PI * 2 / 8) * i;
                            this.enemyProjectiles.push({
                                x: e.x, y: e.y,
                                vx: Math.cos(angle) * 150,
                                vy: Math.sin(angle) * 150,
                                radius: 5,
                                damage: e.damage * 0.5,
                                life: 3,
                                color: '#ff0000'
                            });
                        }
                        if (e.id === 'boss_phantom_leviathan') {
                            // summon minions
                            for(let i=0; i<3; i++) {
                                this.enemies.push({ ...ENEMIES.find(en => en.id === 'cryo_wraith'), x: e.x + Math.random()*100-50, y: e.y + Math.random()*100-50 });
                            }
                        }
                    }
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
                    if (this.xp >= this.xpRequired) this.levelUp();
                } else if (p.type === 'gold') {
                    SoundManager.playGoldPickup();
                    this.gold += Math.floor(p.value * this.player.goldMult);
                    this.callbacks.onGoldChange(this.gold);
                } else if (p.type === 'reroll') {
                    SoundManager.playGoldPickup();
                    if (this.callbacks.onRerollFound) this.callbacks.onRerollFound();
                    this.addDamageText(this.player.x, this.player.y - 40, `+1 Reroll Token!`, '#ff00ff');
                } else if (p.type === 'token') {
                    SoundManager.playGoldPickup();
                    if (this.callbacks.onTokenFound) this.callbacks.onTokenFound();
                    this.addDamageText(this.player.x, this.player.y - 60, `+1 Cosmic Token!`, '#10b981');
                }
                return false;
            }
            if (dist < this.player.magnetRange) {
                const speed = 200 * dt;
                p.x += ((this.player.x - p.x) / dist) * speed;
                p.y += ((this.player.y - p.y) / dist) * speed;
            }
            return true;
        });
    }

    damageEnemy(enemy, amount) {
        enemy.hp -= amount;
        this.addDamageText(enemy.x, enemy.y - 10, Math.floor(amount), '#ffffff');
        SoundManager.playEnemyHit();
    }

    shake(amount) {
        this.shakeTimer = Math.max(this.shakeTimer, amount);
    }

    addParticle(x, y, color, count, type = 'spark', sizeMult = 1) {
        this.particleManager.addParticle(x, y, color, count, type, sizeMult);
    }

    addDamageText(x, y, text, color) {
        const offsetX = (Math.random() - 0.5) * 20;
        this.damageTexts.push({ x: x + offsetX, y, text, color, life: 0.8 });
    }

    levelUp() {
        this.xp -= this.xpRequired;
        this.level++;
        this.xpRequired = Math.floor(this.xpRequired * 1.2 + 10);
        this.isPaused = true;
        SoundManager.playLevelUp();
        this.particleManager.createLevelUp(this.player.x, this.player.y);
        
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
        const pool = [...UPGRADES];
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
        this.callbacks.onLevelUp(choices);
    }

    applyUpgrade(upgrade) {
        if (upgrade.type === 'passive') {
            this.player[upgrade.stat] += upgrade.value;
            if (upgrade.stat === 'maxHp') {
                this.player.hp += upgrade.value;
                this.callbacks.onHpChange(this.player.hp, this.player.maxHp);
            }
            this.player.passives.push(upgrade);
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
                
                // Check again in case multiple synergies formed (rare but possible)
                this.checkSynergies();
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
            gold: this.gold
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
            characterId: this.characterId
        });
    }

    draw() {
        this.ctx.fillStyle = this.arena.bg;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (this.arenaImage && this.arenaImage.complete) {
            this.ctx.globalAlpha = 0.5;
            const scale = Math.max(this.canvas.width / this.arenaImage.width, this.canvas.height / this.arenaImage.height);
            const drawW = this.arenaImage.width * scale;
            const drawH = this.arenaImage.height * scale;
            const x = (this.canvas.width - drawW) / 2;
            const y = (this.canvas.height - drawH) / 2;
            this.ctx.drawImage(this.arenaImage, x, y, drawW, drawH);
            this.ctx.globalAlpha = 1.0;
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
        this.ctx.translate(-this.camera.x + this.shakeX, -this.camera.y + this.shakeY);

        this.pickups.forEach(p => {
            this.ctx.save();
            this.ctx.translate(p.x, p.y);
            this.ctx.fillStyle = p.color;
            this.ctx.beginPath();
            if (p.type === 'xp') {
                this.ctx.rotate(this.time * 2);
                this.ctx.moveTo(0, -6);
                this.ctx.lineTo(4, 0);
                this.ctx.lineTo(0, 6);
                this.ctx.lineTo(-4, 0);
            } else if (p.type === 'gold') {
                this.ctx.rotate(Math.sin(this.time * 5) * 0.2);
                for (let i = 0; i < 8; i++) {
                    const a = (Math.PI / 4) * i;
                    this.ctx.lineTo(Math.cos(a) * 6, Math.sin(a) * 6);
                }
            } else {
                this.ctx.rect(-4, -4, 8, 8);
            }
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.restore();
        });

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
            if (dist > Math.min(this.canvas.width, this.canvas.height) / 2 - 50) {
                const angle = Math.atan2(dy, dx);
                const arrowDist = Math.min(this.canvas.width, this.canvas.height) / 2 - 50;
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

        this.projectiles.forEach(p => {
            this.ctx.save();
            this.ctx.translate(p.x, p.y);
            if (p.vx || p.vy) {
                this.ctx.rotate(Math.atan2(p.vy, p.vx));
            }
            
            this.ctx.shadowColor = p.color;
            this.ctx.shadowBlur = 10;
            
            if (p.type === 'beam' || p.type === 'dual_laser') {
                this.ctx.fillStyle = '#ffffff';
                this.ctx.fillRect(-p.radius, -p.radius/2, p.radius*2, p.radius);
                this.ctx.fillStyle = p.color;
                this.ctx.globalAlpha = 0.5;
                this.ctx.fillRect(-p.radius*1.5, -p.radius, p.radius*3, p.radius*2);
            } else if (p.type === 'lightning') {
                this.ctx.strokeStyle = p.color;
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.moveTo(-p.radius, 0);
                this.ctx.lineTo(-p.radius/2, (Math.random()-0.5)*p.radius);
                this.ctx.lineTo(0, (Math.random()-0.5)*p.radius);
                this.ctx.lineTo(p.radius/2, (Math.random()-0.5)*p.radius);
                this.ctx.lineTo(p.radius, 0);
                this.ctx.stroke();
            } else if (p.type === 'glitch_slash') {
                this.ctx.fillStyle = p.color;
                this.ctx.fillRect(-p.radius, -p.radius/4, p.radius*2, p.radius/2);
                this.ctx.fillStyle = '#ffffff';
                this.ctx.fillRect(-p.radius/2, -p.radius/8, p.radius, p.radius/4);
            } else if (p.type === 'stomp') {
                this.ctx.fillStyle = p.color;
                this.ctx.beginPath();
                for(let i=0; i<12; i++) {
                    const a = (Math.PI * 2 / 12) * i;
                    const r = p.radius * (i % 2 === 0 ? 1 : 0.8);
                    this.ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r * 0.5);
                }
                this.ctx.closePath();
                this.ctx.fill();
            } else if (p.type === 'repair_beam') {
                this.ctx.strokeStyle = p.color;
                this.ctx.lineWidth = 3;
                this.ctx.beginPath();
                this.ctx.moveTo(-p.radius, 0);
                this.ctx.lineTo(p.radius, 0);
                this.ctx.stroke();
                this.ctx.strokeStyle = '#ffffff';
                this.ctx.lineWidth = 1;
                this.ctx.beginPath();
                this.ctx.moveTo(-p.radius, 0);
                this.ctx.lineTo(p.radius, 0);
                this.ctx.stroke();
            } else if (p.isAoe) {
                this.ctx.fillStyle = p.color;
                this.ctx.beginPath();
                for (let i=0; i<16; i++) {
                    const a = (Math.PI * 2 / 16) * i;
                    this.ctx.lineTo(Math.cos(a) * p.radius, Math.sin(a) * p.radius);
                }
                this.ctx.closePath();
                this.ctx.fill();
                this.ctx.strokeStyle = '#ffffff';
                this.ctx.lineWidth = 2;
                this.ctx.globalAlpha = 0.5;
                this.ctx.stroke();
            } else {
                // Default projectile
                this.ctx.fillStyle = '#ffffff';
                this.ctx.fillRect(-p.radius*0.5, -p.radius*0.5, p.radius, p.radius);
                this.ctx.fillStyle = p.color;
                this.ctx.globalAlpha = 0.5;
                this.ctx.fillRect(-p.radius, -p.radius, p.radius*2, p.radius*2);
            }
            this.ctx.restore();
        });

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
            this.enemyProjectiles.forEach(p => {
                this.ctx.save();
                this.ctx.translate(p.x, p.y);
                if (p.vx || p.vy) {
                    this.ctx.rotate(Math.atan2(p.vy, p.vx));
                }
                
                this.ctx.shadowColor = p.color;
                this.ctx.shadowBlur = 10;
                
                this.ctx.fillStyle = '#ffffff';
                this.ctx.beginPath();
                this.ctx.moveTo(p.radius, 0);
                this.ctx.lineTo(-p.radius, p.radius*0.5);
                this.ctx.lineTo(-p.radius*0.5, 0);
                this.ctx.lineTo(-p.radius, -p.radius*0.5);
                this.ctx.fill();
                
                this.ctx.fillStyle = p.color;
                this.ctx.globalAlpha = 0.6;
                this.ctx.beginPath();
                this.ctx.moveTo(p.radius*1.5, 0);
                this.ctx.lineTo(-p.radius*1.2, p.radius*0.8);
                this.ctx.lineTo(-p.radius*0.8, 0);
                this.ctx.lineTo(-p.radius*1.2, -p.radius*0.8);
                this.ctx.fill();
                
                this.ctx.restore();
            });
        }

        const swarm = this.player.weapons.find(w => w.id === 'slothSwarm');
        if (swarm) {
            const wUpgrades = this.save.weaponUpgrades?.['slothSwarm'] || {};
            const isMastered = (wUpgrades.damage || 0) >= 5 && (wUpgrades.area || 0) >= 5 && (wUpgrades.cooldown || 0) >= 5;
            
            const count = 1 + Math.floor(swarm.level / 2);
            const area = swarm.baseArea * this.player.areaMult * (1 + (swarm.level-1)*0.1) * (1 + (wUpgrades.area || 0) * 0.1);
            const speedMult = isMastered ? 6 : 3;
            for(let i=0; i<count; i++) {
                const angle = (Math.PI * 2 / count) * i + this.time * speedMult;
                const px = this.player.x + Math.cos(angle) * (60 * area);
                const py = this.player.y + Math.sin(angle) * (60 * area);
                
                this.ctx.save();
                this.ctx.translate(px, py);
                this.ctx.rotate(angle + Math.PI/2); // Face direction of orbit
                
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

        this.particleManager.draw(this.ctx);

        this.enemies.forEach(e => {
            if (!e.burrowed) {
                drawEnemy(this.ctx, e, this.time, this.player.x);
                
                if (e.hp < e.maxHp) {
                    this.ctx.fillStyle = '#ff0000'; this.ctx.fillRect(e.x - 10, e.y - e.radius - 8, 20, 4);
                    this.ctx.fillStyle = '#00ff00'; this.ctx.fillRect(e.x - 10, e.y - e.radius - 8, 20 * (e.hp / e.maxHp), 4);
                }
            } else {
                // Draw burrowed indicator
                this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
                this.ctx.beginPath(); this.ctx.ellipse(e.x, e.y, e.radius, e.radius * 0.5, 0, 0, Math.PI * 2); this.ctx.fill();
            }
        });

        if (this.player.trail !== 'default' && this.frameCount % 3 === 0) {
            const trailColors = {
                'fire': '#ff4500',
                'ice': '#00ffff',
                'void': '#8a2be2',
                'toxic': '#32cd32',
                'gold': '#ffd700'
            };
            if (trailColors[this.player.trail]) {
                this.addParticle(this.player.x, this.player.y, trailColors[this.player.trail], 1);
            }
        }

        if (this.player.spriteSheet && this.player.spriteSheet.complete) {
            const size = this.player.radius * 4.5; // Slightly larger to fit the sprite
            
            this.ctx.save();
            this.ctx.translate(this.player.x, this.player.y);
            
            if (this.player.facingLeft) {
                this.ctx.scale(-1, 1);
            }
            
            this.ctx.shadowColor = this.player.color;
            this.ctx.shadowBlur = 10;
            
            const frameWidth = this.player.spriteSheet.width / 4;
            const frameHeight = this.player.spriteSheet.height / 4;
            
            this.ctx.drawImage(
                this.player.spriteSheet,
                Math.floor(this.player.frameX * frameWidth),
                Math.floor(this.player.frameY * frameHeight),
                Math.floor(frameWidth),
                Math.floor(frameHeight),
                -size/2,
                -size/2,
                size,
                size
            );
            
            this.ctx.shadowBlur = 0;
            this.ctx.restore();
        } else if (this.player.image && this.player.image.complete) {
            const size = this.player.radius * 3;
            
            this.ctx.save();
            this.ctx.translate(this.player.x, this.player.y);
            
            if (this.player.facingLeft) {
                this.ctx.scale(-1, 1);
            }
            
            if (this.player.isMoving) {
                const bob = Math.sin(this.player.moveTimer) * 4;
                const rot = Math.cos(this.player.moveTimer) * 0.15;
                this.ctx.translate(0, bob);
                this.ctx.rotate(rot);
            }
            
            this.ctx.shadowColor = this.player.color;
            this.ctx.shadowBlur = 10;
            this.ctx.drawImage(this.player.image, -size/2, -size/2, size, size);
            this.ctx.shadowBlur = 0;
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

        this.ctx.font = 'bold 14px "Courier New", Courier, monospace';
        this.ctx.textAlign = 'center';
        this.damageTexts.forEach(t => {
            this.ctx.globalAlpha = Math.max(0, t.life);
            this.ctx.strokeStyle = '#000000';
            this.ctx.lineWidth = 3;
            this.ctx.strokeText(t.text, t.x, t.y);
            this.ctx.fillStyle = t.color;
            this.ctx.fillText(t.text, t.x, t.y);
            this.ctx.globalAlpha = 1.0;
        });

        // Draw Environmental Effects
        if (this.envEffect === 'neon_rain') {
            this.envParticles.forEach(p => {
                this.ctx.strokeStyle = p.color;
                this.ctx.lineWidth = 2;
                this.ctx.globalAlpha = p.life / 2;
                this.ctx.beginPath();
                this.ctx.moveTo(p.x, p.y);
                this.ctx.lineTo(p.x - p.vx * 0.05, p.y - p.vy * 0.05);
                this.ctx.stroke();
            });
            this.ctx.globalAlpha = 1.0;
        } else if (this.envEffect === 'fog') {
            this.envParticles.forEach(p => {
                const gradient = this.ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
                gradient.addColorStop(0, `rgba(200, 200, 220, ${0.15 * (p.life / 10)})`);
                gradient.addColorStop(1, 'rgba(200, 200, 220, 0)');
                this.ctx.fillStyle = gradient;
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                this.ctx.fill();
            });
        } else if (this.envEffect === 'solar_flare') {
            this.envParticles.forEach(p => {
                const alpha = Math.sin((p.life / p.maxLife) * Math.PI) * 0.3;
                const gradient = this.ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
                gradient.addColorStop(0, `rgba(255, 100, 0, ${alpha})`);
                gradient.addColorStop(1, 'rgba(255, 100, 0, 0)');
                this.ctx.fillStyle = gradient;
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                this.ctx.fill();
            });
            // Global orange tint pulsing
            this.ctx.fillStyle = `rgba(255, 69, 0, ${Math.sin(this.time * 0.5) * 0.05 + 0.05})`;
            this.ctx.fillRect(this.camera.x - this.shakeX, this.camera.y - this.shakeY, this.canvas.width, this.canvas.height);
        }

        this.ctx.restore();
    }
}