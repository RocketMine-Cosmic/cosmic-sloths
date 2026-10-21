# Cosmic Sloths — Operations run-book

**Written:** 21 Oct 2026, from a full read of the repo (github RocketMine-Cosmic/cosmic-sloths @ 33ad90b)
plus live checks of the Base44 app. **Keep this current: when something here changes, change it here.**

**Who does what.** Claude runs the game day to day. It does the daily check, the Monday checks and
payout prep, and answers "what happened to X". It **fixes easy, safe things itself** (re-running a failed
backup or pairing job, clearing a stuck flag) and **reports everything else**. Anything that moves
tokens, changes who gets paid, or changes security **waits for Rob's OK**. Rob comes in for bugs,
improvements and design.

**Other documents.**
- `OMEN_INTEGRATION.md`: Omen (token, prices, API, to-do list for the integration).
- **Deep-read reports** (file:line detail behind every claim here) are kept in the Claude Project
  "Sloths" under `claude/ops-reference/`: `1_core_game`, `2_economy`, `3_payouts`, `4_squads_raids`,
  `5_admin_ops`, `6_platform`. They're a snapshot of the code on 21 Oct, so where this run-book
  and a report disagree, the run-book is newer.

All times are **UTC**. UK clocks go back on Sun 25 Oct, so from then on UTC = UK time. Until then, UK = UTC+1.

---

## 1. The calendar

### Always running (scheduled workflows, checked 21 Oct)

| Job | When | What it does | If it fails |
|---|---|---|---|
| 6-Hourly Data Backup | every 6 h (01:13, 07:13, 13:13, 19:13) | Full snapshot (parts-v2) of 30 tables, keeps 14 days | Re-run it. Safe. |
| Leaderboard Cleanup (Top 5) | every 2 h | Archives runs beyond each player's top 5 per week and mode | Self-heals next run |
| Auto-rollover stale periods | daily 00:30 | Resets expired weekly and seasonal upgrades for every player | Re-run. Safe. (It does run: about 15–35 s each day.) |
| Profile Fan-Out | on every name, title or icon change | Copies it onto leaderboard, squad and chat rows | Self-heals on the next change |
| Squad Wars Weekly Pairing | **Mon 00:05** | Settles last week's wars, then pairs this week | **Re-run the same day** (see 3.1) |
| Refresh store prices (every 5 min) | every 5 min | Fetches the Omen catalogue once and saves it (AppConfig `omen_store_prices`); every player's game reads that copy via `getSkuPrices`. Added 21 Oct to replace per-player polling of Omen | Harmless: after 20 min stale, `getSkuPrices` fetches from Omen itself. Re-run to refresh now |
| Auto payout — 1 … 5 | **Mon 10:40, 11:00, 11:20, 11:40, 12:00** | The automatic payouts, one step each (§3.4) | A stopped step waits for Rob; see §3.4 |
| Activity points — weekly placement + retries | hourly (:17) | Grants Omen activity points for the last two finished weeks' board placements (read from `PayoutLog`, so they land once the Monday payouts are done), Squad War wins and Squad Champions, and retries any grant left `pending`/`error`. Added 21 Oct. Does nothing while `points_config.enabled` is false | Harmless: every grant has a fixed key, the next run picks up where this one stopped |
| Weekly Purge Old Spend Logs | Wed 09:00 | Deletes spend logs older than 6 weeks (only 50 per run, see K-E3) | Harmless |

**Switched off on purpose (never turn on without reading the note):**

| Job | Why it's off |
|---|---|
| Weekly / Seasonal Reward Distribution (`distributeRewards`) | Retired: it would **pay every week again** (K-B1). The automatic payouts are the "Auto payout — 1…5" workflows (§3.4). Never turn these two on. |
| Squad Wars Champions Payout | Retired: Champions is paid by "Auto payout — 5 champions" (§3.4), which names the season itself. |
| Auto-toggle OMENX purchases | Makes a real 1-token purchase from Rob's wallet every 5 minutes. Off since June. |
| Leaderboard Takeover Alert, Weekly Discord Leaderboard Post | Discord posts. No auth checks, and the leaderboard post counts endless runs. |

### Weeks and seasons

- A week is an ISO week, **Mon 00:00 to Sun 23:59:59 UTC**. A season is 4 weeks: `season = floor((week-1)/4)+1`.
- A run counts for the week **in which it is saved**, not the week it started.
- **Now:** 2026-W43, season 2026-S11 (W41–W44, 5 Oct – 1 Nov).

