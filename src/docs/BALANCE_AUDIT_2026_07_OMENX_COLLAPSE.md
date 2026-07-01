# OMENX Spend Collapse — Full Audit (2026-07-01)

**This is the actual audit.** The other 6 docs describe the systems. This
one answers the question that matters: *why is OMENX spend falling off a
cliff while gold spend is climbing, and what do we do about it?*

Without OMENX spend the game shuts down. That's the frame.

---

## 1. The numbers

Aggregated from `TokenSpendLog` + `GoldSpendLog` (live DB, 2026-07-01).
`GoldSpendLog` entries older than ~10 days have been purged by
`scheduledPurgeOldSpendLogs`, so the gold column only exists from W25
onwards — but the OMENX collapse trend is clean.

| Week | OMENX spent | Active players | OMENX / active | Unique OMENX spenders | Gold spent | Gold spenders |
|---|---:|---:|---:|---:|---:|---:|
| W21 (2026-05-19) | **43,007** | 63 | **683** | 51 | (purged) | — |
| W22 (2026-05-26) | 36,132 | 55 | 657 | 43 | (purged) | — |
| W23 (2026-06-02) | 43,885 | 49 | **896** ← peak | 39 | (purged) | — |
| W24 (2026-06-09) | 20,733 | 44 | 471 | 39 | (purged) | — |
| **W25 (2026-06-16) — S7 LAUNCH** | **14,052** | 41 | **343** | 34 | 71,045,187 | 31 |
| W26 (2026-06-23) | 18,584 | 40 | 465 | 33 | 76,478,651 | 35 |
| W27 (2026-06-30, partial) | 9,553* | 31 | 308 | 28 | 23,985,886 | 21 |

*W27 is only 1 day in. Extrapolated to full week: ~66,800 OMENX — still down.*

**Headline:**
- OMENX weekly spend: **43k → 14k** in 5 weeks. **-67%.**
- OMENX per active player: **683 → 343**. **-50%.** ← this is what matters
- Active players: **63 → 31**. **-51%.** ← this is the OTHER thing that matters
- Gold spend since W25: **71M / 76M / 24M** per week (W27 partial). Massive.

**Both curves are down.** Fewer players AND each player spending less OMENX.

---

## 2. Where the OMENX spend went — category breakdown

Split every OMENX spend into 3 buckets:

- **Consumables** = `ingame-revive`, `-reroll`, `-banish`, `-xp-buff`, squad-ults
- **Progression** = `stat`, `weapon`, `talent`, `bias-respec`, `talent-respec`
- **Cosmetics** = skins/trails/kill-effects

| Week | Consumables | Progression | Cosmetics | Cons. % | Prog. % |
|---|---:|---:|---:|---:|---:|
| W21 | 17,525 | **21,127** | 313 | 41% | **49%** |
| W22 | 24,300 | 11,802 | 0 | 67% | 33% |
| W23 | **27,952** | 15,263 | 630 | 64% | 35% |
| W24 | 11,913 | 8,820 | 0 | 57% | 42% |
| W25 | 9,553 | **4,499** | 0 | 68% | **32%** |
| W26 | 10,157 | 8,417 | 0 | 55% | 45% |
| W27 | 2,723 | 6,830 | 0 | 29% | 71% |

**Two important reads:**

### 2a. Progression OMENX collapsed hardest

W21 = 21,127 OMENX on stats/weapons/talents. W25 = **4,499**. **-79%.**

This is the dangerous one. Consumables are a run-by-run impulse — they'll
come back with engagement. Progression spend is *conviction*: "I'm invested
in this account, I'll spend OMENX to skip grind." When players stop paying
to advance permanent upgrades, they're telling us **the grind is no longer
attractive to shortcut**. Either because:
- The gold path is now competitive (see §3),
- Or they've reached the cap and there's nothing left to buy,
- Or they've disengaged and don't care to progress.

### 2b. Cosmetics OMENX is functionally zero

Only 2 weeks (W21, W23) had any cosmetic spend at all — and both under
650 OMENX total. **We have zero cosmetic revenue.** Explanation in §4.

### 2c. Progression spenders (unique wallets) fell off a cliff

| Week | Total OMENX spenders | Consumers only | Progression spenders |
|---|---:|---:|---:|
| W21 | 51 | 46 | **20** |
| W22 | 43 | 43 | 11 |
| W23 | 39 | 38 | 12 |
| W24 | 39 | 38 | **6** |
| W25 | 34 | 33 | **5** |
| W26 | 33 | 31 | 6 |
| W27 | 28 | 27 | **1** |

Progression spenders went from **20 → 1**. This is essentially "a
handful of whales" — and the rest of the base has stopped buying
progression entirely. If those 1-6 whales quit, progression OMENX = 0.

---

## 3. Gold vs OMENX purchases — the substitution problem

`spendGold/entry.ts` and `purchaseSku/entry.ts` both grant the same
permanent upgrades. Every upgrade is dual-priced:

