import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Trophy, Clock, Skull, Users, Star, Coins, ArrowUpCircle } from 'lucide-react';
import { SaveManager } from '../game/SaveManager';
import { CHARACTERS } from '../game/Constants';

export default function Achievements() {
    const navigate = useNavigate();
    const [save] = useState(SaveManager.load());

    const totalKills = save.totalKills || 0;
    const maxTimeSurvived = save.maxTimeSurvived || 0;
    const unlockedCharactersCount = save.unlockedCharacters?.length || 0;
    const totalCharacters = CHARACTERS.length;
    const totalGoldEarned = save.totalGoldEarned || 0;
    const maxLevelReached = save.maxLevelReached || 0;
    const totalUnlockedCosmetics = save.unlockedCosmetics?.length || 0;
    const totalUnlockedTalents = Object.values(save.unlockedTalents || {}).reduce((acc, arr) => acc + arr.length, 0);

    const achievements = [
        {
            id: 'survive_3',
            title: 'Survivor',
            desc: 'Survive for 3 minutes in a single run.',
            icon: <Clock className="w-8 h-8" />,
            progress: Math.min(maxTimeSurvived, 180),
            target: 180,
            isUnlocked: maxTimeSurvived >= 180,
            points: 10,
            color: 'text-blue-400',
            bg: 'bg-blue-900/50',
            border: 'border-blue-500'
        },
        {
            id: 'survive_4',
            title: 'Veteran',
            desc: 'Survive for 4 minutes in a single run.',
            icon: <Clock className="w-8 h-8" />,
            progress: Math.min(maxTimeSurvived, 240),
            target: 240,
            isUnlocked: maxTimeSurvived >= 240,
            points: 20,
            color: 'text-purple-400',
            bg: 'bg-purple-900/50',
            border: 'border-purple-500'
        },
        {
            id: 'survive_5',
            title: 'Master',
            desc: 'Survive for 5 minutes in a single run.',
            icon: <Clock className="w-8 h-8" />,
            progress: Math.min(maxTimeSurvived, 300),
            target: 300,
            isUnlocked: maxTimeSurvived >= 300,
            points: 50,
            color: 'text-pink-400',
            bg: 'bg-pink-900/50',
            border: 'border-pink-500'
        },
        {
            id: 'survive_6',
            title: 'Cosmic Legend',
            desc: 'Survive for 6 minutes in a single run.',
            icon: <Clock className="w-8 h-8" />,
            progress: Math.min(maxTimeSurvived, 360),
            target: 360,
            isUnlocked: maxTimeSurvived >= 360,
            points: 100,
            color: 'text-rose-400',
            bg: 'bg-rose-900/50',
            border: 'border-rose-500'
        },
        {
            id: 'kills_100',
            title: 'First Blood',
            desc: 'Defeat 100 enemies across all runs.',
            icon: <Skull className="w-8 h-8" />,
            progress: Math.min(totalKills, 100),
            target: 100,
            isUnlocked: totalKills >= 100,
            points: 10,
            color: 'text-red-400',
            bg: 'bg-red-900/50',
            border: 'border-red-500'
        },
        {
            id: 'kills_1000',
            title: 'Exterminator',
            desc: 'Defeat 1,000 enemies across all runs.',
            icon: <Skull className="w-8 h-8" />,
            progress: Math.min(totalKills, 1000),
            target: 1000,
            isUnlocked: totalKills >= 1000,
            points: 20,
            color: 'text-orange-400',
            bg: 'bg-orange-900/50',
            border: 'border-orange-500'
        },
        {
            id: 'kills_10000',
            title: 'Cosmic Destroyer',
            desc: 'Defeat 10,000 enemies across all runs.',
            icon: <Skull className="w-8 h-8" />,
            progress: Math.min(totalKills, 10000),
            target: 10000,
            isUnlocked: totalKills >= 10000,
            points: 50,
            color: 'text-yellow-400',
            bg: 'bg-yellow-900/50',
            border: 'border-yellow-500'
        },
        {
            id: 'kills_50000',
            title: 'Genocidal Sloth',
            desc: 'Defeat 50,000 enemies across all runs.',
            icon: <Skull className="w-8 h-8" />,
            progress: Math.min(totalKills, 50000),
            target: 50000,
            isUnlocked: totalKills >= 50000,
            points: 100,
            color: 'text-amber-400',
            bg: 'bg-amber-900/50',
            border: 'border-amber-500'
        },
        {
            id: 'unlock_half',
            title: 'Growing Crew',
            desc: `Unlock ${Math.floor(totalCharacters / 2)} characters.`,
            icon: <Users className="w-8 h-8" />,
            progress: Math.min(unlockedCharactersCount, Math.floor(totalCharacters / 2)),
            target: Math.floor(totalCharacters / 2),
            isUnlocked: unlockedCharactersCount >= Math.floor(totalCharacters / 2),
            points: 30,
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
            points: 100,
            color: 'text-cyan-400',
            bg: 'bg-cyan-900/50',
            border: 'border-cyan-500'
        },
        {
            id: 'gold_10k',
            title: 'Wealthy',
            desc: 'Earn 10,000 Gold across all runs.',
            icon: <Coins className="w-8 h-8" />,
            progress: Math.min(totalGoldEarned, 10000),
            target: 10000,
            isUnlocked: totalGoldEarned >= 10000,
            points: 20,
            color: 'text-yellow-300',
            bg: 'bg-yellow-900/50',
            border: 'border-yellow-400'
        },
        {
            id: 'gold_100k',
            title: 'Filthy Rich',
            desc: 'Earn 100,000 Gold across all runs.',
            icon: <Coins className="w-8 h-8" />,
            progress: Math.min(totalGoldEarned, 100000),
            target: 100000,
            isUnlocked: totalGoldEarned >= 100000,
            points: 50,
            color: 'text-yellow-500',
            bg: 'bg-yellow-900/50',
            border: 'border-yellow-600'
        },
        {
            id: 'level_10',
            title: 'Power Up',
            desc: 'Reach Level 10 in a single run.',
            icon: <ArrowUpCircle className="w-8 h-8" />,
            progress: Math.min(maxLevelReached, 10),
            target: 10,
            isUnlocked: maxLevelReached >= 10,
            points: 30,
            color: 'text-green-400',
            bg: 'bg-green-900/50',
            border: 'border-green-500'
        },
        {
            id: 'level_20',
            title: 'Ascended',
            desc: 'Reach Level 20 in a single run.',
            icon: <ArrowUpCircle className="w-8 h-8" />,
            progress: Math.min(maxLevelReached, 20),
            target: 20,
            isUnlocked: maxLevelReached >= 20,
            points: 100,
            color: 'text-teal-400',
            bg: 'bg-teal-900/50',
            border: 'border-teal-500'
        },
        {
            id: 'survive_7',
            title: 'Time Lord',
            desc: 'Survive for 7 minutes in a single run.',
            icon: <Clock className="w-8 h-8" />,
            progress: Math.min(maxTimeSurvived, 420),
            target: 420,
            isUnlocked: maxTimeSurvived >= 420,
            points: 200,
            color: 'text-fuchsia-400',
            bg: 'bg-fuchsia-900/50',
            border: 'border-fuchsia-500'
        },
        {
            id: 'kills_100000',
            title: 'Sloth God',
            desc: 'Defeat 100,000 enemies across all runs.',
            icon: <Skull className="w-8 h-8" />,
            progress: Math.min(totalKills, 100000),
            target: 100000,
            isUnlocked: totalKills >= 100000,
            points: 200,
            color: 'text-red-600',
            bg: 'bg-red-900/50',
            border: 'border-red-600'
        },
        {
            id: 'gold_1m',
            title: 'Billionaire',
            desc: 'Earn 1,000,000 Gold across all runs.',
            icon: <Coins className="w-8 h-8" />,
            progress: Math.min(totalGoldEarned, 1000000),
            target: 1000000,
            isUnlocked: totalGoldEarned >= 1000000,
            points: 200,
            color: 'text-yellow-200',
            bg: 'bg-yellow-900/50',
            border: 'border-yellow-300'
        },
        {
            id: 'level_30',
            title: 'Beyond Limits',
            desc: 'Reach Level 30 in a single run.',
            icon: <ArrowUpCircle className="w-8 h-8" />,
            progress: Math.min(maxLevelReached, 30),
            target: 30,
            isUnlocked: maxLevelReached >= 30,
            points: 200,
            color: 'text-cyan-200',
            bg: 'bg-cyan-900/50',
            border: 'border-cyan-300'
        },
        {
            id: 'cosmetics_all',
            title: 'Fashionista',
            desc: 'Unlock all 6 cosmetic trails.',
            icon: <Star className="w-8 h-8" />,
            progress: Math.min(totalUnlockedCosmetics, 6),
            target: 6,
            isUnlocked: totalUnlockedCosmetics >= 6,
            points: 100,
            color: 'text-pink-400',
            bg: 'bg-pink-900/50',
            border: 'border-pink-500'
        },
        {
            id: 'talents_15',
            title: 'Skillful',
            desc: 'Unlock 15 character talents.',
            icon: <Star className="w-8 h-8" />,
            progress: Math.min(totalUnlockedTalents, 15),
            target: 15,
            isUnlocked: totalUnlockedTalents >= 15,
            points: 50,
            color: 'text-indigo-400',
            bg: 'bg-indigo-900/50',
            border: 'border-indigo-500'
        },
        {
            id: 'talents_30',
            title: 'Omniscient',
            desc: 'Unlock all 30 character talents.',
            icon: <Star className="w-8 h-8" />,
            progress: Math.min(totalUnlockedTalents, 30),
            target: 30,
            isUnlocked: totalUnlockedTalents >= 30,
            points: 150,
            color: 'text-violet-400',
            bg: 'bg-violet-900/50',
            border: 'border-violet-500'
        }
    ];

    const totalPoints = achievements.reduce((acc, ach) => acc + (ach.isUnlocked ? ach.points : 0), 0);
    const maxPoints = achievements.reduce((acc, ach) => acc + ach.points, 0);

    const formatProgress = (val, target, isTime) => {
        if (isTime) {
            const m1 = Math.floor(val / 60);
            const s1 = val % 60;
            const m2 = Math.floor(target / 60);
            return `${m1}:${s1.toString().padStart(2, '0')} / ${m2}:00`;
        }
        return `${val.toLocaleString()} / ${target.toLocaleString()}`;
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
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8 border-b border-slate-800 pb-8">
                        <div className="flex items-center gap-4">
                            <Trophy className="w-10 h-10 text-yellow-400" />
                            <h1 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
                                ACHIEVEMENTS
                            </h1>
                        </div>
                        <div className="bg-slate-950 px-6 py-3 rounded-xl border border-slate-700 shadow-inner text-center">
                            <div className="text-sm text-slate-400 font-bold mb-1">ACHIEVEMENT POINTS</div>
                            <div className="text-2xl md:text-3xl font-black text-cyan-400">
                                {totalPoints} <span className="text-lg text-slate-500">/ {maxPoints}</span>
                            </div>
                        </div>
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
                                    <div className="flex justify-between items-start mb-1">
                                        <h3 className={`font-bold text-lg ${ach.isUnlocked ? 'text-white' : 'text-slate-400'}`}>
                                            {ach.title}
                                        </h3>
                                        <span className={`font-bold text-sm px-2 py-0.5 rounded ${ach.isUnlocked ? 'bg-yellow-500/20 text-yellow-400' : 'bg-slate-700 text-slate-500'}`}>
                                            {ach.points} pts
                                        </span>
                                    </div>
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