# Of The Galaxy → real-time 3D — migration plan

> **North star:** turn Of The Galaxy from a screen-based, turn-based 2D RPG into a
> **real-time, continuously-walkable 3D sci-fi RPG** with eventual multiplayer
> presence — benchmarked against the quality/playability bar of *World of
> ClaudeCraft*. This doc is the durable brief; a fresh session should read it
> top-to-bottom before writing any migration code.

---

## 0. Locked decisions (from the product owner)

1. **Combat model → real-time, tab-target spine dialed to action-RPG** (not
   turn-based; NOT a full shooter). WASD + soft-target/reticle + dodge + AoE
   telegraphs + server-resolved projectile/cone abilities. Preserve the
   *content/data* and the stat-driven hit model (accuracy/crit/dodge/threat); turns
   become timers/cooldowns. **See the "Combat feel (locked)" section below.**
2. **World model → continuous walkable scenes** (WASD around a 3D planet/station
   in real time, world alive around you) **+ eventual multiplayer presence.**
3. **Asset kit → start CC0/free, upgrade later.** Prototype the entire pipeline on
   free assets to de-risk; swap in Synty (or commissioned art) once the 3D
   systems are proven and cohesion is worth paying for.
4. **Architecture → decide via a Phase-0 spike.** Do NOT commit to evolve-in-place
   vs. greenfield up front. Build a throwaway spike first, learn the real cost,
   then choose with data. **This is the immediate task — see §4.**
5. **First spike surface → a walkable planet/station scene** (the foundation
   everything else, including real-time combat, sits on).

---

## 1. The benchmark — World of ClaudeCraft

Public repo: **https://github.com/JDix90/claudecraft_origin** (study it directly —
it's the same Node+Postgres+browser lineage as OtG but made the bets we now want).

**What it is:** a WoW-Classic-style real-time micro-MMO. Accounts + persistent
characters in Postgres, other players in the world with you, an offline browser
mode, all on one **deterministic simulation core** (`src/sim/`).

**Why it looks/plays like a real game (the levers that matter):**

- **Thin client over an authoritative real-time sim.** The README is blunt: *"the
  client is a renderer."* One shared `Sim` runs server-side at **20 Hz**, streams
  **interest-scoped snapshots (~120 yd)** + per-player events; all combat/loot/
  quest math is server-authoritative. Offline and online run the *same* sim core.
- **A cohesive low-poly glTF art kit.** `public/models/{chars,creatures,dungeon}`
  — ~10 characters, ~25 creatures, a kit-bashed dungeon set (floor tiles,
  pillars, coffins, chests, banners, candles). One coherent art direction = the
  whole "real game" feeling. *Cohesion is the single biggest quality driver.*
- **A real lighting/atmosphere stack.** `three.js` + `postprocessing` +
  **`n8ao`** (high-quality ambient occlusion) + bloom, a **day/night cycle**, and
  **dynamic point lights** (torches, campfires). This is ~80% of why the dusk and
  crypt screenshots read so well.
- **A clean modular renderer.** `src/render/` =
  `renderer · terrain · foliage · water · sky · post · dungeon · props ·
  characters · locomotion · vfx · textures · stealth`, fed by a generated media
  manifest + preload pipeline (`src/render/assets/`).
- **WoW's battle-tested UX vocabulary.** Nameplates with level/elite tags, quest
  `!`/`?` markers, **AoE telegraphs**, cast bars, party frames, action bars,
  combat log, vendor/bags with tooltips, minimap, parties/trade/duels/arena.

**Files worth reading in their repo (architecture/technique reference, NOT
copy-paste — they use vanilla TS + three.js, we use React + R3F):**
`src/render/{renderer,terrain,sky,post,characters/visual,locomotion,vfx}.ts`,
`src/sim/{sim,world,entity,spatial,threat,pathfind}.ts`, `src/net/online.ts`,
`server/` (authoritative loop), and `src/sim/content/zone*.ts` (data-driven zones).

---

## 2. Where Of The Galaxy is today

- **Repo:** `of-the-galaxy-rpg-foundation/`. Backend = Express + Sequelize +
  Postgres on **:3001**; frontend = React 18 + Vite + Zustand on **:5173**.
- **Mostly 2D.** Galaxy/planet/submap are (were) Canvas 2D; combat is DOM cards.
- **3D beachhead already exists:** the **galaxy map is now a three.js / R3F scene**
  — `frontend/src/components/galaxy/GalaxyScene3D.jsx` (rendered by
  `pages/GalaxyMap.jsx`). It proves the R3F pipeline, camera fly-to, and
  interaction. **This is the template to extend.**
