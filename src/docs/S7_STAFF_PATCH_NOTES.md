# Season 7 — Staff Patch Notes
**"Defenders Rise"**
**Goes live:** Monday 15 June 2026, 00:00 UTC (W24→W25 rollover)
**All changes auto-activate via date gate — no manual toggle needed.**

---

## Quick Summary for Player Questions

S7 is a **meta rebalance** focused on three things:
1. **Shield spam is weaker** — CD floor + decay + softer base damage
2. **Tank builds are viable** — armor now scales %, HP cap rises in Outer Galaxy
3. **Aggressive play is rewarded** — HEAT score bonus for pushing Dynamic Difficulty

Nothing is disabled. No wipe. All existing saves, relics, talents, and upgrades carry over.

---

## Detailed Changes

### 🛡️ Shield Overhaul (§4a, §4a-bis, §4b)

**What changed:**
- **Shield Bubble, Aegis Matrix, Burning Barrier** all have a lifted cooldown floor of **0.85×** (was 0.5×). CDR builds can no longer stack 8 overlapping shields.
- **Pushback decays in the final 25%** of each shield's lifetime — enemies press in as the bubble fades. Creates a risk/reward rhythm.
- Base damage softly nerfed: Shield Bubble 15→12, Aegis Matrix 40→28, Burning Barrier 18→15.

**Why:** The "stand still, stack shields, nuke everything" loop was dominating the leaderboard with zero skill floor. These changes nerf the *stacking exploit* — a single shield is still strong.

**Player questions to expect:**
- *"My shield build feels weaker"* — Yes, intentionally. Still viable as support/defense, no longer the only viable strategy.
- *"Aegis Matrix got nerfed a lot?"* — 30% base cut + CD floor, but it still fires retaliation missiles and is the strongest pushback weapon. It's just not 5× above everything else.
- *"Burning Barrier feels different?"* — The decay at end of lifetime means enemies will push in during the last 0.5s. Time your recast or position around it.

---

### 💊 Nuke Rebalance (§4c, §4d)

**What changed:**
- **Nuke damage: maxHp × 10 → maxHp × 2.5**. Inner Galaxy mobs still die in one hit. Outer Galaxy T14 mobs take ~40% — nukes are now a "thin the herd" tool.
- **Nuke drop rate halved**: base 1% → 0.5%, luck bonus 0.1% → 0.05% per point. Luck builds still get more nukes than non-luck.

**Why:** Nuke spam was the AFK payoff — stand still, collect luck stat, delete screens. The drop rate change reduces the incentive to stack luck purely for nukes.

**Player questions to expect:**
- *"Nukes don't one-shot bosses anymore"* — Correct. Nukes never damaged bosses. If a player says this, they're confused with mob clear.
- *"I'm getting fewer nukes"* — Yes, by design. Still drops. Still useful. Just not infinite.
- *"Is luck useless now?"* — No. Luck still boosts crits, nuke drops (just halved), and other pickup rates. It's just no longer the dominant stat.

---

### 🏋️ Armor & HP Rework (§4i, §4j)

**What changed:**
- **Armor is now % damage reduction** (1 armor = 1% reduction), sector-scaled cap:
  - S1-S6: 20% cap
  - S7-S10: 25% cap
  - S11-S13: 30% cap
  - S14-S20: 35% cap
- **Max HP cap scales in Outer Galaxy** (was locked at 2000):
  - S11: 2,400 → S15: 3,200 → S20: 5,000

**Why:** At S20, flat armor absorbed ~30 of 775 damage per hit — effectively useless. Pandypaws and HP-tank builds died in 2 hits regardless of investment. This makes armor talent investment actually matter in the endgame.

**Player questions to expect:**
- *"My armor feels stronger on high sectors"* — Yes, that's the point.
- *"Pandypaws is better now?"* — Significantly. Tank builds with maxed armor + hp_up can survive 6-9 hits at S20 vs. the previous 2-hit kill.
- *"Does the HP cap change affect my current max HP?"* — Only via level-up gains in a run. The cap lifts per sector so earning HP via level-ups past S10 now actually stacks.

---

