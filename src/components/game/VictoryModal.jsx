import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ARENAS } from '../../game/Constants';
import RunStatsBox from './RunStatsBox';

export default function VictoryModal({ stats }) {
    const navigate = useNavigate();

    return (
        <div
            className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-2 sm:p-4"
            style={{
                paddingTop: 'max(env(safe-area-inset-top, 0px), 0.5rem)',
                paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 0.5rem)',
            }}
        >
            <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="bg-slate-900 border-2 border-yellow-500 rounded-xl max-w-md w-full text-center flex flex-col max-h-full overflow-hidden"
            >
                <div className="p-4 sm:p-6 md:p-8 pb-2 md:pb-4 shrink-0">
                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-yellow-500 mb-1 sm:mb-2 font-mono">MISSION ACCOMPLISHED</h2>
                    <p className="text-xs sm:text-sm md:text-base text-slate-400">You survived the cosmic onslaught!</p>
                </div>

                <div className="flex-1 overflow-y-auto px-4 sm:px-6 md:px-8 min-h-0">
                    <RunStatsBox stats={stats} accentClass="border-slate-700" />
                </div>

                <div className="p-4 sm:p-6 md:p-8 pt-2 md:pt-4 shrink-0">
                    {/* Wait until the server has saved this run before letting the player start a new one — otherwise the in-flight save could clobber the new run's progress. */}
                    {!stats.score ? (
                        <div className="text-center text-xs md:text-sm text-slate-400 italic flex items-center justify-center gap-2">
                            <span className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin inline-block" />
                            Saving run progress…
                        </div>
                    ) : (
                        (() => {
                            const isRaid = stats.arenaId === 'world_boss_arena';
                            if (isRaid) {
                                return (
                                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 md:gap-4 justify-center">
                                        <button
                                            onClick={() => navigate('/?slide=10', { state: { slide: 10 } })}
                                            className="bg-yellow-600 hover:bg-yellow-500 text-slate-900 px-4 md:px-6 py-2.5 md:py-3 rounded-lg font-bold transition-colors text-sm md:text-base w-full sm:w-auto"
                                        >
                                            Exit to Global Raid
                                        </button>
                                        <button
                                            onClick={() => {
                                                navigate('/game', { state: { characterId: stats.characterId, arenaId: stats.arenaId, difficultyId: stats.difficultyId || 'normal', isEndless: false, startingWeaponId: stats.startingWeaponId, worldBossId: stats.worldBossId, worldBossName: stats.worldBossName, _retry: Date.now() }, replace: true });
                                            }}
                                            className="bg-red-600 hover:bg-red-500 text-white px-4 md:px-6 py-2.5 md:py-3 rounded-lg font-bold transition-colors text-sm md:text-base w-full sm:w-auto"
                                        >
                                            Try Again
                                        </button>
                                    </div>
                                );
                            }
                            return (
                                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 md:gap-4 justify-center">
                                    <button
                                        onClick={() => navigate('/', { state: { slide: 1 } })}
                                        className="bg-yellow-600 hover:bg-yellow-500 text-slate-900 px-4 md:px-6 py-2.5 md:py-3 rounded-lg font-bold transition-colors text-sm md:text-base w-full sm:w-auto"
                                    >
                                        Return to Lounge
                                    </button>
                                    <button
                                        onClick={() => {
                                            const currentIndex = ARENAS.findIndex(a => a.id === stats.arenaId);
                                            const nextArena = currentIndex >= 0 && currentIndex < ARENAS.length - 1 ? ARENAS[currentIndex + 1] : ARENAS[currentIndex];
                                            navigate('/game', { state: { characterId: stats.characterId, arenaId: nextArena.id, difficultyId: stats.difficultyId || 'normal', isEndless: stats.isEndless || false, startingWeaponId: stats.startingWeaponId, _retry: Date.now() }, replace: true });
                                        }}
                                        className="bg-yellow-600 hover:bg-yellow-500 text-slate-900 px-4 md:px-6 py-2.5 md:py-3 rounded-lg font-bold transition-colors text-sm md:text-base w-full sm:w-auto"
                                    >
                                        Try Next Sector
                                    </button>
                                </div>
                            );
                        })()
                    )}
                </div>
            </motion.div>
        </div>
    );
}