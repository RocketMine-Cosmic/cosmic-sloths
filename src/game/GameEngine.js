import { CHARACTERS, WEAPONS, UPGRADES, ENEMIES, ARENAS, SYNERGIES, CHARACTER_TALENTS, DIFFICULTIES } from './Constants';

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
        
        this.player = {
            name: baseChar.name,
            image: playerImage,
            x: 0, y: 0, radius: 16,
            maxHp: baseChar.hp + getStatBonus('health') + (talentBonus.maxHp || 0),
            hp: baseChar.hp + getStatBonus('health') + (talentBonus.maxHp || 0),
            speed: baseChar.speed,
            speedMult: 1 + getStatBonus('speed') + (talentBonus.speedMult || 0),
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
        this.particles = [];
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
        } else {
            this.player.moveTimer = 0;
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
        this.particles = this.particles.filter(p => {
            p.life -= dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            return p.life > 0;
        });
        
        this.damageTexts = this.damageTexts.filter(t => {
            t.life -= dt;
            t.y -= 20 * dt;
            return t.life > 0;
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
            }
        }

        const progress = Math.min(1, this.time / this.arena.duration);
        const spawnRate = 2.5 - (2.45 * Math.pow(progress, 1.5)); // Slower start
        
        if (Math.random() < dt / Math.max(0.05, spawnRate)) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.max(this.canvas.width, this.canvas.height) / 2 + 50;
            const ex = this.player.x + Math.cos(angle) * dist;
            const ey = this.player.y + Math.sin(angle) * dist;
            
            let availableEnemies = ENEMIES.filter(e => 
                !e.isBoss && 
                (!e.arenas || e.arenas.includes(this.arena.id))
            );
            if (availableEnemies.length === 0) availableEnemies = ENEMIES.filter(e => !e.isBoss);
            const type = availableEnemies[Math.floor(Math.random() * availableEnemies.length)];
            
            const hpMult = (1.0 + (5.0 * Math.pow(progress, 2.0))) * this.difficulty.enemyHpMult;
            const dmgMult = (1.0 + (2.0 * Math.pow(progress, 1.5))) * this.difficulty.enemyDmgMult;
            
            if (this.time > 60 && Math.random() < 0.01 + (progress * 0.04)) {
                const elites = ENEMIES.filter(e => e.id.startsWith('elite'));
                if (elites.length > 0) {
                    const elite = elites[Math.floor(Math.random() * elites.length)];
                    this.enemies.push({ ...elite, x: ex, y: ey, maxHp: elite.hp * hpMult * 2, hp: elite.hp * hpMult * 2, damage: elite.damage * dmgMult });
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
            
            this.projectiles.push({
                x: this.player.x, y: this.player.y,
                vx: Math.cos(angle) * 300 * this.player.projSpeedMult,
                vy: Math.sin(angle) * 300 * this.player.projSpeedMult,
                radius: 5 * area,
                damage: dmg,
                pierce: 2 + Math.floor(w.level/2),
                life: 2,
                color: isMastered ? '#4169E1' : '#00ff00',
                isMastered: isMastered,
                weaponId: 'napBeam'
            });
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
                            this.addParticle(e.x, e.y, p.color, 3);
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
                            const angle = Math.atan2(e.y - p.y, e.x - p.x);
                            e.x += Math.cos(angle) * p.pushback * dt;
                            e.y += Math.sin(angle) * p.pushback * dt;
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
                this.kills++;
                this.pickups.push({ x: e.x, y: e.y, type: 'xp', value: e.xp, color: '#00ffcc' });
                if (e.isBoss) {
                    this.pickups.push({ x: e.x, y: e.y, type: 'reroll', value: 1, color: '#ff00ff' });
                    this.addDamageText(e.x, e.y - 20, `BOSS DEFEATED!`, '#ffff00');
                } else {
                    if (Math.random() < 0.50 + (this.player.luck * 0.05)) {
                        const goldValue = 1 + Math.floor(this.time / 30);
                        this.pickups.push({ x: e.x + Math.random()*10-5, y: e.y + Math.random()*10-5, type: 'gold', value: goldValue, color: '#ffd700' });
                    }
                }
                this.addParticle(e.x, e.y, e.color, e.isBoss ? 50 : 15);
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
                const currentSpeed = e.slowTimer > 0 ? baseSpeed * 0.5 : baseSpeed;
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
                    e.attackTimer = 1.0;
                    if (this.player.hp <= 0) this.gameOver();
                }
            }
            if (e.attackTimer > 0) e.attackTimer -= dt;

            // Projectile attacks
            if (!e.burrowed) {
                if (e.id === 'nebula_serpent' || e.id === 'asteroid_kraken' || e.id === 'solar_mantis' || e.id === 'starspine_urchin' || e.id === 'cryo_wraith' || e.id === 'pulsar_anglerfish' || e.id === 'ion_stingray' || e.id === 'elite_solar_drake') {
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
            const dist = Math.hypot(this.player.x - p.x, this.player.y - p.y);
            if (dist < this.player.radius + 10) {
                if (p.type === 'xp') {
                    this.xp += p.value * this.player.xpMult;
                    if (this.xp >= this.xpRequired) this.levelUp();
                } else if (p.type === 'gold') {
                    this.gold += Math.floor(p.value * this.player.goldMult);
                    this.callbacks.onGoldChange(this.gold);
                } else if (p.type === 'reroll') {
                    if (this.callbacks.onRerollFound) this.callbacks.onRerollFound();
                    this.addDamageText(this.player.x, this.player.y - 40, `+1 Reroll Token!`, '#ff00ff');
                } else if (p.type === 'token') {
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
    }

    addParticle(x, y, color, count) {
        for(let i=0; i<count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 100 + 50;
            this.particles.push({
                x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                life: Math.random() * 0.5 + 0.2, color
            });
        }
    }

    addDamageText(x, y, text, color) {
        this.damageTexts.push({ x, y, text, color, life: 0.8 });
    }

    levelUp() {
        this.xp -= this.xpRequired;
        this.level++;
        this.xpRequired = Math.floor(this.xpRequired * 1.2 + 10);
        this.isPaused = true;
        
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
        this.callbacks.onGameOver({
            time: Math.floor(this.time),
            level: this.level,
            kills: this.kills,
            gold: this.gold
        });
    }

    victory() {
        this.isVictory = true;
        this.callbacks.onVictory({
            time: Math.floor(this.time),
            level: this.level,
            kills: this.kills,
            gold: this.gold,
            arenaId: this.arena.id,
            characterId: this.characterId
        });
    }

    drawEnemy(e) {
        this.ctx.save();
        this.ctx.translate(e.x, e.y);
        
        if (this.player.x < e.x) {
            this.ctx.scale(-1, 1);
        }

        const t = this.time * 5 + e.x * 0.01;
        const pulse = Math.sin(t) * 0.1 + 1;
        const wiggle = Math.sin(t * 2) * 0.1;

        this.ctx.shadowColor = e.color;
        this.ctx.shadowBlur = 15;

        // Helper to draw tentacles
        const drawTentacle = (count, length, width, color, speed = 1) => {
            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = width;
            this.ctx.lineCap = 'round';
            for (let i = 0; i < count; i++) {
                const angle = (Math.PI * 2 / count) * i + Math.sin(t * speed) * 0.5;
                this.ctx.beginPath();
                this.ctx.moveTo(0, 0);
                this.ctx.quadraticCurveTo(
                    Math.cos(angle) * length * 0.5, 
                    Math.sin(angle) * length * 0.5 + Math.sin(t * 2 + i) * 10, 
                    Math.cos(angle) * length, 
                    Math.sin(angle) * length
                );
                this.ctx.stroke();
            }
        };

        switch (e.id) {
            case 'moon_worm':
            case 'cosmic_parasite':
                // Long writhing slug
                this.ctx.fillStyle = '#1a0b2e'; // Dark purple-black
                this.ctx.beginPath();
                this.ctx.moveTo(e.radius, 0);
                for(let i=0; i<=10; i++) {
                    const x = e.radius - (i * e.radius * 0.2);
                    const y = Math.sin(t + i * 0.5) * 5;
                    const w = e.radius * (1 - i/12);
                    this.ctx.lineTo(x, y + w);
                }
                for(let i=10; i>=0; i--) {
                    const x = e.radius - (i * e.radius * 0.2);
                    const y = Math.sin(t + i * 0.5) * 5;
                    const w = e.radius * (1 - i/12);
                    this.ctx.lineTo(x, y - w);
                }
                this.ctx.fill();
                
                // Glowing suckers
                this.ctx.fillStyle = '#00ffff';
                for(let i=0; i<5; i++) {
                    const x = e.radius * 0.8 - (i * 8);
                    const y = Math.sin(t + i * 0.5) * 5;
                    this.ctx.beginPath(); this.ctx.arc(x, y, 2, 0, Math.PI*2); this.ctx.fill();
                }
                break;

            case 'dimensional_shambler':
                // Translucent body with stars
                for (let i = 0; i < 6; i++) {
                    const offset = Math.sin(t - i) * 8;
                    this.ctx.fillStyle = `rgba(255, 0, 255, ${0.8 - i * 0.1})`;
                    this.ctx.beginPath(); 
                    this.ctx.arc(-i * 10, offset, e.radius - i * 1.5, 0, Math.PI * 2); 
                    this.ctx.fill();
                    
                    // Stars inside
                    this.ctx.fillStyle = '#ffffff';
                    this.ctx.beginPath(); this.ctx.arc(-i * 10 + Math.random()*4-2, offset + Math.random()*4-2, 1, 0, Math.PI*2); this.ctx.fill();
                }
                // Fanged maw
                this.ctx.fillStyle = '#ffffff';
                this.ctx.beginPath();
                this.ctx.moveTo(e.radius * 0.5, -5); this.ctx.lineTo(e.radius, 0); this.ctx.lineTo(e.radius * 0.5, 5);
                this.ctx.fill();
                break;

            case 'station_turret':
                // Rocky head
                this.ctx.fillStyle = '#8b7355';
                this.ctx.beginPath(); 
                this.ctx.moveTo(e.radius, 0);
                for(let i=0; i<8; i++) {
                    const a = (Math.PI*2/8)*i;
                    const r = e.radius + (i%2===0 ? 2 : -2);
                    this.ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r);
                }
                this.ctx.fill();
                
                // Crystal tentacles
                drawTentacle(6, e.radius * 2, 3, '#00ffff', 0.5);
                
                // Glowing eye
                this.ctx.fillStyle = '#ff0000';
                this.ctx.beginPath(); this.ctx.arc(0, 0, 4, 0, Math.PI*2); this.ctx.fill();
                break;

            case 'nebula_jelly':
                // Translucent dome
                this.ctx.fillStyle = `rgba(0, 255, 255, ${0.4 + pulse * 0.2})`;
                this.ctx.beginPath(); 
                this.ctx.arc(0, -5, e.radius, Math.PI, 0); 
                this.ctx.lineTo(e.radius, 5);
                this.ctx.quadraticCurveTo(0, -2, -e.radius, 5);
                this.ctx.fill();
                
                // Lightning veins
                this.ctx.strokeStyle = '#ffffff';
                this.ctx.lineWidth = 1;
                this.ctx.beginPath(); this.ctx.moveTo(0, -e.radius + 2); this.ctx.lineTo(Math.sin(t)*5, 0); this.ctx.stroke();
                
                // Pulsing stingers
                this.ctx.strokeStyle = '#00ffff';
                this.ctx.lineWidth = 2;
                for(let i=-2; i<=2; i++) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(i*4, 5);
                    this.ctx.lineTo(i*6 + Math.sin(t*2+i)*5, 20);
                    this.ctx.stroke();
                }
                break;

            case 'station_drone':
            case 'stardust_mite':
            case 'alien_grunt':
                // Insectoid
                this.ctx.fillStyle = '#00ff00';
                this.ctx.beginPath(); this.ctx.ellipse(0, 0, e.radius, e.radius*0.5, 0, 0, Math.PI*2); this.ctx.fill();
                // Wings
                this.ctx.fillStyle = `rgba(200, 255, 200, 0.5)`;
                this.ctx.beginPath(); this.ctx.ellipse(0, -5, e.radius*1.5, e.radius*0.5, Math.sin(t*20)*0.5, 0, Math.PI*2); this.ctx.fill();
                this.ctx.beginPath(); this.ctx.ellipse(0, 5, e.radius*1.5, e.radius*0.5, -Math.sin(t*20)*0.5, 0, Math.PI*2); this.ctx.fill();
                break;

            case 'void_stalker':
                // Panther-like shadow
                this.ctx.fillStyle = '#1a0033';
                this.ctx.beginPath(); this.ctx.ellipse(0, 0, e.radius*1.2, e.radius*0.6, 0, 0, Math.PI*2); this.ctx.fill();
                // Head
                this.ctx.beginPath(); this.ctx.arc(e.radius, -2, 6, 0, Math.PI*2); this.ctx.fill();
                // Portals/Spots
                this.ctx.fillStyle = '#9400d3';
                this.ctx.beginPath(); this.ctx.arc(0, 0, 3 + pulse, 0, Math.PI*2); this.ctx.fill();
                this.ctx.beginPath(); this.ctx.arc(-5, 2, 2, 0, Math.PI*2); this.ctx.fill();
                break;

            case 'solar_flare':
                // Angular body
                this.ctx.fillStyle = '#ff4500';
                this.ctx.beginPath();
                this.ctx.moveTo(e.radius, 0);
                this.ctx.lineTo(-5, -5);
                this.ctx.lineTo(-e.radius, 0);
                this.ctx.lineTo(-5, 5);
                this.ctx.fill();
                // Solar wings
                this.ctx.fillStyle = `rgba(255, 215, 0, 0.6)`;
                this.ctx.beginPath(); this.ctx.moveTo(0, -2); this.ctx.lineTo(-10, -20); this.ctx.lineTo(10, -15); this.ctx.fill();
                this.ctx.beginPath(); this.ctx.moveTo(0, 2); this.ctx.lineTo(-10, 20); this.ctx.lineTo(10, 15); this.ctx.fill();
                // Blades
                this.ctx.strokeStyle = '#ffffff';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath(); this.ctx.moveTo(10, -5); this.ctx.lineTo(20, -10); this.ctx.stroke();
                this.ctx.beginPath(); this.ctx.moveTo(10, 5); this.ctx.lineTo(20, 10); this.ctx.stroke();
                break;

            case 'event_horror':
                // Blobby baby
                this.ctx.fillStyle = '#800080';
                this.ctx.beginPath(); 
                this.ctx.arc(0, 0, e.radius * (0.8 + pulse*0.2), 0, Math.PI*2); 
                this.ctx.fill();
                // Many eyes
                this.ctx.fillStyle = '#ffff00';
                this.ctx.beginPath(); this.ctx.arc(2, -2, 2, 0, Math.PI*2); this.ctx.fill();
                this.ctx.beginPath(); this.ctx.arc(-2, 2, 1.5, 0, Math.PI*2); this.ctx.fill();
                this.ctx.beginPath(); this.ctx.arc(3, 3, 1, 0, Math.PI*2); this.ctx.fill();
                break;

            case 'shadow_fiend':
                // Sleek body
                this.ctx.fillStyle = '#1a1a1a';
                this.ctx.beginPath(); this.ctx.ellipse(0, 0, e.radius, e.radius*0.4, 0, 0, Math.PI*2); this.ctx.fill();
                // Eclipse wings (black with white rim)
                this.ctx.fillStyle = '#000000';
                this.ctx.strokeStyle = '#ffffff';
                this.ctx.lineWidth = 1;
                this.ctx.beginPath(); 
                this.ctx.moveTo(0, -2); this.ctx.quadraticCurveTo(e.radius*1.5, -e.radius*1.5, -e.radius, -5); 
                this.ctx.fill(); this.ctx.stroke();
                this.ctx.beginPath(); 
                this.ctx.moveTo(0, 2); this.ctx.quadraticCurveTo(e.radius*1.5, e.radius*1.5, -e.radius, 5); 
                this.ctx.fill(); this.ctx.stroke();
                break;

            case 'asteroid_brute':
            case 'shard_golem':
            case 'alien_brute':
                // Turtle shell
                this.ctx.fillStyle = '#2f4f4f';
                this.ctx.beginPath(); this.ctx.arc(0, 0, e.radius, 0, Math.PI*2); this.ctx.fill();
                // Orbs
                this.ctx.fillStyle = '#4b0082';
                for(let i=0; i<5; i++) {
                    const a = (Math.PI*2/5)*i + t*0.5;
                    this.ctx.beginPath(); this.ctx.arc(Math.cos(a)*e.radius*0.6, Math.sin(a)*e.radius*0.6, 6, 0, Math.PI*2); this.ctx.fill();
                }
                // Head
                this.ctx.fillStyle = '#556b2f';
                this.ctx.beginPath(); this.ctx.arc(e.radius+5, 0, 8, 0, Math.PI*2); this.ctx.fill();
                break;

            case 'rock_mite':
                // Crystalline ball
                this.ctx.fillStyle = '#00ced1';
                this.ctx.beginPath(); this.ctx.arc(0, 0, e.radius*0.7, 0, Math.PI*2); this.ctx.fill();
                // Spikes
                this.ctx.fillStyle = '#ffffff';
                for(let i=0; i<12; i++) {
                    const a = (Math.PI*2/12)*i + t;
                    this.ctx.beginPath();
                    this.ctx.moveTo(Math.cos(a)*e.radius*0.7, Math.sin(a)*e.radius*0.7);
                    this.ctx.lineTo(Math.cos(a)*e.radius*1.5, Math.sin(a)*e.radius*1.5);
                    this.ctx.lineTo(Math.cos(a+0.2)*e.radius*0.7, Math.sin(a+0.2)*e.radius*0.7);
                    this.ctx.fill();
                }
                break;

            case 'elite_pulsar':
                // Ghost whale
                this.ctx.fillStyle = `rgba(224, 255, 255, ${0.5 + pulse*0.2})`;
                this.ctx.beginPath();
                this.ctx.moveTo(e.radius, 0);
                this.ctx.quadraticCurveTo(0, -e.radius*0.8, -e.radius*1.5, 0);
                this.ctx.quadraticCurveTo(0, e.radius*0.8, e.radius, 0);
                this.ctx.fill();
                // Fins
                this.ctx.beginPath(); this.ctx.moveTo(0, -e.radius*0.5); this.ctx.lineTo(-5, -e.radius*1.2); this.ctx.lineTo(5, -e.radius*0.5); this.ctx.fill();
                this.ctx.beginPath(); this.ctx.moveTo(0, e.radius*0.5); this.ctx.lineTo(-5, e.radius*1.2); this.ctx.lineTo(5, e.radius*0.5); this.ctx.fill();
                break;

            case 'plasma_wraith':
                // Ice ghost
                this.ctx.fillStyle = `rgba(173, 216, 230, ${0.6 + pulse*0.2})`;
                this.ctx.beginPath();
                this.ctx.moveTo(0, -e.radius);
                this.ctx.quadraticCurveTo(e.radius, -e.radius, e.radius*0.5, 0);
                this.ctx.lineTo(0, e.radius + Math.sin(t*5)*5);
                this.ctx.lineTo(-e.radius*0.5, 0);
                this.ctx.quadraticCurveTo(-e.radius, -e.radius, 0, -e.radius);
                this.ctx.fill();
                // Glowing eyes
                this.ctx.fillStyle = '#ffffff';
                this.ctx.beginPath(); this.ctx.arc(3, -5, 2, 0, Math.PI*2); this.ctx.fill();
                this.ctx.beginPath(); this.ctx.arc(-3, -5, 2, 0, Math.PI*2); this.ctx.fill();
                break;

            case 'ufo_scout':
                // Fish body
                this.ctx.fillStyle = '#ff1493';
                this.ctx.beginPath(); this.ctx.ellipse(0, 0, e.radius, e.radius*0.7, 0, 0, Math.PI*2); this.ctx.fill();
                // Lure
                this.ctx.strokeStyle = '#ffffff';
                this.ctx.lineWidth = 1;
                this.ctx.beginPath(); this.ctx.moveTo(5, -5); this.ctx.quadraticCurveTo(15, -15, 20, -5); this.ctx.stroke();
                this.ctx.fillStyle = '#00ffff';
                this.ctx.shadowColor = '#00ffff';
                this.ctx.shadowBlur = 10;
                this.ctx.beginPath(); this.ctx.arc(20, -5, 3 + pulse, 0, Math.PI*2); this.ctx.fill();
                this.ctx.shadowBlur = 0;
                break;

            case 'gas_floater':
                // Torso
                this.ctx.fillStyle = '#dda0dd';
                this.ctx.beginPath(); this.ctx.arc(0, -5, 8, 0, Math.PI*2); this.ctx.fill();
                // Tentacles/Hair
                drawTentacle(5, 20, 2, '#ee82ee', 0.8);
                break;

            case 'station_cyborg':
            case 'crystal_crawler':
                // Beetle shell
                this.ctx.fillStyle = '#2f0000';
                this.ctx.beginPath(); this.ctx.ellipse(0, 0, e.radius, e.radius*1.2, 0, 0, Math.PI*2); this.ctx.fill();
                // Legs
                this.ctx.strokeStyle = '#000000';
                this.ctx.lineWidth = 2;
                for(let i=0; i<3; i++) {
                    const y = -10 + i*10;
                    this.ctx.beginPath(); this.ctx.moveTo(5, y); this.ctx.lineTo(15, y - Math.sin(t*10 + i)*5); this.ctx.stroke();
                    this.ctx.beginPath(); this.ctx.moveTo(-5, y); this.ctx.lineTo(-15, y - Math.sin(t*10 + i)*5); this.ctx.stroke();
                }
                break;

            case 'glitch_entity':
                // Flat body
                this.ctx.fillStyle = '#00fa9a';
                this.ctx.beginPath();
                this.ctx.moveTo(e.radius*1.5, 0);
                this.ctx.lineTo(0, -e.radius);
                this.ctx.lineTo(-e.radius*0.5, 0);
                this.ctx.lineTo(0, e.radius);
                this.ctx.fill();
                // Tail
                this.ctx.strokeStyle = '#ffffff';
                this.ctx.beginPath(); this.ctx.moveTo(-e.radius*0.5, 0); this.ctx.lineTo(-e.radius*2, Math.sin(t*5)*5); this.ctx.stroke();
                break;

            case 'gem_bat':
                // Body
                this.ctx.fillStyle = '#000000';
                this.ctx.beginPath(); this.ctx.ellipse(0, 0, 3, 10, 0, 0, Math.PI*2); this.ctx.fill();
                // Fractal wings
                this.ctx.fillStyle = `rgba(255, 105, 180, 0.7)`;
                this.ctx.save();
                this.ctx.scale(1 + Math.sin(t*20)*0.2, 1);
                this.ctx.beginPath(); this.ctx.moveTo(0, -5); this.ctx.lineTo(15, -15); this.ctx.lineTo(10, 0); this.ctx.lineTo(15, 15); this.ctx.lineTo(0, 5); this.ctx.fill();
                this.ctx.beginPath(); this.ctx.moveTo(0, -5); this.ctx.lineTo(-15, -15); this.ctx.lineTo(-10, 0); this.ctx.lineTo(-15, 15); this.ctx.lineTo(0, 5); this.ctx.fill();
                this.ctx.restore();
                break;

            case 'void_eye':
            case 'lunar_tick':
                // Round body
                this.ctx.fillStyle = '#000000';
                this.ctx.strokeStyle = '#800080';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath(); this.ctx.arc(0, 0, e.radius, 0, Math.PI*2); this.ctx.fill(); this.ctx.stroke();
                // Legs
                for(let i=0; i<8; i++) {
                    const a = (Math.PI*2/8)*i;
                    this.ctx.beginPath(); this.ctx.moveTo(Math.cos(a)*e.radius, Math.sin(a)*e.radius);
                    this.ctx.lineTo(Math.cos(a)*(e.radius+5), Math.sin(a)*(e.radius+5));
                    this.ctx.stroke();
                }
                break;

            case 'fire_elemental':
                // Ethereal form
                this.ctx.fillStyle = `rgba(127, 255, 212, ${0.5 + pulse*0.3})`;
                this.ctx.beginPath();
                this.ctx.arc(0, -5, 8, 0, Math.PI*2);
                this.ctx.moveTo(-8, 0);
                this.ctx.quadraticCurveTo(0, 20 + Math.sin(t*3)*5, 8, 0);
                this.ctx.fill();
                // Screaming mouth
                this.ctx.fillStyle = '#000000';
                this.ctx.beginPath(); this.ctx.ellipse(0, -3, 2, 4 + pulse*2, 0, 0, Math.PI*2); this.ctx.fill();
                break;

            case 'space_dragon':
                // Dragon shape
                this.ctx.fillStyle = '#ffd700';
                this.ctx.beginPath();
                this.ctx.moveTo(15, 0); // Nose
                this.ctx.lineTo(0, -5);
                this.ctx.lineTo(-10, -15); // Wing tip
                this.ctx.lineTo(-5, 0);
                this.ctx.lineTo(-10, 15); // Wing tip
                this.ctx.lineTo(0, 5);
                this.ctx.fill();
                // Fire breath hint
                this.ctx.fillStyle = '#ff4500';
                this.ctx.beginPath(); this.ctx.arc(18, 0, 2 + Math.random()*2, 0, Math.PI*2); this.ctx.fill();
                break;

            case 'singularity_spawn':
            case 'elite_dark_matter':
                // Fat slug
                this.ctx.fillStyle = '#483d8b';
                this.ctx.beginPath(); this.ctx.ellipse(0, 0, e.radius, e.radius*0.6, 0, 0, Math.PI*2); this.ctx.fill();
                // Black hole on back
                this.ctx.fillStyle = '#000000';
                this.ctx.strokeStyle = '#ffffff';
                this.ctx.beginPath(); this.ctx.arc(0, -5, 8, 0, Math.PI*2); this.ctx.fill(); this.ctx.stroke();
                break;

            case 'boss_nebula_lord':
            case 'boss_alien_queen':
                // Central body
                this.ctx.fillStyle = '#32cd32';
                this.ctx.beginPath(); this.ctx.arc(0, 0, 20, 0, Math.PI*2); this.ctx.fill();
                // Heads
                const heads = e.heads || 3;
                for(let i=0; i<heads; i++) {
                    const a = (Math.PI*2/heads)*i + Math.sin(t)*0.2;
                    const len = 30 + Math.sin(t*2+i)*5;
                    this.ctx.strokeStyle = '#32cd32';
                    this.ctx.lineWidth = 8;
                    this.ctx.lineCap = 'round';
                    this.ctx.beginPath();
                    this.ctx.moveTo(0, 0);
                    this.ctx.quadraticCurveTo(Math.cos(a)*len*0.5, Math.sin(a)*len*0.5 + 10, Math.cos(a)*len, Math.sin(a)*len);
                    this.ctx.stroke();
                    // Head
                    this.ctx.fillStyle = '#006400';
                    this.ctx.beginPath(); this.ctx.arc(Math.cos(a)*len, Math.sin(a)*len, 8, 0, Math.PI*2); this.ctx.fill();
                    // Mouth
                    this.ctx.fillStyle = '#ff0000';
                    this.ctx.beginPath(); this.ctx.arc(Math.cos(a)*len + 3, Math.sin(a)*len, 3, 0, Math.PI*2); this.ctx.fill();
                }
                break;

            case 'boss_supernova':
                // Segmented worm
                for(let i=8; i>=0; i--) {
                    const x = -i * 15;
                    const y = Math.sin(t - i*0.5) * 10;
                    this.ctx.fillStyle = i===0 ? '#ff4500' : '#8b0000'; // Head is brighter
                    this.ctx.beginPath(); this.ctx.arc(x, y, 20 - i, 0, Math.PI*2); this.ctx.fill();
                }
                // Maw
                this.ctx.fillStyle = '#000000';
                this.ctx.beginPath(); this.ctx.arc(5, Math.sin(t)*10, 12, 0, Math.PI*2); this.ctx.fill();
                break;

            case 'boss_blackhole':
                this.ctx.fillStyle = e.color;
                this.ctx.beginPath(); this.ctx.ellipse(0, 0, e.radius, e.radius * 0.8, 0, 0, Math.PI * 2); this.ctx.fill();
                this.ctx.fillStyle = '#000000';
                for (let i = 0; i < 5; i++) {
                    this.ctx.beginPath(); this.ctx.arc(Math.cos(t + i) * e.radius * 0.6, Math.sin(t + i) * e.radius * 0.5, 8, 0, Math.PI * 2); this.ctx.fill();
                }
                break;

            default:
                // Fallback circle
                this.ctx.fillStyle = e.color;
                this.ctx.beginPath(); this.ctx.arc(0, 0, e.radius, 0, Math.PI * 2); this.ctx.fill();
                break;
        }

        this.ctx.shadowBlur = 0;
        this.ctx.restore();
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
            this.ctx.beginPath();
            this.ctx.arc(screenX, screenY, star.size, 0, Math.PI * 2);
            this.ctx.fill();
        });
        this.ctx.globalAlpha = 1.0;

        this.ctx.save();
        this.ctx.translate(-this.camera.x, -this.camera.y);
        
        this.ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        this.ctx.lineWidth = 1;
        const gridSize = 100;
        const startX = Math.floor(this.camera.x / gridSize) * gridSize;
        const startY = Math.floor(this.camera.y / gridSize) * gridSize;
        
        for(let x = startX; x < startX + this.canvas.width + gridSize; x += gridSize) {
            this.ctx.beginPath(); this.ctx.moveTo(x, this.camera.y); this.ctx.lineTo(x, this.camera.y + this.canvas.height); this.ctx.stroke();
        }
        for(let y = startY; y < startY + this.canvas.height + gridSize; y += gridSize) {
            this.ctx.beginPath(); this.ctx.moveTo(this.camera.x, y); this.ctx.lineTo(this.camera.x + this.canvas.width, y); this.ctx.stroke();
        }

        this.pickups.forEach(p => {
            this.ctx.fillStyle = p.color;
            this.ctx.beginPath(); this.ctx.arc(p.x, p.y, p.type === 'xp' ? 4 : 6, 0, Math.PI * 2); this.ctx.fill();
        });

        if (this.characterPickup) {
            this.ctx.fillStyle = this.characterPickup.color;
            this.ctx.beginPath(); this.ctx.arc(this.characterPickup.x, this.characterPickup.y, 15, 0, Math.PI * 2); this.ctx.fill();
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
            this.ctx.fillStyle = p.color;
            this.ctx.beginPath(); this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); this.ctx.fill();
        });

        if (this.hazards) {
            this.hazards.forEach(h => {
                this.ctx.beginPath();
                this.ctx.arc(h.x, h.y, h.radius, 0, Math.PI * 2);
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
            });
        }

        if (this.enemyProjectiles) {
            this.enemyProjectiles.forEach(p => {
                this.ctx.fillStyle = p.color;
                this.ctx.beginPath(); this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); this.ctx.fill();
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
                this.ctx.fillStyle = isMastered ? '#FF0000' : '#8B4513';
                this.ctx.beginPath(); this.ctx.arc(px, py, 6, 0, Math.PI*2); this.ctx.fill();
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
                this.ctx.fillStyle = '#32CD32'; // Greenish for thorny
                this.ctx.beginPath(); this.ctx.arc(px, py, 8, 0, Math.PI*2); this.ctx.fill();
                this.ctx.strokeStyle = '#228B22';
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
            }
        }

        this.particles.forEach(p => {
            this.ctx.fillStyle = p.color;
            this.ctx.globalAlpha = p.life * 2;
            this.ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
            this.ctx.globalAlpha = 1.0;
        });

        this.enemies.forEach(e => {
            if (!e.burrowed) {
                this.drawEnemy(e);
                
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

        if (this.player.image && this.player.image.complete) {
            const size = this.player.radius * 3;
            
            this.ctx.save();
            this.ctx.translate(this.player.x, this.player.y);
            
            if (!this.player.facingLeft) {
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
            this.ctx.beginPath(); this.ctx.arc(this.player.x, this.player.y, this.player.radius, 0, Math.PI * 2); this.ctx.fill();
            this.ctx.fillStyle = 'rgba(173, 216, 230, 0.5)';
            this.ctx.beginPath(); this.ctx.arc(this.player.x, this.player.y - 4, this.player.radius - 2, 0, Math.PI * 2); this.ctx.fill();
        }

        this.ctx.font = '12px "Courier New", Courier, monospace';
        this.ctx.textAlign = 'center';
        this.damageTexts.forEach(t => {
            this.ctx.fillStyle = t.color;
            this.ctx.globalAlpha = t.life;
            this.ctx.fillText(t.text, t.x, t.y);
            this.ctx.globalAlpha = 1.0;
        });

        this.ctx.restore();
    }
}