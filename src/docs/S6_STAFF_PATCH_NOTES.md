# Season 6 — Staff Patch Notes (Detailed)

**Author:** Base44  •  **Date:** 2026-05-09  •  **Target launch:** Mon May 25 2026 00:00 UTC

> ⚠️ Staff-only document. This is the engineering-detail companion to `S6_PATCH_NOTES.md` (the player-facing Discord pack). Use this for moderator briefings, in-Discord staff Q&A, and customer-support context. Don't paste verbatim to public channels.

---

## 0. Quick-glance summary

| Area | What changed | Risk | Reversible? |
|---|---|---|---|
| Score formula | Gold removed, sector progression weighted, endless capped per-minute | Low — gated `season_id !== '2026-S5'` | ✅ Per-row rerun via admin |
| Cap removal | All endless gold/kill/fragment caps stripped server-side | Medium — anti-economy net relies on L1+L3+L9 | ✅ Re-add caps in `saveScore.js` if needed |
| Multiplier rebalance | Talent stack 0.66×, NFT additive, Cosmic 2× | Low — gated S6+ in engine | ✅ Engine flag `_isS6` |
| Weapon slot cap | 6-weapon hard cap (S6+) | Low — only blocks NEW pickups, levels still work | ✅ Constant in `UpgradeSystem.js` |
| Evolution gating | Base weapon must be ≥ Lvl 8 (S6+) | Low | ✅ Constant in `UpgradeSystem.js` |
| Weapon rarity scaling | Common +1 / Rare +2 / Epic +3 / Legendary +5 | Low — only affects S6 picks | ✅ Engine flag `_isS6` |
| Pool autobalance | Soft 0.6× / 1.6× nudge (no override of player bias) | Low | ✅ Engine flag `_isS6` |
| Overcharge fillers | Replaces single +25HP repeat once pool is exhausted | Low | ✅ Engine flag `_isS6` |
| Astral Lab | New gold-only RNG buff sink (caps stat bonuses) | Medium — buffs fold into player.* before clamps | ✅ Server `forgeAction` — toggle off at `IS_S6` flag |
| Prestige Relics | L5+ paid prestige, +5%/tier, max +25% | Low — additive multipliers, hard-capped at PL5 | ✅ Server `prestigeRelic` |
| Squad Treasury | Donation pool + 4-tier weekly buffs | Low — buffs reset weekly automatically | ✅ Server `squadActions.donateTreasury` |
| Endless time-decay (L9) | Gold drops decay 1.0×→0.25× past 10 min | Medium — replaces hard ceiling | ✅ `PickupSystem.js` — `_IS_S6` flag |
| Structural safety clamps | Damage 6× / gold 8× / area 4× / xp 5× / cd ≥ 0.35 ceilings | Low — defensive, never trips legit S5 builds | ✅ `GameEngine.js` — `_isS6` block |
| Endless XP trickle cap | Halts past Lvl 50, excludes session buffs | Low | ✅ `GameEngine.js` — `_isS6` block |
| S6 Welcome Modal | 7-step in-game tour, shown once | None | ✅ Player flag `s6WelcomeSeen` |
| Hall of Fame snapshot | Admin tool — archives top-50 S5 runs to `LegendaryRun` | None — read-only of S5 data | ✅ Idempotent re-run |
| Treasury seeding | 1000g pre-seed for active squads at launch | None — additive only | ✅ Idempotent re-run |

All gameplay changes auto-flip on the W20→W21 boundary. **No code redeploy required at midnight UTC.**

---

## 1. Score formula — the big one

### What changed
Replaced the S5 mid-patch formula:
```
base = kills*10 + level*100 + time*5 + min(gold, kills*150)*2 + (victory ? 5000 : 0)
score = floor(base * arenaMultiplier)   // 1.0 → 2.8
```

With (S6+):
```
killsScore   = kills * 120
levelScore   = level * level * 100
sectorScore  = (isEndless || isRaid) ? 0 : sectorIndex * 8000
victoryBonus = (isVictory && !endless && !raid) ? sectorIndex * 15000 : 0
endlessScore = isEndless ? floor(time / 60) * 10000 : 0
score = floor((killsScore + levelScore + sectorScore + victoryBonus + endlessScore) * difficultyMult)
```

