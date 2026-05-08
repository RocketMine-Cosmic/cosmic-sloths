import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { SaveManager } from '../../game/SaveManager';
import { SoundManager } from '../../game/SoundManager';
import { WEAPONS } from '../../game/Constants';
import { ChevronLeft, ChevronRight, Sparkles, Coins, Dices, Lock, Puzzle } from 'lucide-react';
import { isS6OrLater } from '@/lib/seasonGate';

// S6 Phase 3b — Mystery Forge UI. Costs 5,000 gold OR 50 relic fragments per pull,
// grants a random weapon augment (T1 60% / T2 30% / T3 10%) for the chosen weapon.
// Server downgrades the rolled tier if prereqs aren't met (e.g. rolling T3 with
// no T2 owned grants T2 instead). Hard-gated to S6+ via the same seasonGate the
// engine + saveScore use. Fragment alt-payment added 2026-05-08.
const MYSTERY_FORGE_GOLD_COST = 5000;
const MYSTERY_FORGE_FRAGMENT_COST = 50;
const BRANCH_LABEL = { damage: 'Damage', area: 'Area', cd: 'Cooldown' };
const TIER_LABEL  = { 1: 'Tier I',  2: 'Tier II', 3: 'Tier III' };
const TIER_COLOR  = {
    1: 'text-slate-200 bg-slate-800 border-slate-600',
    2: 'text-blue-200 bg-blue-950/60 border-blue-500',
    3: 'text-purple-200 bg-purple-950/60 border-purple-500',
};

