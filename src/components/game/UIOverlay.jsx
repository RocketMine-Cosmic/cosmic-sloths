import React from 'react';
import { Pause } from 'lucide-react';

export default function UIOverlay({ hp, maxHp, time, duration, level, xp, xpRequired, gold, onPause }) {
    const formatTime = (s) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    return (
        <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between text-white font-mono drop-shadow-md z-10">
            <div className="flex justify-between items-start gap-2">
                <div className="w-28 md:w-64">
                    <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-600">
                        <div className="flex justify-between mb-1 text-xs md:text-base">
                            <span>HP</span>
                            <span>{Math.floor(hp)}/{maxHp}</span>
                        </div>
                        <div className="w-full bg-slate-900 h-2 md:h-4 rounded-full overflow-hidden">
                            <div 
                                className="bg-red-500 h-full transition-all duration-200" 
                                style={{ width: `${Math.max(0, (hp / maxHp) * 100)}%` }}
                            />
                        </div>
                    </div>
                </div>
                
                <div className="bg-slate-800/80 p-2 md:p-3 rounded-lg border border-slate-600 text-center min-w-[70px] md:min-w-[120px]">
                    <div className="text-[10px] md:text-sm text-slate-300">SURVIVE</div>
                    <div className="text-lg md:text-2xl font-bold">{formatTime(time)} / {formatTime(duration || 300)}</div>
                </div>

                <div className="flex gap-2">
                    <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-600 text-right min-w-[70px] md:min-w-[100px]">
                        <div className="text-yellow-400 font-bold text-sm md:text-base">🪙 {gold}</div>
                    </div>
                    <button 
                        onClick={onPause}
                        className="pointer-events-auto bg-slate-800/80 p-2 rounded-lg border border-slate-600 hover:bg-slate-700 transition-colors flex items-center justify-center"
                    >
                        <Pause className="w-5 h-5 md:w-6 md:h-6 text-white" />
                    </button>
                </div>
            </div>

            <div>
                <div className="flex justify-between items-end mb-1">
                    <span className="text-xl font-bold text-cyan-400">Level {level}</span>
                    <span className="text-sm font-bold text-slate-300">{Math.floor(xp)} / {xpRequired} XP</span>
                </div>
                <div className="w-full bg-slate-900 h-3 md:h-4 rounded-full overflow-hidden border border-slate-700">
                    <div 
                        className="bg-cyan-500 h-full transition-all duration-200" 
                        style={{ width: `${Math.min(100, (xp / xpRequired) * 100)}%` }}
                    />
                </div>
            </div>
        </div>
    );
}