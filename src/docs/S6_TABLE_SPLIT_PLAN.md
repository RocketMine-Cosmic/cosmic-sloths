# S6 Run Table Split — Plan

**Status:** Planning. Implementation gated on S6 rollover (W20 → W21, Mon May 25 2026 00:00 UTC).
**Goal:** Stop using one giant `RunScore` table for every run type. Split into purpose-built tables so leaderboard queries, daily/weekly aggregation, and admin tools stop fighting each other for rows.

---

## TL;DR

| Run type        | Current table                         | New S6 table              | Why                                                      |
| --------------- | ------------------------------------- | ------------------------- | -------------------------------------------------------- |
| Sector runs     | `RunScore`                            | `SectorRun`               | Short, frequent, victory-state matters, arena-scoped     |
| Endless runs    | `RunScore` (filtered `arena='endless'`) | `EndlessRun`              | Long, capped differently, different score formula        |
| Raid runs       | `RunScore` + `GlobalBossContribution` | `GlobalBossContribution` ✅ | Already correctly split — keep as-is                     |
| Meteor attacks  | `SquadMeteorAttack` ✅                 | `SquadMeteorAttack` ✅     | Already correctly split — keep as-is                     |
| Trials runs     | `RunScore` (filtered)                 | `SectorRun` (with `is_trial=true` flag) | Trials are basically sectors with a modifier — no need for a 5th table |

`RunScore` becomes **read-only archive** post-S6. All S5 data stays queryable for refunds / audits / historical leaderboards.

---

## The kill-counting problem (and the solution)

User's concern: **"we still need to count kills for squad war and bounties and stuff"**

Today, kills are counted by scanning `RunScore` rows. After the split, kills are distributed across `SectorRun` + `EndlessRun`. We need ONE canonical place to read squad/bounty kills.

### Solution: keep aggregation centralised, change the source

The aggregation code lives in `saveScore` (and now `submitSquadMeteorDamage` / `submitBossDamage`). It already writes:

- `Squad.weekly_kills` (running total)
- `Squad.daily_kills` (running total, resets daily)
- `PlayerSave.totalKills` (lifetime)
- `PlayerSave.bountyProgress.*` (daily/weekly task counters)
- `SquadWar.kills_a` / `kills_b` (war kill totals)

**These are all already pre-aggregated counters.** They DON'T scan run rows — they increment in place when a run lands. So the table split changes NOTHING for squad wars / bounties / daily tasks. They keep working exactly as they do today.

