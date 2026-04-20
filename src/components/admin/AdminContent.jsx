import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const GAME_DESCRIPTION = `# 🦥 COSMIC SLOTHS — Full Game Guide

**The laziest roguelike with the realest payouts. Pick a sloth. Survive the cosmos. Earn OMENX.**

---

## 🎮 HOW TO PLAY

Move with **WASD / Arrow Keys** on desktop, or the **virtual joystick** on mobile. Your weapons fire **automatically** at the nearest enemies. Survive the full time limit to win the sector.

### ⚡ The Core Loop
1. **Move & Survive** — Enemies stream toward you from all sides
2. **Collect XP Gems** — Dropped by every enemy; fill your bar to level up
3. **Pick Upgrades** — Choose 1 of 3 random upgrades on each level-up (weapons or passives)
4. **Collect Gold** — Random drops from enemies; spend it in the Upgrade Lounge
5. **Beat the Clock** — Survive the sector timer to win; bosses spawn at the end
6. **Earn Leaderboard OMENX** — Top-ranked players get real OMENX tokens at the end of each week/season

---

## 🧑‍🚀 CHARACTERS (10 Pilots)

All three starter characters are unlocked from the beginning. The rest are unlocked by spending Gold.

| Character | Role | HP | Speed | Damage | Special Ability |
|-----------|------|----|-------|--------|-----------------|
| **NeoByte** | Commander — Balanced all-rounder | 120 | Fast | 1.0× | Deploys a support banner every 15s that boosts damage and cooldowns |
| **Pandypaws** | Heavy Armor Mechanic — Tanky, slow, low damage | 200 | Slow | 0.8× | 5% chance on kill to drop scrap that grants permanent armor |
| **NovaByte** | Comms & Demolitions — High area and damage, low HP | 80 | Fast | 1.3× | 10% chance on kill to trigger a localized chain explosion |
| **Glitch** | Stealth Assassin — Very fast, high damage, fragile | 60 | Very Fast | 1.4× | 15% chance when hit to phase shift into invulnerability |
| **HoloDrift** | Engineer — High magnet range, high XP gain | 100 | Medium | 0.9× | Deploys a holographic decoy every 20s to taunt enemies |
| **CodeBreaker** | Cyber Hacker — Fast cooldowns, high luck | 90 | Medium | 0.7× | Hacks a nearby enemy every 10s, turning them against allies |
| **DataPhantom** | Strategic Hacker — High projectile speed, good armor | 110 | Fast | 1.0× | Leeches data from nearby enemies to slow them and gain speed |
| **NeonVortex** | Elite Sniper — Extreme damage, very slow cooldowns | 50 | Fast | 2.0× | Executes non-boss enemies below 20% HP with railgun blasts |
| **SynthBeats** | Diplomat — High gold gain and luck | 100 | Fast | 0.9× | Automatically bribes death with 5 gold to negate incoming damage |
| **SkyByte** | Ace Pilot — Very fast, good damage and area | 90 | Very Fast | 1.2× | Charges a Sonic Boom while moving; triggers upon stopping |

---

## 🗺️ SECTORS (10 Arenas)

Unlock new sectors by beating the previous one. Each sector has a unique environment effect and a longer survival timer.

| # | Sector | Time | Environmental Effect |
|---|--------|------|----------------------|
| 1 | Azure Expanse | 3:00 | Neon Rain (+Speed for all) |
| 2 | Mystic Cosmos | 3:30 | Fog (–Speed, fewer spawns) |
| 3 | Ethereal Nebula | 4:00 | Fog |
| 4 | Crimson Void | 4:30 | None |
| 5 | Solar Storm | 5:00 | Solar Flare (+Enemy spawns) |
| 6 | Emerald Galaxy | 5:30 | Neon Rain |
| 7 | Shattered Core | 6:00 | Fog |
| 8 | Abyssal Vortex | 6:30 | Solar Flare |
| 9 | Turquoise Drift | 7:00 | Neon Rain |
| 10 | Rainbow Rift | 7:30 | Solar Flare |

> **Sector Penalty:** Playing older sectors applies a -10% Gold penalty per sector below your furthest unlocked arena (capped at -50%).

---

## ⚔️ DIFFICULTY MODES

| Mode | Enemy HP | Enemy Damage | XP & Gold Bonus | Hazards |
|------|----------|--------------|-----------------|---------|
| Easy | 0.7× | 0.6× | –50% XP & Gold | None |
| Normal | 1.0× | 1.0× | Standard | None |
| Hard | 1.5× | 1.5× | +100% XP & Gold | Occasional |
| Cosmic | 2.5× | 2.5× | +200% XP & Gold | Frequent |

---

## 🔫 WEAPONS (9 Base + Synergies + Evolutions)

### Base Weapons
- **Blaster** — Fires reliable energy blasts. Mastery: fires a spread of 3 blasts.
- **Cosmic Nap Beam** — Fires a piercing beam. Mastery: chains to nearby enemies.
- **Plasma Whip** — Swipes nearby enemies. Mastery: heals player for 5% of damage dealt.
- **Orbital Drones** — Orbiting defense drones. Mastery: drones move faster and shoot lasers.
- **Zero-G Napalm** — Leaves burning pools. Mastery: blue fire that slows enemies by 50%.
- **Nova Pulse** — A massive expanding energy blast. Mastery: triggers a second echo pulse.
- **Shield Bubble** — Pushes enemies away and damages them. Mastery: fires retaliatory lasers.
- **Ricochet Blade** — Fires a bouncing sawblade. Mastery: blades bounce more times.
- **Toxic Emitter** — Leaves a lingering poison cloud. Mastery: clouds grow larger over time.

> **Weapon Mastery:** Max all 3 upgrade stats (Damage, Area, Cooldown) for a weapon to unlock its MASTERED ultimate form.

### ⚡ Weapon Synergies (7 combinations)
When you hold two specific weapons simultaneously in a run, they fuse into a powerful Synergy weapon:

| Weapon 1 | Weapon 2 | Synergy Result |
|----------|----------|----------------|
| Zero-G Napalm | Shield Bubble | **Burning Barrier** — Fiery shield that burns and pushes enemies |
| Cosmic Nap Beam | Nova Pulse | **Laser Nova** — Expanding blast of piercing lasers |
| Plasma Whip | Orbital Drones | **Plasma Swarm** — Orbiting drones armed with plasma whips |
| Cosmic Nap Beam | Orbital Drones | **Orbital Lasers** — Drones that rapidly fire piercing beams |
| Plasma Whip | Nova Pulse | **Seismic Whip** — Whip strikes generate expanding shockwaves |
| Zero-G Napalm | Plasma Whip | **Flaming Lash** — Molten whip that leaves persistent fire |
| Toxic Emitter | Plasma Whip | **Venom Lash** — Whip that applies toxic damage and slows |

### 🌟 Weapon Evolutions (7 ultimate forms)
Reach **Mastery** on a base weapon while holding a specific passive upgrade to evolve it:

| Base Weapon | Required Passive | Evolution |
|-------------|-----------------|-----------|
| Cosmic Nap Beam | Area Up | **Supernova Beam** — Massive piercing beam that explodes on impact |
| Plasma Whip | Regen Up | **Vampiric Lash** — Heals massively and covers the screen |
| Orbital Drones | Speed Up | **Orbital Defense Network** — Indestructible drones that rapidly shoot lasers |
| Zero-G Napalm | Damage Up | **Hellfire** — Blue flames that persist and melt everything |
| Nova Pulse | Cooldown Down | **Quantum Collapse** — Constant rapid pulses of dark energy |
| Shield Bubble | HP Up | **Aegis Matrix** — Massive repulsion and retaliates with missiles |
| Ricochet Blade | Projectile Speed | **Buzzsaw Swarm** — Multiple massive blades that ricochet wildly |

---

## 🛠️ UPGRADE LOUNGE (Meta Progression)

Between runs, spend **Gold** or **OMENX** in three tiers of persistent upgrades:

### Base Stats (7 Stats, 5 Levels Each)
- ⚡ **Plasma Output** (Damage)
- ❤️ **Hull Integrity** (Max HP)
- 💨 **Thruster Speed** (Move Speed)
- 🔵 **Tractor Range** (Pickup Range)
- 🛡️ **Nano-Repair** (HP Regen/s)
- ⏱️ **System Cooling** (Cooldown Reduction)
- ✨ **Cosmic Fortune** (Luck)

### Upgrade Tier Costs (Gold / OMENX per level)
| Tier | L1 | L2 | L3 | L4 | L5 |
|------|----|----|----|----|----|
| **Permanent** | 1000g / 15 | 2000g / 30 | 4000g / 60 | 8000g / 120 | 16000g / 240 |
| **Weekly** (resets Monday) | 500g / 4 | 1000g / 8 | 2000g / 15 | 4000g / 30 | 8000g / 60 |
| **Seasonal** (resets every 4 weeks) | 1500g / 10 | 3000g / 20 | 6000g / 40 | 12000g / 80 | 24000g / 160 |

### Armory (Weapon Upgrades)
Upgrade each weapon's **Damage (+10%/lvl)**, **Area (+10%/lvl)**, and **Cooldown (–5%/lvl)**. Max all 3 to reach **Mastery**. Same cost tiers as base stats above.

### Skill Trees (Character Talents)
Each character has a unique **3-tier talent tree** with branching paths (2 branches at tier 2 and tier 3 — you must choose one). Respec anytime for a full Gold refund.

### 💎 Ancient Relics (5 Relics, 5 Levels Each)
Equip up to **2 Relics at once** for global stat buffs. Craft and upgrade with **Relic Fragments** dropped by bosses.

| Relic | Effect | Fragment Cost (L1) |
|-------|--------|--------------------|
| 🎲 Cosmic Dice | Luck +1 → +5 | 2 |
| 💰 Midas Core | Gold Multiplier +10% → +50% | 3 |
| 🧠 Knowledge Drive | XP Multiplier +10% → +50% | 3 |
| 🍷 Blood Chalice | HP Regen +0.2 → +1.0 | 4 |
| 💥 Annihilation Core | Damage +5% → +25% | 5 |

Relic levels: Common → Uncommon → Rare → Epic → Legendary

### 🔨 The Forge
Convert **Gold → Star Fragments** (1,000 Gold = 1 ⭐, up to 20/day). Use Star Fragments to permanently enhance weapons **beyond their normal upgrade cap** with 3-tier augments. Forge upgrades **never reset**.

---

## 🏆 LEADERBOARDS & OMENX REWARDS

OMENX is distributed from the **reward pool** (funded by in-game OMENX purchases). 25% of weekly purchases and 35% of seasonal purchases go to the top players.

### 📅 Weekly Leaderboard (Top 30)
Resets every Monday. Weekly stat upgrades also reset.

| Rank | OMENX Share |
|------|------------|
| #1 | 10% of pool |
| #2 | 8% of pool |
| #3 | 6% of pool |
| #4–10 | 4% each |
| #11–20 | 3% each |
| #21–30 | 1.8% each |

### 🗓️ Seasonal Leaderboard (Top 40)
Runs for 4 weeks. Seasonal stat upgrades reset at end-of-season.

| Rank | OMENX Share |
|------|------------|
| #1 | 8% of pool |
| #2 | 6% of pool |
| #3 | 5% of pool |
| #4–10 | 3% each |
| #11–20 | 2.5% each |
| #21–30 | 2% each |
| #31–40 | 1.5% each |

### ♾️ Endless Void Leaderboard
Infinite scaling mode. Boss fights every 3 minutes. All-time high scores tracked globally. Score multiplier: **2×**.

### 📊 Score Formula
\`(Kills × 10) + (Level × 100) + (Time × 5) + (Gold × 5) + (Victory Bonus: 5,000)\`
× Arena Multiplier (1.0× up to 2.8× for hardest arena)
× Difficulty Modifier

---

## 👥 SLOTH SQUADS

Create or join a squad of up to **5 players**. Every kill in any run auto-contributes to the squad's weekly total.

### 📈 Squad Levels (7 Tiers)
Squad XP = weekly kills earned at end of each week.

| Level | Badge | Name |
|-------|-------|------|
| 1 | 🦥 | Recruits |
| 2 | ⭐ | Drifters |
| 3 | 🔥 | Hunters |
| 4 | ⚡ | Vanguards |
| 5 | 💀 | Reapers |
| 6 | 👑 | Legends |
| 7 | 🌌 | Cosmic Elite |

### 🛡️ Weekly Bounties (Kill Targets per Level)

| Level | Weekly Kill Target | Gold | Fragments |
|-------|--------------------|------|-----------|
| Lv.1 Rookie | 2,000 | 500 | ×1 |
| Lv.2 Drifter | 5,000 | 1,200 | ×2 |
| Lv.3 Hunter | 10,000 | 2,500 | ×3 |
| Lv.4 Vanguard | 18,000 | 4,000 | ×4 |
| Lv.5 Reaper | 30,000 | 6,500 | ×5 |
| Lv.6 Legend | 50,000 | 10,000 | ×7 |
| Lv.7 Cosmic | 75,000 | 15,000 | ×10 |

### 🛡️ Daily Bounties (Kill Targets per Level)

| Level | Daily Kill Target | Gold | Fragments |
|-------|-------------------|------|-----------|
| Lv.1 | 300 | 150 | ×0 |
| Lv.2 | 800 | 300 | ×0 |
| Lv.3 | 1,500 | 600 | ×1 |
| Lv.4 | 2,500 | 1,000 | ×1 |
| Lv.5 | 4,500 | 1,500 | ×2 |
| Lv.6 | 7,500 | 2,500 | ×2 |
| Lv.7 | 12,000 | 4,000 | ×3 |

> **Note:** All members must have been in the squad for at least 24 hours before claiming bounties.

### Squad Chat & Management
- **Leader:** Can edit squad name, tag, description, icon. Can kick members and transfer leadership.
- **Members:** Contribute kills, claim bounties, use squad chat.
- Real-time **Squad Chat** available in-app.

---

## 💀 GLOBAL RAID BOSS

Community-wide cooperative boss with **shared HP across all players**. Up to **5 Raid Runs per day**. Your damage is permanently subtracted from the boss's global HP.

- Boss defeated → **Respawns at next level** with **+50% more max HP**
- Rewards: **1,000 Gold × Boss Level** (requires you to have dealt damage to claim)
- Boss levels infinitely — the raids never end

---

## 🎁 DAILY REWARDS & BOUNTIES

### 📅 Daily Login Streak
Log in daily for escalating rewards (streak resets if you miss a day):
- Day 1: 400 Gold
- Day 2: 800 Gold
- Day 3: 1,000 Gold
- Day 4: 1 Relic Fragment
- Day 5: 2,000 Gold
- Day 6: 2 Relic Fragments
- Day 7: 4,000 Gold ⭐

### 🎯 Daily Bounties (3 per day, random)
- Defeat 200 enemies → 150 Gold
- Defeat 500 enemies → 300 Gold
- Survive 5 minutes in a single run → 2 Relic Fragments
- Earn 100 Gold in a single run → 50 Gold
- Reach Level 15 in a single run → 1 Relic Fragment
- Play 3 runs → 100 Gold

### ⚔️ Daily Mission (1 per day, random)
Harder challenge worth **10 Seasonal Points** each:
- Survive 10 minutes in a single run
- Reach Level 30 in a single run
- Defeat 2,000 enemies (total)
- Earn 500 Gold in a single run
- Play 5 runs

**Collect 100 Seasonal Points** → unlock that season's exclusive character skin.

---

## ⚡ LEVIATHAN TRIALS (Boss Modifiers)

Activate before a run to make boss encounters harder for a score boost:
- 🔴 **FURY** — Boss deals +50% damage
- 🟠 **FRENZY** — Boss moves +50% faster
- 🟣 **HIDE** — Boss has +100% HP

---

## 💎 IN-RUN PICKUPS

| Pickup | Source | Effect |
|--------|--------|--------|
| 💎 XP Gems | Every enemy | Fill XP bar to level up |
| 🪙 Gold Coins | Random enemy drops | Spend in Upgrade Lounge |
| 🧩 Relic Fragments | Boss kills | Craft & upgrade Relics |
| ☢️ Nuke | Random spawn | Destroys all non-boss enemies on screen |
| 🧲 Magnet Surge | Random spawn | Pulls all nearby XP & Gold instantly |
| 🛡️ Shield Overcharge | Random spawn | 10 seconds of full invincibility |

---

## 🌟 PASSIVE UPGRADES (In-Run Level-Up Picks)

| Upgrade | Effect |
|---------|--------|
| Plasma Core | +10% Damage |
| Hyperdrive Fuel | +10% Move Speed |
| Exosuit Plating | +20 Max HP |
| Spatial Expander | +10% Area |
| Quantum Accelerator | –5% Cooldown |
| Tractor Beam | +25% Pickup Range |
| Nano-Repair Bots | +0.5 HP/sec |
| Deflector Shield | +2 Armor |
| Asteroid Miner | +20% Gold Drops |
| Ion Thrusters | +15% Projectile Speed |
| Neural Implant | +15% XP Gain |
| Dark Matter Core | +15% Damage |
| Warp Drive | +15% Move Speed |
| Gravitational Anomaly | +15% Area |
| Time Dilation Field | –10% Cooldown |
| Event Horizon | +50% Pickup Range |

> Use **2 OMENX to Reroll** your upgrade choices, or **1 OMENX to Banish** a specific choice.

---

## 👑 VIP STATUS

Purchase VIP tiers through the OmenX platform. Each tier grants **+1% Damage** and **+1% Max HP** per tier, cumulative.

**14 Tiers:** Bronze 1–2, Silver 1–3, Gold 1–2, Platinum 1–3, Diamond 1–4

VIP is automatically detected from your OmenX wallet. The subscription sends weekly OMENX tokens to your wallet.

---

## 🏅 MASTERY SYSTEMS

### 👾 Enemy Mastery
Defeat enough of one enemy type to unlock a permanent damage bonus against them:
- Tier 1–4 enemies: 2%/4%/6%/8%/10% at 200/500/1000/1500/2000 kills
- Tier 5–8 enemies: milestones at 100/250/500/750/1000 kills
- Tier 9–10 enemies: milestones at 50/125/250/375/500 kills
- Bosses: milestones at 5/15/25/35/50 kills

### 🎮 Character Mastery (5 Tiers)
Play a character repeatedly to unlock permanent bonuses:
- 🟢 Novice (0 kills) — No bonus
- 🔵 Adept (2,000 kills) — +5% Speed
- 🟣 Expert (5,000 kills) — +10% Damage
- 🟡 Master (10,000 kills) — +15% Area
- 👑 Grandmaster (25,000 kills) — –10% Cooldown

---

## 🎨 COSMETICS

### 12 Trail Effects
**Free:** None  
**3,000 Gold / 30 OMENX:** Fire, Ice, Toxic  
**10,000 Gold / 100 OMENX:** Plasma, Void, Shadow  
**20,000 Gold / 200 OMENX:** Golden, Blood, Pixel  
**30,000 Gold / 300 OMENX:** Nebula Dust, Rainbow

### 9 Kill Effects
**Free:** None  
**3,000 Gold / 30 OMENX:** Explosion, Freeze Burst, Vaporize  
**12,000 Gold / 120 OMENX:** Pixel Burst, Implode, Blood Splatter  
**25,000 Gold / 250 OMENX:** Black Hole, Gold Shatter

### Character Skins
Each character has multiple purchasable color skins (e.g., 5,000 Gold / 50 OMENX for standard, 20,000 Gold / 200 OMENX for premium). Seasonal skins are earned by collecting 100 Seasonal Points from daily missions.

---

## 💰 OMENX — THE PREMIUM CURRENCY

**Earn via:** Weekly/Seasonal leaderboard rewards (auto-sent to wallet at period end)  
**Buy via:** BNB Chain (Thirdweb marketplace)  
**Spend in-game on:**
- Reroll upgrade picks (2 OMENX)
- Banish upgrade choices (1 OMENX)
- Emergency Revive at 50% HP (4 OMENX)
- Squad Ultimate — summons a clone (4 OMENX)
- Cosmetics, stat upgrades, weapon upgrades, skins, relics

Live OMENX wallet balance is shown at all times in the top bar.

---

## 👾 ENEMY ROSTER (30+ Enemies, 10 Tiers)

10 tiers of increasingly powerful enemies fill the cosmos:
- **Tier 1–4:** Void Glow Orb, Nebula Jelly, Mini Probe Drone, Crystal Floater, Plasma Serpent, Eye Tentacle, Spore Wasp, Rock Fragment, Void Manta, Energy Phantom, Stellar Starfish, Angler Lantern, Quantum Spinner, Ribbon Phantom, Vortex Drifter, Neon Mothra
- **Tier 5–7:** Spike Virus, Coral Bloom, Blade Arrowhead, Chain Eye, Frost Wyrm, Flame Wyrmling, Frost Specter, Thunder Sphere, Nano Gear Swarm
- **Tier 8–10:** Whispering Void, Bio Bloom Pod, Cosmic Ray Fish, Lava Rock Blob, Plasma Jelly Swarm, Shadow Stalker, Crystal Vortex
- **6 Bosses:** Nebula Devourer, Plasma Kraken, Stellar Colossus, Cosmic Wyrm Lord, Supernova Empress, Nexus Annihilator

---

**🦥 Gear up. Stay lazy. Earn real crypto.**`;