| Upgrade | Gold | OMENX | Gold-per-OMENX ratio |
|---|---:|---:|---:|
| Stat/weapon lvl 1 | 1,000 | 5 | 200 |
| Stat/weapon lvl 5 | 16,000 | 80 | 200 |
| Talent T1 | 1,000 | 10 | 100 |
| Talent T3 | 16,000 | 40 | 400 |
| Skin tier 1 | 5,000 | 5 | **1,000** |
| Trail epic | 20,000 | 20 | **1,000** |

**Cosmetics are 5× cheaper per OMENX than progression is.** That's fine
for whale acquisition BUT combined with §3a below, it means the OMENX
price point is only compelling when the player is **gold-poor**.

### 3a. Gold farming has become too productive

Look at how much gold is now sloshing through the economy:

| Week | Gold spent | Astral | Relic prestige | Weapon/Stat/Talent | Squad treasury |
|---|---:|---:|---:|---:|---:|
| W25 | 71.0M | 10.7M | **39.5M** | 13.0M | 7.7M |
| W26 | 76.5M | **25.4M** | 30.0M | 12.6M | 8.4M |
| W27 (partial) | 24.0M | 1.3M | 12.0M | 9.6M | 1.1M |

31 gold-spenders in W25 spending **71M gold** = **2.3M gold per player per week**.

At the current 200 gold/OMENX ratio for progression upgrades, that's
**11,500 OMENX-equivalent per gold-spender per week** — buried in gold spend.

The reason OMENX progression died: **players can now farm enough gold to
buy every permanent upgrade in a couple of days.** The OMENX shortcut is
irrelevant. See these signals:

- **Relic prestige is 30-40M gold/week.** Prestige only exists in S6+, and
  it's now the biggest gold sink. That means whales are moving gold into
  prestige, which does nothing for OMENX flow.
- **Astral Lab pulled 25M gold in W26.** This is deliberate design as the
  "endless gold sink" — good — but it's soaking gold that could have been
  a reason to buy OMENX for shortcuts if it didn't exist.
- **Squad Treasury pulled 7-8M/week.** Similar story — new gold sink, but
  it doesn't route through OMENX at all.

**Diagnosis:** We built out the gold economy (Astral, Prestige, Treasury,
Forge) faster than we built OMENX-only demand. Every new gold sink pulls
whale attention away from OMENX purchases.

---

## 4. Why cosmetics OMENX = 0

The `TRAIL_COSMETICS`, `KILL_COSMETICS`, and `SKIN_COSMETICS` tables in
`Constants.js` list an OMENX price for every item. But cosmetic OMENX
revenue is **0 for 5 of the last 7 weeks**. Why:

1. **The Wardrobe page shows gold price by default.** OMENX cost is either
   hidden or secondary. Need to verify UI behavior on `Wardrobe.jsx` /
   `WardrobeCard.jsx` — see §7.

2. **Gold cost is 5× less "expensive-feeling" than OMENX.**
   Trail epic: 20,000g OR 20 OMENX. At the ratios above, gold feels like
   "a few good runs" and OMENX feels like "real money". Rational players
   pay gold every time.

3. **Chest cosmetics (Epic / Mythic) are not sold for OMENX at all.** Per
   `COSMETICS_REWORK_DESIGN.md`, chest cosmetics are unlockable only via
   the VIP chest / seasonal rewards — no direct OMENX purchase path. So
   even a whale willing to pay OMENX for the *good* cosmetics can't.

4. **Seasonal skins are missable-forever.** Great for FOMO on the current
   season, but generates zero revenue from missed seasons — no vault, no
   re-release, no OMENX buyback.

---

## 5. Why active player count fell 51%

W21 = 63 actives, W27 = 31 actives. This is the multiplier on the
per-player collapse. Suspected causes:

1. **S6 → S7 launch on W25 (2026-06-16).** Should have been a spike, not a
   dip. Patch notes cover shield nerf, HP curve, HEAT bonus, and the new
   kill leaderboard. But the launch WEEK (W25) saw:
   - 41 actives (down from 44)
   - 14,052 OMENX (down from 20,733)
   No visible bump. Suggests S7 either wasn't compelling enough OR players
   who dominated S6 with shield builds churned before trying the new meta.

2. **Meta rebalance without new content.** S7 patch notes explicitly say
   "No save wipe. No relic reset. Just balance." — but there's also **no
   new characters, no new sectors, no new weapons, no new cosmetics that
   the whole player base can chase**. Balance-only patches don't drive
   player return.

3. **OMENX pool re-split (W25).** Weekly score payout dropped from 20% → 15%
   of spend. Top-30 earners saw their weekly OMENX prize drop by ~25%.
   That's a direct disincentive to top players (documented risk in the
   re-split doc, §"Top-player backlash"). Combined with the meta shakeup,
   the top of the leaderboard may have partially disengaged.

4. **No S8 tease.** No visible "coming next" hook. If players finish
   prestiging in S7, they have no forward path.

---

## 6. The real diagnosis — plain language

**We accidentally built a game where gold farming is the fun part and
OMENX is barely necessary.**

