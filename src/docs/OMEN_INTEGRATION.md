# Cosmic Sloths × Omen — the one integration document

**Last checked against the code and Omen's docs:** 21 Oct 2026 (Omen docs read signed-in 20 Oct;
code checked 21 Oct 00:30 BST).
**This replaces** `OMEN_SDK_V2_2_UPGRADE_PLAN.md`, `OMEN_API_V1_REVIEW_2026-08.md` and
`OMEN_SDK_V2_MIGRATION.md`. Everything still true in them is folded in here. The two copy-paste
messages to Omen (`OMEN_ACTIVITY_POINTS_TICKET.md`, `OMEN_ACTIVITY_POINTS_EVENT_LIST.md`) stay as
they are.

How to read it: **Part 1** is what Omen is today. **Part 2** is how the game is wired to it.
**Part 3** is what was done. **Part 4** is the to-do list in order, each item with its status
checked in the code. **Part 5** is what we're waiting on Omen for. **Part 6** is decisions already made,
so they don't get re-argued.

---

## Part 1 — Omen today (October 2026)

### Where Omen's information lives (and why it's hard to follow)

Omen publishes in five places that don't agree with each other:

1. **Developer Portal → bell icon (announcements).** The most current source for platform news.
2. **Developer docs** (developer.omen.foundation/docs). The API reference is accurate, but guides announced
   as "in the docs" sometimes aren't there yet (on 20 Oct the requestPurchase and
   Sign-in-with-Omen guides were missing).
3. **Changelog** (/docs/changelog). The source of truth for API behaviour. **API revisions are not
   opt-in:** every breaking change applies to us automatically. Current revision 2026-09-22.
4. **npm** (`@omen.foundation/game-sdk`). Latest published is **2.3.0**. Edward (21:03, 20 Oct):
   2.4.0 publishes "today" and brings npm and the portal back in line. The developer MCP
   (`@omen.foundation/developer-mcp`) wasn't published either; Omen said they'd publish it the same day.
5. **Discord** (game-dev-chat, DMs) and the **community blog** (app.omen.foundation/announcements).

Edward has said: if anything still contradicts after 2.4.0, post both pages in game-dev-chat and
they'll fix them.

### Names

- The platform is **Omen Arcade** (was "OMENX Manager", then "Arcade"). The company is OMEN Foundation.
- The token is **OMCADE** (was OMENX). New contract on BNB Chain:
  `0x995586C1Ef10C3cBaF155A62f62d65310D0D4c1f`. Its on-chain name is "Omen Arcade", symbol OMCADE,
  18 decimals. Balances moved over 1:1 on 22 Sept. The old OMENX contract is no longer accepted.
- **Omen's API still calls the currency `OMENX`.** That covers the purchase `paymentCurrency`, the balance
  `symbol`, product `pricesInCurrency.OMENX` and grant `tokenSymbol`. The game must keep sending
  `OMENX` there. Only what players **see** says OMCADE.
- Token info is at omcade.com, and wallet and token tools are at app.omcade.com (old links forward).

### Money: prices, fees, pool

- **Items are priced in USD** on the Developer Portal. There's no box for a token price. Omen
  converts USD to tokens itself: product `pricesInCurrency.OMENX` = USD ÷ token price.
  Today the token price is a **fixed $0.10** (`/v1/prices/tokens` reports `env_fallback`), so a
  $0.20 banish = 2 tokens.
- **Omen checks the amount.** A purchase sends the product id *and* the token amount, and Omen
  refuses (422) any amount that isn't its own conversion. So a game can't choose a fixed token
  price for a portal product. Marco's "option 2" (fixed OMCADE amount) only works outside portal
  products.
- **Liquidity pool:** USDT/OMCADE on PancakeSwap v3 (BSC). Small test position **Wed 21 Oct**,
  first full position **Thu 22 Oct**. Omen adds OMCADE only, permanently locked. The liquidity
  programme / Liquidity Points were cancelled.
