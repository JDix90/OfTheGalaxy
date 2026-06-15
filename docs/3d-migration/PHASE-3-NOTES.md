# Phase 3 — the glTF kit (shipped)

> Builds on Phase 1 (walkable surface) + Phase 2 (atmosphere). Replaces the
> composed-primitive POI buildings and single-robot crowd with a real **CC0 glTF kit**,
> adds **WoW-style nameplates**, **instanced crowds**, and **biome weather**. No gameplay
> changes — the entry/interaction/encounter flows are untouched. Applies to both the live
> page (`/game/planet3d/:planetId`) and the `/surface-test` harness via the shared pipeline.

## What shipped (the 4 pillars)

1. **glTF building + prop kit** — every POI renders a real **Kenney Space Kit** building
   (hangars / structure / generator / turret / dish / platform) per category, auto-fitted
   to the ground, with a deterministic scatter of **props** (barrels, pipes, rocks,
   meteor, craft, rover, container) around it. While the glTF streams in (or if a category
   has no building) it falls back to the Phase-1 primitive.
2. **NPC/enemy variety + nameplates** — each role maps to an ARRAY of **Quaternius Ultimate
   Space Kit** characters (astronauts / mechs / robots for friendlies, alien creatures for
   hostiles); the NPC id picks a deterministic variant, so a crowd is varied. Floating
   **nameplates** use the WoW vocabulary: a pulsing gold `!` over quest-givers, **Elite**
   tags on faction leaders, a red **Hostile** treatment + optional `Lv N` on hostiles.
3. **Instanced proxy NPCs** — every distant / over-cap NPC ('proxy' LOD tier) draws from a
   **single InstancedMesh** (~1 draw call for the whole crowd) tinted by role, still
   click/hover-interactive (raycast → `instanceId` → NPC). Nameplates render only for the
   nearest ~14 to bound DOM.
4. **Weather** — a lightweight `THREE.Points` field (one draw call) that follows the player
   and picks **dust / ash / rain / snow** from the planet's biome (`getWeatherPreset`),
   respecting scene fog. Ash uses additive blending for glowing embers.

Plus a **night-readability** fix: the untextured kit buildings have no emissive of their
own (they collapsed to black silhouettes after dusk), so each glTF building gets a subtle
self-emissive fill (keeps its color/shape at night) and a **category-colored beacon** on
top — POI identity at night + bloom glow, mirroring the Phase-1 primitives' accents.

## Files
```
frontend/public/models/
  ATTRIBUTION.md                 # CC0 provenance (Kenney + Quaternius)
  buildings/*.glb                # Kenney Space Kit buildings (material-colored, no texture)
  props/*.glb + props/Textures/  # Kenney props (+ station-kit container's colormap.png)
  characters/*.gltf              # Quaternius astronauts / mechs / enemies (self-contained, rigged)
frontend/src/components/surface3d/
  GltfModel.jsx       # NEW — load + clone + auto-fit (ground-rest, scale-to-footprint) + emissive fill
  NpcProxies.jsx      # NEW — instanced proxy crowd + bounded nameplates + instanced click
  Nameplate.jsx       # NEW — shared WoW-style nameplate (role markers/tags)
  Weather.jsx         # NEW — biome particle field (getWeatherPreset + presets)
  PoiStructure.jsx    # glTF building (primitive fallback) + prop scatter + beacon
  CharacterModel.jsx  # + fitHeight (normalize mixed rigs) + yOffset (flyers hover)
  NpcActor.jsx        # animated-only; variety via id seed; uses Nameplate
  SurfaceScene.jsx    # split NPCs by tier (animated vs instanced); nearest-N label set
  surfaceData.js      # attach building + props to each POI
frontend/src/data/modelManifest.js  # glTF buildings/props per category; multi-variant character roster; ROLE_COLORS
frontend/src/pages/SurfaceTest.jsx  # weather buttons; title → "Phase-3 glTF Kit"
.claude/launch.json                 # NEW — preview dev-server config (frontend :5173)
```

## Assets (all CC0 — see public/models/ATTRIBUTION.md)
- **Kenney Space Kit / Space Station Kit** (kenney.nl) — buildings + props. Material-colored
  (`baseColorFactor`), no external texture except the station-kit `container.glb`, whose
  `Textures/colormap.png` is bundled alongside it in `props/`.
- **Quaternius Ultimate Space Kit** (quaternius.com) — 4 astronauts + 4 mechs + 4 enemies,
  self-contained `.gltf` (embedded buffers/atlas), rigged Idle/Walk/Run (flyers:
  Flying_Idle/Fast_Flying). Atlas-textured → not tinted; variety comes from the model.
- Total bundled: ~9 MB (characters dominate; Kenney buildings/props are tiny low-poly).

## Manifest shape (swappable → Synty later)
- `POI_STRUCTURES[cat]` keeps the primitive descriptor + `buildings[]` (glb urls) + `fit`
  (target footprint, world units) + `props[]`. `getPoiBuilding(type, id)` / `getPoiProps`
  pick deterministic variants. Dropping in Synty = edit the urls.
- `CHARACTER_MODELS[role]` is an array of glTF descriptors (`fitHeight` normalizes mixed
  rigs; `clips` map idle/walk/run; `yOffset` for hovering flyers). `getCharacterModel(role,
  seed)` picks the variant. `ROLE_COLORS` drives proxy tint + nameplate accent.

## Verified (via /surface-test, frames auto-rendered)
- Day (60 fps): glTF hangar with correct metal materials + clean shadows; props + varied
  Quaternius characters; quest `!` / Elite nameplates; enterable ring + proximity prompt.
- Dusk + snow: dusk sky/stars with falling snow particles (weather follows player).
- Night: self-emissive fill keeps buildings readable; **blue/gold POI beacons glow with
  bloom** on near + distant buildings.
- Scene introspection: proxy crowd = **35 NPCs in 1 InstancedMesh** (43 total − 8 animated);
  1 weather points cloud. `container.glb` loads **with** its 512×512 texture (fixed).
- Live page inherits everything automatically: `PlanetSurface3D` already passes `planet`
  (→ weather) + `npcs3d` (→ variety) through `buildNpcs`/`SurfaceScene`. No page changes.

## 3D is now the default surface
The walkable 3D scene is the **standard** planet view (immersive-first). `/game/planet/:id`
renders `PlanetSurface3D`, so every existing navigation — galaxy landing, post-combat
return, submap exit, character creation, tutorial — lands in 3D with no call-site changes
(URL + `location.state` preserved; the world hook resumes the persisted position or
spaceport spawn, and records arrival). `/game/planet3d/:id` stays as an alias; the 2D
`PlanetSurface` is kept only at the explicit `/game/planet2d/:id` fallback (no UI links).
`TutorialOverlay` is now rendered on the 3D page so onboarding still fires (its
`pathname.startsWith('/game/planet/')` check matches because we kept the canonical path).
The in-scene "2D view" toggle was removed. Submaps/interiors + combat remain 2D for now (P4).

## Deferred (Phase 4+)
- Player model variety (still the gold RobotExpressive — proven locomotion; swap is a manifest edit).
- Quaternius Environment buildings (blend-only; needs Blender to convert — Kenney covers it for now).
- Distinct surface ENEMIES (the Enemy_* models are wired for `random_encounter`; real surface
  combat lands in P4) + nameplate level numbers from planet danger.
- Interiors/submaps in 3D (station-kit modular pieces are downloaded for this).
- P4: authoritative server + flip `useSurfaceWorld` to NetWorld; real-time tab-target combat.
