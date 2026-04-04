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
        // Removed glowing aura to stick to the clean geometric style

        if (p.type === 'blaster_shot') {
            ctx.globalCompositeOperation = 'source-over';
            
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = p.color || '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(p.radius * 2.5, 0);
            ctx.lineTo(0, p.radius * 1.2);
            ctx.lineTo(-p.radius * 1.5, 0);
            ctx.lineTo(0, -p.radius * 1.2);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        } else if (p.type === 'wrench_swing') {
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = Math.max(0, p.life / 0.25);
            const swingAngle = (1 - (p.life / 0.25)) * Math.PI * 1.5; 
            ctx.rotate(swingAngle);
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = p.color || '#00ffff';
            ctx.lineWidth = 4;
            const r = Math.max(0.1, p.radius);
            ctx.beginPath(); ctx.rect(0, -6, r * 0.9, 12); ctx.fill(); ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(r * 0.9, -18);
            ctx.lineTo(r * 0.9 + 18, -18);
            ctx.lineTo(r * 0.9 + 18, 18);
            ctx.lineTo(r * 0.9, 18);
            ctx.closePath();
            ctx.fill(); ctx.stroke();
            ctx.globalAlpha = 1.0;
        } else if (p.type === 'blade_swing') {
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = Math.max(0, p.life / 0.2);
            const swingAngle = (1 - (p.life / 0.2)) * Math.PI * 1.5; 
            ctx.rotate(swingAngle);
            const r = Math.max(0.1, p.radius);
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = p.color || '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath(); 
            ctx.moveTo(0, 0); 
            ctx.lineTo(r * 0.8, -r * 0.2); 
            ctx.lineTo(r, 0); 
            ctx.lineTo(r * 0.8, r * 0.2); 
            ctx.closePath(); 
            ctx.fill();
            ctx.stroke();
            ctx.globalAlpha = 1.0;
        } else if (p.type === 'grenade_explosion') {
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 3));
            const maxR = Math.max(0.1, p.radius);
            const lifeRatio = p.weaponId === 'fragGrenade' ? 0.4 : 0.3;
            const progress = Math.max(0, 1 - (p.life / lifeRatio));
            const currentR = Math.max(0.1, maxR * Math.pow(progress, 0.5)); 
            
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            for(let i=0; i<8; i++) {
                const angle = (Math.PI*2/8) * i;
                const r = i % 2 === 0 ? currentR : currentR * 0.5;
                if (i === 0) ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
                else ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
            }
            ctx.closePath();
            ctx.fill();
            
            ctx.strokeStyle = p.color || '#ff0000'; 
            ctx.lineWidth = Math.max(2, 6 * p.life); 
            ctx.stroke();
            ctx.globalAlpha = 1.0;
        } else if (p.type === 'beam' || p.type === 'dual_laser') {
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = p.color || '#00ffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(p.radius * 2.5, 0);
            ctx.lineTo(p.radius * 2, p.radius * 0.5);
            ctx.lineTo(-p.radius * 2, p.radius * 0.5);
            ctx.lineTo(-p.radius * 2.5, 0);
            ctx.lineTo(-p.radius * 2, -p.radius * 0.5);
            ctx.lineTo(p.radius * 2, -p.radius * 0.5);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        } else if (p.type === 'lightning') {
            ctx.globalCompositeOperation = 'source-over';
            ctx.beginPath();
            ctx.moveTo(-p.radius, 0);
            ctx.lineTo(-p.radius/2, (Math.random()-0.5)*p.radius);
            ctx.lineTo(0, (Math.random()-0.5)*p.radius);
            ctx.lineTo(p.radius/2, (Math.random()-0.5)*p.radius);
            ctx.lineTo(p.radius, 0);
            
            ctx.strokeStyle = p.color || '#00aaff';
            ctx.lineWidth = 5;
            ctx.stroke();
            
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();
        } else if (p.type === 'glitch_slash') {
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = '#ffffff'; 
            ctx.strokeStyle = p.color || '#00ff00';
            ctx.lineWidth = 2;
            ctx.beginPath(); 
            ctx.moveTo(-p.radius, -p.radius * 0.2);
            ctx.lineTo(p.radius, -p.radius * 0.4);
            ctx.lineTo(p.radius * 0.8, p.radius * 0.2);
            ctx.lineTo(-p.radius * 1.2, p.radius * 0.4);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        } else if (p.type === 'stomp') {
            ctx.globalCompositeOperation = 'source-over';
            const r = Math.max(0.1, p.radius);
            ctx.strokeStyle = p.color || '#ff00ff';
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.stroke();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            ctx.fillStyle = p.color || '#ff00ff';
            ctx.beginPath();
            for(let i=0; i<8; i++){
                const a = (Math.PI * 2 / 8) * i;
                ctx.moveTo(Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.8);
                ctx.lineTo(Math.cos(a+0.2) * r, Math.sin(a+0.2) * r);
                ctx.lineTo(Math.cos(a-0.2) * r, Math.sin(a-0.2) * r);
            }
            ctx.fill();
        } else if (p.type === 'repair_beam') {
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = p.color || '#00ffcc';
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.moveTo(-p.radius, 0);
            ctx.lineTo(p.radius, 0);
            ctx.stroke();
            
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-p.radius, 0);
            ctx.lineTo(p.radius, 0);
            ctx.stroke();
            
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(p.radius - 4, -4, 8, 8);
        } else if (p.type === 'missile') {
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = p.color || '#ff4400';
            ctx.lineWidth = 2;
            ctx.beginPath(); 
            ctx.moveTo(p.radius * 2, 0);
            ctx.lineTo(-p.radius, p.radius * 0.8);
            ctx.lineTo(-p.radius * 0.5, 0);
            ctx.lineTo(-p.radius, -p.radius * 0.8);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        } else if (p.type === 'data_pulse' || p.type === 'phantom_orb') {
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = p.color || '#ffffff';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(p.radius * 1.5, 0);
            ctx.lineTo(0, p.radius * 1.5);
            ctx.lineTo(-p.radius * 1.5, 0);
            ctx.lineTo(0, -p.radius * 1.5);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        } else if (p.type === 'railgun') {
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = p.color || '#00aaff';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.rect(-p.radius*2, -p.radius*0.4, p.radius*4, p.radius*0.8);
            ctx.fill();
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(-p.radius*2, -p.radius*0.8);
            ctx.lineTo(p.radius*2, -p.radius*0.8);
            ctx.moveTo(-p.radius*2, p.radius*0.8);
            ctx.lineTo(p.radius*2, p.radius*0.8);
            ctx.stroke();
        } else if (p.type === 'sonic_wave') {
            ctx.globalCompositeOperation = 'source-over';
            const r = Math.max(0.1, p.radius);
            ctx.strokeStyle = p.color || '#00ffff';
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.arc(0, 0, r, -Math.PI/3, Math.PI/3);
            ctx.stroke();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();
        } else if (p.type === 'supernova_beam') {
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 0.9;
            const r = Math.max(0.1, p.radius);
            // Outer casing
            ctx.fillStyle = p.color || '#ffaa00';
            ctx.beginPath(); ctx.ellipse(0, 0, r * 2.5, r * 0.8, 0, 0, Math.PI * 2); ctx.fill();
            // Inner hot core
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.ellipse(0, 0, r * 2.0, r * 0.3, 0, 0, Math.PI * 2); ctx.fill();
            // Segmented energy rings
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            for (let i = -2; i <= 2; i++) {
                ctx.beginPath();
                ctx.ellipse(i * r * 0.8, 0, r * 0.2, r * 1.0, 0, 0, Math.PI * 2);
                ctx.stroke();
            }
            ctx.globalAlpha = 1.0;
        } else if (p.type === 'nova_pulse' || p.type === 'laser_nova_pulse' || p.type === 'seismic_shockwave') {
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 2));
            const r = Math.max(0.1, p.radius);
            
            // Inner blast gradient
            const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
            grad.addColorStop(0, '#ffffff');
            grad.addColorStop(0.5, p.color || '#ff00ff');
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2); ctx.fill();
            
            // Shatter lines
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = Math.max(1, 4 * p.life);
            ctx.beginPath();
            for(let i=0; i<8; i++) {
                const angle = (Math.PI*2/8) * i + (time * 2);
                ctx.moveTo(Math.cos(angle) * r * 0.2, Math.sin(angle) * r * 0.2);
                ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
            }
            ctx.stroke();
            
            // Outer shockwave ring
            ctx.strokeStyle = p.color || '#ff00ff';
            ctx.lineWidth = Math.max(2, 8 * p.life);
            ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2); ctx.stroke();
            
            ctx.globalAlpha = 1.0;
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
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = Math.min(1, p.life) * 0.8;
            
            // Lava base
            ctx.fillStyle = p.color || '#ff4500';
            ctx.beginPath();
            const spikes = 10;
            for (let i = 0; i < spikes * 2; i++) {
                const angle = (Math.PI * 2 / (spikes * 2)) * i;
                const wave = Math.sin(time * 3 + i) * (p.radius * 0.1);
                const r = (i % 2 === 0 ? p.radius * 0.9 : p.radius) + wave;
                if (i === 0) ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
                else ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
            }
            ctx.closePath();
            ctx.fill();
            
            // Magma cracks / inner fiery cells
            ctx.globalAlpha = Math.min(1, p.life);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                const angle = (Math.PI * 2 / 5) * i + time;
                const r1 = p.radius * 0.2;
                const r2 = p.radius * 0.7;
                ctx.moveTo(Math.cos(angle) * r1, Math.sin(angle) * r1);
                ctx.quadraticCurveTo(
                    Math.cos(angle + 0.5) * (p.radius * 0.5), 
                    Math.sin(angle + 0.5) * (p.radius * 0.5), 
                    Math.cos(angle + 0.2) * r2, 
                    Math.sin(angle + 0.2) * r2
                );
            }
            ctx.stroke();
            
            ctx.globalAlpha = 1.0;
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
            ctx.globalCompositeOperation = 'source-over';
            const r = Math.max(0.1, p.radius);
            ctx.strokeStyle = p.color || '#00ffff';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI*2);
            ctx.stroke();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.setLineDash([10, 10]);
            ctx.stroke();
            ctx.setLineDash([]);
        } else {
            // Default projectile
            ctx.globalCompositeOperation = 'source-over';
            const r = Math.max(0.1, p.radius);
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = p.color || '#00ffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(r, 0);
            ctx.lineTo(0, r);
            ctx.lineTo(-r, 0);
            ctx.lineTo(0, -r);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }
        ctx.restore();
    });
    ctx.globalCompositeOperation = 'source-over';
}