- **Fri 23 Oct (planned):** purchases start adding to the pool. Card top-up covers any part a player's
  OMCADE doesn't, but **only for games that integrated `requestPurchase`** (Web SDK 2.4.0), with
  Omen confirming the day before. Buying with OMCADE keeps working for everyone.
- **What studios get** (omcade.com/economy): **always OMCADE**, including card sales.
  - Paid in OMCADE: studio 85%, locked liquidity 12%, VIP allocations 3%.
  - Paid in dollars: studio 85% (in OMCADE), Omen 15% (in USDT).
  - Before launch Omen's fee was 3%. **The change to 15% gets 60 days' notice, and studios
    already selling keep 3% for 6 months after the change** (11 Oct announcement).
- **Charging by USD (per game, later).** Edward, 20 Oct: switching a game to charge by
  `priceUsd` is done per game, together with the studio. Until then the game keeps charging the
  way it does today. After the switch, the game asks for the *item* and Omen works out the token
  amount at the moment of purchase.
- **Withdrawals** are coming, with the same daily limit for every VIP tier and verified identity
  required. Studio payouts are unaffected.

### Other platform changes (no action unless we choose)

- **Sign in once** with an Omen Arcade session, plus a standard "Sign in with OMEN Foundation" button and
  `<omen-signin>` widget (developer.omen.foundation/brand/sign-in/omen-signin.js). A candidate to
  replace our popup/redirect login, and it would end the in-app-browser popup problem.
- **Crews (≤8) and Party up** are live. A game can take a party into one room. Possible fit for Squads
  later.
- The **GMT balance** has left the Arcade top bar, and voting is paused.
- **Web SDK 2.4.0 (changelog entry)** = player presence (Ably). `requestPurchase` is announced but
  not in published docs or npm as of 20 Oct.

### API limits that matter to us

- **Rate limits are per GAME, not per API key** ("every key shares one bucket"). The example given is
  100/min with a burst of 25.
- **Player-session gate:** `/v1/players/*`, `/v1/purchases` and NFT custody need a session in the last
  30 days, otherwise `404 PLAYER_NOT_FOUND` / `403 NOT_IN_GAME`. Our weekly re-auth covers it.
- **Purchases:** $25 per-purchase ceiling (`400 CHARGE_EXCEEDS_LIMIT`), a rolling per-player spend
  cap (`429 PLAYER_SPEND_CAP_EXCEEDED`), and possible `428 CONFIRMATION_REQUIRED` (emailed 6-digit
  code). **Never rotate the idempotency key on a retry.** `502 PAYMENT_PENDING` means retry with the
  same key; it can take minutes.
- **Payouts (grant-batch):** up to 200 payments and 300,000 per payment, and a note is required. They accept
  `idempotencyKey` (≤128). Unconfirmed payouts return `502 GRANT_PENDING` (since 1 Sept), and a retry
  with the same key returns the real answer. **Without a key, a retry pays everyone twice.**
  `403 GAME_REWARDS_DISABLED` = Omen paused grants during an incident; retry later.
- **Errors:** always `{ error: { code, message, requestId } }`. Branch on `code`, never on the message.
- **NFT lists are paged** at 100 (`pagination.hasMore` / `cursor`).

---

## Part 2 — How Cosmic Sloths is wired to Omen

- **No npm SDK on the server.** Backend functions call Omen's REST API directly
  (`base44/shared/omenxRest.ts`, `omenxPurchase.ts`). The npm SDK uses code generation, which the
  Deno isolate blocks. The browser uses `@omen.foundation/game-sdk` **1.0.x** (`src/lib/omenx.js`,
  game id `cosmic-sloths`) for login only.
- **Keys:** separate groups for balances (×9), payments (×8), rewards (×4) and auth. Because limits
  are per game (Part 1), the extra keys buy no throughput; they only spread error noise.
- **Login:** OAuth with PKCE. The code exchange happens server-side (`exchangeOmenXCode`), and there's an iframe
  auth path for play inside Omen Arcade. There's a same-tab redirect fallback
  (`src/lib/omenxRedirectAuth.js`) for in-app browsers. Redirect URIs are registered on the portal and
  must match exactly, including `/auth/callback`. Branch previews need their own entry.

