# Phase 5 — 3D submap interiors

> Extends the walkable 3D world from the planet surface into **submaps** (spaceports,
> cities, settlements, markets…). A submap is a compact "surface": a collisionMap
> (walkability) + buildings + NPCs + entry/exit points — so the entire `surface3d` kit
> (atmosphere, ground, structures, NPCs, player, quest waypoints) is reused over a
> submap-scoped LocalWorld.

## 5.0 — open / collisionMap submaps (shipped)

**What it does:** the submap routes (`/game/location/:planetId/:parentLocationId/:parentLocationType/:type`
and `/game/submap/:subMapId`) now render a **walkable 3D interior** (`SubMapView3D`) for
spaceport / city / settlement / market / civic types. WASD + 3rd-person camera; buildings
as 3D structures; NPCs as glTF actors (click → existing NPC menu + dialogue); glowing
**exit portals** (walk near → prompt, or click, → back to the now-3D surface); **quest
waypoint beams** to in-submap objectives; HUD + tutorial overlay reused as-is.

**Onboarding is now 3D:** `CharacterCreation` already routes new characters to the
spaceport submap; that route is now `SubMapView3D`, so planetfall lands you in a 3D
spaceport. The page calls `tutorialApi.ensureNPCOnSubmap` on load so the dockside contact
(**Dockmaster Jax**) is guaranteed present (the 2D view had assumed he was already placed —
that was the "no Jax" bug), and a waypoint beam guides you to him. Planet-name copy is now
neutral ("the docks") instead of hardcoded "Solenne".

**Files:**
```
frontend/src/components/submap3d/
  submapData.js     # createSubmapSim (collisionMap→sim), toPct, build{Pois,Exits,Npcs,Waypoints}
  SubmapScene.jsx   # R3F scene reusing surface3d (atmosphere/ground/POI/NPC/player/waypoint) + ExitMarker
  ExitMarker.jsx    # teal exit-portal beacon
frontend/src/world/useSubmapWorld.js   # LocalWorld for submaps (persist area:'submap', subMapId)
frontend/src/pages/SubMapView3D.jsx    # the page (loads submap+NPCs, interaction, exit/enter, tutorial)
frontend/tests/unit/submapData.test.js # 6 tests (sim walkability, coords, builders)
```
Touched: `App.jsx` (submap routes → SubMapView3D), `TutorialOverlay.jsx` +
`tutorialDialogueService.js` (planet-neutral copy).

**Coordinate model:** submap layout positions are GRID units (0..width/height); player
position persists as 0–100 percent. `toPct` normalizes (grid → cell-center; percent kept).
`createSubmapSim` turns a 100-res collisionMap into a tileMap (0=walk, 1=wall→`building`
obstacle, 2=door=walk), or an open sim when all-walkable. Scale `0.8` → an 80u interior.

**Reuse:** single-player/local (no realtime server for submaps); combat still flows through
the existing encounter path. No NPC LOD (interiors are small).

**Verified:** frontend build green; 6 submap-data unit tests + full suite 69/69. Live
onboarding (fresh smuggler → 3D spaceport + Jax + waypoint + exit) to be confirmed in-app.

## Deferred
- **5.1 dungeons** — grid movement + depth zones + real-time dungeon enemies (currently the
  2D `SubMapView` handles `type==='dungeon'` via `SubMapView3D`'s delegate).
- **5.2 building interiors** — recursive interiors + furniture (delegate handles
  `type==='building_interior'` in 2D for now).
- Distinct interior aesthetic (walls/ceiling meshes from the collisionMap) beyond the
  reused open-surface look.
