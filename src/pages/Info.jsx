import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Gamepad2, Zap, Star, Target, Trophy, Flame, Users, Gift, Shield, Crown, MessageSquare, Skull, Coins, Puzzle, Gem, Swords, Award } from 'lucide-react';
import { SoundManager } from '../game/SoundManager';
import SpaceBackground from '../components/game/SpaceBackground';

const TABS = [
    { id: 'basics',     label: 'Basics',       icon: Gamepad2 },
    { id: 'progression',label: 'Progression',  icon: Star },
    { id: 'missions',   label: 'Missions',     icon: Target },
    { id: 'compete',    label: 'Compete',      icon: Trophy },
    { id: 'squads',     label: 'Squads',       icon: Users },
    { id: 'wars',       label: 'Squad Wars',   icon: Swords },
    { id: 'nft',        label: 'NFT Unlocks',  icon: Gem },
    { id: 'combat',     label: 'Combat',       icon: Zap },
    { id: 'raid',       label: 'Global Raid',  icon: Skull },
    { id: 'vip',        label: 'VIP',          icon: Crown },
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
        <div className={`border rounded-xl p-4 flex flex-col justify-center ${colors[color]}`}>
            <div className="font-bold text-sm md:text-base mb-1.5">{label}</div>
            <div className="text-xs md:text-sm text-slate-400/90 leading-relaxed">{desc}</div>
        </div>
    );
}

function PickupCard({ icon, label, color, desc }) {
    return (
        <div className="flex items-start gap-4 bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
            <span className="text-3xl shrink-0 mt-0.5">{icon}</span>
            <div>
                <div className={`font-bold text-sm md:text-base mb-1.5 ${color}`}>{label}</div>
                <div className="text-xs md:text-sm text-slate-400 leading-relaxed">{desc}</div>
            </div>
        </div>
    );
}

