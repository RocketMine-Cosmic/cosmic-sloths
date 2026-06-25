# VIP Chest Integration — Open Questions for OmenX

**To:** Marco / OmenX dev team
**From:** Cosmic Sloths dev team
**Date:** 2026-06-25
**Context:** We've inspected the dev portal "VIP Chests" page and are ready to build our `onVipChestRewardGranted` webhook handler. A few things need clarifying from your side before / during build. Grouped by category, numbered for easy reference.

---

## A. Webhook contract (need before we start the handler)

**Q1 — Sample payload.** What does the `vip_chest.reward_granted` body actually look like? Need exact field names (`wallet` vs `wallet_address`, `reward_key` vs `reward_id`, etc.) before we can write the parser. A copy-pasteable JSON example would be ideal.

**Q2 — Retry policy.** If our handler returns 500, does OmenX retry? With what backoff? Is there a dead-letter queue, or do failed grants just vanish?

**Q3 — Test harness.** Is there a "send test event" button somewhere in the dev portal? We couldn't spot one on the Webhooks tab. If not, what's the staging path — do we have to buy real chests to validate?

**Q4 — Concurrency.** If 100 chests open in the same second (big payout event), does OmenX fan out 100 parallel webhook calls or queue them? Affects whether we need rate-limit handling on the receiver.

**Q5 — URL change policy.** We're already on our own custom domain so day-1 is fine. But IF we ever move our backend host behind the same domain later, can the URL be edited in the portal without invalidating the signing secret? Best case for us is a domain-pointing change with zero portal work.

---

## B. Chest mechanics (affect how we tune EV)

**Q6 — Soulbound or tradable?** Affects how aggressive we can make per-chest game-item EV. Tradable = lower EV. Soulbound = higher EV is fine.

**Q7 — Single open vs rip-multiple animation.** Does the chest UX on your side open one at a time, or rip-multiple in a single animation? Affects how we present grant reveals if we ever build a "grant history" view.

**Q8 — Can a single chest roll multiple categories** (e.g. Asset Manager Pack *and* a Game Item), or strictly one category per chest? Determines how common game-item slots are on average and therefore how lean our weighted rows can be.

---

## C. Cosmetics policy

**Q9 — Cosmetic seasons.** Should chest cosmetics be a permanent rotating pool, or do they sunset and become "vintage" after a season? Our preference is **sunset** — drives chest demand on each new season.

**Q10 — Custom Title moderation.** For our Mythic-tier "custom title" reward, who reviews submissions? Is moderation expected on our side (Discord-linked form or in-game admin queue), or does OmenX have a shared moderation surface?

---

## D. Edge case — wallets that have never played Cosmic Sloths

**Q11 — Never-played wallet.** A chest buyer who's never logged into Cosmic Sloths has no save data on our side. Our plan is to queue the grant in a `PendingChestGrant` table and apply it on their first login (with a "🎁 N unclaimed rewards waiting" prompt — also a nice onboarding hook).

Two things to confirm:
- (a) Is it OK for our webhook to return 200 even when the player hasn't onboarded yet? (We don't want OmenX retrying the grant — we'll hold it and apply it later ourselves.)
- (b) Is there a way to surface "this wallet hasn't activated Cosmic Sloths yet" back to OmenX so you can prompt them in your UI? Not a blocker either way — purely a UX-improvement question.

**Q12 — Blacklist visibility.** We maintain a `BlacklistedWallet` list for cheaters/exploiters. When a banned wallet rolls a game-item slot, do you want OmenX-side awareness so the chest re-rolls a non-game-item, or is silently consuming the roll acceptable? Silent is simpler on our side; only really matters at policy level if the list gets large.

---

## Quick summary of what we'd love to have

1. A sample payload for `vip_chest.reward_granted` (Q1)
2. Retry/DLQ behaviour (Q2)
3. Some way to fire a test webhook without real chest opens (Q3)
4. Yes/no on the "single chest = single category" question (Q8)
5. Confirmation that returning 200 for never-played wallets is the right contract (Q11a)

The rest are policy/UX clarifications we can resolve over the next week or two — they don't block the webhook handler build.

Cheers!