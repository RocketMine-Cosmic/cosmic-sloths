# PLAN — ASCENDED PROTOCOL (fixed-length ranked gauntlet)

Status: **PLANNED — not started**
Target: S9+ (own feature gate, not tied to a season formula change)
Author notes locked in design discussion 2026-07-16.

---

## 1. One-paragraph summary

A weekly ranked game mode where **every pilot plays the exact same maxxed
loadout** — all meta-progression flattened to a fixed template — in a
**fixed-length (10 min) gauntlet** whose enemy ramp never stops climbing.
The map, enemy roster and modifiers **rotate weekly** (same for everyone,
seeded by `week_id`). Ten minutes keeps runs snackable — more attempts per
session, tighter anti-cheat window, faster "run it back" loop. Score comes
**only from what you did** (kills, level,
boss kills) — never from time survived. All OMENX spent inside Ascended runs
feeds a **mode-isolated weekly pool: 80% paid back to the Ascended
leaderboard, 20% dev wallet** — completely separate from the weekly /
seasonal / kill / staff pools.

**The pitch:** pure skill. No grind advantage, no whale advantage, no relic
RNG. Same ship, same battlefield, same 10 minutes. Best pilot wins.

---

## 2. Locked design decisions

| Decision | Choice | Why |
|---|---|---|
| Progression | **Full flatten** — template save, player's real save ignored for run stats | Zero drift, zero "my relic didn't apply" tickets, tune once |
| Relics / NFT / VIP / titles / forge / pool bias | **All OFF** | Level playing field; only cosmetics carry over (visual-only) |
| Run length | **Fixed 10:00 hard cap** (config value, not hard-coded) | Endless invites AFK marathons; fixed cap = bounded server cost, tight anti-cheat, cheap retries; snackable enough to grind attempts |
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

## 4. Run structure — the 10-minute gauntlet

- **Hard cap 10:00.** Run ends at the horn (a "victory"-style end screen) or
  on death, whichever first. No extension mechanics.
- **Ramp:** reuse the endless scaling loop + DD/HEAT machinery but with an
  Ascended curve: starts at roughly "S18 Cosmic" pressure and multiplies
  continuously. Target tuning: **a great pilot dies at ~8–9 min**;
  surviving to 10:00 is a genuine feat, not the norm.
- **Final minutes are the densest** — the run crescendos. Since score is
  kill-driven, the endgame is worth the most points; two horn-survivors are
  separated by how hard they farmed the chaos.
- **Death = final.** One paid revive allowed (escalation tier by minutes
  elapsed, same table as normal mode — late-run deaths land in the
  8–11 min / 15 OMENX tier naturally).
- **Bosses:** ramp spawns elites/minibosses on a fixed cadence (e.g. every
  1:40) so the boss-bonus term in the score has a predictable, equal supply
  for everyone.

