# Omen — Cosmic Sloths activity points event list

**For:** Edward / Omen game-dev-chat · **Re:** activity allocation 50,000/mo, 2,000/player, 100/grant
**Date:** 2026-09-19 · copy-paste ready

---

Thanks Edward — that's exactly the steer we needed. Daily loop goes on activity points, VIP stays
untouched. Event list and amounts below; the largest single grant is 100.

**Daily loop (one grant per event per UTC day per wallet)**

| Event | Points |
|---|---|
| Daily login | 10 |
| All daily tasks completed | 10 |
| First sector clear of the day | 5 |
| Daily kill target reached | 10 |
| Login streak milestone — 3 days | 25 |
| Login streak milestone — 7 days | 50 |
| Login streak milestone — 14 days | 100 |
| Login streak milestone — 30 days | 100 |

Perfect day = 35. Perfect month ≈ 1,425 — under the 2,000 ceiling.

**Weekly placement (one grant per board per wallet per ISO week)**

| Event | Points |
|---|---|
| Weekly score board — 1st / 2nd / 3rd | 100 / 75 / 50 |
| Weekly score board — 4th to 10th | 25 |
| Weekly kills board — 1st / 2nd / 3rd | 100 / 75 / 50 |
| Weekly kills board — 4th to 10th | 25 |
| Squad War win (each member of the winning squad) | 10 |
| Squad Champions (season) — 1st | 100 |

**Expected spend at current scale** (36 monthly actives, ~5 daily): roughly 8–12k of the 50k a
month. We'll be back before 150 monthly actives as you asked.

**Handling, as agreed:** deterministic `Idempotency-Key` on every grant, our own pool / per-player /
per-day caps enforced before we call you, every outcome (including refusals) logged locally. We'll
trip all three refusals on a test wallet first — grant of 101, wallet pushed past 2,000, wallet
that has never played — before anything goes live.

One question: for the **daily login** grant, a brand-new wallet may log in before its first run.
We expect that to come back as the "has not played your game" refusal — we'll just log and skip it
(the first-run grant later that day will land). Is a single sector clear enough to count as
"played", or is there a threshold?