### How a price gets from the portal to the player (since 20 Oct)

1. You set a USD price on the Developer Portal.
2. Omen converts it to tokens (`pricesInCurrency.OMENX`).
3. **`getSkuPrices`** (backend, read-only, no auth, 5-min cache) returns `{ sku: tokens }` for
   every active product.
4. **`src/lib/storePrices.js`** loads that at app start and every 5 minutes. `skuPrice(sku)`,
   `useStorePrices()` and `<Price sku>` feed every price label and every "can you afford it"
   check. If Omen can't be reached, it falls back to the old built-in prices (`FALLBACK_PRICES`).
5. **`purchaseSku`** charges from its own read of the same field (10-min cache). On a 422 it
   re-reads once and posts a "SKU price drift" alert to Discord.

So the screen and the charge always come from Omen's number. **To change a price, change it on
the portal; never in code.** The tier tables in code (`reviveTiers.js`, the revive and fragment
constants in `purchaseSku`) decide *which* item is charged, not *what it costs*.

All 67 active portal products matched the old built-in prices on 20 Oct, plus two the game didn't
show: `ingame-squad-buff` (4, unused) and `globalraid-retries` (10, now used by "Buy 5 More Runs").

### Payouts and the 85 / 80 margin

Live settings (`AppConfig.leaderboard_payout_config`, checked 21 Oct). Out of every 100 OMCADE
players spend:

| Pool | Share |
|---|---|
| Weekly score board | 30 |
| Seasonal score board | 10 |
| Weekly kill board | 30 |
| Squad Champions (season) | 10 (hard-coded `CHAMPIONS_POOL_PCT`) |
| Staff | 0 (`staff_pct_per_wallet` = 0) |
| **Total paid out** | **80** |

Every pool is a share of **tokens spent**, paid out **in tokens**. The token price never enters
the sums, so the game can never owe more tokens than came in. A price drop makes items cost more
tokens, so the pool grows in tokens and roughly tracks real dollar spend. Winners carry the price
movement between spend and payday; the studio doesn't.

**The one real money question:** the studio receives 97 now and **85 once the 15% fee applies**.
That leaves **5 of every 100** after payouts. Decide whether to lower a pool before the fee
changes; there will be 60 days' notice.

`topupWeeklyPayout` is **not** an ongoing cost. It's a one-off repair tool from week 2026-W19 (when the
payout went to too many players) and only runs when pressed.

### VIP chest webhook

It lives **in Base44** (since 21 Oct 2026): `functions/onVipChestRewardGranted` (portal URL
`https://cosmic-sloths.com/functions/onVipChestRewardGranted`), handler `shared/vipChestWebhook.ts`, grant logic
`shared/vipChests.ts`, one `VipChestReceipt` row per chest opened. Each prize (gold + star fragments + a cosmetic,
with a same-rarity swap for duplicates) goes on the save in ONE atomic step, players get a one-time 🎁 popup,
and Admin → Player Operations → 🎁 VIP Chests lists anything held, failed or unknown. Secrets
`OMENX_VIP_CHEST_WEBHOOK_SECRET` and `DISCORD_CHEST_WEBHOOK`. Full record: `claude/handoffs/VIP_CHESTS.md` in the
Sloths project. The old receiver (SlowBurn site on Vercel → Supabase) is idle and is retired after the first
real chest lands on Base44. Omen's checklist: verify HMAC-SHA256 over `${timestamp}.${rawBody}` (secret includes `whsec_`) with a ±5
min replay window, and use **`open.openReceiptId` as the idempotency key (not the delivery id)**. Reply 2xx only
after a durable write. Payload: `rewardPayload.kind` is product, nft or bundle; `quantity` is
omitted when 1; optional fields are absent, not null; `open.isTestnet` is the only environment switch. Secret
rotation has no grace period.

---

## Part 3 — Done (20–21 Oct 2026)

