import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Lock, Check, Award } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { SoundManager } from '../game/SoundManager';
import { SaveManager } from '../game/SaveManager';
import { updateOmenXUser } from '@/lib/omenxUser';
import { useOmenXUser } from '@/hooks/useOmenXUser';
import { PLAYER_TITLES, TITLE_TIERS } from '@/lib/playerTitles';
import SpaceBackground from '../components/game/SpaceBackground';
import CurrencyHeader from '../components/game/CurrencyHeader';
import OmenXGate from '../components/game/OmenXGate';

const TIER_ORDER = ['mythic', 'legendary', 'epic', 'rare', 'uncommon', 'common', 'starter'];
const TIER_TABS = [
    { id: 'all', label: 'All' },
    { id: 'unlocked', label: 'Unlocked' },
    { id: 'locked', label: 'Locked' },
];

export default function Titles() {
    const navigate = useNavigate();
    const { user: omenxUser } = useOmenXUser();
    const [stats, setStats] = useState(null);
    const [equippedTitle, setEquippedTitle] = useState('');
    const [filter, setFilter] = useState('all');
    const [saving, setSaving] = useState(false);

    // Fetch player stats (mirrors what Profile does for title eval)
    useEffect(() => {
        if (!omenxUser) return;
        setEquippedTitle(omenxUser?.data?.player_title || '');

        (async () => {
            const save = SaveManager.load();
            let bestScore = 0;
            let leviathanKills = 0;

            try {
                if (omenxUser.walletAddress) {
                    const top = await base44.entities.RunScore.filter({ wallet_address: omenxUser.walletAddress }, '-score', 1);
                    if (top.length) bestScore = top[0].score || 0;
                }
            } catch {}

            const enemyKills = save.enemyKills || {};
            leviathanKills = Object.keys(enemyKills)
                .filter(id => id.startsWith('boss_') || id === 'world_boss')
                .reduce((sum, id) => sum + (enemyKills[id] || 0), 0);

            setStats({
                totalKills: save.totalKills || 0,
                leviathanKills,
                bestScore,
                globalRaidDamage: 0,
                gold: save.gold || 0,
                totalGoldEarned: save.totalGoldEarned || 0,
                maxLevelReached: save.maxLevelReached || 0,
                maxTimeSurvived: save.maxTimeSurvived || 0,
                unlockedCharactersCount: save.unlockedCharacters?.length || 0,
                totalUnlockedCosmetics: save.unlockedCosmetics?.length || 0,
                totalUnlockedTalents: Object.values(save.unlockedTalents || {}).reduce((a, arr) => a + arr.length, 0),
            });
        })();
    }, [omenxUser]);

    const rows = useMemo(() => {
        if (!stats) return [];
        return PLAYER_TITLES
            .map(t => ({ ...t, unlocked: t.isUnlocked(stats) }))
            .sort((a, b) => {
                const ai = TIER_ORDER.indexOf(a.tier);
                const bi = TIER_ORDER.indexOf(b.tier);
                if (ai !== bi) return ai - bi;
                if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
                return a.label.localeCompare(b.label);
            });
    }, [stats]);

    const filteredRows = useMemo(() => {
        if (filter === 'unlocked') return rows.filter(r => r.unlocked);
        if (filter === 'locked') return rows.filter(r => !r.unlocked);
        return rows;
    }, [rows, filter]);

    const unlockedCount = rows.filter(r => r.unlocked).length;

    const handleEquip = async (titleId) => {
        if (saving) return;
        setSaving(true);
        SoundManager.playUIClick();
        try {
            await updateOmenXUser({ player_title: titleId });
            setEquippedTitle(titleId);
            const currentName = omenxUser?.player_name || omenxUser?.data?.player_name || '';
            if (currentName) {
                base44.functions.invoke('syncProfileName', {
                    newName: currentName,
                    newTitle: titleId,
                }).catch(e => console.error('[Titles] sync failed', e));
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <OmenXGate>
            <div className="h-[100dvh] flex flex-col relative text-slate-200 p-3 md:p-6 font-sans overflow-hidden">
                <SpaceBackground />
                <div className="max-w-5xl mx-auto w-full flex-1 flex flex-col min-h-0 relative z-10">
                    <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-3 mb-4 md:mb-6 border-b border-slate-800 pb-3 md:pb-4 shrink-0">
                        <div>
                            <button
                                onClick={() => { SoundManager.playUIClick(); navigate(-1); }}
                                className="mb-2 md:mb-3 flex items-center gap-1.5 md:gap-2 text-slate-400 hover:text-white transition-colors font-bold text-xs md:text-sm bg-slate-900 px-2 py-1 md:px-3 md:py-1.5 rounded-md md:rounded-lg border border-slate-700 w-fit"
                            >
                                <ArrowLeft className="w-3 h-3 md:w-4 md:h-4" /> Back
                            </button>
                            <h1 className="text-2xl md:text-4xl font-black uppercase tracking-widest flex items-center gap-3"
                                style={{ background: 'linear-gradient(90deg, #f59e0b, #f43f5e)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 0 10px rgba(245,158,11,0.5))' }}>
                                <Award className="w-6 h-6 md:w-8 md:h-8 text-amber-400" /> Titles
                            </h1>
                            <p className="text-slate-400 mt-0.5 text-xs md:text-sm tracking-widest uppercase">
                                Earned <span className="text-amber-400 font-bold">{unlockedCount}</span> / {rows.length}
                            </p>
                        </div>
                        <CurrencyHeader />
                    </header>

                    {/* Filter tabs */}
                    <div className="flex gap-2 mb-3 md:mb-4 shrink-0">
                        {TIER_TABS.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => { SoundManager.playUIClick(); setFilter(tab.id); }}
                                className={`px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-bold text-xs md:text-sm transition-colors ${
                                    filter === tab.id ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Title list */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex-1 overflow-y-auto pr-1 pb-10 grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3 content-start"
                    >
                        {!stats ? (
                            <div className="col-span-full flex justify-center items-center py-20">
                                <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        ) : filteredRows.length === 0 ? (
                            <div className="col-span-full text-center text-slate-500 py-12 text-sm">
                                No titles match this filter.
                            </div>
                        ) : (
                            filteredRows.map(row => {
                                const tier = TITLE_TIERS[row.tier];
                                const isEquipped = equippedTitle === row.id;
                                return (
                                    <div
                                        key={row.id}
                                        className={`bg-slate-950/85 backdrop-blur-md border rounded-xl p-3 md:p-4 transition-all flex flex-col gap-2 ${
                                            row.unlocked ? `${tier.border} hover:brightness-110` : 'border-slate-700 opacity-90'
                                        } ${isEquipped ? 'ring-2 ring-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.4)]' : ''}`}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className={`text-[11px] md:text-xs ${tier.bg} ${tier.text} px-2 py-0.5 rounded border ${tier.border} tracking-wider font-bold truncate`}>
                                                    {row.label}
                                                </span>
                                                <span className={`text-[9px] md:text-[10px] uppercase tracking-widest ${tier.text} opacity-70 shrink-0`}>
                                                    {tier.label}
                                                </span>
                                            </div>
                                            {row.unlocked
                                                ? <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                                                : <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                            }
                                        </div>
                                        <p className="text-[11px] md:text-xs text-slate-400 leading-snug">
                                            {row.describe(stats)}
                                        </p>
                                        <div className="mt-auto pt-1">
                                            {isEquipped ? (
                                                <button
                                                    onClick={() => handleEquip('')}
                                                    disabled={saving}
                                                    className="w-full bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/60 text-amber-300 text-xs font-bold py-1.5 rounded-md transition-colors disabled:opacity-50"
                                                >
                                                    Equipped — Tap to remove
                                                </button>
                                            ) : row.unlocked ? (
                                                <button
                                                    onClick={() => handleEquip(row.id)}
                                                    disabled={saving}
                                                    className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white text-xs font-bold py-1.5 rounded-md transition-colors disabled:opacity-50"
                                                >
                                                    Equip
                                                </button>
                                            ) : (
                                                <div className="w-full text-center text-[10px] text-slate-600 italic py-1.5">Locked</div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </motion.div>
                </div>
            </div>
        </OmenXGate>
    );
}