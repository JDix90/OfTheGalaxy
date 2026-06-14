# Phase 1 — walkable, lit 3D planet surface (shipped)

> Builds on `PHASE-0-SPIKE-RECOMMENDATION.md` (decision: **hybrid** — evolve the
> domain/content, greenfield the real-time loop, behind an IWorld seam). Phase 1
> turns the throwaway spike into a real, production-grade **walkable lit 3D planet
> surface** for any OtG planet, reusing the existing domain wholesale and coexisting
> non-destructively with the 2D surface.

## What shipped

A new 3D surface you can walk in real time, reachable from the **🌐 3D View** button
on the 2D planet surface, or directly at **`/game/planet3d/:planetId`**.

- **Real-time movement** — WASD (camera-relative) + Shift-run + Q/E / drag to orbit a
  third-person follow camera, integrated by the shared sim.
- **Lit diorama** — terrain-tinted ground (optionally the planet's aerial texture) +
  grid + fog + hemisphere/key directional lighting with **shadows**. (Full day-night /
  N8AO / bloom is Phase 2.)
- **Data-driven world** — every POI / district / market / medical center / spaceport
  from the planet's existing `mapData` is placed as a **manifest-driven 3D structure**
  (distinct building per category: spaceport pad, market cluster, settlement habitat,
  civic dome, industrial, danger spire, monument).
- **Animated characters** — the player + NPCs are the CC0 Quaternius glTF, **tinted by
  role** (player / quest-giver / vendor / companion / …), Idle/Walk/Run crossfade.
- **Collision** — grid collision against `mapData.tileMap` walkability, with
  wall-sliding (verified: walking into a building plateaus at its face, never
  penetrates).
- **Interactions, reusing the existing overlays** — walk up to an enterable site →
  the existing **SubMapEntryMenu** prompt (→ `/game/location/...`); click a POI →
  **POIInteractionMenu**; click an NPC → **NPCInteractionMenu** → **DialogueInterface**;
  movement triggers the existing **encounter** flow → **EncounterDialog** →
  `/game/combat/:id`. The **HUD** is dropped in unchanged as a DOM overlay.
- **Persistence** — position is written back via the existing `updateLocation`
  (throttled ~2 s + on exit), so 2D and 3D share one saved position.

## Architecture (files)

```
shared/sim/surface.mjs                      # durable runtime-neutral sim: coord mapping,
                                            #   movement, tile collision, wall-slide (client + future server)
frontend/src/data/modelManifest.js          # swappable semantic-key → model/structure (CC0 → Synty = manifest edit)
frontend/src/world/useSurfaceWorld.js       # IWorld seam: single-player LocalWorld + throttled persistence
frontend/src/components/surface3d/
  surfaceData.js                            # mapData → world-positioned POI/NPC lists (+ enterability)
  CharacterModel.jsx                        # animated, manifest-driven glTF (player + NPCs)
  useSurfaceInput.js                        # WASD + run + camera-yaw (modal-aware)
  Ground.jsx                                # lit terrain plane + planet texture + grid
  PoiStructure.jsx                          # primitive building per category + label + proximity ring
  NpcActor.jsx                              # NPC character + nameplate + click
  PlayerActor.jsx                           # sim step + follow camera + locomotion + proximity/screen-projection
  SurfaceScene.jsx                          # scene root: lighting, ground, actors
frontend/src/pages/PlanetSurface3D.jsx      # the page: data load (reuse) + scene + overlays + interactions
frontend/src/pages/SurfaceTest.jsx          # /surface-test — unauthenticated harness (synthetic data)
```

**The seam:** `PlanetSurface3D` and `SurfaceTest` feed the *same* components.
`useSurfaceWorld` is single-player today (the shared sim runs in the browser); the
multiplayer path swaps its internal for a NetWorld (send inputs → apply snapshots)
behind the identical `world` shape. Movement/collision live in `shared/sim/surface.mjs`
so the future authoritative server runs the exact same math.

**Coordinate model:** the sim runs in world units (3D meters); it converts to the
game's 0–100 surface coords only at tile collision and persistence. One `scale`
(`DEFAULTS.scale = 1.6`) maps 0–100 → a 160-unit plane.

## What's verified (live)

Via `/surface-test` (synthetic planet; rendering driven through R3F `advance()` since
the headless preview pauses rAF on a hidden tab):
- Scene renders: ground+grid+fog+shadows, 10 POIs as category-distinct structures,
  3 role-tinted NPCs, player with contact shadow, floating labels.
- Movement works; **tile collision + wall-sliding** confirmed numerically (player
  stops exactly at a building face and slides along it, never enters).
- Camera follows; **proximity** → "▸ Enter <name>" prompt + pulsing ring + active state.
- `buildPois`/`buildNpcs` (the real data path) produce correct world placements.
- `PlanetSurface3D.jsx` compiles and all imports (overlays, APIs, scene) resolve.

**Not runnable from the preview port:** the app's `apiClient` baseURL is the absolute
`http://localhost:3001/api` and the backend CORS only allows `:5173`, so the authed
`/game/planet3d/:planetId` can't fetch from the preview's random port. It runs fully
on the user's `:5173` dev server. (A nice future cleanup: default `apiClient` baseURL
to relative `/api` so it works through any Vite proxy.)

## Deferred (Phase 2+)
- Atmosphere: day-night cycle, `@react-three/postprocessing` N8AO + bloom + tone-map,
  dynamic point lights (neon/engines/weapon fire).
- Real building art: swap primitive structures → Synty/glTF kit (manifest edit).
- Distinct NPC/enemy models per species/type; nameplate level/threat tags.
- Streaming/LOD for large surfaces; instanced props/foliage.
- P4: stand up the authoritative server + flip `useSurfaceWorld` to the NetWorld path;
  real-time tab-target combat (turns→timers) on the surface.
