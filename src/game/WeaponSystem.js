import { SoundManager } from './SoundManager';
import { SFXManager } from './SFXManager';
import { getWeaponStatsAndMastery } from './Constants';

export function fireWeaponLogic(engine, w) {
    SFXManager.playWeaponFire(w.id);
    const stats = getWeaponStatsAndMastery(engine.save, w.id);
    
    const isMastered = stats.isMastered;
    const wDmgMult = stats.dmgMult;
    const wAreaMult = stats.areaMult;

    const dmg = w.baseDamage * engine.player.damageMult * (1 + (w.level-1)*0.2) * wDmgMult;
    const area = w.baseArea * engine.player.areaMult * (1 + (w.level-1)*0.1) * wAreaMult;
    
    if (w.id === 'neoBlaster') {
        let nearest = null;
        let minDist = Infinity;
        engine.enemies.forEach(e => {
            const d = Math.hypot(e.x - engine.player.x, e.y - engine.player.y);
            if (d < minDist) { minDist = d; nearest = e; }
        });
        let angle = nearest ? Math.atan2(nearest.y - engine.player.y, nearest.x - engine.player.x) : Math.random() * Math.PI * 2;
        
        const count = isMastered ? 3 : 1;
        for (let i = 0; i < count; i++) {
            const a = count > 1 ? angle + (i - 1) * 0.2 : angle;
            engine.projectiles.push({
                x: engine.player.x, y: engine.player.y,
                vx: Math.cos(a) * 500 * engine.player.projSpeedMult,
                vy: Math.sin(a) * 500 * engine.player.projSpeedMult,
                radius: 6 * area, damage: dmg, pierce: 1, life: 1.5, color: engine.player.color, type: 'blaster_shot'
            });
        }
    }
    else if (w.id === 'napBeam') {
        let nearest = null;
        let minDist = Infinity;
        engine.enemies.forEach(e => {
            const d = Math.hypot(e.x - engine.player.x, e.y - engine.player.y);
            if (d < minDist) { minDist = d; nearest = e; }
        });
        
        let angle = nearest ? Math.atan2(nearest.y - engine.player.y, nearest.x - engine.player.x) : Math.random() * Math.PI * 2;
        
        let projColor = isMastered ? '#4169E1' : engine.player.color;
        let projType = 'beam';
        
        if (engine.characterId === 'skybyte') { projType = 'dual_laser'; }
        else if (engine.characterId === 'neobyte') { projType = 'lightning'; }
        else if (engine.characterId === 'glitch') { projType = 'glitch_slash'; }
        else if (engine.characterId === 'pandypaws') { projType = 'stomp'; }
        else if (engine.characterId === 'holodrift') { projType = 'repair_beam'; }
        else if (engine.characterId === 'novabyte') { projType = 'missile'; }
        else if (engine.characterId === 'codebreaker') { projType = 'data_pulse'; }
        else if (engine.characterId === 'dataphantom') { projType = 'phantom_orb'; }
        else if (engine.characterId === 'neonvortex') { projType = 'railgun'; }
        else if (engine.characterId === 'synthbeats') { projType = 'sonic_wave'; }

        const spawnOffset = engine.player.radius + 5;
        engine.projectiles.push({
            x: engine.player.x + Math.cos(angle) * spawnOffset,
            y: engine.player.y + Math.sin(angle) * spawnOffset,
            vx: Math.cos(angle) * 300 * engine.player.projSpeedMult,
            vy: Math.sin(angle) * 300 * engine.player.projSpeedMult,
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
             engine.projectiles.push({
                x: engine.player.x + Math.cos(angle) * spawnOffset + Math.cos(angle + Math.PI/2)*10,
                y: engine.player.y + Math.sin(angle) * spawnOffset + Math.sin(angle + Math.PI/2)*10,
                vx: Math.cos(angle) * 300 * engine.player.projSpeedMult, vy: Math.sin(angle) * 300 * engine.player.projSpeedMult,
                radius: 4 * area, damage: dmg, pierce: 2 + Math.floor(w.level/2), life: 2, color: projColor, type: projType, isMastered, weaponId: 'napBeam'
            });
        }
    }
    else if (w.id === 'vineWhip') {
        const charColor = engine.player.color;
        const color1 = isMastered ? '#ff0055' : charColor;
        const color2 = isMastered ? '#ffaa00' : '#ffffff';
        
        engine.particleManager.particles.push({
            x: engine.player.x, y: engine.player.y,
            vx: 0, vy: 0, life: 0.2, maxLife: 0.2,
            color: '#ffffff', tint: color1, type: 'slash', size: 60 * area, rotation: Math.random() * Math.PI * 2
        });

        engine.enemies.forEach(e => {
            if (Math.hypot(e.x - engine.player.x, e.y - engine.player.y) < 100 * area) {
                engine.damageEnemy(e, dmg);
                engine.addParticle(e.x, e.y, color1, 10, 'spark', 1.5);
                engine.addParticle(e.x, e.y, color2, 5, 'spark', 1);
                if (isMastered) {
                    engine.player.hp = Math.min(engine.player.maxHp, engine.player.hp + (dmg * 0.05));
                    engine.callbacks.onHpChange(engine.player.hp, engine.player.maxHp);
                }
            }
        });
    }
    else if (w.id === 'slothSwarm') {
        const count = 1 + Math.floor(w.level / 2);
        for(let i=0; i<count; i++) {
            const angle = (Math.PI * 2 / count) * i + engine.time * 3;
            const px = engine.player.x + Math.cos(angle) * (60 * area);
            const py = engine.player.y + Math.sin(angle) * (60 * area);
            engine.enemies.forEach(e => {
                if (Math.hypot(e.x - px, e.y - py) < 20) {
                    engine.damageEnemy(e, dmg * 0.2);
                    engine.addParticle(e.x, e.y, isMastered ? '#FF0000' : '#8B4513', 2);
                }
            });
            
            if (isMastered) {
                let nearest = null;
                let minDist = 200;
                engine.enemies.forEach(e => {
                    const d = Math.hypot(e.x - px, e.y - py);
                    if (d < minDist) { minDist = d; nearest = e; }
                });
                if (nearest) {
                    const lAngle = Math.atan2(nearest.y - py, nearest.x - px);
                    engine.projectiles.push({
                        x: px, y: py,
                        vx: Math.cos(lAngle) * 300,
                        vy: Math.sin(lAngle) * 300,
                        radius: 3,
                        damage: dmg * 0.5,
                        pierce: 1,
                        life: 1,
                        color: '#FF0000',
                        type: 'beam'
                    });
                }
            }
        }
    }
    else if (w.id === 'napalm') {
        engine.projectiles.push({
            x: engine.player.x, y: engine.player.y,
            vx: 0, vy: 0,
            radius: 40 * area,
            damage: dmg * 0.5,
            pierce: 999,
            life: 3 + w.level,
            color: isMastered ? '#00bfff' : engine.player.color,
            isAoe: true,
            isMastered: isMastered,
            weaponId: 'napalm',
            type: 'napalm_pool'
        });
    }
    else if (w.id === 'novaPulse') {
        const primaryColor = isMastered ? '#ff00ff' : '#00ffff';
        const secondaryColor = isMastered ? '#8a2be2' : '#ffffff';
        engine.projectiles.push({
            x: engine.player.x, y: engine.player.y,
            vx: 0, vy: 0,
            radius: 10 * area,
            damage: dmg,
            pierce: 999,
            life: 0.5,
            color: primaryColor,
            isAoe: true,
            pulse: true,
            type: 'nova_pulse'
        });
        if (isMastered) {
            setTimeout(() => {
                if (engine.isGameOver || engine.isVictory) return;
                engine.projectiles.push({
                    x: engine.player.x, y: engine.player.y,
                    vx: 0, vy: 0,
                    radius: 10 * area,
                    damage: dmg * 0.5,
                    pierce: 999,
                    life: 0.5,
                    color: secondaryColor,
                    isAoe: true,
                    pulse: true,
                    type: 'nova_pulse'
                });
            }, 500);
        }
    }
    else if (w.id === 'shieldBubble') {
        const color = isMastered ? '#ffd700' : engine.player.color;
        engine.addParticle(engine.player.x, engine.player.y, color, 8, 'circle', 2 * area, { speed: 200 });
        engine.projectiles.push({
            x: engine.player.x, y: engine.player.y,
            vx: 0, vy: 0,
            radius: 80 * area,
            damage: dmg,
            pierce: 999,
            life: 2.0,
            color: color,
            isAoe: true,
            pushback: 250,
            isMastered: isMastered,
            weaponId: 'shieldBubble',
            type: 'shield_bubble'
        });
    }
    else if (w.id === 'burningBarrier') {
        engine.projectiles.push({
            x: engine.player.x, y: engine.player.y,
            vx: 0, vy: 0,
            radius: 100 * area,
            damage: dmg,
            pierce: 999,
            life: 3.0 + (w.level * 0.5),
            color: '#ff4500',
            isAoe: true,
            pushback: 150,
            burn: true,
            type: 'burning_barrier'
        });
    }
    else if (w.id === 'laserNova') {
        engine.projectiles.push({
            x: engine.player.x, y: engine.player.y,
            vx: 0, vy: 0,
            radius: 15 * area,
            damage: dmg,
            pierce: 999,
            life: 0.8,
            color: '#00ffff',
            isAoe: true,
            pulse: true,
            type: 'laser_nova_pulse'
        });
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI / 4) * i;
            engine.projectiles.push({
                x: engine.player.x, y: engine.player.y,
                vx: Math.cos(angle) * 400 * engine.player.projSpeedMult,
                vy: Math.sin(angle) * 400 * engine.player.projSpeedMult,
                radius: 8 * area,
                damage: dmg * 0.5,
                pierce: 5 + Math.floor(w.level/2),
                life: 2,
                color: '#ff00ff',
                type: 'beam'
            });
        }
    }
    else if (w.id === 'thornySwarm') {
        const count = 2 + Math.floor(w.level / 2);
        for(let i=0; i<count; i++) {
            const angle = (Math.PI * 2 / count) * i + engine.time * 4;
            const px = engine.player.x + Math.cos(angle) * (80 * area);
            const py = engine.player.y + Math.sin(angle) * (80 * area);
            
            engine.enemies.forEach(e => {
                if (Math.hypot(e.x - px, e.y - py) < 30) {
                    engine.damageEnemy(e, dmg * 0.3);
                    engine.addParticle(e.x, e.y, '#228B22', 5);
                }
            });
            
            if (Math.random() < 0.3) {
                engine.enemies.forEach(e => {
                    if (Math.hypot(e.x - px, e.y - py) < 120 * area) {
                        engine.damageEnemy(e, dmg);
                        engine.addParticle(e.x, e.y, '#32CD32', 10);
                    }
                });
            }
        }
    }
    else if (w.id === 'orbitalLasers') {
        const count = 2 + Math.floor(w.level / 2);
        for(let i=0; i<count; i++) {
            const angle = (Math.PI * 2 / count) * i + engine.time * 2;
            const px = engine.player.x + Math.cos(angle) * (60 * area);
            const py = engine.player.y + Math.sin(angle) * (60 * area);
            
            engine.enemies.forEach(e => {
                if (Math.hypot(e.x - px, e.y - py) < 25) {
                    engine.damageEnemy(e, dmg * 0.5);
                    engine.addParticle(e.x, e.y, '#00ffff', 3);
                }
            });
            
            let nearest = null;
            let minDist = 300 * area;
            engine.enemies.forEach(e => {
                const d = Math.hypot(e.x - px, e.y - py);
                if (d < minDist) { minDist = d; nearest = e; }
            });
            
            if (nearest) {
                const lAngle = Math.atan2(nearest.y - py, nearest.x - px);
                engine.projectiles.push({
                    x: px, y: py,
                    vx: Math.cos(lAngle) * 400 * engine.player.projSpeedMult,
                    vy: Math.sin(lAngle) * 400 * engine.player.projSpeedMult,
                    radius: 4,
                    damage: dmg,
                    pierce: 3 + Math.floor(w.level/2),
                    life: 1.5,
                    color: '#00ffff',
                    type: 'beam'
                });
            }
        }
    }
    else if (w.id === 'seismicWhip') {
        const charColor = engine.player.color;
        engine.particleManager.particles.push({
            x: engine.player.x, y: engine.player.y,
            vx: 0, vy: 0, life: 0.25, maxLife: 0.25,
            color: '#ffffff', tint: '#ff00ff', type: 'slash', size: 80 * area, rotation: Math.random() * Math.PI * 2
        });
        let hitAny = false;
        let hitX = engine.player.x;
        let hitY = engine.player.y;
        
        engine.enemies.forEach(e => {
            if (Math.hypot(e.x - engine.player.x, e.y - engine.player.y) < 120 * area) {
                engine.damageEnemy(e, dmg);
                if (Math.random() < 0.3) engine.addParticle(e.x, e.y, '#ff00ff', 4, 'spark', 1.5);
                hitAny = true;
                hitX = e.x;
                hitY = e.y;
            }
        });
        
        if (hitAny) {
            engine.addParticle(hitX, hitY, '#00ffff', 15, 'spark', 2);
            engine.projectiles.push({
                x: hitX, y: hitY,
                vx: 0, vy: 0,
                radius: 30 * area,
                damage: dmg * 1.5,
                pierce: 999,
                life: 0.5,
                color: '#00ffff',
                isAoe: true,
                pulse: true,
                type: 'seismic_shockwave'
            });
        }
    }
    else if (w.id === 'flamingLash') {
        engine.particleManager.particles.push({
            x: engine.player.x, y: engine.player.y,
            vx: 0, vy: 0, life: 0.25, maxLife: 0.25,
            color: '#ffffff', tint: '#ff4500', type: 'slash', size: 80 * area, rotation: Math.random() * Math.PI * 2
        });
        engine.enemies.forEach(e => {
            if (Math.hypot(e.x - engine.player.x, e.y - engine.player.y) < 120 * area) {
                engine.damageEnemy(e, dmg);
                if (Math.random() < 0.3) engine.addParticle(e.x, e.y, '#ff4500', 4, 'spark', 1.5);
                
                engine.projectiles.push({
                    x: e.x, y: e.y,
                    vx: 0, vy: 0,
                    radius: 30 * area,
                    damage: dmg * 0.4,
                    pierce: 999,
                    life: 2.0 + (w.level * 0.5),
                    color: '#ff4500',
                    isAoe: true,
                    burn: true,
                    type: 'flaming_lash_pool'
                });
            }
        });
    }
    else if (w.id === 'supernovaBeam') {
        let nearest = null;
        let minDist = Infinity;
        engine.enemies.forEach(e => {
            const d = Math.hypot(e.x - engine.player.x, e.y - engine.player.y);
            if (d < minDist) { minDist = d; nearest = e; }
        });
        let angle = nearest ? Math.atan2(nearest.y - engine.player.y, nearest.x - engine.player.x) : Math.random() * Math.PI * 2;
        const spawnOffset = engine.player.radius + 5;
        
        engine.addParticle(engine.player.x, engine.player.y, '#ffaa00', 10, 'spark', 2 * area, { speed: 400 });
        
        engine.projectiles.push({
            x: engine.player.x + Math.cos(angle) * spawnOffset,
            y: engine.player.y + Math.sin(angle) * spawnOffset,
            vx: Math.cos(angle) * 400 * engine.player.projSpeedMult,
            vy: Math.sin(angle) * 400 * engine.player.projSpeedMult,
            radius: 15 * area,
            damage: dmg,
            pierce: 10 + w.level,
            life: 3,
            color: '#ffaa00',
            type: 'supernova_beam',
            isMastered: true,
            weaponId: 'supernovaBeam'
        });
    }
    else if (w.id === 'vampiricLash') {
        engine.particleManager.particles.push({
            x: engine.player.x, y: engine.player.y,
            vx: 0, vy: 0, life: 0.25, maxLife: 0.25,
            color: '#ffffff', tint: '#ff0000', type: 'slash', size: 100 * area, rotation: Math.random() * Math.PI * 2
        });
        engine.particleManager.particles.push({
            x: engine.player.x, y: engine.player.y,
            vx: 0, vy: 0,
            life: 0.5, maxLife: 0.5,
            color: '#ff0000', tint: '#ff0000',
            type: 'shockwave',
            size: 20 * area, growthRate: 1200 * area, lineWidth: 10
        });
        let totalHeal = 0;
        engine.enemies.forEach(e => {
            if (Math.hypot(e.x - engine.player.x, e.y - engine.player.y) < 180 * area) {
                engine.damageEnemy(e, dmg);
                if (Math.random() < 0.2) engine.addParticle(e.x, e.y, '#ff0000', 4, 'spark', 1.5);
                totalHeal += dmg * 0.01;
            }
        });
        if (totalHeal > 0) {
            totalHeal = Math.min(totalHeal, engine.player.maxHp * 0.05); // Cap at 5% max HP per swing
            engine.player.hp = Math.min(engine.player.maxHp, engine.player.hp + totalHeal);
            engine.callbacks.onHpChange(engine.player.hp, engine.player.maxHp);
        }
    }
    else if (w.id === 'orbitalDefense') {
        const count = 4 + Math.floor(w.level / 2);
        for(let i=0; i<count; i++) {
            const angle = (Math.PI * 2 / count) * i + engine.time * 3;
            const px = engine.player.x + Math.cos(angle) * (70 * area);
            const py = engine.player.y + Math.sin(angle) * (70 * area);
            
            engine.enemies.forEach(e => {
                if (Math.hypot(e.x - px, e.y - py) < 30) {
                    engine.damageEnemy(e, dmg * 0.5);
                    engine.addParticle(e.x, e.y, '#ff00ff', 3);
                }
            });
            
            let nearest = null;
            let minDist = 400 * area;
            engine.enemies.forEach(e => {
                const d = Math.hypot(e.x - px, e.y - py);
                if (d < minDist) { minDist = d; nearest = e; }
            });
            
            if (nearest) {
                const lAngle = Math.atan2(nearest.y - py, nearest.x - px);
                engine.projectiles.push({
                    x: px, y: py,
                    vx: Math.cos(lAngle) * 500 * engine.player.projSpeedMult,
                    vy: Math.sin(lAngle) * 500 * engine.player.projSpeedMult,
                    radius: 5,
                    damage: dmg,
                    pierce: 5 + Math.floor(w.level/2),
                    life: 2.0,
                    color: '#ff00ff',
                    type: 'beam'
                });
            }
        }
    }
    else if (w.id === 'hellfire') {
        engine.projectiles.push({
            x: engine.player.x, y: engine.player.y,
            vx: 0, vy: 0,
            radius: 60 * area,
            damage: dmg,
            pierce: 999,
            life: 5 + w.level,
            color: '#00bfff',
            isAoe: true,
            burn: true,
            isMastered: true,
            weaponId: 'napalm',
            type: 'hellfire'
        });
    }
    else if (w.id === 'quantumCollapse') {
        const spawnCollapse = (multiplier, delay) => {
            setTimeout(() => {
                if (engine.isGameOver || engine.isVictory) return;
                engine.projectiles.push({
                    x: engine.player.x, y: engine.player.y,
                    vx: 0, vy: 0,
                    radius: 25 * area * multiplier,
                    damage: dmg * multiplier,
                    pierce: 999,
                    life: 1.0,
                    color: '#8a2be2',
                    isAoe: true,
                    pulse: true,
                    type: 'quantum_collapse'
                });
            }, delay);
        };
        spawnCollapse(1.0, 0);
        spawnCollapse(1.2, 300);
        spawnCollapse(1.4, 600);
    }
    else if (w.id === 'aegisMatrix') {
        engine.addParticle(engine.player.x, engine.player.y, '#00ff88', 12, 'circle', 2 * area, { speed: 300 });
        engine.projectiles.push({
            x: engine.player.x, y: engine.player.y,
            vx: 0, vy: 0,
            radius: 120 * area,
            damage: dmg,
            pierce: 999,
            life: 2.5,
            color: '#00ff88',
            isAoe: true,
            pushback: 300,
            isMastered: true,
            weaponId: 'shieldBubble',
            type: 'aegis_matrix'
        });
    }
}