import React from 'react';
import { motion } from 'framer-motion';

export default function LevelUpModal({ choices, onSelect }) {
    return (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-slate-900 border-2 border-cyan-500 p-8 rounded-xl max-w-2xl w-full"
            >
                <h2 className="text-3xl font-bold text-center text-cyan-400 mb-8 font-mono">LEVEL UP!</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {choices.map((choice, i) => (
                        <button
                            key={i}
                            onClick={() => onSelect(choice)}
                            className="bg-slate-800 hover:bg-slate-700 border border-slate-600 hover:border-cyan-400 p-4 rounded-lg text-left transition-all group"
                        >
                            <div className="text-lg font-bold text-white group-hover:text-cyan-300 mb-2">
                                {choice.name}
                            </div>
                            <div className="text-sm text-slate-400">
                                {choice.desc}
                            </div>
                            <div className="mt-4 text-xs font-mono text-cyan-500/50 uppercase">
                                {choice.type}
                            </div>
                        </button>
                    ))}
                </div>
            </motion.div>
        </div>
    );
}