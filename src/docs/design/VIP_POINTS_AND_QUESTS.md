# OmenX VIP Points & Quests — API Findings + Integration Ideas

**Status:** Research / proposal (not implemented)
**Source:** `@omen.foundation/game-sdk` v1.0.33 — `OmenXServerSDK` + `API_ENDPOINTS.md` bundled with the package.
**Date:** 2026-08-05

---

## 1. What the API gives us

The server SDK (the same one we already use for payouts) has two related systems:

### A. VIP Points (developer pool)

Omen allocates each game a **pool of VIP points** (total allocation + max-per-quest are
configured by us in the **Omen developer portal** — not via API). We spend from that pool
by granting points to player wallets:

```js
const sdk = new OmenXServerSDK({ apiKey, apiBaseUrl });

await sdk.grantVipPoints({
    wallet: '0x…',          // player wallet
    amount: 25,             // positive integer, capped by pool remaining + max-per-quest
    questId: 'weekly_kills_top10_2026-W32',  // optional — idempotency / audit id
});
// → { success, data: { wallet, amount, phaseIndex } }
```

- **Endpoint:** `POST /v1/vip/grant-points`
- **Scope required:** `vip_points:write` (our current keys may NOT have this — needs checking/reissuing in the dev portal)
- **Errors:** `GRANT_POINTS_FAILED` when the pool is exhausted or the wallet is invalid.
- VIP points feed the player's platform-wide **VIP tier** (`entitlement`, `claimable`, tier, phase)
  which we can already read via `getPlayerVipStatus(wallet)` / `getVipLevel` (in use today for VIP perks).

### B. Quests (game-scoped)

Omen also hosts a quest system per game. Quest *definitions* live on Omen's side
(configured in the dev portal); the API assigns them to players, tracks step progress,
and pays the VIP reward from the same pool when claimed:

```js
// Assign 3 daily quests to a player (idempotent with a key)
await sdk.assignQuests(wallet, 'daily', 3, { idempotencyKey: `daily-${wallet}-2026-08-05` });

// Read what they have (optionally filter by type)
const { data } = await sdk.getQuestsForPlayer(wallet, { questType: 'daily' });

// Report progress on a step — quest auto-completes when all steps hit their targets
await sdk.reportQuestProgress(wallet, questKey, killCount, { stepKey: 'kills' });

// Or force-complete
await sdk.completeQuest(wallet, questKey);

// Claim the VIP reward (deducts from our game pool)
const r = await sdk.claimQuestReward(wallet, questKey, { idempotencyKey: `claim-${wallet}-${questKey}` });
// → { success, data: { pointsGranted } }

// Reset tooling (admin/debug)
await sdk.resetPlayerQuests(wallet, 'wipe');            // everything
await sdk.resetPlayerQuests(wallet, 'reset', questKey); // one quest
```

- **Quest types:** `daily` | `weekly` | `monthly` | `oneTime`
- **Scopes:** `quests:read` (get) / `quests:write` (assign, progress, complete, claim, reset)
- **Errors:** `ASSIGN_FAILED`, `PROGRESS_FAILED`, `COMPLETE_FAILED`, `CLAIM_FAILED`

### Key constraint

Both paths draw from the **same game-allocated pool**. Once it's spent, grants fail
until Omen tops it up. So the design below budgets points conservatively and puts
the biggest rewards on rare, verifiable events.

---

## 2. Prerequisites before any build

1. **Dev portal:** request/confirm a VIP points allocation for Cosmic Sloths and set
   max-per-quest. Define quest templates there if we use the hosted quest system.
2. **API key:** confirm (or reissue) a key with `vip_points:write` + `quests:read/write`.
   Store as a new secret, e.g. `OMENX_VIP_API_KEY` — don't overload the rewards keys.
3. **Idempotency everywhere:** every grant/claim gets a deterministic `questId` /
   `idempotencyKey` (e.g. `${event}_${wallet}_${period}`) so retries never double-grant —
   same lesson we learned from payout logs.
4. **Local audit log:** mirror every grant into a new `VipPointGrantLog` entity
   (wallet, amount, reason, quest id, period) so admins can audit against the pool.

---

## 3. Integration ideas (ranked)

### Tier 1 — cheap wins, server-authoritative already (recommended first)

These hook into events our backend **already validates**, so a grant is one extra call:

| Event | Where it fires today | Suggested points | Idempotency key |
|---|---|---|---|
| Weekly kill leaderboard top 10 | `distributeKillPool` | 50 / 30 / 20 (1st/2nd/3rd), 10 (4–10) | `killlb_${week}_${wallet}` |
| Weekly score leaderboard top 10 | `manuallyDistributeRewards` | same band | `scorelb_${week}_${wallet}` |
| Squad War win | `squadWarEngine` claim path | 15 per member | `war_${warId}_${wallet}` |
| Global Boss kill contribution | `claimBossReward` | 5–20 by damage band | `boss_${bossId}_${wallet}` |
| Squad Champions (seasonal) | `distributeSquadChampions` | 100 per champion member | `champ_${season}_${wallet}` |

All grants happen **alongside** OMENX payouts in the same functions — the log-first
pattern we already use protects against double-grants.

### Tier 2 — daily engagement loop

| Event | Hook | Points |
|---|---|---|
| Daily login streak (7 days) | `claimDailyLogin` | 5 on day 7 |
| All daily tasks complete | `claimDailyTask` | 3 |
| First sector clear of the day | `saveScore` | 2 |

Small numbers, but daily — budget ~10 pts/player/day max, and consider a weekly cap
per wallet (enforced in our backend before calling grant) to protect the pool.

### Tier 3 — hosted quests (bigger build, nicest UX)

Use Omen's quest system so quests show up in the player's OmenX profile too:

- Define quests in the dev portal (e.g. "Kill 500 enemies this week", "Win a Squad War",
  "Clear Sector 10 on Hard").
- A scheduled automation assigns `daily`/`weekly` quests to active players
  (source: `DailyActivityLog` — only assign to players seen in the last 7 days,
  keeps assignment volume sane).
- `saveScore` (and war/boss claim paths) call `reportQuestProgress` with the run's
  kills/score — Omen auto-completes when targets are met.
- A "Claim" button in the game (Dailys page fits) calls a new backend function
  `claimOmenQuest` → `sdk.claimQuestReward` → toast with `pointsGranted`.

### Anti-abuse notes

- Grants only from backend functions after the same validation the OMENX payouts use
  (blacklist check via `BlacklistedWallet`, endless runs excluded, server-side kill counters).
- Never grant from client-reported values directly — reuse the server-authoritative
  counters (`weekly_sector_kills`, `WeeklyKillSnapshot`, war kill tables).
- Weekly per-wallet cap in our code as a second fence in front of Omen's max-per-quest.

---

## 4. Suggested rollout

1. **Phase 1:** `VipPointGrantLog` entity + grants wired into the weekly kill/score
   payout functions (Tier 1, two functions touched). Admin panel card showing pool
   spend from the log.
2. **Phase 2:** daily loop grants (Tier 2) with weekly caps.
3. **Phase 3:** hosted quests (Tier 3) once portal quest templates exist — replaces or
   augments our in-game Dailys with platform-visible quests.

Open questions for Omen / the dev portal:
- What's our current pool allocation and max-per-quest?
- Is there an API to read pool remaining? (Not in the SDK — likely portal-only, so
  our local grant log is the working balance tracker.)
- Do granted points appear instantly in `getPlayerVipStatus` (`entitlement`)?