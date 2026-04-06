import { ARENAS, ENEMIES } from './Constants';

// Arena index -> difficulty tier (0-9)
export function getArenaTier(arenaId) {
    const idx = ARENAS.findIndex(a => a.id === arenaId);
    return Math.max(0, idx);
}

// Pick a boss appropriate for the arena tier
export function selectBossForArena(arenaId) {
    const tier = getArenaTier(arenaId);
    const allBosses = ENEMIES.filter(e => e.isBoss);
    // Map arenas to specific bosses so higher arenas get harder bosses
    const bossOrder = [
        'boss_nebula_devourer',   // tier 0-1 (azure expanse)
        'boss_plasma_kraken',     // tier 2-3 (mystic cosmos / ethereal nebula)
        'boss_stellar_colossus',  // tier 4-5 (crimson void / solar storm)
        'boss_cosmic_wyrm',       // tier 6-7 (emerald galaxy / shattered core)
        'boss_supernova_empress', // tier 8 (abyssal vortex)
        'boss_nexus_annihilator', // tier 9-10 (turquoise drift / rainbow rift / endless)
    ];
    const bossIndex = Math.min(Math.floor(tier / 1.7), bossOrder.length - 1);
    const bossId = bossOrder[bossIndex];
    return allBosses.find(b => b.id === bossId) || allBosses[Math.floor(Math.random() * allBosses.length)];
}

