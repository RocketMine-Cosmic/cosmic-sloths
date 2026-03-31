import React, { useEffect, useRef } from 'react';

const TRAIL_COLORS = {
    default: null,
    fire:    ['#ff4500', '#ff7700', '#ffaa00'],
    ice:     ['#00cfff', '#aaf0ff', '#ffffff'],
    toxic:   ['#39ff14', '#00ff88', '#aaff00'],
    void:    ['#8a2be2', '#cc00ff', '#4b0082'],
    gold:    ['#ffd700', '#ffec6e', '#fff4a0'],
    plasma:  ['#00e5ff', '#ff00e5', '#ffffff'],
    shadow:  ['#444466', '#222244', '#888899'],
    rainbow: ['#ff0000', '#ff8800', '#ffff00', '#00ff00', '#0088ff', '#8800ff'],
};

const KILL_COLORS = {
    none:      null,
    explosion: ['#ff4500', '#ff8800', '#ffdd00'],
    freeze:    ['#aaeeff', '#00cfff', '#ffffff'],
    vaporize:  ['#39ff14', '#00ff88', '#aaff00'],
    implode:   ['#8a2be2', '#ff00ff', '#cc44ff'],
    golden:    ['#ffd700', '#fff4a0', '#ffaa00'],
};

export default function CosmeticPreview({ trailId = 'default', killEffectId = 'none' }) {
    const canvasRef = useRef(null);
    const stateRef = useRef({ animId: null });

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const W = canvas.width;
        const H = canvas.height;

        let time = 0;
        let frame = 0;
        const particles = [];

        const trailColors = TRAIL_COLORS[trailId];
        const killColors = KILL_COLORS[killEffectId];

        const dummies = [
            { x: W * 0.22, y: H * 0.3,  alive: true, respawn: 0 },
            { x: W * 0.78, y: H * 0.35, alive: true, respawn: 0 },
            { x: W * 0.5,  y: H * 0.72, alive: true, respawn: 0 },
        ];

        const spawnKill = (cx, cy) => {
            if (!killColors) return;
            for (let i = 0; i < 18; i++) {
                const angle = (Math.PI * 2 / 18) * i;
                const speed = 30 + Math.random() * 80;
                particles.push({
                    x: cx, y: cy,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    life: 1.0, maxLife: 1.0,
                    size: 2 + Math.random() * 4,
                    color: killColors[Math.floor(Math.random() * killColors.length)],
                });
            }
        };

        let last = performance.now();
        const loop = (now) => {
            const dt = Math.min((now - last) / 1000, 0.05);
            last = now;
            time += dt;
            frame++;

            const px = W / 2 + Math.sin(time * 0.8) * W * 0.32;
            const py = H / 2 + Math.sin(time * 1.6) * H * 0.22;

            // Respawn dummies
            dummies.forEach(d => {
                if (!d.alive) { d.respawn -= dt; if (d.respawn <= 0) d.alive = true; }
            });

            // Kill on contact
            dummies.forEach(d => {
                if (!d.alive) return;
                if (Math.hypot(d.x - px, d.y - py) < 28) {
                    d.alive = false;
                    d.respawn = 2.5;
                    spawnKill(d.x, d.y);
                }
            });

            // Trail particles — every 2 frames
            if (trailColors && frame % 2 === 0) {
                particles.push({
                    x: px + (Math.random() - 0.5) * 4,
                    y: py + (Math.random() - 0.5) * 4,
                    vx: (Math.random() - 0.5) * 20,
                    vy: (Math.random() - 0.5) * 20,
                    life: 0.5 + Math.random() * 0.3,
                    maxLife: 0.8,
                    size: 2 + Math.random() * 3,
                    color: trailColors[frame % trailColors.length],
                });
            }

            // Cap particles
            if (particles.length > 200) particles.splice(0, particles.length - 200);

            // Update particles
            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];
                p.life -= dt;
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.vx *= 0.92;
                p.vy *= 0.92;
                if (p.life <= 0) particles.splice(i, 1);
            }

            // --- Draw ---
            ctx.fillStyle = '#0d1117';
            ctx.fillRect(0, 0, W, H);

            // Grid (drawn once cheaply)
            ctx.strokeStyle = 'rgba(255,255,255,0.04)';
            ctx.lineWidth = 1;
            for (let gx = 0; gx < W; gx += 30) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke(); }
            for (let gy = 0; gy < H; gy += 30) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke(); }

            // Particles — NO shadowBlur
            particles.forEach(p => {
                const alpha = Math.max(0, p.life / p.maxLife);
                ctx.globalAlpha = alpha;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.globalAlpha = 1;

            // Dummies
            dummies.forEach(d => {
                if (!d.alive) return;
                ctx.strokeStyle = '#ff4444';
                ctx.lineWidth = 2;
                ctx.fillStyle = 'rgba(255,50,50,0.15)';
                ctx.beginPath();
                ctx.arc(d.x, d.y, 13, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                ctx.fillStyle = '#ff6666';
                ctx.font = 'bold 13px monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('✕', d.x, d.y);
            });

            // Player — simple circle, no shadowBlur
            const pc = trailColors ? trailColors[0] : '#00cfff';
            ctx.fillStyle = pc;
            ctx.beginPath();
            ctx.arc(px, py, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(px - 3, py - 3, 3, 0, Math.PI * 2);
            ctx.fill();

            // Label
            ctx.fillStyle = 'rgba(255,255,255,0.25)';
            ctx.font = '9px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'alphabetic';
            ctx.fillText('fly into enemies to trigger kill effect', W / 2, H - 6);

            stateRef.current.animId = requestAnimationFrame(loop);
        };

        stateRef.current.animId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(stateRef.current.animId);
    }, [trailId, killEffectId]);

    return (
        <canvas
            ref={canvasRef}
            width={320}
            height={160}
            className="w-full rounded-xl border border-slate-700 bg-slate-950"
        />
    );
}