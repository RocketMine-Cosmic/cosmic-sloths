import React, { useEffect, useRef } from 'react';
import { ParticleManager } from '../../game/ParticleManager';

const TRAIL_CONFIGS = {
    default: null,
    fire:    { colors: ['#ff4500', '#ff7700', '#ffaa00'] },
    ice:     { colors: ['#00cfff', '#aaf0ff', '#ffffff'] },
    toxic:   { colors: ['#39ff14', '#00ff88', '#aaff00'] },
    void:    { colors: ['#8a2be2', '#6600cc', '#cc00ff'] },
    gold:    { colors: ['#ffd700', '#ffec6e', '#fff4a0'] },
    plasma:  { colors: ['#00e5ff', '#ff00e5', '#ffffff'] },
    shadow:  { colors: ['#222244', '#333355', '#0a0a20'] },
    rainbow: { colors: ['#ff0000', '#ff8800', '#ffff00', '#00ff00', '#0088ff', '#8800ff'] },
};

export default function CosmeticPreview({ trailId = 'default', killEffectId = 'none' }) {
    const canvasRef = useRef(null);
    const stateRef = useRef({ time: 0, frame: 0, animId: null });

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const W = canvas.width;
        const H = canvas.height;
        const state = stateRef.current;

        state.time = 0;
        state.frame = 0;

        const pm = new ParticleManager();

        const dummies = [
            { x: W * 0.22, y: H * 0.3,  alive: true, respawn: 0 },
            { x: W * 0.78, y: H * 0.35, alive: true, respawn: 0 },
            { x: W * 0.5,  y: H * 0.72, alive: true, respawn: 0 },
        ];

        const trailCfg = TRAIL_CONFIGS[trailId];

        let last = performance.now();
        const loop = (now) => {
            const dt = Math.min((now - last) / 1000, 0.05);
            last = now;
            state.time += dt;
            state.frame++;

            const px = W / 2 + Math.sin(state.time * 0.8) * W * 0.32;
            const py = H / 2 + Math.sin(state.time * 1.6) * H * 0.22;

            // Respawn dummies
            dummies.forEach(d => {
                if (!d.alive) {
                    d.respawn -= dt;
                    if (d.respawn <= 0) d.alive = true;
                }
            });

            // Kill dummies on contact
            dummies.forEach(d => {
                if (!d.alive) return;
                if (Math.hypot(d.x - px, d.y - py) < 30) {
                    d.alive = false;
                    d.respawn = 2.5;
                    if (killEffectId !== 'none') {
                        pm.createKillEffect(d.x, d.y, killEffectId);
                    } else {
                        pm.createExplosion(d.x, d.y, '#ff4444', 0.6, 'default');
                    }
                }
            });

            // Trail
            if (trailCfg && state.frame % 2 === 0) {
                pm.createTrail(px, py, trailId, state.frame);
            }

            pm.update(dt);

            // Draw background
            ctx.fillStyle = '#0d1117';
            ctx.fillRect(0, 0, W, H);

            // Grid
            ctx.strokeStyle = 'rgba(255,255,255,0.04)';
            ctx.lineWidth = 1;
            for (let gx = 0; gx < W; gx += 30) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke(); }
            for (let gy = 0; gy < H; gy += 30) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke(); }

            // Draw particles
            pm.draw(ctx);

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
                ctx.arc(d.x, d.y, 13, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                ctx.fillStyle = '#ff6666';
                ctx.font = 'bold 13px monospace';
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
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = '#ffffff';
            ctx.font = '10px monospace';
            ctx.textAlign = 'center';
            ctx.globalAlpha = 1;
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.fillText('LIVE PREVIEW — fly into enemies to trigger kill effect', W / 2, H - 8);

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
        />
    );
}