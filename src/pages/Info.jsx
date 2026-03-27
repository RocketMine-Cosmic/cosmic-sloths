import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

export default function Info() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 p-4 md:p-8 font-mono relative overflow-hidden">
            <div className="absolute inset-0 opacity-20 pointer-events-none">
                {[...Array(20)].map((_, i) => (
                    <div 
                        key={i}
                        className="absolute bg-white rounded-full"
                        style={{
                            width: Math.random() * 3 + 1 + 'px',
                            height: Math.random() * 3 + 1 + 'px',
                            top: Math.random() * 100 + '%',
                            left: Math.random() * 100 + '%',
                            animation: `twinkle ${Math.random() * 3 + 2}s infinite`
                        }}
                    />
                ))}
            </div>

            <div className="max-w-4xl mx-auto relative z-10">
                <button 
                    onClick={() => navigate('/')}
                    className="mb-8 flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors font-bold"
                >
                    <ArrowLeft size={20} /> Back to Main Menu
                </button>

                <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-10 shadow-2xl"
                >
                    <h1 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 mb-8">
                        GAME INFO & MECHANICS
                    </h1>

                    <div className="space-y-8 text-slate-300">
                        <section>
                            <h2 className="text-2xl font-bold text-white mb-3">How to Play</h2>
                            <p className="leading-relaxed">
                                Use WASD, Arrow Keys, or the virtual joystick to move your sloth around the arena. 
                                Your weapons fire automatically. Survive as long as possible against endless waves of cosmic enemies!
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-3">Progression</h2>
                            <ul className="list-disc list-inside space-y-2 leading-relaxed">
                                <li>Collect XP gems dropped by enemies to level up during a run.</li>
                                <li>Choose powerful upgrades and weapon synergies when leveling up.</li>
                                <li>Collect Gold to purchase permanent upgrades, new characters, and cosmetics in the Sloth Lounge.</li>
                                <li>Find Cosmic Tokens to unlock premium content.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-white mb-3">Synergies</h2>
                            <p className="leading-relaxed">
                                Combining specific max-level weapons can create devastating Synergy weapons. Experiment with different combinations to find the ultimate loadout!
                            </p>
                        </section>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}