> *The laziest roguelike with the realest payouts. Squad up. Slay. Stack OMENX.*

---

## 🎮 DROP IN, SURVIVE, EARN

Blast through **procedurally-generated sectors** filled with cosmic chaos. Move with WASD or your joystick. Your weapons? They auto-fire at whatever's closest. Survive the timer. Climb the leaderboards. **Earn real Web3 currency** based on your performance.

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
| **👤 Characters** | Unlock unique sloths with exclusive Talent Trees |
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
- Top 30 earn OMENX
- Stat upgrades reset each week

### 🗓️ **Seasonal Leaderboard**
- 4-week cycles
- Top 40 earn OMENX
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
Activate modifiers before a run to make bosses **tougher & more rewarding**:
- 🔴 **FURY** — Boss deals +50% damage
- 🟠 **FRENZY** — Boss moves +50% faster
- 🟣 **HIDE** — Boss has +100% HP

---

## 🎁 DAILY GRIND & MISSION REWARDS

### 📅 **Daily Login Streak**
7-day escalating rewards. Miss a day? Streak resets to Day 1.

### 🎯 **Daily Bounties**
3 random challenges every day → **Gold** or **Relic Fragments**

### ⚔️ **Daily Mission**
One harder challenge → **Seasonal Points** (collect 100 for exclusive seasonal skins)

