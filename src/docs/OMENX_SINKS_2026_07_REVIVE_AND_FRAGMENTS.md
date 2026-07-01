# OMENX Sinks — Immediate Ships (2026-07-01)

**Scope:** the two sinks we're actually building next. Every other lever
from the collapse audit is parked. This doc holds the specs, the numbers,
and the combined revenue picture so we don't have to re-derive them each
time we tweak a value.

**Companion docs:**
- `BALANCE_AUDIT_2026_07_OMENX_COLLAPSE.md` — full diagnosis + all levers.
- `OMENX_SPEND_BRAINSTORM.md` — original ideation pool.

---

## Baseline we're trying to move

| Week | Total OMENX | Revive OMENX | Notes |
|---|---:|---:|---|
| W23 (2026-06-02) | 43,885 | 3,572 | Peak |
| W25 (S7 launch) | 14,052 | 1,928 | Collapse |
| W26 | 18,584 | 1,276 | |
| W27 (partial) | 9,553 | 384 | 1 day in — extrapolates to ~2.7k |

**Target:** stabilise weekly total OMENX above **20,000** across the base
of ~30-40 active weekly players. The two sinks below are our first attempt.

---

## Sink 1 — Revive Escalation + Weekly Cap

### Current state (verified against live data)

- SKU: `ingame-revive`, currently **4 OMENX flat**.
- Trigger: engine already fires the death-revive prompt
  (`GameEngine.js:673`), no new hook needed.
- Live data (last 5 weeks): **500 log rows examined**, spend ranges from
  4 OMENX (single revive) up to **52 OMENX in one log row** (top reviver,
  wallet `0x89ed14…`, 31 lifetime revives). Players are already stacking
  multiple revives per run — the mechanic works, we're just underpricing
  the deepest use of it.
- **~25-37 unique revivers per week.** This is the healthiest OMENX
  consumable behaviour we have after reroll.

### The proposal (locked)

Time-based cost curve so late-run revives — where the value delivered is
highest — cost more. Weekly cap so no single player can be nickel-and-dimed
out of the game.

| Run time at death | Cost | Rationale |
|---|---:|---|
| 0-5 min | **4 OMENX** | Unchanged — early revives stay a soft impulse buy. |
| 5-10 min | **8 OMENX** | Mid-run. Player has real investment now. |
| 10-25 min | **15 OMENX** | Deep run — losing this hurts. |
| 25 min+ | **25 OMENX** | Endless-tier. This is where the whales live. |

- **Weekly cap: 3 revives per player per week** (max 75 OMENX/week if
  all 3 land in the 25min+ tier).
- Cap resets on ISO week rollover (piggyback on existing weekly reset).
- Death prompt shows the price BEFORE the click — no surprise charges.

### Why these numbers

- **4 → 8 → 15 → 25** roughly matches the tier structure we already use
  for banish (2 / 4 / 6 OMENX) — familiar shape, higher ceiling.
- Top reviver's 31 lifetime revives at 4 OMENX flat = 124 OMENX. Under
  the new curve, if a third of those were 25-min+ deaths (very plausible
  for endless whales), the same behaviour = ~450+ OMENX. **~3-4× ARPU
  from the top-10 revivers alone.**
- 3/week cap prevents a single bad run from making the player quit. Cap
  is intentionally low enough to force a "should I really spend this?"
  moment.

### Revenue estimate

Model against W26 baseline (27 revivers, 1,276 OMENX / 86 revives).

Assumptions:
- Split of revive purchases by run-time bucket, estimated from endless-
  arena play patterns: 30% early / 30% mid / 25% deep / 15% endless.
- Same 86 revives per week continue.

| Bucket | Share | Revives/wk | Cost each | OMENX/wk |
|---|---:|---:|---:|---:|
| 0-5 min | 30% | 26 | 4 | 103 |
| 5-10 min | 30% | 26 | 8 | 206 |
| 10-25 min | 25% | 21 | 15 | 322 |
| 25 min+ | 15% | 13 | 25 | 322 |
| **Total** | | 86 | | **~953** |

Wait — that's *less* than current 1,276. That's because the current
data already shows amounts like 52 OMENX in a single row, meaning some
players are stacking multiple revives per run today at 4 OMENX each and
the cap will *reduce* that.

**Revised model** — cap trims stacking, but per-revive price rises:

- Current: 86 revives × avg 14.8 OMENX (1,276 / 86) = 1,276 OMENX/week.
- New with cap: ~65 revives (cap trims ~25% of the tail) × avg 13.5
  OMENX (mixed buckets) = **~880 OMENX/week**.
- **Net: -400 OMENX/week vs current.** ❗

**This is a meaningful finding.** The cap is protective of players but
costs us revenue. Two ways to handle this:

1. **Raise the cap to 5/week.** Same ceiling protection (125 OMENX max)
   but recovers most of the stacking behaviour → model: **~1,400
   OMENX/week (+10% vs current)**.
2. **Steepen the top tier.** 25min+ → **35 OMENX** (still under the
   Squad Ultimate Full price of 10 OMENX to reinforce this is a premium
   save) → model: **~1,100 OMENX/week (-14% vs current)**.

**Recommendation: option 1 — 5/week cap.** Player experience stays
protected (they can still be told "no" after 5), and the ARPU story
works.

### Locked spec (post-tuning)

- 4 / 8 / 15 / 25 OMENX by run-time bucket (5 / 10 / 25 min breakpoints).
- **Weekly cap: 5 revives per player per week.**
- Price shown in death prompt before purchase.
- Cap counter stored on `PlayerSave.weekly_revive_count` + companion
  `weekly_revive_week_id` (same pattern as `weekly_sector_kills`).
- ~0.5 day dev in `purchaseSku`, `GameEngine.js`, and the death modal.

