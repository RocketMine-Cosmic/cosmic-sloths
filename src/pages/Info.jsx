import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Gamepad2, Zap, Star, Target, Trophy, Flame, Users, Gift, Shield, Crown, MessageSquare, Skull } from 'lucide-react';
import { SoundManager } from '../game/SoundManager';
import SpaceBackground from '../components/game/SpaceBackground';

const TABS = [
    { id: 'basics',     label: 'Basics',       icon: Gamepad2 },
    { id: 'progression',label: 'Progression',  icon: Star },
    { id: 'missions',   label: 'Missions',     icon: Target },
    { id: 'compete',    label: 'Compete',      icon: Trophy },
    { id: 'squads',     label: 'Squads',       icon: Users },
    { id: 'combat',     label: 'Combat',       icon: Zap },
    { id: 'raid',       label: 'Global Raid',  icon: Skull },
];

function SectionCard({ title, children, color = 'cyan' }) {
    const borderColors = { 
        cyan: 'border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.15)]', 
        purple: 'border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.15)]', 
        amber: 'border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.15)]', 
        green: 'border-green-500/50 shadow-[0_0_20px_rgba(16,185,129,0.15)]', 
        rose: 'border-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.15)]', 
        orange: 'border-orange-500/50 shadow-[0_0_20px_rgba(249,115,22,0.15)]' 
    };
    const titleColors = { cyan: 'text-cyan-400', purple: 'text-purple-400', amber: 'text-amber-400', green: 'text-green-400', rose: 'text-rose-400', orange: 'text-orange-400' };
    return (
        <div className={`bg-[#0b0416]/50 backdrop-blur-xl border ${borderColors[color]} rounded-xl p-4 md:p-5`}>
            <h3 className={`font-bold text-base md:text-lg mb-3 ${titleColors[color]}`}>{title}</h3>
            {children}
        </div>
    );
}

function StatBadge({ label, desc, color }) {
    const colors = {
        red: 'bg-red-950/50 border-red-800/50 text-red-400',
        blue: 'bg-blue-950/50 border-blue-800/50 text-blue-400',
        slate: 'bg-slate-700/50 border-slate-600/50 text-slate-300',
        yellow: 'bg-yellow-950/50 border-yellow-800/50 text-yellow-400',
        purple: 'bg-purple-950/50 border-purple-800/50 text-purple-400',
        green: 'bg-green-950/50 border-green-800/50 text-green-400',
        pink: 'bg-pink-950/50 border-pink-800/50 text-pink-400',
        amber: 'bg-amber-950/50 border-amber-800/50 text-amber-400',
    };
    return (
        <div className={`border rounded-lg p-3 ${colors[color]}`}>
            <div className="font-bold text-sm mb-0.5">{label}</div>
            <div className="text-xs text-slate-400">{desc}</div>
        </div>
    );
}

function PickupCard({ icon, label, color, desc }) {
    return (
        <div className="flex items-start gap-3 bg-slate-800/50 border border-slate-700/50 rounded-lg p-3">
            <span className="text-2xl shrink-0">{icon}</span>
            <div>
                <div className={`font-bold text-sm ${color}`}>{label}</div>
                <div className="text-xs text-slate-400 mt-0.5">{desc}</div>
            </div>
        </div>
    );
}

