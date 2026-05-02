import React from 'react';
import { motion } from 'framer-motion';
import { HelpCircle } from 'lucide-react';

// Face-down level-up card used when "Veil of the Unknown" mutation is active.
// Shows only the rarity tint (so build-crafting still has SOME signal) — no
// name, description, stat preview, or upgrade type. The pick reveals itself
// only AFTER the player commits.
const rarityGlow = {
    'Common':     'from-slate-700 to-slate-900 border-slate-500',
    'Rare':       'from-blue-900 to-slate-900 border-blue-500 shadow-[0_0_15px_rgba(96,165,250,0.5)]',
    'Epic':       'from-purple-900 to-slate-900 border-purple-500 shadow-[0_0_18px_rgba(192,132,252,0.6)]',
    'Legendary':  'from-orange-900 to-slate-900 border-orange-500 shadow-[0_0_22px_rgba(251,146,60,0.8)]',
    'Evolution':  'from-red-900 to-slate-900 border-red-500 shadow-[0_0_25px_rgba(239,68,68,0.9)]',
};

export default function MysteryCard({ rarity = 'Common', isSelected, onClick }) {
    const tint = rarityGlow[rarity] || rarityGlow.Common;
    return (
        <motion.button
            onClick={onClick}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`relative p-3 md:p-6 rounded-xl text-center flex flex-col items-center justify-center min-h-[90px] md:min-h-[160px] border-2 cursor-pointer bg-gradient-to-br ${tint} ${isSelected ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-slate-900' : 'hover:brightness-125'}`}
        >
            <HelpCircle className="w-10 h-10 md:w-16 md:h-16 text-white/70" strokeWidth={2.5} />
            <div className="mt-2 text-xs md:text-sm font-black uppercase tracking-widest text-white/80">
                ? ? ?
            </div>
            <div className="mt-1 text-[10px] md:text-xs text-white/50 italic">
                Veil of the Unknown
            </div>
        </motion.button>
    );
}