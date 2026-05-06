# S6 Balance Audit — Multiplicative Stacking Survey

**Author:** Base44  •  **Date:** 2026-05-06  •  **Target:** Season 6 (starts Mon May 25 2026 00:00 UTC)

---

## TL;DR

S5 leaderboards were dominated by **gold-stacked builds** (Tijckers' 1.36M run, 95% from gold) and **weapon-mastery snowballs** (triple-stacked 5/5/5 perm+weekly+seasonal upgrades hitting ~4.7× DPS). The mid-S5 patch capped gold-per-kill in the score formula and tightened the weapon-stack factor 0.66 → 0.5. S6 removes gold from the score entirely.

This doc surveys **every multiplier** in the game, lists the **worst-case stacked builds**, and proposes **S6 rebalance levers**. **No code touched** — analysis only.

---

## 1. Stacking sources (all current multipliers)

Each row lists where the multiplier originates and which stat it touches. Stats below are read at engine init in `GameEngine.js` and most stack **additively** (fed into `damageMult`, `goldMult`, etc.) — but together they MULTIPLY the base, so two +50% sources = ×2.0, not ×1.5.

### 1a. Per-character base stats
| Source | Stats affected | Notes |
|---|---|---|
| Character base (`CHARACTERS[]`) | `damageMult`, `cooldownMult`, `areaMult`, `goldMult`, `xpMult`, `projSpeedMult`, `magnetRange`, `luck`, `hp`, `armor`, `regen`, `speed` | Synthbeats has 1.5× goldMult baseline — that's the gold-build foundation. |
| Skin override | color only | Cosmetic, no stat impact. ✅ |

### 1b. Stat upgrades (Hub → Stats panel)
| Tier | Source | Stack factor (vs perm) | Levels |
|---|---|---|---|
| Permanent | `permanentUpgrades` | 1.0× | 5 |
| Weekly | `weeklyUpgrades` | **0.66×** (since 2026-05-06) | 5 |
| Seasonal | `seasonalUpgrades` | **0.66×** | 5 |

**Triple-max ceiling per stat** (after diminishing returns):
- `health`: +5×5 + 10×5×0.66 + 20×5×0.66 = +25 + 33 + 66 = **+124 HP**
- `damage`: +0.10 + 0.165 + 0.33 = **+0.595** (≈+60% damage)
- `gold`: same shape — **+~60% gold mult** from stat upgrades alone

### 1c. Talents (per character, 3 tiers)
| Source | Stack factor | Notes |
|---|---|---|
| Permanent talents | 1.0× | Up to 3 picks (path-locked) |
| Weekly talents | 1.0× | Same 3 |
| Seasonal talents | 1.0× | Same 3 |

⚠️ **Talents do NOT use the 0.66× stack factor.** All three tiers stack at full value via the `[...new Set(...)]` merge in `GameEngine.js`. This is the single biggest unaudited stacker — a Synthbeats player who maxes the gold path on all three tiers gets +30% gold ×3 = additive **+90% gold** from talents alone.

### 1d. Mastery (per character)
| Tier | Kills required | Stat |
|---|---|---|
| 1–5 (shared) | 0–25k | +5% spd, +10% dmg, +15% area, -10% cd |
| 6 (signature) | 50k | Character-specific multi-stat (+10% allStats for NeoByte, +30% gold for Synthbeats, +25% dmg for NeonVortex…) |
| 7 (signature) | 100k | Active-ability boost (e.g. Synthbeats bribe cost 5g→3g) |

**ALL unlocked tiers stack** (`unlockedTiers.forEach`), and tier 6 NeoByte's `allStats: 0.10` adds +10% to every multiplicative stat including `goldMult` AND `cooldownMult` (inverted).

### 1e. Relics
| Source | Stat | Max value (level 5) |
|---|---|---|
| Cosmic Dice | luck | +5 |
| Midas Core | goldMult | **+50%** |
| Knowledge Drive | xpMult | +50% |
| Blood Chalice | regen | +1.0/s |
| Annihilation Core | damageMult | +25% |

3 relics can be equipped simultaneously. **No diminishing returns** — pure additive stack.

### 1f. NFT perks
- Per-character `goldMultiplier` and `relicFragmentMultiplier` from `NFTPerkManager`.
- Reads cached NFT data, applies multipliers as direct injection into `save.nftGoldMultiplier` (used in `EnemyAI.js` and `PickupSystem.js`).
- ⚠️ **Multiplicative on top of `player.goldMult`** — not additive. A 1.5× NFT bonus on top of a 4.0× character/talent stack = effective ×6.0 gold.

### 1g. VIP level
- `vipDmgBonus = vipLevel * 0.01` (additive to `damageMult`)
- `vipHpBonus = floor(baseHp * vipLevel * 0.01)` (additive to `maxHp`)
- Capped at +10% at VIP10. Small individually but stacks on top of everything else.

### 1h. Title buff
- `getTitleBuff(equippedTitle)` returns `{ damageMult, goldMult, hpMult, … }`.
- Currently small (typically +5–10% per stat per title).
- Multiplicative stack potential — adds to every stat the title touches.

### 1i. Admin perk
- Hardcoded **+2%** to base stats for staff wallets (`save.adminBuff.mult = 0.02`).
- Negligible on its own. Layered additively.

### 1j. Difficulty
- Easy: 0.5× XP/gold, 0.7× enemy HP
- Normal: 1.0×
- Hard: 2.0× XP/gold, 1.5× enemy HP
- Cosmic: **3.0× XP/gold**, 2.5× enemy HP

⚠️ **Cosmic 3× gold mult** is the largest single multiplier in the game. Stacks on top of every gold source.

### 1k. Pool bias (Loadouts page)
- Players allocate points across categories (weapons / passives / stats / evolution).
- Math in `lib/poolBias.js` — biases the level-up choice pool weighting.
- Doesn't directly multiply stats but **drastically increases the rate of acquiring the strongest upgrades**, which compounds with everything above.

### 1l. Forge augments
- Per-weapon: `damage_1/2/3` (+15/+35/+60% dmg), `area_1/2/3`, `cd_1/2/3` (-10/-20/-35% cd).
- Per-character: `holo_speed`, `pan_armor`, `syn_gold` (+20%), `code_xp` (+15%), `neo_crit` (+8% crit), etc.
- Stack additively into the relevant stat. ⚠️ Currently **no diminishing returns** — Forge runs full-strength on top of perm + weekly + seasonal upgrades.

### 1m. Weapon mastery (per weapon)
- Same perm/weekly/seasonal tier system as stats.
- **Stack factor 0.5×** (tightened 2026-05-06).
- Triple-max ceiling per weapon: dmg +0.5 + 0.25 + 0.25 = **+100% damage** (was +150% before tightening).
- Mastery (5/5/5 permanent) unlocks **+10% per-enemy-tier damage milestone** in `damageEnemy()`.

### 1n. Session XP buff
- +50% XP for ~30 minutes after purchase. Single-source, time-limited. ✅ Healthy.

---

## 2. Worst-case stacked builds

### 2a. Synthbeats — peak gold farmer (S5)
| Source | gold mult |
|---|---|
| Base char | ×1.5 |
| Stat upgrade triple-max | ×1.6 |
| Talents (Charm + Black Market + Billionaire) | ×1.3 |
| Mastery tier 6 (+30% gold) | ×1.3 |
| Relic Midas Core L5 | ×1.5 |
| Forge `syn_gold` | ×1.2 |
| Title buff (gold-themed) | ×1.1 |
| Cosmic difficulty | ×3.0 |
| NFT perk (multiplicative) | ×1.5 |
| **STACKED** | **≈ ×38** vs base |

Result: 100g raw drop → 3,800g credited. With 200 kills and ~50% drop rate = **380,000g per run**, easily over the old 50k+kills×2k cap.

The mid-S5 score cap (150g/kill) clipped this to the leaderboard, but the **economy impact remained** — Synthbeats players were buying every cosmetic + relic + upgrade in 2–3 runs while everyone else needed weeks.

### 2b. NeonVortex — peak DPS executioner
| Source | dmg mult |
|---|---|
| Base char | ×2.0 |
| Stat upgrade triple-max | ×1.6 |
| Talents (Hollow-Point + Singularity Shot) | ×1.5 |
| Mastery tier 6 (+25% dmg) | ×1.25 |
| Relic Annihilation L5 | ×1.25 |
| Forge `damage_3` per weapon | ×1.6 |
| Weapon mastery 5/5/5 (after 0.5 stack tightening) | ×2.0 |
| VIP10 | ×1.10 |
| Cosmic difficulty (no enemy buff to dmg, but enemies tankier) | ×1.0 |
| **STACKED** | **≈ ×40 base damage** |

Plus **execute below 30% HP** at tier 7 mastery (recently nerfed from 20% — the previous threshold was deleting bosses on phase transitions). Still strong.

### 2c. NeoByte — all-stats stacker
Tier 6 mastery `allStats: 0.10` is unique — it adds +10% to every multiplicative stat at once. Combined with the triple-stack stat upgrades and talents, NeoByte gets:
- +60% damage / +60% gold / +60% area / -50% cooldown (compounded)
- The most "balanced unkillable" build in the game.

---

## 3. S6 rebalance levers

Ranked by **impact ÷ implementation cost**:

### 🔴 High impact, low cost (do these)

#### L1 — Apply 0.66 stack factor to talents
**Currently:** weekly + seasonal talents stack at full value with permanent.
**Proposed:** Same 0.66× factor as stat upgrades. Permanent talents unchanged; weekly/seasonal multiplied by 0.66 before the merge.
**Impact:** Synthbeats' gold-talent stack drops from +90% → +60%. NeonVortex damage triple-stack drops similarly.
**Cost:** ~10 lines in `GameEngine.js`. The talent merge is currently a Set union — needs to become a weighted accumulator.

#### L2 — Cap NFT/perk multipliers as additive instead of multiplicative
**Currently:** `finalGold = floor(p.value * player.goldMult * nftGoldMult)` — multiplicative.
**Proposed:** Fold NFT gold/relic multipliers into `player.goldMult` as additive contributions during engine init.
**Impact:** Cosmic (×3) + NFT (×1.5) goes from ×4.5 → ×3.5 effective. Significant for whales.
**Cost:** ~5 lines in `EnemyAI.js`, `PickupSystem.js`, `GameEngine.js`. Backwards-compatible.

#### L3 — Cosmic difficulty: 3× → 2× gold/XP
**Currently:** Cosmic is the dominant gold/XP multiplier. Drops a 1× build into a 3× build for free if they survive.
**Proposed:** 2.0× XP, 2.0× gold. Enemy stats unchanged.
**Impact:** Reduces Cosmic-gold-stack peak by 33%.
**Cost:** Two number changes in `Constants.js`.

### 🟡 Medium impact, medium cost

#### L4 — Diminishing returns on talent path stacking
**Currently:** Picking the same path on all 3 tiers (perm A, weekly A, seasonal A) gives 3× the bonus.
**Proposed:** Path-A-on-all-3-tiers gets 1.0× + 0.66× + 0.5× = ~2.16× instead of 3×.
**Impact:** Soft cap on extreme single-stat specialization.
**Cost:** ~15 lines. Need a path-detection helper.

#### L5 — Mastery tier 6 "allStats" rework
**Currently:** NeoByte's `allStats: 0.10` applies to 7 stats including the inverted cooldownMult.
**Proposed:** Cap to 4 stats (dmg/area/spd/magnet). Drop cooldownMult and goldMult/xpMult.
**Impact:** Specifically balances NeoByte's "best at everything" identity.
**Cost:** Edit one line in `Constants.js`.

#### L6 — Relic level 5 ceiling rebalance
**Currently:** Midas Core L5 = +50% gold (5 levels: 10/20/30/40/50%).
**Proposed:** L5 = +35% (5 levels: 8/16/24/30/35%).
**Impact:** Top relic levels less mandatory. Reduces gold-stack ceiling by ~15%.
**Cost:** Edit `RELICS.values` arrays in `Constants.js`.

### 🟢 Low impact, low cost (polish)

#### L7 — Forge augment diminishing returns
Currently runs at full strength alongside upgrade-tier stack. Apply 0.5× factor to forge contributions when triple-tier upgrades are also at 5/5/5.
**Cost:** ~8 lines in `getWeaponStatsAndMastery()`.

#### L8 — Per-stat hard caps
e.g. `goldMult` capped at ×8.0, `damageMult` at ×6.0. Catches future stacking we haven't predicted.
**Cost:** 4 `Math.min()` calls at end of engine init.

---

## 4. Recommended S6 launch package

**Minimum viable (ship by May 25):**
- ✅ Gold removed from score (already gated, auto-flips at S6)
- L1 — Talent 0.66× stack factor
- L3 — Cosmic 3× → 2× gold/XP

**Full package (ship by S6 week 2):**
- L1 + L2 + L3 + L5 + L8

**Avoid for now:**
- Don't touch L4/L6/L7 in the same patch — too many simultaneous variables to debug. Save for S7 if data shows L1–L3 isn't enough.

---

## 5. Pre/post comparison (projected, Synthbeats Cosmic)

| Stage | Effective gold mult |
|---|---|
| **S5 pre-patch** (no caps) | ×38 |
| **S5 post-patch** (mid-S5 score cap, weapon stack 0.5×) | ×38 economy / score-clipped |
| **S6 minimum (L1+L3)** | ×26 |
| **S6 full (L1+L2+L3+L5)** | ×19 |

Target: S6 full package keeps Synthbeats as the "best gold character" but reduces vs-other-character gap from ~5× to ~2×.

---

## 6. Open questions

1. **Tijckers' 1.36M S5 run** — leave on leaderboard as historical, or soft-delete before S6 reset?
2. **VIP scaling** — currently linear (+1% per VIP level). At VIP10 (+10%) it's small, but if you ever push VIP15+ this becomes a stacker. Consider a soft cap formula.
3. **Pool bias UX** — should we surface a warning when a player picks 90%+ of one category? It's not a balance issue but it does encourage extreme stacking.
4. **Title buff registry** — currently no centralized cap. As more titles are added, this could become the next "talent stack" problem. Consider a `MAX_TITLE_BUFF_TOTAL` ceiling.

---

*End of audit. No code modified. Awaiting your call on which levers to ship for S6.*