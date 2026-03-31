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
export function updateBossAbilities(boss, dt, player, enemyProjectiles, addParticle, addDamageText, takeDamage, enemies, frameCount, arenaId) {
    const tier = getArenaTier(arenaId);
    const enraged = boss.hp < boss.maxHp * 0.4; // Enrage below 40% HP

    // --- Shared: rotating bullet ring (all bosses, scaled by tier) ---
    if (!boss.skillTimer) boss.skillTimer = 0;
    boss.skillTimer -= dt;
    if (boss.skillTimer <= 0) {
        const baseCount = 6 + tier;
        const projCount = enraged ? baseCount * 2 : baseCount;
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

    if (boss.id === 'boss_nebula_devourer') {
        // "Swirling energy tentacles" — spiral burst every 5s
        if (!boss.spiralTimer) boss.spiralTimer = 5;
        boss.spiralTimer -= dt;
        if (boss.spiralTimer <= 0) {
            boss.spiralTimer = enraged ? 3 : 5;
            const count = 20;
            for (let i = 0; i < count; i++) {
                const angle = (Math.PI * 2 / count) * i + boss.spiralPhase;
                boss.spiralPhase = (boss.spiralPhase || 0) + 0.15;
                enemyProjectiles.push({
                    x: boss.x, y: boss.y,
                    vx: Math.cos(angle) * 160,
                    vy: Math.sin(angle) * 160,
                    radius: 8,
                    damage: boss.damage * 0.3,
                    life: 4,
                    color: '#a855f7'
                });
            }
            addDamageText(boss.x, boss.y - boss.radius - 20, 'TENTACLE SPIRAL!', '#a855f7');
        }

        // "Ravenous maw" — pulls player closer
        if (!boss.pullTimer) boss.pullTimer = 8;
        boss.pullTimer -= dt;
        if (boss.pullTimer <= 0) {
            boss.pullTimer = 8;
            const dx = boss.x - player.x;
            const dy = boss.y - player.y;
            const dist = Math.hypot(dx, dy);
            if (dist < 600) {
                player.x += (dx / dist) * 80 * dt * 60;
                player.y += (dy / dist) * 80 * dt * 60;
                addParticle(boss.x, boss.y, '#a855f7', 15, 'glow', 2);
                addDamageText(boss.x, boss.y - boss.radius - 30, 'DEVOUR!', '#a855f7');
            }
        }
    }

    if (boss.id === 'boss_plasma_kraken') {
        // "Long glowing tentacles" — fires 4 aimed shots spread
        if (!boss.krakTimer) boss.krakTimer = 2.5;
        boss.krakTimer -= dt;
        if (boss.krakTimer <= 0) {
            boss.krakTimer = enraged ? 1.2 : 2.5;
            const baseAngle = Math.atan2(player.y - boss.y, player.x - boss.x);
            const spread = enraged ? 5 : 3;
            for (let i = -spread; i <= spread; i += (enraged ? 1 : 2)) {
                const a = baseAngle + (i * Math.PI / 16);
                enemyProjectiles.push({
                    x: boss.x, y: boss.y,
                    vx: Math.cos(a) * 220,
                    vy: Math.sin(a) * 220,
                    radius: 10,
                    damage: boss.damage * 0.6,
                    life: 3,
                    color: '#ef4444'
                });
            }
            addParticle(boss.x, boss.y, '#ef4444', 10, 'glow', 2);
        }

        // "Fiery core" — periodic explosion burst at player location
        if (!boss.novaTimer) boss.novaTimer = 10;
        boss.novaTimer -= dt;
        if (boss.novaTimer <= 0) {
            boss.novaTimer = enraged ? 6 : 10;
            // Telegraphed: mark player position, explode after 1.5s
            const tx = player.x, ty = player.y;
            boss._novaWarning = boss._novaWarning || [];
            boss._novaWarning.push({ x: tx, y: ty, timer: 1.5 });
            addDamageText(tx, ty - 30, '⚠ PLASMA NOVA!', '#ef4444');
        }
        if (boss._novaWarning) {
            boss._novaWarning = boss._novaWarning.filter(w => {
                w.timer -= dt;
                addParticle(w.x, w.y, '#ef4444', 2, 'glow', 1.5);
                if (w.timer <= 0) {
                    const dist = Math.hypot(player.x - w.x, player.y - w.y);
                    if (dist < 80) takeDamage(boss.damage * 1.5);
                    for (let i = 0; i < 12; i++) {
                        const a = (Math.PI * 2 / 12) * i;
                        enemyProjectiles.push({ x: w.x, y: w.y, vx: Math.cos(a) * 180, vy: Math.sin(a) * 180, radius: 7, damage: boss.damage * 0.5, life: 2, color: '#ff4500' });
                    }
                    return false;
                }
                return true;
            });
        }
    }

    if (boss.id === 'boss_stellar_colossus') {
        // "Rotating arms" — spinning laser arms
        if (!boss.armTimer) boss.armTimer = 4;
        boss.armTimer -= dt;
        if (boss.armTimer <= 0) {
            boss.armTimer = enraged ? 2.5 : 4;
            const arms = enraged ? 6 : 4;
            for (let i = 0; i < arms; i++) {
                const a = (Math.PI * 2 / arms) * i + (boss.armPhase || 0);
                for (let j = 1; j <= 3; j++) {
                    enemyProjectiles.push({
                        x: boss.x, y: boss.y,
                        vx: Math.cos(a) * 200 * j * 0.4,
                        vy: Math.sin(a) * 200 * j * 0.4,
                        radius: 9,
                        damage: boss.damage * 0.5,
                        life: 3,
                        color: '#f59e0b'
                    });
                }
            }
            boss.armPhase = ((boss.armPhase || 0) + Math.PI / 6) % (Math.PI * 2);
            addDamageText(boss.x, boss.y - boss.radius - 20, 'STELLAR ARMS!', '#f59e0b');
        }

        // "Blazing central eye" — screen-wide beam aimed at player
        if (!boss.eyeTimer) boss.eyeTimer = 12;
        boss.eyeTimer -= dt;
        if (boss.eyeTimer <= 0) {
            boss.eyeTimer = enraged ? 7 : 12;
            const angle = Math.atan2(player.y - boss.y, player.x - boss.x);
            for (let i = 0; i < 8; i++) {
                enemyProjectiles.push({
                    x: boss.x, y: boss.y,
                    vx: Math.cos(angle) * (300 + i * 30),
                    vy: Math.sin(angle) * (300 + i * 30),
                    radius: 12,
                    damage: boss.damage * 0.9,
                    life: 2.5,
                    color: '#fbbf24'
                });
            }
            addParticle(boss.x, boss.y, '#fbbf24', 20, 'glow', 3);
            addDamageText(boss.x, boss.y - boss.radius - 30, '☀ SOLAR GAZE!', '#fbbf24');
        }
    }

    if (boss.id === 'boss_cosmic_wyrm') {
        // "Serpentine dragon" — charge dash in player direction
        if (!boss.chargeTimer) boss.chargeTimer = 6;
        boss.chargeTimer -= dt;
        if (boss.chargeTimer <= 0) {
            boss.chargeTimer = enraged ? 3.5 : 6;
            const dx = player.x - boss.x;
            const dy = player.y - boss.y;
            const dist = Math.hypot(dx, dy);
            boss.chargeDash = { vx: (dx / dist) * 700, vy: (dy / dist) * 700, timer: 0.35 };
            addDamageText(boss.x, boss.y - boss.radius - 30, '🐉 WYRM CHARGE!', '#0ea5e9');
            addParticle(boss.x, boss.y, '#0ea5e9', 15, 'glow', 2.5);
        }
        if (boss.chargeDash) {
            boss.x += boss.chargeDash.vx * dt;
            boss.y += boss.chargeDash.vy * dt;
            boss.chargeDash.timer -= dt;
            addParticle(boss.x, boss.y, '#0ea5e9', 3, 'glow', 1);
            const dist = Math.hypot(player.x - boss.x, player.y - boss.y);
            if (dist < boss.radius + player.radius + 5) {
                takeDamage(boss.damage * 2);
                boss.chargeDash = null;
            }
            if (boss.chargeDash && boss.chargeDash.timer <= 0) boss.chargeDash = null;
        }

        // "Crystal fins" — crystal shards in 3-burst
        if (!boss.shardTimer) boss.shardTimer = 5;
        boss.shardTimer -= dt;
        if (boss.shardTimer <= 0) {
            boss.shardTimer = enraged ? 3 : 5;
            const base = Math.atan2(player.y - boss.y, player.x - boss.x);
            [-0.4, 0, 0.4].forEach(off => {
                enemyProjectiles.push({
                    x: boss.x, y: boss.y,
                    vx: Math.cos(base + off) * 280,
                    vy: Math.sin(base + off) * 280,
                    radius: 8,
                    damage: boss.damage * 0.7,
                    life: 2.5,
                    color: '#38bdf8'
                });
            });
        }
    }

    if (boss.id === 'boss_supernova_empress') {
        // "Flowing energy wings" — wide sweeping arcs
        if (!boss.wingTimer) boss.wingTimer = 3.5;
        boss.wingTimer -= dt;
        if (boss.wingTimer <= 0) {
            boss.wingTimer = enraged ? 2 : 3.5;
            const base = Math.atan2(player.y - boss.y, player.x - boss.x);
            const count = enraged ? 16 : 10;
            for (let i = 0; i < count; i++) {
                const a = base - Math.PI / 3 + (Math.PI * 2 / 3 / count) * i;
                enemyProjectiles.push({
                    x: boss.x, y: boss.y,
                    vx: Math.cos(a) * 200,
                    vy: Math.sin(a) * 200,
                    radius: 8,
                    damage: boss.damage * 0.45,
                    life: 3,
                    color: '#ec4899'
                });
            }
            addDamageText(boss.x, boss.y - boss.radius - 20, '✨ EMPRESS SWEEP!', '#ec4899');
        }

        // "Crown of flames" — orbiting fire projectiles that explode outward
        if (!boss.crownTimer) boss.crownTimer = 8;
        boss.crownTimer -= dt;
        if (boss.crownTimer <= 0) {
            boss.crownTimer = enraged ? 5 : 8;
            const crownCount = 8;
            for (let i = 0; i < crownCount; i++) {
                const a = (Math.PI * 2 / crownCount) * i;
                enemyProjectiles.push({
                    x: boss.x + Math.cos(a) * boss.radius,
                    y: boss.y + Math.sin(a) * boss.radius,
                    vx: Math.cos(a) * 250,
                    vy: Math.sin(a) * 250,
                    radius: 10,
                    damage: boss.damage * 0.6,
                    life: 2.5,
                    color: '#fbbf24'
                });
            }
            addParticle(boss.x, boss.y, '#fbbf24', 20, 'glow', 2);
            addDamageText(boss.x, boss.y - boss.radius - 30, '👑 CROWN OF FLAMES!', '#fbbf24');
        }

        // Enrage: rapidly blinks (teleports near player)
        if (enraged && !boss.blinkTimer) boss.blinkTimer = 4;
        if (boss.blinkTimer) {
            boss.blinkTimer -= dt;
            if (boss.blinkTimer <= 0) {
                boss.blinkTimer = 4;
                const angle = Math.random() * Math.PI * 2;
                boss.x = player.x + Math.cos(angle) * 200;
                boss.y = player.y + Math.sin(angle) * 200;
                addParticle(boss.x, boss.y, '#ec4899', 20, 'glow', 3);
                addDamageText(boss.x, boss.y - boss.radius - 20, 'EMPRESS BLINK!', '#ec4899');
            }
        }
    }

    if (boss.id === 'boss_nexus_annihilator') {
        // "Rotating metallic rings" — dense ring attacks
        if (!boss.ringTimer) boss.ringTimer = 2;
        boss.ringTimer -= dt;
        if (boss.ringTimer <= 0) {
            boss.ringTimer = enraged ? 1.0 : 2.0;
            const count = enraged ? 24 : 16;
            const phase = boss.ringPhase || 0;
            for (let i = 0; i < count; i++) {
                const a = (Math.PI * 2 / count) * i + phase;
                enemyProjectiles.push({
                    x: boss.x, y: boss.y,
                    vx: Math.cos(a) * 180,
                    vy: Math.sin(a) * 180,
                    radius: 7,
                    damage: boss.damage * 0.5,
                    life: 4,
                    color: '#7c3aed'
                });
            }
            boss.ringPhase = (phase + Math.PI / count);
        }

        // "Massive energy tendrils" — long tracking beams
        if (!boss.tendrilTimer) boss.tendrilTimer = 5;
        boss.tendrilTimer -= dt;
        if (boss.tendrilTimer <= 0) {
            boss.tendrilTimer = enraged ? 3 : 5;
            const angle = Math.atan2(player.y - boss.y, player.x - boss.x);
            const tendrils = enraged ? 5 : 3;
            for (let t = 0; t < tendrils; t++) {
                const a = angle + (t - Math.floor(tendrils / 2)) * 0.25;
                for (let j = 0; j < 5; j++) {
                    enemyProjectiles.push({
                        x: boss.x, y: boss.y,
                        vx: Math.cos(a) * (250 + j * 40),
                        vy: Math.sin(a) * (250 + j * 40),
                        radius: 10,
                        damage: boss.damage * 0.8,
                        life: 2.5,
                        color: '#c084fc'
                    });
                }
            }
            addParticle(boss.x, boss.y, '#c084fc', 20, 'glow', 3);
            addDamageText(boss.x, boss.y - boss.radius - 30, '⚡ ANNIHILATOR TENDRIL!', '#c084fc');
        }

        // "Glowing purple energy core" — periodic shockwave
        if (!boss.shockTimer) boss.shockTimer = 9;
        boss.shockTimer -= dt;
        if (boss.shockTimer <= 0) {
            boss.shockTimer = enraged ? 5 : 9;
            const dist = Math.hypot(player.x - boss.x, player.y - boss.y);
            if (dist < 300) takeDamage(boss.damage * 1.2);
            addParticle(boss.x, boss.y, '#7c3aed', 30, 'glow', 4);
            addDamageText(boss.x, boss.y - boss.radius - 30, '💥 NEXUS SHOCKWAVE!', '#7c3aed');
        }
    }
}