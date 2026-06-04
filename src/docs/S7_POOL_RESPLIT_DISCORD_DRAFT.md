# Discord Patch Notes Draft — S7 OMENX Pool Re-Split

**Schedule:** Post ~48h before S7 rollover (so ~2026-06-12, 48h ahead of 2026-06-14).
**Channels:** `#announcements` (full post) + `#patch-notes` (full post). Pin until rollover lands.
**Tone:** Hype the new kill leaderboard, frame the pool reshuffle as *more* ways to earn (not less). Do NOT publish raw % splits — players don't need pool math.

---

## Draft 1 — Hype-forward (recommended)

> **🛰️ SEASON 7 OMENX REWARDS — NEW WEEKLY KILL LEADERBOARD**
>
> Starting Season 7 (the week of **June 14th**), there's a brand new way to earn OMENX every single week.
>
> 🔥 **Weekly Sector Kills Leaderboard** — Top 20 sector grinders get paid in OMENX every week. No more "score or nothing" — if you're putting in the hours and racking up kills, the pool pays you back.
>
> 🏆 **Same weekly score leaderboard. Same seasonal score leaderboard.** Both still pay top 20 in OMENX, every week / every season, exactly like today.
>
> 📊 **More ways to win:**
> • Best score on a single run? → Weekly score top 20
> • Most consistent grinder? → Weekly kills top 20  *(NEW)*
> • Long-haul champion? → Seasonal score top 20
> • Squad warlord? → Seasonal Squad Champions
>
> Every sector kill from your runs this week feeds your kill leaderboard rank — endless / raid / meteor kills don't count, just sectors.
>
> The new leaderboard tab is already live in the leaderboard menu — you can preview it now, payouts kick in with the S7 rollover.
>
> See you in the void. 🌌

---

## Draft 2 — Short version (for `#patch-notes` if needed)

> **S7 patch — June 14th**
>
> ➕ **NEW: Weekly Sector Kills leaderboard** — top 20 weekly sector grinders get paid in OMENX.
> 🏆 Weekly score / seasonal score / Squad Champions payouts unchanged in format — still top 20 per week / season.
> 🔧 Owners can now tune leaderboard payouts live (no more code deploys to adjust splits).
>
> Kill leaderboard tab is live in the menu now — payouts start with S7.

---

## What NOT to say

- ❌ Don't publish "weekly pool dropped from 20% → 15%" — players read that as a nerf even though kill pool offsets it.
- ❌ Don't publish staff %s, kill pool %s, or tier breakdowns.
- ❌ Don't promise specific OMENX amounts — depends on weekly spend.
- ❌ Don't mention the "5% kill pool" / "20% seasonal" numbers anywhere player-facing.

## Pre-launch checklist

- [ ] Post 48h ahead (~2026-06-12)
- [ ] Confirm `getCurrentPeriodIds()` rolls to `2026-S7` correctly on Mon 2026-06-14 00:00 UTC
- [ ] Smoke-test `previewPayouts` on a current weekly period → should still return `uses_new_pools: false`
- [ ] Smoke-test `previewPayouts` on a hypothetical S7 weekly period (or after rollover) → should return `uses_new_pools: true` + `kill_payout > 0`
- [ ] Confirm the leaderboard tab "Coming S7" gate flips off automatically on rollover

## Post-rollover monitoring

- First S7 weekly distribution (Mon 2026-06-22): verify kill payouts hit `PayoutLog` with `period_type='weekly_kills'`
- Watch Discord for "where's my OMENX?" — kill pool is small (5% of weekly spend), so ranks 11-20 may get small amounts on slow weeks
- If a slow week hits and rank-20 kill payout < 5 OMENX, consider bumping `kill_pool_pct` to 6-7% (one config click, no code deploy)