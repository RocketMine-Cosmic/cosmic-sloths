# OMENX Payout Pool Re-split — Design Doc

**Status:** Draft — pending Texxy sign-off on open questions.
**Author:** Texxy / Base44.
**Date:** 2026-06-04.
**Estimated effort:** ~1 focused implementation pass once the open questions are answered.

---

## TL;DR

Redistribute the OMENX payout pools to reward kill grinders, not just score chasers, and free up some seasonal OMENX runway.

| Pool | Today | Proposed | Δ |
|---|---|---|---|
| **Weekly Score Leaderboard** (top 30) | 20% of weekly spend | **15%** | −5% |
| **Weekly Kill Leaderboard** (top N) — NEW | 0% (no payout) | **5%** | +5% |
| **Seasonal Score Leaderboard** (top 30) | 30% of seasonal spend | **20%** | −10% |
| Seasonal Squad Wars Champions (top 3 squads) | 10% of seasonal spend | 10% *(unchanged)* | — |
| Staff cut (weekly only) | 2% × N admins | *(unchanged)* | — |

**Net weekly outflow** to player wallets is **unchanged** at 20% — just split 15% score / 5% kills.
**Net seasonal outflow** drops from **40% → 30%** — that's a 25% reduction in seasonal OMENX paid out, which materially extends runway.

---

## Why

1. **Reward different playstyles** — today, only top-30 score players get paid. Kill grinders (who care about squad bounties, weekly kill rank, mob mastery) get nothing OMENX-wise. Splitting carves out a dedicated payout for them.
2. **Reduce seasonal payout intensity** — 40% of seasonal spend going back as rewards is high. Dropping seasonal score from 30→20% lengthens runway without touching the weekly cadence players actually feel week-to-week.
3. **Increase weekly engagement variety** — players who can't compete on the top score board now have a second viable target (kills) with real upside.

---

## Current state — exact code references

All payout maths live in three near-identical functions that must be kept in lock-step:

| File | Lines | What it does |
|---|---|---|
| `functions/previewPayouts.js` | L104: `total_spent * 0.20` | Weekly pool size |
| | L137: `total_spent * 0.30` | Seasonal pool size |
| `functions/distributeRewards.js` | same constants | Live payout (scheduled) |
| `functions/manuallyDistributeRewards.js` | same constants | Admin retry / manual flow |
| `functions/distributeSquadChampions.js` | `total_spent * 0.10` | Seasonal Squad Wars (unchanged here) |

Rank-tier % distribution lives in `AppConfig.leaderboard_payout_config` (admin-editable via `leaderboardPayoutConfig` fn). Pool **size** % is hard-coded in the three files above — NOT in AppConfig today.

The weekly kill leaderboard (`functions/getWeeklyKillLeaderboard.js`) currently exists for display only — it reads `PlayerSave.weekly_sector_kills` and ranks pilots. **Zero payout wiring exists for it today.**

---

## Proposed state

### Weekly score pool: 20% → 15%
- Drop `0.20` → `0.15` in all three weekly payout functions.
- Rank tier shape (10/8/6/4×7/3×10) **unchanged** — same top 30 split, just on a smaller pool.
- Expected impact: each rank's OMENX payout drops by ~25% (15/20 = 0.75×). #1 weekly still gets a meaningful prize, just less.

### NEW: Weekly kill leaderboard pool: 5%
- New constant `KILL_LEADERBOARD_POOL_PCT = 0.05` added to the same three weekly functions.
- Ranking source: `PlayerSave.weekly_sector_kills` for the current `week_id` (same data the existing `getWeeklyKillLeaderboard` fn surfaces — server-authoritative, sector runs only, endless/raid/meteor excluded by design).
- Pays top **N kills** — N + rank tiers TBD (see open questions). Reuse `buildRankedPayments` helper unchanged.
- Stored as new `PayoutLog.period_type = 'weekly_kills'` so it doesn't collide with existing `'weekly'` (score) logs and remains independently auditable / retry-safe.
- Per-player cap `10,000 OMENX` applies **per pool independently** — a pilot who tops both score AND kills can earn up to 20k for the week. (Confirm with Texxy — see Q5.)

### Seasonal score pool: 30% → 20%
- Drop `0.30` → `0.20` in all three seasonal payout functions.
- Rank tier shape (10/7.5/6/3.2×7/2.2×10) **unchanged** — same top 30 split.
- Squad Wars Champions seasonal pool (`0.10`) **unchanged**.

### Effective outflow comparison

For a hypothetical week with **100,000 OMENX spent** and **3 admin wallets**:

| Outflow | Today | Proposed |
|---|---|---|
| Weekly score → top 30 | 20,000 | 15,000 |
| Weekly kills → top N (NEW) | 0 | 5,000 |
| Staff (3 × 2%) | 6,000 | 6,000 |
| **Weekly total** | **26,000** | **26,000** |

For a season with **500,000 OMENX spent**:

| Outflow | Today | Proposed |
|---|---|---|
| Seasonal score → top 30 | 150,000 | 100,000 |
| Seasonal Squad Wars → top 3 squads | 50,000 | 50,000 |
| **Seasonal total** | **200,000** | **150,000** |

That's **50,000 OMENX per season** redirected back into the treasury / runway.

---

## Implementation checklist (when greenlit)

