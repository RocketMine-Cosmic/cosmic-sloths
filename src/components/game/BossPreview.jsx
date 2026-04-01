import React, { useRef, useEffect } from 'react';
import { ENEMIES } from '../../game/Constants';
import { drawEnemy } from '../../game/EnemyRenderer';

export default function BossPreview({ bossId }) {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        
        const bossTemplate = ENEMIES.find(e => e.id === bossId);
        if (!bossTemplate) return;

        let animationId;
        let startTime = performance.now();

        const loop = (timestamp) => {
            const time = (timestamp - startTime) / 1000;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.save();
            
            // Scale to fit a 300x300 canvas. Max boss drawSize is ~ 160 * 3.5 = 560
            const scale = 300 / 600;
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.scale(scale, scale);
            
            const localBoss = { ...bossTemplate, x: 0, y: 0 };
            drawEnemy(ctx, localBoss, time, -100); // playerX < boss.x makes it face left
            
            ctx.restore();
            animationId = requestAnimationFrame(loop);
        };
        
        animationId = requestAnimationFrame(loop);

        return () => cancelAnimationFrame(animationId);
    }, [bossId]);

    return (
        <canvas 
            ref={canvasRef} 
            width={300} 
            height={300} 
            className="w-48 h-48 sm:w-64 sm:h-64 object-contain pointer-events-none"
        />
    );
}