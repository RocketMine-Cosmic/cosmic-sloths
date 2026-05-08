# S6 Master Plan — Cap-Free, Skill-First, Gold-Balanced

**Author:** Base44  •  **Date:** 2026-05-07  •  **Target:** Season 6 (starts Mon May 18 2026 00:00 UTC)

This doc is the **unified plan** that pulls together the three S6 design docs:
- `S6_SCORE_FORMULA.md` — the new score formula (Option A, scaled to ~1M peak)
- `S6_CAP_REMOVAL.md` — strip the gold/kill/fragment caps, keep only sanity validators
- `S6_BALANCE_AUDIT.md` — multiplier rebalance levers (L1/L2/L3) so removal is safe

**Read those first** for the deep-dive analysis. This doc focuses on **how everything fits together** and what new gold-sink content is needed to keep the economy fair when the caps go away.

---

## TL;DR

Removing caps without rebalancing first = whales mint 500k gold/run and break the economy in 48 hours. The fix is a **three-legged stool**:

1. **Score formula doesn't care about gold** (S6_SCORE_FORMULA — already gated)
   - Whales earning more gold ≠ whales dominating the leaderboard
2. **Multiplier stack flattened at the source** (Balance Audit levers L1+L2+L3)
   - Peak Synthbeats stack drops from ×38 → ×19 — cuts gold faucet roughly in half
3. **New gold sinks to absorb the increased flow** (this doc, section 5)
   - Players with 5M gold piles need places to spend that don't trivialize the leaderboard

All three legs ship together for S6 launch. Drop any one and the others fail.

---

## 1. Where each doc fits

| Concern | Doc | Status |
|---|---|---|
| Make leaderboard reward skill, not gold/grind | `S6_SCORE_FORMULA.md` | ✅ Recalibrated to ~1M peak (last revision 2026-05-07) |
| Stop the HUD↔server cap mismatch confusion | `S6_CAP_REMOVAL.md` | ✅ Surveyed, ~150 lines deletable across 6 files |
| Stop the multiplier-stack faucet | `S6_BALANCE_AUDIT.md` | ✅ L1/L2/L3 ranked highest impact ÷ cost |
| Absorb the post-cap gold flow | **This doc** | 🆕 New |

---

## 2. The cap-removal risk model

### 2a. What was the cap actually preventing?

| Cap | Real role in S5 |
|---|---|
| `MAX_GOLD_BASELINE + kills × 2k` | Mostly trips legit Synthbeats whales (false positive). Actual tampering caught by RLS, not this. |
| `goldScoreCap = kills × 200` | **Score** clip — irrelevant in S6 (gold drops from formula entirely). |
| `ENDLESS_GOLD_HARD_CEILING = 10k` | The big one. Without this, whale endless runs banked 100k+ gold per run. |
| `ENDLESS_FRAGMENTS_CAP_PER_RUN = 30` | Endless was the optimal fragment farm. Cap pushed players back to sectors. |

The endless caps in particular weren't anti-cheat — they were **anti-economy-blowout**. Remove them and you're betting that:
1. New balance levers (L1/L2/L3) cut the faucet enough at the source, AND
2. New gold sinks soak up whatever gold still pours through

### 2b. Projected gold flow, post-everything

Synthbeats Cosmic, 25-min endless run, **after L1+L2+L3 + caps removed**:

| Phase | Math | Result |
|---|---|---|
| S5 today (capped) | 10k ceiling | **10,000 g/run** |
| S6 if we ONLY remove caps (no rebalance) | ×38 stack × ~50k raw → uncapped | **~190,000 g/run** ⚠️ |
| S6 with L1+L2+L3 + caps removed | ×19 stack × ~50k raw | **~95,000 g/run** |
| S6 full package (L1+L2+L3 + endless time-curve) | ×19 stack, time-decayed past 15 min | **~60,000 g/run** ✅ |

The "full package" target = **6× the old cap** for whale endless runs, but achievable only with maxed Synthbeats. Average player gets ~3× the old cap on a long run — feels generous, doesn't break.

### 2c. What still goes wrong without new sinks?

Even at 60k/run for top whales, three runs/day × 7 days = **1.26M gold/week** for the very top 1%. With current shop content:
- All cosmetics: ~500k total to unlock
- All relics maxed: ~800k
- All upgrades maxed: ~600k

So a whale finishes the entire economy in **week 1**. After that they have nothing to spend gold on — gold becomes worthless and the spend → OMENX → leaderboard pool → reward feedback loop breaks. **This is why we need new sinks.**

---

