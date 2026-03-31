export class ParticleManager {
    constructor() {
        this.particles = [];
    }

    update(dt) {
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
                    ctx.shadowColor = color;
                    ctx.shadowBlur = 8;
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
                    ctx.shadowColor = color;
                    ctx.shadowBlur = 10;
                    ctx.strokeStyle = color;
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2);
                    ctx.stroke();
                    break;
                }
                case 'ring': {
                    const r = p.size || 12;
                    ctx.shadowColor = color;
                    ctx.shadowBlur = 12;
                    ctx.strokeStyle = color;
                    ctx.lineWidth = (p.lineWidth || 3);
                    ctx.beginPath();
                    ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2);
                    ctx.stroke();
                    break;
                }
                case 'shockwave': {
                    ctx.shadowColor = color;
                    ctx.shadowBlur = 20;
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
                    ctx.shadowColor = color;
                    ctx.shadowBlur = 6;
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
                    ctx.shadowColor = color;
                    ctx.shadowBlur = 12;
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
                    // Jagged explosion burst
                    ctx.shadowColor = color;
                    ctx.shadowBlur = 16;
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
                    ctx.shadowColor = color;
                    ctx.shadowBlur = 14;
                    // Diamond / inward burst
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
                    ctx.shadowColor = color;
                    ctx.shadowBlur = 8;
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

        // Core flash
        this.addParticle(x, y, '#ffffff', 1, 'flash', 8 * scale, { lifeBonus: 0.1, speed: 0 });
        this.addParticle(x, y, color, 1, 'flash', 12 * scale, { lifeBonus: 0.2, speed: 0 });

        // Shockwave ring
        this.particles.push({
            x, y, vx: 0, vy: 0,
            life: 0.45, maxLife: 0.45,
            color, tint: color, type: 'shockwave',
            size: 10 * scale, growthRate: 700 * scale, lineWidth: 5 * scale
        });

        if (isVoid) {
            this.addParticle(x, y, color, 20 * scale, 'implode', 2 * scale, { speed: 180 * scale });
            this.addParticle(x, y, '#110033', 15 * scale, 'smoke', 3.5 * scale, { lifeBonus: 1.0, speed: 40 });
            this.addParticle(x, y, '#a855f7', 8 * scale, 'ring', 2 * scale, { speed: 120 * scale });
        } else if (isRock) {
            this.addParticle(x, y, color, 30 * scale, 'fragment', 3.5 * scale, { gravity: true, speed: 350 * scale });
            this.addParticle(x, y, '#888888', 8 * scale, 'fragment', 2 * scale, { gravity: true, speed: 500 * scale });
            this.addParticle(x, y, '#555555', 20 * scale, 'smoke', 4 * scale, { lifeBonus: 0.8, speed: 30 });
        } else if (isTech) {
            this.addParticle(x, y, color, 18 * scale, 'slash', 2.5 * scale, { speed: 500 * scale });
            this.addParticle(x, y, '#ffffff', 15 * scale, 'star', 2 * scale, { speed: 600 * scale });
            this.addParticle(x, y, color, 8 * scale, 'circle', 2 * scale, { speed: 300 * scale });
        } else if (isPlasma) {
            this.addParticle(x, y, color, 20 * scale, 'explosion', 2.5 * scale, { speed: 350 * scale });
            this.addParticle(x, y, '#ffffff', 15 * scale, 'star', 1.5 * scale, { speed: 550 * scale });
            this.addParticle(x, y, color, 5 * scale, 'ring', 2 * scale, { speed: 200 * scale });
        } else if (isIce) {
            this.addParticle(x, y, color, 35 * scale, 'fragment', 2 * scale, { speed: 280 * scale });
            this.addParticle(x, y, '#ffffff', 20 * scale, 'star', 1.2 * scale, { speed: 180 * scale });
            this.addParticle(x, y, '#aaeeff', 8 * scale, 'ring', 1.5 * scale, { speed: 200 * scale });
        } else if (isBio) {
            this.addParticle(x, y, color, 25 * scale, 'smoke', 2.5 * scale, { speed: 180 * scale, lifeBonus: 0.6 });
            this.addParticle(x, y, '#22c55e', 12 * scale, 'blood', 2.5 * scale, { gravity: true, speed: 250 * scale });
            this.addParticle(x, y, '#aaff00', 8 * scale, 'circle', 2 * scale, { speed: 150 * scale });
        } else {
            // Default generic
            this.addParticle(x, y, color, 15 * scale, 'explosion', 2 * scale, { gravity: true, speed: 350 * scale });
            this.addParticle(x, y, '#ffffff', 10 * scale, 'star', 1.5 * scale, { gravity: true, speed: 450 * scale });
            this.addParticle(x, y, color, 8 * scale, 'fragment', 3 * scale, { gravity: true, speed: 280 * scale });
            this.addParticle(x, y, '#333333', 12 * scale, 'smoke', 3 * scale, { lifeBonus: 0.5, speed: 40 });
        }
    }

    createHitEffect(x, y, color, angle, scale = 1) {
        this.addParticle(x, y, color, 8 * scale, 'star', 1.2 * scale, { angle, speed: 280 * scale });
        this.addParticle(x, y, '#ffffff', 4 * scale, 'star', 0.8 * scale, { angle, speed: 380 * scale });
        this.addParticle(x, y, color, 1, 'flash', 4 * scale, { speed: 0, lifeBonus: -0.3 });
    }

    createLevelUp(x, y) {
        for (let i = 0; i < 40; i++) {
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
        this.addParticle(x, y, color, 8, 'star', 1.2, { speed: 90 });
        this.addParticle(x, y, '#ffffff', 4, 'flash', 1, { speed: 0 });
        this.particles.push({
            x, y, vx: 0, vy: 0,
            life: 0.3, maxLife: 0.3,
            color, tint: color, type: 'shockwave',
            size: 5, growthRate: 280, lineWidth: 2
        });
    }

    createKillEffect(x, y, effectId) {
        switch (effectId) {
            case 'explosion':
                // Fiery burst with ash smoke
                this.addParticle(x, y, '#ff4500', 12, 'explosion', 2.5, { speed: 380 });
                this.addParticle(x, y, '#ffdd00', 8, 'flame', 2.5, { speed: 150 });
                this.addParticle(x, y, '#ff8800', 6, 'star', 2, { speed: 500, gravity: true });
                this.addParticle(x, y, '#333333', 5, 'smoke', 3.5, { lifeBonus: 0.6, speed: 60 });
                this.particles.push({ x, y, vx: 0, vy: 0, life: 0.35, maxLife: 0.35, color: '#ff6600', tint: '#ff6600', type: 'shockwave', size: 8, growthRate: 500, lineWidth: 4 });
                break;

            case 'freeze':
                // Icy crystal shatter
                this.addParticle(x, y, '#aaeeff', 18, 'fragment', 2, { speed: 320 });
                this.addParticle(x, y, '#ffffff', 10, 'star', 1.5, { speed: 200 });
                this.addParticle(x, y, '#00cfff', 6, 'ring', 1.5, { speed: 150 });
                this.particles.push({ x, y, vx: 0, vy: 0, life: 0.4, maxLife: 0.4, color: '#00cfff', tint: '#00cfff', type: 'shockwave', size: 8, growthRate: 420, lineWidth: 3 });
                break;

            case 'vaporize':
                // Toxic green dissolve
                this.addParticle(x, y, '#39ff14', 20, 'smoke', 3, { lifeBonus: 0.8, speed: 100 });
                this.addParticle(x, y, '#aaff00', 10, 'circle', 1.8, { speed: 160 });
                this.addParticle(x, y, '#00ff88', 6, 'slash', 2, { speed: 250 });
                this.particles.push({ x, y, vx: 0, vy: 0, life: 0.5, maxLife: 0.5, color: '#39ff14', tint: '#39ff14', type: 'shockwave', size: 5, growthRate: 350, lineWidth: 3 });
                break;

            case 'implode':
                // Void singularity suck-in
                for (let i = 0; i < 28; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const dist = 60 + Math.random() * 50;
                    const c = ['#8a2be2', '#ff00ff', '#4b0082'][i % 3];
                    this.particles.push({
                        x: x + Math.cos(angle) * dist,
                        y: y + Math.sin(angle) * dist,
                        vx: 0, vy: 0,
                        targetX: x, targetY: y,
                        life: 0.65, maxLife: 0.65,
                        color: c, tint: c,
                        type: 'implode',
                        size: Math.random() * 14 + 6,
                        rotation: Math.random() * Math.PI * 2,
                        rotSpeed: (Math.random() - 0.5) * 12
                    });
                }
                this.particles.push({ x, y, vx: 0, vy: 0, life: 0.3, maxLife: 0.3, color: '#ffffff', tint: '#ffffff', type: 'shockwave', size: 5, growthRate: 350, lineWidth: 5 });
                this.addParticle(x, y, '#8a2be2', 1, 'flash', 5, { speed: 0 });
                break;

            case 'golden':
                // Gold coin shatter
                this.addParticle(x, y, '#ffd700', 16, 'star', 3, { speed: 330, gravity: true });
                this.addParticle(x, y, '#fff4a0', 10, 'fragment', 2, { speed: 260, gravity: true });
                this.addParticle(x, y, '#ffaa00', 4, 'flash', 2, { speed: 0 });
                this.particles.push({ x, y, vx: 0, vy: 0, life: 0.4, maxLife: 0.4, color: '#ffd700', tint: '#ffd700', type: 'shockwave', size: 6, growthRate: 450, lineWidth: 3 });
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