import React, { useState } from 'react';
import { Sparkles, Plus, RotateCcw, Sword, Zap } from 'lucide-react';
import { SaveManager } from '../../game/SaveManager';
import { SoundManager } from '../../game/SoundManager';
import {
    BIAS_PER_POINT,
    POINTS_TIER_BREAKPOINT,
    LATE_LEVELS_PER_POINT,
    RESPEC_COST_OMENX,
    getBiasTargets,
    getGoldRespecCost,
    getTotalBiasPoints,
    getAllocations,
    getSpentPoints,
    getRemainingPoints,
} from '@/lib/poolBias';
import { useCurrency } from '@/lib/CurrencyContext';
import { base44 } from '@/api/base44Client';
import { IN_GAME_SKUS } from '@/lib/skuMap';
import { getOmenXUserSync } from '@/lib/omenxUser';
import { refreshBalance } from '@/lib/playerDataCache';

function TargetRow({ target, points, onAdd, canAdd, accent }) {
    const pct = points * BIAS_PER_POINT * 100;
    return (
        <div className={`flex items-center justify-between gap-2 bg-slate-900/60 border ${accent.border} rounded-lg px-2.5 py-1.5`}>
            <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="text-base shrink-0">{target.icon}</span>
                <span className={`text-xs font-bold truncate ${accent.text}`}>{target.label}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] font-mono text-slate-300 tabular-nums w-14 text-right">
                    {points} pts <span className="text-slate-500">+{pct.toFixed(0)}%</span>
                </span>
                <button
                    onClick={onAdd}
                    disabled={!canAdd}
                    className={`px-2 py-0.5 rounded ${accent.btn} disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center gap-1 text-[10px] font-bold transition-colors`}
                >
                    <Plus className="w-3 h-3" />
                </button>
            </div>
        </div>
    );
}

