import { CHARACTERS } from './Constants';
import { SFXManager } from './SFXManager';

export function triggerSquadUltimate(engine) {
    const chars = engine.save.unlockedCharacters && engine.save.unlockedCharacters.length > 0 ? engine.save.unlockedCharacters : ['neobyte'];
    const cloneCharId = chars[Math.floor(Math.random() * chars.length)];
    const charData = CHARACTERS.find(c => c.id === cloneCharId) || CHARACTERS[0];
    
    engine.addDamageText(engine.player.x, engine.player.y - 60, "SQUAD ULTIMATE DEPLOYED!", '#a855f7');
    engine.particleManager.createExplosion(engine.player.x, engine.player.y, '#a855f7', 2.0);
    SFXManager.playLevelUp(); 
    
    let playerImage = null;
    if (charData.image) { playerImage = new Image(); playerImage.src = charData.image; }
    let idleImage = null;
    if (charData.idleSprite) { idleImage = new Image(); idleImage.src = charData.idleSprite; }
    let walkImage = null;
    if (charData.walkSprite) { walkImage = new Image(); walkImage.src = charData.walkSprite; }

    engine.squadClones = engine.squadClones || [];
    engine.squadClones.push({
        x: engine.player.x + (Math.random() - 0.5) * 100,
        y: engine.player.y + (Math.random() - 0.5) * 100,
        radius: 16,
        life: 15,
        charId: cloneCharId,
        color: charData.color,
        speed: charData.speed * 60,
        damageMult: (charData.damageMult || 1) * engine.player.damageMult * 1.5,
        image: playerImage,
        idleImage: idleImage,
        walkImage: walkImage,
        currentFrame: 0,
        frameTimer: 0,
        facingLeft: false,
        isMoving: false,
        attackTimer: 0
    });
}

export function updateSquadClones(engine, dt) {
    if (!engine.squadClones) return;
    
    engine.squadClones = engine.squadClones.filter(clone => {
        clone.life -= dt;
        
        const SPRITE_FRAMES = 25;
        const FRAME_DURATION = 1 / 12;
        clone.frameTimer += dt;
        if (clone.frameTimer >= FRAME_DURATION) {
            clone.frameTimer -= FRAME_DURATION;
            clone.currentFrame = (clone.currentFrame + 1) % SPRITE_FRAMES;
        }

        let nearest = null;
        let minDist = Infinity;
        engine.enemies.forEach(e => {
            if (e.hp <= 0) return;
            const d = Math.hypot(e.x - clone.x, e.y - clone.y);
            if (d < minDist) { minDist = d; nearest = e; }
        });
        
        if (nearest) {
            clone.isMoving = true;
            if (minDist > 100) {
                const angle = Math.atan2(nearest.y - clone.y, nearest.x - clone.x);
                clone.x += Math.cos(angle) * clone.speed * dt;
                clone.y += Math.sin(angle) * clone.speed * dt;
                clone.facingLeft = Math.cos(angle) < 0;
            } else {
                clone.isMoving = false;
            }
            
            clone.attackTimer -= dt;
            if (clone.attackTimer <= 0) {
                clone.attackTimer = 0.5;
                const angle = Math.atan2(nearest.y - clone.y, nearest.x - clone.x);
                engine.projectiles.push({
                    x: clone.x, y: clone.y,
                    vx: Math.cos(angle) * 500,
                    vy: Math.sin(angle) * 500,
                    radius: 8, damage: 30 * clone.damageMult, pierce: 3, life: 2, color: clone.color, type: 'beam'
                });
                engine.addParticle(clone.x, clone.y, clone.color, 5, 'spark', 1);
            }
        } else {
            clone.isMoving = false;
            const dToPlayer = Math.hypot(engine.player.x - clone.x, engine.player.y - clone.y);
            if (dToPlayer > 150) {
                clone.isMoving = true;
                const angle = Math.atan2(engine.player.y - clone.y, engine.player.x - clone.x);
                clone.x += Math.cos(angle) * clone.speed * dt;
                clone.y += Math.sin(angle) * clone.speed * dt;
                clone.facingLeft = Math.cos(angle) < 0;
            }
        }
        
        if (clone.life <= 0) {
            engine.addParticle(clone.x, clone.y, clone.color, 20, 'glow', 2);
        }
        
        return clone.life > 0;
    });
}