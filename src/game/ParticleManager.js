const loadTexture = (url) => {
    if (typeof window !== 'undefined') {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
            // Center crop and scale down to 128x128 for extreme performance
            ctx.drawImage(img, 0, 0, 1024, 1024, 0, 0, 128, 128);
            canvas.isReady = true;
        };
        img.src = url;
        return canvas;
    }
    return { isReady: false };
};

export class ParticleManager {
    constructor() {
        this.particles = [];
        this.textures = {
            star: loadTexture('https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/0ea8232ec_generated_image.png'),
            explosion: loadTexture('https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/d54e51f9e_generated_image.png'),
            smoke: loadTexture('https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/882cab418_generated_image.png'),
            slash: loadTexture('https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/55426dc86_generated_image.png'),
            shockwave: loadTexture('https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/371ac242b_generated_image.png'),
        };
    }

    update(dt) {
        // Hard cap to prevent spiral lag, stricter for mobile optimization
        if (this.particles.length > 350) {
            this.particles.splice(0, this.particles.length - 350);
        }
        this.particles = this.particles.filter(p => {
            p.life -= dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;

            if (p.rotation !== undefined) p.rotation += (p.rotSpeed || 0) * dt;

            if (p.type === 'smoke') {
                p.size += dt * 20;
                p.vx *= 0.90;
                p.vy *= 0.90;
            } else if (p.type === 'star' || p.type === 'spark') {
                p.vx *= 0.88;
                p.vy *= 0.88;
                if (p.gravity) p.vy += 500 * dt;
            } else if (p.type === 'fragment' || p.type === 'shatter') {
                p.vx *= 0.93;
                p.vy *= 0.93;
                p.size *= 0.98;
                if (p.gravity) p.vy += 400 * dt;
            } else if (p.type === 'implode' || p.type === 'imploding_star') {
                const dx = p.targetX - p.x;
                const dy = p.targetY - p.y;
                const dist = Math.hypot(dx, dy);
                if (dist > 5) {
                    p.vx += (dx / dist) * 1200 * dt;
                    p.vy += (dy / dist) * 1200 * dt;
                }
                p.vx *= 0.88;
                p.vy *= 0.88;
            } else if (p.type === 'shockwave') {
                p.size += (p.growthRate || 400) * dt;
                p.lineWidth = Math.max(0.1, (p.lineWidth || 4) - dt * 8);
            } else if (p.type === 'flame') {
                p.vx *= 0.92;
                p.vy *= 0.92;
                p.vy -= 60 * dt; // flames rise
                p.size += dt * 10;
            }

            return p.life > 0;
        });
    }

    draw(ctx, camX, camY, vWidth, vHeight) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';