export default function MysteryForgeCard({ save, setSave }) {
    const isS6 = isS6OrLater();
    const baseWeapons = useMemo(() => Object.values(WEAPONS).filter(w => !w.isSynergy), []);
    const [weaponIdx, setWeaponIdx] = useState(0);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    const [lastRoll, setLastRoll] = useState(null);
    // 'gold' or 'fragments' — defaults to fragments when player has enough,
    // since the whole point of the alt-currency is to drain fragment piles.
    const [paymentMode, setPaymentMode] = useState('gold');

    const weapon = baseWeapons[weaponIdx];
    const ownedAugs = save.forgeWeaponAugments?.[weapon.id] || [];
    const allOwned = ['damage', 'area', 'cd'].every(b => [1,2,3].every(t => ownedAugs.includes(`${b}_${t}`)));
    const hasGold = (save.gold || 0) >= MYSTERY_FORGE_GOLD_COST;
    const hasFragments = (save.relicFragments || 0) >= MYSTERY_FORGE_FRAGMENT_COST;
    const canAfford = paymentMode === 'fragments' ? hasFragments : hasGold;

    const cycleWeapon = (dir) => {
        SoundManager.playUIClick();
        setWeaponIdx(i => (i + dir + baseWeapons.length) % baseWeapons.length);
        setLastRoll(null);
        setError(null);
    };

    const handlePull = async () => {
        if (busy || !canAfford || allOwned) return;
        SoundManager.playUIClick();
        setBusy(true);
        setError(null);
        try {
            const res = await base44.functions.invoke('forgeAction', {
                action: 'mysteryForge',
                payload: { weaponId: weapon.id, paymentMode },
            });
            if (!res.data?.success) {
                setError(res.data?.error || 'Roll failed');
                return;
            }
            // Server returns full saveData — apply locally.
            if (res.data.saveData) {
                const s = SaveManager.load();
                s.gold = res.data.saveData.gold ?? s.gold;
                s.relicFragments = res.data.saveData.relicFragments ?? s.relicFragments;
                s.forgeWeaponAugments = res.data.saveData.forgeWeaponAugments ?? s.forgeWeaponAugments;
                SaveManager.save(s);
                setSave(s);
            }
            setLastRoll(res.data.mysteryResult);
            SoundManager.playLevelUp();
        } catch (e) {
            const msg = e?.response?.data?.error || e.message || 'Roll failed';
            setError(msg);
        } finally {
            setBusy(false);
        }
    };

    if (!isS6) {
        return (
            <div className="bg-slate-900/60 rounded-xl border border-slate-700 p-4 mt-4">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                    <Lock className="w-4 h-4" />
                    <span className="font-bold text-xs uppercase tracking-widest">Mystery Forge</span>
                    <span className="text-[9px] bg-purple-950/60 text-purple-300 border border-purple-700 px-1.5 py-0.5 rounded font-bold">S6 PREVIEW</span>
                </div>
                <p className="text-xs text-slate-500">Unlocks May 18 — gamble 5,000 gold for a random weapon augment.</p>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-br from-purple-950/40 via-slate-900/80 to-fuchsia-950/30 rounded-xl border-2 border-purple-500/40 p-3 md:p-4 mt-4 shadow-[0_0_30px_rgba(168,85,247,0.15)]">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                    <Dices className="w-5 h-5 text-purple-300" />
                    <h3 className="font-black text-sm md:text-base text-purple-200 uppercase tracking-widest">Mystery Forge</h3>
                    <span className="text-[9px] bg-purple-950/60 text-purple-300 border border-purple-500/50 px-1.5 py-0.5 rounded font-bold">NEW</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="flex items-center gap-1 bg-yellow-950/50 border border-yellow-700/50 px-2 py-1 rounded">
                        <Coins className="w-3 h-3 text-yellow-400 fill-yellow-500" />
                        <span className="text-[11px] font-bold text-yellow-300">{(save.gold || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1 bg-fuchsia-950/50 border border-fuchsia-700/50 px-2 py-1 rounded">
                        <Puzzle className="w-3 h-3 text-fuchsia-400 fill-fuchsia-500" />
                        <span className="text-[11px] font-bold text-fuchsia-300">{(save.relicFragments || 0).toLocaleString()}</span>
                    </div>
                </div>
            </div>

            <p className="text-[11px] md:text-xs text-slate-300 mb-2 leading-snug">
                Roll a random augment for the selected weapon — pay with gold OR relic fragments.
                <span className="block text-[10px] text-slate-400 mt-0.5">
                    Tier I <span className="text-slate-200 font-bold">60%</span> · Tier II <span className="text-blue-300 font-bold">30%</span> · Tier III <span className="text-purple-300 font-bold">10%</span>
                </span>
            </p>

            {/* Payment mode toggle */}
            <div className="flex gap-1.5 mb-3">
                <button
                    onClick={() => { SoundManager.playUIClick(); setPaymentMode('gold'); }}
                    className={`flex-1 py-1.5 rounded-md text-[11px] font-bold flex items-center justify-center gap-1 transition-all ${
                        paymentMode === 'gold'
                            ? 'bg-yellow-900/60 border border-yellow-500 text-yellow-200 shadow-[0_0_10px_rgba(234,179,8,0.25)]'
                            : 'bg-slate-900/60 border border-slate-700 text-slate-400 hover:text-yellow-300 hover:border-yellow-700'
                    }`}
                >
                    <Coins className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    {MYSTERY_FORGE_GOLD_COST.toLocaleString()} Gold
                </button>
                <button
                    onClick={() => { SoundManager.playUIClick(); setPaymentMode('fragments'); }}
                    className={`flex-1 py-1.5 rounded-md text-[11px] font-bold flex items-center justify-center gap-1 transition-all ${
                        paymentMode === 'fragments'
                            ? 'bg-fuchsia-900/60 border border-fuchsia-500 text-fuchsia-200 shadow-[0_0_10px_rgba(217,70,239,0.25)]'
                            : 'bg-slate-900/60 border border-slate-700 text-slate-400 hover:text-fuchsia-300 hover:border-fuchsia-700'
                    }`}
                >
                    <Puzzle className="w-3 h-3 fill-fuchsia-400 text-fuchsia-400" />
                    {MYSTERY_FORGE_FRAGMENT_COST} Frags
                </button>
            </div>

            {/* Weapon selector */}
            <div className="flex items-center justify-between bg-slate-900/80 p-1.5 rounded-lg border border-slate-700 mb-3">
                <button onClick={() => cycleWeapon(-1)} className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white">
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="text-center min-w-0 px-2">
                    <div className="font-bold text-purple-200 text-sm truncate">{weapon.name}</div>
                    <div className="text-[9px] text-slate-500 font-mono">{ownedAugs.length}/9 augments</div>
                </div>
                <button onClick={() => cycleWeapon(1)} className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white">
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>

            {/* Roll result */}
            {lastRoll && lastRoll.weaponId === weapon.id && (
                <div className={`mb-3 p-2.5 rounded-lg border-2 ${TIER_COLOR[lastRoll.rolledTier]} flex items-center gap-2 animate-in fade-in slide-in-from-top-1`}>
                    <Sparkles className="w-4 h-4 shrink-0" />
                    <div className="flex-1 min-w-0">
                        <div className="text-[10px] uppercase tracking-widest font-bold opacity-80">{TIER_LABEL[lastRoll.rolledTier]} rolled — granted</div>
                        <div className="font-bold text-xs md:text-sm truncate">
                            {BRANCH_LABEL[lastRoll.granted.split('_')[0]]} {TIER_LABEL[lastRoll.granted.split('_')[1]]}
                        </div>
                    </div>
                </div>
            )}

            {error && (
                <div className="mb-3 text-[11px] text-red-300 bg-red-950/40 border border-red-700/50 px-2 py-1.5 rounded">
                    ❌ {error}
                </div>
            )}

            <button
                onClick={handlePull}
                disabled={busy || !canAfford || allOwned}
                className={`w-full py-2.5 rounded-lg font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 transition-all ${
                    allOwned
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        : !canAfford || busy
                            ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                            : 'bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.4)] active:scale-95'
                }`}
            >
                {allOwned ? '✓ All augments forged' : busy ? 'Rolling…' : (
                    <>
                        <Dices className="w-4 h-4" /> Roll
                        <span className="flex items-center gap-1 bg-black/30 px-2 py-0.5 rounded text-xs">
                            {paymentMode === 'fragments' ? (
                                <>
                                    <Puzzle className="w-3 h-3 fill-fuchsia-400 text-fuchsia-400" />
                                    {MYSTERY_FORGE_FRAGMENT_COST}
                                </>
                            ) : (
                                <>
                                    <Coins className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                    {MYSTERY_FORGE_GOLD_COST.toLocaleString()}
                                </>
                            )}
                        </span>
                    </>
                )}
            </button>
        </div>
    );
}