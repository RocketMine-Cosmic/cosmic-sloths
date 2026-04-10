import * as PIXI from 'pixi.js';

export class ParticleManager {
    constructor(pixiCanvas) {
        this.particles = [];
        this.pool = [];
        this.isReady = false;
        this.sprites = [];
        this.spritePool = [];
        this.isDestroyed = false;
        
        if (pixiCanvas) {
            this.app = new PIXI.Application();
            this.app.init({
                canvas: pixiCanvas,
                backgroundAlpha: 0,
                resizeTo: pixiCanvas.parentElement || window,
                clearBeforeRender: true,
                antialias: true
            }).then(() => {
                if (this.isDestroyed) {
                    try { this.app.destroy(true, { children: true, texture: true, baseTexture: true }); } catch(e) {}
                    return;
                }
                this.container = new PIXI.Container();
                this.app.stage.addChild(this.container);
                
                this.textures = {
                    glow: this.createCanvasTexture(128, (ctx, s) => {
                        const g = ctx.createRadialGradient(s/2, s/2, 0, s/2, s/2, s/2);
                        g.addColorStop(0, 'rgba(255,255,255,1)');
                        g.addColorStop(0.15, 'rgba(255,255,255,0.9)');
                        g.addColorStop(0.4, 'rgba(255,255,255,0.4)');
                        g.addColorStop(0.7, 'rgba(255,255,255,0.1)');
                        g.addColorStop(1, 'rgba(255,255,255,0)');
                        ctx.fillStyle = g;
                        ctx.beginPath(); ctx.arc(s/2, s/2, s/2, 0, Math.PI*2); ctx.fill();
                    }),
                    star: this.createCanvasTexture(128, (ctx, s) => {
                        const g = ctx.createRadialGradient(s/2, s/2, 0, s/2, s/2, s/2);
                        g.addColorStop(0, 'rgba(255,255,255,1)');
                        g.addColorStop(0.1, 'rgba(255,255,255,0.9)');
                        g.addColorStop(0.3, 'rgba(255,255,255,0.5)');
                        g.addColorStop(1, 'rgba(255,255,255,0)');
                        ctx.fillStyle = g;
                        ctx.beginPath();
                        ctx.moveTo(s/2, 0); ctx.quadraticCurveTo(s/2 + s*0.05, s/2 - s*0.05, s, s/2);
                        ctx.quadraticCurveTo(s/2 + s*0.05, s/2 + s*0.05, s/2, s);
                        ctx.quadraticCurveTo(s/2 - s*0.05, s/2 + s*0.05, 0, s/2);
                        ctx.quadraticCurveTo(s/2 - s*0.05, s/2 - s*0.05, s/2, 0);
                        ctx.fill();
                    }),
                    ring: this.createCanvasTexture(128, (ctx, s) => {
                        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
                        ctx.lineWidth = 6;
                        ctx.shadowColor = '#ffffff';
                        ctx.shadowBlur = 15;
                        ctx.beginPath(); ctx.arc(s/2, s/2, s/2 - 10, 0, Math.PI*2); ctx.stroke();
                        ctx.lineWidth = 2;
                        ctx.strokeStyle = 'rgba(255,255,255,1)';
                        ctx.beginPath(); ctx.arc(s/2, s/2, s/2 - 10, 0, Math.PI*2); ctx.stroke();
                    }),
                    smoke: this.createCanvasTexture(128, (ctx, s) => {
                        const g = ctx.createRadialGradient(s/2, s/2, 0, s/2, s/2, s/2);
                        g.addColorStop(0, 'rgba(255,255,255,0.4)');
                        g.addColorStop(0.4, 'rgba(255,255,255,0.2)');
                        g.addColorStop(0.8, 'rgba(255,255,255,0.05)');
                        g.addColorStop(1, 'rgba(255,255,255,0)');
                        ctx.fillStyle = g;
                        ctx.beginPath(); ctx.arc(s/2, s/2, s/2, 0, Math.PI*2); ctx.fill();
                    }),
                    slash: this.createCanvasTexture(128, (ctx, s) => {
                        const g = ctx.createLinearGradient(0, s/2, s, s/2);
                        g.addColorStop(0, 'rgba(255,255,255,0)');
                        g.addColorStop(0.3, 'rgba(255,255,255,0.5)');
                        g.addColorStop(0.5, 'rgba(255,255,255,1)');
                        g.addColorStop(0.7, 'rgba(255,255,255,0.5)');
                        g.addColorStop(1, 'rgba(255,255,255,0)');
                        ctx.fillStyle = g;
                        ctx.beginPath();
                        ctx.moveTo(0, s/2);
                        ctx.quadraticCurveTo(s/2, s*0.15, s, s/2);
                        ctx.quadraticCurveTo(s/2, s*0.35, 0, s/2);
                        ctx.fill();
                    }),
                    spark_line: this.createCanvasTexture(128, (ctx, s) => {
                        const g = ctx.createRadialGradient(s/2, s/2, 0, s/2, s/2, s/2);
                        g.addColorStop(0, 'rgba(255,255,255,1)');
                        g.addColorStop(0.1, 'rgba(255,255,255,0.8)');
                        g.addColorStop(0.4, 'rgba(255,255,255,0.3)');
                        g.addColorStop(1, 'rgba(255,255,255,0)');
                        ctx.fillStyle = g;
                        ctx.beginPath(); ctx.ellipse(s/2, s/2, s/2, s*0.15, 0, 0, Math.PI*2); ctx.fill();
                    }),
                    hex: this.createCanvasTexture(128, (ctx, s) => {
                        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
                        ctx.lineWidth = 4;
                        ctx.shadowColor = '#ffffff';
                        ctx.shadowBlur = 10;
                        ctx.beginPath();
                        for (let i = 0; i < 6; i++) {
                            const a = (Math.PI / 3) * i;
                            const r = s/2 - 8;
                            if (i===0) ctx.moveTo(s/2 + Math.cos(a)*r, s/2 + Math.sin(a)*r);
                            else ctx.lineTo(s/2 + Math.cos(a)*r, s/2 + Math.sin(a)*r);
                        }
                        ctx.closePath(); ctx.stroke();
                        ctx.lineWidth = 1.5;
                        ctx.strokeStyle = 'rgba(255,255,255,1)';
                        ctx.stroke();
                    })
                };
                
                this.isReady = true;
            });
        }
    }
    
