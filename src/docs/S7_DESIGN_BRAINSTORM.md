# Season 7 — Design Brainstorm

**Status:** EXPLORATION / NOT DECIDED. Owner reads, picks what to ship.
**Date:** 2026-06-07
**Trigger:** Anubis Discord feedback (screenshot 2026-06-07) — "this is a shooter, not a stand-around-and-collect-nukes game."

---

## 🔴 REVISION — 2026-06-07 (Owner Feedback)

Two facts the original draft got wrong:

1. **S11+ mobs are already HP sponges to every non-nuke weapon.** That means the "nukes are overshadowing weapons" framing is partly a *symptom*, not a root cause. In Outer Galaxy, nukes aren't preferred — they're often the *only* thing that clears. Section 3c is rewritten below: we should be **lowering** S11-S20 mob HP, not leaving it alone.

2. **Shield bubble / Aegis Matrix physically blocks enemies — and that's all it does.** No damage absorption, no mitigation buffer; the bubble is purely a wall. Mobs pile up at the perimeter because the geometry won't let them in. Section 3b (mob speed +15%) is therefore **mostly useless** as a standalone fix — a faster mob still hits the same wall. And the "absorb-not-block" redesign from an earlier draft doesn't work because there's no absorption mechanic to fall back on. The actual structural lever is changing *what blocking costs the player* — see the rewritten Section 3g.

The S7 Launch Patch list at the bottom is rewritten to reflect both. Treat the rest of the doc as still useful diagnostic context, but jump straight to Sections 3c/3g/5 for the actual S7 recommendation.

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

### 3b. Enemy movement speed (⚠️ DOWNGRADED — see revision callout)

**Original premise was wrong.** With Aegis Matrix / shield bubble active, mob speed doesn't matter — the bubble physically stops them at its perimeter. A 100-speed mob and a 200-speed mob both end up doing the same thing: queuing at the edge until a nuke clears them.

**Where speed still matters:**
- Pre-shield phase (level 1-5 before bubble is online).
- Builds that don't run a bubble (rare; almost no top loadout skips it).
- Sectors where a boss strips the bubble — but those are short windows.

**Revised proposal:** Skip the flat speed bump for S7. The real fix is Section 3g (shield bubble redesign). If we still want enemies to *feel* more menacing during the brief unshielded windows, a +10% Cosmic-only speed bump is fine, but expect it to be invisible to most players.

The "contact-pressure ramp" idea (stuck-mob speed burst) also fails for the same reason — mobs aren't *choosing* to stay outside the kill radius; the bubble is forcing them to.

### 3c. Mob HP (REWRITTEN — Outer Galaxy is the problem, not Inner)

The original draft missed the most important piece: **S11-S20 mobs are already HP sponges to every weapon except nukes.** That's a direct cause of the nuke meta — players aren't *choosing* nukes over weapons in Outer Galaxy, they're forced to it because beam/projectile DPS doesn't keep up with `OUTER_GALAXY_HP_MULT` values (S11 ≈ 13.5×, S20 ≈ 698.8× the baseline).

`game/EnemySpawner.js:13-21` shows the lookup. The progression was designed so each sector's Normal mobs are tougher than the previous sector's Cosmic — defensible on paper, but in practice it created a band where weapons can't compete and only nukes function.

**Revised proposal — two-part:**

**S1-S10 (Inner Galaxy):** +10% HP. Same as before. Lightest possible thumb. Inner Galaxy is where weapon-leveling feel lives; preserve it.

**S11-S20 (Outer Galaxy):** *Reduce* HP multipliers by 25-35%. New target curve:
```
S11 ≈ 10×   (was 13.55×)
S15 ≈ 50×   (was 78.17×)
S20 ≈ 450×  (was 698.79×)
```
Still a brutal curve. Still demands max evolved weapons + relic stack. But brings non-nuke weapons back into the conversation. Combined with the weapon-evolution scaling in Section 3e, top builds could *plausibly* clear S15-S20 without leaning on nukes.

This also lets us reduce nuke drop rate (Section 3d) without bricking Outer Galaxy progression — currently nukes are the safety valve compensating for the sponge curve.

**Risk:** Outer Galaxy completion rates spike → leaderboard tops cluster at the cap → less differentiation. Mitigation: pair with mob-density buff so finish-line scores still scale on kills, not just on "did you reach S20."

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

### 3g. Shield bubble / Aegis Matrix — the structural fix (NEW, HIGHEST impact)

This is the actual root cause of the AFK meta. Mobs pile up around the player because shield bubble / Aegis Matrix **physically blocks them from entering**. That's it — that's the entire mechanic. It's not a damage shield, it's a *wall*.

That means the "absorb damage but don't block" idea from the first revision doesn't work — there's no absorb function to fall back on. **If we take away the block, we take away the whole tool.** The redesign has to either change *when* it blocks, *how long* it blocks, or *what blocking costs* the player.

**Five options, gentlest to most aggressive:**

1. **Bubble has integrity HP — degrades from enemy contact.** Each frame an enemy is pressing on the bubble, it loses a small chunk of integrity. When integrity hits 0, the bubble collapses for X seconds before re-forming (or until re-cast). 1 enemy → lasts a long time. 30 enemies piled up → collapses in seconds. Self-balancing: small waves still get fortressed; the moment piles form, the wall fails. **This is the cleanest fix.** Preserves the shield as a real defensive tool, but the pile-and-wait strategy actively destroys it.

