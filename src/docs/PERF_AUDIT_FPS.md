# FPS Audit — 2026-08-07

Full trace of one frame: `GameEngine.loop → update → draw (GameEngineDraw)` plus the
React side (`Game.jsx` callbacks + HUD interval). The 2026-08-03 pass fixed the
per-kill save write, culling, gradient caching and glow clamping — those were real,
but four significant costs remain. Ranked by expected FPS impact.

---

## 1. 🔴 React re-render storm from engine callbacks (main thread contention)

`Game.jsx` wires the engine to React state:

- `onHpChange` → `setGameState` — fires on EVERY hit taken, every regen tick
  (1/sec), every bribe/heal. In a swarm, several times per second.
- `onGoldChange` → `setGameState` — fires on EVERY gold pickup. With a magnet or
  a gold-heavy build, this is dozens of calls per second.
- On top of that, the 100 ms interval already does a full `setGameState` 10×/sec.

Every one of these re-renders the whole in-game React tree (UIOverlay with its
weapon/passive lists, DynamicDifficultyPill, ability meter, joystick wrapper).
That's potentially 30–50 React render+reconcile passes per second running on the
same main thread as the canvas loop. On a phone this is a constant tax that
scales with combat intensity — exactly when FPS matters most.

**Fix:** stop calling setState from the hot callbacks. Have `onHpChange` /
`onGoldChange` write to a ref (or just read `engine.player.hp` / `engine.gold`
directly), and let the existing 100 ms interval be the ONLY thing that calls
`setGameState`. HP/gold appearing on the HUD 100 ms later is imperceptible.
Also worth memoizing `UIOverlay` (`React.memo`) so unchanged props skip render.

## 2. 🔴 WebGL background → 2D canvas copy every frame

`GameEngineDraw` line ~13:

```js
const bgCanvas = this.webglBg.render(...);
this.ctx.drawImage(bgCanvas, 0, 0);
```

`drawImage` from a WebGL canvas into a 2D canvas forces a GPU pipeline flush and
a full-screen surface copy EVERY frame — on many mobile GPUs this alone can cost
several ms/frame. The fragment shader also computes 2-tap value `noise()` plus a
star grid per pixel at FULL canvas resolution.

**Fixes (either or both):**
- Composite instead of copy: make the WebGL canvas its own DOM element stacked
  *behind* the game canvas (game canvas becomes transparent where the background
  shows). Zero copies, the browser compositor does the layering for free.
- Or render the WebGL background at half resolution and let `drawImage` upscale —
  quarter of the shader work, visually indistinguishable for a blurry nebula.
- Also: `webglBg.resize()` is called every frame — it's a no-op guard, fine, but
  the copy is the real cost.

## 3. 🟠 Particle draw: 3 full-array passes + shadowBlur

- `particleManager.draw()` runs **three times per frame** (combat pass, 'trail'
  pass, 'killfx' pass) and each pass iterates the ENTIRE particle array (up to
  800), filtering by layer tag. Worst case ~2,400 iterations/frame just to skip
  particles. Fix: keep three separate arrays (or per-layer index lists) so each
  pass only touches its own particles.
- Every colored `anim_*` particle sets `ctx.shadowBlur = 15` for its draw —
  canvas shadowBlur is a per-draw-call Gaussian blur, one of the slowest 2D
  canvas operations. Every explosion (`createExplosion` always passes a color)
  pays it. Fix: bake the glow into the tinted sprite-sheet variant once (same
  pattern as `getTintedTexture`) or drop the blur for a pre-rendered halo.
- The 800-particle ceiling is generous for mobile. Consider scaling it with
  Low-FX mode (e.g. 300 when `cosmic_low_fx_mode` is on — spawn counts are
  already reduced, but the ceiling isn't).

## 4. 🟠 Spatial-hash string keys — thousands of allocations/frame

`GameEngine.update` builds the hash with `` `${cx},${cy}` `` per living enemy per
frame, and `ProjectileSystem` does up to 9 `` `${x},${y}` `` lookups per pierce
projectile per frame plus a fresh `candidates` array per projectile. At 200
enemies + 100 projectiles that's ~1,100 string allocations and ~200 array
allocations per frame — steady GC pressure (the same class of problem as the
kill-milestone tables already fixed).

**Fix:** integer keys — `key = (cx + 512) * 4096 + (cy + 512)` into the same
Map. No strings, no behavior change.

## 5. 🟡 Smaller items (worth batching into the next pass)

- **EnemyRenderer elite aura**: `createRadialGradient` built per elite per frame.
  Elites are few, but it's the same cacheable-gradient pattern already fixed
  elsewhere (cache by radius like the enemy-bullet halo).
- **Trail sparks are the dominant particle source**: every non-AoE projectile
  spawns a spark every 2nd frame (every 4th under heavy load). With 80+
  projectiles that's still ~1,200 particles/sec sustained. Consider extending
  the every-4th-frame throttle to ALL weapons when projectile count > 80.
- **`updateHazards` / `damageTexts` / `envParticles`** all use `filter()` →
  new array per frame. Individually tiny; the in-place swap-remove pattern
  ParticleManager already uses would zero them out.
- **`getRollingDps` uses `Array.shift()`** in a loop — O(n) per trim. Bounded
  by the 10s window, but a head index would be O(1).
- **`checkAoe` allocates a `Set` + closure per AoE projectile per frame** — the
  pool/shield tick paths only do damage 4×/sec now, but the pulse path still
  runs it every frame while expanding.

## Explicitly checked and NOT a problem

- Canvas is sized in CSS pixels (no devicePixelRatio multiplication) — good.
- SFX is throttled (30 ms per key) — bounded.
- Enemy/projectile/pickup/particle/env culling — in place since 2026-08-03.
- Kill-save write — throttled to 30 s since 2026-08-03.
- Weapon-stats memo — per-tick cache in place.
- Enemy-bullet halos — cached per radius.
- Arena image fallback path — pre-rendered once, cheap.

## Suggested order of work

1. React bridge fix (#1) — cheapest change, benefits every device, biggest
   effect on "FPS drops in heavy combat".
2. WebGL background compositing (#2) — biggest single per-frame constant cost,
   especially on mobile.
3. Particle layer arrays + shadowBlur removal (#3).
4. Integer spatial-hash keys (#4).
5. Batch the 🟡 items opportunistically.