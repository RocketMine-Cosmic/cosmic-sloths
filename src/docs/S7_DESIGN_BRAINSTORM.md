# Season 7 — Design Brainstorm

**Status:** EXPLORATION / NOT DECIDED. Owner reads, picks what to ship.
**Date:** 2026-06-07
**Trigger:** Anubis Discord feedback (screenshot 2026-06-07) — "this is a shooter, not a stand-around-and-collect-nukes game."

---

## 1. The Core Problem Anubis Is Naming

Anubis isn't really complaining about *difficulty*. He's complaining about **agency**. Right now the optimal loop is:

1. Stack shield bubble + magnet + AoE early.
2. Stand still or shuffle in tiny circles.
3. Wait for enemies to **pile up** around you because they're slow and you out-DPS the leading edge before they reach you.
4. Wait for a nuke pickup to drop.
5. Walk the nuke into the pile → screen clears → repeat.

The shooter fantasy ("mow the fuckers down with my leveled weapons") gets replaced by a pickup-management puzzle. **Weapon levels become a means to survive the wait between nukes, not the primary source of clear.** That's exactly what he's calling out: *"why level anything other than shield?"*

The data backs this. From `PickupSystem.js:14-24`:

```js
engine.enemies.forEach(e => {
    if (!e.isBoss) {
        engine.damageEnemy(e, e.maxHp * 10, { weaponId: 'nukePickup' });
    }
});
```

A nuke does **1000% of every non-boss mob's max HP**. There's no weapon level in the game that competes with that per-cast. A maxed neoBlaster might do 800 damage per shot; a nuke does *millions* of effective damage across a packed screen. The pickup IS the win button.

Combine that with the existing `postNukeSpawnBoostUntil` (5s of 2× spawn rate after a nuke, `EnemySpawner.js:184-186`) and you've built a *feedback loop that rewards the nuke meta*: nukes clear the screen → spawns ramp back up → nuke ready again sooner. The game is teaching the bad strategy.

---

## 2. What Anubis Is Asking For (Translated)

1. **More enemies on screen, faster.** Higher spawn rate, lower travel time to player.
2. **Slightly tougher mobs** — not HP sponges, but enough that a single beam tick doesn't clear a wave instantly.
3. **Killing-velocity-driven escalation.** "Spawning slightly faster... till either player dies, wins round, or is at a DPS plateau." This is essentially what Dynamic Difficulty *tries* to do, but tuned weakly — DD currently caps at 3.5× and only kicks in when the player is *over*performing the baseline, which most players never trigger.
4. **Weapon upgrades feel like the win condition**, not a holding pattern.

In short: rebalance the loop so **clear comes from sustained weapon DPS into a denser, faster, slightly hardier crowd**, not from punctual nuke detonations.

---

## 3. The Levers We Have (Ranked by Impact)

### 3a. Spawn rate (HIGH impact, LOW risk if tuned carefully)

`EnemySpawner.js:165-167` — current sector formula at progress=0.5 is roughly one spawn per `~0.6s` after DD/density/opening-blend modifiers. The 30s end-of-run taper *chokes* spawns down to ~1/6 rate when whales are still pushing.

**S7 proposals — pick one:**

- **(a) Flat +25% spawn rate across all sectors.** Easy lever, immediate "more mobs" feel. Doesn't break HP/dmg math.
- **(b) Remove the end-of-run taper entirely.** Currently the last 30s of a sector run drains the field right before the boss spawn — exactly when good players want to maximize kills. Anubis specifically complains the screen feels empty.
- **(c) Curve-based: spawn rate scales with player kill-velocity over a rolling 10-second window.** This is what Anubis described literally — "depending on how fast the player is killing them they are spawning slightly faster... till at a DPS plateau." Mathematically:
  ```
  killsPerSec = rollingKills(10s) / 10
  targetMult = 1 + (killsPerSec / baselineKPS) * 0.5
  spawnRateMult = lerp(currentMult, targetMult, dt * 0.2)   // smooths
  ```
  Caps at ~3× so dominant players see a *visibly* fuller screen but can't be drowned. **This is the most "Anubis-shaped" answer** — the whole feedback loop becomes "kill more → see more → kill more."

