export function drawProjectiles(ctx, projectiles, particleManager, time, camX, camY, vWidth, vHeight) {
    ctx.globalCompositeOperation = 'screen';
    const texStar = particleManager?.textures?.star;
    const texSlash = particleManager?.textures?.slash;
    const texShockwave = particleManager?.textures?.shockwave;
    const texSmoke = particleManager?.textures?.smoke;

    projectiles.forEach(p => {
        ctx.save();
        ctx.translate(p.x, p.y);
        if (p.vx || p.vy) {
            ctx.rotate(Math.atan2(p.vy, p.vx));
        }
        
        // Glowing Aura - optimized for HD-2D Neon Bloom
        if (!p.isAoe) {
            ctx.globalCompositeOperation = 'screen';
            ctx.globalAlpha = 0.2;
            const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, p.radius * 3.5);
            grad.addColorStop(0, p.color || '#ffffff');
            grad.addColorStop(0.3, p.color || '#ffffff');
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            
            if (p.type === 'beam' || p.type === 'dual_laser' || p.type === 'supernova_beam' || p.type === 'missile' || p.type === 'railgun' || p.type === 'blaster_shot') {
                ctx.beginPath();
                ctx.ellipse(0, 0, p.radius * 3.5, p.radius * 2.0, 0, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.beginPath();
                ctx.arc(0, 0, p.radius * 3.5, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1.0;
            ctx.globalCompositeOperation = 'screen';
        }

        if (p.type === 'blaster_shot') {
            ctx.globalCompositeOperation = 'screen';
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.ellipse(0, 0, p.radius * 1.5, p.radius * 0.6, 0, 0, Math.PI * 2); ctx.fill();
            ctx.globalCompositeOperation = 'screen';
        } else if (p.type === 'wrench_swing') {
            ctx.globalCompositeOperation = 'screen';
            ctx.globalAlpha = Math.max(0, p.life / 0.25);
            const swingAngle = (1 - (p.life / 0.25)) * Math.PI * 1.5; 
            ctx.rotate(swingAngle);
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = p.color || '#00ffff';
            ctx.lineWidth = 4;
            ctx.beginPath(); ctx.roundRect(0, -6, p.radius * 0.9, 12, 6); ctx.fill(); ctx.stroke();
            ctx.beginPath(); ctx.arc(p.radius * 0.9, 0, 18, Math.PI * 0.2, Math.PI * 1.8); ctx.lineTo(p.radius * 0.9 - 6, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.globalAlpha = 1.0;
            ctx.globalCompositeOperation = 'screen';
        } else if (p.type === 'blade_swing') {
            ctx.globalCompositeOperation = 'screen';
            ctx.globalAlpha = Math.max(0, p.life / 0.2);
            const swingAngle = (1 - (p.life / 0.2)) * Math.PI * 1.5; 
            ctx.rotate(swingAngle);
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 5;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(p.radius * 0.8, -p.radius * 0.2, p.radius * 0.8, 0); ctx.quadraticCurveTo(p.radius * 0.8, p.radius * 0.2, 0, 0); ctx.fill();
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1.0;
            ctx.globalCompositeOperation = 'screen';
        } else if (p.type === 'grenade_explosion') {
            ctx.globalCompositeOperation = 'screen';
            ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 3));
            const maxR = p.radius;
            const lifeRatio = p.weaponId === 'fragGrenade' ? 0.4 : 0.3;
            const progress = Math.max(0, 1 - (p.life / lifeRatio));
            const currentR = maxR * Math.pow(progress, 0.5); 
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.arc(0, 0, Math.max(0, currentR), 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = p.color; ctx.lineWidth = Math.max(2, 6 * p.life); ctx.stroke();
            ctx.globalAlpha = 1.0;
            ctx.globalCompositeOperation = 'screen';
        } else if (p.type === 'beam' || p.type === 'dual_laser') {
            ctx.globalCompositeOperation = 'screen';
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.ellipse(0, 0, p.radius * 2, p.radius * 0.5, 0, 0, Math.PI * 2); ctx.fill();
            ctx.globalCompositeOperation = 'screen';
        } else if (p.type === 'lightning') {
            ctx.globalCompositeOperation = 'screen';
            ctx.strokeStyle = '#ffffff';
            ctx.shadowColor = p.color || '#00aaff';
            ctx.shadowBlur = 3;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(-p.radius, 0);
            ctx.lineTo(-p.radius/2, (Math.random()-0.5)*p.radius);
            ctx.lineTo(0, (Math.random()-0.5)*p.radius);
            ctx.lineTo(p.radius/2, (Math.random()-0.5)*p.radius);
            ctx.lineTo(p.radius, 0);
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.globalCompositeOperation = 'screen';
        } else if (p.type === 'glitch_slash') {
            ctx.globalCompositeOperation = 'screen';
            ctx.fillStyle = '#ffffff'; 
            ctx.shadowColor = p.color || '#00ff00';
            ctx.shadowBlur = 5;
            ctx.beginPath(); ctx.ellipse(0, 0, p.radius * 1.5, p.radius/3, 0, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
            ctx.globalCompositeOperation = 'screen';
        } else if (p.type === 'stomp') {
            ctx.globalCompositeOperation = 'screen';
            ctx.strokeStyle = '#ffffff';
            ctx.shadowColor = p.color || '#ff00ff';
            ctx.shadowBlur = 5;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.globalCompositeOperation = 'screen';
        } else if (p.type === 'repair_beam') {
            ctx.globalCompositeOperation = 'screen';
            ctx.strokeStyle = '#ffffff';
            ctx.shadowColor = '#00ffcc';
            ctx.shadowBlur = 3;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(-p.radius, 0);
            ctx.lineTo(p.radius, 0);
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.globalCompositeOperation = 'screen';
        } else if (p.type === 'missile') {
            ctx.globalCompositeOperation = 'screen';
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = '#ff4400';
            ctx.shadowBlur = 3;
            ctx.beginPath(); ctx.ellipse(0, 0, p.radius * 1.5, p.radius * 0.6, 0, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
            ctx.globalCompositeOperation = 'screen';
        } else if (p.type === 'data_pulse' || p.type === 'phantom_orb') {
            ctx.globalCompositeOperation = 'screen';
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalCompositeOperation = 'screen';
        } else if (p.type === 'railgun') {
            ctx.globalCompositeOperation = 'screen';
            ctx.strokeStyle = '#ffffff';
            ctx.shadowColor = p.color || '#00aaff';
            ctx.shadowBlur = 8;
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(-p.radius*2, 0);
            ctx.lineTo(p.radius*2, 0);
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.globalCompositeOperation = 'screen';
        } else if (p.type === 'sonic_wave') {
            ctx.globalCompositeOperation = 'screen';
            ctx.strokeStyle = '#ffffff';
            ctx.shadowColor = p.color || '#00ffff';
            ctx.shadowBlur = 5;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(0, 0, p.radius, -Math.PI/3, Math.PI/3);
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.globalCompositeOperation = 'screen';
        } else if (p.type === 'supernova_beam') {
            ctx.globalCompositeOperation = 'screen';
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = p.color || '#ffaa00';
            ctx.shadowBlur = 3;
            ctx.beginPath(); ctx.ellipse(0, 0, p.radius * 2.5, p.radius * 0.8, 0, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
            ctx.globalCompositeOperation = 'screen';
        } else if (p.type === 'nova_pulse' || p.type === 'laser_nova_pulse' || p.type === 'seismic_shockwave') {
            ctx.globalCompositeOperation = 'screen';
            ctx.strokeStyle = '#ffffff';
            ctx.shadowColor = p.color || '#ff00ff';
            ctx.shadowBlur = 8;
            ctx.lineWidth = Math.max(2, 8 * p.life);
            ctx.globalAlpha = Math.min(1, p.life * 2);
            ctx.beginPath();
            ctx.arc(0, 0, p.radius, 0, Math.PI*2);
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1.0;
            ctx.globalCompositeOperation = 'screen';
        } else if (p.type === 'shield_bubble' || p.type === 'burning_barrier') {
            ctx.globalCompositeOperation = 'screen';
            ctx.globalAlpha = Math.min(1, p.life * 2) * 0.4;
            const grad = ctx.createRadialGradient(0, 0, p.radius * 0.5, 0, 0, p.radius);
            grad.addColorStop(0, 'transparent');
            grad.addColorStop(0.8, p.color);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, p.radius, 0, Math.PI*2);
            ctx.fill();

            ctx.globalAlpha = Math.min(1, p.life * 2);
            ctx.strokeStyle = '#ffffff';
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 5;
            ctx.lineWidth = 3;
            ctx.setLineDash([10, 15]);
            ctx.lineDashOffset = -time * 40;
            ctx.beginPath();
            ctx.arc(0, 0, p.radius, 0, Math.PI*2);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1.0;
            ctx.globalCompositeOperation = 'screen';
        } else if (p.type === 'napalm_pool' || p.type === 'flaming_lash_pool') {
            ctx.globalCompositeOperation = 'screen';
            ctx.globalAlpha = Math.min(1, p.life) * 0.6;
            const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, p.radius);
            grad.addColorStop(0, p.color);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, p.radius, 0, Math.PI*2);
            ctx.fill();
            
            ctx.globalAlpha = Math.min(1, p.life) * 0.8;
            ctx.strokeStyle = '#ffffff';
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 3;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, p.radius * (0.9 + Math.sin(time * 4 + p.x) * 0.05), 0, Math.PI*2);
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1.0;
            ctx.globalCompositeOperation = 'screen';
        } else if (p.type === 'hellfire') {
            ctx.globalCompositeOperation = 'screen';
            ctx.globalAlpha = 0.6 + Math.sin(time * 8 + p.x) * 0.2;
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = p.color || '#00bbff';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(0, 0, p.radius * 0.8, 0, Math.PI*2);
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1.0;
            ctx.globalCompositeOperation = 'screen';
        } else if (p.type === 'quantum_collapse') {
            ctx.globalCompositeOperation = 'screen';
            ctx.globalAlpha = 0.9;
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = p.color || '#ff00ff';
            ctx.shadowBlur = 3;
            ctx.beginPath();
            ctx.arc(0, 0, p.radius * 0.6, 0, Math.PI*2);
            ctx.fill();
            ctx.shadowBlur = 0;
            
            ctx.strokeStyle = '#ffffff';
            ctx.shadowColor = p.color || '#ff00ff';
            ctx.shadowBlur = 5;
            ctx.lineWidth = 8;
            ctx.beginPath();
            ctx.arc(0, 0, p.radius, 0, Math.PI*2);
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1.0;
            ctx.globalCompositeOperation = 'screen';
        } else if (p.type === 'aegis_matrix') {
            ctx.globalCompositeOperation = 'screen';
            ctx.globalAlpha = 0.4;
            ctx.fillStyle = p.color || '#00ff88';
            ctx.beginPath();
            ctx.arc(0, 0, p.radius, 0, Math.PI*2);
            ctx.fill();
            
            ctx.globalAlpha = 1.0;
            ctx.strokeStyle = '#ffffff';
            ctx.shadowColor = p.color || '#00ff88';
            ctx.shadowBlur = 8;
            ctx.lineWidth = 4;
            ctx.setLineDash([20, 20]);
            ctx.lineDashOffset = -time * 100;
            ctx.beginPath();
            ctx.arc(0, 0, p.radius, 0, Math.PI*2);
            ctx.stroke();
            ctx.setLineDash([]);
            
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, p.radius - 12, 0, Math.PI*2);
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.globalCompositeOperation = 'screen';
        } else if (p.isAoe) {
            ctx.globalCompositeOperation = 'screen';
            ctx.strokeStyle = '#ffffff';
            ctx.shadowColor = p.color || '#00ffff';
            ctx.shadowBlur = 5;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, p.radius, 0, Math.PI*2);
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.globalCompositeOperation = 'screen';
        } else {
            // Default projectile
            ctx.globalCompositeOperation = 'screen';
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = p.color || '#00ffff';
            ctx.shadowBlur = 3;
            ctx.beginPath();
            ctx.arc(0, 0, p.radius, 0, Math.PI*2);
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.globalCompositeOperation = 'screen';
        }
        ctx.restore();
    });
    ctx.globalCompositeOperation = 'source-over';
}