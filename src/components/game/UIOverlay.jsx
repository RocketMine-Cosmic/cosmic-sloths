import React, { useState } from 'react';
import { Pause, Volume2, VolumeX, Heart, CircleDollarSign } from 'lucide-react';
import { SoundManager } from '../../game/SoundManager';

export default function UIOverlay({ hp, maxHp, time, duration, level, xp, xpRequired, gold, onPause }) {
    const [isMuted, setIsMuted] = useState(SoundManager.isMuted());
    
    const toggleMute = () => {
        SoundManager.toggleMute();
        setIsMuted(SoundManager.isMuted());
    };
    const formatTime = (s) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    return (
        <div className="absolute inset-0 pointer-events-none p-3 md:p-6 flex flex-col justify-between font-sans drop-shadow-md select-none" style={{ zIndex: 100 }}>
            <div className="flex justify-between items-start gap-2 md:gap-4">
                {/* Top Left: HP */}
                <div className="w-32 md:w-64 pointer-events-auto">
                    <div className="bg-[#0b0416]/80 backdrop-blur-xl p-2 md:p-3 rounded-xl border border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.15)]">
                        <div className="flex justify-between items-center mb-1.5 md:mb-2 text-xs md:text-sm font-bold text-slate-200">
                            <span className="flex items-center gap-1 text-red-400"><Heart className="w-3 h-3 md:w-4 md:h-4 fill-current" /> HP</span>
                            <span className="font-mono">{Math.floor(hp)}<span className="text-slate-500">/{maxHp}</span></span>
                        </div>
                        <div className="w-full bg-slate-950 h-2 md:h-3 rounded-full overflow-hidden border border-slate-800">
                            <div 
                                className="h-full transition-all duration-200 bg-gradient-to-r from-red-600 to-red-400" 
                                style={{ width: `${Math.max(0, (hp / maxHp) * 100)}%` }}
                            />
                        </div>
                    </div>
                </div>
                
                {/* Top Center: Timer */}
                <div className="bg-[#0b0416]/80 backdrop-blur-xl p-2 md:p-4 rounded-xl border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.15)] text-center min-w-[90px] md:min-w-[140px] pointer-events-auto">
                    <div className="text-[9px] md:text-xs font-black tracking-widest text-cyan-500/80 uppercase mb-0.5 md:mb-1">SURVIVE</div>
                    <div className="text-xl md:text-3xl font-black text-white font-mono tracking-wider drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">
                        {formatTime(time)} {duration === Infinity ? '' : <span className="text-slate-500 text-sm md:text-xl">/ {formatTime(duration || 300)}</span>}
                    </div>
                </div>

                {/* Top Right: Gold & Controls */}
                <div className="flex gap-1.5 md:gap-3 pointer-events-auto">
                    <div className="bg-[#0b0416]/80 backdrop-blur-xl p-2 md:p-3 rounded-xl border border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.15)] flex flex-col justify-center min-w-[70px] md:min-w-[100px] text-right">
                        <div className="text-[9px] md:text-xs font-black tracking-widest text-amber-500/80 uppercase mb-0.5 md:mb-1">WEALTH</div>
                        <div className="text-amber-400 font-bold text-sm md:text-lg flex items-center justify-end gap-1 font-mono">
                            <CircleDollarSign className="w-3 h-3 md:w-4 md:h-4" /> {gold}
                        </div>
                    </div>
                    
                    <div className="flex flex-col gap-1.5 md:gap-3">
                        <button 
                            onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); toggleMute(); }}
                            className="bg-[#0b0416]/80 backdrop-blur-xl p-2.5 md:p-3 rounded-xl border border-slate-700/50 hover:bg-slate-800 hover:border-cyan-500/50 transition-all flex items-center justify-center touch-none shadow-lg"
                            style={{ touchAction: 'none' }}
                        >
                            {isMuted ? <VolumeX className="w-4 h-4 md:w-5 md:h-5 text-slate-500" /> : <Volume2 className="w-4 h-4 md:w-5 md:h-5 text-cyan-400" />}
                        </button>
                        <button 
                            onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); onPause(); }}
                            className="bg-[#0b0416]/80 backdrop-blur-xl p-2.5 md:p-3 rounded-xl border border-slate-700/50 hover:bg-slate-800 hover:border-cyan-500/50 transition-all flex items-center justify-center touch-none shadow-lg"
                            style={{ touchAction: 'none' }}
                        >
                            <Pause className="w-4 h-4 md:w-5 md:h-5 text-white" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Bottom: XP Bar */}
            <div className="mb-14 md:mb-2 pointer-events-auto">
                <div className="bg-[#0b0416]/80 backdrop-blur-xl p-3 md:p-4 rounded-xl border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.15)]">
                    <div className="flex justify-between items-end mb-1.5 md:mb-2">
                        <span className="text-lg md:text-2xl font-black text-cyan-400 tracking-wider">LVL {level}</span>
                        <span className="text-xs md:text-sm font-bold text-cyan-200/50 font-mono">{Math.floor(xp)} <span className="text-slate-600">/ {xpRequired} XP</span></span>
                    </div>
                    <div className="w-full bg-slate-950 h-3 md:h-4 rounded-full overflow-hidden border border-slate-800">
                        <div 
                            className="h-full transition-all duration-200 bg-gradient-to-r from-cyan-600 to-cyan-300 relative" 
                            style={{ width: `${Math.min(100, (xp / xpRequired) * 100)}%` }}
                        >
                            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTAgMjBMMjAgMEgwaC0yMHoiIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiLz48L3N2Zz4=')] opacity-30"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}