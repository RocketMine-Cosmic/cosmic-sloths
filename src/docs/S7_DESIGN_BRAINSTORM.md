# Season 7 — Design Brainstorm (v3, system-wide audit)

**Status:** EXPLORATION / NOT DECIDED. Owner reads, picks what to ship.
**Date:** 2026-06-07
**Trigger:** Anubis Discord feedback (2026-06-07) — "this is a shooter, not a stand-around-and-collect-nukes game."

**This doc replaces v2.** v2 fixed v1's incorrect assumptions about the shield + DD, but it still treated the AFK meta as a "fix shield + nuke" problem. Reading every system end-to-end (`WeaponSystem`, `CharacterMechanics`, `ProjectileSystem`, `EnemyAI`, `BossSystem`, `NFTPerks`, `SquadUltimate`, `Constants`, `UpgradeSystem`) shows it's deeper than that — **the AFK meta is built into 5 of 10 characters and reinforced by every weapon model except single-target projectiles.**

This v3 is the synthesis layer. The full system audit lives in four sister docs:
- [`S7_WEAPON_AUDIT.md`](./S7_WEAPON_AUDIT.md) — every weapon by damage model
- [`S7_CHARACTER_AUDIT.md`](./S7_CHARACTER_AUDIT.md) — every character + AFK affinity
- [`S7_LAYER_AUDIT.md`](./S7_LAYER_AUDIT.md) — every multiplicative power layer

Read those when you want detail. This doc is for decisions.

---

## 1. What the System Actually Does (the big-picture findings)

After reading everything:

**a. The game has FIVE distinct weapon damage models**, not "AoE vs projectile."
1. **Single-target projectiles** (pierce-bounded, neoBlaster/napBeam/supernovaBeam etc.)
2. **Pulse AoEs** (expanding ring with `hitList`, one hit per enemy — novaPulse/laserNova/quantumCollapse)
3. **Pushback AoEs** (player-locked, 4-ticks/sec damage + every-frame pushback — shieldBubble/aegisMatrix/burningBarrier)
4. **Pool AoEs** (stationary, 4-ticks/sec damage, no pushback — napalm/hellfire/toxicCloud/lash pools)
5. **Melee swings** (one damage event per cast — vineWhip)

Pushback AoEs are mechanically superior to all others in dense-wave clear because they damage 4 ticks/sec AND prevent enemies from leaving the radius. At max CDR, 4 shields overlap → ~16 damage ticks/sec at every enemy in 480u radius.

**b. The AFK meta is character-design rooted, not just weapon-rooted.**