### Backend
1. **`functions/previewPayouts.js`** — replace `0.20`/`0.30` constants. Add `kill_pool_pct = 0.05` block. Compute + return `kill_payments` array alongside existing `payments` and `staff_payments`.
2. **`functions/distributeRewards.js`** — same constant changes + add new kill-leaderboard distribution pass. Resume-safe via new `PayoutLog.period_type='weekly_kills'`.
3. **`functions/manuallyDistributeRewards.js`** — mirror changes from #2 for admin retry.
4. **`functions/distributeSquadChampions.js`** — verify untouched (it reads `0.10` independently for the Champions pool).
5. **`functions/getWeeklyKillLeaderboard.js`** — already returns the right shape; verify top-N cap matches the new payout N.
6. **`functions/leaderboardPayoutConfig.js`** — optionally add `weekly_kill_tiers` to the AppConfig schema so kill rank %s are admin-editable too. Recommended for parity but not blocking.

### Admin UI
7. **`components/admin/AdminLeaderboardPayoutConfig.jsx`** — if we add `weekly_kill_tiers` to config, expose it here.
8. **`components/admin/AdminLeaderboard.jsx`** — extend the preview/distribute UI to surface the new kill pool alongside score + staff payouts.
9. **`components/admin/AdminStaffPayouts.jsx`** — verify staff cut still computes against `pool.total_spent`, not against `score_pool` (line check — should be fine but worth confirming).

### Player-facing
10. **`pages/Info.js`** (Compete tab) — update the Weekly Leaderboard card. Today it lists "Top 30 players earn OMENX". Need to add the kill leaderboard as a second weekly payout track + show both pool %s clearly. Seasonal card needs the 30→20% update.
11. **`pages/LeaderboardPage.js`** — add a "Weekly Kills" payout indicator next to the rank rows on the existing kill leaderboard view (medal icons for paying ranks, mirror of how score leaderboard surfaces top 30).
12. **`docs/WHITE_PAPER.md`** — update the economy section with the new split.

### Comms
13. **Discord patch notes** — draft a clear "what's changing and why" post for staff + community. Frame the seasonal reduction as a runway extension; frame the kill-pool addition as a new earning lane for grinders.
14. **In-app S6 welcome/news modal** — optional one-time announcement for active players.

---

## Open questions (must answer before implementation)

**Q1. How many ranks pay out on the weekly kill leaderboard?**
Options: top 10, top 20, top 30. Recommend **top 20** — meaningful enough to chase, small enough that individual prizes aren't dust.

**Q2. What's the rank tier distribution for the kill pool?**
Should top 1 get a huge share (concentrated, like score) or be flatter (more grinder-friendly)?
Recommend a **flatter curve** — e.g. #1=15%, #2=10%, #3=8%, #4–10=5% each, #11–20=2.5% each.
Rationale: kills is a grind metric, not a skill metric. Flatter rewards effort, less RNG-vulnerable.

**Q3. Per-player cap — independent or shared?**
Today: 10k OMENX per player per period (one pool).
Option A — **independent caps** (recommended): kill-pool 10k + score-pool 10k = up to 20k weekly for double-toppers. Rewards completionists.
Option B — shared cap: a pilot can't exceed 10k total across both pools per week. Caps top earners but means a #1-on-both pilot effectively only gets one prize.

**Q4. Eligibility — which kills count?**
Recommend: same rule the existing `weekly_sector_kills` counter uses (sector runs only, endless/raid/meteor excluded). Server-authoritative, already battle-tested.

**Q5. Staff cut accounting**
Staff still takes `2% × N` of **`pool.total_spent`** (not of the score sub-pool), correct? Confirm — easy to misread the diff and accidentally double-skim.

**Q6. Transition timing**
Recommend deploying on a **Monday 00:00 UTC** boundary so the new % applies cleanly to the entire week. Live preview/admin tools should reflect the new % the moment we deploy, even if the next distribution is days away.

**Q7. Backwards compatibility**
Existing `PayoutLog` entries with `period_type='weekly'` (score) are untouched. New `period_type='weekly_kills'` rows are net-new — no migration needed. ✅

**Q8. Should pool % move to AppConfig?**
Currently hard-coded in 3 files. If we're touching all three anyway, it's a good moment to lift `weekly_pool_pct`/`seasonal_pool_pct`/`kill_pool_pct` into `AppConfig.leaderboard_payout_config` so future changes are zero-deploy. **Recommended** — small refactor, big future-proofing win.

---

## Risks

- **Top-player backlash on the weekly score reduction (20→15%)** — #1 weekly currently earns ~10% of 20% pool = 2% of weekly spend. Drops to ~1.5%. Top earners will notice. Mitigation: pair the announcement with the new kill-pool framing — "if you also grind kills, your total upside actually goes UP."
- **Lower seasonal payouts (30→20%)** — bigger optics hit. Frame as "runway extension that keeps the game payable for everyone long-term," tie to the OMENX treasury health if possible.
- **Kill-leaderboard farming** — high-kill builds (e.g. burst-spawn AoE clearers) may dominate the kill board. Could be intended (rewards effective builds) or undesired (homogenises the meta). Watch the first 2 weeks of data; if one playstyle sweeps top 5, consider tuning.
- **Audit complexity** — `AdminWeeklyTopup` and `AdminStaffPayouts` need to handle a third payout type cleanly. If we skip the AppConfig refactor (Q8), this complexity compounds every time we tweak %s.

---

## Recommended decision path

1. ✅ Lock answers to Q1–Q8 above.
2. ✅ Confirm transition date (next Monday UTC boundary after deploy).
3. ✅ Do the AppConfig refactor (Q8 = yes) — small extra effort, much cleaner long-term.
4. ✅ Implement backend + admin UI in one pass.
5. ✅ Ship player-facing Info page + Leaderboard payout indicators.
6. ✅ Post staff Discord brief 48h before the change, public patch notes 24h before.
7. ✅ Monitor first weekly + seasonal cycle, adjust kill-tier shape if it concentrates too hard.