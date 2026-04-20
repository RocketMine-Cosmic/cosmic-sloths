import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { CHARACTERS, ARENAS } from '../../game/Constants';
import { getSquadLevel } from '../../game/SquadLevels';
import { getCurrentPeriodIds } from '../../lib/periodIds';

function OmenXIcon({ className }) {
    return <img src="https://media.base44.com/images/public/69de258a7e072380b89d66e3/01838179d_omenx_logo.png" className={className} alt="OMENX" />;
}

export default function Leaderboard() {
    const [scores, setScores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('weekly');
    const [timeLeft, setTimeLeft] = useState('');
    const [currentPool, setCurrentPool] = useState(0);

    const getWeeklyRewardPercentage = (rank) => {
        if (rank === 1) return 0.10;
        if (rank === 2) return 0.08;
        if (rank === 3) return 0.06;
        if (rank >= 4 && rank <= 10) return 0.04;
        if (rank >= 11 && rank <= 20) return 0.03;
        if (rank >= 21 && rank <= 30) return 0.018;
        return 0;
    };

    const getSeasonalRewardPercentage = (rank) => {
        if (rank === 1) return 0.08;
        if (rank === 2) return 0.06;
        if (rank === 3) return 0.05;
        if (rank >= 4 && rank <= 10) return 0.03;
        if (rank >= 11 && rank <= 20) return 0.025;
        if (rank >= 21 && rank <= 30) return 0.02;
        if (rank >= 31 && rank <= 40) return 0.015;
        return 0;
    };

    // Calculate actual payout amount (mirrors backend distributeRewards exactly)
    const calculateRewardAmount = (rank, pool, percentageFn, poolMultiplier, totalPlayers) => {
        const rewardPool = Math.floor(pool * poolMultiplier);
        
        // Normalize percentages based on actual player count
        let totalPct = 0;
        for (let i = 1; i <= totalPlayers; i++) {
            totalPct += percentageFn(i);
        }
        if (totalPct === 0) return 0;
        const multiplier = 1 / totalPct;
        
        return Math.floor(rewardPool * percentageFn(rank) * multiplier);
    };

    useEffect(() => {
        const updateTimer = () => {
            const now = new Date();
            if (view === 'weekly' || view === 'squads') {
                // Calculate next Monday (UTC) — weekly period resets Monday
                const currentDay = now.getUTCDay();
                const daysUntilMonday = (1 - currentDay + 7) % 7 || 7;
                const endOfWeek = new Date(now);
                endOfWeek.setUTCDate(now.getUTCDate() + daysUntilMonday);
                endOfWeek.setUTCHours(0, 0, 0, 0);
                
                const msLeft = endOfWeek - now;
                const daysLeft = Math.floor(msLeft / (24 * 60 * 60 * 1000));
                const hoursLeft = Math.floor((msLeft % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
                const minutesLeft = Math.floor((msLeft % (60 * 60 * 1000)) / (60 * 1000));
                
                setTimeLeft(`${daysLeft}d ${hoursLeft}h ${minutesLeft}m`);
            } else if (view === 'seasonal') {
                // Calculate last Sunday of current season (seasons are 4 weeks)
                const { isoWeek, year } = getCurrentPeriodIds();
                const seasonNum = Math.floor((isoWeek - 1) / 4) + 1;
                const lastWeekOfSeason = seasonNum * 4;
                
                // ISO week to date conversion
                const startOfYear = new Date(Date.UTC(year, 0, 1));
                const startOfWeek = new Date(startOfYear);
                startOfWeek.setUTCDate(startOfYear.getUTCDate() - startOfYear.getUTCDay() + 1);
                
                // Calculate Sunday of last week of season
                const msPerWeek = 7 * 24 * 60 * 60 * 1000;
                const endOfSeason = new Date(startOfWeek.getTime() + (lastWeekOfSeason) * msPerWeek);
                endOfSeason.setUTCHours(0, 0, 0, 0);
                
                const msLeft = endOfSeason - now;
                const daysLeft = Math.floor(msLeft / (24 * 60 * 60 * 1000));
                const hoursLeft = Math.floor((msLeft % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
                const minutesLeft = Math.floor((msLeft % (60 * 60 * 1000)) / (60 * 1000));
                
                setTimeLeft(`${daysLeft}d ${hoursLeft}h ${minutesLeft}m`);
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

    // Poll pool updates every 30 seconds without re-fetching scores
    useEffect(() => {
        const updatePool = async () => {
            try {
                const { week_id, season_id } = getCurrentPeriodIds();
                if (view === 'weekly') {
                    const pools = await base44.entities.TokenPool.filter({ period_id: week_id, period_type: 'weekly' });
                    setCurrentPool(pools.length > 0 ? pools[0].total_spent : 0);
                } else if (view === 'seasonal') {
                    const pools = await base44.entities.TokenPool.filter({ period_id: season_id, period_type: 'seasonal' });
                    setCurrentPool(pools.length > 0 ? pools[0].total_spent : 0);
                }
            } catch (error) {
                console.error('Failed to update pool', error);
            }
        };
        
        const interval = setInterval(updatePool, 30000);
        return () => clearInterval(interval);
    }, [view]);

    const fetchScores = async () => {
        setLoading(true);
        try {
            const { week_id, season_id } = getCurrentPeriodIds();

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
                console.log('[Leaderboard] Weekly pool query:', { week_id, found: pools.length, pool: pools[0] });
                const poolAmount = pools.length > 0 ? pools[0].total_spent : 0;
                setCurrentPool(poolAmount);
            } else if (view === 'seasonal') {
                const pools = await base44.entities.TokenPool.filter({ period_id: season_id, period_type: 'seasonal' });
                console.log('[Leaderboard] Seasonal pool query:', { season_id, found: pools.length, pool: pools[0] });
                const poolAmount = pools.length > 0 ? pools[0].total_spent : 0;
                setCurrentPool(poolAmount);
            } else {
                setCurrentPool(0);
            }
            
            // Deduplicate strictly by wallet_address (primary), then user_id fallback
            // This mirrors the backend distributeRewards logic exactly
            const uniqueScores = [];
            const seenWallets = new Set();
            const seenUserIds = new Set();

            for (const score of data) {
                if (view !== 'endless' && score.arena_id === 'endless') continue;

                const wallet = score.wallet_address;
                const userId = score.user_id;

                if (wallet && seenWallets.has(wallet)) continue;
                if (userId && seenUserIds.has(userId)) continue;

                if (wallet) seenWallets.add(wallet);
                if (userId) seenUserIds.add(userId);
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
                                    ? calculateRewardAmount(index + 1, currentPool, getWeeklyRewardPercentage, 0.25, scores.length)
                                    : calculateRewardAmount(index + 1, currentPool, getSeasonalRewardPercentage, 0.35, scores.length);

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
                                                <div className="bg-emerald-900/30 border border-emerald-500/50 text-emerald-400 px-3 py-1.5 rounded-md font-bold text-sm flex items-center gap-1.5 shadow-[0_0_10px_rgba(16,185,129,0.15)]" title="OMENX paid directly to your wallet">
                                                    <OmenXIcon className="w-4 h-4" /> {rewardAmount.toFixed(2)} <span className="text-[10px] text-emerald-600 font-bold tracking-wider">OMENX</span>
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
                                            <div className="flex items-center gap-2 truncate">
                                                <div className="font-bold text-white text-lg md:text-xl truncate">
                                                    {score.player_name}
                                                </div>
                                                    {score.player_title && (
                                                        <span className="text-[10px] bg-slate-900/80 text-amber-300 px-1.5 py-0.5 rounded border border-amber-900/50 tracking-wider font-bold truncate">
                                                            {score.player_title}
                                                        </span>
                                                    )}
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