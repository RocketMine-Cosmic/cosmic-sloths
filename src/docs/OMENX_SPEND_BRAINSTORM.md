# OMENX Spend Brainstorm — S7+ Sinks

**Status:** Planning doc, not committed. Goal: identify new compelling OMENX sinks to lift weekly spend (which feeds the leaderboard pool, staff payouts, kill pool, squad champions, etc.).

**Date:** 2026-06-24 · **Code review pass:** 2026-06-25 (read `purchaseSku`, `spendGold`, `LevelUpModal`, `GameOverModal`, `skuMap.js`)

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

**Proposed pricing & caps:** (calibrated against existing in-run SKUs in `skuMap.getConsumableCost`: reroll=2, banish=2–6, revive=4, xp-buff=10, squad-ult-full=10. The "~25/~75" first-pass numbers were way out of band with current pricing — players would buy banishes 4× over before touching these. New ceiling: ~8/15 OMENX.)

| SKU | OMENX | Effect | Limit |
|---|---|---|---|
| `ingame-pick-two` | **8** | Take 2 of 3 upgrades on next level-up | **5 per run, 25 per week** |
| `ingame-pick-all` | **15** | Take all 3 on next level-up | **2 per run, 10 per week** |

**Anti-abuse / server enforcement (concrete plan):**
- Add a new grant `type: 'pick_boost'` in `purchaseSku.applyGrant` switch (mirrors the existing `xp_buff` pattern — single-purchase grant, no rollover container needed).
- `PlayerSave.sessionBuffs` already exists (used for `xpExpiry`). Reuse it: `sessionBuffs.pickBoostQueue: [{ kind: 'pick2'|'pickAll', purchasedAt }]` — engine pops one when applied.
- Per-run cap can't live in `sessionBuffs` alone because that's used across runs. Either: (a) add `runId` to the entry and clear on run-end, or (b) add `PlayerSave.runState.pickBoostsUsedThisRun` reset on `saveScore`. Option (b) is cleaner — `saveScore` already touches run-scoped fields.
- Per-week cap = same shape as existing `weekly_sector_kills` (top-level PlayerSave field + `weekly_pick_boosts_week`).
- Both pick SKUs flow through the existing **in-run SKU path** in `purchaseSku.js` (`isInRunSku` check on line 86) — they get the 1-attempt retry, the 8s timeout, and the circuit-breaker free-grant fallback automatically. Just add the prefix `ingame-pick-` to the prefix list, or register them under the existing `ingame-` prefix.
- **Disabled in Squad Wars + Raid + Meteor** — needs an arena-id check in `LevelUpModal` (engine arena id available via `engineRef.current.arena.id` — see existing meteor/raid counter at line 262).

**UI integration points (read against actual `LevelUpModal`):**
- Two new buttons in the bottom button row (line 507 `flex flex-col sm:flex-row gap-3 md:gap-6`), alongside Reroll/Banish. Anti-mash protected via `useAntiMashCooldown(2000)` like the existing buttons.
- Greyed out via the same `omenxPurchasesDisabled` + cap-reached pattern as Reroll/Banish (lines 530–533).
- OMENX balance already displayed top-right (line 222) — reuse for cost preview.
- **Skip the separate OmenXConfirmation modal** — Reroll and Banish currently use direct-tap confirmation (no modal). Match that pattern; modal-on-every-pick would feel heavy on a level-up screen.

**Open question to resolve before build:** when Pick 2 / Pick All is active, does the engine call `onSelect` multiple times in sequence, or do we need a new `onSelectMany(choices[])` callback? The current `onSelect(choice)` handler in `GameEngine` runs the full upgrade-apply pipeline (evolution checks, synergy unlocks, etc.) — calling it N times back-to-back may be fine but needs an engine read.

**Estimated dev:** 1–1.5 days. Touches `LevelUpModal` (UI + state), `purchaseSku.applyGrant` (new case), `saveScore` (per-run reset), PlayerSave schema (+3 fields: `pickBoostsUsedThisRun`, `weekly_pick_boosts`, `weekly_pick_boosts_week`). **Also** needs the new SKU IDs registered in the OmenX dev portal first (otherwise `purchaseSku` returns 404 SKU_NOT_FOUND — line 661).

---

### 2. 🥈 Run Resurrection
**The pitch:** After dying mid-run, spend OMENX to revive at the spot with **50% HP** and **3s i-frames**. Once per run.

