const loadTexture = (url, name) => {
    if (typeof window !== 'undefined') {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        canvas.texName = name;
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
            ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, 128, 128);
            
            try {
                const imgData = ctx.getImageData(0, 0, 128, 128);
                const data = imgData.data;
                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i+1];
                    const b = data[i+2];
                    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
                    
                    data[i] = 255;
                    data[i+1] = 255;
                    data[i+2] = 255;
                    data[i+3] = lum; // Convert black background to transparent
                }
                ctx.putImageData(imgData, 0, 0);
            } catch (e) {
                console.error("Failed to process texture alpha:", e);
            }
            
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
            star: loadTexture('https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/0ea8232ec_generated_image.png', 'star'),
            explosion: loadTexture('https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/d54e51f9e_generated_image.png', 'explosion'),
            smoke: loadTexture('https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/882cab418_generated_image.png', 'smoke'),
            slash: loadTexture('https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/55426dc86_generated_image.png', 'slash'),
            shockwave: loadTexture('https://media.base44.com/images/public/69c5d61e39690bf20f763b4c/371ac242b_generated_image.png', 'shockwave'),
        };
        this.tintCache = {};
    }

    getTintedTexture(tex, color) {
        if (!tex || !tex.isReady) return tex;
        if (!this.tintCache) this.tintCache = {};
        if (!this.tintCache[color]) this.tintCache[color] = {};
        
        const texKey = tex.texName;
        if (!texKey) return tex;

        if (this.tintCache[color][texKey]) return this.tintCache[color][texKey];
        
        const canvas = document.createElement('canvas');
        canvas.width = tex.width;
        canvas.height = tex.height;
        canvas.texName = texKey;
        canvas.isReady = true;
        const ctx = canvas.getContext('2d');
        
        ctx.drawImage(tex, 0, 0);
        ctx.globalCompositeOperation = 'source-in';
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        this.tintCache[color][texKey] = canvas;
        return canvas;
    }

    update(dt) {
        if (this.particles.length > 600) {
            this.particles.splice(0, this.particles.length - 600);
        }
        this.particles = this.particles.filter(p => {
            p.life -= dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;

            if (p.rotation !== undefined) p.rotation += (p.rotSpeed || 0) * dt;

            if (p.type === 'smoke' || p.type === 'dark_smoke') {
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
            } else if (p.type === 'implode' || p.type === 'imploding_star' || p.type === 'dark_implode') {
                const dx = p.targetX - p.x;
                const dy = p.targetY - p.y;
                const dist = Math.hypot(dx, dy);
                if (dist > 5) {
                    p.vx += (dx / dist) * 1200 * dt;
                    p.vy += (dy / dist) * 1200 * dt;
                }
                p.vx *= 0.88;
                p.vy *= 0.88;
            } else if (p.type === 'shockwave' || p.type === 'dark_shockwave') {
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

        this.particles.forEach(p => {
            const alpha = Math.max(0, p.life / (p.maxLife || 1));
            if (alpha <= 0) return;

            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation || 0);

            const color = p.color || p.tint || '#ffffff';
            const sBase = p.size || 8;

            // Determine blend mode per particle type
            const isOpaque = p.type === 'blood' || p.type === 'dark_smoke' || p.type === 'dark_shockwave' || p.type === 'dark_implode';
            const blendMode = isOpaque ? 'source-over' : 'screen';
            ctx.globalCompositeOperation = blendMode;
            ctx.globalAlpha = alpha;

            // DRAW HD TEXTURE
            let tex = null;
            let scaleMult = 1.5;

            if (p.type === 'star' || p.type === 'spark' || p.type === 'imploding_star') { tex = this.textures.star; scaleMult = 2.0; }
            else if (p.type === 'explosion' || p.type === 'flash' || p.type === 'blood') { tex = this.textures.explosion; scaleMult = 2.2; }
            else if (p.type === 'smoke' || p.type === 'dark_smoke' || p.type === 'flame') { tex = this.textures.smoke; scaleMult = 2.2; }
            else if (p.type === 'slash' || p.type === 'shatter') { tex = this.textures.slash; scaleMult = 2.5; }
            else if (p.type === 'shockwave' || p.type === 'dark_shockwave' || p.type === 'implode' || p.type === 'dark_implode' || p.type === 'circle' || p.type === 'ring') { tex = this.textures.shockwave; scaleMult = 1.8; }
            else { tex = this.textures.star; scaleMult = 1.5; } // Catch-all fallback to prevent flat shapes
            
            if (tex && tex.isReady && color !== '#ffffff') {
                tex = this.getTintedTexture(tex, color);
            }

            // For simple geometry fallback
            if (!tex || !tex.isReady) {
                switch (p.type) {
                    case 'circle':
                    case 'ring':
                    case 'shockwave':
                    case 'dark_shockwave':
                        ctx.strokeStyle = color;
                        ctx.lineWidth = p.lineWidth || 2;
                        ctx.beginPath();
                        ctx.arc(0, 0, Math.max(0.1, sBase * 0.5), 0, Math.PI * 2);
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
                    case 'blood':
                        ctx.fillStyle = color;
                        ctx.beginPath();
                        ctx.arc(0, 0, Math.max(0.1, sBase * 0.6), 0, Math.PI * 2);
                        ctx.fill();
                        break;
                    case 'flame':
                        ctx.fillStyle = color;
                        ctx.beginPath();
                        ctx.arc(0, 0, Math.max(0.1, sBase * 0.7), 0, Math.PI * 2);
                        ctx.fill();
                        break;
                    default:
                        ctx.fillStyle = color;
                        ctx.beginPath();
                        ctx.arc(0, 0, Math.max(0.1, sBase * 0.5), 0, Math.PI * 2);
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
                    ctx.arc(0, 0, Math.max(0.1, sBase * 0.2), 0, Math.PI * 2);
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
                this.addParticle(x, y, '#ffaa00', 1, 'flash', 3.0, { speed: 0, lifeBonus: -0.2 });
                this.addParticle(x, y, '#ff4500', 12, 'flame', 2.0, { speed: 250 });
                this.addParticle(x, y, '#555555', 8, 'smoke', 1.5, { speed: 150 });
                break;
            case 'pixel_burst':
                this.addParticle(x, y, '#00ffff', 10, 'spark', 1.8, { speed: 350 });
                this.addParticle(x, y, '#ff00ff', 10, 'slash', 1.5, { speed: 250 });
                this.addParticle(x, y, '#ffffff', 1, 'flash', 2.0, { speed: 0 });
                break;
            case 'blood_splatter':
                this.addParticle(x, y, '#8a0303', 15, 'blood', 2.5, { speed: 300, gravity: true });
                this.addParticle(x, y, '#ff0000', 10, 'spark', 1.5, { speed: 200, gravity: true });
                break;
            case 'black_hole':
                this.addParticle(x, y, '#000000', 1, 'dark_shockwave', 1.0, { speed: 0, lineWidth: 10, growthRate: -200 });
                this.addParticle(x, y, '#1a0033', 20, 'dark_implode', 2.0, { speed: 200, targetX: x, targetY: y });
                break;
            case 'freeze':
                this.addParticle(x, y, '#ffffff', 1, 'flash', 2.0, { speed: 0 });
                this.addParticle(x, y, '#00cfff', 15, 'shatter', 1.5, { speed: 250, gravity: true });
                this.addParticle(x, y, '#aaf0ff', 10, 'spark', 1.0, { speed: 150 });
                break;
            case 'vaporize':
                this.addParticle(x, y, '#39ff14', 15, 'smoke', 2.0, { speed: 150 });
                this.addParticle(x, y, '#00ff88', 10, 'spark', 1.5, { speed: 200 });
                this.addParticle(x, y, '#aaff00', 1, 'flash', 1.5, { speed: 0 });
                break;
            case 'implode':
                this.addParticle(x, y, '#8a2be2', 15, 'implode', 1.5, { speed: 250, targetX: x, targetY: y });
                this.addParticle(x, y, '#cc00ff', 1, 'shockwave', 1.0, { speed: 0, lineWidth: 5, growthRate: -150 });
                break;
            case 'golden':
                this.addParticle(x, y, '#ffd700', 15, 'star', 2.0, { speed: 300, gravity: true });
                this.addParticle(x, y, '#ffec6e', 10, 'spark', 1.5, { speed: 200, gravity: true });
                this.addParticle(x, y, '#ffffff', 1, 'flash', 2.0, { speed: 0 });
                break;
        }
    }

    createTrail(x, y, trailId, frameCount) {
        const trailConfigs = {
            'fire':    { colors: ['#ff4500', '#ff7700', '#ffaa00'], type: 'flame', count: 2, size: 1.8, options: { speed: 30, lifeBonus: 0.2 } },
            'ice':     { colors: ['#00cfff', '#aaf0ff', '#ffffff'], type: 'shatter', count: 2, size: 1.2, options: { speed: 40, gravity: true, lifeBonus: 0.5 } },
            'void':    { colors: ['#4b0082', '#6600cc', '#cc00ff'], type: 'dark_smoke', count: 1, size: 1.5, options: { speed: 10, lifeBonus: 0.8 } },
            'toxic':   { colors: ['#39ff14', '#00ff88', '#aaff00'], type: 'smoke', count: 1, size: 2.0, options: { speed: 15, lifeBonus: 0.7 } },
            'gold':    { colors: ['#ffd700', '#ffec6e', '#fff4a0'], type: 'star', count: 2, size: 1.8, options: { speed: 30, gravity: true, lifeBonus: 0.4 } },
            'plasma':  { colors: ['#00e5ff', '#ff00e5', '#ffffff'], type: 'spark', count: 2, size: 1.5, options: { speed: 50, lifeBonus: 0.3 } },
            'shadow':  { colors: ['#1a1a2e', '#222244', '#0a0a20'], type: 'dark_smoke', count: 2, size: 2.5, options: { speed: 5, lifeBonus: 1.0 } },
            'blood':   { colors: ['#8a0303', '#ff0000', '#5c0000'], type: 'blood', count: 2, size: 1.6, options: { speed: 20, gravity: true, lifeBonus: 0.5 } },
            'pixel':   { colors: ['#00ffcc', '#ff00ff', '#ffff00'], type: 'slash', count: 2, size: 1.4, options: { speed: 40, rotSpeed: 10, lifeBonus: 0.3 } },
            'nebula':  { colors: ['#ff99cc', '#cc99ff', '#99ccff'], type: 'smoke', count: 1, size: 1.8, options: { speed: 10, lifeBonus: 0.9 } },
            'rainbow': { colors: ['#ff0000', '#ff8800', '#ffff00', '#00ff00', '#0088ff', '#8800ff'], type: 'star', count: 2, size: 1.5, options: { speed: 40, lifeBonus: 0.5 } },
        };
        const config = trailConfigs[trailId];
        if (config) {
            const color = config.colors[frameCount % config.colors.length];
            this.addParticle(x, y, color, config.count, config.type, config.size, config.options);
        }
    }
}