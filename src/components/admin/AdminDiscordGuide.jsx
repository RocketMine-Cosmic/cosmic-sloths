import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

const POSTS = [
    {
        title: 'Post 1 — Quick Start',
        content: `🚀 **COSMIC SLOTHS — QUICK START**

Top-down auto-shooter. Weapons auto-fire — you move & dodge. Survive the timer to win.

**Controls:** WASD/Arrows or Virtual Joystick | ESC/P Pause | Full gamepad & mobile support

**Scoring:** Kills × Time × Difficulty Multiplier
• Normal ×1.0 | Hard ×1.5 | Cosmic ×2.0
• Only highest score per week counts on leaderboard

**Difficulties:** Normal (standard) | Hard (harder, better rewards) | Cosmic (maximum chaos, best multiplier)`,
    },
    {
        title: 'Post 2 — Leaderboards & OMENX',
        content: `🏆 **LEADERBOARDS — EARN REAL CRYPTO**

Three live leaderboards. Real OMENX rewards sent automatically to your wallet (no claiming needed).

📅 **Weekly** — Top 30 earn OMENX
🗓️ **Seasonal** — Top 40 earn OMENX (4-week cycles)
♾️ **Endless Void** — All-time high score

💠 **Reward Pool:** Every OMENX spent in-game (rerolls, banishes, power-ups) feeds back into the prize pools. More players spending = bigger rewards.

⚠️ Link your OmenX wallet to receive payouts. Rewards auto-distribute after each period.`,
    },
    {
        title: 'Post 3 — The 10 Pilots & NFT Unlocks',
        content: `👥 **10 UNIQUE PILOTS**

🔵 **NeoByte** — Balanced starter. Support banner boosts damage & cooldowns.
🩷 **Pandypaws** — Tank. High HP & armor.
🟠 **NovaByte** — Glass cannon with massive damage.
🟣 **Glitch** — Assassin. Fastest movement, phase-shifts on hit.
🩵 **HoloDrift** — Engineer. Huge magnet range.
🟢 **CodeBreaker** — Fastest cooldowns, hacks enemies.
🔵 **DataPhantom** — Fastest projectiles, leeches damage.
🟡 **NeonVortex** — Sniper with instant kills.
🟡 **SynthBeats** — Gold farmer (×1.5 income).
🩵 **SkyByte** — Balanced speed & damage.

---

💎 **UNLOCK PATHS**

**NFT Ownership (Instant)** — Own the NFT = instant unlock + per-run bonuses (+5% to +15% Gold & Fragments based on rarity)

**Kill Milestones (Permanent)** — 2k/5k/10k/20k kills unlock random pilots (never expire)

**Rarity Bonuses (NFT Only):** ⬜ Common +5% | 🟢 Uncommon +7%/+8% | 🔵 Rare +10% | 🟣 Epic +12%/+13% | 🟡 Legendary +15%`,
    },
    {
        title: 'Post 4 — Weapons & Synergies',
        content: `🔫 **WEAPONS, SYNERGIES & EVOLUTIONS**

Pick 1 of 3 upgrades every level (Common to Legendary). Use OMENX to Reroll or Banish.

**Base Weapons:** Blaster · Nap Beam · Plasma Whip · Orbital Drones · Napalm · Nova Pulse · Shield Bubble · Ricochet Blade · Toxic Emitter

**Synergies** (combine 2 weapons):
Napalm+Shield → Burning Barrier | Nap+Nova → Laser Nova | Whip+Drones → Plasma Swarm
Nap+Drones → Orbital Lasers | Whip+Nova → Seismic Whip | Napalm+Whip → Flaming Lash
Toxic+Whip → Venom Lash

**Evolutions** (max weapon = special forms):
Nap+Area → Supernova | Whip+Regen → Vampiric | Drones+Speed → Network
Napalm+Damage → Hellfire | Nova+Cooldown → Quantum Collapse | Bubble+HP → Aegis`,
    },
    {
        title: 'Post 5 — Meta Progression',
        content: `📈 **SLOTH LOUNGE — PERMANENT UPGRADES**

🔧 **Stat Upgrades** (3 tiers: Permanent/Weekly/Seasonal)
Damage · HP · Speed · Magnet · Regen · Cooldown · Luck

🔫 **Armory** — Upgrade weapons (Damage/Area/Cooldown). Max all 3 = Mastery + Evolution.

🌳 **Talent Trees** — Unique per pilot. Respec anytime for gold.

💎 **Relics** — Global stat boosts, upgrade to Lv.5: Cosmic Dice · Midas Core · Knowledge Drive · Blood Chalice · Annihilation Core

🔨 **The Forge** — 10k Gold = 1 Star Fragment (max 30/day). Permanently enhance weapons & unlock character traits. NEVER resets.

👑 **Character Mastery** — 2k kills +5% Speed | 5k kills +10% Damage | 10k kills +15% Area | 25k kills -10% Cooldown`,
    },
    {
        title: 'Post 6 — Dailies, Squads, Raids & VIP',
        content: `🎯 **DAILIES, SQUADS & EVENTS**

📅 **Login Streak** — 7 days up to 4k Gold (miss 1 = reset)
🎯 **3 Bounties/day** — Gold or Relic Fragments
⚔️ **1 Daily Mission** — Seasonal Points (100 = exclusive skin)

👥 **Squads** (up to 5 pilots) — Kills auto-count. 7 levels (Recruits → Elite). Hit weekly target = all members claim Gold + Fragments.

💀 **Global Raid** (5 runs/day) — Your damage permanently cuts boss HP. Levels up every defeat. Rewards scale with level.

⚔️ **Leviathan Trials** — Stack modifiers: FURY (+50% dmg) · FRENZY (+50% speed) · TITAN (+100% HP)

👑 **VIP** (14 tiers) — Each tier +1% Damage & +1% Max HP per run. Weekly OMENX allocation. Auto-detected.`,
    },
];

