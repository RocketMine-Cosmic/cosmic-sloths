# Omen /v1 API Reference Review — 2026-08-29

Review of the new Omen developer API doc (47 endpoints) against everything we
currently call. **No code was changed** — this is the read-through you asked for.

---

## TL;DR

| Verdict | Item |
|---|---|
| ✅ No change needed | Balance reads, purchases, grant-batch, products, OAuth, VIP tier reads — all our endpoints still exist with the same contracts |
| ⚠️ **Action needed (when they enable it)** | **428 CONFIRMATION_REQUIRED on purchases** — we don't handle it; a player would get a generic error |
| ⚠️ Worth confirming with Omen | Our nonce-too-low retry rotates the idempotency key — the new doc says "never generate a fresh key for a retry" |
| 💡 Nice-to-have | Lighter `/players/:wallet/balances` endpoint; `fresh` cache-busting param; `embed-token` flow; quests/VIP/activity-points endpoints (matches our planned VIP Points & Quests design) |

---

## 1. Everything that still matches (no changes)

- **`GET /players/:wallet`** (combined data) — what `getPlayerBalance`, `getNFTs`,
  `purchaseSku` (character-ownership check) and the admin panels use. Still there,
  same shape (`balances.tokens`, `nfts`), same `chainId` param.
- **`POST /purchases`** — same body we send (`playerWallet`, `skuId`, `quantity`,
  `idempotencyKey`, `paymentCurrency`). We also send the `Idempotency-Key` header,
  which the doc confirms is honoured.
- **`POST /game-rewards/grant-batch`** — same shape (`payments[]`, `gameId`,
  `gameName`, `note`). All three payout functions comply. `note` on the single
  `/grant` endpoint is now documented as **required** — our admin grant paths
  already send one.
- **`GET /products`** — same, used by the SKU price cache.
- **`GET /players/:wallet/vip`** — same, used by `getVipLevel` / `getPlayerNftsAndVip`.
- **OAuth** (`/oauth/authorize`, `/oauth/token`, `/oauth/token/refresh`,
  `/oauth/user` with `x-omenx-access-token`) — all unchanged. PKCE S256 is what we
  already do.
- **Error envelope** `{ error: { code, message, requestId } }` — our parsers read
  both `body.code` and `body.error.code`, so either shape works.

## 2. ⚠️ The one real gap: 428 CONFIRMATION_REQUIRED

The doc introduces a purchase-confirmation step:

> POST /purchases can return `428 CONFIRMATION_REQUIRED` with a `confirmationId`
> — the player was emailed a 6-digit code. Nothing was charged. Retry the same
> request (same idempotencyKey) with `confirmationId` and `confirmationCode` added.

**Where we stand:** our error map still has 428 down as "idempotency key required
— should never happen". If Omen switches this on (e.g. for large purchases), the
player would see our generic "settlement service error" message and the purchase
would dead-end. Nothing is charged, so it's safe — just broken UX.

**What a fix would involve (when needed):**
1. `purchaseSku` detects `428` / `CONFIRMATION_REQUIRED`, returns the
   `confirmationId` to the client instead of an error.
2. Client shows a 6-digit code input (players get the code by email).
3. Client re-calls `purchaseSku` with the code; server retries the SAME
   idempotency key + `confirmationId` + `confirmationCode`.

Not urgent until we see a 428 in the wild — but worth asking Omen **when/whether
they plan to enable it for MainNet purchases**, since it needs UI work on our side.

## 3. ⚠️ Idempotency-key rotation on nonce-too-low

The doc says: *"Retry with the SAME key; never generate a fresh key for a retry."*

We deliberately violate this in one place: when a purchase fails `422` with
"nonce too low", we rotate to a fresh idempotency key — because their idempotency
cache was replaying the same cached 422 back at us, making same-key retries
pointless. That was verified behaviour at the time.

**Recommendation:** keep our code as-is (it works), but ask Omen whether
nonce-too-low failures now purge the idempotency cache entry. If they've fixed it
their side, we can drop the rotation and be fully spec-compliant.

## 4. 💡 Opportunities (optional, no urgency)

- **`GET /players/:wallet/balances`** — a dedicated balances endpoint now exists.
  Our balance poll currently uses the combined endpoint, which also returns the
  player's full NFT list every time — a much heavier payload for a number we poll
  constantly. Switching would cut response size and possibly latency (~1s per call
  in your logs). Scope needed: `balances:read` (our balance keys likely have it).
- **`fresh` / `maxCacheStalenessMs` params** — the combined and NFT endpoints now
  expose cache controls. Two uses:
  - `adminRefreshPlayerNFTs` could pass `fresh=true` for a genuine force-refresh.
  - Relevant to Monday's all-zero-balances incident: their endpoint serves cached
    data. If it happens again, probing with `fresh=true` would tell us instantly
    whether it's a stale cache or a dead indexer.
- **`POST /oauth/embed-token`** — new endpoint minting an audience-bound token for
  embedded games, so the parent page never hands us a raw session JWT. This is
  exactly our iframe-on-omen-site flow (currently done via postMessage from the
  parent). Worth a conversation with Omen — it would also fix the "parent-pushed
  token records no session" problem behind the weekly re-auth dance.
- **Quests / VIP points / activity points** — `/quests/*`, `/vip/grant-points`,
  `/activity/grant-points` are now first-class. These map directly onto our
  drafted VIP Points & Quests design (`src/docs/design/VIP_POINTS_AND_QUESTS.md`).
  When you want to build that, the API is ready; we'd need the
  `quests:write` / `vip_points:write` / `activity_points:write` scopes on a key.
- **Discord via Omen** — they now proxy Discord posting. We already post to our
  own webhooks directly; no reason to change.

## 5. Things confirmed by the doc (good to know)

- **Scopes are per-key** — a `403 MISSING_SCOPE` means the key lacks the scope,
  not a code bug. Explains why our key groups (balance/payment/rewards) behave
  differently on the same endpoint.
- **`/players/:wallet/power` returns zeros, not 404, for wallets with no
  managers** — reinforces that the `GET /players/:wallet` 404s we've logged for
  valid wallets are an Omen-side anomaly, not intended behaviour.
- **TestNet keys (`sk_test_...`)** exist for every endpoint — if we ever build the
  quest/confirmation flows, we can test without real OMENX.

---

*Reviewed against: getPlayerBalance, purchaseSku, shared/omenxPurchase,
shared/omenxRest, distribute{Rewards,KillPool,StaffPayout}, manuallyDistributeRewards,
getNFTs, getVipLevel, getPlayerNftsAndVip, exchangeOmenXCode, linkWalletToUser,
probeOmenxSettlement, getTokenPrices.*