const getCompeteContent = (topN) => (
    <div className="space-y-4 md:space-y-6">
        <SectionCard title="🏆 Leaderboards & Seasons" color="amber">
            <p className="text-sm md:text-base text-slate-300 leading-relaxed mb-4">
                Compete for <strong className="text-emerald-400">OMENX</strong> — real crypto earned exclusively through competitive play. Rewards are sent automatically to your wallet at the end of each cycle.
            </p>
            <div className="space-y-3">
                <div className="bg-slate-900/60 rounded-xl p-4 border border-amber-800/40">
                    <div className="font-bold text-amber-300 text-sm md:text-base mb-1.5 flex items-center gap-2">📅 Weekly Leaderboard</div>
                    <p className="text-xs md:text-sm text-slate-400 leading-relaxed mb-2">Resets every <strong className="text-white">Monday 00:00 UTC</strong>. Only the <strong className="text-emerald-400">top {topN} players</strong> earn OMENX — higher rank = bigger share. Weekly stat upgrades also reset.</p>
                    <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono mt-2">
                        <div className="bg-amber-950/40 border border-amber-500/50 rounded px-2 py-1 flex justify-between shadow-[0_0_8px_rgba(245,158,11,0.15)]"><span className="text-amber-300">🥇 #1</span><span className="text-white">10%</span></div>
                        <div className="bg-slate-700/40 border border-slate-400/50 rounded px-2 py-1 flex justify-between shadow-[0_0_8px_rgba(148,163,184,0.15)]"><span className="text-slate-100">🥈 #2</span><span className="text-white">8%</span></div>
                        <div className="bg-orange-950/40 border border-orange-500/50 rounded px-2 py-1 flex justify-between shadow-[0_0_8px_rgba(249,115,22,0.15)]"><span className="text-orange-300">🥉 #3</span><span className="text-white">6%</span></div>
                        <div className="bg-slate-900/60 border border-slate-700 rounded px-2 py-1 flex justify-between"><span className="text-slate-300">#4–10</span><span className="text-white">4% each</span></div>
                        <div className="bg-slate-900/60 border border-slate-700 rounded px-2 py-1 flex justify-between"><span className="text-slate-300">#11–20</span><span className="text-white">3% each</span></div>
                        <div className="bg-slate-900/60 border border-slate-700 rounded px-2 py-1 flex justify-between"><span className="text-slate-300">#21–30</span><span className="text-white">1.8% each</span></div>
                        <div className="bg-slate-900/60 border border-slate-700 rounded px-2 py-1 col-span-2 flex justify-between"><span className="text-slate-300">#31–45</span><span className="text-white">1.2% each</span></div>
                    </div>
                    <div className="text-[10px] text-slate-500 italic mt-2">Endless Void runs are excluded from OMENX payouts. Max payout per player is <strong className="text-slate-400">10,000 OMENX</strong> per period.</div>
                </div>
                <div className="bg-slate-900/60 rounded-xl p-4 border border-purple-800/40">
                    <div className="font-bold text-purple-300 text-sm md:text-base mb-1.5 flex items-center gap-2">🗓️ Seasonal Leaderboard</div>
                    <p className="text-xs md:text-sm text-slate-400 leading-relaxed mb-2">Runs for <strong className="text-white">4 weeks</strong>. Only the <strong className="text-emerald-400">top {topN} players</strong> earn OMENX — higher rank = bigger share. Seasonal stat upgrades reset at season end.</p>
                    <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono mt-2">
                        <div className="bg-amber-950/40 border border-amber-500/50 rounded px-2 py-1 flex justify-between shadow-[0_0_8px_rgba(245,158,11,0.15)]"><span className="text-amber-300">🥇 #1</span><span className="text-white">10%</span></div>
                        <div className="bg-slate-700/40 border border-slate-400/50 rounded px-2 py-1 flex justify-between shadow-[0_0_8px_rgba(148,163,184,0.15)]"><span className="text-slate-100">🥈 #2</span><span className="text-white">7.5%</span></div>
                        <div className="bg-orange-950/40 border border-orange-500/50 rounded px-2 py-1 flex justify-between shadow-[0_0_8px_rgba(249,115,22,0.15)]"><span className="text-orange-300">🥉 #3</span><span className="text-white">6%</span></div>
                        <div className="bg-slate-900/60 border border-slate-700 rounded px-2 py-1 flex justify-between"><span className="text-slate-300">#4–10</span><span className="text-white">3.2% each</span></div>
                        <div className="bg-slate-900/60 border border-slate-700 rounded px-2 py-1 flex justify-between"><span className="text-slate-300">#11–20</span><span className="text-white">2.2% each</span></div>
                        <div className="bg-slate-900/60 border border-slate-700 rounded px-2 py-1 flex justify-between"><span className="text-slate-300">#21–30</span><span className="text-white">1.5% each</span></div>
                        <div className="bg-slate-900/60 border border-slate-700 rounded px-2 py-1 flex justify-between"><span className="text-slate-300">#31–40</span><span className="text-white">0.9% each</span></div>
                        <div className="bg-slate-900/60 border border-slate-700 rounded px-2 py-1 flex justify-between"><span className="text-slate-300">#41–45</span><span className="text-white">0.7% each</span></div>
                    </div>
                    <div className="text-[10px] text-slate-500 italic mt-2">Endless Void runs are excluded from OMENX payouts. Max payout per player is <strong className="text-slate-400">10,000 OMENX</strong> per period.</div>
                </div>
                <div className="bg-slate-900/60 rounded-xl p-4 border border-cyan-800/40">
                    <div className="font-bold text-cyan-300 text-sm md:text-base mb-1.5 flex items-center gap-2">♾️ Endless Void Leaderboard</div>
                    <p className="text-xs md:text-sm text-slate-400 leading-relaxed">Season-scoped high scores in Endless Mode. Enemies scale infinitely. Boss fights every 3 minutes. <strong className="text-amber-300">Important:</strong> Endless runs are <strong className="text-white">excluded from OMENX payouts</strong> on the Weekly + Seasonal leaderboards — but they earn their own <strong className="text-purple-300">Endless Bonus</strong> in the score formula (10,000 per minute survived), so a long, well-played endless run can rival a Sector 10 victory at the very top of the boards. S6 removed all gold/kill caps — every Gold and kill is credited in full.</p>
                </div>
            </div>
        </SectionCard>

        <SectionCard title="📊 How Scores Work (Season 6)" color="green">
            <p className="text-sm text-slate-300 leading-relaxed mb-3">
                S6 rebuilt the score formula from scratch — <strong className="text-white">skill beats grind</strong>. Gold no longer contributes to score, time spent no longer rewards you, and sector progression is now the headline scorer:
            </p>
            <div className="bg-slate-900/60 rounded-xl p-4 border border-green-900/40 font-mono text-[11px] text-center text-green-300 mb-3 leading-relaxed space-y-2">
                <div><span className="text-slate-500">Sector runs:</span> Score = Kills×120 + Level²×100 + SectorIndex×8,000 + Victory Bonus</div>
                <div className="border-t border-slate-800 pt-2"><span className="text-slate-500">Endless runs:</span> Score = Kills×120 + Level²×100 + Minutes×10,000</div>
            </div>
            <div className="space-y-2 text-xs text-slate-400 mb-3">
                <div className="bg-slate-900/50 rounded-lg p-2.5 border border-slate-700/60">
                    <strong className="text-green-300">⚔️ Kills × 120</strong> — every enemy you defeat. Skill kills are the foundation.
                </div>
                <div className="bg-slate-900/50 rounded-lg p-2.5 border border-slate-700/60">
                    <strong className="text-green-300">📈 Level² × 100</strong> — quadratic, so late levels matter <em>massively</em> more than early ones.
                </div>
                <div className="bg-slate-900/50 rounded-lg p-2.5 border border-slate-700/60">
                    <strong className="text-green-300">🌌 SectorIndex × 8,000</strong> — flat bonus per sector reached (Sector 1 = 0, Sector 2 = 8k, ... Sector 10 = 72k). Progression is the real multiplier.
                </div>
                <div className="bg-slate-900/50 rounded-lg p-2.5 border border-amber-700/40">
                    <strong className="text-amber-300">🏆 Victory Bonus = SectorIndex × 15,000</strong> — clearing Sector 10 = +135k bonus. Boss-killing is now the real prize.
                </div>
                <div className="bg-slate-900/50 rounded-lg p-2.5 border border-purple-700/40">
                    <strong className="text-purple-300">♾️ Endless Bonus = Minutes × 10,000</strong> — endless gets its own per-minute scaling (linear, no cap) so long, well-played endless runs stay competitive with sector victories.
                </div>
            </div>
            <div className="text-xs text-slate-400 bg-slate-900/50 rounded-lg p-3 border border-slate-700 mb-3 leading-relaxed">
                <strong className="text-white">Gold no longer affects score.</strong> Stacking gold multipliers helps you survive — it doesn't pad your leaderboard score. <strong className="text-white">Difficulty</strong> also doesn't directly multiply score in S6; harder difficulties just grant more XP & Gold (Hard +100%, Cosmic +200%), which feed kills/level naturally.
            </div>
            <div className="text-xs text-slate-500 bg-slate-900/40 rounded-lg p-2 border border-slate-800">
                💡 Top-of-board target: <strong className="text-white">~900k–1M</strong>. A clean Sector 10 victory (no stacking) lands ~430k. Long, skilled endless runs (25+ min with high kills/level) can reach 600k–1M. A long endless with high kills/level multipliers can compete with or exceed sector victories. Only your <strong className="text-white">highest score per period</strong> counts on the leaderboard.
            </div>
        </SectionCard>

        <SectionCard title="💠 OMENX Currency" color="cyan">
            <p className="text-sm text-slate-300 leading-relaxed mb-3">
                OMENX is the premium Web3 currency of the OmenX ecosystem. Use it in-game to reroll upgrades, banish unwanted choices, activate Squad Ultimates, purchase cosmetics, stat boosts, and more.
            </p>
            <div className="space-y-2">
                <div className="text-xs text-slate-400 bg-slate-900/50 rounded-lg p-3 border border-emerald-900/40">
                    <strong className="text-emerald-400">Earn via Leaderboards:</strong> Place in the top rankings on weekly or seasonal boards. Rewards are automatically sent to your wallet — no claiming needed.
                </div>
                <div className="text-xs text-slate-400 bg-slate-900/50 rounded-lg p-3 border border-fuchsia-900/40">
                    <strong className="text-fuchsia-400">NFT Holder Bonus:</strong> Own an OmenX NFT? Earn bonus Gold and Relic Fragments every run based on your NFT's rarity (no unlock needed — automatic per-run boost).
                </div>
                <div className="text-xs text-slate-400 bg-slate-900/50 rounded-lg p-3 border border-purple-900/40">
                    <strong className="text-purple-400">Purchase directly:</strong> Buy OMENX on the BNB Chain via{' '}
                    <a href="https://thirdweb.com/binance/0x992a09877b619b4755Cabe9edaf5092A956F0317" target="_blank" rel="noopener noreferrer" className="text-purple-300 underline hover:text-purple-200 transition-colors">Thirdweb (BNB Chain)</a>. Your live wallet balance is always shown in the top bar.
                </div>
            </div>
        </SectionCard>

        <SectionCard title="⚡ Cosmic Mutations" color="rose">
            <p className="text-sm md:text-base text-slate-300 leading-relaxed mb-4">
                Toggle special <strong className="text-rose-400">mutations</strong> on the Cosmic Mutations page before a run to make boss encounters harder — but earn bonus rewards for completing them.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-sm">
                <div className="bg-slate-900/60 rounded-xl p-3 border border-red-900/40 flex flex-col">
                    <div className="text-red-400 font-bold mb-1 text-sm">⚔️ Leviathan's Fury</div>
                    <div className="text-slate-400 text-xs mb-1">Bosses deal +50% damage</div>
                    <div className="text-emerald-400 text-[11px] font-bold">→ +500 boss Gold</div>
                </div>
                <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-700 flex flex-col">
                    <div className="text-slate-300 font-bold mb-1 text-sm">🛡️ Thick Hide</div>
                    <div className="text-slate-400 text-xs mb-1">Bosses have +100% HP</div>
                    <div className="text-emerald-400 text-[11px] font-bold">→ +50% boss XP</div>
                </div>
                <div className="bg-slate-900/60 rounded-xl p-3 border border-yellow-900/40 flex flex-col">
                    <div className="text-yellow-400 font-bold mb-1 text-sm">💨 Frenzy</div>
                    <div className="text-slate-400 text-xs mb-1">Bosses move +50% faster</div>
                    <div className="text-emerald-400 text-[11px] font-bold">→ +1 Relic Fragment per boss kill</div>
                </div>
                <div className="bg-slate-900/60 rounded-xl p-3 border border-cyan-900/40 flex flex-col">
                    <div className="text-cyan-400 font-bold mb-1 text-sm">⚡ Bullet Hell</div>
                    <div className="text-slate-400 text-xs mb-1">Bosses fire 2× projectiles</div>
                    <div className="text-emerald-400 text-[11px] font-bold">→ +30% total score</div>
                </div>
                <div className="bg-slate-900/60 rounded-xl p-3 border border-green-900/40 flex flex-col">
                    <div className="text-green-400 font-bold mb-1 text-sm">💚 Cellular Regeneration</div>
                    <div className="text-slate-400 text-xs mb-1">Boss heals 1% Max HP / sec</div>
                    <div className="text-emerald-400 text-[11px] font-bold">→ +800 boss Gold</div>
                </div>
                <div className="bg-slate-900/60 rounded-xl p-3 border border-orange-900/40 flex flex-col">
                    <div className="text-orange-400 font-bold mb-1 text-sm">⚓ Unstoppable Force</div>
                    <div className="text-slate-400 text-xs mb-1">Boss ignores slow & pushback</div>
                    <div className="text-emerald-400 text-[11px] font-bold">→ +1,000 boss Gold</div>
                </div>
            </div>
            <div className="text-xs text-slate-500 mt-3 bg-slate-900/40 rounded-lg p-2 border border-slate-800">
                💡 Stack multiple mutations for even greater challenge and rewards. They can all be combined freely.
            </div>
        </SectionCard>
    </div>
);

