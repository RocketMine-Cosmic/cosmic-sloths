# Omen game-sdk v2.2.0 — Upgrade Plan + VIP Points / Quests / Activity Points

**Date:** 2026-09-17 · **Source:** `@omen.foundation/game-sdk@2.2.0` (README, CHANGELOG, `ai/GAME_SDK_FOR_AI.md`, `API_ENDPOINTS.md`)
**Status:** Plan only — nothing changed yet.

> We do **not** import the npm SDK (it uses runtime code-gen the Deno isolate blocks — see
> `shared/omenxRest.ts`). We talk to the same HTTP endpoints directly, so "upgrading" means
> matching the *behaviour* 2.2.0 encodes, not installing the package. The `@omen.foundation/game-sdk`
> entry in package.json is unused and can be removed.

---

## Part A — What changed and what we need to do

### A1. 🔴 Payouts: `idempotencyKey` on grant-batch (the 2.2.0 headline)

**What changed:** `POST /v1/game-rewards/grant-batch` now accepts `idempotencyKey` (≤128 chars).
Same key + same recipients → replays the original result (`200`, `replayed: true`). Same key +
different recipients → `409 IDEMPOTENCY_KEY_REUSED`. A grant that timed out now returns
**`502 GRANT_PENDING`** (not `GRANT_FAILED`) and you retry with the same key to read the outcome.

**Why it matters to us:** every double-pay risk we've been fighting (the `pending-…` PayoutLog
log-first pattern, "leave pending rows on 5xx", the 502/504 payouts that landed on-chain but had no
history record) exists *because* this endpoint had no idempotency. It now does.

**Changes (all four payout functions — `manuallyDistributeRewards`, `distributeKillPool`,
`distributeStaffPayout`, `distributeRewards`, plus `distributeSquadChampions`, `topupWeeklyPayout`,
`backfillPartialPayout`, `refundSinglePlayer` / `refundAllOmenx` if they grant):**

1. Send a **deterministic** `idempotencyKey` per batch:
   `cs-${period_type}-${period_id}-${tierKey}` (e.g. `cs-weekly-2026-W38-r4-10`,
   `cs-staff_weekly-2026-W38`, `cs-weekly_kills-2026-W38-r1`). Never include `Date.now()`.
   Store the key on the PayoutLog rows (`tx_id` can stay; add `idempotency_key` field).
2. On `502 GRANT_PENDING` / network error / timeout: **re-POST the identical body with the same
   key** (a few times, backoff) instead of throwing and leaving `pending-…` rows. The replay tells
   us definitively whether it paid → write the real `transactionId`.
3. Treat `409 IDEMPOTENCY_KEY_REUSED` as a bug alarm (recipient set drifted between attempts —
   e.g. a RunScore was deleted mid-retry). Don't auto-retry; surface to admin.
4. Treat `409 GRANT_NOT_REPLAYABLE` (refunded) as "reconcile manually".
5. Distinguish `502 GRANT_FAILED` (fresh terminal failure — nothing paid, safe to delete pending
   rows and retry with a **new** key) from `422 GRANT_FAILED` (replay of an already-failed key).
6. Add an admin **"Resolve pending payouts"** button: for every PayoutLog with `tx_id` starting
   `pending-`, replay its batch key and patch the real tx or mark failed. Retires the current
   "look it up on-chain yourself" instruction in the Rewards tab.
7. Batch size ≤ 200 payments, amount ≤ 300,000 — we're well inside both. Rate limit is
   **10/min on grant-batch per game** — our tiered send (up to 9 tiers + staff + kills) is fine but
   don't parallelise across tiers.
8. Extract one shared `postGrantBatch()` helper into `base44/shared/omenxRewards.ts` — the same
   ~40 lines are currently copy-pasted into 4+ functions.

**Verify with Omen first:** the changelog says GRANT_PENDING ships as "API revision 2026-09-01;
callers pinned to 2026-08-01 keep receiving GRANT_FAILED". The endpoint doc shows no revision
header, so ask Omen whether unpinned callers (us) get the new behaviour by default.

### A2. 🟠 Purchases: error-code alignment in `purchaseSku`

We regex-match `error.message`; the SDK now says branch on `error.code`. Our
`shared/omenxPurchase.ts` already keeps the raw body in the thrown message, so a small parse
(`parseErrorEnvelope` equivalent → `{ status, code }`) lets us switch to code matching. Specific
gaps vs the 2.2.0 table:

| Code | Today | Should be |
|---|---|---|
| `403 NOT_IN_GAME` | falls to generic "settlement error" (500) | same handling as `404 PLAYER_NOT_FOUND` → "reconnect wallet", `omenSessionStale: true` |
| `429 PLAYER_SPEND_CAP_EXCEEDED` | treated as key rate-limit → cycles keys, then "too many purchases" | **terminal**, no key cycling: "You've hit OmenX's spending limit for this game — try again later" |
| `400 CHARGE_EXCEEDS_LIMIT` ($25 USD per-purchase ceiling) | generic error | explicit message; also **audit our SKU prices in USD** — anything > $25 will now fail (lvl-3 permanent talents / bulk fragment bundle?). Ask Omen to raise our ceiling if needed |
| `402 INSUFFICIENT_FUNDS` | handled | **doesn't exist** in the API — harmless dead branch, remove |
| `503 IDEMPOTENCY_LOOKUP_UNAVAILABLE`, `503 KYC_LOOKUP_UNAVAILABLE` | caught by generic 503 retry | fine — but honour `Retry-After` header instead of immediate retry |
| `501 NFT_GRANT_NOT_IMPLEMENTED`, `503 PLATFORM_FEE_MISCONFIGURED` | retried as transient 5xx | terminal — add to `isTerminal5xx` |
| `422 PAYMENT_REFUNDED` | generic 422 path | terminal, message "payment was reversed" |
| `200 status: "refunded"` | "didn't go through, not charged" | "reconcile" — they may have been charged and refunded; don't claim not charged |
| nonce-too-low key rotation | rotates idempotency key | SDK forbids fresh keys; keep for now but re-test whether Omen's cache still replays the 422 |

Also: `PAYMENT_PENDING` is expected to take **up to a minute+** under congestion; our 8s client
cap × 3 attempts for out-of-run SKUs (~24s) may give up while the charge still lands. Consider a
follow-up "collect outcome" replay (same key) when a 502 PENDING is the final error, before showing
the player a failure.

### A3. 🟡 Player reads: `fresh` defaults to **true** server-side

Every `GET /players/:wallet` we make without `fresh=false` forces an uncached read. Our balance
polling (`getPlayerBalance`, `useOmenXBalance`) and `ownsCharacter` check should pass
`?fresh=false&maxCacheStalenessMs=30000` for cheap polling; keep uncached for
`adminRefreshPlayerNFTs`. Also switch `getPlayerBalance` to the lighter `/players/:wallet/balances`.

### A4. 🟡 Client-side session handling (mirrors SDK 2.x)

- The SDK now derives session expiry from the access token's `exp` claim and fires
  `onSessionExpired` → re-authenticate. Our `enforceWeeklyOmenSession` + `ReauthNotice` do the
  equivalent; confirm we also read `exp` for iframe-delivered tokens (the SDK notes embedded games
  had **no** expiry detection before).
- Default OAuth scope is now `openid profile` — check whether we request `email`; drop it if unused
  (removes an extra consent screen).
- `POST /v1/oauth/embed-token` exists for embedded games (no SDK method) — candidate replacement
  for our parent-postMessage token handoff.

### A5. 🟢 Housekeeping

- Remove unused `@omen.foundation/game-sdk` from package.json.
- `README`: purchases now expose `platformFeeApplied`, `platformFeeTxHash`, `developerNetTxHash` —
  worth logging on TokenSpendLog for reconciliation.
- Discord: Omen can proxy channel posts (`/v1/discord/channel-messages`). We use our own webhooks;
  no change.

---

## Part B — VIP Points, Quests, Activity Points

Three separate point systems, all server-side (`OmenXServerSDK` / API key), none reachable from
the browser. Our existing design doc (`design/VIP_POINTS_AND_QUESTS.md`) covers VIP + Quests;
**Activity Points are new** and change the recommendation.

### B1. The three systems

