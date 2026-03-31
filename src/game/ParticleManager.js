const VFX_SPRITESHEET_URL = 'https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/83f1917f1_VFX_spritesheet.png';

const SPRITE_MAP = {
    // Row 0
    spark_1: { x: 0, y: 0, w: 64, h: 64 },
    spark_2: { x: 64, y: 0, w: 64, h: 64 },
    spark_3: { x: 128, y: 0, w: 64, h: 64 },
    smoke_1: { x: 192, y: 0, w: 64, h: 64 },
    smoke_2: { x: 256, y: 0, w: 64, h: 64 },
    // Row 1
    flash: { x: 0, y: 64, w: 64, h: 64 },
    ring: { x: 64, y: 64, w: 64, h: 64 },
    circle: { x: 128, y: 64, w: 64, h: 64 },
    slash: { x: 192, y: 64, w: 64, h: 64 },
    fragment_1: { x: 256, y: 64, w: 64, h: 64 },
    // Row 2
    fragment_2: { x: 0, y: 128, w: 64, h: 64 },
    fragment_3: { x: 64, y: 128, w: 64, h: 64 },
    implode: { x: 128, y: 128, w: 64, h: 64 },
    muzzle_flash: { x: 192, y: 128, w: 64, h: 64 },
    blood_1: { x: 256, y: 128, w: 64, h: 64 },
};

export class ParticleManager {
    constructor() {
        this.particles = [];
        this.spriteSheet = null;
        this.loadSpriteSheet();
    }

    loadSpriteSheet() {
        if (typeof window !== 'undefined') {
            this.spriteSheet = new Image();
            this.spriteSheet.src = VFX_SPRITESHEET_URL;
            this.spriteSheet.onload = () => {
                console.log("VFX Spritesheet loaded.");
            };
            this.spriteSheet.onerror = () => {
                console.error("Failed to load VFX spritesheet.");
                this.spriteSheet = null;
            };
        }
    }

    update(dt) {
        this.particles = this.particles.filter(p => {
            p.life -= dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            
            if (p.rotation !== undefined) p.rotation += (p.rotSpeed || 0) * dt;
            
            if (p.type === 'smoke') {
                p.size += dt * 15;
                p.vx *= 0.92;
                p.vy *= 0.92;
            } else if (p.type === 'spark') {
                p.vx *= 0.9;
                p.vy *= 0.9;
                if (p.gravity) p.vy += 500 * dt;
            } else if (p.type === 'shatter') {
                p.vx *= 0.95;
                p.vy *= 0.95;
                p.size *= 0.98;
                if (p.gravity) p.vy += 400 * dt;
            } else if (p.type === 'implode') {
                const dx = p.targetX - p.x;
                const dy = p.targetY - p.y;
                const dist = Math.hypot(dx, dy);
                if (dist > 5) {
                    p.vx += (dx / dist) * 1000 * dt;
                    p.vy += (dy / dist) * 1000 * dt;
                }
                p.vx *= 0.9;
                p.vy *= 0.9;
            } else if (p.type === 'shockwave') {
                p.size += p.growthRate * dt;
                p.lineWidth = Math.max(0.1, p.lineWidth - dt * 5);
            }
            
            return p.life > 0;
        });
    }

    draw(ctx) {
        if (!this.spriteSheet || !this.spriteSheet.complete) return;

        ctx.save();
        ctx.globalCompositeOperation = 'screen';

        this.particles.forEach(p => {
            if (!p.sprite) return;

            const alpha = Math.max(0, p.life / (p.maxLife || 1));
            if (alpha <= 0) return;

            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation || 0);
            ctx.globalAlpha = alpha;
            
            if (p.tint) {
                // This is a simple way to tint. For better performance, consider offscreen canvas tinting.
                ctx.globalCompositeOperation = 'source-atop';
                ctx.fillStyle = p.tint;
                ctx.fillRect(-p.size, -p.size, p.size * 2, p.size * 2);
            }

            const s = p.size || 32;
            ctx.drawImage(
                this.spriteSheet,
                p.sprite.x, p.sprite.y, p.sprite.w, p.sprite.h,
                -s / 2, -s / 2, s, s
            );
            ctx.restore();
        });

