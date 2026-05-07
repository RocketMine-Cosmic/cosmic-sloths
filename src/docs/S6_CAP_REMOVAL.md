# S6 Cap Removal — Design Doc

**Author:** Base44  •  **Date:** 2026-05-07  •  **Target:** Season 6 (starts Mon May 25 2026 00:00 UTC)

---

## TL;DR

The game currently has **~10 server-side caps** that clamp run stats (gold, kills, fragments, score, gold-per-kill). These caps were patched in over S5 to fix specific exploits, but they cause more pain than they prevent:

1. **HUD ↔ server mismatch** — players see one gold count in-game and a different one credited at run end ("the game stole my gold")
2. **Save sync conflicts** — capped values vs raw values cause `pendingRunSnapshot` recovery to over- or under-credit
3. **Endless-mode confusion** — "GOLD CAPPED" warnings on every run feel punitive even on legit play
4. **Cap math gets stale** — every balance change requires re-tuning all 10 caps in lockstep, and they drift apart
5. **Anti-cheat we don't actually need** — RLS already locks `RunScore.create` to admin-only; only `saveScore` writes leaderboard rows. The caps aren't blocking client tampering, they're just clipping legitimate whales.

S6 is the natural moment to **remove the run-stat caps** and rely on:
- Server-authoritative score formula (Option A from S6_SCORE_FORMULA.md — already gold-free)
- Validation at the *upper bound of plausibility* only (kills/sec, time/level), not per-stat caps
- Multiplier rebalances from S6_BALANCE_AUDIT.md (talents 0.66×, Cosmic 3→2× gold) to address stacking *at the source* instead of clipping the output

This doc surveys every existing cap, proposes which to remove vs keep, and details the cleanup needed in `saveScore`, `Game.jsx`, `UIOverlay`, and `PickupSystem`.

---

## 1. Current cap inventory

### 1a. Hard run-stat caps (saveScore.js)

| Cap | Current value | Purpose | Causes problems? |
|---|---|---|---|
| `MAX_KILLS_PER_SEC` | 200 | Anti-tamper (no human kills 200/sec) | ✅ Keep — pure sanity, never trips legit play |
| `MAX_GOLD_BASELINE + MAX_GOLD_PER_KILL` | 50k + kills × 2k | Anti-tamper for sector runs | ⚠️ Trips legit Synthbeats whales — false positives |
| `MAX_LEVEL` | 500 | Anti-tamper | ✅ Keep — never trips legit play |
| `MAX_TIME_SEC` | 3600 (60 min) | Cap endless run length | ⚠️ Cuts off 60+ min legit endless runs |
| `MIN_TIME_SEC` | 1 | Reject 0-second runs | ✅ Keep — sanity |
| `MAX_FRAGMENTS_PER_SEC` | 0.2 | Anti-tamper for fragments | ⚠️ Conflicts with NFT bonus + lucky drops |
| `ENDLESS_FRAGMENTS_CAP_PER_RUN` | 30 | Cap endless fragment farming | ⚠️ Player-visible — feels arbitrary |
| `ARENA_DURATIONS` clamp | per-arena | Clamp time for sectors with boss tail | ⚠️ Cosmetic — fixes time-padding only |

### 1b. Endless economy caps (the big ones)

| Cap | Current value | Where applied | Player-visible? |
|---|---|---|---|
| `ENDLESS_GOLD_PER_SEC` | 12 g/sec | Ledger (save aggregation) | ✅ "GOLD CAPPED" HUD warning |
| `ENDLESS_GOLD_HARD_CEILING` | 10,000 | Ledger + HUD clamp | ✅ HUD shows ceiling |
| `ENDLESS_GOLD_FLOOR` | 1,000 | Min cap for short runs | Hidden |
| `ENDLESS_KILLS_PER_SEC` | 4 | Ledger | ⚠️ Display only |
| `ENDLESS_KILLS_HARD_CEILING` | 6,000 | Ledger | ⚠️ Display only |
| `ENDLESS_KILLS_FLOOR` | 600 | Min cap | Hidden |

The endless caps are the **biggest source of player confusion** — the HUD shows the cap actively engaging, end-of-run modal shows different numbers than the run had, and `pendingRunSnapshot` recovery adds yet another reconciliation layer.

### 1c. Score-formula caps (relevant for S6)

| Cap | Current value | S5 purpose | S6 relevance |
|---|---|---|---|
| `goldScoreCap` (S5 only) | kills × 200 | Limit gold's score contribution | **Auto-removed** — gold drops from S6 score entirely |
| `SCORE_HARD_CEILING` | 2,500,000 | Backstop against tamper | ✅ Keep — last-line defence |
| `victoryBonus` formula | 15k + sectorIdx × 16k | S5 mid-season hotfix | Replaced by S6 Option A formula |

