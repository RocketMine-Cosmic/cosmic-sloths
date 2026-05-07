import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { fmtStatValue, fmtStatDelta, fmtStatPctDelta } from '@/lib/buildStats';

// One collapsible row per stat. Click to expand and see where each contribution
// came from (permanent / weekly / seasonal / talents / mastery / relics / augments).
// For multiplier stats we show BOTH the raw multiplier (×1.45) and the additive %
// form (+45%) so theorycrafters can plug values straight into weapon math.
export default function BuildStatRow({ row }) {
    const [open, setOpen] = useState(false);
    const hasSources = row.sources.length > 0;

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
                    <span className="text-white font-mono font-bold text-sm">
                        {fmtStatValue(row.total, row.kind)}
                    </span>
                    {row.kind === 'pct' && (
                        <span className={`text-[10px] font-mono font-bold ${
                            (row.higherBetter ? row.total >= 1 : row.total <= 1) ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                            {fmtStatPctDelta(row.total, row.kind)}
                        </span>
                    )}
                    {hasSources && (
                        <span className="text-[10px] text-slate-500 font-mono">
                            base {fmtStatValue(row.base, row.kind)}
                        </span>
                    )}
                </div>
            </button>

            {open && hasSources && (
                <div className="border-t border-slate-800 bg-slate-950/40 px-3 py-2 space-y-1">
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
                </div>
            )}
        </div>
    );
}