From [`S7_CHARACTER_AUDIT.md`](./S7_CHARACTER_AUDIT.md#afk-affinity-summary):

| AFK affinity | Characters | Mechanic that rewards standing still |
|---|---|---|
| Very High | NeoByte, CodeBreaker | Banner (stationary buff zone), Hack (passive enemy infighting) |
| High | Pandypaws, NovaByte, HoloDrift | Scrap on kill, Chain explosion on kill, Decoy (taunts) |
| Medium | DataPhantom, SynthBeats, Glitch | Neutral mechanics |
| Low | NeonVortex (kiting needed), SkyByte (Sonic Boom REQUIRES movement) | — |

**5 of 10 characters were designed around stationary mechanics.** Banners, decoys, hacks, scrap, chain explosions all trigger passively while standing still. The shield is the most visible symptom of this design philosophy, not the root cause.

**c. Caps already exist for most stat-stacking** ([`S7_LAYER_AUDIT.md`](./S7_LAYER_AUDIT.md#caps-that-already-exist-the-brakes-that-work)) — playerDmgCap 4.0×, wDmgCap 1.8×, cooldownMult floor 0.35, drone caps at 7, AoE pool life capped at 15s, projectile soft-cap 200. Many of these are post-Tijckers/Anubis crash audits. **The caps work for what they cap.**

**d. The caps that DON'T exist are exactly the ones the AFK meta exploits:**
- Pushback AoE overlap has no diminishing — 8 stacked shields = 8× DPS
- Nuke damage is `maxHp × 10` unconditional — no boss / no tier matters
- Luck → nuke drop rate is linear — every luck point increases AFK reward
- DD adds spawn pressure but NO score reward — no incentive to engage with it
- No character kit penalises standing still (except SkyByte's Sonic Boom decay)

**e. The Outer Galaxy HP curve forces nuke reliance** at S11+ regardless of weapon choice. S20 mobs hit ~1.95M HP. Even a maxed weapon stack lands at ~11.5k DPS for shieldBubble or ~3.7k DPS for supernovaBeam. **No weapon damage curve can dent 1.95M HP without nukes** at the Outer Galaxy clear pace.

---

## 2. The Three Meta Builds That Dominate

From the audit, three coherent build paths emerge as obvious top-tier:

### Build A — "Shield AFK"
- **Character:** NeoByte (banner) / CodeBreaker (low CD) / Pandypaws (tank+area)
- **Weapons:** shieldBubble → aegisMatrix + any pool AoE for secondary tick damage
- **Passives:** cd_down × 5, area_up × 5, hp_up × 5, armor_up × 5
- **Relics:** Cosmic Dice L5 (luck → nuke drops), Blood Chalice L5 (regen)
- **How it plays:** stand still. Let the shield tick down everything in 480u while occasional nukes clear overflow. Score scales with kills × time, which scales with shield uptime × area.

### Build B — "Sniper crit"
- **Character:** NeonVortex (2.0 dmgM, execute) / Glitch (1.5 dmgM, crit talent)
- **Weapons:** supernovaBeam (proj_spd → bonus damage) / buzzsawSwarm
- **Passives:** dmg_up × 5, proj_spd × 5, hp_up × 5
- **Relics:** Annihilation Core L5, Cosmic Dice L5 (crit chance)
- **How it plays:** kite. Single-target high-damage shots one-shot most enemies. Execute snowballs once enemies hit 20% HP.

### Build C — "Synergy stack"
- **Character:** NovaByte (area-focused chain explosions)
- **Weapons:** vineWhip → synergize into flamingLash/seismicWhip/thornySwarm, plus quantumCollapse
- **Passives:** area_up × 5, cd_down × 5, dmg_up × 5
- **How it plays:** kite-and-circle. AoE field plus chain explosions cascade through density.

**Empirically, Build A dominates the leaderboard.** It has the lowest skill floor (literally: stand still) and competitive ceiling because of the pushback-uptime stacking. Builds B and C exist and work, but require more positional play. **The complaint isn't that Build A exists — it's that Build A is strictly easier than Builds B and C for similar reward.**

---

## 3. The Real Question for S7

Three options the owner could pursue, in increasing order of scope:

### Option 1 — Surgical nerf (v2's recommendation)
Nerf shield uptime, nuke damage, Outer Galaxy HP. ~15 lines of code. Build A becomes worse; Builds B and C become relatively stronger. Meta shifts but doesn't restructure.

**Risk:** Surface-level fix. Banner-NeoByte, decoy-HoloDrift, hack-CodeBreaker still reward stationary play with their KIT, not just shield. After 2 weeks players find Build A2 (e.g. dense pool weapons + banner) and complaint resumes.

### Option 2 — Reward axis (broader)
Keep Option 1, AND add a score multiplier tied to Dynamic Difficulty (`dynamicDifficulty.spawnRateMult`) capped at 2× score. DD ramps with kill velocity, so this rewards aggressive play directly. Players who AFK keep their DD pinned at 1.0× and stay at 1.0× score; players who push for max DD earn double points.

**Why this works:** the existing DD system already does ~80% of the "Heat" idea v1 proposed without knowing. It just doesn't pay out. Wiring score to DD is ~5 lines server-side in `saveScore`. It turns "playing aggressively" from a self-imposed challenge into a scored objective.

**Risk:** Cosmic-only (DD only ramps on Cosmic). Easy/Normal/Hard players see no change. May feel like "the leaderboard is even more Cosmic-locked."

### Option 3 — Restructure (broadest)
Reposition shield bubble as a defensive cooldown ABILITY (like Glitch's phase shift) rather than a weapon. Pull aegisMatrix out of the level-up pool. Replace pushback with **damage absorption** — bubble absorbs N damage over its life, no pushback. Re-tune the 5 high-AFK character kits to add a "movement reward" mechanic (e.g. Banner only buffs while moving INTO it, not standing in it).

**Why this works:** addresses the root design issue. AFK becomes mechanically unsupported.

**Risk:** Huge scope. Breaks a lot of existing builds. Probably an S8 plan, not S7.

---

## 4. Recommended S7 Package

**Ship Option 1 + Option 2 together.** Option 3 stays in the design queue for S8.

Concrete changes:

### 4a. Shield uptime — lift the per-weapon CD floor for shields only
```js
// WeaponSystem.js or GameEngine.updateWeapons
// Currently: w.timer = (w.baseCooldown / 60) × max(0.35, cooldownMult) × max(0.5, cdMult)
// New per-weapon override:
const cdFloor = (w.id === 'shieldBubble' || w.id === 'aegisMatrix') ? 0.85 : 0.5;
w.timer = (w.baseCooldown / 60) × max(0.35, cooldownMult) × max(cdFloor, cdMult);
```
Shield bubble min CD becomes `3.0s × 0.35 × 0.85 = 0.89s` instead of `0.525s`. With life 2.0s → ~2.2 overlapping (was ~3.8). Aegis Matrix → ~5 overlapping (was ~8.6). Still strong, no longer ridiculous.

### 4b. Pushback decays in the final 0.5s of shield lifetime
```js
// ProjectileSystem.js — pushback branch
const lifeFrac = p.life / p.maxLife; // store maxLife at spawn
const pushbackMult = Math.min(1.0, lifeFrac / 0.25); // full pushback first 75%, ramp to 0 in last 25%
e.x += Math.cos(angle) × p.pushback × pushResist × pushbackMult × dt;
```
Enemies press in as bubble fades. Creates a "safe → vulnerable → safe → vulnerable" rhythm instead of perma-fortress.

### 4c. Nuke damage `maxHp × 10` → `maxHp × 2.5`
```js
// PickupSystem.js triggerNukeEffect
engine.damageEnemy(e, e.maxHp * 2.5, { weaponId: 'nukePickup' });
```
Still one-shots Inner Galaxy mobs. T13-T14 Outer Galaxy mobs take ~40% — nukes become "thin the herd" instead of "delete the screen."

### 4d. Nuke drop rate halved
```js
// EnemyAI.js:217
if (Math.random() < 0.005 + (engine.player.luck * 0.0005)) { ... }
```
Halves the base + luck contribution. Luck builds still see more nukes than non-luck builds, just half as often.

### 4e. Outer Galaxy HP curve reduced 25-35%
```js
// EnemySpawner.js
const OUTER_GALAXY_HP_MULT = {
    11: 10,    12: 16,    13: 24,    14: 38,    15: 58,
    16: 90,    17: 140,   18: 215,   19: 335,   20: 510,
};
```
S20 mob HP drops from ~1.95M to ~1.43M. A maxed weapon (~11.5k DPS for shield, ~3.7k DPS for supernova) can plausibly dent these in concert with nukes instead of nukes being the only solution.

### 4f. DD → Score multiplier (the carrot)
```js
// functions/saveScore.js — apply at server-side score finalize
const ddPeak = stats.ddPeakSpawnMult || 1.0; // client passes peak DD reached this run
const heatBonus = 1 + ((ddPeak - 1) / 2.5) × 1.0; // 0 at 1.0×, 1.0 at 3.5× cap
const finalScore = Math.floor(rawScore × Math.min(2.0, heatBonus));
```
Engine tracks `dynamicDifficulty.spawnRateMult` per frame, sends peak with score. HUD shows "HEAT 2.4×" when DD > 1.5×.

### 4g. Tag character signature triggers with the SAME `weaponId` they currently use, so the post-run breakdown actually shows banner damage
*(QoL — already partially done; complete coverage so it's clear in run stats how much of your damage came from shield vs banner vs base weapons)*

---

## 5. What Deliberately Stays the Same

- **No character rebalancing.** NeoByte / CodeBreaker / Pandypaws kits stay as-is. Option 3 (re-design AFK kits) is S8 work.
- **No weapon damage / area / level scaling changes** to anything but shieldBubble and aegisMatrix CD floor.
- **No DD parameter changes.** DD already does its job; just doesn't pay out.
- **No talent / mastery / relic changes.** These layers are well-tuned per the layer audit.
- **No synergy / evolution rules changes.** The 14 paths are well-designed; vineWhip's centrality is a feature.
- **No Inner Galaxy mob HP changes.** Inner Galaxy clears are fine; nerfing them would hurt new players.

---

## 6. Why This Lands Differently Than v1/v2

- v1: designed against assumed mechanics. Was wrong about almost everything.
- v2: read combat code, designed a surgical fix to shield + nuke + OG HP. Correct, but incomplete — didn't account for the character-design side.
- v3: read everything. Confirms v2's surgical fixes are right AS FAR AS THEY GO, but adds:
  - **Option 2 (DD → Score)** as the *positive incentive*. v2 only nerfed; v3 also rewards.
  - **Acknowledges 5/10 characters were designed around AFK mechanics.** A surgical nerf won't kill the meta because the character kits still passively support it. We can ship S7 with Option 1+2, then plan a character-kit pass for S8.
  - **Picks the right size for S7.** Option 3 is the "right" design fix but it's a season's worth of work on its own.

---

## 7. Open Questions for Owner

1. **Should the post-S7 plan include reworking the 5 high-AFK character kits?** (Option 3 long-form work) — this is months of design work, would need a full season cycle.
2. **Are we comfortable with score-multiplier reward being Cosmic-only?** DD only ramps on Cosmic by design. Easy/Normal/Hard players would never see the "HEAT" bonus.
3. **Should nukes get redesigned into a tactical button** (e.g. mastery-tree unlock with 60s CD doing 30% maxHp) rather than RNG pickup? Removes luck-stacking exploit cleanly.
4. **Are we touching the Outer Galaxy HP curve so soon after release (2026-06-04, 3 days ago)?** Players may still be in the "learning" phase. Worth waiting 2 weeks to confirm the curve is actually wrong vs. just hard.
5. **Should burningBarrier and any future pushback weapon inherit the new shield CD floor automatically**, or be tuned per-weapon? Currently only shieldBubble + aegisMatrix would get the lifted floor.

---

## 8. Cross-references

- Full weapon catalog by damage model: [`S7_WEAPON_AUDIT.md`](./S7_WEAPON_AUDIT.md)
- Character kits + AFK affinity table: [`S7_CHARACTER_AUDIT.md`](./S7_CHARACTER_AUDIT.md)
- Multiplicative stacking layers + caps: [`S7_LAYER_AUDIT.md`](./S7_LAYER_AUDIT.md)