import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

const POSTS = [
    {
        title: 'Post 1 — Quick Start Guide',
        content: `🚀 **COSMIC SLOTHS — QUICK START GUIDE**

Top-down auto-shooter. Weapons fire automatically — you move, dodge and build. Survive the sector timer to win.

**Controls**
• WASD / Arrow Keys — Move
• ESC or P — Pause
• Full gamepad & mobile support

**Score Formula**
Kills × Time Survived × Difficulty Multiplier
• Normal ×1.0 | Hard ×1.5 | Cosmic ×2.0
• Easy is not eligible for leaderboards
• Only your HIGHEST score per week counts

**Difficulty**
• Hard — +100% XP & Gold, tougher enemies
• Cosmic — +200% XP & Gold, maximum chaos
→ Push Cosmic if you want to compete seriously`,
    },
    {
        title: 'Post 2 — Leaderboards & Rewards',
        content: `🏆 **LEADERBOARDS & OMENX REWARDS**

Two live competitive leaderboards. Rewards are real OMENX sent automatically to your wallet — no claiming needed.

📅 **Weekly** — Resets every Monday. Top 30 earn OMENX.
🗓️ **Seasonal** — 4-week cycle. Top 40 earn OMENX.
♾️ **Endless Void** — All-time high score. Never resets.

💠 **How the reward pool works**
Every OMENX spent in-game (rerolls, banishes, buffs, upgrades) goes back into the weekly and seasonal prize pools. The more the community plays, the bigger the prizes get.

⚠️ You must have a linked OmenX wallet to receive rewards. Rewards are distributed automatically after each period closes.`,
    },
    {
        title: 'Post 3 — The 10 Pilots',
        content: `👥 **THE 10 PILOTS**

🔵 **NeoByte** — Balanced starter. Support banner every 15s boosts damage & cooldowns.
🩷 **Pandypaws** — Tank. High HP & armor, slow. Kills have 5% chance to drop permanent armor scrap.
🟠 **NovaByte** — Glass cannon. Huge damage & area. Kills have 10% chance to chain explode.
🟣 **Glitch** — Assassin. Fastest movement. 15% chance when hit to phase-shift and become invulnerable.
🩵 **HoloDrift** — Engineer. Massive magnet range, +30% XP. Decoy taunts enemies every 20s.
🟢 **CodeBreaker** — Hacker. Fastest cooldowns. Hacks an enemy to fight for you every 10s.
🔵 **DataPhantom** — Fastest projectiles, good armor. Leeches data to slow enemies.
🟡 **NeonVortex** — Sniper. ×2.0 damage but very slow cooldowns. Executes enemies below 20% HP.
🟡 **SynthBeats** — Gold farmer. ×1.5 gold, high luck. Bribes death with 5 gold per hit.
🩵 **SkyByte** — Ace Pilot. Fast, good damage & area. Charges a Sonic Boom while moving.`,
    },
    {
        title: 'Post 4 — Weapons, Synergies & Evolutions',
        content: `🔫 **WEAPONS, SYNERGIES & EVOLUTIONS**

Pick 1 of 3 upgrades every level-up (Common / Rare / Epic / Legendary).
Use OMENX to **Reroll** (new choices) or **Banish** (remove from pool).

**Base Weapons**
Blaster · Cosmic Nap Beam · Plasma Whip · Orbital Drones
Zero-G Napalm · Nova Pulse · Shield Bubble · Ricochet Blade · Toxic Emitter

**Synergies** — get both weapons in one run to merge them:
Napalm + Shield Bubble → 🔥 Burning Barrier
Nap Beam + Nova Pulse → ⚡ Laser Nova
Plasma Whip + Orbital Drones → 🌿 Plasma Swarm
Nap Beam + Orbital Drones → 🔦 Orbital Lasers
Plasma Whip + Nova Pulse → 🌍 Seismic Whip
Napalm + Plasma Whip → 🔥 Flaming Lash
Toxic Emitter + Plasma Whip → ☣️ Venom Lash

**Evolutions** — max a weapon + pick the matching passive:
Nap Beam + Area → Supernova Beam
Plasma Whip + Regen → Vampiric Lash
Orbital Drones + Speed → Orbital Defense Network
Napalm + Damage → Hellfire
Nova Pulse + Cooldown → Quantum Collapse
Shield Bubble + HP → Aegis Matrix
Ricochet Blade + Proj Speed → Buzzsaw Swarm`,
    },
    {
        title: 'Post 5 — Progression & Lounge',
        content: `🏠 **SLOTH LOUNGE — META PROGRESSION**

Everything here persists between runs.

📈 **Stat Upgrades** (3 tiers, all stack)
• Permanent — never resets
• Weekly — resets Monday
• Seasonal — resets every 4 weeks
Stats: Damage · HP · Speed · Magnet · Regen · Cooldown · Luck

🔫 **Armory** — Upgrade weapons (Damage / Area / Cooldown). Max all 3 = Mastery + evolution unlocked.

🌳 **Talent Trees** — Unique 3-tier branching tree per pilot. Respec anytime for gold.

🔮 **Relics** — Global stat bonuses, upgraded with Relic Fragments (boss drops) up to Lv.5 Legendary:
🎲 Cosmic Dice | 💰 Midas Core | 🧠 Knowledge Drive | 🍷 Blood Chalice | 💥 Annihilation Core

🔨 **The Forge** — 10,000 Gold = 1 🌟 Star Fragment (max 30/day). Permanently augment weapons & unlock character traits. Forge upgrades NEVER reset.

🏅 **Character Mastery** — Play a pilot to earn permanent bonuses:
🔵 2,000 kills → +5% Speed
🟣 5,000 kills → +10% Damage
🟡 10,000 kills → +15% Area
👑 25,000 kills → -10% Cooldown`,
    },
    {
        title: 'Post 6 — Dailies, Squads & Raid',
        content: `🎯 **DAILIES, SQUADS & GLOBAL RAID**

**Daily Bounties** (3/day) — earn Gold or Relic Fragments
**Daily Mission** (1/day) — earn Seasonal Points → 100 pts = exclusive character skin
**Daily Login** — streak up to Day 7 for up to 4,000 Gold. Miss a day = resets.

👥 **Squads** — up to 5 pilots. Kills auto-contribute to squad weekly total. 7 level tiers (Recruits → Cosmic Elite). Hit the weekly kill target and every member claims Gold + Relic Fragments.

⚔️ **Leviathan Trials** — stack boss modifiers for bonus rewards:
FURY (+50% dmg) · FRENZY (+50% speed) · TITAN (+100% HP)

💀 **Global Raid** — Community World Boss. Up to 5 runs/day. Your damage permanently depletes shared HP. Boss levels up when defeated (+50% HP each time). Rewards scale with boss level. Must contribute to claim.

👑 **VIP** — 14 tiers (Bronze 1 → Diamond 4). Each tier = +1% Damage & +1% Max HP per run (stacking with other upgrades). Includes a weekly OMENX allocation. Auto-detected from your OmenX wallet.`,
    },
    {
        title: 'Post 7 — NFT Character Unlocks & Bonuses',
        content: `💎 **NFT CHARACTER UNLOCKS & BONUSES**

Two paths to unlock every pilot in Cosmic Sloths:

**Path 1 — Own the NFT (Instant)**
🔹 Own an OmenX NFT? Instantly unlock the character — no grind required.
🔹 Earn rarity-based Gold & Relic Fragment bonuses every run you play that character.
🔹 Sell the NFT? Character is removed from roster, but your mastery is preserved. Re-acquire later and jump right back in.

**Path 2 — Kill Milestones (Permanent)**
🔹 Reach cumulative kill thresholds with any character:
  2,000 kills → Unlock 1 new character (random)
  5,000 kills → Unlock 1 new character (random)
  10,000 kills → Unlock 1 new character (random)
  20,000 kills → Unlock 1 new character (random)
🔹 Milestone unlocks are **never removed**, even without the NFT.

**Rarity-Based Per-Run Bonuses** (NFT Only)
Bonuses apply ONLY to the character you're playing in that run:
⬜ Common — +5% Gold, +5% Relic Fragments
🟢 Uncommon — +7% Gold, +8% Relic Fragments
🔵 Rare — +10% Gold, +10% Relic Fragments
🟣 Epic — +12% Gold, +13% Relic Fragments
🟡 Legendary — +15% Gold, +15% Relic Fragments

**Key Points**
✅ NFTs unlock characters instantly—no mandatory progression gate
✅ Bonuses are per-character-per-run (select a character, get its bonus for that run only)
✅ Mastery transfers between NFT unlocks and milestone unlocks
✅ NeoByte is free for everyone to start`,
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