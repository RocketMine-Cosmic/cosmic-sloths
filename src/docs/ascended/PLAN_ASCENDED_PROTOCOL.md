# PLAN — ASCENDED PROTOCOL (fixed-length ranked gauntlet)

Status: **PLANNED — not started**
Target: S9+ (own feature gate, not tied to a season formula change)
Author notes locked in design discussion 2026-07-16.

---

## 1. One-paragraph summary

A weekly ranked game mode where **every pilot plays the exact same maxxed
loadout** — all meta-progression flattened to a fixed template — in a
**fixed-length (15 min) gauntlet** whose enemy ramp never stops climbing.
The map, enemy roster and modifiers **rotate weekly** (same for everyone,
seeded by `week_id`). Score comes **only from what you did** (kills, level,
boss kills) — never from time survived. All OMENX spent inside Ascended runs
feeds a **mode-isolated weekly pool: 80% paid back to the Ascended
leaderboard, 20% dev wallet** — completely separate from the weekly /
seasonal / kill / staff pools.

**The pitch:** pure skill. No grind advantage, no whale advantage, no relic
RNG. Same ship, same battlefield, same 15 minutes. Best pilot wins.

---

## 2. Locked design decisions

| Decision | Choice | Why |
|---|---|---|
| Progression | **Full flatten** — template save, player's real save ignored for run stats | Zero drift, zero "my relic didn't apply" tickets, tune once |
| Relics / NFT / VIP / titles / forge / pool bias | **All OFF** | Level playing field; only cosmetics carry over (visual-only) |
| Run length | **Fixed 15:00 hard cap** (config value, not hard-coded) | Endless invites AFK marathons; fixed cap = bounded server cost, tight anti-cheat, cheap retries |
| Difficulty | **Infinite ramp within the window** (starts steep, ends absurd) | Maxxed template steamrolls any fixed sector tuning; ramp always catches up |
| Time in score | **ZERO** — timer is run length only | S5 `time × 5` lesson: time-scoring rewards passivity and creates clamping bugs |
| Score formula | kills + level² + elite/boss bonus (see §6) | Aggression is the only path up the board |
| Rotation | **Weekly**: arena skin + enemy roster + 1–2 modifiers, seeded by `week_id` | Variety without retuning; same combo for everyone all week |
| Economy | **Isolated pool. 80% players / 20% dev.** In-run spends only | Simple Discord pitch; self-balancing; other pools & caps untouched |
| Revives | Allowed, existing escalation pricing, 1 per run | Spicy decision under a running clock; feeds the pool |
| Entry cost | **Free to enter** (spend happens in-run) | Maximise attempts → healthier pool; barrier-free skill showcase |

---

## 3. The template save ("Ascended Loadout")

Built **server-side** as a synthetic save; the player's real `save_data` is
never read for run stats. One constant object, versioned (`template_v: 1`)
so future rebalances are explicit and auditable on old leaderboards.

Included (maxed):
- All 10 characters unlocked — player picks freely each run
- All base stats at cap (damage, HP, speed, cooldown, area, XP gain, etc.)
- All weapon upgrade levels at cap
- Full talent tree for the chosen character

Explicitly EXCLUDED / zeroed:
- Relics + prestige relic bonuses
- Forge augments
- Pool bias (neutral pool for everyone)
- NFT perks, VIP bonuses
- Title effects, admin/global XP buffs, squad buffs (treasury tiers)
- Silent multipliers of any kind — **hard rule: no per-wallet levers in
  this mode, ever.** The whole brand is fairness.

In-run pickups (XP, magnets, health) work normally — they're part of the run,
not meta-progression. Relic **fragments do NOT drop** (nothing to bank —
mode runs credit nothing to the real save; see §7).

Client implementation: `Game.jsx` receives `mode: 'ascended'` + the template
from the server at run start (or mirrors the constant from a shared
`ascendedTemplate.js` — server remains authoritative at validation time).
Sandbox mode already proves the engine can run off a synthetic loadout, so
plumbing follows `is_sandbox` precedent: an `is_ascended` flag through
GameEngine → saveScore.

---

## 4. Run structure — the 15-minute gauntlet

- **Hard cap 15:00.** Run ends at the horn (a "victory"-style end screen) or
  on death, whichever first. No extension mechanics.
- **Ramp:** reuse the endless scaling loop + DD/HEAT machinery but with an
  Ascended curve: starts at roughly "S18 Cosmic" pressure and multiplies
  continuously. Target tuning: **a great pilot dies at ~12–14 min**;
  surviving to 15:00 is a genuine feat, not the norm.
- **Final minutes are the densest** — the run crescendos. Since score is
  kill-driven, the endgame is worth the most points; two horn-survivors are
  separated by how hard they farmed the chaos.
