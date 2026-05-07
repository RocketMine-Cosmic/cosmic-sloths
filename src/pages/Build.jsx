import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, BarChart3, Sparkles, Zap, Award, Star } from 'lucide-react';
import { CHARACTERS, CHARACTER_MASTERY_LEVELS, CHARACTER_TALENTS, getCharacterMastery } from '../game/Constants';
import { SaveManager } from '../game/SaveManager';
import { SoundManager } from '../game/SoundManager';
import { useCurrency } from '@/lib/CurrencyContext';
import { computeBuildStats } from '@/lib/buildStats';
import SpaceBackground from '../components/game/SpaceBackground';
import CurrencyHeader from '../components/game/CurrencyHeader';
import BuildStatRow from '../components/build/BuildStatRow';
import BuildTheorycrafter from '../components/build/BuildTheorycrafter';

// Standalone build viewer — pick a character, see their stacked progression
// across upgrades / talents / forge / mastery / relics, the per-weapon investment,
// and what synergies/evolutions are possible. Read-only: this is a theorycrafting
// dashboard, not an editor.
export default function Build() {
    const navigate = useNavigate();
    const [save, setSave] = useState(() => SaveManager.load());
    const { nfts } = useCurrency();
    const [charIndex, setCharIndex] = useState(0);

    // Refresh when SaveManager dispatches updates (e.g. user buys an upgrade in another tab).
    useEffect(() => {
        const onUpdate = () => setSave(SaveManager.load());
        window.addEventListener('saveUpdated', onUpdate);
        return () => window.removeEventListener('saveUpdated', onUpdate);
    }, []);

    // Same merge as ForgePanel: gameplay-unlocked + NFT-granted by name match.
    const unlockedChars = useMemo(() => {
        const owned = new Set(save.unlockedCharacters || ['neobyte']);
        const charIds = new Set(CHARACTERS.map(c => c.id.toLowerCase()));
        (nfts || []).forEach(nft => {
            const name = (nft?.metadata?.name || '').toLowerCase();
            if (charIds.has(name)) owned.add(name);
        });
        // Preserve canonical CHARACTERS order
        return CHARACTERS.filter(c => owned.has(c.id)).map(c => c.id);
    }, [save.unlockedCharacters, nfts]);

    const currentCharId = unlockedChars[charIndex % unlockedChars.length] || 'neobyte';
    const currentChar = CHARACTERS.find(c => c.id === currentCharId) || CHARACTERS[0];
    const charKills = (save.characterKills || {})[currentCharId] || 0;
    const mastery = getCharacterMastery(charKills, currentCharId);

    const stats = useMemo(() => computeBuildStats(save, currentCharId), [save, currentCharId]);

    // Forge character augments
    const charAugments = save.forgeCharAugments?.[currentCharId] || [];

    return (
        <div className="h-[100dvh] flex flex-col relative text-slate-200 p-3 md:p-6 font-sans overflow-hidden">
            <SpaceBackground />
            <div className="max-w-6xl mx-auto w-full flex-1 flex flex-col min-h-0 relative z-10">
                {/* Header */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-3 mb-4 md:mb-6 border-b border-slate-800 pb-3 md:pb-4 shrink-0">
                    <div>
                        <button
                            onClick={() => { SoundManager.playUIClick(); navigate(-1); }}
                            className="mb-2 md:mb-3 flex items-center gap-1.5 md:gap-2 text-slate-400 hover:text-white transition-colors font-bold text-xs md:text-sm bg-slate-900 px-2 py-1 md:px-3 md:py-1.5 rounded-md md:rounded-lg border border-slate-700 w-fit"
                        >
                            <ArrowLeft className="w-3 h-3 md:w-4 md:h-4" /> Back
                        </button>
                        <button
                            onClick={() => { SoundManager.playUIClick(); navigate('/'); }}
                            className="ml-2 mb-2 md:mb-3 inline-flex items-center gap-1.5 md:gap-2 text-slate-400 hover:text-white transition-colors font-bold text-xs md:text-sm bg-slate-900 px-2 py-1 md:px-3 md:py-1.5 rounded-md md:rounded-lg border border-slate-700"
                        >
                            🏠 Main
                        </button>
                        <h1 className="text-2xl md:text-4xl font-black uppercase tracking-widest flex items-center gap-3"
                            style={{ background: 'linear-gradient(90deg, #06b6d4, #d946ef)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 0 10px rgba(217,70,239,0.4))' }}>
                            <BarChart3 className="w-6 h-6 md:w-8 md:h-8 text-fuchsia-400" /> Build Stats
                        </h1>
                        <p className="text-slate-400 mt-0.5 text-xs md:text-sm tracking-widest uppercase">
                            Per-character progression & weapon synergy preview
                        </p>
                    </div>
                    <CurrencyHeader />
                </header>

                {/* Character switcher */}
                <div className="flex items-center justify-between bg-slate-900/60 border border-slate-700 p-2 md:p-3 rounded-xl mb-3 shrink-0">
                    <button
                        onClick={() => { SoundManager.playUIClick(); setCharIndex(i => (i - 1 + unlockedChars.length) % unlockedChars.length); }}
                        className="p-1.5 md:p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
                    </button>
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden border-2 shrink-0" style={{ borderColor: currentChar.color }}>
                            {currentChar.image
                                ? <img src={currentChar.image} alt={currentChar.name} className="w-full h-full object-cover" />
                                : <div className="w-full h-full bg-slate-800" />
                            }
                        </div>
                        <div className="min-w-0">
                            <div className="font-black text-cyan-300 text-base md:text-lg truncate">{currentChar.name}</div>
                            <div className="text-[10px] md:text-xs text-slate-500 truncate">{currentChar.desc}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                                <Award className="w-3 h-3 text-amber-400" />
                                <span className="font-bold text-amber-300">{mastery.current.title}</span>
                                <span className="text-slate-600">·</span>
                                <span>{charKills.toLocaleString()} kills</span>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => { SoundManager.playUIClick(); setCharIndex(i => (i + 1) % unlockedChars.length); }}
                        className="p-1.5 md:p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                    >
                        <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
                    </button>
                </div>

                {/* Scrollable body */}
                <div className="flex-1 overflow-y-auto pr-1 pb-10 space-y-4">
                    {/* Stat breakdown */}
                    <section className="bg-[#0b0416]/60 backdrop-blur-xl border border-cyan-500/30 rounded-xl p-4 shadow-[0_0_30px_rgba(6,182,212,0.10)]">
                        <div className="flex items-center gap-2 mb-3">
                            <Zap className="w-5 h-5 text-cyan-400" />
                            <h2 className="text-base md:text-lg font-bold text-cyan-300 uppercase tracking-widest">Stat Breakdown</h2>
                        </div>
                        <p className="text-[11px] text-slate-500 mb-3 italic leading-snug">
                            Tap a row to see where each contribution came from. These are baseline values — in-run pickups, level-ups,
                            NFT perks, title buffs and active synergies stack on top.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {stats.map(row => <BuildStatRow key={row.stat} row={row} />)}
                        </div>
                    </section>

                    {/* Theorycrafter — interactive what-if loadout */}
                    <BuildTheorycrafter save={save} charStats={stats} />

                    {/* Mastery summary */}
                    <section className="bg-[#0b0416]/60 backdrop-blur-xl border border-amber-500/30 rounded-xl p-4 shadow-[0_0_30px_rgba(245,158,11,0.10)]">
                        <div className="flex items-center gap-2 mb-3">
                            <Award className="w-5 h-5 text-amber-400" />
                            <h2 className="text-base md:text-lg font-bold text-amber-300 uppercase tracking-widest">Mastery Tiers</h2>
                            <span className="text-[10px] text-slate-500 font-mono ml-auto">
                                {mastery.unlockedTiers.length} unlocked
                            </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 text-xs">
                            {CHARACTER_MASTERY_LEVELS.map(tier => {
                                const unlocked = charKills >= tier.killsRequired;
                                return (
                                    <div key={tier.level} className={`px-3 py-2 rounded-lg border flex items-center gap-2 ${
                                        unlocked
                                            ? 'bg-amber-950/30 border-amber-700/50 text-amber-200'
                                            : 'bg-slate-950/40 border-slate-800 text-slate-500'
                                    }`}>
                                        <span className="text-base">{tier.badge}</span>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-bold truncate">{tier.title}</div>
                                            <div className="text-[10px] opacity-80 truncate">{tier.bonusDesc}</div>
                                        </div>
                                        <div className="text-[10px] font-mono shrink-0">
                                            {unlocked ? '✓' : `${tier.killsRequired.toLocaleString()}`}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    {/* Forge character augments */}
                    {charAugments.length > 0 && (
                        <section className="bg-[#0b0416]/60 backdrop-blur-xl border border-yellow-500/30 rounded-xl p-4 shadow-[0_0_30px_rgba(234,179,8,0.10)]">
                            <div className="flex items-center gap-2 mb-3">
                                <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                                <h2 className="text-base md:text-lg font-bold text-yellow-300 uppercase tracking-widest">Forge Augments</h2>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {charAugments.map(a => (
                                    <span key={a} className="text-[11px] bg-yellow-950/40 text-yellow-200 border border-yellow-700/50 px-2 py-1 rounded font-mono font-bold">
                                        ★ {a}
                                    </span>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Talents — simple owned list per character */}
                    <section className="bg-[#0b0416]/60 backdrop-blur-xl border border-fuchsia-500/30 rounded-xl p-4 shadow-[0_0_30px_rgba(217,70,239,0.10)]">
                        <div className="flex items-center gap-2 mb-3">
                            <Sparkles className="w-5 h-5 text-fuchsia-400" />
                            <h2 className="text-base md:text-lg font-bold text-fuchsia-300 uppercase tracking-widest">Talents</h2>
                        </div>
                        {(() => {
                            const owned = new Set([
                                ...((save.permanentTalents?.[currentCharId]) || []),
                                ...((save.unlockedTalents?.[currentCharId]) || []),
                            ]);
                            const talents = CHARACTER_TALENTS[currentCharId] || [];
                            if (owned.size === 0) {
                                return <div className="text-xs text-slate-500 italic text-center py-4">No talents picked yet for {currentChar.name}.</div>;
                            }
                            return (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                                    {talents.filter(t => owned.has(t.id)).map(t => (
                                        <div key={t.id} className="bg-fuchsia-950/20 border border-fuchsia-700/40 rounded px-2 py-1.5">
                                            <div className="text-xs font-bold text-fuchsia-200">{t.name}</div>
                                            <div className="text-[10px] text-slate-400">{t.desc}</div>
                                        </div>
                                    ))}
                                </div>
                            );
                        })()}
                    </section>
                </div>
            </div>
        </div>
    );
}