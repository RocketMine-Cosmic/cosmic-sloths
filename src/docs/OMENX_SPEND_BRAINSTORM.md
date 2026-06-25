# OMENX Spend Brainstorm — S7+ Sinks

**Status:** Planning doc, not committed. Goal: identify new compelling OMENX sinks to lift weekly spend (which feeds the leaderboard pool, staff payouts, kill pool, squad champions, etc.).

**Date:** 2026-06-24 · **Code review pass:** 2026-06-25 (read `purchaseSku`, `spendGold`, `LevelUpModal`, `GameOverModal`, `skuMap.js`, `forgeAction`, `MysteryForgeCard`, `Loadouts.jsx`, `GameEngine.js` damage/death/revive paths)

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

**Engine integration — VERIFIED (GameEngine.js read 2026-06-25):**
- `applyUpgrade(upgrade)` (line 1239) delegates to `applyUpgradeLogic`, which runs evolution + synergy checks and decrements `pendingStarterLevelUps` for Squad Meteor's 10-stack pattern.
- **There's already a working precedent for multi-pick chains:** `pendingStarterLevelUps` (line 469) hands out 10 sequential level-ups in Squad Meteor. Each pick fires the modal again via `engine.levelUp()`. So Pick 2 / Pick All can reuse this exact pattern: set `pendingPickBoostPicks = 1` (for Pick 2) or `2` (for Pick All — first pick is free, next N are bonus), decrement on each `applyUpgrade`, re-call `levelUp()` from the same choice pool.
- **Choice pool re-roll question:** Squad Meteor re-rolls choices each chained pick. For Pick 2 / Pick All we should NOT re-roll — the player paid for the 3 they SAW. This means storing the original choices on the engine (`this._lockedMultiPickChoices`) and bypassing `generateChoicesLogic` for the chained picks. Cleaner than it sounds.
- **Banished-upgrade interaction:** `banishedUpgrades` (line 444) is a Set — already filters subsequent picks. Pick All cleanly avoids dupes because each pick removes from the offered set.

**Estimated dev:** 1–1.5 days. Touches `LevelUpModal` (UI + state), `purchaseSku.applyGrant` (new case), `saveScore` (per-run reset), PlayerSave schema (+3 fields: `pickBoostsUsedThisRun`, `weekly_pick_boosts`, `weekly_pick_boosts_week`). **Also** needs the new SKU IDs registered in the OmenX dev portal first (otherwise `purchaseSku` returns 404 SKU_NOT_FOUND — line 661).

---

### 2. 🥈 Run Resurrection — **ALREADY FULLY WIRED**
**The pitch:** After dying mid-run, spend OMENX to revive at the spot with full HP and i-frames.

> ✅ **Verified in `GameEngine.js` (lines 673–679, 2026-06-25):** when `player.hp <= 0`, if `omenxBalance >= 4` AND `!hasRevivedWithTokens`, the engine pauses and fires `callbacks.onDeathPrompt`. The 4 OMENX cost is hard-coded. One revive per run is already enforced via the `hasRevivedWithTokens` flag. **This is shipped, not new work.**

**What's actually shippable here:**

**A. Escalating cost curve.** Current 4 OMENX flat is great for sector runs but trivial for a 45-minute endless save. The escalation could attach to `engine.time` directly:
```js
const reviveCost = engine.time < 300 ? 4
                 : engine.time < 600 ? 8
                 : engine.time < 1500 ? 15
                 : 25;
```
Requires updating the `>= 4` check at line 675 and the `onDeathPrompt` callback signature to carry the cost. Plus a new SKU `ingame-revive-tier-2/3/4` in OmenX dev portal (or just one SKU with quantity multipliers — needs an OmenX docs read on quantity semantics).

**B. Cap per WEEK across runs.** Currently it's only per-run. A weekly cap (e.g. 5 revives/week) prevents whales auto-reviving every Cosmic death. Lives on PlayerSave (`weekly_revives` + `weekly_revives_week`, same pattern as `weekly_sector_kills`).

