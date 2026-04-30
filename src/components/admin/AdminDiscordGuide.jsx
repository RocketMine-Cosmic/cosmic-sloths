import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

const POSTS = [
    {
        title: 'Post 1 — Welcome & Quick Start',
        content: `🚀 **COSMIC SLOTHS — QUICK START**

Top-down auto-shooter where your weapons fire automatically — you move, dodge, and pick upgrades. Survive the sector timer to win, or push into Endless Void for infinite scaling.

🎮 **Controls**
• Desktop: WASD or Arrow Keys
• Mobile: Virtual Joystick
• ESC / P to Pause
• Full gamepad support (Xbox / PS / generic)

🌍 **Difficulty Modes** (choose before each run)
• Easy — −50% XP & Gold
• Normal — baseline
• Hard — +100% XP & Gold
• Cosmic — +200% XP & Gold

Difficulty doesn't directly multiply your score — but more XP & Gold per run *feeds* the score formula, so harder = bigger numbers.

🪐 **Sectors** — Station → Asteroid → Nebula → VoidRing → Singularity → Endless Void. Beat each sector with each pilot to unlock the next. Playing older sectors applies a **−10% Gold penalty per sector below your max** (capped at −50%) — keep pushing forward!

✅ **Just sign in with OmenX to start.** Your save, wallet, and progression sync automatically.`,
    },
    {
        title: 'Post 2 — Scoring & Leaderboards',
        content: `🏆 **HOW SCORING WORKS**

Score is calculated **server-side** at the end of every run:

\`Score = (Kills×10 + Level×100 + Time×5 + Gold×5 + Victory Bonus) × Sector Multiplier\`

• **Victory Bonus:** flat +5,000 if you beat the timer
• **Sector Multiplier:** ×1.0 (Station) → +0.2 per sector → ×1.8 (Singularity) → **×2.0 in Endless Void**
• Only your **highest score per period** counts on the leaderboard

📅 **Weekly Leaderboard** (resets Monday 00:00 UTC) — Top 100 earn OMENX
🥇 #1 — 10% | 🥈 #2 — 8% | 🥉 #3 — 6%
#4–10: 4% each | #11–20: 3% each | #21–30: 1.8% each
#31–50: 1.2% each | #51–100: 0.8% each
*(Weekly stat upgrades also reset.)*

🗓️ **Seasonal Leaderboard** (4-week cycles) — Top 100 earn OMENX
🥇 #1 — 8% | 🥈 #2 — 6% | 🥉 #3 — 5%
#4–10: 3% each | #11–20: 2.5% each | #21–30: 2% each
#31–40: 1.5% each | #41–60: 1% each | #61–100: 0.6% each
*(Seasonal stat upgrades reset at season end.)*

♾️ **Endless Void Leaderboard** — Permanent legacy ranking, never resets. **NOT eligible for OMENX payouts.** Single endless run is capped at 5,000 Gold and 2,000 kills credited to your account.

💠 Real OMENX is paid directly to your wallet at the end of each cycle — no claiming, no clicking.`,
    },
    {
        title: 'Post 3 — The 10 Pilots & NFT Unlocks',
        content: `👥 **THE 10 PILOTS**

🔵 **NeoByte** — Balanced starter. Support banner boosts allies' damage & cooldowns.
🩷 **Pandypaws** — Tank. High HP & armor, slow but unstoppable.
🟠 **NovaByte** — Glass cannon. Massive damage, low survivability.
🟣 **Glitch** — Assassin. Fastest movement, phase-shifts on hit.
🩵 **HoloDrift** — Engineer. Huge magnet range, drone synergy.
🟢 **CodeBreaker** — Fastest cooldowns, hacks enemies into allies.
🔵 **DataPhantom** — Fastest projectiles, life-leech on damage.
🟡 **NeonVortex** — Sniper. Long range, instant-kill chance.
🟡 **SynthBeats** — Gold farmer (×1.5 Gold income).
🩵 **SkyByte** — Balanced speed & damage all-rounder.

---

💎 **HOW TO UNLOCK PILOTS**

**Path 1 — NFT Ownership (Instant)**
Own a pilot's OmenX NFT? Unlocks instantly on sign-in. Plus you earn rarity-based per-run bonuses every single run:
⬜ Common → +5% Gold / +5% Fragments
🟢 Uncommon → +7% / +8%
🔵 Rare → +10% / +10%
🟣 Epic → +12% / +13%
🟡 Legendary → +15% / +15%
*(Sell the NFT and the pilot is removed — but your kill mastery is preserved if you re-acquire it.)*

**Path 2 — Kill Milestones (Permanent)**
Reach cumulative kill thresholds to randomly unlock pilots: **2k / 5k / 10k / 20k kills**. These unlocks **never expire**, NFT or not.

NeoByte is unlocked by default. Everyone else needs an NFT or a milestone.`,
    },
    {
        title: 'Post 4 — Weapons, Synergies & Evolutions',
        content: `🔫 **IN-RUN WEAPONS & UPGRADES**

Every level-up offers 3 random upgrades (Common / Rare / Epic / Legendary — higher rarity = bigger numbers). Spend OMENX to swing the RNG:

• **Reroll** the 3 choices → **2 OMENX** (once per level-up)
• **Banish** an upgrade for the rest of the run → tiered cost: **2 OMENX** for the first 3 banishes, **4 OMENX** for the next 3, then **6 OMENX** each
• **Emergency Revive** on death → **4 OMENX** (50% HP + 3s invincibility)

💡 *Permanent stat upgrades, talents, and Armory upgrades from the Sloth Lounge appear +15% more often per level invested in your in-run choices.*

**🪖 Base Weapons:** Neo Blaster · Cosmic Nap Beam · Plasma Whip · Sloth Swarm (drones) · Zero-G Napalm · Nova Pulse · Shield Bubble · Bouncing Blade · Toxic Cloud

**🔥 Synergies** (own 2 specific weapons in the same run = combine):
• Napalm + Shield → **Burning Barrier**
• Nap Beam + Nova Pulse → **Laser Nova**
• Whip + Drones → **Plasma Swarm**
• Napalm + Whip → **Flaming Lash**
• Toxic + Whip → **Venom Lash**
*(more to discover...)*

**✨ Evolutions** (max a weapon + own a specific passive = ultimate form):
• Nap Beam + Spatial Expander → **Supernova**
• Plasma Whip + Regen → **Vampiric Whip**
• Drones + Speed → **Drone Network**
• Napalm + Damage → **Hellfire**
• Nova Pulse + Cooldown → **Quantum Collapse**
• Shield Bubble + HP → **Aegis**

Track every discovered synergy + evolution in the **Codex**.`,
    },
    {
        title: 'Post 5 — Meta Progression (Sloth Lounge)',
        content: `📈 **SLOTH LOUNGE — BETWEEN-RUN UPGRADES**

🔧 **Stat Upgrades** — 3 tiers per stat:
• **Permanent** (forever)
• **Weekly** (resets Monday)
• **Seasonal** (resets every 4 weeks)
Stats: Damage · HP · Speed · Magnet · Regen · Cooldown · Luck · Armor · Crit

🔫 **Armory** — Upgrade individual weapons across **3 thematic stats** unique to each weapon (e.g. Shield Bubble → Barrier Strength / Bubble Size / Recharge Rate). Max all 3 to **Master** the weapon and unlock its ultimate form.

🌳 **Talent Trees** — Each pilot has a unique branching skill tree. Respec anytime for a Gold refund.

💎 **Ancient Relics** — Equip Relics for global stat boosts. Use **Relic Fragments** (dropped by bosses) to upgrade them to Lv.5: Cosmic Dice · Midas Core · Knowledge Drive · Blood Chalice · Annihilation Core.

🔨 **The Forge** — Convert 10,000 Gold → 1 Star Fragment (cap 30/day). Spend fragments to:
• Permanently enhance weapons beyond their normal cap
• Unlock powerful per-character passive augments
Forge upgrades **never reset**.

✨ **Cosmetics** — Trails, kill effects, character skins. Preview before you buy.

⚡ **+50% XP Session Buff** — 60-minute boost for 10 OMENX.

👑 **Character Mastery** — Earned per pilot:
• 2k kills → +5% Speed
• 5k kills → +10% Damage
• 10k kills → +15% Area
• 25k kills → −10% Cooldown
+ Mastery badges on your profile (Novice → Grandmaster).`,
    },
    {
        title: 'Post 6 — Dailies, Squads & Squad Wars',
        content: `🎯 **DAILY ACTIVITIES**

📅 **Daily Login Streak** — 7-day cycle, up to **4,000 Gold** on day 7. Miss a day → resets to day 1.
🎯 **3 Daily Bounties** — Gold or Relic Fragments. Auto-tracked during runs.
⚔️ **1 Daily Mission** — Awards **Seasonal Points** (100 = exclusive seasonal skin per pilot).

---

👥 **SQUADS** (up to 5 pilots)

Every kill any member scores auto-counts toward the squad's daily + weekly totals. Squads level from **Lv.1 Recruits → Lv.7 Cosmic Elite** (300k lifetime XP).

**Daily target** scales 300 → 12,000 kills | reward 150 Gold → 4,000 Gold + 3 Fragments
**Weekly target** scales 2,000 → 75,000 kills | reward 500 Gold → 15,000 Gold + 10 Fragments

Hit the target = **every member claims** their share. Roles: Leader (manages squad) + Members. Real-time squad chat included.

---

⚔️ **SQUAD WARS** (NEW — head-to-head every week)

Every Monday, your squad is auto-paired against a similar-level rival squad. Whichever squad scores more kills by **Sunday 23:59 UTC** wins. No opponent? You get a **bye week** (auto-win).

Per-member rewards (claim once after the war ends):
• 🏆 Win → **2,500 Gold + 3 Fragments**
• 🤝 Tie → 1,000 Gold + 1 Fragment
• 💀 Loss → 500 Gold (consolation)

👑 **CHAMPIONS POOL** — **10% of the entire seasonal OMENX pool** is reserved for the top 3 squads of each season. Split 50% / 30% / 20% between 1st / 2nd / 3rd, then divided equally among all squad members. Eligibility: ≥2 wars fought + ≥2 active members. Live standings on the **Squad Wars** page.`,
    },
    {
        title: 'Post 7 — Raids, Trials, Ultimates & VIP',
        content: `💀 **GLOBAL RAID** — Community vs World Boss

A massive boss with **shared global HP**. Every player's damage is permanently subtracted from its health pool worldwide.

• **5 Raid Runs/day** free, +5 more for **10 OMENX**
• Damage cuts the boss HP for everyone
• Boss defeated → respawns at next level with **+50% HP**
• Claim **250 Gold × Boss Level** per defeat (must have contributed damage)
• Live Activity banner shows real-time milestones + kills from players worldwide

---

⚡ **LEVIATHAN TRIALS** — Optional boss modifiers

Activate before a run. Stack any of: **FURY** (boss +50% dmg) · **FRENZY** (+50% speed) · **TITAN** (+100% HP). Beating the boss with modifiers active grants bonus rewards.

---

🎮 **SQUAD ULTIMATES** (mid-run panic button)

Floating buttons (bottom-right) summon an AI clone from your unlocked roster:
• **ULT LITE** — 5 OMENX (capped power, instant help)
• **ULT FULL** — 10 OMENX (scales with your full upgrades)

---

👑 **VIP** (14 tiers — Bronze 1 → Diamond 4)

Earned via **real-money VIP subscription** on the OmenX platform. Each tier grants **+1% Damage & +1% Max HP per run**, stacking with all your other upgrades.

Bonus: every VIP tier earns a **weekly OMENX allocation** paid directly to your wallet (Phase 2 + Phase 3, 10 weeks each) — your subscription literally pays you back in crypto.

🔄 Your VIP tier is fetched **once on sign-in** and cached for the session. Upgraded your tier? Use the **Refresh VIP** button on your Profile page (24h cooldown) to pull the new value.

---

🎉 **That's the full game.** Sign in with OmenX, hop in, and start climbing. Real crypto. Real competition. Real cute sloths in space. 🦥`,
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
                    <p className="text-xs text-slate-500 mt-0.5">7 ready-to-paste Discord posts. Each fits within Discord's 2,000-char limit. Copy individually and post in sequence in your #game-guide channel.</p>
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