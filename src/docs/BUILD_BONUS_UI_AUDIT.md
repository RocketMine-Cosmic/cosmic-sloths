# Build Bonus UI — Audit & Fix Plan

**Filed:** 2026-05-31 (Simon "JackM" Discord report)
**Owner:** TBD
**Status:** Planning

---

## 1. The bug

Top of the Cosmic Armory page shows two summary pills:

- **Gold Multiplier** — displaying `--5%` (double-minus)
- **Relic Fragment Bonus** — displaying `--5%`

Simon owns a **legendary NFT** which should grant a **positive** gold/fragment bonus. The double-minus is almost certainly:

1. A string template doing `-${value}%` while `value` is already negative (`-5`), producing `--5%`, OR
2. The value being read from the wrong source (e.g. a penalty field) and then negated again for display.

Either way: the pill is showing the wrong number and the wrong sign.

---

## 2. Root cause — what the pills should actually show

The pills are meant to be a **player-facing summary of every stat bonus currently in effect**. Right now they only attempt to surface NFT-derived bonuses, and they get even that wrong. The audit below lists **every** bonus source in the game so the pills can be rebuilt to actually reflect the player's real build.

### 2.1 Stat-bonus sources currently in the codebase

Each entry = (where it's stored / where it's applied / current UI surface).

| # | Source | Stored in | Applied in | Shown in UI? |
|---|---|---|---|---|
| 1 | Permanent stat upgrades | `save.permanentUpgrades` | `GameEngine.constructor` | ✅ Permanent tab |
| 2 | Weekly stat upgrades | `save.weeklyUpgrades` | `GameEngine.constructor` (×0.66 stack factor on S6+) | ✅ Weekly tab |
| 3 | Seasonal stat upgrades | `save.seasonalUpgrades` | `GameEngine.constructor` (×0.66 stack factor on S6+) | ✅ Seasonal tab |
| 4 | Permanent talents | `save.permanentTalents[charId]` | `GameEngine.constructor` | ✅ Talent tree |
| 5 | Weekly talents | `save.weeklyTalents[charId]` | (×0.66 on S6+) | ✅ Talent tree |
| 6 | Seasonal talents | `save.seasonalTalents[charId]` | (×0.66 on S6+) | ✅ Talent tree |
| 7 | Character mastery (all unlocked tiers) | `save.characterKills[charId]` → `getCharacterMastery` | `GameEngine.constructor` | ✅ Mastery page |
| 8 | Weapon mastery | `save.weaponKills` → `getWeaponStatsAndMastery` | `WeaponSystem` / `damageEnemy` | ✅ Weapon page |
| 9 | Equipped relics + relic levels | `save.equippedRelics`, `save.relicLevels` | `GameEngine.constructor` | ✅ Relics tab |
| 10 | **Relic prestige (S6+)** | `save.relicPrestige[relicId]` (PL1–PL5, +5% each, multiplicative) | `GameEngine.constructor` | ✅ Relic prestige badge |
| 11 | **Astral Lab / Mystery Forge buffs (S6+)** | `save.astralBuffs` | `GameEngine.constructor` (subject to caps) | ⚠️ Only forge card |
| 12 | Forge character augments | `save.forgeCharAugments[charId]` | `GameEngine.constructor` (`augBonus`) | ✅ Forge tab |
| 13 | **NFT gold multiplier** | `save.nftGoldMultiplier` | `GameEngine.constructor` (additive on S6+) | ❌ — broken pill |
| 14 | **NFT relic-fragment multiplier** | server-applied at pickup / saveScore time | server-side | ❌ — broken pill |
| 15 | VIP level (NFT-derived) | `save.vipLevel` | `GameEngine.constructor` (+1% dmg, +1% HP per level) | ⚠️ Only VIP badge |
| 16 | Equipped title buff | `save.titleBuff` (set from OmenX user record) | `GameEngine.constructor` | ⚠️ Only title card |
| 17 | Admin perk multiplier | `save.adminBuff.mult` | `GameEngine.constructor` (very small flat %) | ❌ |
| 18 | **Squad Meteor weekly buffs** | `save.squadMeteorBuffs` (damage/AoE/gold/CDR %) | `GameEngine.constructor` | ⚠️ Only squad meteor panel |
| 19 | **Squad Treasury active tier buff** | `Squad.active_buff_tier` (bronze/silver/gold/platinum) | server + engine | ⚠️ Only squad treasury panel |
| 20 | Session +50% XP buff (SKU) | `save.sessionBuffs.xpExpiry` | `GameEngine.update` | ⚠️ Pause modal only |
| 21 | Server-wide global XP buff | `save.globalXpBuff` (admin-set) | `GameEngine.constructor` | ⚠️ Pause modal only |
| 22 | Dynamic Difficulty current state | `engine.dynamicDifficulty.{speedMult, spawnRateMult}` | runtime only | ❌ (runtime) |
| 23 | Hard caps (S6+: 6.0 dmg / 8.0 gold / 4.0 area / 5.0 XP / 0.35 CDR floor) | constants | `GameEngine.constructor` | ❌ |

**Net effect:** the two "summary" pills at the top of Cosmic Armory cover **at most 2 of the 23 active bonus sources**, and they display them with the wrong sign. Players have no single place to see "what is my total build actually doing?".