const TABS_CONTENT = {
    basics: (
        <div className="space-y-4">
            <SectionCard title="🎮 Controls" color="cyan">
                <p className="text-sm text-slate-300 leading-relaxed mb-3">
                    Move with <strong className="text-white">WASD</strong> or <strong className="text-white">Arrow Keys</strong> on desktop, or the <strong className="text-white">Virtual Joystick</strong> on mobile. Your weapons fire <strong className="text-cyan-400">automatically</strong> at the nearest enemies.
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-900/60 rounded-lg p-2 text-center"><kbd className="text-cyan-300 font-bold">W A S D</kbd><div className="text-slate-400 mt-1">Move</div></div>
                    <div className="bg-slate-900/60 rounded-lg p-2 text-center"><kbd className="text-cyan-300 font-bold">ESC / P</kbd><div className="text-slate-400 mt-1">Pause</div></div>
                </div>
            </SectionCard>

            <SectionCard title="🎯 Objective" color="green">
                <p className="text-sm text-slate-300 leading-relaxed">
                    Survive the full time limit of each sector to <strong className="text-green-400">win</strong>. As time progresses, enemies get stronger and more numerous. An optional <strong className="text-purple-400">Endless Void</strong> mode scales infinitely with boss fights every 3 minutes.
                </p>
            </SectionCard>

            <SectionCard title="📊 Character Stats" color="cyan">
                <div className="grid grid-cols-2 gap-2">
                    <StatBadge label="❤️ HP & Regen" desc="Health pool and passive healing per second" color="red" />
                    <StatBadge label="👟 Speed" desc="Movement speed multiplier" color="blue" />
                    <StatBadge label="🛡️ Armor" desc="Flat reduction to incoming damage" color="slate" />
                    <StatBadge label="⚡ Damage" desc="Global multiplier for all weapons" color="yellow" />
                    <StatBadge label="⏱️ Cooldown" desc="Time between weapon attacks (lower = faster)" color="purple" />
                    <StatBadge label="💥 Area" desc="Size of all attacks and AoE zones" color="green" />
                    <StatBadge label="🧲 Magnet" desc="Range for auto-collecting XP and Gold" color="pink" />
                    <StatBadge label="🍀 Luck" desc="Boosts Gold drop rate and crit chance" color="amber" />
                </div>
            </SectionCard>

            <SectionCard title="💎 In-Run Pickups" color="purple">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <PickupCard icon="💠" label="XP Gems" color="text-emerald-400" desc="Dropped by every enemy. Fill your XP bar to level up and pick upgrades." />
                    <PickupCard icon="🪙" label="Gold Coins" color="text-yellow-400" desc="Random enemy drops. Spent in the Sloth Lounge on upgrades." />
                    <PickupCard icon="🎲" label="Reroll Tokens" color="text-purple-400" desc="Dropped by Bosses. Re-roll your level-up choices." />
                    <PickupCard icon="☢️" label="Nuke" color="text-red-400" desc="Instantly destroys all non-boss enemies on screen." />
                    <PickupCard icon="🧲" label="Magnet Surge" color="text-blue-400" desc="Instantly pulls all nearby XP and Gold to you." />
                    <PickupCard icon="🛡️" label="Shield Overcharge" color="text-cyan-400" desc="10 seconds of full invincibility." />
                </div>
            </SectionCard>
        </div>
    ),

    progression: (
        <div className="space-y-4">
            <SectionCard title="🏠 Sloth Lounge (Meta Progression)" color="cyan">
                <p className="text-sm text-slate-300 leading-relaxed mb-3">Between runs, visit the Sloth Lounge to spend your Gold and Cosmic Tokens on persistent upgrades.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700">
                        <div className="font-bold text-white text-sm mb-1">👤 Characters</div>
                        <p className="text-xs text-slate-400">Unlock new sloths with unique stats, abilities, and exclusive Talent Trees.</p>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700">
                        <div className="font-bold text-white text-sm mb-1">⬆️ Stat Upgrades</div>
                        <p className="text-xs text-slate-400">3 tiers: Permanent (forever), Weekly (resets weekly), Seasonal (resets every 4 weeks). Higher tiers = stronger bonuses.</p>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700">
                        <div className="font-bold text-white text-sm mb-1">🔫 Armory</div>
                        <p className="text-xs text-slate-400">Upgrade individual weapons' Damage, Area, and Cooldown. Max all 3 to Master a weapon and unlock its ultimate form!</p>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700">
                        <div className="font-bold text-white text-sm mb-1">🌳 Talent Trees</div>
                        <p className="text-xs text-slate-400">Each character has a unique skill tree with branching paths. Respec anytime for a Gold refund.</p>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700 sm:col-span-2">
                        <div className="font-bold text-white text-sm mb-1">✨ Cosmetics</div>
                        <p className="text-xs text-slate-400">Buy flashy trails, kill effects, and character skins. Preview before you buy!</p>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-3 border border-yellow-700/40 sm:col-span-2">
                        <div className="font-bold text-yellow-400 text-sm mb-1">🔨 The Forge</div>
                        <p className="text-xs text-slate-400">Convert excess Gold into <strong className="text-yellow-300">Star Fragments 🌟</strong> (1,000 Gold = 1 🌟, up to 20/day). Use fragments to permanently enhance weapons beyond their normal cap, or unlock powerful passive augments for each character. Forge upgrades <strong className="text-white">never reset</strong>.</p>
                    </div>
                </div>
            </SectionCard>

            <SectionCard title="🔥 Weapon Synergies" color="rose">
                <p className="text-sm text-slate-300 leading-relaxed mb-2">
                    If you acquire two specific weapons during a single run, they automatically combine into a powerful <strong className="text-rose-400">Synergy Weapon</strong>!
                </p>
                <div className="bg-slate-900/60 rounded-lg p-3 text-xs text-slate-400 italic border border-slate-700/50">
                    💡 Hint: Try combining <strong className="text-white">Zero-G Napalm + Shield Bubble</strong>, or <strong className="text-white">Cosmic Nap Beam + Nova Pulse</strong>...
                </div>
            </SectionCard>

            <SectionCard title="📖 Cosmic Codex" color="purple">
                <p className="text-sm text-slate-300 leading-relaxed">
                    Every enemy you encounter is logged in the Codex. Kill enough of a specific enemy to achieve <strong className="text-fuchsia-400">Mastery</strong> — granting a permanent <strong className="text-fuchsia-400">+5% damage bonus</strong> against that enemy type forever.
                </p>
            </SectionCard>
        </div>
    ),

    missions: (
        <div className="space-y-4">
            <SectionCard title="🔥 Daily Login Rewards" color="amber">
                <p className="text-sm text-slate-300 leading-relaxed mb-3">
                    Log in every day to claim escalating rewards. Build a streak across 7 days for the biggest bonus!
                </p>
                <div className="grid grid-cols-7 gap-1">
                    {[
                        { day: 1, icon: '🪙', label: '400' },
                        { day: 2, icon: '🪙', label: '800' },
                        { day: 3, icon: '🪙', label: '1000' },
                        { day: 4, icon: '🎲', label: '×1' },
                        { day: 5, icon: '🪙', label: '2000' },
                        { day: 6, icon: '🎲', label: '×2' },
                        { day: 7, icon: '🪙', label: '4000', bonus: true },
                    ].map(r => (
                        <div key={r.day} className={`flex flex-col items-center p-1.5 rounded-lg border text-center ${r.bonus ? 'bg-amber-900/40 border-amber-500' : 'bg-slate-800/60 border-slate-700'}`}>
                            <div className="text-[9px] text-slate-500 font-bold">D{r.day}</div>
                            <div className="text-base leading-none my-0.5">{r.icon}</div>
                            <div className={`text-[9px] font-bold ${r.bonus ? 'text-amber-400' : 'text-slate-300'}`}>{r.label}</div>
                        </div>
                    ))}
                </div>
                <p className="text-xs text-slate-500 mt-2">⚠️ Miss a day and your streak resets to Day 1!</p>
            </SectionCard>

            <SectionCard title="🎯 Daily Bounties" color="cyan">
                <p className="text-sm text-slate-300 leading-relaxed mb-2">
                    3 random bounty tasks refresh every day. Complete them to earn <strong className="text-yellow-400">Gold</strong> or <strong className="text-purple-400">Reroll Tokens</strong>. Progress is tracked automatically during your runs.
                </p>
                <div className="text-xs text-slate-400 bg-slate-900/50 rounded-lg p-2 border border-slate-700">
                    Examples: Kill 200 enemies, Survive 5 minutes, Collect 500 Gold in a single run...
                </div>
            </SectionCard>

            <SectionCard title="⚔️ Daily Mission" color="purple">
                <p className="text-sm text-slate-300 leading-relaxed mb-2">
                    One harder challenge per day. Completing it earns <strong className="text-yellow-400">Seasonal Points</strong>.
                </p>
                <div className="bg-slate-900/50 rounded-lg p-3 border border-purple-800/40">
                    <div className="font-bold text-sm text-yellow-400 mb-1">⭐ Seasonal Skin Reward</div>
                    <p className="text-xs text-slate-400">Collect <strong className="text-white">100 Seasonal Points</strong> to unlock an exclusive character skin. Points carry across the season.</p>
                </div>
            </SectionCard>

            <SectionCard title="👥 Squad Weekly Bounty" color="orange">
                <p className="text-sm text-slate-300 leading-relaxed mb-2">
                    Join a <strong className="text-orange-400">Sloth Squad</strong> and work together to defeat <strong className="text-white">10,000 enemies</strong> in a week. All contributing members can claim:
                </p>
                <div className="flex gap-3">
                    <div className="bg-slate-900/50 rounded-lg p-2 text-center border border-slate-700 flex-1">
                        <div className="text-lg">🪙</div>
                        <div className="text-xs text-yellow-400 font-bold">2,500 Gold</div>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-2 text-center border border-slate-700 flex-1">
                        <div className="text-lg">🎲</div>
                        <div className="text-xs text-purple-400 font-bold">5 Rerolls</div>
                    </div>
                </div>
            </SectionCard>
        </div>
    ),

    compete: (
        <div className="space-y-4">
            <SectionCard title="🏆 Leaderboards & Seasons" color="amber">
                <p className="text-sm text-slate-300 leading-relaxed mb-3">
                    Compete for <strong className="text-emerald-400">Cosmic Tokens</strong> — the premium currency earned exclusively through competitive play.
                </p>
                <div className="space-y-2">
                    <div className="bg-slate-900/60 rounded-lg p-3 border border-slate-700">
                        <div className="font-bold text-white text-sm mb-1">📅 Weekly Leaderboard</div>
                        <p className="text-xs text-slate-400">Resets every Monday. Top 20 players earn Cosmic Tokens. Weekly stat upgrades also reset.</p>
                    </div>
                    <div className="bg-slate-900/60 rounded-lg p-3 border border-slate-700">
                        <div className="font-bold text-white text-sm mb-1">🗓️ Seasonal Leaderboard</div>
                        <p className="text-xs text-slate-400">Runs for 4 weeks. Top 30 players earn Cosmic Tokens. Seasonal stat upgrades reset at end.</p>
                    </div>
                    <div className="bg-slate-900/60 rounded-lg p-3 border border-purple-800/40">
                        <div className="font-bold text-purple-300 text-sm mb-1">♾️ Endless Void Leaderboard</div>
                        <p className="text-xs text-slate-400">All-time high scores in Endless Mode. Enemies scale infinitely. Boss fights every 3 minutes.</p>
                    </div>
                </div>
            </SectionCard>

            <SectionCard title="💠 Cosmic Tokens" color="green">
                <p className="text-sm text-slate-300 leading-relaxed mb-2">
                    Cosmic Tokens are the premium currency earned <strong className="text-emerald-400">exclusively</strong> through competitive leaderboard rankings — they never drop in runs.
                </p>
                <div className="text-xs text-slate-400 bg-slate-900/50 rounded-lg p-3 border border-emerald-900/40">
                    <strong className="text-emerald-400">How to earn:</strong> Place in the top rankings on Weekly or Seasonal leaderboards. Rewards are automatically distributed to your account when you visit the Sloth Lounge after a cycle ends.
                </div>
            </SectionCard>

            <SectionCard title="⚡ Leviathan Trials" color="rose">
                <p className="text-sm text-slate-300 leading-relaxed mb-2">
                    Activate special <strong className="text-rose-400">modifiers</strong> before a run to make boss encounters harder — but more rewarding.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <div className="bg-slate-900/60 rounded-lg p-2 border border-red-900/40 text-center"><div className="text-red-400 font-bold">FURY</div><div className="text-slate-400">Boss deals +50% damage</div></div>
                    <div className="bg-slate-900/60 rounded-lg p-2 border border-orange-900/40 text-center"><div className="text-orange-400 font-bold">FRENZY</div><div className="text-slate-400">Boss moves +50% faster</div></div>
                    <div className="bg-slate-900/60 rounded-lg p-2 border border-purple-900/40 text-center"><div className="text-purple-400 font-bold">HIDE</div><div className="text-slate-400">Boss has +100% HP</div></div>
                </div>
            </SectionCard>

            <SectionCard title="👥 Sloth Squads" color="orange">
                <p className="text-sm text-slate-300 leading-relaxed mb-3">
                    Create or join a squad of up to <strong className="text-orange-400">5 players</strong>. Every kill you make in any run automatically contributes to your squad's weekly kill total.
                </p>
                <div className="space-y-2 mb-3">
                    <div className="bg-slate-900/60 rounded-lg p-3 border border-orange-900/40">
                        <div className="font-bold text-orange-300 text-sm mb-1">📈 Squad Levels & XP</div>
                        <p className="text-xs text-slate-400">Squads earn XP equal to their weekly kills at the end of each week. Level up through 7 tiers — from <strong className="text-white">Recruits</strong> all the way to <strong className="text-pink-400">Cosmic Elite</strong> — unlocking harder bounties and bigger rewards.</p>
                    </div>
                    <div className="bg-slate-900/60 rounded-lg p-3 border border-yellow-900/40">
                        <div className="font-bold text-yellow-300 text-sm mb-1">🛡️ Weekly Bounty</div>
                        <p className="text-xs text-slate-400">Each week your squad has a kill target that scales with your squad level. Hit the target and every member can <strong className="text-white">individually claim</strong> Gold and Reroll Tokens as their reward.</p>
                        <div className="grid grid-cols-2 gap-1.5 mt-2 text-[10px]">
                            <div className="bg-slate-800 rounded p-1.5 text-center border border-slate-700"><div className="text-slate-400">Lv.1 Rookie</div><div className="text-yellow-400 font-bold">2,000 kills → 🪙500 + 🎲×1</div></div>
                            <div className="bg-slate-800 rounded p-1.5 text-center border border-slate-700"><div className="text-slate-400">Lv.3 Hunters</div><div className="text-yellow-400 font-bold">10,000 kills → 🪙2,500 + 🎲×3</div></div>
                            <div className="bg-slate-800 rounded p-1.5 text-center border border-slate-700"><div className="text-slate-400">Lv.5 Reapers</div><div className="text-yellow-400 font-bold">30,000 kills → 🪙6,500 + 🎲×5</div></div>
                            <div className="bg-slate-800 rounded p-1.5 text-center border border-slate-700"><div className="text-slate-400">Lv.7 Cosmic Elite</div><div className="text-pink-400 font-bold">75,000 kills → 🪙15k + 🎲×10</div></div>
                        </div>
                    </div>
                    <div className="bg-slate-900/60 rounded-lg p-3 border border-slate-700/50">
                        <div className="font-bold text-slate-200 text-sm mb-1">⚙️ Squad Management</div>
                        <p className="text-xs text-slate-400">The squad <strong className="text-white">Leader</strong> can edit the squad name, tag, and description, kick members, or transfer leadership. Use the in-squad <strong className="text-cyan-400">Chat</strong> to coordinate with your team.</p>
                    </div>
                    <div className="bg-slate-900/60 rounded-lg p-3 border border-slate-700/50">
                        <div className="font-bold text-slate-200 text-sm mb-1">🏆 Squad Leaderboard</div>
                        <p className="text-xs text-slate-400">The top squads by weekly kills are ranked on the <strong className="text-white">Squads Leaderboard</strong> tab in the Hall of Fame. Compete to be the most lethal squad this week!</p>
                    </div>
                </div>
            </SectionCard>
        </div>
    ),

    squads: (
        <div className="space-y-4">
            <SectionCard title="👥 What are Squads?" color="orange">
                <p className="text-sm text-slate-300 leading-relaxed">
                    Squads are persistent teams of up to <strong className="text-orange-400">5 players</strong>. Every kill you score in any run automatically contributes to your squad's weekly total — no extra steps needed. Find the Squads page from the main carousel.
                </p>
            </SectionCard>

            <SectionCard title="📈 Squad Levels & XP" color="cyan">
                <p className="text-sm text-slate-300 leading-relaxed mb-3">At the end of each week, your squad earns XP equal to its total weekly kills. Level up through 7 tiers to unlock bigger bounties.</p>
                <div className="space-y-1.5">
                    {[
                        { badge: '🦥', name: 'Recruits',     level: 1, color: 'text-slate-400' },
                        { badge: '⭐', name: 'Drifters',     level: 2, color: 'text-blue-400' },
                        { badge: '🔥', name: 'Hunters',      level: 3, color: 'text-emerald-400' },
                        { badge: '⚡', name: 'Vanguards',    level: 4, color: 'text-amber-400' },
                        { badge: '💀', name: 'Reapers',      level: 5, color: 'text-red-400' },
                        { badge: '👑', name: 'Legends',      level: 6, color: 'text-purple-400' },
                        { badge: '🌌', name: 'Cosmic Elite', level: 7, color: 'text-pink-400' },
                    ].map(t => (
                        <div key={t.level} className="flex items-center gap-3 bg-slate-900/60 rounded-lg px-3 py-2 border border-slate-700/50">
                            <span className="text-lg w-7 text-center">{t.badge}</span>
                            <span className={`font-bold text-sm ${t.color} w-28`}>Lv.{t.level} {t.name}</span>
                            <span className="text-xs text-slate-400">higher bounty rewards unlocked</span>
                        </div>
                    ))}
                </div>
            </SectionCard>

            <SectionCard title="🛡️ Weekly Bounty" color="amber">
                <p className="text-sm text-slate-300 leading-relaxed mb-3">
                    Each week your squad has a kill target based on its level. Hit the target and <strong className="text-white">every member</strong> can individually claim their reward — Gold and Reroll Tokens.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-700"><div className="font-bold text-white mb-0.5">Lv.1 — Rookie Bounty</div><div className="text-slate-400">2,000 kills → 🪙 500 + 🎲×1</div></div>
                    <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-700"><div className="font-bold text-white mb-0.5">Lv.2 — Drifter Bounty</div><div className="text-slate-400">5,000 kills → 🪙 1,200 + 🎲×2</div></div>
                    <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-700"><div className="font-bold text-white mb-0.5">Lv.3 — Hunter Bounty</div><div className="text-slate-400">10,000 kills → 🪙 2,500 + 🎲×3</div></div>
                    <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-700"><div className="font-bold text-white mb-0.5">Lv.4 — Vanguard Bounty</div><div className="text-slate-400">18,000 kills → 🪙 4,000 + 🎲×4</div></div>
                    <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-700"><div className="font-bold text-white mb-0.5">Lv.5 — Reaper Bounty</div><div className="text-slate-400">30,000 kills → 🪙 6,500 + 🎲×5</div></div>
                    <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-700"><div className="font-bold text-white mb-0.5">Lv.6 — Legend Bounty</div><div className="text-slate-400">50,000 kills → 🪙 10,000 + 🎲×7</div></div>
                    <div className="bg-slate-900/60 p-2.5 rounded-lg border border-pink-900/40 sm:col-span-2"><div className="font-bold text-pink-400 mb-0.5">Lv.7 — Cosmic Bounty 🌌</div><div className="text-slate-400">75,000 kills → 🪙 15,000 + 🎲×10</div></div>
                </div>
            </SectionCard>

            <SectionCard title="⚙️ Roles & Management" color="purple">
                <div className="space-y-2">
                    <div className="flex gap-3 bg-slate-900/60 p-3 rounded-lg border border-yellow-900/30 items-start">
                        <Crown className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
                        <div>
                            <div className="font-bold text-yellow-400 text-sm">Leader</div>
                            <div className="text-xs text-slate-400">Can edit squad name, tag & description. Can kick members or transfer leadership to another member.</div>
                        </div>
                    </div>
                    <div className="flex gap-3 bg-slate-900/60 p-3 rounded-lg border border-slate-700/50 items-start">
                        <Users className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                        <div>
                            <div className="font-bold text-slate-200 text-sm">Member</div>
                            <div className="text-xs text-slate-400">Contributes kills to the squad weekly total and can claim the weekly bounty once the target is met.</div>
                        </div>
                    </div>
                    <div className="flex gap-3 bg-slate-900/60 p-3 rounded-lg border border-cyan-900/30 items-start">
                        <MessageSquare className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
                        <div>
                            <div className="font-bold text-cyan-400 text-sm">Squad Chat</div>
                            <div className="text-xs text-slate-400">Real-time chat is available in the Squads page to coordinate with your teammates.</div>
                        </div>
                    </div>
                </div>
            </SectionCard>

            <SectionCard title="🏆 Squad Leaderboard" color="green">
                <p className="text-sm text-slate-300 leading-relaxed">
                    The top squads by weekly kills are ranked on the <strong className="text-white">Squads tab</strong> in the Hall of Fame leaderboard. Your squad's level badge and total members are shown — compete to be the most dominant squad this week!
                </p>
            </SectionCard>
        </div>
    ),

    raid: (
        <div className="space-y-4">
            <SectionCard title="💀 Global Raid Event" color="rose">
                <p className="text-sm text-slate-300 leading-relaxed">
                    The <strong className="text-red-400">Global Raid</strong> is a community-wide cooperative event. You fight against a massive World Boss whose HP is shared across all players globally. 
                </p>
                <div className="bg-slate-900/60 p-3 rounded-lg border border-red-900/40 mt-3">
                    <div className="font-bold text-white text-sm mb-1">⚔️ How to Participate</div>
                    <p className="text-xs text-slate-400">You can launch up to <strong className="text-cyan-400">5 Raid Runs</strong> per day. The damage you deal to the boss in these runs is permanently subtracted from its global health pool.</p>
                </div>
            </SectionCard>

            <SectionCard title="📈 Infinite Scaling" color="purple">
                <p className="text-sm text-slate-300 leading-relaxed mb-3">
                    The raid never truly ends. Whenever the community manages to drop the World Boss's HP to 0:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-700">
                        <div className="font-bold text-white mb-0.5">Level Up</div>
                        <div className="text-slate-400">The boss immediately respawns at the next Level.</div>
                    </div>
                    <div className="bg-slate-900/60 p-2.5 rounded-lg border border-purple-900/40">
                        <div className="font-bold text-purple-400 mb-0.5">Stronger Boss</div>
                        <div className="text-slate-400">Its max HP increases by 50% for every level it gains!</div>
                    </div>
                </div>
            </SectionCard>

            <SectionCard title="💰 Scaling Rewards" color="amber">
                <p className="text-sm text-slate-300 leading-relaxed mb-3">
                    As the community defeats higher levels of the boss, your potential rewards increase massively.
                </p>
                <div className="bg-slate-900/60 rounded-lg p-3 border border-yellow-900/30">
                    <div className="font-bold text-yellow-400 text-sm mb-1">Claiming Gold</div>
                    <p className="text-xs text-slate-400 mb-2">For every boss level the community defeats, you can claim <strong className="text-white">1,000 Gold × Boss Level</strong>. (e.g., Level 5 boss gives 5,000 Gold).</p>
                    <p className="text-xs text-slate-500 italic">Note: You must have contributed damage to the raid to claim rewards!</p>
                </div>
            </SectionCard>
        </div>
    ),

    combat: (
        <div className="space-y-4">
            <SectionCard title="⚔️ Sectors" color="cyan">
                <p className="text-sm text-slate-300 leading-relaxed mb-2">
                    Each sector has a unique environment, enemy pool, and difficulty. Unlock new sectors by completing runs with each character. Every sector has its own environmental effect:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-700 text-center"><div className="text-cyan-400 font-bold">Neon Rain</div><div className="text-slate-400">+Speed for all</div></div>
                    <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-700 text-center"><div className="text-slate-400 font-bold">Fog</div><div className="text-slate-400">-Speed, fewer spawns</div></div>
                    <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-700 text-center"><div className="text-orange-400 font-bold">Solar Flare</div><div className="text-slate-400">+Enemy spawns</div></div>
                </div>
            </SectionCard>

            <SectionCard title="🌟 Level Ups & Rarity" color="purple">
                <p className="text-sm text-slate-300 leading-relaxed mb-3">
                    Every time you level up mid-run, you pick 1 of 3 random upgrades. Each can be one of 4 rarities:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-center">
                    <div className="rounded-lg p-2 border border-slate-600 bg-slate-800/50"><div className="text-slate-300 font-bold">Common</div><div className="text-slate-500">×1 value</div></div>
                    <div className="rounded-lg p-2 border border-blue-700 bg-blue-950/30"><div className="text-blue-400 font-bold">Rare</div><div className="text-slate-500">×1.5 value</div></div>
                    <div className="rounded-lg p-2 border border-purple-700 bg-purple-950/30"><div className="text-purple-400 font-bold">Epic</div><div className="text-slate-500">×2 value</div></div>
                    <div className="rounded-lg p-2 border border-amber-600 bg-amber-950/30"><div className="text-amber-400 font-bold">Legendary</div><div className="text-slate-500">×3 value</div></div>
                </div>
                <p className="text-xs text-slate-500 mt-2">Use 🎲 Reroll Tokens during the level-up screen to refresh your choices.</p>
            </SectionCard>

            <SectionCard title="👑 Boss Encounters" color="rose">
                <p className="text-sm text-slate-300 leading-relaxed mb-2">
                    Bosses appear at the end of certain sectors or every 3 minutes in Endless mode. When a boss is active, normal enemy spawning stops.
                </p>
                <p className="text-sm text-slate-300 leading-relaxed">
                    Defeating a boss drops <strong className="text-purple-400">Reroll Tokens</strong> and rewards you with bonus gold. Boss difficulty scales with game time.
                </p>
            </SectionCard>

            <SectionCard title="🌍 Difficulty Modes" color="green">
                <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-3 bg-slate-900/50 rounded-lg p-2 border border-cyan-900/40">
                        <span className="text-cyan-400 font-bold w-20 shrink-0">Normal</span>
                        <span className="text-slate-400 text-xs">Standard experience. Good for learning the ropes.</span>
                    </div>
                    <div className="flex items-center gap-3 bg-slate-900/50 rounded-lg p-2 border border-pink-900/40">
                        <span className="text-pink-400 font-bold w-20 shrink-0">Hard</span>
                        <span className="text-slate-400 text-xs">Enemies hit harder. Cosmic hazard strikes appear. Better score multiplier.</span>
                    </div>
                    <div className="flex items-center gap-3 bg-slate-900/50 rounded-lg p-2 border border-violet-900/40">
                        <span className="text-violet-400 font-bold w-20 shrink-0">Cosmic</span>
                        <span className="text-slate-400 text-xs">Maximum chaos. Best score multiplier for leaderboard climbers.</span>
                    </div>
                </div>
            </SectionCard>
        </div>
    ),
};

