import React from 'react';

// Procedurally-drawn SVG sigils for the standard pilot icons.
//
// We render at viewBox 0 0 100 100 so callers can size with width/height
// and scale freely without losing crispness. All shapes are inline strokes /
// gradients — no fonts, no emoji — for a premium "concept art" feel that
// holds up next to the chest-tier generated art.
//
// Each sigil receives a `color` prop matching the medallion's accent rim so
// the icon and frame read as one piece.

const baseProps = {
    viewBox: '0 0 100 100',
    xmlns: 'http://www.w3.org/2000/svg',
    fill: 'none',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
};

// ── Astral Sigil (gold) — radiant 8-point star with inner hex core ──────────
const SigilAstral = ({ color }) => (
    <svg {...baseProps}>
        <defs>
            <radialGradient id="astral-core" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={color} stopOpacity="0.95" />
                <stop offset="60%" stopColor={color} stopOpacity="0.45" />
                <stop offset="100%" stopColor={color} stopOpacity="0" />
            </radialGradient>
        </defs>
        {/* Soft halo */}
        <circle cx="50" cy="50" r="32" fill="url(#astral-core)" />
        {/* 8 radiant beams */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map(a => (
            <line key={a} x1="50" y1="50" x2="50" y2="14"
                stroke={color} strokeWidth="2" opacity="0.9"
                transform={`rotate(${a} 50 50)`} />
        ))}
        {/* Inner hex core */}
        <polygon points="50,32 65,41 65,59 50,68 35,59 35,41"
            stroke={color} strokeWidth="2.5" fill="rgba(15,23,42,0.6)" />
        <circle cx="50" cy="50" r="4" fill={color} />
    </svg>
);

// ── Prism Core (cyan) — diamond prism with orbital ring ─────────────────────
const SigilPrism = ({ color }) => (
    <svg {...baseProps}>
        <defs>
            <linearGradient id="prism-face" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={color} stopOpacity="0.85" />
                <stop offset="100%" stopColor={color} stopOpacity="0.25" />
            </linearGradient>
        </defs>
        {/* Orbital ellipse */}
        <ellipse cx="50" cy="50" rx="38" ry="14" stroke={color} strokeWidth="1.5" opacity="0.55" />
        {/* Diamond prism — two triangles meeting at the waist */}
        <polygon points="50,18 72,50 50,82 28,50" stroke={color} strokeWidth="2.5" fill="url(#prism-face)" />
        {/* Waist line + facet */}
        <line x1="28" y1="50" x2="72" y2="50" stroke={color} strokeWidth="1.5" opacity="0.7" />
        <line x1="50" y1="18" x2="50" y2="82" stroke={color} strokeWidth="1" opacity="0.5" strokeDasharray="2 3" />
        {/* Center spark */}
        <circle cx="50" cy="50" r="3" fill={color} />
    </svg>
);

// ── Comet (blue) — angled comet head with swept trail ───────────────────────
const SigilComet = ({ color }) => (
    <svg {...baseProps}>
        <defs>
            <linearGradient id="comet-trail" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={color} stopOpacity="0.9" />
                <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
        </defs>
        {/* Swept trail */}
        <path d="M 70 30 Q 45 45 22 80" stroke="url(#comet-trail)" strokeWidth="10" opacity="0.55" />
        <path d="M 70 30 Q 50 42 30 72" stroke="url(#comet-trail)" strokeWidth="5" opacity="0.8" />
        {/* Comet head + halo */}
        <circle cx="70" cy="30" r="14" fill={color} opacity="0.25" />
        <circle cx="70" cy="30" r="8" fill={color} />
        <circle cx="68" cy="28" r="2.5" fill="rgba(255,255,255,0.9)" />
        {/* Small trailing sparks */}
        <circle cx="40" cy="55" r="1.5" fill={color} opacity="0.8" />
        <circle cx="28" cy="70" r="1" fill={color} opacity="0.6" />
    </svg>
);

// ── Crimson Eye (pink/red) — vertical eye sigil with cross-hatch crown ──────
const SigilEye = ({ color }) => (
    <svg {...baseProps}>
        <defs>
            <radialGradient id="eye-iris" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.9)" />
                <stop offset="40%" stopColor={color} />
                <stop offset="100%" stopColor="rgba(15,23,42,0.9)" />
            </radialGradient>
        </defs>
        {/* Almond eye shape */}
        <path d="M 20 50 Q 50 22 80 50 Q 50 78 20 50 Z"
            stroke={color} strokeWidth="2.5" fill="rgba(15,23,42,0.85)" />
        {/* Iris */}
        <circle cx="50" cy="50" r="14" fill="url(#eye-iris)" />
        <circle cx="50" cy="50" r="5" fill="rgba(15,23,42,0.95)" />
        <circle cx="48" cy="48" r="1.8" fill="rgba(255,255,255,0.9)" />
        {/* Top + bottom crown ticks */}
        {[-20, -10, 0, 10, 20].map(dx => (
            <line key={`t${dx}`} x1={50 + dx} y1="22" x2={50 + dx * 0.7} y2="14"
                stroke={color} strokeWidth="1.5" opacity="0.75" />
        ))}
    </svg>
);

// ── Void Mark (violet) — pentagonal sigil with inner glyph ──────────────────
const SigilVoid = ({ color }) => (
    <svg {...baseProps}>
        <defs>
            <radialGradient id="void-fill" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={color} stopOpacity="0.35" />
                <stop offset="100%" stopColor="rgba(15,23,42,0)" />
            </radialGradient>
        </defs>
        {/* Outer pentagon */}
        <polygon points="50,16 82,38 70,76 30,76 18,38"
            stroke={color} strokeWidth="2.5" fill="url(#void-fill)" />
        {/* Inner pentagon (inverted) */}
        <polygon points="50,32 68,44 61,66 39,66 32,44"
            stroke={color} strokeWidth="1.5" fill="none" opacity="0.7" />
        {/* Central rune — downward chevron + dot */}
        <path d="M 42 44 L 50 56 L 58 44" stroke={color} strokeWidth="2.5" />
        <circle cx="50" cy="62" r="2.5" fill={color} />
        {/* Corner pip accents */}
        {[[50,16],[82,38],[70,76],[30,76],[18,38]].map(([x,y],i) => (
            <circle key={i} cx={x} cy={y} r="2" fill={color} />
        ))}
    </svg>
);

const SIGIL_MAP = {
    std_icon_spinning_star:   SigilAstral,
    std_icon_pulsing_gem:     SigilPrism,
    std_icon_bouncing_rocket: SigilComet,
    std_icon_glowing_heart:   SigilEye,
    std_icon_wobbling_skull:  SigilVoid,
};

// Renders the sigil SVG for the given standard icon id, sized to fill its
// container. Returns null for unknown ids so callers can fall back.
export default function StandardIconSigil({ id, color, size = '100%' }) {
    const Sigil = SIGIL_MAP[id];
    if (!Sigil) return null;
    return (
        <div style={{ width: size, height: size }} className="flex items-center justify-center">
            <Sigil color={color} />
        </div>
    );
}