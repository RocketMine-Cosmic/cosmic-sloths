export function drawUI(ctx, canvas, time, player, hazards, enemies, characterPickup, camera, zoom) {
    // --- Off-screen Indicators ---
    enemies.forEach(e => {
        if (e.isBoss || e.isElite) {
            const vWidth = canvas.width / zoom;
            const vHeight = canvas.height / zoom;
            const minX = camera.x;
            const maxX = camera.x + vWidth;
            const minY = camera.y;
            const maxY = camera.y + vHeight;
            const padding = (e.radius || 20) + 20;

            if (e.x < minX - padding || e.x > maxX + padding || e.y < minY - padding || e.y > maxY + padding) {
                const screenX = (e.x - camera.x) * zoom;
                const screenY = (e.y - camera.y) * zoom;
                const centerX = canvas.width / 2;
                const centerY = canvas.height / 2;
                const angle = Math.atan2(screenY - centerY, screenX - centerX);
                
                const edgePadding = 40;
                const tan = Math.tan(angle);
                const rectWidth = centerX - edgePadding;
                const rectHeight = centerY - edgePadding;

                let indX, indY;
                if (Math.abs(tan) < rectHeight / rectWidth) {
                    indX = centerX + Math.sign(Math.cos(angle)) * rectWidth;
                    indY = centerY + (indX - centerX) * tan;
                } else {
                    indY = centerY + Math.sign(Math.sin(angle)) * rectHeight;
                    indX = centerX + (indY - centerY) / tan;
                }

                ctx.save();
                ctx.translate(indX, indY);
                ctx.rotate(angle);
                
                ctx.fillStyle = e.isBoss ? 'rgba(255, 0, 0, 0.8)' : 'rgba(255, 0, 255, 0.8)';
                ctx.beginPath();
                ctx.moveTo(20, 0);
                ctx.lineTo(-15, 15);
                ctx.lineTo(-15, -15);
                ctx.fill();

                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                ctx.stroke();

                ctx.rotate(-angle);
                ctx.fillStyle = '#ffffff';
                ctx.font = '14px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(e.isBoss ? '💀' : '⚠️', 0, 0);
                
                ctx.restore();
            }
        }
    });


}