**Recommend (b) + (c) combined.** (a) is too blunt; (b) fixes a specific complaint; (c) is the soul of the request.

### 3b. Enemy movement speed (HIGH impact, MEDIUM risk)

The current per-tier `speed` values multiplied by `engine.difficulty.speedMult` are the only knob for "how fast enemies close the gap." Most T1-T3 mobs sit around speed 60-80; Cosmic gives `speedMult ≈ 1.5×`.

Anubis wants enemies to **reach the player**, not pile up at the magnet radius and wait to be nuked.

**Proposal:** +15-20% baseline mob speed across all tiers + add a *contact-pressure ramp*: any enemy that has been "stuck" in the magnet radius without entering the kill radius for >3s gets a small +20% speed burst. Punishes the static-pile playstyle directly. Mobs come INTO you rather than circling.

### 3c. Mob HP (LOW impact, HIGH risk)

Anubis specifically said *"slight"* HP increase. Don't overshoot. The danger is creating S6's S15-20 problem in earlier sectors — bullet-sponge mobs make every weapon feel like a pea-shooter.

**Proposal:** S1-S10 mobs get +10% HP. S11-S20 untouched (Outer Galaxy is already brutal). This is the lightest possible thumb on the scale and preserves the "blowing up under my weapons" feel he wants.

### 3d. Nuke pickup rebalance (MEDIUM impact, HIGH visibility)

**Don't remove nukes** — they're a beloved "OH SHIT" moment. But the current 10× maxHp clear is *the* clear, not a *bonus* clear. Options, from gentlest to most aggressive:

1. **Drop rate −33%.** Stay rare → stay special. Easiest change. (Check `EnemySpawner` / loot tables for current drop chance — needs separate audit.)
2. **Damage cap.** Change `maxHp * 10` → `maxHp * 2.5`. Still one-shots most mobs, but T11+ Outer Galaxy mobs survive — meaning nukes *thin the herd* in late sectors instead of erasing it.
3. **Remove the 5s post-nuke spawn boost.** The current `postNukeSpawnBoostUntil` was designed to "fix the empty field" but inadvertently rewards the nuke-stack meta. Without it, nukes feel more like resets, less like rotations.
4. **Convert nukes to AoE damage scaling with player weapon DPS.** `damage = max(maxHp * 2, rollingPlayerDPS * 5)`. Now nukes amplify your build instead of replacing it. *This is the most thematically aligned with Anubis's complaint* — even the "I-win button" rewards leveled weapons.

**Recommend (1) + (3) for S7.** (4) is more elegant but a bigger lift. Re-evaluate for S8.

### 3e. Weapon level reward curve (HIGH impact, HIGHEST risk)

If we want **leveling weapons to feel good**, weapon-level scalars need to outpace mob HP growth visibly. Currently the player buys upgrades in `permanentWeaponUpgrades` (`damage`, `area`, `cooldown`) — each capped at 5 levels in S6 with linear-ish growth.

Anubis says *"weapon upgrades should be your main source of enemy clear."* For that to be felt, **every level-up needs to noticeably wipe a tier of mob faster**. Concrete proposal:

- **Per-level damage scaling on weapon evolution** — every weapon level past 5 grants +8% damage compounding (currently the game soft-caps weapon impact at evolution; nothing meaningful happens to a maxed weapon's numbers after that). A maxed evolved weapon would feel ~50% stronger than it does today over a 15-minute run.
- **Visible "OVERKILL" feedback** — when a weapon shot does >3× a mob's HP, paint the damage text orange and add a small spark VFX. Makes leveling tactile.

**This is the biggest design lift in the doc.** It needs careful audit of every weapon to avoid creating one OP build. Worth doing in a Phase 2 patch mid-S7 rather than at launch.

### 3f. Dynamic Difficulty rework (MEDIUM impact, MEDIUM risk)

Current DD (`game/GameEngine.js`, referenced in `EnemySpawner.js:248`) caps spawn rate at 3.5× and only ramps when the player overperforms a baseline DPS target. It's too gentle for what Anubis wants.

**Proposal: replace DD with a "Heat" system.**

- Track `heat` 0-100, rises with kills-per-second, decays when the player takes damage or stands still.
- At heat 100, spawn rate is 2.5×, mob speed +15%, elite chance +20%, and screen edges glow red.
- Heat unlocks **score multiplier ramps** — heat 50+ = 1.2× score, heat 80+ = 1.5× score, heat 100 = 2×. Now there's a *score reason* to play aggressively, not just an avoidance reason.
- Dying or taking >25% HP in one hit knocks heat down 30 points. Real cost to overextending.

**This single system would satisfy 80% of Anubis's complaint** — the game would *visibly* reward shredding mobs and *visibly* punish passive piling. It also adds a new mastery axis (skilled players chase heat 100 the way speedrunners chase splits).

---

## 4. Anti-Goals (Things We Should NOT Do)

- ❌ **Don't make mobs into sponges.** Bullet-sponge HP scaling is the #1 mistake in this genre. Anubis is begging us not to.
- ❌ **Don't nerf shield bubble directly.** It's a legit defensive option; the problem is that shield + AFK is *optimal*, not that shield is *strong*. Fix the optimal-strategy problem, leave the tool alone.
- ❌ **Don't remove nukes.** They're fun. Just stop letting them BE the strategy.
- ❌ **Don't add a stamina/move-or-die mechanic.** Forced movement = forced micro-stress. Tier-1 free-to-play players will quit. Use pressure (spawn density, mob speed) instead.

---

## 5. Suggested S7 Patch Shape

If we ship all the LOW-RISK stuff at S7 rollover and save the big systems for mid-season:

### S7 Launch Patch (Week 1 of S7)
- ✅ End-of-run spawn taper REMOVED (sectors).
- ✅ Kill-velocity-driven spawn ramp (proposal 3a.c) — cap 3×.
- ✅ Mob speed +15% S1-S10.
- ✅ Mob HP +10% S1-S10.
- ✅ Nuke drop rate −33%.
- ✅ Remove `postNukeSpawnBoostUntil` 5s boost.

This is a tight ~1-day-of-work changelist. Each lever is independently revertible. Players feel an immediate "the screen is busier and I'm doing more shooting" shift.

### S7 Mid-Season Patch (Week 2-3)
- ⏳ Heat system replaces DD (proposal 3f).
- ⏳ Contact-pressure ramp on magnet-stuck mobs (proposal 3b).
- ⏳ Weapon evolution post-level damage scaling (proposal 3e — needs audit).

### S7 End-of-Season Audit
- 📊 Compare avg kills/run, avg nuke pickups/run, avg run duration, top-of-leaderboard build diversity vs. S6 baseline.
- 📊 If shield-bubble loadouts still dominate top 50, escalate to Phase 3 (nuke damage scaling on player DPS, proposal 3d.4).

---

## 6. Open Questions for the Owner

1. **How attached are we to nukes-as-pickups?** A bold S7 frame would be "nukes are now a Mastery-tree unlock you trigger manually with cooldown" instead of a random pickup. Bigger lift, much stronger agency story.
2. **Heat system score multiplier — yes or no?** It's the single most "shooter game" change in this doc, but it changes leaderboard math. Need to decide if S7 leaderboards reset (yes, they do at every season) makes this safe-ish.
3. **Do we want a new sector / boss / character to land at S7 launch alongside this?** Tuning patches alone don't generate hype; players need a *new thing to look at*. Worth pairing with even one new boss reskin or arena background swap so marketing has a hook.
4. **Anubis is one (excellent) data point.** Worth posting a Discord poll asking: "do you feel weapon levels matter as much as nukes?" Get 30+ responses before committing to the full Phase 1 list. If most players say "yeah weapons feel fine," dial down the aggression of the launch patch.

---

## 7. TL;DR

Anubis is right that the meta has drifted from "shooter" toward "pickup management." The fix isn't one big change — it's a coordinated nudge across spawn pacing, mob aggression, nuke prevalence, and reward curves so that **the answer to "what makes me kill faster?" is always "level my weapon," never "wait for a nuke."**

The cheapest, highest-signal S7 launch patch is:
> **More mobs, slightly tougher, much faster — and nukes are rarer and don't refill the field.**

Everything else (Heat system, weapon scaling, nuke redesign) builds on that foundation through the season.