> ⚠️ **`ingame-revive` already exists** in `skuMap.IN_GAME_SKUS` at **4 OMENX**. Need to check the codebase whether it's wired up to actually revive (probably yes given Hub purchase logs from earlier this season). If it is, this isn't a new sink — it's a **pricing + UX refresh**. Read `GameEngine.js` for `revive`/`reviveCount` before building.

**If the existing revive is unwired:** ship the wiring. UX hooks into `GameOverModal` (currently shows save spinner → "Sloth Lounge" / "Try Again" buttons at line 70). Insert a "💀 Revive — N OMENX" button between save-confirmed and the two existing buttons. The modal already waits for `stats._serverConfirmed` before showing buttons — revive needs to fire BEFORE save commits (save would close the run), so it has to be in a separate pre-save modal phase.

**If it's already wired but flat-priced at 4 OMENX:** the proposed escalating curve makes sense for long endless runs, but needs server validation in a new `reviveRun` function (not the SKU's `applyGrant` — that runs after the player is already dead, no engine state to resume).

**Pricing (revised — assuming existing 4 OMENX flat is the floor):**
- Sector run, < 5 min in: **4 OMENX** (current)
- Sector run, > 5 min OR endless < 10 min: **10 OMENX**
- Endless 10–25 min: **25 OMENX**
- Endless 25 min+: **50 OMENX**

The earlier "50/100/200" suggestion was off by an order of magnitude — out of band with every other in-run SKU.

**Caps:** 1 per run (currently presumed enforced client-side; if not, server-enforced via PlayerSave). Per-week cap: 10.

**Disabled in:** Squad Wars, Raid, Meteor.

**Estimated dev:** 0.5 day if existing revive is wired (just pricing + GameOverModal copy); 2–3 days if we need to build the resume-from-death engine pathway from scratch. **Verify state of existing `ingame-revive` SKU before estimating.**

---

### 3. 🥉 Pre-Run Loadout Re-roll
**The pitch:** Before a run starts, your loadout's pool bias and starting upgrade are fixed. Spend OMENX to **re-roll your starting weapon** (random from any unlocked) OR **swap arena modifier** (e.g. +50% gold, +25% XP, +1 weapon slot at start).

> ⚠️ **Overlaps with `bias-respec`** (`IN_GAME_SKUS.biasRespec`, ~10 OMENX, "clears all allocated pool-bias points"). Existing players already pay OMENX to mess with pool bias pre-run. The new sink needs to be *additive* — a starting-weapon re-roll, not another bias clear, or this just splits existing spend.

**Why it works:**
- Pure variety play, no power creep.
- Lets players experiment without grinding to unlock everything.

**Pricing:** **5–8 OMENX** per re-roll (not 20 — `bias-respec` is ~10 and is a bigger commitment). 5 per week.

**Implementation:** lives in `pages/Loadouts.jsx`. New SKU `ingame-loadout-reroll`. Falls under the in-run SKU prefix list (or add a new prefix `ingame-loadout-`).

**Estimated dev:** 1 day. Lives in Loadouts page.

---

## Tier 2 — Strong candidates (medium dev, high engagement)

### 4. Weekly Forge Lottery — Star Fragment Gamble
**The pitch:** Existing MysteryForgeCard is gold → fragment chance. Add an OMENX version with **better odds + higher max payout** (e.g. 1–20 fragments instead of 0–5).

> 📌 **Need to read `MysteryForgeCard` + `forgeAction` before estimating.** I claimed 0.5 day without reading either — the odds table, the daily cap, and the existing roll UI all live somewhere I haven't audited. **Caveat the estimate until that read happens.**

**Pricing:** **20–30 OMENX** per pull, 7 pulls per week. Calibrate after seeing the existing gold-pull odds.

**Why:** Whales chase the 20-fragment jackpot. Casuals get a steady drip. Existing infrastructure — just a new sku id and weighted table.

**Estimated dev:** TBD — read `MysteryForgeCard` and `forgeAction` first. Likely 0.5–1 day.

---

### 5. Squad-Wide Buffs (consumable, leader-only)
**The pitch:** Squad leader spends OMENX to activate a **48h squad-wide buff**:
- +10% gold for all members
- +1 XP/kill for all members
- +20% squad treasury rate

