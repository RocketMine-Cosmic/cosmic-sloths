import React, { useEffect, useRef } from 'react';
import { WEAPONS } from '../../game/Constants';
import { fireWeaponLogic } from '../../game/WeaponSystem';
import { drawProjectiles } from '../../game/ProjectileRenderer';
import { ParticleManager } from '../../game/ParticleManager';

export default function WeaponSimulation({ weaponId, isMastered }) {
    const canvasRef = useRef(null);
    const pixiCanvasRef = useRef(null);
    const stateRef = useRef({ animId: null });

    useEffect(() => {
        const canvas = canvasRef.current;
        const pixiCanvas = pixiCanvasRef.current;
        if (!canvas || !pixiCanvas) return;
        const ctx = canvas.getContext('2d');
        const W = canvas.width;
        const H = canvas.height;

        let time = 0;
        let frameCount = 0;
        let lastFireTime = 0;

        const dummies = [
            { x: W * 0.2, y: H * 0.3, radius: 15, hp: 100, maxHp: 100, color: '#ff4444', isBoss: false },
            { x: W * 0.8, y: H * 0.7, radius: 15, hp: 100, maxHp: 100, color: '#ff4444', isBoss: false },
            { x: W * 0.8, y: H * 0.3, radius: 15, hp: 100, maxHp: 100, color: '#ff4444', isBoss: false },
            { x: W * 0.2, y: H * 0.7, radius: 15, hp: 100, maxHp: 100, color: '#ff4444', isBoss: false }
        ];

        const particleManager = new ParticleManager(pixiCanvas);

        const mockEngine = {
            save: {
                permanentWeaponUpgrades: isMastered ? {
                    [weaponId]: { damage: 5, area: 5, cooldown: 5 }
                } : {}
            },
            player: {
                x: W / 2, y: H / 2, radius: 16, color: '#00D4FF',
                damageMult: 1, areaMult: 1, projSpeedMult: 1,
                speedMult: 1, hp: 100, maxHp: 100,
                weapons: [{ id: weaponId, level: 1 }]
            },
            enemies: dummies,
            projectiles: [],
            particleManager: particleManager,
            time: 0,
            frameCount: 0,
            characterId: 'neobyte',
            addParticle: (x, y, color, count, type = 'spark', sizeMult = 1) => {
                particleManager.addParticle(x, y, color, count, type, sizeMult);
            },
            damageEnemy: (e, dmg) => {
                e.hp -= dmg;
                particleManager.createHitEffect(e.x, e.y, '#ffffff', 0, 1);
            },
            callbacks: { onHpChange: () => {} }
        };

        const weaponData = WEAPONS[weaponId];
        const weapon = { ...weaponData, level: 1 };
        
        // Cooldown calculation
        const getWeaponUpgrade = (wId, stat) => mockEngine.save.permanentWeaponUpgrades?.[wId]?.[stat] || 0;
        const cdUpgradeLevel = getWeaponUpgrade(weaponId, 'cooldown');
        const cdMultiplier = 1 - (cdUpgradeLevel * 0.05);
        const actualCooldown = (weapon.baseCooldown / 60) * cdMultiplier;

        let last = performance.now();
        let isVisible = false;

        const observer = new IntersectionObserver((entries) => {
            isVisible = entries[0].isIntersecting;
            if (isVisible && !stateRef.current.animId) {
                last = performance.now();
                stateRef.current.animId = requestAnimationFrame(loop);
            }
        });
        observer.observe(canvas);

        const loop = (now) => {
            if (!isVisible) {
                stateRef.current.animId = null;
                return;
            }
            const dt = Math.min((now - last) / 1000, 0.05);
            last = now;
            time += dt;
            frameCount++;

            mockEngine.time = time;
            mockEngine.frameCount = frameCount;

            // Move dummies slowly
            dummies.forEach((d, i) => {
                d.x += Math.sin(time + i) * 0.5;
                d.y += Math.cos(time + i) * 0.5;
                if (d.hp <= 0) {
                    d.hp = d.maxHp; // respawn
                    d.x = W/2 + (Math.random() - 0.5) * W * 0.8;
                    d.y = H/2 + (Math.random() - 0.5) * H * 0.8;
                }
            });

            // Fire weapon
            if (time - lastFireTime >= actualCooldown) {
                lastFireTime = time;
                fireWeaponLogic(mockEngine, weapon);
            }

            // Simple projectile update
            mockEngine.projectiles = mockEngine.projectiles.filter(p => {
                if (p.dead) return false;
                p.x += (p.vx || 0) * dt;
                p.y += (p.vy || 0) * dt;
                p.life -= dt;
                
                // Very basic collision
                if (!p.isAoe && !p.pulse) {
                    dummies.forEach(e => {
                        if (p.pierce > 0 && Math.hypot(e.x - p.x, e.y - p.y) < e.radius + (p.radius || 5)) {
                            if (!p.hitList) p.hitList = new Set();
                            if (!p.hitList.has(e)) {
                                p.hitList.add(e);
                                mockEngine.damageEnemy(e, p.damage);
                                p.pierce--;
                                if (p.pierce <= 0) p.dead = true;
                                
                                if (p.isMastered && p.weaponId === 'napBeam') {
                                    let nearest = null;
                                    let minDist = 150;
                                    dummies.forEach(ce => {
                                        if (ce !== e && !p.hitList.has(ce)) {
                                            const d = Math.hypot(ce.x - e.x, ce.y - e.y);
                                            if (d < minDist) { minDist = d; nearest = ce; }
                                        }
                                    });
                                    if (nearest) {
                                        mockEngine.damageEnemy(nearest, p.damage * 0.5);
                                        p.hitList.add(nearest);
                                        mockEngine.addParticle(nearest.x, nearest.y, '#4169E1', 5);
                                        const distToNearest = Math.hypot(nearest.x - e.x, nearest.y - e.y);
                                        const chainAngle = Math.atan2(nearest.y - e.y, nearest.x - e.x);
                                        mockEngine.projectiles.push({
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
                } else if (p.pulse) {
                    p.radius += 500 * dt;
                } else if (p.pushback) {
                    p.x = mockEngine.player.x;
                    p.y = mockEngine.player.y;
                }

                return p.life > 0 && !p.dead;
            });

            particleManager.update(dt);

            // --- Draw ---
            ctx.fillStyle = '#0d1117';
            ctx.fillRect(0, 0, W, H);

            // Grid
            ctx.strokeStyle = 'rgba(255,255,255,0.04)';
            ctx.lineWidth = 1;
            for (let gx = 0; gx < W; gx += 30) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke(); }
            for (let gy = 0; gy < H; gy += 30) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke(); }

            // Dummies
            dummies.forEach(d => {
                ctx.strokeStyle = '#ff4444';
                ctx.lineWidth = 2;
                ctx.fillStyle = 'rgba(255,50,50,0.15)';
                ctx.beginPath(); ctx.arc(d.x, d.y, d.radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            });

            // Player
            ctx.fillStyle = mockEngine.player.color;
            ctx.beginPath(); ctx.arc(mockEngine.player.x, mockEngine.player.y, mockEngine.player.radius, 0, Math.PI * 2); ctx.fill();

            // Sloth Swarm Preview
            if (weaponId === 'slothSwarm') {
                const count = 1;
                const area = 1;
                const speedMult = isMastered ? 6 : 3;
                const angle = time * speedMult;
                const px = mockEngine.player.x + Math.cos(angle) * 60;
                const py = mockEngine.player.y + Math.sin(angle) * 60;
                
                ctx.save();
                ctx.translate(px, py);
                ctx.rotate(angle + Math.PI/2);
                ctx.globalCompositeOperation = 'lighter';
                ctx.fillStyle = isMastered ? '#FF0000' : '#8B4513';
                ctx.globalAlpha = 0.2;
                ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.fill();
                ctx.globalCompositeOperation = 'source-over';
                ctx.globalAlpha = 1.0;
                
                ctx.fillStyle = isMastered ? '#FF0000' : '#8B4513';
                ctx.beginPath(); ctx.ellipse(0, 0, 8, 6, 0, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.arc(-6, -4, 3, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.arc(6, -4, 3, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = '#d2b48c';
                ctx.beginPath(); ctx.ellipse(0, 1, 5, 4, 0, 0, Math.PI*2); ctx.fill();
                ctx.restore();
            }

            // Projectiles & Particles
            drawProjectiles(ctx, mockEngine.projectiles, particleManager, time, 0, 0, W, H);
            particleManager.draw(ctx, 0, 0, W, H);

            stateRef.current.animId = requestAnimationFrame(loop);
        };

        stateRef.current.animId = requestAnimationFrame(loop);
        return () => {
            observer.disconnect();
            if (stateRef.current.animId) {
                cancelAnimationFrame(stateRef.current.animId);
                stateRef.current.animId = null;
            }
            if (particleManager) {
                particleManager.destroy();
            }
        };
    }, [weaponId, isMastered]);

    return (
        <div className="relative w-full h-[200px] rounded-xl border border-slate-700 bg-slate-950 overflow-hidden">
            <canvas
                key={`2d-${weaponId}-${isMastered}`}
                ref={canvasRef}
                width={400}
                height={200}
                className="absolute inset-0 w-full h-full object-cover z-0"
            />
            <canvas
                key={`pixi-${weaponId}-${isMastered}`}
                ref={pixiCanvasRef}
                width={400}
                height={200}
                className="absolute inset-0 w-full h-full object-cover pointer-events-none z-10"
            />
        </div>
    );
}