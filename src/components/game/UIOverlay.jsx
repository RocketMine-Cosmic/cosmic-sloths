import React from 'react';

export default function UIOverlay({ hp, maxHp, time, level, xp, xpRequired, gold }) {
    const formatTime = (s) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    return (
        <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between text-white font-mono drop-shadow-md z-10">
            <div className="flex justify-between items-start">
                <div className="w-64">
                    <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-600">
                        <div className="flex justify-between mb-1">
                            <span>HP</span>
                            <span>{Math.floor(hp)} / {maxHp}</span>
                        </div>
                        <div className="w-full bg-slate-900 h-4 rounded-full overflow-hidden">
                            <div 
                                className="bg-red-500 h-full transition-all duration-200" 
                                style={{ width: `${Math.max(0, (hp / maxHp) * 100)}%` }}
                            />
                        </div>
                    </div>
                </div>
                
                <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-600 text-center min-w-[120px]">
                    <div className="text-sm text-slate-300">SURVIVE</div>
                    <div className="text-2xl font-bold">{formatTime(time)}</div>
                </div>

                <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-600 text-right min-w-[100px]">
                    <div className="text-yellow-400 font-bold">🪙 {gold}</div>
                </div>
            </div>

            <div>
                <div className="flex justify-between items-end mb-1">
                    <span className="text-xl font-bold text-cyan-400">Level {level}</span>
                </div>
                <div className="w-full bg-slate-900 h-3 rounded-full overflow-hidden border border-slate-700">
                    <div 
                        className="bg-cyan-500 h-full transition-all duration-200" 
                        style={{ width: `${(xp / xpRequired) * 100}%` }}
                    />
                </div>
            </div>
        </div>
    );
}