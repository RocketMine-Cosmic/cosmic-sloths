# Omen ticket — activity points sizing request

**Copy everything below the line into the Omen support ticket / game-dev-chat.**
Context: Omen said the 10,000/month allocation is for testing and asked us to open a ticket with
expected player count and frequency. Numbers measured from `DailyActivityLog` on 2026-09-17.

---

**Cosmic Sloths — activity points allocation sizing**

Current scale, measured over the last 30 days: **36 monthly active wallets, ~5 daily active.**

What we want to reward:

1. **Daily engagement loop** — daily login, completing all daily tasks, first sector clear of the
   day, and hitting a daily kill target. All four are already server-validated in our backend.
   ~35 points per player per day → **~1,050 per player per month** for perfect attendance.
2. **Weekly leaderboard placement** — top 10 of our weekly score board and weekly kill board
   (100 / 75 / 50 for 1st–3rd, 25 for 4th–10th). ~400 points per board per week →
   **~3,200 per month** total.

**Our request: ~50,000 points per month, with a per-player ceiling of ~2,000 per month.**

Sizing rationale: at today's 36 monthly actives that's roughly 40,000 used, and it leaves headroom
for growth to ~150 monthly actives before we'd need to come back to you. The 2,000 per-player
ceiling matters more than the pool size for us — a perfect-attendance player costs ~1,050 on the
daily loop alone, so the current 1,000 ceiling is breached around day 29 of the month and the loop
can't run on activity points at all.

**If the per-player ceiling has to stay at 1,000**, that's completely fine — we'll run the daily
loop on VIP points instead and use activity points purely for weekly placement (~3–4k/month, well
inside the current 10,000). We'd just like to know which of the two to build before we wire it up.

On handling the limits: every grant is written to a local log first with a deterministic
idempotency key, and we enforce our own monthly-pool and per-player caps before calling you — so
we won't be using your rejections as flow control. We'll also deliberately trip both limits
(a >100 grant, and a wallet pushed past its ceiling) on a test wallet first, so the rejection path
is proven rather than assumed.

Happy to share the exact event list and amounts if that helps you size it.