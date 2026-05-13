# Middleman Alternatives — Custom Token + Simple API

> **Status:** Research only
> **Date:** 2026-05-13
> **Context:** Crossmint ruled out (too stablecoin-focused, complex onboarding). We want a **custom game token** (OMENX equivalent) with a **simple, reliable API** and minimal vendor lock-in to fiat/stablecoin flows.

---

## What We Actually Need

A clear restatement of requirements, since Crossmint missed the mark:

1. ✅ **Custom SPL token support** — we have/want our own game token, not USDC payments
2. ✅ **Simple REST API** — call endpoints, get tokens moved, done
3. ✅ **Reliable infrastructure** — proper retries, status page, not 502-hell
4. ✅ **Custodial wallets for non-crypto players** — email login, no Phantom required
5. ✅ **Batch payouts** for weekly reward distribution
6. ✅ **Stay on Solana** — minimize player migration friction
7. ❌ **NOT** a fiat checkout product
8. ❌ **NOT** an NFT-marketplace platform
9. ❌ **NOT** locked to stablecoins

---

## Top 3 Realistic Options

### 🥇 Option 1: Helius (RPC + transaction infra)

**What it is:** Solana RPC provider with high-reliability transaction sending, webhooks, and enhanced APIs. Used by most serious Solana projects (Magic Eden, Tensor, Drift, etc.).

**Why it fits:**
- We send our own SPL token transactions through their RPC — they handle the hard parts (priority fees, retries, confirmation polling).
- No middleman holding our token — it's still **our SPL token** on Solana.
- Webhooks notify us when transactions confirm — replaces our `probeOmenxSettlement` polling.
- "Smart transactions" feature auto-retries with optimal priority fees until landed.

**What we'd build:**
- Hot wallet (our treasury) with our SPL token minted
- Backend functions call Helius RPC to sign + send transfers
- ~50 lines of `@solana/web3.js` + `@solana/spl-token`
- We control the keys, Helius just makes sending reliable

**Player UX:**
- Need a wallet solution layered on top (see Option 1b below for Privy combo)
- OR keep using OmenX *just* for wallets if their wallet side is more reliable than payments

**Pricing:**
- Free tier: 100k credits/month (probably enough for early use)
- Developer: $49/mo for 10M credits
- Business: $499/mo
- No per-transaction fee — flat plan pricing

**Effort:** ~3-4 days to migrate `purchaseSku` / `distributeRewards` / `getPlayerBalance`

**Pros:**
- ✅ We own the token entirely
- ✅ Industry-standard Solana infra (used by billions in volume)
- ✅ Predictable flat pricing, no % cut
- ✅ Simple REST/RPC API
- ✅ Webhooks for tx confirmation

**Cons:**
- ⚠️ Doesn't solve wallet onboarding — need to pair with Privy or similar for email login
- ⚠️ Hot wallet security is on us (mitigated: small float, cold reserve)

**Verdict:** Strong fit if paired with a wallet solution. **Best for "we want to own everything, just make it reliable."**

---

### 🥇 Option 1b: Helius + Privy combo (recommended)

The combo plate. Privy gives us email-login custodial wallets, Helius gives us reliable transaction sending. Together they cover everything OmenX does — and we own the token.

