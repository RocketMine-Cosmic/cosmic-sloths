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
        ctx.save();
        
        // Draw normal particles
        ctx.globalCompositeOperation = 'screen';
        this.particles.forEach(p => {
            if (p.type === 'smoke') return; // Draw smoke later with source-over
            
            ctx.globalAlpha = Math.max(0, p.life / (p.maxLife || 1));
            ctx.fillStyle = p.color;
            ctx.strokeStyle = p.color;
            
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation || 0);

            if (p.type === 'spark') {
                ctx.fillRect(-p.size/2, -p.size*2, p.size, p.size*4); // Stretched spark
            } else if (p.type === 'glow') {
                const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size);
                grad.addColorStop(0, p.color);
                grad.addColorStop(1, 'transparent');
                ctx.fillStyle = grad;
                ctx.fillRect(-p.size, -p.size, p.size * 2, p.size * 2);
            } else if (p.type === 'slash') {
                ctx.fillRect(-p.size*2, -p.size/4, p.size*4, p.size/2);
            } else if (p.type === 'glitch') {
                ctx.fillRect(-p.size, -p.size/2, p.size*2, p.size);
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(-p.size/2, -p.size/4, p.size, p.size/2);
            } else if (p.type === 'circle') {
                ctx.beginPath(); ctx.arc(0, 0, p.size, 0, Math.PI*2); ctx.fill();
            } else if (p.type === 'shatter') {
                ctx.beginPath();
                ctx.moveTo(0, -p.size);
                ctx.lineTo(p.size, p.size);
                ctx.lineTo(-p.size, p.size);
                ctx.fill();
            } else if (p.type === 'shockwave') {
                ctx.beginPath();
                ctx.arc(0, 0, p.size, 0, Math.PI*2);
                ctx.lineWidth = p.lineWidth || 2;
                ctx.stroke();
            } else if (p.type === 'implode') {
                ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
            } else {
                const s = p.size ? p.size : 4;
                ctx.fillRect(-s/2, -s/2, s, s);
            }
            ctx.restore();
        });
        
        // Draw smoke
        ctx.globalCompositeOperation = 'source-over';
        this.particles.forEach(p => {
            if (p.type !== 'smoke') return;
            ctx.globalAlpha = Math.max(0, p.life / (p.maxLife || 1)) * 0.5;
            ctx.fillStyle = p.color;
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation || 0);
            ctx.beginPath(); ctx.arc(0, 0, p.size, 0, Math.PI*2); ctx.fill();
            ctx.restore();
        });

        ctx.restore();
    }

    addParticle(x, y, color, count, type = 'spark', sizeMult = 1, options = {}) {
        for(let i=0; i<count; i++) {
            const angle = options.angle !== undefined ? options.angle + (Math.random()-0.5)*0.5 : Math.random() * Math.PI * 2;
            const speed = options.speed !== undefined ? options.speed : Math.random() * 150 * sizeMult + 50;
            this.particles.push({
                x, y, 
                vx: Math.cos(angle) * speed, 
                vy: Math.sin(angle) * speed,
                life: Math.random() * 0.5 + 0.2 + (options.lifeBonus || 0), 
                maxLife: 0.7 + (options.lifeBonus || 0),
                color,
                type,
                size: (Math.random() * 4 + 2) * sizeMult,
                rotation: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 15,
                gravity: options.gravity || false,
                ...options
            });
        }
    }

    createExplosion(x, y, color, scale = 1) {
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

        // Sparks
        this.addParticle(x, y, color, 30 * scale, 'spark', 2 * scale, { gravity: true, speed: Math.random() * 400 * scale + 100 });
        this.addParticle(x, y, '#ffffff', 15 * scale, 'spark', 1.5 * scale, { gravity: true, speed: Math.random() * 500 * scale + 200 });
        
        // Shatter pieces
        this.addParticle(x, y, color, 10 * scale, 'shatter', 3 * scale, { gravity: true, speed: Math.random() * 300 * scale + 50 });
        
        // Smoke
        this.addParticle(x, y, '#333333', 15 * scale, 'smoke', 3 * scale, { lifeBonus: 0.5 });
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
}