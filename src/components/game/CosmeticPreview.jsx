import React, { useEffect, useRef } from 'react';

const TRAIL_CONFIGS = {
    default: null,
    fire:    { colors: ['#ff4500', '#ff6b00', '#ffaa00'], type: 'trail' },
    ice:     { colors: ['#00cfff', '#a0f0ff', '#ffffff'], type: 'trail' },
    toxic:   { colors: ['#39ff14', '#00ff88', '#aaff00'], type: 'trail' },
    void:    { colors: ['#8a2be2', '#cc00ff', '#4b0082'], type: 'trail' },
    gold:    { colors: ['#ffd700', '#ffec6e', '#fff4a0'], type: 'trail' },
    plasma:  { colors: ['#00e5ff', '#ff00e5', '#ffffff'], type: 'trail' },
    shadow:  { colors: ['#1a1a2e', '#444466', '#0a0a1a'], type: 'trail' },
    rainbow: { colors: ['#ff0000', '#ff8800', '#ffff00', '#00ff00', '#0088ff', '#8800ff'], type: 'trail' },
};

const KILL_CONFIGS = {
    none:      null,
    explosion: { colors: ['#ff4500', '#ff8800', '#ffdd00'], label: 'Explosion' },
    freeze:    { colors: ['#aaeeff', '#00cfff', '#ffffff'], label: 'Freeze Burst' },
    vaporize:  { colors: ['#00ff88', '#39ff14', '#ffffff'], label: 'Vaporize' },
    implode:   { colors: ['#8a2be2', '#ff00ff', '#000000'], label: 'Implode' },
    golden:    { colors: ['#ffd700', '#fff4a0', '#ffaa00'], label: 'Gold Shatter' },
};

export default function CosmeticPreview({ trailId = 'default', killEffectId = 'none' }) {
    const canvasRef = useRef(null);
    const stateRef = useRef({
        particles: [],
        playerX: 0,
        playerY: 0,
        angle: 0,
        time: 0,
        killTimer: 0,
        animId: null,
    });

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const W = canvas.width;
        const H = canvas.height;
        const state = stateRef.current;

        state.playerX = W / 2;
        state.playerY = H / 2;
        state.particles = [];
        state.time = 0;
        state.killTimer = 0;

        const trailCfg = TRAIL_CONFIGS[trailId];
        const killCfg = KILL_CONFIGS[killEffectId];

        const spawnTrailParticle = () => {
            if (!trailCfg) return;
            const color = trailCfg.colors[Math.floor(Math.random() * trailCfg.colors.length)];
            state.particles.push({
                x: state.playerX + (Math.random() - 0.5) * 6,
                y: state.playerY + (Math.random() - 0.5) * 6,
                vx: (Math.random() - 0.5) * 30,
                vy: (Math.random() - 0.5) * 30,
                life: 0.6 + Math.random() * 0.4,
                maxLife: 1.0,
                size: 3 + Math.random() * 5,
                color,
                type: 'trail',
            });
        };

        const spawnKillEffect = (cx, cy) => {
            if (!killCfg) return;
            for (let i = 0; i < 30; i++) {
                const angle = (Math.PI * 2 / 30) * i + Math.random() * 0.3;
                const speed = 40 + Math.random() * 120;
                const color = killCfg.colors[Math.floor(Math.random() * killCfg.colors.length)];
                state.particles.push({
                    x: cx, y: cy,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    life: 0.8 + Math.random() * 0.4,
                    maxLife: 1.2,
                    size: 4 + Math.random() * 8,
                    color,
                    type: 'kill',
                });
            }
        };

        // Enemy dummies
        const dummies = [
            { x: W * 0.2, y: H * 0.3, alive: true, respawn: 0 },
            { x: W * 0.8, y: H * 0.4, alive: true, respawn: 0 },
            { x: W * 0.5, y: H * 0.75, alive: true, respawn: 0 },
        ];

        let last = performance.now();
        const loop = (now) => {
            const dt = Math.min((now - last) / 1000, 0.05);
            last = now;
            state.time += dt;

            // Move player in a figure-8
            const px = W / 2 + Math.sin(state.time * 0.8) * W * 0.32;
            const py = H / 2 + Math.sin(state.time * 1.6) * H * 0.22;
            state.playerX = px;
            state.playerY = py;

            // Respawn dummies
            dummies.forEach(d => {
                if (!d.alive) {
                    d.respawn -= dt;
                    if (d.respawn <= 0) d.alive = true;
                }
            });

            // Check if player near a dummy → kill it
            dummies.forEach(d => {
                if (!d.alive) return;
                const dist = Math.hypot(d.x - px, d.y - py);
                if (dist < 35) {
                    d.alive = false;
                    d.respawn = 2.5;
                    spawnKillEffect(d.x, d.y);
                }
            });

            // Spawn trail
            if (trailCfg) {
                spawnTrailParticle();
                if (trailId === 'rainbow') spawnTrailParticle();
                if (trailId === 'void') spawnTrailParticle();
            }

            // Update particles
            state.particles = state.particles.filter(p => {
                p.life -= dt;
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.vx *= 0.95;
                p.vy *= 0.95;
                return p.life > 0;
            });

            // Draw
            ctx.clearRect(0, 0, W, H);

            // Background
            ctx.fillStyle = '#0d1117';
            ctx.fillRect(0, 0, W, H);

            // Subtle grid
            ctx.strokeStyle = 'rgba(255,255,255,0.04)';
            ctx.lineWidth = 1;
            for (let gx = 0; gx < W; gx += 30) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke(); }
            for (let gy = 0; gy < H; gy += 30) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke(); }

            // Draw particles
            state.particles.forEach(p => {
                const alpha = Math.max(0, p.life / p.maxLife);
                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.shadowColor = p.color;
                ctx.shadowBlur = p.type === 'kill' ? 16 : 8;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            });

            // Draw dummies
            dummies.forEach(d => {
                if (!d.alive) return;
                ctx.save();
                ctx.shadowColor = '#ff4444';
                ctx.shadowBlur = 10;
                ctx.strokeStyle = '#ff4444';
                ctx.lineWidth = 2;
                ctx.fillStyle = 'rgba(255,50,50,0.15)';
                ctx.beginPath();
                ctx.arc(d.x, d.y, 14, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                ctx.fillStyle = '#ff6666';
                ctx.font = 'bold 14px monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('✕', d.x, d.y);
                ctx.restore();
            });

            // Draw player
            ctx.save();
            const charColor = trailCfg ? trailCfg.colors[0] : '#00cfff';
            ctx.shadowColor = charColor;
            ctx.shadowBlur = 18;
            ctx.fillStyle = charColor;
            ctx.beginPath();
            ctx.arc(px, py, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(px - 3, py - 3, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // Label
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.font = '10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('LIVE PREVIEW — Fly into enemies to see kill effect', W / 2, H - 8);

            state.animId = requestAnimationFrame(loop);
        };

        state.animId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(state.animId);
    }, [trailId, killEffectId]);

    return (
        <canvas
            ref={canvasRef}
            width={320}
            height={180}
            className="w-full rounded-xl border border-slate-700 bg-slate-950"
            style={{ imageRendering: 'pixelated' }}
        />
    );
}