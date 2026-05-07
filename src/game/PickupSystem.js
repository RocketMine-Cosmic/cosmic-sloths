// Pickup collection + magnet logic extracted from GameEngine.
import { SFXManager } from './SFXManager';

export function updatePickups(engine, dt) {
    engine.pickups = engine.pickups.filter(p => {
        if (engine.frameCount % 10 === 0 && p.type === 'xp') {
            engine.addParticle(p.x, p.y, p.color, 1, 'glow', 0.3);
        }
        const dist = Math.hypot(engine.player.x - p.x, engine.player.y - p.y);
        if (dist < engine.player.radius + 10) {
            engine.particleManager.createPickup(p.x, p.y, p.color);
            if (p.type === 'xp') {
                SFXManager.playPickup(p.value);
                engine.xp += p.value * engine.player.xpMult;
                if (engine.xp >= engine.xpRequired && !engine.isPaused) engine.levelUp();
            } else if (p.type === 'gold') {
                const nftGoldMult = engine.save.nftGoldMultiplier || 1.0;
                const finalGold = Math.floor(p.value * engine.player.goldMult * nftGoldMult);
                SFXManager.playGoldPickup(finalGold);
                engine.gold += finalGold;
                // Endless mode: cap the in-game gold counter at the same value saveScore credits
                // (clamp(time*12, 1500, 18000)) so the HUD, the engine, and the awarded gold all match.
                // Without this, players see their gold ticker keep climbing past 18k even though only
                // 18k will be credited at run end — feels like the cap is "stealing" gold.
                if (engine.arena?.duration === Infinity) {
                    // Endless gold cap MUST match server's ENDLESS_GOLD_HARD_CEILING (10k).
                    // Otherwise HUD shows up to 18k but server only credits 10k — players
                    // see "lost" gold at run end. 12 g/sec scaling = ~14 min to hit 10k.
                    const cap = Math.min(10000, Math.max(1000, Math.floor((engine.time || 0) * 12)));
                    if (engine.gold > cap) engine.gold = cap;
                }
                engine.callbacks.onGoldChange(engine.gold);
                if (nftGoldMult > 1.0 && Math.random() < 0.1) {
                    engine.addDamageText(engine.player.x, engine.player.y - 50, `NFT +${Math.round((nftGoldMult - 1) * 100)}% GOLD`, '#f59e0b');
                }
            } else if (p.type === 'fragment') {
                SFXManager.playGoldPickup();
                const nftRelicMult = engine.save.nftRelicMultiplier || 1.0;
                const fragValue = p.value || 1;
                const finalFrags = nftRelicMult > 1.0 && Math.random() < (nftRelicMult - 1.0) ? fragValue + 1 : fragValue;
                // Accumulate per-run; the SERVER credits PlayerSave.relicFragments at run end
                // via saveScore. (Direct localStorage writes here used to be silently
                // discarded by syncSave's anti-cheat — see fix 2026-05-02.)
                engine.runFragments = (engine.runFragments || 0) + finalFrags;
                if (engine.callbacks.onFragmentFound) engine.callbacks.onFragmentFound(finalFrags);
                engine.addDamageText(engine.player.x, engine.player.y - 40, `+${finalFrags} Relic Fragment!`, '#a855f7');
            } else if (p.type === 'nuke') {
                SFXManager.playWeaponFire('novaPulse');
                engine.enemies.forEach(e => {
                    if (!e.isBoss) {
                        engine.damageEnemy(e, e.maxHp * 10);
                    }
                });
                engine.addDamageText(engine.player.x, engine.player.y - 60, `NUCLEAR DETONATION`, '#ff0000');
                engine.shake(1.0);
                // Post-nuke spawn boost: for the next 5 seconds enemies spawn at ~2× rate
                // so the empty field repopulates quickly (enemies spawn off-screen and need
                // time to close the distance). Spawn distance + enemy strength are unchanged
                // — safe for new players, satisfying for veterans.
                engine.postNukeSpawnBoostUntil = (engine.time || 0) + 5.0;
            } else if (p.type === 'magnet_power') {
                SFXManager.playMagnetPickup();
                // Flag every XP/gold pickup so the magnet block below pulls them in
                // smoothly over ~0.5s instead of teleporting them in one frame
                // (which used to look like "everything just disappeared in a flash").
                engine.pickups.forEach(otherP => {
                    if (otherP.type === 'xp' || otherP.type === 'gold') {
                        otherP.magnetSweep = true;
                    }
                });
                engine.addDamageText(engine.player.x, engine.player.y - 60, `MAGNETIC SURGE`, '#0000ff');
            } else if (p.type === 'shield_power') {
                SFXManager.playGoldPickup();
                engine.player.invincibleTimer = 10;
                engine.addDamageText(engine.player.x, engine.player.y - 60, `SHIELD OVERCHARGE`, '#ffff00');
            } else if (p.type === 'scrap') {
                SFXManager.playPickup();
                engine.characterMechanics.scrapArmor = Math.min(10, (engine.characterMechanics.scrapArmor || 0) + 0.1);
                engine.addDamageText(engine.player.x, engine.player.y - 40, `+0.1 ARMOR`, '#aaaaaa');
            }
            return false;
        }
        if (p.magnetSweep || dist < engine.player.magnetRange) {
            if (p.type !== 'nuke') {
                const playerMaxSpeed = engine.player.speed * (engine.player.speedMult || 1) * 60;
                // Magnet-sweep pickups travel ~3x faster so a screen-full collects
                // in ~0.4–0.6s — visible vacuum effect, not an instant flash.
                const baseSpeed = Math.max(800, playerMaxSpeed * 2);
                const speed = (p.magnetSweep ? baseSpeed * 3 : baseSpeed) * dt;
                p.x += ((engine.player.x - p.x) / dist) * speed;
                p.y += ((engine.player.y - p.y) / dist) * speed;
            }
        }
        return true;
    });
}