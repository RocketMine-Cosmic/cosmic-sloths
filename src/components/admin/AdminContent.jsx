import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const GAME_DESCRIPTION = `# 🦥 COSMIC SLOTHS

> *The laziest roguelike with the realest payouts. Squad up. Slay. Stack OMENX.*

---

## 🎮 DROP IN, SURVIVE, EARN

Blast through **10 hand-crafted sectors** filled with cosmic chaos. Move with WASD or your joystick. Your weapons? They auto-fire at whatever's closest. Survive the timer. Climb the leaderboards. **Earn real Web3 currency** based on your performance.

### ⚡ The Core Loop
1. **Move & Fight** — WASD/Arrows or Virtual Joystick. Auto-firing weapons handle the rest.
2. **Level Up** — Defeat enemies for XP. Pick 1 of 3 random upgrades (Common → Legendary).
3. **Unlock Sectors** — Beat runs to unlock new arenas with unique enemies and environments.
4. **Face Bosses** — Epic encounters drop Relic Fragments and massive gold bonuses.
5. **Earn Real Rewards** — Top leaderboard performers get OMENX sent to their wallet every week.

---

## 🛠️ FORGE YOUR POWER IN THE SLOTH LOUNGE

Between runs, visit your cosmic base and spend **Gold** and **OMENX** to get stronger:

| Feature | What You Get |
|---------|-------------|
| **👤 Characters** | Unlock sloths via **kill milestones OR NFT ownership**. Own an NFT? Instant unlock + per-run bonuses (+5-15% Gold & Fragments based on rarity). |
| **⬆️ Stat Upgrades** | 3 tiers: Permanent / Weekly / Seasonal—stronger each cycle |
| **🔫 Armory** | Master weapons (Damage + Area + Cooldown) to unlock ultimate forms |
| **💎 Ancient Relics** | Equip for global buffs. Upgrade with Relic Fragments. |
| **✨ Cosmetics** | Trails, kill effects, character skins—flex your style |
| **🔨 The Forge** | Convert Gold → Star Fragments to permanently enhance weapons |

### 🔥 Advanced Synergies
Discover **Weapon Synergies**: combine two specific weapons mid-run to unlock game-changing power combos. Track them all in your **Synergy Codex**.

---

## 🏆 COMPETE FOR OMENX

Three leaderboards. Real crypto rewards.

### 📅 **Weekly Leaderboard**
- Resets every Monday
- **ALL ranked players earn OMENX** with dynamic scaling:
  - Ranks 1–30: Top-tier rewards
  - Ranks 31–50: Mid-tier rewards
  - Ranks 51–100: Lower rewards
  - Rank 100+: Minimal rewards
- Stat upgrades reset each week

### 🗓️ **Seasonal Leaderboard**
- 4-week cycles
- **ALL ranked players earn OMENX** with dynamic scaling:
  - Ranks 1–40: Top-tier rewards
  - Ranks 41–60: Mid-tier rewards
  - Ranks 61–100: Lower rewards
  - Rank 100+: Minimal rewards
- Seasonal upgrades reset end-of-season

### ♾️ **Endless Void**
- Infinitely scaling difficulty
- Boss fights every 3 minutes
- All-time high scores tracked globally

---

## 👥 SLOTH SQUADS — RAID TOGETHER

Create or join a crew of up to **5 players**. Every kill you make—in any run—counts toward your squad's weekly total.

### 📈 **Squad Levels** (7 tiers)
🦥 **Recruits** → ⭐ **Drifters** → 🔥 **Hunters** → ⚡ **Vanguards** → 💀 **Reapers** → 👑 **Legends** → 🌌 **Cosmic Elite**

**Level up?** Unlock harder bounties with bigger rewards.

### 🛡️ **Shared Bounties**
Hit weekly kill targets. **Every member** can individually claim:
- 💰 Gold (scales by squad level: 500–15,000)
- 🧩 Relic Fragments (scales by squad level: 1–10)

### 💬 **Squad Chat**
Real-time messaging to coordinate with your team.

---

## 🌍 DIFFICULTY & MODIFIERS

### 🎯 **Sector Penalties**
Playing older sectors? **-10% Gold per sector below your max unlocked arena** (capped at -50%). Keep pushing forward to maximize earnings!

### 🌟 **Difficulty Modes**
- **Normal** — Learn the ropes
- **Hard** — Enemies hit harder. Better score multiplier.
- **Cosmic** — Maximum chaos. Best multiplier for leaderboard grinders.

### ⚔️ **Leviathan Trials**
Stack any of 6 modifiers before a run to make bosses **tougher & more rewarding**:
- 🔴 **FURY** — Bosses deal +50% damage (+500 boss Gold drop)
- 🟠 **FRENZY** — Bosses move +50% faster (+1 reroll token on boss kill)
- 🟣 **THICK HIDE** — Bosses have +100% HP (+50% boss XP)
- 🔵 **BULLET HELL** — Bosses fire 2× projectiles (+30% total score)
- 🟢 **REGEN** — Boss heals 1% Max HP/sec (+800 boss Gold drop)
- 🟧 **UNSTOPPABLE** — Boss ignores slow & pushback (+1,000 boss Gold drop)

---

## 🎁 DAILY GRIND & MISSION REWARDS

### 📅 **Daily Login Streak**
7-day escalating rewards. Miss a day? Streak resets to Day 1.

### 🎯 **Daily Bounties**
3 random challenges every day → **Gold** or **Relic Fragments**

### ⚔️ **Daily Mission**
One harder challenge → **Seasonal Points** (collect 100 for exclusive seasonal skins)

### 👥 **Squad Weekly Bounty**
Hit your squad's shared weekly kill target → every member individually claims **Gold + Relic Fragments** (scales with squad level: up to 15,000 Gold + 10 Fragments at Lv.7)

---

## 💀 GLOBAL RAID BOSS

**Community-wide cooperative event.** A massive World Boss with **shared HP across all players**. Deal damage in up to **5 Raid Runs per day**—your damage is permanent.

### 🔥 **Infinite Scaling**
- Boss reaches 0 HP? → Respawns at **next level**
- Each level? → Boss gains **+50% max HP**
- Your rewards? → **Scale with boss level** (250 Gold × Level claimable per milestone)

---

## ✨ IN-RUN PICKUPS

| Icon | Item | Effect |
|------|------|--------|
| 💎 | **XP Gems** | Dropped by every enemy. Level up to pick upgrades. |
| 🪙 | **Gold Coins** | Random drops. Spend in the Lounge. |
| 🧩 | **Relic Fragments** | Boss drops. Craft & upgrade Relics. |
| ☢️ | **Nuke** | Destroys all non-boss enemies instantly. |
| 🧲 | **Magnet Surge** | Pulls all nearby XP & Gold to you. |
| 🛡️ | **Shield Overcharge** | 10 seconds of full invincibility. |

---

## 👑 VIP STATUS

Purchase **VIP Tiers** with real money. Your subscription pays you back in OMENX each week.

### ⚡ **VIP Bonuses**
Each tier = **+1% Damage** & **+1% Max HP** per run. Bonuses **stack** with all your upgrades.

**14 Tiers Available:** Bronze 1–2 → Silver 1–3 → Gold 1–2 → Platinum 1–3 → Diamond 1–4

*(VIP is automatically detected from your OmenX wallet — no setup required.)*

---

## 💎 NFT INTEGRATION

### 🔓 **Character Unlocks**
- **Own the NFT?** → Instantly unlock the character + earn rarity-based per-run bonuses
- **No NFT?** → Reach cumulative kill milestones (2k, 5k, 10k, 20k kills) for permanent unlocks
- **Sell your NFT?** → Character is removed from roster, but mastery is preserved for re-acquisition

### 🎁 **Rarity-Based Per-Run Bonuses**
- ⬜ **Common** — +5% Gold, +5% Relic Fragments
- 🟢 **Uncommon** — +7% Gold, +8% Relic Fragments
- 🔵 **Rare** — +10% Gold, +10% Relic Fragments
- 🟣 **Epic** — +12% Gold, +13% Relic Fragments
- 🟡 **Legendary** — +15% Gold, +15% Relic Fragments

**Important:** Bonuses apply only to the character you're actively playing in that run. Owning multiple NFTs doesn't stack bonuses—each run uses the bonus from whichever character you selected. Mastery is shared across unlock paths.

---

## 🌟 MASTERY SYSTEMS

### 👾 **Enemy Mastery**
Defeat enough of one enemy type? Unlock permanent **+2% to +10% damage** against that enemy forever.

### 🎮 **Character Mastery**
Play a character repeatedly → Rank up through **5 tiers (Novice → Grandmaster)** for unique badges & permanent stat bonuses.

---

## 💰 OMENX — THE PREMIUM CURRENCY

Earn via **leaderboard rankings**. Spend in-game to:
- 🔄 Reroll upgrade picks (2 OMENX)
- 🚫 Banish unwanted upgrades (1 OMENX)
- ⚡ Activate Squad Ultimates — **Lite (5 OMENX)** capped clone power, or **Full (10 OMENX)** scales with your full upgrades
- 💀 Emergency Revive on death (4 OMENX)
- ✨ Buy cosmetics, stat upgrades & a +50% XP session buff (10 OMENX / 60 min)

**Live balance always shown in the top bar of your screen.**

---

## 🎯 THE HOOK

✅ **Free-to-play** — Pure skill determines earnings
✅ **Skill-first** — Leaderboard earnings are purely based on performance
✅ **Real rewards** — OMENX tokens to your wallet
✅ **Squad multiplier** — Farm together, earn together
✅ **Infinite scaling** — Boss raids never stop

---

**Ready to slay cosmic enemies and stack real crypto?**

**🦥 Create your squad. Raid the Global Boss. Earn OMENX. Repeat.**`;

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