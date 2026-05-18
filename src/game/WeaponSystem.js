import { SoundManager } from './SoundManager';
import { SFXManager } from './SFXManager';
import { getWeaponStatsAndMastery } from './Constants';
import { isS6OrLater } from '@/lib/seasonGate';

// S6 visual-radius caps — applied as a final clamp on each AoE weapon's drawn radius.
// Damage is unaffected; only the visual/hitbox radius is capped so a maxed-out Aegis
// Matrix doesn't blanket the screen. Numbers chosen to keep current legit max-stack
// builds (Tijckers/Anubis ~1800-2000px peak) at ~70-75% of their old footprint —
// readable but still satisfyingly large. See docs/S6_PATCH_NOTES.md §4.
const S6_VISUAL_RADIUS_CAP = {
    aegisMatrix:    320,
    shieldBubble:   240,
    burningBarrier: 280,
    hellfire:       240,
    quantumCollapse: 180,
    toxicCloud:     200,
    napalm:         180,
};
function capVisualRadius(weaponId, radius) {
    if (!isS6OrLater()) return radius;
    const cap = S6_VISUAL_RADIUS_CAP[weaponId];
    return cap ? Math.min(radius, cap) : radius;
}

export function fireWeaponLogic(engine, w) {
    SFXManager.playWeaponFire(w.id);
    const stats = getWeaponStatsAndMastery(engine.save, w.id);
    
    const isMastered = stats.isMastered;
    const wDmgMult = stats.dmgMult;
    const wAreaMult = stats.areaMult;

    // S6 tightened the global caps to flatten extreme stacking — peaks landed under
    // the old caps anyway (Tijckers ~3.5 area / ~1.66 dmg) so legit builds untouched.
    // S5 keeps the original ceilings so end-of-season runs aren't retroactively nerfed.
    const _s6 = isS6OrLater();
    const playerAreaCap = _s6 ? 3.0 : 4.0;
    const playerDmgCap  = _s6 ? 4.0 : 5.0;
    const wAreaCap      = _s6 ? 1.6 : 2.0;
    const wDmgCap       = _s6 ? 1.8 : 2.0;
    // Per-level area scaling — S6 drops 0.08 → 0.05 so weapon level isn't a third
    // independent area faucet on top of upgrades + forge. Damage scaling unchanged
    // (0.15) so level-ups still feel impactful.
    const areaPerLevel  = _s6 ? 0.05 : 0.08;

    // Level cap follows the season: S5 stops scaling at lvl 20 (legacy), S6+ at lvl 25.
    const _lvlCap = _s6 ? 24 : 19;
    const weaponLevelMult = 1 + Math.min(_lvlCap, w.level - 1) * 0.15;
    let dmg = w.baseDamage * Math.min(playerDmgCap, engine.player.damageMult) * weaponLevelMult * Math.min(wDmgCap, wDmgMult);
    let area = w.baseArea * Math.min(playerAreaCap, engine.player.areaMult) * (1 + Math.min(_lvlCap, w.level - 1) * areaPerLevel) * Math.min(wAreaCap, wAreaMult);

    // Projectile Speed → Damage scaling (kinetic energy):
    // Faster projectiles hit harder. Applies ONLY to projectile-based weapons (not melee/AoE).
    // +50% projSpeedMult → +25% damage. Capped so it can't double damage on its own.
    const PROJECTILE_WEAPONS = new Set([
        'neoBlaster', 'napBeam', 'bouncingBlade', 'buzzsawSwarm',
        'supernovaBeam', 'orbitalLasers', 'orbitalDefense', 'laserNova'
    ]);
    if (PROJECTILE_WEAPONS.has(w.id)) {
        const speedBonus = Math.min(1.0, (Math.max(1.0, engine.player.projSpeedMult) - 1.0) * 0.5);
        dmg *= 1 + speedBonus;
    }
    
    if (engine.player.synAmpTimer > 0) area *= 2.0;
    
    if (engine.player.charAugments?.includes('neo_rail')) {
        engine.player.railCount = (engine.player.railCount || 0) + 1;
        if (engine.player.railCount % 5 === 0) dmg *= 3.0;
    }
    
    let isBeatPush = false;
    if (engine.player.charAugments?.includes('syn_beat')) {
        engine.player.beatCount = (engine.player.beatCount || 0) + 1;
        if (engine.player.beatCount % 4 === 0) isBeatPush = true;
    }

    const startIndex = engine.projectiles.length;
    
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
                engine.damageEnemy(e, dmg, { weaponId: w.id });
                engine.addParticle(e.x, e.y, color1, 10, 'spark', 1.5);
                engine.addParticle(e.x, e.y, color2, 5, 'spark', 1);
                if (engine.player.charAugments?.includes('pan_stomp')) e.slowTimer = 2.0;
                if (isMastered) {
                    engine.player.hp = Math.min(engine.player.maxHp, engine.player.hp + (dmg * 0.05));
                    engine.callbacks.onHpChange(engine.player.hp, engine.player.maxHp);
                }
            }
        });
    }
    else if (w.id === 'slothSwarm') {
        const count = 1 + Math.floor(w.level / 2);
        // Mastery: drones orbit 80% faster (was identical speed — Anubis bug 2026-05-11).
        const orbitSpeed = isMastered ? 5.4 : 3;
        for(let i=0; i<count; i++) {
            const angle = (Math.PI * 2 / count) * i + engine.time * orbitSpeed;
            const px = engine.player.x + Math.cos(angle) * (60 * area);
            const py = engine.player.y + Math.sin(angle) * (60 * area);
            engine.enemies.forEach(e => {
                if (Math.hypot(e.x - px, e.y - py) < 20) {
                    engine.damageEnemy(e, dmg * 0.2, { weaponId: w.id });
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
            radius: capVisualRadius('napalm', 40 * area),
            damage: dmg * 0.5,
            pierce: 999,
            life: 3 + w.level,
            // Mastery flips the pool to blue plasma fire to clearly distinguish it from
            // the orange base version (Anubis bug 2026-05-11 — old #ff2200 was nearly
            // identical to non-mastered #ff4500).
            color: isMastered ? '#00BFFF' : '#ff4500',
            isAoe: true,
            isMastered: isMastered,
            weaponId: 'napalm',
            type: 'napalm_pool'
        });
    }
    else if (w.id === 'novaPulse') {
        // masteryDesc explicitly says "(Purple Blast)" — primary was magenta/pink (#ff00ff)
        // which reads more as hot pink than purple. Swapped to true purple/violet so the
        // mastered pulse matches its description (Hugo audit 2026-05-12).
        const primaryColor = isMastered ? '#9400d3' : '#00ffff';
        const secondaryColor = isMastered ? '#c77dff' : '#ffffff';
        
        if (engine.player.charAugments?.includes('nova_chain')) {
            for(let i=0; i<2; i++) {
                const a = Math.random() * Math.PI * 2;
                engine.projectiles.push({
                    x: engine.player.x, y: engine.player.y,
                    vx: Math.cos(a) * 300, vy: Math.sin(a) * 300,
                    radius: 5, damage: dmg * 0.5, pierce: 1, life: 2, color: '#ff0000', type: 'missile'
                });
            }
        }
        
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
                    type: 'nova_pulse',
                    weaponId: 'novaPulse'
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
            radius: 80 * area,  // Damage radius — scales uncapped with upgrades
            visualRadius: capVisualRadius('shieldBubble', 80 * area),  // Visual radius — capped for screen space
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
            radius: capVisualRadius('burningBarrier', 100 * area),
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
        if (engine.player.charAugments?.includes('nova_chain')) {
            for(let i=0; i<2; i++) {
                const a = Math.random() * Math.PI * 2;
                engine.projectiles.push({
                    x: engine.player.x, y: engine.player.y,
                    vx: Math.cos(a) * 300, vy: Math.sin(a) * 300,
                    radius: 5, damage: dmg * 0.5, pierce: 1, life: 2, color: '#ff0000', type: 'missile'
                });
            }
        }
        
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
        // Display name is "Plasma Swarm" with "plasma whips" — old forest-green particles
        // were a leftover from when this was called "Thorny Swarm" (plant theme).
        // Plasma cyan + magenta now matches the in-game weapon name/description (Hugo audit 2026-05-12).
        const count = 2 + Math.floor(w.level / 2);
        for(let i=0; i<count; i++) {
            const angle = (Math.PI * 2 / count) * i + engine.time * 4;
            const px = engine.player.x + Math.cos(angle) * (80 * area);
            const py = engine.player.y + Math.sin(angle) * (80 * area);
            
            engine.enemies.forEach(e => {
                if (Math.hypot(e.x - px, e.y - py) < 30) {
                    engine.damageEnemy(e, dmg * 0.3, { weaponId: w.id });
                    engine.addParticle(e.x, e.y, '#00ffff', 5);
                }
            });
            
            if (Math.random() < 0.3) {
                engine.enemies.forEach(e => {
                    if (Math.hypot(e.x - px, e.y - py) < 120 * area) {
                        engine.damageEnemy(e, dmg, { weaponId: w.id });
                        engine.addParticle(e.x, e.y, '#ff00ff', 10);
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
                    engine.damageEnemy(e, dmg * 0.5, { weaponId: w.id });
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
                engine.damageEnemy(e, dmg, { weaponId: w.id });
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
                engine.damageEnemy(e, dmg, { weaponId: w.id });
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
        
        // Supernova Beam evolves from napBeam (whose mastered form is the "Blue Beam"),
        // so the evolution should preserve that blue identity rather than flipping to
        // orange. Bright cyan-blue keeps the supernova "super-charged" feel while
        // honoring the parent weapon's mastery color (Hugo audit 2026-05-12).
        engine.addParticle(engine.player.x, engine.player.y, '#4169E1', 10, 'spark', 2 * area, { speed: 400 });
        
        engine.projectiles.push({
            x: engine.player.x + Math.cos(angle) * spawnOffset,
            y: engine.player.y + Math.sin(angle) * spawnOffset,
            vx: Math.cos(angle) * 400 * engine.player.projSpeedMult,
            vy: Math.sin(angle) * 400 * engine.player.projSpeedMult,
            radius: 15 * area,
            damage: dmg,
            pierce: 10 + w.level,
            life: 3,
            color: '#4169E1',
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
                engine.damageEnemy(e, dmg, { weaponId: w.id });
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
        // Evolves from slothSwarm whose mastered color is red (#FF0000).
        // Was magenta — broke the parent-color inheritance rule (Hugo audit 2026-05-12).
        const count = 4 + Math.floor(w.level / 2);
        for(let i=0; i<count; i++) {
            const angle = (Math.PI * 2 / count) * i + engine.time * 3;
            const px = engine.player.x + Math.cos(angle) * (70 * area);
            const py = engine.player.y + Math.sin(angle) * (70 * area);
            
            engine.enemies.forEach(e => {
                if (Math.hypot(e.x - px, e.y - py) < 30) {
                    engine.damageEnemy(e, dmg * 0.5, { weaponId: w.id });
                    engine.addParticle(e.x, e.y, '#ff3030', 3);
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
                    color: '#ff3030',
                    type: 'beam'
                });
            }
        }
    }
    else if (w.id === 'hellfire') {
        engine.projectiles.push({
            x: engine.player.x, y: engine.player.y,
            vx: 0, vy: 0,
            radius: capVisualRadius('hellfire', 60 * area),
            damage: dmg,
            pierce: 999,
            life: 5 + w.level,
            // Hellfire description says "Blue flames that persist" — was red (#ff0000)
            // which contradicted the description and clashed visually with napalm.
            // Deep sky blue distinguishes it from napalm mastery's lighter blue.
            color: '#1E90FF',
            isAoe: true,
            burn: true,
            isMastered: true,
            weaponId: 'hellfire',
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
                    radius: capVisualRadius('quantumCollapse', 25 * area * multiplier),
                    damage: dmg * multiplier,
                    pierce: 999,
                    life: 1.0,
                    color: '#8a2be2',
                    isAoe: true,
                    pulse: true,
                    type: 'quantum_collapse',
                    weaponId: 'quantumCollapse'
                });
            }, delay);
        };
        spawnCollapse(1.0, 0);
        spawnCollapse(1.2, 300);
        spawnCollapse(1.4, 600);
    }
    else if (w.id === 'aegisMatrix') {
        // Evolves from shieldBubble whose mastered color is gold (#ffd700).
        // Was green — broke the parent-color inheritance rule (Hugo audit 2026-05-12).
        engine.addParticle(engine.player.x, engine.player.y, '#ffd700', 12, 'circle', 2 * area, { speed: 300 });
        engine.projectiles.push({
            x: engine.player.x, y: engine.player.y,
            vx: 0, vy: 0,
            radius: capVisualRadius('aegisMatrix', 120 * area),
            damage: dmg,
            pierce: 999,
            life: 2.5,
            color: '#ffd700',
            isAoe: true,
            pushback: 300,
            isMastered: true,
            weaponId: 'aegisMatrix',
            type: 'aegis_matrix'
        });
        // Retaliation missiles — described in WEAPONS.aegisMatrix.desc but were never
        // implemented. Fires homing-style missiles at the nearest enemies in range
        // (bug reported by Hugo 2026-05-06). Count scales with weapon level.
        const missileCount = 4 + Math.floor(w.level / 2);
        const targets = engine.enemies
            .map(e => ({ e, d: Math.hypot(e.x - engine.player.x, e.y - engine.player.y) }))
            .filter(t => t.d < 600 * area)
            .sort((a, b) => a.d - b.d)
            .slice(0, missileCount);
        for (let i = 0; i < missileCount; i++) {
            const target = targets[i % Math.max(1, targets.length)];
            const a = target
                ? Math.atan2(target.e.y - engine.player.y, target.e.x - engine.player.x)
                : (Math.PI * 2 / missileCount) * i;
            engine.projectiles.push({
                x: engine.player.x, y: engine.player.y,
                vx: Math.cos(a) * 350 * engine.player.projSpeedMult,
                vy: Math.sin(a) * 350 * engine.player.projSpeedMult,
                radius: 6, damage: dmg * 0.6, pierce: 1, life: 2.0,
                color: '#ffd700', type: 'missile', weaponId: 'aegisMatrix'
            });
        }
    }
    else if (w.id === 'bouncingBlade') {
        const count = isMastered ? 3 : 1;
        for (let i = 0; i < count; i++) {
            let angle = Math.random() * Math.PI * 2;
            engine.projectiles.push({
                x: engine.player.x, y: engine.player.y,
                vx: Math.cos(angle) * 400 * engine.player.projSpeedMult,
                vy: Math.sin(angle) * 400 * engine.player.projSpeedMult,
                radius: 15 * area,
                damage: dmg,
                pierce: 999,
                chainCount: isMastered ? 8 : 4,
                life: 4,
                color: isMastered ? '#c0c0c0' : '#888888',
                weaponId: 'bouncingBlade',
                type: 'buzzsaw',
                rotation: 0,
                rotSpeed: 15
            });
        }
    }
    else if (w.id === 'buzzsawSwarm') {
        const count = 3 + Math.floor(w.level / 2);
        for (let i = 0; i < count; i++) {
            let angle = (Math.PI * 2 / count) * i;
            engine.projectiles.push({
                x: engine.player.x, y: engine.player.y,
                vx: Math.cos(angle) * 600 * engine.player.projSpeedMult,
                vy: Math.sin(angle) * 600 * engine.player.projSpeedMult,
                radius: 25 * area,
                damage: dmg,
                pierce: 999,
                chainCount: 15,
                life: 6,
                // Description says "Multiple massive BLADES that ricochet wildly" — the base
                // Ricochet Blade is metallic silver, so the evolution should be a brighter
                // chrome/steel, not red flames (Hugo audit 2026-05-12).
                color: '#e0e0e0',
                weaponId: 'buzzsawSwarm',
                type: 'buzzsaw',
                rotation: 0,
                rotSpeed: 25
            });
        }
    }
    else if (w.id === 'toxicCloud') {
        const baseRadius = capVisualRadius('toxicCloud', 50 * area);
        engine.projectiles.push({
            x: engine.player.x, y: engine.player.y,
            vx: 0, vy: 0,
            radius: baseRadius,
            // Mastery: cloud grows over time, capped at 2× base. Read in
            // ProjectileSystem's per-frame AoE update (Anubis bug 2026-05-11).
            baseRadius: baseRadius,
            maxRadius: baseRadius * 2,
            growthRate: isMastered ? baseRadius / (4 + w.level) : 0,
            damage: dmg * 0.4,
            pierce: 999,
            life: 4 + w.level,
            color: isMastered ? '#00ff00' : '#32cd32',
            isAoe: true,
            isMastered: isMastered,
            weaponId: 'toxicCloud',
            type: 'toxic_cloud'
        });
    }
    else if (w.id === 'venomLash') {
        engine.particleManager.particles.push({
            x: engine.player.x, y: engine.player.y,
            vx: 0, vy: 0, life: 0.25, maxLife: 0.25,
            color: '#ffffff', tint: '#00ff88', type: 'slash', size: 80 * area, rotation: Math.random() * Math.PI * 2
        });
        engine.enemies.forEach(e => {
            if (Math.hypot(e.x - engine.player.x, e.y - engine.player.y) < 120 * area) {
                engine.damageEnemy(e, dmg, { weaponId: w.id });
                e.slowTimer = 2.0;
                if (Math.random() < 0.3) engine.addParticle(e.x, e.y, '#00ff88', 4, 'spark', 1.5);
                
                engine.projectiles.push({
                    x: e.x, y: e.y,
                    vx: 0, vy: 0,
                    radius: 30 * area,
                    damage: dmg * 0.3,
                    pierce: 999,
                    life: 2.5 + (w.level * 0.5),
                    color: '#00ff88',
                    isAoe: true,
                    type: 'toxic_cloud'
                });
            }
        });
    }

    // Apply Augments to newly created projectiles + tag with weaponId for stat tracking.
    for (let i = startIndex; i < engine.projectiles.length; i++) {
        let p = engine.projectiles[i];
        if (!p.weaponId) p.weaponId = w.id;
        if (engine.player.charAugments?.includes('neo_range')) p.life *= 1.2;
        if (engine.player.charAugments?.includes('neo_pierce') && p.pierce !== undefined) p.pierce += 1;
        if (isBeatPush && !p.isAoe) p.pushback = (p.pushback || 0) + 150;
        if (engine.player.charAugments?.includes('neo_chain') && !p.isAoe && p.pierce !== undefined) p.chainCount = 1;
    }
    
    // sky_twin: Twin Laser Array — fires every shot (was 50% RNG so it felt invisible —
    // Hugo bug 2026-05-06). Renders as TWO parallel lasers offset perpendicular to the
    // shot direction so they're clearly visible side-by-side. SYNERGY: if blaster is
    // mastered, fires 3 pairs (= 6 shots total) in a spread, matching blaster mastery's
    // 3-shot pattern.
    if (engine.player.charAugments?.includes('sky_twin')) {
        let nearest = null;
        let minDist = Infinity;
        engine.enemies.forEach(e => {
            const d = Math.hypot(e.x - engine.player.x, e.y - engine.player.y);
            if (d < minDist) { minDist = d; nearest = e; }
        });
        if (nearest) {
            const angle = Math.atan2(nearest.y - engine.player.y, nearest.x - engine.player.x);
            // 6-shot fan if blaster is mastered, otherwise 1 pair.
            const blasterMastered = getWeaponStatsAndMastery(engine.save, 'neoBlaster').isMastered;
            const pairCount = blasterMastered ? 3 : 1;
            const offset = 14; // perpendicular spacing — visibly side-by-side
            for (let i = 0; i < pairCount; i++) {
                const a = pairCount > 1 ? angle + (i - 1) * 0.18 : angle;
                const px = Math.cos(a + Math.PI / 2) * offset;
                const py = Math.sin(a + Math.PI / 2) * offset;
                for (const sign of [-1, 1]) {
                    engine.projectiles.push({
                        x: engine.player.x + px * sign,
                        y: engine.player.y + py * sign,
                        vx: Math.cos(a) * 450 * engine.player.projSpeedMult,
                        vy: Math.sin(a) * 450 * engine.player.projSpeedMult,
                        radius: 4 * area, damage: dmg * 0.45, pierce: 2, life: 1.6,
                        color: '#00D4FF', type: 'dual_laser', isMastered: blasterMastered, weaponId: 'neoBlaster'
                    });
                }
            }
        }
    }
}