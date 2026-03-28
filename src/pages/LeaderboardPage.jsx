import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Leaderboard from '../components/game/Leaderboard';
import { SoundManager } from '../game/SoundManager';

export default function LeaderboardPage() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 p-4 pb-24 md:p-8 font-mono">
            <div className="max-w-5xl mx-auto">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8 border-b border-slate-800 pb-4">
                    <div>
                        <button 
                            onClick={() => { SoundManager.playUIClick(); navigate('/'); }}
                            className="mb-4 flex items-center gap-2 text-slate-400 hover:text-white transition-colors font-bold text-sm bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-700 w-fit"
                        >
                            <ArrowLeft className="w-4 h-4" /> Main Menu
                        </button>
                        <h1 className="text-3xl md:text-4xl font-bold text-yellow-400 tracking-tight">HALL OF FAME</h1>
                        <p className="text-slate-400 mt-1 text-sm md:text-base">The greatest cosmic sloths of all time.</p>
                    </div>
                </header>

                <div className="bg-slate-900 rounded-2xl p-4 md:p-8 border border-slate-800 min-h-[500px] md:min-h-[600px]">
                    <Leaderboard />
                </div>
            </div>
        </div>
    );
}