- **Live prices on every screen.** Every price label and affordability check reads the portal (Part 2). Fixed
  along the way:
  - banish charged the wrong tier if a portal price changed (it picked the item by the typed
    price);
  - revive was only offered at 4+ tokens whatever the real price;
  - stat and weapon upgrades shared one typed ladder although they're separate portal items;
  - "Buy 5 More Runs" charged the XP-boost item; it now charges `globalraid-retries`.

  Checked on the preview by Rob (Upgrades, Buy All, level-up, pause menu) and live on
  cosmic-sloths.com.
- **Rename:** player-facing OMENX became OMCADE and OmenX became Omen Arcade (admin and dev pages
  say "Omen"). The new token logo replaced the old one in 15 places (`src/lib/branding.js`,
  `TokenIcon.jsx`). The Info page links the new contract and app.omcade.com. API strings and code
  names were left as `OMENX` on purpose (Part 1).
- **Backups** rebuilt and running every 6 h (parts-v2 format). The old restore button refuses the
  new format; the Builder plan has no Base44 Backup & Restore.
- **Squad Wars** W43 pairing re-run; W42 leftovers resolved.
- **Two "pending-…" payout rows** (S10 Waeoo, W42 Iflookscouldkill) explained: Omen's
  `502 GRANT_PENDING`. Rob confirmed both paid on chain.

---

## Part 4 — To do, in order

Status checked in code on 21 Oct. ✅ done · 🟡 partly · 🔴 not started.

*Correction 21 Oct 00:25:* the first version of this document said none of the payouts had
double-pay protection. That was wrong: it only looked for Omen's key and missed our own
log-first protection. Item 1 below is the corrected picture.

### 1. 🟡 Payouts: add Omen's key on top of our own double-pay protection
**Our own protection works and stays.** Payouts are run by hand from the admin panel
(`manuallyDistributeRewards`, `distributeKillPool`, `distributeStaffPayout`,
`distributeSquadChampions`). Each one:
- writes a `pending-…` PayoutLog row for every wallet **before** calling Omen;
- skips any wallet that already has a row for that period, so a re-run never pays anyone twice;
- deletes the rows on a clear refusal (4xx), so the re-run tries again;
- keeps the rows on an unclear answer (5xx/timeout), so the re-run skips them.

The automatic "Weekly/Seasonal Reward Distribution" workflows (`distributeRewards`) are switched
off and have never run. `distributeRewards` writes its logs *after* paying, so **don't switch those
workflows on without bringing it up to the same log-first pattern.**

**What Omen's key would add.** On an unclear answer, our pattern chooses "maybe under-paid"
over "maybe paid twice" and leaves a `pending-` row to check on-chain by hand (the S10 Waeoo and
W42 Iflookscouldkill rows). Since 1 Sept Omen answers those with `GRANT_PENDING`, and re-sending
the same body with the same `idempotencyKey` returns the real result. So the key **turns hand
checks into automatic answers**. It doesn't close a double-pay hole; there isn't one in the paths in
use. No grant path sends a key today.

How:
- One shared `postGrantBatch()` in `base44/shared/` replaces the ~40 copy-pasted lines.
- A deterministic key per batch, e.g. `cs-${period_type}-${period_id}-${tier}`, never with
  `Date.now()`. Store it on PayoutLog.
- On `GRANT_PENDING`, network errors and timeouts: re-post the same body with the same key, with
  backoff, and record the real transaction.
- `409 IDEMPOTENCY_KEY_REUSED` = the recipients changed between attempts. That's an alarm, not a retry.
- `GAME_REWARDS_DISABLED` means try again later.
- Add an admin "Resolve pending payouts" button that replays the key of every `pending-` row.
- Keep the log-first rows and the already-paid skip exactly as they are. The key is a second
  fence, not a replacement.

### 2. 🟡 Purchases: handle every code Omen can return
Already handled: `GRANT_FAILED`, `BALANCE_CHECK_FAILED` and `ALLOWANCE_READ_FAILED` as final;
`confirmed` or `completed` as success; `PAYMENT_PENDING` retried with the same key.
**Missing** (none appears anywhere in the backend):

