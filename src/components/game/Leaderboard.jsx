import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { queryClientInstance } from '@/lib/query-client';
import { CHARACTERS, ARENAS } from '../../game/Constants';
import { getSquadLevel } from '../../game/SquadLevels';
import { getCurrentPeriodIds } from '../../lib/periodIds';
import { useIsIdle } from '@/hooks/useIsIdle';
import { getTitleStyle } from '@/lib/playerTitles';
import { sanitizePilotName } from '@/lib/sanitizePilotName';

function OmenXIcon({ className }) {
    return <img src="https://media.base44.com/images/public/69de258a7e072380b89d66e3/01838179d_omenx_logo.png" className={className} alt="OMENX" />;
}

export default function Leaderboard() {
    const [scores, setScores] = useState([]);
    // wallet_address (lowercased) -> { tag, name, icon } for squad badge display.
    const [squadByWallet, setSquadByWallet] = useState({});
    // Total unique ranked players in the period (capped at 45) — used as the
    // denominator for payout math so the displayed OMENX matches previewPayouts/distributeRewards.
    const [totalRankedPlayers, setTotalRankedPlayers] = useState(0);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('weekly');
    const [timeLeft, setTimeLeft] = useState('');
    const [currentPool, setCurrentPool] = useState(0);

    // Must match functions/distributeRewards.js — payouts capped at top 45.
    const getWeeklyRewardPercentage = (rank) => {
        if (rank === 1) return 0.10;
        if (rank === 2) return 0.08;
        if (rank === 3) return 0.06;
        if (rank >= 4 && rank <= 10) return 0.04;
        if (rank >= 11 && rank <= 20) return 0.03;
        if (rank >= 21 && rank <= 30) return 0.018;
        if (rank >= 31 && rank <= 45) return 0.012;
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
        if (rank >= 41 && rank <= 45) return 0.010;
        return 0;
    };

    // Calculate actual payout amount (mirrors backend distributeRewards/previewPayouts EXACTLY).
    // Backend caps at 45 ranked players and sums percentages over uniqueScores.length (capped at 45),
    // so we must use the SAME denominator here.
    const calculateRewardAmount = (rank, pool, percentageFn, poolMultiplier, totalRankedPlayers) => {
        const rewardPool = Math.floor(pool * poolMultiplier);
        const cappedTotal = Math.min(45, totalRankedPlayers);
        if (cappedTotal === 0) return 0;

        let totalPct = 0;
        for (let i = 1; i <= cappedTotal; i++) {
            totalPct += percentageFn(i);
        }
        if (totalPct === 0) return 0;

        // Payout = (player_pct / total_pct) * reward_pool — backend uses Math.floor.
        return Math.floor((percentageFn(rank) / totalPct) * rewardPool);
    };

    useEffect(() => {
        const updateTimer = () => {
            const now = new Date();
            if (view === 'weekly' || view === 'squads') {
                // Count down to Sunday 23:59 UTC — last moment of the current ISO week.
                // ISO week ends on Sunday, so when today IS Sunday we want 0 days added,
                // not 7 (the old `|| 7` bug rolled the timer forward an entire week).
                const currentDay = now.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat
                const daysUntilSunday = currentDay === 0 ? 0 : 7 - currentDay;
                const endOfWeek = new Date(now);
                endOfWeek.setUTCDate(now.getUTCDate() + daysUntilSunday);
                endOfWeek.setUTCHours(23, 59, 0, 0);
                
                const msLeft = endOfWeek - now;
                const daysLeft = Math.floor(msLeft / (24 * 60 * 60 * 1000));
                const hoursLeft = Math.floor((msLeft % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
                const minutesLeft = Math.floor((msLeft % (60 * 60 * 1000)) / (60 * 1000));
                
                setTimeLeft(`${daysLeft}d ${hoursLeft}h ${minutesLeft}m`);
            } else if (view === 'seasonal') {
                // Count down to Sunday 23:59 UTC of the last week of the current season
                const { isoWeek, year } = getCurrentPeriodIds();
                const seasonNum = Math.floor((isoWeek - 1) / 4) + 1;
                const lastWeekOfSeason = seasonNum * 4; // last ISO week in this season

                // ISO 8601: week 1 is the week containing Jan 4 (or the first Thursday).
                // Find Monday of ISO week 1 — must match Champions countdown exactly.
                const jan1 = new Date(Date.UTC(year, 0, 1));
                const jan1Day = jan1.getUTCDay() || 7; // 1..7 (Mon..Sun)
                const mondayW1 = new Date(jan1);
                mondayW1.setUTCDate(jan1.getUTCDate() - (jan1Day - 1) + (jan1Day <= 4 ? 0 : 7));
                const msPerWeek = 7 * 24 * 60 * 60 * 1000;
                // Monday of lastWeekOfSeason, then +6 days = Sunday
                const mondayOfLastWeek = new Date(mondayW1.getTime() + (lastWeekOfSeason - 1) * msPerWeek);
                // Season ends at Sunday 23:59:59.999 UTC — exactly matches getSquadChampionsStandings.getSeasonEndIso
                const endOfSeason = new Date(mondayOfLastWeek.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
                
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

    // Define poolQueryKey before useEffect dependencies
    const { week_id, season_id } = getCurrentPeriodIds();
    const poolQueryKey = view === 'weekly' ? ['tokenPool', week_id, 'weekly'] : ['tokenPool', season_id, 'seasonal'];
    const fetchTimeoutRef = useRef(null);

    const [lastUpdated, setLastUpdated] = useState(Date.now());
    const pollIntervalRef = useRef(null);
    // Pause polling after 5 min of no activity to save API calls for AFK users
    const isIdle = useIsIdle(5 * 60 * 1000);

    useEffect(() => {
        fetchScores();
    }, [view]);

    // Realtime subscriptions + polling fallback (every 20s while page is visible).
    // The polling is the safety net — realtime keeps it instant, polling guarantees
    // freshness even if the websocket drops or the user has been idle.
    useEffect(() => {
        // All background refreshes are silent (no spinner) so the list
        // doesn't flash every 20s. Only initial load + view change show the spinner.
        const triggerRefetch = (delay = 300) => {
            if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
            fetchTimeoutRef.current = setTimeout(() => fetchScores(true), delay);
        };

        const unsubscribeScores = base44.entities.RunScore.subscribe((event) => {
            if (event.type === 'create' || event.type === 'update') triggerRefetch();
        });
        const unsubscribePool = base44.entities.TokenPool.subscribe((event) => {
            if (event.type === 'create' || event.type === 'update') {
                queryClientInstance.invalidateQueries({ queryKey: poolQueryKey });
                triggerRefetch();
            }
        });
        const unsubscribeSquads = base44.entities.Squad.subscribe((event) => {
            // Only re-fetch if the user is on the Squads view (otherwise irrelevant)
            if ((event.type === 'create' || event.type === 'update') && view === 'squads') {
                triggerRefetch();
            }
        });

        // Polling fallback — every 20s while tab is visible AND user is active.
        // Idle users (5 min no input) get no polling; realtime push still works
        // if it arrives, and we re-fetch instantly when they come back.
        const startPolling = () => {
            if (pollIntervalRef.current || isIdle) return;
            pollIntervalRef.current = setInterval(() => {
                if (!document.hidden && !isIdle) fetchScores(true);
            }, 20000);
        };
        const stopPolling = () => {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
            }
        };
        if (!isIdle) startPolling();

        // Refetch immediately when tab regains focus (catches any missed updates)
        const onVisibilityChange = () => {
            if (!document.hidden) fetchScores(true);
        };
        document.addEventListener('visibilitychange', onVisibilityChange);

        return () => {
            unsubscribeScores();
            unsubscribePool();
            unsubscribeSquads();
            stopPolling();
            document.removeEventListener('visibilitychange', onVisibilityChange);
            if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
        };
    }, [view, isIdle]);

    // Deduplicate TokenPool queries using useQuery (30s stale time)
    const { data: poolData } = useQuery({
        queryKey: poolQueryKey,
        queryFn: async () => {
            if (view === 'squads') return 0;
            const { week_id, season_id } = getCurrentPeriodIds();
            const filter = view === 'weekly' 
                ? { period_id: week_id, period_type: 'weekly' }
                : { period_id: season_id, period_type: 'seasonal' };
            const pools = await base44.entities.TokenPool.filter(filter);
            return pools.length > 0 ? pools[0].total_spent : 0;
        },
        staleTime: 30000, // 30s — deduplicate within this window
        enabled: view === 'weekly' || view === 'seasonal',
    });

    useEffect(() => {
        if (poolData !== undefined) {
            setCurrentPool(poolData);
        }
    }, [poolData]);

    // `silent=true` skips the loading spinner — used for background polling /
    // realtime refreshes so the list doesn't flash empty every 20s. Initial
    // load and view changes still show the spinner.
    const fetchScores = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const { week_id, season_id } = getCurrentPeriodIds();

            const filter = view === 'weekly' ? { week_id } : view === 'seasonal' ? { season_id } : view === 'endless' ? { arena_id: 'endless' } : {};
            
            if (view === 'squads') {
                const squadsData = await base44.entities.Squad.filter({ current_week: week_id }, '-weekly_kills', 50);
                setScores(squadsData);
                setCurrentPool(0);
                setTotalRankedPlayers(0);
                if (!silent) setLoading(false);
                return;
            }

            // Fetch enough scores to mirror the backend's ranked pool (capped at 45 unique).
            const data = await base44.entities.RunScore.filter(filter, '-score', 1000);

            if (view === 'squads') {
                setCurrentPool(0);
            }
            // Pool fetch is now handled by useQuery hook above

            // Deduplicate by user_id (wallet_address is masked by RLS) — count up to
            // 45 unique players for payout math AND display.
            const allUnique = [];
            const seenUserIds = new Set();

            for (const score of data) {
                if (view !== 'endless' && score.arena_id === 'endless') continue;

                const userId = score.user_id;
                if (userId && seenUserIds.has(userId)) continue;
                if (userId) seenUserIds.add(userId);
                allUnique.push(score);

                if (allUnique.length >= 45) break;
            }

            setScores(allUnique);
            setTotalRankedPlayers(allUnique.length); // up to 45 — used as payout denominator
            setLastUpdated(Date.now());

            // Look up squad membership for the displayed players (best-effort, non-blocking).
            // Some RunScore rows may not have wallet_address (older records) — those just won't show a squad.
            try {
                const wallets = [...new Set(allUnique.map(s => (s.wallet_address || '').toLowerCase()).filter(Boolean))];
                if (wallets.length > 0) {
                    const members = await base44.entities.SquadMember.filter({ wallet_address: { $in: wallets } });
                    const squadIds = [...new Set(members.map(m => m.squad_id).filter(Boolean))];
                    const squads = squadIds.length > 0 ? await base44.entities.Squad.filter({ id: { $in: squadIds } }) : [];
                    const squadMap = Object.fromEntries(squads.map(s => [s.id, s]));
                    const result = {};
                    for (const m of members) {
                        const s = squadMap[m.squad_id];
                        if (s) result[(m.wallet_address || '').toLowerCase()] = { tag: s.tag, name: s.name, icon: s.icon };
                    }
                    setSquadByWallet(result);
                } else {
                    setSquadByWallet({});
                }
            } catch (e) {
                console.warn('[Leaderboard] squad lookup failed:', e?.message);
            }
        } catch (error) {
            console.error('Failed to fetch leaderboard', error);
        }
        if (!silent) setLoading(false);
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
                    <div className="flex items-center gap-2">
                        <h2 className="text-xl md:text-2xl font-bold text-white">Hall of Fame</h2>
                        {isIdle ? (
                            <div className="flex items-center gap-1.5 bg-slate-800/60 border border-slate-600/40 px-2 py-0.5 rounded-full" title="Paused — move your mouse to resume live updates">
                                <span className="inline-flex rounded-full h-2 w-2 bg-slate-500"></span>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Paused</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1.5 bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded-full" title={`Last updated ${Math.round((Date.now() - lastUpdated) / 1000)}s ago — auto-refreshes`}>
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Live</span>
                            </div>
                        )}
                    </div>
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
                                const isEligibleForReward = view === 'weekly' || view === 'seasonal';
                                const rewardAmount = view === 'weekly'
                                    ? calculateRewardAmount(index + 1, currentPool, getWeeklyRewardPercentage, 0.20, totalRankedPlayers)
                                    : calculateRewardAmount(index + 1, currentPool, getSeasonalRewardPercentage, 0.30, totalRankedPlayers);

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
                                                    {sanitizePilotName(score.player_name, score.wallet_address || score.user_id)}
                                                </div>
                                                    {score.player_title && (() => {
                                                        const st = getTitleStyle(score.player_title);
                                                        return (
                                                            <span className={`text-[10px] ${st.bg} ${st.text} px-1.5 py-0.5 rounded border ${st.border} tracking-wider font-bold truncate`}>
                                                                {score.player_title}
                                                            </span>
                                                        );
                                                    })()}
                                                </div>
                                                <div className="text-[10px] md:text-xs text-slate-400 truncate mt-0.5 flex items-center gap-2 flex-wrap">
                                                    {(() => {
                                                        const sq = squadByWallet[(score.wallet_address || '').toLowerCase()];
                                                        if (!sq) return null;
                                                        return (
                                                            <span className="flex items-center gap-1 text-orange-300 bg-orange-950/40 border border-orange-700/40 px-1.5 py-0.5 rounded font-bold" title={sq.name}>
                                                                {sq.icon && !sq.icon.startsWith('http') && <span>{sq.icon}</span>}
                                                                [{sq.tag}]
                                                            </span>
                                                        );
                                                    })()}
                                                    {char && (
                                                        <span className="flex items-center gap-1" style={{ color: char.color }}>
                                                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: char.color, boxShadow: `0 0 4px ${char.color}` }}></span>
                                                            {char.name}
                                                        </span>
                                                    )}
                                                    {arena && view !== 'endless' && (
                                                        <span>📍 {arena.name}</span>
                                                    )}
                                                </div>
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