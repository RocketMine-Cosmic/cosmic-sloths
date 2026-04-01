import React, { useEffect, useRef } from 'react';

export default function SpaceBackground() {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        let animId;
        let time = 0;

        const stars = Array.from({ length: 220 }, () => ({
            x: Math.random(),
            y: Math.random(),
            size: Math.random() * 1.8 + 0.2,
            speed: Math.random() * 0.00008 + 0.00002,
            phase: Math.random() * Math.PI * 2,
            color: Math.random() > 0.85 ? (Math.random() > 0.5 ? '#a78bfa' : '#67e8f9') : '#ffffff',
        }));

        const nebulae = [
            { x: 0.15, y: 0.25, rx: 0.25, ry: 0.18, color: '99,102,241', opacity: 0.06 },
            { x: 0.78, y: 0.65, rx: 0.30, ry: 0.20, color: '6,182,212', opacity: 0.05 },
            { x: 0.50, y: 0.80, rx: 0.20, ry: 0.15, color: '168,85,247', opacity: 0.04 },
            { x: 0.88, y: 0.12, rx: 0.18, ry: 0.14, color: '239,68,68', opacity: 0.035 },
        ];

        const resize = () => {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        const draw = () => {
            const W = canvas.width;
            const H = canvas.height;
            time += 0.016;

            // Deep space background gradient
            const bg = ctx.createLinearGradient(0, 0, W * 0.4, H);
            bg.addColorStop(0, '#020408');
            bg.addColorStop(0.5, '#050c18');
            bg.addColorStop(1, '#030710');
            ctx.fillStyle = bg;
            ctx.fillRect(0, 0, W, H);

            // Nebula blobs
            nebulae.forEach(n => {
                const pulse = 1 + Math.sin(time * 0.3 + n.x * 10) * 0.08;
                const grd = ctx.createRadialGradient(
                    n.x * W, n.y * H, 0,
                    n.x * W, n.y * H, Math.max(n.rx * W, n.ry * H) * pulse
                );
                grd.addColorStop(0, `rgba(${n.color},${n.opacity * 2})`);
                grd.addColorStop(0.5, `rgba(${n.color},${n.opacity})`);
                grd.addColorStop(1, `rgba(${n.color},0)`);
                ctx.save();
                ctx.scale(1, n.ry / n.rx);
                ctx.fillStyle = grd;
                ctx.beginPath();
                ctx.arc(n.x * W, (n.y * H) * (n.rx / n.ry), n.rx * W * pulse, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            });

            // Stars
            stars.forEach(s => {
                const twinkle = 0.4 + Math.sin(time * 2 + s.phase) * 0.6;
                ctx.globalAlpha = twinkle;
                ctx.fillStyle = s.color;
                const sx = ((s.x + time * s.speed) % 1) * W;
                const sy = s.y * H;
                ctx.beginPath();
                ctx.arc(sx, sy, s.size, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.globalAlpha = 1;

            // Horizontal scanline overlay (subtle)
            ctx.fillStyle = 'rgba(0,0,0,0.03)';
            for (let y = 0; y < H; y += 4) {
                ctx.fillRect(0, y, W, 2);
            }

            // Bottom vignette
            const vig = ctx.createLinearGradient(0, H * 0.6, 0, H);
            vig.addColorStop(0, 'rgba(2,4,8,0)');
            vig.addColorStop(1, 'rgba(2,4,8,0.7)');
            ctx.fillStyle = vig;
            ctx.fillRect(0, 0, W, H);

            // Side vignettes
            const vigL = ctx.createLinearGradient(0, 0, W * 0.15, 0);
            vigL.addColorStop(0, 'rgba(2,4,8,0.6)');
            vigL.addColorStop(1, 'rgba(2,4,8,0)');
            ctx.fillStyle = vigL;
            ctx.fillRect(0, 0, W, H);

            const vigR = ctx.createLinearGradient(W, 0, W * 0.85, 0);
            vigR.addColorStop(0, 'rgba(2,4,8,0.6)');
            vigR.addColorStop(1, 'rgba(2,4,8,0)');
            ctx.fillStyle = vigR;
            ctx.fillRect(0, 0, W, H);

            animId = requestAnimationFrame(draw);
        };

        animId = requestAnimationFrame(draw);
        return () => {
            cancelAnimationFrame(animId);
            window.removeEventListener('resize', resize);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 w-full h-full pointer-events-none"
            style={{ zIndex: 0 }}
        />
    );
}