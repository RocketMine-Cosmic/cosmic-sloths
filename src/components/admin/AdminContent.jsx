import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const GAME_DESCRIPTION = `# 🦥 COSMIC SLOTHS

*The laziest roguelike with the realest payouts. Pick your sloth. Survive the cosmos. Earn real crypto.*

---

## 🎮 WHAT IS IT?

Cosmic Sloths is a **survivor roguelike** built on the OmenX blockchain ecosystem. Move with WASD or a virtual joystick — your weapons fire automatically. Blast through 10 hand-crafted sectors filled with increasingly unhinged alien enemies. Survive the timer. Beat the boss. Stack gold and OMENX.

The twist? **Top-ranked players earn real OMENX tokens** paid directly to their wallet at the end of every week and season.

---

## 🧑‍🚀 10 PLAYABLE CHARACTERS

Three sloths are unlocked from the start. The rest are bought with Gold.

- **NeoByte** — Balanced commander. Deploys a damage-boosting support banner every 15s.
- **Pandypaws** — Tanky but slow. 5% chance on kill to permanently gain armor from scrap.
- **NovaByte** — High damage, big AoE, low HP. 10% chance on kill to chain explode nearby enemies.
- **Glitch** — Glass cannon assassin. 15% chance when hit to phase into invulnerability.
- **HoloDrift** — Massive magnet range, 30% XP bonus. Deploys a decoy every 20s to taunt enemies.
- **CodeBreaker** — Fast cooldowns, high luck. Hacks a nearby enemy every 10s to fight for you.
- **DataPhantom** — High projectile speed and armor. Leeches data from enemies to slow them.
- **NeonVortex** — Extreme damage but very slow fire rate. Executes enemies below 20% HP instantly.
- **SynthBeats** — 50% bonus gold, high luck. Automatically bribes death with 5 Gold to negate hits.
- **SkyByte** — Very fast ace pilot. Charges a Sonic Boom while moving that detonates on stop.

Each character has a unique **Talent Tree**, **Mastery system** (Novice → Grandmaster), and multiple purchasable **colour skins** — including exclusive seasonal reward skins.

---

## 🗺️ 10 SECTORS TO CONQUER

Unlock sectors by beating the previous one. Each has a fixed survival timer, a unique visual environment, and a weather effect:
- **Neon Rain** — Speed boost for everyone
- **Fog** — Reduced speed and fewer enemy spawns
- **Solar Flare** — Increased enemy spawns

Sectors range from 3 minutes (Azure Expanse) up to 7:30 (Rainbow Rift). Playing older sectors applies a **-10% Gold penalty per tier below your furthest unlock** (max -50%).

An **Endless Void** mode is also available — infinitely scaling difficulty with boss fights every 3 minutes.

---

## ⚔️ DIFFICULTY MODES

- **Easy** — 0.7x enemy HP/damage, -50% XP & Gold
- **Normal** — Standard
- **Hard** — 1.5x enemy HP/damage, +100% XP & Gold, occasional hazards
- **Cosmic** — 2.5x enemy HP/damage, +200% XP & Gold, frequent hazards

---

## 🔫 WEAPONS, SYNERGIES & EVOLUTIONS

9 base weapons drop during runs (Blaster, Cosmic Nap Beam, Plasma Whip, Orbital Drones, Zero-G Napalm, Nova Pulse, Shield Bubble, Ricochet Blade, Toxic Emitter).

**Synergies:** Hold two specific weapons simultaneously and they automatically fuse into a powerful combo weapon. There are 7 synergy combos to discover — track them in your Synergy Codex.

**Evolutions:** Max out a weapon's upgrades (Damage + Area + Cooldown to level 5 each) to reach **Mastery**, then combine it with the right passive to unlock its ultimate evolved form. 7 evolutions total.

**Upgrade cost:** Use **OMENX to Reroll** your level-up picks (2 OMENX) or **Banish** a specific choice (1 OMENX).

---

## 🛠️ THE UPGRADE LOUNGE

Your permanent base between runs. Spend **Gold** or **OMENX** on:

- **Stats** — 7 stats (Damage, HP, Speed, Pickup Range, Regen, Cooldown, Luck) across 3 upgrade tiers:
  - *Permanent* — Never resets
  - *Weekly* — Resets every Monday
  - *Seasonal* — Resets every 4 weeks
- **Armory** — Upgrade each weapon's Damage, Area, and Cooldown. Max all 3 = Mastery.
- **Skill Trees** — Character-specific talent trees with branching paths. Respec anytime for a Gold refund.
- **Ancient Relics** — Equip up to 2 relics for global buffs. Upgrade using Relic Fragments (dropped by bosses). 5 tiers: Common to Legendary.
- **The Forge** — Convert 1,000 Gold = 1 Star Fragment (max 20/day). Use Star Fragments to permanently augment weapons beyond their normal cap. Forge upgrades never reset.
- **Cosmetics** — Trails, kill effects, and character skins. Preview before buying.

---

## 🏆 LEADERBOARDS & OMENX REWARDS

OMENX rewards come from the prize pool (funded by in-game OMENX spending). 25% of weekly spend = weekly prizes. 35% of seasonal spend = seasonal prizes.

**Weekly Leaderboard** — Resets every Monday. Top 30 players paid:
- #1: 10% | #2: 8% | #3: 6% | #4-10: 4% each | #11-20: 3% each | #21-30: 1.8% each

**Seasonal Leaderboard** — 4-week cycles. Top 40 players paid:
- #1: 8% | #2: 6% | #3: 5% | #4-10: 3% each | #11-20: 2.5% each | #21-30: 2% each | #31-40: 1.5% each

Rewards are sent automatically to your OmenX wallet at the end of each period.

---

## 👥 SLOTH SQUADS

Form a crew of up to **5 pilots**. Every kill you make in any run automatically counts toward your squad's weekly total — no setup required.

**7 Squad Tiers:** Recruits -> Drifters -> Hunters -> Vanguards -> Reapers -> Legends -> Cosmic Elite

Each tier unlocks bigger **Daily & Weekly bounties** — shared kill targets that every member can individually claim for Gold and Relic Fragments. For example:
- Lv.1: 2,000 kills = 500 Gold + 1 Fragment
- Lv.7: 75,000 kills = 15,000 Gold + 10 Fragments

Squads also have a real-time **Squad Chat** and appear on the weekly squad leaderboard.

---

## 💀 GLOBAL RAID BOSS

A permanent community-wide World Boss with **shared HP across all players**. Launch up to **5 Raid Runs per day** — your damage permanently chips away at the global HP pool.

When the boss hits 0, it respawns at the next level with **+50% more max HP**. Rewards scale: claim **1,000 Gold x boss level** for each level defeated (must have dealt damage to claim).

---

## 🎁 DAILY REWARDS

**Login streak** — 7-day escalating rewards (Day 7: 4,000 Gold). Miss a day and your streak resets.

**Daily Bounties** — 3 random challenges refreshed each day for Gold or Relic Fragments.

**Daily Mission** — One harder challenge worth **10 Seasonal Points**. Collect 100 points = unlock that season's exclusive character skin.

---

## ⚡ LEVIATHAN TRIALS

Activate boss modifiers before a run for a harder fight:
- FURY — Boss deals +50% damage
- FRENZY — Boss moves +50% faster
- HIDE — Boss has +100% HP

---

## 👑 VIP STATUS

Purchase a VIP tier through the OmenX platform. Each tier = **+1% Damage and +1% Max HP** per run (cumulative).

**14 tiers:** Bronze 1-2, Silver 1-3, Gold 1-2, Platinum 1-3, Diamond 1-4

VIP is automatically detected from your OmenX wallet. Every tier comes with a **weekly OMENX token allocation** sent to your wallet — your subscription pays you back in crypto.

---

## 💰 OMENX

The premium Web3 currency of the OmenX ecosystem (BNB Chain).

**Earn:** Rank in the top 30/40 on weekly/seasonal leaderboards.
**Buy:** Via Thirdweb on BNB Chain.
**Spend in-game:** Rerolls (2), banishes (1), revives (4), squad ultimates (4), cosmetics, stat upgrades, and more.

Your live OMENX balance is displayed in the top bar at all times.

---

*Squad up. Slay the cosmos. Earn real crypto. Repeat.*`;

export default function AdminContent() {
    const { toast } = useToast();
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(GAME_DESCRIPTION);
            setCopied(true);
            toast({ title: "Copied!", description: "Game description copied to clipboard." });
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            toast({ title: "Error", description: "Failed to copy to clipboard." });
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">Game Description</h2>
                <button
                    onClick={handleCopy}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                        copied
                            ? 'bg-emerald-600 text-white'
                            : 'bg-cyan-600 hover:bg-cyan-500 text-white'
                    }`}
                >
                    {copied ? (
                        <>
                            <Check className="w-4 h-4" /> Copied!
                        </>
                    ) : (
                        <>
                            <Copy className="w-4 h-4" /> Copy Markdown
                        </>
                    )}
                </button>
            </div>

            <div className="bg-slate-900/50 rounded-xl border border-slate-700 p-4 md:p-6 max-h-[70vh] overflow-y-auto">
                <pre className="text-xs md:text-sm text-slate-300 whitespace-pre-wrap break-words font-mono leading-relaxed">
                    {GAME_DESCRIPTION}
                </pre>
            </div>
        </div>
    );
}