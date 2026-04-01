import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Skull, ArrowLeft, Trophy, Zap, Shield, Swords, FastForward } from 'lucide-react';
import { SaveManager } from '../game/SaveManager';
import { ENEMIES } from '../game/Constants';
import { SoundManager } from '../game/SoundManager';
import SpaceBackground from '../components/game/SpaceBackground';

const BOSS_MODIFIERS = [
    { id: 'fury', name: 'Leviathan\'s Fury', desc: 'Bosses deal +50% Damage', rewardDesc: '+50 Boss Gold Drop', icon: Swords, color: 'text-red-500' },
    { id: 'hide', name: 'Thick Hide', desc: 'Bosses have +100% HP', rewardDesc: '+20% Boss XP Drop', icon: Shield, color: 'text-slate-400' },
    { id: 'frenzy', name: 'Frenzy', desc: 'Bosses move 50% faster', rewardDesc: '+1 Reroll Token on Boss Kill', icon: FastForward, color: 'text-yellow-500' },
    { id: 'bullet_hell', name: 'Bullet Hell', desc: 'Bosses fire twice as many projectiles', rewardDesc: '+30% Total Score', icon: Zap, color: 'text-cyan-400' }
];

export default function LeviathanTrials({ isCarousel }) {
    const navigate = useNavigate();
    const [save, setSave] = useState(() => SaveManager.load());
    const [modifiers, setModifiers] = useState(save.bossModifiers || {});

    const enemyKills = save.enemyKills || {};
    const bossIds = ENEMIES.filter(e => e.isBoss).map(e => e.id);
    const totalLeviathanKills = bossIds.reduce((sum, id) => sum + (enemyKills[id] || 0), 0);

    const toggleModifier = (id) => {
        SoundManager.playUIClick();
        const newMods = { ...modifiers, [id]: !modifiers[id] };
        setModifiers(newMods);
        const currentSave = SaveManager.load();
        currentSave.bossModifiers = newMods;
        SaveManager.save(currentSave);
        setSave(currentSave);
    };

    return (
        <div className={`${isCarousel ? 'min-h-full' : 'min-h-screen'} relative text-slate-200 p-2 pb-20 md:p-6 font-mono`}>
            {!isCarousel && <SpaceBackground />}
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
                        <h1 className="text-2xl md:text-3xl font-bold text-red-500 tracking-tight flex items-center gap-2">
                            <Skull className="w-6 h-6 md:w-8 md:h-8" /> LEVIATHAN TRIALS
                        </h1>
                        <p className="text-slate-400 mt-0.5 md:text-sm text-xs">
                            Total Leviathans Slain: <span className="text-red-400 font-bold">{totalLeviathanKills}</span>
                        </p>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto pr-1 space-y-4">
                    <p className="text-slate-300 text-sm md:text-base">Toggle difficulty modifiers for Boss encounters to increase your rewards.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {BOSS_MODIFIERS.map(mod => {
                            const isActive = modifiers[mod.id];
                            const Icon = mod.icon;
                            return (
                                <motion.div
                                    key={mod.id}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => toggleModifier(mod.id)}
                                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-4 ${
                                        isActive 
                                        ? 'bg-red-950/40 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]' 
                                        : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                                    }`}
                                >
                                    <div className={`p-3 rounded-lg bg-slate-950 border border-slate-800 ${isActive ? mod.color : 'text-slate-600'}`}>
                                        <Icon className="w-6 h-6 md:w-8 md:h-8" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className={`font-bold text-lg ${isActive ? 'text-white' : 'text-slate-400'}`}>{mod.name}</h3>
                                        <p className="text-xs text-slate-500 mb-1">{mod.desc}</p>
                                        <div className="text-xs font-bold text-green-400 flex items-center gap-1 mt-1">
                                            <Trophy className="w-3 h-3" /> Reward: {mod.rewardDesc}
                                        </div>
                                    </div>
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                        isActive ? 'border-red-500 bg-red-500' : 'border-slate-700 bg-slate-950'
                                    }`}>
                                        {isActive && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
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