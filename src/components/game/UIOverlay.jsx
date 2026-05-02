import React, { useState } from 'react';
import { Pause, Heart, CircleDollarSign, ChevronDown, ChevronUp } from 'lucide-react';

function OmenXIcon({ className }) {
    return <img src="https://media.base44.com/images/public/69de258a7e072380b89d66e3/01838179d_omenx_logo.png" className={className} alt="OMENX" />;
}

// Endless-mode reward caps — must mirror functions/saveScore.js EXACTLY.
// Cap = clamp(time_seconds * 12, 1500, 18000). Anything above this isn't credited.
const ENDLESS_GOLD_PER_SEC = 12;
const ENDLESS_GOLD_FLOOR = 1500;
const ENDLESS_GOLD_HARD_CEILING = 18000;
const computeEndlessGoldCap = (timeSec) =>
    Math.min(ENDLESS_GOLD_HARD_CEILING, Math.max(ENDLESS_GOLD_FLOOR, Math.floor((timeSec || 0) * ENDLESS_GOLD_PER_SEC)));

// UpgradeSystem prefixes every upgrade with "<CharName>'s " for flavour, but the HUD
// is space-constrained on mobile so the unique part ("Plasma Core", "Hyperdrive Fuel"…)
// gets truncated and every passive looks the same ("SkyByte's …"). Strip the prefix
// for HUD display only — the full name remains in the tooltip via title="".
const stripOwnerPrefix = (name) => {
    if (!name) return name;
    const apos = name.indexOf("'s ");
    if (apos > 0 && apos < 20) return name.slice(apos + 3);
    return name;
};

