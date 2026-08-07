# FPS Audit — 2026-08-07 (second pass, deep)

First pass covered per-frame hot paths. This pass covers **lifecycle, object reuse,
per-run setup and the React bridge** — where the worse problems actually are.

> ⚠️ **Correction to the first pass.** I listed "WebGL background copied to the 2D
> canvas every frame" as a top cost. **It is not — that code never runs.** See §0.

---

## 0. 🔴 `engine.webglBg` is NEVER ASSIGNED — dead branch, wrong fallback active

`GameEngineDraw.js` branches on `this.webglBg && this.webglBg.gl` in two places.
**Nothing in the codebase ever sets `engine.webglBg`.** `GameEngine.js` doesn't
import `WebGLBackground` and never assigns the property. So:

- `WebGLBackground.js` — the entire shader, its parallax stars, nebula drift and
  bloom — is **dead code that has never rendered**. Someone believes this feature
  is live; it isn't.
- Every frame therefore takes the **fallback star loop**: 150 iterations, each
  doing a modulo pair, a `ctx.globalAlpha =` assignment (a canvas state change) and
  a `fillRect`. That's 150 state-change + draw-call pairs per frame for background
  dots that are also drawn *on top of* the arena image, in screen space, so they
  don't even parallax correctly with the camera.

**Decide which is true**, because right now you pay for the worse one and ship
none of the good one:
- If the WebGL background is wanted → wire it up (and composite it as its own
  stacked DOM canvas rather than `drawImage`-ing it into the 2D context).
- If not → delete `WebGLBackground.js` and both dead branches, and either drop the
  star loop (the arena image already fills the screen) or batch it into a single
  path with one `globalAlpha` bucket per alpha tier.

## 1. 🔴 The enemy object pool recycles STALE STATE — bugs, not just slowness

`EnemySpawner` reuses pooled objects with `Object.assign(newEnemy, template)`.
`Object.assign` only overwrites keys **present on the template** — every field the
AI wrote at runtime survives into the next enemy that reuses that object. Nothing
is reset, and `EnemyAI` pushes *every* dead enemy into the pool (`enemyPool.push(e)`),
**including bosses and elites**.

Fields that persist and are NOT on templates:

| Stale field | Consequence when reused |
|---|---|
| `isBoss` (bosses are pooled!) | A trash mob spawns flagged as a boss → 80px HP bar, boss telegraph loop, `bossesKilled++`, and on death it sets **`sectorBossDefeated = true`, which ENDS THE SECTOR RUN**. |
| `isElite`, `eliteGoldBonus` | Trash mobs render the full elite aura (radial gradient + 4 stroked arcs per frame) and pay elite gold. Costs grow as the run goes on. |
| `hacked` | Spawns green, infights other mobs, self-damages 5%/s — free kills the player never earned. |
| `latched` | Instantly glued to the player, dealing damage every 30 frames, regardless of type. |
| `burrowed`, `burrowTimer` | Spawns invisible and un-hittable, never un-burrows (only `void_crawler` ticks the timer). |
| `slowTimer`, `attackTimer`, `dataLeeched`, `diveTimer`, `speedMult`, `heads` | Wrong speed / can't attack / wrong render. |
| `_lastWeaponId`, `damageBuffer`, `_regenAcc`, `_bombWarning` etc. | Mis-credited kills in the post-run breakdown; leftover telegraphs. |

This is the most serious thing in this audit — it's a correctness bug with a
perf tail. **Fix:** reset the object explicitly on reuse (assign a fixed
`RESET_FIELDS` list to `undefined`/`0`/`false` before `Object.assign`), and don't
pool bosses at all.

## 2. 🔴 A restart / quit during init leaks a SECOND game loop for the whole session

`Game.jsx`'s init effect runs `initGame()`, which `await`s several things
(`SaveManager.initialize()`, boss fetch, 4 dynamic imports) before constructing the
engine. The effect's cleanup only calls `engineRef.current.cleanup()`.

If the component unmounts or `runId` bumps **while `initGame` is still awaiting**
— quitting fast, double-tapping "Try Again", a slow cloud load — cleanup runs
against the *old* (or null) engine, and then the pending `initGame` resolves and
constructs a **brand-new engine whose `requestAnimationFrame` loop nobody owns**.
It keeps ticking, updating and drawing to a detached canvas **forever**, competing
with the real game for the main thread. Every occurrence stacks another loop.

**Fix:** a cancellation token — `let cancelled = false;` in the effect, set it in
cleanup, and after `new GameEngine(...)` do `if (cancelled) { engine.cleanup(); return; }`.
Same guard before the `setGameState` / `setIsInitializing` calls.

## 3. 🔴 React re-render storm from engine callbacks *(carried over — still #1 for steady-state FPS)*

`onHpChange` fires on every hit and every regen tick; `onGoldChange` on every gold
pickup **and every boss credit**; both call `setGameState`. Add the 100 ms interval
and the whole in-game React tree reconciles tens of times per second, on the same
thread as the canvas loop.

