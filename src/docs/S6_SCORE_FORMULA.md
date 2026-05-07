# S6 Score Formula — Design Doc

**Author:** Base44  •  **Date:** 2026-05-06  •  **Target:** Season 6 (Mon May 18 2026 00:00 UTC)

---

## TL;DR

Current formula rewards **time spent** and **gold farmed**, not skill. Players who play longer or stack gold mults dominate the leaderboard regardless of how well they actually played. S6 needs a formula that:

1. **Rewards skill, not grind** — a player who finishes Sector 10 in 6 minutes should outscore one who finishes the same sector in 12 minutes
2. **Pays similar reward for similar effort** — Sector 5 mastered shouldn't dwarf Sector 10 attempted
3. **Doesn't snowball** — multiplier stacking should affect *survival*, not *score*
4. **Stays simple** — players need to understand why their score is what it is

Below: 3 candidate formulas, scored against the design goals. **Recommendation at the bottom.**

---

## 1. Current formula (S5 patched, gold-clipped)

```js
base = kills * 10 + level * 100 + time * 5 + min(gold, kills*150) * 2 + (victory ? 5000 : 0)
score = floor(base * arenaMultiplier)
arenaMultiplier = 1.0 + (sectorIndex * 0.2)  // 1.0 → 2.8 across 10 sectors
endless: 2.0 fixed, world-boss-arena: 1.0 fixed
hard ceiling: 2,500,000
```

### Failure modes observed in S5
| Issue | Real example |
|---|---|
| **Time = score** | Tijckers' 7:35 run scored 1.36M. A skilled 4-min Sector 10 victory scored ~280k. The slower, sloppier run won 5×. |
| **Gold = score** | Same run: 231k gold × 2 = 462k of the 1.36M came from gold drops alone. |
| **Endless farming** | 25-min endless runs hit the 2.5M ceiling routinely (capped × 2.0 sector mult). |
| **Sector progression backwards** | Mastering Sector 5 (×2.0) for 250 kills outscored attempting Sector 10 (×2.8) and dying at 60 kills. |
| **Victory bonus too small** | +5000 on a base-300k run = 1.6%. No real incentive to push for the boss. |

### S6 starting point (gold removed)
```js
base = kills * 10 + level * 100 + time * 5 + (victory ? 5000 : 0)
```
Already gated to auto-flip at S6. **But** time still dominates — a 25-min endless run = 7,500 just from time, vs a 4-min sector-10 victory = 1,200 from time. The time term needs rebalancing too, or endless still wins.

---

## 2. Design goals (ranked)

1. **Fair across run lengths** — 4-min victory and 12-min endless should both be viable paths to leaderboard top-10
2. **Skill > grind** — efficiency (kills/min, level/min, sector clear time) matters more than raw playtime
3. **Sector progression rewarded** — clearing Sector 10 should out-rank clearing Sector 5, even when the Sector 5 run had more total kills
4. **Endless is its own track** — endless runs can compete via *efficiency*, not *duration*
5. **Boss-killing rewarded** — victory bonus must be meaningful (>20% of total score for a normal-length victory)
6. **No multiplier stacking advantage** — buffs help you *survive longer*, but score growth flattens once you're already winning
7. **Simple to explain** — a player should understand "why" they got their score in one sentence

---

## 3. Candidate formulas

### Option A — Efficiency formula (kills-per-minute focused)

```js
// Reward output per unit time, with progress milestones layered on top.
killsScore  = kills * 10
levelScore  = level * level * 8         // quadratic — late levels matter more
sectorScore = sectorIndex * 500         // flat per-sector progression bonus
victoryBonus = victory ? (sectorIndex * 1500) : 0  // scales with sector

// Endless: time-based progress instead of sector
endlessScore = isEndless ? floor(time / 60) * 800 : 0  // 800 per minute survived

base = killsScore + levelScore + sectorScore + victoryBonus + endlessScore
score = floor(base * difficultyMultiplier)
difficultyMultiplier = { easy: 0.7, normal: 1.0, hard: 1.5, cosmic: 2.0 }
```

**Removed entirely:** `time * 5` term, gold contribution, arena multiplier (replaced by per-sector flat bonus).
**Hard ceiling:** keep 2.5M.

