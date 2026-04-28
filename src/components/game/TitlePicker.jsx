import React, { useEffect, useRef, useState } from 'react';
import { X, Lock, Check } from 'lucide-react';
import { PLAYER_TITLES, TITLE_TIERS } from '@/lib/playerTitles';

// Rich title selector — replaces the plain <select> on the Profile page.
// Shows each title's tier-coloured badge, "how to earn it" description,
// and locks the row when the player doesn't meet the requirement.
export default function TitlePicker({ stats, currentTitle, onSelect, onClose }) {
    const [open, setOpen] = useState(true);
    const ref = useRef(null);

    // Close when clicking outside
    useEffect(() => {
        const onDoc = (e) => {
            if (ref.current && !ref.current.contains(e.target)) {
                onClose?.();
            }
        };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, [onClose]);

    // Pre-compute rows once per render — sorted by tier then label.
    const tierOrder = ['mythic', 'legendary', 'epic', 'rare', 'uncommon', 'common', 'starter'];
    const rows = PLAYER_TITLES
        .map(t => ({ ...t, unlocked: t.isUnlocked(stats) }))
        .sort((a, b) => {
            const ai = tierOrder.indexOf(a.tier);
            const bi = tierOrder.indexOf(b.tier);
            if (ai !== bi) return ai - bi;
            return a.label.localeCompare(b.label);
        });

    return (
        <div ref={ref} className="relative inline-block">
            <button
                onClick={() => onClose?.()}
                className="text-slate-400 hover:text-white p-1 absolute -right-7 top-1"
                title="Close"
            >
                <X size={14} />
            </button>
            <div className="absolute top-full left-0 mt-1 z-50 w-[300px] md:w-[360px] max-h-[60vh] overflow-y-auto bg-slate-950/95 backdrop-blur-md border border-amber-500/40 rounded-lg shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
                {/* No title option */}
                <button
                    onClick={() => onSelect('')}
                    className={`w-full text-left px-3 py-2 hover:bg-slate-800 transition-colors flex items-center gap-2 border-b border-slate-800 ${!currentTitle ? 'bg-slate-800/60' : ''}`}
                >
                    {!currentTitle && <Check size={12} className="text-amber-400" />}
                    <span className="text-xs text-slate-400 italic">No Title</span>
                </button>

                {rows.map(row => {
                    const tier = TITLE_TIERS[row.tier];
                    const isCurrent = currentTitle === row.id;
                    return (
                        <button
                            key={row.id}
                            onClick={() => row.unlocked && onSelect(row.id)}
                            disabled={!row.unlocked}
                            className={`w-full text-left px-3 py-2 transition-colors flex flex-col gap-1 border-b border-slate-800/60 ${
                                row.unlocked ? 'hover:bg-slate-800 cursor-pointer' : 'opacity-40 cursor-not-allowed'
                            } ${isCurrent ? 'bg-slate-800/60' : ''}`}
                        >
                            <div className="flex items-center gap-2">
                                {isCurrent && <Check size={12} className="text-amber-400 shrink-0" />}
                                {!row.unlocked && <Lock size={11} className="text-slate-500 shrink-0" />}
                                <span className={`text-[10px] ${tier.bg} ${tier.text} px-2 py-0.5 rounded border ${tier.border} tracking-wider font-bold`}>
                                    {row.label}
                                </span>
                                <span className={`text-[9px] uppercase tracking-widest ${tier.text} opacity-60`}>{tier.label}</span>
                            </div>
                            <div className="text-[10px] text-slate-500 pl-4 leading-snug">
                                {row.describe(stats)}
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}