- **Death = final.** One paid revive allowed (escalation tier by minutes
  elapsed, same table as normal mode — 15:00 runs land in the 25 OMENX tier
  naturally).
- **Bosses:** ramp spawns elites/minibosses on a fixed cadence (e.g. every
  2:30) so the boss-bonus term in the score has a predictable, equal supply
  for everyone.

Tuning workflow: play the template in the **Practice Range** (Sandbox
already unlocks everything + has time fast-forward) against the Ascended
curve until the 12–14 min death target holds. The curve constants live in
one place (`ascendedRamp.js` + mirrored in validation) — tune once, holds
forever because there's no per-player variance.

---

## 5. Weekly rotation (seeded, deterministic)

Seed = `week_id` (existing ISO logic — same fairness guarantee as every
other weekly system). Everyone worldwide gets the same combo all week.
Derived **deterministically** from the seed (hash → index), so client and
server agree with zero coordination and no new admin chore:

1. **Arena skin** — one of the 20 existing sectors (background, hazards,
   music). Purely cosmetic borrow; the sector's own wave tuning is ignored.
2. **Enemy roster** — the borrowed sector's enemy family, so weeks *feel*
   different to fight, not just look different.
3. **1–2 modifiers** from a curated list, e.g.:
   - Elites spawn in pairs
   - Miniboss cadence 2:30 → 1:45
   - Enemy projectiles +25% speed
   - XP gems decay after 5s (forces aggressive collection)
   - "Frenzy finale" — last 3 min density ×1.5
   - No health drops after 10:00

   Modifier list starts small (6–8) and grows. Some pairs are excluded
   (config table) so a week can't roll two health-starvation mods together.

Rotation is displayed on the mode's lobby page ("THIS WEEK'S PROTOCOL:
Supernova sector · Paired Elites · Frenzy Finale") and in the Discord
weekly post.

---

## 6. Scoring

**No time term. No gold term. No sector bonus. One formula, forever:**

```
score = kills × K            (backbone — kills/min is the skill measure)
      + level × level × L    (build progress within the run)
      + eliteKills × E       (anti-trash-farming: bosses must be worth it)
```

Starting constants (tune in Practice Range before launch):
`K = 120` (matches S6 familiarity), `L = 100`, `E = 2000` per elite/miniboss.

Properties:
- Dying early hurts naturally (dead pilots stop scoring) without paying
  a single point for time itself.
- Playing scared at the map edge earns nothing; the ramp feeds kills to
  whoever farms the density.
- Horn-survivors are separated by kill count; the dense finale prevents ties.
- No difficulty/arena multipliers to balance — the weekly modifiers change
  the *conditions*, not the scoring.

