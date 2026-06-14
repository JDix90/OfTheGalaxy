# Phase 2 — atmosphere (shipped)

> Builds on Phase 1 (`PHASE-1-NOTES.md`). Adds the cinematic lighting layer the brief
> calls "~80% of the visual jump": a **day-night cycle**, a **post-processing stack**
> (N8AO + bloom + ACES tone-mapping + SMAA), and **dynamic point lights** on POI
> structures. Applies to the existing walkable surface — no gameplay changes.

## What shipped

- **Day-night cycle** — an animated sun (directional light) arcs across the sky over a
  configurable cycle; sky gradient, fog, sun/ambient/hemisphere colors + intensities,
  and a bloom-friendly sun disc all shift through **dawn → day → dusk → night**. A
  gradient **sky-dome shader** (horizon→top blend + sun glow), drei **Stars** that
  fade in after dusk, and a faint **moon** complete it.
- **Post-processing** — `@react-three/postprocessing` `EffectComposer`:
  **N8AO** (high-quality contact AO) → **Bloom** (emissive structures + sun/moon glow)
  → **ToneMapping** (ACES) → **SMAA**. The host Canvas is `flat` (renderer tone-mapping
  off) so tone mapping happens once, after bloom.
- **Dynamic point lights** — each POI structure carries a point light (color = its
  emissive accent) that **ramps up after dusk** with a soft flicker, so towns/markets/
  pads glow at night. Bounded to 12 lights (enterable + brightest-glow win) for perf.

## Files
```
frontend/src/components/surface3d/atmosphere/
  dayNight.js            # pure cycle model: time → sun/sky/fog/light params + night factor
  Atmosphere.jsx         # sky-dome shader + sun light/disc + moon + hemi/ambient + Stars + fog
  PostFX.jsx             # EffectComposer: N8AO + Bloom + ToneMapping + SMAA (quality-tiered)
  AtmosphereContext.js   # shared night/day ref (no re-renders) for POI lights
```
Touched: `SurfaceScene.jsx` (wires Atmosphere + PostFX + the context, caps lights),
`PoiStructure.jsx` (dynamic point light), `PlanetSurface3D.jsx` + `SurfaceTest.jsx`
(Canvas `flat`, AA via SMAA, cycle props; harness adds a time-of-day slider + presets).

## Controls / config
- `<SurfaceScene time={0..1} />` drives time directly; omit `time` to auto-advance over
  `cycleSeconds`. `startTime` sets the initial time; `postQuality` = `off|low|high|ultra`.
- Live page (`/game/planet3d/:id`): slow auto-cycle (`cycleSeconds=600`, start 0.55).
- Harness (`/surface-test`): a time slider + Dawn/Day/Dusk/Night presets + auto toggle.

## Deps (pinned for React 18 / fiber 8 — do NOT bump to the v3 line)
`@react-three/postprocessing@2.19.1`, `postprocessing@6.39.1`, `n8ao@1.10.2`.
(@react-three/postprocessing v3+ requires fiber 9 / React 19.)

## Verified (via /surface-test, frames driven through `window.__otg3d().advance()`)
- Full cycle renders distinctly: day (pale-blue sky) → dusk (deep blue/purple, structures
  glowing) → night (near-black, pure structure glow) → dawn (warm horizon).
- 10 dynamic point lights ramp with nightfall; bloom on emissive + sun disc; N8AO contact
  shadows; ACES tone-mapping (`gl.toneMapping === NoToneMapping`, ToneMapping effect on).
- Perf: ~**7.8 ms/frame** including full render + N8AO + bloom + SMAA (~128 fps headroom).
- Proximity/movement/collision from Phase 1 still work; `PlanetSurface3D` compiles with
  the atmosphere additions. No Phase-2 errors.
- **End-to-end on the live authed page** `/game/planet3d/sinkport` with REAL backend
  data: real Sinkport POI structures + generated NPCs (role-tinted) + the real HUD
  (Health/Stamina/💰credits/Level/XP, Map widget, "Dockside Initiation" tutorial quest)
  under the atmosphere — Phase 1 + Phase 2 + the data layer all compose.

## Bundled fix — apiClient base URL (unblocked preview / multi-port dev)
The app's `apiClient` defaulted to the absolute `http://localhost:3001/api`, and the
backend CORS only allows origin `:5173`, so the app's own API calls (login, planet load)
failed from any other dev port. Fixed: `client.js` default → relative `/api` (same-origin
via the Vite proxy) and `frontend/.env` / `.env.example` `VITE_API_URL=/api` for dev; the
env override remains so split-host production can still set an absolute URL. Verified:
login + real planet load now work from a non-5173 preview port (this is what made the
live end-to-end verification above possible).

## NPC level-of-detail (perf — crowded planets)
Every surface NPC was a full animated glTF clone (~4 skinned meshes + its own
AnimationMixer); a populous planet (Sinkport) spawns many at once. Added distance-based
LOD, managed by `<NpcLOD>` in `SurfaceScene.jsx` (re-evaluated ~5.5 Hz):
- **full** — animated glTF, mixer every frame (nearest, within 26u)
- **lod** — animated glTF, **mixer throttled** (`CharacterModel stride=3`) for the rest
  of the animated set
- **proxy** — a cheap static **capsule** stand-in, no mixer/skinning (over-cap / far)
- **hidden** — culled beyond the fog (`worldHalf*2.4`)

Hard cap **`MAX_ANIMATED_NPCS = 8`** (two-pass selection with hysteresis: incumbents
keep their slots until `ANIM_KEEP_DIST`, then nearest newcomers fill remaining slots —
no boundary thrash). Default tier is `proxy`, so a planet never mounts every NPC's glTF
at once on load. Nameplate + click-to-interact use the same wrapper for every tier, so
both work whether an NPC is a full robot or a proxy.

**Verified** (`/surface-test` seeded with a 43-NPC crowd): exactly **8 animated / 35
proxy**, **~3.3 ms/frame median** (avg 3.6, p95 5.5) — well inside the 16.6 ms budget,
day and night. `MAX_ANIMATED_NPCS` / distances are tunable in `SurfaceScene.jsx`.

## Tuning notes (cheap future polish, all in dayNight.js)
- Day sky reads slightly pale and night stars are subtle — both are palette/curve values
  in `dayNight.js` (`C.skyTopDay`, star opacity) if a richer look is wanted.
- Sun disc size/bloom strength: `Atmosphere.jsx` (disc geo radius, color boost) + PostFX
  `Bloom` intensity/threshold.

## Deferred (Phase 3+)
- Distinct glTF building kit (Synty) via the model manifest (replaces primitive structures).
- Distinct NPC/enemy models per species/type; nameplate level/threat tags. (NPC LOD/
  capping for crowds is DONE — see above.)
- Instanced rendering for proxy NPCs if surfaces ever carry hundreds at once.
- Weather/particle FX (dust, rain, neon haze) reusing the existing particle engine.
- P4: authoritative server + flip `useSurfaceWorld` to the NetWorld path; real-time
  tab-target combat on the surface.
