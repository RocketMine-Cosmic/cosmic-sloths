import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

export default function GameOverModal({ stats }) {
    const navigate = useNavigate();
    
    const formatTime = (s) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

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
                        <span className="text-white font-mono text-lg md:text-xl">{stats.kills}</span>
                    </div>
                    <div className="flex justify-between items-center pt-3 md:pt-4 border-t border-slate-700">
                        <span className="text-sm md:text-base text-slate-400">Gold Earned</span>
                        <span className="text-yellow-400 font-mono text-lg md:text-xl">+{stats.gold}</span>
                    </div>
                    {stats.score != null && (
                        <div className="flex justify-between items-center pt-3 md:pt-4 border-t border-slate-700">
                            <span className="text-sm md:text-base text-slate-400">Score Submitted</span>
                            <span className="text-cyan-400 font-mono text-xl md:text-2xl font-bold">{stats.score.toLocaleString()}</span>
                        </div>
                    )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center">
                    <button
                        onClick={() => navigate('/', { state: { slide: 1 } })}
                        className="bg-slate-800 hover:bg-slate-700 text-white px-4 md:px-6 py-3 rounded-lg font-bold transition-colors border border-slate-600 text-sm md:text-base w-full sm:w-auto"
                    >
                        Sloth Lounge
                    </button>
                    <button
                        onClick={() => window.location.reload()}
                        className="bg-red-600 hover:bg-red-500 text-white px-4 md:px-6 py-3 rounded-lg font-bold transition-colors text-sm md:text-base w-full sm:w-auto"
                    >
                        Try Again
                    </button>
                </div>
            </motion.div>
        </div>
    );
}