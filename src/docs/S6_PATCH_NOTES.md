# S6 Patch Notes — Discord Post Pack

Condensed to 5 posts. Each under 2,000 chars so it fits a single Discord message.

**Goes live:** Monday, May 25 • 00:00 UTC

> Staff: detailed engineering version is in `S6_STAFF_PATCH_NOTES.md`. Don't paste that one to public channels.

---

## 📢 POST 1 — Headline & Schedule

```
🌌 **SEASON 6 — May 25, 00:00 UTC**

S5 ends Sunday May 24, 23:59 UTC. Final S5 leaderboard rewards + Squad Champions payouts distribute as normal. S6 starts fresh.

🗓️ **Schedule**
S5 ends:    Sunday May 24, 23:59 UTC
S6 begins:  Monday May 25, 00:00 UTC

🛡️ **What resets**
• Leaderboard (S5 top-50 archived to Hall of Fame)
• Weekly + seasonal upgrades

🛡️ **What's kept**
• All gold + relic fragments earned in S5
• Unlocked characters, cosmetics, weapons, mastery
• Permanent upgrades, talents, relics
• Squad XP, war record, rosters, treasury
• Daily/weekly bounty progress

Normal seasonal rollover — nothing extra is being wiped. The first time you load /hub on May 25 a new in-game tour will walk you through the changes. Read the next 4 posts to get a head start.
```

---

## 📢 POST 2 — Score Formula & Gold Caps

```
⚖️ **NEW SCORE FORMULA**
Score now scales with sector depth and victory, not run length.
• Sector multiplier scales with depth (Sector 10 victory ≈ 1M peak)
• Sector victory bonus is the dominant scoring path
• Gold no longer counts toward score
• Endless score is time-capped (~10k per minute survived)

**Why:** Endless scaled linearly with time, so longer runs always beat shorter ones regardless of skill. New formula makes sector clears the highest-value path so leaderboard rank reflects skill, not session length.

🪙 **GOLD CAPS REMOVED**
• 10,000 gold endless ceiling — gone
• 30-fragment per-run cap — gone
• "GOLD CAPPED" HUD warning — gone

**Added:** endless gold tapers past 10 minutes so AFK-style runs can't mint unlimited gold. Sector runs unaffected.

**Why:** Hard caps were a blunt tool. Tapering replaces them so sector runs finally pay full value end-to-end, without surprise mid-run warnings.
```

---

## 📢 POST 3 — Balance & Weapon System

```
🔧 **BALANCE CHANGES**
• Talent stack factor reduced (0.66×) — only triple-max stacks affected
• NFT perks now apply additively with talents
• Cosmic difficulty gold/XP: 3× → 2× (enemy stats unchanged)
• Structural multiplier ceilings: damage 6×, gold 8×, area 4×, xp 5×, cooldown ≥ 0.35

⚔️ **WEAPON SYSTEM**
• 6-weapon slot cap — once full, level-up pool only offers upgrades to your existing weapons. Synergies (2→1) free up slots.
• Evolutions now require base weapon at **Level 8**. Watch for the 🌟 EVOLVES badge.
• Rarity actually matters now:
  - Common = +1 level
  - Rare = +2 levels
  - Epic = +3 levels
  - Legendary = +5 levels
• Pool autobalance — soft-corrects toward balanced loadouts when you're heavy on one side. Your manual Pool Bias still wins.
• "Overcharge" fillers replace the late-game +25 HP loop — once you've maxed all passives + weapons, you'll see rotating uncapped stat boosters instead of the same option forever.

**Why:** Maxed Aegis Matrix could cover 80% of the screen. Endless past 30 min was begging for new picks but only had +25 HP to offer. Slot cap matches the genre standard (VS, Brotato, Halls of Torment).
```

---

## 📢 POST 4 — New Sinks: Prestige, Mystery Forge, Treasury

```
💎 **PRESTIGE RELICS**
Once a relic hits Level 5, you can prestige it.
• 5 tiers (PL1 → PL5)
• Each tier: **1.5M gold + 100 relic fragments**
• +5% relic effect per tier (max +25% at PL5)

🌌 **ASTRAL LAB** *(replaces the Mystery Forge)*
A new endgame gold sink for whales sitting on millions. Each pull grants a **small permanent stat buff** at random:
• Damage / Area / Projectile Speed → +2% per pull (max +20%)
• Cooldown → -1% per pull (max -10%)
• Move Speed → +1% per pull (max +10%)
• HP Regen / Magnet Range / Max HP → flat bonus per pull

Cost: **20,000 gold for the first pull, +40% each subsequent pull** (20k → 28k → 39k → 55k → 77k → 108k…). After ~10 pulls you've capped roughly 1/3 of one stat. Fully maxing every stat costs **30M+ gold**.

Pure RNG which stat lands. Already-capped stats are skipped. Bonuses feed into your existing stat multipliers — so if you're already near a hard cap (e.g. damage 4.0×), additional damage pulls won't push you past it. Designed as a deep prestige curve for the highest-grinding players.

🏛️ **SQUAD TREASURY**
Members donate gold to a shared squad pool. Leaders/officers spend it on weekly buffs:
🥉 Bronze — 25k → +5% squad XP
🥈 Silver — 100k → +10% XP, +5% gold drops
🥇 Gold — 500k → +20% XP, +10% gold, +3% boss damage
💎 Platinum — 2M → +30% XP, +15% gold, +8% boss damage

Donations made in week N apply to week N+1's wars. Buffs reset weekly.

**Why these sinks:** Prestige is a long-term gold + fragment dump for L5-relic owners. Astral Lab targets whales specifically — the cost curve and per-stat caps mean only deep-endgame players engage with it, and bonuses don't bypass the existing stat ceilings. Treasury is a recurring sink that scales with squad size. None affect leaderboard balance directly.
```

---

## 📢 POST 5 — UX Polish & First-Login Tour

```
✨ **QUALITY OF LIFE**

🎓 **In-game S6 tour** — first time you load /hub after launch, a 7-step walkthrough explains the changes. Skip-able anytime.

🎁 **Free Pool Bias respec** — one-time gift on the Loadouts page so you can rebuild around the new weapon-rarity meta without paying.

🏛️ **Squad Treasuries pre-seeded** — every active squad gets +1000g on launch day so you can immediately try the Bronze buff (25k) instead of starting from zero.

🏆 **S5 Hall of Fame** — top 50 S5 runs archived permanently. Your S5 high score is preserved even though the leaderboard resets.

🔍 **HUD score mirror** — the live score in your run now matches exactly what the leaderboard credits. No more "wait, why did my score change?" moments.

📡 **Pool Bias indicator** — when you have bias allocated, the level-up screen shows a 🎯 POOL BIAS badge with your top 2 boosted targets. Reassures that your respec is actually working mid-run.

⚠️ **No more 'GOLD CAPPED' / 'KILLS CAPPED' warnings** — the underlying caps are gone. What you see is what you get.
```

---

Feedback in `#s6-feedback` after launch — first 2 weeks we're monitoring closely for hotfixes.