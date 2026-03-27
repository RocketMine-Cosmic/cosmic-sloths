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
                            <h2 className="text-2xl font-bold text-cyan-400 mb-3 border-b border-slate-700 pb-2">🎮 Controls & Basics</h2>
                            <p className="leading-relaxed mb-4">
                                Take control of your cosmic sloth using <strong className="text-white">WASD</strong>, <strong className="text-white">Arrow Keys</strong>, or the <strong className="text-white">Virtual Joystick</strong> (on mobile). 
                                Your weapons fire automatically at nearby enemies. Your primary goal is to survive the designated time limit for each arena against endless waves of alien threats!
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-cyan-400 mb-3 border-b border-slate-700 pb-2">💎 In-Run Mechanics</h2>
                            <ul className="list-disc list-inside space-y-2 leading-relaxed">
                                <li><strong className="text-emerald-400">XP Gems (Cyan):</strong> Dropped by defeated enemies. Collect them to fill your XP bar and level up.</li>
                                <li><strong className="text-yellow-400">Gold Coins:</strong> Randomly dropped by enemies. Used in the Sloth Lounge for permanent upgrades.</li>
                                <li><strong className="text-purple-400">Reroll Tokens:</strong> Dropped by Bosses. Use them when leveling up to get a new set of upgrade choices.</li>
                                <li><strong className="text-white">Leveling Up:</strong> Each level grants you a choice between 3 random weapons or passive stat boosts. Rarer upgrades provide larger bonuses!</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-cyan-400 mb-3 border-b border-slate-700 pb-2">📊 Character Stats</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <ul className="space-y-2">
                                        <li><strong className="text-red-400">HP & Regen:</strong> Your health pool and how much you heal over time.</li>
                                        <li><strong className="text-blue-400">Speed:</strong> How fast your sloth moves.</li>
                                        <li><strong className="text-slate-400">Armor:</strong> Reduces incoming damage by a flat amount.</li>
                                        <li><strong className="text-yellow-500">Damage:</strong> Multiplier for all your weapons.</li>
                                    </ul>
                                </div>
                                <div>
                                    <ul className="space-y-2">
                                        <li><strong className="text-purple-400">Cooldown:</strong> Reduces the time between weapon attacks.</li>
                                        <li><strong className="text-green-400">Area:</strong> Increases the size of your attacks.</li>
                                        <li><strong className="text-pink-400">Magnet:</strong> How far away you can suck in XP and Gold.</li>
                                        <li><strong className="text-amber-300">Luck:</strong> Increases the chance of finding Gold and rare upgrades.</li>
                                    </ul>
                                </div>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-cyan-400 mb-3 border-b border-slate-700 pb-2">⚙️ Sloth Lounge (Meta Progression)</h2>
                            <p className="leading-relaxed mb-4">
                                Between runs, visit the Sloth Lounge to spend your hard-earned Gold and Cosmic Tokens:
                            </p>
                            <ul className="list-disc list-inside space-y-2 leading-relaxed">
                                <li><strong className="text-white">Characters:</strong> Unlock new sloths, each with unique base stats and exclusive Talent Trees.</li>
                                <li><strong className="text-white">Upgrades:</strong> Buy Permanent, Weekly, and Seasonal stat boosts to give yourself an edge.</li>
                                <li><strong className="text-white">Armory:</strong> Permanently increase the base stats (Damage, Area, Cooldown) of specific weapons. Master a weapon to unlock its ultimate form!</li>
                                <li><strong className="text-white">Cosmetics:</strong> Buy flashy trails to show off your wealth.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-cyan-400 mb-3 border-b border-slate-700 pb-2">🔥 Weapon Synergies</h2>
                            <p className="leading-relaxed">
                                The key to surviving the harder arenas is discovering Synergies. If you acquire two specific weapons during a run, they will combine into a single, devastatingly powerful Synergy Weapon!
                                <br/><br/>
                                <em className="text-slate-400">Hint: Try combining the Zero-G Napalm with the Shield Bubble, or the Cosmic Nap Beam with the Nova Pulse...</em>
                            </p>
                        </section>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}