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

| #  | Proposed id     | Name                  | Duration | Effect       | Theme / hook |
|----|-----------------|-----------------------|----------|--------------|--------------|
| 11 | frostfield      | Glacial Expanse       | 8:00     | fog          | Frozen graveyard of dead capital ships. Frost Wyrm / Frost Specter heavy spawns. Slow-tempo opener for the post-game tier. |
| 12 | infernum        | Solar Furnace         | 8:30     | solar_flare  | Inside a dying star's corona. Flame Wyrmling + Lava Rock Blob density spike. Hard counter to ice/regen builds. |
| 13 | bonefield       | Wreckage Field        | 9:00     | none         | Centuries of dead fleets. Heavy Rock Fragment / Gear Swarm. Clean visual — no effect — so players can read the chaos. |
| 14 | hivecluster     | The Hive Cluster      | 9:30     | fog          | Bio-Bloom super-organism. Spawn density +25%, smaller mobs only — a swarm DPS check. |
| 15 | mindspire       | Mindspire Citadel     | 10:00    | neon_rain    | Whispering Void temple. Heavy ranged enemy mix — punishes squishy glass cannons. |
| 16 | warpgate        | Warpgate Anomaly      | 10:30    | solar_flare  | A torn portal pulsing with mid-warp horrors. Mixed-tier spawns (random t6–t10). Chaos arena. |
| 17 | mythos          | Mythos Garden         | 11:00    | fog          | Ancient sentient asteroid garden. Crystal Floater / Coral Bloom / Stellar Starfish — pure crystal/coral theme. Visually distinct. |
| 18 | eclipse         | Total Eclipse         | 11:30    | none         | Pitch-black arena. Visual readability reduced — leans into Shadow Stalker spawns. Cosmic-only might disable HUD glow. |
| 19 | apex            | Apex Predator Realm   | 12:00    | neon_rain    | Only tier 8-10 mobs spawn — no tier 1-4 trash. Pure endgame DPS check. Best XP/gold rate in the game. |
| 20 | ascendant       | The Ascendant Throne  | 12:30    | solar_flare  | Final mythic arena. Multi-boss finale: spawn 2 random bosses simultaneously at the end. Top-tier mastery flex. |

---

## Implementation notes (when ready to build)

1. **Drop into `ARENAS` in `game/Constants.js`** — same shape as existing entries. Need 10 new background images uploaded to base44 storage.
2. **Spawn tables** — `EnemySpawner.js` already weights spawns by sector index. Confirm tier-10 ceiling holds for sectors 11-15, then add a fresh weighting block for 16-20 (mixed/elite-only).
3. **Hub UI (`pages/Hub`)** — sector grid will need to wrap into a 2nd page or scroll. Quick check needed.
4. **Bestiary / Lore** — no new enemies required for first pass; we reuse the existing 30 mob roster but emphasise different tiers per sector via spawn weights. Bosses too — keep the 6 existing bosses but assign different ones per sector.
5. **Effects** — first pass uses only the 4 existing effects so no engine work. If we want unique effects per new sector (e.g. `ion_storm`, `void_pulse`, `eclipse_dim`), that's a separate ticket.
6. **Difficulty curve** — verify HP/dmg scaling formula in `EnemySpawner.js` doesn't break past sector index 10. Likely needs a clamp or a fresh tier coefficient for sectors 11-20.
7. **Rewards** — sectors 16-20 likely need a gold/XP bump above the base curve to feel mythic-tier. Suggest +10% per sector past 15.
8. **Unlocks** — gating? Sector 11 unlocks when sector 10 cleared on Normal? Or all unlocked at once? Decision needed.

---

## Open questions for you

1. **Background art** — generate via AI per sector, or reuse/recolor existing maps?
2. **New enemies** — do we want any new tier-11+ enemies, or stick with the existing 30-mob roster for first pass?
3. **New bosses** — 1-2 new mythic bosses for sectors 19-20 (and Ascendant Throne finale), or reuse existing 6?
4. **Unlock gating** — clear-to-unlock chain, or all 20 available at once?
5. **Names** — happy with these or want a re-pass? I tried to keep the style consistent with existing names.