| Date (Mon) | What |
|---|---|
| 26 Oct | Weekly payout for W43 |
| **2 Nov** | Weekly payout for W44, **season S11 payout + Squad Champions** |
| 30 Nov | Season S12 (W45–48) |
| 28 Dec | Season S13 (W49–52). **Week 53 starts: one-week "season S14" and Squad Wars bug, see K-C1** |
| 4 Jan 2027 | 2027-W01 / S1 |

Omen dates: liquidity pool test **21 Oct**, full **22 Oct**, card checkout for opted-in games **23 Oct**.

---

## 2. The daily check (Claude, once a day)

1. **Workflows:** last run of each active job succeeded (Base44 → workflow runs). Backup has 4 new
   manifests marked `complete` in the last 24 h. *Fix if failed:* re-run once.
2. **Discord:** **#errors** and **#economy-alerts** for "CHARGED but not granted", "marked but UNPAID",
   "UNKNOWN STATUS", "circuit breaker", "SKU not found", "price drift". Each one is a support task (§5).
3. **Switches** (`AppConfig`): maintenance OFF, purchases enabled, no forgotten XP buff,
   `min_client_version` not above the live build (1.1.0).
4. **Prices:** `getSkuPrices` returns about 67 prices. Note any that changed (portal edit or token price move).
5. **Pools:** this week's and this season's `TokenPool` rows exist, and no duplicate rows for one period.
6. **Payout leftovers:** any `PayoutLog` with `tx_id` starting `pending-` needs checking on Omen (§5.2).
7. **Raid:** exactly one `GlobalBoss` for this week, once anyone has visited the raid page.
8. **Activity points** (`PointGrantLog`): no rows stuck in `pending`/`error` for more than a few hours
   (the hourly job retries them), and this month's `granted` total is well under 45,000. Refusals and
   `guard` rows are normal; a burst of `refused` with "paused" or "no allocation" in the reason means
   Omen switched something off, so tell Rob. See §5.6.

Report to Rob only when something needs him. Otherwise a one-line "all fine" in the log.

---

## 3. Mondays

### 3.1 After 00:05: Squad Wars

- Pairing workflow run = success. Last week's `SquadWar` rows all `is_resolved=true`. Every squad
  with 1 or more members is in exactly one war this week (no squad in two).
- **If it failed:** re-run the **workflow** the same day (not `squadWarEngine pairAndResolve`, which uses a
  different 2-member rule and posts to Discord). **Never run two at once.** Afterwards compare squads' W/L
  with the war history, because a crash mid-resolve can lose increments (fix in Admin → Squads → War editor).
- Kills from Monday 00:00 until pairing succeeds count for squads' weekly kills but **not** the war.
  On 19–20 Oct this gap was about a day (W43). **Never** run "Resync war kills" live: it rebuilds from
  trimmed leaderboard rows and would *lower* totals.

### 3.2 Weekly payout by hand (fallback only — the payouts are automatic, §3.4)

Use this only when an automatic step has stopped and §3.4 says to finish by hand. The automatic job
presses exactly these buttons, so a step finished by hand counts the same. Admin → Live Ops → **Rewards**.