    createCanvasTexture(size, drawFn) {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        drawFn(ctx, size);
        return PIXI.Texture.from(canvas);
    }
    
    update(dt) {
        if (this.particles.length > 2000) {
            const removed = this.particles.splice(0, this.particles.length - 2000);
            for (let i = 0; i < removed.length; i++) {
                this.pool.push(removed[i]);
            }
        }
        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];
            p.life -= dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;

            if (p.rotation !== undefined && p.type !== 'spark') p.rotation += (p.rotSpeed || 0) * dt;

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
            } else if (p.type === 'flame') {
                p.vx *= 0.92;
                p.vy *= 0.92;
                p.vy -= 60 * dt; // flames rise
                p.size += dt * 10;
            }

            if (p.life <= 0) {
                this.pool.push(p);
                this.particles[i] = this.particles[this.particles.length - 1];
                this.particles.pop();
            }
        }
    }
    
    draw(ctx, camX, camY, vWidth, vHeight, zoom = 1, shakeX = 0, shakeY = 0) {
        if (!this.isReady) return;
        
        this.container.scale.set(zoom, zoom);
        this.container.position.set((-camX + shakeX) * zoom, (-camY + shakeY) * zoom);
        
        while (this.sprites.length < this.particles.length) {
            let sprite = this.spritePool.pop();
            if (!sprite) {
                sprite = new PIXI.Sprite();
                sprite.anchor.set(0.5);
            }
            this.container.addChild(sprite);
            this.sprites.push(sprite);
        }
        while (this.sprites.length > this.particles.length) {
            const sprite = this.sprites.pop();
            this.container.removeChild(sprite);
            this.spritePool.push(sprite);
        }
        
        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            const sprite = this.sprites[i];
            
            sprite.x = p.x;
            sprite.y = p.y;
            sprite.rotation = p.rotation || 0;
            
            const alpha = Math.max(0, p.life / (p.maxLife || 1));
            sprite.alpha = alpha;
            
            const sBase = p.size || 8;
            let tex = this.textures.glow;
            let scaleMult = 1.0;
            
            if (p.type === 'star' || p.type === 'imploding_star') { tex = this.textures.star; scaleMult = 1.5; }
            else if (p.type === 'spark') { 
                tex = this.textures.spark_line; 
                scaleMult = 1.2; 
                sprite.rotation = Math.atan2(p.vy, p.vx); // align velocity
            }
            else if (p.type === 'explosion' || p.type === 'flash' || p.type === 'blood') { tex = this.textures.glow; scaleMult = 1.5; }
            else if (p.type === 'smoke' || p.type === 'dark_smoke' || p.type === 'flame') { tex = this.textures.smoke; scaleMult = 1.5; }
            else if (p.type === 'slash' || p.type === 'shatter') { tex = this.textures.slash; scaleMult = 1.8; }
            else if (p.type === 'shockwave' || p.type === 'dark_shockwave' || p.type === 'implode' || p.type === 'dark_implode' || p.type === 'circle' || p.type === 'ring') { tex = this.textures.ring; scaleMult = 1.5; }
            else if (p.type === 'tech' || p.type === 'hex') { tex = this.textures.hex; scaleMult = 1.0; }
            
            sprite.texture = tex;
            sprite.width = sBase * scaleMult;
            sprite.height = sBase * scaleMult;
            
            sprite.tint = p.color ? PIXI.Color.shared.setValue(p.color).toNumber() : 0xffffff;
            
            sprite.blendMode = (p.type === 'smoke' || p.type === 'dark_smoke' || p.type === 'blood') ? 'normal' : 'screen';
        }
    }
    
    addParticle(x, y, color, count, type = 'star', sizeMult = 1, options = {}) {
        for (let i = 0; i < count; i++) {
            const angle = options.angle !== undefined ? options.angle + (Math.random() - 0.5) * 0.8 : Math.random() * Math.PI * 2;
            const speed = options.speed !== undefined ? options.speed * (0.7 + Math.random() * 0.6) : Math.random() * 150 * sizeMult + 50;

            const lifeBase = Math.random() * 0.5 + 0.3 + (options.lifeBonus || 0);
            
            let p = this.pool.length > 0 ? this.pool.pop() : {};
            
            p.x = x;
            p.y = y;
            p.vx = Math.cos(angle) * speed;
            p.vy = Math.sin(angle) * speed;
            p.life = lifeBase;
            p.maxLife = lifeBase;
            p.color = color;
            p.type = type;
            p.size = (Math.random() * 24 + 12) * sizeMult;
            p.rotation = Math.random() * Math.PI * 2;
            p.rotSpeed = (Math.random() - 0.5) * 12;
            p.gravity = options.gravity || false;
            p.growthRate = options.growthRate;
            p.targetX = options.targetX;
            p.targetY = options.targetY;
            
            this.particles.push(p);
        }
    }
    
    createExplosion(x, y, color, scale = 1, sourceId = '') {
        const s = Math.min(scale, 2.5);
        this.addParticle(x, y, color, 6 * s, 'spark', 2.0 * s, { speed: 220 * s, lifeBonus: 0.2 });
        this.addParticle(x, y, '#ffffff', 4 * s, 'star', 1.8 * s, { speed: 280 * s, lifeBonus: 0.1 });
        this.addParticle(x, y, color, 1, 'ring', 3.5 * s, { speed: 0, growthRate: 200 * s, lifeBonus: 0.3 });
        this.addParticle(x, y, color, 1, 'glow', 6.0 * s, { speed: 0, lifeBonus: 0.2 });
    }

    createHitEffect(x, y, color, angle, scale = 1) {
        this.addParticle(x, y, color, 3, 'spark', 1.6 * scale, { angle, speed: 180 * scale });
        this.addParticle(x, y, '#ffffff', 2, 'spark', 1.2 * scale, { angle, speed: 250 * scale });
        this.addParticle(x, y, color, 1, 'glow', 3.0 * scale, { speed: 0, lifeBonus: -0.2 });
    }

    createLevelUp(x, y) {
        this.addParticle(x, y, '#00e5ff', 15, 'spark', 3.0, { speed: 200 });
        this.addParticle(x, y, '#ff00e5', 12, 'spark', 2.5, { speed: 160 });
        this.addParticle(x, y, '#ffff00', 8, 'star', 2.8, { speed: 140 });
        this.addParticle(x, y, '#ffffff', 1, 'ring', 4.5, { speed: 0, growthRate: 250, lifeBonus: 0.5 });
        this.addParticle(x, y, '#00e5ff', 1, 'glow', 8.0, { speed: 0, lifeBonus: 0.4 });
    }

    createPickup(x, y, color) {
        this.addParticle(x, y, color, 4, 'spark', 1.8, { speed: 80 });
        this.addParticle(x, y, '#ffffff', 1, 'glow', 2.5, { speed: 0, lifeBonus: -0.3 });
    }

    createKillEffect(x, y, effectId) {
        switch (effectId) {
            case 'explosion':
                this.addParticle(x, y, '#ffaa00', 1, 'flash', 3.0, { speed: 0, lifeBonus: -0.2 });
                this.addParticle(x, y, '#ff4500', 8, 'flame', 2.0, { speed: 150 });
                this.addParticle(x, y, '#555555', 6, 'smoke', 1.8, { speed: 100 });
                break;
            case 'pixel_burst':
                this.addParticle(x, y, '#00ffff', 8, 'spark', 1.8, { speed: 200 });
                this.addParticle(x, y, '#ff00ff', 8, 'slash', 1.6, { speed: 150 });
                this.addParticle(x, y, '#ffffff', 1, 'flash', 2.0, { speed: 0 });
                break;
            case 'blood_splatter':
                this.addParticle(x, y, '#8a0303', 10, 'blood', 2.5, { speed: 180, gravity: true });
                this.addParticle(x, y, '#ff0000', 6, 'spark', 1.5, { speed: 120, gravity: true });
                break;
            case 'black_hole':
                this.addParticle(x, y, '#000000', 1, 'dark_shockwave', 1.2, { speed: 0, growthRate: -150 });
                this.addParticle(x, y, '#1a0033', 12, 'dark_implode', 2.2, { speed: 150, targetX: x, targetY: y });
                break;
            case 'freeze':
                this.addParticle(x, y, '#ffffff', 1, 'flash', 2.0, { speed: 0 });
                this.addParticle(x, y, '#00cfff', 10, 'shatter', 1.5, { speed: 150, gravity: true });
                this.addParticle(x, y, '#aaf0ff', 8, 'spark', 1.1, { speed: 100 });
                break;
            case 'vaporize':
                this.addParticle(x, y, '#39ff14', 10, 'smoke', 2.2, { speed: 100 });
                this.addParticle(x, y, '#00ff88', 8, 'spark', 1.5, { speed: 150 });
                this.addParticle(x, y, '#aaff00', 1, 'flash', 1.8, { speed: 0 });
                break;
            case 'implode':
                this.addParticle(x, y, '#8a2be2', 10, 'implode', 1.6, { speed: 180, targetX: x, targetY: y });
                this.addParticle(x, y, '#cc00ff', 1, 'shockwave', 1.2, { speed: 0, growthRate: -120 });
                break;
            case 'golden':
                this.addParticle(x, y, '#ffd700', 10, 'star', 2.0, { speed: 180, gravity: true });
                this.addParticle(x, y, '#ffec6e', 8, 'spark', 1.5, { speed: 120, gravity: true });
                this.addParticle(x, y, '#ffffff', 1, 'flash', 2.0, { speed: 0 });
                break;
        }
    }

    createTrail(x, y, trailId, frameCount) {
        const trailConfigs = {
            'fire':    { colors: ['#ff4500', '#ff7700', '#ffaa00'], type: 'flame', count: 2, size: 3.5, options: { speed: 10, lifeBonus: 0.4 } },
            'ice':     { colors: ['#00cfff', '#aaf0ff', '#ffffff'], type: 'shatter', count: 2, size: 2.5, options: { speed: 15, gravity: true, lifeBonus: 0.5 } },
            'void':    { colors: ['#4b0082', '#6600cc', '#cc00ff'], type: 'dark_smoke', count: 2, size: 3.0, options: { speed: 5, lifeBonus: 0.8 } },
            'toxic':   { colors: ['#39ff14', '#00ff88', '#aaff00'], type: 'smoke', count: 2, size: 3.5, options: { speed: 5, lifeBonus: 0.6 } },
            'gold':    { colors: ['#ffd700', '#ffec6e', '#fff4a0'], type: 'star', count: 2, size: 3.0, options: { speed: 10, gravity: true, lifeBonus: 0.4 } },
            'plasma':  { colors: ['#00e5ff', '#ff00e5', '#ffffff'], type: 'spark', count: 2, size: 3.0, options: { speed: 15, lifeBonus: 0.5 } },
            'shadow':  { colors: ['#1a1a2e', '#222244', '#0a0a20'], type: 'dark_smoke', count: 2, size: 4.0, options: { speed: 5, lifeBonus: 1.0 } },
            'blood':   { colors: ['#8a0303', '#ff0000', '#5c0000'], type: 'blood', count: 2, size: 3.0, options: { speed: 10, gravity: true, lifeBonus: 0.5 } },
            'pixel':   { colors: ['#00ffcc', '#ff00ff', '#ffff00'], type: 'slash', count: 2, size: 2.5, options: { speed: 15, rotSpeed: 10, lifeBonus: 0.5 } },
            'nebula':  { colors: ['#ff99cc', '#cc99ff', '#99ccff'], type: 'smoke', count: 2, size: 3.0, options: { speed: 5, lifeBonus: 0.9 } },
            'rainbow': { colors: ['#ff0000', '#ff8800', '#ffff00', '#00ff00', '#0088ff', '#8800ff'], type: 'star', count: 2, size: 2.8, options: { speed: 15, lifeBonus: 0.5 } },
        };
        const config = trailConfigs[trailId];
        if (config) {
            const color = config.colors[frameCount % config.colors.length];
            this.addParticle(x, y, color, config.count, config.type, config.size, config.options);
        }
    }

    destroy() {
        this.isDestroyed = true;
        this.isReady = false;
        if (this.app) {
            try {
                this.app.destroy(true, { children: true, texture: true, baseTexture: true });
            } catch (e) {
                console.error("PIXI destroy error:", e);
            }
            this.app = null;
        }
    }
}