`SCORE_HARD_CEILING = 2.5M` preserved as the last-line backstop.

### Player-perceived numbers (Cosmic 2.0×)

| Run | Old score | S6 score | Delta |
|---|---|---|---|
| Sector 1 victory, 4 min, 200 kills, lvl 15 | 11k | ~93k | **8.4×** ✅ |
| Sector 5 victory, 6 min, 350 kills, lvl 22 | 84k | ~376k | **4.5×** ✅ |
| Sector 10 victory, 8 min, 500 kills, lvl 30 | 280k | ~762k | **2.7×** ✅ |
| Tijckers-style 7:35 farm, 800 kills, lvl 28, no victory | 1.36M | ~493k | **0.36×** ⚠️ intentional |
| Endless 25 min, 1500 kills, lvl 35 | 2.5M (capped) | ~1.1M | **0.44×** ⚠️ intentional |

### Why the down-arrows are intentional
Tijckers' run scored 1.36M with no boss kill — pure gold + time farming. Under S6 the same gameplay scores ~493k. A skilled Sector 10 victory now scores ~762k. **Skill > grind.**

### Support script for "my score went down"
> "Season 6 reset the leaderboard with a new scoring system. Your gameplay didn't change — the formula did. The new formula rewards reaching deeper sectors and beating the bosses there, instead of just running long. A clean Sector 10 victory now scores higher than any farm run. Your S5 high score is preserved in the Hall of Fame."

### Files touched
- `functions/saveScore.js` — `validateAndRecompute()`, gated by `runSeasonId !== '2026-S5'`
- `pages/Game.js` — HUD live-score mirror (matches server formula)

---

## 2. Cap removal

### Removed (S6+ only)
- `MAX_GOLD_BASELINE + kills × 2k` (sector run cap) — false positives on legit Synthbeats whales
- `MAX_FRAGMENTS_PER_SEC = 0.2` — conflicted with NFT bonus + lucky drops
- `ENDLESS_FRAGMENTS_CAP_PER_RUN = 30` — felt arbitrary, blocked legit endurance
- `ENDLESS_GOLD_HARD_CEILING = 10,000` — biggest source of "GOLD CAPPED" confusion
- `ENDLESS_KILLS_HARD_CEILING = 6,000` — display-only but confusing
- `ARENA_DURATIONS` per-arena clamp on `time_survived`
- `goldScoreCap = kills × 200` — irrelevant since gold dropped from formula
- All `endlessGoldCapped` / `endlessKillsCapped` / `fragmentsCapped` HUD warnings

### Kept (sanity / anti-tamper)
- `MAX_KILLS_PER_SEC = 200` — physically impossible for a human
- `MAX_LEVEL = 500` — anti-tamper
- `MAX_TIME_SEC = 7200` (2 hours, raised from 1) — covers any legit endless
- `MIN_TIME_SEC = 1` — sanity
- `SCORE_HARD_CEILING = 2,500,000` — last-line backstop
- Negative-value rejection on score / kills / gold / fragments

### Why this is safe now
1. **RLS already locks `RunScore.create` to admin-only.** Caps weren't blocking client tampering — they were clipping legit output.
2. **Score formula is the new cap.** A whale with 4× gold still scores the same as a normal player on identical kills/level/sector.
3. **L9 endless time-decay (§3) replaces the hard ceiling** — gold flow naturally tapers.
4. **L1+L2+L3 multiplier rebalance (§4) cuts the faucet at the source** (×38 → ×19 peak Synthbeats stack).

### Support script for "where did my gold go?"
> "Endless gold now decays gradually past 10 minutes instead of stopping at the old 10,000 cap. Short endless runs feel about the same; long runs accumulate slower than before. The hard 'GOLD CAPPED' warning is gone — what you see in the HUD is what gets credited."

---

## 3. L9 — Endless time-decay curve