function PostCard({ post, index }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(post.content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="bg-[#0b0416]/80 border border-slate-700/50 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50 bg-slate-900/40">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 bg-slate-800 px-2 py-0.5 rounded">#{index + 1}</span>
                    <span className="text-sm font-bold text-slate-200">{post.title}</span>
                </div>
                <button
                    onClick={handleCopy}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        copied
                            ? 'bg-emerald-700 text-white'
                            : 'bg-indigo-700 hover:bg-indigo-600 text-white'
                    }`}
                >
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    {copied ? 'Copied!' : 'Copy'}
                </button>
            </div>
            <pre className="p-4 text-xs text-slate-300 whitespace-pre-wrap font-sans leading-relaxed overflow-x-auto">
                {post.content}
            </pre>
        </div>
    );
}

export default function AdminDiscordGuide() {
    const [copiedAll, setCopiedAll] = useState(false);

    const handleCopyAll = () => {
        const all = POSTS.map(p => p.content).join('\n\n---\n\n');
        navigator.clipboard.writeText(all);
        setCopiedAll(true);
        setTimeout(() => setCopiedAll(false), 2000);
    };

    return (
        <div className="space-y-4">
            <div className="bg-[#0b0416]/80 border border-indigo-900/50 rounded-xl p-4 flex items-center justify-between gap-4">
                <div>
                    <h2 className="text-base font-bold text-indigo-400 uppercase tracking-widest">📋 Discord Guide Posts</h2>
                    <p className="text-xs text-slate-500 mt-0.5">6 ready-to-paste Discord posts. Copy each individually and post in sequence in your #game-guide channel.</p>
                </div>
                <button
                    onClick={handleCopyAll}
                    className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                        copiedAll ? 'bg-emerald-700 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                    }`}
                >
                    {copiedAll ? <Check size={12} /> : <Copy size={12} />}
                    {copiedAll ? 'Copied All!' : 'Copy All'}
                </button>
            </div>

            {POSTS.map((post, i) => (
                <PostCard key={i} post={post} index={i} />
            ))}
        </div>
    );
}