        ctx.restore();
    }

    addParticle(x, y, color, count, type = 'spark', sizeMult = 1, options = {}) {
        for (let i = 0; i < count; i++) {
            const angle = options.angle !== undefined ? options.angle + (Math.random() - 0.5) * 0.5 : Math.random() * Math.PI * 2;
            const speed = options.speed !== undefined ? options.speed : Math.random() * 150 * sizeMult + 50;

            let sprite = null;
            switch (type) {
                case 'spark':
                    sprite = SPRITE_MAP[['spark_1', 'spark_2', 'spark_3'][Math.floor(Math.random() * 3)]];
                    break;
                case 'smoke':
                    sprite = SPRITE_MAP[['smoke_1', 'smoke_2'][Math.floor(Math.random() * 2)]];
                    break;
                case 'glow':
                case 'flash':
                    sprite = SPRITE_MAP.flash;
                    break;
                case 'shatter':
                case 'fragment':
                    sprite = SPRITE_MAP[['fragment_1', 'fragment_2', 'fragment_3'][Math.floor(Math.random() * 3)]];
                    break;
                case 'slash':
                    sprite = SPRITE_MAP.slash;
                    break;
                 case 'shockwave':
                 case 'ring':
                    sprite = SPRITE_MAP.ring;
                    break;
                case 'implode':
                    sprite = SPRITE_MAP.implode;
                    break;
                case 'blood':
                     sprite = SPRITE_MAP.blood_1;
                     break;
                case 'circle':
                default:
                    sprite = SPRITE_MAP.circle;
                    break;
            }

            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: Math.random() * 0.5 + 0.3 + (options.lifeBonus || 0),
                maxLife: 0.8 + (options.lifeBonus || 0),
                tint: color, // Use for tinting the sprite
                type,
                sprite,
                size: (Math.random() * 24 + 16) * sizeMult, // Sprites are 64x64, so size is larger
                rotation: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 15,
                gravity: options.gravity || false,
                ...options
            });
        }
    }

    createExplosion(x, y, color, scale = 1, sourceId = '') {
        const id = sourceId.toLowerCase();
        // Determine theme based on entity descriptions/IDs
        const isVoid = id.includes('void') || id.includes('shadow') || id.includes('blackhole');
        const isRock = id.includes('rock') || id.includes('shard') || id.includes('titan');
        const isTech = id.includes('drone') || id.includes('gear') || id.includes('probe') || id.includes('byte') || id.includes('glitch');
        const isPlasma = id.includes('plasma') || id.includes('flare') || id.includes('nova') || id.includes('star');
        const isIce = id.includes('frost') || id.includes('cryo') || id.includes('ice');
        const isBio = id.includes('spore') || id.includes('bloom') || id.includes('virus') || id.includes('swarm');

        // Core flash
        this.addParticle(x, y, '#ffffff', 1, 'glow', 10 * scale, { lifeBonus: 0.2 });
        this.addParticle(x, y, color, 2, 'glow', 15 * scale, { lifeBonus: 0.3 });
        
        // Shockwave
        this.particles.push({
            x, y, vx: 0, vy: 0,
            life: 0.4, maxLife: 0.4,
            color: color, type: 'shockwave',
            size: 10 * scale, growthRate: 800 * scale, lineWidth: 5 * scale
        });

        if (isVoid) {
            this.addParticle(x, y, color, 40 * scale, 'circle', 2 * scale, { speed: Math.random() * 200 * scale + 50 });
            this.addParticle(x, y, '#110033', 20 * scale, 'smoke', 4 * scale, { lifeBonus: 1.0 });
            this.addParticle(x, y, '#a855f7', 10 * scale, 'glow', 3 * scale, { speed: Math.random() * 150 * scale });
        } else if (isRock) {
            this.addParticle(x, y, color, 40 * scale, 'shatter', 4 * scale, { gravity: true, speed: Math.random() * 400 * scale + 100 });
            this.addParticle(x, y, '#555555', 25 * scale, 'smoke', 4 * scale, { lifeBonus: 0.8 });
        } else if (isTech) {
            this.addParticle(x, y, color, 30 * scale, 'glitch', 3 * scale, { speed: Math.random() * 600 * scale + 100 });
            this.addParticle(x, y, '#ffffff', 20 * scale, 'spark', 2 * scale, { speed: Math.random() * 700 * scale + 200 });
            this.addParticle(x, y, color, 10 * scale, 'slash', 2 * scale, { speed: Math.random() * 400 * scale + 100 });
        } else if (isPlasma) {
            this.addParticle(x, y, color, 35 * scale, 'glow', 2 * scale, { speed: Math.random() * 400 * scale + 100 });
            this.addParticle(x, y, '#ffffff', 25 * scale, 'spark', 1.5 * scale, { speed: Math.random() * 600 * scale + 200 });
        } else if (isIce) {
            this.addParticle(x, y, color, 45 * scale, 'shatter', 2 * scale, { speed: Math.random() * 300 * scale + 50 });
            this.addParticle(x, y, '#ffffff', 25 * scale, 'circle', 1.5 * scale, { speed: Math.random() * 200 * scale + 50 });
        } else if (isBio) {
            this.addParticle(x, y, color, 30 * scale, 'circle', 2.5 * scale, { speed: Math.random() * 200 * scale + 50, lifeBonus: 0.5 });
            this.addParticle(x, y, '#22c55e', 15 * scale, 'smoke', 3 * scale, { lifeBonus: 0.5 });
        } else {
            // Default
            this.addParticle(x, y, color, 30 * scale, 'spark', 2 * scale, { gravity: true, speed: Math.random() * 400 * scale + 100 });
            this.addParticle(x, y, '#ffffff', 15 * scale, 'spark', 1.5 * scale, { gravity: true, speed: Math.random() * 500 * scale + 200 });
            this.addParticle(x, y, color, 10 * scale, 'shatter', 3 * scale, { gravity: true, speed: Math.random() * 300 * scale + 50 });
            this.addParticle(x, y, '#333333', 15 * scale, 'smoke', 3 * scale, { lifeBonus: 0.5 });
        }
    }

    createHitEffect(x, y, color, angle, scale = 1) {
        // Directional sparks
        this.addParticle(x, y, color, 10 * scale, 'spark', 1.5 * scale, { angle, speed: 300 * scale });
        this.addParticle(x, y, '#ffffff', 5 * scale, 'spark', 1 * scale, { angle, speed: 400 * scale });
        
        // Small flash
        this.addParticle(x, y, color, 1, 'glow', 5 * scale, { lifeBonus: -0.2 });
    }

    createLevelUp(x, y) {
        // Implosion followed by explosion
        for(let i=0; i<40; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 200 + Math.random() * 100;
            this.particles.push({
                x: x + Math.cos(angle) * dist,
                y: y + Math.sin(angle) * dist,
                vx: 0, vy: 0,
                targetX: x, targetY: y,
                life: 1.5, maxLife: 1.5,
                color: ['#00ffff', '#ff00ff', '#ffff00'][Math.floor(Math.random()*3)],
                type: 'implode',
                size: Math.random() * 4 + 2
            });
        }
        
        setTimeout(() => {
            this.createExplosion(x, y, '#00ffff', 2);
            this.createExplosion(x, y, '#ff00ff', 1.5);
            this.createExplosion(x, y, '#ffff00', 1);
        }, 1000);
    }

    createPickup(x, y, color) {
        this.addParticle(x, y, color, 10, 'circle', 1.5, { speed: 100 });
        this.addParticle(x, y, '#ffffff', 5, 'spark', 1, { speed: 150 });
        this.particles.push({
            x, y, vx: 0, vy: 0,
            life: 0.3, maxLife: 0.3,
            color: color, type: 'shockwave',
            size: 5, growthRate: 300, lineWidth: 2
        });
    }

    createKillEffect(x, y, effectId) {
        switch (effectId) {
            case 'explosion':
                this.addParticle(x, y, '#ff4500', 15, 'spark', 2.5, { speed: 400 });
                this.addParticle(x, y, '#ffdd00', 10, 'glow', 3, { speed: 200 });
                this.addParticle(x, y, '#333333', 5, 'smoke', 4, { lifeBonus: 0.5 });
                break;
            case 'freeze':
                this.addParticle(x, y, '#aaeeff', 20, 'shatter', 2, { speed: 300 });
                this.addParticle(x, y, '#ffffff', 10, 'spark', 1.5, { speed: 200 });
                break;
            case 'vaporize':
                this.addParticle(x, y, '#39ff14', 25, 'smoke', 3, { lifeBonus: 0.8, speed: 100 });
                this.addParticle(x, y, '#aaff00', 15, 'circle', 1.5, { speed: 150 });
                break;
            case 'implode':
                 for(let i=0; i<30; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const dist = 50 + Math.random() * 50;
                    this.particles.push({
                        x: x + Math.cos(angle) * dist, y: y + Math.sin(angle) * dist,
                        vx: 0, vy: 0,
                        targetX: x, targetY: y,
                        life: 0.6, maxLife: 0.6,
                        tint: ['#8a2be2', '#ff00ff'][i%2],
                        type: 'implode',
                        sprite: SPRITE_MAP.implode,
                        size: Math.random() * 10 + 5,
                    });
                }
                this.addParticle(x, y, '#ffffff', 1, 'shockwave', 1, { lifeBonus: -0.2, growthRate: 300, lineWidth: 5 });
                break;
            case 'golden':
                this.addParticle(x, y, '#ffd700', 20, 'spark', 3, { speed: 350, gravity: true });
                this.addParticle(x, y, '#fff4a0', 15, 'glow', 2, { speed: 200 });
                break;
        }
    }

    createTrail(x, y, trailId, frameCount) {
        const trailConfigs = {
            'fire':    { colors: ['#ff4500', '#ff8800'], type: 'spark', count: 1, size: 1.5 },
            'ice':     { colors: ['#00cfff', '#aaf0ff'], type: 'shatter', count: 1, size: 1.2 },
            'void':    { colors: ['#8a2be2', '#cc00ff'], type: 'implode', count: 1, size: 1 },
            'toxic':   { colors: ['#39ff14', '#00ff88'], type: 'smoke', count: 1, size: 2 },
            'gold':    { colors: ['#ffd700', '#ffec6e'], type: 'spark', count: 1, size: 1.8 },
            'plasma':  { colors: ['#00e5ff', '#ff00e5'], type: 'spark', count: 2, size: 1.5 },
            'shadow':  { colors: ['#333355', '#0a0a20'], type: 'smoke', count: 2, size: 2.5 },
            'rainbow': { colors: ['#ff0000', '#ff8800', '#ffff00', '#00ff00', '#0088ff', '#8800ff'], type: 'spark', count: 2, size: 1.5 },
        };
        const config = trailConfigs[trailId];
        if (config) {
            const color = config.colors[frameCount % config.colors.length];
            this.addParticle(x, y, color, config.count, config.type, config.size, { speed: 50, lifeBonus: -0.2 });
        }
    }
}