## 3. Recommended S6 launch package (revised, full)

Replaces the "minimum viable" recommendation in `S6_BALANCE_AUDIT.md` §4. With cap removal in scope, we need the full balance package, not the minimum.

### Ship by May 18 (S6 launch)

**Score & validation:**
- ✅ Option A score formula (scaled — ~1M peak Sector 10 victory)
- ✅ Caps stripped from `saveScore.js` (per `S6_CAP_REMOVAL.md` §3)
- ✅ Plausibility validators kept (kills/sec, max time 2hr, max level)
- ✅ HUD cap warnings removed (`UIOverlay`, `RunStatsBox`, `PickupSystem`)

**Balance levers:**
- ✅ **L1 — Talent 0.66× stack factor** (the single biggest unaudited multiplier)
- ✅ **L2 — NFT/perk multipliers folded additive** (no more stacked-on-top)
- ✅ **L3 — Cosmic 3× → 2× gold/XP** (Cosmic stays the hardest mode but stops being the gold meta)
- 🆕 **L9 — Endless time-decay curve** (see §4)

**New gold sinks:**
- 🆕 **Prestige relics** (see §5a)
- 🆕 **Forge re-roll lottery** (see §5b)
- 🆕 **Squad treasury contributions** (see §5c)

### Defer to S6 week 2 (post-launch hotfix window)

- L5 (NeoByte allStats rework) — only if data shows NeoByte still dominates
- L8 (per-stat hard caps) — only if a single multi-source stack breaks 8× gold

### Defer to S7

- L4/L6/L7 — too many variables in one patch

---

## 4. New balance lever — L9: Endless time-decay curve

The endless caps existed because endless gold scaled linearly with time forever. Even with the multiplier stack flattened (L1/L2/L3), a 60-min endless run still mints uncapped gold faster than any sector run.

**Proposal:** instead of a hard ceiling, **decay gold drop value past a "honeymoon" window**.

```js
// PickupSystem.js — applied INSIDE the gold pickup branch, BEFORE multiplier
const isEndless = engine.arena?.duration === Infinity;
let timeFactor = 1.0;
if (isEndless) {
    const t = engine.time || 0;
    if (t > 600) {                                // first 10 min: full value
        timeFactor = Math.max(0.25, 1.0 - (t - 600) / 1800);  // 10→40 min: linear decay to 0.25×
    }
}
const finalGold = Math.floor(p.value * engine.player.goldMult * nftGoldMult * timeFactor);
```

### Behaviour

| Endless run length | Gold per pickup | Notes |
|---|---|---|
| 0–10 min | 1.0× | Full value — short bursts feel rewarding |
| 15 min | 0.83× | Light decay |
| 25 min | 0.50× | Half value — you EARNED this |
| 40 min+ | 0.25× | Floor — you can still farm but it's slow |

### Why this is better than a hard cap

- ✅ No hard ceiling = no HUD↔server mismatch
- ✅ Player **sees** drop value shrinking via the gold ticker — feels organic, not punitive
- ✅ Anti-AFK (4-hour leave-the-laptop-on runs become non-viable)
- ✅ Skilled long runs still rewarded (slower compounding, but never zeroed)
- ✅ No "GOLD CAPPED" warning needed — gold just naturally tapers

### Same idea for fragments

```js
if (isEndless && engine.time > 600) {
    // After 10 min, fragment drop chance scales the same way
    if (Math.random() > timeFactor) return;  // skip drop entirely
}
```

Drops still happen, just less often as the run drags on. No per-run cap, no surprise.

---

## 5. New gold sinks for S6

Three sinks, ranked by build cost ÷ economic absorption:

### 5a. 🥇 Prestige Relics (high absorb, medium cost)