- **Asset pipeline exists:** `frontend/src/services/assetManager.js` (texture/POI/
  NPC/particle load+cache) + `frontend/src/data/{poiSpriteMap,planetTextureMap,
  npcSpriteMap,particleSpriteMap}.js`. POI sprites + planet base textures now
  render on the 2D surfaces; a particle engine (`services/particleEngine.js` +
  `components/effects/ParticleField.jsx`) and an SVG icon system
  (`components/common/GameIcon.jsx`, lucide-react) are in place.
- **Installed 3D deps (pinned for React 18 — DO NOT bump):**
  `three@0.169`, `@react-three/fiber@8.17`, `@react-three/drei@9.114`.
  ⚠️ `@react-three/fiber@9` requires React 19 and will break `npm install`.
- **R3F gotcha already learned:** an R3F `<Canvas>` collapses to 300×150 unless
  its parent is explicitly sized — set the Canvas to `position:absolute; inset:0`
  inside a relative container. (See `GalaxyScene3D.jsx`.)
- **Constraints / context (see `.../memory/` notes):** IP re-theme is in progress
  — NPC sprite *pixels* are literal IP (don't ship them); planet textures + POI
  sprites are now IP-free. Backend has stale dev-DB rows pending a reseed.

---

## 3. The phased roadmap

```
Today: 2D surfaces + 3D galaxy map
  → P0  Spike: walkable scene + RT tick   (decides architecture)
  → P1  Lit 3D dioramas    (glTF kit replaces tiles, per surface)
  → P2  Atmosphere         (day-night, dynamic lights, N8AO, bloom)
  → P3  3D actors          (player/NPC/enemy glTF models + animation)
  → P4  Living world       (continuous real-time movement + combat + UX vocab)
  → …   Multiplayer presence (authoritative server; designed-for from P0)
```

P1–P2 on the **planet surface + combat** are the cheapest 80% of the visual jump.
P4 is where real-time combat + the netcode seam land. **Design the sim to be
authoritative-ready from P0** even though single-player ships first — retrofitting
netcode later is the classic painful mistake ClaudeCraft avoided.

---

## Combat feel — LOCKED (real-time tab-target → action-RPG)

**Decision:** a real-time, server-authoritative **tab-target backbone dialed toward
modern action-RPG** (Guild Wars 2 / ESO-action / Diablo zone) — NOT classic static
WoW, NOT a full Mass Effect shooter.

**Primitives to build (P4):**
- WASD movement + third-person follow camera (the P0 spike foundation).
- **Soft-target / reticle:** face-the-enemy aiming; abilities fire as cones/
  projectiles resolved **server-side** (no precise client hitscan).
- **Dodge-roll** + **AoE telegraphs** you physically sidestep.
- Hotbar abilities on **cooldowns + resource (stamina/energy) costs** — evolve the
  existing action bar + ability system from *turns → timers*.
- **Stat-driven outcomes** (accuracy/crit/dodge/defense/threat from gear+attributes)
  stay the deciding variables; aim is "good enough to face the target," not the
  skill ceiling.

**Why (over the two references weighed):**
- *Multiplayer-friendly* — discrete "cast ability → server validates range/cooldown/
  cost → resolves hit/damage" is exactly ClaudeCraft's 20 Hz authoritative model.
  A true shooter needs hitscan + lag-comp/rewind netcode (brutal in a browser → MP).
- *Reuses OtG's systems* — stats/abilities/threat/status carry over (turns→timers)
  instead of being discarded for aim-skill.
- *Keeps the stats/gear/build RPG identity* while still feeling modern + sci-fi
  visceral (ranged projectile/cone weapons, dodging, repositioning).
- *Achievable incrementally*; ClaudeCraft is a working tab-target reference.

**Flip to full shooter ONLY if** visceral aim-driven gunplay is *the* dream AND the
team accepts: co-op-only/rollback netcode, a much heavier animation/systems budget
(aim poses, cover, IK, recoil), and aim-skill outranking stats/gear — a different,
bigger, riskier game that trades away most of OtG's current identity + code.

**Does not change the P0 spike** — the walkable WASD + 3rd-person foundation serves
this directly (a shooter would later bolt an aim-camera/reticle/cover layer on top).

---

## 4. Phase 0 — the spike (THE IMMEDIATE TASK)

**Goal:** build a throwaway, isolated spike that de-risks the foundation and
produces the data to choose **evolve-in-place vs. greenfield thin-client**.

**Build:**
- A single R3F scene (new route, e.g. `/spike`, or a standalone Vite entry) with:
  - low-poly ground + a few props (CC0 kit), third-person camera follow.
  - an **animated character** controlled with **WASD** (Quaternius rigged char +
    idle/run animations; or Mixamo), with **basic colliders** (don't walk through
    walls).
  - a **world-streaming seam** stub (load props/actors by area; doesn't have to
    be real streaming yet — just the seam).
- A minimal **real-time server tick**: a WebSocket endpoint that accepts the
  client's input/position at ~15–20 Hz and **echoes authoritative position back**
  (start with naive echo; the point is to feel the loop and measure it). This is
  the smallest possible "the server owns the world" experiment.

**Success criteria / what it must teach:**
- Does WASD + camera + animation + colliders feel good in R3F at 60 fps?
- What does it cost to make the **backend authoritative + real-time** (WS, tick,
  input handling) alongside or instead of the current REST/Sequelize stack?
- Can we reuse OtG's content/data (enemy stats, zones) behind a real-time loop, or
  does the request/response grain fight us hard enough to justify greenfield?
- Rough perf + DX read on R3F vs. dropping to vanilla three.js (ClaudeCraft's path).

**Deliverable:** the spike + a short written **architecture recommendation**
(evolve vs. greenfield vs. hybrid) with the evidence behind it. Then we commit.

**Suggested order:** (1) R3F scene + camera, (2) WASD + animation, (3) colliders,
(4) WS tick + echo, (5) measure + write the recommendation.

---

## 5. Tech recipe (mirror ClaudeCraft's `src/render/`, in R3F)

- **Engine:** three.js + `@react-three/fiber` + `@react-three/drei` (already in).
  If R3F friction is high for real-time, the spike should compare a thin vanilla-
  three.js renderer (ClaudeCraft's model) — decide in P0.
- **Lighting/atmosphere (the secret sauce, add in P2):** `postprocessing` +
  **N8AO** + selective **bloom**; a day/night `sky` (gradient/shader + animated
  directional light); **dynamic point lights** for engines, neon, weapon fire,
  consoles.
- **Assets:** glTF via drei `useGLTF`; extend `assetManager` with a glTF cache +
  a **generated, swappable model manifest** (so CC0 → Synty is a manifest swap,
  not a code change). Instanced meshes for dense props/foliage.
- **Actors:** a `locomotion`/animation layer (drei `useAnimations`); floating
  nameplates (drei `<Html>` or sprites) with level/threat tags.
- **VFX:** reuse `particleEngine` patterns; muzzle flashes, impacts, AoE
  telegraph decals.
- **UI:** keep the React DOM panels (HUD, inventory, dialogue, quests) as an
  **overlay** above the canvas — same as ClaudeCraft's HTML UI. Don't rebuild
  those in 3D.
- **Netcode (design-for from P0, ship later):** authoritative server tick;
  client sends inputs, renders server snapshots; interest management (~radius).
  Keep combat/loot/quest math server-side.

---

## 6. Asset pipeline (CC0 first)

- **Characters/creatures (CC0):** **Quaternius** — rigged modular characters +
  Universal Animation Library, Ultimate Space Kit, Modular Sci-Fi, Cyberpunk.
- **Props/ships/stations (CC0):** **Kenney** — Space Kit, Space-Station Kit,
  Blaster Kit. **Mixamo** for extra humanoid animations (free).
- **Wire it swappably:** model manifest maps semantic keys (`char.player`,
  `enemy.drone`, `prop.crate`, `station.door`) → glTF paths, mirroring the
  existing `*SpriteMap` pattern, so a later **Synty** purchase (~$250–500, the
  POLYGON Sci-Fi / Sci-Fi City / Spaceships / Enclave-characters packs; per-seat
  royalty-free) drops in by editing the manifest.
- **IP guardrail:** keep all *content/identifiers* IP-free (existing rebrand
  rules). Don't reintroduce IP-named assets.

---

## 7. Guardrails & principles

- **Incremental & non-destructive.** Each phase ships value alone; upgrade one
  surface at a time; nothing forces a rewrite until P4 (and even then, P0 decides).
- **Reuse the backend domain logic + content** (enemies, items, zones, quests)
  behind whatever new loop we build.
- **Performance budget:** 60 fps target; instancing, LOD, frustum culling,
  texture/draw-call discipline — the canvas-optimization mindset already in the
  2D renderers carries over.
- **Verify live** (Chrome MCP / a preview) each phase, the way the 2D work was
  verified.
- **Keep it web-native** unless the spike proves the browser can't hit the bar.

---

## 8. Open questions to pin early (don't block the P0 spike)

- **Multiplayer scale/timing:** co-op parties vs. larger shards; when it ships.
- **Camera:** fixed 3rd-person follow vs. orbit vs. iso? (spike with one, revisit.)
- **Perf targets / min spec** (mobile?).
