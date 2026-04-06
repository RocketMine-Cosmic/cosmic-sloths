import React, { useEffect, useRef } from 'react';
import { ParticleManager } from '../../game/ParticleManager';

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
        
        const pm = new ParticleManager();

        const dummies = [
            { x: W * 0.22, y: H * 0.3,  alive: true, respawn: 0 },
            { x: W * 0.78, y: H * 0.35, alive: true, respawn: 0 },
            { x: W * 0.5,  y: H * 0.72, alive: true, respawn: 0 },
        ];

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
                    if (killEffectId !== 'none') {
                        pm.createKillEffect(d.x, d.y, killEffectId);
                    }
                }
            });

            // Trail particles — every 4 frames
            if (trailId !== 'default' && frame % 4 === 0) {
                pm.createTrail(px, py, trailId, frame);
            }

            pm.update(dt);

            // --- Draw ---
            ctx.fillStyle = '#0d1117';
            ctx.fillRect(0, 0, W, H);

            // Grid (drawn once cheaply)
            ctx.strokeStyle = 'rgba(255,255,255,0.04)';
            ctx.lineWidth = 1;
            for (let gx = 0; gx < W; gx += 30) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke(); }
            for (let gy = 0; gy < H; gy += 30) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke(); }

            // Draw particles
            pm.draw(ctx, 0, 0, W, H);

            // Dummies
            ctx.globalCompositeOperation = 'source-over';
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

            // Player — simple circle
            const pc = '#00cfff';
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