export default function Info() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('basics');

    return (
        <div className="min-h-screen relative text-slate-200 font-sans overflow-hidden">
            <SpaceBackground />

            <div className="relative z-10 max-w-3xl mx-auto px-4 pt-4 pb-20">
                <button
                    onClick={() => { SoundManager.playUIClick(); navigate('/'); }}
                    className="mb-4 flex items-center gap-2 text-slate-400 hover:text-white transition-colors font-bold text-sm bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-700"
                >
                    <ArrowLeft size={16} /> Back
                </button>

                <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
                    <h1 className="text-3xl md:text-4xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-[#0CA7B8] to-[#D946EF] mb-1 drop-shadow-[0_0_10px_rgba(217,70,239,0.5)]">
                        HOW TO PLAY
                    </h1>
                    <p className="text-slate-500 text-sm mb-5">Everything you need to know about Sloths in Space.</p>

                    {/* Tabs */}
                    <div className="flex gap-1.5 flex-wrap mb-5">
                        {TABS.map(tab => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => { SoundManager.playUIClick(); setActiveTab(tab.id); }}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs md:text-sm transition-all ${
                                        activeTab === tab.id
                                            ? 'bg-cyan-600 text-white shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                                    }`}
                                >
                                    <Icon size={14} /> {tab.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Content */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.15 }}
                        >
                            {TABS_CONTENT[activeTab]}
                        </motion.div>
                    </AnimatePresence>
                </motion.div>
            </div>
        </div>
    );
}