| System | Endpoint | Scope | What it is | Pool? |
|---|---|---|---|---|
| **VIP points** | `POST /v1/vip/grant-points` `{ wallet, amount:int≥1, questId? }` → `{ wallet, amount, phaseIndex }` | `vip_points:write` | Raises the player's **VIP tier**, which decides their **share of the OMENX epoch pool** — i.e. real value | **100,000 / month** · max **300 per quest** · **no per-player limit** |
| **Activity points** | `POST /v1/activity/grant-points` `{ wallet, amount, questId? }` + **`Idempotency-Key` header or `questId` mandatory** → `{ wallet, baseAmount, credited, vipMultiplier }` | `activity_points:write` | **Non-redeemable.** Drives the platform **leaderboard, which ranks by placement in each game, not raw points** — so the *amount* matters far less than who gets one | **10,000 / month is a TESTING allocation, negotiable** (Omen game-dev-chat, 2026-09-17: "open a ticket with roughly how many players you expect to reward and how often — we would rather size it with you than guess") · max **100 per grant** · max **1,000 per player per month** (this ceiling exists deliberately so a pool can't concentrate on a few accounts — **must handle the rejection**, which names the ceiling and the wallet's remaining balance) |
| **Quests** | `GET /v1/quests/players/:wallet?questType=` · `POST …/assign {questType,count 1–50}` · `POST /v1/quests/progress {wallet,questKey,value,stepKey?}` · `POST /v1/quests/complete` · `POST /v1/quests/claim` → `{ pointsGranted }` · `POST …/reset {action:wipe\|reset,questKey?}` | `quests:read` / `quests:write` | Omen-hosted quest definitions (templates configured in dev portal) that show in the player's OmenX profile. Claim pays **VIP points from our pool** | Draws from the VIP pool |

Error codes: `GRANT_POINTS_FAILED`, `ASSIGN_FAILED`, `PROGRESS_FAILED`, `COMPLETE_FAILED`, `CLAIM_FAILED`.

### B2. FINAL split (Omen ruling, 2026-09-19 — Edward, #cosmic-sloths)

**Activity points = the daily loop AND weekly placement. VIP points = not used.**

Omen's answer to our sizing ticket, verbatim points:
- "Build the daily loop on activity points. That is what they are for." From **22 September VIP
  points for games are *bought*, not allocated** — a VIP daily loop would cost us real money.
- Our activity allocation is raised to **50,000 / month**, **per-player ceiling 2,000 / month**,
  **per-grant max stays 100** (covers our largest single award).
- The monthly allocation **does not carry over**. The per-player ceiling is a *share* of the
  allocation — if the pool is raised later the ceiling rises with it.
- **Come back before 150 monthly actives** and they size it again.
- Refusals (clear code, nothing written): a grant > 100; a grant that would push a wallet past
  its ceiling; **a wallet that has not played our game**.