### Zero cannibalisation risk

Revive doesn't overlap with any other OMENX sink — it's a distinct
death-only interaction. Safe to ship first.

---

## Sink 2 — Fragment Express Lane

### Current state

- Star Fragments are the input to Astral Lab relic prestige (500 frags +
  7.5M gold per PL step).
- In-game route: kill Elite mobs (drop rate ~1-3% per kill) OR gold-
  convert in Forge (capped at **30 fragments/day**, rate ~130 gold each).
- **Live inventory check:** 52 active relic owners hold an average of
  **~4,100 fragments each** on hand. Whales are grinding daily but the
  30/day cap forces them to slow-drip.

### Segment sizes (active players, last 14 days)

| Segment | Count |
|---|---:|
| 🐋 Whale prestigers (5+ PL steps completed) | **9** |
| Deep prestigers (2-4 PL) | 11 |
| Light prestigers (1 PL) | 2 |
| Relic owners, no prestige yet | 30 |
| Have crafted a relic (total) | **52** |

### The proposal (locked)

- **10 OMENX = 15 fragments (batched purchases only)** — 0.67
  OMENX/fragment.
- **Weekly cap: 600 fragments / 400 OMENX per player.**
- Bypasses the 30/day Forge cap (the whole point — target the cap-hit
  whales).

### Why these numbers (against 4-week season cadence)

- 1 week at cap = **1 PL step + 20%** of the next — real, visible
  progression from one week of play.
- 4 weeks at cap (one full season) = **~5 PL steps** — a full relic's
  worth of prestige from OMENX alone. Satisfying season-long grind.
- Full 25-step prestige via OMENX only = **~5 seasons** — aspirational
  but has a finite endpoint.
- Priced above the 65k gold-equivalent floor (500 × 130g) so fragments
  aren't being sold below their in-game grind rate.
- Priced below the eventual 30-OMENX PL-skip SKU (audit §7D) so the
  premium path stays premium.

### Revenue estimate

Adoption model tiered by prestige depth:

| Scenario | Adoption pattern | Cap buyers | Partial buyers | **Weekly OMENX** | vs 14k baseline |
|---|---|---:|---:|---:|---:|
| Conservative | Only whales max out; light interest elsewhere | 9 | 9 | **~5,400** | +39% |
| Realistic | New shiny sink pulls broader adoption | 14 | 21 | **~9,800** | **+70%** |
| Optimistic | Heavy uptake if promoted in patch notes | 19 | 38 | **~15,200** | **+109%** |

Absolute theoretical maximum: 52 relic owners × 400 OMENX = **20,800
OMENX/week ceiling.** You can't over-earn from this sink — it's
naturally bounded by the size of the prestige-eligible base.

### Locked spec

- SKU: `ingame-star-fragments` (new).
- Batch size: 15 fragments per purchase.
- Weekly cap: 40 batches (= 600 frags / 400 OMENX).
- Cap counter: `PlayerSave.weekly_fragment_batches` + `weekly_fragment_batches_week_id`.
- Server grant in `purchaseSku`:
  `saveData.relicFragments += 15` per batch.
- UI: Astral Lab / Forge — new "Buy Fragments" button next to the
  existing gold-convert row. Disabled with "Weekly cap reached" tooltip
  when maxed.
- ~0.5 day dev.

### Zero cannibalisation risk

Doesn't overlap with revive, reroll, banish, or any progression SKU.
Substitutes ONLY for the gold-convert grind in Forge, which is a
low-value gold sink (~130g/frag × 30/day = 3,900 gold/day removed —
trivial vs the 76M/week gold spend we see).

---

## Combined weekly OMENX projection

Adding both sinks on top of the current W26 baseline of 18,584 OMENX/week:

| Scenario | Revive (new) | Fragments (new) | **New total OMENX/week** | vs W26 | vs W23 peak (43.9k) |
|---|---:|---:|---:|---:|---:|
| Conservative | ~1,400 | ~5,400 | **~25,384** | **+37%** | 58% |
| Realistic | ~1,400 | ~9,800 | **~29,784** | **+60%** | 68% |
| Optimistic | ~1,400 | ~15,200 | **~35,184** | **+89%** | 80% |

**The revive change alone barely moves the needle** (+124 OMENX/week
vs current). It's a hygiene fix + top-tier price correction, not a
revenue engine. **Fragments carries the ship.**

Realistic combined case (~29.8k/week) recovers ~68% of the W23 peak —
without touching player count. If the S8 tease / new content in the
audit §7G lifts actives back to 50-60/week, both sinks scale
proportionally and we're back above W23 levels.

---

## What to ship first

1. **Revive escalation** (day 1 — protected, tiny scope, no risk).
2. **Fragment express lane** (day 2 — bigger revenue lever).

Ship together in the same patch. Announce as "OMENX gets meaningful
things to buy again" in patch notes.

---

## What to monitor after ship

Week 1 targets:

- Total OMENX/week ≥ **22,000** (up from 18,584).
- Fragment SKU: ≥ **6 unique buyers** in first week (conservative floor).
- Revive SKU: ≥ **25 unique buyers** (matches current baseline — cap
  shouldn't drop the buyer count, only trim the tail).
- No support tickets about the revive cap being unfair.

Week 4 targets:

- Total OMENX/week ≥ **28,000** (hitting realistic combined case).
- Fragment SKU cap-hitters: ≥ **8** (whale segment fully adopted).
- Prestige actions (`prestigeRelic` calls) up ≥ 30% — validates that
  the express lane is *enabling* more prestige, not just extracting
  OMENX from stalled grinders.

If week 1 undershoots on the fragment SKU, first move is to loosen the
cap to 800 frags/week (not to drop the price — the price is anchored
to the gold-convert floor).