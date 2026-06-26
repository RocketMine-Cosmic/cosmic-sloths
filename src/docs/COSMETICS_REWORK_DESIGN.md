# Cosmetics Rework — Master Design Doc

**Status:** Design phase. No code written yet.
**Owner:** Cosmic Sloths dev team
**Date:** 2026-06-26
**Scope confirmed (06-26):**
1. **Full rework of every existing cosmetic** — pilot icons, weapon trails, kill effects, character skins, titles flair, jukebox tracks.
2. **ONE unified Wardrobe page for ALL cosmetics** — old standard cosmetics + new chest cosmetics live in the same place. The Cosmic Armoury's cosmetic tabs are retired; cosmetics leave the Armoury entirely.
3. **Old cosmetics become GMT-only "Support the Devs" tier** — purchase buttons disabled in the meantime, labelled "Coming soon". At GMT launch they reactivate, paid in GMT only (no gold, no OMENX). Framed as a donation tier — small permanent vanity rewards for backing the devs. Already-owned standard cosmetics behave exactly as today: equip, unequip, swap between owned ones, preview.
4. **Standard cosmetic catalogue expands** — since GMT support cosmetics are a recurring revenue stream, the standard pool grows so backers always have something new to pick up. Target ~2× the current catalogue size at GMT launch (see Section A).
5. **Preview works for every cosmetic** — owned, locked, and disabled-to-purchase alike. Click any tile → live in-canvas preview (reuses `CosmeticPreview` for trails/kill FX; new preview components for icons/frames/flair).
6. **Two visual identities — Epic vs Mythic.** Epics share one elevated baseline style; Mythics get a distinct, "this person spent" elevated look. (GMT support cosmetics sit *below* Epic — they're the "thanks for the donation" floor.)

---

## What we have today (audit)

Pulled from the live codebase so the rework plan covers everything that's actually shipped.

### Cosmetic systems already in production

| System | Where it lives | Storage on save | Render path |
|---|---|---|---|
| **Pilot Icons** | `EmojiPicker` — 20 emoji + URL upload | `user.data.pilot_icon` (emoji char OR URL) | `<img>` if URL, else emoji char. Shown on Profile, LB rows, squad chat, end-of-run modal. |
| **Squad Icons** | `EmojiPicker` — 20 emoji + URL upload | `Squad.icon` | Same dual-render path as pilot icons. |
| **Weapon Trails** | Cosmic Armoury (Upgrades page) — gold-cost tiers 3k/10k/20k/30k | `save.cosmetics.trail`, owned in `save.unlockedCosmetics[]` | `ParticleManager.createTrail(trailId, …)` — in-game during runs. |
| **Kill Effects** | Cosmic Armoury — gold tiers 3k/12k/25k | `save.cosmetics.killEffect`, `save.unlockedKillEffects[]` | `ParticleManager.createKillEffect(id)` — fires on enemy death. |
| **Character Skins** | Cosmic Armoury — gold tiers 5k/20k, per-character | `save.cosmetics.skins[charId]`, `save.unlockedSkins[]` | Sprite swap on the character renderer. |
| **Titles** | Star Callsigns page (`/titles`, slide 15) — 60+ titles, 7 tiers (Starter→Mythic) | `user.data.player_title` | Coloured badge — flat text only. Tier badges use Tailwind class sets from `TITLE_TIERS`. Most also confer small buffs (set in `playerTitles.js`). |
| **Jukebox Tracks** | Stellar Jukebox page (slide 14) | `save.musicTrack` | Audio playback only — no visual element. |

### Cosmetic systems referenced in the chest doc but NOT YET built

These are the "spectacular" categories the VIP Chest doc promises but that don't exist in code today:

- **Animated Pilot Icons** (frame-looping image instead of static emoji) — Epic
- **Leaderboard Banner Frames** (animated border around LB row) — Epic / Mythic
- **Title Flair / Gradients** (animated text effects on equipped titles) — Epic
- **Weapon Trail Renders** (chest-tier variants on top of the existing trail system) — Mythic
- **Kill Effect Renders** (chest-tier variants on top of the existing kill effect system) — Mythic
- **Squad Meteor Strike FX** (custom render in the squad activity feed) — Mythic
- **Custom Title** (player-submitted, mod-approved) — Mythic, Elite-chest-only

So the rework expands the cosmetic surface area roughly 2×.

---

## Visual identity — Epic vs Mythic split

### Epic line — "Cosmic Veteran"

The standard chest cosmetic look. Feels premium but not overwhelming. Used for the 60–70% of chest cosmetic rolls that land on Epic.

- **Palette:** Deep space blues + cyans, cool purples. Limited gold accents only on edges.
- **Motion:** Subtle. Slow rotations, gentle glows, soft particle drift. Nothing that strobes.
- **Silhouette:** Recognisable as a cohesive set — every Epic shares the same edge treatment (a thin gradient border with a soft cyan inner glow).
- **Animation budget:** ≤ 6 frames per loop. Loops at 1–2 fps so it never distracts from gameplay.
- **Reads as:** "I have chest cosmetics." Other players see it and know you're a chest opener, not the difference between a Bronze and an Elite.

### Mythic line — "Ascendant"

Reserved for the top ~15% of cosmetic rolls. Visibly elevated. Players should screenshot these.

- **Palette:** Gold + obsidian + deep crimson. Saturated. High contrast against the cosmic blue backdrop of the game.
- **Motion:** Bold. Heavy parallax, lens flare, golden particle trails, animated runes. Reads even at small sizes on mobile.
- **Silhouette:** Ornate filigree edges, double-stroke borders, occasional embedded "rare artifact" iconography (constellations, broken halos, eclipse glyphs).
- **Animation budget:** 8–16 frames, 8–12 fps loop. More elaborate but still cheap to render.
- **Reads as:** "I opened a Legend or Elite chest." High flex value. Chase tier.

### Why a split rather than one unified style?

1. The chest doc EV math depends on rarity feeling earned. If a Mythic looks identical-but-shinier to an Epic, the Elite chest's appeal collapses.
2. The Epic line needs to feel cohesive across 13 launch cosmetics; the Mythic line needs to feel one-of-one even though there are 7.
3. Different palettes mean we can re-use the Epic style across seasons (it's the baseline chest look) while rotating Mythic seasons (gold→silver→void→solar themes per season).

---

## Full cosmetic catalogue — design specs

### A. Standard cosmetics — the GMT "Support the Devs" tier

These are the existing Armoury cosmetics, **repositioned** as a small-donation vanity tier paid in GMT at GMT launch. Until then, purchase buttons stay disabled with "Coming soon".

**Positioning:** below Epic. Visually clean and pleasant but never elevated. The pitch is "throw the devs a few GMT, get a permanent unlock you can swap to whenever". The catalogue intentionally has *many* small items so a regular backer always has something fresh to grab.

**SKU strategy:**
- Existing SKU IDs in `lib/skuMap.js` and existing save schema (`save.cosmetics.*`, `save.unlockedCosmetics[]`, etc.) stay 100% intact. Already-owned cosmetics keep working.
- New SKU IDs added for GMT pricing — gold/OMENX rows in `skuMap.js` go untouched, a parallel GMT row is added per cosmetic.
- The existing gold tier label (Basic/Advanced/Epic/Legendary) stays as a *visual rarity* indicator inside the GMT tier — it no longer maps to a gold cost.

#### A.1 — Existing catalogue (kept as-is, repriced for GMT)

| ID | Category | Visual tier | Visual direction |
|---|---|---|---|
| `pilot_icon_*` (20 emoji) | Pilot Icon | Free | Keep emoji. No rework — emoji is the right "default" floor. |
| `trail_basic_*` (5 variants) | Weapon Trail | Basic | Solid colour, low particle density. Clean. |
| `trail_advanced_*` (5) | Weapon Trail | Advanced | Two-colour gradient, mild glow. |
| `trail_epic_*` (5) | Weapon Trail | Epic-look | Animated colour shift, particle puffs. |
| `trail_legendary_*` (5) | Weapon Trail | Legendary-look | Beam-style with sparks. |
| `kill_basic_*` (5) | Kill Effect | Basic | Single-colour burst. |
| `kill_advanced_*` (5) | Kill Effect | Advanced | Multi-particle ring burst. |
| `kill_epic_*` (5) | Kill Effect | Epic-look | Themed shapes (coin burst, shard burst). |
| `skin_basic_*` (per char, 10 chars) | Character Skin | Basic | Re-colour of base sprite. |
| `skin_advanced_*` (per char, 10 chars) | Character Skin | Advanced | Outfit / armour swap. |

#### A.2 — Expansion catalogue (NEW, ships at GMT launch)

Roughly doubles the standard pool so backers always have unbought options. Reuses the existing render systems — **no new render code**, just more configs.

| New IDs | Category | Visual tier | Count | Visual direction |
|---|---|---|---|---|
| `trail_basic_v2_*` | Weapon Trail | Basic | 5 | Alt colour palettes — pastel, monochrome, neon. |
| `trail_advanced_v2_*` | Weapon Trail | Advanced | 5 | New two-tone gradients (sunset, aurora, ocean, magma, frost). |
| `trail_epic_v2_*` | Weapon Trail | Epic-look | 5 | Themed (autumn leaves, snowflakes, embers, bubbles, petals). |
| `trail_legendary_v2_*` | Weapon Trail | Legendary-look | 5 | Beam-style with new spark palettes (electric, ghostly, holy, void, prism). |
| `kill_basic_v2_*` | Kill Effect | Basic | 5 | Alt-colour single bursts. |
| `kill_advanced_v2_*` | Kill Effect | Advanced | 5 | New ring patterns (heart-ring, star-ring, square-burst, double-ring, slowmo-puff). |
| `kill_epic_v2_*` | Kill Effect | Epic-look | 5 | Themed (snowflake burst, leaf burst, bubble pop, music notes, hearts). |
| `skin_v3_*` (per char) | Character Skin | Advanced | 10 | Third skin per character — alt outfit (winter / summer / festival / void / militia variants). |
| `pilot_icon_pack2_*` | Pilot Icon | Free addition | 20 | 20 new static emoji/icon options added to the picker. |

**Totals:**
- Existing: 70 paid items + 20 free pilot icons.
- Expansion: 45 paid items + 20 free pilot icons.
- **GMT-launch catalogue: 115 paid standard cosmetics + 40 free pilot icons.**

**Why ~2×, not more?**
- Each "v2" variant only needs a particle config / colour palette, not new render code. Cheap to ship.
- 115 paid items lets a heavy backer buy one cosmetic per week for ~2 years before running out — enough headroom that catalogue exhaustion isn't a near-term risk.
- New skins per character (10× v3) are the most expensive expansion item but also the highest-flex. Keep the count tight (one per char) — quality over quantity.

**No SKU code changes required for A.1** — `getCosmeticSku(type, name, goldCost)` already keys off the rarity tier. **A.2 needs new SKU IDs added** to `skuMap.js` alongside the existing ones.

### B. New Chest cosmetics — Epic line (13 launch items)

Lives on a **new dedicated page** (see Page Structure section below). NOT for sale in the Armoury — chest-only.

| # | ID | Category | Visible where | Description |
|---|---|---|---|---|
| 1 | `animated_pilot_orbiting_moon` | Animated Pilot Icon | LB row, squad chat, end-of-run | A small moon orbits a planet. 6-frame loop. |
| 2 | `animated_pilot_glitch_skull` | Animated Pilot Icon | Same | Cyan skull with intermittent RGB-split glitch. |
| 3 | `animated_pilot_pulsing_heart` | Animated Pilot Icon | Same | Pixel heart pulsing in cyan + soft white halo. |
| 4 | `animated_pilot_rotating_blackhole` | Animated Pilot Icon | Same | Slow-spin black hole with accretion disc. |
| 5 | `animated_pilot_cosmic_egg` | Animated Pilot Icon | Same | Egg with a soft cyan glow that pulses. |
| 6 | `lb_frame_gold_filigree` | LB Banner Frame | Weekly LB row | Thin gold filigree border + soft cyan inner glow. |
| 7 | `lb_frame_electric_arc` | LB Banner Frame | Same | Animated electric arcs travelling around the border. |
| 8 | `lb_frame_nebula_swirl` | LB Banner Frame | Same | Subtle nebula gradient that drifts. |
| 9 | `title_style_rainbow_shimmer` | Title Flair | Wherever title renders | Hue-shift gradient across the title text. |
| 10 | `title_style_blue_flame` | Title Flair | Same | Blue-flame outline that flickers. |
| 11 | `title_style_gold_leaf` | Title Flair | Same | Static gold-leaf gradient, no animation. |
| 12 | `lb_frame_glitch_rgb` | LB Banner Frame | Same | RGB-split border that pulses. |
| 13 | `animated_pilot_starfield` | Animated Pilot Icon | Same | Twinkling starfield inside a circular mask. |

### C. New Chest cosmetics — Mythic line (7 launch items)

| # | ID | Category | Visible where | Description |
|---|---|---|---|---|
| 14 | `weapon_trail_void` | Weapon Trail (Mythic) | In-run projectiles | Deep violet trail with golden particle sparks. |
| 15 | `weapon_trail_solar` | Weapon Trail (Mythic) | Same | Solar-flare orange with white-hot core. |
| 16 | `weapon_trail_eclipse` | Weapon Trail (Mythic) | Same | Black trail with bright ring-shaped highlights. |
| 17 | `kill_fx_coin_burst` | Kill Effect (Mythic) | On every kill | Gold coin shower with screen-shake-free particle pop. |
| 18 | `kill_fx_supernova` | Kill Effect (Mythic) | Same | Bright white expansion ring + golden shards. |
| 19 | `meteor_fx_gold_lightning` | Meteor Strike FX (Mythic) | Squad activity feed line for your strikes | Animated gold lightning bolt on the line. |
| 20 | `lb_frame_eclipse_crown` | LB Banner Frame (Mythic) | Weekly LB row | Ornate eclipse crown — Elite-chest-only. |

### D. Mythic + custom (Elite chest only)

- `custom_title_pending` — player-submitted text. Admin approval workflow. **Not generated, not in the visual catalogue.** Separate moderation system (extends existing `AdminSquadChatModeration`).

---

## Page structure

### New page: **Wardrobe** (`/wardrobe`) — unified home for ALL cosmetics

One standalone page that owns every cosmetic in the game. Replaces the Cosmetic tabs in the Cosmic Armoury. Added as a new carousel slide (between Profile and Jukebox).

**Categories (tabs):**
1. Pilot Icon (emoji + uploaded URL + animated chest icons)
2. Character Skin (per-character skins — Armoury-style grid keyed by selected char)
3. Weapon Trail (standard tiers + Mythic chest variants)
4. Kill Effect (standard tiers + Mythic chest variants)
5. LB Banner Frame (chest-only)
6. Title Flair (chest-only)
7. Meteor Strike FX (chest-only)

**Source filter (independent of category tabs):**
- All
- Owned
- Standard (Armoury-tier — disabled to purchase)
- Chest (Epic + Mythic)
- Locked

**Layout:**

```
┌─ Wardrobe ────────────────────────────────────────────────────┐
│  [← Back]                                  [Currency Header]   │
│                                                                │
│  ┌─ Category tabs ───────────────────────────────────────┐    │
│  │ Pilot Icon │ Skin │ Trail │ Kill FX │ Frame │ Flair │ … │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                │
│  ┌─ Source filter ─────────────────────────────────────┐      │
│  │ All │ Owned │ Standard │ Chest │ Locked              │      │
│  └─────────────────────────────────────────────────────┘      │
│                                                                │
│  ┌── Cosmetic grid (responsive 2-4 cols) ─────────────┐       │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐             │       │
│  │  │ thumb   │  │ thumb   │  │ thumb   │  …          │       │
│  │  │ Epic    │  │ Standard│  │ Mythic  │             │       │
│  │  │[Equipped]│ │[Preview]│  │[Preview]│             │       │
│  │  │         │  │ "GMT    │  │ "Chest  │             │       │
│  │  │         │  │ soon"   │  │ only"   │             │       │
│  │  └─────────┘  └─────────┘  └─────────┘             │       │
│  └────────────────────────────────────────────────────┘       │
│                                                                │
│  Click any tile → opens live preview modal                    │
│   (canvas / sprite / CSS demo, depending on category)         │
└────────────────────────────────────────────────────────────────┘
```

**Purchase states for each tile:**
| State | When | Button |
|---|---|---|
| Owned + equipped | already owned, currently equipped | "Equipped" (tap again to unequip if category allows) |
| Owned + unequipped | already owned | "Equip" |
| Standard (not owned, pre-GMT) | Armoury cosmetic, GMT not yet live | Disabled — "Coming soon" |
| Standard (not owned, post-GMT) | Armoury cosmetic, GMT live | "Support the Devs — {price} GMT" |
| Chest (not owned) | Epic/Mythic chest reward | Disabled — "Drops from {chest tier}+ chests" |

**Preview always works** regardless of state. Click the tile (not the button) to open the preview modal.

### Cosmic Armoury → Upgrades only

The Armoury page keeps stat / weapon / talent upgrades. **Its cosmetic tabs (Trails / Kill Effects / Skins) get removed** — those cosmetics relocate to the Wardrobe with purchase disabled.

### Profile page

Add an "Equipped Cosmetics" section showing current chest cosmetic selections + a "Manage in Wardrobe →" link. Existing pilot-icon edit flow stays.

### Star Callsigns (titles page)

When a player equips a title with a `title_style_id` set on their profile, the title renders with that flair. The page itself stays unchanged — flair is a separate purchase from the title.

---

## Save schema additions

Adds to `PlayerSave.save_data.profile`:

```js
{
  // existing fields stay
  pilot_icon: '🦥' | '<url>',          // unchanged
  player_title: 'Eternal Sovereign',   // unchanged

  // NEW chest cosmetic equip slots (null when nothing equipped)
  equipped_animated_icon: null,        // 'animated_pilot_orbiting_moon'
  equipped_lb_frame: null,             // 'lb_frame_gold_filigree'
  equipped_title_style: null,          // 'title_style_blue_flame'
  equipped_weapon_trail_mythic: null,  // 'weapon_trail_void' — overrides standard trail when set
  equipped_kill_fx_mythic: null,       // 'kill_fx_coin_burst' — overrides standard kill fx
  equipped_meteor_fx: null,            // 'meteor_fx_gold_lightning'
}
```

Adds top-level on `save_data`:

```js
{
  owned_chest_cosmetics: [],   // ['animated_pilot_orbiting_moon', 'lb_frame_gold_filigree', …]
}
```

A single array keyed by cosmetic id covers all categories. The category is decoded from the id prefix at render time — keeps the schema flat and easy to grant from the chest webhook.

---

## Asset production plan

Generation happens via `functions/generateCosmeticAsset` (already built + tested 2026-06-26). Admin-only.

| Category | Model | Output | Render strategy |
|---|---|---|---|
| Animated Pilot Icon | FLUX.1-schnell, 256×256 | 6 PNG frames | CSS `steps(6)` sprite sheet, 1.5s loop |
| LB Banner Frame | FLUX.1-dev, 1024×96 | Single PNG | CSS `mask-image` for the inner cutout + CSS animation for arcs/glitch |
| Title Flair | (none — code-only) | n/a | Pure CSS — gradient / glow / text-stroke |
| Weapon Trail Mythic | (none — code-only) | n/a | `ParticleManager` extension with colour palettes per id |
| Kill Effect Mythic | (none — code-only) | n/a | Same — particle config per id |
| Meteor FX | FLUX.1-schnell, 256×128 | Single PNG | Used as an `<img>` overlay on the meteor activity feed line |
| Custom Title | n/a | text | Pure CSS gold-leaf style |

**Why mix art and code-only:**
- Code-only categories (title flair, trails, kill fx) compose existing systems we already have. Code is the cheapest path and renders crisply at any zoom.
- Image categories are where AI excels — ornate borders and animated icons are 10× the work to draw in code.

---

## What changes vs. the chest doc

Where this design supersedes `VIP_CHEST_GAME_ITEMS.md` § Cosmetics Overhaul:

- The chest doc proposed 5 new categories. This doc adds **6** (it splits weapon trail / kill FX into "standard" and "mythic-only" so the Armoury rework stays distinct).
- The chest doc had 20 cosmetics in a single pool. This doc has **20 total** but **13 Epic + 7 Mythic**, matching the weight tables in the chest doc's per-tier roll percentages.
- The chest doc placed cosmetic wardrobe on the Profile page. This doc moves it to a **dedicated `/wardrobe` page** based on the 06-26 decision.
- The chest doc didn't address reworking the existing Armoury. This doc covers it.

---

## Implementation phases (not for now — design only)

Reference plan for once design is signed off. Do not start any of this until the design is approved.

1. **Phase 1 — Asset generation.** Run the cosmetic studio against the 20-item Epic/Mythic catalogue + the Armoury rework list. Saves URLs to a `CosmeticAsset` entity.
2. **Phase 2 — Save schema + Wardrobe page.** Add the new profile fields, build `pages/Wardrobe.jsx`, add to App.jsx routes + carousel.
3. **Phase 3 — Render integration.** LB row frame, title flair CSS, animated pilot icon sprite renderer, ParticleManager mythic variants, meteor strike feed render.
4. **Phase 4 — Webhook integration.** `onVipChestRewardGranted` writes cosmetic grants to `owned_chest_cosmetics`. (Tracked separately in `VIP_CHEST_GAME_ITEMS.md`.)
5. **Phase 5 — Armoury art swap.** Replace the standard cosmetic art with the reworked set. Code unchanged — only URLs swap.
6. **Phase 6 — Custom title moderation.** Admin queue for Elite-chest custom titles.

---

## Resolved design decisions

All seven open questions answered 2026-06-26. Locked in for build phase:

1. **Animated pilot icons on leaderboard** — ✅ no perf concern. LB is hard-capped at 20 rows (`payoutCfg.top_n` default 20 + `KILL_BOARD_LIMIT = 20`). Animate freely, no top-10 fallback.
2. **GMT migration timeline** — TBD. Until then, standard cosmetic purchase buttons stay disabled with label **"Coming soon"**. No teaser pricing. At GMT launch the standard pool reactivates as the "Support the Devs" donation tier (see Section A).
3. **Already-owned standard cosmetics during disable window** — ✅ stay equippable, swappable, and previewable. Only the *purchase* path is disabled.
4. **Title flair pricing post-launch** — **Chest-only at launch.** May become purchaseable much later — explicitly out of scope for this rework.
5. **Mythic seasonality** — Not decided yet. Build season 1 (launch) only. Season 2 art planning deferred — no S2 placeholders in the catalogue or schema.
6. **Squad icons** — ✅ confirmed untouched. Emoji + upload only, no animated chest-tier squad icons.
7. **Armoury page rename** — ✅ keep the name "Cosmic Armoury" even after cosmetics leave.

---

## Summary

ONE unified Wardrobe page that owns every cosmetic — **standard** (Armoury-style trails / kill FX / skins, becoming the GMT-paid "Support the Devs" donation tier at GMT launch; expanded to ~115 paid items so backers always have something fresh) + **chest** (13 Epic + 7 Mythic). Purchase disabled in the interim with "Coming soon". The Cosmic Armoury page loses its cosmetic tabs entirely; cosmetics relocate to Wardrobe. Live preview works for every tile regardless of ownership / purchase state. Save schema extends `profile` with 6 equipped chest-cosmetic slots + one owned-chest-cosmetic array; existing trail / kill / skin schema fields stay untouched. ~half the chest catalogue is code-only (title flair, trails, kill FX), ~half is AI-generated art; the standard expansion is entirely config-only (no new render code).