| Code | Should do |
|---|---|
| `403 NOT_IN_GAME` | same as `404 PLAYER_NOT_FOUND`: "reconnect your wallet" |
| `429 PLAYER_SPEND_CAP_EXCEEDED` | final; don't cycle keys; "you've hit Omen's spending limit" |
| `400 CHARGE_EXCEEDS_LIMIT` | final; clear message (see the $25 check below) |
| `428 CONFIRMATION_REQUIRED` | ask for the emailed 6-digit code, then retry with the same key plus `confirmationId`/`confirmationCode` |
| `422 PAYMENT_REFUNDED` | final; "payment was reversed" |
| `Retry-After` header | wait that long instead of retrying straight away |

Also: switch from matching message text to matching `error.code`. Remove the dead
`402 INSUFFICIENT_FUNDS` branch. Ask Omen whether nonce-too-low still needs the fresh-key
workaround (the docs forbid it).

**The $25 check:** the legendary trail (`character-trails-leg`) is 300 tokens = **$30**, over
Omen's per-purchase ceiling. Its last sale was 2 June, before the ceiling existed, so it has
probably been refused since. Halving prices on the portal (item 3) fixes it.

### 3. Rob: reprice on the portal, then the Discord text
Change one item first (e.g. banish to $0.05). Within about 5 minutes the game should show 0.5. Then
do the rest. Afterwards, update the price text in the admin Discord guides (`AdminDiscordGuide`,
`AdminContent`), which still quote the old fixed prices.

### 4. Rob: decide the margin before the 15% fee (Part 2)

### 5. ⛔ Card checkout (`requestPurchase`, Web SDK 2.4.0): dropped by Rob, 21 Oct 2026

**Not doing it.** Planned 21 Oct (project doc `claude/handoffs/CARD_CHECKOUT.md` holds the decisions,
the facts and when to reopen). Rob's design narrowed the sheet to single store buys inside the Arcade
(nothing in-run, buy-all stays OMCADE), and the spend log for W39–W43 had one OMCADE store buy in a month,
the owner's own: players buy store items with gold. Selling flat OMCADE for card was rejected too: a sheet
sale reaches the studio as OMCADE minus Omen's fee, so each top-up would cost the float, and buying OMCADE
belongs in Omen's own purchase flow, at source. Reopen only if store buys with OMCADE start happening, the
sheet works outside the Arcade frame, or the cosmetics shop comes back wanting a card option. The notes
below are kept as the record.


**Checked 21 Oct against the real 2.4.0 package on npm (CHANGELOG):** nothing we use changes.
`createPurchase` / `POST /v1/purchases` (our `purchaseSku`) is untouched, and selling through the
Arcade purchase sheet is optional. Flow if we adopt it: our server calls `createPurchaseRequest`
(`POST /v1/purchase-requests`, scope `purchase:write`) → the game calls `sdk.requestPurchase(requestId)`
→ the server grants only from the signed `purchase.paid` webhook or `getPurchaseRequest`, then
`markPurchaseDelivered`. `unavailable` = keep the current flow. Edward (21 Oct): purchases switch on
**Fri 23 Oct** for games that integrated it; the in-game price is then only a preview, the checkout
is the real price. The one 2.4.0 exception (games sending the Arcade frame token to the Arcade's own
`/api` routes) does not apply to us: we only call `api.omen.foundation/v1` from the server. We are on
SDK 1.0.x; upgrading is item 8.
It needs 2.4.0 on npm and its guide. If it's turned on, a card sale happens inside Omen's checkout,
not through `purchaseSku`. The game must still grant the item and **add the sale to the token pools**,
or card buyers won't feed the prize pools. Design that before opting in.

### 6. 🔴 USD charging switch (with Edward, when ready)
`purchaseSku` stops sending a token amount and asks for the item. The screens are already per
item and need no change. Check what the purchase response returns as the charged amount, so
TokenSpendLog and the pools record real tokens.