**Privy** (https://privy.io):
- Email/social login → automatic Solana wallet created behind the scenes
- Players never see a seed phrase unless they want to "graduate" to a real wallet
- Free up to 1000 monthly active users, then ~$0.05/MAU
- Used by hot games like Pirate Nation

**Helius** handles the on-chain sends.

**Total cost at moderate scale:**
- Privy: ~$50-200/mo depending on MAU
- Helius: $49-499/mo depending on volume
- vs. OmenX's effective % cut — likely cheaper at scale

**Effort:** ~5-7 days end-to-end (Privy frontend + Helius backend + migration tooling)

---

### 🥈 Option 2: Thirdweb Engine (game-focused infra)

**What it is:** Backend service specifically for web3 games. Handles transaction queueing, retries, idempotency, and wallets — all via clean REST API.

**Why it fits:**
- Built **for** game studios with exactly our problem (reliable token economies)
- Solana support added in 2025 (verify current state)
- "Engine" product is a self-hostable or hosted backend that queues + retries blockchain writes
- Embedded wallets via email available

**What we'd build:**
- Point our backend functions at Thirdweb Engine endpoints
- They mint/transfer our SPL token on our behalf
- Webhook flow for confirmations

**Pricing:**
- Free tier exists for low volume
- Starter: $99/mo flat (most features unlocked)
- Growth: $499/mo (production volume)
- No per-tx % cut on flat plans

**Pros:**
- ✅ Designed for game economies specifically
- ✅ Flat pricing, no transaction %
- ✅ Built-in queueing + idempotency
- ✅ Wallet onboarding included
- ✅ Real docs, real support

**Cons:**
- ⚠️ More opinionated SDK — bigger code change than Helius
- ⚠️ Solana support is newer than their EVM support — verify maturity
- ⚠️ More vendor lock-in than Helius (we use their wallet system)

**Verdict:** Strong fit if their Solana support is solid. **Best for "I want one provider, game-focused, flat pricing."**

---

### 🥉 Option 3: Helio (Solana-native payments)

**What it is:** Solana payment infrastructure, used by lots of Solana games and creators. Originally built for one-click crypto checkouts but now expanded into broader payment/payout APIs.

**Why it fits:**
- Solana-native (matches our ecosystem)
- Custom SPL token support
- Simpler API surface than Crossmint
- Lower fees (~1%)

**Pros:**
- ✅ Solana-first, not multi-chain bloat
- ✅ Custom token support
- ✅ Lower fees than Crossmint
- ✅ Simpler product

**Cons:**
- ⚠️ Less established than Helius/Thirdweb — smaller team, smaller support
- ⚠️ More payment-checkout focused than custodial-wallet focused — wallet UX may be similar to OmenX's pain points
- ⚠️ Less battle-tested at scale

**Verdict:** Worth a look but probably not the answer. **Backup option if Helius/Thirdweb don't pan out.**

---

## Side-by-Side Comparison

| Criterion | Helius + Privy | Thirdweb Engine | Helio |
|---|---|---|---|
| **We own the token** | ✅ Fully | ✅ Fully | ✅ Fully |
| **Custodial wallets** | ✅ (via Privy) | ✅ Built-in | ✅ Built-in |
| **Solana support quality** | ✅ Best in class | ⚠️ Newer | ✅ Native |
| **API simplicity** | ✅ RPC + REST | ✅ REST | ✅ REST |
| **Reliability** | ✅ Industry standard | ✅ Good | ⚠️ Less proven |
| **Pricing model** | Flat tiered | Flat tiered | % per tx (~1%) |
| **Approx monthly cost** | $50-700 | $99-499 | Volume-based |
| **Vendor lock-in** | 🟢 Low | 🟡 Medium | 🟡 Medium |
| **Migration effort** | 5-7 days | 4-6 days | 3-5 days |
| **Wallet UX (email login)** | ✅ Privy nails this | ✅ Solid | ⚠️ More crypto-native |

---

## My Recommendation

**Go with Helius + Privy** for these specific reasons matching your situation:

1. **You already said you don't want to do it all yourself** — Privy hides wallet complexity, Helius hides transaction reliability complexity. You glue ~100 lines of code together.

2. **You own the token** — no vendor controls your in-game economy. If Privy/Helius ever flake, you can swap them out individually without touching your token mint.

3. **Predictable flat pricing** — no surprise percentage cut on every player transaction. Easier to model economics.

4. **Lowest lock-in** — both are infrastructure, not platforms. Their APIs are essentially "make Solana easier" rather than "use our product."

5. **Real reliability** — Helius is what serious Solana projects use. Privy is what serious crypto consumer apps use. Both have enterprise SLAs.

The trade-off: **2 vendors instead of 1**. But the simplicity per vendor is so much higher than Crossmint that net complexity is actually lower.

---

## What Stays vs. Changes (if we go Helius + Privy)

### Stays the same
- Our SPL token (we mint a new one, equivalent value to OMENX, swap 1:1)
- All game logic, entities, save system
- Admin tooling (refunds, audits) — mostly works the same way against a different token mint

### Changes
- `purchaseSku` — call Helius `sendSmartTransaction` instead of OmenX
- `distributeRewards` — batch SPL transfers via Helius
- `getPlayerBalance` — Helius's enhanced balance API or direct RPC
- `linkWalletToUser` — Privy callback instead of OmenX OAuth
- Frontend login flow — Privy's React SDK instead of OmenX widget

### Goes away
- 8x payment key rotation
- 9x balance key rotation
- `probeOmenxSettlement`
- `refundAllOmenx` (replaced by simple SPL transfer reversal)
- `OMENX_*` secrets (mostly)

---

## Open Questions

- [ ] **Does Privy support custom SPL tokens out of the box, or do we read balance separately via Helius?** (Almost certainly separate — Privy = wallet, Helius = chain reads.)
- [ ] **Migration: how do we move existing OMENX balances to the new token?** Options: (a) snapshot + airdrop new token, (b) OmenX → new token redemption portal, (c) honor both for a transition period.
- [ ] **Mint authority for new token** — keep mutable for emergencies, or burn for trust? (Recommend: multisig mint authority, never burn until economy is stable.)
- [ ] **Token name + ticker** — keep "OMENX" if licensing allows, or new branded ticker?
- [ ] **Helius webhook reliability** — what's their delivery SLA?
- [ ] **Privy MAU pricing tier** — get a quote at our current active player count.

---

## Suggested Next Steps

If this direction looks right:

1. **Spin up Helius free tier** — test sending an SPL transfer from a test wallet to another. Takes 30 minutes.
2. **Spin up Privy free tier** — create an email-login wallet on Solana devnet. Takes 30 minutes.
3. **Build a tiny prototype** — a Base44 backend function that uses Helius to send 1 token to a Privy-created wallet. End-to-end smoke test.
4. **If it works:** start planning the migration in earnest with this doc as the foundation.
5. **If it doesn't:** fall back to evaluating Thirdweb Engine.

---

## Alternatives Explicitly Ruled Out

| Option | Why not |
|---|---|
| Crossmint | Too stablecoin-focused, complex website/product |
| Magic.link | Wallet-only, would still need separate payment infra (same problem we have now) |
| Stripe Crypto | Fiat-onramp focused, not game token economy |
| Going fully DIY | You explicitly said you don't want to do it all yourself |
| Staying on OmenX | The whole reason we're here — reliability is unacceptable |

---

*This doc supersedes `CROSSMINT_RESEARCH.md` for active research. Keep both for posterity.*