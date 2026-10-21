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
| Weekly Purge Old Spend Logs | Wed 09:00 | Deletes spend logs older than 6 weeks (only 50 per run, see K-E3) | Harmless |

**Switched off on purpose (never turn on without reading the note):**

| Job | Why it's off |
|---|---|
| Weekly / Seasonal Reward Distribution (`distributeRewards`) | It would **pay every week again** that was paid by hand. See K-B1. Payouts are done by hand. |
| Squad Wars Champions Payout | Log-first since 21 Oct (K-B2 fixed): an unclear answer leaves `pending` rows and stops. |
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

### 3.2 Weekly payout (by hand, any time Monday after 00:05; Rob presses, or Claude with Rob's OK)

Admin → Live Ops → **Rewards**.

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

### 3.3 Season end (next: Mon 2 Nov), in this order

1. The weekly payout for the season's last week (W44).
2. **Seasonal:** Preview → Seasonal → `2026-S11` → Distribute (Players). 10% of season spend to the top 20.
3. **Squad Champions:** Admin → Squad Champions. **Pick `2026-S11` explicitly** (not "auto").
   - Pairing must have succeeded first: Champions counts only settled wars.
   - Preview, then Distribute (two clicks within 8 s).
   - It pays **current** squad members, so pay soon after the preview.
   - If it stops part-way, read the message. "Refused" = nothing paid for that part, a re-run is safe.
     "UNCLEAR" = its wallets are logged `pending` and a re-run skips them; check Omen for that tx
     before marking them paid or deleting them (same as weekly pending- rows, 5.2).

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
| K-A5 | Squad actions: any player can remove any squad member; officers can kick from other squads; anyone can post in any squad chat. | High (griefing) | Easy | 🔴 |
| K-A6 | The emergency key `AdminDash` unlocks ~27 functions, sits in the browser's sessionStorage, and has never been rotated (as far as we know). | Medium | Rotate it | 🔴 Needs Rob |

### B. Money paths
| ID | Issue | Impact | Effort | Status |
|---|---|---|---|---|
| K-B1 | The automatic payout job (`distributeRewards`) re-pays any week not marked finished, never checks PayoutLog, and pays seasonal and weekly at the same minute. | Critical if enabled | Keep off. Mark all paid weeks finished. Rewrite before ever enabling. | 🔴 (off) |
| K-B2 | **Squad Champions payout:** records only after success, and retries unclear answers with another key, so it can **pay twice**. Next run **2 Nov**. | High, dated | Easy: same log-first pattern as the weekly buttons | ✅ **Fixed 21 Oct** (live, before the 2 Nov run). Only a 429 now switches key. |
| K-B3 | Refunds (single and bulk) keep no record and retry, so they can refund twice. Manual refund can send up to 100,000 to any wallet. | Medium | Easy: log-first and a record | 🔴 |
| K-B4 | The blacklist isn't checked by the weekly, seasonal or kill payouts. | Medium | Easy | 🔴 Needs Rob (policy) |
| K-B5 | Payout buttons: no confirm, nothing stops two at once, and the open week can be paid. | Medium | Easy: confirm, closed-period check, lock | 🔴 |
| K-B6 | Purchases that Omen leaves "pending", or whose grant fails to save, are charged with no item, log or alert. Buy All can charge twice on a retry (new idempotency key per call). | Medium (support load) | Moderate | 🔴 |
| K-B7 | Server price checks: a level-1 upgrade item can grant any level; talent tier and cosmetic id come from the client; `spendGold` takes the client's gold cost. | High if exploited | Moderate | 🔴 |
| K-B8 | Omen's idempotency key isn't sent on payouts. It would answer the `pending-` cases automatically (OMEN_INTEGRATION item 1). | Low | Moderate | 🔴 |

### C. Dated bugs
| ID | Issue | When | Status |
|---|---|---|---|
| K-C1 | **2026 has 53 weeks.** W53 wars are never settled (code assumes 52), W53 becomes a one-week season S14, Champions "auto" skips it, and the treasury skips W53. | Fix before **28 Dec** | 🔴 Needs Rob (what should S14 be?) |
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

### F. Small
- K-F1: The legendary trail is $30, over Omen's $25 limit, so it can't be bought (halving prices fixes it).
- K-F2: The treasury buff costs players gold but does nothing in game.
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

Later, Rob's call (not urgent): sort out activity points; move the VIP chest webhook off the old
Supabase build (today a Discord alert arrives and Rob rewards the chest by hand).

Note: function fixes reach scheduled jobs at once, but the live site keeps the old version until the
app is **published**. After a function fix, publish and then test on cosmic-sloths.com.

1. Should banned wallets be left out of all payouts (K-B4)?
2. What should week 53 / "S14" be: merged into S13, merged into 2027-S1, or a short season (K-C1)?
3. Compensate the ~1 day of W43 war kills lost to the pairing failure?
4. Is the treasury buff meant to do something?
5. Who else holds admin permissions or the `AdminDash` key, and rotate it?
