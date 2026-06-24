# OMENX Spend Brainstorm — S7+ Sinks

**Status:** Planning doc, not committed. Goal: identify new compelling OMENX sinks to lift weekly spend (which feeds the leaderboard pool, staff payouts, kill pool, squad champions, etc.).

**Date:** 2026-06-24

---

## Context — Why we need more sinks

- New Outer Galaxy levels (S11–S20) increased gold flow + run engagement, but DevilsReject (and others in #feedback) have flagged that **OMENX spending has slowed**.
- Our reward pools are funded directly by weekly OMENX spend → fewer sinks = smaller payouts = weaker leaderboard chase.
- Current OMENX sinks:
  - SKU shop (cosmetics, character unlocks, NFT-adjacent items)
  - VIP tiers
  - Daily login boost
  - Squad treasury donations
  - Pool bias respecs
  - Relic crafting
  - Occasional limited-time skins (seasonal)

**Design rule for everything below:** must be a *meaningful upgrade in the moment*, not a permanent power creep that breaks Cosmic balance. Most sinks should be **per-run** or **per-week** consumables, never permanent stat boosts unless gated by season.

---

## Tier 1 — Build immediately (high appeal, low risk)

### 1. 🥇 In-Run "Pick 2" Upgrade Token *(DevilsReject's idea)*
**The pitch:** At a level-up, spend OMENX to take **2 of the 3** offered upgrades instead of choosing one. Optionally tier 2 = take all 3.

**Why it's perfect:**
- Solves an actual articulated player frustration ("I get so pissed when I get 3 good ones but have to choose 🤣").
- Felt instantly, every run. Visceral satisfaction.
- Non-permanent — burns on use.
- Naturally self-limiting: even if you buy 10, you're still capped by total level-ups in a run.

**Proposed pricing & caps:**
| SKU | OMENX | Effect | Limit |
|---|---|---|---|
| Double Pick | ~25 OMENX | Take 2 of 3 upgrades on next level-up | **3 per run, 15 per week** |
| Triple Pick | ~75 OMENX | Take all 3 on next level-up | **1 per run, 5 per week** |

**Anti-abuse:**
- Per-run cap enforced server-side via PlayerSave field (`runPickBoosts: { double: 0, triple: 0, runId }`).
- Per-week cap mirrors weekly_sector_kills pattern (top-level field with week_id).
- Triple Pick is the premium tier — limited enough that it never becomes the default.
- **Disabled in Squad Wars + Raid + Meteor** to keep competitive integrity (matches the same arenas excluded from gold/kill ledger).

**UI:**
- Two small icons appear on the LevelUpModal next to the 3 upgrade cards.
- Greyed out if cap reached, with tooltip "5 left this week".
- Confirmation modal showing OMENX cost (use existing `OmenXConfirmation`).

**Estimated dev:** 1 day. Touches `LevelUpModal`, `purchaseSku`, PlayerSave schema (+2 fields).

---

### 2. 🥈 Run Resurrection
**The pitch:** After dying mid-run, spend OMENX to revive at the spot with **50% HP** and **3s i-frames**. Once per run.

**Why it works:**
- Strongest in long endless runs and late-sector Cosmic deaths where the player invested 15+ min.
- Emotional spend — "I was so close" = instant impulse buy.
- Self-limiting (1 per run) so it can't snowball.

**Pricing:** Scales with run progress.
- Sector run: ~50 OMENX
- Endless (after 10 min): ~100 OMENX
- Endless (after 25 min): ~200 OMENX

**Caps:** 1 per run, 10 per week.

**Disabled in:** Squad Wars, Raid, Meteor.

**Estimated dev:** 1–2 days. New `reviveRun` function, GameOverModal change, server validation (the run continuation must be guarded — revive count goes into the next saveScore payload).

---

### 3. 🥉 Pre-Run Loadout Re-roll
**The pitch:** Before a run starts, your loadout's pool bias and starting upgrade are fixed. Spend OMENX to **re-roll your starting weapon** (random from any unlocked) OR **swap arena modifier** (e.g. +50% gold, +25% XP, +1 weapon slot at start).

**Why it works:**
- Pure variety play, no power creep.
- Lets players experiment without grinding to unlock everything.

**Pricing:** ~20 OMENX per re-roll, 5 per week.

**Estimated dev:** 1 day. Lives in Loadouts page.

---

## Tier 2 — Strong candidates (medium dev, high engagement)

### 4. Weekly Forge Lottery — Star Fragment Gamble
**The pitch:** Existing MysteryForgeCard is gold → fragment chance. Add an OMENX version with **better odds + higher max payout** (e.g. 1–20 fragments instead of 0–5).

**Pricing:** 30 OMENX per pull, 7 pulls per week.

**Why:** Whales chase the 20-fragment jackpot. Casuals get a steady drip. Existing infrastructure — just a new sku id and weighted table.

**Estimated dev:** 0.5 day.

---

### 5. Squad-Wide Buffs (consumable, leader-only)
**The pitch:** Squad leader spends OMENX to activate a **48h squad-wide buff**:
- +10% gold for all members
- +1 XP/kill for all members
- +20% squad treasury rate

**Why:** Existing squad treasury sink is gold-only. This adds an OMENX layer that benefits the whole squad → social pressure to donate.

**Pricing:** 200–500 OMENX depending on buff strength. Strict cooldown (1 buff active at a time).

**Estimated dev:** 1–2 days. New `SquadBuff` entity or extend `Squad` with buff fields.

---

### 6. NFT Re-Skin Pass *(week-long cosmetic swap)*
**The pitch:** Spend OMENX to **temporarily re-skin your character to any other NFT character you've seen another player use** for 1 week. Pure cosmetic, no stat change.

**Why:** Unlocks visual variety for non-NFT holders without diluting NFT value (no perks, no permanence). Acts as a "try before you buy" funnel toward actual NFT purchases.

**Pricing:** 100 OMENX / week.

**Estimated dev:** 1 day. Hooks into existing CosmeticPreview component.

---

### 7. Battle Pass / Season Pass
**The pitch:** Buy a one-time OMENX pass at S-start (~500 OMENX). Unlocks a 50-tier reward track filled by gameplay (kills, runs, victories). Free track = normal rewards. Pass track = exclusive titles, pilot icons, gold/fragment chunks, 1 exclusive character skin.

**Why:** Massive industry-proven sink. Anchors the season. Drives daily engagement.

**Risk:** Big design + content lift. Don't ship half-baked.

**Estimated dev:** 5–7 days for a quality pass. Defer to S8 unless we want it as the S7 headline.

---

## Tier 3 — Speculative / save for later

### 8. Cosmetic Squad Banner Editor
- Squad leader spends OMENX to customize squad banner (background, icon overlay, animated frame).
- Cheap (~50 OMENX), cosmetic only. Pure pride sink.

### 9. Personal Title Slot Customization
- Spend OMENX to **dye your equipped title** (color gradients, glow effects).
- Visible on leaderboard + squad chat.
- ~30 OMENX per dye.

### 10. Custom Pilot Voice Lines
- Pre-recorded "kill milestone" lines played to other squad members in chat.
- Pure flex sink. ~75 OMENX per pack of 5 lines.

### 11. End-of-Run Score Boost (NO)
- ❌ **Don't ship.** Pay to top the leaderboard = pay-to-win. Kills the integrity of payouts.

### 12. Permanent Stat Augments via OMENX (NO)
- ❌ **Don't ship.** That's the Forge's job (gold-gated, capped). OMENX → permanent stats breaks the F2P promise.

---

## Recommended sequencing

| When | Ship | Why |
|---|---|---|
| **This week** | #1 Pick 2 / Pick All | Player-requested, contained, instant satisfaction. Easy win. |
| **Next week** | #2 Run Resurrection | Highest impulse-buy potential. Complements #1. |
| **W27 / S7 mid-season** | #4 Weekly Forge Lottery + #5 Squad Buffs | Recurring sinks, lift weekly spend baseline. |
| **W28** | #3 Loadout Re-roll + #6 NFT Re-Skin | Lower priority but cheap to build. |
| **S8 launch** | #7 Battle Pass | Big seasonal anchor. Plan now, build during S7. |
| **Polish/filler** | #8–10 | Whenever there's idle capacity. |

---

## Open questions before building #1 (Pick 2 / Pick All)

1. **Should Pick All also re-roll the 3 options first?** I'd say no — pick what's offered, no further gambling.
2. **Does the player consume on offer or on confirm?** Confirm — if they open the dropdown and back out, no charge. UI shows a "Confirm purchase" tap before charging.
3. **What's the weekly cap exactly?** Suggest 15 Double / 5 Triple. Whales can blow through it; that's the point of the cap.
4. **Refund on accidental tap?** Yes — single-tap confirmation via OmenXConfirmation modal (we already have it).
5. **Show on game-over screen?** Possibly — "If you'd had Double Pick, you would've reached level X with build Y." Probably too gambly. Skip for now.

---

## Metrics to watch post-launch

- Weekly OMENX spend (TokenPool.total_spent) — target +30% baseline lift after Tier 1 ships.
- % of runs using at least 1 Pick boost.
- Cap hit rate — if >40% of buyers hit weekly cap, prices/caps too low; if <5%, too high.
- Effect on leaderboard pool size (should rise proportional to spend).
- Discord sentiment — DevilsReject should be the first @mention in the patch notes ✨

---

## Final thought

DevilsReject's "Pick 2 / Pick All" is the right first ship because it's:
- Concrete player feedback (not a guess at what they want)
- Tight scope (one modal, one new SKU pair)
- Self-balancing (capped per run + per week)
- Recurring spend (every run, not one-and-done like a skin)

Everything else here flows from the same principle: **make spending OMENX feel like a meaningful in-the-moment power-up, never a permanent edge**.