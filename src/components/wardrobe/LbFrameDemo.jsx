import React from 'react';
import { getLBFrameStyle } from '@/lib/lbFrameStyles';

// Live preview of a Leaderboard Frame cosmetic. Renders a mock LB row using
// the same per-frame 9-slice config as the real LB row, so the player sees
// the corners + edges at the exact aspect they'll get in the wild.
export default function LbFrameDemo({ frameId, frameUrl, charIcon = '🦥', name = 'Cosmic Legend', score = 472000 }) {
    if (!frameUrl) {
        return (
            <div className="w-full bg-slate-950 rounded-lg flex items-center justify-center py-10 text-slate-500 text-xs">
                Asset not yet generated.
            </div>
        );
    }
    const { slice, repeat, anim } = getLBFrameStyle(frameId);
    return (
        <div className="w-full bg-slate-950 rounded-lg p-6 flex flex-col items-center gap-3">
            <div className="text-[10px] uppercase tracking-widest text-slate-500">leaderboard row preview</div>
            <div
                className={`w-full max-w-[640px] flex items-center gap-3 px-3 py-2 ${anim}`}
                style={{
                    borderStyle: 'solid',
                    borderColor: 'transparent',
                    borderTopWidth: 40,
                    borderBottomWidth: 40,
                    borderLeftWidth: 60,
                    borderRightWidth: 60,
                    borderImageSource: `url(${frameUrl})`,
                    borderImageSlice: slice,
                    borderImageRepeat: repeat,
                    borderImageOutset: 0,
                }}
            >
                <div className="text-2xl font-bold text-amber-300">🥇</div>
                <div className="w-10 h-10 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-xl">{charIcon}</div>
                <div className="flex-1 min-w-0">
                    <div className="font-bold text-white text-lg truncate">{name}</div>
                    <div className="text-[10px] text-slate-500">Sample row</div>
                </div>
                <div className="font-mono text-cyan-400 font-bold text-lg">{score.toLocaleString()}</div>
            </div>
            <div className="text-xs text-slate-500">Stretches to fit any row width</div>
        </div>
    );
}