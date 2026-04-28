import React, { useMemo } from 'react';
import { RELICS, getCharacterMastery } from '../../game/Constants';

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
    const { totals, sourceCount, xpBuffTimeLeft } = useMemo(() => {
        const totals = {};
        let sourceCount = 0;
        let xpBuffTimeLeft = null;

        // 1. Equipped relics
        const equipped = save.equippedRelics || [];
        const relicLevels = save.relicLevels || {};
        equipped.forEach((relicId) => {
            const relic = RELICS.find((r) => r.id === relicId);
            if (!relic) return;
            const level = relicLevels[relicId] || 1;
            const value = relic.values[level - 1] || 0;
            totals[relic.stat] = (totals[relic.stat] || 0) + value;
            sourceCount++;
        });

        // 2. Permanent stat upgrades (each level translates to a flat bonus)
        const sumLevels = (key) =>
            (save.permanentUpgrades?.[key] || 0) +
            (save.weeklyUpgrades?.[key] || 0) +
            (save.seasonalUpgrades?.[key] || 0);

        const dmgLvl = sumLevels('damage');
        const spdLvl = sumLevels('speed');
        const cdLvl = sumLevels('cooldown');
        const luckLvl = sumLevels('luck');
        const regenLvl = sumLevels('regen');
        const armorLvl = sumLevels('armor');
        const magnetLvl = sumLevels('magnet');

        // Permanent upgrades use roughly 2%/lvl (perm) + 5%/lvl (week) + 10%/lvl (season).
        // For a simple summary we approximate as the linear sum with the "permanent" rate as base.
        if (dmgLvl) { totals.damageMult = (totals.damageMult || 0) + dmgLvl * 0.02; sourceCount++; }
        if (spdLvl) { totals.speedMult  = (totals.speedMult  || 0) + spdLvl * 0.02; sourceCount++; }
        if (cdLvl)  { totals.cooldownMult = (totals.cooldownMult || 0) + cdLvl * -0.02; sourceCount++; }
        if (luckLvl) { totals.luck = (totals.luck || 0) + luckLvl; sourceCount++; }
        if (regenLvl) { totals.regen = (totals.regen || 0) + regenLvl * 0.1; sourceCount++; }
        if (armorLvl) { totals.armor = (totals.armor || 0) + armorLvl; sourceCount++; }
        if (magnetLvl) { totals.magnet = (totals.magnet || 0) + magnetLvl * 5; sourceCount++; }

        // 3. Character mastery bonus
        const charKills = save.characterKills?.[selectedChar] || 0;
        const mastery = getCharacterMastery(charKills);
        if (mastery.current.stat && mastery.current.value) {
            totals[mastery.current.stat] = (totals[mastery.current.stat] || 0) + mastery.current.value;
            sourceCount++;
        }

        // 4. Active session buffs (XP buff: +50%)
        const xpExpiry = save.sessionBuffs?.xpExpiry || 0;
        if (xpExpiry > currentTime) {
            totals.xpMult = (totals.xpMult || 0) + 0.5;
            sourceCount++;
            const msLeft = xpExpiry - currentTime;
            const mins = Math.floor(msLeft / 60000);
            const secs = Math.floor((msLeft % 60000) / 1000);
            xpBuffTimeLeft = `${mins}:${secs.toString().padStart(2, '0')}`;
        }

        return { totals, sourceCount, xpBuffTimeLeft };
    }, [save.equippedRelics, save.relicLevels, save.characterKills, save.sessionBuffs, save.permanentUpgrades, save.weeklyUpgrades, save.seasonalUpgrades, selectedChar, currentTime]);

    const activeStats = STAT_ORDER.filter((k) => totals[k]);

    if (activeStats.length === 0) {
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
                    📊 Total Build Bonuses
                </span>
                <span className="text-[9px] md:text-[10px] text-slate-500 font-bold tracking-wider uppercase">
                    {sourceCount} {sourceCount === 1 ? 'source' : 'sources'}
                    {xpBuffTimeLeft && <span className="text-emerald-400 ml-1.5">· XP {xpBuffTimeLeft}</span>}
                </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
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
                                {def.fmt(totals[statKey])}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}