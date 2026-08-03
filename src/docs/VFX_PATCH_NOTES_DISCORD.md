Evening all. Bit of a different one this time — no new content, no new season. Just a big pass over how the game actually *looks and feels* to play. Some of this is stuff you've been telling me about for a while.

# ✨ VISUAL & PERFORMANCE PATCH

## 🔥 The screen mash

You know the one. Get a few weapons going at high level and everything turns into a white blur.

That was one shared glow effect being drawn behind **every single projectile** at three times its actual size. Laser Nova alone puts 20–40 of those on screen at once, and they stack additively — so six different colours still add up to white.

**The glow is now about a third of the area it was, at roughly half the brightness.** Colour survives now instead of blowing out.

While I was in there, the projectiles themselves had a solid white core taking up their inner 20%, which meant **weapon colour basically never got through.** That's pulled right in. Your weapons should actually look like different weapons.

## ⚔️ Mastery and evolutions were invisible — and that one's on me

This is the one I feel worst about, because it means grinding some of you already did just… didn't show up.

- **Ricochet Blade** promised you a **Silver Blade** at mastery. The renderer ignored the colour entirely. You maxed three upgrades and nothing changed. It works now.
- **Shield Bubble**'s mastered "Golden Shield" was `#FFD700`. **SynthBeats' character colour is also `#FFD700`** — so if you played SynthBeats, your unmastered bubble was pixel-identical to the mastered one. Unmastered is now amber-bronze, so the upgrade is visible.
- **Hellfire** and mastered **Napalm** were two shades of nearly the same blue rendering through the same code. An *evolution* looked like slightly more of the weapon it evolved from. Hellfire is violet-blue now.
- **Aegis Matrix** was the exact same gold as a mastered Shield Bubble. It's brighter now — the evolution reads as a step up.
- **Seismic Whip** flashed magenta and then fired a cyan shockwave, which read as two different weapons going off. It's one colour now.

Neo Blaster, Nap Beam and Vine Whip also all just used **your character's colour** — the same colour your sloth is drawn in — so your shots blended into your own sprite. They've each got their own identity now.

## 💀 Things that were killing you invisibly

Not polish. These were unfair.

**Boss AoE attacks were never drawn.** Void Bomb, Plasma Nova and Meteor Shower all create a warning zone in the code, count it down, and then hit you for heavy damage — and **nothing ever put a circle on the screen.** You got a warning label that faded, then took a hit from something you couldn't see. Meteor Shower was the worst: 3 to 8 impact zones landing at once, each one marked by three little sparks.

You'll see proper ground markers now, at the real blast radius, filling up as the timer runs down.

**This does make bosses easier**, and that's on purpose — those attacks were always meant to be dodgeable.

**Hazard rings were lying about their size.** The red circle was drawn smaller than the area that actually damages you, so you could be standing visibly *outside* it and still take 30–75 damage. The ring now matches the real danger zone, and it's brighter and thicker when it first appears. It was also being drawn underneath basically everything else on screen — it's on top now.

**Plasma Swarm's main damage had no visual whatsoever.** The lash from each drone hits a big area every single tick, and there was nothing to see — enemies just died several body-lengths away from anything on screen. There's a ring now showing the actual reach.

## 📱 Performance — especially on phones

A fair few of you play on mobile, so this got bumped up the list.

- **A memory leak that could crash a run.** Certain effects were caching dozens of identical full-size textures — around 14 MB each time, never cleaned up. On a phone that eventually kills the canvas and takes the run with it.
- **Four different draw loops were rendering things that were off screen.** Projectiles, particles, pickups and enemy bullets are all properly culled now.
- **Bullet-hell boss attacks** were doing hundreds of expensive gradient rebuilds every frame — during the busiest, most dangerous moments of a run, which is exactly when your phone can least afford it.
- Some effects were being drawn **up to 2,400 pixels wide**, far off the edge of your screen where nobody could see them. There's a sensible ceiling now.

Nothing about how any of it looks has changed. It just costs a lot less to draw.

## 🎯 Smaller things you might notice

- **Screenshake meant nothing.** Every projectile hit nudged the camera, so with a multi-pierce build it was in permanent low-level wobble and nothing ever landed as an event. Per-hit shake is gone; **killing an elite now actually shakes.**
- **Elites stopped looking like elites** in bright moments — their orange aura was blending to white. Fixed, and their health bar is wider now instead of being identical to a basic mob's.
- **Buzzsaw and blade strobe.** There was a fix for this written back in June that never actually ran — the spin rate it was supposed to cap was being overwritten every frame. It runs now. The blades also stopped snapping angle every time they bounced.
- **Off-screen markers**: a 💰 could cover a 💀. Threat markers draw on top now.
- **Damage numbers sat about 9 pixels too low** if you played NeoByte or HoloDrift, overlapping enemy sprites.
- Big enemies (the squad meteor especially) **popped out of existence** with a sliver still on screen.

---

## 🛠️ Why now?

Fair question, since I've said the focus is the new version.

Every single one of these fixes is in the display layer — so **all of it moves across to the new build with me.** None of it is throwaway work. And honestly, a lot of it is things you've reported that I hadn't got to yet. Felt wrong to keep building the future while the thing you actually play still had a boss attack with no warning circle.

The new version is still the plan and it's still coming. This just means you're not waiting on a worse game in the meantime.

As always — if something looks off after this, shout. Colour changes especially: I've tried to make every weapon distinct, but I'm one bloke and there are a lot of weapons.

**GLHF, Sloths.** 🌌
