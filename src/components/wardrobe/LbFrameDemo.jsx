import React from 'react';
import LBFrame from '@/components/game/LBFrame';
import { getLBFrameStyle } from '@/lib/lbFrameStyles';

// Live preview of a Leaderboard Frame cosmetic. Wraps a mock LB row with the
// real LBFrame component so the preview always matches the live render exactly.
export default function LbFrameDemo({ frameId, frameUrl, charIcon = '🦥', name = 'Cosmic Legend', score = 472000 }) {
    if (!frameUrl) {
        return (
            <div className="w-full bg-slate-950 rounded-lg flex items-center justify-center py-10 text-slate-500 text-xs">
                Asset not yet generated.
            </div>
        );
    }
    // LBFrame reads its url from the chest-asset cache via frameId. For preview
    // we want to render even before that cache settles, so we inline a wrapper
    // that mirrors LBFrame's render path with the URL we already have.
    const { anim } = getLBFrameStyle(frameId);
    const capStyle = {
        backgroundImage: `url(${frameUrl})`,
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'auto 100%',
    };
    return (
        <div className="w-full bg-slate-950 rounded-lg p-6 flex flex-col items-center gap-3">
            <div className="text-[10px] uppercase tracking-widest text-slate-500">leaderboard row preview</div>
            <div
                className={`relative w-full max-w-[640px] overflow-hidden lb-frame-wrap ${anim}`}
                style={{ backgroundColor: '#0a0e1a', height: 96 }}
            >
                <div
                    aria-hidden="true"
                    className="absolute left-0 top-0 bottom-0 pointer-events-none"
                    style={{ width: 120, ...capStyle, backgroundPosition: 'left center' }}
                />
                <div
                    aria-hidden="true"
                    className="absolute right-0 top-0 bottom-0 pointer-events-none"
                    style={{ width: 120, ...capStyle, backgroundPosition: 'right center' }}
                />
                <div className="relative z-10 h-full flex items-center gap-3" style={{ paddingLeft: 132, paddingRight: 132 }}>
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