**C. Disable in Squad Wars / Raid / Meteor.** Currently the engine doesn't check arena before offering revive — needs an arena-id guard at line 675 (Raid is `world_boss_arena`, Meteor is `quantum_meteor`).

**Pricing:** Recommendations above. Cap: 5/week.

**Estimated dev:** 0.5 day for the cost curve + arena guard + weekly cap. Most of the work is the SKU registration + UI copy. **No engine-resume rebuild needed — it already works.**

---

### 3. 🥉 Pre-Run Loadout Re-roll
**The pitch:** Before a run starts, your loadout's pool bias and starting upgrade are fixed. Spend OMENX to **re-roll your starting weapon** (random from any unlocked) OR **swap arena modifier** (e.g. +50% gold, +25% XP, +1 weapon slot at start).

> ⚠️ **Overlaps with `bias-respec`** (`IN_GAME_SKUS.biasRespec`, ~10 OMENX, "clears all allocated pool-bias points"). Existing players already pay OMENX to mess with pool bias pre-run.
>
> ⚠️ **Loadouts.jsx has zero OmenX integration today** (verified 2026-06-25). It's pure local-state preset save/swap — `SaveManager.save` only, no `purchaseSku` calls. The pool-bias respec lives in a sibling component (`PoolBiasPanel`). So this isn't a "small addition" — we'd be introducing the first OMENX charge to Loadouts.

**Scope discipline:** drop the "arena modifier swap" idea entirely (extending arenas is a feature on its own). Stick to **one** specific addition: a "🎲 Random starting weapon — 5 OMENX" button next to the existing "Apply & Go" on each loadout slot. Single SKU, single button, no other state changes.

**Pricing:** **5 OMENX** per re-roll. No weekly cap needed at this price — natural cap is "you have to play a run to use it again."

**Implementation:**
- New SKU `ingame-loadout-reroll` registered in OmenX dev portal.
- `Loadouts.jsx` `handleApply` augmented with optional `randomizeStartingWeapon: true` that calls `purchaseSku` first, then on success picks a random weapon from `effectiveUnlockedCharacters`'s available weapon pool before nav to `/?slide=1`.
- Falls under existing `ingame-` prefix in `purchaseSku.IN_RUN_SKU_PREFIXES` — automatically gets the 1-attempt retry + circuit-breaker fail-open.

**Estimated dev:** 0.5 day (smaller than originally claimed — UI change is minimal, no new server function).

---

## Tier 2 — Strong candidates (medium dev, high engagement)

### 4. Weekly Forge Lottery — Star Fragment Gamble — **PROPOSAL WAS WRONG**

**Original premise:** "Existing MysteryForgeCard is gold → fragment chance." **This is wrong.** (Read 2026-06-25.)

What actually exists:
- **`MysteryForgeCard.jsx`** = the **Astral Lab** UI (component name is legacy). Gold → random permanent stat buff with hard caps. Endgame whale prestige sink. S6+ only.
- **`forgeAction` action: `mysteryForge`** = the real Mystery Forge. 5,000 gold OR 50 fragments → one random unlocked weapon augment T1/T2/T3 (weighted 60/30/10) for a chosen weapon. S6+ only. Tier prereqs enforced (rolling T3 when you only own T1 gives T2). UI lives somewhere we haven't located in this pass.
- **Convert flow** in `ForgePanel`: 10,000 gold → 1 fragment, capped 30/day.

So we already have TWO gold-driven lottery-style forge sinks. **The OMENX angle that's actually missing:** an OMENX → **fragments directly** flow, bypassing the 30/day convert cap. That's a legitimately new sink because right now whales who want to forge augments faster are gated entirely by the 30/day gold-conversion cap.

**Revised proposal:** "OMENX → Star Fragments express lane"
- 1 OMENX = 1 fragment, NO daily cap (or weekly cap of 100).
- Adds a parallel button on the Convert tab in `ForgePanel.jsx`.
- New SKU `ingame-fragments-buy` (under `ingame-` prefix → free-grant on outage protection).
- New grant `type: 'fragments_buy'` in `purchaseSku.applyGrant` — increments `save.starFragments`.