export default function PoolBiasPanel({ save, setSave }) {
    const { omenxBalance } = useCurrency();
    const [respecBusy, setRespecBusy] = useState(false);
    const [respecError, setRespecError] = useState(null);

    const targets = getBiasTargets();
    const total = getTotalBiasPoints(save);
    const spent = getSpentPoints(save);
    const remaining = getRemainingPoints(save);
    const allocations = getAllocations(save);
    const gold = save.gold || 0;
    const goldRespecCost = getGoldRespecCost(save);
    const canRespecGold = spent > 0 && gold >= goldRespecCost;
    const canRespecOmenx = spent > 0 && (omenxBalance ?? 0) >= RESPEC_COST_OMENX;

    const allocate = (targetId) => {
        if (remaining <= 0) return;
        SoundManager.playUIClick();
        const next = { ...allocations, [targetId]: Number(allocations[targetId] || 0) + 1 };
        const newSave = { ...save, poolBiasAllocations: next };
        SaveManager.save(newSave);
        setSave(newSave);
    };

    const respecWithGold = async () => {
        if (!canRespecGold || respecBusy) return;
        setRespecBusy(true);
        setRespecError(null);
        SoundManager.playUIClick();
        try {
            // Server-authoritative: deducts gold + clears allocations + bumps respec count atomically.
            const res = await base44.functions.invoke('spendGold', {
                grantInfo: { type: 'pool_respec' },
            });
            if (!res?.data?.success) {
                throw new Error(res?.data?.error || 'Respec failed');
            }
            // Adopt server truth for the fields it just changed.
            const sd = res.data.saveData || {};
            const newSave = {
                ...save,
                gold: Number(sd.gold ?? gold - goldRespecCost),
                poolBiasGoldRespecCount: Number(sd.poolBiasGoldRespecCount ?? (save.poolBiasGoldRespecCount || 0) + 1),
                poolBiasAllocations: sd.poolBiasAllocations || {},
            };
            SaveManager.save(newSave);
            setSave(newSave);
        } catch (e) {
            setRespecError(e?.message || 'Respec failed');
        } finally {
            setRespecBusy(false);
        }
    };

    const respecWithOmenx = async () => {
        if (!canRespecOmenx || respecBusy) return;
        setRespecBusy(true);
        setRespecError(null);
        SoundManager.playUIClick();
        try {
            const user = getOmenXUserSync();
            const playerName = user?.player_name || user?.full_name || 'Pilot';
            const res = await base44.functions.invoke('purchaseSku', {
                skuId: IN_GAME_SKUS.xpSession, // 10 OMENX
                quantity: 1,
                playerName,
            });
            if (res?.data?.success === false) {
                throw new Error(res?.data?.error || 'Purchase failed');
            }
            const newSave = { ...save, poolBiasAllocations: {} };
            SaveManager.save(newSave);
            setSave(newSave);
            // Force immediate cloud sync so the cleared allocations don't get lost
            // if the user closes the tab before the debounce fires.
            SaveManager.syncToBackendImmediate();
            refreshBalance();
        } catch (e) {
            setRespecError(e?.message || 'Respec failed');
        } finally {
            setRespecBusy(false);
        }
    };

    const weaponAccent = { border: 'border-cyan-500/30',  text: 'text-cyan-300',   btn: 'bg-cyan-700 hover:bg-cyan-600' };
    const statAccent   = { border: 'border-amber-500/30', text: 'text-amber-300',  btn: 'bg-amber-700 hover:bg-amber-600' };

    return (
        <div className="bg-[#0b0416]/60 backdrop-blur-xl border border-slate-700/50 rounded-xl p-3 md:p-5 mb-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3">
                <div>
                    <h2 className="text-lg md:text-xl font-black uppercase tracking-widest flex items-center gap-2 text-fuchsia-300">
                        <Sparkles className="w-5 h-5" /> Pool Bias
                    </h2>
                    <p className="text-[11px] md:text-xs text-slate-400 mt-0.5">
                        Earn <span className="text-cyan-300 font-bold">1 pt</span> per permanent upgrade for your first {POINTS_TIER_BREAKPOINT} levels,
                        then <span className="text-cyan-300 font-bold">1 pt every {LATE_LEVELS_PER_POINT} levels</span>. Each point = <span className="text-cyan-300 font-bold">+{Math.round(BIAS_PER_POINT * 100)}%</span> draw weight on that specific weapon or stat.
                    </p>
                </div>
                <div className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs shrink-0">
                    <span className="text-slate-400">Available:</span>{' '}
                    <span className="text-cyan-300 font-mono font-bold">{remaining}</span>
                    <span className="text-slate-500"> / {total}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                    <div className="flex items-center gap-1.5 text-cyan-300 font-bold text-xs uppercase tracking-wider mb-2">
                        <Sword className="w-3.5 h-3.5" /> Weapons
                    </div>
                    <div className="space-y-1.5">
                        {targets.weapons.map(t => (
                            <TargetRow
                                key={t.id}
                                target={t}
                                points={Number(allocations[t.id] || 0)}
                                onAdd={() => allocate(t.id)}
                                canAdd={remaining > 0}
                                accent={weaponAccent}
                            />
                        ))}
                    </div>
                </div>
                <div>
                    <div className="flex items-center gap-1.5 text-amber-300 font-bold text-xs uppercase tracking-wider mb-2">
                        <Zap className="w-3.5 h-3.5" /> Stats
                    </div>
                    <div className="space-y-1.5">
                        {targets.stats.map(t => (
                            <TargetRow
                                key={t.id}
                                target={t}
                                points={Number(allocations[t.id] || 0)}
                                onAdd={() => allocate(t.id)}
                                canAdd={remaining > 0}
                                accent={statAccent}
                            />
                        ))}
                    </div>
                </div>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-800 flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between">
                <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                    <RotateCcw className="w-3.5 h-3.5" />
                    Respec refunds all <span className="text-cyan-300 font-bold">{spent}</span> spent points. Gold cost increases each use.
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={respecWithGold}
                        disabled={!canRespecGold}
                        className="px-3 py-1.5 rounded bg-amber-700 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
                        title={spent === 0 ? 'Nothing to respec' : `Costs ${goldRespecCost.toLocaleString()} gold (you have ${gold.toLocaleString()})`}
                    >
                        Respec — {goldRespecCost.toLocaleString()} Gold
                    </button>
                    <button
                        onClick={respecWithOmenx}
                        disabled={!canRespecOmenx || respecBusy}
                        className="px-3 py-1.5 rounded bg-purple-700 hover:bg-purple-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
                        title={spent === 0 ? 'Nothing to respec' : `Costs ${RESPEC_COST_OMENX} OMENX`}
                    >
                        {respecBusy ? 'Processing…' : `Respec — ${RESPEC_COST_OMENX} OMENX`}
                    </button>
                </div>
            </div>
            {respecError && (
                <div className="mt-2 text-[11px] text-red-400">{respecError}</div>
            )}
        </div>
    );
}