export default function UIOverlay({ hp, maxHp, time, duration, level, xp, xpRequired, gold, omenxBalance = 0, weapons = [], passives = [], score = 0, dps = 0, kills = 0, boss = null, onPause, onSquadUltimate }) {
    // Collapse loadout list by default on mobile so the pause button + top row stay visible.
    // Players can tap the HP bar to expand and review their build.
    const [loadoutCollapsed, setLoadoutCollapsed] = useState(true);

    // Aggregate passives once so both the count badge and the expanded list use the same data.
    const aggregatedPassives = Object.values(passives.reduce((acc, p) => {
        if (!acc[p.id]) acc[p.id] = { ...p, level: 0 };
        acc[p.id].level += 1;
        return acc;
    }, {}));

    const formatTime = (s) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    // In endless mode, gold credited to the wallet is capped by playtime (see saveScore.js).
    // The HUD must show what the player will ACTUALLY get, not the raw earned amount.
    const isEndless = duration === Infinity;
    const endlessCap = isEndless ? computeEndlessGoldCap(time) : Infinity;
    const displayGold = isEndless ? Math.min(gold, endlessCap) : gold;
    const goldCapped = isEndless && gold >= endlessCap;

    return (
        <div className="absolute inset-0 pointer-events-none p-2 md:p-4 flex flex-col justify-between font-sans select-none z-40">
            <div className="flex justify-between items-start gap-1 md:gap-4">
                {/* Top Left: HP & Equipped — collapsible on mobile so the loadout list doesn't push the pause button off-screen. */}
                <div className={`pointer-events-auto shrink-0 flex flex-col gap-2 ${loadoutCollapsed ? 'w-16 md:w-24' : 'w-32 md:w-52'}`}>
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

                    {/* Loadout toggle — tap to expand/collapse weapons + passives */}
                    {(weapons.length > 0 || aggregatedPassives.length > 0) && (
                        <button
                            onClick={(e) => { e.stopPropagation(); setLoadoutCollapsed(c => !c); }}
                            className="bg-[#0b0416]/80 border border-slate-700 hover:border-cyan-500/60 rounded px-1.5 py-1 flex items-center justify-between gap-1 text-[9px] md:text-xs font-bold text-slate-300 transition-colors"
                            title={loadoutCollapsed ? 'Show loadout' : 'Hide loadout'}
                        >
                            <span className="flex items-center gap-1.5">
                                <span className="text-cyan-400">⚔ {weapons.length}</span>
                                <span className="text-purple-400">✦ {aggregatedPassives.length}</span>
                            </span>
                            {loadoutCollapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                        </button>
                    )}

                    {/* Equipped Weapons */}
                    {!loadoutCollapsed && weapons.length > 0 && (
                        <div className="flex flex-col gap-1">
                            {weapons.map(w => (
                                <div key={w.id} className="bg-[#0b0416]/60 backdrop-blur-sm border border-cyan-500/30 rounded px-1.5 py-1 flex items-center justify-between gap-1 min-w-0">
                                    <div className="text-[9px] md:text-xs text-cyan-400 font-bold truncate flex-1 min-w-0" title={w.name}>{stripOwnerPrefix(w.name)}</div>
                                    <div className="text-[7px] md:text-[10px] bg-cyan-950/80 text-cyan-200 px-1 rounded border border-cyan-500/50 shrink-0">Lv.{w.level}</div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Equipped Passives */}
                    {!loadoutCollapsed && aggregatedPassives.length > 0 && (
                        <div className="flex flex-col gap-1">
                            {aggregatedPassives.map(p => (
                                <div key={p.id} className="bg-[#0b0416]/60 backdrop-blur-sm border border-purple-500/30 rounded px-1.5 py-1 flex items-center justify-between gap-1 min-w-0">
                                    <div className="text-[9px] md:text-xs text-purple-400 font-bold truncate flex-1 min-w-0" title={p.name}>{stripOwnerPrefix(p.name)}</div>
                                    <div className="text-[7px] md:text-[10px] bg-purple-950/80 text-purple-200 px-1 rounded border border-purple-500/50 shrink-0">Lv.{p.level}</div>
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
                    <div className="text-[9px] md:text-xs font-bold text-orange-400 font-mono mt-0.5" title="Damage per second">
                        DPS: {dps.toLocaleString()}
                    </div>
                    <div className="text-[9px] md:text-xs font-bold text-red-300 font-mono mt-0.5" title="Enemies defeated this run">
                        KILLS: {kills.toLocaleString()}
                    </div>

                    {boss && boss.maxHp > 0 && (
                        <div className="mt-1 md:mt-2 pt-1 md:pt-2 border-t border-red-500/30">
                            <div className="flex justify-between items-center mb-0.5 md:mb-1 gap-2">
                                <span className="text-[8px] md:text-[10px] font-black tracking-widest text-red-400 uppercase truncate" title={boss.name}>
                                    ⚠ {boss.name}
                                </span>
                                <span className="text-[8px] md:text-[10px] font-mono text-red-300 shrink-0">
                                    {Math.ceil((boss.hp / boss.maxHp) * 100)}%
                                </span>
                            </div>
                            <div className="w-full bg-slate-950 h-1.5 md:h-2 rounded-full overflow-hidden border border-red-900/60">
                                <div
                                    className="h-full transition-all duration-200 bg-gradient-to-r from-red-700 via-red-500 to-orange-400"
                                    style={{ width: `${Math.max(0, (boss.hp / boss.maxHp) * 100)}%` }}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Top Right: Gold & Controls & ULT */}
                <div className="flex gap-1 md:gap-2 pointer-events-auto shrink-0 flex-col md:flex-row min-w-0">
                    <div className="flex gap-1 md:gap-2 flex-wrap justify-end min-w-0">
                        <div className="bg-[#0b0416]/90 p-1.5 md:p-3 rounded-lg border border-emerald-500/30 flex flex-col justify-center text-right">
                            <div className="text-[8px] md:text-xs font-black tracking-widest text-purple-500/80 uppercase mb-0.5">OMENX</div>
                            <div className="text-purple-400 font-bold text-xs md:text-lg flex items-center justify-end gap-0.5 md:gap-1 font-mono">
                                <OmenXIcon className="w-4 h-4 md:w-5 md:h-5" />
                                {typeof omenxBalance === 'number' ? omenxBalance.toFixed(2) : omenxBalance}
                            </div>
                        </div>
                        <div className="bg-[#0b0416]/90 p-1.5 md:p-3 rounded-lg border border-amber-500/30 flex flex-col justify-center text-right">
                            <div className="text-[8px] md:text-xs font-black tracking-widest text-amber-500/80 uppercase mb-0.5 flex items-center justify-end gap-1">
                                GOLD {goldCapped && <span className="text-[7px] md:text-[9px] bg-amber-500/20 text-amber-300 px-1 rounded border border-amber-500/40">MAX</span>}
                            </div>
                            <div className="text-amber-400 font-bold text-xs md:text-lg flex items-center justify-end gap-0.5 md:gap-1 font-mono">
                                <CircleDollarSign className="w-3 h-3 md:w-4 md:h-4" /> {displayGold}
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
            </div>

            {/* Floating Squad ULT buttons (bottom-right) — Lite & Full tiers */}
            <div className="fixed bottom-24 md:bottom-6 right-2 md:right-6 flex flex-col gap-1.5 md:gap-2 pointer-events-auto z-40">
                <button
                    id="squad-ult-lite-btn"
                    onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); onSquadUltimate('lite'); }}
                    disabled={omenxBalance < 5}
                    className="bg-[#0b0416]/90 px-2 py-1 md:px-4 md:py-3 rounded-lg md:rounded-xl border md:border-2 border-purple-500/80 hover:bg-purple-900 hover:border-purple-400 transition-all flex flex-col items-center justify-center touch-none disabled:opacity-50 disabled:border-slate-700 disabled:bg-slate-900 shadow-[0_0_10px_rgba(168,85,247,0.25)] md:shadow-[0_0_15px_rgba(168,85,247,0.3)]"
                    style={{ touchAction: 'none' }}
                    title="Squad Lite — capped clone power (5 OMENX)"
                >
                    <span className="text-[10px] md:text-sm font-black text-purple-300 tracking-wider md:tracking-widest uppercase leading-tight">ULT LITE</span>
                    <span className="text-[8px] md:text-xs font-bold text-slate-300 leading-tight">5 OMENX</span>
                </button>
                <button
                    id="squad-ult-full-btn"
                    onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); onSquadUltimate('full'); }}
                    disabled={omenxBalance < 10}
                    className="bg-[#0b0416]/90 px-2 py-1 md:px-4 md:py-3 rounded-lg md:rounded-xl border md:border-2 border-fuchsia-500/80 hover:bg-fuchsia-900 hover:border-fuchsia-400 transition-all flex flex-col items-center justify-center touch-none disabled:opacity-50 disabled:border-slate-700 disabled:bg-slate-900 shadow-[0_0_10px_rgba(217,70,239,0.25)] md:shadow-[0_0_15px_rgba(217,70,239,0.3)]"
                    style={{ touchAction: 'none' }}
                    title="Squad Ultimate — scales with your full upgrades (10 OMENX)"
                >
                    <span className="text-[10px] md:text-sm font-black text-fuchsia-300 tracking-wider md:tracking-widest uppercase leading-tight">ULT FULL</span>
                    <span className="text-[8px] md:text-xs font-bold text-slate-300 leading-tight">10 OMENX</span>
                </button>
            </div>

            {/* Bottom: XP Bar — centered, leaving room for the floating ULT buttons on the right */}
            <div className="mt-auto pointer-events-auto w-full mb-2 md:mb-4 flex justify-center px-2 md:px-0">
                <div className="bg-[#0b0416]/90 p-2 md:p-3 rounded-lg border border-cyan-500/30 w-full max-w-2xl">
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