**Anti-cheat is dramatically tighter than normal mode:** fixed template +
fixed window + known ramp = a computable "max plausible kills per minute
elapsed" envelope. Validation can reject hard rather than clamp loose.
Also: max level reachable in 15 min with template XP gain is knowable →
hard level cap; elite kills capped by the spawn cadence (e.g. 15-min run
can't contain more than `cadence-derived N` elites).

---

## 7. Economy — the Ascended Pool

### Spend routing
Every OMENX spent **inside an Ascended run** (reroll, banish, revive, ult —
whatever in-run SKUs apply) is tagged and routed:

- `purchaseSku` receives a `context: 'ascended'` flag (server-verifiable:
  the wallet has an open Ascended run — see §8 AscendedRun entity)
- Spend is logged to `TokenSpendLog` with a `pool_scope: 'ascended'` marker
  and **excluded from** the weekly/seasonal `TokenPool` accumulation
- Instead it accumulates in an **AscendedPool** row per `week_id`

### Distribution — 80 / 20
- **80%** → paid to that week's Ascended leaderboard at rollover
- **20%** → stays in dev wallet (no staff %, no seasonal carve-out, no
  kill-pool overlap — this pool touches nothing else)
- Omen Treasury's 3% platform fee still comes off the top off-code, same
  as everything (worth a footnote in the mode's info panel, mirroring the
  StaffPayoutAllocationPreview handling)

Payout curve: reuse the weekly players pool shape (top-N with decaying
percentages) via a new `ascendedPayoutConfig` key in AppConfig so it's
editable without deploys. Zero-spend week → pool shows 0, distribution
no-ops cleanly.

### What runs credit to the real save
**Nothing.** No gold, no fragments, no kills toward squad/war/weekly kill
counters, no bounty/daily-task progress, no character milestone kills, no
arena unlocks. The ONLY outputs of an Ascended run are:
1. An Ascended leaderboard entry
2. Pool payout eligibility

This isolation is the whole integrity story and also the cheap
implementation: saveScore's Ascended branch skips every PlayerSave
mutation (same one-way-rejection pattern as `is_sandbox`, except it DOES
write the mode's own score row).

*(Possible later addition: exclusive cosmetic/title for weekly #1 — "the
Ascended" title flair. Phase 2, not launch.)*

---

## 8. Data model

New entities (all admin-only RLS for writes, following house pattern):

**AscendedRun** — open-run registry + anti-abuse anchor
- `wallet_address`, `week_id`, `character_id`, `started_at_ms`,
  `status: active | finished | abandoned`, `revive_used: bool`
- Created by a new `startAscendedRun` function; `purchaseSku` verifies an
  `active` row exists before accepting `context: 'ascended'` spends;
  closed by score submit. Stale `active` rows (> 20 min) auto-expire.

**AscendedScore** — the leaderboard (deliberately NOT RunScore: keeps the
mode out of every existing leaderboard/cleanup/payout query by construction,
instead of by filter)
- `wallet_address`, `player_name`, `player_title`, cosmetic mirrors (same
  verified-ownership mirroring as RunScore), `character_id`, `week_id`,
  `score`, `kills`, `elite_kills`, `level`, `time_survived` (display only),
  `survived_full: bool`, `template_v`, `modifiers: [..]`
- **Best run per wallet per week** — submit does upsert-if-higher, so the
  keep-top-scores cleanup cron never needs to know this entity exists.

**AscendedPool** — one row per `week_id`
- `week_id`, `total_spent`, `distributed: bool`

**AscendedPayoutLog** — mirror of PayoutLog shape, own entity for the same
isolation reason. `week_id`, `wallet_address`, `player_name`, `amount`,
`rank`, `tx_id`.

AppConfig keys: `ascendedConfig` (run length, ramp constants version,
enabled flag / kill-switch), `ascendedPayoutConfig` (curve).

---

## 9. Backend functions

| Function | Purpose |
|---|---|
| `startAscendedRun` | Auth → create/refresh AscendedRun `active` row, return template + week rotation (arena, roster, modifiers) so client and server agree |
| `saveAscendedScore` | Validate (template envelope, §6), score, upsert-if-higher into AscendedScore, close AscendedRun. **Zero PlayerSave writes.** |
| `getAscendedLeaderboard` | Week's board + pool size + my best + this week's rotation card |
| `distributeAscendedPool` | Admin/scheduled: freeze week board → 80% by curve → OMENX rewards API (same TX machinery as distributeRewards) → AscendedPayoutLog, mark pool distributed. Idempotent. |
| `purchaseSku` (modify) | Accept `context: 'ascended'` → verify active run → route spend to AscendedPool, skip weekly/seasonal TokenPool accumulation. Revive escalation reads run elapsed time from AscendedRun, NOT weekly revive counters (mode isolation cuts both ways — Ascended revives shouldn't burn the player's normal-mode weekly cap). |
| `checkpointRun` (modify) | Reject `is_ascended` snapshots same as sandbox (15-min runs don't need crash recovery; keeps flushPendingScores clean) |

Rollover: `rolloverStalePeriods` / existing weekly cron gains an Ascended
step (or distribution stays manual-first like other pools — launch manual,
automate once trusted).

---

## 10. Client surface

- **Lobby page `/ascended`** (+ PlayCarousel slide): this week's rotation
  card, live pool size, leaderboard top-N + my rank, character picker
  (all 10), LAUNCH button. Countdown to weekly rollover.
- **In-run:** distinct HUD accent (the mode should *feel* premium —
  suggestion: gold/white "ascended" trim vs sandbox's warning-yellow),
  prominent 15:00 countdown, banner strip like SandboxBanner but branded
  ("ASCENDED PROTOCOL — RANKED · WEEK 2026-W37").
- **End screen:** score breakdown (kills / level / elites), week rank
  achieved, pool share projection if in top-N, "RUN IT BACK" button.
- **GameEngine:** `is_ascended` flag → load template stats, disable
  relic/NFT/VIP/forge/bias/title hooks (flag checks at the same seams the
  sandbox flag uses), run Ascended ramp, hard-stop at cap with horn
  sequence.

---

## 11. Anti-abuse checklist

- ✅ Template server-authoritative; client template only for rendering
- ✅ Score envelope: max kills/min, hard level cap, elite count cap — reject, don't clamp
- ✅ `context: 'ascended'` spends require an open AscendedRun (no pool-stuffing from outside runs)
- ✅ Upsert-if-higher = duplicate submits are naturally idempotent (plus the existing 2-min dup fingerprint check)
- ✅ No silent multipliers, no staff buffs, no per-wallet overrides — enforced by the mode never reading those tables at all
- ✅ Admin wallets: **may play and rank** (it's pure skill — nothing to grant yourself an edge), but admin self-spend is excluded from pool accumulation, mirroring the existing purchaseSku admin-exclusion rule
- ✅ Blacklist/mute checks same as saveScore
- ✅ Kill-switch: `ascendedConfig.enabled = false` hides the lobby + rejects starts (maintenance-gate pattern)

## 12. Long-term ecosystem — Ascended as ENDGAME, not replacement

**Working assumption: Ascended becomes the main mode players play.** That
has knock-on effects on every interconnected system, planned here so we
migrate deliberately instead of discovering starvation in week 3.

### 12a. What starves under strict isolation
| System | Fed by | Effect if play migrates |
|---|---|---|
| Weekly kill leaderboard + kill pool | Normal-mode sector kills | Ghost town — contested only by whoever still grinds normal |
| Squad weekly kills / wars / champions / daily goals | Normal-mode kills | Squad layer goes quiet; champions pool pays a shrinking activity base |
| Weekly/seasonal/kill/staff pools (the money loop) | % of weekly spend through normal pools | **All shrink — including staff payouts** — as spend shifts into the 80/20 Ascended pool. Structural revenue shift, not a bug, but must be watched from day 1 |

### 12b. The target architecture (two stages, one journey)
- **Normal mode = the account-building game.** Progression, gold, relics,
  upgrades. Its narrative purpose becomes *earning your Ascension*.
  Optional (phase 2 decision): literal unlock gate — e.g. beat Sector 10
  or account milestone — so Ascended is aspirational endgame, new players
  live in normal mode, and the grind has a destination.
- **Ascended = the ranked endgame** where the weekly competitive economy
  lives.
- **Squads bridge both modes.** Ascended kills SHOULD eventually credit
  squad weekly kills / wars / champions — arguably *fairer* than today,
  since template kills measure participation + skill instead of whale
  power. Needs a **normalization factor** (template kill rates are high;
  e.g. Ascended kills × 0.5 into squad counters — tune from real data).
  Same option available for the personal weekly kill leaderboard.

### 12c. Migration path — isolate first, fold deliberately
- **Launch: strict isolation** (as specced in §7). Protects every existing
  pool and squad system while real migration numbers come in.
- **Instrument from day 1:** admin metrics comparing normal vs Ascended —
  runs/week, spend/week, unique wallets. The decision to fold is made on
  this data, not vibes.
- **Fold levers — build the seams now so each is a config flip later:**
  1. `ascendedConfig.squad_kill_credit_pct` (0 at launch) — saveAscendedScore
     routes `kills × pct` into the existing squad kill path
  2. `ascendedConfig.kill_lb_credit_pct` (0 at launch) — same for
     `weekly_sector_kills` / WeeklyKillSnapshot
  3. Pool consolidation options (pick later, data-driven): extend staff %
     to cover Ascended spend, or route a slice of Ascended's 20% dev share
     into the kill pool, or retire the normal-mode kill pool in favour of
     the Ascended pool once Ascended is dominant
- **Trigger to revisit:** if Ascended exceeds ~50% of weekly spend or
  weekly kill-board participation drops below a floor you're comfortable
  with, activate levers 1–2 and decide on 3.

Design rule for the build: every place Ascended *doesn't* credit something,
implement it as a **zero-valued config**, not a hard skip — so folding the
ecosystems later is a config change, not a refactor.

## 13. Open items (decide before build)

1. Exact run length — 15:00 assumed; config value either way
2. Payout curve top-N (suggest: mirror weekly players pool initially)
3. Which in-run SKUs are available in Ascended (reroll/banish/revive/ult assumed; anything else?)
4. Attempts: unlimited assumed (free entry). Consider a soft "best of unlimited" messaging so grinding attempts is explicitly fine
5. Elite spawn cadence + E constant (Practice Range tuning session)
6. Weekly #1 cosmetic reward (phase 2?)
7. Ascended unlock gate (aspirational endgame vs open to all — see §12b)
8. Squad kill normalization factor starting value (see §12b)

## 14. Build phases

- **Phase 1 — Core loop:** entities + startAscendedRun + template/ramp in
  engine + saveAscendedScore + basic lobby/leaderboard. Pool ACCUMULATES
  (purchaseSku routing) but no distribution yet. Ship behind
  `ascendedConfig.enabled` for staff-only testing.
- **Phase 2 — Money:** distributeAscendedPool + payout preview in admin +
  AscendedPayoutLog viewer + Discord post integration.
- **Phase 3 — Polish:** modifier pool expansion, end-screen flourish,
  weekly #1 title flair, PlayCarousel slide art.

Tuning gate between Phase 1 and 2: at least one full internal week where
the 12–14 min death target and the score envelope hold up.