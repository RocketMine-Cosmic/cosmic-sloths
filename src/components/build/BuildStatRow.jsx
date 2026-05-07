import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { fmtStatValue, fmtStatDelta, fmtStatPctDelta } from '@/lib/buildStats';

// One collapsible row per stat. Shows the actual running total prominently and
// the math behind it (base + each source = total) when expanded.
//
// For flat stats (HP, regen, armor, magnet, luck): "12 base + 8 = 20"
// For multiplier stats (damage, area, cooldown, gold, xp...): "×1.45 (+45%)"
//   plus a concrete worked example so theorycrafters can see what it translates to
//   on a typical weapon (e.g. "10 base dmg weapon → hits for 14.5").
export default function BuildStatRow({ row }) {
    const [open, setOpen] = useState(false);
    const hasSources = row.sources.length > 0;
    const sumOfBonuses = row.sources.reduce((acc, s) => acc + s.value, 0);

    // Concrete example reference values so the multiplier rows mean something.
    // These are common base values from the WEAPONS table / typical run.
    const exampleByStat = {
        damageMult:    { base: 10,  unit: 'dmg/hit',       label: '10-dmg weapon' },
        cooldownMult:  { base: 1.0, unit: 's between hits',label: '1.0s base CD'  },
        areaMult:      { base: 1.0, unit: '× area',        label: '1.0× base'     },
        projSpeedMult: { base: 5.0, unit: 'units/s',       label: '5.0 base spd'  },
        speedMult:     { base: 3.0, unit: 'units/s',       label: '3.0 base spd'  },
        goldMult:      { base: 100, unit: 'gold/run avg',  label: '100g baseline' },
        xpMult:        { base: 100, unit: 'xp/run avg',    label: '100xp baseline'},
    };
    const example = row.kind === 'pct' ? exampleByStat[row.stat] : null;
    const exampleResult = example ? (example.base * row.total).toFixed(1) : null;

    return (
        <div className="bg-slate-900/60 rounded-lg border border-slate-800 overflow-hidden">
            <button
                onClick={() => hasSources && setOpen(o => !o)}
                disabled={!hasSources}
                className={`w-full flex items-center justify-between px-3 py-2 text-left ${hasSources ? 'hover:bg-slate-800/60 cursor-pointer' : 'cursor-default'}`}
            >
                <div className="flex items-center gap-2 min-w-0">
                    {hasSources ? (
                        open
                            ? <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            : <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    ) : (
                        <span className="w-3.5 h-3.5 shrink-0" />
                    )}
                    <span className="text-slate-300 text-sm font-bold truncate">{row.label}</span>
                </div>
                <div className="flex items-baseline gap-2 shrink-0">
                    <span className="text-white font-mono font-black text-base">
                        {fmtStatValue(row.total, row.kind)}
                    </span>
                    {row.kind === 'pct' && (
                        <span className={`text-[10px] font-mono font-bold ${
                            (row.higherBetter ? row.total >= 1 : row.total <= 1) ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                            {fmtStatPctDelta(row.total, row.kind)}
                        </span>
                    )}
                </div>
            </button>

            {/* Always-visible math line for flat stats so user sees "8 + 12 = 20" without expanding */}
            {!open && hasSources && row.kind !== 'pct' && (
                <div className="px-3 pb-2 text-[10px] font-mono text-slate-500 flex items-center gap-1 -mt-1">
                    <span>{fmtStatValue(row.base, row.kind)}</span>
                    <span className="text-emerald-400">+{fmtStatValue(sumOfBonuses, row.kind)}</span>
                    <span className="text-slate-600">from {row.sources.length} {row.sources.length === 1 ? 'source' : 'sources'}</span>
                </div>
            )}

            {/* Always-visible worked example for multiplier stats */}
            {!open && hasSources && row.kind === 'pct' && example && (
                <div className="px-3 pb-2 text-[10px] font-mono text-slate-500 -mt-1">
                    {example.label} → <span className="text-cyan-300 font-bold">{exampleResult}</span> {example.unit}
                </div>
            )}

            {open && hasSources && (
                <div className="border-t border-slate-800 bg-slate-950/40 px-3 py-2 space-y-1">
                    {/* Base row */}
                    <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-800/60">
                        <span className="text-slate-500 italic">Character base</span>
                        <span className="font-mono font-bold text-slate-400">
                            {fmtStatValue(row.base, row.kind)}
                        </span>
                    </div>
                    {/* Each source */}
                    {row.sources.map((s, i) => {
                        const isGain = row.higherBetter ? s.value > 0 : s.value < 0;
                        return (
                            <div key={i} className="flex items-center justify-between text-xs">
                                <span className="text-slate-400">{s.name}</span>
                                <span className={`font-mono font-bold ${isGain ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {fmtStatDelta(s.value, row.kind)}
                                </span>
                            </div>
                        );
                    })}
                    {/* Total */}
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/60">
                        <span className="text-white font-bold uppercase tracking-wider">Total</span>
                        <span className="font-mono font-black text-white">
                            {fmtStatValue(row.total, row.kind)}
                            {row.kind === 'pct' && (
                                <span className="ml-1.5 text-[10px] text-emerald-400">
                                    {fmtStatPctDelta(row.total, row.kind)}
                                </span>
                            )}
                        </span>
                    </div>
                    {/* Worked example for multiplier stats */}
                    {row.kind === 'pct' && example && (
                        <div className="text-[10px] font-mono text-slate-500 mt-1 pt-1 border-t border-slate-800/40">
                            <span className="text-slate-600">e.g. </span>
                            {example.base} × {row.total.toFixed(2)} = <span className="text-cyan-300 font-bold">{exampleResult}</span> {example.unit}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}