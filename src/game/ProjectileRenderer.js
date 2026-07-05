const glowCache = {};
// Quantize radius to 16px buckets so an expanding pulse (radius grows 500px/s)
// doesn't generate a fresh glow texture every frame. Without this, a single
// Nova Pulse / Laser Nova / Quantum Collapse pulse could cache ~30+ unique
// large canvases per shot, eventually OOM'ing the canvas allocator on mobile
// and crashing the run when the synergy fires (ReZuM bug 2026-05-18).
const RADIUS_QUANT = 16;
// Cap the cached texture size — pulses with high area stacking could allocate
// 2000×2000 canvases, which on mobile silently fails canvas creation and
// returns a broken context → drawImage throws and the run crashes.
const MAX_GLOW_SIZE = 512;
function getGlowTexture(color, radius) {
    if (radius <= 0) return null;
    const quantR = Math.max(RADIUS_QUANT, Math.round(radius / RADIUS_QUANT) * RADIUS_QUANT);
    const key = `${color}_${quantR}`;
    if (glowCache[key]) return glowCache[key];
    
    let size = Math.ceil(quantR * 2.5); // Provide enough padding for glow
    if (size <= 0) return null;
    if (size > MAX_GLOW_SIZE) size = MAX_GLOW_SIZE;

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null; // Mobile canvas allocation can silently fail
    
    const grad = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
    grad.addColorStop(0, color);
    grad.addColorStop(0.2, color);
    grad.addColorStop(1, 'transparent');
    
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(size/2, size/2, size/2, 0, Math.PI * 2);
    ctx.fill();
    
    glowCache[key] = canvas;
    return canvas;
}

