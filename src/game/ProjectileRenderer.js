export function drawProjectiles(ctx, projectiles, particleManager, time, camX, camY, vWidth, vHeight) {
    ctx.globalCompositeOperation = 'screen';
    const texStar = particleManager?.textures?.star;
    const texSlash = particleManager?.textures?.slash;
    const texShockwave = particleManager?.textures?.shockwave;
    const texSmoke = particleManager?.textures?.smoke;

    projectiles.forEach(p => {
        const originalRadius = p.radius;
        // Keep VFX a tad smaller and prevent visual scaling with area of attack for standard projectiles
        if (!p.isAoe) {
            p.radius = Math.min(originalRadius, p.type === 'supernova_beam' ? 12 : (p.type === 'railgun' ? 6 : 4.5));
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        if (p.vx || p.vy) {
            ctx.rotate(Math.atan2(p.vy, p.vx));
        }
        
        const isElongated = p.type === 'beam' || p.type === 'dual_laser' || p.type === 'supernova_beam' || p.type === 'missile' || p.type === 'railgun' || p.type === 'blaster_shot';

        // High Quality Glowing Aura
        if (!p.isAoe) {
            ctx.globalCompositeOperation = 'lighter';
            const auraRadius = Math.max(0.1, p.radius * 3);
            const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, auraRadius);
            grad.addColorStop(0, p.color || '#ffffff');
            grad.addColorStop(0.2, p.color || '#ffffff');
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.globalAlpha = 0.4; // Boosted aura alpha
            
            if (isElongated) {
                ctx.beginPath();
                ctx.ellipse(0, 0, auraRadius * 1.2, auraRadius * 0.6, 0, 0, Math.PI * 2);
                ctx.fill();
                // Tail
                const tailGrad = ctx.createLinearGradient(0, 0, -auraRadius * 2, 0);
                tailGrad.addColorStop(0, p.color || '#ffffff');
                tailGrad.addColorStop(1, 'transparent');
                ctx.fillStyle = tailGrad;
                ctx.globalAlpha = 0.3;
                ctx.beginPath();
                ctx.moveTo(0, auraRadius * 0.4);
                ctx.lineTo(-auraRadius * 2.5, 0);
                ctx.lineTo(0, -auraRadius * 0.4);
                ctx.fill();
            } else {
                ctx.beginPath();
                ctx.arc(0, 0, auraRadius, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1.0;
            ctx.globalCompositeOperation = 'screen';
        }

        if (p.type === 'blaster_shot') {
            ctx.globalCompositeOperation = 'lighter';
            const grad = ctx.createLinearGradient(p.radius, 0, -p.radius * 3, 0);
            grad.addColorStop(0, '#ffffff');
            grad.addColorStop(0.2, p.color || '#00ffff');
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath(); ctx.ellipse(-p.radius * 0.5, 0, Math.max(0.1, p.radius * 2.5), Math.max(0.1, p.radius * 1.2), 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.ellipse(0, 0, Math.max(0.1, p.radius * 1.2), Math.max(0.1, p.radius * 0.5), 0, 0, Math.PI * 2); ctx.fill();
            if (texStar && texStar.isReady) {
                ctx.globalAlpha = 0.8;
                ctx.drawImage(texStar, -p.radius * 3, -p.radius * 3, p.radius * 6, p.radius * 6);
                ctx.globalAlpha = 1.0;
            }
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
            const trailGrad = ctx.createLinearGradient(p.radius, 0, -p.radius * 4, 0);
            trailGrad.addColorStop(0, '#ffffff');
            trailGrad.addColorStop(0.2, p.color || '#00ffff');
            trailGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = trailGrad;
            ctx.beginPath(); ctx.ellipse(-p.radius, 0, p.radius * 3.5, p.radius * 1.2, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.ellipse(0, 0, p.radius * 1.5, p.radius * 0.4, 0, 0, Math.PI * 2); ctx.fill();
            if (texSlash && texSlash.isReady) {
                ctx.globalAlpha = 0.9;
                ctx.drawImage(texSlash, -p.radius * 4, -p.radius * 2, p.radius * 8, p.radius * 4);
                ctx.globalAlpha = 1.0;
            }
            ctx.globalCompositeOperation = 'screen';
        } else if (p.type === 'lightning') {
            ctx.globalCompositeOperation = 'lighter';
            ctx.strokeStyle = '#ffffff';
            ctx.shadowColor = p.color || '#00aaff';
            ctx.shadowBlur = 15;
            ctx.lineWidth = Math.max(2, p.radius * 0.4);
            ctx.beginPath();
            ctx.moveTo(-p.radius * 1.5, 0);
            ctx.lineTo(-p.radius*0.5, (Math.random()-0.5)*p.radius*1.5);
            ctx.lineTo(p.radius*0.5, (Math.random()-0.5)*p.radius*1.5);
            ctx.lineTo(p.radius * 1.5, 0);
            ctx.stroke();
            ctx.strokeStyle = p.color || '#00aaff';
            ctx.lineWidth = Math.max(1, p.radius * 0.8);
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.globalCompositeOperation = 'screen';
        } else if (p.type === 'glitch_slash') {
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = '#ffffff'; 
            ctx.shadowColor = p.color || '#00ff00';
            ctx.shadowBlur = 20;
            ctx.beginPath(); ctx.ellipse(0, 0, p.radius * 2, p.radius*0.4, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = p.color || '#00ff00';
            for(let i=0; i<3; i++) {
                ctx.fillRect((Math.random()-0.5)*p.radius*3, (Math.random()-0.5)*p.radius, p.radius*0.8, p.radius*0.2);
            }
            ctx.shadowBlur = 0;
            ctx.globalCompositeOperation = 'screen';
        } else if (p.type === 'stomp') {
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = p.color || '#ff00ff';
            ctx.globalAlpha = 0.5;
            ctx.beginPath(); ctx.arc(0, 0, p.radius, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3;
            ctx.setLineDash([5, 5]);
            ctx.beginPath(); ctx.arc(0, 0, p.radius * 0.8, 0, Math.PI * 2); ctx.stroke();
            ctx.setLineDash([]);
            if (texShockwave && texShockwave.isReady) {
                ctx.globalAlpha = 0.7;
                ctx.drawImage(texShockwave, -p.radius * 1.5, -p.radius * 1.5, p.radius * 3, p.radius * 3);
            }
            ctx.globalAlpha = 1.0;
            ctx.globalCompositeOperation = 'screen';
        } else if (p.type === 'repair_beam') {
            ctx.globalCompositeOperation = 'lighter';
            ctx.strokeStyle = p.color || '#00ffcc';
            ctx.lineWidth = 6;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(-p.radius, 0);
            ctx.lineTo(p.radius, 0);
            ctx.stroke();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.globalCompositeOperation = 'screen';
        } else if (p.type === 'missile') {
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = '#2a2a35';
            ctx.beginPath();
            ctx.moveTo(p.radius * 1.8, 0);
            ctx.lineTo(-p.radius, p.radius * 0.9);
            ctx.lineTo(-p.radius * 0.4, 0);
            ctx.lineTo(-p.radius, -p.radius * 0.9);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = p.color || '#ff4400';
            ctx.beginPath();
            ctx.moveTo(p.radius * 1.2, 0);
            ctx.lineTo(-p.radius * 0.2, p.radius * 0.4);
            ctx.lineTo(0, 0);
            ctx.lineTo(-p.radius * 0.2, -p.radius * 0.4);
            ctx.closePath();
            ctx.fill();
            ctx.globalCompositeOperation = 'lighter';
            const thrust = ctx.createLinearGradient(-p.radius * 0.4, 0, -p.radius * 3.5, 0);
            thrust.addColorStop(0, '#ffffff');
            thrust.addColorStop(0.2, '#ffaa00');
            thrust.addColorStop(1, 'transparent');
            ctx.fillStyle = thrust;
            ctx.beginPath();
            ctx.ellipse(-p.radius * 1.5, 0, p.radius * 2 + Math.random() * p.radius, p.radius * 0.7, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalCompositeOperation = 'screen';
        } else if (p.type === 'data_pulse' || p.type === 'phantom_orb') {
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = p.color || '#00ff00';
            ctx.globalAlpha = 0.6;
            ctx.beginPath(); ctx.arc(0, 0, p.radius, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.globalAlpha = 1.0;
            ctx.beginPath(); ctx.arc(0, 0, p.radius * 0.4, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = p.color || '#00ff00';
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.8;
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 3) * i + time * 5;
                const px = Math.cos(angle) * p.radius * 1.2;
                const py = Math.sin(angle) * p.radius * 1.2;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.stroke();
            ctx.globalAlpha = 1.0;
            ctx.globalCompositeOperation = 'screen';
        } else if (p.type === 'railgun') {
            ctx.globalCompositeOperation = 'lighter';
            const railGrad = ctx.createLinearGradient(p.radius * 2, 0, -p.radius * 6, 0);
            railGrad.addColorStop(0, '#ffffff');
            railGrad.addColorStop(0.1, p.color || '#00aaff');
            railGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = railGrad;
            ctx.beginPath(); ctx.ellipse(-p.radius, 0, p.radius * 5, p.radius * 1.5, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.ellipse(0, 0, p.radius * 3, p.radius * 0.4, 0, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            for(let i=0; i<4; i++) {
                const offset = (time * 400 + i * 15) % (p.radius * 4);
                ctx.beginPath();
                ctx.ellipse(-p.radius * 2.5 + offset, 0, p.radius * 0.5, p.radius * 1.8, 0, 0, Math.PI * 2);
                ctx.stroke();
            }
            if (texSlash && texSlash.isReady) {
                ctx.globalAlpha = 0.8;
                ctx.drawImage(texSlash, -p.radius * 6, -p.radius * 3, p.radius * 12, p.radius * 6);
                ctx.globalAlpha = 1.0;
            }
            ctx.globalCompositeOperation = 'screen';
        } else if (p.type === 'sonic_wave') {
            ctx.globalCompositeOperation = 'lighter';
            ctx.strokeStyle = p.color || '#00ffff';
            ctx.lineWidth = Math.max(2, p.radius * 0.2);
            ctx.lineCap = 'round';
            for(let i=0; i<3; i++) {
                ctx.globalAlpha = 1 - (i * 0.3);
                ctx.beginPath();
                ctx.arc(0, 0, p.radius - (i * p.radius * 0.3), -Math.PI/2.5, Math.PI/2.5);
                ctx.stroke();
            }
            ctx.globalAlpha = 1.0;
            ctx.globalCompositeOperation = 'screen';
        } else if (p.type === 'supernova_beam') {
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.9;
            ctx.fillStyle = p.color || '#ffaa00';
            ctx.beginPath(); ctx.ellipse(0, 0, p.radius * 3.5, p.radius * 1.2, 0, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 1.0;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.ellipse(0, 0, p.radius * 2.5, p.radius * 0.4, 0, 0, Math.PI * 2); ctx.fill();
            if (texStar && texStar.isReady) {
                ctx.globalAlpha = 0.8;
                ctx.drawImage(texStar, -p.radius * 3, -p.radius * 3, p.radius * 6, p.radius * 6);
            }
            ctx.globalCompositeOperation = 'screen';
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
        } else if (p.type === 'buzzsaw') {
            ctx.rotate((p.rotation || time * 15) * (p.vx < 0 ? -1 : 1));
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = p.color;
            ctx.beginPath();
            const spikes = p.type === 'buzzsaw_swarm' ? 12 : 8;
            for(let i=0; i<spikes*2; i++) {
                const a = (Math.PI*2/(spikes*2))*i;
                const r = i%2===0 ? p.radius : p.radius*0.6;
                ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r);
            }
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.arc(0, 0, p.radius*0.3, 0, Math.PI*2); ctx.fill();
            ctx.globalCompositeOperation = 'screen';
        } else if (p.type === 'toxic_cloud') {
            ctx.globalCompositeOperation = 'screen';
            ctx.globalAlpha = Math.min(1, p.life) * 0.15;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                ctx.beginPath();
                ctx.arc(
                    Math.cos(time * 2 + i) * p.radius * 0.3, 
                    Math.sin(time * 2 + i) * p.radius * 0.3, 
                    p.radius * 0.8, 0, Math.PI*2
                );
                ctx.fill();
            }
            ctx.globalAlpha = Math.min(1, p.life) * 0.8;
            ctx.strokeStyle = p.color;
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(0, 0, p.radius, 0, Math.PI*2); ctx.stroke();
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
            // Default projectile - HD Upgrade
            ctx.globalCompositeOperation = 'lighter';
            const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(0.1, p.radius * 2.5));
            grad.addColorStop(0, '#ffffff');
            grad.addColorStop(0.2, '#ffffff');
            grad.addColorStop(0.5, p.color || '#00ffff');
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, Math.max(0.1, p.radius * 2.5), 0, Math.PI*2);
            ctx.fill();
            if (texStar && texStar.isReady) {
                ctx.globalAlpha = 0.7;
                ctx.drawImage(texStar, -p.radius * 3, -p.radius * 3, p.radius * 6, p.radius * 6);
                ctx.globalAlpha = 1.0;
            }
            ctx.globalCompositeOperation = 'screen';
        }
        ctx.restore();
        p.radius = originalRadius;
    });
    ctx.globalCompositeOperation = 'source-over';
}