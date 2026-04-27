import React from 'react';
import { motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';

export default function GameOverModal({ stats }) {
    const navigate = useNavigate();
    const location = useLocation();
    
    const formatTime = (s) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    const totalDamage = Math.floor(stats.totalDamageDealt || 0);
    const dps = stats.time > 0 ? Math.floor(totalDamage / stats.time) : 0;
    const kpm = stats.time > 0 ? Math.floor((stats.kills / stats.time) * 60) : 0;
    const topEnemies = Object.entries(stats.enemyKills || {})
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);
    const formatEnemyName = (id) => id.replace(/^boss_/, '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    return (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div 
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="bg-slate-900 border-2 border-red-500 p-6 md:p-8 rounded-xl max-w-md w-full text-center max-h-[90vh] overflow-y-auto"
            >
                <h2 className="text-3xl md:text-4xl font-bold text-red-500 mb-2 font-mono">SLOTH DOWN</h2>
                <p className="text-sm md:text-base text-slate-400 mb-6 md:mb-8">Even sloths need a break...</p>
                
                <div className="space-y-3 md:space-y-4 mb-6 md:mb-8 text-left bg-slate-800 p-4 md:p-6 rounded-lg border border-slate-700">
                    <div className="flex justify-between items-center">
                        <span className="text-sm md:text-base text-slate-400">Time Survived</span>
                        <span className="text-white font-mono text-lg md:text-xl">{formatTime(stats.time)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-sm md:text-base text-slate-400">Level Reached</span>
                        <span className="text-cyan-400 font-mono text-lg md:text-xl">{stats.level}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-sm md:text-base text-slate-400">Enemies Defeated</span>
                        <span className="text-white font-mono text-lg md:text-xl">{stats.kills} <span className="text-[10px] text-slate-500">({kpm}/min)</span></span>
                    </div>
                    {(stats.bossesKilled > 0 || stats.elitesKilled > 0) && (
                        <div className="flex justify-between items-center text-xs md:text-sm">
                            <span className="text-slate-500">Bosses / Elites</span>
                            <span className="text-rose-400 font-mono">{stats.bossesKilled || 0} <span className="text-slate-600">/</span> <span className="text-amber-400">{stats.elitesKilled || 0}</span></span>
                        </div>
                    )}
                    <div className="flex justify-between items-center pt-3 md:pt-4 border-t border-slate-700">
                        <span className="text-sm md:text-base text-slate-400">Total Damage</span>
                        <span className="text-orange-400 font-mono text-lg md:text-xl">{totalDamage.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs md:text-sm">
                        <span className="text-slate-500">Average DPS</span>
                        <span className="text-orange-300 font-mono">{dps.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center pt-3 md:pt-4 border-t border-slate-700">
                        <span className="text-sm md:text-base text-slate-400">Gold Earned</span>
                        <span className="text-yellow-400 font-mono text-lg md:text-xl">+{stats.gold}</span>
                    </div>
                    {topEnemies.length > 0 && (
                        <div className="pt-3 md:pt-4 border-t border-slate-700">
                            <div className="text-xs text-slate-500 mb-1.5">Most Hunted</div>
                            <div className="space-y-1">
                                {topEnemies.map(([id, count]) => (
                                    <div key={id} className="flex justify-between text-xs">
                                        <span className="text-slate-400 truncate">{formatEnemyName(id)}</span>
                                        <span className="text-cyan-300 font-mono ml-2">×{count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {(stats.endlessGoldCapped || stats.endlessKillsCapped) && (
                        <div className="text-[10px] md:text-xs text-amber-400/80 italic text-right -mt-2">
                            Endless mode caps applied to credited rewards
                        </div>
                    )}
                    {stats.worldBossDamage > 0 && (
                        <div className="flex justify-between items-center pt-3 md:pt-4 border-t border-slate-700">
                            <span className="text-sm md:text-base text-slate-400">Boss Damage Dealt</span>
                            <span className="text-red-500 font-mono text-xl md:text-2xl font-bold">{Math.floor(stats.worldBossDamage).toLocaleString()}</span>
                        </div>
                    )}
                    {stats.score != null && (
                        <div className="flex justify-between items-center pt-3 md:pt-4 border-t border-slate-700">
                            <span className="text-sm md:text-base text-slate-400">Score Submitted</span>
                            <span className="text-cyan-400 font-mono text-xl md:text-2xl font-bold">{stats.score.toLocaleString()}</span>
                        </div>
                    )}
                </div>

                {/* Wait until the server has saved this run before letting the player start a new one — otherwise the in-flight save could clobber the new run's progress. */}
                {!stats.score ? (
                    <div className="text-center text-xs md:text-sm text-slate-400 italic flex items-center justify-center gap-2">
                        <span className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin inline-block" />
                        Saving run progress…
                    </div>
                ) : (
                    <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center">
                        <button
                            onClick={() => navigate('/', { state: { slide: 1 } })}
                            className="bg-slate-800 hover:bg-slate-700 text-white px-4 md:px-6 py-3 rounded-lg font-bold transition-colors border border-slate-600 text-sm md:text-base w-full sm:w-auto"
                        >
                            Sloth Lounge
                        </button>
                        <button
                            onClick={() => {
                                navigate('/game', { state: { characterId: stats.characterId, arenaId: stats.arenaId, difficultyId: stats.difficultyId || 'normal', isEndless: stats.isEndless || false, startingWeaponId: stats.startingWeaponId, _retry: Date.now() }, replace: true });
                            }}
                            className="bg-red-600 hover:bg-red-500 text-white px-4 md:px-6 py-3 rounded-lg font-bold transition-colors text-sm md:text-base w-full sm:w-auto"
                        >
                            Try Again
                        </button>
                    </div>
                )}
            </motion.div>
        </div>
    );
}