export function drawProjectiles(ctx, projectiles, particleManager, time, camX, camY, vWidth, vHeight) {
    ctx.globalCompositeOperation = 'screen';
    const texStar = particleManager?.textures?.star;
    const texSlash = particleManager?.textures?.slash;
    const texShockwave = particleManager?.textures?.shockwave;
    const texSmoke = particleManager?.textures?.smoke;

    projectiles.forEach(p => {
        // Decouple visual radius from damage radius. AoE weapons with S6 visual caps
        // set `p.visualRadius` (separate from `p.radius` damage hitbox) so the drawn
        // bubble stays readable while area upgrades continue to expand the actual AoE.
        // Non-AoE projectiles never set visualRadius and render at full damage radius.
        const originalRadius = p.radius;
        const hasVisualCap = p.visualRadius != null && p.visualRadius < p.radius;
        if (hasVisualCap) {
            // Faint outline ring showing the TRUE damage radius — so players can see
            // their area upgrades are actually working even when the drawn bubble is
            // capped for readability (Texxy feedback 2026-05-18).
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            ctx.globalAlpha = 0.25;
            ctx.strokeStyle = p.color || '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([6, 10]);
            ctx.lineDashOffset = -time * 20;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
            p.radius = p.visualRadius;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        if (p.vx || p.vy) {
            ctx.rotate(Math.atan2(p.vy, p.vx));
        }
        
        const isElongated = p.type === 'beam' || p.type === 'dual_laser' || p.type === 'supernova_beam' || p.type === 'missile' || p.type === 'railgun' || p.type === 'blaster_shot';

        // High Quality Glowing Aura (Pre-rendered).
        // Skip for buzzsaw blades — at high area stacking, multiple blades each with
        // a 3× radius aura whited out the entire screen (Anubis bug 2026-05-14).
        // The blades' own spike rendering + white core already give them plenty of
        // visual punch without the additive halo.
        if (!p.isAoe && p.type !== 'buzzsaw') {
            ctx.globalCompositeOperation = 'lighter';
            const auraRadius = Math.max(0.1, p.radius * 3);
            
            ctx.globalAlpha = 0.4; // Boosted aura alpha
            
            if (isElongated) {
                // For elongated, we scale the pre-rendered circle
                const glow = getGlowTexture(p.color || '#ffffff', auraRadius);
                if (glow) {
                    ctx.save();
                    ctx.scale(1.2, 0.6);
                    ctx.drawImage(glow, -glow.width/2, -glow.height/2);
                    ctx.restore();
                }
                
                // Tail (Pre-rendered or simple shape)
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
                const glow = getGlowTexture(p.color || '#ffffff', auraRadius);
                if (glow) {
                    ctx.drawImage(glow, -glow.width/2, -glow.height/2);
                }
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
            // Pre-rendered glow approach for blade_swing
            const glow = getGlowTexture(p.color, p.radius * 1.5);
            if (glow) {
                ctx.globalAlpha = ctx.globalAlpha * 0.5;
                ctx.drawImage(glow, p.radius*0.4 - glow.width/2, -glow.height/2);
                ctx.globalAlpha = ctx.globalAlpha * 2;
            }
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(p.radius * 0.8, -p.radius * 0.2, p.radius * 0.8, 0); ctx.quadraticCurveTo(p.radius * 0.8, p.radius * 0.2, 0, 0); ctx.fill();
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
            const pathPoints = [
                {x: -p.radius * 1.5, y: 0},
                {x: -p.radius*0.5, y: (Math.random()-0.5)*p.radius*1.5},
                {x: p.radius*0.5, y: (Math.random()-0.5)*p.radius*1.5},
                {x: p.radius * 1.5, y: 0}
            ];
            
            // Draw glow instead of shadowBlur
            const glow = getGlowTexture(p.color || '#00aaff', p.radius * 2);
            if (glow) {
                ctx.globalAlpha = 0.6;
                pathPoints.forEach(pt => ctx.drawImage(glow, pt.x - glow.width/2, pt.y - glow.height/2));
                ctx.globalAlpha = 1.0;
            }
            
            ctx.lineWidth = Math.max(2, p.radius * 0.4);
            ctx.beginPath();
            ctx.moveTo(pathPoints[0].x, pathPoints[0].y);
            ctx.lineTo(pathPoints[1].x, pathPoints[1].y);
            ctx.lineTo(pathPoints[2].x, pathPoints[2].y);
            ctx.lineTo(pathPoints[3].x, pathPoints[3].y);
            ctx.stroke();
            ctx.strokeStyle = p.color || '#00aaff';
            ctx.lineWidth = Math.max(1, p.radius * 0.8);
            ctx.stroke();
            ctx.globalCompositeOperation = 'screen';
        } else if (p.type === 'glitch_slash') {
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = '#ffffff'; 
            const glow = getGlowTexture(p.color || '#00ff00', p.radius * 2);
            if (glow) {
                ctx.globalAlpha = 0.7;
                ctx.save();
                ctx.scale(2, 0.5);
                ctx.drawImage(glow, -glow.width/2, -glow.height/2);
                ctx.restore();
                ctx.globalAlpha = 1.0;
            }
            ctx.beginPath(); ctx.ellipse(0, 0, p.radius * 2, p.radius*0.4, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = p.color || '#00ff00';
            for(let i=0; i<3; i++) {
                ctx.fillRect((Math.random()-0.5)*p.radius*3, (Math.random()-0.5)*p.radius, p.radius*0.8, p.radius*0.2);
            }
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
                // Shield Bubble: Rotating dashed ring with minimal center fill.
                // Outline alpha 0.8→0.4 + dash speed 50→20 — Texxy flagged the
                // mastered (yellow #ffd700) bubble as bright/flickering and unsafe
                // for epileptic players when multiple bubbles overlap (additive
                // `screen` blend stacks alpha into near-white strobing).
                ctx.beginPath();
                ctx.arc(0, 0, Math.max(0.1, p.radius), 0, Math.PI*2);
                ctx.fill();
                
                ctx.globalAlpha = Math.min(1, p.life * 2) * 0.4;
                ctx.strokeStyle = p.color;
                ctx.lineWidth = 2;
                ctx.setLineDash([15, 20]);
                ctx.lineDashOffset = -time * 20;
                ctx.beginPath();
                ctx.arc(0, 0, Math.max(0.1, p.radius), 0, Math.PI*2);
                ctx.stroke();
                ctx.setLineDash([]);

                // Defined shape outline — Mustard 2026-07-05 reported bubble was
                // "invisible" on dark cosmic backgrounds (esp. NeonVortex whose
                // areaMult 0.7× shrinks the ring to ~56px at Lv1). The screen-
                // blended dashed ring above disappears against purple nebulae.
                // Fix: a thin source-over solid outline is always visible
                // regardless of background, but stays non-strobing (single-pass
                // source-over doesn't compound when bubbles overlap, unlike the
                // additive layers). Alpha capped modest so it doesn't reintroduce
                // the epilepsy issue.
                ctx.globalCompositeOperation = 'source-over';
                ctx.globalAlpha = Math.min(1, p.life * 2) * 0.75;
                ctx.strokeStyle = p.color;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(0, 0, Math.max(0.1, p.radius), 0, Math.PI*2);
                ctx.stroke();
                ctx.globalCompositeOperation = 'screen';
            } else {
                // Burning Barrier: Hexagon shape so it's instantly distinct from circles.
                // Outline alpha 0.9→0.5 + dash speed 60→25 — same epilepsy-safety
                // pass as shield_bubble (Texxy 2026-05-20).
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

                ctx.globalAlpha = Math.min(1, p.life * 2) * 0.5;
                ctx.strokeStyle = p.color;
                ctx.lineWidth = 3;
                ctx.setLineDash([20, 10]);
                ctx.lineDashOffset = time * 25;
                ctx.stroke();
                ctx.setLineDash([]);
            }
            ctx.globalAlpha = 1.0;
        } else if (p.type === 'buzzsaw') {
            // Rotation speed cut 15 → 6 (2026-06-05, Anubis video). At 15 rad/s
            // × 7 overlapping swarm blades the spike edges created a flickering
            // moiré pattern that strained the eyes. 6 rad/s still reads as
            // "spinning fast" without the strobe.
            ctx.rotate((p.rotation || time * 6) * (p.vx < 0 ? -1 : 1));
            // Use source-over (normal blending) for the blade body so overlapping
            // saws don't stack additively to pure white (Texxy bug 2026-05-14 —
            // 11 saws on screen looked like a stream of bright shurikens).
            // Chrome body + dark outline gives a readable metallic silhouette;
            // the white core is kept tiny + additive for a single hot highlight.
            ctx.globalCompositeOperation = 'source-over';
            // Swarm variant: 10 → 8 spikes (matches base blade). 10 spikes at
            // high rotation produced the moiré flicker reported on the swarm.
            const spikes = 8;
            ctx.beginPath();
            for (let i = 0; i < spikes * 2; i++) {
                const a = (Math.PI * 2 / (spikes * 2)) * i;
                const r = i % 2 === 0 ? p.radius : p.radius * 0.55;
                if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
                else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
            }
            ctx.closePath();
            ctx.fillStyle = p.weaponId === 'buzzsawSwarm' ? '#b8bcc4' : '#8a8e96';
            ctx.fill();
            ctx.strokeStyle = '#2a2d33';
            ctx.lineWidth = Math.max(1.5, p.radius * 0.08);
            ctx.stroke();
            // Inner hub ring
            ctx.fillStyle = '#3a3d44';
            ctx.beginPath(); ctx.arc(0, 0, p.radius * 0.35, 0, Math.PI * 2); ctx.fill();
            // Single small additive highlight — alpha 0.7 → 0.35 so overlapping
            // swarm blades don't compound into the eye-straining bright pulse.
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = '#ffffff';
            ctx.globalAlpha = 0.35;
            ctx.beginPath(); ctx.arc(0, 0, p.radius * 0.15, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 1.0;
            ctx.globalCompositeOperation = 'screen';
        } else if (p.type === 'toxic_cloud') {
            ctx.globalCompositeOperation = 'source-over';
            
            // Fade in and fade out
            const alpha = Math.min(1, p.life) * 0.35;
            ctx.globalAlpha = alpha;
            
            if (texSmoke && texSmoke.isReady) {
                const tintedSmoke = particleManager.getTintedTexture(texSmoke, p.color);
                const drawTex = (tintedSmoke && tintedSmoke.isReady) ? tintedSmoke : texSmoke;
                
                for(let i=0; i<3; i++) {
                    ctx.save();
                    const rot = time * (0.3 + i * 0.15) * (i % 2 === 0 ? 1 : -1) + p.x;
                    ctx.rotate(rot);
                    const scale = 1.1 + Math.sin(time * 1.5 + i) * 0.15;
                    const r = p.radius * scale;
                    
                    ctx.drawImage(drawTex, -r, -r, r * 2, r * 2);
                    ctx.restore();
                }
            } else {
                ctx.fillStyle = p.color;
                for (let i = 0; i < 3; i++) {
                    ctx.beginPath();
                    ctx.arc(
                        Math.cos(time + i) * p.radius * 0.2, 
                        Math.sin(time + i) * p.radius * 0.2, 
                        p.radius * 0.8, 0, Math.PI*2
                    );
                    ctx.fill();
                }
            }
            
            // Soft boundary
            ctx.globalAlpha = alpha * 1.2;
            ctx.strokeStyle = p.color;
            ctx.lineWidth = 2;
            ctx.setLineDash([15, 20]);
            ctx.lineDashOffset = -time * 15;
            ctx.beginPath(); ctx.arc(0, 0, p.radius * 0.95, 0, Math.PI*2); ctx.stroke();
            ctx.setLineDash([]);
            
            ctx.globalAlpha = 1.0;
        } else if (p.type === 'aegis_matrix') {
            // Outline alpha 0.8→0.5 + rotation speeds halved — Texxy flagged the
            // gold (#ffd700) bubble as too bright/strobing on `screen` blend when
            // multiple matrices overlap. Calmer rotation + lower alpha = epilepsy-safer.
            ctx.globalCompositeOperation = 'screen';
            ctx.globalAlpha = 0.05; // Faint background
            ctx.fillStyle = p.color || '#00ff88';
            ctx.beginPath();
            ctx.arc(0, 0, p.radius, 0, Math.PI*2);
            ctx.fill();
            
            ctx.globalAlpha = 0.5;
            ctx.strokeStyle = p.color || '#00ff88';
            ctx.lineWidth = 2;
            
            // Aegis Matrix: Dual rotating octagons (geometric tech pattern)
            ctx.beginPath();
            for (let i = 0; i < 8; i++) {
                const angle = (Math.PI / 4) * i + time * 0.25;
                const px = Math.cos(angle) * p.radius;
                const py = Math.sin(angle) * p.radius;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.stroke();

            ctx.beginPath();
            for (let i = 0; i < 8; i++) {
                const angle = (Math.PI / 4) * i - time * 0.4;
                const px = Math.cos(angle) * (p.radius - 15);
                const py = Math.sin(angle) * (p.radius - 15);
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.stroke();
            ctx.globalAlpha = 1.0;
        } else if (p.type === 'napalm_pool' || p.type === 'flaming_lash_pool' || p.type === 'hellfire') {
            ctx.globalCompositeOperation = 'source-over';
            
            const alpha = Math.min(1, p.life) * (p.type === 'hellfire' ? 0.4 : 0.3);
            ctx.globalAlpha = alpha;
            
            if (texSmoke && texSmoke.isReady) {
                const tintedSmoke = particleManager.getTintedTexture(texSmoke, p.color);
                const drawTex = (tintedSmoke && tintedSmoke.isReady) ? tintedSmoke : texSmoke;
                
                for(let i=0; i<2; i++) {
                    ctx.save();
                    const rot = time * (0.5 + i * 0.2) * (i % 2 === 0 ? 1 : -1) + p.x;
                    ctx.rotate(rot);
                    const scale = 1.0 + Math.sin(time * 2 + i) * 0.1;
                    const r = p.radius * scale;
                    
                    ctx.drawImage(drawTex, -r, -r, r * 2, r * 2);
                    ctx.restore();
                }
            } else {
                ctx.fillStyle = p.color || '#ffffff';
                ctx.beginPath();
                ctx.arc(0, 0, Math.max(0.1, p.radius), 0, Math.PI*2);
                ctx.fill();
            }
            
            ctx.globalAlpha = alpha * 1.5;
            ctx.strokeStyle = p.color;
            ctx.lineWidth = p.type === 'hellfire' ? 3 : 2;
            
            // Segmented ring instead of a solid blob
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
            ctx.lineWidth = p.type === 'quantum_collapse' ? 4 : Math.max(3, 8 * p.life);
            ctx.globalAlpha = Math.max(0.2, Math.min(1, p.life * 3));
            
            if (p.type === 'nova_pulse' || p.type === 'laser_nova_pulse') {
                const glow = getGlowTexture(p.color || '#ff00ff', p.radius * 1.2);
                if (glow) {
                    ctx.globalAlpha = ctx.globalAlpha * 0.4;
                    ctx.drawImage(glow, -glow.width/2, -glow.height/2);
                    ctx.globalAlpha = ctx.globalAlpha / 0.4;
                }
            }
            
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
            
            // Draw glow instead of shadowBlur
            const glow = getGlowTexture(p.color || '#00ffff', p.radius * 1.5);
            if (glow) {
                ctx.globalAlpha = 0.5;
                ctx.drawImage(glow, -glow.width/2, -glow.height/2);
                ctx.globalAlpha = 1.0;
            }
            
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, p.radius, 0, Math.PI*2);
            ctx.stroke();
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