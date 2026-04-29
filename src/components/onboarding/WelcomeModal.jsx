import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, X, Rocket, Wallet, Compass, Swords, Trophy } from 'lucide-react';
import { SoundManager } from '../../game/SoundManager';

const STORAGE_KEY = 'cosmic_sloths_welcome_seen_v1';

const STEPS = [
    {
        icon: Rocket,
        accent: 'text-cyan-300',
        border: 'border-cyan-500/40',
        title: 'Welcome, Pilot',
        body: (
            <>
                <p><span className="text-cyan-300 font-bold">Cosmic Sloths</span> is a fast roguelike survival game. Pick a pilot, drop into an arena, and stack weapon upgrades to last as long as you can.</p>
                <p className="mt-2 text-slate-400">The top of the weekly leaderboard splits a real <span className="text-amber-300 font-bold">$OMENX</span> reward pool.</p>
            </>
        ),
    },
    {
        icon: Wallet,
        accent: 'text-amber-300',
        border: 'border-amber-500/40',
        title: 'Sign In & Connect Wallet',
        body: (
            <>
                <p>On the <span className="text-white font-bold">Main Menu</span>, tap the button at the bottom to <span className="text-cyan-300 font-bold">Sign In</span>, then <span className="text-purple-300 font-bold">Connect Wallet</span> to link your OMENX wallet.</p>
                <p className="mt-2 text-amber-200/90 bg-amber-950/40 border border-amber-700/40 rounded px-2 py-1.5 text-xs">🔒 Currently gated to <span className="font-bold">Early Adopters NFT</span> holders on Omen. Grab one to get in.</p>
                <p className="mt-2 text-slate-400">Connecting saves your progress to your wallet and makes you eligible for weekly OMENX rewards.</p>
            </>
        ),
    },
    {
        icon: Compass,
        accent: 'text-fuchsia-300',
        border: 'border-fuchsia-500/40',
        title: 'Launch Your First Run',
        body: (
            <>
                <p>Swipe right (or use the <span className="text-fuchsia-300 font-bold">Warp</span> menu at the top) to open the <span className="text-cyan-300 font-bold">Sloth Lounge</span>. Pick an operative, sector, and difficulty — then hit <span className="text-cyan-300 font-bold">LAUNCH</span> for a normal run or <span className="text-fuchsia-300 font-bold">ENDLESS</span> for the high-score mode.</p>
                <p className="mt-2 text-slate-400">Move with WASD or the on-screen joystick. Weapons fire automatically — focus on dodging and grabbing XP gems.</p>
            </>
        ),
    },
    {
        icon: Trophy,
        accent: 'text-emerald-300',
        border: 'border-emerald-500/40',
        title: 'Progress & Earn',
        body: (
            <>
                <p>Every run earns gold you keep. Spend it in the <span className="text-fuchsia-300 font-bold">Upgrade Lounge</span>, grab daily quests on the <span className="text-emerald-300 font-bold">Mission Board</span>, and check your rank on the <span className="text-amber-300 font-bold">Hall of Fame</span>.</p>
                <p className="mt-2 text-slate-400">Unlock new pilots by hitting kill milestones (or owning the matching NFT). Each week, top scorers split the OMENX reward pool.</p>
            </>
        ),
    },
];

export default function WelcomeModal() {
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState(0);

    useEffect(() => {
        try {
            if (!localStorage.getItem(STORAGE_KEY)) {
                // Slight delay so it doesn't fight with the initial page load animation.
                const t = setTimeout(() => setOpen(true), 400);
                return () => clearTimeout(t);
            }
        } catch { /* localStorage unavailable */ }
    }, []);

    const close = () => {
        SoundManager.playUIClick();
        try { localStorage.setItem(STORAGE_KEY, '1'); } catch { /* ignore */ }
        setOpen(false);
    };

    const next = () => {
        SoundManager.playUIClick();
        if (step < STEPS.length - 1) setStep(s => s + 1);
        else close();
    };

    const prev = () => {
        SoundManager.playUIClick();
        if (step > 0) setStep(s => s - 1);
    };

    const current = STEPS[step];
    const Icon = current?.icon;

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 md:p-6"
                    onClick={close}
                >
                    <motion.div
                        initial={{ y: 30, opacity: 0, scale: 0.96 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: 30, opacity: 0, scale: 0.96 }}
                        transition={{ type: 'spring', damping: 22, stiffness: 260 }}
                        onClick={(e) => e.stopPropagation()}
                        className={`relative w-full max-w-md bg-[#0b0416]/95 border-2 ${current.border} rounded-2xl shadow-[0_0_50px_rgba(217,70,239,0.25)] overflow-hidden`}
                    >
                        {/* Close button */}
                        <button
                            onClick={close}
                            className="absolute top-3 right-3 z-10 p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                            aria-label="Skip welcome"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        {/* Icon header */}
                        <div className={`flex items-center justify-center pt-8 pb-4 bg-gradient-to-b from-white/5 to-transparent`}>
                            <div className={`w-16 h-16 rounded-2xl border-2 ${current.border} flex items-center justify-center bg-black/40`}>
                                <Icon className={`w-8 h-8 ${current.accent}`} />
                            </div>
                        </div>

                        {/* Body */}
                        <div className="px-6 pb-5">
                            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 text-center mb-1">
                                Step {step + 1} of {STEPS.length}
                            </div>
                            <h2 className={`text-2xl font-black uppercase tracking-wider text-center mb-3 ${current.accent}`}>
                                {current.title}
                            </h2>
                            <div className="text-sm text-slate-300 leading-relaxed text-center min-h-[100px]">
                                {current.body}
                            </div>
                        </div>

                        {/* Progress dots */}
                        <div className="flex items-center justify-center gap-1.5 pb-4">
                            {STEPS.map((_, i) => (
                                <div
                                    key={i}
                                    className={`h-1.5 rounded-full transition-all ${i === step ? `w-6 ${current.accent.replace('text-', 'bg-')}` : 'w-1.5 bg-slate-700'}`}
                                />
                            ))}
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between px-4 pb-4 gap-2">
                            <button
                                onClick={prev}
                                disabled={step === 0}
                                className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" /> Back
                            </button>
                            <button
                                onClick={close}
                                className="text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-slate-300 transition-colors"
                            >
                                Skip
                            </button>
                            <button
                                onClick={next}
                                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-black uppercase tracking-wider bg-gradient-to-r from-fuchsia-600 to-cyan-600 hover:from-fuchsia-500 hover:to-cyan-500 text-white shadow-[0_0_20px_rgba(217,70,239,0.4)] transition-all`}
                            >
                                {step < STEPS.length - 1 ? <>Next <ChevronRight className="w-4 h-4" /></> : <>Let's Go <Rocket className="w-4 h-4" /></>}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}