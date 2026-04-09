import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, Hexagon } from 'lucide-react';

export default function LevelUpModal({ level, choices, onSelect, cosmicTokens, onReroll, onBanish }) {
    const [revealedIndex, setRevealedIndex] = useState(null);
    const [hasRerolled, setHasRerolled] = useState(false);

    React.useEffect(() => {
        setHasRerolled(false);
    }, [level]);

    const handleSelect = (index) => {
        if (revealedIndex === null) {
            setRevealedIndex(index);
        }
    };

    const handleConfirm = () => {
        if (revealedIndex !== null) {
            onSelect(choices[revealedIndex]);
        }
    };

    const rarityColors = {
        'Common': 'text-slate-400 border-slate-500',
        'Rare': 'text-blue-400 border-blue-500 shadow-[0_0_10px_rgba(96,165,250,0.5)]',
        'Epic': 'text-purple-400 border-purple-500 shadow-[0_0_15px_rgba(192,132,252,0.6)]',
        'Legendary': 'text-orange-400 border-orange-500 shadow-[0_0_20px_rgba(251,146,60,0.8)]',
        'Evolution': 'text-red-400 border-red-500 shadow-[0_0_25px_rgba(239,68,68,0.9)]'
    };

    const rarityBg = {
        'Common': 'bg-slate-800',
        'Rare': 'bg-blue-950',
        'Epic': 'bg-purple-950',
        'Legendary': 'bg-orange-950',
        'Evolution': 'bg-red-950'
    };

    return (
        <div className="absolute inset-0 bg-[#040108]/95 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-[#0b0416] border-2 border-cyan-500/80 shadow-[0_0_50px_rgba(6,182,212,0.3)] p-3 md:p-8 rounded-xl max-w-3xl w-full max-h-[95vh] overflow-y-auto flex flex-col items-center relative overflow-hidden"
            >
                <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/10 via-transparent to-purple-500/10 pointer-events-none"></div>
                <div className="absolute top-2 right-2 md:top-4 md:right-4 bg-emerald-950/50 border border-emerald-500/50 px-2 py-1 md:px-3 md:py-1 rounded-lg text-emerald-400 font-bold font-mono text-xs md:text-sm shadow-[0_0_10px_rgba(16,185,129,0.3)] flex items-center gap-1.5">
                    <Hexagon className="w-3 h-3 md:w-4 md:h-4 fill-emerald-400 text-emerald-400" /> {cosmicTokens || 0}
                </div>
                <h2 className="text-xl md:text-3xl font-bold text-center text-cyan-400 mb-1 md:mb-2 font-mono">
                    {revealedIndex === null ? 'CHOOSE A MYSTERY UPGRADE' : 'UPGRADE REVEALED!'}
                </h2>
                <p className="text-slate-400 mb-2 md:mb-8 text-center text-xs md:text-base">
                    {revealedIndex === null ? 'Select one to reveal its true power.' : 'A powerful addition to your arsenal.'}
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-6 w-full mb-4 md:mb-8">
                    {choices.map((choice, i) => {
                        const isRevealed = revealedIndex === i;
                        const isHidden = revealedIndex !== null && revealedIndex !== i;
                        
                        if (isHidden) return (
                            <div key={i} className="opacity-30 scale-95 transition-all duration-500 bg-slate-800 border border-slate-700 p-3 md:p-4 rounded-lg flex items-center justify-center min-h-[90px] md:min-h-[160px]">
                                <span className="text-slate-600 font-bold text-xs md:text-base">Discarded</span>
                            </div>
                        );

                        return (
                            <motion.button
                                key={i}
                                onClick={() => handleSelect(i)}
                                disabled={revealedIndex !== null}
                                className={`relative p-3 md:p-6 rounded-xl text-left transition-all duration-300 flex flex-col min-h-[90px] md:min-h-[160px] border-2 group ${
                                    isRevealed 
                                    ? `${rarityBg[choice.rarity]} ${rarityColors[choice.rarity].split(' ')[1]} ${rarityColors[choice.rarity].split(' ')[2] || ''}` 
                                    : 'bg-[#110822] border-slate-700 hover:border-cyan-400 hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] cursor-pointer overflow-hidden'
                                }`}
                            >
                                <AnimatePresence mode="wait">
                                    {!isRevealed ? (
                                        <motion.div 
                                            key="mystery"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="absolute inset-0 flex flex-col items-center justify-center text-cyan-500"
                                        >
                                            <HelpCircle className="w-8 h-8 md:w-12 md:h-12 mb-1 md:mb-2 animate-pulse" />
                                            <span className="font-bold font-mono text-sm md:text-base">MYSTERY</span>
                                            <span className={`mt-1 md:mt-2 text-[10px] md:text-xs font-bold px-2 py-0.5 md:py-1 rounded bg-black/50 ${rarityColors[choice.rarity].split(' ')[0]}`}>
                                                {choice.rarity}
                                            </span>
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="revealed"
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ duration: 0.3 }}
                                            className="flex flex-col h-full w-full"
                                        >
                                            <div className={`text-[10px] md:text-xs font-bold mb-1 md:mb-2 uppercase tracking-wider ${rarityColors[choice.rarity].split(' ')[0]}`}>
                                                {choice.rarity} {choice.type}
                                            </div>
                                            <div className="text-base md:text-xl font-bold text-white mb-1 md:mb-2 leading-tight">
                                                {choice.name}
                                            </div>
                                            <div className="text-xs md:text-sm text-slate-300 flex-1">
                                                {choice.desc}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.button>
                        );
                    })}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 md:gap-6 mt-2 md:mt-4">
                    {revealedIndex !== null && (
                        <motion.button
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            onClick={handleConfirm}
                            className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 md:py-3 px-6 md:px-8 rounded-lg text-base md:text-lg transition-colors shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                        >
                            Accept Upgrade
                        </motion.button>
                    )}

                    {!hasRerolled && (
                        <motion.button
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            onClick={() => {
                                if ((cosmicTokens || 0) < 2) return;
                                setRevealedIndex(null);
                                setHasRerolled(true);
                                onReroll();
                            }}
                            className={`text-white font-bold py-2 md:py-3 px-6 md:px-8 rounded-lg transition-colors border text-base md:text-lg flex items-center justify-center gap-2 ${(cosmicTokens || 0) < 2 ? 'bg-purple-600/50 border-purple-400/50 opacity-50 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-500 border-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.4)]'}`}
                        >
                            Reroll Choices (2 <Hexagon className="w-4 h-4 fill-current inline" />)
                        </motion.button>
                    )}
                    
                    {revealedIndex !== null && (
                        <motion.button
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            onClick={() => {
                                if ((cosmicTokens || 0) < 1) return;
                                onBanish(choices[revealedIndex]);
                                setRevealedIndex(null);
                            }}
                            className={`text-white font-bold py-2 md:py-3 px-6 md:px-8 rounded-lg transition-colors border text-base md:text-lg flex items-center justify-center gap-2 ${(cosmicTokens || 0) < 1 ? 'bg-red-600/50 border-red-400/50 opacity-50 cursor-not-allowed' : 'bg-red-600 hover:bg-red-500 border-red-400 shadow-[0_0_10px_rgba(239,68,68,0.4)]'}`}
                        >
                            Banish (1 <Hexagon className="w-4 h-4 fill-current inline" />)
                        </motion.button>
                    )}
                </div>
            </motion.div>
        </div>
    );
}