The ONLY place we scan run rows for kill totals is `getSquadProfile` (per-member daily/weekly breakdowns — the panel showing each member's contribution). For that:

- **Weekly per-member kills** → query `SectorRun` + `EndlessRun` (small union, both scoped by `week_id`)
- **Daily per-member kills** → query both, scoped by today's UTC date

Both queries become FASTER, not slower, because each table is smaller.

---

## Schema designs

### `SectorRun` (new)

```json
{
  "user_id": "string",
  "wallet_address": "string",
  "player_name": "string",
  "player_title": "string",
  "pilot_icon": "string",
  "score": "number",
  "time_survived": "number",
  "level": "number",
  "kills": "number",
  "gold_earned": "number",
  "gold_credited": "number",
  "character_id": "string",
  "arena_id": "string",        // 'station', 'asteroid', ..., 'dimension'
  "is_victory": "boolean",      // sectors have a defined end state
  "is_trial": "boolean",        // Leviathan Trials flag (replaces filtering by arena)
  "difficulty_id": "string",    // normal / hard / cosmic
  "week_id": "string",
  "season_id": "string"
}
```

### `EndlessRun` (new)

```json
{
  "user_id": "string",
  "wallet_address": "string",
  "player_name": "string",
  "player_title": "string",
  "pilot_icon": "string",
  "score": "number",
  "time_survived": "number",
  "level": "number",
  "kills": "number",
  "gold_earned": "number",
  "gold_credited": "number",
  "character_id": "string",
  "starting_weapon_id": "string",  // endless has weapon-locked leaderboards
  "difficulty_id": "string",
  "endless_gold_capped": "boolean",
  "endless_kills_capped": "boolean",
  "week_id": "string",
  "season_id": "string"
}
```

### `RunScore` (existing — frozen on S6 rollover)

Stays as-is. RLS stays as-is. No new writes after W21. Archive for refunds / S5 leaderboards / historical lookups.

---

## Implementation phases

### Phase 1 — Pre-S6 (week of W20, do NOT ship live yet)

1. Create `entities/SectorRun.json` and `entities/EndlessRun.json` with the schemas above. Same RLS as `RunScore` (open read, admin-only create/update/delete).
2. Add `season_id === '2026-S6'` gate in `saveScore.js`. When true, route to the new tables. When false, keep writing to `RunScore` exactly as today.
3. Update leaderboard queries (`getLeaderboard` / page-level filters) to read from `SectorRun` / `EndlessRun` when `season_id >= 'S6'`, fall back to `RunScore` for older periods.

### Phase 2 — S6 rollover automation

The existing `rolloverStalePeriods` scheduled function already runs at the season boundary. Add a step there that:

- Logs the cutover ("Switching run writes to SectorRun/EndlessRun for 2026-S6")
- Posts a Discord alert to `DISCORD_ALERT_WEBHOOK` so we know it flipped cleanly

No data migration needed — S5 data stays in `RunScore`, S6 starts fresh in the new tables.

### Phase 3 — Post-S6 cleanup (week 2 of S6)

Once S6 has run for a week and we've confirmed no regressions:

1. Update admin tools (`AdminSuspiciousRuns`, `AdminGoldAudit`, `AdminBulkScoreDelete`, `AdminRunScoreLookup`) to query both new tables in parallel. Show table source as a column.
2. Update `cleanupKeepTopScoresPerPlayer` and `scheduledCleanupTopScores` to operate on each table independently. New retention rules:
   - `SectorRun`: keep top 10 per (player, arena_id) per season
   - `EndlessRun`: keep top 5 per (player, character_id) per season — endless dominates by character so this matches the leaderboard view
3. Update `softDeleteRunScore` → handles all three tables (route by ID prefix or accept a `table_name` param).

---

## What changes (concrete file list)

### New files
- `entities/SectorRun.json`
- `entities/EndlessRun.json`
- `docs/S6_TABLE_SPLIT_MIGRATION.md` (runbook for the day-of cutover)

### Modified files
- `functions/saveScore.js` — branch on season, write to correct table
- `functions/getSquadProfile.js` — read kills from both new tables (S6+) or `RunScore` (S5)
- `functions/getLeaderboard.js` (or wherever the read paths live) — same branch
- `functions/cleanupKeepTopScoresPerPlayer.js` — per-table retention
- `functions/scheduledCleanupTopScores.js` — schedule both tables
- `functions/softDeleteRunScore.js` — route to correct table
- `functions/auditPlayerGold.js` — scan both tables
- `functions/backfillRunScoreNames.js` — add equivalents for the new tables (or rename to handle all)
- `components/admin/AdminSuspiciousRuns.jsx` — read both tables
- `components/admin/AdminRunScoreLookup.jsx` — table-aware lookup
- `components/admin/AdminBulkScoreDelete.jsx` — table-aware delete
- `components/admin/AdminGoldAudit.jsx` — scan both tables
- `rolloverStalePeriods.js` — log cutover

### Unchanged (this is the win)
- `Squad.weekly_kills`, `Squad.daily_kills` aggregation logic — unchanged, still incremented in `saveScore`
- `SquadWar.kills_a` / `kills_b` aggregation — unchanged
- `PlayerSave.bountyProgress` — unchanged
- `PlayerSave.totalKills` — unchanged
- All daily-task / bounty claim logic — unchanged
- Raid contribution pipeline — already correctly separated
- Meteor attack pipeline — already correctly separated

---

## Risks & mitigations

| Risk                                                | Mitigation                                                                                          |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Leaderboards read wrong table during rollover       | Branch on `season_id` — explicit, no ambiguity                                                       |
| `flushPendingScores` queue has S5 runs at rollover  | Queue payload already carries `season_id` (set at run time, not flush time) — routes correctly      |
| Admin tools miss runs after split                   | Update tools to scan both tables in parallel; show table source                                     |
| Squad daily kills break again                       | Aggregation uses pre-incremented `Squad.daily_kills`, NOT row scans — immune by design              |
| Forgot to update some read path                     | Pre-S6: grep for `entities.RunScore` and audit every site. Each gets a season branch or stays on RunScore for archive reads |
| S6 launch day discovers a bug                       | Feature flag in `AppConfig` (`s6_split_enabled: false`) to instantly revert all writes back to `RunScore` while we patch |

---

## Why this is safer than people think

1. **Zero data migration.** S5 stays in `RunScore`. S6 starts fresh in new tables. No backfill, no double-write, no race conditions.
2. **All pre-aggregated counters are untouched.** Squad wars, bounties, daily tasks, lifetime kills — none of them read run rows. They read counters that get bumped inside `saveScore`. So those features are 100% immune to the split.
3. **`RunScore` already has 2 dead siblings.** `GlobalBossContribution` and `SquadMeteorAttack` already proved this pattern works — they're purpose-built, small, fast, and never caused a daily-kills-style bug. We're just extending the proven pattern.
4. **Feature flag escape hatch.** A single `AppConfig` toggle reverts writes back to `RunScore` if anything goes wrong on launch day.

---

## Out of scope for this plan (future work)

- Splitting `TokenSpendLog` / `GoldSpendLog` — they're already small, not worth it
- Adding a unified `RunLedger` view across all tables — could build a read-only function later if admin tools want one query
- Migrating S5 data into the new tables — explicitly NOT doing this, archive is fine