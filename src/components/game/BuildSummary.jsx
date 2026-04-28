import React, { useMemo } from 'react';
import { RELICS, RELIC_RARITIES, getCharacterMastery, CHARACTERS } from '../../game/Constants';

// Stat metadata: label, icon, formatter, color theme
const STAT_DEFS = {
    damageMult: { label: 'Damage', icon: '⚡', color: 'text-red-300',     border: 'border-red-500/40',     bg: 'bg-red-950/30',     fmt: (v) => `+${Math.round(v * 100)}%` },
    speedMult:  { label: 'Speed',  icon: '💨', color: 'text-cyan-300',    border: 'border-cyan-500/40',    bg: 'bg-cyan-950/30',    fmt: (v) => `+${Math.round(v * 100)}%` },
    areaMult:   { label: 'Area',   icon: '💥', color: 'text-amber-300',   border: 'border-amber-500/40',   bg: 'bg-amber-950/30',   fmt: (v) => `+${Math.round(v * 100)}%` },
    cooldownMult: { label: 'Cooldown', icon: '⏱️', color: 'text-blue-300', border: 'border-blue-500/40',   bg: 'bg-blue-950/30',    fmt: (v) => `${v < 0 ? '' : '+'}${Math.round(v * 100)}%` },
    goldMult:   { label: 'Gold',   icon: '🪙', color: 'text-yellow-300',  border: 'border-yellow-500/40',  bg: 'bg-yellow-950/30',  fmt: (v) => `+${Math.round(v * 100)}%` },
    xpMult:     { label: 'XP',     icon: '✨', color: 'text-emerald-300', border: 'border-emerald-500/40', bg: 'bg-emerald-950/30', fmt: (v) => `+${Math.round(v * 100)}%` },
    luck:       { label: 'Luck',   icon: '🍀', color: 'text-lime-300',    border: 'border-lime-500/40',    bg: 'bg-lime-950/30',    fmt: (v) => `+${v}` },
    regen:      { label: 'Regen',  icon: '❤️', color: 'text-pink-300',    border: 'border-pink-500/40',    bg: 'bg-pink-950/30',    fmt: (v) => `+${v.toFixed(1)}/s` },
    armor:      { label: 'Armor',  icon: '🛡️', color: 'text-slate-300',  border: 'border-slate-500/40',   bg: 'bg-slate-900/50',   fmt: (v) => `+${v}` },
};

// Order in which to render stats (only those with non-zero totals appear)
const STAT_ORDER = ['damageMult', 'speedMult', 'areaMult', 'cooldownMult', 'goldMult', 'xpMult', 'luck', 'regen', 'armor'];

export default function BuildSummary({ save, selectedChar, currentTime }) {
    const summary = useMemo(() => {
        const totals = {};
        const sources = []; // { label, icon, color, stats: { statKey: value } }

        // 1. Equipped relics
        const equipped = save.equippedRelics || [];
        const relicLevels = save.relicLevels || {};
        equipped.forEach((relicId) => {
            const relic = RELICS.find((r) => r.id === relicId);
            if (!relic) return;
            const level = relicLevels[relicId] || 1;
            const value = relic.values[level - 1] || 0;
            totals[relic.stat] = (totals[relic.stat] || 0) + value;
            const rarity = RELIC_RARITIES[level - 1];
            sources.push({
                label: relic.name,
                icon: relic.icon,
                color: rarity.color,
                stats: { [relic.stat]: value },
            });
        });

        // 2. Character mastery bonus
        const charKills = save.characterKills?.[selectedChar] || 0;
        const mastery = getCharacterMastery(charKills);
        if (mastery.current.stat && mastery.current.value) {
            totals[mastery.current.stat] = (totals[mastery.current.stat] || 0) + mastery.current.value;
            const charData = CHARACTERS.find((c) => c.id === selectedChar);
            sources.push({
                label: `${charData?.name || selectedChar} ${mastery.current.title}`,
                icon: mastery.current.badge,
                color: 'text-amber-300',
                stats: { [mastery.current.stat]: mastery.current.value },
            });
        }

        // 3. Active session buffs (XP buff: +50%)
        const xpExpiry = save.sessionBuffs?.xpExpiry || 0;
        const hasXpBuff = xpExpiry > currentTime;
        if (hasXpBuff) {
            totals.xpMult = (totals.xpMult || 0) + 0.5;
            const msLeft = xpExpiry - currentTime;
            const mins = Math.floor(msLeft / 60000);
            const secs = Math.floor((msLeft % 60000) / 1000);
            sources.push({
                label: `XP Buff (${mins}:${secs.toString().padStart(2, '0')})`,
                icon: '✨',
                color: 'text-emerald-300',
                stats: { xpMult: 0.5 },
            });
        }

        return { totals, sources };
    }, [save.equippedRelics, save.relicLevels, save.characterKills, save.sessionBuffs, selectedChar, currentTime]);

    const activeStats = STAT_ORDER.filter((k) => summary.totals[k]);

    if (activeStats.length === 0 && summary.sources.length === 0) {
        return (
            <div className="bg-slate-900/40 border border-slate-700/50 rounded-lg px-3 py-2 text-center">
                <span className="text-[10px] md:text-xs text-slate-500 font-bold tracking-widest uppercase">
                    📊 No active build bonuses — equip relics or buy buffs to power up
                </span>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-br from-[#0b0416]/80 to-slate-950/80 backdrop-blur-xl border border-purple-500/30 rounded-lg p-2.5 md:p-3 shadow-[0_0_15px_rgba(168,85,247,0.1)]">
            <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] md:text-xs font-black tracking-widest uppercase text-purple-300 flex items-center gap-1.5">
                    📊 Build Summary
                </span>
                <span className="text-[9px] md:text-[10px] text-slate-500 font-bold tracking-wider uppercase">
                    {summary.sources.length} {summary.sources.length === 1 ? 'source' : 'sources'} active
                </span>
            </div>

            {/* Stat totals row */}
            {activeStats.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                    {activeStats.map((statKey) => {
                        const def = STAT_DEFS[statKey];
                        if (!def) return null;
                        return (
                            <div
                                key={statKey}
                                className={`flex items-center gap-1.5 px-2 py-1 rounded-md border ${def.border} ${def.bg}`}
                            >
                                <span className="text-xs">{def.icon}</span>
                                <span className="text-[9px] md:text-[10px] uppercase tracking-wider font-bold text-slate-400">
                                    {def.label}
                                </span>
                                <span className={`text-xs md:text-sm font-black font-mono ${def.color}`}>
                                    {def.fmt(summary.totals[statKey])}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Source list */}
            <div className="border-t border-slate-800/60 pt-1.5 space-y-0.5">
                {summary.sources.map((src, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 text-[10px] md:text-[11px]">
                        <span className="flex items-center gap-1.5 min-w-0">
                            <span className="text-xs shrink-0">{src.icon}</span>
                            <span className={`font-bold truncate ${src.color}`}>{src.label}</span>
                        </span>
                        <span className="flex gap-1.5 shrink-0">
                            {Object.entries(src.stats).map(([k, v]) => {
                                const def = STAT_DEFS[k];
                                if (!def) return null;
                                return (
                                    <span key={k} className={`font-mono font-bold ${def.color}`}>
                                        {def.fmt(v)} {def.label}
                                    </span>
                                );
                            })}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}