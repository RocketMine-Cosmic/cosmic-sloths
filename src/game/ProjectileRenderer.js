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

        if (p.type === 'wrench_swing') {
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
        } else if (p.type === 'beam' || p.type === 'dual_laser' || p.type === 'blaster_shot') {
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
        } else if (p.type === 'nova_pulse' || p.type === 'laser_nova_pulse' || p.type === 'seismic_shockwave') {
            ctx.globalCompositeOperation = 'lighter';
            ctx.strokeStyle = p.color || '#ff00ff';
            ctx.lineWidth = Math.max(2, 6 * p.life);
            ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 2));
            
            // Draw multiple thin sharp rings
            ctx.beginPath();
            ctx.arc(0, 0, Math.max(0.1, p.radius), 0, Math.PI*2);
            ctx.stroke();
            
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = Math.max(1, 3 * p.life);
            ctx.beginPath();
            ctx.arc(0, 0, Math.max(0.1, p.radius * 0.9), 0, Math.PI*2);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.arc(0, 0, Math.max(0.1, p.radius * 0.8), 0, Math.PI*2);
            ctx.stroke();
            
            ctx.globalAlpha = 1.0;
            ctx.globalCompositeOperation = 'screen';
        } else if (p.type === 'shield_bubble' || p.type === 'burning_barrier') {
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = Math.min(1, p.life * 2) * 0.2;
            ctx.fillStyle = p.color || '#ffffff';
            
            // Draw Hexagon instead of circle
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 3) * i + (time * 0.5);
                const hx = Math.cos(angle) * Math.max(0.1, p.radius);
                const hy = Math.sin(angle) * Math.max(0.1, p.radius);
                if (i === 0) ctx.moveTo(hx, hy);
                else ctx.lineTo(hx, hy);
            }
            ctx.closePath();
            ctx.fill();

            ctx.globalAlpha = Math.min(1, p.life * 2) * 0.8;
            ctx.strokeStyle = '#ffffff';
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 15;
            ctx.lineWidth = 3;
            
            // Outer Hexagon stroke
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 3) * i + (time * 0.5);
                const hx = Math.cos(angle) * Math.max(0.1, p.radius);
                const hy = Math.sin(angle) * Math.max(0.1, p.radius);
                if (i === 0) ctx.moveTo(hx, hy);
                else ctx.lineTo(hx, hy);
            }
            ctx.closePath();
            ctx.stroke();
            
            // Inner counter-rotating smaller hexagon
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 3) * i - (time * 0.5);
                const hx = Math.cos(angle) * Math.max(0.1, p.radius * 0.8);
                const hy = Math.sin(angle) * Math.max(0.1, p.radius * 0.8);
                if (i === 0) ctx.moveTo(hx, hy);
                else ctx.lineTo(hx, hy);
            }
            ctx.closePath();
            ctx.lineWidth = 1;
            ctx.stroke();
            
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1.0;
            ctx.globalCompositeOperation = 'screen';
        } else if (p.type === 'napalm_pool' || p.type === 'flaming_lash_pool') {
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = Math.min(1, p.life) * 0.4;
            ctx.fillStyle = p.color || '#ffffff';
            
            // Draw irregular organic blob
            ctx.beginPath();
            const points = 12;
            for (let i = 0; i < points; i++) {
                const angle = (Math.PI * 2 / points) * i;
                const noise = Math.sin(angle * 3 + time * 3 + p.x) * 0.15 + Math.cos(angle * 2 - time * 2 + p.y) * 0.15;
                const r = Math.max(0.1, p.radius * (0.85 + noise));
                const hx = Math.cos(angle) * r;
                const hy = Math.sin(angle) * r;
                if (i === 0) ctx.moveTo(hx, hy);
                else ctx.lineTo(hx, hy);
            }
            ctx.closePath();
            ctx.fill();
            
            ctx.globalAlpha = Math.min(1, p.life) * 0.8;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            ctx.globalAlpha = 1.0;
            ctx.globalCompositeOperation = 'screen';
        } else if (p.type === 'hellfire') {
            ctx.globalCompositeOperation = 'screen';
            ctx.globalAlpha = 0.3 + Math.sin(time * 8 + p.x) * 0.1;
            ctx.fillStyle = p.color || '#00bbff';
            
            // Draw jagged fire blob
            ctx.beginPath();
            const points = 16;
            for (let i = 0; i < points; i++) {
                const angle = (Math.PI * 2 / points) * i;
                const noise = Math.sin(angle * 5 + time * 10 + p.x) * 0.25;
                const r = Math.max(0.1, p.radius * (0.75 + noise));
                const hx = Math.cos(angle) * r;
                const hy = Math.sin(angle) * r;
                if (i === 0) ctx.moveTo(hx, hy);
                else ctx.lineTo(hx, hy);
            }
            ctx.closePath();
            ctx.fill();

            // Inner brighter fire
            ctx.globalAlpha = 0.6;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            for (let i = 0; i < points; i++) {
                const angle = (Math.PI * 2 / points) * i;
                const noise = Math.cos(angle * 6 - time * 12 + p.y) * 0.2;
                const r = Math.max(0.1, p.radius * 0.4 * (0.8 + noise));
                const hx = Math.cos(angle) * r;
                const hy = Math.sin(angle) * r;
                if (i === 0) ctx.moveTo(hx, hy);
                else ctx.lineTo(hx, hy);
            }
            ctx.closePath();
            ctx.fill();

            ctx.globalAlpha = 1.0;
        } else if (p.type === 'quantum_collapse') {
            ctx.globalCompositeOperation = 'screen';
            ctx.globalAlpha = 0.4;
            ctx.fillStyle = p.color || '#ff00ff';
            
            // Draw jagged star
            ctx.beginPath();
            const points = 10;
            for (let i = 0; i < points * 2; i++) {
                const angle = (Math.PI * 2 / (points * 2)) * i + (time * 2);
                const r = i % 2 === 0 ? p.radius : p.radius * 0.4;
                const hx = Math.cos(angle) * r;
                const hy = Math.sin(angle) * r;
                if (i === 0) ctx.moveTo(hx, hy);
                else ctx.lineTo(hx, hy);
            }
            ctx.closePath();
            ctx.fill();
            
            ctx.globalAlpha = 0.8;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3;
            
            // Outer Star Stroke
            ctx.beginPath();
            for (let i = 0; i < points * 2; i++) {
                const angle = (Math.PI * 2 / (points * 2)) * i + (time * 2);
                const r = i % 2 === 0 ? p.radius : p.radius * 0.4;
                const hx = Math.cos(angle) * r;
                const hy = Math.sin(angle) * r;
                if (i === 0) ctx.moveTo(hx, hy);
                else ctx.lineTo(hx, hy);
            }
            ctx.closePath();
            ctx.stroke();
            
            // Inner dark core
            ctx.globalAlpha = 1.0;
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(0, 0, p.radius * 0.2, 0, Math.PI*2);
            ctx.fill();
        } else if (p.type === 'aegis_matrix') {
            ctx.globalCompositeOperation = 'screen';
            ctx.globalAlpha = 0.15;
            ctx.fillStyle = p.color || '#00ff88';
            
            // Draw large octagon
            ctx.beginPath();
            for (let i = 0; i < 8; i++) {
                const angle = (Math.PI / 4) * i + (time * 0.2);
                const hx = Math.cos(angle) * p.radius;
                const hy = Math.sin(angle) * p.radius;
                if (i === 0) ctx.moveTo(hx, hy);
                else ctx.lineTo(hx, hy);
            }
            ctx.closePath();
            ctx.fill();
            
            ctx.globalAlpha = 0.8;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3;
            
            // Outer Octagon stroke
            ctx.beginPath();
            for (let i = 0; i < 8; i++) {
                const angle = (Math.PI / 4) * i + (time * 0.2);
                const hx = Math.cos(angle) * p.radius;
                const hy = Math.sin(angle) * p.radius;
                if (i === 0) ctx.moveTo(hx, hy);
                else ctx.lineTo(hx, hy);
            }
            ctx.closePath();
            ctx.stroke();
            
            // Inner counter-rotating octagon
            ctx.globalAlpha = 0.4;
            ctx.beginPath();
            for (let i = 0; i < 8; i++) {
                const angle = (Math.PI / 4) * i - (time * 0.3);
                const hx = Math.cos(angle) * (p.radius - 15);
                const hy = Math.sin(angle) * (p.radius - 15);
                if (i === 0) ctx.moveTo(hx, hy);
                else ctx.lineTo(hx, hy);
            }
            ctx.closePath();
            ctx.lineWidth = 1;
            ctx.stroke();
            
            // Cross lines
            ctx.globalAlpha = 0.3;
            for (let i = 0; i < 4; i++) {
                const angle = (Math.PI / 4) * i + (time * 0.2);
                ctx.beginPath();
                ctx.moveTo(Math.cos(angle) * p.radius, Math.sin(angle) * p.radius);
                ctx.lineTo(Math.cos(angle + Math.PI) * p.radius, Math.sin(angle + Math.PI) * p.radius);
                ctx.stroke();
            }
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