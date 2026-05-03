// Projectile update logic extracted from GameEngine.
// Handles player projectile movement, AoE, collisions, chains, and enemy projectiles.

// Swept circle-vs-point hit test: returns true if the line segment from (px0,py0)
// to (px,py) passes within `r` of point (ex,ey). Handles fast projectiles + moving
// bosses where simple point-in-circle would miss between frames.
// Uses squared distances throughout to skip the sqrt — same result, ~3× faster
// in this hot path.
function sweptHit(px0, py0, px, py, ex, ey, r) {
    const r2 = r * r;
    const dx = px - px0;
    const dy = py - py0;
    const lenSq = dx * dx + dy * dy;
    if (lenSq < 0.0001) {
        const ddx = px - ex, ddy = py - ey;
        return ddx * ddx + ddy * ddy < r2;
    }
    // Project enemy onto segment, clamp t to [0,1].
    let t = ((ex - px0) * dx + (ey - py0) * dy) / lenSq;
    if (t < 0) t = 0;
    else if (t > 1) t = 1;
    const cx = px0 + dx * t;
    const cy = py0 + dy * t;
    const ddx = ex - cx, ddy = ey - cy;
    return ddx * ddx + ddy * ddy < r2;
}

export function updateProjectiles(engine, dt) {
    engine.projectiles = engine.projectiles.filter(p => {
        if (p.dead) return false;
        // Capture pre-move position so collision checks can sweep the full path
        // travelled this frame. Without this, a 500px/s projectile at 50ms dt
        // (mobile lag spike or fleeing-boss frame) jumps 25px and can teleport
        // PAST a boss that's also moving — players see the visual hit but the
        // single-point collision check missed entirely.
        const px0 = p.x;
        const py0 = p.y;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
        if (p.rotSpeed) p.rotation = (p.rotation || 0) + p.rotSpeed * dt;

        // Trails
        if (!p.isAoe && engine.frameCount % 2 === 0) {
            if (p.type === 'dual_laser') engine.addParticle(p.x, p.y, p.color, 1, 'spark', 0.5);
            else if (p.type === 'lightning') engine.addParticle(p.x + (Math.random()-0.5)*10, p.y + (Math.random()-0.5)*10, p.color, 1, 'spark', 0.8);
            else if (p.type === 'glitch_slash') engine.addParticle(p.x, p.y, p.color, 2, 'spark', 1.0);
            else if (p.type === 'repair_beam') engine.addParticle(p.x, p.y, '#ffffff', 1, 'spark', 0.5);
            else if (p.type === 'missile') engine.addParticle(p.x, p.y, '#ff4500', 3, 'spark', 1.0);
            else if (p.type === 'data_pulse') engine.addParticle(p.x, p.y, p.color, 1, 'spark', 0.5);
            else if (p.type === 'phantom_orb') engine.addParticle(p.x, p.y, p.color, 2, 'spark', 0.8);
            else if (p.type === 'railgun') engine.addParticle(p.x, p.y, '#ffffff', 1, 'spark', 1.2);
            else if (p.type === 'sonic_wave') engine.addParticle(p.x, p.y, p.color, 1, 'spark', 0.5);
            else if (p.type === 'supernova_beam') {
                engine.addParticle(p.x, p.y, '#ffffff', 2, 'spark', 1.5);
                engine.addParticle(p.x, p.y, p.color, 2, 'spark', 1.0);
            }
            else engine.addParticle(p.x, p.y, p.color, 1, 'spark', 0.5);
        }

        if (!p.isAoe) {
            if (p.pierce > 0) {
                const cellSize = 100;
                const cx = Math.floor(p.x / cellSize);
                const cy = Math.floor(p.y / cellSize);
                // Bosses have huge radii (110-160px) that span multiple spatial-hash cells.
                // The 3×3 cell window below can miss them when the boss center sits 2+ cells
                // away from the projectile but the boss radius still overlaps. Check all bosses
                // explicitly so projectiles never "phase through" them — produced the
                // "DPS stalls 20-30s while boss HP doesn't move" symptom.
                // Use the cached per-frame active-boss list to avoid re-filtering
                // engine.enemies for every single projectile (perf hot path).
                const bosses = engine._activeBosses || engine.enemies.filter(e => e.isBoss && e.hp > 0);
                const candidates = [];
                for (let bi = 0; bi < bosses.length; bi++) candidates.push(bosses[bi]);
                for (let x = cx - 1; x <= cx + 1; x++) {
                    for (let y = cy - 1; y <= cy + 1; y++) {
                        const cellEnemies = engine.spatialHash?.get(`${x},${y}`);
                        if (cellEnemies) {
                            cellEnemies.forEach(e => {
                                if (!e.isBoss) candidates.push(e);
                            });
                        }
                    }
                }
                {
                    {
                        {
                            candidates.forEach(e => {
                                if (p.pierce <= 0) return;
                                const hitR = e.radius + (p.radius || 5);
                                // Cheap AABB reject using the swept bounding box (old → new pos).
                                const minPx = Math.min(px0, p.x), maxPx = Math.max(px0, p.x);
                                const minPy = Math.min(py0, p.y), maxPy = Math.max(py0, p.y);
                                if (e.x < minPx - hitR || e.x > maxPx + hitR) return;
                                if (e.y < minPy - hitR || e.y > maxPy + hitR) return;
                                if (sweptHit(px0, py0, p.x, p.y, e.x, e.y, hitR)) {
                                    if (e.id === 'boss_supernova') {
                                        p.pierce = 0;
                                        p.dead = true;
                                        const angle = Math.atan2(engine.player.y - e.y, engine.player.x - e.x);
                                        engine.enemyProjectiles.push({
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
                                        engine.damageEnemy(e, p.damage, p);

                                        // Impact Effects
                                        if (!e.isWorldBoss || Math.random() < 0.1) {
                                            engine.shake(0.1);
                                            if (Math.random() < 0.05) {
                                                engine.hitStopTimer = 0.01;
                                            }
                                            engine.particleManager.createHitEffect(e.x, e.y, p.color, Math.atan2(p.vy, p.vx), 1.5);
                                        }

                                        if (p.type === 'dual_laser') engine.addParticle(e.x, e.y, p.color, 10, 'spark', 2);
                                        if (p.type === 'stomp') engine.addParticle(e.x, e.y, '#888888', 10, 'spark', 2);
                                        if (p.type === 'glitch_slash') engine.addParticle(e.x, e.y, p.color, 8, 'spark', 2);
                                        if (p.type === 'missile') engine.particleManager.createExplosion(e.x, e.y, '#ff4500', 1.0, 'drone');
                                        if (p.type === 'data_pulse') engine.addParticle(e.x, e.y, p.color, 10, 'spark', 2);
                                        if (p.type === 'phantom_orb') engine.addParticle(e.x, e.y, p.color, 15, 'spark', 1.5);
                                        if (p.type === 'railgun') engine.addParticle(e.x, e.y, '#ffffff', 20, 'spark', 3);
                                        if (p.type === 'sonic_wave') engine.addParticle(e.x, e.y, p.color, 10, 'spark', 2);

                                        p.pierce--;
                                        if (p.pierce <= 0) p.dead = true;

                                        if (p.chainCount > 0) {
                                            p.chainCount--;
                                            let chainTarget = null;
                                            let minChainDist = p.type === 'buzzsaw' ? 600 : 200;
                                            engine.enemies.forEach(ce => {
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
                                                engine.addParticle(e.x, e.y, p.color, 5, 'spark', 1.5);
                                                if (p.dead) {
                                                    p.dead = false;
                                                    p.pierce = 1;
                                                }
                                            }
                                        }

                                        if (p.weaponId === 'supernovaBeam') {
                                            engine.particleManager.createExplosion(e.x, e.y, '#ffaa00', 1.5);
                                            engine.enemies.forEach(ce => {
                                                if (ce === e || Math.abs(ce.x - e.x) > 60 || Math.abs(ce.y - e.y) > 60) return;
                                                if (Math.hypot(ce.x - e.x, ce.y - e.y) < 60) {
                                                    engine.damageEnemy(ce, p.damage * 0.3, p);
                                                }
                                            });
                                        }

                                        if (p.isMastered && p.weaponId === 'napBeam') {
                                            let nearest = null;
                                            let minDist = 150;
                                            engine.enemies.forEach(ce => {
                                                if (ce !== e && !p.hitList.has(ce)) {
                                                    const d = Math.hypot(ce.x - e.x, ce.y - e.y);
                                                    if (d < minDist) { minDist = d; nearest = ce; }
                                                }
                                            });
                                            if (nearest) {
                                                engine.damageEnemy(nearest, p.damage * 0.5, p);
                                                p.hitList.add(nearest);
                                                engine.addParticle(nearest.x, nearest.y, '#4169E1', 5);
                                                const distToNearest = Math.hypot(nearest.x - e.x, nearest.y - e.y);
                                                const chainAngle = Math.atan2(nearest.y - e.y, nearest.x - e.x);
                                                engine.projectiles.push({
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
                const seen = new Set();
                // Always include active bosses — their large radii can miss the cell window.
                // Use the cached per-frame active-boss list to skip the full enemy scan.
                const bosses = engine._activeBosses || engine.enemies;
                for (let bi = 0; bi < bosses.length; bi++) {
                    const e = bosses[bi];
                    if (e.isBoss && e.hp > 0 && !seen.has(e)) {
                        seen.add(e);
                        callback(e);
                    }
                }
                for (let x = minX; x <= maxX; x++) {
                    for (let y = minY; y <= maxY; y++) {
                        const cellEnemies = engine.spatialHash?.get(`${x},${y}`);
                        if (cellEnemies) cellEnemies.forEach(e => {
                            if (!seen.has(e)) {
                                seen.add(e);
                                callback(e);
                            }
                        });
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
                            engine.damageEnemy(e, p.damage, p);
                            engine.addParticle(e.x, e.y, p.color, 5);
                        }
                    }
                });
            } else if (p.pushback) {
                p.x = engine.player.x;
                p.y = engine.player.y;
                checkAoe(e => {
                    if (Math.abs(e.x - p.x) > p.radius + e.radius || Math.abs(e.y - p.y) > p.radius + e.radius) return;
                    const dist = Math.hypot(e.x - p.x, e.y - p.y);
                    if (dist < p.radius) {
                        if (engine.frameCount % 15 === 0) {
                            engine.damageEnemy(e, p.damage, p);
                            if (p.burn) {
                                engine.addParticle(e.x, e.y, '#ff4500', 3);
                            }
                        }
                        const pushResist = e.isWorldBoss ? 0 : (e.isBoss ? 0.05 : (e.isTank ? 0.2 : 1));
                        const isUnstoppable = e.isBoss && engine.bossModifiers.unstoppable;
                        if (!isUnstoppable && pushResist > 0) {
                            const angle = Math.atan2(e.y - p.y, e.x - p.x);
                            e.x += Math.cos(angle) * p.pushback * pushResist * dt;
                            e.y += Math.sin(angle) * p.pushback * pushResist * dt;
                        }
                    }
                });

                if (p.isMastered && p.weaponId === 'shieldBubble' && engine.frameCount % 30 === 0) {
                    const inRange = [];
                    checkAoe(e => {
                        if (Math.hypot(e.x - p.x, e.y - p.y) < p.radius * 2) inRange.push(e);
                    }, p.radius);
                    if (inRange.length > 0) {
                        const target = inRange[Math.floor(Math.random() * inRange.length)];
                        const angle = Math.atan2(target.y - p.y, target.x - p.x);
                        engine.projectiles.push({
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
                if (engine.frameCount % 15 === 0) {
                    checkAoe(e => {
                        if (Math.abs(e.x - p.x) > p.radius + e.radius || Math.abs(e.y - p.y) > p.radius + e.radius) return;
                        if (Math.hypot(e.x - p.x, e.y - p.y) < p.radius) {
                            engine.damageEnemy(e, p.damage, p);
                            engine.addParticle(e.x, e.y, p.weaponId === 'napalm' ? '#ff4500' : p.color, 2);
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

    if (engine.enemyProjectiles) {
        engine.enemyProjectiles = engine.enemyProjectiles.filter(p => {
            if (p.dead) return false;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;

            if (Math.hypot(engine.player.x - p.x, engine.player.y - p.y) < engine.player.radius + p.radius) {
                engine.takeDamage(p.damage, p.ownerName || 'Enemy Projectile');
                p.dead = true;
            }
            return p.life > 0;
        });
    }
}