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
            const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 24);
            grad.addColorStop(0, p.color);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, 24, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.globalCompositeOperation = 'source-over';
            
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.moveTo(0, -14);
            ctx.lineTo(7, 0);
            ctx.lineTo(0, 14);
            ctx.lineTo(-7, 0);
            ctx.closePath();
            ctx.fill();
            
            ctx.fillStyle = '#ccffff';
            ctx.shadowBlur = 0;
            ctx.beginPath();
            ctx.moveTo(0, -7);
            ctx.lineTo(3.5, 0);
            ctx.lineTo(0, 7);
            ctx.lineTo(-3.5, 0);
            ctx.closePath();
            ctx.fill();

        } else if (p.type === 'gold') {
            const bounce = Math.sin(time * 6 + p.x) * 4;
            ctx.translate(0, bounce);
            ctx.rotate(Math.sin(time * 3 + p.y) * 0.3);
            
            ctx.globalCompositeOperation = 'screen';
            const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 28);
            grad.addColorStop(0, 'rgba(255, 215, 0, 0.6)');
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, 28, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.globalCompositeOperation = 'source-over';

            ctx.fillStyle = '#ffaa00';
            ctx.shadowColor = '#ffcc00';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const a = (Math.PI / 3) * i + Math.PI/2;
                ctx.lineTo(Math.cos(a) * 14, Math.sin(a) * 14);
            }
            ctx.closePath();
            ctx.fill();
            
            ctx.fillStyle = '#ffe100';
            ctx.shadowBlur = 0;
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const a = (Math.PI / 3) * i + Math.PI/2;
                ctx.lineTo(Math.cos(a) * 10.5, Math.sin(a) * 10.5);
            }
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.beginPath();
            ctx.moveTo(-5, -7);
            ctx.lineTo(2, -7);
            ctx.lineTo(-2, 7);
            ctx.lineTo(-9, 7);
            ctx.closePath();
            ctx.fill();
            
        } else if (p.type === 'reroll') {
            const bounce = Math.sin(time * 6 + p.x) * 4;
            ctx.translate(0, bounce);
            ctx.rotate(Math.sin(time * 3 + p.y) * 0.3);
            
            ctx.globalCompositeOperation = 'screen';
            const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 28);
            grad.addColorStop(0, 'rgba(255, 0, 255, 0.6)');
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, 28, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = '#ff00ff';
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                const a = (Math.PI * 2 / 5) * i - Math.PI/2;
                ctx.lineTo(Math.cos(a) * 14, Math.sin(a) * 14);
            }
            ctx.closePath();
            ctx.fill();
            
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('R', 0, 1);
            
        } else if (p.icon) {
            ctx.font = '42px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = '#ffffff';
            ctx.shadowBlur = 16;
            ctx.fillText(p.icon, 0, 0);
            ctx.shadowBlur = 0;
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