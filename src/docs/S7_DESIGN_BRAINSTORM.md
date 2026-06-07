# Season 7 — Design Brainstorm (v2, code-grounded)

**Status:** EXPLORATION / NOT DECIDED. Owner reads, picks what to ship.
**Date:** 2026-06-07
**Trigger:** Anubis Discord feedback (screenshot 2026-06-07) — "this is a shooter, not a stand-around-and-collect-nukes game."

**This doc replaces v1.** v1 made design proposals against assumed mechanics. After reading `WeaponSystem.js`, `EnemyAI.js`, `EnemySpawner.js`, `UpgradeSystem.js`, `CharacterMechanics.js`, `GameEngine.js`, `PickupSystem.js`, and `Constants.js`, almost every assumption was wrong. The v2 below is grounded in what the code actually does.

---

## 1. What the Code Actually Does (the things v1 got wrong)

### 1a. Shield Bubble / Aegis Matrix is NOT a wall

It's an **AoE projectile that fires on a cooldown like every other weapon**, with three effects bundled together:

```js
// WeaponSystem.js — shieldBubble
engine.projectiles.push({
    radius: 80 * area,        // up to 240u base, visual capped at 320u (S6)
    damage: dmg,              // deals damage on every frame
    pierce: 999,              // hits everyone in range
    life: 2.0,                // each cast lasts 2 seconds
    pushback: 250,            // pushes enemies outward 250 units when hit
    type: 'shield_bubble'
});
```

The "wall" the player sees is the **pushback** (250u for Shield Bubble, 300u for Aegis Matrix). Every frame an enemy is inside the bubble, it takes damage AND gets pushed 250u outward. Combined with the damage radius (which extends 1.5× past the visual cap = up to 480u for shield, 630u for Aegis), enemies physically can't close the gap — they get shoved back faster than they can move.

### 1b. The shield has 100%+ uptime at max CDR

Shield Bubble base cooldown = 180 frames (3s). With max stacking:
- `player.cooldownMult` floor = 0.35
- Per-weapon `cdMult` (`Math.max(0.5, ...)`) = 0.5

Final cooldown = `3.0s × 0.35 × 0.5 = 0.525s`. **But `life: 2.0` means each cast lasts 2 seconds.** So at max CDR, you have **~4 overlapping bubbles at all times** — the "shield" is actually a permanent stacking AoE field. Aegis Matrix is even faster (base 100 frames = 1.67s × 0.35 × 0.5 = 0.29s, life 2.5s → ~9 overlapping fields).

That's the AFK meta in one sentence: **the shield is just a self-sustaining AoE damage zone with pushback that costs nothing to maintain at high CDR.**

### 1c. Dynamic Difficulty is already very developed

I underestimated DD massively in v1. The actual code (`GameEngine.js:800-884`):
- Spawn rate cap: **3.5×** on S6 Cosmic
- Enemy speed cap: **2.5×** on S6 Cosmic
- Asymmetric ramp: **+0.30/cycle up, −0.05/cycle down**
- Floor: 0.85× (S6) — strugglers protected
- Re-evaluates every 5s in first 60s, every 15s after
- Kill threshold: 15/15s, or 4/15s before DD has ramped past 1.0×
- **ONLY active on Cosmic difficulty** (Easy/Normal/Hard pinned at 1.0× — explicit decision after player feedback)

The kill-velocity ramp I proposed in v1 already exists. The score-multiplier-for-heat idea is still novel, but the "DD revamp" framing was based on not knowing DD.

### 1d. Weapon scaling is already aggressive

`WeaponSystem.js:88-91`:
- Per-level damage: `1 + min(24, level-1) × 0.15` → **at lvl 25 = +360% damage just from level**
- Per-level area S6: `1 + min(24, level-1) × 0.05` → **at lvl 25 = +120% area**
- Per-weapon dmg cap (S6): 1.8×
- Per-weapon area cap (S6): 1.6×
- Player damage cap (Inner Galaxy): 6.0×
- Player damage cap (Outer Galaxy S20): 80×

