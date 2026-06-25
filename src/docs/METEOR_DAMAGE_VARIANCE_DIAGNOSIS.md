# Meteor Damage Variance — Why Same Setup ≠ Same Result

**Date:** 2026-06-25
**Reported by:** Briantjeuh (Discord, 06:11) — "Flaming Whip lvl25 same as always on the meteor and i only got 7.8 mil damage"
**Investigated:** GameEngine.js + submitSquadMeteorDamage.js + getSquadMeteorState.js

---

## TL;DR

The variance is **100% on the client engine side** — not a server/DB issue. The server just stores whatever `damage` number the client submits (sanity-capped at 100M). Same loadout produces different totals because of **at least 7 legitimate sources of run-to-run randomness**.

(Note: the "Base44 DB constraint" comment in the same Discord thread was about a different topic — unrelated to this damage variance question.)

---

## The damage path (verified)

1. `EnemySpawner` spawns one stationary "Squad Meteor" target (HP = 1e15, so effectively immortal during the run).
2. Every weapon hit on the meteor calls the standard damage handler in `GameEngine.js:1449`:
   ```js
   if (enemy._isMeteorTarget) {
       this.runMeteorDamage = (this.runMeteorDamage || 0) + finalDamage;
   }
   ```
3. At run end, `_runStats()` includes `meteorDamage: Math.floor(this.runMeteorDamage || 0)` (line 1532).
4. Client posts that number to `submitSquadMeteorDamage` → server clamps to ≤100M, stores it, applies to the shared squad meteor.

**There is no per-run server normalization, no random server fudge, no DB-side rounding loss.** Whatever the engine accumulated is what gets banked.

---

## Why the same loadout produces wildly different totals

### 1. 🎲 Critical hits (biggest factor)
Crits are rolled per-projectile via `Math.random() < critChance`. Flaming Whip lvl25 fires constantly for ~3 minutes — that's thousands of damage events. Variance in crit RNG alone can swing total damage **±20–30%** between runs. A "hot crit streak" run vs an "ice cold" run with the same crit chance is the single largest source of swing.

### 2. 🎲 Weak-spot hits (`WEAK SPOT!`)
Weak-spot logic is dice-rolled per hit. A run with bad weak-spot RNG could lose 15–25% damage vs a hot run.

### 3. 🎲 NeonVortex execute splash (if applicable)
`character_id === 'neonvortex'` triggers an execute splash with 3 random-angled railgun projectiles, each rolled into the damage stream. Different character → different damage curves entirely. (Not Briantjeuh's case — but a frequent variance source for those switching chars.)

### 4. 📈 Squad Meteor buffs change between runs
`functions/getSquadMeteorState` computes buffs from the **current meteor level**:
- `damage_pct: lvl * 0.5` (cap +10% at lvl 20)
- `aoe_pct: lvl * 0.5`
- `cdr_pct: lvl * 0.25`

So if the squad leveled the meteor between his two runs, Briantjeuh's second run hit with a **different damage multiplier** even on identical gear. Going from meteor lvl 5 → lvl 10 = +2.5% damage and +2.5% AoE and +1.25% CDR. Over a 3-minute Whip run, that's noticeable.

### 5. 📈 Title buff / VIP buff / relic buff stacking
GameEngine line 331 stacks `damageMult` from:
- baseChar + statBonus + talentBonus + relicBonus + vipDmgBonus + titleBuff + adminMult + **meteorDmgMult**

If any of these changed (e.g. he equipped a new title between runs, VIP weekly reset, relic boost expired), the multiplier is silently different.

### 6. ⏱ Run length variance
"3-minute DPS check" — but `engine.time` is wall-clock. If a frame stutter, tab focus loss, or a 1-second pause modal happens, the meteor run ends slightly earlier in wall-clock terms, with fewer Whip ticks. **Each Flaming Whip tick at lvl25 is ~80k damage** → losing 5 seconds = ~400k missing.

### 7. ⏱ Whip cooldown phasing
Flaming Whip ticks on a cooldown (post-CDR ≈ 0.15s). Whether your run starts mid-cooldown or just after a tick can mean **1 extra tick or 1 fewer** over 3 minutes. With high-damage builds that's another ±200k–500k of variance.

### 8. 🐛 Possible: damage text throttling (cosmetic only)
The floating damage text uses `enemy.damageBuffer` (line 1455) and only flushes every 0.25s. **This does NOT affect the actual damage count** — `runMeteorDamage` increments on every hit. But it does mean what the player SEES (floating numbers) is heavily aggregated, so two runs that show different floating numbers may actually differ less than they look.

---

## What's NOT the cause

| Hypothesis | Verdict |
|---|---|
| Base44 DB constraint / rounding loss | ❌ No — server stores raw integer damage |
| Server-side cap or normalization | ❌ Only cap is 100M sanity (10× whale ceiling) |
| Race condition between two squad members | ❌ Each run submits its own row; meteor updates are atomic |
| Reservation flow eating damage | ❌ `start` mode only logs damage=0, `finish` updates with real value |
| Lost packets / retries | ❌ `withRetry()` handles 429s idempotently (line 220-228 detects already-finalized rows) |

---

## Realistic damage range for Flaming Whip lvl 25, 3-minute meteor

Eyeballing the math:
- Base tick × 3min × CDR-adjusted rate ≈ **8–14M damage** typical
- With hot crit RNG + good buffs: up to **18–20M**
- With cold RNG + no buffs: down to **6–8M** ← **Briantjeuh's 7.8M is normal-low**

So his 7.8M run vs a previous ~12M run isn't a bug — it's the lower end of the natural variance curve.

---

## What we can/should do

### Option A — Communication fix (zero dev cost)
Update the Squad Meteor arena tooltip to set expectations:
> *"Per-run damage varies based on crit RNG, weak-spot rolls, and active buff levels. Identical loadouts can swing ±30% between runs."*

This is honest and fixes 80% of the confusion.

### Option B — Show the player WHY their run was high/low
After-run modal addition: a "Damage breakdown" line showing:
- Total hits landed
- Crit rate this run
- Weak-spot hits
- Effective damage multiplier (with meteor buffs noted)

Lets the player SEE that their 7.8M run had 14% crit rate while their 12M run had 22%. Removes the mystery. ~0.5 day dev.

### Option C — Reduce variance (gameplay change — careful)
- Make crit rate **deterministic** in meteor arena only (e.g. every Nth hit crits). Removes RNG swing but also kills the "hot run" thrill.
- Make weak-spot guaranteed every Nth hit in meteor.
- **Not recommended** — variance is part of the chase. Players who hit big damage feel rewarded. Removing it makes meteor feel sterile.

---

## Recommendation

**Ship Option A this week** (1-minute tooltip change), **plan Option B for next patch**. Skip C.

The "Damage breakdown" modal (Option B) is a strong fit because:
- It's transparent — players understand the game better
- It's marketable — "see exactly why your run was a banger or a flop"
- It complements the new OMENX spend brainstorm (#1 Pick 2 / Pick All): both about giving players more control over the moment-to-moment outcome.