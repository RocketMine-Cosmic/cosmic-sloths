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
            ctx.globalCompositeOperation = 'screen';
            ctx.globalAlpha = 0.8;
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = p.color || '#ffaa00';
            ctx.shadowBlur = 10;
            ctx.beginPath(); ctx.ellipse(0, 0, p.radius * 2.5, p.radius * 0.8, 0, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1.0;
        } else if (p.type === 'shield_bubble' || p.type === 'burning_barrier') {
            ctx.globalCompositeOperation = 'screen'; // Use screen instead of lighter to prevent intense whiteout
            ctx.globalAlpha = Math.min(1, p.life * 2) * 0.08; // Much lower center alpha
            
            ctx.fillStyle = p.color || '#ffffff';
            
            if (p.type === 'shield_bubble') {
                // Shield Bubble: Rotating dashed ring with minimal center fill
                ctx.beginPath();
                ctx.arc(0, 0, Math.max(0.1, p.radius), 0, Math.PI*2);
                ctx.fill();
                
                ctx.globalAlpha = Math.min(1, p.life * 2) * 0.8;
                ctx.strokeStyle = p.color;
                ctx.lineWidth = 2;
                ctx.setLineDash([15, 20]);
                ctx.lineDashOffset = -time * 50;
                ctx.beginPath();
                ctx.arc(0, 0, Math.max(0.1, p.radius), 0, Math.PI*2);
                ctx.stroke();
                ctx.setLineDash([]);
            } else {
                // Burning Barrier: Hexagon shape so it's instantly distinct from circles
                ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const angle = (Math.PI / 3) * i + time;
                    const px = Math.cos(angle) * p.radius;
                    const py = Math.sin(angle) * p.radius;
                    if (i === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.fill();

                ctx.globalAlpha = Math.min(1, p.life * 2) * 0.9;
                ctx.strokeStyle = p.color;
                ctx.lineWidth = 3;
                ctx.setLineDash([20, 10]);
                ctx.lineDashOffset = time * 60;
                ctx.stroke();
                ctx.setLineDash([]);
            }
            ctx.globalAlpha = 1.0;
        } else if (p.type === 'aegis_matrix') {
            ctx.globalCompositeOperation = 'screen';
            ctx.globalAlpha = 0.05; // Faint background
            ctx.fillStyle = p.color || '#00ff88';
            ctx.beginPath();
            ctx.arc(0, 0, p.radius, 0, Math.PI*2);
            ctx.fill();
            
            ctx.globalAlpha = 0.8;
            ctx.strokeStyle = p.color || '#00ff88';
            ctx.lineWidth = 2;
            
            // Aegis Matrix: Dual rotating octagons (geometric tech pattern)
            ctx.beginPath();
            for (let i = 0; i < 8; i++) {
                const angle = (Math.PI / 4) * i + time * 0.5;
                const px = Math.cos(angle) * p.radius;
                const py = Math.sin(angle) * p.radius;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.stroke();

            ctx.beginPath();
            for (let i = 0; i < 8; i++) {
                const angle = (Math.PI / 4) * i - time * 0.8;
                const px = Math.cos(angle) * (p.radius - 15);
                const py = Math.sin(angle) * (p.radius - 15);
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.stroke();
            ctx.globalAlpha = 1.0;
        } else if (p.type === 'napalm_pool' || p.type === 'flaming_lash_pool' || p.type === 'hellfire') {
            ctx.globalCompositeOperation = 'screen';
            ctx.globalAlpha = Math.min(1, p.life) * (p.type === 'hellfire' ? 0.15 : 0.08); // Transparent core
            ctx.fillStyle = p.color || '#ffffff';
            
            ctx.beginPath();
            ctx.arc(0, 0, Math.max(0.1, p.radius), 0, Math.PI*2);
            ctx.fill();
            
            ctx.globalAlpha = Math.min(1, p.life) * 0.7;
            ctx.strokeStyle = p.color;
            ctx.lineWidth = p.type === 'hellfire' ? 3 : 2;
            
            // Segmented bio-hazard ring instead of a solid blob
            const segments = p.type === 'hellfire' ? 5 : 4;
            const segmentSize = (Math.PI * 2) / segments;
            const gap = 0.4;
            
            for (let i = 0; i < segments; i++) {
                ctx.beginPath();
                ctx.arc(0, 0, Math.max(0.1, p.radius * (0.9 + Math.sin(time * 4 + p.x) * 0.05)), 
                    i * segmentSize + gap/2 + (time * (p.type === 'hellfire' ? 1.5 : 1)), 
                    (i + 1) * segmentSize - gap/2 + (time * (p.type === 'hellfire' ? 1.5 : 1)));
                ctx.stroke();
            }
            ctx.globalAlpha = 1.0;
        } else if (p.type === 'nova_pulse' || p.type === 'laser_nova_pulse' || p.type === 'seismic_shockwave' || p.type === 'quantum_collapse') {
            ctx.globalCompositeOperation = 'screen';
            ctx.strokeStyle = p.color || '#ff00ff';
            ctx.lineWidth = p.type === 'quantum_collapse' ? 4 : Math.max(1, 4 * p.life);
            ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 2));
            
            // Clean shockwave rings
            if (p.type === 'quantum_collapse') {
                ctx.beginPath();
                ctx.arc(0, 0, Math.max(0.1, p.radius), 0, Math.PI*2);
                ctx.stroke();
                
                ctx.lineWidth = 1; // Inner ripple
                ctx.beginPath();
                ctx.arc(0, 0, Math.max(0.1, p.radius * 0.6), 0, Math.PI*2);
                ctx.stroke();
            } else {
                ctx.beginPath();
                ctx.arc(0, 0, Math.max(0.1, p.radius), 0, Math.PI*2);
                ctx.stroke();
            }
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