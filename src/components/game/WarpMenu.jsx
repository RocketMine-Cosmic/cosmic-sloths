import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Compass, X } from 'lucide-react';
import { SoundManager } from '../../game/SoundManager';

const SLIDES = [
    { idx: 0, name: 'Main Menu', icon: '🚀', color: 'from-slate-700 to-slate-900', border: 'border-white/30' },
    { idx: 1, name: 'Sloth Lounge', icon: '🦥', color: 'from-cyan-700 to-cyan-950', border: 'border-cyan-400/50' },
    { idx: 2, name: 'Mission Board', icon: '🎯', color: 'from-emerald-700 to-emerald-950', border: 'border-emerald-400/50' },
    { idx: 3, name: 'Upgrade Lounge', icon: '⚡', color: 'from-fuchsia-700 to-fuchsia-950', border: 'border-fuchsia-400/50' },
    { idx: 4, name: 'Hall of Fame', icon: '🏆', color: 'from-amber-700 to-amber-950', border: 'border-amber-400/50' },
    { idx: 5, name: 'Sloth Squads', icon: '👥', color: 'from-orange-700 to-orange-950', border: 'border-orange-400/50' },
    { idx: 6, name: 'Cosmic Codex', icon: '📖', color: 'from-rose-700 to-rose-950', border: 'border-rose-400/50' },
    { idx: 7, name: 'Synergy Codex', icon: '✨', color: 'from-pink-700 to-pink-950', border: 'border-pink-400/50' },
    { idx: 8, name: 'Mastery', icon: '🎖️', color: 'from-amber-600 to-yellow-900', border: 'border-yellow-400/50' },
    { idx: 9, name: 'Leviathan Trials', icon: '🐉', color: 'from-red-700 to-red-950', border: 'border-red-400/50' },
    { idx: 10, name: 'Global Raid', icon: '⚔️', color: 'from-red-800 to-rose-950', border: 'border-rose-500/60' },
    { idx: 11, name: 'NFT Collection', icon: '💎', color: 'from-purple-700 to-purple-950', border: 'border-purple-400/50' },
    { idx: 12, name: 'Pilot Profile', icon: '🪪', color: 'from-violet-700 to-violet-950', border: 'border-violet-400/50' },
    { idx: 13, name: 'Jukebox', icon: '🎵', color: 'from-fuchsia-600 to-purple-950', border: 'border-fuchsia-400/50' },
    { idx: 14, name: 'Titles', icon: '🏅', color: 'from-amber-700 to-rose-950', border: 'border-amber-400/50' },
];

export default function WarpMenu({ currentIndex, onWarp, currentLabel }) {
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);

    // Close on Escape
    useEffect(() => {
        if (!open) return;
        const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open]);

    const handleWarp = (slide) => {
        SoundManager.playUIClick();
        if (slide.route) {
            navigate(slide.route);
        } else {
            onWarp(slide.idx);
        }
        setOpen(false);
    };

    const handleToggle = () => {
        SoundManager.playUIClick();
        setOpen(o => !o);
    };

    return (
        <>
            {/* Trigger button — shows current page name; tap to open warp grid. Swipe still works on the carousel underneath. */}
            <button
                onClick={handleToggle}
                className="group pointer-events-auto w-full max-w-[600px]"
                title="Warp Menu"
            >
                <div className="relative">
                    <div className="absolute inset-0 bg-fuchsia-500/30 blur-xl rounded-full group-hover:bg-fuchsia-400/50 transition-all" />
                    <div className="relative bg-[#0b0416]/95 backdrop-blur-xl border-2 border-fuchsia-500/60 hover:border-fuchsia-300 px-3 py-2 md:px-5 md:py-3 rounded-full flex items-center justify-center gap-2 md:gap-3 shadow-[0_0_25px_rgba(217,70,239,0.3)] hover:shadow-[0_0_35px_rgba(217,70,239,0.6)] transition-all">
                        <Compass className={`w-4 h-4 md:w-5 md:h-5 text-fuchsia-300 shrink-0 ${open ? 'rotate-180' : 'group-hover:rotate-90'} transition-transform duration-500`} />
                        <span className={`text-sm md:text-base font-black tracking-widest uppercase truncate drop-shadow-[0_0_8px_rgba(255,255,255,0.4)] ${currentLabel?.color || 'text-white'}`}>
                            {currentLabel?.name || 'Warp'}
                        </span>
                        <span className="text-[10px] md:text-xs font-bold tracking-wider uppercase text-fuchsia-400/80 shrink-0 hidden sm:inline">▾ Warp</span>
                    </div>
                </div>
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 md:p-6"
                        onClick={() => setOpen(false)}
                    >
                        <motion.div
                            initial={{ y: 40, opacity: 0, scale: 0.95 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            exit={{ y: 40, opacity: 0, scale: 0.95 }}
                            transition={{ type: 'spring', damping: 24, stiffness: 280 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-3xl bg-[#0b0416]/95 backdrop-blur-xl border-2 border-fuchsia-500/50 rounded-2xl shadow-[0_0_40px_rgba(217,70,239,0.35)] overflow-hidden"
                        >
                            <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-fuchsia-500/30 bg-gradient-to-r from-fuchsia-950/50 via-purple-950/50 to-cyan-950/50">
                                <div className="flex items-center gap-2">
                                    <Compass className="w-4 h-4 md:w-5 md:h-5 text-fuchsia-300" />
                                    <h3 className="text-sm md:text-base font-black tracking-widest uppercase text-white">Warp Destination</h3>
                                </div>
                                <button
                                    onClick={() => setOpen(false)}
                                    className="p-1.5 hover:bg-fuchsia-500/20 rounded-lg text-fuchsia-300 hover:text-white transition-colors"
                                >
                                    <X className="w-4 h-4 md:w-5 md:h-5" />
                                </button>
                            </div>

                            <div className="p-3 md:p-5 max-h-[70vh] overflow-y-auto">
                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 md:gap-3">
                                    {SLIDES.map((s) => {
                                        const isCurrent = s.idx !== undefined && s.idx === currentIndex;
                                        return (
                                            <button
                                                key={s.idx ?? s.route}
                                                onClick={() => handleWarp(s)}
                                                className={`relative bg-gradient-to-br ${s.color} ${s.border} border rounded-xl p-2.5 md:p-3 flex flex-col items-center gap-1.5 transition-all hover:scale-105 hover:brightness-125 hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] ${isCurrent ? 'ring-2 ring-fuchsia-400 ring-offset-2 ring-offset-[#0b0416]' : ''}`}
                                            >
                                                {isCurrent && (
                                                    <span className="absolute top-1 right-1 text-[8px] md:text-[9px] font-black bg-fuchsia-500 text-white px-1 py-0.5 rounded tracking-wider">HERE</span>
                                                )}
                                                <div className="text-2xl md:text-3xl">{s.icon}</div>
                                                <div className="text-[10px] md:text-xs font-bold text-white text-center leading-tight">{s.name}</div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}