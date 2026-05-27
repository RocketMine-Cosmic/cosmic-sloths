// Enemy spawning + boss spawning logic extracted from GameEngine.
import { ENEMIES, ARENAS, QUANTUM_METEOR_SPRITE } from './Constants';
import { SFXManager } from './SFXManager';
import { selectBossForArena } from './BossSystem';

// Lazy-load the meteor sprite sheet exactly once per session (shared across runs).
let _meteorSpriteImage = null;
function getMeteorSpriteImage() {
    if (typeof window === 'undefined') return null;
    if (_meteorSpriteImage) return _meteorSpriteImage;
    _meteorSpriteImage = new Image();
    _meteorSpriteImage.src = QUANTUM_METEOR_SPRITE.url;
    return _meteorSpriteImage;
}

export function spawnEnemies(engine, dt) {
    // ─── SQUAD METEOR ARENA ─────────────────────────────────────────────────
    // Single stationary target — no mob spawns, no boss spawns. Spawned once
    // on first tick, sits dead-centre near the player, animates via the
    // existing EnemyRenderer (16-frame sprite sheet). Has a huge HP pool that
    // can't actually be killed in-run (clamped at 1 HP); the run-end submit
    // is what applies damage to the cloud-side meteor.
    if (engine.arena.id === 'quantum_meteor') {
        if (!engine.meteorSpawned) {
            engine.meteorSpawned = true;
            const sprite = getMeteorSpriteImage();
            const meteor = {
                id: 'squad_meteor_target',
                name: 'Squad Meteor',
                x: engine.player.x,
                y: engine.player.y - 220,
                radius: 220,
                hp: 1e15,                 // effectively immortal — server-side meteor is what matters
                maxHp: 1e15,
                damage: 0,                // doesn't deal contact damage
                speed: 0,                 // stationary
                color: '#f59e0b',
                xp: 0,                    // no XP from hits — leveling is from time/sub-spawns... but we skip those
                tier: 0,
                isSquadMeteor: true,
                isStationary: true,
                isWorldBoss: true,        // reuse the world-boss damage-text/buffer rendering pipeline + immortality clamp
                spriteImage: sprite,
                frameCount: QUANTUM_METEOR_SPRITE.frameCount,
                animationSpeed: QUANTUM_METEOR_SPRITE.animationSpeed,
                // Custom flag — EnemyAI checks this to skip movement and contact damage.
                _isMeteorTarget: true,
            };
            engine.enemies.push(meteor);
            engine.encounteredEnemies.add(meteor.id);
            engine.addDamageText(engine.player.x, engine.player.y - 80, 'SQUAD METEOR — DEAL DAMAGE!', '#f59e0b');
        }
        return;
    }

    if (engine.arena.id === 'world_boss_arena') {
        if (!engine.worldBossSpawned) {
            engine.worldBossSpawned = true;
            const baseMap = {'world_boss_0': 'boss_nebula_devourer', 'world_boss_1': 'boss_plasma_kraken', 'world_boss_2': 'boss_stellar_colossus', 'world_boss_3': 'boss_cosmic_wyrm'};
            const baseBossTemplate = ENEMIES.find(e => e.id === (baseMap[engine.worldBossId] || 'boss_nebula_devourer'));
            // Use cloud HP so the in-game bar reflects the real global boss state.
            // Phase transitions for the world boss are TIME-based (see BossSystem.js)
            // instead of HP-based — otherwise late joiners would spawn straight into
            // Phase 3 frenzy because cloud current_hp is already low.
            const cloudMax = engine.save?.worldBossCloudMaxHp;
            const cloudCur = engine.save?.worldBossCloudCurrentHp;
            const maxHp = (typeof cloudMax === 'number' && cloudMax > 0) ? cloudMax : 50000000;
            const curHp = (typeof cloudCur === 'number' && cloudCur > 0) ? cloudCur : maxHp;
            const boss = {
                ...baseBossTemplate, id: 'world_boss', name: engine.worldBossName, hp: curHp, maxHp: maxHp, damage: 50 * engine.difficulty.enemyDmgMult, isBoss: true, isWorldBoss: true, originalBossId: baseBossTemplate.id
            };
            const angle = Math.random() * Math.PI * 2;
            const dist = 600;
            boss.x = engine.player.x + Math.cos(angle) * dist;
            boss.y = engine.player.y + Math.sin(angle) * dist;
            engine.enemies.push(boss);
            engine.isBossActive = true;
            engine.addDamageText(engine.player.x, engine.player.y - 60, `WARNING: WORLD BOSS DETECTED!`, '#ff0000');
            SFXManager.playBossSpawn();
        }
        return;
    }

    if (engine.arena.duration === Infinity) {
        if (!engine.lastBossSpawnTime) engine.lastBossSpawnTime = 0;
        // Don't spawn a new boss while one is still alive — wait until the current
        // fight ends, then start the 180s timer fresh from that point.
        if (engine.isBossActive) {
            engine.lastBossSpawnTime = engine.time;
        } else if (engine.time > 0 && engine.time - engine.lastBossSpawnTime >= 180) {
            engine.lastBossSpawnTime = engine.time;
            const boss = selectBossForArena(engine.arena.id);
            if (boss) {
                engine.isBossActive = true;
                engine.enemies = [];
                const angle = Math.random() * Math.PI * 2;
                // Clamp at 900 game units so fullscreen monitors don't get punished
                // with long travel times. Matches ~1440px viewport at default zoom.
                const dist = Math.min(900, Math.max(engine.canvas.width / engine.zoom, engine.canvas.height / engine.zoom) / 2 + 50);
                const ex = engine.player.x + Math.cos(angle) * dist;
                const ey = engine.player.y + Math.sin(angle) * dist;
                const progress = engine.time / 300;
                const bossHpMult = 1.0 * engine.difficulty.enemyHpMult * (1.0 + progress * 0.5) * (engine.bossModifiers.hide ? 1.5 : 1.0);
                const bossDmgMult = 1.0 * engine.difficulty.enemyDmgMult * (1.0 + progress * 0.5) * (engine.bossModifiers.fury ? 1.3 : 1.0);
                const speedMult = engine.bossModifiers.frenzy ? 1.3 : 1.0;
                engine.enemies.push({ ...boss, x: ex, y: ey, maxHp: boss.hp * bossHpMult, hp: boss.hp * bossHpMult, damage: boss.damage * bossDmgMult, speedMult });
                engine.encounteredEnemies.add(boss.id);
                engine.addDamageText(engine.player.x, engine.player.y - 60, `WARNING: ${boss.name} APPROACHING!`, '#ff0000');
                SFXManager.playBossSpawn();
            }
        }
    } else if (engine.time >= engine.arena.duration - 30 && !engine.bossSpawned) {
        engine.bossSpawned = true;

        const arenaIndex = ARENAS.findIndex(a => a.id === engine.arena.id);
        const isBossArena = [1, 3, 5, 7, 9].includes(arenaIndex);

        if (isBossArena) {
            engine.isBossActive = true;
            engine.enemies = [];
            const boss = selectBossForArena(engine.arena.id);
            if (boss) {
                const angle = Math.random() * Math.PI * 2;
                // Clamp — see endless boss spawn above for rationale.
                const dist = Math.min(900, Math.max(engine.canvas.width / engine.zoom, engine.canvas.height / engine.zoom) / 2 + 50);
                const ex = engine.player.x + Math.cos(angle) * dist;
                const ey = engine.player.y + Math.sin(angle) * dist;

                const sectorDifficultyScale = Math.pow(1.15, arenaIndex);

                const bossHpMult = 1.0 * engine.difficulty.enemyHpMult * (engine.bossModifiers.hide ? 1.5 : 1.0) * sectorDifficultyScale;
                const bossDmgMult = 1.0 * engine.difficulty.enemyDmgMult * (engine.bossModifiers.fury ? 1.3 : 1.0) * sectorDifficultyScale;
                const speedMult = engine.bossModifiers.frenzy ? 1.3 : 1.0;
                engine.enemies.push({ ...boss, x: ex, y: ey, maxHp: boss.hp * bossHpMult, hp: boss.hp * bossHpMult, damage: boss.damage * bossDmgMult, speedMult });
                engine.encounteredEnemies.add(boss.id);
                engine.addDamageText(engine.player.x, engine.player.y - 60, `WARNING: ${boss.name} APPROACHING!`, '#ff0000');
                SFXManager.playBossSpawn();
            }
        }
    }

    if (engine.isBossActive) return;
    // Sector boss has been defeated — stop spawning mobs entirely (the run is
    // about to end via the victory check). Was previously letting mobs keep
    // spawning during the 3s post-boss grace, which players could exploit for
    // extra kills/gold/score after the boss was already down.
    if (engine.sectorBossDefeated) return;

    const progress = engine.arena.duration === Infinity ? engine.time / 300 : Math.min(1, engine.time / engine.arena.duration);
    const effectiveProgress = Math.min(1, progress);
    const dynamicRate = engine.envModifiers.enemySpawnRate * (engine.dynamicDifficulty?.spawnRateMult || 1.0);
    let spawnRate = Math.max(0.05, (1.2 - (1.1 * Math.pow(effectiveProgress, 1.5))) / dynamicRate);

    // Post-nuke spawn boost — halve the spawn interval (≈ 2× rate) for ~5s after a nuke
    // so the wiped field repopulates fast. Set in PickupSystem when a nuke is collected.
    if (engine.postNukeSpawnBoostUntil && engine.time < engine.postNukeSpawnBoostUntil) {
        spawnRate *= 0.5;
    }

    // End-of-run grace: in the final 30 seconds of a sector run, ramp spawn rate down
    // so players can't farm kills/gold by hugging the timer. Endless skips this (no end).
    // For non-boss sectors there's nothing else to slow the wave; for boss sectors the
    // boss spawn at duration-30 already returns early via isBossActive — this is a no-op there.
    if (engine.arena.duration !== Infinity) {
        const timeLeft = engine.arena.duration - engine.time;
        if (timeLeft < 30) {
            // Ramp from 1× at 30s left → 6× spawn interval (≈ 1/6 spawn rate) at 0s left.
            const taper = Math.max(0, timeLeft / 30); // 1 → 0
            const slowdown = 1 + (1 - taper) * 5;     // 1 → 6
            spawnRate = spawnRate * slowdown;
        }
    }

    if (Math.random() < dt / spawnRate) {
        const angle = Math.random() * Math.PI * 2;
        // Clamp mob spawn distance at 900 game units — fullscreen monitors
        // were previously getting up to 1600u spawn radius, which doubled
        // travel time vs. windowed play and hurt finish scores.
        const dist = Math.min(900, Math.max(engine.canvas.width / engine.zoom, engine.canvas.height / engine.zoom) / 2 + 50);
        const ex = engine.player.x + Math.cos(angle) * dist;
        const ey = engine.player.y + Math.sin(angle) * dist;

        const isEndless = engine.arena.duration === Infinity;
        // Endless: smoother continuous tier growth instead of stair-step jumps every 60s.
        const arenaIndex = isEndless ? Math.min(9, progress * 4) : ARENAS.findIndex(a => a.id === engine.arena.id);
        let minTier = Math.max(1, Math.floor(arenaIndex));
        let maxTier = Math.floor(arenaIndex) + 1;

        if (effectiveProgress > 0.33) maxTier += 1;
        if (effectiveProgress > 0.66) maxTier += 1;
        if (isEndless) maxTier += Math.floor(progress * 2);

        maxTier = Math.min(10, maxTier);

        let availableEnemies = ENEMIES.filter(e =>
            !e.isBoss &&
            e.tier >= minTier && e.tier <= maxTier
        );

        if (availableEnemies.length === 0) {
            availableEnemies = ENEMIES.filter(e => !e.isBoss && e.tier === 1);
        }

        const type = availableEnemies[Math.floor(Math.random() * availableEnemies.length)];

        // Endless uses a gentler sector scale (1.12) to avoid the huge jump after the first boss.
        // Normal arenas keep the original 1.2 curve.
        const sectorBase = isEndless ? 1.12 : 1.2;
        const sectorDifficultyScale = Math.pow(sectorBase, arenaIndex);

        const hpMult = (1.0 + (2.1 * Math.pow(progress, 1.6))) * engine.difficulty.enemyHpMult * sectorDifficultyScale;
        const dmgMult = (1.0 + (1.6 * Math.pow(progress, 1.4))) * engine.difficulty.enemyDmgMult * sectorDifficultyScale;
        const spdMult = engine.difficulty.speedMult || 1.0;

        // S6+ Option 3: when DD has ramped UP (player is stomping), boost elite
        // spawn chance proportionally. Caps cleanly with DD's own 2.0× ceiling.
        // Gives strong players a visible "in the zone" reward — more elites =
        // more XP (elite ×4) = more levels = more level² score. S5 unchanged.
        const ddMult = engine.dynamicDifficulty?.spawnRateMult || 1.0;
        const eliteDDBoost = (engine._isS6 && ddMult > 1.0) ? ddMult : 1.0;
        if (engine.time > 60 && Math.random() < (0.01 + (progress * 0.04)) * eliteDDBoost) {
            const eliteMin = Math.min(9, Math.max(2, maxTier + 1));
            const elites = ENEMIES.filter(e => !e.isBoss && e.tier >= eliteMin);
            if (elites.length > 0) {
                const elite = elites[Math.floor(Math.random() * elites.length)];
                let newElite = engine.enemyPool.length > 0 ? engine.enemyPool.pop() : {};
                Object.assign(newElite, elite);
                newElite.x = ex; newElite.y = ey;
                newElite.maxHp = elite.hp * hpMult * 2.5;
                newElite.hp = newElite.maxHp;
                newElite.damage = elite.damage * dmgMult * 1.5;
                newElite.radius = elite.radius * 1.4;
                newElite.speed = elite.speed * 1.2 * spdMult;
                newElite.xp = elite.xp * 4;
                newElite.isElite = true;
                newElite.eliteGoldBonus = 2;

                engine.enemies.push(newElite);
                engine.encounteredEnemies.add(elite.id);
                SFXManager.playEnemySpawn();
                return;
            }
        }

        let newEnemy = engine.enemyPool.length > 0 ? engine.enemyPool.pop() : {};
        Object.assign(newEnemy, type);
        newEnemy.x = ex; newEnemy.y = ey;
        newEnemy.speed = type.speed * spdMult;
        newEnemy.maxHp = type.hp * hpMult;
        newEnemy.hp = newEnemy.maxHp;
        newEnemy.damage = type.damage * dmgMult;

        engine.enemies.push(newEnemy);
        engine.encounteredEnemies.add(type.id);
    }
}