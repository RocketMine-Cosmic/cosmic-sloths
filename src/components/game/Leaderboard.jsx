import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import moment from 'moment';
import { CHARACTERS } from '../../game/Constants';

export default function Leaderboard() {
    const [scores, setScores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('weekly'); // 'weekly', 'seasonal', or 'all_time'
    const [timeLeft, setTimeLeft] = useState('');
    const [currentPool, setCurrentPool] = useState(0);

    const getWeeklyReward = (rank, pool) => {
        if (rank === 1) return pool * 0.15;
        if (rank === 2) return pool * 0.12;
        if (rank === 3) return pool * 0.09;
        if (rank >= 4 && rank <= 10) return pool * 0.06;
        if (rank >= 11 && rank <= 20) return pool * 0.022;
        return 0;
    };

    const getSeasonalReward = (rank, pool) => {
        if (rank === 1) return pool * 0.12;
        if (rank === 2) return pool * 0.09;
        if (rank === 3) return pool * 0.07;
        if (rank >= 4 && rank <= 10) return pool * 0.045;
        if (rank >= 11 && rank <= 20) return pool * 0.025;
        if (rank >= 21 && rank <= 30) return pool * 0.0155;
        return 0;
    };

    useEffect(() => {
        const updateTimer = () => {
            if (view === 'weekly') {
                const endOfWeek = moment().endOf('week');
                const duration = moment.duration(endOfWeek.diff(moment()));
                setTimeLeft(`${Math.floor(duration.asDays())}d ${duration.hours()}h ${duration.minutes()}m`);
            } else if (view === 'seasonal') {
                const weekNum = moment().week();
                const seasonNum = Math.floor(weekNum / 4) + 1;
                const lastWeekOfSeason = seasonNum * 4 - 1;
                const endOfSeason = moment().week(lastWeekOfSeason).endOf('week');
                const duration = moment.duration(endOfSeason.diff(moment()));
                setTimeLeft(`${Math.floor(duration.asDays())}d ${duration.hours()}h ${duration.minutes()}m`);
            } else {
                setTimeLeft('');
            }
        };
        
        updateTimer();
        const interval = setInterval(updateTimer, 60000);
        return () => clearInterval(interval);
    }, [view]);

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

            const filter = view === 'weekly' ? { week_id } : view === 'seasonal' ? { season_id } : {};
            
            // Fetch top scores (fetch more to allow deduplication)
            const data = await base44.entities.RunScore.filter(filter, '-score', 300);
            
            if (view === 'weekly') {
                const pools = await base44.entities.TokenPool.filter({ period_id: week_id, period_type: 'weekly' });
                setCurrentPool(pools.length > 0 ? pools[0].total_spent : 0);
            } else if (view === 'seasonal') {
                const pools = await base44.entities.TokenPool.filter({ period_id: season_id, period_type: 'seasonal' });
                setCurrentPool(pools.length > 0 ? pools[0].total_spent : 0);
            } else {
                setCurrentPool(0);
            }
            
            // Deduplicate by player_name, keeping the highest score
            const uniqueScores = [];
            const seenPlayers = new Set();
            
            for (const score of data) {
                if (!seenPlayers.has(score.player_name)) {
                    seenPlayers.add(score.player_name);
                    uniqueScores.push(score);
                }
                if (uniqueScores.length >= 50) break;
            }
            
            setScores(uniqueScores);
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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h2 className="text-xl md:text-2xl font-bold text-white">Hall of Fame</h2>
                    {timeLeft && <div className="text-sm text-cyan-400 mt-1 font-bold">Resets in: {timeLeft}</div>}
                </div>
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                    <button 
                        onClick={() => setView('weekly')}
                        className={`flex-1 sm:flex-none px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-bold text-sm md:text-base transition-colors ${view === 'weekly' ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                    >
                        Weekly
                    </button>
                    <button 
                        onClick={() => setView('seasonal')}
                        className={`flex-1 sm:flex-none px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-bold text-sm md:text-base transition-colors ${view === 'seasonal' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                    >
                        Seasonal
                    </button>
                    <button 
                        onClick={() => setView('all_time')}
                        className={`flex-1 sm:flex-none px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-bold text-sm md:text-base transition-colors ${view === 'all_time' ? 'bg-yellow-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                    >
                        All Time
                    </button>
                </div>
            </div>

            <div className="flex-1 bg-slate-800 rounded-xl overflow-hidden border border-slate-700 flex flex-col">
                <div className="overflow-x-auto">
                    <div className="min-w-[600px]">
                        <div className="grid grid-cols-12 gap-2 md:gap-4 p-3 md:p-4 bg-slate-900 border-b border-slate-700 text-xs md:text-sm font-bold text-slate-400">
                            <div className="col-span-1 text-center">Rank</div>
                            <div className="col-span-3">Player</div>
                            <div className="col-span-2 text-right">Score</div>
                            <div className="col-span-2 text-center">Time</div>
                            <div className="col-span-1 text-center">Lvl</div>
                            <div className="col-span-2 text-center">Reward</div>
                            <div className="col-span-1 text-center">Char</div>
                        </div>
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto overflow-x-auto p-2">
                    <div className="min-w-[600px] space-y-2">
                    {loading ? (
                        <div className="flex justify-center items-center h-32">
                            <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : scores.length === 0 ? (
                        <div className="text-center text-slate-500 py-8">
                            No scores recorded yet. Be the first!
                        </div>
                    ) : (
                        <>
                            {scores.map((score, index) => {
                                const char = CHARACTERS.find(c => c.id === score.character_id);
                                return (
                                    <div key={score.id} className="grid grid-cols-12 gap-2 md:gap-4 p-2 md:p-3 bg-slate-900/50 rounded-lg items-center text-xs md:text-base border border-slate-800 hover:border-slate-600 transition-colors">
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
                                        <div className="col-span-1 text-center text-slate-300">
                                            {score.level}
                                        </div>
                                        <div className="col-span-2 text-center text-emerald-400 font-bold">
                                            {view === 'weekly' && index < 20 ? `💠 ${Math.floor(getWeeklyReward(index + 1, currentPool * 0.30))}` : 
                                             view === 'seasonal' && index < 30 ? `💠 ${Math.floor(getSeasonalReward(index + 1, currentPool * 0.40))}` : '-'}
                                        </div>
                                        <div className="col-span-1 flex justify-center">
                                            {char ? (
                                                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 overflow-hidden border border-slate-600 bg-slate-900" style={{ borderColor: char.color }} title={char.name}>
                                                    {char.image ? (
                                                        <img src={char.image} alt={char.name} className="w-full h-full object-cover object-top" />
                                                    ) : (
                                                        <span className="text-xs">🦥</span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-slate-500">-</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </>
                    )}
                    </div>
                </div>
            </div>
        </div>
    );
}