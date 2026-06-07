# Season 7 — Design Brainstorm (v3, system-wide audit)

**Status:** EXPLORATION / NOT DECIDED. Owner reads, picks what to ship.
**Date:** 2026-06-07
**Trigger:** Anubis Discord feedback (2026-06-07) — "this is a shooter, not a stand-around-and-collect-nukes game."

**This doc replaces v2.** v2 fixed v1's incorrect assumptions about the shield + DD, but it still treated the AFK meta as a "fix shield + nuke" problem. Reading every system end-to-end (`WeaponSystem`, `CharacterMechanics`, `ProjectileSystem`, `EnemyAI`, `BossSystem`, `NFTPerks`, `SquadUltimate`, `Constants`, `UpgradeSystem`) shows it's deeper than that — **the AFK meta is built into 5 of 10 characters and reinforced by every weapon model except single-target projectiles.**

**Owner decisions (2026-06-07) — see Section 7.** Key decisions baked into Section 4 below:
- Option 3 (character kit rework) is OFF the table — too much work.
- DD score reward must work on Normal/Hard too (with scaled parameters).
- Nukes stay as RNG pickups.
- Outer Galaxy HP cut is approved for S7 — confirmed too brutal for non-shield builds.
- `burningBarrier` inherits the lifted shield CD floor.

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

## 3. The Approach for S7

Two complementary axes, both shipping in S7:

### Axis A — Surgical nerf (the brake)
Nerf shield uptime, nuke damage, Outer Galaxy HP. ~20 lines of code. Build A becomes worse; Builds B and C become relatively stronger. Meta shifts but doesn't restructure.

**Acknowledged limit:** Banner-NeoByte, decoy-HoloDrift, hack-CodeBreaker still reward stationary play with their KIT, not just shield. After 2 weeks players may find Build A2 (e.g. dense pool weapons + banner). Owner has accepted this trade-off — character kit rework is too much work for S7.

### Axis B — DD → Score reward (the carrot)
Add a score multiplier tied to Dynamic Difficulty (`dynamicDifficulty.spawnRateMult`) capped at 2× score. DD ramps with kill velocity, so this rewards aggressive play directly. Players who AFK keep DD pinned at 1.0× and stay at 1.0× score; players who push for max DD earn up to 2× points.

**Owner-required scope:** must work on Normal and Hard too, not just Cosmic. Cosmic DD parameters (3.5× spawn cap, 2.5× speed cap, +0.30/cycle) are too brutal for lower difficulties — Normal and Hard need scaled-down DD parameters. See 4h below.

---

## 4. Recommended S7 Package

Six concrete changes. Each is independently revertible if it lands wrong.

Concrete changes:

### 4a. Shield uptime — lift the per-weapon CD floor for all pushback weapons
```js
// WeaponSystem.js or GameEngine.updateWeapons
// Currently: w.timer = (w.baseCooldown / 60) × max(0.35, cooldownMult) × max(0.5, cdMult)
// New per-weapon override — applies to ALL Model C (pushback) weapons:
const PUSHBACK_WEAPONS = new Set(['shieldBubble', 'aegisMatrix', 'burningBarrier']);
const cdFloor = PUSHBACK_WEAPONS.has(w.id) ? 0.85 : 0.5;
w.timer = (w.baseCooldown / 60) × max(0.35, cooldownMult) × max(cdFloor, cdMult);
```
Shield bubble min CD becomes `3.0s × 0.35 × 0.85 = 0.89s` instead of `0.525s`. With life 2.0s → ~2.2 overlapping (was ~3.8). Aegis Matrix → ~5 overlapping (was ~8.6). burningBarrier inherits the floor automatically — owner confirmed any future pushback weapon should also pick this up (just add its id to the set). Still strong, no longer ridiculous.

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
// Heat bonus scales linearly with how close to the difficulty's own cap the player pushed.
// Cosmic cap 3.5×, Hard cap 2.5×, Normal cap 1.75× (see 4h). Same absolute formula —
// Cosmic at 3.5× = 2.0× score, Hard at 2.5× = 2.0× score, Normal at 1.75× = 2.0× score.
const ddCapForDifficulty = { normal: 1.75, hard: 2.5, cosmic: 3.5 }[stats.difficulty] || 1.0;
const ddProgress = (ddPeak - 1.0) / (ddCapForDifficulty - 1.0); // 0..1
const heatBonus = 1 + Math.min(1.0, Math.max(0, ddProgress)); // 1.0 at base, 2.0 at cap
const finalScore = Math.floor(rawScore × heatBonus);
```
Engine tracks `dynamicDifficulty.spawnRateMult` per frame, sends peak with score. HUD shows "HEAT 2.4×" when DD > 1.5×. Easy stays uncapped (no DD).

### 4g. DD enabled on Normal and Hard (owner-required for 4f to make sense)
Currently DD only ramps on Cosmic (`ddEnabled = !this._isS6 || this.difficulty.id === 'cosmic'`). Score reward needs DD to actually ramp on Normal/Hard or those players see HEAT pinned at 1.0×.

Per-difficulty DD parameters — Cosmic params would obliterate Normal/Hard players, so scaled down:

```js
// GameEngine.js update() — DD ramp block
const DD_PARAMS = {
    normal:  { spawnCap: 1.75, speedCap: 1.5, upStep: 0.20, downStep: 0.05, floor: 0.85 },
    hard:    { spawnCap: 2.5,  speedCap: 2.0, upStep: 0.25, downStep: 0.05, floor: 0.85 },
    cosmic:  { spawnCap: 3.5,  speedCap: 2.5, upStep: 0.30, downStep: 0.05, floor: 0.85 },
};
const p = DD_PARAMS[this.difficulty.id];
const ddEnabled = !!p; // easy still disabled
```

Easy stays at 1.0× DD (no ramp). Normal sees gentle pressure (max +75% spawn rate at peak), Hard sees stronger (+150%), Cosmic unchanged.

### 4h. Tag character signature triggers with their `weaponId` for run stats
*(QoL — already partially done; complete coverage so post-run breakdown shows how much damage came from shield vs banner vs base weapons. Helps players see WHY their build is winning, which informs build choice.)*

---

## 5. What Deliberately Stays the Same

- **No character rebalancing.** NeoByte / CodeBreaker / Pandypaws kits stay as-is. Owner confirmed this is too much work.
- **Nukes stay as RNG pickups.** Owner confirmed — don't redesign into a tactical button.
- **No weapon damage / area / level scaling changes** to anything but pushback-weapon CD floors.
- **No Cosmic DD parameter changes.** Cosmic's existing parameters (3.5× / 2.5× / +0.30) are unchanged; we only ADD Normal/Hard DD with scaled-down params.
- **No talent / mastery / relic changes.** These layers are well-tuned per the layer audit.
- **No synergy / evolution rules changes.** The 14 paths are well-designed; vineWhip's centrality is a feature.
- **No Inner Galaxy mob HP changes.** Inner Galaxy clears are fine; nerfing them would hurt new players.

---

## 6. Why This Lands Differently Than v1/v2

- v1: designed against assumed mechanics. Was wrong about almost everything.
- v2: read combat code, designed a surgical fix to shield + nuke + OG HP. Correct, but incomplete — didn't account for the character-design side.
- v3: read everything. Confirms v2's surgical fixes are right AS FAR AS THEY GO, plus:
  - **DD → Score reward** as the *positive incentive*. v2 only nerfed; v3 also rewards.
  - **DD extended to Normal and Hard** with scaled parameters so the score reward isn't Cosmic-locked.
  - **Acknowledges 5/10 characters were designed around AFK mechanics.** Owner has accepted this trade-off — a surgical nerf won't fully kill the AFK meta because the character kits still passively support it. S7 ships the brake + carrot; if Build A2 emerges in 2-3 weeks, we look at it then.

---

## 7. Decisions (answered by owner, 2026-06-07)

1. **Character kit rework — off the table.** Too much work. S7 is shield + nuke + OG HP + DD reward only.
2. **DD score reward — must work on Normal/Hard too.** Cosmic params are too brutal for lower difficulties → scaled DD params per difficulty (see 4g).
3. **Nukes stay as RNG pickups.** No tactical-button redesign.
4. **OG HP cut approved for S7.** Confirmed too brutal for non-shield/aegis weapons at current curve. Ships in S7 patch.
5. **burningBarrier inherits the lifted CD floor.** Pushback-weapon class gets the floor, not per-weapon tuning. Future pushback weapons auto-inherit by adding to the `PUSHBACK_WEAPONS` set (see 4a).

---

## 8. Cross-references

- Full weapon catalog by damage model: [`S7_WEAPON_AUDIT.md`](./S7_WEAPON_AUDIT.md)
- Character kits + AFK affinity table: [`S7_CHARACTER_AUDIT.md`](./S7_CHARACTER_AUDIT.md)
- Multiplicative stacking layers + caps: [`S7_LAYER_AUDIT.md`](./S7_LAYER_AUDIT.md)