A maxed evolved weapon on S10 at Cosmic difficulty does roughly: `baseDmg × 4.6 (level) × 1.8 (forge) × 6.0 (player) = 49.7× baseDmg`. Weapons are NOT under-scaled. The v1 proposal "make weapon levels feel impactful" was solving a problem that doesn't exist.

### 1e. Nuke pickups are luck-gated, not random

`EnemyAI.js:217`:
```js
if (Math.random() < 0.01 + (engine.player.luck * 0.001)) {
    // drop nuke / magnet / shield pickup
}
```

Base 1% drop rate per non-elite, non-boss kill. **Luck adds 0.1% per point.** With a luck-stacked build (Cosmic Dice relic L5 + Lucky Glitch + CodeBreaker passive luck = ~10-12 luck), that's still only ~2% per kill. Anubis's "stand around for nukes" complaint is real, but it's tied to **kill volume × luck**, not a high base rate. The fix is to lower the base rate OR reduce the impact of each nuke, not redesign the drop system.

### 1f. The nuke does `maxHp × 10` damage

`PickupSystem.js:14-24`. A single nuke wipes ALL non-boss enemies on screen. Doesn't matter if they're T1 or T14 — they all die in one frame. This is the actual "I-win button" — not because it's frequent, but because each cast is unconditional.

### 1g. Outer Galaxy mob HP is the real reason nukes feel mandatory at S11+

`EnemySpawner.js:13-21`:
```js
const OUTER_GALAXY_HP_MULT = {
    11: 13.55, 12: 21.03, 13: 32.51, 14: 50.44, 15: 78.17,
    16: 121.13, 17: 187.70, 18: 290.90, 19: 450.85, 20: 698.79,
};
```

Mob HP scales **698× by S20**. Even with a maxed weapon doing `49.7× baseDmg` (above), a T14 mob with base HP 2800 × 698× = ~1.95M HP. That's not a sponge — it's a brick wall. Nuking is the only viable clear at S15+ because no weapon damage curve can keep pace with that exponential HP growth.

So Anubis's complaint is two separate problems wearing the same shirt:
1. **In Inner Galaxy (S1-S10):** shield bubble + AFK + occasional nuke is OPTIMAL because the shield's AoE+pushback is too good. Weapons work fine, players just don't need them.
2. **In Outer Galaxy (S11-S20):** nukes are MANDATORY because mob HP outscales every weapon multiplier. Players don't choose nukes, the math forces them.

These need different fixes.

---

## 2. Where the AFK Meta Actually Comes From

Pulling apart the loop into its mechanical roots:

| Symptom Anubis describes | Actual mechanism in code |
|---|---|
| "Mobs cluster around me, don't reach me" | Shield Bubble/Aegis pushback (250/300u) pushes mobs out faster than they can re-approach |
| "I just shift the pile with a nuke" | Nuke = `maxHp × 10` damage = unconditional one-shot |
| "Weapon upgrades feel pointless" | Inner Galaxy: shield's bundled AoE+pushback clears the field for free; weapons are redundant. Outer Galaxy: mob HP outscales weapon multipliers |
| "Why level anything but shield?" | Shield with max CDR has ~4 overlapping casts at all times → permanent free damage zone |
| "Enemies should reach me" | Pushback resets enemy position 250u/frame whenever they enter the bubble. Speed buffs don't help — the geometry caps closure rate |
| "I want to mow them down" | Outer Galaxy HP curve means non-nuke weapons can't actually mow anything down past S13 |

**Root causes (ranked):**
1. **Shield pushback** combined with **shield uptime at high CDR**. Standing still while the shield cycles = perfect kill zone.
2. **Outer Galaxy mob HP curve** forces nuke reliance.
3. **Nuke damage is unconditional** (maxHp × 10) so even rare drops define the meta.
4. **Luck-stacking** lets the nuke drop rate go from "rare emergency" to "every 20-30 kills."

---

## 3. Levers (with actual numbers from the code)

