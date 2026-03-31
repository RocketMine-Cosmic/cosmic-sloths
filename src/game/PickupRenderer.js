export function drawPickups(ctx, pickups, time) {
    pickups.forEach(p => {
        ctx.save();
        ctx.translate(p.x, p.y);
        
        if (p.type === 'xp') {
            ctx.rotate(time * 2);
            
            ctx.globalCompositeOperation = 'screen';
            const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 28);
            grad.addColorStop(0, p.color);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, 28, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.globalCompositeOperation = 'source-over';
            
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.moveTo(0, -16);
            ctx.lineTo(8, 0);
            ctx.lineTo(0, 16);
            ctx.lineTo(-8, 0);
            ctx.closePath();
            ctx.fill();
            
            ctx.fillStyle = '#ccffff';
            ctx.shadowBlur = 0;
            ctx.beginPath();
            ctx.moveTo(0, -8);
            ctx.lineTo(4, 0);
            ctx.lineTo(0, 8);
            ctx.lineTo(-4, 0);
            ctx.closePath();
            ctx.fill();

        } else if (p.type === 'gold') {
            const bounce = Math.sin(time * 6 + p.x) * 5;
            ctx.translate(0, bounce);
            ctx.rotate(Math.sin(time * 3 + p.y) * 0.3);
            
            ctx.globalCompositeOperation = 'screen';
            const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 32);
            grad.addColorStop(0, 'rgba(255, 215, 0, 0.6)');
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, 32, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.globalCompositeOperation = 'source-over';

            ctx.fillStyle = '#ffaa00';
            ctx.shadowColor = '#ffcc00';
            ctx.shadowBlur = 12;
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const a = (Math.PI / 3) * i + Math.PI/2;
                ctx.lineTo(Math.cos(a) * 16, Math.sin(a) * 16);
            }
            ctx.closePath();
            ctx.fill();
            
            ctx.fillStyle = '#ffe100';
            ctx.shadowBlur = 0;
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const a = (Math.PI / 3) * i + Math.PI/2;
                ctx.lineTo(Math.cos(a) * 12, Math.sin(a) * 12);
            }
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.beginPath();
            ctx.moveTo(-5, -8);
            ctx.lineTo(3, -8);
            ctx.lineTo(-3, 8);
            ctx.lineTo(-10, 8);
            ctx.closePath();
            ctx.fill();
            
        } else if (p.type === 'reroll') {
            const bounce = Math.sin(time * 6 + p.x) * 5;
            ctx.translate(0, bounce);
            ctx.rotate(Math.sin(time * 3 + p.y) * 0.3);
            
            ctx.globalCompositeOperation = 'screen';
            const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 32);
            grad.addColorStop(0, 'rgba(255, 0, 255, 0.6)');
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, 32, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = '#ff00ff';
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                const a = (Math.PI * 2 / 5) * i - Math.PI/2;
                ctx.lineTo(Math.cos(a) * 16, Math.sin(a) * 16);
            }
            ctx.closePath();
            ctx.fill();
            
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 16px Arial';
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