### 🌌 Outer Galaxy HP Curve (§4e)

**What changed:**
- S11-S20 mob HP multipliers dramatically reduced. S20 was ~9M HP — only shield+nuke could clear. New S20 is ~143k HP.
  - Before (S6): S20 mult = 698×
  - After (S7): S20 mult = 11×

**Why:** The old curve was tuned around "what can shield+nuke kill." Every other build hit a wall around S13. The new curve is tuned around median DPS at ~12k per target, so 5+ build archetypes are viable at S20.

**Player questions to expect:**
- *"Outer Galaxy feels easier?"* — Relatively yes, and that's deliberate. The difficulty comes from building skill, not from being forced into one weapon path.
- *"S20 scores are different?"* — Sector bonus multipliers are unchanged. Kill rate may change (slightly faster or slower depending on build). HEAT bonus (below) adds a new score dimension.

---

### 🔥 HEAT Score Bonus (§4f)

**What changed:**
- A new **HEAT multiplier** on sector run score, based on how hard you pushed Dynamic Difficulty.
- Calculated server-side: `HEAT = 1.0 to 2.0×` based on your peak DD vs the difficulty cap.
  - Normal: cap 1.75× spawn → max 2.0× HEAT
  - Hard: cap 2.5× spawn → max 2.0× HEAT
  - Cosmic: cap 3.5× spawn → max 2.0× HEAT
  - Easy: no DD, no HEAT bonus

**Why:** Rewards players who push aggressively instead of turtling. AFK runs get 1.0× HEAT. Players pushing max DD get up to 2× their base score.

**Player questions to expect:**
- *"What is HEAT?"* — It's a score multiplier that rewards aggressive play. The more you push Dynamic Difficulty (by killing fast), the higher your HEAT, and the higher your final score.
- *"Easy mode doesn't have HEAT?"* — Correct. Easy has no DD ramp, so no HEAT. Competitive play is Normal+.
- *"My score looks different than I expected"* — HEAT is applied server-side to the final sector score only. Endless and raid runs are unaffected.

---

### ⚡ Dynamic Difficulty Now on Normal & Hard (§4g)

**What changed:**
- DD previously only ramped on Cosmic. Now enables on **Normal and Hard** with scaled, friendlier parameters:
  - Normal: max 1.75× spawn rate, 1.5× speed
  - Hard: max 2.5× spawn rate, 2.0× speed
  - Cosmic: unchanged (3.5× / 2.5×)

**Why:** HEAT score requires DD to exist on those difficulties. Also makes Normal/Hard feel dynamic instead of static.

**Player questions to expect:**
- *"Mobs are spawning faster than before on Normal/Hard"* — Yes. If you're clearing well, DD ramps to match. If you're struggling, it backs off. It's self-balancing.
- *"Easy still feels the same"* — Easy has no DD at all, same as before.

---

## What Did NOT Change

Tell players these if they ask:

| Thing | Status |
|---|---|
| Characters (NeoByte, Pandypaws, etc.) | **Unchanged** — no kit reworks |
| Relics | **Unchanged** |
| Talents & Mastery | **Unchanged** |
| Synergies & Evolutions | **Unchanged** |
| Inner Galaxy HP curve | **Unchanged** |
| Score formula (kills × 120, level² × 100, etc.) | **Unchanged** — HEAT is a final multiplier on top |
| Endless runs | **Unchanged** — HEAT only applies to sector runs |
| Gold, rewards, payout pool | **Unchanged** |
| NFT perks | **Unchanged** |

---

## When It Activates

Everything is **date-gated server and client side**. At Mon 15 Jun 2026 00:00 UTC:
- `isS7OrLater()` flips `true` in the client
- `season_id` returns `2026-S7` server-side
- All S7 changes activate automatically
- Any run started before rollover and submitted after rollover will use S7 validation (same as how S6 launched)

Players don't need to update, clear cache, or do anything.

---

## Staff TL;DR

> "Shield stacking is fixed. Tank builds work now. Nukes are weaker. Outer Galaxy is survivable with more than one build. Playing aggressively scores more via HEAT. Nothing was removed, everything carries over."