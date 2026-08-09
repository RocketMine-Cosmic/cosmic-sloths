# Omen Game SDK v2 — Migration Plan

Reviewed 2026-08-09. v2 (2.0.1) is published only under the `next` dist-tag — stable is
still 1.0.34. **Do not upgrade until Omen promotes 2.x to `latest`.** This doc captures
what v2 changes, what already complies, and what to do at upgrade time.

Where we use the SDK today:
- **Client**: `src/lib/omenx.js` — `OmenXGameSDK` for OAuth only (init, authenticate, iframe auth).
- **Server**: `purchaseSku` pins `npm:@omen.foundation/game-sdk@1.0.34` (createPurchase);
  `distributeRewards` pins `@1.0.33` but only constructs the SDK — grants go via **raw fetch**
  to `/v1/game-rewards/grant-batch`. Most other functions (balance, NFTs, players) use raw fetch.

## ✅ Already compliant (v2 makes these REQUIRED; we already do them)

| v2 change | Our status |
|---|---|
| `createPurchase` requires `idempotencyKey` (428 without) | purchaseSku always sends one, stable across 5xx retries, rotated only on nonce-too-low (correct) |
| Always send `paymentCurrency` + `paymentAmount` | purchaseSku sends both, priced server-side from `/v1/products` |
| `grantGameReward*` requires non-empty `note` | distributeRewards' raw-fetch batches always send descriptive notes (rank tiers, chunk labels) |
| PKCE mandatory | Our OAuth flow already uses PKCE |
| VIP reads are server-only (game tokens rejected on `/api/vip/me`) | We read VIP via backend (`getVipLevel`, `getPlayerNftsAndVip`) |
| No client-side token refresh — re-authenticate instead | Our weekly re-auth architecture (`omenxSessionWeek.js`) already treats re-login as the only refresh |
| 30-day player session gate | Handled — weekly re-auth + `PLAYER_NOT_FOUND` → 409 `omenSessionStale` in purchaseSku |
| `chainId` limited to `'56' \| '97'` | We use `'56'` everywhere |

## ⚠️ Platform-behavior corrections that apply EVEN ON v1 (docs were wrong before)

These are documented API semantics, not SDK code — worth fixing whenever convenient,
independent of the upgrade:

1. **purchaseSku accepts only `status === 'confirmed'`.** Per 2.0.1 docs, an idempotent
   replay of a legacy row can return `'completed'` (also a success). Right now that path
   would tell the player "you haven't been charged" when they HAVE been. Rare (only on
   replay of an old row) but wrong. Fix: accept `confirmed || completed`; treat a 2xx
   `pending` as "may still settle — do not tell the player they weren't charged".

2. **`503 BALANCE_CHECK_FAILED` is TERMINAL, not retry-safe.** Our `isRetryable5xx()`
   comment (and match) treats it as retryable, but per v2 docs the platform marks the
   purchase failed *before* returning it — a retry can only come back `422 PAYMENT_FAILED`,
   which then reads as "payment failed on-chain" when no payment was attempted. Same for
   `502 ALLOWANCE_READ_FAILED`.

3. **`502 GRANT_FAILED` means the player WAS charged** and delivery failed. Our generic
   502 retry would replay it and get `422 PAYMENT_FAILED` (reads as "never paid") —
   masking a reconcile-needed case as a clean failure. Should be detected and routed to
   the charged-but-not-granted path (Discord alert + reconcile), not retried.

   → 2/3 land in the same place: match on the **error `code`** (PAYMENT_PENDING vs
   BALANCE_CHECK_FAILED vs GRANT_FAILED...), not on the status number. v2 exports
   `isRetriableCreatePurchaseError` / `TERMINAL_CREATE_PURCHASE_CODES` for exactly this;
   on v1 we can replicate the list by string-matching codes in the message.

## 🔧 Required changes AT upgrade time (breaking in 2.x)

1. **Client (`src/lib/omenx.js`)**
   - Add `onSessionExpired: () => { /* surface reconnect prompt */ }` — 401s no longer
     auto-logout, and there is no refresh. Fits our existing ReauthNotice flow.
   - Default scope drops `email`. **Check whether Base44AuthLinker / linkWalletToUser
     depends on the Omen email claim** — if yes, pass `scope: 'openid profile email'`.
   - `logout()` becomes local-only (was already effectively true — the network call
     always failed). No change needed, just awareness.
   - Remove any `enablePKCE` / `state` options if present (now rejected/ignored).

2. **Server (`purchaseSku`)**
   - Bump the pinned import to 2.x.
   - Switch error handling from regex-on-message to `OmenXApiError.code` + `requestId`
     (include requestId in Discord alerts — Omen support asks for it).
   - Consider dropping our custom `withTimeout` in favor of `createPurchaseDeadlineMs`
     + per-call `signal` — but keep our 8s cap for in-run SKUs (v2 default deadline is
     240s, far too long mid-fight). Set `createPurchaseMaxAttempts: 1` for in-run SKUs
     to preserve current fail-fast behavior.
   - Our idempotency keys don't start with `purchase:` (reserved prefix) — ✓ already fine.

3. **Server (`distributeRewards` + other grant paths)**
   - Grants use raw fetch, so no SDK breakage — but adopt `GAME_REWARD_LIMITS`
     (300k per payment, 200 per batch) to validate our chunking assumptions
     (we chunk at 20 — well inside the limit).
   - The pinned `@1.0.33` import is only used to construct an unused `sdk` object —
     can be deleted at upgrade time.

## Upgrade order (when 2.x goes `latest`)

1. Fix the three platform-behavior items above on v1 first (safe, independently valuable).
2. Upgrade client SDK + `onSessionExpired` + scope decision; verify OAuth round-trip in a
   standalone tab (not builder preview — PKCE fails in the iframe).
3. Upgrade purchaseSku's pinned import; switch to `code`-based error branching; verify a
   real small purchase end-to-end.
4. Cleanup: remove dead SDK import in distributeRewards.