2. **Bubble has a duration timer + cooldown.** Active for N seconds (e.g., 6s), then dispelled for M seconds (e.g., 4s) before it can re-form. Player gets ~60% uptime. Forces a movement rhythm — players will learn to reposition during the down window. Simple, predictable, but feels more "ability cooldown" than "passive shield."

3. **Bubble shrinks while enemies are pressing on it.** Starts at full radius, shrinks proportional to contact pressure (e.g., −5u/sec per enemy in contact). When small enough, mobs reach the player. Re-expands when contact ends. Same self-balancing idea as Option 1 but visual instead of HP-based — players see the wall closing in on them.

4. **Bubble requires the player to be moving.** Active speed threshold (e.g., 50% of player max speed) — bubble drops the instant the player stands still, regains shortly after movement resumes. *Directly* anti-AFK: stand still and you lose your defense, full stop. Strongest design statement but most disruptive to existing playstyles.

5. **Bubble becomes a one-shot "burst" instead of a persistent field.** On activation, all enemies within radius are pushed back AND take damage; bubble then dissipates immediately and re-cools. Tactical "OH SHIT" button, not a fortress. Heaviest redesign — flag for S8 if Options 1-3 don't go far enough.

**Recommend Option 1 for S7 launch.** It preserves the shield's *identity* (a persistent zone of safety) while making the AFK strategy literally consume the shield. Solo player kiting a small wave? Bubble lasts forever. Player stacking 30 mobs to nuke? Bubble breaks in seconds and they take real risk. The mechanic teaches the right behavior on its own.

**Implementation audit needed:** the shield's blocking behavior lives somewhere in `EnemyAI.js` (collision against the player's shield state) and the bubble lifetime is in whatever spawned it (weapon system or character ability). Need to:
1. Find where the block is enforced.
2. Find where the bubble's existence is tracked.
3. Decide if integrity is a new field on the shield instance or a global player stat.

Worth a 1-hour read pass before committing to numbers. Don't ship blind.

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
- ❌ ~~**Don't nerf shield bubble directly.**~~ **REVISED:** the shield bubble *is* the structural problem (Section 3g). We don't nerf its raw radius or duration; we make the AFK strategy actively *consume* it (integrity that drains under contact pressure). Small waves → wall holds. Stacked piles → wall breaks. Self-correcting.
- ❌ **Don't remove nukes.** They're fun. Just stop letting them BE the strategy.
- ❌ **Don't add a stamina/move-or-die mechanic.** Forced movement = forced micro-stress. Tier-1 free-to-play players will quit. Use pressure (spawn density, mob speed) instead.

---

## 5. Suggested S7 Patch Shape

If we ship all the LOW-RISK stuff at S7 rollover and save the big systems for mid-season:

### S7 Launch Patch (Week 1 of S7) — REVISED

**Tier 1 — The actually-load-bearing changes:**
- ✅ **Shield bubble Option 1** (3g): bubble gains integrity HP, drains from enemy contact pressure, collapses + cooldowns when broken. Single highest-leverage change in the whole doc. AFK piling literally consumes the shield.
- ✅ **Outer Galaxy HP cut** (3c): S11-S20 HP multipliers reduced 25-35%. Brings weapons back into the conversation in the sponge band.
- ✅ **Nuke drop rate −33%** (3d.1). Now that the shield doesn't fortress and Outer Galaxy mobs aren't sponges, nukes can be rarer without bricking progression.

**Tier 2 — Pacing polish (cheap, complementary):**
- ✅ Remove end-of-run spawn taper (sectors only). Stops the final 30s from feeling empty.
- ✅ Kill-velocity spawn ramp (3a.c) — cap 3×. Heat-system precursor.
- ✅ Remove `postNukeSpawnBoostUntil` 5s boost. Stops nukes from refilling their own queue.
- ✅ +10% HP on S1-S10 mobs only. Anubis's "slight" bump for Inner Galaxy weapon-level feel.

**Skipped from original plan:**
- ❌ Mob speed +15% — useless without Tier-1 shield change. May add back as +10% Cosmic-only depending on playtest.

This is a 2-3 day changelist (3g needs an EnemyAI audit). Each lever still independently revertible. Tier 1 is non-negotiable for the design goal; Tier 2 is feel polish on top.

### S7 Mid-Season Patch (Week 2-3)
- ⏳ Heat system replaces DD (proposal 3f).
- ⏳ Weapon evolution post-level damage scaling (proposal 3e — needs audit).
- ⏳ If shield Option 1 leaves AFK builds still viable → escalate to Option 2 (duration timer + cooldown) or Option 4 (movement-required).

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

## 7. TL;DR (REVISED)

Anubis is right that the meta has drifted from "shooter" toward "pickup management." The original draft proposed treating that with spawn/speed/HP tuning, but two structural facts changed the analysis:

1. **The shield bubble is a physical wall, not just a damage shield.** Faster, denser, scarier mobs all hit the same perimeter and pile up. Tuning around it is whack-a-mole.
2. **S11-S20 mobs are already HP sponges to weapons.** Players aren't choosing nukes there — they're forced to them. "Reduce nuke reliance" without addressing the sponge curve just makes Outer Galaxy unplayable.

The cheapest, highest-signal S7 launch patch is:
> **Shield bubble gains integrity that drains under enemy contact pressure (AFK piling breaks the wall). Outer Galaxy mobs are 25-35% less spongy. Nukes are 33% rarer. The rest is pacing polish.**

That single trio — shield rework + Outer Galaxy HP cut + nuke rarity — collapses the "fortress + wait for nuke" loop directly. Everything else in this doc (Heat system, weapon scaling, kill-velocity spawn ramps) is foundation work that builds on top of those three changes through the season.