0. *(Recommended)* **Period Config Lock** → lock the closed week (freezes today's payout config).
1. **Preview Payouts** → Weekly → pick the **closed** week. **Never pick the entry marked "(current)"**:
   nothing stops a payout on the open week. Check:
   - Score pool = 30% of the week's spend, and so is the kill pool.
   - Up to 20 rows each, no endless runs.
   - **No banned wallets.** Payouts don't check the blacklist (K-B4), so remove them by hand if needed.
   - The Staff table is empty (staff is 0%).
   - The status says PENDING, with no "partial payout" warning.
2. **Distribute (Players)**, once, then wait. One tab, one admin. There's no confirm dialog. Re-preview:
   all rows say "Paid".
3. **Kill Pool Only**, then wait and re-preview.
4. **Staff Only, last, even at 0%.** It's the only button that marks the week finished
   (`distributed=true`). Skip it and the week stays "pending" forever, which matters if anyone ever turns
   the automatic job on (K-B1).
5. Check there are no `pending-` PayoutLog rows for the week (§5.2).

### 3.3 Season end by hand (fallback only; next season end: Mon 2 Nov), in this order

1. The weekly payout for the season's last week (W44).
2. **Seasonal:** Preview → Seasonal → `2026-S11` → Distribute (Players). 10% of season spend to the top 20.
3. **Squad Champions:** Admin → Squad Champions. **Pick `2026-S11` explicitly** (not "auto").
   - Pairing must have succeeded first: Champions counts only settled wars.
   - Preview, then Distribute (two clicks within 8 s).
   - It pays **current** squad members, so pay soon after the preview.
   - If it stops part-way, read the message. "Refused" = nothing paid for that part, a re-run is safe.
     "UNCLEAR" = its wallets are logged `pending` and a re-run skips them; check Omen for that tx
     before marking them paid or deleting them (same as weekly pending- rows, 5.2).

### 3.4 Automatic payouts (every Monday since 26 Oct 2026; nobody presses anything)

Rob asked for fully hands-off payouts on 21 Oct. The function `autoPayoutStep` runs one step at a time,
20 minutes apart, from the workflows "Auto payout — 1 … 5" (all times UTC):

| Time | Step | Button it presses | When |
|---|---|---|---|
| 10:40 | `weekly_score` | Distribute (Players), Weekly | every Monday |
| 11:00 | `weekly_kills` | Kill Pool Only | every Monday |
| 11:20 | `close_week` | Staff Only (staff is 0%, so this only marks the week paid) | every Monday |
| 11:40 | `seasonal` | Distribute (Players), Seasonal | Monday after a season's last week; skips itself otherwise |
| 12:00 | `champions` | Squad Champions, Execute, with the season named | same |

It does no payout maths of its own: the amounts, the log-first `PayoutLog` rows and the per-wallet
"already paid" skip are the ones the buttons have always used. Every payout batch now carries Omen's
`idempotencyKey` (K-B8), so an unclear answer followed by a retry is answered by Omen with the first
result instead of paying twice; this protects the buttons too. Around each press the job adds:

- **Only closed periods.** It pays the week that closed last Sunday and, on a season-end Monday, that
  season. It refuses the open week/season even if asked.
- **In order.** A step runs only if the step before it, for the same period, finished `ok` or `skipped`.
- **Once.** A `PayoutRun` row keyed `<period>:<step>` (unique) is written before anything is paid; a
  second run of the same step finds it and does nothing.
- **Stops on anything odd, before paying:** any `pending-` payout anywhere (or a champions row in
  `pending`); 0 or 2+ pool rows for the period; the period already partly paid; an amount over 10,000
  or under 1; the total over the pool; more than 20 wallets (100 for champions); a staff share above 0.
- **Checks afterwards against the books, not the answer:** it re-runs the preview, and the step is `ok`
  only if every owed wallet now has a payout row with a real transaction, and no row is "maybe paid".
- Already paid by hand → `skipped`. Week 53 (28 Dec 2026 – 3 Jan 2027): week 52's Monday skips the
  season (S13 runs on into W53, as decided); week 53's Monday stops the season steps until the 5-week
  season is built (K-C1).

**Where to see it:** the **Reports** tab of the Plan & Roadmap page. A Claude scheduled task writes the
Monday report at about 12:30 UK (12:27 UTC) from `PayoutRun` and `PayoutLog`, and messages Rob only
if something stopped. The evening daily check also reports any stopped or stuck step.

**Switches** (AppConfig `auto_payout`): `enabled` false stops every step; `live` false makes them dry
runs (status `dry`, nothing sent). Both on since 21 Oct.

**When a step has stopped** (`PayoutRun.status` `stopped`, or `running` for more than an hour, which
means it crashed mid-way): later steps refuse to run until it is dealt with. Nothing was paid wrongly;
at worst some wallets are waiting. Read its `reason`, then:
1. "maybe paid" → check those rows on Omen (§5.2) and resolve them.
2. "partly paid", or the step paid some and not others → finish that step by hand with the same button
   (§3.2/§3.3); the button skips everyone already paid.
3. Anything else (pool rows, totals, staff share) → fix the cause, or pay by hand if it was fine.
4. Then delete that step's `PayoutRun` row and run `autoPayoutStep` with `{ "step": "<step>",
   "period": "<period>" }` (or finish the remaining steps by hand). Deleting the row is the only way to let
   a step run again for that period.

**Testing:** `testAutoPayout` (admin, body `{}`) dry-runs seven cases — an already-paid week and season
for every step, the open week, and a planted "maybe paid" row — and returns a pass/fail scorecard;
nothing is paid and its rows are tidied away. 7/7 passed on 21 Oct. Run it after any change to the
payout functions.

---

## 4. Levers (what they do, how fast)

All of these live in `AppConfig`. Players pick up changes within **about 6 minutes** (60 s server cache plus a
5-minute client poll). Base44 admins bypass the maintenance and version gates, so **Rob never sees what players see**.

| Lever | Where | Notes |
|---|---|---|
| Maintenance OFF/SOFT/HARD | Admin → Maintenance | SOFT = banner. HARD = players are kept out of runs **in the browser only**. The server still accepts saves and purchases. |
| Purchases on/off | Admin → Maintenance | Enforced on the server. Manual only (the auto job is off). |
| Minimum client version | Admin → Maintenance | **Never set above the live build** (1.1.0): it would lock everyone out while admins see nothing. |
| Global XP buff | Admin → Maintenance | 1–3×, 72 h max |
| Blacklist | Admin → Blacklist | **Only affects Squad Champions** (K-B4). Banned players can still play and get paid. |
| Mute | Admin → Squad Chat | Blocks squad chat only |
| Omen activity points on/off, amounts, caps | `AppConfig` key `points_config` (no admin screen yet) | `enabled` is the master switch (on since 21 Oct). `amounts` = points per Star Ops card and weekly placement; `guards` = our own caps (45,000 a month, 1,900 per player a month, 135 per player a day for the daily cards). Read on every claim, so a change applies at once. Switching off stops all grants; nothing else in the game changes. |

---

## 5. Playbooks

### 5.1 "I paid but didn't get it"
1. Get the wallet, the rough time and the item.
2. Search #errors and #economy-alerts for the wallet.
3. Admin → Gold Audit (last 20 spend rows), or `adminQueryWeeklySpend`.
4. **The Omen portal's transactions are the only true record.** Compare them with our logs.
5. If Omen charged and we have **no spend log**, it was a "pending" or "grant failed" charge (K-B6). Grant
   the item with Admin → Players (save editor) or refund with Admin → Refund Player (manual, with a reason).
6. If there **is** a spend log but the item is missing, a later save from an old tab overwrote it. Check
   SyncBlockLog and re-grant.
7. **Raid runs bought but missing:** add `extraRaidRuns[date] += 5` in the save editor.

### 5.2 `pending-` payout rows
A payout button hit an unclear answer from Omen and recorded the wallet as "maybe paid". Find the batch on
the Omen portal (note text `Cosmic Sloths weekly payout <week> — Rank #N`).
- **Paid:** leave the row (optionally put the real hash in `tx_id`).
- **Not paid:** delete the row, then press the same button again. Only those wallets get paid.
- **Never** delete one while Omen still shows it pending.