```js
// PickupSystem.js — S6+ only
let timeFactor = 1.0;
if (_IS_S6 && engine.arena?.duration === Infinity) {
    const t = engine.time || 0;
    if (t > 600) {
        timeFactor = Math.max(0.25, 1.0 - (t - 600) / 1800);
    }
}
```

| Endless time | Multiplier | Notes |
|---|---|---|
| 0–10 min | 1.0× | Honeymoon — full value |
| 15 min | 0.83× | Light decay starts |
| 25 min | 0.50× | Half value |
| 40+ min | 0.25× | Floor — slow but never zero |

Sector runs unaffected (no `engine.arena.duration === Infinity`).

---

## 4. Multiplier rebalance (L1, L2, L3)

### L1 — Talent 0.66× stack factor
Weekly + seasonal talents now scale at 0.66× when stacking on top of permanent. Permanent stays at 1.0×. Set-style dedup behaviour preserved.

```js
// GameEngine.js
const TALENT_STACK_FACTOR = this._isS6 ? 0.66 : 1.0;
```

**Effect:** Synthbeats triple-stack gold-talent contribution drops from +90% → +60%.

### L2 — NFT gold mult additive
NFT gold multiplier (`save.nftGoldMultiplier`) now folds into `player.goldMult` additively at engine init instead of multiplying at pickup time.

```js
goldMult: ... + (this._isS6 ? Math.max(0, (save.nftGoldMultiplier || 1) - 1) : 0)
```

PickupSystem skips the pickup-time multiplicative bonus on S6+ to match.

**Effect:** Cosmic ×3 + NFT ×1.5 was effectively ×4.5 multiplicative. Now it's ×3.5 additive (after L3 also drops Cosmic to 2.0×). Net Cosmic+NFT = ×2.5 effective.

### L3 — Cosmic 3× → 2×
```js
if (this._isS6 && this.difficulty.id === 'cosmic') {
    this.difficulty.goldMult = 2.0;
    this.difficulty.xpMult = 2.0;
}
```

Enemy HP/damage (2.5×) untouched — Cosmic stays the hardest mode, just stops being the gold meta.

### Combined effect (Synthbeats Cosmic peak)
- S5: ~×38 effective gold mult
- S6 with L1+L2+L3: ~×19 effective
- Roughly half the gold faucet.

---

## 5. Structural safety clamps (Fix A & Fix B)

Late additions (2026-05-09) after Hugo flagged that uncapped Overcharge fillers could blow past the engine's per-level growth caps. The level-up code's `Math.min(2000, hp)` etc only applies during levelUp() — upgrade picks bypass it.

### Fix A — Final ceilings on engine init (S6+)
```js
this.player.damageMult   = Math.min(6.0, this.player.damageMult);
this.player.goldMult     = Math.min(8.0, this.player.goldMult);
this.player.areaMult     = Math.min(4.0, this.player.areaMult);
this.player.xpMult       = Math.min(5.0, this.player.xpMult);
this.player.cooldownMult = Math.max(0.35, this.player.cooldownMult);
```

Catches: late-run Overcharge stacking, uncapped Astral Lab pulls, future multiplier sources.

### Fix B — Endless XP trickle adjustments (S6+)
- Trickle now uses **no-buff baseline** (skips the 1.5× session buff) — prevents 1hr endless + +50% XP buff from spamming Overcharge picks
- Trickle **halts past Level 50** — no more 90-min AFK level grinds for Overcharge stacking
- Kill XP still benefits from session buff normally

```js
if (this._isS6 && this.level >= 50) {
    // skip — endless AFK ceiling
} else {
    const trickleMult = this._isS6 ? this._xpMultBase : this.player.xpMult;
    const trickle = (this.xpRequired / 180) * dt * trickleMult;
    this.xp += trickle;
}
```

S5 unchanged — legacy whales keep their existing behaviour.

---

## 6. Weapon system overhaul

### 6-weapon slot cap (S6+)
```js
export const WEAPON_SLOT_CAP = 6;
```