> ⚠️ **The `Squad` entity already has `active_buff_tier` / `active_buff_week_id` / `pending_buff_tier` / `pending_buff_week_id` fields** (see schema in snapshot — bronze/silver/gold/platinum tiers, week-scoped). That's the existing treasury-gold buff system. An OMENX-funded buff would either need: (a) an entirely separate field set (e.g. `omenx_buff_tier` / `omenx_buff_expires_at`) to avoid stomping the gold-treasury buff, or (b) a unified "buff slot" model where OMENX is just a faster way to activate the same buff. **Option (b) is simpler and prevents stacking exploits.**

**Why:** Existing squad treasury sink is gold-only. This adds an OMENX layer that benefits the whole squad → social pressure to donate.

**Pricing:** 200–500 OMENX depending on buff strength. Mutually exclusive with the existing treasury-gold buff (only one buff active per week per squad, however funded).

**Estimated dev:** 1–2 days. **Extends** existing `Squad` buff fields (don't add a parallel system). Touches `purchaseSku.applyGrant` (new `squad_buff` case), `Squad` validation in `squadActions`, and the week-rollover logic in `resetPeriods` that already handles `pending_buff_tier → active_buff_tier`.

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

1. **Should Pick All also re-roll the 3 options first?** No — pick what's offered, no further gambling.
2. **Does the player consume on offer or on confirm?** **Confirm**. Critical because `purchaseSku` is the actual charge point — it bills OMENX on call. Charge only when the player commits the picks.
3. **What's the weekly cap exactly?** Revised from earlier: **25 Pick 2 / 10 Pick All**. Whales blow through; that's the cap's purpose.
4. **Single-tap or modal confirmation?** Single-tap matches existing Reroll/Banish (`LevelUpModal` lines 519–561 — no `OmenXConfirmation` wrapper). Add 2s anti-mash cooldown via `useAntiMashCooldown` (same hook as Reroll/Banish).
5. **Show on game-over screen?** Skip — too gambly.
6. **NEW — Engine integration:** does `onSelect(choice)` cascade correctly when called multiple times (evolutions, synergies, weapon-slot cap, level-up queue in raid/meteor)? Needs an `UpgradeSystem.applyUpgrade` read before commit.
7. **NEW — Circuit breaker behavior:** when `purchaseSku` short-circuits to free-grant during an OmenX outage (lines 596–620), Pick boosts WILL be granted free. That's fine for player UX but worth noting in patch notes ("if OMENX is down, in-run upgrades may apply for free").

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

---

## What changed in this code-review pass (2026-06-25)

Read `purchaseSku.js`, `spendGold.js`, `LevelUpModal.jsx`, `GameOverModal.jsx`, `skuMap.js`. Findings that updated the doc:

1. **Pricing overhauled.** Original suggestions (Pick 2 ~25, Pick All ~75, Revive 50/100/200, Loadout reroll 20, Squad Buffs 200–500) were 3–10× out of band with the existing OMENX SKU price ladder (banish 2–6, reroll 2, revive 4, xp-buff 10, squad-ult-full 10, bias-respec ~10). Whales would never touch the new SKUs at those prices. Revised everything down.
2. **`ingame-revive` already exists at 4 OMENX** — #2 may be a UX refresh, not a new sink. Need to verify whether it's already wired in `GameEngine`.
3. **`bias-respec` already exists** — #3 Loadout Reroll needs to be *additive* (starting-weapon reroll, not another bias clear).
4. **Squad already has buff fields** (`active_buff_tier`, `pending_buff_tier`, etc.) — #5 must extend that schema, not duplicate it.
5. **In-run SKU routing matters.** All new SKU IDs must use the `ingame-` prefix (or be added to `IN_RUN_SKU_PREFIXES` in `purchaseSku.js` line 85) so they get the 1-attempt retry, 8s timeout, and circuit-breaker free-grant fallback. Otherwise an OmenX outage during a fight = bad UX.
6. **SKU registration in OmenX dev portal is a prerequisite** — `purchaseSku` returns 404 SKU_NOT_FOUND for unknown SKUs (line 661). Always register before shipping client UI.
7. **`OmenXConfirmation` modal was suggested for #1 but the existing Reroll/Banish flow doesn't use it** — went with single-tap + 2s anti-mash to match the pattern.
8. **Open questions added** about engine integration with multi-pick and circuit-breaker free-grant patch-note copy.

Net: same Tier 1 ranking, but the implementation plans are now grounded in the actual code paths and pricing.