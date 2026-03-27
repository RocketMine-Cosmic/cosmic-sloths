import { CHARACTERS, WEAPONS, UPGRADES, ENEMIES, ARENAS, SYNERGIES } from './Constants';

export class GameEngine {
    constructor(canvas, characterId, arenaId, saveStats, callbacks) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.callbacks = callbacks;
        
        const baseChar = CHARACTERS.find(c => c.id === characterId) || CHARACTERS[0];
        this.arena = ARENAS.find(a => a.id === arenaId) || ARENAS[0];
        
        this.player = {
            name: baseChar.name,
            x: 0, y: 0, radius: 16,
            maxHp: baseChar.hp + (saveStats.health * 10),
            hp: baseChar.hp + (saveStats.health * 10),
            speed: baseChar.speed,
            speedMult: 1 + (saveStats.speed * 0.05),
            damageMult: (baseChar.damageMult || 1) + (saveStats.damage * 0.05),
            magnetRange: (baseChar.magnetRange || 60) + (saveStats.magnet * 15),
            regen: baseChar.regen + (saveStats.regen * 0.2),
            armor: baseChar.armor,
            areaMult: (baseChar.areaMult || 1),
            cooldownMult: (baseChar.cooldownMult || 1) - ((saveStats.cooldown || 0) * 0.05),
            projSpeedMult: (baseChar.projSpeedMult || 1),
            goldMult: (baseChar.goldMult || 1),
            xpMult: (baseChar.xpMult || 1),
            luck: (baseChar.luck || 0) + (saveStats.luck || 0),
            color: baseChar.color,
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
        
        this.camera.x = this.player.x - this.canvas.width / 2;
        this.camera.y = this.player.y - this.canvas.height / 2;

        this.spawnEnemies(dt);
        this.updateWeapons(dt);
        this.updateProjectiles(dt);
        this.updateEnemies(dt);
        this.updatePickups(dt);

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
        const progress = Math.min(1, this.time / this.arena.duration);
        const spawnRate = 2.0 - (1.95 * Math.pow(progress, 2));
        
        if (Math.random() < dt / Math.max(0.02, spawnRate)) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.max(this.canvas.width, this.canvas.height) / 2 + 50;
            const ex = this.player.x + Math.cos(angle) * dist;
            const ey = this.player.y + Math.sin(angle) * dist;
            
            const availableEnemies = ENEMIES.filter((_, i) => i <= Math.floor(this.time / 60) || i === 0);
            const type = availableEnemies[Math.floor(Math.random() * availableEnemies.length)];
            
            const hpMult = 0.5 + (3.5 * Math.pow(progress, 1.5));
            
            if (this.time > 60 && Math.random() < 0.01 + (progress * 0.04)) {
                const elite = ENEMIES.find(e => e.id === 'elite');
                if (elite) {
                    this.enemies.push({ ...elite, x: ex, y: ey, maxHp: elite.hp * hpMult * 2, hp: elite.hp * hpMult * 2 });
                    return;
                }
            }
            
            this.enemies.push({ ...type, x: ex, y: ey, maxHp: type.hp * hpMult, hp: type.hp * hpMult });
        }
    }

    updateWeapons(dt) {
        this.player.weapons.forEach(w => {
            w.timer -= dt;
            if (w.timer <= 0) {
                this.fireWeapon(w);
                w.timer = (w.baseCooldown / 60) * Math.max(0.2, this.player.cooldownMult);
            }
        });
    }

    fireWeapon(w) {
        const dmg = w.baseDamage * this.player.damageMult * (1 + (w.level-1)*0.2);
        const area = w.baseArea * this.player.areaMult * (1 + (w.level-1)*0.1);
        
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
                color: '#00ff00'
            });
        }
        else if (w.id === 'vineWhip') {
            this.enemies.forEach(e => {
                if (Math.hypot(e.x - this.player.x, e.y - this.player.y) < 100 * area) {
                    this.damageEnemy(e, dmg);
                    this.addParticle(e.x, e.y, '#228B22', 10);
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
                    if (Math.hypot(e.x - px, e.y - py) < 20) this.damageEnemy(e, dmg * 0.2);
                });
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
                color: 'rgba(255, 69, 0, 0.5)',
                isAoe: true
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
                color: 'rgba(0, 255, 255, 0.6)',
                isAoe: true,
                pulse: true
            });
        }
        else if (w.id === 'shieldBubble') {
            this.projectiles.push({
                x: this.player.x, y: this.player.y,
                vx: 0, vy: 0,
                radius: 80 * area,
                damage: dmg,
                pierce: 999,
                life: 2.0,
                color: 'rgba(255, 255, 255, 0.3)',
                isAoe: true,
                pushback: 250
            });
        }
        else if (w.id === 'burningBarrier') {
            this.projectiles.push({
                x: this.player.x, y: this.player.y,
                vx: 0, vy: 0,
                radius: 100 * area,
                damage: dmg,
                pierce: 999,
                life: 2.5,
                color: 'rgba(255, 100, 0, 0.4)',
                isAoe: true,
                pushback: 150,
                burn: true
            });
        }
        else if (w.id === 'laserNova') {
            const count = 8 + Math.floor(w.level);
            for(let i=0; i<count; i++) {
                const angle = (Math.PI * 2 / count) * i;
                this.projectiles.push({
                    x: this.player.x, y: this.player.y,
                    vx: Math.cos(angle) * 400 * this.player.projSpeedMult,
                    vy: Math.sin(angle) * 400 * this.player.projSpeedMult,
                    radius: 8 * area,
                    damage: dmg,
                    pierce: 5,
                    life: 2,
                    color: '#ff00ff'
                });
            }
        }
        else if (w.id === 'thornySwarm') {
            const count = 3 + Math.floor(w.level / 2);
            for(let i=0; i<count; i++) {
                const angle = (Math.PI * 2 / count) * i + this.time * 4;
                const px = this.player.x + Math.cos(angle) * (80 * area);
                const py = this.player.y + Math.sin(angle) * (80 * area);
                this.enemies.forEach(e => {
                    if (Math.hypot(e.x - px, e.y - py) < 40) {
                        this.damageEnemy(e, dmg);
                        this.addParticle(e.x, e.y, '#228B22', 5);
                    }
                });
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
                        if (!p.hitList) p.hitList = new Set();
                        if (!p.hitList.has(e)) {
                            p.hitList.add(e);
                            this.damageEnemy(e, p.damage);
                            p.pierce--;
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
                                if (p.burn) this.addParticle(e.x, e.y, '#ff4500', 3);
                            }
                            const angle = Math.atan2(e.y - p.y, e.x - p.x);
                            e.x += Math.cos(angle) * p.pushback * dt;
                            e.y += Math.sin(angle) * p.pushback * dt;
                        }
                    });
                } else {
                    if (this.frameCount % 15 === 0) {
                        this.enemies.forEach(e => {
                            if (Math.hypot(e.x - p.x, e.y - p.y) < p.radius) this.damageEnemy(e, p.damage);
                        });
                    }
                }
            }
            return p.life > 0 && p.pierce > 0;
        });
    }

    updateEnemies(dt) {
        this.enemies = this.enemies.filter(e => {
            if (e.hp <= 0) {
                this.kills++;
                this.pickups.push({ x: e.x, y: e.y, type: 'xp', value: e.xp, color: '#00ffcc' });
                if (Math.random() < 0.3 + (this.player.luck * 0.05)) {
                    const goldValue = 1 + Math.floor(this.time / 60);
                    this.pickups.push({ x: e.x + Math.random()*10-5, y: e.y + Math.random()*10-5, type: 'gold', value: goldValue, color: '#ffd700' });
                }
                this.addParticle(e.x, e.y, e.color, 15);
                return false;
            }
            
            const dx = this.player.x - e.x;
            const dy = this.player.y - e.y;
            const dist = Math.hypot(dx, dy);
            
            if (dist > 0) {
                e.x += (dx / dist) * e.speed * 60 * dt;
                e.y += (dy / dist) * e.speed * 60 * dt;
            }
            
            if (dist < this.player.radius + e.radius) {
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
            const existing = this.player.weapons.find(w => w.id === upgrade.weaponId);
            const levelIncrement = upgrade.value || 1;
            if (existing) {
                existing.level += levelIncrement;
            } else {
                this.player.weapons.push({ ...WEAPONS[upgrade.weaponId], level: levelIncrement, timer: 0 });
                this.checkSynergies();
            }
        }
        this.isPaused = false;
    }

    checkSynergies() {
        SYNERGIES.forEach(syn => {
            const hasSynergy = this.player.weapons.find(w => w.id === syn.result);
            if (!hasSynergy) {
                const hasW1 = this.player.weapons.find(w => w.id === syn.weapon1);
                const hasW2 = this.player.weapons.find(w => w.id === syn.weapon2);
                if (hasW1 && hasW2) {
                    this.player.weapons.push({ ...WEAPONS[syn.result], level: 1, timer: 0 });
                    
                    const idx1 = this.player.weapons.findIndex(w => w.id === syn.weapon1);
                    if (idx1 !== -1) this.player.weapons.splice(idx1, 1);
                    
                    const idx2 = this.player.weapons.findIndex(w => w.id === syn.weapon2);
                    if (idx2 !== -1) this.player.weapons.splice(idx2, 1);
                    
                    this.addDamageText(this.player.x, this.player.y - 40, `SYNERGY!`, '#ffaa00');
                }
            }
        });
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
            arenaId: this.arena.id
        });
    }

    draw() {
        this.ctx.fillStyle = this.arena.bg;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
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

        this.projectiles.forEach(p => {
            this.ctx.fillStyle = p.color;
            this.ctx.beginPath(); this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); this.ctx.fill();
        });

        const swarm = this.player.weapons.find(w => w.id === 'slothSwarm');
        if (swarm) {
            const count = 1 + Math.floor(swarm.level / 2);
            const area = swarm.baseArea * this.player.areaMult * (1 + (swarm.level-1)*0.1);
            for(let i=0; i<count; i++) {
                const angle = (Math.PI * 2 / count) * i + this.time * 3;
                const px = this.player.x + Math.cos(angle) * (60 * area);
                const py = this.player.y + Math.sin(angle) * (60 * area);
                this.ctx.fillStyle = '#8B4513';
                this.ctx.beginPath(); this.ctx.arc(px, py, 6, 0, Math.PI*2); this.ctx.fill();
            }
        }

        const thornySwarm = this.player.weapons.find(w => w.id === 'thornySwarm');
        if (thornySwarm) {
            const count = 3 + Math.floor(thornySwarm.level / 2);
            const area = thornySwarm.baseArea * this.player.areaMult * (1 + (thornySwarm.level-1)*0.1);
            for(let i=0; i<count; i++) {
                const angle = (Math.PI * 2 / count) * i + this.time * 4;
                const px = this.player.x + Math.cos(angle) * (80 * area);
                const py = this.player.y + Math.sin(angle) * (80 * area);
                this.ctx.fillStyle = '#228B22';
                this.ctx.beginPath(); this.ctx.arc(px, py, 8, 0, Math.PI*2); this.ctx.fill();
                this.ctx.fillStyle = '#8B4513';
                this.ctx.beginPath(); this.ctx.arc(px, py, 4, 0, Math.PI*2); this.ctx.fill();
            }
        }

        this.particles.forEach(p => {
            this.ctx.fillStyle = p.color;
            this.ctx.globalAlpha = p.life * 2;
            this.ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
            this.ctx.globalAlpha = 1.0;
        });

        this.enemies.forEach(e => {
            this.ctx.fillStyle = e.color;
            this.ctx.beginPath(); this.ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2); this.ctx.fill();
            if (e.hp < e.maxHp) {
                this.ctx.fillStyle = '#ff0000'; this.ctx.fillRect(e.x - 10, e.y - e.radius - 8, 20, 4);
                this.ctx.fillStyle = '#00ff00'; this.ctx.fillRect(e.x - 10, e.y - e.radius - 8, 20 * (e.hp / e.maxHp), 4);
            }
        });

        this.ctx.fillStyle = this.player.color;
        this.ctx.beginPath(); this.ctx.arc(this.player.x, this.player.y, this.player.radius, 0, Math.PI * 2); this.ctx.fill();
        this.ctx.fillStyle = 'rgba(173, 216, 230, 0.5)';
        this.ctx.beginPath(); this.ctx.arc(this.player.x, this.player.y - 4, this.player.radius - 2, 0, Math.PI * 2); this.ctx.fill();

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