### 7. ✅ Activity points (the daily loop and weekly placement) — live since 21 Oct 2026
Agreed with Omen on 19 Sept: 50,000 points a month, 2,000 per player, 100 per grant; the portal also
shows a platform-wide cap of 2,500 per player per day across all games. Unused allocation is lost at
month end. Built and switched on 21 Oct (design and reasons: project doc
`claude/handoffs/ACTIVITY_POINTS.md`; day-to-day handling: GAME_OPERATIONS §5.6).
- **What earns:** the Star Ops cards (login 10, all 3 Daily Bounties 10, all Daily Tasks 10, Daily
  Mission 5, login streak 3/7/14/30 = 25/50/100/100) and weekly placement (top 10 of the weekly score and
  weekly kills boards 100/75/50/25, Squad War win 10 per member, Squad Champions 1st 100 per member).
  The two daily labels differ from the list sent to Edward ("kill target" → all 3 bounties, "first
  sector clear" → daily mission; same amounts), because the game has no fixed daily kill target.
- **How:** `shared/omenxPoints.ts` calls `POST /v1/activity/grant-points` directly with an
  `Idempotency-Key` of `ap-<event>-<day|week|war|season>-<wallet>`, after writing a `PointGrantLog` row
  (unique on the key). Our caps are checked first (`AppConfig.points_config.guards`: 45,000 a month,
  1,900 per player a month, 135 per player a day). Hooks in `claimDailyLogin`, `claimBounty`,
  `claimDailyTask` never fail the claim. Weekly placement is a separate hourly job
  (`grantWeeklyPlacementPoints`) that reads `PayoutLog` after the payouts, so it never touches a payout.
  Four keys (`OMENX_POINTS_API_KEY`, `_2`, `_3`, `_4`); on 429/503 it waits, then tries the next key with
  the same idempotency key.
- **Omen's answers (live docs + probe, 21 Oct):** 200 with `credited` (a replay is `duplicate: true`,
  credits nothing; no VIP multiplier since 1 Sept). Refusals are `400 GRANT_POINTS_FAILED` with the reason
  in the **message** (over max, wallet ceiling, pool exhausted, `daily_cap_reached`, paused), and
  `404 PLAYER_NOT_FOUND`. `503 GUARD_UNVERIFIABLE` / 429: retry with the same key. The named codes in the
  September plan (`over_grant_max` etc.) never existed.
