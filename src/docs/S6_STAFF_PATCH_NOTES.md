# Season 6 — Staff Brief

**For:** Discord moderators & in-game staff with AdminDashboard access
**Launch:** Mon May 25 2026 • 00:00 UTC
**Last updated:** 2026-05-09

> Use this to answer player questions and run the launch-day tools. Public-facing patch notes are in `S6_PATCH_NOTES.md`.

---

## 1. What's actually changing (player-visible)

### 🏆 New score formula
- Gold no longer counts toward score
- Sector progression is now the headline scorer (Sector 10 victory ≈ 1M peak)
- Endless score is time-capped per-minute (~10k/min) so long runs can't dominate
- A **Sector 10 victory now beats a 25-min farm run** — skill > grind

### 🪙 Gold caps gone
- The 10k endless gold ceiling, 30-fragment per-run cap, and "GOLD CAPPED" warnings are all removed
- Replaced with a soft taper: endless gold drops decay 1.0× → 0.25× past 10 minutes
- Sector runs unaffected — they always pay full value

### ⚔️ Weapon system
- **6-weapon slot cap** — once full, only level-ups for owned weapons appear. Synergies free up slots.
- **Evolutions need Lvl 8** — base weapon must reach level 8 before evolving. The 🌟 EVOLVES badge appears when ready.
- **Rarity actually matters** — Common +1 / Rare +2 / Epic +3 / **Legendary +5** levels per pick
- **Overcharge fillers** — once you've maxed everything, the pool offers rotating uncapped stat boosters instead of repeating +25 HP forever

### ⚖️ Balance pass
- Talent stack factor reduced 1.0× → 0.66× on weekly/seasonal (permanent unchanged)
- Cosmic difficulty: 3× gold/XP → 2× (enemy stats unchanged — still hardest mode)
- NFT gold perks now stack additively instead of multiplicatively

### 💎 New gold sinks
- **Astral Lab** — RNG gold pulls for permanent stat buffs (capped per stat)
- **Prestige Relics** — once a relic hits L5, prestige PL1→PL5 for +5% per tier (max +25%). Costs 1.5M gold + 100 fragments per tier.
- **Squad Treasury** — donate gold to your squad pool, leaders activate weekly buffs (Bronze 25k → Platinum 2M)

### ✨ Quality of life
- 7-step in-game tour on first /hub load after launch
- Free Pool Bias respec on the Loadouts page (one-time)
- Pool Bias badge in level-up screen (shows your top 2 boosted targets)
- HUD live score now matches what gets credited at run end
- S5 top-50 archived to permanent Hall of Fame

---

## 2. What stays / what resets

| Stays ✅ | Resets ❌ |
|---|---|
| All gold + relic fragments earned in S5 | Leaderboard (top-50 archived) |
| Unlocked characters, cosmetics, mastery | Weekly upgrades + talents |
| Permanent upgrades + talents + relics | Seasonal upgrades + talents |
| Squad XP, war record, rosters, treasury | Squad Champions standings |
| Daily/weekly bounty progress | |

**Nothing extra is being wiped.** This is a normal seasonal rollover.

---

## 3. Launch-day playbook (run these in AdminDashboard)

### Sun May 24, 23:00 UTC — Soft maintenance
**Admin Dashboard → Live Ops → 🔧 Maintenance**
- Tap **⚠️ SOFT** twice to confirm
- Use the SOFT preset message ("Season 6 rolls out in ~1 hour…")

### Sun May 24, 23:30 UTC — Run the two launch tools
**Admin Dashboard → Live Ops → 🔧 Maintenance → S6 Launch Tools**

1. **🏆 Snapshot Season Hall of Fame**
   - Confirm `seasonId` is `2026-S5`
   - Tap "Run" twice to confirm
   - Should show "Archived 50 runs for 2026-S5. Top: [name] ([score])"
   - **Idempotent** — safe to re-run if you mistype

2. **🪙 Seed Squad Treasuries**
   - Confirm amount is `1000`
   - Tap "Run" twice to confirm
   - Shows "Seeded N squads (M skipped, already had treasury)"
   - **Idempotent** — squads with existing treasury are skipped automatically

### Sun May 24, 23:40 UTC — Hard maintenance
- Tap **🔒 HARD** twice
- Use HARD preset ("Season 6 rollover in progress…")
- This blocks `/game` only — squads, chat, profile still accessible

### Mon May 25, 00:00 UTC — Period auto-flips
- Nothing for you to do — the W20→W21 boundary triggers all S6 logic automatically

### Mon May 25, ~00:10 UTC — Verify, then OFF
- Try a quick Sector 1 run on a test wallet — score should match new formula
- Try entering an endless run — should see no "GOLD CAPPED" warnings
- Tap **✓ OFF** twice in Maintenance to re-open the game

---

## 4. Support scripts (copy-paste)

### "My score is way lower than S5"
> Season 6 reset the leaderboard with a new scoring system that rewards reaching deeper sectors and beating bosses, instead of just running long. Your gameplay didn't change — the formula did. A clean Sector 10 victory now scores ~900k. Your S5 high score is preserved permanently in the Hall of Fame.

