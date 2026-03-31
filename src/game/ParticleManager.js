export class ParticleManager {
    constructor() {
        this.particles = [];
    }

    update(dt) {
        // Hard cap to prevent spiral lag
        if (this.particles.length > 600) {
            this.particles.splice(0, this.particles.length - 600);
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
            } else if (p.type === 'implode') {
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

    draw(ctx) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';

        this.particles.forEach(p => {
            const alpha = Math.max(0, p.life / (p.maxLife || 1));
            if (alpha <= 0) return;

            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.translate(p.x, p.y);

            const color = p.color || p.tint || '#ffffff';

            switch (p.type) {
                case 'star':
                case 'spark': {
                    ctx.rotate(p.rotation || 0);
                    const s = p.size || 8;
                    // 4-pointed star shape
                    ctx.fillStyle = color;
                    ctx.beginPath();
                    for (let i = 0; i < 8; i++) {
                        const a = (Math.PI / 4) * i;
                        const r = i % 2 === 0 ? s * 0.5 : s * 0.2;
                        i === 0 ? ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
                    }
                    ctx.closePath();
                    ctx.fill();
                    break;
                }
                case 'flash': {
                    const r = p.size || 20;
                    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
                    grad.addColorStop(0, color + 'ff');
                    grad.addColorStop(0.4, color + 'aa');
                    grad.addColorStop(1, color + '00');
                    ctx.fillStyle = grad;
                    ctx.beginPath();
                    ctx.arc(0, 0, r, 0, Math.PI * 2);
                    ctx.fill();
                    break;
                }
                case 'circle': {
                    const r = p.size || 12;
                    ctx.strokeStyle = color;
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2);
                    ctx.stroke();
                    break;
                }
                case 'ring': {
                    const r = p.size || 12;
                    ctx.strokeStyle = color;
                    ctx.lineWidth = (p.lineWidth || 3);
                    ctx.beginPath();
                    ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2);
                    ctx.stroke();
                    break;
                }
                case 'shockwave': {
                    ctx.strokeStyle = color;
                    ctx.lineWidth = p.lineWidth || 4;
                    ctx.beginPath();
                    ctx.arc(0, 0, p.size * 0.5, 0, Math.PI * 2);
                    ctx.stroke();
                    break;
                }
                case 'smoke': {
                    const r = p.size || 20;
                    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
                    grad.addColorStop(0, color + '55');
                    grad.addColorStop(1, color + '00');
                    ctx.fillStyle = grad;
                    ctx.beginPath();
                    ctx.arc(0, 0, r, 0, Math.PI * 2);
                    ctx.fill();
                    break;
                }
                case 'fragment':
                case 'shatter': {
                    ctx.rotate(p.rotation || 0);
                    const s = (p.size || 8) * 0.5;
                    ctx.fillStyle = color;
                    // Triangle shard
                    ctx.beginPath();
                    ctx.moveTo(0, -s);
                    ctx.lineTo(s * 0.6, s * 0.6);
                    ctx.lineTo(-s * 0.6, s * 0.6);
                    ctx.closePath();
                    ctx.fill();
                    break;
                }
                case 'slash': {
                    ctx.rotate(p.rotation || 0);
                    const len = (p.size || 20);
                    ctx.strokeStyle = color;
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.moveTo(-len * 0.5, -len * 0.2);
                    ctx.lineTo(len * 0.5, len * 0.2);
                    ctx.stroke();
                    // White core
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 1;
                    ctx.globalAlpha = alpha * 0.5;
                    ctx.beginPath();
                    ctx.moveTo(-len * 0.5, -len * 0.2);
                    ctx.lineTo(len * 0.5, len * 0.2);
                    ctx.stroke();
                    break;
                }
                case 'explosion': {
                    ctx.rotate(p.rotation || 0);
                    const r = (p.size || 20) * 0.5;
                    ctx.fillStyle = color;
                    ctx.beginPath();
                    const spikes = 8;
                    for (let i = 0; i < spikes * 2; i++) {
                        const a = (Math.PI * 2 / (spikes * 2)) * i;
                        const rad = i % 2 === 0 ? r : r * 0.45;
                        i === 0 ? ctx.moveTo(Math.cos(a) * rad, Math.sin(a) * rad) : ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
                    }
                    ctx.closePath();
                    ctx.fill();
                    break;
                }
                case 'flame': {
                    const r = p.size || 14;
                    const grad = ctx.createRadialGradient(0, r * 0.3, 0, 0, 0, r);
                    grad.addColorStop(0, '#ffffff');
                    grad.addColorStop(0.2, color);
                    grad.addColorStop(1, color + '00');
                    ctx.fillStyle = grad;
                    ctx.beginPath();
                    ctx.ellipse(0, 0, r * 0.5, r, 0, 0, Math.PI * 2);
                    ctx.fill();
                    break;
                }
                case 'implode': {
                    ctx.rotate(p.rotation || 0);
                    const r = (p.size || 10) * 0.5;
                    ctx.fillStyle = color;
                    ctx.beginPath();
                    ctx.moveTo(0, -r);
                    ctx.lineTo(r * 0.5, 0);
                    ctx.lineTo(0, r);
                    ctx.lineTo(-r * 0.5, 0);
                    ctx.closePath();
                    ctx.fill();
                    break;
                }
                case 'blood': {
                    ctx.rotate(p.rotation || 0);
                    const r = (p.size || 10) * 0.5;
                    ctx.fillStyle = color;
                    ctx.beginPath();
                    ctx.arc(0, 0, r, 0, Math.PI * 2);
                    ctx.fill();
                    // Streak tail
                    ctx.fillStyle = color + '88';
                    ctx.beginPath();
                    ctx.ellipse(0, r * 0.8, r * 0.3, r * 0.8, 0, 0, Math.PI * 2);
                    ctx.fill();
                    break;
                }
                default: {
                    const r = p.size || 8;
                    ctx.fillStyle = color;
                    ctx.beginPath();
                    ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2);
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

        const s = Math.min(scale, 2); // cap scale to limit particle count

        // Core flash
        this.addParticle(x, y, '#ffffff', 1, 'flash', 8 * s, { lifeBonus: 0.1, speed: 0 });

        if (isVoid) {
            this.addParticle(x, y, color, 8 * s, 'implode', 2 * s, { speed: 180 * s });
            this.addParticle(x, y, '#110033', 6 * s, 'smoke', 3 * s, { lifeBonus: 0.8, speed: 40 });
        } else if (isRock) {
            this.addParticle(x, y, color, 10 * s, 'fragment', 3 * s, { gravity: true, speed: 350 * s });
            this.addParticle(x, y, '#555555', 6 * s, 'smoke', 3 * s, { lifeBonus: 0.6, speed: 30 });
        } else if (isTech) {
            this.addParticle(x, y, color, 8 * s, 'slash', 2 * s, { speed: 500 * s });
            this.addParticle(x, y, '#ffffff', 6 * s, 'star', 1.5 * s, { speed: 600 * s });
        } else if (isPlasma) {
            this.addParticle(x, y, color, 8 * s, 'explosion', 2 * s, { speed: 350 * s });
            this.addParticle(x, y, '#ffffff', 6 * s, 'star', 1.5 * s, { speed: 500 * s });
        } else if (isIce) {
            this.addParticle(x, y, color, 12 * s, 'fragment', 2 * s, { speed: 280 * s });
            this.addParticle(x, y, '#ffffff', 6 * s, 'star', 1 * s, { speed: 180 * s });
        } else if (isBio) {
            this.addParticle(x, y, color, 10 * s, 'smoke', 2 * s, { speed: 150 * s, lifeBonus: 0.5 });
            this.addParticle(x, y, '#22c55e', 5 * s, 'blood', 2 * s, { gravity: true, speed: 220 * s });
        } else {
            this.addParticle(x, y, color, 8 * s, 'explosion', 2 * s, { gravity: true, speed: 320 * s });
            this.addParticle(x, y, '#ffffff', 5 * s, 'star', 1.5 * s, { gravity: true, speed: 420 * s });
            this.addParticle(x, y, '#333333', 5 * s, 'smoke', 2.5 * s, { lifeBonus: 0.4, speed: 40 });
        }
    }

    createHitEffect(x, y, color, angle, scale = 1) {
        this.addParticle(x, y, color, 4, 'star', 1.2 * scale, { angle, speed: 260 * scale });
        this.addParticle(x, y, '#ffffff', 2, 'star', 0.8 * scale, { angle, speed: 360 * scale });
    }

    createLevelUp(x, y) {
        for (let i = 0; i < 20; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 180 + Math.random() * 80;
            this.particles.push({
                x: x + Math.cos(angle) * dist,
                y: y + Math.sin(angle) * dist,
                vx: 0, vy: 0,
                targetX: x, targetY: y,
                life: 1.2, maxLife: 1.2,
                color: ['#00ffff', '#ff00ff', '#ffff00'][Math.floor(Math.random() * 3)],
                tint: ['#00ffff', '#ff00ff', '#ffff00'][Math.floor(Math.random() * 3)],
                type: 'implode',
                size: Math.random() * 14 + 6,
                rotation: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 10
            });
        }

        setTimeout(() => {
            this.createExplosion(x, y, '#00ffff', 2);
            this.createExplosion(x, y, '#ff00ff', 1.5);
        }, 900);
    }

    createPickup(x, y, color) {
        this.addParticle(x, y, color, 4, 'star', 1.0, { speed: 80 });
    }

    createKillEffect(x, y, effectId) {
        switch (effectId) {
            case 'explosion':
                this.addParticle(x, y, '#ff4500', 8, 'explosion', 2, { speed: 350 });
                this.addParticle(x, y, '#ffdd00', 4, 'flame', 2, { speed: 120 });
                this.addParticle(x, y, '#333333', 4, 'smoke', 3, { lifeBonus: 0.5, speed: 50 });

                break;
            case 'freeze':
                this.addParticle(x, y, '#aaeeff', 10, 'fragment', 2, { speed: 300 });
                this.addParticle(x, y, '#ffffff', 5, 'star', 1.5, { speed: 180 });

                break;
            case 'vaporize':
                this.addParticle(x, y, '#39ff14', 10, 'smoke', 2.5, { lifeBonus: 0.6, speed: 90 });
                this.addParticle(x, y, '#aaff00', 5, 'circle', 1.5, { speed: 140 });

                break;
            case 'implode':
                for (let i = 0; i < 14; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const dist = 55 + Math.random() * 40;
                    const c = ['#8a2be2', '#ff00ff'][i % 2];
                    this.particles.push({
                        x: x + Math.cos(angle) * dist, y: y + Math.sin(angle) * dist,
                        vx: 0, vy: 0, targetX: x, targetY: y,
                        life: 0.6, maxLife: 0.6, color: c, tint: c,
                        type: 'implode', size: Math.random() * 12 + 5,
                        rotation: Math.random() * Math.PI * 2, rotSpeed: (Math.random() - 0.5) * 10
                    });
                }

                break;
            case 'golden':
                this.addParticle(x, y, '#ffd700', 10, 'star', 2.5, { speed: 300, gravity: true });
                this.addParticle(x, y, '#fff4a0', 6, 'fragment', 1.8, { speed: 240, gravity: true });

                break;
        }
    }

    createTrail(x, y, trailId, frameCount) {
        const trailConfigs = {
            'fire':    { colors: ['#ff4500', '#ff7700', '#ffaa00'], type: 'flame', count: 2, size: 1.4 },
            'ice':     { colors: ['#00cfff', '#aaf0ff', '#ffffff'], type: 'fragment', count: 1, size: 1.0 },
            'void':    { colors: ['#8a2be2', '#6600cc', '#cc00ff'], type: 'implode', count: 1, size: 1.1 },
            'toxic':   { colors: ['#39ff14', '#00ff88', '#aaff00'], type: 'smoke', count: 1, size: 2.0 },
            'gold':    { colors: ['#ffd700', '#ffec6e', '#fff4a0'], type: 'star', count: 1, size: 1.6 },
            'plasma':  { colors: ['#00e5ff', '#ff00e5', '#ffffff'], type: 'star', count: 2, size: 1.3 },
            'shadow':  { colors: ['#222244', '#333355', '#0a0a20'], type: 'smoke', count: 2, size: 2.2 },
            'rainbow': { colors: ['#ff0000', '#ff8800', '#ffff00', '#00ff00', '#0088ff', '#8800ff'], type: 'star', count: 2, size: 1.4 },
        };
        const config = trailConfigs[trailId];
        if (config) {
            const color = config.colors[frameCount % config.colors.length];
            this.addParticle(x, y, color, config.count, config.type, config.size, { speed: 45, lifeBonus: -0.15 });
        }
    }
}