---

## 3. What "fixed" looks like

### 3.1 Immediate fix — stop the `--5%` bug

- Find the source of the broken pill text (likely `pages/Upgrades` or a sub-component reading `save.nftGoldMultiplier`).
- Convert the stored value to a delta: pill should show `+10%` when `nftGoldMultiplier === 1.10` and `0%` when `=== 1.0`.
- Same for the relic-fragment pill (find which save field actually backs it — `nftFragmentMultiplier` or server-applied? Confirm before wiring).
- Hide / grey out the pill when the value is exactly 0 instead of showing `--0%`.

### 3.2 Real fix — replace the two pills with a real Build Summary panel

Single React component (e.g. `components/upgrades/BuildBonusSummary.jsx`) that reads `save` + live OmenX data and shows, grouped:

**Offensive**
- Damage multiplier total (with breakdown on click: perm + weekly + seasonal + talents + mastery + relics + relic prestige + astral + augments + title + VIP dmg + admin + meteor + squad treasury)
- Cooldown reduction total
- Crit bonus total
- Area multiplier total
- Projectile speed total

**Economy**
- Gold multiplier total (with NFT contribution called out)
- XP multiplier total (with +50% session buff + global XP buff called out separately when live)
- Luck total

**Defensive**
- Max HP total (with VIP HP called out)
- Armor total
- Regen total
- Magnet range total

**Buff sources (chips)**
- Equipped title: name + numeric contribution
- VIP level: number + dmg/HP delta
- Active session XP buff: time remaining
- Global XP buff: multiplier + time remaining
- Squad Meteor buffs: damage/AoE/gold/CDR percentages
- Squad Treasury tier: bronze/silver/gold/platinum + what it grants
- Admin perk (if any)

**Caps reached (warnings)**
- "Damage cap reached (6.0×) — further damage upgrades have no effect this run" when the player has stacked past the S6 caps. This is critical for whales — they currently have no way to know they've hit the ceiling.

### 3.3 Where the math lives

All the math is **already** in `GameEngine.constructor`. Refactor that constructor's bonus calculation into a pure function:

```
src/lib/buildBonuses.js
  computeBuildBonuses(save, characterId, arenaId, difficultyId)
    → { offensive: {...}, economy: {...}, defensive: {...}, buffs: [...], caps: [...] }
```

Then:
- `GameEngine.constructor` calls it instead of inlining 200 lines of stat math.
- `BuildBonusSummary` calls it to render the panel.
- Both surfaces are **guaranteed in sync** — no risk of UI drift.

This is the right refactor: the constructor today is 250+ lines of bonus aggregation that's both untestable and impossible to mirror in the UI without duplicating logic.

---

## 4. Implementation plan (in order)

1. **[1-line fix]** Patch the `--5%` template so the pill renders correctly. Ship same-day to stop the user-facing confusion.
2. **[Refactor]** Extract bonus math from `GameEngine.constructor` into `lib/buildBonuses.js`. Unit test against a few known save snapshots (Simon's legendary-NFT save is a great fixture).
3. **[New component]** Build `components/upgrades/BuildBonusSummary.jsx` consuming the new helper. Replace the two top-of-page pills with a "View Build Summary" button that opens a modal showing the panel.
4. **[Reuse]** Wire the same panel into:
   - PauseModal "Build Stats" section (currently shows a partial breakdown)
   - `RunStatsBox` post-run summary (so players can see what their bonuses contributed)
   - Game.jsx loadout review screen (pre-run sanity check)
5. **[Sources of truth]** Confirm the relic-fragment bonus pill — is it client-computed or server-applied at saveScore time? If server-only, surface it via `getPlayerNftsAndVip` and cache it on `save.nftFragmentMultiplier` so the UI has a clean field to read.
6. **[Caps display]** Add cap warnings when stacked multipliers exceed the S6 ceilings.

---

## 5. Files likely touched

- `pages/Upgrades` — replace pills with summary button + modal trigger
- `lib/buildBonuses.js` *(new)* — pure math, source of truth
- `components/upgrades/BuildBonusSummary.jsx` *(new)* — render panel
- `game/GameEngine.js` — replace inline math with call to helper
- `components/game/BuildSummary.jsx` — reuse new panel (currently partial)
- `components/game/RunStatsBox.jsx` — surface contributing bonuses
- Possibly `functions/getPlayerNftsAndVip` — expose fragment multiplier explicitly if not already in the payload

---

## 6. Out of scope (for this ticket)

- Rebalancing any of the bonus values themselves.
- Changing what's stored on `save.*` — purely a math-extraction + UI fix.
- Adding new bonus sources.

---

## 7. Acceptance criteria

- Simon (legendary NFT holder) sees `+25%` (or whatever the legendary tier grants) on his gold pill, not `--5%`.
- Opening the Build Summary modal shows every one of the 23 bonus sources from §2.1 that's currently active for that player.
- Pause-modal "Build Stats", post-run summary, and Cosmic Armory all read from the same helper and agree to the percent.
- When a stat hits its S6 cap, a yellow warning chip is shown next to it.
- The `GameEngine.constructor` no longer contains inline bonus math — it imports and calls `computeBuildBonuses`.

---

*Filed in response to Simon "JackM" Discord report attached to the request. Once approved, break into individual implementation tickets.*