### "Why won't my weapon evolve?"
> Season 6 added an evolution requirement: the base weapon needs to reach **level 8** before the evolution can trigger. Look for the orange 🌟 EVOLVES badge on the level-up screen — that means picking it now will trigger the evolution.

### "I keep getting offered passives, no new weapons"
> If you're carrying 6 weapons, the level-up pool only offers upgrades to weapons you already have. That's the new slot cap. To free up a slot: combine two weapons into a **synergy** (which counts as one weapon).

### "Where did my gold go?" / "Endless gold seems lower"
> Gold isn't lost — nothing is wiped. Endless gold now decays gradually past 10 minutes instead of stopping at the old 10,000 cap. Short endless runs feel about the same; long runs accumulate slower than before. The HUD now shows exactly what gets credited at the end.

### "My talents feel weaker"
> Weekly and seasonal talents now scale at 0.66× when stacking on top of permanent talents. Permanent talents are unchanged. This was a balance pass to flatten extreme triple-stacking — solo or paired tier upgrades feel the same, only the triple-max stack is curbed.

### "What about my S5 leaderboard rank?"
> Top 50 S5 runs are permanently archived in the Hall of Fame. The S6 leaderboard starts fresh.

### "What's the Astral Lab?"
> A new gold-only RNG sink for endgame players. Each pull costs gold (starts at 20k, increases each pull) and grants a small permanent stat buff at random. Each stat caps eventually so it can't infinitely scale. It's designed as a deep prestige curve — completing it costs 30M+ gold.

### "How does the Squad Treasury work?"
> Members donate gold to a shared squad pool. Leaders/officers spend it to activate weekly buffs (Bronze 25k → Platinum 2M). Donations made this week apply to next week's wars. Buffs reset weekly. We pre-seeded every squad with 1000g at launch so you can immediately try Bronze.

### "Where's the free respec?"
> One-time gift on the Loadouts page — a green "Use Free Respec" button appears below your Pool Bias allocation. It refunds all your spent points at no cost so you can rebuild around the new weapon-rarity meta.

---

## 5. What to escalate to engineering

Ping engineering (#base44-internal) if you see:

- 🚨 **Score formula posting > 2.5M** for a single run — hard ceiling should prevent this; if it happens, something's wrong
- 🚨 **One character/build dominating top 10** for 3+ days running (e.g. 7+ NeonVortex runs out of 10)
- 🚨 **Player reports gold disappeared** (not "lower" — actually missing). Use Admin → 🪙 Gold Audit to verify before escalating.
- 🚨 **Astral Lab returning impossible buffs** (e.g. damage past +20% cap)
- 🚨 **Treasury donations not crediting** to the squad pool
- 🚨 **In-game S6 tour not appearing** for fresh players after launch
- 🚨 **AdminDashboard launch tools error out** — copy the error message verbatim

Don't escalate:
- ✅ Score "lower than S5" complaints (use script above)
- ✅ Weapon won't evolve at Lvl 1 (it's the new gate)
- ✅ Endless gold lower past 15 min (it's the new decay)
- ✅ Confused about new sinks (use scripts above)

---

## 6. Common AdminDashboard tools you'll need

| Question | Where to look |
|---|---|
| "Did this player actually lose gold?" | 🪙 Gold Audit (Player Operations) |
| "What did this player buy?" | 📋 Audit Log → filter by wallet |
| "Is this run legit?" | 🔍 Suspicious Runs (Moderation) |
| "Player wants a refund" | 💸 Refund Player (Finance) |
| "Their NFT perks aren't applying" | ✨ NFT Refresh (Player Operations) |
| "Mute / unmute player chat" | 💬 Squad Chat (Moderation) |
| "Where's their S5 high score?" | Leaderboard → filter season `2026-S5` (still queryable, just not on default view) |

---

## 7. Quick FAQ

**Q: Do I need to do anything at midnight UTC?**
A: No. Period rollover is automatic. Just verify after with a test run and flip Maintenance OFF.

**Q: Can I re-run the snapshot tool if I make a mistake?**
A: Yes — both launch tools are idempotent. Snapshot replaces existing rows for that season; Treasury seed skips squads that already have a balance.

**Q: What if a player asks about prestige relics during the SOFT maintenance window?**
A: Prestige is live at S6 launch (May 25 00:00 UTC). Tell them it'll be available right after the rollover.

**Q: A player insists their S5 score should still be on the board.**
A: It's archived to Hall of Fame, not deleted. Direct them to that page when it goes live (or check `LegendaryRun` in the admin viewer for now).

**Q: I see a "GOLD CAPPED" message in a player's screenshot.**
A: They're on an old browser cache. Tell them to hard-refresh (Ctrl+Shift+R / Cmd+Shift+R). The warning code is gone in S6.

---

*Questions about anything in this doc? Ask in #base44-internal before launch — not at 23:55 UTC.*