**Concept:** once a relic hits L5, you can "prestige" it for **gold + relic fragments** to unlock a **+1 prestige tier** (PL1 → PL5, each adding +5% to the relic's effect).

| Tier | Gold cost | Fragment cost | Effect at end |
|---|---|---|---|
| L1–L5 (existing) | ~150k | (used to craft + level) | Midas Core +50% gold |
| **PL1–PL5** (new) | +1.5M (per relic) | **+500 (per relic)** | Midas Core +75% gold |

**Why fragments are part of the prestige cost (added 2026-05-08):**
Audit of top stockpiles showed L5-relic players sitting on **300–600+ unspent fragments** with literally nothing to spend them on (all 5 relics maxed, fragments only buy crafting + leveling + in-run rerolls). Adding a fragment cost to prestige drains those dead piles into a meaningful goal.

- 100 fragments per prestige tier × 5 tiers = 500 fragments per relic fully prestiged
- Top whales (~600 fragments) can fully prestige *one* relic from the pile, then go back to earning fragments organically
- Newer players with smaller piles (~50–100) can dip into PL1 immediately without feeling locked out
- Fragments are still grandfathered (no clawback) — they just become prestige progress

**Sink absorption:**
- Gold: 5 relics × 1.5M = **7.5M gold sink** for the full prestige set
- Fragments: 5 relics × 500 = **2,500 fragments** for the full set (~4× the largest current pile)
- Every relic, not just the meta ones (unlike forge augments)
- Unlocks slowly — even a whale with 60k/run takes 10 weeks to fully prestige one relic
- Bonus is meaningful (+5% per tier) but not gamebreaking — a whale who skips prestige still loses to a similarly-skilled non-prestige player on the leaderboard (because score doesn't care about gold)

**Build cost:** ~2 days (relic data extension, UI, server-side gold + fragment spend, save migration)

### 5b. 🥈 Forge Lottery Re-rolls (medium absorb, low cost)

**Concept:** the forge currently lets players **buy** specific augments. Add a "**Mystery Forge**" button that costs **5,000 gold OR 50 relic fragments** and grants a **random T1/T2/T3 augment** weighted by tier rarity. Players keep re-rolling until they get the augment they want.

| Outcome | Probability | Player value |
|---|---|---|
| T1 augment | 60% | Cheap consolation |
| T2 augment | 30% | Good outcome |
| T3 augment | 10% | Jackpot |

**Dual-currency rationale (added 2026-05-08):**
Letting fragments buy lottery pulls gives stockpilers an outlet that doesn't inflate the gold economy you just rebalanced. A whale with 600 fragments can do 12 free pulls; once that pile is gone, they're back to paying gold like everyone else. Conversion ratio (50 frags = 5,000 gold = 1 pull) is intentionally fragment-favorable to encourage drainage.

- Average roll cost to get a specific T3 = ~50k gold OR ~500 fragments
- Compulsive sink — players keep pulling for the rare drop
- Unlike the existing direct-buy path, this is a **gamble** (with capped downside — they always get *something*)
- Fragment payment route ensures even players who already maxed prestige have somewhere to spend leftover frags

**Build cost:** ~1 day (one new function, one button, weighted-random helper already exists in `forgeAction`)

### 5c. 🥉 Squad Treasury Contributions (low absorb, low cost — but social)

**Concept:** squad members can **donate gold** to the squad treasury. Treasury funds unlock **squad-wide buffs** that apply for the next war cycle:

| Treasury level | Cost | Buff (next war only) |
|---|---|---|
| Bronze | 25k | +5% squad XP from kills |
| Silver | 100k | +10% squad XP, +5% gold drops |
| Gold | 500k | +20% squad XP, +10% gold drops, +3% boss damage |
| Platinum | 2M | +30% squad XP, +15% gold drops, +8% boss damage |

> **Note:** Earlier drafts of this spec included "+1 squad ult charge" on Gold/Platinum tiers. Removed pre-launch (2026-05-07) — squad ults are an OmenX/NFT-tier mechanic and there's no per-run charge counter wired up to enforce limits. Boss damage is a cleaner, easily-measured bonus that doesn't cannibalise NFT perks. Squad war kill weight was also considered and rejected as too leaderboard-distorting.

- Squads of whales pool their gold — social pressure to contribute
- Buffs are time-limited (one war cycle), so the sink **resets weekly**
- Doesn't affect leaderboard (squad XP is separate from individual run scores)

**Build cost:** ~3 days (treasury entity, donation UI, buff application in engine, weekly reset)

### Combined sink absorption (S6 week 4 projection)

Whale gold income: **60k/run × 3 runs/day × 28 days = ~5M gold/month**

| Sink | Absorption potential per month |
|---|---|
| All cosmetics + relics + upgrades (existing) | ~2M (one-time) |
| 5 relics × 1.5M prestige | 7.5M (one-time per character) |
| Forge lottery (compulsive) | unbounded but ~500k/month typical |
| Squad treasury (recurring) | ~500k/month for active squads |

**Result:** even a whale doesn't run out of things to spend gold on for 6+ months. Mid-tier players have a clear progression ladder. New players can ignore prestige until they're ready.

---

## 6. The full S6 launch checklist

Order of implementation (each blocks the next):

```
┌──────────────────────────────────────────────────────────────────┐
│ Phase 1 — Backend safety (1 day)                                 │
│   ☐ saveScore.js: cap removal (per S6_CAP_REMOVAL §4)            │
│   ☐ saveScore.js: Option A score formula (gated season != S5)    │
│   ☐ Test with admin tool — replay 3 historical runs, check       │
│     scores match projections                                      │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│ Phase 2 — Balance levers (2 days)                                │
│   ☐ L1: talent 0.66× stack factor (GameEngine.js)                │
│   ☐ L2: NFT mults folded additive (3 files)                      │
│   ☐ L3: Cosmic 3→2× (Constants.js)                               │
│   ☐ L9: endless time-decay (PickupSystem.js)                     │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│ Phase 3 — Gold sinks (5 days)                                    │
│   ☐ Prestige relics — entity + UI + server (2 days)              │
│   ☐ Forge lottery — server fn + button (1 day)                   │
│   ☐ Squad treasury — entity + donate flow + buff (2 days)        │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│ Phase 4 — Client cleanup (1 day)                                 │
│   ☐ Remove "GOLD CAPPED" UI (UIOverlay, RunStatsBox)             │
│   ☐ Remove HUD score cap mirror (Game.js)                        │
│   ☐ Remove PickupSystem.js endless gold clamp                    │
│   ☐ Update RunStatsBox to show new sinks                         │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│ Phase 5 — In-game communication (1 day)                          │
│   ☐ S6 tooltip in Hub: "Why did the formula change?"             │
│   ☐ Prestige relics tutorial card                                │
│   ☐ Discord post w/ before/after score examples                  │
└──────────────────────────────────────────────────────────────────┘
```

**Total estimated work:** ~10 dev-days. Tight but achievable by May 18.

---

## 7. Risks & monitoring

### Pre-launch concerns

| Risk | Mitigation |
|---|---|
| Whales hoard gold pre-S6 expecting prestige | Announce prestige early — gives them a goal, not a waste |
| Score formula projections wrong → top runs hit 5M | `SCORE_HARD_CEILING = 2.5M` stays. Plus admin tool can soft-delete + adjust formula |
| Endless time-decay frustrates loyal long-run players | Honeymoon stays 1.0× for 10 min. The decay only bites on 25+ min sessions |
| New sinks bug-out and burn gold without granting | Wrap each sink in idempotent server fn with `TokenSpendLog` audit trail (already standard pattern in `purchaseSku`) |

### Post-launch monitoring (first 2 weeks)

Daily checks via admin dashboard:
- **Top 10 leaderboard composition** — if dominated by one character/build, hotfix
- **Average gold/run by character** — Synthbeats should be ~1.3× the median, not 3×
- **Sink throughput** — track gold spent per sink per day. If lottery sees >50% of gold flow it means cosmetics & prestige are too expensive
- **Endless run length distribution** — should bell-curve around 8–15 min, not bimodal at 30+ min

If any metric drifts, hotfix the *specific* lever (no need to revert the whole package).

---

## 8. Locked decisions (2026-05-07)

1. **Endless time-decay** — ✅ Curve approved as designed (1.0× for first 10 min → 0.25× floor at 40+ min).
2. **Prestige cost** — ✅ **Flat 1.5M per relic, same for every relic.** No tiered pricing — fairness for all players over whale-friendly economics. (Casual players prestige at their own pace; whales don't get cheaper paths through "casual" relics.)
3. **Forge lottery** — ✅ 60% T1 / 30% T2 / 10% T3 drop weights approved.
4. **Squad treasury buffs** — ✅ **Buffs last 1 full week (= one war cycle).** Donations made during week N apply to all of week N+1's wars and run gold drops, then expire and reset.
5. **Existing gold + fragment piles** — ✅ **Grandfathered in.** Players keep every gold piece AND every relic fragment earned in S5. They earned it; we don't claw it back. (Whales who stockpiled early just get a head-start on prestige relics, which is fine — the sinks are deep enough to absorb it.) Fragments specifically are addressed by Prestige (gold + frag cost, §5a) and Lottery (gold OR frag cost, §5b) — both added 2026-05-08 after audit revealed L5-relic players sitting on 300–600+ dead fragments.
6. **Sink rollout pace** — ✅ **All three sinks ship simultaneously at S6 launch (May 18).** No staggered rollout — players need the full sink package available from day 1 so the cap-removal doesn't outpace the absorption capacity.

All open decisions resolved. Ready for Phase 1 implementation.

---

*This doc supersedes the "minimum viable launch" recommendation in `S6_BALANCE_AUDIT.md` §4. The minimum-viable plan was written before cap removal was scoped — with caps removed, the full balance package is required.*