### 3a. Shield uptime — the highest-leverage Inner Galaxy lever

The pushback isn't the problem on its own — it's the pushback × 100% uptime combo. Three ways to break the uptime, in order of bluntness:

**(i) Raise per-weapon CD floor for shields specifically.**
Currently `Math.max(0.5, cdMult)` applies to all weapons. Add a per-weapon override for `shieldBubble` and `aegisMatrix` at `Math.max(0.85, cdMult)`. That makes shield CDs:
- Shield Bubble: `3.0s × 0.35 × 0.85 = 0.89s` cooldown, life 2.0s → 2.2 overlapping (still strong, not absurd)
- Aegis Matrix: `1.67s × 0.35 × 0.85 = 0.50s` cooldown, life 2.5s → 5 overlapping (still very strong)

**(ii) Reduce shield lifetime.**
Drop `life: 2.0 → 1.0` for Shield Bubble and `life: 2.5 → 1.5` for Aegis Matrix. Combined with (i), uptime drops to ~1× overlapping = the shield exists, but with windows. Players have to **time when to stand behind it**.

**(iii) Pushback decays over the shield's life.**
First 0.4s of the bubble = full 250u pushback. Last 0.6s = 0u. Mobs press in as the bubble fades. Hardest to implement but most "feels right" — the shield is an actual cycle of "safe → vulnerable → safe → vulnerable" instead of a constant fortress.

**Recommend (i) + (iii).** Numerically gentle, breaks the bug cleanly. (ii) is a hard nerf that hits new players too.

### 3b. Outer Galaxy HP curve — the Outer Galaxy lever

Current S20 HP multiplier is 698.79×. Even with the per-sector dmg cap of 80× and the area cap of 12×, a T14 base 2800 HP mob hits ~1.95M HP. Drop the curve to:

```
S11 ≈ 10×   (was 13.55)
S15 ≈ 50×   (was 78.17)
S20 ≈ 450×  (was 698.79)
```

That's a 25-35% reduction across the band. A maxed weapon now lands at `49.7× baseDmg` vs `1.95M ÷ 0.65 = ~1.27M HP` — still brutal, but weapons can plausibly contribute. Nukes become "thin the wave" instead of "the only clear."

**Risk:** Outer Galaxy clear rates spike. Mitigation: increase mob density in the same band by +15-20% so finish-line score still scales on kill volume.

### 3c. Nuke damage and drop rate

`maxHp × 10` is unconditional one-shot. Two complementary changes:

**(i) Damage from `maxHp × 10` → `maxHp × 2.5`.** Still one-shots Inner Galaxy mobs. T13-T14 Outer Galaxy mobs survive but take 40% of max HP — nukes become "thin the herd" instead of "delete the screen." Aligns with proposal 3b.

**(ii) Drop rate from `0.01 + (luck × 0.001)` → `0.005 + (luck × 0.0005)`.** Halves the floor. Luck still helps, but a luck-30 build now sees 2% → 1% per kill. Combined with (i), nukes go from "the meta" to "a tactical option."

### 3d. DD score multiplier (the one v1 idea that survives)

DD already drives spawn rate and mob speed. **It doesn't currently affect score at all.** Adding a score multiplier tied to DD's spawn-rate-mult value (capped at 2.0× score at the 3.5× spawn cap) would:
- Reward aggressive play with a visible score number, not just spawn pressure
- Add a new mastery axis (top players chase max-DD windows)
- Not affect non-Cosmic players (DD only ramps on Cosmic)

