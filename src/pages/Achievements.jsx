import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Trophy, Clock, Skull, Users, Star } from 'lucide-react';
import { SaveManager } from '../game/SaveManager';
import { CHARACTERS } from '../game/Constants';

export default function Achievements() {
    const navigate = useNavigate();
    const [save] = useState(SaveManager.load());

    const totalKills = save.totalKills || 0;
    const maxTimeSurvived = save.maxTimeSurvived || 0;
    const unlockedCharactersCount = save.unlockedCharacters?.length || 0;
    const totalCharacters = CHARACTERS.length;

    const achievements = [
        {
            id: 'survive_5',
            title: 'Survivor',
            desc: 'Survive for 5 minutes in a single run.',
            icon: <Clock className="w-8 h-8" />,
            progress: Math.min(maxTimeSurvived, 300),
            target: 300,
            isUnlocked: maxTimeSurvived >= 300,
            color: 'text-blue-400',
            bg: 'bg-blue-900/50',
            border: 'border-blue-500'
        },
        {
            id: 'survive_10',
            title: 'Veteran',
            desc: 'Survive for 10 minutes in a single run.',
            icon: <Clock className="w-8 h-8" />,
            progress: Math.min(maxTimeSurvived, 600),
            target: 600,
            isUnlocked: maxTimeSurvived >= 600,
            color: 'text-purple-400',
            bg: 'bg-purple-900/50',
            border: 'border-purple-500'
        },
        {
            id: 'kills_100',
            title: 'First Blood',
            desc: 'Defeat 100 enemies across all runs.',
            icon: <Skull className="w-8 h-8" />,
            progress: Math.min(totalKills, 100),
            target: 100,
            isUnlocked: totalKills >= 100,
            color: 'text-red-400',
            bg: 'bg-red-900/50',
            border: 'border-red-500'
        },
        {
            id: 'kills_1000',
            title: 'Exterminator',
            desc: 'Defeat 1000 enemies across all runs.',
            icon: <Skull className="w-8 h-8" />,
            progress: Math.min(totalKills, 1000),
            target: 1000,
            isUnlocked: totalKills >= 1000,
            color: 'text-orange-400',
            bg: 'bg-orange-900/50',
            border: 'border-orange-500'
        },
        {
            id: 'kills_10000',
            title: 'Cosmic Destroyer',
            desc: 'Defeat 10000 enemies across all runs.',
            icon: <Skull className="w-8 h-8" />,
            progress: Math.min(totalKills, 10000),
            target: 10000,
            isUnlocked: totalKills >= 10000,
            color: 'text-yellow-400',
            bg: 'bg-yellow-900/50',
            border: 'border-yellow-500'
        },
        {
            id: 'unlock_half',
            title: 'Growing Crew',
            desc: `Unlock ${Math.floor(totalCharacters / 2)} characters.`,
            icon: <Users className="w-8 h-8" />,
            progress: Math.min(unlockedCharactersCount, Math.floor(totalCharacters / 2)),
            target: Math.floor(totalCharacters / 2),
            isUnlocked: unlockedCharactersCount >= Math.floor(totalCharacters / 2),
            color: 'text-emerald-400',
            bg: 'bg-emerald-900/50',
            border: 'border-emerald-500'
        },
        {
            id: 'unlock_all',
            title: 'Completionist',
            desc: 'Unlock all characters.',
            icon: <Star className="w-8 h-8" />,
            progress: Math.min(unlockedCharactersCount, totalCharacters),
            target: totalCharacters,
            isUnlocked: unlockedCharactersCount >= totalCharacters,
            color: 'text-cyan-400',
            bg: 'bg-cyan-900/50',
            border: 'border-cyan-500'
        }
    ];

    const formatProgress = (val, target, isTime) => {
        if (isTime) {
            const m1 = Math.floor(val / 60);
            const s1 = val % 60;
            const m2 = Math.floor(target / 60);
            return `${m1}:${s1.toString().padStart(2, '0')} / ${m2}:00`;
        }
        return `${val} / ${target}`;
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 p-4 md:p-8 font-mono relative overflow-hidden">
            <div className="absolute inset-0 opacity-20 pointer-events-none">
                {[...Array(20)].map((_, i) => (
                    <div 
                        key={i}
                        className="absolute bg-white rounded-full"
                        style={{
                            width: Math.random() * 3 + 1 + 'px',
                            height: Math.random() * 3 + 1 + 'px',
                            top: Math.random() * 100 + '%',
                            left: Math.random() * 100 + '%',
                            animation: `twinkle ${Math.random() * 3 + 2}s infinite`
                        }}
                    />
                ))}
            </div>

            <div className="max-w-4xl mx-auto relative z-10">
                <button 
                    onClick={() => navigate('/')}
                    className="mb-8 flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors font-bold"
                >
                    <ArrowLeft size={20} /> Back to Main Menu
                </button>

                <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-10 shadow-2xl"
                >
                    <div className="flex items-center gap-4 mb-8">
                        <Trophy className="w-10 h-10 text-yellow-400" />
                        <h1 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
                            ACHIEVEMENTS
                        </h1>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {achievements.map((ach) => (
                            <div 
                                key={ach.id} 
                                className={`p-4 rounded-xl border-2 flex items-center gap-4 transition-all ${
                                    ach.isUnlocked ? `${ach.bg} ${ach.border} shadow-[0_0_15px_rgba(0,0,0,0.5)]` : 'bg-slate-800 border-slate-700 opacity-60 grayscale'
                                }`}
                            >
                                <div className={`p-3 rounded-full ${ach.isUnlocked ? ach.color : 'text-slate-500'} bg-slate-950`}>
                                    {ach.icon}
                                </div>
                                <div className="flex-1">
                                    <h3 className={`font-bold text-lg ${ach.isUnlocked ? 'text-white' : 'text-slate-400'}`}>
                                        {ach.title}
                                    </h3>
                                    <p className="text-sm text-slate-400 mb-2">{ach.desc}</p>
                                    <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full ${ach.isUnlocked ? 'bg-yellow-400' : 'bg-slate-600'}`}
                                            style={{ width: `${(ach.progress / ach.target) * 100}%` }}
                                        />
                                    </div>
                                    <div className="text-xs text-right mt-1 text-slate-500 font-bold">
                                        {formatProgress(ach.progress, ach.target, ach.id.startsWith('survive'))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </div>
    );
}