### 5.3 A backup failed
Re-run the workflow. If it fails twice, it's usually Base44's write-volume limit, so wait an hour.
There is **no restore for the new format yet**, and the old Restore button must not be used (K-E4).

### 5.4 Saving a player's save by hand
The save editor writes the **whole** save as it was when the editor opened. Anything the player earned
meanwhile is lost (K-E5). Ask the player to stay offline, open, edit and save quickly.

### 5.5 Someone can't log in
1. `OmenAuthEvent` for the wallet: no row this week means they never finished Omen's login.
2. `User.wallet_address`: is it linked?
3. A "PLAYER_NOT_FOUND" on balance means Omen doesn't see a recent session. Re-login fixes it.
4. On a new domain, check the redirect URI is registered on the Omen portal **with `/auth/callback`**.

### 5.6 Omen activity points
Players earn Omen activity points for finishing Star Ops cards (login 10, all 3 bounties 10, all daily
tasks 10, daily mission 5, login streak 3/7/14/30 days 25/50/100/100) and for weekly placement (top 10
of each weekly board 100/75/50/25, Squad War win 10, Squad Champions 100). Omen gives us 50,000 a month,
max 2,000 per player, max 100 per grant; **unused points are lost at month end**. Every grant is one
`PointGrantLog` row, written before Omen is called and keyed by a fixed idempotency key
(`ap-<event>-<day or week>-<wallet>`), so nothing can be paid twice. Design and Omen facts: project doc
`claude/handoffs/ACTIVITY_POINTS.md`; Omen side: `OMEN_INTEGRATION.md` Part 4 item 7.
- **"I didn't get my points":** find the wallet's rows for the day. `granted` = Omen has them (they show
  on the player's Omen profile, not as a game currency). `refused` / `not_in_game` = Omen's final answer;
  the reason says why (most often the player's 2,000 monthly ceiling). `guard` = our own cap stopped it.
  No row = the claim didn't qualify (e.g. not all 3 bounties claimed) or points were off.
- **Rows stuck `pending` / `error`:** the hourly job retries them with the same key. After about three
  tries it stops; check Omen's status and the key secrets (`OMENX_POINTS_API_KEY`, `_2`, `_3`, `_4`).
- **Weekly placement missing on a Monday:** it reads `PayoutLog`, so it lands at the first :17 after the
  payout buttons are pressed.
- **Never** grant by hand outside the log, and never change a key format: the key is what stops a
  double grant.

### 5.7 VIP chests (automatic since 21 Oct 2026)
Omen sends each chest win to `onVipChestRewardGranted`; the prize (gold + star fragments + a cosmetic) goes on the
save by itself, the chest Discord channel gets a line saying what was given, and the player sees a 🎁 popup next
time they open the game. Nothing to press. Full record: `claude/handoffs/VIP_CHESTS.md`.
- **Where to look:** Admin → Player Operations → 🎁 VIP Chests. "Needs attention" should say *Nothing needs you*.
- **Held** = the wallet has never played. It is given automatically the first time they open the game. Nothing to do.
- **Failed** = press *Retry grant* (safe: a receipt can never pay twice).
- **Needs you** = Omen sent an item the game doesn't know (a new product on the portal?). Nothing was given.
  Grant it by hand with the 🎁 Grant tool, then press *Mark handled by hand* — and add the product to
  `base44/shared/vipChests.ts` so the next one is automatic.
- **Duplicates** are swapped for another cosmetic of the same rarity; if the player owns them all, 150 (epic) or
  450 (mythic) star fragments instead. Eclipse Crown is only ever given by an Elite chest.
- **"Bad signature" errors from Omen** after someone pressed *Regenerate secret* on the portal: copy the new secret
  into the Base44 secret `OMENX_VIP_CHEST_WEBHOOK_SECRET` straight away (there is no grace period).
- **Never** edit `vipChestReceiptsApplied` on a save by hand: it is what stops a chest paying twice.

---

## 6. Never press (without Rob, and a reason)

- Economy → **Cleanup spend logs**: deletes every spend log outside the current week, with no audit row.
- **Bulk Refund**, **FULL RESET**, **Wipe / Nuke**.
- **Restore** (old backups: wipes everything and re-creates rows with new ids).
- **Seed squad treasuries**: free gold for every squad at 0.
- **W19 top-up**, **backfillPartialPayout**: old pre-S7 formula, wrong today.
- **backfillStaffPayouts**: defaults to *live* across every past week.
- **Resync war kills** (live), **backfillWeeklySectorKills**: both lower real numbers.
- **Restore Score** (Duplicates tab): makes a leaderboard row from typed numbers, and those rows get paid.
- **Squad core editor "Save"** on a Lv8–15 squad: it drops the squad to Lv7 (K-F3).

---

## 7. Known issues register

Status: 🔴 open · 🟡 in progress or watched · ✅ fixed. "Easy" = small, contained change.
**Needs Rob** = touches money, security or game design.

**How fixes ship.** Gameplay and rules changes go live at a **rollover** (start of a week or
season) behind a season gate (`src/lib/seasonGate.js`, mirrored server-side). That's how every
patch since S6 has landed, so players get changes at a clean boundary, never mid-week. Backend fixes
that don't change rules (e.g. a payout safety fix) can go in any time, but not in the middle of a payout.

### A. Security
| ID | Issue | Impact | Effort | Status |
|---|---|---|---|---|
| K-A1 | **Who a player is rests on `User.wallet_address`.** See §9 for how it works, why it's built this way, and the evidence. In short: the field is written with the player's own login, so the player can also write it directly, and the server never re-checks Omen. **No sign of abuse** (checked 21 Oct). | Critical **if** used | **Decided 21 Oct: watch only.** It's in the daily check (§9). Nine months live without a problem. **Don't change the login flow or `User.wallet_address`**: the table rules and the two-login setup depend on it. | 🟡 watched |
| K-A2 | **Functions with no caller check, callable by anyone on the internet:** `scheduledMaintenanceFlip` (lock the game), `autoToggleOmenxPurchases` (purchase from Rob's wallet), `mirrorProfileFanOut` (rename anyone), `alertLeaderboardTakeover`/`postDiscordLeaderboard` (Discord spam), `backupData {is_automated}` (burns write quota), pairing and cleanups. Anonymous calls do reach functions (confirmed 20 Oct with `getSkuPrices`). | High | Easy: a shared secret for scheduled callers, an admin check for people | 🟡 **Part fixed 21 Oct:** maintenance flip, purchase toggle, Discord leaderboard post and direct name-mirror now need admin (403 otherwise); takeover alert and name-mirror trigger re-read the database. Still open: `backupData {is_automated}`, pairing, cleanups, purges (they run on schedules, need care). |
| K-A3 | Login popup posts tokens to `'*'`. `state` isn't checked, and any saved verifier is accepted. Raw tokens are written to function logs. | Medium | Easy | 🔴 |
| K-A4 | `manage_admins` holders can give themselves wipe or refund rights. Squad surgery (`adminSquadOps`, including delete) and several backfills accept **any** staff wallet. | Medium | Easy | 🔴 |
| K-A5 | Squad actions: any player can remove any squad member; officers can kick from other squads; anyone can post in any squad chat. | High (griefing) | Easy | ✅ **Fixed and published 21 Oct.** `leave` now only removes the caller's own row; `kick` requires the target to be in the caller's squad (and a failed lookup refuses instead of carrying on); `sendMessage` requires membership. Membership checks are case-insensitive (`getCallerMemberCI`) because older rows have mixed-case wallets. Proved with a mock harness: old code allowed all three, new code refuses them and normal leave/kick/chat still work. |
| K-A6 | The emergency key `AdminDash` unlocks ~27 functions, sits in the browser's sessionStorage, and has never been rotated (as far as we know). | Medium | Rotate it | ✅ Rotated by Rob 21 Oct (only Rob knew it; never used). Rob is the only Base44 admin. |

### B. Money paths
| ID | Issue | Impact | Effort | Status |
|---|---|---|---|---|
| K-B1 | The automatic payout job (`distributeRewards`) re-pays any week not marked finished, never checks PayoutLog, and pays seasonal and weekly at the same minute. | Critical if enabled | Keep off for ever. | ✅ **Replaced 21 Oct** by the automatic payouts (§3.4), which press the existing buttons with guards. The old job stays off. |
| K-B2 | **Squad Champions payout:** records only after success, and retries unclear answers with another key, so it can **pay twice**. Next run **2 Nov**. | High, dated | Easy: same log-first pattern as the weekly buttons | ✅ **Fixed 21 Oct** (live, before the 2 Nov run). Only a 429 now switches key. |
| K-B3 | Refunds (single and bulk) keep no record and retry, so they can refund twice. Manual refund can send up to 100,000 to any wallet. | Medium | Easy: log-first and a record | 🔴 |
| K-B4 | The blacklist isn't checked by the weekly, seasonal or kill payouts. | Low | Easy | ✅ Not needed (Rob, 21 Oct): nobody is banned; `BlacklistedWallet` is empty. Revisit only if someone is ever banned. |
| K-B5 | Payout buttons: no confirm, nothing stops two at once, and the open week can be paid. | Medium | Easy: confirm, closed-period check, lock | 🔴 |
| K-B6 | Purchases that Omen leaves "pending", or whose grant fails to save, are charged with no item, log or alert. Buy All can charge twice on a retry (new idempotency key per call). | Medium (support load) | Moderate | 🔴 |
| K-B7 | Server price checks: a level-1 upgrade item can grant any level; talent tier and cosmetic id come from the client; `spendGold` takes the client's gold cost. | High if exploited | Moderate | 🔴 |
| K-B8 | Omen's idempotency key isn't sent on payouts. It would answer the `pending-` cases automatically (OMEN_INTEGRATION item 1). | Low | Moderate | ✅ **Fixed 21 Oct:** every grant-batch (weekly, kills, staff, seasonal, champions) sends a key made from the period, tier and a hash of its wallets and amounts, so the same batch always has the same key. |

### C. Dated bugs
| ID | Issue | When | Status |
|---|---|---|---|
| K-C1 | **2026 has 53 weeks.** W53 wars are never settled (code assumes 52), W53 becomes a one-week season S14, Champions "auto" skips it, and the treasury skips W53. | Fix before **28 Dec** | 🟡 **Decided (Rob, 21 Oct): W53 joins S13** — a 5-week "bumper Christmas" season S13 (W49–W53, 30 Nov – 3 Jan), paid Mon 4 Jan. There is no S14. To build: season formula caps at 13, W53 wars settle, Champions/treasury handle W53. |
| K-C2 | Squad profile uses an old week formula: shows 0 weekly kills and raid damage every Sunday. In 2027 it's a full week out. | Now | 🔴 Easy |
| K-C3 | Raid "ends in" timer counts to Sunday 00:00 (the week ends Sunday 23:59) and shows 7 days on Sundays. | Now | 🔴 Easy |

### D. Trust (the browser decides)
| ID | Issue | Status |
|---|---|---|
| K-D1 | The server takes the run's gold, kills, level, victory, sector and HEAT from the browser (gold cap removed in S6 on purpose). Sector unlocks can be faked with a 1-second "win". | 🔴 Design decision. Check the data for abuse first |
| K-D2 | Kill credit goes to **whatever squad the browser names**: wars, bounties and Champions money. | 🔴 Easy: use the player's real squad |
| K-D3 | Raid and meteor damage come from the browser (up to 5M and 100M a call). The 5/day raid limit and bought runs are browser-only. | 🔴 |
| K-D4 | Daily tasks, bounties and some progress fields can be rewritten by the browser, then claimed for any reward. A new wallet's first save is stored exactly as sent. | 🔴 |
| K-D5 | War bonuses can be claimed by joining a squad later (no week limit). The rejoin cooldown is browser-only. | 🔴 Easy |
| K-D6 | In-run reroll, banish, ult and revive are granted before payment, and a failed charge is ignored. | 🔴 |

### E. Data and operations
| ID | Issue | Status |
|---|---|---|
| K-E1 | Seasonal pool "reconcile" (only in the automatic job) can shrink a pool past 5000 log rows. | 🔴 (job off) |
| K-E2 | Admin metrics and health numbers stop at 1000–5000 rows without saying so. | 🔴 |
| K-E3 | The weekly spend-log purge deletes at most 50 rows, so the table probably grows forever. | 🔴 Measure first |
| K-E4 | There's no restore for parts-v2 backups, and the old Restore is destructive. | 🔴 |
| K-E5 | Admin save edits overwrite with stale data (the editor, Grant, Gold refund). | 🔴 |
| K-E6 | The old purchase probe sends a fixed 1-token amount and would misfire under USD pricing. | 🔴 (off) |
| K-E7 | Balance lookup matches the token symbol `'OMENX'`. If Omen renames it, everyone shows 0 and can't buy. | 🔴 Watch. Easy to harden by contract address |
| K-E8 | Rotating keys on Omen 429s multiplies calls (limits are per game). | 🔴 |
| K-E9 | Two broken admin buttons: Restore on Deleted Scores, and Backfill Wallets (they call functions that don't exist). | 🔴 Easy |
| K-E10 | **Save writes can silently undo each other.** Every server function that changes a save (runs, sync, shop, forge, daily login, bounties, squads — 28 places) reads the whole save and writes it all back, so two at once lose one. Both ways: a reward can be lost, or a reward can undo a run's gold. Probe 21 Oct: 20 overlapping writes of +1 → 1. K-E5 is the admin-tool case of the same thing. | 🟡 **Fix agreed with Rob 21 Oct**, in stages (`claude/handoffs/SAVE_WRITES.md`): atomic reward steps + version-checked writes. VIP chests already atomic (live 21 Oct). **Daily login next**, then the rest; runs and sync last. |

### F. Small
- K-F1: The legendary trail is $30, over Omen's $25 limit, so it can't be bought (halving prices fixes it).
- K-F2: The treasury buff costs players gold but does nothing in game. Confirmed 21 Oct on live code: only the treasury screens and admin tools read `active_buff_tier`. ~69M gold spent by 10 squads since June (donated minus balance). **Rob, 21 Oct: make it work as the screen says** (meant as a gold sink with a real effect). Plan: server-side only — squad XP bonus at the weekly rollover in `squadActions` (read the ending week's buff before it is cleared; war/Champions kills untouched), gold bonus on `run.gold` in `saveScore` after scoring, boss damage bonus in `submitBossDamage` after the clamp; squad looked up from real membership, never the browser's squad id (K-D2). Ships at a rollover behind the season gate.
  **✅ Built and published 21 Oct; switches on at the W43→W44 rollover (Mon 26 Oct 00:00 UTC).** Code: `base44/shared/treasuryBuff.ts` (tiers, week gate `TREASURY_BUFF_START_WEEK`, lookup), new function `getMyTreasuryBuff` (run start), `GameEngine` xpMult, `saveScore` (`treasuryGoldBonus` in the response and inside `gold_credited`), `submitBossDamage` and `submitSquadMeteorDamage` (bonus after the clamp/cap). Results screen shows "incl. +N squad buff". A buff bought for this week counts even if nobody has opened the Squads page yet (pending slot checked). **To check from 26 Oct:** a buffed squad's RunScore `gold_credited` > `gold_earned` by the tier %, and its raid/meteor contributions carry the bonus. Known gap: buying in W52 lands the buff on 2027-W01, not W53 (fix with K-C1).
- K-F3: Squad core editor Save drops Lv8–15 squads to Lv7.
- K-F4: The Champions share is 10% in code but 5% in the comments and workflow text.
- K-F5: The cron pairs 1-member squads; the manual path needs 2.
- K-F6: The in-run score display uses the old S5 formula (doesn't match the leaderboard).
- K-F7: Practice (sandbox) endless runs can leak onto the real leaderboard after recovery. A failed
  final save can credit twice.

---

## 9. Identity: how a player is recognised (looked into 21 Oct)

**How it works.** A player has **two logins**:
- **Base44:** the session the game's database and functions run under.
- **Omen:** OAuth, which proves they own a wallet.

The game joins them in `linkWalletToUser`. It checks the Omen token with Omen, then writes the
wallet onto the player's **own Base44 profile** (`User.wallet_address`) using the player's own login.
From then on every function asks "whose wallet is this?" by reading that profile field.

**Why it's on the profile.** Base44's table rules (RLS) can only look at fields on the signed-in user
(`{{user.data.wallet_address}}`). That is how "a player can only read their own save" works on
`PlayerSave`, and the browser reads saves directly in places (e.g. the meteor pool-bias picker). The
two logins also fought each other when this was set up (Rob, 21 Oct), and the weekly re-login exists
to keep Omen's session alive. **So the profile field and the flow around it stay as they are.**
Earlier security work closed a different hole: someone signing into another player's Base44 account
on a new device and being auto-linked. That's the "localStorage only, never rebuild Omen auth from
the profile" comments in `OmenXAuthContext.jsx`.

**The gap.** Base44 lets a signed-in user change their own custom profile fields (`auth.updateMe`).
That's proven by how linking works: 4 of the 5 most recently updated accounts are ordinary
`role: user` accounts with a wallet written by their own login. So a player could write a different
wallet from the browser console. Every function would then treat them as that wallet: its save, its
OMCADE purchases (the payment key charges whatever wallet is linked), and admin rights if it's an
admin wallet. The weekly re-login doesn't stop it, because it writes the real wallet only when the
player chooses to log in.

**Evidence of abuse (21 Oct): none found.**
- Each of the 3 admin wallets is linked to exactly one account. Rob's wallet is linked only to Rob.
- 164 accounts: 3 wallets are each linked to two accounts. All 3 have real Omen logins on record
  (`OmenAuthEvent`). Omen allows one wallet per Omen user (Rob, 21 Oct), so these are the same
  person with two Base44 accounts, not two people.

**Options (Rob to choose):**
1. **Detect only (zero risk to login).** The daily check flags:
   - any admin wallet linked to more than one account;
   - any account whose wallet has no matching real Omen login (`OmenAuthEvent`);
   - any new wallet shared by two accounts.
2. **Server-only copy.** Keep the profile field and the whole login flow exactly as they are. Add a copy
   of the verified wallet that only the server can write, and make the server functions trust
   that instead. The browser and table rules don't change. This touches ~80 functions, and on Base44
   backend changes reach automations at once and the live site on the next publish: there's no branch test for functions.

**Decision (Rob, 21 Oct): option 1, watch.** The game has run nine months without a problem here.
The daily check does the watching.

**The Supabase switch-over is stopped (Rob, 21 Oct).** Omen changes too often to keep two copies
in step, so Base44 stays the live home of the game. Any fix happens here.

## 8. Questions for Rob (ask one at a time; remove when answered)

Answered 21 Oct: Rob is the only Base44 admin. Staff list now Rob (owner) and Crybel (view only); Texxy (Support, inactive since June) removed by Rob via Managers, details kept in AdminChangesLog. Answered 21 Oct: W43 war kills were already recovered (Rob ran "Resync Squad War Kills"; note the resync writes nothing to AdminChangesLog, so it can't be seen there).

Later, Rob's call (not urgent): sort out activity points; move the VIP chest webhook off the old
Supabase build (today a Discord alert arrives and Rob rewards the chest by hand).

Note: function fixes reach scheduled jobs at once, but the live site keeps the old version until the
app is **published**. After a function fix, publish and then test on cosmic-sloths.com.

_None open (21 Oct)._
