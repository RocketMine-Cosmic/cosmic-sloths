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
                engine.callbacks.onGoldChange(engine.gold);
                if (nftGoldMult > 1.0 && Math.random() < 0.1) {
                    engine.addDamageText(engine.player.x, engine.player.y - 50, `NFT +${Math.round((nftGoldMult - 1) * 100)}% GOLD`, '#f59e0b');
                }
            } else if (p.type === 'fragment') {
                SFXManager.playGoldPickup();
                const nftRelicMult = engine.save.nftRelicMultiplier || 1.0;
                const fragValue = p.value || 1;
                const finalFrags = nftRelicMult > 1.0 && Math.random() < (nftRelicMult - 1.0) ? fragValue + 1 : fragValue;
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
            } else if (p.type === 'magnet_power') {
                SFXManager.playMagnetPickup();
                engine.pickups.forEach(otherP => {
                    if (otherP.type === 'xp' || otherP.type === 'gold') {
                        otherP.x = engine.player.x;
                        otherP.y = engine.player.y;
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
        if (dist < engine.player.magnetRange) {
            if (p.type !== 'nuke') {
                const playerMaxSpeed = engine.player.speed * (engine.player.speedMult || 1) * 60;
                const speed = Math.max(800, playerMaxSpeed * 2) * dt;
                p.x += ((engine.player.x - p.x) / dist) * speed;
                p.y += ((engine.player.y - p.y) / dist) * speed;
            }
        }
        return true;
    });
}