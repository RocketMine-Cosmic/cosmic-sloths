# Crossmint — Research Notes

> **Status:** Research only — no migration committed.
> **Date:** 2026-05-13
> **Goal:** Evaluate Crossmint as a reliability-focused replacement for OmenX (which has been suffering intermittent 502s, settlement flakes, and forced us to build extensive retry/rotation/refund tooling).

---

## TL;DR

Crossmint is a **wallet + payments + NFT infrastructure provider** that exposes everything via REST APIs. It's the closest 1:1 conceptual replacement for what OmenX does for Cosmic Sloths today: custodial wallets for non-crypto players, payment settlement, payouts, and NFT context.

**Why it's interesting for us:** Enterprise-grade infra with proper SLAs, idempotency built-in, real status pages, and dedicated support — replacing the parts of OmenX that have been the source of our reliability pain.

---

## What Crossmint Covers

| Feature | What it does | Replaces in our stack |
|---|---|---|
| **Wallets-as-a-Service** | Custodial wallets created via email/social login. No Phantom install required. | OmenX auth + wallet linking |
| **Checkout / Payments** | Accept crypto or fiat (card → crypto under the hood). | `purchaseSku` settlement leg |
| **Payouts API** | Send tokens to many wallets in one call (batched). | `distributeRewards` payment leg |
| **Balances API** | Read on-chain or custodial balances. | `getPlayerBalance` |
| **NFT APIs** | Mint, transfer, query NFT ownership. | `getNFTs`, `adminRefreshPlayerNFTs` |
| **Webhooks** | Real-time notifications on tx confirmation. | Replaces our polling / `probeOmenxSettlement` |

---

## Reliability Profile (vs OmenX)

This is the whole reason we're looking.

| Dimension | OmenX today | Crossmint |
|---|---|---|
| 502 / gateway errors | Frequent (we built 8-key rotation around it) | Rare — enterprise infra |
| Status page | None public | `status.crossmint.com` |
| SLA | Informal | Contractual on paid tiers |
| Retries / idempotency | We built it ourselves | Built into the API (idempotency keys) |
| Support | Discord-only | Email + dedicated CSM on paid |
| Test environment | Limited | Full staging/sandbox |

---

## Pricing (approximate, as of research date)

- **Transaction fees:** ~2.5% per payment transaction
- **Wallet creation:** Free
- **Payouts:** Per-transaction fee depending on chain (~$0.005 on Solana, more on EVM)
- **NFT mints:** ~$0.10 + chain gas
- **Plans:**
  - **Starter:** Pay-as-you-go, no monthly minimum
  - **Production:** Custom pricing, includes SLA + CSM
  - **Enterprise:** Volume discounts

> ⚠️ **Verify current pricing at https://crossmint.com/pricing — the above is a snapshot and may have changed.**

---

## Chain Support

- ✅ **Solana** (our current ecosystem — easiest migration path)
- ✅ Ethereum, Base, Polygon, Arbitrum, Optimism, BNB Chain
- ✅ Multi-chain in a single project

For Cosmic Sloths: stay on Solana to minimize player disruption (they already have OmenX wallets there).

---

## How Cosmic Sloths Functions Would Change

### `purchaseSku` (currently rotates 8 OMENX_PAYMENT_API_KEY_* secrets)

**Before (OmenX):**
- Iterate through 8 keys
- Catch 502s, retry
- Probe settlement separately
- Log to `TokenSpendLog` only after confirmation

**After (Crossmint):**
- Single API call with idempotency key
- Crossmint handles retries + settlement
- Webhook fires on confirmation
- We log on webhook receipt

**Net effect:** ~70% less code, no key rotation needed.

### `distributeRewards` (weekly batch payouts)

**Before (OmenX):**
- Loop players, call payment API per player
- Handle individual failures, retry queue
- Track each tx separately

**After (Crossmint):**
- Single batched payouts API call with array of recipients
- Crossmint queues + retries internally
- Webhook per recipient on completion

**Net effect:** One call instead of N. Built-in batching.

### `getPlayerBalance`

**Before (OmenX):**
- Rotate through `OMENX_BALANCE_API_KEY_*` (we have 9 of these)
- Cache aggressively to avoid rate limits

**After (Crossmint):**
- Single API call, no rotation
- Higher rate limits on paid tier

### `getNFTs` / NFT-based VIP perks

**Before:**
- Custom NFT API URL (`CUSTOM_NFT_API_URL` secret)
- Manual sync logic

**After:**
- Crossmint's wallet NFT endpoint
- Or — we could keep custom NFT logic since it's working fine; it's the **payments** that hurt, not NFT reads

---

## Migration Path (rough sketch — NOT a commitment)

