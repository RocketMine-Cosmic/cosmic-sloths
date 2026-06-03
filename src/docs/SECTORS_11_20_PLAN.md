# Sectors 11–20 — Design Draft

## Current state (sectors 1–10)

| # | Arena id      | Name             | Duration | Effect       |
|---|---------------|------------------|----------|--------------|
| 1 | station       | Azure Expanse    | 3:00     | neon_rain    |
| 2 | asteroid      | Mystic Cosmos    | 3:30     | fog          |
| 3 | nebula        | Ethereal Nebula  | 4:00     | fog          |
| 4 | void          | Crimson Void     | 4:30     | none         |
| 5 | plasma        | Solar Storm      | 5:00     | solar_flare  |
| 6 | crystal       | Emerald Galaxy   | 5:30     | neon_rain    |
| 7 | moon          | Shattered Core   | 6:00     | fog          |
| 8 | blackhole     | Abyssal Vortex   | 6:30     | solar_flare  |
| 9 | mothership    | Turquoise Drift  | 7:00     | neon_rain    |
| 10| dimension     | Rainbow Rift     | 7:30     | solar_flare  |

Each playable on Easy / Normal / Hard / Cosmic (defined in `DIFFICULTIES`). Tier 10 enemies + bosses spawn at the high end. Duration grows +30s per sector.

---

## Sectors 11–20 — concept table

Continuing **+30s per sector** (8:00 → 12:30). Endgame tier — sectors 11-15 = post-game, 16-20 = mythic/prestige tier. Effects rotate the existing 4 (`neon_rain` / `fog` / `solar_flare` / `none`) so we don't need new engine code on day one.

Background art is **uploaded and ready** (URLs below). Enemy sprites + boss sprite pending.

