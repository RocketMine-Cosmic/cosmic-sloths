// Standard-tier ("Support the Devs" GMT) catalogue for the chest-only categories
// that previously had no standard variants: LB Frames, Animated Pilot Icons,
// Title Flair. Each entry is pure CSS / emoji — no PNG generation needed.
//
// IDs use the `std_` prefix so they never collide with chest IDs and the live
// render paths (LBFrame, AnimatedPilotIcon, PlayerTitle) can branch cheaply.

// ─── Standard LB Frames (5) ──────────────────────────────────────────────────
// Mix of solid-colour borders and gradient borders, all driven by CSS.
// `style` is passed straight to the wrapper div on the live LB row + preview.
export const STANDARD_LB_FRAMES = [
    {
        id: 'std_lb_frame_cyan_glow',
        name: 'Cyan Pulse',
        desc: 'Solid cyan border with soft pulsing glow.',
        kind: 'solid',
        style: { border: '2px solid rgba(34,211,238,0.8)', boxShadow: '0 0 12px rgba(34,211,238,0.45)' },
        anim: 'std-lb-pulse-cyan',
    },
    {
        id: 'std_lb_frame_gold_glow',
        name: 'Gold Halo',
        desc: 'Solid gold border with a warm halo.',
        kind: 'solid',
        style: { border: '2px solid rgba(250,204,21,0.85)', boxShadow: '0 0 12px rgba(250,204,21,0.5)' },
        anim: 'std-lb-pulse-gold',
    },
    {
        id: 'std_lb_frame_purple_glow',
        name: 'Violet Aura',
        desc: 'Solid violet border with deep purple aura.',
        kind: 'solid',
        style: { border: '2px solid rgba(192,132,252,0.85)', boxShadow: '0 0 12px rgba(168,85,247,0.55)' },
        anim: 'std-lb-pulse-purple',
    },
    {
        id: 'std_lb_frame_sunset_gradient',
        name: 'Sunset',
        desc: 'Orange → pink gradient border.',
        kind: 'gradient',
        gradient: 'linear-gradient(90deg,#f97316,#ec4899,#f97316)',
        anim: 'std-lb-grad-shift',
    },
    {
        id: 'std_lb_frame_aurora_gradient',
        name: 'Aurora',
        desc: 'Green → cyan → violet aurora gradient.',
        kind: 'gradient',
        gradient: 'linear-gradient(90deg,#34d399,#22d3ee,#a78bfa,#34d399)',
        anim: 'std-lb-grad-shift',
    },
];

// ─── Standard Animated Pilot Icons (5) ───────────────────────────────────────
// Emoji combined with a CSS animation. `emoji` renders inside the avatar slot;
// `anim` is the CSS class that drives the motion.
export const STANDARD_ANIMATED_ICONS = [
    { id: 'std_icon_spinning_star',  name: 'Spinning Star',  desc: 'A star that slowly rotates.',     emoji: '🌟', anim: 'std-icon-spin' },
    { id: 'std_icon_pulsing_gem',    name: 'Pulsing Gem',    desc: 'A gem that softly pulses.',       emoji: '💎', anim: 'std-icon-pulse' },
    { id: 'std_icon_bouncing_rocket', name: 'Bouncing Rocket', desc: 'A rocket that bobs in place.', emoji: '🚀', anim: 'std-icon-bounce' },
    { id: 'std_icon_glowing_heart',  name: 'Glowing Heart',  desc: 'A heart with a soft glow loop.',  emoji: '💖', anim: 'std-icon-glow' },
    { id: 'std_icon_wobbling_skull', name: 'Wobbling Skull', desc: 'A skull that tilts side to side.', emoji: '💀', anim: 'std-icon-wobble' },
];

// ─── Standard Title Flairs (5) ───────────────────────────────────────────────
// Each id maps 1:1 to a `.title-flair-<id>` CSS class defined in index.css.
export const STANDARD_TITLE_FLAIRS = [
    { id: 'title_style_cyan_glow',    name: 'Cyan Glow',    desc: 'Cyan glow around the text.' },
    { id: 'title_style_gold_outline', name: 'Gold Outline', desc: 'Warm gold outline.' },
    { id: 'title_style_pink_pop',     name: 'Pink Pop',     desc: 'Bright pink with a soft pop.' },
    { id: 'title_style_emerald_mint', name: 'Emerald Mint', desc: 'Cool emerald-mint sheen.' },
    { id: 'title_style_violet_haze',  name: 'Violet Haze',  desc: 'Smooth violet haze gradient.' },
];

// Fast lookup helpers.
const _stdLbMap   = Object.fromEntries(STANDARD_LB_FRAMES.map(x => [x.id, x]));
const _stdIconMap = Object.fromEntries(STANDARD_ANIMATED_ICONS.map(x => [x.id, x]));

export const isStandardLbFrame      = (id) => !!id && !!_stdLbMap[id];
export const isStandardAnimatedIcon = (id) => !!id && !!_stdIconMap[id];
export const getStandardLbFrame      = (id) => _stdLbMap[id] || null;
export const getStandardAnimatedIcon = (id) => _stdIconMap[id] || null;