### 👥 **Squad Weekly Bounty**
10,000 enemy target → **2,500 Gold + 5 Relic Fragments** per squad member

---

## 💀 GLOBAL RAID BOSS

**Community-wide cooperative event.** A massive World Boss with **shared HP across all players**. Deal damage in up to **5 Raid Runs per day**—your damage is permanent.

### 🔥 **Infinite Scaling**
- Boss reaches 0 HP? → Respawns at **next level**
- Each level? → Boss gains **+50% max HP**
- Your rewards? → **Scale with boss level** (1,000 Gold × Level)

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

**14 Tiers Available:** Bronze 1–3 → Silver 1–3 → Gold 1–2 → Platinum 1–3 → Diamond 1–4

---

## 🌟 MASTERY SYSTEMS

### 👾 **Enemy Mastery**
Defeat enough of one enemy type? Unlock permanent **+2% to +10% damage** against that enemy forever.

### 🎮 **Character Mastery**
Play a character repeatedly → Rank up through **5 tiers (Novice → Grandmaster)** for unique badges & permanent stat bonuses.

---

## 💰 OMENX — THE PREMIUM CURRENCY

Earn via **leaderboard rankings**. Spend in-game to:
- 🔄 Reroll upgrade picks
- 🚫 Banish unwanted upgrades
- ⚡ Activate Squad Ultimates
- ✨ Buy cosmetics & power-ups

**Live balance always shown in the top bar of your screen.**

---

## 🎯 THE HOOK

✅ **Free-to-play** — Pure skill determines earnings  
✅ **No pay-to-win** — Cosmetics only  
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