Once at the cap, the level-up pool only offers level-ups for weapons already owned. Synergies (2→1) free up slots. Evolutions are in-place. Players holding 7+ weapons from S5 are grandfathered (they keep them but can't add more).

UI: prominent indicator in `LevelUpModal` showing `Weapons: N/6` with amber "Slots Full" tag at cap.

### Evolution Lvl 8 gate (S6+)
```js
export const EVOLUTION_MIN_BASE_LEVEL = 8;
```

Evolutions now require the base weapon at level 8 before they fire. Without this, picking the matching passive at level 1 silently evolved the weapon — felt accidental, not earned. Genre standard (VS / Halls of Torment).

UI: `LevelUpModal` shows "🌟 EVOLVES" badge only when the projected post-pick level meets the threshold.

### Weapon rarity tiers (S6+)
```js
{ name: 'Common',    weaponLevels: 1 },   // S5: 1
{ name: 'Rare',      weaponLevels: 2 },   // S5: 1 (was 1.5 truncated to 1)
{ name: 'Epic',      weaponLevels: 3 },   // S5: 2
{ name: 'Legendary', weaponLevels: 5 },   // S5: 3
```

S5 had Rare = 1.5 → truncated to 1 (identical to Common) and Legendary felt barely different from Epic. Now rarity actually matters — a Legendary pick gets you halfway to weapon mastery in one choice.

---

## 7. Pool bias system

### Autobalance multiplier (S6+, silent)
Soft-corrects the level-up pool toward a balanced loadout:
- ≥4 weapons + ≤2 passives → weapons 0.6×, passives 1.6×
- ≤2 weapons + ≥3 passives → weapons 1.4×, passives 1.0×
- otherwise → 1.0×

Layered ON TOP of player-allocated bias (which can dominate at 5–10× for dedicated builds). This is a quality-of-life floor for the 80% of players who don't engage with bias allocation. **Evolutions are exempt** — they're rare game-changing picks that shouldn't be penalised.

### Pool Bias badge in LevelUpModal
Shows top 2 allocated bias targets with their +% boost. Self-hides when no bias is allocated. Reassures players that their paid OMENX/gold respec is "actually doing something" mid-run.

### Free respec (one-time)
All players get one free Pool Bias respec via the `freeBiasRespecUsed` flag on save. Granted in compensation for the preset rework + diminishing-returns disclosure.

---

## 8. Overcharge fillers (replaces "+25 HP" repeat)

Once the upgrade pool is exhausted (max passives + all weapons owned + banished), S5 spammed a single +25 HP option for hundreds of late-game picks. S6 replaces this with a rotating set of **uncapped** stat boosters:

```js
const OVERCHARGE_FILLERS = [
    { id: 'oc_dmg',   value: 0.03 },  // +3% Damage
    { id: 'oc_armor', value: 1 },     // +1 Armor
    { id: 'oc_hp',    value: 30 },    // +30 Max HP
    { id: 'oc_cd',    value: -0.02 }, // -2% Cooldown
    { id: 'oc_gold',  value: 0.05 },  // +5% Gold
    { id: 'oc_luck',  value: 1 },     // +1 Luck
];
```

- IDs prefixed `oc_*` so `applyUpgrade()` knows to bypass the 5-stack cap.
- Rarity-scaled (Common 1×, Rare 1.5×, Epic 2×, Legendary 3×).
- **Fix A clamps** (§5) prevent these from blowing past damage 6× / gold 8× / area 4×.

S5 keeps the legacy single-option behaviour.

---

## 9. New gold sinks

### 9a. Astral Lab (replaces Mystery Forge concept)
Server-authoritative gold-only RNG pulls (`forgeAction`). Each pull grants a small permanent stat buff at random:

| Stat | Per pull | Cap |
|---|---|---|
| Damage / Area / Proj Speed | +2% | +20% |
| Cooldown | -1% | -10% |
| Move Speed | +1% | +10% |
| HP Regen / Magnet / Max HP | flat | per-stat |

Cost curve: **20k gold first pull, +40% each subsequent** (20k → 28k → 39k → 55k → 77k → 108k…). Already-capped stats are skipped. Bonuses fold into `talentBonus` at engine init so the existing player.* clamps (Fix A) still apply.

### 9b. Prestige Relics
L5 relics can prestige PL1→PL5. Each tier costs **1.5M gold + 100 fragments**, adds +5% to the relic's effect (max +25% at PL5).

Drains the dead-fragment piles (300–600+) that L5-relic players were sitting on with nothing to spend them on.

### 9c. Squad Treasury
Members donate gold → leaders/officers spend on weekly buffs:

| Tier | Cost | Buff (next war + run gold) |
|---|---|---|
| Bronze | 25k | +5% squad XP |
| Silver | 100k | +10% XP, +5% gold |
| Gold | 500k | +20% XP, +10% gold, +3% boss damage |
| Platinum | 2M | +30% XP, +15% gold, +8% boss damage |

Buffs reset weekly. Donations made in week N apply to week N+1.

### Pre-launch treasury seed
Admin-only `seedSquadTreasuries` function — gives every existing squad with 0 treasury **1000g** at launch so they can immediately try Bronze tier. Without this, week 1 of S6 would feel dead until donations accumulate.

**Run before May 25:** Admin Dashboard → Live Ops → Maintenance → S6 Launch Tools → "Seed Squad Treasuries".

---

## 10. S5 Hall of Fame archive

Admin-only `snapshotSeasonHallOfFame` function — archives top 50 RunScores for a given season into a permanent `LegendaryRun` entity.

**Run before May 25:** Admin Dashboard → Live Ops → Maintenance → S6 Launch Tools → "Snapshot Season Hall of Fame" → seasonId `2026-S5`.

Idempotent — re-runs replace existing rows for the same season.

The archive is preserved indefinitely. We don't delete S5 RunScores either (they just stop showing in the leaderboard once the season filter rolls over), but the archive gives us a clean "Legendary Runs" page we can build later without depending on `RunScore` queries.

---

## 11. S6 Welcome Modal

`components/onboarding/S6WelcomeModal.jsx` — 7-step in-game tour, fires once per player on/after S6:

1. Welcome — what stays, what resets
2. New score formula — sector progression > grind
3. Weapon slot cap + Evolution Lvl 8 gate
4. Rarity scaling (Common +1 / Rare +2 / Epic +3 / Legendary +5)
5. Pool Bias + free respec
6. New gold sinks (Astral Lab / Prestige / Treasury)
7. Good luck

Persisted via `s6WelcomeSeen` flag on save. Independent from the original `WelcomeModal` (`welcomeSeen`) so first-time players still get the new-player tour first, then this one (3s delay between).

Replay path: dispatch `replayS6Tour` window event (planned: Profile page button, post-launch).

---

## 12. Player communication checklist

### What players should already know (from in-game tour + Discord)
- Score formula changed
- Weapon slots capped at 6
- Evolutions need Lvl 8 base
- Cosmic difficulty pays less gold (2× not 3×)
- Endless gold decays past 10 min instead of hard-capping
- New gold sinks: Astral Lab, Prestige Relics, Squad Treasury

### Common support questions + scripts

**"My score is lower than S5"** → §1 support script.

**"Why won't my weapon evolve?"** → "Season 6 changed evolutions: the base weapon needs to reach level 8 before the evolution can trigger. Look for the orange '🌟 EVOLVES' badge on the level-up screen — that tells you when an evolution is one pick away."

**"I keep getting offered passives, no new weapons"** → "If you're already carrying 6 weapons, the level-up pool only shows upgrades to weapons you have. That's the new slot cap. Synergies (combining two weapons into one) free up a slot."

**"I lost my gold"** → "Gold is preserved — nothing is wiped. Endless gold now decays past 10 minutes instead of being hard-capped at 10,000. Check your gold counter in the HUD vs the run summary at the end — they match now."

**"My talents feel weaker"** → "Weekly and seasonal talent contributions now scale at 0.66× when stacking on permanent talents. Permanent talents are unchanged. This was a balance pass to flatten extreme multi-stacking — average builds are barely affected, only the triple-max stack is curbed."

**"What about my S5 leaderboard rank?"** → "Preserved in the Hall of Fame archive. The S6 leaderboard starts fresh."

---

## 13. Rollover-day playbook

```
Sun May 24 23:00 UTC — Maintenance flip SOFT
  Banner: "Season 6 rolls out in ~1 hour. Finish your run."

Sun May 24 23:30 UTC — Run admin S6 Launch Tools:
  ☐ Snapshot Season Hall of Fame (seasonId = 2026-S5)
  ☐ Seed Squad Treasuries (amount = 1000)
  ☐ Verify both logged to AdminChangesLog

Sun May 24 23:40 UTC — Maintenance flip HARD
  Banner: "Season 6 rollover in progress. Back online shortly."
  /game route blocked; squads/chat/profile still accessible.

Mon May 25 00:00 UTC — Period rollover automatically triggers:
  - week_id flips to 2026-W22
  - season_id flips to 2026-S6
  - All gameplay code's _isS6 checks flip to true
  - Welcome modal starts appearing on next /hub load

Mon May 25 00:05 UTC — Verify:
  ☐ Manually run a Sector 1 + Endless run, confirm score formula
  ☐ Check LevelUpModal shows weapon slot indicator
  ☐ Pick a Rare weapon — verify +2 levels
  ☐ Try evolution before Lvl 8 — confirm it doesn't fire
  ☐ Spawn a 25-min endless test, confirm gold-decay visible

Mon May 25 ~00:15 UTC — Maintenance flip OFF
  S5 → S6 transition complete.
```

### Hotfix levers (no redeploy needed)
- **Score formula too generous** → admin can tweak `validateAndRecompute()` and redeploy `saveScore.js` only. Existing runs are not retroactively rescored.
- **Sink absorbing too much gold** → adjust prices in `IN_GAME_SKUS` / `prestigeRelic` / `squadActions` and redeploy.
- **Gold decay too aggressive** → bump `Math.max(0.25, ...)` floor in `PickupSystem.js`.

### Hotfix levers (need redeploy)
- **L1/L2/L3 numbers** are constants in `GameEngine.js`. Need a redeploy but no schema change.
- **WEAPON_SLOT_CAP** is a constant export in `UpgradeSystem.js`.
- **EVOLUTION_MIN_BASE_LEVEL** ditto.

---

## 14. Monitoring (first 2 weeks)

Daily checks via Admin Dashboard:

| Metric | Healthy | Concerning |
|---|---|---|
| Top 10 leaderboard composition | Mixed characters/builds | One char/build is 7+ of 10 |
| Average gold/run by character | Synthbeats ≤ 1.3× median | Synthbeats > 2× median |
| Sink throughput (Astral Lab vs Prestige vs Treasury) | Roughly balanced | Lottery >50% of all gold spend |
| Endless run length distribution | Bell curve 8–15 min | Bimodal at 30+ min (AFK abuse) |
| `AdminSuspiciousRuns` count | <5/day | >20/day |
| L5 relic prestige adoption | 10–30% of L5 owners by week 2 | 0% (cost too high) or 90% (cost too low) |

If any metric drifts, hotfix the *specific* lever. Don't revert the whole package.

---

## 15. Files changed (engineering reference)

```
Engine / gameplay:
  game/GameEngine.js             — _isS6 flag, talent stack, NFT additive,
                                    Cosmic mult, structural clamps,
                                    XP trickle gates
  game/UpgradeSystem.js          — WEAPON_SLOT_CAP, EVOLUTION_MIN_BASE_LEVEL,
                                    rarity scaling, autobalance multiplier,
                                    Overcharge fillers
  game/PickupSystem.js           — _IS_S6 cache, L9 time-decay, NFT
                                    additive parity, removed endless cap
  game/Constants.js              — (touched only for difficulty multipliers
                                    via runtime override, no static change)

Server:
  functions/saveScore.js         — Option A formula gated by season,
                                    cap removal gated by season
  functions/forgeAction.js       — Astral Lab implementation
  functions/prestigeRelic.js     — Prestige tier management
  functions/squadActions.js      — donateTreasury, applyTreasuryBuff
  functions/snapshotSeasonHallOfFame.js  — admin one-shot
  functions/seedSquadTreasuries.js       — admin one-shot

Entities:
  entities/Squad.json            — treasury_gold, active_buff_tier, etc.
  entities/LegendaryRun.json     — new (Hall of Fame archive)

UI:
  pages/Game.js                  — HUD score mirror matches new formula
  components/game/LevelUpModal   — slot indicator, EVOLVES badge,
                                    PoolBiasBadge integration
  components/game/PoolBiasBadge       — new
  components/loadouts/PoolBiasPanel   — preset rework, free respec UI
  components/game/MysteryForgeCard    — Astral Lab UI
  components/game/RelicPrestigeBadge  — prestige tier display
  components/squads/SquadTreasuryPanel — donation + buff activation UI
  components/onboarding/S6WelcomeModal — new
  components/admin/AdminS6LaunchTools  — new

Library:
  lib/seasonGate.js              — single source of isS6OrLater()
  lib/poolBias.js                — bias math + diminishing-returns helpers
  lib/poolBiasPresets.js         — preset definitions
  lib/astralLab.js               — pull weighting + caps

Docs:
  docs/S6_PATCH_NOTES.md         — public Discord pack
  docs/S6_STAFF_PATCH_NOTES.md   — this doc
  docs/S6_MASTER_PLAN.md         — updated 2026-05-09 (post-launch additions)
  docs/S6_BALANCE_AUDIT.md       — multiplier rebalance analysis
  docs/S6_CAP_REMOVAL.md         — cap removal design
  docs/S6_SCORE_FORMULA.md       — score formula design
```

---

## 16. Decisions / non-goals

### Locked decisions
- **Talent stack 0.66×** — not 0.5 (would feel too punishing on legitimate triple-paths)
- **Cosmic 2×** — not 1.5× (Cosmic must stay rewarding-vs-Hard)
- **Slot cap 6** — industry standard (VS, Brotato, Halls of Torment)
- **Evolution gate Lvl 8** — not 10 (would feel grindy with 6-slot cap)
- **Time-decay floor 0.25×** — not 0× (long runs should still pay something)
- **Treasury seed 1000g** — enough for Bronze (25k) is too much; 1000g is symbolic + nudges donation flow

### Non-goals for S6 launch
- L4 (talent path diminishing) — too many simultaneous variables
- L5 (NeoByte allStats rework) — wait for data
- L6 (relic L5 ceiling rebalance) — already addressed via Prestige
- L7 (Forge augment diminishing) — same as L4
- L8 (per-stat hard caps) — Fix A already covers the worst cases at safer values

### Player-asked features explicitly deferred
- "Replay S6 tour" button on Profile page — wired in code (`replayS6Tour` event), UI TBD post-launch
- Hall of Fame public page — entity exists, page is post-launch work
- Astral Lab "preview next pull" feature — too RNG-revealing, intentionally not built

---

## 17. Quick rollback procedure

If S6 launch goes badly enough that a full revert is required:

1. **Maintenance HARD** immediately
2. Patch `lib/seasonGate.js`:
   ```js
   export function isS6OrLater() { return false; }  // EMERGENCY ROLLBACK
   ```
3. Patch `functions/saveScore.js` line that gates score formula:
   ```js
   const useS6Formula = false;  // EMERGENCY ROLLBACK
   ```
4. Redeploy, flip Maintenance OFF.

This restores S5 behaviour everywhere within ~5 minutes. **Do not try to roll back the period IDs themselves** — week_id / season_id come from UTC date math, you'll fight the date arithmetic.

Player gold + cosmetics + unlocks are untouched by any of this — only the gameplay rules flip.

---

*Last updated 2026-05-09. This doc supersedes any earlier staff briefing on S6 mechanics. Questions → ping @engineering in #base44-internal.*