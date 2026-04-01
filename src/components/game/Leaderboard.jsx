import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import moment from 'moment';
import { CHARACTERS, ARENAS } from '../../game/Constants';
import { getSquadLevel } from '../../game/SquadLevels';

export default function Leaderboard() {
    const [scores, setScores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('weekly'); // 'weekly', 'seasonal', 'all_time', 'endless', or 'squads'
    const [timeLeft, setTimeLeft] = useState('');
    const [currentPool, setCurrentPool] = useState(0);

    const getWeeklyRewardPercentage = (rank) => {
        if (rank === 1) return 0.15;
        if (rank === 2) return 0.12;
        if (rank === 3) return 0.09;
        if (rank >= 4 && rank <= 10) return 0.06;
        if (rank >= 11 && rank <= 20) return 0.022;
        if (rank >= 21 && rank <= 30) return 0.01;
        return 0;
    };

    const getSeasonalRewardPercentage = (rank) => {
        if (rank === 1) return 0.12;
        if (rank === 2) return 0.09;
        if (rank === 3) return 0.07;
        if (rank >= 4 && rank <= 10) return 0.045;
        if (rank >= 11 && rank <= 20) return 0.025;
        if (rank >= 21 && rank <= 30) return 0.0155;
        if (rank >= 31 && rank <= 40) return 0.01;
        return 0;
    };

    useEffect(() => {
        const updateTimer = () => {
            if (view === 'weekly' || view === 'squads') {
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

            const filter = view === 'weekly' ? { week_id } : view === 'seasonal' ? { season_id } : view === 'endless' ? { arena_id: 'endless' } : {};
            
            if (view === 'squads') {
                const squadsData = await base44.entities.Squad.filter({ current_week: week_id }, '-weekly_kills', 50);
                setScores(squadsData);
                setCurrentPool(0);
                setLoading(false);
                return;
            }

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
            // Exclude endless runs from weekly/seasonal/all_time views
            const uniqueScores = [];
            const seenUserIds = new Set();
            const seenPilotNames = new Set();

            for (const score of data) {
                if (view !== 'endless' && score.arena_id === 'endless') continue;

                // Deduplicate by user_id (primary) AND pilot name (secondary, catches old records)
                const userId = score.user_id;
                const pilotName = (score.player_name || '').toLowerCase().trim();

                if ((userId && seenUserIds.has(userId)) || (pilotName && seenPilotNames.has(pilotName))) continue;

                if (userId) seenUserIds.add(userId);
                if (pilotName) seenPilotNames.add(pilotName);
                uniqueScores.push(score);

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

    let totalWeeklyPercentage = 0;
    let totalSeasonalPercentage = 0;
    
    if (view === 'weekly') {
        for (let i = 0; i < Math.min(scores.length, 30); i++) {
            totalWeeklyPercentage += getWeeklyRewardPercentage(i + 1);
        }
    } else if (view === 'seasonal') {
        for (let i = 0; i < Math.min(scores.length, 40); i++) {
            totalSeasonalPercentage += getSeasonalRewardPercentage(i + 1);
        }
    }
    
    const weeklyMultiplier = totalWeeklyPercentage > 0 ? 1 / totalWeeklyPercentage : 1;
    const seasonalMultiplier = totalSeasonalPercentage > 0 ? 1 / totalSeasonalPercentage : 1;

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

                    <button 
                        onClick={() => setView('endless')}
                        className={`flex-1 sm:flex-none px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-bold text-sm md:text-base transition-colors ${view === 'endless' ? 'bg-pink-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                    >
                        Endless
                    </button>
                    <button 
                        onClick={() => setView('squads')}
                        className={`flex-1 sm:flex-none px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-bold text-sm md:text-base transition-colors ${view === 'squads' ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                    >
                        Squads
                    </button>
                </div>
            </div>

            <div className="flex-1 bg-[#0b0416]/40 rounded-xl overflow-hidden border-0 flex flex-col">
                <div className="flex-1 overflow-y-auto p-2 md:p-4">
                    <div className="space-y-3">
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
                                const arena = ARENAS.find(a => a.id === score.arena_id);
                                const isEligibleForReward = (view === 'weekly' && index < 30) || (view === 'seasonal' && index < 40);
                                const rewardAmount = view === 'weekly' 
                                    ? Math.floor((currentPool * 0.30) * getWeeklyRewardPercentage(index + 1) * weeklyMultiplier) 
                                    : Math.floor((currentPool * 0.40) * getSeasonalRewardPercentage(index + 1) * seasonalMultiplier);

                                if (view === 'squads') {
                                    const squadLvl = getSquadLevel(score.xp || 0);
                                    return (
                                        <div key={score.id} className="flex flex-col sm:flex-row gap-3 p-3 bg-slate-900/50 rounded-lg items-center transition-colors"
                                            style={{ border: `1px solid ${squadLvl.borderColor}60`, boxShadow: index < 3 ? `0 0 12px ${squadLvl.glowColor}` : 'none' }}
                                        >
                                            <div className="flex items-center justify-between sm:justify-start gap-3 w-full sm:w-auto sm:min-w-[80px]">
                                                <div className="text-xl md:text-2xl font-bold w-10 text-center">
                                                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center gap-3 flex-1 w-full sm:w-auto bg-slate-950/30 p-2 rounded-lg sm:bg-transparent sm:p-0">
                                                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center shrink-0 border-2 bg-slate-800 text-xl overflow-hidden"
                                                    style={{ borderColor: squadLvl.borderColor }}
                                                >
                                                    {(score.icon || squadLvl.badge).startsWith('http') ? <img src={score.icon} className="w-full h-full object-cover" alt="squad" /> : (score.icon || squadLvl.badge)}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-white text-lg md:text-xl flex items-center gap-2">
                                                        <span style={{ color: squadLvl.borderColor }}>{score.name}</span>
                                                        <span className="text-[10px] md:text-xs bg-slate-800 px-1.5 py-0.5 rounded border"
                                                            style={{ color: squadLvl.borderColor, borderColor: squadLvl.borderColor + '60' }}
                                                        >[{score.tag}]</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                                                            style={{ color: squadLvl.borderColor, background: squadLvl.glowColor }}
                                                        >Lv.{squadLvl.level} {squadLvl.name}</span>
                                                        <span className="text-xs text-slate-400">{score.member_count || 1} Members</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-end gap-4 w-full sm:w-auto text-sm bg-slate-950/50 p-3 rounded-lg sm:bg-transparent sm:p-0">
                                                <div className="text-right">
                                                    <div className="text-slate-500 text-[10px] uppercase font-bold mb-1">Weekly Kills</div>
                                                    <div className="font-mono font-bold text-lg md:text-xl" style={{ color: squadLvl.borderColor }}>{(score.weekly_kills || 0).toLocaleString()}</div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }

                                return (
                                    <div key={score.id} className="flex flex-col sm:flex-row gap-3 p-3 bg-slate-900/50 rounded-lg items-center border border-slate-800 hover:border-slate-600 transition-colors">
                                        
                                        {/* Rank & Reward */}
                                        <div className="flex items-center justify-between sm:justify-start gap-3 w-full sm:w-auto sm:min-w-[180px]">
                                            <div className="text-xl md:text-2xl font-bold w-10 text-center">
                                                {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                                            </div>
                                            {isEligibleForReward ? (
                                                <div className="bg-emerald-900/30 border border-emerald-500/50 text-emerald-400 px-3 py-1.5 rounded-md font-bold text-sm flex items-center gap-1.5 shadow-[0_0_10px_rgba(16,185,129,0.15)]">
                                                    💠 {rewardAmount}
                                                </div>
                                            ) : (
                                                <div className="hidden sm:block w-[80px]"></div>
                                            )}
                                        </div>

                                        {/* Player Info */}
                                        <div className="flex items-center gap-3 flex-1 w-full sm:w-auto">
                                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-slate-900 border-2 border-slate-700 flex items-center justify-center shrink-0 text-xl overflow-hidden">
                                                {score.pilot_icon?.startsWith('http') ? <img src={score.pilot_icon} className="w-full h-full object-cover" alt="pilot" /> : (score.pilot_icon || '🦥')}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-bold text-white text-lg md:text-xl truncate">
                                                    {score.player_name?.includes('@') ? score.player_name.split('@')[0] : score.player_name}
                                                </div>
                                                {arena && view !== 'endless' && (
                                                    <div className="text-[10px] md:text-xs text-slate-400 truncate mt-0.5">
                                                        📍 {arena.name}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Stats */}
                                        <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto text-sm bg-slate-950/50 p-3 rounded-lg sm:bg-transparent sm:p-0">
                                            <div className="text-center sm:text-right">
                                                <div className="text-slate-500 text-[10px] uppercase font-bold sm:hidden mb-1">Score</div>
                                                <div className="font-mono text-cyan-400 font-bold text-lg md:text-xl">{(score.score || 0).toLocaleString()}</div>
                                            </div>
                                            <div className="text-center sm:text-right">
                                                <div className="text-slate-500 text-[10px] uppercase font-bold sm:hidden mb-1">Time</div>
                                                <div className="text-slate-300 font-mono text-base md:text-lg">{formatTime(score.time_survived || 0)}</div>
                                            </div>
                                            <div className="text-center sm:text-right">
                                                <div className="text-slate-500 text-[10px] uppercase font-bold sm:hidden mb-1">Level</div>
                                                <div className="text-slate-300 font-mono text-base md:text-lg">Lv.{score.level || 1}</div>
                                            </div>
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