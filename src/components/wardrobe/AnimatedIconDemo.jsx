import React from 'react';

// Preview of a chest-tier Animated Pilot Icon. The generated assets are still
// frames at present (Phase 2 deferred true 6-frame sprite sheets), so we display
// the hero PNG at icon-size with a subtle slow rotation/pulse so the preview
// feels alive rather than static. Same image is used at every render site
// (LB row, profile, chat) — sizing is the only variable.
export default function AnimatedIconDemo({ iconUrl }) {
    if (!iconUrl) {
        return (
            <div className="w-full bg-slate-950 rounded-lg flex items-center justify-center py-10 text-slate-500 text-xs">
                Asset not yet generated.
            </div>
        );
    }
    return (
        <div className="w-full bg-slate-950 rounded-lg flex flex-col items-center justify-center gap-4 py-10">
            <div className="text-[10px] uppercase tracking-widest text-slate-500">pilot icon preview</div>
            <div className="relative">
                <img
                    src={iconUrl}
                    alt="pilot icon"
                    className="w-32 h-32 rounded-full object-cover border-2 border-cyan-500/30 animate-pulse"
                    style={{ animationDuration: '3s' }}
                />
                <div className="absolute inset-0 rounded-full ring-2 ring-cyan-400/20 ring-offset-2 ring-offset-slate-950 pointer-events-none" />
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400">
                <span>Small</span>
                <img src={iconUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                <span>Medium</span>
                <img src={iconUrl} alt="" className="w-12 h-12 rounded-full object-cover" />
                <span>Leaderboard</span>
            </div>
        </div>
    );
}