Tuning workflow: play the template in the **Practice Range** (Sandbox
already unlocks everything + has time fast-forward) against the Ascended
curve until the 8–9 min death target holds. The curve constants live in
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
   - Miniboss cadence 1:40 → 1:10
   - Enemy projectiles +25% speed
   - XP gems decay after 5s (forces aggressive collection)
   - "Frenzy finale" — last 2 min density ×1.5
   - No health drops after 7:00

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
Also: max level reachable in 10 min with template XP gain is knowable →
hard level cap; elite kills capped by the spawn cadence (e.g. 10-min run
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
| `checkpointRun` (modify) | Reject `is_ascended` snapshots same as sandbox (10-min runs don't need crash recovery; keeps flushPendingScores clean) |

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
  prominent 10:00 countdown, banner strip like SandboxBanner but branded
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

## 12. Long-term ecosystem — THE GREAT SPLIT (target end-state)

**Locked direction (2026-07-17): the campaign goes completely FREE-TO-PLAY,
and ALL competitive OMENX economy consolidates into Ascended.** The gradual
"fold levers" approach (previous §12 draft) is demoted to a fallback if the
transition proves too disruptive — see §12f.

### 12a. The two games

| | **Campaign (Sectors 1–20 + Endless)** | **Ascended Protocol** |
|---|---|---|
| Costs | **100% free.** Gold-only economy — every upgrade, talent, relic, revive, forge roll is bought with earned gold. No OMENX power SKUs at all. | Free entry; optional in-run OMENX spends (reroll / banish / revive / ult) |
| Pays | Gold + progression + unlocks. **Zero OMENX payouts.** | **The only OMENX payouts in the game.** One pool, 80% players / 20% dev |
| Purpose | Build your account, learn the game, *earn your Ascension* | Prove your skill, get paid |
| Pay-for-power | Irrelevant — nothing here pays out, so buying power (there's nothing to buy anyway) can't buy income | Impossible — flattened template |

The pitch writes itself: **"The campaign is free. The arena pays."**
No OMENX payout anywhere in the game can ever again be influenced by
spending — the single cleanest integrity story available.

**Free ≠ easy.** The campaign keeps its teeth: difficulty tiers, DD/HEAT
ramp, Outer Galaxy scaling and the gold-grind progression curve all stay
as-is. Removing OMENX shortcuts actually *sharpens* the challenge — you
can't buy your way past a wall anymore, you earn through it. Tuning goal:
fun but never a walk in the park.

### 12b. What gets RETIRED (sunset over one full season)
**Locked 2026-07-17: nothing weekly/seasonal survives on the campaign side
— pools AND upgrade monetisation both go. No partial keeps.**
- **Weekly players pool** — retired. Ascended weekly pool replaces it.
- **Seasonal players pool** — retired. (Ascended may gain a seasonal
  best-week-sum board later — phase 3+ decision — but that's an Ascended
  feature, not a campaign pool.)
- **Kill pool** — retired. The kill leaderboard itself survives as a
  bragging-rights board (campaign + Ascended kills, separate tabs or
  merged with the §12d normalization) but pays nothing.
- **Campaign OMENX power SKUs** — retired/converted: stat & weapon
  upgrades, talents, revives, fragment express → gold-priced or removed.
  Gold prices already exist for most (dual-currency SKUs); the OMENX side
  is simply switched off.
- **StaffPayoutAllocationPreview five-slice bar** — collapses to a
  one-pool view. Weekly ops overhead drops massively.

### 12c. What SURVIVES and how it's funded
| System | New basis |
|---|---|
| **Revenue** | Three pillars: ① Ascended in-run spend (20% dev share), ② **cosmetics** (chests, wardrobe, skins — pure vanity, sellable anywhere, no integrity conflict), ③ VIP/NFT perks *re-scoped to campaign-only conveniences + cosmetic flair* (must never touch Ascended) |
| **Staff payouts** | % of **total weekly OMENX spend across everything** (Ascended + cosmetics) — mode-agnostic, so staff income no longer depends on which mode is fashionable |
| **Squad champions** | Fed by **Ascended kills** (normalized, §12d) — fairer than today since template kills measure participation + skill, not whale power. Funded as a slice of the Ascended pool's player side (e.g. 80% splits into 70 individual / 10 squad) |
| **Squad wars / weekly kills / daily goals** | Campaign kills + normalized Ascended kills both credit (config pcts, §12d) — squads stay alive regardless of where members play |
| **Omen Treasury 3%** | Unchanged — off the top of everything, as always |

**Revenue risk: MEASURED AND LOW.** Spend audit (TokenSpendLog,
2026-07-01 → 07-17, 500 rows):
- In-run spend (reroll/revive/banish/ult/xp): **10,651 OMENX** — the
  dominant stream, broad player base. Maps 1:1 to what Ascended monetises.
- Upgrade spend: 6,560 — **but 3,925 (60%) is one player (Scooby)
  deliberately topping up the pool because upgrades were the only route
  in.** Organic upgrade spend ≈ 2,600 over 2.5 weeks and falling.
- Fragments: 820. Other: 20.

The upgrade economy is already dead as a revenue stream — F2P campaign
formalises reality rather than gambling on it. Upsides stack on top:
(1) F2P campaign is the biggest possible acquisition lever — more pilots
→ bigger Ascended pool → bigger prize headlines; (2) cosmetics get
first-class investment (Wardrobe/chest machinery already exists);
(3) give pool-toppers like Scooby a **direct "top up the pool" SKU** —
donate straight into the Ascended prize pool, with a leaderboard-visible
"pool patron" credit — instead of forcing them to launder it through
upgrades they don't need.

### 12d. Squad + kill-board bridging (build as configs, not skips)
- `ascendedConfig.squad_kill_credit_pct` — Ascended kills × pct → squad
  weekly kills / wars / champions path. Start ~0.5, tune from data.
- `ascendedConfig.kill_lb_credit_pct` — same for the personal weekly kill
  board (`weekly_sector_kills` / WeeklyKillSnapshot).
- Campaign kills keep crediting squads at 1.0 forever — the campaign must
  still *feel* like it matters to your squad.

### 12e. Transition plan — one full season of sunset
1. **Announce a season ahead.** "Final season of weekly/seasonal pools"
   is itself a marketing beat — last chance at the old boards.
2. **Sunset season:** Ascended launches with its pool live; old pools run
   in parallel at full rate. Both economies visible side-by-side.
3. **Rollover:** old pools pay their final distribution (send-off Discord
   post honouring all-time earners), campaign OMENX power SKUs switch off,
   campaign goes fully F2P, staff % re-bases to total spend.
4. **Grandfathering:** nothing is clawed back — every upgrade/talent/relic
   ever bought with OMENX stays. Early spenders keep a permanently
   stronger campaign account; that's their reward, and it costs nothing
   since the campaign no longer pays out.
5. **Top-spender comms:** personally flag the change to known whales
   before the public post. Their OMENX outlet becomes cosmetics + Ascended
   runs; their campaign dominance is untouched.

### 12f. Fallback — Ascended-side levers only (campaign pools never return)
Locked 2026-07-17: weekly/seasonal campaign pools and upgrade SKUs do NOT
come back under any fallback — that decision is final. If sunset-season
data shows Ascended spend can't carry payouts, the levers are all on the
Ascended/cosmetics side instead: adjust the 80/20 split, lean harder on
cosmetics + chests, push the Pool Patron top-up SKU, or shrink the payout
curve until spend catches up. Retirements in §12b still ship as config
flips (pool % → 0, SKU disabled flag), not deleted code — purely so the
sunset season can run both economies in parallel; **the code gets
hard-deleted one full season after the split ships.**

## 13. Open items (decide before build)

1. ~~Exact run length~~ — **DECIDED 2026-07-17: 10:00** (config value either way)
2. Payout curve top-N (suggest: mirror weekly players pool initially)
3. Which in-run SKUs are available in Ascended (reroll/banish/revive/ult assumed; anything else?)
4. Attempts: unlimited assumed (free entry). Consider a soft "best of unlimited" messaging so grinding attempts is explicitly fine
5. Elite spawn cadence + E constant (Practice Range tuning session)
6. Weekly #1 cosmetic reward (phase 2?)
7. Ascended unlock gate (aspirational endgame — e.g. beat Sector 10 — vs open to all)
8. Squad kill normalization factor starting value (see §12d)
9. Which season the sunset (§12e) starts — Ascended must ship at least one season earlier
10. VIP/NFT perk re-scope list — exactly which perks survive as campaign conveniences (§12c)
11. Squad champions slice of the Ascended pool (e.g. 80 → 70 individual / 10 squad, see §12c)
12. "Pool Patron" direct top-up SKU — donate straight into the Ascended pool with visible credit (replaces the Scooby workaround, see §12c)

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
the 8–9 min death target and the score envelope hold up.