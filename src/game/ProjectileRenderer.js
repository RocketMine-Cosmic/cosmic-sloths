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
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.2;
            const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(0.1, p.radius * 2.5));
            grad.addColorStop(0, p.color || '#ffffff');
            grad.addColorStop(0.1, p.color || '#ffffff');
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            
            if (p.type === 'beam' || p.type === 'dual_laser' || p.type === 'supernova_beam' || p.type === 'missile' || p.type === 'railgun' || p.type === 'blaster_shot') {
                ctx.beginPath();
                ctx.ellipse(0, 0, Math.max(0.1, p.radius * 2.5), Math.max(0.1, p.radius * 1.5), 0, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.beginPath();
                ctx.arc(0, 0, Math.max(0.1, p.radius * 2.5), 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1.0;
            ctx.globalCompositeOperation = 'screen';
        }

        if (p.type === 'blaster_shot') {
            ctx.globalCompositeOperation = 'lighter';
            
            // Colored Outer Glow
            ctx.fillStyle = p.color || '#ffffff';
            ctx.globalAlpha = 0.4;
            ctx.beginPath(); ctx.ellipse(0, 0, Math.max(0.1, p.radius * 2.5), Math.max(0.1, p.radius * 1.2), 0, 0, Math.PI * 2); ctx.fill();
            
            // Colored Inner Body
            ctx.globalAlpha = 0.9;
            ctx.beginPath(); ctx.ellipse(0, 0, Math.max(0.1, p.radius * 1.5), Math.max(0.1, p.radius * 0.6), 0, 0, Math.PI * 2); ctx.fill();
            
            // Tiny White Hot Center
            ctx.fillStyle = '#ffffff';
            ctx.globalAlpha = 1.0;
            ctx.beginPath(); ctx.ellipse(0, 0, Math.max(0.1, p.radius * 0.6), Math.max(0.1, p.radius * 0.2), 0, 0, Math.PI * 2); ctx.fill();
            
            ctx.globalCompositeOperation = 'screen';
        } else if (p.type === 'wrench_swing') {
            ctx.globalCompositeOperation = 'lighter';
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
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = Math.max(0, p.life / 0.2);
            const swingAngle = (1 - (p.life / 0.2)) * Math.PI * 1.5; 
            ctx.rotate(swingAngle);
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 15;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(p.radius * 0.8, -p.radius * 0.2, p.radius * 0.8, 0); ctx.quadraticCurveTo(p.radius * 0.8, p.radius * 0.2, 0, 0); ctx.fill();
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1.0;
            ctx.globalCompositeOperation = 'screen';
        } else if (p.type === 'grenade_explosion') {
            ctx.globalCompositeOperation = 'lighter';
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
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.ellipse(0, 0, Math.max(0.1, p.radius * 2), Math.max(0.1, p.radius * 0.5), 0, 0, Math.PI * 2); ctx.fill();
            ctx.globalCompositeOperation = 'screen';
        } else if (p.type === 'lightning') {
            ctx.globalCompositeOperation = 'lighter';
            ctx.strokeStyle = '#ffffff';
            ctx.shadowColor = p.color || '#00aaff';
            ctx.shadowBlur = 10;
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
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = '#ffffff'; 
            ctx.shadowColor = p.color || '#00ff00';
            ctx.shadowBlur = 15;
            ctx.beginPath(); ctx.ellipse(0, 0, p.radius * 1.5, p.radius/3, 0, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
            ctx.globalCompositeOperation = 'screen';
        } else if (p.type === 'stomp') {
            ctx.globalCompositeOperation = 'lighter';
            ctx.strokeStyle = '#ffffff';
            ctx.shadowColor = p.color || '#ff00ff';
            ctx.shadowBlur = 15;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.globalCompositeOperation = 'screen';
        } else if (p.type === 'repair_beam') {
            ctx.globalCompositeOperation = 'lighter';
            ctx.strokeStyle = '#ffffff';
            ctx.shadowColor = '#00ffcc';
            ctx.shadowBlur = 10;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(-p.radius, 0);
            ctx.lineTo(p.radius, 0);
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.globalCompositeOperation = 'screen';
        } else if (p.type === 'missile') {
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = '#ff4400';
            ctx.shadowBlur = 10;
            ctx.beginPath(); ctx.ellipse(0, 0, p.radius * 1.5, p.radius * 0.6, 0, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
            ctx.globalCompositeOperation = 'screen';
        } else if (p.type === 'data_pulse' || p.type === 'phantom_orb') {
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalCompositeOperation = 'screen';
        } else if (p.type === 'railgun') {
            ctx.globalCompositeOperation = 'lighter';
            ctx.strokeStyle = '#ffffff';
            ctx.shadowColor = p.color || '#00aaff';
            ctx.shadowBlur = 20;
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(-p.radius*2, 0);
            ctx.lineTo(p.radius*2, 0);
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.globalCompositeOperation = 'screen';
        } else if (p.type === 'sonic_wave') {
            ctx.globalCompositeOperation = 'lighter';
            ctx.strokeStyle = '#ffffff';
            ctx.shadowColor = p.color || '#00ffff';
            ctx.shadowBlur = 15;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(0, 0, p.radius, -Math.PI/3, Math.PI/3);
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.globalCompositeOperation = 'screen';
        } else if (p.type === 'supernova_beam') {
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 0.9;
            // Outer casing
            ctx.fillStyle = p.color || '#ffaa00';
            ctx.beginPath(); ctx.ellipse(0, 0, p.radius * 2.5, p.radius * 0.8, 0, 0, Math.PI * 2); ctx.fill();
            // Inner hot core
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.ellipse(0, 0, p.radius * 2.0, p.radius * 0.3, 0, 0, Math.PI * 2); ctx.fill();
            // Segmented energy rings
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            for (let i = -2; i <= 2; i++) {
                ctx.beginPath();
                ctx.ellipse(i * p.radius * 0.8, 0, p.radius * 0.2, p.radius * 1.0, 0, 0, Math.PI * 2);
                ctx.stroke();
            }
            ctx.globalAlpha = 1.0;
        } else if (p.type === 'nova_pulse' || p.type === 'laser_nova_pulse' || p.type === 'seismic_shockwave') {
            ctx.globalCompositeOperation = 'lighter';
            ctx.strokeStyle = '#ffffff';
            ctx.shadowColor = p.color || '#ff00ff';
            ctx.shadowBlur = 20;
            ctx.lineWidth = Math.max(2, 8 * p.life);
            ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 2));
            ctx.beginPath();
            ctx.arc(0, 0, Math.max(0.1, p.radius), 0, Math.PI*2);
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1.0;
            ctx.globalCompositeOperation = 'screen';
        } else if (p.type === 'shield_bubble' || p.type === 'burning_barrier') {
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = Math.min(1, p.life * 2) * 0.7;
            
            ctx.strokeStyle = p.color || '#ffffff';
            ctx.lineWidth = 4;
            
            // Draw a gear-like boundary
            ctx.beginPath();
            const spikes = p.type === 'burning_barrier' ? 12 : 8;
            for (let i = 0; i < spikes * 2; i++) {
                const angle = (Math.PI * 2 / (spikes * 2)) * i + (time * 2);
                const r = i % 2 === 0 ? p.radius : p.radius * 0.85;
                if (i === 0) ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
                else ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
            }
            ctx.closePath();
            ctx.stroke();
            
            // Inner hollow core
            ctx.globalAlpha = 0.15;
            ctx.fillStyle = p.color || '#ffffff';
            ctx.fill();
            
            ctx.globalAlpha = 1.0;
        } else if (p.type === 'napalm_pool' || p.type === 'flaming_lash_pool') {
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = Math.min(1, p.life) * 0.25;
            const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(0.1, p.radius));
            grad.addColorStop(0, p.color || '#ffffff');
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, Math.max(0.1, p.radius), 0, Math.PI*2);
            ctx.fill();
            
            ctx.globalAlpha = Math.min(1, p.life) * 0.8;
            ctx.strokeStyle = '#ffffff';
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 10;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, Math.max(0.1, p.radius * (0.9 + Math.sin(time * 4 + p.x) * 0.05)), 0, Math.PI*2);
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1.0;
            ctx.globalCompositeOperation = 'screen';
        } else if (p.type === 'hellfire') {
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 0.7;
            ctx.fillStyle = p.color || '#00bbff';
            
            ctx.beginPath();
            for (let i = 0; i < 20; i++) {
                const angle = (Math.PI * 2 / 20) * i;
                const wave = Math.sin(time * 10 + i * 2) * (p.radius * 0.15);
                const r = p.radius * 0.75 + wave;
                if (i === 0) ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
                else ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
            }
            ctx.closePath();
            ctx.fill();
            
            ctx.fillStyle = '#110022';
            ctx.beginPath();
            ctx.arc(0, 0, p.radius * 0.4, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.globalAlpha = 1.0;
        } else if (p.type === 'quantum_collapse') {
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 0.8;
            ctx.strokeStyle = p.color || '#ff00ff';
            ctx.lineWidth = 6;
            ctx.beginPath();
            // Draw an octagram (8-pointed star)
            for (let i = 0; i < 16; i++) {
                const angle = (Math.PI * 2 / 16) * i + time;
                const r = i % 2 === 0 ? p.radius : p.radius * 0.5;
                if (i === 0) ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
                else ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
            }
            ctx.closePath();
            ctx.stroke();
            
            ctx.fillStyle = '#110022';
            ctx.globalAlpha = 0.6;
            ctx.fill();
            
            ctx.globalAlpha = 0.9;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.arc(0, 0, p.radius * 0.2, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 1.0;
        } else if (p.type === 'aegis_matrix') {
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 0.7;
            ctx.strokeStyle = p.color || '#00ff88';
            ctx.fillStyle = 'rgba(0, 255, 136, 0.15)';
            ctx.lineWidth = 4;
            
            ctx.rotate(time * 0.5);
            ctx.beginPath();
            // Draw a hexagon
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI * 2 / 6) * i;
                if (i === 0) ctx.moveTo(Math.cos(angle) * p.radius, Math.sin(angle) * p.radius);
                else ctx.lineTo(Math.cos(angle) * p.radius, Math.sin(angle) * p.radius);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            
            // Inner rotating triangle
            ctx.rotate(-time * 1.5);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3;
            ctx.beginPath();
            for (let i = 0; i < 3; i++) {
                const angle = (Math.PI * 2 / 3) * i;
                const r = p.radius * 0.5;
                if (i === 0) ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
                else ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
            }
            ctx.closePath();
            ctx.stroke();
            ctx.globalAlpha = 1.0;
        } else if (p.isAoe) {
            ctx.globalCompositeOperation = 'lighter';
            ctx.strokeStyle = '#ffffff';
            ctx.shadowColor = p.color || '#00ffff';
            ctx.shadowBlur = 15;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, p.radius, 0, Math.PI*2);
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.globalCompositeOperation = 'screen';
        } else {
            // Default projectile
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = p.color || '#00ffff';
            ctx.shadowBlur = 10;
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