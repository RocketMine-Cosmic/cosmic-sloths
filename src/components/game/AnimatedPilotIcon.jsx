import React from 'react';
import { getChestAssetUrl } from '@/lib/chestCosmeticAssets';
import { isStandardAnimatedIcon, getStandardAnimatedIcon } from '@/lib/standardCosmetics';

// Renders the equipped pilot icon if one is set, otherwise falls back to
// the standard pilot icon (emoji or uploaded URL). Used everywhere a player's
// avatar appears — LB row, profile, squad chat, end-of-run modal.
//
// Three render paths:
//   1. Chest animated icon — uses the generated PNG asset.
//   2. Standard ("Support the Devs") animated icon — emoji + CSS animation.
//   3. Fallback — standard pilot emoji / upload URL.
export default function AnimatedPilotIcon({ animatedId, fallback, className = 'w-10 h-10' }) {
    // Standard (CSS) animated icon — emoji with a motion class.
    if (animatedId && isStandardAnimatedIcon(animatedId)) {
        const std = getStandardAnimatedIcon(animatedId);
        return (
            <div className={`${className} rounded-full bg-slate-900 border-2 border-cyan-500/40 flex items-center justify-center overflow-hidden`}>
                <span className={`${std.anim} text-xl leading-none`}>{std.emoji}</span>
            </div>
        );
    }

    // Chest animated icon — generated PNG.
    const url = animatedId ? getChestAssetUrl(animatedId) : null;
    if (url) {
        return (
            <div className={`${className} rounded-full overflow-hidden border-2 border-cyan-500/50 shadow-[0_0_10px_rgba(34,211,238,0.3)]`}>
                <img src={url} alt="pilot" className="w-full h-full object-cover" />
            </div>
        );
    }

    // Standard fallback — emoji char or uploaded image URL.
    const isUrl = typeof fallback === 'string' && fallback.startsWith('http');
    return (
        <div className={`${className} rounded-full bg-slate-900 border-2 border-slate-700 flex items-center justify-center text-xl overflow-hidden`}>
            {isUrl
                ? <img src={fallback} className="w-full h-full object-cover" alt="pilot" />
                : (fallback || '🦥')}
        </div>
    );
}