### 1d. Client-side caps (HUD)

| Cap | File | Line | Mirrors which server cap |
|---|---|---|---|
| Endless gold HUD clamp | `PickupSystem.js` | ~30 | `ENDLESS_GOLD_HARD_CEILING` |
| Endless kills HUD display | `UIOverlay` | ~24 | `ENDLESS_KILLS_HARD_CEILING` |
| Live-score formula | `pages/Game.js` | ~530 | All score caps |

These have to be kept in **manual sync** with the server caps. Drift = HUD lies.

### 1e. Other stat caps in GameEngine (in-engine, not server)

These are growth caps inside the engine itself — different problem domain, but worth listing:

| Cap | Where | Value |
|---|---|---|
| `player.maxHp` ceiling | `levelUp()` | 2000 |
| `player.damageMult` ceiling | `levelUp()` | 5.0 |
| `player.armor` ceiling | `levelUp()` | 30 |
| Weapon level | `applyUpgrade` | 20 |
| Passive level | `applyUpgrade` | 5 |

⚠️ **Out of scope for this doc** — these are gameplay growth limits, not anti-cheat caps. Keep as-is.

---

## 2. Why removing caps is now safe

### 2a. RLS handles the actual anti-cheat
- `RunScore` and `PlayerSave` are both `create: admin-only` and `update: admin-only` (server schema).
- Only `saveScore` (server-role function) can write rows to the leaderboard.
- The caps in `saveScore` aren't preventing client bypass — there's no client bypass to prevent. They're clipping the LEGIT output of the validated run.

### 2b. The run-stat validators stay
We keep these as **plausibility checks** (reject obvious tampering, not clip legit play):
- `MAX_KILLS_PER_SEC = 200` — physically impossible for a human
- `MAX_LEVEL = 500` — well above realistic ceiling (~70 in practice)
- `MAX_TIME_SEC = 7200` (2 hours, raised from 1) — covers any legit endless
- `score < 0`, `kills < 0`, `gold < 0` — basic sanity

These reject tampered runs. They don't clip values.

### 2c. The score formula is now the cap
With S6 Option A (efficiency formula), the **score is structurally bounded** by skill: kills × 120 + level² × 100 + sector + victory + endless. A whale with 4× gold mult earns 4× gold but their **score is the same** as a normal player with the same kills/level/sector. The economic stack still affects gameplay (better survivability) but stops affecting the leaderboard — which is exactly the goal.

### 2d. Multiplier rebalance fixes the source
S6_BALANCE_AUDIT levers (L1: talent 0.66×, L3: Cosmic 3→2× gold) reduce peak stacking from ×38 → ×19. With caps removed AND multipliers rebalanced, the natural ceiling of legit play drops below where the old caps lived. **No need to clip anymore.**

---

## 3. Proposed S6 cap state

### Keep (sanity / anti-tamper)

```js
// saveScore.js — S6
const MAX_KILLS_PER_SEC = 200;        // anti-tamper, never trips legit
const MAX_LEVEL = 500;                 // anti-tamper
const MAX_TIME_SEC = 7200;             // 2 hr — raised from 60 min
const MIN_TIME_SEC = 1;                // sanity
const SCORE_HARD_CEILING = 2_500_000;  // backstop
```

### Remove (the problem children)

```diff
- const MAX_GOLD_BASELINE = 50000;
- const MAX_GOLD_PER_KILL = 2000;
- const MAX_FRAGMENTS_PER_SEC = 0.2;
- const ENDLESS_FRAGMENTS_CAP_PER_RUN = 30;
- const ENDLESS_GOLD_PER_SEC = 12;
- const ENDLESS_GOLD_HARD_CEILING = 10000;
- const ENDLESS_GOLD_FLOOR = 1000;
- const ENDLESS_KILLS_PER_SEC = 4;
- const ENDLESS_KILLS_HARD_CEILING = 6000;
- const ENDLESS_KILLS_FLOOR = 600;
- const ARENA_DURATIONS clamp on time_survived
```

Plus all the `endlessGoldCapped` / `endlessKillsCapped` / `fragmentsCapped` flags returned to the client and the HUD warnings that consume them.

### Replace with: a single soft-validate step

```js
// Lighter-weight plausibility check — rejects only obviously-tampered runs.
// No clipping, no per-stat caps, no endless ceilings. Score formula handles balance.

if (time < MIN_TIME_SEC || time > MAX_TIME_SEC) reject('time');
if (level < 1 || level > MAX_LEVEL) reject('level');
if (kills < 0 || kills > Math.ceil(time * MAX_KILLS_PER_SEC)) reject('kills');
if (gold < 0) reject('gold_negative');
if (fragments < 0) reject('fragments_negative');

// That's it. No upper gold check, no fragment-per-second cap, no endless-mode clamps.
// Score formula caps the leaderboard impact via formula structure (no time-padding,
// no gold contribution, sector-progression weighted).
```