| #  | Arena id        | Name                  | Duration | Effect       | Theme / hook | Background |
|----|-----------------|-----------------------|----------|--------------|--------------|------------|
| 11 | galactic_core   | The Galactic Core     | 8:00     | fog          | Dust-choked Milky Way heart — the gate to the post-game tier. Slower spawns, larger tank mobs (Frost Wyrm / Lava Blob mix). | [MilkyWay_Starfield](https://media.base44.com/images/public/69de258a7e072380b89d66e3/069d2b286_MilkyWay_Starfield.png) |
| 12 | pillars         | Pillars of Creation   | 8:30     | neon_rain    | Hubble-style nebula pillars. Heavy ranged mix (Chain Eye / Crystal Vortex) — punishes glass cannons. | [Nubula_Pillars](https://media.base44.com/images/public/69de258a7e072380b89d66e3/5e69ed395_Nubula_Pillars.png) |
| 13 | saturnian       | Saturnian Reach       | 9:00     | none         | Field of ringed worlds + drifting asteroids. Rock Fragment / Stellar Starfish density spike. Clean visual — no effect — to read the chaos. | [Ringed_planets](https://media.base44.com/images/public/69de258a7e072380b89d66e3/28e6f3f01_Ringed_planets.png) |
| 14 | andromeda       | Andromeda's Edge      | 9:30     | fog          | Pristine spiral arms. Spawn density +10%, smaller swarm mobs only — pure DPS check. | [Spiral_Galaxy](https://media.base44.com/images/public/69de258a7e072380b89d66e3/4300cbae0_Spiral_Galaxy.png) |
| 15 | painters_spiral | The Painter's Spiral  | 10:00    | solar_flare  | Marbled blue-gold cosmic painting. Whispering Void / Ribbon Phantom heavy — ethereal, surreal tier. | [Majestic_spiral](https://media.base44.com/images/public/69de258a7e072380b89d66e3/b2890294e_Majestic_spiral.png) |
| 16 | harmony         | Harmony Drift         | 10:30    | neon_rain    | Cyan-pink aurora streaks. First mythic-tier arena. Mixed-tier spawns (random t7–t10). | [Harmony](https://media.base44.com/images/public/69de258a7e072380b89d66e3/04713b746_Harmony.png) |
| 17 | chromatic       | Chromatic Tides       | 11:00    | fog          | Pink/teal/orange swirling clouds. Cosmic Ray Fish / Plasma Jelly Swarm — fast and chaotic. | [Swirling_nebulae](https://media.base44.com/images/public/69de258a7e072380b89d66e3/8717e0950_Swirling_nebulae.png) |
| 18 | stormfront      | Stormfront Nebula     | 11:30    | solar_flare  | Cyan lightning-burst nebula. Thunder Sphere / Frost Specter heavy. Electric chaos. | [Cosmic_Storm](https://media.base44.com/images/public/69de258a7e072380b89d66e3/c0893d46c_Cosmic_Storm.png) |
| 19 | supernova       | Supernova Heart       | 12:00    | solar_flare  | Pink-cyan supernova rays. Only tier 8-10 mobs spawn — no trash. Best XP/gold rate in the game. | [SuperNova_Burst](https://media.base44.com/images/public/69de258a7e072380b89d66e3/c6b90fc36_SuperNova_Burst.png) |
| 20 | devourer        | The Devourer          | 12:30    | none         | Black hole consuming a planet. Mythic finale. Anchors the **NEW BOSS** (sprite pending). Optional: spawn 1 existing boss alongside the new one for true endgame flex. | [Cosmic_BlackHole](https://media.base44.com/images/public/69de258a7e072380b89d66e3/9161fafb4_Cosmic_BlackHole.png) |

---

## Implementation notes (when ready to build)

1. **Drop into `ARENAS` in `game/Constants.js`** — same shape as existing entries. Need 10 new background images uploaded to base44 storage.
2. **Spawn tables** — `EnemySpawner.js` already weights spawns by sector index. ✅ **Tier cap raised** — the 20 new mob sprites add fresh tiers above 10. Suggested:
   - **Tier 11** — Asteroid Crab, Cosmic Jellyfish, Galaxy Mantis, Spectral Mothlet, Star Scarab Beetle, Void Bat, Void Eel, Shadow Mantling (the new T6-T8 entries get bumped up)
   - **Tier 12** — Nebula Octopus, Nebula Scorpion, Aurora Moth, Galaxy Wasp (former T6-T8 elites)
   - **Tier 13** — Aurora Serpent, Comet Ray, Nebula Serpent, Plasma Raptor, Void Shark (former T9s)
   - **Tier 14** — Cosmic Manta Ray, Nebula Panther, Plasma Wyrm (former T10 elites — true endgame mythics)
   - Sectors 11-15 = mix of T8-T12, sectors 16-20 = T11-T14 only (no more trash mobs in the mythic tier). Rebalance the tier-mapping table further down once we wire this up.
3. **Hub UI (`pages/Hub`)** — split into two tabs:
   - **Inner Galaxy** — sectors 1-10 (existing post-game tier)
   - **Outer Galaxy** — sectors 11-20 (new endgame + mythic tier)
   - Tab control sits above the sector grid. Default tab = Inner Galaxy on first visit; remember last-selected tab in localStorage so endgame players land back on Outer Galaxy.
   - Outer Galaxy tab should have a subtle distinct visual treatment (e.g. cosmic glow on the tab itself, or a "★ NEW" badge if the player hasn't unlocked anything in it yet) so the new content is discoverable.
4. **Bestiary / Lore** — ✅ **Locked: ship all 20 new mob entries on day one** with new ids (e.g. `t11_asteroid_crab`, `t14_plasma_wyrm`). New tier 11-14 entries in `Constants.js` + matching lore lines in `Lore.js` + Bestiary card rendering. Existing 30-mob roster stays untouched (still spawns in S1-S10). Boss pool: ✅ **random rotation across all 7 bosses** in S11-S19 (existing 6 + Pulsar Guardian eligible everywhere), Pulsar Guardian **guaranteed spawn on S20** as the mythic finale anchor.
5. **Effects** — ✅ **New effects requested** (Outer Galaxy deserves to *feel* different from Inner Galaxy). First pass spec — separate engine ticket but blocking for full mythic feel:
   - `ion_storm` — periodic horizontal lightning sweeps that briefly slow the player and reveal a screen-edge crackle (suggested for S18 Stormfront Nebula)
   - `void_pulse` — rhythmic dark-energy contractions from screen center, drag the camera inward visually, increase enemy speed during pulse (suggested for S20 The Devourer)
   - `eclipse_dim` — periodic light/dark cycle where visibility drops to ~30% for 4s every 20s (suggested for S15 Painter's Spiral or S17 Chromatic Tides)
   - `gravity_well` — subtle pull toward random screen point that drifts every 8s, affects player + projectiles + pickups (suggested for S11 Galactic Core or S13 Saturnian Reach)
   - `aurora_drift` — soft directional wind pushing all entities slowly (suggested for S16 Harmony Drift)
   - Reuse existing 4 for the remaining sectors so we don't need 10 new effects on day one. Pick which 4-5 ship at launch when we build.
6. **Difficulty curve** — ✅ **Locked: Option B — 1.15× per-sector ramp**.
   - **Sector N Normal HP = Sector 10 Normal × 1.15^(N-10)** for all N ≥ 11
   - The 4 difficulty tiers (Easy 0.7×/0.6×, Normal 1.0×, Hard 1.5×, Cosmic 2.5×) still apply *within* each sector on top of the base.
   - **Net effect**: smooth, predictable progression. Whales steamrolled S10 — now they have a real ladder.

   Worked example (HP/dmg multiplier vs Sector 1 Normal baseline = 1.0×):
   | Sector | Normal | Cosmic |
   |--------|--------|--------|
   | 10     | 1.0×   | 2.5×   |
   | 11     | 1.15×  | 2.9×   |
   | 12     | 1.32×  | 3.3×   |
   | 13     | 1.52×  | 3.8×   |
   | 14     | 1.75×  | 4.4×   |
   | 15     | 2.01×  | 5.0×   |
   | 16     | 2.31×  | 5.8×   |
   | 17     | 2.66×  | 6.6×   |
   | 18     | 3.06×  | 7.6×   |
   | 19     | 3.52×  | 8.8×   |
   | 20     | 4.05×  | 10.1×  |

   **Mid-builds** clear S11-S13, **fully-built** clear S15-S17, only **top-tier mythic** players touch S18-S20 Cosmic. S20 Cosmic ≈ 10× S1 baseline is the bragging-rights wall.

   ✅ **Score formula contribution — locked**: Outer Galaxy sectors stack a quadratic bonus on top of the existing S6 linear sector/victory terms. Score growth tracks the ~10× difficulty ramp from S10 → S20 Cosmic (NOT inflated to 25×) so a S20 victory is meaningfully harder *and* meaningfully more valuable than S10, without auto-winning the season for whoever clears it once.

   **Anchor: real S6 top scores (checked 2026-06-03)**
   - S10 Cosmic victory peak: **~1.6M** (Waeoo / Texxy on Dimension)
   - Endless ceiling hits: 10M (Battle Toad, 73-min run) — endless is sandbox, NOT recalibrated here per Texxy's call ("not tied to Omen, players will run highest sector endless anyway")

   **Formula change in `functions/saveScore.js` (S6 branch only, no S5 impact):**
   ```js
   // Sectors 1-10 — UNCHANGED
   const sectorScore  = sectorIdxForBonus * 8000;
   const victoryBonus = isVictory ? sectorIdxForBonus * 15000 : 0;

   // Sectors 11-20 — quadratic ADDITIONAL bonus on top
   let outerSectorBonus = 0;
   let outerVictoryBonus = 0;
   if (sectorIdxForBonus >= 10 && !isEndless && !isRaidRun) {
       const outerStep = sectorIdxForBonus - 9;          // 1 for S11, 10 for S20
       outerSectorBonus  = outerStep * outerStep * 15000;  // S11: +15k, S20: +1.5M
       if (isVictory) {
           outerVictoryBonus = outerStep * outerStep * 30000;  // S11: +30k, S20: +3M
       }
   }
   const baseScore = killsScore + levelScore + sectorScore + victoryBonus
                   + outerSectorBonus + outerVictoryBonus + endlessScore;
   ```

   **Projected Cosmic 2× victory scores:**

   | Sector | Score | vs S10 (1.6M) | Difficulty ramp (Cosmic) |
   |--------|-------|---------------|--------------------------|
   | S10 | 1.6M | 1.0× | 1.0× |
   | S11 | 1.8M | 1.1× | 1.15× |
   | S12 | 2.1M | 1.3× | 1.32× |
   | S15 | 5M | 3.1× | 2.0× |
   | S18 | 11M | 6.9× | 6.6× |
   | S20 | **17M** | **10.6×** | **~10×** ✅ matches difficulty curve |

   Each Outer Galaxy sector clearly outscores the previous; growth is *proportional* to the HP/dmg ramp rather than multiplied on top of it. No "clear S20 once and own the leaderboard forever" trap.

   **Required `SCORE_HARD_CEILING` bump**: 10M → **35M** (S20 Cosmic lands ~17M; 35M leaves buffer for stacked talents/relics/admin buffs on a perfect S20 run without re-clipping legit play).
7. **Rewards** —
   - **Gold drops: FLAT at sector 10 values** for all of sectors 11-20. Player economy already has a surplus; we do NOT want to inflate gold further with the new content. Implementation: clamp `goldDropMult` at sector index 10's value when computing drops for sectors 11+.
   - **XP scaling**: keep XP drops scaling with the new exponential difficulty curve — players need the XP to level mid-run to survive the HP walls, and XP doesn't feed the persistent economy.
   - **No bonus reward multipliers** for the new tier — the prestige comes from the challenge + cosmetic/title rewards (TBD), not gold/XP inflation.
8. **Unlocks** — ✅ **Locked: per-character chain, any-difficulty clear unlocks next sector** (matches existing S1-S10 behavior exactly). Sector 11 unlocks for a character once they've cleared Sector 10 on *any* difficulty. Each character grinds their own ladder through the Outer Galaxy — 10 chars × 10 sectors = a long-term roster goal. No bulk unlock, no shortcut, no Normal-only gate (consistency with S1-S10 wins over restrictiveness).

9. **Character roster access (NFT + non-NFT)** — ✅ **No new unlock gates needed**:
   - **NFT holders**: already get instant access to every character via `NFTPerks.js` + `_am` suffix normalization in `nftNameNormalize.js`. Outer Galaxy adds nothing here.
   - **Non-NFT via kill milestones**: top milestone is 160k total kills = full 10-char roster. Outer Galaxy *accelerates* kill counts (a S20 Cosmic run can do 8-10k kills), so anyone reaching S11+ will have long since unlocked everything. ✅ Already handled.
   - **Outer Galaxy chase reward**: ✅ **Locked option (a) — nothing extra**. Outer Galaxy is *purely about score and bragging rights*, not a new currency/unlock track. Keeps the design honest: harder content = bigger leaderboard number, period. Cosmetic rewards can be a later patch ticket if Texxy wants them, but they're not blocking launch.

---

## Asset status

- ✅ **Backgrounds** — all 10 uploaded (URLs in table above)
- ✅ **Enemy sprites** — all 20 uploaded (roster below)
- ✅ **New boss sprite** — Pulsar Guardian uploaded ([sheet](https://media.base44.com/images/public/69de258a7e072380b89d66e3/83baa9440_Pulsar_Guardian_Sheet.png)) — 5×5 / 25-frame format matches existing bosses

### Boss: Pulsar Guardian

- **Visual**: Armored juggernaut, black plating with molten orange-gold cracks, glowing yellow pulsar core in its chest, flame-spike crown.
- **Sprite format**: 5 rows × 5 cols = 25 frames (same as existing bosses → `frameCount: 25, animationSpeed: 0.12`).
- **Suggested id**: `boss_pulsar_guardian`
- **Suggested stats** (slot above Nexus Annihilator as the new endgame king):
  - hp ~22000, speed 0.7, damage 110, radius ~150, xp 1700
  - weakSide: `back` — "Attack from behind" (pulsar core is shielded from the front)
- **Lore hook** (Bestiary): *"The last sentinel of a collapsed star. Its core still pulses with the rhythm of a sun long dead, and its rage radiates outward in waves of pure stellar fury."*
- **Sector role**: ✅ **Locked** — Pulsar Guardian joins the **shared boss pool** alongside the existing 6. It anchors S20 (its pulsar core being consumed by the black hole = lore tie) but is also eligible to spawn in sectors 11-19 via the existing boss rotation. Gives the new art maximum visibility instead of locking it to a single sector.

### Enemy roster — 20 new sprites

All sheets follow the existing 4×4 / 16-frame format. Suggested tier assignments below assume **Option C themed-per-sector** distribution (recommended). Final tier + stats need balance tuning when we implement.

| # | Name | Visual | Suggested tier | Sheet URL |
|---|------|--------|----------------|-----------|
| 1 | Asteroid Crab | Blue armored crab, glowing eyes | T8 tank | [Asteroid_Crab](https://media.base44.com/images/public/69de258a7e072380b89d66e3/d058a4791_Asteroid_Crab_Sheet.png) |
| 2 | Aurora Moth | Green-purple iridescent moth | T6 swarm | [Aurora_Moth](https://media.base44.com/images/public/69de258a7e072380b89d66e3/f3a323dae_Aurora_Moth_Sheet.png) |
| 3 | Aurora Serpent | Cyan-purple celestial dragon | T9 elite | [Aurora_Serpent](https://media.base44.com/images/public/69de258a7e072380b89d66e3/a982ba85c_Aurora_Serpent_Sheet.png) |
| 4 | Comet Ray (phoenix form) | Fiery orange/cyan-winged spirit | T9 ranged | [Comit_Ray](https://media.base44.com/images/public/69de258a7e072380b89d66e3/c9ca34e78_Comit_Ray_Sheet.png) |
| 5 | Cosmic Jellyfish | Blue-pink starry jellyfish | T7 floater | [Cosmic_Jellyfish](https://media.base44.com/images/public/69de258a7e072380b89d66e3/93adad41e_Cosmic_Jellyfish_Sheet.png) |
| 6 | Cosmic Manta Ray | Galaxy-skinned manta, large | T10 elite | [Cosmic_Manta_Ray](https://media.base44.com/images/public/69de258a7e072380b89d66e3/aa4cd6eb7_Cosmic_Manta_Ray_Sheet.png) |
| 7 | Galaxy Mantis | Blue-teal mantis insect | T7 ranged | [Galaxy_Mantis](https://media.base44.com/images/public/69de258a7e072380b89d66e3/a0c3ffe18_Galaxy_Mantis_Sheet.png) |
| 8 | Galaxy Wasp | Purple cosmic wasp w/ stinger | T6 ranged | [Galaxy_Wasp](https://media.base44.com/images/public/69de258a7e072380b89d66e3/1779a4a15_Galaxy_Wasp_Sheet.png) |
| 9 | Nebula Octopus | Purple-cyan starry octopus | T8 elite | [Nebula_Octopus](https://media.base44.com/images/public/69de258a7e072380b89d66e3/78215c244_Nebula_Octopus_Sheet.png) |
| 10 | Nebula Panther | Purple flaming feline stalker | T10 elite | [Nebula_Panther](https://media.base44.com/images/public/69de258a7e072380b89d66e3/37f8125b9_Nebula_Panther_Sheet.png) |
| 11 | Nebula Scorpion | Purple-pink scorpion | T8 ranged | [Nebula_Scorpion](https://media.base44.com/images/public/69de258a7e072380b89d66e3/9a42c9c27_Nebula_Scorpion_Sheet.png) |
| 12 | Nebula Serpent | Purple-cyan flame dragon | T9 elite | [Nebula_Serpent](https://media.base44.com/images/public/69de258a7e072380b89d66e3/2f0782efb_Nebula_Serpent_Sheet.png) |
| 13 | Spectral Mothlet (variant of Neon Mothra) | Small pink/teal butterfly | T6 swarm | [neon_mothra v2](https://media.base44.com/images/public/69de258a7e072380b89d66e3/da4b6bf5a_neon_mothra_sheet.png) |
| 14 | Plasma Raptor | Fiery orange/cyan raptor | T9 fast | [Plasma_Raptor](https://media.base44.com/images/public/69de258a7e072380b89d66e3/7a54d1f3f_Plasma_Raptor_Sheet.png) |
| 15 | Plasma Wyrm | Orange-blue fiery wyrm | T10 elite | [Plasma_Wyrm](https://media.base44.com/images/public/69de258a7e072380b89d66e3/68e0a16db_Plasma_Wyrm_Sheet.png) |
| 16 | Star Scarab Beetle | Blue armored beetle | T7 swarm | [Star_Scarab_Beetle](https://media.base44.com/images/public/69de258a7e072380b89d66e3/150bb4721_Star_Scarab_Beetle_Sheet.png) |
| 17 | Void Bat | Purple cosmic bat | T6 swarm | [Void_Bat](https://media.base44.com/images/public/69de258a7e072380b89d66e3/d6da65840_Void_Bat_Sheet.png) |
| 18 | Void Eel | Dark teal/purple eel | T7 fast | [Void_Eel](https://media.base44.com/images/public/69de258a7e072380b89d66e3/b9f304545_Void_Eel_Sheet.png) |
| 19 | Shadow Mantling (variant of Void Manta) | Small dark manta | T7 fast | [void_mantra v2](https://media.base44.com/images/public/69de258a7e072380b89d66e3/ec5f8466f_void_mantra_sheet.png) |
| 20 | Void Shark | Purple cosmic shark | T9 fast | [Void_Shark](https://media.base44.com/images/public/69de258a7e072380b89d66e3/33a8cf065_Void_Shark_Sheet.png) |

### Filename collisions — resolved as NEW VARIANTS

Two uploads share filenames with existing T3/T4 sprites (different URL hashes, so they're independent files). Confirmed as **new high-tier variants** (not art refreshes):
- `Spectral Mothlet` (new T6) — uses hash `da4b6bf5a_neon_mothra_sheet.png`. Existing T4 `t4_mothra` (hash `23d933892`) remains untouched.
- `Shadow Mantling` (new T7) — uses hash `ec5f8466f_void_mantra_sheet.png`. Existing T3 `t3_manta` (hash `9842135cf`) remains untouched.

When we implement, we'll give these new enemies distinct ids (e.g. `t6_spectral_mothlet`, `t7_shadow_mantling`) so they don't collide with the existing entries.

### Sector → enemy mapping (draft — themed Option C)

Pairing each new arena with 2 signature mobs from the roster above. Existing tier-appropriate mobs still spawn alongside for variety.

| Sector | Signature mobs |
|--------|----------------|
| 11 — The Galactic Core       | Asteroid Crab, Star Scarab Beetle |
| 12 — Pillars of Creation     | Aurora Moth, Galaxy Wasp |
| 13 — Saturnian Reach         | Cosmic Jellyfish, Nebula Octopus |
| 14 — Andromeda's Edge        | Galaxy Mantis, Spectral Mothlet |
| 15 — The Painter's Spiral    | Aurora Serpent, Cosmic Manta Ray |
| 16 — Harmony Drift           | Nebula Scorpion, Shadow Mantling |
| 17 — Chromatic Tides         | Nebula Serpent, Comet Ray |
| 18 — Stormfront Nebula       | Plasma Raptor, Plasma Wyrm |
| 19 — Supernova Heart         | Nebula Panther, Void Shark |
| 20 — The Devourer            | **Pulsar Guardian** (boss) + Cosmic Manta Ray + Plasma Wyrm rotation |

## Player power cap lifts (locked)

To match the 1.15× per-sector HP/dmg ramp, the existing S6 player-stat ceilings in `GameEngine.js` (lines 316-324) are **raised** when the player enters an Outer Galaxy sector. Without this, fully-built whales hit the existing 6.0× damage / 4.0× area walls and have no headroom to scale into S15+.

### Sector-scaled ceilings (in-run only — does not affect S1-S10 balance)

| Cap | S1-S10 (today) | S11 | S15 | S20 |
|-----|----------------|-----|-----|-----|
| `damageMult` ceiling | 6.0  | 7.5 | 12.0 | 18.0 |
| `areaMult` ceiling   | 4.0  | 5.0 |  7.0 | 10.0 |
| `xpMult` ceiling     | 5.0  | 6.0 |  9.0 | 14.0 |
| `goldMult` ceiling   | 8.0  | 8.0 |  8.0 |  8.0 | ← unchanged (Outer Galaxy gold stays flat at S10 values per the rewards rule)
| `cooldownMult` floor | 0.35 | 0.30 | 0.25 | 0.20 |

**Math check**: a fully-capped whale on S20 gets 3× their current damage output — almost exactly matching the 3× difficulty ramp from S10 → S20 Normal. So they fight at the same *relative* challenge they fight S10 today, just with bigger numbers on both sides.

### Two quality-of-life cap lifts on Sector 11+

1. **Vampiric Lash heal cap**: 5% → **10% Max HP per swing** on Outer Galaxy sectors. Currently useless against S15+ enemy damage; this brings sustain builds back into viability.
2. **Forge augment stacking**: allow **2 augments of the same stat per weapon** on Outer Galaxy sectors (so a whale can stack `damage_3` twice = +120% instead of +60% on their endgame weapon).

### What stays untouched

- **`STACK_FACTOR` 0.5 / 0.66** (weapon mastery + passive stats + talents) — these protect the S1-S10 leaderboard from the May 2026 stacking exploits. Don't touch.
- **Per-level growth caps in `levelUp()`** (5.0 dmg / 2000 HP / 30 armor / weapon level 20 / passive level 5) — these protect against Overcharge spam in 90-min endless. Don't touch.
- **NFT perks at 15%** — tied to whale spend; bumping invites complaints. Don't touch.

### Implementation note

Single ~20-line block in `GameEngine.js` constructor that replaces the existing 4-line clamp when `this.arena` is sectors 11-20. Sector index is the only gate; everything else stays exactly as-is. Fully reversible.

```js
// Pseudo — final code in implementation pass
const sectorIdx = ARENAS.findIndex(a => a.id === this.arena.id) + 1;
if (this._isS6 && sectorIdx >= 11 && sectorIdx <= 20) {
    const t = (sectorIdx - 10) / 10; // 0.1 at S11 → 1.0 at S20
    const dmgCap  = 6.0 + 12.0 * t;   // 7.2 → 18.0
    const areaCap = 4.0 +  6.0 * t;   // 4.6 → 10.0
    const xpCap   = 5.0 +  9.0 * t;   // 5.9 → 14.0
    const cdFloor = 0.35 - 0.15 * t;  // 0.335 → 0.20
    this.player.damageMult   = Math.min(dmgCap,  this.player.damageMult);
    this.player.areaMult     = Math.min(areaCap, this.player.areaMult);
    this.player.xpMult       = Math.min(xpCap,   this.player.xpMult);
    this.player.cooldownMult = Math.max(cdFloor, this.player.cooldownMult);
    // goldMult stays at the existing 8.0 cap — Outer Galaxy doesn't inflate gold.
} else if (this._isS6) {
    // existing S1-S10 clamps — unchanged
    this.player.damageMult = Math.min(6.0, this.player.damageMult);
    this.player.areaMult   = Math.min(4.0, this.player.areaMult);
    this.player.xpMult     = Math.min(5.0, this.player.xpMult);
    this.player.cooldownMult = Math.max(0.35, this.player.cooldownMult);
}
this.player.goldMult = Math.min(8.0, this.player.goldMult);
```

## Spawn density per sector (locked)

Density scales mildly on top of the exponential HP/dmg curve — keeps the screen reading-friendly while still ramping pressure:

| Sectors | Spawn density |
|---------|---------------|
| 11–14   | baseline (same as S10) |
| 15–20   | +10% spawn density |

(Replaces the earlier "+25% on S14" note — too punishing on top of the 1.2× HP ramp.)

## Status — ✅ READY TO IMPLEMENT

All open questions resolved (audit 2026-06-03). Implementation checklist:

### Constants & data
1. **`game/Constants.js`** — append 10 new `ARENAS` entries (S11-S20) with backgrounds from the table above. Append 20 new tier 11-14 enemy entries with new ids. Append Pulsar Guardian to the boss pool (7th entry, sprite sheet 5×5/25-frame).
2. **`game/Lore.js`** — append lore lines for the 20 new mobs + Pulsar Guardian.

### Backend (saveScore.js)
3. **`functions/saveScore.js`** — 4 coordinated edits:
   - Extend `ARENA_ORDER` array from 10 → 20 ids
   - Extend `ARENA_DURATIONS` map with the 10 new durations (8:00 → 12:30)
   - Add the Outer Galaxy quadratic score bonus block (S6 branch only — see formula in section 6)
   - Bump `SCORE_HARD_CEILING` from 10M → 35M
   - `unlockedArenasByCharacter` self-heal already walks `ARENA_ORDER` → automatically extends ✅ no change needed

### Engine
4. **`game/GameEngine.js`** — sector-scaled cap-lift block in constructor (~20 lines, see section "Player power cap lifts"). Vampiric Lash heal cap 5%→10% on S11+. Forge augment stacking allows 2-of-same on S11+.
5. **`game/EnemySpawner.js`** — 1.15× per-sector HP/dmg ramp for S11+. Raise tier cap to 14. Spawn density +10% on S15-S20. Boss pool rotation: random across 7 bosses for S11-S19; Pulsar Guardian guaranteed on S20.
6. **Arena effects** — pick 4-5 of the 5 proposed new effects (`ion_storm`, `void_pulse`, `eclipse_dim`, `gravity_well`, `aurora_drift`) and implement in the effects layer. Remaining sectors reuse existing 4.

### Frontend
7. **`pages/Hub`** — Inner/Outer Galaxy tab split. localStorage remembers last-selected tab. Outer Galaxy tab gets cosmic-glow treatment + "★ NEW" badge if player has zero S11+ clears.
8. **Bestiary page** — auto-picks up the 20 new mob entries from Constants/Lore. No layout work expected.

### NOT changing (confirmed by audit)
- `STACK_FACTOR` (0.5 / 0.66) — protects S1-S10 leaderboard, untouched
- Per-level growth caps in `levelUp()` — anti-Overcharge, untouched
- NFT perks at 15% — whale-tied, untouched
- Character unlock chain — NFT instant + 160k-kill milestone roster already covers Outer Galaxy players
- Gold drops in S11-S20 — flat at S10 values (rewards rule)
- Endless / raid / meteor score formulas — sandbox, untouched

**Effort estimate**: ~1 focused implementation pass for items 1-3 + 7 (the "must-ship" core). Items 4-5 are the medium pass. Item 6 (new effects) is the longest tail — recommend shipping with **2 new effects + 8 reused** at launch, then patching in the other 2-3 over the following weeks.