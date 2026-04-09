import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Leaderboard from '../components/game/Leaderboard';
import { SoundManager } from '../game/SoundManager';
import SpaceBackground from '../components/game/SpaceBackground';
import CurrencyHeader from '../components/game/CurrencyHeader';

export default function LeaderboardPage({ isCarousel }) {
    const navigate = useNavigate();

    return (
        <div className={`min-h-screen relative text-slate-200 p-2 pb-20 md:p-6 font-sans`}>

            <div className="max-w-5xl mx-auto">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-2 md:gap-4 mb-4 md:mb-6 border-b border-slate-800 pb-2 md:pb-4">
                    <div>

                        <h1 className="text-2xl md:text-4xl font-black uppercase tracking-widest" style={{ background: 'linear-gradient(90deg, #FBBF24, #F59E0B)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 0 10px rgba(251,191,36,0.5))' }}>HALL OF FAME</h1>
                        <p className="text-slate-400 mt-0.5 md:text-sm text-xs tracking-widest uppercase">The greatest cosmic sloths of all time.</p>
                    </div>
                    <CurrencyHeader />
                </header>

                <div className="bg-[#0b0416]/50 backdrop-blur-xl rounded-xl md:rounded-2xl p-3 md:p-6 border border-yellow-500/50 shadow-[0_0_60px_rgba(245,158,11,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] min-h-[400px] md:min-h-[600px]">
                    <Leaderboard />
                </div>
            </div>
        </div>
    );
}