export function drawPickups(ctx, pickups, time) {
    const sorted = [...pickups].sort((a, b) => {
        const order = { gold: 0, reroll: 1, xp: 2 };
        return (order[a.type] ?? 1) - (order[b.type] ?? 1);
    });
    sorted.forEach(p => {
        ctx.save();
        ctx.translate(p.x, p.y);
        
        if (p.type === 'xp') {
            ctx.rotate(time * 2);
            
            ctx.globalCompositeOperation = 'screen';
            const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 35);
            grad.addColorStop(0, p.color);
            grad.addColorStop(0.3, p.color);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.globalAlpha = 0.5;
            ctx.beginPath();
            ctx.arc(0, 0, 35, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 0.8;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.moveTo(0, -18);
            ctx.lineTo(9, 0);
            ctx.lineTo(0, 18);
            ctx.lineTo(-9, 0);
            ctx.closePath();
            ctx.fill();
            
            ctx.globalAlpha = 1.0;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.moveTo(0, -9);
            ctx.lineTo(4.5, 0);
            ctx.lineTo(0, 9);
            ctx.lineTo(-4.5, 0);
            ctx.closePath();
            ctx.fill();

        } else if (p.type === 'gold') {
            const bounce = Math.sin(time * 6 + p.x) * 5;
            ctx.translate(0, bounce);
            ctx.rotate(Math.sin(time * 3 + p.y) * 0.3);
            
            ctx.globalCompositeOperation = 'screen';
            const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 40);
            grad.addColorStop(0, 'rgba(255, 215, 0, 0.8)');
            grad.addColorStop(0.4, 'rgba(255, 150, 0, 0.4)');
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.globalAlpha = 0.6;
            ctx.beginPath();
            ctx.arc(0, 0, 40, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 0.8;
            ctx.fillStyle = '#ffaa00';
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const a = (Math.PI / 3) * i + Math.PI/2;
                ctx.lineTo(Math.cos(a) * 18, Math.sin(a) * 18);
            }
            ctx.closePath();
            ctx.fill();
            
            ctx.globalAlpha = 1.0;
            ctx.fillStyle = '#ffe100';
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const a = (Math.PI / 3) * i + Math.PI/2;
                ctx.lineTo(Math.cos(a) * 13, Math.sin(a) * 13);
            }
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.beginPath();
            ctx.moveTo(-6, -9);
            ctx.lineTo(3, -9);
            ctx.lineTo(-3, 9);
            ctx.lineTo(-11, 9);
            ctx.closePath();
            ctx.fill();
            
        } else if (p.type === 'reroll') {
            const bounce = Math.sin(time * 6 + p.x) * 5;
            ctx.translate(0, bounce);
            ctx.rotate(Math.sin(time * 3 + p.y) * 0.3);
            
            ctx.globalCompositeOperation = 'screen';
            const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 40);
            grad.addColorStop(0, 'rgba(255, 0, 255, 0.8)');
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.globalAlpha = 0.6;
            ctx.beginPath();
            ctx.arc(0, 0, 40, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 0.8;
            ctx.fillStyle = '#ff00ff';
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                const a = (Math.PI * 2 / 5) * i - Math.PI/2;
                ctx.lineTo(Math.cos(a) * 18, Math.sin(a) * 18);
            }
            ctx.closePath();
            ctx.fill();
            
            ctx.globalAlpha = 1.0;
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 18px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('R', 0, 1);
            
        } else if (p.icon) {
            ctx.font = '50px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // Pre-rendered glow behind icon
            ctx.globalCompositeOperation = 'screen';
            const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 45);
            grad.addColorStop(0, p.color || 'rgba(255, 255, 255, 0.8)');
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.globalAlpha = 0.5;
            ctx.beginPath();
            ctx.arc(0, 0, 45, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 1.0;

            ctx.fillText(p.icon, 0, 0);
        } else {
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.rect(-7, -7, 14, 14);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();
    });
}