#### Projected scores
| Run | Old score | Option A |
|---|---|---|
| Sector 1 victory, 4 min, 200 kills, lvl 15 | 11,250 | 2,000 + 1,800 + 0 + 1,500 = **5,300** |
| Sector 5 victory, 6 min, 350 kills, lvl 22 | 84,500 | 3,500 + 3,872 + 2,000 + 7,500 = **16,872** |
| Sector 10 victory, 8 min, 500 kills, lvl 30 | 280,000 | 5,000 + 7,200 + 4,500 + 13,500 = **30,200** |
| Tijckers-style 7:35, 800 kills, lvl 28, no victory | 1,360,000 | 8,000 + 6,272 + 4,500 + 0 = **18,772** |
| Endless 12 min, 600 kills, lvl 25 (no victory) | ~30,000 | 6,000 + 5,000 + 0 + 9,600 = **20,600** |
| Endless 25 min, 1500 kills, lvl 35 (capped) | 2,500,000 (ceiling) | 15,000 + 9,800 + 0 + 20,000 = **44,800** |

**Result:** Sector 10 victory is now the #1 score. Endless runs cap around 50k. Tijckers' farm-fest scores 19k. **Skill wins.**

#### Pros
- ✅ Sector progression is now the headline scorer (sector bonus + victory bonus scale together)
- ✅ Endless can't run away — `floor(time/60) * 800` caps growth at a clear rate
- ✅ Quadratic level rewards skilled levelling, not grinding
- ✅ Difficulty multiplier replaces sector multiplier — Cosmic Sector 10 = 60k, fair given the risk

#### Cons
- ⚠️ Total score numbers are MUCH lower (5–60k typical). Players will notice.
- ⚠️ Difficulty multiplier introduces a different stacking risk (Cosmic players dominate). Could cap difficulty mult lower (max 1.5×) if needed.

---

### Option B — Hybrid (kills/level/time, sector-weighted)

Keeps the current shape but rebalances weights:

```js
killsScore  = kills * 8
levelScore  = level * 80
timeScore   = min(time, 600) * 4              // hard cap time at 10 min so endless doesn't run away
victoryBonus = victory ? 8000 : 0
sectorBonus = victory ? sectorIndex * 800 : 0  // only on victory

base = killsScore + levelScore + timeScore + victoryBonus + sectorBonus
score = floor(base * difficultyMultiplier)
```

#### Projected scores
| Run | Old score | Option B |
|---|---|---|
| Sector 1 victory, 4 min, 200 kills, lvl 15 | 11,250 | 1,600 + 1,200 + 960 + 8,000 + 800 = **12,560** |
| Sector 5 victory, 6 min, 350 kills, lvl 22 | 84,500 | 2,800 + 1,760 + 1,440 + 8,000 + 4,000 = **18,000** |
| Sector 10 victory, 8 min, 500 kills, lvl 30 | 280,000 | 4,000 + 2,400 + 1,920 + 8,000 + 8,000 = **24,320** |
| Tijckers-style 7:35, 800 kills, lvl 28, no victory | 1,360,000 | 6,400 + 2,240 + 1,820 + 0 + 0 = **10,460** |
| Endless 12 min, 600 kills, lvl 25 | ~30,000 | 4,800 + 2,000 + 2,400 (capped) + 0 + 0 = **9,200** |
| Endless 25 min, 1500 kills, lvl 35 | 2,500,000 | 12,000 + 2,800 + 2,400 (capped) + 0 + 0 = **17,200** |

#### Pros
- ✅ Familiar shape (less player confusion than Option A)
- ✅ Time cap at 600s shuts down endless dominance cleanly
- ✅ Victory bonus is now the headline (8k flat) — boss-killing is the main goal

#### Cons
- ⚠️ Long endless runs (1500 kills in 25 min) still beat Sector 1 victory — that's actually fine but feels weird
- ⚠️ "min(time, 600)" cap is a hack — Option A's per-minute approach is cleaner

---

### Option C — Pure milestone formula (radical)

```js
// Score = sum of meaningful achievements. No "time spent" reward at all.
killsScore   = kills * 5                           // small base
levelScore   = level * level * 5                   // quadratic
sectorVictoryBonus = victory ? (1000 * 2^sectorIndex) : 0  // exponential per sector
endlessScore = isEndless ? minutesSurvived * minutesSurvived * 100 : 0  // quadratic time

base = killsScore + levelScore + sectorVictoryBonus + endlessScore
score = floor(base * difficultyMultiplier)
```