const TABS_CONTENT = {

// Phase 2 started Monday 2026-03-09 (Week 1)
const PHASE2_START = new Date('2026-03-09T00:00:00Z');

function getVipPhaseInfo() {
    const now = new Date();
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const weeksSincePhase2 = Math.floor((now - PHASE2_START) / msPerWeek);

    if (weeksSincePhase2 < 0) {
        return { phase: 2, week: 1, totalWeeks: 10, status: 'upcoming' };
    } else if (weeksSincePhase2 < 10) {
        return { phase: 2, week: weeksSincePhase2 + 1, totalWeeks: 10, status: 'active' };
    } else if (weeksSincePhase2 < 20) {
        return { phase: 3, week: weeksSincePhase2 - 9, totalWeeks: 10, status: 'active' };
    } else {
        return { phase: 3, week: 10, totalWeeks: 10, status: 'complete' };
    }
}

function VipTab() {
    const phaseInfo = getVipPhaseInfo();
    const { phase, week, totalWeeks, status } = phaseInfo;

    const phaseLabel = status === 'complete'
        ? 'Phase 3 complete — future allocation TBD'
        : `Phase ${phase} — Week ${week} of ${totalWeeks} (Mon–Sun cycles)`;

    return (
        <div className="space-y-4 md:space-y-6">
            <SectionCard title="👑 VIP Status" color="amber">
                <p className="text-sm md:text-base text-slate-300 leading-relaxed mb-4">
                    VIP status is earned through your activity and investment in the <strong className="text-amber-400">OmenX ecosystem</strong>. The higher your VIP level, the better your in-game bonuses every single run.
                </p>
                <div className="bg-slate-900/50 rounded-xl p-4 border border-amber-800/40 text-xs text-slate-400">
                    Your VIP level is fetched <strong className="text-white">once</strong> from your OmenX wallet when you sign in, then cached for the session — your in-game bonuses apply instantly with zero background polling. Upgraded your tier? Use the <strong className="text-amber-300">Refresh VIP</strong> button on your Profile page (24h cooldown) to pull the new value.
                </div>
            </SectionCard>

            <SectionCard title="⚡ VIP Bonuses" color="purple">
                <p className="text-sm text-slate-300 leading-relaxed mb-3">
                    Each VIP tier grants <strong className="text-purple-400">+1% Damage</strong> and <strong className="text-purple-400">+1% Max HP</strong> per run, stacking with every tier you reach.
                </p>
                <div className="space-y-1.5">
                    {[
                        { tier: 'Bronze 1',   level: 1,  color: 'text-amber-700',   border: 'border-amber-900/50',   bg: 'bg-amber-950/30' },
                        { tier: 'Bronze 2',   level: 2,  color: 'text-amber-700',   border: 'border-amber-900/50',   bg: 'bg-amber-950/30' },
                        { tier: 'Silver 1',   level: 3,  color: 'text-slate-300',   border: 'border-slate-500/50',   bg: 'bg-slate-800/40' },
                        { tier: 'Silver 2',   level: 4,  color: 'text-slate-300',   border: 'border-slate-500/50',   bg: 'bg-slate-800/40' },
                        { tier: 'Silver 3',   level: 5,  color: 'text-slate-300',   border: 'border-slate-500/50',   bg: 'bg-slate-800/40' },
                        { tier: 'Gold 1',     level: 6,  color: 'text-yellow-400',  border: 'border-yellow-700/50',  bg: 'bg-yellow-950/30' },
                        { tier: 'Gold 2',     level: 7,  color: 'text-yellow-400',  border: 'border-yellow-700/50',  bg: 'bg-yellow-950/30' },
                        { tier: 'Platinum 1', level: 8,  color: 'text-cyan-300',    border: 'border-cyan-800/50',    bg: 'bg-cyan-950/30' },
                        { tier: 'Platinum 2', level: 9,  color: 'text-cyan-300',    border: 'border-cyan-800/50',    bg: 'bg-cyan-950/30' },
                        { tier: 'Platinum 3', level: 10, color: 'text-cyan-300',    border: 'border-cyan-800/50',    bg: 'bg-cyan-950/30' },
                        { tier: 'Diamond 1',  level: 11, color: 'text-blue-300',    border: 'border-blue-700/50',    bg: 'bg-blue-950/30' },
                        { tier: 'Diamond 2',  level: 12, color: 'text-blue-300',    border: 'border-blue-700/50',    bg: 'bg-blue-950/30' },
                        { tier: 'Diamond 3',  level: 13, color: 'text-blue-300',    border: 'border-blue-700/50',    bg: 'bg-blue-950/30' },
                        { tier: 'Diamond 4',  level: 14, color: 'text-blue-300',    border: 'border-blue-700/50',    bg: 'bg-blue-950/30' },
                    ].map(v => (
                        <div key={v.tier} className={`flex items-center justify-between gap-3 ${v.bg} rounded-lg px-3 py-2 border ${v.border}`}>
                            <div className="flex items-center gap-2">
                                <Crown className={`w-3.5 h-3.5 shrink-0 ${v.color}`} />
                                <span className={`font-bold text-sm ${v.color}`}>{v.tier}</span>
                            </div>
                            <span className="text-xs font-mono text-purple-400 font-bold">+{v.level}% DMG / HP</span>
                        </div>
                    ))}
                    <div className="flex items-center gap-2 px-3 py-2 bg-slate-900/40 rounded-lg border border-slate-800/50 opacity-50">
                        <Crown className="w-3.5 h-3.5 text-slate-600" />
                        <span className="text-xs text-slate-600 italic">Higher tiers — coming soon</span>
                    </div>
                </div>
            </SectionCard>

            <SectionCard title="🔮 How to Get VIP" color="cyan">
                <div className="space-y-3">
                    <div className="bg-slate-900/60 rounded-xl p-4 border border-cyan-900/40">
                        <div className="font-bold text-cyan-300 text-sm mb-1">Purchase a VIP Tier</div>
                        <p className="text-xs text-slate-400 leading-relaxed">VIP tiers are purchased with <strong className="text-white">real money</strong> directly through the OmenX platform. Each tier comes with a <strong className="text-purple-300">weekly OMENX token allocation</strong> sent to your wallet — so your subscription pays you back in crypto!</p>
                        <div className="mt-2 bg-slate-800/60 rounded-lg p-2 border border-slate-700/50 text-[11px] text-slate-400 space-y-0.5">
                            <div className="flex items-center gap-2">
                                <span className={`font-bold ${phase === 2 ? 'text-cyan-400' : 'text-purple-400'}`}>Phase {phase}</span>
                                <span>{phaseLabel}</span>
                            </div>
                            {status !== 'complete' && phase === 2 && (
                                <div className="flex items-center gap-2"><span className="text-purple-400 font-bold">Phase 3</span><span>10 weeks — follows Phase 2</span></div>
                            )}
                            <div className="flex items-center gap-2"><span className="text-slate-500 font-bold">Beyond</span><span className="text-slate-500 italic">Allocation TBD after Phase 3</span></div>
                        </div>
                    </div>
                    <div className="bg-slate-900/60 rounded-xl p-4 border border-purple-900/40">
                        <div className="font-bold text-purple-300 text-sm mb-1">Automatic Detection (Once Per Sign-In)</div>
                        <p className="text-xs text-slate-400 leading-relaxed">Sign in with OmenX and your VIP tier is fetched <strong className="text-white">once</strong>, then cached — no codes, no background polling, no setup. Your in-game bonuses apply instantly every run. If you upgrade your VIP tier on OmenX, hit the <strong className="text-amber-300">Refresh VIP</strong> button on your Profile page to pull the new value (24h cooldown).</p>
                    </div>
                    <div className="bg-slate-900/60 rounded-xl p-4 border border-amber-900/40">
                        <div className="font-bold text-amber-300 text-sm mb-1">Stacks with Everything</div>
                        <p className="text-xs text-slate-400 leading-relaxed">VIP bonuses stack on top of all your permanent, weekly, and seasonal upgrades. It's the best long-term multiplier in the game — and it pays for itself.</p>
                    </div>
                </div>
            </SectionCard>
        </div>
    );
}

TABS_CONTENT.combat = (
        <div className="space-y-4">
            <SectionCard title="⚔️ Sectors & Penalties" color="cyan">
                <p className="text-sm md:text-base text-slate-300 leading-relaxed mb-4">
                    Each sector has a unique environment, enemy pool, and difficulty. Unlock new sectors by completing runs with each character. Every sector has its own environmental effect:
                </p>
                <div className="bg-slate-900/40 rounded-lg p-3 border border-cyan-700/50 text-xs text-slate-400 mb-4">
                    <strong className="text-cyan-400">Dynamic Difficulty:</strong> Enemies adapt to your performance — if you're crushing a sector, spawns get faster and tougher; if you're struggling, the game eases up. <strong className="text-white">No gold penalties</strong> for replaying earlier sectors.
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 text-sm">
                    <div className="bg-slate-900/60 p-3 md:p-4 rounded-xl border border-cyan-900/40 text-center flex flex-col justify-center">
                        <div className="text-cyan-400 font-bold mb-1">Neon Rain</div>
                        <div className="text-slate-400 text-xs md:text-sm">+Speed for all</div>
                    </div>
                    <div className="bg-slate-900/60 p-3 md:p-4 rounded-xl border border-slate-700 text-center flex flex-col justify-center">
                        <div className="text-slate-300 font-bold mb-1">Fog</div>
                        <div className="text-slate-400 text-xs md:text-sm">-Speed, fewer spawns</div>
                    </div>
                    <div className="bg-slate-900/60 p-3 md:p-4 rounded-xl border border-orange-900/40 text-center flex flex-col justify-center">
                        <div className="text-orange-400 font-bold mb-1">Solar Flare</div>
                        <div className="text-slate-400 text-xs md:text-sm">+Enemy spawns</div>
                    </div>
                </div>
            </SectionCard>

            <SectionCard title="🌟 Level Ups & Rarity" color="purple">
                <p className="text-sm md:text-base text-slate-300 leading-relaxed mb-4">
                    Every time you level up mid-run, you pick 1 of 3 random upgrades. Each can be one of 4 rarities:
                </p>
                <div className="bg-slate-900/40 rounded-lg p-3 border border-emerald-700/50 text-xs text-slate-400 mb-4">
                    <strong className="text-emerald-400">💡 Pool Bias points:</strong> Every <strong className="text-white">permanent</strong> stat, talent and weapon level you buy in the <strong className="text-white">Upgrade Lounge</strong> grants Pool Bias points (1 pt per level for the first 10, then 1 pt per 2 levels). Spend them on the <strong className="text-white">Loadouts</strong> page to make specific weapons or stats appear <strong className="text-white">+10% more often per point</strong> in your in-run level-up choices. <span className="text-slate-500">Weekly and seasonal upgrades don't grant points.</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 text-sm text-center">
                    <div className="rounded-xl p-3 md:p-4 border border-slate-600 bg-slate-800/50 flex flex-col justify-center">
                        <div className="text-slate-300 font-bold mb-1">Common</div>
                        <div className="text-slate-500 text-xs">×1 value</div>
                    </div>
                    <div className="rounded-xl p-3 md:p-4 border border-blue-700 bg-blue-950/30 flex flex-col justify-center">
                        <div className="text-blue-400 font-bold mb-1">Rare</div>
                        <div className="text-slate-400 text-xs">×1.5 value</div>
                    </div>
                    <div className="rounded-xl p-3 md:p-4 border border-purple-700 bg-purple-950/30 flex flex-col justify-center">
                        <div className="text-purple-400 font-bold mb-1">Epic</div>
                        <div className="text-slate-400 text-xs">×2 value</div>
                    </div>
                    <div className="rounded-xl p-3 md:p-4 border border-amber-600 bg-amber-950/30 flex flex-col justify-center">
                        <div className="text-amber-400 font-bold mb-1">Legendary</div>
                        <div className="text-slate-400 text-xs">×3 value</div>
                    </div>
                </div>
                <div className="mt-4 space-y-2">
                    <div className="bg-slate-900/60 rounded-lg p-3 border border-emerald-700/40">
                        <div className="font-bold text-emerald-300 text-xs md:text-sm mb-1.5 flex items-center gap-1.5">
                            <img src="https://media.base44.com/images/public/69de258a7e072380b89d66e3/01838179d_omenx_logo.png" className="w-3.5 h-3.5" alt="OMENX" /> In-Run OMENX Actions
                        </div>
                        <ul className="text-xs md:text-sm text-slate-400 space-y-1 leading-relaxed">
                            <li>• <strong className="text-white">Reroll</strong> the 3 upgrade choices — <strong className="text-emerald-300">2 OMENX</strong> (once per level-up).</li>
                            <li>• <strong className="text-white">Banish</strong> an upgrade from the pool for the rest of the run — tiered cost: <strong className="text-emerald-300">2 OMENX</strong> for the first 3 banishes, then <strong className="text-amber-300">4 OMENX</strong> for the next 3, then <strong className="text-rose-300">6 OMENX</strong> per banish.</li>
                            <li>• <strong className="text-white">Emergency Revive</strong> on death — <strong className="text-emerald-300">4 OMENX</strong> for 50% HP and 3s of invincibility.</li>
                        </ul>
                    </div>
                    <p className="text-xs text-slate-600">💡 Banishing a weapon you don't want increases the odds of getting your preferred ones on future level-ups.</p>
                </div>
            </SectionCard>

            <SectionCard title="👑 Boss Encounters" color="rose">
                <p className="text-sm text-slate-300 leading-relaxed mb-2">
                    Bosses appear at the end of certain sectors and in <strong className="text-purple-300">Endless Void</strong> (every 3 minutes after the previous boss is defeated). When a boss is active, normal enemy spawning stops.
                </p>
                <p className="text-sm text-slate-300 leading-relaxed">
                    Defeating a boss drops <strong className="text-fuchsia-400">Relic Fragments</strong> and rewards you with bonus Gold. Boss difficulty scales with game time and sector.
                </p>
            </SectionCard>

            <SectionCard title="🌍 Difficulty Modes" color="green">
                <p className="text-xs text-slate-400 mb-3 leading-relaxed">Difficulty changes enemy strength + how much XP and Gold you earn per run. Score is driven by the formula in the Compete tab.</p>
                <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-3 bg-slate-900/50 rounded-lg p-3 border border-emerald-900/40">
                        <div className="flex items-center gap-3">
                            <span className="text-emerald-400 font-bold w-20 shrink-0">Easy</span>
                            <span className="text-slate-400 text-xs">Forgiving start for new pilots. Slower enemies.</span>
                        </div>
                        <span className="text-emerald-400 font-bold text-xs font-mono shrink-0">−50% XP & Gold</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 bg-slate-900/50 rounded-lg p-3 border border-cyan-900/40">
                        <div className="flex items-center gap-3">
                            <span className="text-cyan-400 font-bold w-20 shrink-0">Normal</span>
                            <span className="text-slate-400 text-xs">Standard experience. Good for learning the ropes.</span>
                        </div>
                        <span className="text-cyan-400 font-bold text-xs font-mono shrink-0">Baseline</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 bg-slate-900/50 rounded-lg p-3 border border-pink-900/40">
                        <div className="flex items-center gap-3">
                            <span className="text-pink-400 font-bold w-20 shrink-0">Hard</span>
                            <span className="text-slate-400 text-xs">Tougher enemies. Occasional hazards.</span>
                        </div>
                        <span className="text-pink-400 font-bold text-xs font-mono shrink-0">+100% XP & Gold</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 bg-slate-900/50 rounded-lg p-3 border border-violet-900/40">
                        <div className="flex items-center gap-3">
                            <span className="text-violet-400 font-bold w-20 shrink-0">Cosmic</span>
                            <span className="text-slate-400 text-xs">Maximum chaos. Frequent hazards.</span>
                        </div>
                        <span className="text-violet-400 font-bold text-xs font-mono shrink-0">+200% XP & Gold</span>
                    </div>
                </div>
            </SectionCard>
        </div>
);

export default function Info() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('basics');
    const [payoutCfg, setPayoutCfg] = useState({ top_n: 20 });

    useEffect(() => {
        base44.functions.invoke('leaderboardPayoutConfig', { action: 'get' })
            .then(r => { if (r.data?.config) setPayoutCfg(r.data.config); })
            .catch(() => {});
    }, []);

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
                            {activeTab === 'compete' ? getCompeteContent(payoutCfg.top_n) : TABS_CONTENT[activeTab]}
                        </motion.div>
                    </AnimatePresence>
                </motion.div>
            </div>
        </div>
    );
}