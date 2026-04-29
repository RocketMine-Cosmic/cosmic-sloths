// Enemy update + AI logic extracted from GameEngine.
// Handles death/drops, custom enemy mechanics, movement, attacks, and boss abilities.
import { SFXManager } from './SFXManager';
import { SaveManager } from './SaveManager';
import { updateBossAbilities } from './BossSystem';

export function updateEnemies(engine, dt) {
    for (let i = engine.enemies.length - 1; i >= 0; i--) {
        let e = engine.enemies[i];
        if (e.hp <= 0) {
            SFXManager.playEnemyDeath();
            engine.kills++;
            if (e.isBoss) engine.bossesKilled++;
            else if (e.isElite) engine.elitesKilled++;
            engine.enemyKills[e.id] = (engine.enemyKills[e.id] || 0) + 1;
            // Credit the kill to whichever weapon dealt the killing blow.
            if (e._lastWeaponId) {
                engine.weaponKills[e._lastWeaponId] = (engine.weaponKills[e._lastWeaponId] || 0) + 1;
            }
            if (engine.save) {
                engine.save.enemyKills = engine.enemyKills;
                SaveManager.save(engine.save);
            }

            if (engine.player.charAugments?.includes('dat_drain')) {
                engine.player.drainCount = (engine.player.drainCount || 0) + 1;
                if (engine.player.drainCount >= 10) {
                    engine.player.hp = Math.min(engine.player.maxHp, engine.player.hp + engine.player.maxHp * 0.01);
                    engine.callbacks.onHpChange(engine.player.hp, engine.player.maxHp);
                    engine.addParticle(engine.player.x, engine.player.y, '#8A2BE2', 5, 'glow');
                    engine.player.drainCount = 0;
                }
            }
            if (engine.player.charAugments?.includes('code_virus')) {
                engine.enemies.forEach(other => {
                    if (other !== e && Math.hypot(other.x - e.x, other.y - e.y) < 100) {
                        other.hacked = true;
                        other.color = '#39FF14';
                    }
                });
            }

            if (engine.characterId === 'novabyte' && Math.random() < 0.10 * (engine.masteryAbilityBoost?.chainExplosionMult || 1.0) && !e.isBoss) {
                engine.particleManager.createExplosion(e.x, e.y, '#FF007F', 1.5 * engine.player.areaMult, 'default');
                engine.enemies.forEach(other => {
                    if (other !== e && Math.hypot(other.x - e.x, other.y - e.y) < 100 * engine.player.areaMult) {
                        engine.damageEnemy(other, 20 * engine.player.damageMult);
                    }
                });
            }

            if (engine.characterId === 'pandypaws' && Math.random() < 0.05 * (engine.masteryAbilityBoost?.scrapDropMult || 1.0) && !e.isBoss) {
                engine.pickups.push({ x: e.x + Math.random()*20-10, y: e.y + Math.random()*20-10, type: 'scrap', color: '#aaaaaa', icon: '⚙️' });
            }

            let xpValue = e.xp;
            if (e.isBoss && engine.bossModifiers.hide) {
                xpValue *= 1.5;
            }

            const progress = engine.arena?.duration === Infinity ? engine.time / 300 : Math.min(1, engine.time / (engine.arena?.duration || 300));
            xpValue *= (1.0 + Math.min(1.0, progress * 1.5));

            engine.pickups.push({ x: e.x, y: e.y, type: 'xp', value: xpValue, color: '#00ffcc' });

            engine.particleManager.createExplosion(e.x, e.y, e.color, e.isBoss ? 2 : 0.6, e.id);
            engine.shake(e.isBoss ? 0.5 : 0.05);

            if (engine.killEffect !== 'none') {
                engine.particleManager.createKillEffect(e.x, e.y, engine.killEffect);
            }

            if (e.isBoss) {
                const fragmentReward = 1 + (engine.bossModifiers.frenzy ? 1 : 0);
                // Auto-credit fragments directly to the save instead of dropping a pickup the
                // player might miss (especially in endless mode where the boss can die far away,
                // or when quitting/dying during the post-boss grace window).
                if (engine.callbacks.onFragmentFound) {
                    const nftRelicMult = engine.save?.nftRelicMultiplier || 1.0;
                    const finalFrags = (nftRelicMult > 1.0 && Math.random() < (nftRelicMult - 1.0))
                        ? fragmentReward + 1
                        : fragmentReward;
                    engine.callbacks.onFragmentFound(finalFrags);
                    engine.addDamageText(e.x, e.y - 40, `+${finalFrags} Relic Fragment!`, '#a855f7');
                    engine.addParticle(e.x, e.y, '#a855f7', 20, 'glow', 2);
                }

                if (engine.player.charAugments?.includes('nova_nuke')) {
                    engine.pickups.push({ x: e.x - 20, y: e.y + 20, type: 'nuke', color: '#ff0000', icon: '☢️' });
                }

                let extraGold = 1000;
                if (engine.bossModifiers.fury) extraGold += 500;
                if (engine.bossModifiers.unstoppable) extraGold += 1000;
                if (engine.bossModifiers.regen) extraGold += 800;

                if (extraGold > 0) {
                    engine.pickups.push({ x: e.x + 10, y: e.y + 10, type: 'gold', value: extraGold, color: '#ffd700' });
                }

                engine.addDamageText(e.x, e.y - 20, `BOSS DEFEATED!`, '#ffff00');
                engine.isBossActive = false;

                // Clear any in-flight enemy projectiles + the boss's own telegraph
                // warnings so attacks don't continue after death.
                if (engine.enemyProjectiles) engine.enemyProjectiles.length = 0;
                e._bombWarning = null;
                e._novaWarning = null;
                e._meteorWarning = null;
                e.chargeDash = null;
                if (engine.arena.duration === Infinity) {
                    engine.postBossGraceUntil = engine.time + 5;
                    engine.addDamageText(engine.player.x, engine.player.y - 80, `5s — COLLECT DROPS!`, '#22d3ee');
                }
            } else {
                const isEndless = engine.arena.duration === Infinity;
                if (!isEndless) {
                    const baseGoldChance = 0.35;
                    if (Math.random() < baseGoldChance + (engine.player.luck * 0.02)) {
                        const maxGoldValue = 35;
                        const goldValue = Math.min(maxGoldValue, 2 + Math.floor(engine.time / 90) * 1);
                        const goldMultiplier = e.isElite ? (e.eliteGoldBonus || 1.5) : 1;
                        const goldCount = e.isElite ? 1 : 1;
                        for (let gi = 0; gi < goldCount; gi++) {
                            engine.pickups.push({ x: e.x + Math.random()*20-10, y: e.y + Math.random()*20-10, type: 'gold', value: goldValue * goldMultiplier, color: '#ffd700' });
                        }
                    }
                    if (engine.player.charAugments?.includes('code_hack') && Math.random() < 0.05) {
                        engine.pickups.push({ x: e.x, y: e.y, type: 'gold', value: 10, color: '#ffd700' });
                    }
                } else if (engine.characterId === 'synthbeats' && Math.random() < 0.10) {
                    // Endless: regular enemies don't drop gold for anyone EXCEPT SynthBeats —
                    // her bribe-death mechanic is gold-gated, so the kit needs a self-funding
                    // trickle to remain viable in endless. ~10% drop rate of 5 gold = enough
                    // to fund roughly one bribe per ~50 kills.
                    engine.pickups.push({ x: e.x + Math.random()*20-10, y: e.y + Math.random()*20-10, type: 'gold', value: 5, color: '#ffd700' });
                }
                if (Math.random() < 0.01 + (engine.player.luck * 0.001)) {
                    const pickupTypes = [
                        { type: 'nuke', color: '#ff0000', icon: '☢️' },
                        { type: 'magnet_power', color: '#0000ff', icon: '🧲' },
                        { type: 'shield_power', color: '#ffff00', icon: '🛡️' }
                    ];
                    const pt = pickupTypes[Math.floor(Math.random() * pickupTypes.length)];
                    engine.pickups.push({ x: e.x + Math.random()*20-10, y: e.y + Math.random()*20-10, type: pt.type, color: pt.color, icon: pt.icon });
                }
            }

            engine.enemyPool.push(e);
            engine.enemies[i] = engine.enemies[engine.enemies.length - 1];
            engine.enemies.pop();
            continue;
        }

        const dx = engine.player.x - e.x;
        const dy = engine.player.y - e.y;
        const dist = Math.hypot(dx, dy);

        // --- Custom Enemy Mechanics ---
        if (e.hacked) {
            let nearest = null;
            let minDist = 400;
            engine.enemies.forEach(other => {
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
                        engine.damageEnemy(nearest, e.damage);
                        e.hp -= nearest.damage;
                        e.attackTimer = 1.0;
                    }
                }
            } else {
                const pdx = engine.player.x - e.x;
                const pdy = engine.player.y - e.y;
                const pdist = Math.hypot(pdx, pdy);
                const currentSpeed = e.speed * (e.speedMult || 1) * 60 * dt;
                if (pdist > 100) {
                    e.x += (pdx / pdist) * currentSpeed;
                    e.y += (pdy / pdist) * currentSpeed;
                }
            }
            if (e.attackTimer > 0) e.attackTimer -= dt;
            e.hp -= e.maxHp * 0.05 * dt;
            continue;
        }

        if (e.isWorldBoss) {
            e.damage += dt * 15;
            e.speedMult = (e.speedMult || 1) + (dt * 0.05);
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
                    const cellEnemies = engine.spatialHash?.get(`${x},${y}`);
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
            if (dist < engine.player.radius + e.radius && !e.latched) {
                e.latched = true;
            }
            if (e.latched) {
                e.x = engine.player.x;
                e.y = engine.player.y;
                e.radius += dt * 2;
                if (engine.frameCount % 30 === 0) {
                    engine.takeDamage(2 + engine.player.armor, e.name || 'Black Hole Tick');
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
                engine.player.x -= (dx / dist) * 50 * dt;
                engine.player.y -= (dy / dist) * 50 * dt;
            }
        }
        if (e.id === 'boss_cosmic_hydra') {
            if (!e.heads) e.heads = 3;
            if (e.hp < e.maxHp * 0.7 && e.heads === 3) e.heads = 4;
            if (e.hp < e.maxHp * 0.4 && e.heads === 4) e.heads = 5;
            if (e.hp < e.maxHp * 0.1 && e.heads === 5) e.heads = 6;
        }

        let targetX = engine.player.x;
        let targetY = engine.player.y;
        let isTargetingDecoy = false;
        let activeDecoy = null;

        if (engine.characterId === 'holodrift' && engine.characterMechanics?.decoys?.length > 0 && !e.isBoss) {
            let nearestDecoy = null;
            let minDecoyDist = 600;
            engine.characterMechanics.decoys.forEach(d => {
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
            if (e.slowTimer > 0 && !(e.isBoss && engine.bossModifiers.unstoppable)) {
                currentSpeed *= 0.5;
            }
            currentSpeed *= engine.envModifiers.enemySpeed * (engine.dynamicDifficulty?.speedMult || 1.0);
            e.x += (targetDx / targetDist) * currentSpeed * 60 * dt;
            e.y += (targetDy / targetDist) * currentSpeed * 60 * dt;
        }
        if (e.slowTimer > 0) e.slowTimer -= dt;

        if (engine.characterId === 'dataphantom' && dist < 150 && !e.burrowed && !e.dataLeeched) {
            e.dataLeeched = true;
            e.speedMult = (e.speedMult || 1) * 0.7;
            engine.player.phantomBoostTimer = engine.masteryAbilityBoost?.phantomBoostDuration || 2.0;
            engine.addParticle(e.x, e.y, '#98FF98', 10, 'spark');
            engine.addParticle(e.x, e.y, '#98FF98', 5, 'implode', 1.5, { targetX: engine.player.x, targetY: engine.player.y });
            engine.addDamageText(e.x, e.y - 20, "LEECHED", '#98FF98');
        }

        if (isTargetingDecoy) {
            if (targetDist < 15 + e.radius && !e.burrowed) {
                if (!e.attackTimer || e.attackTimer <= 0) {
                    activeDecoy.hp -= e.damage;
                    e.attackTimer = 1.0;
                }
            }
        } else {
            if (dist < engine.player.radius + e.radius && !e.burrowed) {
                if (!e.attackTimer || e.attackTimer <= 0) {
                    engine.takeDamage(e.damage, e.name || 'Enemy');
                    e.attackTimer = 1.0;
                }
            }
        }
        if (e.attackTimer > 0) e.attackTimer -= dt;

        if (e.isBoss && engine.bossModifiers.regen && engine.frameCount % 60 === 0) {
            if (e.hp < e.maxHp) {
                const healAmount = e.maxHp * 0.01;
                e.hp = Math.min(e.maxHp, e.hp + healAmount);
                engine.addParticle(e.x, e.y, '#00ff00', 5, 'spark', 1);
                engine.addDamageText(e.x, e.y - 20, `+${Math.floor(healAmount)}`, '#00ff00');
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
                    engine.enemyProjectiles.push({
                        x: e.x, y: e.y,
                        vx: Math.cos(angle) * 200,
                        vy: Math.sin(angle) * 200,
                        radius: 6,
                        damage: e.damage * 0.5,
                        life: 3,
                        color: e.color,
                        ownerName: e.name
                    });
                }
            }

            if (e.isBoss) {
                const beforeLen = engine.enemyProjectiles.length;
                const bossTakeDamage = (amt) => engine.takeDamage(amt, e.name || 'Boss');
                updateBossAbilities(e, dt, engine.player, engine.enemyProjectiles, engine.addParticle.bind(engine), engine.addDamageText.bind(engine), bossTakeDamage, engine.enemies, engine.frameCount, engine.arena.id, engine.bossModifiers);
                // Tag any newly-spawned boss projectiles with the boss's name for kill credit.
                for (let pi = beforeLen; pi < engine.enemyProjectiles.length; pi++) {
                    const proj = engine.enemyProjectiles[pi];
                    if (proj && !proj.ownerName) proj.ownerName = e.name;
                }
            }
        }
    }
}