### Phase 0 — Sandbox eval (1 day)
- Sign up for Crossmint sandbox
- Test wallet creation, a sample purchase, a sample payout
- Validate Solana SPL token support matches our needs
- Check that webhook flow works through Base44 backend functions

### Phase 1 — Dual-write (3-5 days)
- New backend functions: `purchaseSkuV2`, `distributeRewardsV2` using Crossmint
- Feature flag in `AppConfig` to route % of traffic to V2
- Run both in parallel, compare reliability metrics

### Phase 2 — Player migration (1-2 weeks)
- Snapshot existing OmenX balances per wallet
- For each player: create Crossmint wallet linked to same email
- Credit equivalent token balance
- Dual-support window: old + new wallets both spendable
- Communicate via Discord + in-game banner

### Phase 3 — Cutover (1 day)
- Flip feature flag to 100% Crossmint
- Keep OmenX endpoints alive for read-only audit purposes
- Archive OmenX API keys

### Phase 4 — Cleanup (ongoing)
- Remove rotation logic from codebase
- Decommission OmenX-specific admin tools (`probeOmenxSettlement`, `refundAllOmenx`, etc.)
- Update docs

**Total realistic timeline:** 3-4 weeks calendar time, ~1 week of focused dev work.

---

## Open Questions to Research

Things to confirm before committing — flag these for Crossmint sales/docs:

- [ ] **Do they support a custom SPL token?** (Our OMENX token equivalent — or do we need to mint a new one on Crossmint?)
- [ ] **Migration tooling?** Do they have a "bulk wallet creation + balance seeding" flow, or do we DIY?
- [ ] **VIP NFT logic** — can their wallet API read NFTs we don't mint through them? (Important for player NFT-based perks.)
- [ ] **Idempotency window** — how long is an idempotency key valid? (We need at least 24h for retry safety.)
- [ ] **Webhook reliability** — what happens if a webhook delivery fails? Retry semantics?
- [ ] **Refund flow** — does their refund endpoint match our needs, or do we need to keep custom refund logic?
- [ ] **Geographic restrictions** — any countries blocked that would lock out current players?
- [ ] **KYC requirements** — for the project owner, and for players above certain volumes?
- [ ] **Total cost at our volume** — get an estimate using last 30 days of tx counts (multiply by ~2.5% and compare to OmenX's effective cut).

---

## Pros / Cons Summary

### ✅ Pros
- Solves the reliability problem (which is the whole point)
- Replaces multiple OmenX pain points in one platform
- Email login = zero new player friction
- Multi-chain optionality for future
- Real support + SLA
- Lots of our custom retry/rotation code can be deleted

### ⚠️ Cons
- ~2.5% per tx — need to compare vs OmenX's effective cost
- Lock-in to another vendor (just a different one)
- Migration effort (3-4 weeks calendar)
- Need to communicate change to playerbase
- Some custom OmenX-specific perks (VIP NFT integration) might need rebuilding
- Player education: "your tokens moved to a new wallet"

### 🚫 Dealbreakers (TBD until research is done)
- If they don't support our token model
- If pricing at our volume is materially worse than OmenX
- If KYC requirements lock out a meaningful chunk of our players

---

## Links to Research

- **Main site:** https://crossmint.com
- **Docs:** https://docs.crossmint.com
- **Pricing:** https://crossmint.com/pricing
- **Status:** https://status.crossmint.com
- **Solana-specific docs:** https://docs.crossmint.com/wallets/quickstarts/solana
- **Payouts API:** https://docs.crossmint.com/payments/payouts
- **Wallets API:** https://docs.crossmint.com/wallets

---

## Alternatives to Keep on the Table

If Crossmint research turns up dealbreakers:

1. **Thirdweb Engine** — game-focused, $99/mo flat tier, built-in transaction queueing
2. **Helio** — Solana-native, smaller scope but simpler, ~1% fees
3. **Privy + thin direct-Solana layer** — wallets-as-a-service + we write ~30 lines of SPL transfer code
4. **Magic.link** — wallet provider only, would still need a separate settlement piece

---

## Decision Criteria (for when research is done)

To go ahead with migration, Crossmint must hit **all four**:

1. ✅ Supports our SPL token (or viable migration to a new mint)
2. ✅ Effective cost ≤ ~3% at our current volume
3. ✅ Webhook + idempotency story is rock solid (better than OmenX, obviously)
4. ✅ No KYC blocker for >5% of our player base

If 3+ hit and one is borderline — proceed with sandbox eval.
If 2 or fewer — look at Thirdweb / Helio instead.

---

*Notes added by Hugo — feel free to expand as you read through their docs.*