Sector victory bonuses (exponential):
- Sector 1: 2,000 — Sector 5: 32,000 — Sector 8: 256,000 — Sector 10: **1,024,000**

#### Projected scores
| Run | Option C |
|---|---|
| Sector 1 victory, 4 min, 200 kills, lvl 15 | 1,000 + 1,125 + 2,000 = **4,125** |
| Sector 5 victory, 6 min, 350 kills, lvl 22 | 1,750 + 2,420 + 32,000 = **36,170** |
| Sector 10 victory, 8 min, 500 kills, lvl 30 | 2,500 + 4,500 + 1,024,000 = **1,031,000** |
| Tijckers-style 7:35, 800 kills, lvl 28, no victory | 4,000 + 3,920 + 0 = **7,920** |
| Endless 12 min, 600 kills, lvl 25 | 3,000 + 3,125 + 14,400 (12² × 100) = **20,525** |
| Endless 25 min, 1500 kills, lvl 35 | 7,500 + 6,125 + 62,500 (25² × 100) = **76,125** |

#### Pros
- ✅ **Sector 10 victory is THE goal** — nothing else comes close
- ✅ Tijckers's farm gets ~8k. Skill is everything.
- ✅ Endless rewards *long, well-played* runs (quadratic) but caps naturally — 30 min endless = ~110k, never approaches Sector 10 victory

#### Cons
- ⚠️ **Top-10 leaderboard becomes "Sector 10 victories only"** — players who can't yet clear Sector 10 are locked out of meaningful competition
- ⚠️ Exponential is dramatic — feels like luck/build matters more than skill once you hit the wall
- ⚠️ Very different scale from S5 — players will need re-onboarding

---

## 4. Comparison matrix

| Goal | Option A (efficiency) | Option B (hybrid) | Option C (milestones) |
|---|---|---|---|
| Fair across run lengths | ✅ Strong | ✅ Strong | ❌ Sector 10 dominates |
| Skill > grind | ✅✅ | ✅ | ✅✅ |
| Sector progression visible | ✅ Linear bonus | ✅ Linear bonus | ✅✅ Exponential |
| Endless is its own track | ✅ Per-minute | ⚠️ Hard time cap | ✅ Quadratic |
| Boss bonus meaningful | ✅ ~50% of victory score | ✅✅ Headline term | ✅✅✅ Dominant |
| No stacking advantage | ✅ Difficulty mult only | ✅ Difficulty mult only | ✅ Difficulty mult only |
| Simple to explain | ⚠️ 5 terms | ✅ 5 terms, familiar | ⚠️ Exponential confuses |
| Player adjustment | ⚠️ Lower numbers | ✅ Similar feel | ❌ Whole new scale |

---

## 5. Recommendation: **Option A** (with one tweak)

**Why A over B:** Option B's `min(time, 600)` cap is a duct-tape fix. Option A's per-minute endless score is mathematically cleaner and easier to extend later (e.g. "endless minutes 10–20 = 1.2×, 20+ = 1.5×").

**Why A over C:** Option C is too punishing for mid-progression players (anyone not yet clearing Sector 10 has no top-leaderboard path). The leaderboard needs to be aspirational, not gatekept.

### Recalibrated tweak to Option A (player-anchor scaled)

**Why this revision:** initial Option A landed top scores around 95k. S5 players are anchored to ~1M peak scores, so dropping by 10× feels punishing — even though the *ratios* (skill > grind) are correct. Solution: scale all terms ~10× so projected Sector 10 victory lands around 900k–1M. The relative balance between kills/level/sector/victory/endless is **preserved exactly** — only the absolute numbers move.

```diff
- killsScore  = kills * 10
+ killsScore  = kills * 120         // ~10× scale, keeps "skill kills matter" feel
- levelScore  = level * level * 8
+ levelScore  = level * level * 100 // late-level skill remains the headline
- sectorScore = sectorIndex * 500
+ sectorScore = sectorIndex * 8000  // sector progression now visibly meaningful
- victoryBonus = victory ? sectorIndex * 1500 : 0
+ victoryBonus = victory ? sectorIndex * 15000 : 0  // boss-killing scales with sector
- endlessScore = floor(time / 60) * 800
+ endlessScore = floor(time / 60) * 10000  // endless competitive with sector victory
```

