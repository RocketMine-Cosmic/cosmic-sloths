import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle } from 'lucide-react';

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
        <div className="absolute inset-0 bg-black/95 flex items-center justify-center z-50 p-4">
            <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-slate-900 border-2 border-cyan-500 p-3 md:p-8 rounded-xl max-w-3xl w-full max-h-[95vh] overflow-y-auto flex flex-col items-center"
            >
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
                                className={`relative p-3 md:p-6 rounded-xl text-left transition-colors duration-300 flex flex-col min-h-[90px] md:min-h-[160px] border-2 ${
                                    isRevealed 
                                    ? `${rarityBg[choice.rarity]} ${rarityColors[choice.rarity].split(' ')[1]} ${rarityColors[choice.rarity].split(' ')[2] || ''}` 
                                    : 'bg-slate-800 border-slate-600 hover:border-cyan-400 hover:shadow-[0_0_15px_rgba(6,182,212,0.3)] cursor-pointer'
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

                    {!hasRerolled && (cosmicTokens || 0) >= 10 && (
                        <motion.button
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            onClick={() => {
                                setRevealedIndex(null);
                                setHasRerolled(true);
                                onReroll();
                            }}
                            className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 md:py-3 px-6 md:px-8 rounded-lg transition-colors border border-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.4)] text-base md:text-lg"
                        >
                            Reroll Choices (10 💠)
                        </motion.button>
                    )}
                    
                    {revealedIndex !== null && (cosmicTokens || 0) >= 5 && (
                        <motion.button
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            onClick={() => {
                                onBanish(choices[revealedIndex]);
                                setRevealedIndex(null);
                            }}
                            className="bg-red-600 hover:bg-red-500 text-white font-bold py-2 md:py-3 px-6 md:px-8 rounded-lg transition-colors border border-red-400 shadow-[0_0_10px_rgba(239,68,68,0.4)] text-base md:text-lg"
                        >
                            Banish (5 💠)
                        </motion.button>
                    )}
                </div>
            </motion.div>
        </div>
    );
}