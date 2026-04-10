export function drawProjectiles(ctx, projectiles, particleManager, time, camX, camY, vWidth, vHeight) {
    ctx.globalCompositeOperation = 'source-over';

    projectiles.forEach(p => {
        const originalRadius = p.radius;
        if (!p.isAoe) {
            // Increased visual scale limit for more HD-2D glow
            p.radius = Math.min(originalRadius, p.type === 'supernova_beam' ? 25 : (p.type === 'railgun' ? 16 : 10));
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        if (p.vx || p.vy) {
            ctx.rotate(Math.atan2(p.vy, p.vx));
        }

        const isEnergy = !['wrench_swing', 'blade_swing', 'grenade_explosion', 'missile', 'buzzsaw'].includes(p.type);
        if (isEnergy) {
            ctx.globalCompositeOperation = 'screen';
        }

        if (p.type === 'blaster_shot') {
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = p.color || '#00ffff';
            ctx.beginPath(); ctx.roundRect(-p.radius * 4.0, -p.radius * 1.2, p.radius * 8.0, p.radius * 2.4, p.radius * 1.2); ctx.fill();
            ctx.globalAlpha = 0.6;
            ctx.beginPath(); ctx.roundRect(-p.radius * 2.5, -p.radius * 0.7, p.radius * 5.0, p.radius * 1.4, p.radius * 0.7); ctx.fill();
            ctx.globalAlpha = 1.0;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.roundRect(-p.radius * 1.2, -p.radius * 0.3, p.radius * 2.4, p.radius * 0.6, p.radius * 0.3); ctx.fill();
        } else if (p.type === 'wrench_swing') {
            ctx.globalAlpha = Math.max(0, p.life / 0.25) * 0.6;
            const swingAngle = (1 - (p.life / 0.25)) * Math.PI * 1.5; 
            ctx.rotate(swingAngle);
            ctx.fillStyle = p.color || '#00ffff';
            ctx.beginPath(); ctx.roundRect(0, -6, p.radius * 1.1, 12, 6); ctx.fill();
            ctx.globalAlpha = Math.max(0, p.life / 0.25);
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.roundRect(0, -3, p.radius * 0.9, 6, 3); ctx.fill();
            ctx.beginPath(); ctx.arc(p.radius * 0.9, 0, 10, Math.PI * 0.2, Math.PI * 1.8); ctx.lineTo(p.radius * 0.9 - 4, 0); ctx.closePath(); ctx.fill();
        } else if (p.type === 'blade_swing') {
            ctx.globalAlpha = Math.max(0, p.life / 0.2) * 0.5;
            const swingAngle = (1 - (p.life / 0.2)) * Math.PI * 1.5; 
            ctx.rotate(swingAngle);
            ctx.fillStyle = p.color || '#00ffff';
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(p.radius * 1.0, -p.radius * 0.4, p.radius * 1.0, 0); ctx.quadraticCurveTo(p.radius * 1.0, p.radius * 0.4, 0, 0); ctx.fill();
            ctx.globalAlpha = Math.max(0, p.life / 0.2);
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(p.radius * 0.8, -p.radius * 0.2, p.radius * 0.8, 0); ctx.quadraticCurveTo(p.radius * 0.8, p.radius * 0.2, 0, 0); ctx.fill();
        } else if (p.type === 'grenade_explosion') {
            ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 4)) * 0.6;
            const maxR = p.radius;
            const lifeRatio = p.weaponId === 'fragGrenade' ? 0.4 : 0.3;
            const progress = Math.max(0, 1 - (p.life / lifeRatio));
            const currentR = maxR * Math.pow(progress, 0.5); 
            ctx.fillStyle = p.color || '#ff8800';
            ctx.beginPath(); ctx.arc(0, 0, currentR * 1.2, 0, Math.PI*2); ctx.fill();
            ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 4));
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            const spikes = 12;
            for(let i=0; i<spikes*2; i++) {
                const a = (Math.PI*2/(spikes*2))*i;
                const r = i%2===0 ? currentR : currentR * 0.5;
                if(i===0) ctx.moveTo(Math.cos(a)*r, Math.sin(a)*r);
                else ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r);
            }
            ctx.closePath(); ctx.fill();
        } else if (p.type === 'beam' || p.type === 'dual_laser') {
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = p.color || '#00ffff';
            ctx.beginPath(); ctx.moveTo(-p.radius * 8.0, 0); ctx.lineTo(0, -p.radius * 2.5); ctx.lineTo(p.radius * 2.5, 0); ctx.lineTo(0, p.radius * 2.5); ctx.closePath(); ctx.fill();
            ctx.globalAlpha = 0.7;
            ctx.beginPath(); ctx.moveTo(-p.radius * 4.0, 0); ctx.lineTo(0, -p.radius * 1.2); ctx.lineTo(p.radius * 1.2, 0); ctx.lineTo(0, p.radius * 1.2); ctx.closePath(); ctx.fill();
            ctx.globalAlpha = 1.0;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.moveTo(-p.radius * 2.0, 0); ctx.lineTo(0, -p.radius * 0.4); ctx.lineTo(p.radius * 0.6, 0); ctx.lineTo(0, p.radius * 0.4); ctx.closePath(); ctx.fill();
        } else if (p.type === 'lightning') {
            ctx.globalAlpha = 0.3;
            ctx.strokeStyle = p.color || '#00aaff';
            ctx.lineWidth = Math.max(8, p.radius * 2.5);
            ctx.lineJoin = 'miter';
            ctx.beginPath();
            ctx.moveTo(-p.radius * 2.0, 0);
            ctx.lineTo(-p.radius * 0.8, (Math.random()-0.5)*p.radius*3);
            ctx.lineTo(p.radius * 0.8, (Math.random()-0.5)*p.radius*3);
            ctx.lineTo(p.radius * 2.0, 0);
            ctx.stroke();
            ctx.globalAlpha = 0.8;
            ctx.lineWidth = Math.max(3, p.radius * 1.0);
            ctx.stroke();
            ctx.globalAlpha = 1.0;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = Math.max(1, p.radius * 0.4);
            ctx.stroke();
        } else if (p.type === 'glitch_slash') {
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = p.color || '#00ff00';
            ctx.beginPath(); ctx.moveTo(-p.radius * 4.5, 0); ctx.lineTo(0, -p.radius * 1.5); ctx.lineTo(p.radius * 4.5, 0); ctx.lineTo(0, p.radius * 1.5); ctx.closePath(); ctx.fill();
            ctx.globalAlpha = 0.7;
            ctx.beginPath(); ctx.moveTo(-p.radius * 2.5, 0); ctx.lineTo(0, -p.radius * 0.8); ctx.lineTo(p.radius * 2.5, 0); ctx.lineTo(0, p.radius * 0.8); ctx.closePath(); ctx.fill();
            ctx.globalAlpha = 1.0;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.moveTo(-p.radius * 1.2, 0); ctx.lineTo(0, -p.radius * 0.3); ctx.lineTo(p.radius * 1.2, 0); ctx.lineTo(0, p.radius * 0.3); ctx.closePath(); ctx.fill();
            for(let i=0; i<6; i++) {
                ctx.fillRect((Math.random()-0.5)*p.radius*7, (Math.random()-0.5)*p.radius*1.8, p.radius*Math.random()*3.0, p.radius*0.4);
            }
        } else if (p.type === 'stomp') {
            const glowR = p.radius * 1.8;
            const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, glowR);
            grad.addColorStop(0, p.color || '#ff00ff');
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.globalAlpha = 0.4;
            ctx.beginPath(); ctx.arc(0, 0, glowR, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = Math.min(1, p.life * 2) * 0.8;
            ctx.beginPath(); ctx.arc(0, 0, p.radius * 1.2, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 4;
            ctx.globalAlpha = Math.min(1, p.life * 2);
            ctx.beginPath(); ctx.arc(0, 0, p.radius * 0.9, 0, Math.PI * 2); ctx.stroke();
        } else if (p.type === 'repair_beam') {
            ctx.globalAlpha = 0.3;
            ctx.strokeStyle = p.color || '#00ffcc';
            ctx.lineWidth = 18;
            ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(-p.radius*1.2, 0); ctx.lineTo(p.radius*1.2, 0); ctx.stroke();
            ctx.globalAlpha = 0.7;
            ctx.lineWidth = 8;
            ctx.stroke();
            ctx.globalAlpha = 1.0;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3;
            ctx.stroke();
        } else if (p.type === 'missile') {
            ctx.globalAlpha = 0.4;
            ctx.fillStyle = p.color || '#ff4400';
            ctx.beginPath(); ctx.moveTo(p.radius * 3.0, 0); ctx.lineTo(p.radius, p.radius * 1.5); ctx.lineTo(-p.radius * 2.0, p.radius * 1.5); ctx.lineTo(-p.radius * 2.0, -p.radius * 1.5); ctx.lineTo(p.radius, -p.radius * 1.5); ctx.closePath(); ctx.fill();
            ctx.globalAlpha = 1.0;
            ctx.fillStyle = p.color || '#ff4400';
            ctx.beginPath(); ctx.moveTo(p.radius * 2, 0); ctx.lineTo(p.radius, p.radius * 0.4); ctx.lineTo(-p.radius * 1.5, p.radius * 0.4); ctx.lineTo(-p.radius * 1.5, -p.radius * 0.4); ctx.lineTo(p.radius, -p.radius * 0.4); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.moveTo(-p.radius * 1.5, p.radius * 0.5); ctx.lineTo(-p.radius * 3 - Math.random()*p.radius, 0); ctx.lineTo(-p.radius * 1.5, -p.radius * 0.5); ctx.fill();
        } else if (p.type === 'data_pulse' || p.type === 'phantom_orb') {
            const glowR = p.radius * 2.0;
            const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, glowR);
            grad.addColorStop(0, p.color || '#00ff00');
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.globalAlpha = 0.5;
            ctx.beginPath(); ctx.arc(0, 0, glowR, 0, Math.PI*2); ctx.fill();
            
            ctx.globalAlpha = 1.0;
            ctx.fillStyle = p.color || '#00ff00';
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 3) * i + time * 5;
                const px = Math.cos(angle) * (p.radius * 1.2);
                const py = Math.sin(angle) * (p.radius * 1.2);
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.arc(0, 0, p.radius * 0.6, 0, Math.PI * 2); ctx.fill();
        } else if (p.type === 'railgun') {
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = p.color || '#00aaff';
            ctx.beginPath(); ctx.roundRect(-p.radius * 10, -p.radius * 2.5, p.radius * 14, p.radius * 5.0, p.radius * 2.5); ctx.fill();
            ctx.globalAlpha = 0.7;
            ctx.beginPath(); ctx.roundRect(-p.radius * 7, -p.radius * 1.2, p.radius * 10, p.radius * 2.4, p.radius * 1.2); ctx.fill();
            ctx.globalAlpha = 1.0;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.roundRect(-p.radius * 4, -p.radius * 0.5, p.radius * 6, p.radius * 1.0, p.radius * 0.5); ctx.fill();
        } else if (p.type === 'sonic_wave') {
            ctx.globalAlpha = 0.5;
            ctx.strokeStyle = p.color || '#00ffff';
            ctx.lineWidth = Math.max(6, p.radius * 0.6);
            ctx.lineCap = 'round';
            for(let i=0; i<4; i++) {
                ctx.globalAlpha = 0.9 - (i * 0.2);
                ctx.beginPath();
                ctx.arc(0, 0, (p.radius * 1.2) - (i * p.radius * 0.3), -Math.PI/2.2, Math.PI/2.2);
                ctx.stroke();
            }
        } else if (p.type === 'supernova_beam') {
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = p.color || '#ffaa00';
            ctx.beginPath(); ctx.moveTo(-p.radius * 8, 0); ctx.lineTo(0, -p.radius * 3.5); ctx.lineTo(p.radius * 4, 0); ctx.lineTo(0, p.radius * 3.5); ctx.closePath(); ctx.fill();
            ctx.globalAlpha = 0.6;
            ctx.beginPath(); ctx.moveTo(-p.radius * 5, 0); ctx.lineTo(0, -p.radius * 2.0); ctx.lineTo(p.radius * 2.5, 0); ctx.lineTo(0, p.radius * 2.0); ctx.closePath(); ctx.fill();
            ctx.globalAlpha = 1.0;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.moveTo(-p.radius * 2.5, 0); ctx.lineTo(0, -p.radius * 0.8); ctx.lineTo(p.radius * 1.2, 0); ctx.lineTo(0, p.radius * 0.8); ctx.closePath(); ctx.fill();
        } else if (p.type === 'shield_bubble' || p.type === 'burning_barrier') {
            ctx.globalAlpha = Math.min(1, p.life * 2);
            
            if (p.type === 'shield_bubble') {
                ctx.fillStyle = p.color || '#ffffff';
                ctx.globalAlpha = 0.05;
                ctx.beginPath(); ctx.arc(0, 0, Math.max(0.1, p.radius), 0, Math.PI*2); ctx.fill();
                
                ctx.globalAlpha = Math.min(1, p.life * 2) * 0.6;
                ctx.strokeStyle = p.color || '#ffffff';
                ctx.lineWidth = 4;
                ctx.beginPath(); ctx.arc(0, 0, Math.max(0.1, p.radius), 0, Math.PI*2); ctx.stroke();

                ctx.lineWidth = 2;
                ctx.setLineDash([15, 25]);
                ctx.lineDashOffset = -time * 30;
                ctx.beginPath(); ctx.arc(0, 0, Math.max(0.1, p.radius * 0.85), 0, Math.PI*2); ctx.stroke();
                ctx.setLineDash([]);
            } else {
                ctx.globalAlpha = Math.min(1, p.life * 2) * 0.5;
                ctx.fillStyle = '#ff4500';
                ctx.beginPath(); ctx.arc(0, 0, Math.max(0.1, p.radius * 1.1), 0, Math.PI*2); ctx.fill();
                
                ctx.globalAlpha = Math.min(1, p.life * 2) * 0.8;
                ctx.strokeStyle = '#ff8800';
                ctx.lineWidth = 3;
                ctx.beginPath();
                for (let i = 0; i < 12; i++) {
                    const angle = (Math.PI / 6) * i + time * 1.0;
                    const variance = i % 2 === 0 ? 1 : 0.9 + Math.sin(time * 5 + i) * 0.05;
                    const px = Math.cos(angle) * p.radius * variance;
                    const py = Math.sin(angle) * p.radius * variance;
                    if (i === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.closePath(); ctx.stroke();
            }
        } else if (p.type === 'buzzsaw') {
            ctx.rotate((p.rotation || time * 25) * (p.vx < 0 ? -1 : 1));
            
            ctx.globalAlpha = 0.4;
            ctx.fillStyle = p.color || '#c0c0c0';
            ctx.beginPath(); ctx.arc(0, 0, p.radius * 1.5, 0, Math.PI*2); ctx.fill();
            
            ctx.globalAlpha = 1.0;
            ctx.fillStyle = p.color || '#ffffff';
            ctx.beginPath();
            const spikes = p.weaponId === 'buzzsawSwarm' ? 12 : 8;
            for(let i=0; i<spikes*2; i++) {
                const a = (Math.PI*2/(spikes*2))*i;
                const r = i%2===0 ? p.radius * 1.2 : p.radius*0.8;
                if(i===0) ctx.moveTo(Math.cos(a)*r, Math.sin(a)*r);
                else ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r);
            }
            ctx.closePath(); ctx.fill();
            
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.arc(0, 0, p.radius*0.3, 0, Math.PI*2); ctx.fill();
        } else if (p.type === 'toxic_cloud') {
            const glowR = p.radius * 1.5;
            const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, glowR);
            grad.addColorStop(0, p.color || '#32cd32');
            grad.addColorStop(1, 'transparent');
            
            ctx.globalAlpha = Math.min(1, p.life * 2) * 0.6;
            ctx.fillStyle = grad;
            ctx.beginPath(); ctx.arc(0, 0, glowR, 0, Math.PI * 2); ctx.fill();
            
            ctx.globalAlpha = Math.min(1, p.life * 2) * 0.8;
            ctx.beginPath();
            for(let i=0; i<5; i++) {
                const cx = Math.cos(time * 2 + i) * p.radius * 0.4;
                const cy = Math.sin(time * 3 + i) * p.radius * 0.4;
                ctx.arc(cx, cy, p.radius * 0.6, 0, Math.PI * 2);
            }
            ctx.fill();
            
            ctx.fillStyle = '#ffffff';
            ctx.globalAlpha = Math.min(1, p.life * 2) * 0.3;
            ctx.beginPath(); ctx.arc(p.radius * 0.2, -p.radius * 0.2, p.radius * 0.4, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = Math.min(1, p.life * 2);
        } else if (p.type === 'aegis_matrix') {
            ctx.globalAlpha = Math.min(1, p.life * 2) * 0.8;
            ctx.strokeStyle = p.color || '#00ff88';
            ctx.lineWidth = 4;
            
            ctx.beginPath();
            for (let i = 0; i < 8; i++) {
                const angle = (Math.PI / 4) * i + time * 0.3;
                const px = Math.cos(angle) * p.radius;
                const py = Math.sin(angle) * p.radius;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath(); ctx.stroke();

            ctx.lineWidth = 2;
            ctx.beginPath();
            for (let i = 0; i < 8; i++) {
                const angle = (Math.PI / 4) * i - time * 0.5;
                const px = Math.cos(angle) * (p.radius * 0.7);
                const py = Math.sin(angle) * (p.radius * 0.7);
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath(); ctx.stroke();
            
            ctx.fillStyle = p.color;
            ctx.globalAlpha = 0.05;
            ctx.fill();
        } else if (p.type === 'napalm_pool' || p.type === 'flaming_lash_pool' || p.type === 'hellfire') {
            ctx.globalAlpha = Math.min(1, p.life * 2);
            const isHellfire = p.type === 'hellfire';
            const baseColor = p.color || (isHellfire ? '#00bfff' : '#ff4500');
            const innerColor = isHellfire ? '#ffffff' : '#ffaa00';
            
            const glowR = p.radius * 1.4;
            const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, glowR);
            grad.addColorStop(0, baseColor);
            grad.addColorStop(1, 'transparent');
            
            ctx.fillStyle = grad;
            ctx.globalAlpha = Math.min(1, p.life * 2) * 0.5;
            ctx.beginPath(); ctx.arc(0, 0, glowR, 0, Math.PI*2); ctx.fill();

            ctx.fillStyle = baseColor;
            ctx.globalAlpha = Math.min(1, p.life * 2) * 0.7;
            ctx.beginPath();
            for (let i = 0; i < 8; i++) {
                const angle = (Math.PI / 4) * i + time * 1.5;
                const fx = Math.cos(angle) * (p.radius * 0.8);
                const fy = Math.sin(angle) * (p.radius * 0.8);
                const size = p.radius * 0.5 + Math.sin(time * 5 + i) * p.radius * 0.2;
                ctx.arc(fx, fy, size, 0, Math.PI*2);
            }
            ctx.fill();
            
            ctx.fillStyle = innerColor;
            ctx.globalAlpha = Math.min(1, p.life * 2) * 0.4;
            ctx.beginPath(); ctx.arc(0, 0, p.radius * 0.7, 0, Math.PI*2); ctx.fill();
        } else if (p.type === 'nova_pulse' || p.type === 'laser_nova_pulse' || p.type === 'seismic_shockwave' || p.type === 'quantum_collapse') {
            ctx.strokeStyle = p.color || '#ff00ff';
            ctx.lineWidth = p.type === 'quantum_collapse' ? 12 : Math.max(5, 12 * p.life);
            ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 2)) * 0.8;
            
            if (p.type === 'quantum_collapse') {
                ctx.strokeStyle = '#8a2be2';
                ctx.beginPath(); ctx.arc(0, 0, Math.max(0.1, p.radius), 0, Math.PI*2); ctx.stroke();
                
                ctx.lineWidth = 6;
                ctx.strokeStyle = '#ffffff';
                ctx.beginPath();
                for(let i=0; i<8; i++) {
                    const a = (Math.PI/4)*i - time * 1.5;
                    const r = p.radius * 0.85;
                    if(i===0) ctx.moveTo(Math.cos(a)*r, Math.sin(a)*r);
                    else ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r);
                }
                ctx.closePath(); ctx.stroke();
            } else if (p.type === 'seismic_shockwave') {
                ctx.setLineDash([20, 15, 8, 15]);
                ctx.beginPath(); ctx.arc(0, 0, Math.max(0.1, p.radius), 0, Math.PI*2); ctx.stroke();
                ctx.setLineDash([]);
            } else {
                ctx.beginPath(); ctx.arc(0, 0, Math.max(0.1, p.radius), 0, Math.PI*2); ctx.stroke();
                const grad = ctx.createRadialGradient(0, 0, Math.max(0, p.radius - 20), 0, 0, p.radius);
                grad.addColorStop(0, 'transparent');
                grad.addColorStop(0.8, p.color);
                grad.addColorStop(1, 'transparent');
                ctx.fillStyle = grad;
                ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 2)) * 0.5;
                ctx.fill();
            }
        } else if (p.isAoe) {
            ctx.strokeStyle = p.color || '#00ffff';
            ctx.lineWidth = 6;
            ctx.globalAlpha = 0.6;
            ctx.beginPath(); ctx.arc(0, 0, p.radius, 0, Math.PI*2); ctx.stroke();
            const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, p.radius);
            grad.addColorStop(0, p.color || '#00ffff');
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.globalAlpha = 0.25;
            ctx.fill();
        } else {
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = p.color || '#00ffff';
            ctx.beginPath(); ctx.arc(0, 0, Math.max(0.1, p.radius * 2.2), 0, Math.PI*2); ctx.fill();
            ctx.globalAlpha = 0.7;
            ctx.beginPath(); ctx.arc(0, 0, Math.max(0.1, p.radius * 1.4), 0, Math.PI*2); ctx.fill();
            ctx.globalAlpha = 1.0;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.arc(0, 0, Math.max(0.1, p.radius * 0.6), 0, Math.PI*2); ctx.fill();
        }
        ctx.restore();
        p.radius = originalRadius;
        ctx.globalAlpha = 1.0;
    });
}