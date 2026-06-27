import React from 'react';
import { getLBFrameStyle } from '@/lib/lbFrameStyles';

// Live preview of a Leaderboard Frame cosmetic. Mirrors the LBFrame render
// approach: the frame PNG covers the row box as an absolutely-positioned
// background plate, with the mock LB row content sitting on top of the
// painted dark centre.
export default function LbFrameDemo({ frameId, frameUrl, charIcon = '🦥', name = 'Cosmic Legend', score = 472000 }) {
    if (!frameUrl) {
        return (
            <div className="w-full bg-slate-950 rounded-lg flex items-center justify-center py-10 text-slate-500 text-xs">
                Asset not yet generated.
            </div>
        );
    }
    const { anim } = getLBFrameStyle(frameId);
    return (
        <div className="w-full bg-slate-950 rounded-lg p-6 flex flex-col items-center gap-3">
            <div className="text-[10px] uppercase tracking-widest text-slate-500">leaderboard row preview</div>
            <div className={`relative w-full max-w-[640px] aspect-[8/1] ${anim}`}>
                <img
                    src={frameUrl}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 w-full h-full pointer-events-none select-none"
                    style={{ objectFit: 'fill' }}
                />
                <div className="relative z-10 h-full flex items-center gap-3 px-12">
                    <div className="text-2xl font-bold text-amber-300">🥇</div>
                    <div className="w-10 h-10 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-xl">{charIcon}</div>
                    <div className="flex-1 min-w-0">
                        <div className="font-bold text-white text-lg truncate">{name}</div>
                        <div className="text-[10px] text-slate-400">Sample row</div>
                    </div>
                    <div className="font-mono text-cyan-400 font-bold text-lg">{score.toLocaleString()}</div>
                </div>
            </div>
            <div className="text-xs text-slate-500">Stretches to fit any row width</div>
        </div>
    );
}