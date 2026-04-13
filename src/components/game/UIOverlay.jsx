import React from 'react';
import { Pause, Heart, CircleDollarSign } from 'lucide-react';

export default function UIOverlay({ hp, maxHp, time, duration, level, xp, xpRequired, gold, cosmicTokens, weapons = [], passives = [], score = 0, onPause, onSquadUltimate }) {
    const formatTime = (s) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    return (
        <div className="absolute inset-0 pointer-events-none p-2 md:p-4 flex flex-col justify-between font-sans select-none z-40">
            <div className="flex justify-between items-start gap-1 md:gap-4">
                {/* Top Left: HP & Equipped */}
                <div className="w-24 md:w-48 pointer-events-auto shrink-0 flex flex-col gap-2">
                    <div className="bg-[#0b0416]/90 p-1.5 md:p-3 rounded-lg border border-red-500/30">
                        <div className="flex justify-between items-center mb-1 text-[9px] md:text-sm font-bold text-slate-200">
                            <span className="flex items-center gap-0.5 md:gap-1 text-red-400"><Heart className="w-3 h-3 md:w-4 md:h-4 fill-current" /> <span className="hidden md:inline">HP</span></span>
                            <span className="font-mono">{Math.floor(hp)}<span className="text-slate-500">/{maxHp}</span></span>
                        </div>
                        <div className="w-full bg-slate-950 h-1.5 md:h-2 rounded-full overflow-hidden border border-slate-800">
                            <div 
                                className="h-full transition-all duration-200 bg-gradient-to-r from-red-600 to-red-400" 
                                style={{ width: `${Math.max(0, (hp / maxHp) * 100)}%` }}
                            />
                        </div>
                    </div>

                    {/* Equipped Weapons */}
                    {weapons.length > 0 && (
                        <div className="flex flex-col gap-1 mt-1 md:mt-2">
                            {weapons.map(w => (
                                <div key={w.id} className="bg-[#0b0416]/60 backdrop-blur-sm border border-cyan-500/30 rounded px-1.5 py-1 flex items-center justify-between">
                                    <div className="text-[8px] md:text-xs text-cyan-400 font-bold truncate flex-1" title={w.name}>{w.name}</div>
                                    <div className="text-[7px] md:text-[10px] bg-cyan-950/80 text-cyan-200 px-1 rounded border border-cyan-500/50 ml-1 shrink-0">Lv.{w.level}</div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Equipped Passives */}
                    {passives.length > 0 && (
                        <div className="flex flex-col gap-1 mt-1">
                            {Object.values(passives.reduce((acc, p) => {
                                if (!acc[p.id]) acc[p.id] = { ...p, level: 0 };
                                acc[p.id].level += 1;
                                return acc;
                            }, {})).map(p => (
                                <div key={p.id} className="bg-[#0b0416]/60 backdrop-blur-sm border border-purple-500/30 rounded px-1.5 py-1 flex items-center justify-between">
                                    <div className="text-[8px] md:text-xs text-purple-400 font-bold truncate flex-1" title={p.name}>{p.name}</div>
                                    <div className="text-[7px] md:text-[10px] bg-purple-950/80 text-purple-200 px-1 rounded border border-purple-500/50 ml-1 shrink-0">Lv.{p.level}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                
                {/* Top Center: Timer */}
                <div className="bg-[#0b0416]/90 p-1.5 md:p-3 rounded-lg border border-cyan-500/30 text-center pointer-events-auto shrink-0 flex flex-col">
                    <div className="text-[8px] md:text-xs font-black tracking-widest text-cyan-500/80 uppercase mb-0.5">SURVIVE</div>
                    <div className="text-sm md:text-2xl font-black text-white font-mono tracking-wider">
                        {formatTime(time)} {duration === Infinity ? '' : <span className="text-slate-500 text-xs md:text-lg">/ {formatTime(duration || 300)}</span>}
                    </div>
                    <div className="text-[10px] md:text-sm font-black text-fuchsia-400 font-mono mt-0.5">
                        SCORE: {score.toLocaleString()}
                    </div>
                </div>

                {/* Top Right: Gold & Controls */}
                <div className="flex gap-1 md:gap-2 pointer-events-auto shrink-0">
                    <div className="bg-[#0b0416]/90 p-1.5 md:p-3 rounded-lg border border-emerald-500/30 flex flex-col justify-center text-right">
                        <div className="text-[8px] md:text-xs font-black tracking-widest text-emerald-500/80 uppercase mb-0.5">TOKENS</div>
                        <div className="text-emerald-400 font-bold text-xs md:text-lg flex items-center justify-end gap-0.5 md:gap-1 font-mono">
                            💠 {cosmicTokens || 0}
                        </div>
                    </div>
                    <div className="bg-[#0b0416]/90 p-1.5 md:p-3 rounded-lg border border-amber-500/30 flex flex-col justify-center text-right">
                        <div className="text-[8px] md:text-xs font-black tracking-widest text-amber-500/80 uppercase mb-0.5">WEALTH</div>
                        <div className="text-amber-400 font-bold text-xs md:text-lg flex items-center justify-end gap-0.5 md:gap-1 font-mono">
                            <CircleDollarSign className="w-3 h-3 md:w-4 md:h-4" /> {gold}
                        </div>
                    </div>
                    
                    <div className="flex flex-col justify-center">
                        <button 
                            id="pause-game-btn"
                            onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); onPause(); }}
                            className="bg-[#0b0416]/90 p-2 md:p-3 rounded-lg border border-slate-700/50 hover:bg-slate-800 hover:border-cyan-500/50 transition-all flex items-center justify-center touch-none h-full"
                            style={{ touchAction: 'none' }}
                        >
                            <Pause className="w-4 h-4 md:w-6 md:h-6 text-white" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Bottom: XP Bar & ULT */}
            <div className="mb-14 md:mb-2 pointer-events-auto max-w-lg mx-auto w-full flex flex-col gap-2">
                <button 
                    id="squad-ult-btn"
                    onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); onSquadUltimate(); }}
                    disabled={cosmicTokens < 4}
                    className="mx-auto w-40 md:w-56 bg-[#0b0416]/90 p-2 md:p-3 rounded-xl border-2 border-fuchsia-500/80 hover:bg-fuchsia-900 hover:border-fuchsia-400 transition-all flex flex-col items-center justify-center touch-none disabled:opacity-50 disabled:border-slate-700 disabled:bg-slate-900 shadow-[0_0_15px_rgba(217,70,239,0.3)]"
                    style={{ touchAction: 'none' }}
                >
                    <span className="text-sm md:text-base font-black text-fuchsia-300 tracking-widest uppercase">SQUAD ULT</span>
                    <span className="text-[10px] md:text-xs font-bold text-slate-300 flex items-center gap-1">COST: 4 <span className="text-emerald-400">💠</span></span>
                </button>

                <div className="bg-[#0b0416]/90 p-2 md:p-3 rounded-lg border border-cyan-500/30">
                    <div className="flex justify-between items-end mb-1">
                        <span className="text-sm md:text-lg font-black text-cyan-400 tracking-wider">LVL {level}</span>
                        <span className="text-[10px] md:text-xs font-bold text-cyan-200/50 font-mono">{Math.floor(xp)} <span className="text-slate-600">/ {xpRequired} XP</span></span>
                    </div>
                    <div className="w-full bg-slate-950 h-1.5 md:h-2 rounded-full overflow-hidden border border-slate-800">
                        <div 
                            className="h-full transition-all duration-200 bg-gradient-to-r from-cyan-600 to-cyan-300" 
                            style={{ width: `${Math.min(100, (xp / xpRequired) * 100)}%` }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}