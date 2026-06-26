// Cosmetic VFX renderer — encapsulates the "persistent aura" pass that draws
// before the trail particles each frame. The aura solves the in-run visibility
// problem: trail particles get washed out against enemy explosions / AoE pools,
// but a soft coloured ring locked to the player is ALWAYS legible.
//
// Each trail id maps to an aura config { colors, ringCount, pulseHz, blend }.
// Mythic trails ('weapon_trail_void' / '_solar' / '_eclipse') get richer multi-
// stop gradients so the chest-tier items feel distinctly premium.
//
// Called from GameEngineDraw.js right before the 'trail' particle layer, and
// from CosmeticPreview so the wardrobe shows the same effect.

const TRAIL_AURAS = {
    fire:    { colors: ['#ff7700', '#ff2200'], baseRadius: 1.9, ringCount: 2, pulseHz: 4.0, alpha: 0.55 },
    ice:     { colors: ['#aaf0ff', '#0099cc'], baseRadius: 2.0, ringCount: 2, pulseHz: 2.2, alpha: 0.50 },
    void:    { colors: ['#cc00ff', '#3a0066'], baseRadius: 2.1, ringCount: 2, pulseHz: 1.8, alpha: 0.55 },
    toxic:   { colors: ['#aaff00', '#22aa22'], baseRadius: 2.0, ringCount: 2, pulseHz: 3.0, alpha: 0.50 },
    gold:    { colors: ['#fff4a0', '#ffaa00'], baseRadius: 2.0, ringCount: 3, pulseHz: 2.5, alpha: 0.65 },
    plasma:  { colors: ['#00e5ff', '#ff00e5'], baseRadius: 2.0, ringCount: 2, pulseHz: 5.0, alpha: 0.55 },
    shadow:  { colors: ['#222244', '#000000'], baseRadius: 2.2, ringCount: 2, pulseHz: 1.5, alpha: 0.55 },
    blood:   { colors: ['#ff0000', '#5c0000'], baseRadius: 1.9, ringCount: 2, pulseHz: 3.5, alpha: 0.55 },
    pixel:   { colors: ['#00ffcc', '#ff00ff'], baseRadius: 1.9, ringCount: 2, pulseHz: 6.0, alpha: 0.50 },
    nebula:  { colors: ['#ff99cc', '#99ccff'], baseRadius: 2.1, ringCount: 2, pulseHz: 2.0, alpha: 0.55 },
    rainbow: { colors: ['#ff0000', '#00ff00', '#0088ff'], baseRadius: 2.1, ringCount: 3, pulseHz: 2.5, alpha: 0.60 },

    // Mythic chest trails — premium feel: 3 rings, deeper saturation, richer pulse.
    weapon_trail_void:    { colors: ['#ffd700', '#8a2be2', '#1a0033'], baseRadius: 2.4, ringCount: 3, pulseHz: 1.8, alpha: 0.70 },
    weapon_trail_solar:   { colors: ['#ffffff', '#ffaa00', '#ff2200'], baseRadius: 2.4, ringCount: 3, pulseHz: 3.0, alpha: 0.75 },
    weapon_trail_eclipse: { colors: ['#ffffff', '#222244', '#000000'], baseRadius: 2.4, ringCount: 3, pulseHz: 2.0, alpha: 0.70 },
};

// Draw the trail aura around the player. Cheap: 2-3 radial gradients per frame.
// Uses 'lighter' blend so it pops over enemies but doesn't clip the player sprite.
export function drawTrailAura(ctx, x, y, baseRadius, trailId, time) {
    if (!trailId || trailId === 'default') return;
    const cfg = TRAIL_AURAS[trailId];
    if (!cfg) return;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    const pulse = 0.85 + Math.sin(time * cfg.pulseHz) * 0.15;
    for (let i = 0; i < cfg.ringCount; i++) {
        const colorIdx = i % cfg.colors.length;
        const color = cfg.colors[colorIdx];
        const r = baseRadius * cfg.baseRadius * (1 + i * 0.35) * pulse;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
        // Hex → rgba helper inline (avoid extra parsing dependency).
        const rgba = hexToRgba(color, cfg.alpha * (1 - i * 0.35));
        grad.addColorStop(0, rgba);
        grad.addColorStop(0.5, hexToRgba(color, cfg.alpha * 0.4 * (1 - i * 0.35)));
        grad.addColorStop(1, hexToRgba(color, 0));
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}

function hexToRgba(hex, alpha) {
    const h = hex.replace('#', '');
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
}

export function hasAura(trailId) {
    return !!TRAIL_AURAS[trailId];
}