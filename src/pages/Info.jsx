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
                                Your weapons fire automatically at nearby enemies. Your primary goal is to survive the designated time limit for each arena against endless waves of alien threats! (Unless you are playing the unlocked Endless Void, which scales infinitely).
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-cyan-400 mb-3 border-b border-slate-700 pb-2">💎 In-Run Mechanics</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                                <div className="flex items-start gap-3 bg-slate-800/40 p-3 rounded-lg border border-slate-700/50">
                                    <span className="text-2xl">💠</span>
                                    <div>
                                        <strong className="text-emerald-400 block mb-1">XP Gems</strong>
                                        <p className="text-xs md:text-sm text-slate-300">Dropped by defeated enemies. Collect them to fill your XP bar and level up.</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 bg-slate-800/40 p-3 rounded-lg border border-slate-700/50">
                                    <span className="text-2xl">🪙</span>
                                    <div>
                                        <strong className="text-yellow-400 block mb-1">Gold Coins</strong>
                                        <p className="text-xs md:text-sm text-slate-300">Randomly dropped. Used in the Sloth Lounge for upgrades and unlocks.</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 bg-slate-800/40 p-3 rounded-lg border border-slate-700/50">
                                    <span className="text-2xl">🎲</span>
                                    <div>
                                        <strong className="text-purple-400 block mb-1">Reroll Tokens</strong>
                                        <p className="text-xs md:text-sm text-slate-300">Dropped by Bosses. Use them when leveling up to get new choices.</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 bg-slate-800/40 p-3 rounded-lg border border-slate-700/50">
                                    <span className="text-2xl">🎁</span>
                                    <div>
                                        <strong className="text-white block mb-1">Active Pickups</strong>
                                        <p className="text-xs md:text-sm text-slate-300">Rare drops: ☢️ Nuke, 🧲 Magnet, and 🛡️ Shield Overcharge.</p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-cyan-400 mb-3 border-b border-slate-700 pb-2">📊 Character Stats</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 bg-slate-800/30 p-4 rounded-xl border border-slate-700/50">
                                <div className="text-sm md:text-base"><strong className="text-red-400">HP & Regen:</strong> Health pool and healing rate.</div>
                                <div className="text-sm md:text-base"><strong className="text-blue-400">Speed:</strong> How fast your sloth moves.</div>
                                <div className="text-sm md:text-base"><strong className="text-slate-400">Armor:</strong> Flat incoming damage reduction.</div>
                                <div className="text-sm md:text-base"><strong className="text-yellow-500">Damage:</strong> Multiplier for all weapons.</div>
                                <div className="text-sm md:text-base"><strong className="text-purple-400">Cooldown:</strong> Time between weapon attacks.</div>
                                <div className="text-sm md:text-base"><strong className="text-green-400">Area:</strong> Size of your attacks.</div>
                                <div className="text-sm md:text-base"><strong className="text-pink-400">Magnet:</strong> Range to suck in XP and Gold.</div>
                                <div className="text-sm md:text-base"><strong className="text-amber-300">Luck:</strong> Chance for Gold and rare upgrades.</div>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-cyan-400 mb-3 border-b border-slate-700 pb-2">⚙️ Sloth Lounge (Meta Progression)</h2>
                            <p className="leading-relaxed mb-4 text-sm md:text-base">
                                Between runs, visit the Sloth Lounge to spend your hard-earned Gold and Cosmic Tokens:
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                                    <h3 className="font-bold text-white mb-2 flex items-center gap-2">👤 Characters</h3>
                                    <p className="text-sm">Unlock new sloths, each with unique base stats and exclusive Talent Trees.</p>
                                </div>
                                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                                    <h3 className="font-bold text-white mb-2 flex items-center gap-2">⬆️ Upgrades</h3>
                                    <p className="text-sm">Buy Permanent (weak but keep forever), Weekly (medium, resets weekly), and Seasonal (strong, resets every 4 weeks) stat boosts.</p>
                                </div>
                                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                                    <h3 className="font-bold text-white mb-2 flex items-center gap-2">🔫 Armory</h3>
                                    <p className="text-sm">Permanently increase the base stats (Damage, Area, Cooldown) of specific weapons. Master a weapon to unlock its ultimate form!</p>
                                </div>
                                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                                    <h3 className="font-bold text-white mb-2 flex items-center gap-2">✨ Cosmetics</h3>
                                    <p className="text-sm">Buy flashy trails to show off your wealth.</p>
                                </div>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-cyan-400 mb-3 border-b border-slate-700 pb-2">🎯 Bounties & Missions</h2>
                            <p className="leading-relaxed mb-4 text-sm md:text-base">
                                Complete tasks to earn extra rewards:
                            </p>
                            <ul className="list-disc list-inside space-y-2 leading-relaxed text-sm md:text-base">
                                <li><strong className="text-white">Daily Bounties:</strong> 3 random tasks every day that reward Gold, Cosmic Tokens, or Reroll Tokens.</li>
                                <li><strong className="text-purple-400">Daily Mission:</strong> A harder daily task that rewards <strong className="text-yellow-400">Seasonal Points</strong>.</li>
                                <li><strong className="text-white">Seasonal Skins:</strong> Collect 100 Seasonal Points to unlock exclusive cosmetic character skins!</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-cyan-400 mb-3 border-b border-slate-700 pb-2">🏆 Leaderboards & Seasons</h2>
                            <p className="leading-relaxed mb-4 text-sm md:text-base">
                                Compete against other players for glory and <strong className="text-emerald-400">Cosmic Tokens</strong>! The game features both Weekly and Seasonal cycles:
                            </p>
                            <ul className="list-disc list-inside space-y-2 leading-relaxed text-sm md:text-base bg-slate-800/30 p-4 rounded-xl border border-slate-700/50">
                                <li><strong className="text-white">Weekly Cycle:</strong> Resets every week. The top 20 players earn Cosmic Tokens. Weekly Upgrades reset!</li>
                                <li><strong className="text-white">Seasonal Cycle:</strong> Lasts for 4 weeks. The top 30 players earn Cosmic Tokens. Seasonal Upgrades reset!</li>
                                <li><strong className="text-white">Cosmic Tokens:</strong> Earned from leaderboards. Used for powerful upgrades and characters.</li>
                                <li><strong className="text-white">Endless Void:</strong> A special, infinitely scaling arena with its own dedicated all-time leaderboard!</li>
                                <li><strong className="text-white">Claiming Rewards:</strong> Automatically distributed when you visit the Sloth Lounge after a cycle ends.</li>
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