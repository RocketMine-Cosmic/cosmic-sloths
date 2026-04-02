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
            star: loadTexture('https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/ca0a76494_generated_image.png'),
            explosion: loadTexture('https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/86d44852a_generated_image.png'),
            smoke: loadTexture('https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/ef136da01_generated_image.png'),
            slash: loadTexture('https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/d5b11e804_generated_image.png'),
            shockwave: loadTexture('https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/b8eb9bf39_generated_image.png'),
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
            if (camX !== undefined && (p.x + size * 4 < camX || p.x - size * 4 > camX + vWidth || p.y + size * 4 < camY || p.y - size * 4 > camY + vHeight)) return;
            const alpha = Math.max(0, p.life / (p.maxLife || 1));
            if (alpha <= 0) return;

            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation || 0);

            const color = p.color || p.tint || '#ffffff';
            const sBase = p.size || 8;

            // DRAW BASE TINT (colorize the HD texture below)
            ctx.globalAlpha = alpha * 0.7;
            const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, sBase * 2.5);
            grad.addColorStop(0, color);
            grad.addColorStop(0.4, color);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, sBase * 2.5, 0, Math.PI * 2);
            ctx.fill();

            ctx.globalAlpha = alpha;

            // DRAW HD TEXTURE
            let tex = null;
            let scaleMult = 1.5;

            if (p.type === 'star' || p.type === 'spark' || p.type === 'imploding_star') { tex = this.textures.star; scaleMult = 2.0; }
            else if (p.type === 'explosion' || p.type === 'flash') { tex = this.textures.explosion; scaleMult = 2.2; }
            else if (p.type === 'smoke' || p.type === 'blood' || p.type === 'flame') { tex = this.textures.smoke; scaleMult = 2.2; }
            else if (p.type === 'slash') { tex = this.textures.slash; scaleMult = 2.5; }
            else if (p.type === 'shockwave' || p.type === 'implode') { tex = this.textures.shockwave; scaleMult = 1.8; }
            
            // For simple geometry fallback
            if (!tex || !tex.isReady) {
                switch (p.type) {
                    case 'circle':
                    case 'ring':
                    case 'shockwave':
                        ctx.strokeStyle = color;
                        ctx.lineWidth = p.lineWidth || 3;
                        ctx.beginPath();
                        ctx.arc(0, 0, sBase * 0.8, 0, Math.PI * 2);
                        ctx.stroke();
                        break;
                    case 'slash':
                        ctx.strokeStyle = color;
                        ctx.lineWidth = 4;
                        ctx.beginPath();
                        ctx.moveTo(-sBase * 0.8, -sBase * 0.3);
                        ctx.lineTo(sBase * 0.8, sBase * 0.3);
                        ctx.stroke();
                        break;
                    default:
                        ctx.fillStyle = color;
                        ctx.beginPath();
                        ctx.arc(0, 0, sBase * 0.8, 0, Math.PI * 2);
                        ctx.fill();
                }
            } else {
                const ts = sBase * scaleMult; 
                ctx.drawImage(tex, -ts/2, -ts/2, ts, ts);
                
                // Add a small solid core for impact
                if (p.type === 'star' || p.type === 'explosion' || p.type === 'flash') {
                    ctx.globalAlpha = alpha * 1.0;
                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath();
                    ctx.arc(0, 0, sBase * 0.35, 0, Math.PI * 2);
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
        const id = sourceId.toLowerCase();
        const isVoid = id.includes('void') || id.includes('shadow') || id.includes('blackhole');
        const isRock = id.includes('rock') || id.includes('shard') || id.includes('titan');
        const isTech = id.includes('drone') || id.includes('gear') || id.includes('probe') || id.includes('byte') || id.includes('glitch');
        const isPlasma = id.includes('plasma') || id.includes('flare') || id.includes('nova') || id.includes('star');
        const isIce = id.includes('frost') || id.includes('cryo') || id.includes('ice');
        const isBio = id.includes('spore') || id.includes('bloom') || id.includes('virus') || id.includes('swarm');

        const s = Math.min(scale, 2.5); // cap scale to limit particle count

        // Core flash + shockwave
        this.addParticle(x, y, '#ffffff', 1, 'flash', 10 * s, { lifeBonus: 0.2, speed: 0 });
        this.particles.push({
            x, y, vx: 0, vy: 0,
            life: 0.4, maxLife: 0.4,
            color, tint: color, type: 'shockwave',
            size: 15 * s, growthRate: 800 * s, lineWidth: 6 * s
        });

        if (isVoid) {
            this.addParticle(x, y, color, 12 * s, 'implode', 3 * s, { speed: 250 * s });
            this.addParticle(x, y, '#ff00ff', 6 * s, 'star', 2 * s, { lifeBonus: 0.2, speed: 300 * s });
        } else if (isRock) {
            this.addParticle(x, y, color, 15 * s, 'fragment', 4 * s, { gravity: true, speed: 450 * s });
            this.addParticle(x, y, '#ffaa00', 8 * s, 'star', 2 * s, { lifeBonus: 0.4, speed: 400 * s });
        } else if (isTech) {
            this.addParticle(x, y, color, 12 * s, 'slash', 3 * s, { speed: 600 * s });
            this.addParticle(x, y, '#00ffff', 10 * s, 'star', 2 * s, { speed: 700 * s });
        } else if (isPlasma) {
            this.addParticle(x, y, color, 12 * s, 'explosion', 3 * s, { speed: 450 * s });
            this.addParticle(x, y, '#ffffff', 10 * s, 'star', 2 * s, { speed: 600 * s });
        } else if (isIce) {
            this.addParticle(x, y, color, 16 * s, 'fragment', 3 * s, { speed: 350 * s });
            this.addParticle(x, y, '#00ffff', 10 * s, 'star', 1.5 * s, { speed: 250 * s });
        } else if (isBio) {
            this.addParticle(x, y, color, 12 * s, 'smoke', 3 * s, { speed: 200 * s, lifeBonus: 0.6 });
            this.addParticle(x, y, '#39ff14', 8 * s, 'blood', 3 * s, { gravity: true, speed: 300 * s });
        } else {
            this.addParticle(x, y, color, 10 * s, 'explosion', 3 * s, { gravity: true, speed: 420 * s });
            this.addParticle(x, y, '#ffffff', 8 * s, 'star', 2 * s, { gravity: true, speed: 520 * s });
        }
    }

    createHitEffect(x, y, color, angle, scale = 1) {
        this.addParticle(x, y, color, 6, 'star', 1.5 * scale, { angle, speed: 350 * scale });
        this.addParticle(x, y, '#ffffff', 4, 'star', 1.0 * scale, { angle, speed: 450 * scale });
        this.addParticle(x, y, color, 1, 'flash', 2.0 * scale, { speed: 0 });
    }

    createLevelUp(x, y) {
        // Star implosions
        for (let i = 0; i < 25; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 200 + Math.random() * 100;
            const c = ['#00ffff', '#ff00ff', '#ffff00'][Math.floor(Math.random() * 3)];
            this.particles.push({
                x: x + Math.cos(angle) * dist,
                y: y + Math.sin(angle) * dist,
                vx: 0, vy: 0,
                targetX: x, targetY: y,
                life: 1.0, maxLife: 1.0,
                color: c, tint: c,
                type: 'imploding_star',
                size: Math.random() * 20 + 10,
                rotation: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 12
            });
        }
        
        // Initial flash to build anticipation
        this.addParticle(x, y, '#ffffff', 1, 'flash', 16, { lifeBonus: 0.3, speed: 0 });

        setTimeout(() => {
            // Huge radiant burst
            this.addParticle(x, y, '#ffffff', 2, 'flash', 20, { lifeBonus: 0.4, speed: 0 });
            this.addParticle(x, y, '#00ffff', 15, 'star', 3.5, { speed: 600 });
            this.addParticle(x, y, '#ff00ff', 15, 'star', 3.0, { speed: 500 });
            this.addParticle(x, y, '#ffff00', 10, 'explosion', 2.5, { speed: 300 });
            this.particles.push({ x, y, vx: 0, vy: 0, life: 0.5, maxLife: 0.5, color: '#00ffff', tint: '#00ffff', type: 'shockwave', size: 15, growthRate: 1000, lineWidth: 8 });
        }, 850);
    }

    createPickup(x, y, color) {
        this.addParticle(x, y, '#ffffff', 1, 'flash', 4, { speed: 0, lifeBonus: -0.2 });
        this.addParticle(x, y, color, 6, 'star', 1.5, { speed: 120 });
    }

    createKillEffect(x, y, effectId) {
        switch (effectId) {
            case 'explosion':
                this.addParticle(x, y, '#ff4500', 10, 'explosion', 2.5, { speed: 350 });
                this.addParticle(x, y, '#ffdd00', 6, 'flame', 2.0, { speed: 200 });
                this.addParticle(x, y, '#ffffff', 2, 'flash', 4, { speed: 0 });
                this.particles.push({ x, y, vx: 0, vy: 0, life: 0.4, maxLife: 0.4, color: '#ffaa00', tint: '#ffaa00', type: 'shockwave', size: 10, growthRate: 500, lineWidth: 4 });
                break;
            case 'pixel_burst':
                this.addParticle(x, y, '#ffffff', 1, 'flash', 5, { speed: 0, lifeBonus: 0.1 });
                this.addParticle(x, y, '#00ffff', 16, 'slash', 2.5, { speed: 550 });
                this.addParticle(x, y, '#ff00ff', 16, 'slash', 2.0, { speed: 450 });
                this.addParticle(x, y, '#ffff00', 12, 'spark', 3.0, { speed: 350 });
                this.particles.push({ x, y, vx: 0, vy: 0, life: 0.4, maxLife: 0.4, color: '#00ffff', tint: '#00ffff', type: 'shockwave', size: 10, growthRate: 800, lineWidth: 5 });
                break;
            case 'blood_splatter':
                this.addParticle(x, y, '#ff0000', 20, 'blood', 4.0, { gravity: true, speed: 400 });
                this.addParticle(x, y, '#ff00ff', 10, 'slash', 3.0, { gravity: true, speed: 300 });
                this.particles.push({ x, y, vx: 0, vy: 0, life: 0.4, maxLife: 0.4, color: '#ff0000', tint: '#ff0000', type: 'shockwave', size: 8, growthRate: 400, lineWidth: 8 });
                break;
            case 'black_hole':
                this.addParticle(x, y, '#ffffff', 2, 'flash', 6, { speed: 0, lifeBonus: 0.2 });
                for (let i = 0; i < 30; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const dist = 120 + Math.random() * 80;
                    this.particles.push({
                        x: x + Math.cos(angle) * dist, y: y + Math.sin(angle) * dist,
                        vx: 0, vy: 0, targetX: x, targetY: y,
                        life: 0.8, maxLife: 0.8, color: '#aa00ff', tint: '#aa00ff',
                        type: 'implode', size: Math.random() * 18 + 8,
                        rotation: Math.random() * Math.PI * 2, rotSpeed: (Math.random() - 0.5) * 20
                    });
                }
                this.particles.push({ x, y, vx: 0, vy: 0, life: 0.6, maxLife: 0.6, color: '#4b0082', tint: '#4b0082', type: 'shockwave', size: 10, growthRate: 300, lineWidth: 12 });
                break;
            case 'freeze':
                this.addParticle(x, y, '#00ffff', 12, 'fragment', 2.5, { speed: 320 });
                this.addParticle(x, y, '#ffffff', 8, 'star', 2.0, { speed: 230 });
                this.particles.push({ x, y, vx: 0, vy: 0, life: 0.4, maxLife: 0.4, color: '#00ffff', tint: '#00ffff', type: 'shockwave', size: 8, growthRate: 400, lineWidth: 4 });
                break;
            case 'vaporize':
                this.addParticle(x, y, '#39ff14', 12, 'smoke', 2.5, { lifeBonus: 0.8, speed: 100 });
                this.addParticle(x, y, '#00ff88', 8, 'circle', 1.8, { speed: 150 });
                this.particles.push({ x, y, vx: 0, vy: 0, life: 0.5, maxLife: 0.5, color: '#39ff14', tint: '#39ff14', type: 'shockwave', size: 6, growthRate: 340, lineWidth: 4 });
                break;
            case 'implode':
                for (let i = 0; i < 15; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const dist = 50 + Math.random() * 35;
                    const c = ['#00e5ff', '#ff00e5'][i % 2];
                    this.particles.push({
                        x: x + Math.cos(angle) * dist, y: y + Math.sin(angle) * dist,
                        vx: 0, vy: 0, targetX: x, targetY: y,
                        life: 0.6, maxLife: 0.6, color: c, tint: c,
                        type: 'implode', size: Math.random() * 10 + 5,
                        rotation: Math.random() * Math.PI * 2, rotSpeed: (Math.random() - 0.5) * 10
                    });
                }
                this.particles.push({ x, y, vx: 0, vy: 0, life: 0.3, maxLife: 0.3, color: '#ffffff', tint: '#ffffff', type: 'shockwave', size: 6, growthRate: 340, lineWidth: 4 });
                break;
            case 'golden':
                this.addParticle(x, y, '#ffd700', 12, 'star', 2.5, { speed: 300, gravity: true });
                this.addParticle(x, y, '#ffffff', 8, 'fragment', 2.0, { speed: 260, gravity: true });
                this.particles.push({ x, y, vx: 0, vy: 0, life: 0.45, maxLife: 0.45, color: '#ffd700', tint: '#ffd700', type: 'shockwave', size: 8, growthRate: 400, lineWidth: 4 });
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