- The gold economy has THREE endgame sinks (Astral, Prestige, Treasury) all
  added in S6+. They're deep, expensive, and *feel like progress*.
- The OMENX economy has ONE compelling category (in-run consumables) that
  players use reflexively during a run but doesn't scale.
- Progression OMENX purchases died because gold farming outpaces the
  OMENX-progression price curve.
- Cosmetic OMENX purchases died because gold is a valid alternative and
  the top cosmetics aren't even sold for OMENX.
- Player count dropped 51% because S7 launched with no new content, only
  balance changes + a payout REDUCTION for top earners.

The revenue system is upside-down: the assets that USE OMENX (consumables)
have no aspiration, and the assets that generate aspiration (permanent
upgrades, cosmetics, prestige) can all be bought with farmed gold or aren't
sold at all.

---

## 7. Recommended interventions, ranked by expected impact

### Immediate (this week — pure UI / config, no gameplay changes)

**A. Make OMENX the *featured* purchase path on the Wardrobe.**
Verify `WardrobeCard.jsx` — the OMENX button should be primary, gold
button secondary. Show OMENX price first, gold price as "or pay X gold".
This is the cheapest single intervention with a real chance to move numbers.

**B. Increase gold prices on the top-tier cosmetics (leave OMENX alone).**
Legendary trails at 30,000g feels cheap when players are sitting on 5M gold.
Bump legendary trails to 200,000g, epic kill effects to 250,000g. OMENX
prices unchanged (still 20-30 OMENX). This restores the "gold is a slow
alternative, OMENX is the fast way" narrative.

**C. Add cosmetic OMENX-only exclusives.** At least 2-3 cosmetics per
category that CANNOT be bought with gold — OMENX-only, no seasonal gate.
Simple example: a "Void Trail" and a "Cosmic Aura" kill effect priced at
50 OMENX each. Zero-effort art if you reuse existing assets with a color
shift.

### Short-term (next 1-2 weeks — one small backend change each)

**D. Add an OMENX-only "instant prestige" shortcut.** Right now prestige
costs 7.5M gold + 500 frags per relic. That's ~32 casual weeks. Add an
OMENX button next to each prestige level: pay 30 OMENX per PL to skip. A
completionist whale paying 30×5×5 = 750 OMENX to fully prestige an entire
account. New pure-OMENX sink.

**E. Rebalance Astral Lab cost curve UPward.** Current 1.4× growth per
pull is generous. Bump to 1.5× — pull 10 goes from ~413k to ~577k, pull 15
from 2.2M to ~4.4M. Same "endless whale sink" narrative, but slower gold
drain = players have gold left over to consider OMENX progression again.

**F. Cosmetic "reroll" for OMENX.** Players who got a duplicate seasonal
skin should be able to reroll it via OMENX (say, 50 OMENX per reroll). No
new art, just a config flag on the skin table.

### Medium-term (next 2-4 weeks — one focused feature each)

**G. Chest cosmetics need an OMENX bypass path.** Per §4.3, chest cosmetics
are the aspirational tier but aren't for sale. Add a direct-purchase price
in OMENX at ~3-5× the "expected pull cost" for players who missed a chest
season. This is the single biggest untapped OMENX category on the roadmap.

**H. Ship an S8 tease + a genuinely new content drop.** Balance patches
don't retain. Even one new character or one new sector reactivates the
player base. Look at the active-player curve — it needs a concrete reason
to come back before W29.

**I. Refresh the daily OMENX-featured shop.** A daily rotating "featured
item" that's OMENX-only and time-limited (24h). Costs nothing in art — just
rotates existing SKUs. Creates a daily reason to log in AND to hold OMENX.

### Structural (harder, higher upside)

**J. Undo or halve the W25 weekly-score pool cut.** Going from 20% → 15%
of spend was intended to fund the kill pool AND extend runway. But active
players fell 51% since. The lost engagement from top players may cost more
in future spend than the 5% saved. Consider restoring to 18% score + 5% kills.

**K. Introduce OMENX-only relic slots or perks.** Right now every
permanent upgrade is dual-priced. A single "exclusive" perk tree accessible
only via OMENX (e.g. a 6th relic slot; a cosmetic-only pilot title tier)
creates a category of purchase that gold can never touch.

---

## 8. What to watch weekly

Simple dashboard I recommend building (all queries already possible against
existing entities):

1. `OMENX spend / active player` — top-line health metric. Target: hold ≥ 500.
2. `OMENX progression spenders / week` — target: > 15.
3. `OMENX cosmetic spend / week` — target: > 2,000 (currently ~0).
4. `Gold spend / OMENX spend ratio` — currently gold is doing ALL the work.
   Target: bring this ratio down by making gold sinks scale or OMENX sinks compelling.
5. `Active player count 7d MAA` — target: back to 55+ within 4 weeks.

If any of 1-3 drop again next week without action, escalate.

---

## 9. The single most important sentence

**Gold has three deep endgame sinks. OMENX has none.** Fix that, and the
spend curve inverts. Everything in §7 is subordinate to that principle.