// Called every frame for each boss — returns new enemy projectiles / side effects
export function updateBossAbilities(boss, dt, player, enemyProjectiles, addParticle, addDamageText, takeDamage, enemies, frameCount, arenaId, modifiers = {}) {
    const tier = getArenaTier(arenaId);
    const enraged = boss.hp < boss.maxHp * 0.4; // Enrage below 40% HP
    const bossId = boss.originalBossId || boss.id;

    // --- Shared: rotating bullet ring (all bosses, scaled by tier) ---
    if (!boss.skillTimer) boss.skillTimer = 0;
    boss.skillTimer -= dt;
    if (boss.skillTimer <= 0) {
        const baseCount = 6 + tier;
        const projCount = (enraged ? baseCount * 2 : baseCount) * (modifiers.bullet_hell ? 2 : 1);
        const offset = boss.skillPhase || 0;
        boss.skillPhase = (offset + Math.PI / projCount);
        boss.skillTimer = enraged ? 1.8 : 3.0;

        for (let i = 0; i < projCount; i++) {
            const angle = (Math.PI * 2 / projCount) * i + offset;
            const speed = 120 + tier * 15;
            enemyProjectiles.push({
                x: boss.x, y: boss.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                radius: 6,
                damage: boss.damage * 0.4,
                life: 3.5,
                color: boss.color
            });
        }
    }

    // --- Per-boss unique abilities ---

    if (bossId === 'boss_nebula_devourer') {
        // "Swirling energy tentacles" — spiral burst every 5s
        if (!boss.spiralTimer) boss.spiralTimer = 5;
        boss.spiralTimer -= dt;
        if (boss.spiralTimer <= 0) {
            boss.spiralTimer = enraged ? 2.5 : 4;
            const count = modifiers.bullet_hell ? 40 : 20;
            boss.spiralPhase = (boss.spiralPhase || 0) + 0.3;
            for (let i = 0; i < count; i++) {
                const angle = (Math.PI * 2 / count) * i + boss.spiralPhase;
                enemyProjectiles.push({
                    x: boss.x, y: boss.y, vx: Math.cos(angle) * 180, vy: Math.sin(angle) * 180,
                    radius: 8, damage: boss.damage * 0.3, life: 4, color: '#a855f7'
                });
            }
            addParticle(boss.x, boss.y, '#a855f7', 20, 'glow', 2);
            addDamageText(boss.x, boss.y - boss.radius - 20, 'TENTACLE SPIRAL!', '#a855f7');
        }

        // "Ravenous maw" — pulls player closer
        if (!boss.pullTimer) boss.pullTimer = 8;
        boss.pullTimer -= dt;
        if (boss.pullTimer <= 0) {
            boss.pullTimer = enraged ? 5 : 8;
            const dx = boss.x - player.x;
            const dy = boss.y - player.y;
            const dist = Math.hypot(dx, dy);
            if (dist < 600) {
                player.x += (dx / dist) * 70 * dt * 60;
                player.y += (dy / dist) * 70 * dt * 60;
                addParticle(boss.x, boss.y, '#a855f7', 30, 'glow', 3);
                addDamageText(boss.x, boss.y - boss.radius - 30, 'DEVOUR!', '#a855f7');
            }
        }
        
        // NEW: Void Bomb (Telegraphed Explosion)
        if (!boss.bombTimer) boss.bombTimer = 6;
        boss.bombTimer -= dt;
        if (boss.bombTimer <= 0) {
            boss.bombTimer = enraged ? 4 : 7;
            const tx = player.x, ty = player.y;
            boss._bombWarning = boss._bombWarning || [];
            boss._bombWarning.push({ x: tx, y: ty, timer: 2.0 });
            addDamageText(tx, ty - 40, '⚠ VOID BOMB!', '#581c87');
        }
        if (boss._bombWarning) {
            boss._bombWarning = boss._bombWarning.filter(w => {
                w.timer -= dt;
                addParticle(w.x, w.y, '#581c87', 4, 'glow', 2.0);
                if (w.timer <= 0) {
                    const dist = Math.hypot(player.x - w.x, player.y - w.y);
                    if (dist < 120) takeDamage(boss.damage * 1.5);
                    const count = modifiers.bullet_hell ? 20 : 12;
                    for (let i = 0; i < count; i++) {
                        const a = (Math.PI * 2 / count) * i;
                        enemyProjectiles.push({ x: w.x, y: w.y, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, radius: 15, damage: boss.damage * 0.8, life: 3, color: '#581c87' });
                    }
                    addParticle(w.x, w.y, '#581c87', 40, 'glow', 5);
                    return false;
                }
                return true;
            });
        }
    }

    if (bossId === 'boss_plasma_kraken') {
        // "Long glowing tentacles" — fires 4 aimed shots spread
        if (!boss.krakTimer) boss.krakTimer = 2.5;
        boss.krakTimer -= dt;
        if (boss.krakTimer <= 0) {
            boss.krakTimer = enraged ? 1.0 : 2.0;
            const baseAngle = Math.atan2(player.y - boss.y, player.x - boss.x);
            const spread = (enraged ? 5 : 3) * (modifiers.bullet_hell ? 2 : 1);
            for (let i = -spread; i <= spread; i += (enraged ? 1 : 2)) {
                const a = baseAngle + (i * Math.PI / 16);
                enemyProjectiles.push({
                    x: boss.x, y: boss.y, vx: Math.cos(a) * 260, vy: Math.sin(a) * 260,
                    radius: 12, damage: boss.damage * 0.6, life: 3, color: '#ef4444'
                });
            }
            addParticle(boss.x, boss.y, '#ef4444', 15, 'glow', 2);
        }

        // "Fiery core" — periodic explosion burst at player location
        if (!boss.novaTimer) boss.novaTimer = 8;
        boss.novaTimer -= dt;
        if (boss.novaTimer <= 0) {
            boss.novaTimer = enraged ? 5 : 8;
            const tx = player.x, ty = player.y;
            boss._novaWarning = boss._novaWarning || [];
            boss._novaWarning.push({ x: tx, y: ty, timer: 1.2 });
            addDamageText(tx, ty - 30, '⚠ PLASMA NOVA!', '#ef4444');
        }
        if (boss._novaWarning) {
            boss._novaWarning = boss._novaWarning.filter(w => {
                w.timer -= dt;
                addParticle(w.x, w.y, '#ef4444', 3, 'glow', 1.5);
                if (w.timer <= 0) {
                    const dist = Math.hypot(player.x - w.x, player.y - w.y);
                    if (dist < 100) takeDamage(boss.damage * 1.5);
                    const novaCount = modifiers.bullet_hell ? 30 : 16;
                    for (let i = 0; i < novaCount; i++) {
                        const a = (Math.PI * 2 / novaCount) * i;
                        enemyProjectiles.push({ x: w.x, y: w.y, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, radius: 8, damage: boss.damage * 0.5, life: 2.5, color: '#ff4500' });
                    }
                    addParticle(w.x, w.y, '#ff4500', 30, 'glow', 4);
                    return false;
                }
                return true;
            });
        }
        
        // NEW: Flame Trails
        if (!boss.trailTimer) boss.trailTimer = 0.1;
        boss.trailTimer -= dt;
        if (boss.trailTimer <= 0) {
            boss.trailTimer = 0.15;
            if (Math.random() < (enraged ? 0.6 : 0.3)) {
                enemyProjectiles.push({
                    x: boss.x + (Math.random() - 0.5) * boss.radius * 1.5, 
                    y: boss.y + (Math.random() - 0.5) * boss.radius * 1.5,
                    vx: 0, vy: 0, radius: 25, damage: boss.damage * 0.3, life: 2.5, color: 'rgba(239, 68, 68, 0.6)'
                });
                addParticle(boss.x, boss.y, '#ef4444', 3, 'spark', 1.5);
            }
        }
    }

    if (bossId === 'boss_stellar_colossus') {
        // "Rotating arms" — spinning laser arms
        if (!boss.armTimer) boss.armTimer = 3;
        boss.armTimer -= dt;
        if (boss.armTimer <= 0) {
            boss.armTimer = enraged ? 2.0 : 3;
            const arms = (enraged ? 8 : 5) * (modifiers.bullet_hell ? 2 : 1);
            for (let i = 0; i < arms; i++) {
                const a = (Math.PI * 2 / arms) * i + (boss.armPhase || 0);
                for (let j = 1; j <= 4; j++) {
                    enemyProjectiles.push({
                        x: boss.x, y: boss.y, vx: Math.cos(a) * 250 * j * 0.35, vy: Math.sin(a) * 250 * j * 0.35,
                        radius: 10, damage: boss.damage * 0.5, life: 3, color: '#f59e0b'
                    });
                }
            }
            boss.armPhase = ((boss.armPhase || 0) + Math.PI / 5) % (Math.PI * 2);
            addDamageText(boss.x, boss.y - boss.radius - 20, 'STELLAR ARMS!', '#f59e0b');
        }

        // "Blazing central eye" — screen-wide beam aimed at player
        if (!boss.eyeTimer) boss.eyeTimer = 10;
        boss.eyeTimer -= dt;
        if (boss.eyeTimer <= 0) {
            boss.eyeTimer = enraged ? 6 : 10;
            const angle = Math.atan2(player.y - boss.y, player.x - boss.x);
            const eyeCount = modifiers.bullet_hell ? 20 : 12;
            for (let i = 0; i < eyeCount; i++) {
                enemyProjectiles.push({
                    x: boss.x, y: boss.y, vx: Math.cos(angle) * (300 + i * 20), vy: Math.sin(angle) * (300 + i * 20),
                    radius: 15, damage: boss.damage * 0.9, life: 2.5, color: '#fbbf24'
                });
            }
            addParticle(boss.x, boss.y, '#fbbf24', 30, 'glow', 4);
            addDamageText(boss.x, boss.y - boss.radius - 30, '☀ SOLAR GAZE!', '#fbbf24');
        }
        
        // NEW: Meteor Strike
        if (!boss.meteorTimer) boss.meteorTimer = 5;
        boss.meteorTimer -= dt;
        if (boss.meteorTimer <= 0) {
            boss.meteorTimer = enraged ? 3 : 5;
            boss._meteorWarning = boss._meteorWarning || [];
            for(let i=0; i< (enraged ? 5 : 3); i++) {
                const tx = player.x + (Math.random() - 0.5) * 400;
                const ty = player.y + (Math.random() - 0.5) * 400;
                boss._meteorWarning.push({ x: tx, y: ty, timer: 1.5 + Math.random() * 0.5 });
                addParticle(tx, ty, '#f59e0b', 5, 'glow', 2);
            }
            addDamageText(boss.x, boss.y - boss.radius - 40, 'METEOR SHOWER!', '#f59e0b');
        }
        if (boss._meteorWarning) {
            boss._meteorWarning = boss._meteorWarning.filter(w => {
                w.timer -= dt;
                addParticle(w.x, w.y, '#f59e0b', 3, 'spark', 1.5);
                if (w.timer <= 0) {
                    const dist = Math.hypot(player.x - w.x, player.y - w.y);
                    if (dist < 90) takeDamage(boss.damage * 1.5);
                    for(let i=0; i<8; i++) {
                        const a = (Math.PI * 2 / 8) * i;
                        enemyProjectiles.push({ x: w.x, y: w.y, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, radius: 6, damage: boss.damage * 0.5, life: 1.5, color: '#fbbf24' });
                    }
                    addParticle(w.x, w.y, '#f59e0b', 20, 'glow', 3);
                    return false;
                }
                return true;
            });
        }
    }

    if (bossId === 'boss_cosmic_wyrm') {
        // "Serpentine dragon" — charge dash in player direction
        if (!boss.chargeTimer) boss.chargeTimer = 5;
        boss.chargeTimer -= dt;
        if (boss.chargeTimer <= 0) {
            boss.chargeTimer = enraged ? 3 : 5;
            const dx = player.x - boss.x;
            const dy = player.y - boss.y;
            const dist = Math.hypot(dx, dy);
            boss.chargeDash = { vx: (dx / dist) * 750, vy: (dy / dist) * 750, timer: 0.45 };
            addDamageText(boss.x, boss.y - boss.radius - 30, '🐉 WYRM CHARGE!', '#0ea5e9');
            addParticle(boss.x, boss.y, '#0ea5e9', 20, 'glow', 3);
        }
        if (boss.chargeDash) {
            boss.x += boss.chargeDash.vx * dt;
            boss.y += boss.chargeDash.vy * dt;
            boss.chargeDash.timer -= dt;
            addParticle(boss.x, boss.y, '#0ea5e9', 5, 'glow', 1.5);
            
            // NEW: Leave ice shards behind during dash
            if (Math.random() < 0.4) {
                 enemyProjectiles.push({
                    x: boss.x, y: boss.y, vx: 0, vy: 0,
                    radius: 12, damage: boss.damage * 0.4, life: 3, color: '#38bdf8'
                });
                addParticle(boss.x, boss.y, '#ffffff', 5, 'spark', 1);
            }

            const dist = Math.hypot(player.x - boss.x, player.y - boss.y);
            if (dist < boss.radius + player.radius + 10) {
                takeDamage(boss.damage * 2.5);
                boss.chargeDash = null;
            }
            if (boss.chargeDash && boss.chargeDash.timer <= 0) boss.chargeDash = null;
        }

        // "Crystal fins" — crystal shards in 3-burst
        if (!boss.shardTimer) boss.shardTimer = 4;
        boss.shardTimer -= dt;
        if (boss.shardTimer <= 0) {
            boss.shardTimer = enraged ? 2 : 4;
            const base = Math.atan2(player.y - boss.y, player.x - boss.x);
            const offsets = modifiers.bullet_hell ? [-0.8, -0.6, -0.4, -0.2, 0, 0.2, 0.4, 0.6, 0.8] : [-0.5, -0.25, 0, 0.25, 0.5];
            offsets.forEach(off => {
                enemyProjectiles.push({
                    x: boss.x, y: boss.y, vx: Math.cos(base + off) * 320, vy: Math.sin(base + off) * 320,
                    radius: 9, damage: boss.damage * 0.7, life: 2.5, color: '#38bdf8'
                });
            });
        }
        
        // NEW: Blizzard Aura
        if (enraged) {
            if (Math.random() < 0.3) {
                addParticle(boss.x + (Math.random() - 0.5) * 300, boss.y + (Math.random() - 0.5) * 300, '#ffffff', 2, 'spark', 1.5);
            }
            const dist = Math.hypot(player.x - boss.x, player.y - boss.y);
            if (dist < 250 && Math.random() < 0.1) {
                takeDamage(boss.damage * 0.1);
            }
        }
    }

    if (bossId === 'boss_supernova_empress') {
        // "Flowing energy wings" — wide sweeping arcs
        if (!boss.wingTimer) boss.wingTimer = 3;
        boss.wingTimer -= dt;
        if (boss.wingTimer <= 0) {
            boss.wingTimer = enraged ? 1.5 : 3;
            const base = Math.atan2(player.y - boss.y, player.x - boss.x);
            const count = (enraged ? 20 : 12) * (modifiers.bullet_hell ? 2 : 1);
            for (let i = 0; i < count; i++) {
                const a = base - Math.PI / 2.5 + (Math.PI * 2 / 2.5 / count) * i;
                enemyProjectiles.push({
                    x: boss.x, y: boss.y, vx: Math.cos(a) * 240, vy: Math.sin(a) * 240,
                    radius: 9, damage: boss.damage * 0.45, life: 3, color: '#ec4899'
                });
            }
            addDamageText(boss.x, boss.y - boss.radius - 20, '✨ EMPRESS SWEEP!', '#ec4899');
        }

        // "Crown of flames" — orbiting fire projectiles that explode outward
        if (!boss.crownTimer) boss.crownTimer = 7;
        boss.crownTimer -= dt;
        if (boss.crownTimer <= 0) {
            boss.crownTimer = enraged ? 4 : 7;
            const crownCount = modifiers.bullet_hell ? 20 : 10;
            for (let i = 0; i < crownCount; i++) {
                const a = (Math.PI * 2 / crownCount) * i;
                enemyProjectiles.push({
                    x: boss.x + Math.cos(a) * boss.radius,
                    y: boss.y + Math.sin(a) * boss.radius,
                    vx: Math.cos(a) * 300, vy: Math.sin(a) * 300,
                    radius: 12, damage: boss.damage * 0.6, life: 2.5, color: '#fbbf24'
                });
            }
            addParticle(boss.x, boss.y, '#fbbf24', 30, 'glow', 3);
            addDamageText(boss.x, boss.y - boss.radius - 30, '👑 CROWN OF FLAMES!', '#fbbf24');
        }

        // Enrage: rapidly blinks (teleports near player) AND shoots on blink
        if (enraged && !boss.blinkTimer) boss.blinkTimer = 3;
        if (boss.blinkTimer) {
            boss.blinkTimer -= dt;
            if (boss.blinkTimer <= 0) {
                boss.blinkTimer = 3;
                const angle = Math.random() * Math.PI * 2;
                boss.x = player.x + Math.cos(angle) * 250;
                boss.y = player.y + Math.sin(angle) * 250;
                addParticle(boss.x, boss.y, '#ec4899', 30, 'glow', 4);
                addDamageText(boss.x, boss.y - boss.radius - 20, 'EMPRESS BLINK!', '#ec4899');
                
                // Shoot circle on blink
                for(let i=0; i<12; i++) {
                    const a = (Math.PI * 2 / 12) * i;
                    enemyProjectiles.push({
                        x: boss.x, y: boss.y, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150,
                        radius: 8, damage: boss.damage * 0.5, life: 2, color: '#ec4899'
                    });
                }
            }
        }
        
        // NEW: Starfall
        if (!boss.starTimer) boss.starTimer = 9;
        boss.starTimer -= dt;
        if (boss.starTimer <= 0) {
            boss.starTimer = enraged ? 5 : 9;
            const starCount = enraged ? 12 : 8;
            for(let i=0; i<starCount; i++) {
                const tx = player.x + (Math.random() - 0.5) * 800;
                const ty = player.y - 600 - Math.random() * 200;
                enemyProjectiles.push({
                    x: tx, y: ty,
                    vx: (Math.random() - 0.5) * 50, vy: 500 + Math.random() * 300,
                    radius: 15, damage: boss.damage * 0.8, life: 5, color: '#fbcfe8'
                });
                addParticle(tx, ty, '#fbcfe8', 10, 'glow', 2);
            }
            addDamageText(boss.x, boss.y - boss.radius - 40, '🌟 STARFALL!', '#fbcfe8');
            addParticle(boss.x, boss.y, '#fbcfe8', 30, 'glow', 3);
        }
    }

    if (bossId === 'boss_nexus_annihilator') {
        // "Rotating metallic rings" — dense ring attacks
        if (!boss.ringTimer) boss.ringTimer = 1.5;
        boss.ringTimer -= dt;
        if (boss.ringTimer <= 0) {
            boss.ringTimer = enraged ? 0.8 : 1.5;
            const count = (enraged ? 30 : 20) * (modifiers.bullet_hell ? 2 : 1);
            const phase = boss.ringPhase || 0;
            for (let i = 0; i < count; i++) {
                const a = (Math.PI * 2 / count) * i + phase;
                enemyProjectiles.push({
                    x: boss.x, y: boss.y, vx: Math.cos(a) * 220, vy: Math.sin(a) * 220,
                    radius: 8, damage: boss.damage * 0.5, life: 4, color: '#7c3aed'
                });
            }
            boss.ringPhase = (phase + Math.PI / count);
        }

        // "Massive energy tendrils" — long tracking beams
        if (!boss.tendrilTimer) boss.tendrilTimer = 4;
        boss.tendrilTimer -= dt;
        if (boss.tendrilTimer <= 0) {
            boss.tendrilTimer = enraged ? 2.5 : 4;
            const angle = Math.atan2(player.y - boss.y, player.x - boss.x);
            const tendrils = (enraged ? 7 : 4) * (modifiers.bullet_hell ? 2 : 1);
            for (let t = 0; t < tendrils; t++) {
                const a = angle + (t - Math.floor(tendrils / 2)) * 0.2;
                for (let j = 0; j < 6; j++) {
                    enemyProjectiles.push({
                        x: boss.x, y: boss.y, vx: Math.cos(a) * (300 + j * 50), vy: Math.sin(a) * (300 + j * 50),
                        radius: 12, damage: boss.damage * 0.8, life: 2.5, color: '#c084fc'
                    });
                }
            }
            addParticle(boss.x, boss.y, '#c084fc', 30, 'glow', 4);
            addDamageText(boss.x, boss.y - boss.radius - 30, '⚡ ANNIHILATOR TENDRIL!', '#c084fc');
        }

        // "Glowing purple energy core" — periodic shockwave
        if (!boss.shockTimer) boss.shockTimer = 8;
        boss.shockTimer -= dt;
        if (boss.shockTimer <= 0) {
            boss.shockTimer = enraged ? 4 : 8;
            const dist = Math.hypot(player.x - boss.x, player.y - boss.y);
            if (dist < 400) {
                takeDamage(boss.damage * 1.5);
                // Push back player
                const pushAngle = Math.atan2(player.y - boss.y, player.x - boss.x);
                player.x += Math.cos(pushAngle) * 300;
                player.y += Math.sin(pushAngle) * 300;
            }
            addParticle(boss.x, boss.y, '#7c3aed', 50, 'glow', 6);
            addDamageText(boss.x, boss.y - boss.radius - 30, '💥 NEXUS SHOCKWAVE!', '#7c3aed');
        }
        
        // NEW: Reality Tear - sweeping lasers across the field
        if (!boss.tearTimer) boss.tearTimer = 12;
        boss.tearTimer -= dt;
        if (boss.tearTimer <= 0) {
            boss.tearTimer = enraged ? 8 : 12;
            const tearCount = enraged ? 6 : 4;
            for(let i=0; i<tearCount; i++) {
                const a = (Math.PI * 2 / tearCount) * i + Math.random();
                for(let d=1; d<15; d++) {
                    enemyProjectiles.push({
                        x: boss.x, y: boss.y, vx: Math.cos(a) * 150 * d * 0.2, vy: Math.sin(a) * 150 * d * 0.2,
                        radius: 12, damage: boss.damage * 1.2, life: 4, color: '#ffffff'
                    });
                    addParticle(boss.x + Math.cos(a) * d * 30, boss.y + Math.sin(a) * d * 30, '#c084fc', 2, 'glow', 1);
                }
            }
            addDamageText(boss.x, boss.y - boss.radius - 40, '🌌 REALITY TEAR!', '#ffffff');
            addParticle(boss.x, boss.y, '#ffffff', 40, 'glow', 4);
        }
    }
}