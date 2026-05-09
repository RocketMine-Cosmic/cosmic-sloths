# S6 Staff Brief — Discord Post Pack

For your staff/mod channel. Each post under 2000 chars so it pastes as a single Discord message. Post in order — they reference each other.

> Do NOT paste these into public channels. Players get the public pack in `S6_PATCH_NOTES.md`.

---

## 📢 STAFF POST 1 — Schedule & What Resets

```
🛠️ **S6 STAFF BRIEF — READ BEFORE LAUNCH NIGHT**

🗓️ **Launch:** Mon May 18, 00:00 UTC
**Maintenance window:**
• Sun May 17, **23:00 UTC** — gate auto-flips to **SOFT** (yellow banner)
• Sun May 17, **23:40 UTC** — gate auto-flips to **HARD** (blocks /game)
• Mon May 18, **00:00 UTC** — period rolls W20→W21, S6 logic activates
• Mon May 18, **~00:10 UTC** — *human flips OFF after verifying*

**What resets ❌**
• Weekly + Seasonal leaderboards (normal)
• Endless leaderboard (NEW — was persistent in S5, now season-scoped)
• Weekly + seasonal upgrades + talents
• Squad Champions standings

**What stays ✅**
• All gold + relic fragments earned in S5
• Unlocked characters, cosmetics, weapons, mastery
• Permanent upgrades + talents + relics
• Squad XP, war record, rosters, treasury
• Daily/weekly bounty progress

⚠️ Heads-up: the Endless leaderboard reset is the only "extra" change vs. a normal seasonal rollover. Expect questions from long-time endless players.

📖 Full staff doc: `S6_STAFF_PATCH_NOTES.md`
📖 Public patch notes: `S6_PATCH_NOTES.md`
```

---

## 📢 STAFF POST 2 — What's Changing for Players

```
🎮 **WHAT PLAYERS WILL ASK ABOUT**

🏆 **New score formula**
• Gold no longer counts toward score
• Sector progression is the headline scorer (Sector 10 victory ≈ 1M peak)
• Endless is per-minute scoring (~10k/min cap)
• A clean Sector 10 victory now beats a 25-min farm run

🪙 **Gold caps GONE**
• 10k endless ceiling, 30-frag/run cap, "GOLD CAPPED" warnings — all removed
• Replaced with soft taper: endless gold drops decay 1.0× → 0.25× past 10 min
• Sector runs unaffected, always pay full

⚔️ **Weapon system overhaul**
• 6-weapon **slot cap** — once full, only level-ups for owned weapons
• Evolutions need **Lvl 8** base weapon (look for 🌟 EVOLVES badge)
• Rarity scales: Common +1 / Rare +2 / Epic +3 / **Legendary +5** levels
• "Overcharge" fillers replace the late-game +25 HP loop

⚖️ **Balance pass**
• Talent stack factor: 1.0× → 0.66× (only triple-max stacks affected)
• Cosmic difficulty: 3× gold/XP → 2× (still hardest mode)
• NFT perks now apply additively with talents

💎 **New gold sinks**
• **Astral Lab** — RNG pulls for permanent stat buffs (capped)
• **Prestige Relics** — L5 → PL5, +5%/tier (1.5M gold + 100 frags each)
• **Squad Treasury** — donate gold for weekly squad-wide buffs (Bronze 25k → Platinum 2M)

✨ **QoL**
• 7-step in-game tour on first /hub load after launch
• Free Pool Bias respec on Loadouts page (one-time)
• HUD score now matches credited score exactly
• Squad treasuries pre-seeded with 25k gold (= one Bronze activation)
```

---

## 📢 STAFF POST 3 — Launch Night Playbook

```
🚦 **LAUNCH NIGHT — WHAT YOU ACTUALLY NEED TO DO**

**Almost everything is automated.** Only 2 human actions needed.

**🤖 Runs automatically:**
• Sun 23:00 UTC → SOFT gate ON
• Sun 23:40 UTC → HARD gate ON
• Mon 00:00 UTC → S6 logic activates server-side

**👤 You do:**

**1️⃣ Any time before launch (recommended Sun May 17 evening)**
Admin Dashboard → Live Ops → 🔧 Maintenance → S6 Launch Tools
• Run **🪙 Seed Squad Treasuries** (amount = 25000)
• Tap "Run" twice to confirm
• Idempotent — squads with treasury already are skipped

**2️⃣ Mon May 18, ~00:10 UTC — Verify, then flip OFF**
• ⚡ Admins bypass the HARD gate automatically — you'll see a small "ADMIN BYPASS" pill instead of the block screen, /game stays playable
• Test run: Sector 1 → score should match new formula
• Test endless run → no "GOLD CAPPED" warnings
• Endless leaderboard tab → should be empty
• Admin Dashboard → 🔧 Maintenance → tap **✓ OFF** twice

**🚨 If something looks wrong:**
• You can flip the gate manually any time — manual override always wins
• If the auto-schedule misfires, just flip manually — same result
• Schedule can ONLY flip ON (never OFF) — by design, so a broken rollover stays locked until a human clears it

**📌 Permissions you need:**
• Base44 admin role (set via 👥 Managers tab)
• `manage_maintenance` permission (added by owner via Managers tab)
• Owners get everything automatically

⚠️ Get 2-3 trusted staff `manage_maintenance` so SOMEONE can flip OFF if the primary contact is unavailable.
```