**Pricing:** 1 OMENX per fragment, weekly cap 100.

**Why:** whales who already converted their daily 30 still want to forge faster. Currently they hit the wall and stop spending. This unblocks them.

**Estimated dev:** 0.5 day. One SKU, one grant case, one button on `ForgePanel`.

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
| **This week** | #1 Pick 2 / Pick All (NEW) | Player-requested, contained, instant satisfaction. Easy win. |
| **This week (bonus)** | #2 Revive escalation (EXISTS) + #4 Fragments express lane (NEW) | Both are 0.5d. Together with #1 = three sinks in one patch. |
| **Next week** | #3 Loadout Re-roll (NEW) | 0.5d cleanup ship. |
| **W27 / S7 mid-season** | #5 Squad Buffs | Extend existing `Squad.active_buff_tier` field set. |
| **W28** | #6 NFT Re-Skin | Cosmetic-only, low priority. |
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

Two-pass read. First pass: `purchaseSku.js`, `spendGold.js`, `LevelUpModal.jsx`, `GameOverModal.jsx`, `skuMap.js`. Second pass: `forgeAction.js`, `MysteryForgeCard.jsx`, `pages/Loadouts.jsx`, `GameEngine.js` lines 300–1570.

Findings that changed the doc:

1. **Pricing overhauled.** Original suggestions (Pick 2 ~25, Pick All ~75, Revive 50/100/200, Loadout reroll 20, Squad Buffs 200–500) were 3–10× out of band with the existing ladder. Revised everything down.
2. **#2 Revive is ALREADY FULLY WIRED** in `GameEngine.js` lines 673–679 — `omenxBalance >= 4`, `hasRevivedWithTokens` flag, `onDeathPrompt` callback. The original doc treated this as new work; it's an ESCALATION + arena-guard refresh only.
3. **`bias-respec` already exists** — #3 Loadout Reroll is now scoped to *starting-weapon randomization only*, not another bias clear. Also confirmed `Loadouts.jsx` has zero existing OmenX integration (first OMENX charge there).
4. **#4 was FACTUALLY WRONG.** The "Mystery Forge" component name is misleading — `MysteryForgeCard.jsx` is actually the **Astral Lab** (gold → permanent stat buff). The real Mystery Forge lives in `forgeAction.js` (`action: 'mysteryForge'`, 5k gold or 50 frags → random augment). Both already exist. Replaced the proposal with a genuinely missing sink: **OMENX → fragments express lane** that bypasses the 30/day gold-convert cap.
5. **Squad already has buff fields** — #5 must extend `Squad.active_buff_tier` / `pending_buff_tier`, not duplicate.
6. **Engine multi-pick pattern verified.** `pendingStarterLevelUps` (GameEngine line 469, Squad Meteor) is the exact mechanism Pick 2 / Pick All should reuse — decrement-then-re-call-`levelUp()`. With one critical tweak: don't re-roll the choice pool between chained picks (Pick 2 = pay for the 3 you SAW, not a fresh roll).
7. **`banishedUpgrades` is already a Set** — Pick All naturally dedupes without extra work.
8. **In-run SKU routing matters.** All new SKU IDs must use the `ingame-` prefix in `purchaseSku.IN_RUN_SKU_PREFIXES` (line 85) for the 1-attempt retry, 8s timeout, and circuit-breaker free-grant fallback.
9. **OmenX dev portal registration is a prerequisite** — `purchaseSku` returns 404 SKU_NOT_FOUND for unknown SKUs (line 661).
10. **Total Tier 1 dev cost dropped from ~3 days to ~2 days** — because revive is shipped and the fragment express lane is shorter than the lottery proposal.

Net: Tier 1 ranking changed. Original = #1 / #2 (revive) / #3 (loadout). New = **#1 Pick 2 (1.5d) + #2 Revive escalation (0.5d) + #4 Fragments express lane (0.5d) shipped together**, all three in a single patch.