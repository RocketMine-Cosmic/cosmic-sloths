import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ENEMIES } from '../game/Constants';
import { ArrowLeft, BookOpen, Skull, Shield, Zap, Activity } from 'lucide-react';
import { SoundManager } from '../game/SoundManager';
import { SaveManager } from '../game/SaveManager';

export default function Bestiary({ isCarousel }) {
    const navigate = useNavigate();
    const [selectedTier, setSelectedTier] = useState('all');
    const [save] = useState(SaveManager.load());
    const encountered = save.encounteredEnemies || [];

    // Group enemies by tier
    const tiers = ['all', ...Array.from(new Set(ENEMIES.map(e => e.isBoss ? 'boss' : `tier_${e.tier}`)))];

    const filteredEnemies = selectedTier === 'all' 
        ? ENEMIES 
        : ENEMIES.filter(e => selectedTier === 'boss' ? e.isBoss : `tier_${e.tier}` === selectedTier);

    return (
        <div className={`${isCarousel ? 'min-h-full' : 'min-h-screen'} bg-slate-950 text-slate-200 p-2 pb-20 md:p-6 font-mono`}>
            <div className="max-w-5xl mx-auto h-full flex flex-col">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-2 md:gap-4 mb-4 md:mb-6 border-b border-slate-800 pb-2 md:pb-4 shrink-0">
                    <div>
                        {!isCarousel && (
                            <button 
                                onClick={() => { SoundManager.playUIClick(); navigate('/'); }}
                                className="mb-2 md:mb-4 flex items-center gap-1.5 md:gap-2 text-slate-400 hover:text-white transition-colors font-bold text-xs md:text-sm bg-slate-900 px-2 py-1 md:px-3 md:py-1.5 rounded-md md:rounded-lg border border-slate-700 w-fit"
                            >
                                <ArrowLeft className="w-3 h-3 md:w-4 md:h-4" /> Main Menu
                            </button>
                        )}
                        <h1 className="text-2xl md:text-3xl font-bold text-rose-400 tracking-tight flex items-center gap-2">
                            <BookOpen className="w-6 h-6 md:w-8 md:h-8" /> COSMIC CODEX
                        </h1>
                        <p className="text-slate-400 mt-0.5 md:text-sm text-xs">Know your enemy. Study their weaknesses.</p>
                    </div>
                </header>

                <div className="flex overflow-x-auto gap-2 mb-4 pb-2 hide-scrollbar shrink-0">
                    {tiers.map(tier => (
                        <button
                            key={tier}
                            onClick={() => { SoundManager.playUIClick(); setSelectedTier(tier); }}
                            className={`px-3 py-1.5 rounded-lg font-bold text-xs md:text-sm whitespace-nowrap transition-colors ${
                                selectedTier === tier 
                                    ? 'bg-rose-600 text-white' 
                                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                            }`}
                        >
                            {tier === 'all' ? 'All Threats' : tier === 'boss' ? 'Leviathans (Bosses)' : `Tier ${tier.split('_')[1]}`}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto pr-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredEnemies.map(enemy => {
                            const isEncountered = encountered.includes(enemy.id);
                            return (
                                <motion.div 
                                    key={enemy.id}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className={`bg-slate-900 rounded-xl p-4 border flex flex-col ${
                                        isEncountered 
                                            ? (enemy.isBoss ? 'border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.15)]' : 'border-slate-800')
                                            : 'border-slate-800 opacity-50 grayscale'
                                    }`}
                                >
                                    <div className="flex items-start gap-4 mb-4">
                                        <div 
                                            className="w-16 h-16 rounded-xl flex items-center justify-center shrink-0 overflow-hidden relative border border-slate-700 bg-slate-950"
                                        >
                                            <div className="absolute inset-0 opacity-20" style={{ backgroundColor: isEncountered ? enemy.color : '#64748b' }}></div>
                                            <span className="text-2xl font-black" style={{ color: isEncountered ? enemy.color : '#64748b' }}>
                                                {isEncountered ? enemy.name.charAt(0) : '?'}
                                            </span>
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <h3 className="font-bold text-white leading-tight">{isEncountered ? enemy.name : 'Unknown Threat'}</h3>
                                                {enemy.isBoss ? (
                                                    <span className="text-[10px] bg-rose-950 text-rose-400 px-1.5 py-0.5 rounded border border-rose-900 font-bold">BOSS</span>
                                                ) : (
                                                    <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700 font-bold">T{enemy.tier}</span>
                                                )}
                                            </div>
                                            <div className="text-xs text-slate-400 mt-1 flex gap-2">
                                                {isEncountered && enemy.isTank && <span className="text-amber-400">Tank</span>}
                                                {isEncountered && enemy.isRanged && <span className="text-cyan-400">Ranged</span>}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 mt-auto">
                                        <div className="bg-slate-950/50 p-2 rounded-lg border border-slate-800/50 flex items-center gap-2">
                                            <Activity className="w-4 h-4 text-emerald-400" />
                                            <div>
                                                <div className="text-[10px] text-slate-500 font-bold">HP</div>
                                                <div className="text-sm text-white font-mono">{isEncountered ? enemy.hp.toLocaleString() : '?'}</div>
                                            </div>
                                        </div>
                                        <div className="bg-slate-950/50 p-2 rounded-lg border border-slate-800/50 flex items-center gap-2">
                                            <Skull className="w-4 h-4 text-rose-400" />
                                            <div>
                                                <div className="text-[10px] text-slate-500 font-bold">Damage</div>
                                                <div className="text-sm text-white font-mono">{isEncountered ? enemy.damage : '?'}</div>
                                            </div>
                                        </div>
                                        <div className="bg-slate-950/50 p-2 rounded-lg border border-slate-800/50 flex items-center gap-2">
                                            <Zap className="w-4 h-4 text-yellow-400" />
                                            <div>
                                                <div className="text-[10px] text-slate-500 font-bold">Speed</div>
                                                <div className="text-sm text-white font-mono">{isEncountered ? enemy.speed : '?'}</div>
                                            </div>
                                        </div>
                                        <div className="bg-slate-950/50 p-2 rounded-lg border border-slate-800/50 flex items-center gap-2">
                                            <Shield className="w-4 h-4 text-blue-400" />
                                            <div>
                                                <div className="text-[10px] text-slate-500 font-bold">XP Drop</div>
                                                <div className="text-sm text-white font-mono">{isEncountered ? enemy.xp : '?'}</div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}