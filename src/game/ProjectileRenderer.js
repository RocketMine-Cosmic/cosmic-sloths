export function drawProjectiles(ctx, projectiles, particleManager, time, camX, camY, vWidth, vHeight) {
    const isVisible = (x, y, r) => {
        return x + r > camX && x - r < camX + vWidth &&
               y + r > camY && y - r < camY + vHeight;
    };

    ctx.globalCompositeOperation = 'screen';
    const texStar = particleManager?.textures?.star;
    const texSlash = particleManager?.textures?.slash;
    const texShockwave = particleManager?.textures?.shockwave;
    const texSmoke = particleManager?.textures?.smoke;

    projectiles.forEach(p => {
        if (!isVisible(p.x, p.y, p.radius * 3)) return;
        ctx.save();
        ctx.translate(p.x, p.y);
        if (p.vx || p.vy) {
            ctx.rotate(Math.atan2(p.vy, p.vx));
        }
        
        // Glowing Aura - optimized for performance
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = p.color || '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, p.radius * 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.arc(0, 0, p.radius * 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;

        if (p.type === 'beam' || p.type === 'dual_laser') {
            ctx.fillStyle = p.color || '#ffffff';
            ctx.fillRect(-p.radius * 1.5, -p.radius / 2, p.radius * 3, p.radius);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(-p.radius, -p.radius / 4, p.radius * 2, p.radius / 2);
            if (texSlash && texSlash.isReady) ctx.drawImage(texSlash, -p.radius*2, -p.radius*1.5, p.radius*4, p.radius*3);
        } else if (p.type === 'lightning') {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-p.radius, 0);
            ctx.lineTo(-p.radius/2, (Math.random()-0.5)*p.radius);
            ctx.lineTo(0, (Math.random()-0.5)*p.radius);
            ctx.lineTo(p.radius/2, (Math.random()-0.5)*p.radius);
            ctx.lineTo(p.radius, 0);
            ctx.stroke();
        } else if (p.type === 'glitch_slash') {
            if (texSlash && texSlash.isReady) ctx.drawImage(texSlash, -p.radius*2, -p.radius*2, p.radius*4, p.radius*4);
            else { ctx.fillStyle = p.color || '#ffffff'; ctx.fillRect(-p.radius, -p.radius/4, p.radius*2, p.radius/2); }
        } else if (p.type === 'stomp') {
            if (texShockwave && texShockwave.isReady) ctx.drawImage(texShockwave, -p.radius*1.5, -p.radius*1.5, p.radius*3, p.radius*3);
            else {
                ctx.strokeStyle = p.color || '#ffffff';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
                ctx.stroke();
            }
        } else if (p.type === 'repair_beam') {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(-p.radius, 0);
            ctx.lineTo(p.radius, 0);
            ctx.stroke();
        } else if (p.type === 'missile') {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(-p.radius, -p.radius*0.2, p.radius*1.5, p.radius*0.4);
            if (texStar && texStar.isReady) ctx.drawImage(texStar, -p.radius*1.5, -p.radius, p.radius*2, p.radius*2);
        } else if (p.type === 'data_pulse' || p.type === 'phantom_orb') {
            if (texStar && texStar.isReady) ctx.drawImage(texStar, -p.radius*1.5, -p.radius*1.5, p.radius*3, p.radius*3);
            else {
                ctx.fillStyle = p.color || '#ffffff';
                ctx.beginPath();
                ctx.arc(0, 0, p.radius*0.8, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (p.type === 'railgun') {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-p.radius*2, 0);
            ctx.lineTo(p.radius*2, 0);
            ctx.stroke();
            if (texSlash && texSlash.isReady) ctx.drawImage(texSlash, -p.radius*2, -p.radius*1.5, p.radius*4, p.radius*3);
        } else if (p.type === 'sonic_wave') {
            ctx.strokeStyle = p.color || '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, p.radius, -Math.PI/3, Math.PI/3);
            ctx.stroke();
            if (texShockwave && texShockwave.isReady) ctx.drawImage(texShockwave, -p.radius*1.5, -p.radius*1.5, p.radius*3, p.radius*3);
        } else if (p.type === 'supernova_beam') {
            ctx.fillStyle = p.color || '#ffaa00';
            ctx.fillRect(-p.radius * 2, -p.radius * 0.8, p.radius * 4, p.radius * 1.6);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(-p.radius * 1.5, -p.radius * 0.4, p.radius * 3, p.radius * 0.8);
            if (texSlash && texSlash.isReady) {
                ctx.drawImage(texSlash, -p.radius*3, -p.radius*2, p.radius*6, p.radius*4);
            }
            if (texStar && texStar.isReady) {
                ctx.drawImage(texStar, -p.radius*2, -p.radius*2, p.radius*4, p.radius*4);
            }
        } else if (p.type === 'nova_pulse' || p.type === 'laser_nova_pulse' || p.type === 'seismic_shockwave') {
            ctx.strokeStyle = p.color;
            ctx.lineWidth = Math.max(1, 6 * p.life);
            ctx.globalAlpha = Math.min(1, p.life * 2);
            ctx.beginPath();
            ctx.arc(0, 0, p.radius, 0, Math.PI*2);
            ctx.stroke();
            
            if (texShockwave && texShockwave.isReady) {
                ctx.globalAlpha = Math.min(1, p.life * 1.5) * 0.6;
                ctx.drawImage(texShockwave, -p.radius*1.1, -p.radius*1.1, p.radius*2.2, p.radius*2.2);
            }
            ctx.globalAlpha = 1.0;
        } else if (p.type === 'shield_bubble' || p.type === 'burning_barrier') {
            ctx.globalAlpha = Math.min(1, p.life * 2) * 0.25;
            const grad = ctx.createRadialGradient(0, 0, p.radius * 0.8, 0, 0, p.radius);
            grad.addColorStop(0, 'transparent');
            grad.addColorStop(0.8, p.color);
            grad.addColorStop(1, 'transparent');
            
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, p.radius, 0, Math.PI*2);
            ctx.fill();

            ctx.globalAlpha = Math.min(1, p.life * 2) * 0.8;
            ctx.strokeStyle = p.color;
            ctx.lineWidth = 2;
            ctx.setLineDash([10, 15]);
            ctx.lineDashOffset = -time * 40;
            ctx.beginPath();
            ctx.arc(0, 0, p.radius, 0, Math.PI*2);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.globalAlpha = 1.0;
        } else if (p.type === 'napalm_pool' || p.type === 'flaming_lash_pool') {
            ctx.globalAlpha = Math.min(1, p.life) * 0.4;
            const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, p.radius);
            grad.addColorStop(0, p.color);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, p.radius, 0, Math.PI*2);
            ctx.fill();
            
            ctx.globalAlpha = Math.min(1, p.life) * 0.6;
            ctx.strokeStyle = p.color;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(0, 0, p.radius * (0.9 + Math.sin(time * 4 + p.x) * 0.05), 0, Math.PI*2);
            ctx.stroke();
            ctx.globalAlpha = 1.0;
        } else if (p.type === 'hellfire') {
            ctx.globalAlpha = 0.5 + Math.sin(time * 8 + p.x) * 0.2;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(0, 0, p.radius, 0, Math.PI*2);
            ctx.fill();
            ctx.globalAlpha = 1.0;
            if (texSmoke && texSmoke.isReady) {
                ctx.globalCompositeOperation = 'screen';
                ctx.drawImage(texSmoke, -p.radius * 1.2, -p.radius * 1.2, p.radius*2.4, p.radius*2.4);
                ctx.globalCompositeOperation = 'source-over';
            }
        } else if (p.type === 'quantum_collapse') {
            ctx.globalAlpha = 0.8;
            ctx.fillStyle = '#1a0033';
            ctx.beginPath();
            ctx.arc(0, 0, p.radius * 0.8, 0, Math.PI*2);
            ctx.fill();
            
            ctx.globalCompositeOperation = 'screen';
            ctx.strokeStyle = p.color;
            ctx.lineWidth = 12;
            ctx.beginPath();
            ctx.arc(0, 0, p.radius, 0, Math.PI*2);
            ctx.stroke();
            
            if (texShockwave && texShockwave.isReady) {
                ctx.drawImage(texShockwave, -p.radius*1.4, -p.radius*1.4, p.radius*2.8, p.radius*2.8);
            }
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 1.0;
        } else if (p.type === 'aegis_matrix') {
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = '#00ff88';
            ctx.beginPath();
            ctx.arc(0, 0, p.radius, 0, Math.PI*2);
            ctx.fill();
            
            ctx.globalCompositeOperation = 'screen';
            ctx.strokeStyle = '#00ff66';
            ctx.lineWidth = 6;
            ctx.setLineDash([20, 20]);
            ctx.lineDashOffset = -time * 100;
            ctx.beginPath();
            ctx.arc(0, 0, p.radius, 0, Math.PI*2);
            ctx.stroke();
            ctx.setLineDash([]);
            
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, p.radius - 12, 0, Math.PI*2);
            ctx.stroke();
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 1.0;
        } else if (p.isAoe) {
            if (texShockwave && texShockwave.isReady) {
                ctx.globalAlpha = 0.5;
                ctx.drawImage(texShockwave, -p.radius, -p.radius, p.radius*2, p.radius*2);
                ctx.globalAlpha = 1.0;
            } else {
                ctx.strokeStyle = p.color || '#ffffff';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(0, 0, p.radius, 0, Math.PI*2);
                ctx.stroke();
            }
        } else {
            // Default projectile
            if (texStar && texStar.isReady) {
                ctx.drawImage(texStar, -p.radius*1.5, -p.radius*1.5, p.radius*3, p.radius*3);
            } else {
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(0, 0, p.radius*0.5, 0, Math.PI*2);
                ctx.fill();
            }
        }
        ctx.restore();
    });
    ctx.globalCompositeOperation = 'source-over';
}