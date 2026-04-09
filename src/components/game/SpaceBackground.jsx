import React, { useEffect, useRef } from 'react';

import { CosmicBackground } from '../../game/CosmicBackground';

export default function SpaceBackground({ arenaId = 'station' }) {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        let cosmicBg = new CosmicBackground(canvas, arenaId);

        let animId;
        let time = 0;
        let isVisible = false;

        const observer = new IntersectionObserver((entries) => {
            isVisible = entries[0].isIntersecting;
            if (isVisible && !animId) {
                animId = requestAnimationFrame(draw);
            }
        });
        observer.observe(canvas);

        const resize = () => {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        const draw = () => {
            if (!isVisible) {
                animId = null;
                return;
            }
            time += 0.016;
            cosmicBg.draw(time * 50, time * 20, 1, time); // Auto-scroll slightly for menus
            animId = requestAnimationFrame(draw);
        };

        animId = requestAnimationFrame(draw);
        return () => {
            observer.disconnect();
            if (animId) cancelAnimationFrame(animId);
            window.removeEventListener('resize', resize);
        };
    }, [arenaId]);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 w-full h-full pointer-events-none"
            style={{ zIndex: 0 }}
        />
    );
}