Worse: `CurrencyProvider` wraps the **entire app** and re-renders on every
`saveUpdated` window event — which `SaveManager.save()` dispatches synchronously.
So any in-run save (kill throttle, token pickup, an SFX/jukebox toggle) re-renders
the app root *and* everything under `<Router>`, mid-run.

**Fix:** drop the setState from `onHpChange` / `onGoldChange` (read `engine.player.hp`
/ `engine.gold` in the existing 100 ms poll instead) and wrap `UIOverlay` in
`React.memo`.

## 4. 🟠 `ParticleManager` is rebuilt from scratch every single run

`new GameEngine(...)` → `new ParticleManager()`, and the constructor:
- builds **5 texture canvases** via `loadTexture`, each doing a `getImageData` →
  128×128 = 16,384-pixel JS loop → `putImageData` on the main thread, and
- **throws away `tintCache`, `glowCache`, `outlineCache`**, so every tint variant
  (one canvas per colour per texture) and every glow is regenerated from zero and
  re-uploaded to the GPU during the first seconds of the next run.

The procedural sprite sheets are already module-cached (`proceduralSpriteSheetsCache`)
— the textures and caches should be too. This is a chunk of the "first 10 seconds
feel stuttery" and it repeats on every Try Again.

## 5. 🟠 `dpsWindow` allocates an object per damage event

`damageEnemy` does `this.dpsWindow.push({ t, dmg })` on **every hit** — an AoE
build lands hundreds per second, so this is hundreds of short-lived objects per
second purely to feed a HUD number. It's only trimmed inside `getRollingDps()`,
which is called from the 10 Hz interval **and only while unpaused** — so while a
level-up modal is open the array grows unbounded, and the trim uses `Array.shift()`
(O(n) per element removed).

**Fix:** two parallel `Float64Array` ring buffers (or simply accumulate damage into
fixed 0.5 s buckets — 20 numbers total). Zero allocation, O(1) trim.

## 6. 🟠 Per-frame closure allocation in the boss path

`EnemyAI` line ~513, for every boss, every frame:

```js
engine.addParticle.bind(engine), engine.addDamageText.bind(engine)
```

plus a fresh `bossTakeDamage` arrow — three function allocations per boss per
frame. Exactly the defect already fixed for `this.loop.bind(this)`. Bind once in
the engine constructor.

## 7. 🟠 Carried over from pass 1 (still valid)

- **Particles: 3 full-array passes per frame.** `particleManager.draw()` is called
  three times (combat / trail / killfx) and each iterates all ~800 particles to
  filter by tag → up to 2,400 iterations/frame just to skip. Use three arrays.
- **`ctx.shadowBlur = 15` on every coloured `anim_*` particle** — canvas shadow
  blur is a per-draw Gaussian; every explosion pays it. Bake the glow into the
  tinted variant instead.
- **Spatial hash uses template-string keys** — `` `${cx},${cy}` `` per enemy per
  frame plus up to 9 lookups per projectile (and `EnemyAI`'s `quantum_swarm` block
  does 9 more per swarm mob). Thousands of throwaway strings/frame. Use an integer
  key: `(cx + 512) * 4096 + (cy + 512)`.
- **`filter()`-per-frame** in `updateProjectiles`, `updatePickups`, `updateHazards`,
  `damageTexts`, `envParticles` — new array every frame each. In-place swap-remove
  (the pattern `ParticleManager.update` already uses) removes all of it.
- **EnemyRenderer elite aura** builds a `createRadialGradient` per elite per frame
  — cache by radius, as the enemy-bullet halo already does. (Made much worse by §1,
  which turns trash mobs into fake elites.)

## 8. 🟡 Smaller / opportunistic

- `SpritePreloader.preload()` is fired **inside `initGame`**, kicking off a network
  + decode burst for every character sprite exactly as the run starts.
- `SFXManager.playGoldPickup` schedules up to **7 `setTimeout`s per call** (100 ms
  throttle) — a steady drip of timer callbacks interleaved with frames.
- The 100 ms HUD interval and the 500 ms stuck-watchdog keep running after
  game-over / victory while the modal is up.
- `handleResume`'s 1500 ms `setTimeout` is never cleared on unmount.
- `checkAoe` allocates a `Set` + closure per AoE projectile per frame (the pulse
  path still runs it every frame while expanding).

## Verified NOT a problem

Canvas is sized in CSS pixels (no DPR multiply). SFX is throttled. Enemy /
projectile / pickup / particle / env culling is in place. The per-kill save write
is throttled to 30 s. The weapon-stats per-tick memo works. Enemy-bullet halos are
cached. The arena-image fallback is pre-rendered once.

## Suggested order

1. **§1 pool reset** — it's a correctness bug (runs can end early) *and* a growing
   render cost. Highest priority regardless of FPS.
2. **§2 init cancellation** — one leaked loop halves your frame budget for the
   rest of the session.
3. **§0 decide the background** — you're paying for the fallback and shipping
   none of the shader.
4. **§3 React bridge** — biggest steady-state win in heavy combat.
5. §4 cache the particle textures, §5 DPS ring buffer, §6 bind-once.
6. Batch §7/§8 opportunistically.