- **Probe (21 Oct, Rob's wallet):** grant, replay, over-100 and the 2,000 ceiling all behaved as
  documented. **A never-played wallet was credited**, although Omen's docs and Edward say it should be
  refused — report to Omen (Part 5). No risk to us: we only grant for signed-in players' claims.
- **Unresolved:** whether the rate limit is per key (the portal card shows 100/min on each) or per game
  (the Authentication docs say every key shares one bucket). Rob's experience is that more keys helped.
  The code works either way.
- Go back to Omen before 150 monthly actives (26 in the 30 days to 20 Oct).

### 8. 🔴 Telemetry (browser SDK 2.3+)
The browser SDK is still 1.0.x, so Omen sees logins only: no session length and no engagement. 2.3 adds
`startSession` / `reportActivity` / `endSession`. Omen sizes allocations on engagement, so this
helps item 7. Upgrading the browser SDK is a breaking change:
- add `onSessionExpired` (which leads to our ReauthNotice);
- `logout()` is local only;
- the login scope changes;
- remove `enablePKCE` / `state` options.

Test the login round-trip in a normal tab (PKCE fails inside the builder preview). The same
upgrade gives a **realtime wallet subscription**, which could replace balance polling.

### 9. 🔴 Smaller fixes
- **NFT paging:** `getNFTs` and the ownership check in `purchaseSku` read only the first 100 NFTs.
  A wallet with more could have a sloth on page 2 that reads as not owned. Use the `/nfts` filter
  by contract, or follow `cursor`.
- **Iframe auth:**
  - set `parentOrigin`, so only Omen Arcade can push login data. Confirm first which origin
    embeds us (app.omen.foundation or app.omcade.com).
  - the game sends `omenx_request_auth`; the documented message is `OMENX_AUTH_REQUEST`.
- **Login scope:** the redirect fallback asks for `email`. Drop it if nothing uses it (one less
  consent line).
- **Lighter reads:** pass `fresh=false&maxCacheStalenessMs=30000` on polls and use
  `/players/:wallet/balances` for balance. Keep `fresh=true` for admin NFT refresh.
- **Keys:** stop cycling keys on 429. Since limits are per game it just burns more calls.
- **Housekeeping:**
  - remove the unused `@omen.foundation/game-sdk` dependency from the server side;
  - log `platformFeeApplied` / `developerNetTxHash` on TokenSpendLog;
  - the old restore button can't read parts-v2 backups; replace it or remove it.

### 10. ~~Check the VIP chest webhook against Omen's checklist (Part 2)~~ — done 21 Oct 2026
Rebuilt in Base44 to the checklist: HMAC over `${timestamp}.${rawBody}` with the `whsec_` secret, ±5 min window,
`open.openReceiptId` as the idempotency key, 2xx only after the receipt row is written, `isTestnet` never granted,
optional fields read as absent. Proven against a real Omen body (byte-identical) and 12 test scenarios.

### 11. Evaluate "Sign in once" / `<omen-signin>` as a replacement for our login flow

### Parked (no action; on the table)
- **Hosted quests:** they pay activity points now, so cost isn't the blocker; do after item 7.
- **Hosted leaderboards:** mirror the weekly boards to Omen; one extra call in `saveScore`.
- **Async matches:** "beat my run" duels.
- **Events with escrow:** essentially a hosted Ascended Protocol prize pool (3% event fee). A design input
  for Ascended.
- **Inventory**, **player data**, **Crews/Party**, **Discord via Omen**, **JWKS local token
  check**: no current need.

---

## Part 5 — Waiting on Omen / questions to ask

1. **When does the token price leave the $0.10 peg** for product prices and purchases, and does it
   happen before or only with the per-game USD switch? (Edward's message suggests charging stays as
   today until the switch. Watch banish: if its token number changes without a portal edit, the
   price is following the market.)
2. **Fee for existing sellers on Friday:** does "purchases add to the pool" mean 15% now, or do we
   keep 3% for 6 months as the 11 Oct post says?
3. **Web SDK 2.4.0 and the `requestPurchase` guide:** when published, check them against items 5 and 6.
4. **Developer MCP:** whether it's published, and its install command.
5. **nonce-too-low:** is the fresh-key workaround still needed?
6. **428 confirmation:** what threshold, and is it on for MainNet?
7. **Iframe origin:** which domain embeds games now?
8. **Activity points "has not played" check:** on 21 Oct a grant to `0x…dead` (never played) was
   credited. Docs and Edward (19 Sept) say it should be `404 PLAYER_NOT_FOUND`. Report it, together with
   the relabel of two daily events (item 7).
9. **Rate limits per key or per game?** The portal shows 100/min on each key; the Authentication docs say
   one shared bucket per game.

---

## Part 6 — Decisions already made (don't re-open without a new reason)

- **No npm SDK on the server.** It's direct REST (the isolate blocks the SDK's code generation).
- **VIP points: not used, not bought** ($0.005/point since 22 Sept). We still earn the free credit when a
  player new to Omen joins through us and buys VIP.
- **Activity points carry the daily loop and weekly placement** (Omen ruling, 19 Sept).
- **Payout pools are shares of tokens spent, paid in tokens.** The token price doesn't enter the
  sums (21 Oct).
- **Studio revenue is OMCADE, including card sales** (omcade.com/economy). There's no dollar-vs-token
  mismatch on payouts.
- **Prices live on the portal only.** The game reads them (20 Oct). The built-in table is a fallback, not
  a second source.
- **Player-facing copy says OMCADE and Omen Arcade.** API strings and code names stay `OMENX`
  (20 Oct).
- **History logs** (DeletedRunScore, RunHistoryLog, GoldSpendLog) are left out of the 6-hourly
  backup (20 Oct).
