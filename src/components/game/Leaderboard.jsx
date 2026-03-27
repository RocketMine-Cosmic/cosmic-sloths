import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import moment from 'moment';
import { CHARACTERS } from '../../game/Constants';

export default function Leaderboard() {
    const [scores, setScores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('weekly'); // 'weekly' or 'seasonal'

    useEffect(() => {
        fetchScores();
    }, [view]);

    const fetchScores = async () => {
        setLoading(true);
        try {
            const week_id = moment().format('YYYY-[W]ww');
            const weekNum = moment().week();
            const seasonNum = Math.floor(weekNum / 4) + 1;
            const season_id = `${moment().format('YYYY')}-S${seasonNum}`;

            const filter = view === 'weekly' ? { week_id } : { season_id };
            
            // Fetch top 50 scores
            const data = await base44.entities.RunScore.filter(filter, '-score', 50);
            setScores(data);
        } catch (error) {
            console.error('Failed to fetch leaderboard', error);
        }
        setLoading(false);
    };

    const formatTime = (s) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Hall of Fame</h2>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setView('weekly')}
                        className={`px-4 py-2 rounded-lg font-bold transition-colors ${view === 'weekly' ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                    >
                        Weekly
                    </button>
                    <button 
                        onClick={() => setView('seasonal')}
                        className={`px-4 py-2 rounded-lg font-bold transition-colors ${view === 'seasonal' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                    >
                        Seasonal
                    </button>
                </div>
            </div>

            <div className="flex-1 bg-slate-800 rounded-xl overflow-hidden border border-slate-700 flex flex-col">
                <div className="grid grid-cols-12 gap-4 p-4 bg-slate-900 border-b border-slate-700 text-sm font-bold text-slate-400">
                    <div className="col-span-1 text-center">Rank</div>
                    <div className="col-span-3">Player</div>
                    <div className="col-span-2 text-right">Score</div>
                    <div className="col-span-2 text-center">Time</div>
                    <div className="col-span-2 text-center">Level</div>
                    <div className="col-span-2 text-center">Character</div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-2">
                    {loading ? (
                        <div className="flex justify-center items-center h-32">
                            <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : scores.length === 0 ? (
                        <div className="text-center text-slate-500 py-8">
                            No scores recorded yet. Be the first!
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {scores.map((score, index) => {
                                const char = CHARACTERS.find(c => c.id === score.character_id);
                                return (
                                    <div key={score.id} className="grid grid-cols-12 gap-4 p-3 bg-slate-900/50 rounded-lg items-center text-sm md:text-base border border-slate-800 hover:border-slate-600 transition-colors">
                                        <div className="col-span-1 text-center font-bold">
                                            {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                                        </div>
                                        <div className="col-span-3 font-bold text-white truncate" title={score.player_name}>
                                            {score.player_name}
                                        </div>
                                        <div className="col-span-2 text-right font-mono text-cyan-400 font-bold">
                                            {score.score.toLocaleString()}
                                        </div>
                                        <div className="col-span-2 text-center text-slate-300">
                                            {formatTime(score.time_survived)}
                                        </div>
                                        <div className="col-span-2 text-center text-slate-300">
                                            {score.level}
                                        </div>
                                        <div className="col-span-2 flex justify-center">
                                            {char ? (
                                                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: char.color }} title={char.name}>
                                                    <span className="text-xs">🦥</span>
                                                </div>
                                            ) : (
                                                <span className="text-slate-500">-</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}