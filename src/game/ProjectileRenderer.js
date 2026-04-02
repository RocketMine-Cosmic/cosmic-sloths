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
        
        // Glowing Aura - optimized for HD-2D Neon Bloom
        if (!p.isAoe) {
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.35;
            ctx.fillStyle = p.color || '#ffffff';
            if (p.type === 'beam' || p.type === 'dual_laser' || p.type === 'supernova_beam' || p.type === 'missile' || p.type === 'railgun') {
                ctx.beginPath();
                ctx.ellipse(0, 0, p.radius * 3.5, p.radius * 2.0, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 0.7;
                ctx.beginPath();
                ctx.ellipse(0, 0, p.radius * 2.0, p.radius * 1.0, 0, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.beginPath();
                ctx.arc(0, 0, p.radius * 3.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 0.7;
                ctx.beginPath();
                ctx.arc(0, 0, p.radius * 2.0, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalCompositeOperation = 'screen';
            ctx.globalAlpha = 1.0;
        }

        if (p.type === 'blaster_shot') {
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.8;
            ctx.fillStyle = p.color;
            ctx.beginPath(); ctx.ellipse(0, 0, p.radius * 2.5, p.radius * 1.2, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.ellipse(0, 0, p.radius * 1.2, p.radius * 0.5, 0, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 1.0;
            ctx.globalCompositeOperation = 'screen';
        } else if (p.type === 'wrench_swing') {
            ctx.globalAlpha = Math.max(0, p.life / 0.25);
            const swingAngle = (1 - (p.life / 0.25)) * Math.PI * 1.5; 
            ctx.rotate(swingAngle);
            ctx.fillStyle = '#cccccc';
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.roundRect(0, -6, p.radius * 0.9, 12, 6); ctx.fill(); ctx.stroke();
            ctx.beginPath(); ctx.arc(p.radius * 0.9, 0, 18, Math.PI * 0.2, Math.PI * 1.8); ctx.lineTo(p.radius * 0.9 - 6, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.globalAlpha = 1.0;
        } else if (p.type === 'blade_swing') {
            ctx.globalAlpha = Math.max(0, p.life / 0.2);
            const swingAngle = (1 - (p.life / 0.2)) * Math.PI * 1.5; 
            ctx.rotate(swingAngle);
            ctx.fillStyle = p.color;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(p.radius, -p.radius * 0.6, p.radius, 0); ctx.quadraticCurveTo(p.radius, p.radius * 0.6, 0, 0); ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(p.radius * 0.8, -p.radius * 0.2, p.radius * 0.8, 0); ctx.quadraticCurveTo(p.radius * 0.8, p.radius * 0.2, 0, 0); ctx.fill();
            ctx.globalAlpha = 1.0;
        } else if (p.type === 'grenade_explosion') {
            ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 3));
            const maxR = p.radius;
            const lifeRatio = p.weaponId === 'fragGrenade' ? 0.4 : 0.3;
            const progress = Math.max(0, 1 - (p.life / lifeRatio));
            const currentR = maxR * Math.pow(progress, 0.5); 
            ctx.fillStyle = p.color;
            ctx.beginPath(); ctx.arc(0, 0, Math.max(0, currentR), 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(1, 4 * p.life); ctx.stroke();
            ctx.globalAlpha = 1.0;
        } else if (p.type === 'beam' || p.type === 'dual_laser') {
            if (texSlash && texSlash.isReady) {
                ctx.globalCompositeOperation = 'lighter';
                ctx.globalAlpha = 0.8;
                ctx.drawImage(texSlash, -p.radius*2.5, -p.radius*1.8, p.radius*5, p.radius*3.6);
                ctx.globalAlpha = 1.0;
                ctx.drawImage(texSlash, -p.radius*1.5, -p.radius*1.0, p.radius*3, p.radius*2);
                ctx.globalCompositeOperation = 'screen';
            } else {
                ctx.fillStyle = p.color || '#ffffff';
                ctx.beginPath(); ctx.ellipse(0, 0, p.radius * 1.5, p.radius / 2, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#ffffff';
                ctx.beginPath(); ctx.ellipse(0, 0, p.radius, p.radius / 4, 0, 0, Math.PI * 2); ctx.fill();
            }
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
            if (texSlash && texSlash.isReady) {
                ctx.globalCompositeOperation = 'lighter';
                ctx.drawImage(texSlash, -p.radius*2.5, -p.radius*2.5, p.radius*5, p.radius*5);
                ctx.globalAlpha = 0.5;
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.radius, -p.radius/2, p.radius*2, p.radius);
                ctx.globalAlpha = 1.0;
                ctx.globalCompositeOperation = 'screen';
                ctx.drawImage(texSlash, -p.radius*1.5, -p.radius*1.5, p.radius*3, p.radius*3);
            } else { 
                ctx.fillStyle = p.color || '#ffffff'; 
                ctx.beginPath(); ctx.ellipse(0, 0, p.radius, p.radius/4, 0, 0, Math.PI * 2); ctx.fill();
            }
        } else if (p.type === 'stomp') {
            if (texShockwave && texShockwave.isReady) {
                ctx.drawImage(texShockwave, -p.radius*1.5, -p.radius*1.5, p.radius*3, p.radius*3);
            } else {
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
            if (texStar && texStar.isReady) {
                ctx.globalCompositeOperation = 'lighter';
                ctx.drawImage(texStar, -p.radius*2, -p.radius*1.5, p.radius*3, p.radius*3);
                ctx.globalCompositeOperation = 'screen';
                ctx.fillStyle = '#ffffff';
                ctx.beginPath(); ctx.ellipse(0, 0, p.radius * 1.2, p.radius * 0.4, 0, 0, Math.PI * 2); ctx.fill();
            } else {
                ctx.fillStyle = '#ffffff';
                ctx.beginPath(); ctx.ellipse(0, 0, p.radius * 1.2, p.radius * 0.4, 0, 0, Math.PI * 2); ctx.fill();
            }
        } else if (p.type === 'data_pulse' || p.type === 'phantom_orb') {
            if (texStar && texStar.isReady) {
                ctx.globalCompositeOperation = 'lighter';
                ctx.globalAlpha = 0.5;
                ctx.fillStyle = p.color;
                ctx.beginPath(); ctx.arc(0,0,p.radius*2,0,Math.PI*2); ctx.fill();
                ctx.globalAlpha = 1.0;
                ctx.drawImage(texStar, -p.radius*2.5, -p.radius*2.5, p.radius*5, p.radius*5);
                ctx.globalCompositeOperation = 'screen';
                ctx.drawImage(texStar, -p.radius*1.5, -p.radius*1.5, p.radius*3, p.radius*3);
            } else {
                ctx.fillStyle = p.color || '#ffffff';
                ctx.beginPath();
                ctx.arc(0, 0, p.radius*0.8, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (p.type === 'railgun') {
            if (texSlash && texSlash.isReady) {
                ctx.globalCompositeOperation = 'lighter';
                ctx.globalAlpha = 0.7;
                ctx.drawImage(texSlash, -p.radius*3, -p.radius*2, p.radius*6, p.radius*4);
                ctx.globalAlpha = 1.0;
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(-p.radius*2, -p.radius/4, p.radius*4, p.radius/2);
                ctx.globalCompositeOperation = 'screen';
                ctx.drawImage(texSlash, -p.radius*2, -p.radius*1.5, p.radius*4, p.radius*3);
            } else {
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(-p.radius*2, 0);
                ctx.lineTo(p.radius*2, 0);
                ctx.stroke();
            }
        } else if (p.type === 'sonic_wave') {
            if (texShockwave && texShockwave.isReady) {
                ctx.drawImage(texShockwave, -p.radius*1.5, -p.radius*1.5, p.radius*3, p.radius*3);
            } else {
                ctx.strokeStyle = p.color || '#ffffff';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(0, 0, p.radius, -Math.PI/3, Math.PI/3);
                ctx.stroke();
            }
        } else if (p.type === 'supernova_beam') {
            if (texSlash && texSlash.isReady) {
                ctx.drawImage(texSlash, -p.radius*3, -p.radius*2, p.radius*6, p.radius*4);
                if (texStar && texStar.isReady) ctx.drawImage(texStar, -p.radius*2, -p.radius*2, p.radius*4, p.radius*4);
            } else {
                ctx.fillStyle = p.color || '#ffaa00';
                ctx.beginPath(); ctx.ellipse(0, 0, p.radius * 2, p.radius * 0.8, 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#ffffff';
                ctx.beginPath(); ctx.ellipse(0, 0, p.radius * 1.5, p.radius * 0.4, 0, 0, Math.PI * 2); ctx.fill();
            }
        } else if (p.type === 'nova_pulse' || p.type === 'laser_nova_pulse' || p.type === 'seismic_shockwave') {
            ctx.globalCompositeOperation = 'lighter';
            if (texShockwave && texShockwave.isReady) {
                ctx.globalAlpha = Math.min(1, p.life * 1.5) * 0.9;
                
                const grad = ctx.createRadialGradient(0, 0, p.radius * 0.5, 0, 0, p.radius * 1.2);
                grad.addColorStop(0, 'transparent');
                grad.addColorStop(0.7, p.color || '#ffffff');
                grad.addColorStop(1, 'transparent');
                
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(0, 0, p.radius * 1.2, 0, Math.PI * 2);
                ctx.fill();

                ctx.drawImage(texShockwave, -p.radius*1.2, -p.radius*1.2, p.radius*2.4, p.radius*2.4);
                
                // Add hot white core ring
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                ctx.globalAlpha = Math.min(1, p.life * 2) * 0.6;
                ctx.beginPath();
                ctx.arc(0, 0, p.radius * 0.9, 0, Math.PI*2);
                ctx.stroke();
            } else {
                ctx.strokeStyle = p.color;
                ctx.lineWidth = Math.max(2, 10 * p.life);
                ctx.globalAlpha = Math.min(1, p.life * 2);
                ctx.beginPath();
                ctx.arc(0, 0, p.radius, 0, Math.PI*2);
                ctx.stroke();
            }
            ctx.globalCompositeOperation = 'screen';
            ctx.globalAlpha = 1.0;
        } else if (p.type === 'shield_bubble' || p.type === 'burning_barrier') {
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = Math.min(1, p.life * 2) * 0.35;
            const grad = ctx.createRadialGradient(0, 0, p.radius * 0.7, 0, 0, p.radius * 1.1);
            grad.addColorStop(0, 'transparent');
            grad.addColorStop(0.8, p.color);
            grad.addColorStop(1, 'transparent');
            
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, p.radius * 1.1, 0, Math.PI*2);
            ctx.fill();

            ctx.globalAlpha = Math.min(1, p.life * 2) * 0.9;
            ctx.strokeStyle = p.color;
            ctx.lineWidth = 4;
            ctx.setLineDash([15, 20]);
            ctx.lineDashOffset = -time * 60;
            ctx.beginPath();
            ctx.arc(0, 0, p.radius, 0, Math.PI*2);
            ctx.stroke();
            
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.setLineDash([]);
            ctx.beginPath();
            ctx.arc(0, 0, p.radius, 0, Math.PI*2);
            ctx.stroke();
            
            ctx.globalCompositeOperation = 'screen';
            ctx.globalAlpha = 1.0;
        } else if (p.type === 'napalm_pool' || p.type === 'flaming_lash_pool') {
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = Math.min(1, p.life) * 0.5;
            const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, p.radius * 1.2);
            grad.addColorStop(0, p.color);
            grad.addColorStop(0.5, p.color);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, p.radius * 1.2, 0, Math.PI*2);
            ctx.fill();
            
            ctx.globalAlpha = Math.min(1, p.life) * 0.8;
            ctx.strokeStyle = p.color;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, p.radius * (0.9 + Math.sin(time * 6 + p.x) * 0.05), 0, Math.PI*2);
            ctx.stroke();
            
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(0, 0, p.radius * (0.8 + Math.cos(time * 5 + p.y) * 0.05), 0, Math.PI*2);
            ctx.stroke();
            
            ctx.globalCompositeOperation = 'screen';
            ctx.globalAlpha = 1.0;
        } else if (p.type === 'hellfire') {
            ctx.globalAlpha = 0.5 + Math.sin(time * 8 + p.x) * 0.2;
            if (texSmoke && texSmoke.isReady) {
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(0, 0, p.radius, 0, Math.PI*2);
                ctx.fill();
                ctx.globalCompositeOperation = 'screen';
                ctx.drawImage(texSmoke, -p.radius * 1.2, -p.radius * 1.2, p.radius*2.4, p.radius*2.4);
                ctx.globalCompositeOperation = 'source-over';
            } else {
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(0, 0, p.radius, 0, Math.PI*2);
                ctx.fill();
            }
            ctx.globalAlpha = 1.0;
        } else if (p.type === 'quantum_collapse') {
            ctx.globalCompositeOperation = 'lighter';
            if (texShockwave && texShockwave.isReady) {
                ctx.globalAlpha = 0.8;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(0, 0, p.radius * 0.8, 0, Math.PI*2);
                ctx.fill();
                ctx.drawImage(texShockwave, -p.radius*1.6, -p.radius*1.6, p.radius*3.2, p.radius*3.2);
            } else {
                ctx.globalAlpha = 0.8;
                ctx.fillStyle = '#1a0033';
                ctx.beginPath();
                ctx.arc(0, 0, p.radius * 0.8, 0, Math.PI*2);
                ctx.fill();
                
                ctx.strokeStyle = p.color;
                ctx.lineWidth = 15;
                ctx.beginPath();
                ctx.arc(0, 0, p.radius, 0, Math.PI*2);
                ctx.stroke();
            }
            
            // White-hot inner core implosion
            ctx.fillStyle = '#ffffff';
            ctx.globalAlpha = Math.max(0, 1 - p.life * 2); 
            ctx.beginPath();
            ctx.arc(0, 0, p.radius * 0.4, 0, Math.PI*2);
            ctx.fill();
            
            ctx.globalCompositeOperation = 'screen';
            ctx.globalAlpha = 1.0;
        } else if (p.type === 'aegis_matrix') {
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.4;
            const grad = ctx.createRadialGradient(0, 0, p.radius * 0.5, 0, 0, p.radius);
            grad.addColorStop(0, 'transparent');
            grad.addColorStop(0.8, '#00ff88');
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, p.radius, 0, Math.PI*2);
            ctx.fill();
            
            ctx.strokeStyle = '#00ff66';
            ctx.lineWidth = 8;
            ctx.setLineDash([30, 20]);
            ctx.lineDashOffset = -time * 150;
            ctx.beginPath();
            ctx.arc(0, 0, p.radius, 0, Math.PI*2);
            ctx.stroke();
            ctx.setLineDash([]);
            
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, p.radius - 12, 0, Math.PI*2);
            ctx.stroke();
            ctx.globalCompositeOperation = 'screen';
            ctx.globalAlpha = 1.0;
        } else if (p.isAoe) {
            ctx.globalCompositeOperation = 'lighter';
            if (texShockwave && texShockwave.isReady) {
                ctx.globalAlpha = 0.6;
                ctx.fillStyle = p.color || '#ffffff';
                ctx.beginPath();
                ctx.arc(0, 0, p.radius, 0, Math.PI*2);
                ctx.fill();
                ctx.drawImage(texShockwave, -p.radius*1.2, -p.radius*1.2, p.radius*2.4, p.radius*2.4);
                ctx.globalAlpha = 1.0;
            } else {
                ctx.strokeStyle = p.color || '#ffffff';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(0, 0, p.radius, 0, Math.PI*2);
                ctx.stroke();
            }
            ctx.globalCompositeOperation = 'screen';
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