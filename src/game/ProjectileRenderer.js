export function drawProjectiles(ctx, projectiles, particleManager, time, camX, camY, vWidth, vHeight) {
    ctx.globalCompositeOperation = 'source-over';

    projectiles.forEach(p => {
        const originalRadius = p.radius;
        if (!p.isAoe) {
            p.radius = Math.min(originalRadius, p.type === 'supernova_beam' ? 12 : (p.type === 'railgun' ? 6 : 4.5));
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        if (p.vx || p.vy) {
            ctx.rotate(Math.atan2(p.vy, p.vx));
        }

        if (p.type === 'blaster_shot') {
            ctx.fillStyle = p.color || '#00ffff';
            ctx.beginPath(); ctx.roundRect(-p.radius * 2, -p.radius * 0.5, p.radius * 4, p.radius, p.radius * 0.5); ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.roundRect(-p.radius, -p.radius * 0.2, p.radius * 2, p.radius * 0.4, p.radius * 0.2); ctx.fill();
        } else if (p.type === 'wrench_swing') {
            ctx.globalAlpha = Math.max(0, p.life / 0.25);
            const swingAngle = (1 - (p.life / 0.25)) * Math.PI * 1.5; 
            ctx.rotate(swingAngle);
            ctx.fillStyle = '#cccccc';
            ctx.strokeStyle = p.color || '#00ffff';
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.roundRect(0, -4, p.radius * 0.9, 8, 4); ctx.fill(); ctx.stroke();
            ctx.beginPath(); ctx.arc(p.radius * 0.9, 0, 12, Math.PI * 0.2, Math.PI * 1.8); ctx.lineTo(p.radius * 0.9 - 4, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
        } else if (p.type === 'blade_swing') {
            ctx.globalAlpha = Math.max(0, p.life / 0.2);
            const swingAngle = (1 - (p.life / 0.2)) * Math.PI * 1.5; 
            ctx.rotate(swingAngle);
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(p.radius * 0.8, -p.radius * 0.2, p.radius * 0.8, 0); ctx.quadraticCurveTo(p.radius * 0.8, p.radius * 0.2, 0, 0); ctx.fill();
            ctx.strokeStyle = p.color;
            ctx.lineWidth = 2;
            ctx.stroke();
        } else if (p.type === 'grenade_explosion') {
            ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 4));
            const maxR = p.radius;
            const lifeRatio = p.weaponId === 'fragGrenade' ? 0.4 : 0.3;
            const progress = Math.max(0, 1 - (p.life / lifeRatio));
            const currentR = maxR * Math.pow(progress, 0.5); 
            ctx.fillStyle = p.color || '#ffffff';
            ctx.beginPath();
            const spikes = 12;
            for(let i=0; i<spikes*2; i++) {
                const a = (Math.PI*2/(spikes*2))*i;
                const r = i%2===0 ? currentR : currentR * 0.5;
                if(i===0) ctx.moveTo(Math.cos(a)*r, Math.sin(a)*r);
                else ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r);
            }
            ctx.closePath(); ctx.fill();
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            ctx.stroke();
        } else if (p.type === 'beam' || p.type === 'dual_laser') {
            ctx.fillStyle = p.color || '#00ffff';
            ctx.beginPath(); ctx.moveTo(-p.radius * 4, 0); ctx.lineTo(0, -p.radius); ctx.lineTo(p.radius, 0); ctx.lineTo(0, p.radius); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.moveTo(-p.radius * 2, 0); ctx.lineTo(0, -p.radius * 0.4); ctx.lineTo(p.radius * 0.5, 0); ctx.lineTo(0, p.radius * 0.4); ctx.closePath(); ctx.fill();
        } else if (p.type === 'lightning') {
            ctx.strokeStyle = p.color || '#00aaff';
            ctx.lineWidth = Math.max(2, p.radius * 0.6);
            ctx.lineJoin = 'miter';
            ctx.beginPath();
            ctx.moveTo(-p.radius * 1.5, 0);
            ctx.lineTo(-p.radius * 0.5, (Math.random()-0.5)*p.radius*2);
            ctx.lineTo(p.radius * 0.5, (Math.random()-0.5)*p.radius*2);
            ctx.lineTo(p.radius * 1.5, 0);
            ctx.stroke();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = Math.max(1, p.radius * 0.2);
            ctx.stroke();
        } else if (p.type === 'glitch_slash') {
            ctx.fillStyle = p.color || '#00ff00';
            ctx.beginPath(); ctx.moveTo(-p.radius * 2, 0); ctx.lineTo(0, -p.radius * 0.5); ctx.lineTo(p.radius * 2, 0); ctx.lineTo(0, p.radius * 0.5); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#ffffff';
            for(let i=0; i<4; i++) {
                ctx.fillRect((Math.random()-0.5)*p.radius*4, (Math.random()-0.5)*p.radius, p.radius*Math.random()*1.5, p.radius*0.2);
            }
        } else if (p.type === 'stomp') {
            ctx.fillStyle = p.color || '#ff00ff';
            ctx.globalAlpha = 0.3;
            ctx.beginPath(); ctx.arc(0, 0, p.radius, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = p.color || '#ff00ff';
            ctx.lineWidth = 4;
            ctx.globalAlpha = Math.min(1, p.life * 2);
            ctx.beginPath(); ctx.arc(0, 0, p.radius * 0.9, 0, Math.PI * 2); ctx.stroke();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.setLineDash([10, 15]);
            ctx.beginPath(); ctx.arc(0, 0, p.radius * 0.6, 0, Math.PI * 2); ctx.stroke();
            ctx.setLineDash([]);
        } else if (p.type === 'repair_beam') {
            ctx.strokeStyle = p.color || '#00ffcc';
            ctx.lineWidth = 6;
            ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(-p.radius, 0); ctx.lineTo(p.radius, 0); ctx.stroke();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();
        } else if (p.type === 'missile') {
            ctx.fillStyle = '#1e1e24'; 
            ctx.beginPath(); ctx.moveTo(p.radius * 2, 0); ctx.lineTo(p.radius, p.radius * 0.8); ctx.lineTo(-p.radius * 1.5, p.radius * 0.8); ctx.lineTo(-p.radius * 1.5, -p.radius * 0.8); ctx.lineTo(p.radius, -p.radius * 0.8); ctx.closePath(); ctx.fill();
            ctx.fillStyle = p.color || '#ff4400';
            ctx.beginPath(); ctx.moveTo(p.radius * 2, 0); ctx.lineTo(p.radius, p.radius * 0.4); ctx.lineTo(-p.radius * 1.5, p.radius * 0.4); ctx.lineTo(-p.radius * 1.5, -p.radius * 0.4); ctx.lineTo(p.radius, -p.radius * 0.4); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#ffaa00';
            ctx.beginPath(); ctx.moveTo(-p.radius * 1.5, p.radius * 0.5); ctx.lineTo(-p.radius * 3 - Math.random()*p.radius, 0); ctx.lineTo(-p.radius * 1.5, -p.radius * 0.5); ctx.fill();
        } else if (p.type === 'data_pulse' || p.type === 'phantom_orb') {
            ctx.fillStyle = p.color || '#00ff00';
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 3) * i + time * 5;
                const px = Math.cos(angle) * p.radius;
                const py = Math.sin(angle) * p.radius;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.arc(0, 0, p.radius * 0.4, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.stroke();
        } else if (p.type === 'railgun') {
            ctx.fillStyle = p.color || '#00aaff';
            ctx.beginPath(); ctx.roundRect(-p.radius * 6, -p.radius, p.radius * 8, p.radius * 2, p.radius); ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.roundRect(-p.radius * 4, -p.radius * 0.4, p.radius * 6, p.radius * 0.8, p.radius * 0.4); ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            for(let i=0; i<3; i++) {
                const offset = (time * 600 + i * 20) % (p.radius * 6);
                ctx.beginPath();
                ctx.ellipse(-p.radius * 4 + offset, 0, p.radius * 0.5, p.radius * 1.5, 0, 0, Math.PI * 2);
                ctx.stroke();
            }
        } else if (p.type === 'sonic_wave') {
            ctx.strokeStyle = p.color || '#00ffff';
            ctx.lineWidth = Math.max(2, p.radius * 0.2);
            ctx.lineCap = 'round';
            for(let i=0; i<3; i++) {
                ctx.globalAlpha = 1 - (i * 0.3);
                ctx.beginPath();
                ctx.arc(0, 0, p.radius - (i * p.radius * 0.3), -Math.PI/2.5, Math.PI/2.5);
                ctx.stroke();
            }
        } else if (p.type === 'supernova_beam') {
            ctx.fillStyle = p.color || '#ffaa00';
            ctx.beginPath(); ctx.moveTo(-p.radius * 5, 0); ctx.lineTo(0, -p.radius * 1.5); ctx.lineTo(p.radius * 2, 0); ctx.lineTo(0, p.radius * 1.5); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.moveTo(-p.radius * 3, 0); ctx.lineTo(0, -p.radius * 0.6); ctx.lineTo(p.radius, 0); ctx.lineTo(0, p.radius * 0.6); ctx.closePath(); ctx.fill();
        } else if (p.type === 'shield_bubble' || p.type === 'burning_barrier') {
            ctx.globalAlpha = Math.min(1, p.life * 2);
            ctx.strokeStyle = p.color || '#ffffff';
            
            if (p.type === 'shield_bubble') {
                ctx.lineWidth = 4;
                ctx.beginPath(); ctx.arc(0, 0, Math.max(0.1, p.radius), 0, Math.PI*2); ctx.stroke();
                ctx.fillStyle = p.color;
                ctx.globalAlpha = 0.15;
                ctx.fill();
                ctx.globalAlpha = Math.min(1, p.life * 2);
                
                ctx.lineWidth = 2;
                ctx.setLineDash([10, 15]);
                ctx.lineDashOffset = -time * 40;
                ctx.beginPath(); ctx.arc(0, 0, Math.max(0.1, p.radius * 0.8), 0, Math.PI*2); ctx.stroke();
                ctx.setLineDash([]);
            } else {
                ctx.lineWidth = 5;
                ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const angle = (Math.PI / 3) * i + time;
                    const px = Math.cos(angle) * p.radius;
                    const py = Math.sin(angle) * p.radius;
                    if (i === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.closePath(); ctx.stroke();
                ctx.fillStyle = p.color;
                ctx.globalAlpha = 0.2;
                ctx.fill();
            }
        } else if (p.type === 'buzzsaw') {
            ctx.rotate((p.rotation || time * 25) * (p.vx < 0 ? -1 : 1));
            ctx.fillStyle = '#222222';
            ctx.beginPath(); ctx.arc(0, 0, p.radius, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = p.color || '#ff0000';
            ctx.beginPath();
            const spikes = p.type === 'buzzsaw_swarm' ? 12 : 8;
            for(let i=0; i<spikes*2; i++) {
                const a = (Math.PI*2/(spikes*2))*i;
                const r = i%2===0 ? p.radius * 1.2 : p.radius*0.8;
                if(i===0) ctx.moveTo(Math.cos(a)*r, Math.sin(a)*r);
                else ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r);
            }
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.arc(0, 0, p.radius*0.3, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#444444';
            ctx.beginPath(); ctx.arc(0, 0, p.radius*0.15, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(0, 0, p.radius, 0, Math.PI*2); ctx.stroke();
        } else if (p.type === 'toxic_cloud') {
            ctx.globalAlpha = Math.min(1, p.life * 2) * 0.7;
            ctx.fillStyle = p.color;
            for (let i = 0; i < 4; i++) {
                ctx.beginPath();
                ctx.arc(
                    Math.cos(time * 2 + i) * p.radius * 0.4, 
                    Math.sin(time * 2 + i) * p.radius * 0.4, 
                    p.radius * 0.6, 0, Math.PI*2
                );
                ctx.fill();
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 2;
                ctx.globalAlpha = Math.min(1, p.life * 2) * 0.3;
                ctx.stroke();
                ctx.globalAlpha = Math.min(1, p.life * 2) * 0.7;
            }
        } else if (p.type === 'aegis_matrix') {
            ctx.globalAlpha = Math.min(1, p.life * 2);
            ctx.strokeStyle = p.color || '#00ff88';
            ctx.lineWidth = 3;
            
            ctx.beginPath();
            for (let i = 0; i < 8; i++) {
                const angle = (Math.PI / 4) * i + time * 0.5;
                const px = Math.cos(angle) * p.radius;
                const py = Math.sin(angle) * p.radius;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath(); ctx.stroke();

            ctx.lineWidth = 1.5;
            ctx.beginPath();
            for (let i = 0; i < 8; i++) {
                const angle = (Math.PI / 4) * i - time * 0.8;
                const px = Math.cos(angle) * (p.radius * 0.7);
                const py = Math.sin(angle) * (p.radius * 0.7);
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath(); ctx.stroke();
            
            ctx.fillStyle = p.color;
            ctx.globalAlpha = 0.1;
            ctx.fill();
        } else if (p.type === 'napalm_pool' || p.type === 'flaming_lash_pool' || p.type === 'hellfire') {
            ctx.fillStyle = p.color || '#ff4500';
            ctx.globalAlpha = Math.min(1, p.life * 2) * 0.4;
            ctx.beginPath();
            const segments = p.type === 'hellfire' ? 8 : 6;
            for (let i = 0; i < segments; i++) {
                const a = (Math.PI * 2 / segments) * i + time * 0.5;
                const r = p.radius * (0.8 + Math.sin(time * 5 + i) * 0.2);
                if (i === 0) ctx.moveTo(Math.cos(a)*r, Math.sin(a)*r);
                else ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r);
            }
            ctx.closePath(); ctx.fill();
            
            ctx.globalAlpha = Math.min(1, p.life * 2);
            ctx.strokeStyle = p.color;
            ctx.lineWidth = 3;
            ctx.stroke();
        } else if (p.type === 'nova_pulse' || p.type === 'laser_nova_pulse' || p.type === 'seismic_shockwave' || p.type === 'quantum_collapse') {
            ctx.strokeStyle = p.color || '#ff00ff';
            ctx.lineWidth = p.type === 'quantum_collapse' ? 5 : Math.max(2, 6 * p.life);
            ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 2));
            
            if (p.type === 'quantum_collapse') {
                ctx.beginPath(); ctx.arc(0, 0, Math.max(0.1, p.radius), 0, Math.PI*2); ctx.stroke();
                ctx.lineWidth = 2;
                ctx.beginPath();
                for(let i=0; i<8; i++) {
                    const a = (Math.PI/4)*i + time;
                    const r = p.radius * 0.8;
                    if(i===0) ctx.moveTo(Math.cos(a)*r, Math.sin(a)*r);
                    else ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r);
                }
                ctx.closePath(); ctx.stroke();
            } else {
                ctx.beginPath(); ctx.arc(0, 0, Math.max(0.1, p.radius), 0, Math.PI*2); ctx.stroke();
            }
        } else if (p.isAoe) {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(0, 0, p.radius, 0, Math.PI*2); ctx.stroke();
            ctx.fillStyle = p.color || '#00ffff';
            ctx.globalAlpha = 0.2;
            ctx.fill();
        } else {
            ctx.fillStyle = p.color || '#00ffff';
            ctx.beginPath(); ctx.arc(0, 0, Math.max(0.1, p.radius * 1.2), 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.arc(0, 0, Math.max(0.1, p.radius * 0.6), 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(0, 0, Math.max(0.1, p.radius * 1.2), 0, Math.PI*2); ctx.stroke();
        }
        ctx.restore();
        p.radius = originalRadius;
        ctx.globalAlpha = 1.0;
    });
}