**Concrete:** `scoreMult = 1 + ((dynamicDifficulty.spawnRateMult - 1) / 2.5) × 1.0`, capped at 2.0×. Apply at run end in `saveScore` (server-side, can't be tampered with). Players see a "HEAT" indicator on the HUD when above 1.5× DD.

This is the most "Anubis-shaped" change in the doc — directly rewards the kind of aggressive play he's asking for, without forcing it on anyone.

### 3e. Things v1 proposed that are NOT needed

- ❌ **Spawn rate buffs.** DD already caps at 3.5×. Adding a flat bump just shifts the ceiling.
- ❌ **Mob speed buffs.** Useless while shield pushback dominates. Fix the shield first.
- ❌ **"Make weapon levels feel impactful."** Weapons already scale at 0.15/level damage capped at lvl 24. They feel fine in Inner Galaxy; the problem is they don't get USED because the shield does the work.
- ❌ **Inner Galaxy HP bump.** Same reason — won't change the AFK loop, just frustrates new players.
- ❌ **Kill-velocity spawn ramp.** Already exists as DD.
- ❌ **End-of-run spawn taper removal.** Already removed for DD ≥ 1.5× whales (`EnemySpawner.js:299`). The taper still exists for struggling players, which is correct.

### 3f. Open questions worth a doc of their own

- **Should nukes become a Mastery-tree unlock instead of a pickup?** Tactical button with a 60s CD that does, say, 30% of all enemies' max HP. Removes RNG, adds agency, lets us tune knobs precisely. Big lift — flag for S8.
- **Should pushback exist at all?** Pushback is a 10-year-old VS-genre convention. Modern entries (Brotato, Halls of Torment) use damage zones WITHOUT pushback specifically because pushback fortress builds dominate. Worth a serious debate before S7.
- **Outer Galaxy HP curve was set 2026-06-04.** It's three days old. Was it tested with non-nuke builds? Worth asking Anubis directly: at what sector do his weapons stop killing things? That datapoint refines the 25-35% reduction number.

---

## 4. Recommended S7 Launch Patch

**The whole patch in three lines:**

| Lever | Change | Lines of code | Risk |
|---|---|---|---|
| Shield uptime | Per-weapon CD floor for `shieldBubble` / `aegisMatrix` lifted 0.5 → 0.85 | ~3 lines in WeaponSystem | LOW |
| Outer Galaxy HP | `OUTER_GALAXY_HP_MULT` lookup reduced 25-35% across S11-S20 | 1 lookup table in EnemySpawner | MEDIUM |
| Nuke damage | `maxHp * 10` → `maxHp * 2.5` in `triggerNukeEffect` | 1 line in PickupSystem | LOW |
| Nuke drop rate | Halved | 1 line in EnemyAI | LOW |
| DD → Score | Map DD spawn mult to score mult (cap 2.0×) | ~5 lines in saveScore | MEDIUM |

**Total impact:** ~10-15 lines of game code + 5 lines server-side. All independently revertible. Tier 1 (shield + nuke) addresses the Inner Galaxy AFK meta. Tier 2 (Outer Galaxy HP) addresses the "weapons don't work" complaint. Tier 3 (DD score) actively rewards the playstyle Anubis is asking for.

**What deliberately gets left alone:**
- All weapon damage / area / level scaling.
- DD parameters (already well-tuned).
- Player power caps in either galaxy.
- Difficulty multipliers, talent trees, character mastery, relics.

That's a focused, code-grounded S7 patch. It doesn't require new content, new systems, or any speculative redesign — just four targeted nudges to the existing math.

---

## 5. What I Got Wrong in v1 (lessons for next time)

For my own reference and the next time someone reads this doc:

- **I never read the shield's actual implementation.** v1 spent two passes designing solutions for "the wall that blocks enemies." There is no wall. The shield is a pushback-AoE projectile. The pushback creates the wall *perception*; the fix is to break the uptime that makes the pushback constant.
- **I never read the DD system.** v1 proposed replacing DD with a "Heat system" that turned out to be 80% of what DD already does, minus the score reward.
- **I never read the weapon scaling.** v1 proposed making weapon levels "feel more impactful" when the existing curve already grants +360% damage at max level.
- **I treated Anubis's "S11 is HP sponges" complaint as a perception issue.** It's literally a 698× HP multiplier at S20. The math doesn't allow non-nuke clear.

Reading the code first matters. The doc is only useful if its diagnoses match the actual systems.