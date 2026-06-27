import React from 'react';
import { getChestAssetUrl } from '@/lib/chestCosmeticAssets';

// Renders the equipped chest pilot icon if one is set, otherwise falls back to
// the standard pilot icon (emoji or uploaded URL). Used everywhere a player's
// avatar appears — LB row, profile, squad chat, end-of-run modal — so chest
// icons "follow" the player without each render site needing its own logic.
//
// Props:
//   animatedId — chest cosmetic id (e.g. 'animated_pilot_orbiting_moon'). When
//                set and the asset is loaded, this wins over `fallback`.
//   fallback   — the player's standard pilot_icon (emoji char or upload URL).
//   className  — sizing classes the parent provides (w-10 h-10 etc).
export default function AnimatedPilotIcon({ animatedId, fallback, className = 'w-10 h-10' }) {
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