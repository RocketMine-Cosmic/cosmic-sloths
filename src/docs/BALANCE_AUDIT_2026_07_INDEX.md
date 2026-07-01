# Cosmic Sloths — Full Balance Audit (2026-07-01)

Source-of-truth audit read directly from live code as of 2026-07-01. Every
number below is quoted from the file/line where it lives so you can flip a
value and know exactly what changes.

## Document map

| # | File | Scope |
|---|------|-------|
| 1 | `BALANCE_AUDIT_01_SCORE_AND_RUN_ECONOMY.md` | Score formula, run-end gold/kills/fragments, endless caps, HEAT bonus |
| 2 | `BALANCE_AUDIT_02_UPGRADES_AND_GROWTH.md` | Passives, weapons, level-up, mastery, evolutions, synergies, in-run stat caps |
| 3 | `BALANCE_AUDIT_03_META_PROGRESSION_SINKS.md` | Gold/OMENX prices for stats/weapons/talents/cosmetics, forge, astral, prestige |
| 4 | `BALANCE_AUDIT_04_SQUADS_AND_WARS.md` | Squad XP curve, bounty tiers, treasury buffs, war matchmaking, meteor, champions |
| 5 | `BALANCE_AUDIT_05_LIVE_EVENTS_AND_DAILY_LOOP.md` | Daily login, daily tasks, bounties, raid, weekly kill leaderboard |
| 6 | `BALANCE_AUDIT_06_OMENX_POOLS_AND_PAYOUTS.md` | Token pool splits, staff pct, rank tiers, kill pool, champions pool, S7 gate |

## Global observations up-front (things that will keep showing up)

- **All ISO week / season logic is now consistent** across `saveScore`,
  `squadActions`, `squadWarEngine`, `distributeRewards`, `spendGold`,
  `claimBossReward`, `prestigeRelic`, `forgeAction`, `distributeSquadChampions`.
  Same Mon-start / Sun 23:59 UTC formula in each. Old `getUTCDay() + 1` bug is
  eradicated.
- **S5 → S6 → S7 gates** are the primary balance seams. S5 is legacy-frozen,
  S6 introduced most of the current rules, S7 (starting `2026-S7`, W25) added
  HEAT bonus, softer pushback, DD-on-Normal+Hard, Outer Galaxy HP flattening,
  new pool splits (15/20/5), and armor→% reduction.
- **The Lv1-Lv15 squad table** now agrees between `game/SquadLevels.js`,
  `squadActions/entry.ts`, and the recomputed stored `Squad.level` (backfilled
  2026-07-01 for 11 squads).
- **Score hard ceiling** is `25M` in `saveScore` line 87. Kept as a tampering
  backstop, comfortably above the ~10M legit endless peak.
- **Silent per-wallet score multipliers** (`SILENT_SCORE_MULTIPLIERS` in
  `saveScore` line 31) only apply in S5 and are auto-disabled from S6 onward.
  Currently only one wallet still listed and it's a no-op past S6.
- **429-aware retries** wrap every critical PlayerSave / Squad / SquadWar
  write in every economy function. Reward-crediting failures fire a Discord
  webhook (`DISCORD_ERROR_WEBHOOK`) so unpaid claims surface for manual payout.

## How to use these docs

Each doc has:
- **Constants table** — every numeric knob with its file + line reference.
- **How it composes** — how the numbers flow into what the player sees.
- **Observations / suggestions** — where the math has drift, where a tier
  feels off, where caps interact with each other in weird ways.

Change one number, re-check the composition section for that system, and
the effect should be obvious. If a doc says "must mirror X" — check X too.