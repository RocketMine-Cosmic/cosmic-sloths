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
4. **Bestiary / Lore** — no new enemies required for first pass; we reuse the existing 30 mob roster but emphasise different tiers per sector via spawn weights. Bosses too — keep the 6 existing bosses but assign different ones per sector.
5. **Effects** — ✅ **New effects requested** (Outer Galaxy deserves to *feel* different from Inner Galaxy). First pass spec — separate engine ticket but blocking for full mythic feel:
   - `ion_storm` — periodic horizontal lightning sweeps that briefly slow the player and reveal a screen-edge crackle (suggested for S18 Stormfront Nebula)
   - `void_pulse` — rhythmic dark-energy contractions from screen center, drag the camera inward visually, increase enemy speed during pulse (suggested for S20 The Devourer)
   - `eclipse_dim` — periodic light/dark cycle where visibility drops to ~30% for 4s every 20s (suggested for S15 Painter's Spiral or S17 Chromatic Tides)
   - `gravity_well` — subtle pull toward random screen point that drifts every 8s, affects player + projectiles + pickups (suggested for S11 Galactic Core or S13 Saturnian Reach)
   - `aurora_drift` — soft directional wind pushing all entities slowly (suggested for S16 Harmony Drift)
   - Reuse existing 4 for the remaining sectors so we don't need 10 new effects on day one. Pick which 4-5 ship at launch when we build.
6. **Difficulty curve** — sectors 11-20 abandon the linear scaling of 1-10 and use an **exponential per-sector ramp**:
   - **Sector 11 Normal = Sector 10 Cosmic × 1.2**
   - **Sector N Normal = Sector (N-1) Cosmic × 1.2** for all N ≥ 11
   - The 4 difficulty tiers (Easy 0.7×/0.6×, Normal 1.0×, Hard 1.5×, Cosmic 2.5×) still apply *within* each sector on top of the base.
   - **Net effect**: Normal difficulty grows **3.0× per sector** at the Normal tier (1.2 × 2.5 chain). Brutal by design — this is the mythic endgame wall.

   Worked example (HP/dmg multiplier vs Sector 1 Normal baseline = 1.0×):
   | Sector | Normal | Cosmic |
   |--------|--------|--------|
   | 10     | 1.0×   | 2.5×   |
   | 11     | 3.0×   | 7.5×   |
   | 12     | 9.0×   | 22.5×  |
   | 13     | 27×    | 67.5×  |
   | 14     | 81×    | 202.5× |
   | 15     | 243×   | 607.5× |
   | 16     | 729×   | 1822×  |
   | 17     | 2187×  | 5467×  |
   | 18     | 6561×  | 16402× |
   | 19     | 19683× | 49207× |
   | 20     | 59049× | 147622×|

   ✅ **Locked**: full 1.2× curve confirmed. Players already steamrolled S10 on launch — the steepness is the point. Sector 20 Cosmic ≈ 147,000× S1 baseline is the mythic wall, only reachable by fully-built whales with all relics maxed.
7. **Rewards** —
   - **Gold drops: FLAT at sector 10 values** for all of sectors 11-20. Player economy already has a surplus; we do NOT want to inflate gold further with the new content. Implementation: clamp `goldDropMult` at sector index 10's value when computing drops for sectors 11+.
   - **XP scaling**: keep XP drops scaling with the new exponential difficulty curve — players need the XP to level mid-run to survive the HP walls, and XP doesn't feed the persistent economy.
   - **No bonus reward multipliers** for the new tier — the prestige comes from the challenge + cosmetic/title rewards (TBD), not gold/XP inflation.
8. **Unlocks** — same per-character chain as sectors 1-10: clear sector N on **Normal** with a given character to unlock sector N+1 for that character. Sector 11 unlocks for a character once they've cleared Sector 10 on Normal. No bulk unlock, no shortcut — each character grinds their own ladder through the Outer Galaxy.

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

## Spawn density per sector (locked)

Density scales mildly on top of the exponential HP/dmg curve — keeps the screen reading-friendly while still ramping pressure:

| Sectors | Spawn density |
|---------|---------------|
| 11–14   | baseline (same as S10) |
| 15–20   | +10% spawn density |

(Replaces the earlier "+25% on S14" note — too punishing on top of the 1.2× HP ramp.)

## Status — ready to implement

All open questions resolved. Next step: when you say go, I'll wire up:
1. New `ARENAS` entries + tier 11-14 enemy entries in `game/Constants.js`
2. Pulsar Guardian as the 7th entry in the boss pool
3. `EnemySpawner.js` — exponential 1.2× ramp + raised tier cap + density bumps
4. `pages/Hub` — Inner/Outer Galaxy tab split
5. Bestiary entries + lore for the 20 new mobs + Pulsar Guardian
6. Effects engine work for the 4-5 new arena effects you pick to ship at launch