        this.particles.forEach(p => {
            const size = p.size || 8;
            const alpha = Math.max(0, p.life / (p.maxLife || 1));
            if (alpha <= 0) return;

            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation || 0);

            const color = p.color || p.tint || '#ffffff';
            const sBase = p.size || 8;

            // DRAW BASE TINT (colorize the HD texture below)
            ctx.globalAlpha = alpha * 0.15;
            const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, sBase * 2);
            grad.addColorStop(0, color);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, sBase * 2, 0, Math.PI * 2);
            ctx.fill();

            ctx.globalAlpha = alpha;

            // DRAW HD TEXTURE
            let tex = null;
            let scaleMult = 1.5;

            if (p.type === 'star' || p.type === 'spark' || p.type === 'imploding_star' || p.type === 'blood' || p.type === 'flame') { tex = this.textures.star; scaleMult = 2.0; }
            else if (p.type === 'explosion' || p.type === 'flash') { tex = this.textures.explosion; scaleMult = 2.2; }
            else if (p.type === 'smoke') { tex = this.textures.smoke; scaleMult = 2.2; }
            else if (p.type === 'slash') { tex = this.textures.slash; scaleMult = 2.5; }
            else if (p.type === 'shockwave' || p.type === 'implode') { tex = this.textures.shockwave; scaleMult = 1.8; }
            
            // For simple geometry fallback
            if (!tex || !tex.isReady) {
                switch (p.type) {
                    case 'circle':
                    case 'ring':
                    case 'shockwave':
                        ctx.strokeStyle = color;
                        ctx.lineWidth = p.lineWidth || 2;
                        ctx.beginPath();
                        ctx.arc(0, 0, sBase * 0.5, 0, Math.PI * 2);
                        ctx.stroke();
                        break;
                    case 'slash':
                        ctx.strokeStyle = color;
                        ctx.lineWidth = 3;
                        ctx.beginPath();
                        ctx.moveTo(-sBase * 0.5, -sBase * 0.2);
                        ctx.lineTo(sBase * 0.5, sBase * 0.2);
                        ctx.stroke();
                        break;
                    default:
                        ctx.fillStyle = color;
                        ctx.beginPath();
                        ctx.arc(0, 0, sBase * 0.5, 0, Math.PI * 2);
                        ctx.fill();
                }
            } else {
                const ts = sBase * scaleMult; 
                ctx.drawImage(tex, -ts/2, -ts/2, ts, ts);
                
                // Add a small solid core for impact
                if (p.type === 'star' || p.type === 'explosion' || p.type === 'flash') {
                    ctx.globalAlpha = alpha * 0.8;
                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath();
                    ctx.arc(0, 0, sBase * 0.2, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            ctx.restore();
        });

        ctx.restore();
    }

    addParticle(x, y, color, count, type = 'star', sizeMult = 1, options = {}) {
        for (let i = 0; i < count; i++) {
            const angle = options.angle !== undefined ? options.angle + (Math.random() - 0.5) * 0.8 : Math.random() * Math.PI * 2;
            const speed = options.speed !== undefined ? options.speed * (0.7 + Math.random() * 0.6) : Math.random() * 150 * sizeMult + 50;

            const lifeBase = Math.random() * 0.5 + 0.3 + (options.lifeBonus || 0);
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: lifeBase,
                maxLife: lifeBase,
                color,
                tint: color,
                type,
                size: (Math.random() * 24 + 12) * sizeMult,
                rotation: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 12,
                gravity: options.gravity || false,
                lineWidth: options.lineWidth,
                growthRate: options.growthRate,
                ...options
            });
        }
    }

    createExplosion(x, y, color, scale = 1, sourceId = '') {
        const s = Math.min(scale, 2);
        this.addParticle(x, y, color, 12 * s, 'spark', 2 * s, { speed: 300 * s });
        this.addParticle(x, y, '#ffffff', 8 * s, 'star', 1.5 * s, { speed: 400 * s });
    }

    createHitEffect(x, y, color, angle, scale = 1) {
        this.addParticle(x, y, color, 4, 'spark', 1.2 * scale, { angle, speed: 260 * scale });
        this.addParticle(x, y, '#ffffff', 2, 'spark', 0.8 * scale, { angle, speed: 360 * scale });
    }

    createLevelUp(x, y) {
        // Clean and vibrant sparks only
        this.addParticle(x, y, '#00e5ff', 20, 'spark', 2.5, { speed: 450 });
        this.addParticle(x, y, '#ff00e5', 20, 'spark', 2.0, { speed: 350 });
        this.addParticle(x, y, '#ffff00', 20, 'spark', 2.5, { speed: 300 });
    }

    createPickup(x, y, color) {
        this.addParticle(x, y, color, 6, 'spark', 1.5, { speed: 120 });
    }

    createKillEffect(x, y, effectId) {
        switch (effectId) {
            case 'explosion':
                this.addParticle(x, y, '#ff4500', 8, 'spark', 1.5, { speed: 250 });
                this.addParticle(x, y, '#ffdd00', 4, 'spark', 1.5, { speed: 150 });
                break;
            case 'pixel_burst':
                this.addParticle(x, y, '#00ffff', 8, 'spark', 1.8, { speed: 350 });
                this.addParticle(x, y, '#ff00ff', 8, 'spark', 1.5, { speed: 250 });
                break;
            case 'blood_splatter':
                this.addParticle(x, y, '#ff0000', 12, 'spark', 2.0, { speed: 300 });
                break;
            case 'black_hole':
                this.addParticle(x, y, '#4b0082', 15, 'spark', 2.0, { speed: 200 });
                break;
            case 'freeze':
                this.addParticle(x, y, '#aaeeff', 10, 'spark', 1.5, { speed: 220 });
                break;
            case 'vaporize':
                this.addParticle(x, y, '#39ff14', 10, 'spark', 1.8, { speed: 150 });
                break;
            case 'implode':
                this.addParticle(x, y, '#8a2be2', 10, 'spark', 1.5, { speed: 200 });
                break;
            case 'golden':
                this.addParticle(x, y, '#ffd700', 10, 'spark', 1.8, { speed: 200 });
                break;
        }
    }

    createTrail(x, y, trailId, frameCount) {
        const trailConfigs = {
            'fire':    { colors: ['#ff4500', '#ff7700', '#ffaa00'], type: 'spark', count: 2, size: 1.4 },
            'ice':     { colors: ['#00cfff', '#aaf0ff', '#ffffff'], type: 'spark', count: 1, size: 1.0 },
            'void':    { colors: ['#8a2be2', '#6600cc', '#cc00ff'], type: 'spark', count: 1, size: 1.1 },
            'toxic':   { colors: ['#39ff14', '#00ff88', '#aaff00'], type: 'spark', count: 1, size: 2.0 },
            'gold':    { colors: ['#ffd700', '#ffec6e', '#fff4a0'], type: 'star', count: 1, size: 1.6 },
            'plasma':  { colors: ['#00e5ff', '#ff00e5', '#ffffff'], type: 'star', count: 2, size: 1.3 },
            'shadow':  { colors: ['#222244', '#333355', '#0a0a20'], type: 'spark', count: 2, size: 2.2 },
            'blood':   { colors: ['#8a0303', '#ff0000', '#5c0000'], type: 'circle', count: 2, size: 1.5 },
            'pixel':   { colors: ['#00ffcc', '#ff00ff', '#ffff00'], type: 'slash', count: 1, size: 1.2 },
            'nebula':  { colors: ['#ff99cc', '#cc99ff', '#99ccff'], type: 'star', count: 2, size: 1.5 },
            'rainbow': { colors: ['#ff0000', '#ff8800', '#ffff00', '#00ff00', '#0088ff', '#8800ff'], type: 'star', count: 2, size: 1.4 },
        };
        const config = trailConfigs[trailId];
        if (config) {
            const color = config.colors[frameCount % config.colors.length];
            this.addParticle(x, y, color, config.count, config.type, config.size, { speed: 20, lifeBonus: 0.6 });
        }
    }
}