---

## 📢 STAFF POST 4 — Support Scripts (Copy-Paste Replies)

```
💬 **PLAYER SUPPORT SCRIPTS — JUST COPY-PASTE**

**"My score is way lower than S5"**
> Season 6 reset the leaderboard with a new scoring system that rewards reaching deeper sectors and beating bosses, instead of just running long. Your gameplay didn't change — the formula did. A clean Sector 10 victory now scores ~900k.

**"Why won't my weapon evolve?"**
> S6 added an evolution requirement: the base weapon needs to reach **level 8** before evolution can trigger. Look for the orange 🌟 EVOLVES badge on the level-up screen.

**"I keep getting passives, no new weapons"**
> If you're carrying 6 weapons, the level-up pool only offers upgrades to weapons you already have — that's the new slot cap. To free up a slot, combine two weapons into a **synergy** (counts as one).

**"Where did my gold go?" / "Endless gold seems lower"**
> Gold isn't lost — nothing is wiped. Endless gold now decays gradually past 10 minutes instead of stopping at 10k. Short runs feel the same; long runs accumulate slower than before. The HUD now shows exactly what gets credited at the end.

**"My talents feel weaker"**
> Weekly + seasonal talents now scale at 0.66× when stacking on top of permanent talents. Permanent talents are unchanged. Solo or paired tier upgrades feel the same — only triple-max stacks are curbed.

**"My S5 leaderboard rank disappeared"**
> All leaderboards reset at the start of every new season — that's how seasonal play works. Your S5 final rank determined your S5 reward payout, which has already been distributed. S6 starts fresh for everyone.

**"Why did Endless reset? It never did before"**
> Endless used to persist across seasons but as of S6 it resets alongside the others. This makes Endless a fair seasonal competition instead of being permanently dominated by old runs. Your S5 endless score is still recorded — just doesn't count for S6.

**"I see a 'GOLD CAPPED' message"**
> Old browser cache — tell them to hard-refresh (Ctrl+Shift+R / Cmd+Shift+R). The warning code is gone in S6.

**"Where's the free respec?"**
> Loadouts page — green "Use Free Respec" button below your Pool Bias allocation. Refunds all spent points at no cost.
```

---

## 📢 STAFF POST 5 — Escalation Triggers & Tools

```
🚨 **WHEN TO PING ENGINEERING (#base44-internal)**

**Escalate immediately if you see:**
• Score formula posting > 2.5M for a single run (hard ceiling should prevent — if it happens, something's wrong)
• One character/build dominating top 10 for 3+ days running
• Player reports gold actually missing (not "lower" — verify with 🪙 Gold Audit first)
• Astral Lab returning impossible buffs (e.g. damage past +20% cap)
• Treasury donations not crediting to the squad pool
• In-game S6 tour not appearing for fresh players after launch
• AdminDashboard launch tools error out (paste the error verbatim)

**DON'T escalate (use the scripts in post 4):**
✅ "Score lower than S5"
✅ "Weapon won't evolve at Lvl 1"
✅ "Endless gold lower past 15 min"
✅ "Confused about new sinks"

---

🔧 **ADMIN TOOLS YOU'LL USE**

| Question | Tab |
|---|---|
| Did this player lose gold? | 🪙 Gold Audit (Player Operations) |
| What did this player buy? | 📋 Audit Log → filter by wallet |
| Is this run legit? | 🔍 Suspicious Runs (Moderation) |
| Player wants a refund | 💸 Refund Player (Finance) |
| NFT perks not applying | ✨ NFT Refresh (Player Operations) |
| Mute/unmute chat | 💬 Squad Chat (Moderation) |
| Find S5 high score | RunScore data still queryable by `season_id = 2026-S5` |

---

📌 **First 2 weeks post-launch we're monitoring closely for hotfixes.** Drop anything weird in #s6-feedback or here. Better to flag a false alarm than miss a real bug.

**TL;DR for launch night:**
1. Seed treasuries any time before Sun evening (one button, 25000g amount, two taps)
2. Watch the schedule auto-flip the gate at 23:00 / 23:40 UTC
3. After 00:10 UTC Monday — quick test runs, then flip OFF
4. Use the scripts in post 4 for player questions
5. Don't escalate the predictable stuff

🚀 Let's go.
```

---

*Post these in order. Pin posts 3 + 4 in the staff channel for the launch week.*