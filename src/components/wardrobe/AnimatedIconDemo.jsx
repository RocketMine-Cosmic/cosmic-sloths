import React from 'react';
import { isStandardAnimatedIcon, getStandardAnimatedIcon } from '@/lib/standardCosmetics';

// Preview of an animated pilot icon.
//
// Two render paths:
//   1. Standard ("Support the Devs") — emoji + CSS animation at multiple sizes.
//   2. Chest — generated PNG hero frame at multiple sizes.
export default function AnimatedIconDemo({ iconId, iconUrl }) {
    if (iconId && isStandardAnimatedIcon(iconId)) {
        const std = getStandardAnimatedIcon(iconId);
        return (
            <div className="w-full bg-slate-950 rounded-lg flex flex-col items-center justify-center gap-4 py-10">
                <div className="text-[10px] uppercase tracking-widest text-slate-500">pilot icon preview</div>
                <div className="relative w-32 h-32 rounded-full bg-slate-900 border-2 border-cyan-500/40 flex items-center justify-center">
                    <span className={`${std.anim} text-6xl leading-none`}>{std.emoji}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span>Small</span>
                    <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center">
                        <span className={`${std.anim} text-base leading-none`}>{std.emoji}</span>
                    </div>
                    <span>Medium</span>
                    <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center">
                        <span className={`${std.anim} text-2xl leading-none`}>{std.emoji}</span>
                    </div>
                    <span>Leaderboard</span>
                </div>
            </div>
        );
    }

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