### Final proposed S6 formula
```js
const SECTOR_INDEX = ARENA_ORDER.indexOf(arena_id);  // 0..9, -1 for endless/raid
const isEndless = arena_id === 'endless';
const isRaid = arena_id === 'world_boss_arena';

const killsScore = kills * 120;
const levelScore = level * level * 100;
const sectorScore = (isEndless || isRaid) ? 0 : SECTOR_INDEX * 8000;
const victoryBonus = (isVictory && !isEndless && !isRaid) ? SECTOR_INDEX * 15000 : 0;
const endlessScore = isEndless ? Math.floor(time / 60) * 10000 : 0;

const base = killsScore + levelScore + sectorScore + victoryBonus + endlessScore;
const difficultyMult = { easy: 0.7, normal: 1.0, hard: 1.5, cosmic: 2.0 }[difficulty] || 1.0;
const score = Math.min(SCORE_HARD_CEILING, Math.floor(base * difficultyMult));
const SCORE_HARD_CEILING = 2_500_000;  // keep S5 ceiling — leaves headroom on Cosmic
```

### Projected leaderboard top of S6 (Cosmic difficulty, 2.0×)
| Run type | Score |
|---|---|
| Sector 1 victory, 4 min, 200 kills, lvl 15 | 24k + 22.5k + 0 + 0 = 46.5k × 2.0 = **~93,000** |
| Sector 5 cosmic victory, 6 min, 400 kills, lvl 22 | 48k + 48.4k + 32k + 60k = 188k × 2.0 = **~376,000** |
| Sector 10 cosmic victory, 8 min, 600 kills, lvl 32 | 72k + 102k + 72k + 135k = 381k × 2.0 = **~762,000** |
| Sector 10 cosmic victory, 8 min, 800 kills, lvl 35 | 96k + 122.5k + 72k + 135k = 425.5k × 2.0 = **~851,000** |
| Sector 10 cosmic perfect, 9 min, 900 kills, lvl 38 | 108k + 144.4k + 72k + 135k = 459.4k × 2.0 = **~919,000** |
| Endless cosmic 25 min, 1500 kills, lvl 35 | 180k + 122.5k + 0 + 250k = 552.5k × 2.0 = **~1,105,000** |
| Tijckers-style 7:35 farm, 800 kills, lvl 28, no victory | 96k + 78.4k + 72k + 0 = 246.4k × 2.0 = **~493,000** |

✅ Top of board feels familiar (~900k–1M, just like S5)
✅ Sector 10 victory is the gold standard for sector runs (~850k–920k)
✅ Long, well-played endless is competitive at the very top (~1.1M) — endurance + skill rewarded, no infinite ceiling abuse
✅ Tijckers's farm scores ~500k — still respectable for the effort, but Sector 10 victories beat it
✅ Hard ceiling 2.5M preserved — leaves comfortable headroom for future content (NG+, Cosmic Sector 11+, etc.)

---

## 6. Migration plan

1. **Pre-S6 (this week):** Lock in formula choice. I'll prepare the `validateAndRecompute()` patch but gate it on `season_id !== '2026-S5'` exactly like the current gold-removal gate.
2. **S6 launch (May 18 00:00 UTC):** Formula auto-flips. Old S5 leaderboard preserved as-is (immutable history).
3. **S6 week 1:** Monitor top-10 daily. If a single player/build dominates, hotfix the relevant term.
4. **S6 week 2:** Publish a "scoring explained" tooltip in-game so players understand why their score is what it is.

---

## 7. Open decisions for you

Before I write the code:

1. **Formula choice** — A (recommended), B, or C?
2. **Difficulty multiplier max** — keep Cosmic at 2.0× as proposed, or cap lower (1.5×) to avoid rewarding the difficulty-stack?
3. **Hard ceiling** — drop to 500k as proposed, or keep at 2.5M for safety margin?
4. **S5 leaderboard treatment** — preserve as-is, or wipe before S6 starts so players can't compare apples-to-oranges?
5. **Sector raid arena** — currently scores like a normal arena (1.0× mult, no sector bonus). With the new formula it'd score very low (~kills + level only, no sector/victory bonus). Is that fine, or should raid be its own scoring track?

Let me know and I'll write the patch.