---

## 4. Cleanup required

When you say "ship S6 cap removal", these files change:

### 4a. `functions/saveScore.js`
- Delete cap constants (~15 lines)
- Delete `goldForLedger` / `killsForLedger` / `fragmentsForLedger` branching (~30 lines)
- Delete `endlessGoldCapped` / `endlessKillsCapped` / `fragmentsCapped` flags (~10 lines)
- Delete `ARENA_DURATIONS` clamp (~10 lines)
- Simplify `validateAndRecompute()` to plausibility-only (~50 lines saved)
- Pass raw values directly to `applyRunToSave()` and the response

### 4b. `pages/Game.js`
- Remove `endlessGoldCapped` / `endlessKillsCapped` / `fragmentsCapped` from response handling (~10 lines)
- Remove `killsCapped` / `endlessGoldCapped` from `gameState` (~10 lines)
- Remove the in-HUD endless gold clamp at line ~530 (mirror the server)

### 4c. `components/game/UIOverlay`
- Remove "GOLD CAPPED" / "KILLS CAPPED" warning UI (~20 lines)
- Remove `displayGold` capped-vs-raw branching

### 4d. `game/PickupSystem.js`
- Remove the `if (engine.arena?.duration === Infinity)` gold clamp at run-time (~10 lines)
- Gold counter just keeps climbing during endless — feels great, no surprise at run end

### 4e. `components/game/RunStatsBox`
- Remove "(capped — endless mode)" disclaimer rows
- Remove the bottom-of-modal "endless caps" explainer

### 4f. `lib/runSnapshot.js`
- Stays — but the snapshot now contains raw values that match exactly what saveScore credits. **Recovery becomes lossless.**

**Total cleanup:** ~150 lines deleted across 6 files. Net simplification.

---

## 5. Risks + mitigations

| Risk | Mitigation |
|---|---|
| Endless run abuse — 4-hour AFK sessions | `MAX_TIME_SEC = 7200` (2hr) hard reject. Plus the score formula's `floor(time/60) * endlessRate` term naturally caps endless's leaderboard impact. |
| Fragment farming via NFT bonus | NFT bonus is verified server-side (not client-controlled). Legit ceiling is ~1 frag every 30s × 1.5× NFT = ~120/hour. No exploit pathway. |
| Synthbeats whale earns 500k gold in one run | OK — that's *gameplay economy*, not leaderboard. The score formula doesn't care. They'll have lots of gold to spend; they won't dominate the leaderboard. |
| Score-tamper backdoor | `SCORE_HARD_CEILING = 2.5M` stays. Plus the score is recomputed server-side from validated kills/level/time — client doesn't submit "score". |
| Existing S5 leaderboard with capped runs | Untouched (immutable history). New S6 runs use new formula + uncapped stats from day 1. |

---

## 6. Migration plan

1. **Pre-S6 (this week):** Lock in cap-removal scope. I'll prepare the patch to `saveScore.js` + the 5 client files, gated on `season_id !== '2026-S5'` (same gate as gold-removal).
2. **S6 launch (May 25 00:00 UTC):** Caps auto-flip off. Old S5 runs untouched.
3. **S6 week 1:** Monitor admin dashboard for outlier runs. The score formula is the safety net — if a player posts a 5M score it'll be obvious in `AdminSuspiciousRuns`.
4. **S6 week 2:** Remove the now-dead cap constants entirely (currently they'd still exist in `saveScore.js` even though un-used inside the S6 branch). Final cleanup pass.

---

## 7. Open decisions for you

Before I write the code:

1. **Scope** — full removal as described, or a more conservative "remove endless caps only" first pass?
2. **`MAX_TIME_SEC`** — 2 hours feels right, but if you want truly uncapped endless, we can drop it entirely (just keep `MIN_TIME_SEC`).
3. **HUD warnings** — remove "GOLD CAPPED" entirely, or replace with a softer "live tally" indicator?
4. **Backwards compat** — the `endlessGoldCapped` flag is consumed by `RunStatsBox` and `Game.jsx`. We could leave the response field returning `false` always (defensive) so older clients don't break, OR delete it entirely if we trust browser-cache turnover at S6 launch.
5. **Pair with balance levers** — should L1 (talent 0.66×) + L3 (Cosmic 3→2×) ship in the same patch? They're the multiplier rebalance that makes cap removal safe. Recommendation: ship together.

Let me know and I'll write the patch.