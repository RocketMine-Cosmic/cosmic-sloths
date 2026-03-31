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

    // --- Radar / Minimap ---
    ctx.save();
    const mapSize = window.innerWidth < 768 ? 80 : 120;
    const mapX = canvas.width - mapSize - 20;
    const mapY = 80;
    
    // Radar Background
    ctx.fillStyle = 'rgba(15, 23, 42, 0.6)';
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(mapX + mapSize/2, mapY + mapSize/2, mapSize/2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Scanner line
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.3)';
    ctx.beginPath();
    ctx.moveTo(mapX + mapSize/2, mapY + mapSize/2);
    ctx.lineTo(mapX + mapSize/2 + Math.cos(time * 2) * mapSize/2, mapY + mapSize/2 + Math.sin(time * 2) * mapSize/2);
    ctx.stroke();

    // Clipping path
    ctx.beginPath();
    ctx.arc(mapX + mapSize/2, mapY + mapSize/2, mapSize/2, 0, Math.PI * 2);
    ctx.clip();

    const radarScale = 0.02; // World to map scale

    // Player Center
    ctx.fillStyle = '#00ffff';
    ctx.beginPath();
    ctx.arc(mapX + mapSize/2, mapY + mapSize/2, 2, 0, Math.PI*2);
    ctx.fill();

    // Hazards
    hazards.forEach(h => {
        const hx = mapX + mapSize/2 + (h.x - player.x) * radarScale;
        const hy = mapY + mapSize/2 + (h.y - player.y) * radarScale;
        ctx.fillStyle = 'rgba(255, 69, 0, 0.5)';
        ctx.beginPath();
        ctx.arc(hx, hy, h.radius * radarScale, 0, Math.PI*2);
        ctx.fill();
    });

    // Bosses
    enemies.filter(e => e.isBoss).forEach(boss => {
        const bx = mapX + mapSize/2 + (boss.x - player.x) * radarScale;
        const by = mapY + mapSize/2 + (boss.y - player.y) * radarScale;
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(bx, by, 4, 0, Math.PI*2);
        ctx.fill();
        
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(bx, by, 4 + Math.sin(time * 5) * 2, 0, Math.PI*2);
        ctx.stroke();
    });

    // Unlock Pod
    if (characterPickup) {
        const px = mapX + mapSize/2 + (characterPickup.x - player.x) * radarScale;
        const py = mapY + mapSize/2 + (characterPickup.y - player.y) * radarScale;
        ctx.fillStyle = characterPickup.color;
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI*2);
        ctx.fill();
        
        ctx.strokeStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(px, py, 4 + Math.sin(time * 8) * 2, 0, Math.PI*2);
        ctx.stroke();
    }

    ctx.restore();
}