- Activity points never convert to OMENX; they rank players on the platform activity leaderboard
  (scored per game by **percentile**, so pool size doesn't change how we compare with other games)
  and will feed the **Battle Pass** when it opens.
- They want our **event list + amounts** (see `OMEN_ACTIVITY_POINTS_EVENT_LIST.md`) to keep the
  per-grant max right.

**The maths at current scale** (36 monthly actives, ~5 daily): 50,000 / 36 ≈ 1,388 per player per
month. A perfect month below costs 1,425 (35/day + 375 streaks) — under the 2,000 ceiling, and
since only ~5 players are daily-active the realistic spend is ~8–10k/month. Headroom to ~4× growth
before we go back to Omen, which lines up with their 150-actives trigger.

**Activity points — the daily loop:**

| Event | Hook (already server-validated) | Pts | Idempotency-Key |
|---|---|---|---|
| Daily login | `claimDailyLogin` | 10 | `ap-login-${date}-${wallet}` |
| All daily tasks done | `claimDailyTask` (last claim) | 10 | `ap-tasks-${date}-${wallet}` |
| First sector clear of day | `saveScore` (DailyActivityLog upsert) | 5 | `ap-firstrun-${date}-${wallet}` |
| Daily kill target | `saveScore` vs server counter | 10 | `ap-dkills-${date}-${wallet}` |
| Login streak 3/7/14/30 | `claimDailyLogin` | 25/50/100/100 | `ap-streak${n}-${wallet}-${cycle}` |

(30-day streak capped at 100 = per-grant max. Perfect day = 35; perfect month ≈ 1,425.)

**Activity points — weekly placement** (~3–4k/month): top 10 of each weekly board (score + kills)
gets **100/75/50 for 1st–3rd, 25 for 4th–10th**; Squad War win 10/member; Squad Champions 100.
Granted inside the existing payout functions after the OMENX grant succeeds.

**Refusals are expected, not errors.** `grantActivityPoints` returns a structured outcome
(`granted` / `over_grant_max` / `player_cap_reached` / `pool_exhausted` / `not_in_game`) instead of
throwing, records the reason in `PointGrantLog`, and the caller continues. `not_in_game` is the
one to watch on **daily login**: a brand-new wallet that logs in before its first run will be
refused — log it and move on; the first-run grant later that day will succeed.

**VIP points:** not used, and we will **not** buy any (Omen, 21 Sept notice: free monthly VIP
allocations end 21 Sept, unused balance does not carry over; from 22 Sept VIP points cost
**$0.005 each / 200 per dollar**, bought on the Developer Portal Economy page from the dev wallet in
BNB/USDT/USDC/ETH). `POST /v1/vip/grant-points` stays open but only spends points you bought, so
granting VIP is a straight cash cost — decision: **don't**. One upside we get for free: if a player
new to OmenX joins *through our game* and then buys VIP, we earn 10 VIP points per dollar they
spend for six months from their first session. `grantVipPoints` stays in the shared helper
(unused, cheap to keep).

**Hosted quests:** **no longer a cost item** — from 22 Sept Omen quest claims pay **activity
points** at the same amounts and stop drawing on the VIP pool. So Phase 3 becomes viable again
whenever we want it; it just spends from our 50k activity allocation like everything else. Keep it
after Phases 1–2 and budget its amounts inside the same pool guard.

**Reward copy audit (before 22 Sept):** Omen asks every game to fix copy promising VIP points. We
never shipped any VIP-point promise in-game — the only mentions are in these design docs — so
nothing player-facing to change. Confirmed: no `grantVipPoints` call exists in the codebase.

**Already in effect:** a wallet must have played our game or the grant is refused
`404 PLAYER_NOT_FOUND` — same rule as activity points, already handled by the structured-outcome
helper in B2 (`not_in_game`).

### B3. Build plan

**Phase 0 — prerequisites**
1. ✅ **Sizing ticket answered (2026-09-19):** activity 50,000/mo, 2,000/player, 100/grant,
   period = calendar month (`2026-09`, resets 1st, no carry-over). Re-size before 150 actives.
1b. 🔴 **Send Omen the event list + amounts** (`OMEN_ACTIVITY_POINTS_EVENT_LIST.md`).
2. New API key with `activity_points:write` → secret `OMENX_POINTS_API_KEY` (don't overload
   rewards/payment keys — separate rate buckets). Skip the VIP/quest scopes for now.
3. Sanity probe function (admin-only) that grants 1 activity point to an admin wallet — proves
   scope + response shape. Then **deliberately trip all three refusals** on a test wallet
   (grant of 101; a wallet pushed past 2,000; a wallet that has never played) and confirm each
   comes back as a clear code with nothing written.

**Phase 1 — Activity points daily loop (~1 session)**
- `base44/shared/omenxPoints.ts`: `grantActivityPoints(wallet, amount, key)`,
  `grantVipPoints(wallet, amount, questId)` — direct fetch, error envelope parsed to `code`.
- New entity `PointGrantLog` `{ wallet, kind: 'activity'|'vip', amount, credited, multiplier,
  reason, idempotency_key (unique), period_id }` — written **before** the call (log-first), patched
  with the response. Dedup on key = second fence against double grants.
- `AppConfig` key `points_config` with all amounts + `enabled` kill-switch + **three budget
  guards**, all checked against `PointGrantLog` before each call:
  1. **Monthly pool guard** — running total per `period_id` (`YYYY-MM`, resets on the 1st):
     stop at a configurable 45,000 (of 50,000) so the weekly placement grants at month-end never
     hit `GRANT_POINTS_FAILED` mid-payout.
  2. **Per-player cap** — 1,900 per period (platform ceiling is 2,000; leave a margin).
  3. **Per-wallet daily cap** — 135/day (perfect day + the biggest streak) as an anti-abuse fence.
  Pool and per-player numbers live in config because Omen said the ceiling scales with the pool.
  Blacklist check before every grant. Amounts live in config so they can be throttled as the
  player base grows without a deploy.
- Wire into `claimDailyLogin`, `claimDailyTask`, `saveScore` (fire-and-forget after the main write;
  never let a points failure fail the save).
- Dailys page: "OmenX Points" strip — today's earned / available, streak track, VIP multiplier
  shown (from the `vipMultiplier` in the last response).
- Admin: card in Economy tab showing grants by day + pool spend (VIP) from the log.

**Phase 2 — Activity points weekly placement (~half session)**
- Add grants to `distributeKillPool`, `manuallyDistributeRewards`/`distributeRewards`,
  `squadWarEngine` claim path, `distributeSquadChampions`. Same shared helper,
  same log entity; skip wallets already logged for that key.

**Phase 3 — Hosted quests (PARKED — quest claims pay VIP points, which are now purchased)**
- Scheduled workflow: assign `daily` quests to recently-active wallets (idempotency key
  `assign-daily-${date}-${wallet}`).
- `saveScore` → `reportQuestProgress` for kills/score/sector clears.
- `claimOmenQuest` backend function + Claim UI on Dailys; `getPlayerQuests` for display.
- Admin reset tooling (`wipe` / `reset`) for support.

### B4. Guardrails
- Grants only from backend functions, only from server-authoritative counters (never client
  values); endless/raid/meteor excluded exactly like OMENX payouts.
- Every grant has a deterministic key; `PointGrantLog.idempotency_key` is unique.
- Daily per-wallet cap + global `enabled` flag in AppConfig so we can throttle without a deploy.
- Points failures are **never** user-blocking — log + Discord alert, never fail the underlying save/claim.

---

## Part C — New in the 77-endpoint manifest (2026-09-17)

The full manifest adds whole subsystems that weren't in the 47-endpoint doc or the SDK. None
require action today; listed so we know what's on the table.

| Subsystem | Endpoints | Relevance to Cosmic Sloths |
|---|---|---|
| **Player data** (`player_data:read/write`) | `GET /players/:wallet/data`, `PUT/DELETE …/data/:key` — up to 10 named JSON values, 100 KB each, server-owned | Could hold a cross-game mirror of the pilot profile, but our PlayerSave already does this. **Skip.** |
| **Non-NFT inventory** (`inventory:read/write`) | item definitions + idempotent per-player grants with typed properties | Would let Relics / Fragments / cosmetics show in the player's OmenX profile. Nice-to-have, **Phase 4 at earliest.** |
| **Hosted leaderboards** (`leaderboards:read/write`) | create boards, post server-authoritative scores (idempotencyKey required), cohorts, reset | Mirror our weekly score + kill boards to Omen so they're visible platform-side. Cheap: one extra call in `saveScore`. **Worth doing alongside Quests Phase 3** — same "be visible on the Omen profile" goal. |
| **Matches / matchmaking** (`matches:read/write`) | async head-to-head/group matches, tickets, official scores | Async 1v1 "beat my run" duels are a plausible S9+ feature. **Not now.** |
| **Events** (`events:read/write`) | competition events with entry fees (escrow) and settlement at event end | This is essentially a hosted version of the **Ascended Protocol** prize-pool model. Evaluate whether Omen escrow could replace our TokenPool/PayoutLog machinery for Ascended — big potential simplification, big migration. **Design discussion, not a build item.** |
| **OAuth JWKS + gamerTag** | `GET /oauth/.well-known/jwks.json`, `POST /oauth/game-user` | Verify access tokens locally (RS256) instead of hitting `/oauth/user` per request — would cut a network call from `exchangeOmenXCode` / `linkWalletToUser` and remove a 404-on-valid-wallet failure mode. **Small, good win when touching auth next.** |
| **Purchase confirmation** | `428 CONFIRMATION_REQUIRED` + `confirmationId` / `confirmationCode` | Already in A2 — still unhandled on our side. |

**Corrections to Part B (superseded 2026-09-19):** the 10,000 activity allocation was a testing
default; Omen raised it to 50,000 / 2,000-per-player after our ticket, and VIP points become a
purchased resource from 22 September. The daily loop lives on **activity** points — see B2.

## Suggested order

1. **A1 payout idempotency** — biggest risk reduction, directly fixes the double-pay class of bugs.
2. **A2 purchase error codes** (+ the $25 ceiling audit — could be silently breaking a SKU today).
3. **Phase 0 → Phase 1 points** — needs the new key from the portal; can run in parallel with 1–2.
4. A3/A4/A5 as time allows.