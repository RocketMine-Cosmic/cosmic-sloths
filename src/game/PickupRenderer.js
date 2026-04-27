export function drawPickups(ctx, pickups, time) {
    const sorted = [...pickups].sort((a, b) => {
        const order = { gold: 0, reroll: 1, xp: 2 };
        return (order[a.type] ?? 1) - (order[b.type] ?? 1);
    });
    sorted.forEach(p => {
        ctx.save();
        ctx.translate(p.x, p.y);
        
        if (p.type === 'xp') {
            // Scale XP gem by its value: small (<5), medium (5-19), large (20+).
            // Larger gems get a brighter inner color, an outer ring, and a subtle pulse.
            const v = p.value || 1;
            const tier = v >= 20 ? 2 : v >= 5 ? 1 : 0;
            const sizes = [0.7, 1.0, 1.35][tier];
            const glowR = [18, 24, 34][tier];
            const innerColors = ['#ccffff', '#aaffff', '#ffffff'][tier];
            const outerColors = ['#ffffff', '#ffffff', '#ffffaa'][tier];
            const pulse = tier === 2 ? 1 + Math.sin(time * 6) * 0.08 : 1;
            ctx.rotate(time * 2);
            ctx.scale(sizes * pulse, sizes * pulse);

            ctx.globalCompositeOperation = 'screen';
            const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, glowR);
            grad.addColorStop(0, p.color);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, glowR, 0, Math.PI * 2);
            ctx.fill();

            // Outer ring for big gems
            if (tier === 2) {
                ctx.strokeStyle = '#aaffff';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(0, 0, 18, 0, Math.PI * 2);
                ctx.stroke();
            }

            ctx.globalCompositeOperation = 'source-over';

            ctx.fillStyle = outerColors;
            ctx.beginPath();
            ctx.moveTo(0, -14);
            ctx.lineTo(7, 0);
            ctx.lineTo(0, 14);
            ctx.lineTo(-7, 0);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = innerColors;
            ctx.beginPath();
            ctx.moveTo(0, -7);
            ctx.lineTo(3.5, 0);
            ctx.lineTo(0, 7);
            ctx.lineTo(-3.5, 0);
            ctx.closePath();
            ctx.fill();

        } else if (p.type === 'gold') {
            // Scale gold by value: small (<10), medium (10-49), large (50+).
            // Big stacks get a wider glow, rotating sparkle, and slight pulse.
            const v = p.value || 1;
            const tier = v >= 50 ? 2 : v >= 10 ? 1 : 0;
            const scale = [0.7, 1.0, 1.35][tier];
            const glowR = [22, 28, 38][tier];
            const glowAlpha = [0.45, 0.6, 0.85][tier];
            const outerColor = ['#cc8800', '#ffaa00', '#ffd700'][tier];
            const innerColor = ['#ffaa00', '#ffe100', '#fff685'][tier];
            const pulse = tier === 2 ? 1 + Math.sin(time * 5) * 0.06 : 1;
            const bounce = Math.sin(time * 6 + p.x) * 4;
            ctx.translate(0, bounce);
            ctx.rotate(Math.sin(time * 3 + p.y) * 0.3);
            ctx.scale(scale * pulse, scale * pulse);

            ctx.globalCompositeOperation = 'screen';
            const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, glowR);
            grad.addColorStop(0, `rgba(255, 215, 0, ${glowAlpha})`);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, glowR, 0, Math.PI * 2);
            ctx.fill();

            ctx.globalCompositeOperation = 'source-over';

            ctx.fillStyle = outerColor;
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const a = (Math.PI / 3) * i + Math.PI/2;
                ctx.lineTo(Math.cos(a) * 14, Math.sin(a) * 14);
            }
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = innerColor;
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const a = (Math.PI / 3) * i + Math.PI/2;
                ctx.lineTo(Math.cos(a) * 10.5, Math.sin(a) * 10.5);
            }
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.beginPath();
            ctx.moveTo(-5, -7);
            ctx.lineTo(2, -7);
            ctx.lineTo(-2, 7);
            ctx.lineTo(-9, 7);
            ctx.closePath();
            ctx.fill();

            // Rotating sparkle on large stacks
            if (tier === 2) {
                ctx.save();
                ctx.rotate(time * 2);
                ctx.fillStyle = '#ffffff';
                for (let i = 0; i < 4; i++) {
                    const a = (Math.PI / 2) * i;
                    const x = Math.cos(a) * 15;
                    const y = Math.sin(a) * 15;
                    ctx.beginPath();
                    ctx.arc(x, y, 1.5, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();
            }
            
        } else if (p.type === 'fragment') {
            const bounce = Math.sin(time * 5 + p.x) * 3;
            ctx.translate(0, bounce);
            ctx.rotate(time * 1.5);

            // Outer purple glow
            ctx.globalCompositeOperation = 'screen';
            const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 30);
            grad.addColorStop(0, 'rgba(168, 85, 247, 0.7)');
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, 30, 0, Math.PI * 2);
            ctx.fill();

            ctx.globalCompositeOperation = 'source-over';

            // Crystal shard shape (diamond)
            ctx.fillStyle = '#a855f7';
            ctx.beginPath();
            ctx.moveTo(0, -14);
            ctx.lineTo(10, -2);
            ctx.lineTo(7, 14);
            ctx.lineTo(-7, 14);
            ctx.lineTo(-10, -2);
            ctx.closePath();
            ctx.fill();

            // Inner highlight
            ctx.fillStyle = '#d8b4fe';
            ctx.beginPath();
            ctx.moveTo(0, -10);
            ctx.lineTo(5, -1);
            ctx.lineTo(0, 8);
            ctx.lineTo(-5, -1);
            ctx.closePath();
            ctx.fill();

            // Sparkle
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(-3, -6, 1.5, 0, Math.PI * 2);
            ctx.fill();

        } else if (p.type === 'reroll') {
            const bounce = Math.sin(time * 6 + p.x) * 4;
            ctx.translate(0, bounce);
            ctx.rotate(Math.sin(time * 3 + p.y) * 0.3);
            
            ctx.globalCompositeOperation = 'screen';
            const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 28);
            grad.addColorStop(0, 'rgba(255, 0, 255, 0.6)');
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, 28, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = '#ff00ff';
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                const a = (Math.PI * 2 / 5) * i - Math.PI/2;
                ctx.lineTo(Math.cos(a) * 14, Math.sin(a) * 14);
            }
            ctx.closePath();
            ctx.fill();
            
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('R', 0, 1);
            
        } else if (p.type === 'nuke') {
            const bounce = Math.sin(time * 6 + p.x) * 4;
            ctx.translate(0, bounce);

            // Red danger glow
            ctx.globalCompositeOperation = 'screen';
            const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 32);
            grad.addColorStop(0, 'rgba(255, 50, 50, 0.8)');
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, 32, 0, Math.PI * 2);
            ctx.fill();

            ctx.globalCompositeOperation = 'source-over';

            // Pulsing outer ring
            const pulse = 1 + Math.sin(time * 8) * 0.15;
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, 16 * pulse, 0, Math.PI * 2);
            ctx.stroke();

            // Yellow warning disc
            ctx.fillStyle = '#ffeb00';
            ctx.beginPath();
            ctx.arc(0, 0, 13, 0, Math.PI * 2);
            ctx.fill();

            // Black radiation trefoil
            ctx.fillStyle = '#000000';
            // Center dot
            ctx.beginPath();
            ctx.arc(0, 0, 3, 0, Math.PI * 2);
            ctx.fill();
            // 3 blades
            for (let i = 0; i < 3; i++) {
                const a = (Math.PI * 2 / 3) * i - Math.PI / 2;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.arc(0, 0, 11, a - 0.5, a + 0.5);
                ctx.closePath();
                ctx.fill();
            }

        } else if (p.type === 'magnet_power') {
            const bounce = Math.sin(time * 6 + p.x) * 4;
            ctx.translate(0, bounce);

            ctx.globalCompositeOperation = 'screen';
            const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 30);
            grad.addColorStop(0, 'rgba(80, 130, 255, 0.7)');
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, 30, 0, Math.PI * 2);
            ctx.fill();

            ctx.globalCompositeOperation = 'source-over';

            // Horseshoe magnet — red top, blue bottom
            ctx.lineWidth = 5;
            ctx.lineCap = 'butt';
            ctx.strokeStyle = '#dc2626';
            ctx.beginPath();
            ctx.arc(0, 2, 9, Math.PI, Math.PI * 1.5);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(0, 2, 9, Math.PI * 1.5, 0);
            ctx.stroke();

            ctx.strokeStyle = '#2563eb';
            ctx.lineWidth = 5;
            // Pole tips
            ctx.beginPath();
            ctx.moveTo(-9, 2); ctx.lineTo(-9, 10);
            ctx.moveTo(9, 2); ctx.lineTo(9, 10);
            ctx.stroke();

        } else if (p.type === 'shield_power') {
            const bounce = Math.sin(time * 6 + p.x) * 4;
            ctx.translate(0, bounce);

            ctx.globalCompositeOperation = 'screen';
            const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 30);
            grad.addColorStop(0, 'rgba(255, 230, 80, 0.7)');
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, 30, 0, Math.PI * 2);
            ctx.fill();

            ctx.globalCompositeOperation = 'source-over';

            // Shield shape
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath();
            ctx.moveTo(0, -13);
            ctx.lineTo(11, -8);
            ctx.lineTo(11, 4);
            ctx.quadraticCurveTo(11, 12, 0, 14);
            ctx.quadraticCurveTo(-11, 12, -11, 4);
            ctx.lineTo(-11, -8);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = '#fef3c7';
            ctx.beginPath();
            ctx.moveTo(0, -9);
            ctx.lineTo(7, -5);
            ctx.lineTo(7, 3);
            ctx.quadraticCurveTo(7, 8, 0, 10);
            ctx.quadraticCurveTo(-7, 8, -7, 3);
            ctx.lineTo(-7, -5);
            ctx.closePath();
            ctx.fill();

        } else if (p.icon) {
            ctx.font = '42px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // Pre-rendered glow behind icon
            ctx.globalCompositeOperation = 'screen';
            const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 30);
            grad.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, 30, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalCompositeOperation = 'source-over';

            ctx.fillText(p.icon, 0, 0);
        } else {
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.rect(-7, -7, 14, 14);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();
    });
}