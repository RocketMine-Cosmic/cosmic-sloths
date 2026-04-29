import React, { useState } from 'react';
import { Sparkles, Plus, Minus, RotateCcw, Sword, Shield, Zap, Flame } from 'lucide-react';
import { SaveManager } from '../../game/SaveManager';
import { SoundManager } from '../../game/SoundManager';
import {
    BIAS_CATEGORIES,
    BIAS_PER_POINT,
    RESPEC_COST_OMENX,
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

const ICONS = {
    weapons: Sword,
    passives: Zap,
    stats: Shield,
    evolution: Flame,
};

const COLOR_THEMES = {
    cyan:   { bar: 'from-cyan-600 to-cyan-400',     text: 'text-cyan-300',   border: 'border-cyan-500/40',   bg: 'bg-cyan-950/30',   btn: 'bg-cyan-700 hover:bg-cyan-600' },
    purple: { bar: 'from-purple-600 to-purple-400', text: 'text-purple-300', border: 'border-purple-500/40', bg: 'bg-purple-950/30', btn: 'bg-purple-700 hover:bg-purple-600' },
    amber:  { bar: 'from-amber-600 to-amber-400',   text: 'text-amber-300',  border: 'border-amber-500/40',  bg: 'bg-amber-950/30',  btn: 'bg-amber-700 hover:bg-amber-600' },
    rose:   { bar: 'from-rose-600 to-rose-400',     text: 'text-rose-300',   border: 'border-rose-500/40',   bg: 'bg-rose-950/30',   btn: 'bg-rose-700 hover:bg-rose-600' },
};

export default function PoolBiasPanel({ save, setSave }) {
    const { omenxBalance } = useCurrency();
    const [respecBusy, setRespecBusy] = useState(false);
    const [respecError, setRespecError] = useState(null);

    const total = getTotalBiasPoints(save);
    const spent = getSpentPoints(save);
    const remaining = getRemainingPoints(save);
    const allocations = getAllocations(save);
    const gold = save.gold || 0;
    const goldRespecCost = getGoldRespecCost(save);
    const canRespecGold = spent > 0 && gold >= goldRespecCost;
    const canRespecOmenx = spent > 0 && (omenxBalance ?? 0) >= RESPEC_COST_OMENX;

    const persist = (newAllocations) => {
        const newSave = { ...save, poolBiasAllocations: newAllocations };
        SaveManager.save(newSave);
        setSave(newSave);
    };

    const allocate = (catId, delta) => {
        SoundManager.playUIClick();
        const next = { ...allocations };
        const newVal = Math.max(0, (next[catId] || 0) + delta);
        if (delta > 0 && remaining <= 0) return;
        next[catId] = newVal;
        persist(next);
    };

    const respecWithGold = () => {
        if (!canRespecGold) return;
        SoundManager.playUIClick();
        const newSave = {
            ...save,
            gold: gold - goldRespecCost,
            poolBiasGoldRespecCount: Number(save.poolBiasGoldRespecCount || 0) + 1,
            poolBiasAllocations: BIAS_CATEGORIES.reduce((acc, c) => { acc[c.id] = 0; return acc; }, {}),
        };
        SaveManager.save(newSave);
        setSave(newSave);
    };

    const respecWithOmenx = async () => {
        if (!canRespecOmenx || respecBusy) return;
        setRespecBusy(true);
        setRespecError(null);
        SoundManager.playUIClick();
        try {
            const user = getOmenXUserSync();
            const playerName = user?.player_name || user?.full_name || 'Pilot';
            // Reuses the existing 10-OMENX xp-buff session SKU for the respec charge.
            const res = await base44.functions.invoke('purchaseSku', {
                skuId: IN_GAME_SKUS.xpSession,
                quantity: 1,
                playerName,
            });
            if (res?.data?.success === false) {
                throw new Error(res?.data?.error || 'Purchase failed');
            }
            const newSave = {
                ...save,
                poolBiasAllocations: BIAS_CATEGORIES.reduce((acc, c) => { acc[c.id] = 0; return acc; }, {}),
            };
            SaveManager.save(newSave);
            setSave(newSave);
            refreshBalance();
        } catch (e) {
            setRespecError(e?.message || 'Respec failed');
        } finally {
            setRespecBusy(false);
        }
    };

    return (
        <div className="bg-[#0b0416]/60 backdrop-blur-xl border border-slate-700/50 rounded-xl p-3 md:p-5 mb-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3">
                <div>
                    <h2 className="text-lg md:text-xl font-black uppercase tracking-widest flex items-center gap-2 text-fuchsia-300">
                        <Sparkles className="w-5 h-5" /> Pool Bias
                    </h2>
                    <p className="text-[11px] md:text-xs text-slate-400 mt-0.5">
                        Spend points to bias the level-up pool. Earn 1 point per permanent upgrade level.
                        Each point = +{Math.round(BIAS_PER_POINT * 100)}% draw weight in that category.
                    </p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                    <div className="bg-slate-900 border border-slate-700 rounded px-2 py-1">
                        <span className="text-slate-400">Available:</span>{' '}
                        <span className="text-cyan-300 font-mono font-bold">{remaining}</span>
                        <span className="text-slate-500"> / {total}</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
                {BIAS_CATEGORIES.map(cat => {
                    const theme = COLOR_THEMES[cat.color];
                    const Icon = ICONS[cat.id];
                    const pts = allocations[cat.id] || 0;
                    const pct = pts * BIAS_PER_POINT * 100;
                    const maxBarPts = Math.max(10, total); // visual scale
                    return (
                        <div key={cat.id} className={`rounded-lg border ${theme.border} ${theme.bg} p-2.5 md:p-3`}>
                            <div className="flex items-center justify-between mb-1.5">
                                <div className={`flex items-center gap-1.5 font-bold text-sm ${theme.text}`}>
                                    <Icon className="w-4 h-4" /> {cat.label}
                                </div>
                                <div className={`text-xs font-mono ${theme.text}`}>
                                    {pts} pts <span className="text-slate-500">(+{pct.toFixed(0)}%)</span>
                                </div>
                            </div>
                            <div className="text-[10px] text-slate-400 mb-2 leading-tight">{cat.desc}</div>
                            <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800 mb-2">
                                <div
                                    className={`h-full transition-all duration-200 bg-gradient-to-r ${theme.bar}`}
                                    style={{ width: `${Math.min(100, (pts / maxBarPts) * 100)}%` }}
                                />
                            </div>
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={() => allocate(cat.id, -1)}
                                    disabled={pts <= 0}
                                    className="flex-1 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-700 text-slate-200 flex items-center justify-center gap-1 text-xs font-bold transition-colors"
                                >
                                    <Minus className="w-3 h-3" /> Remove
                                </button>
                                <button
                                    onClick={() => allocate(cat.id, 1)}
                                    disabled={remaining <= 0}
                                    className={`flex-1 py-1 rounded ${theme.btn} disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center gap-1 text-xs font-bold transition-colors`}
                                >
                                    <Plus className="w-3 h-3" /> Add
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="mt-3 pt-3 border-t border-slate-800 flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between">
                <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                    <RotateCcw className="w-3.5 h-3.5" />
                    Respec refunds all <span className="text-cyan-300 font-bold">{spent}</span> spent points.
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={respecWithGold}
                        disabled={!canRespecGold}
                        className="px-3 py-1.5 rounded bg-amber-700 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
                        title={spent === 0 ? 'Nothing to respec' : `Costs ${goldRespecCost.toLocaleString()} gold (you have ${gold.toLocaleString()}). Cost increases each respec.`}
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