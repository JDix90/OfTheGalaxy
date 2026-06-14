# Phase-0 spike — results & architecture recommendation

> Companion to `3D-MIGRATION-PLAN.md` §4. Built a throwaway, isolated spike to
> de-risk the real-time-3D foundation and produce data to choose **evolve-in-place
> vs. greenfield thin-client**. This doc states what shipped, what it measured, and
> the recommendation we commit to before Phase 1.

**TL;DR — recommendation: HYBRID.** Keep the Express/Sequelize/Postgres backend for
auth, character/content/meta CRUD (proven reusable). Add a **long-lived authoritative
real-time sim** (in-memory world, 20 Hz tick, WebSocket) *alongside* it — not REST-ified.
Run the movement/combat math from a **single runtime-neutral sim module** imported by
both server and client, and build the client behind an **IWorld-style seam** (local
vs. networked world) so single-player ships first but netcode is never a retrofit.
This is "evolve the domain/content, greenfield the real-time loop." It is **not** a
full rewrite, and **not** pure REST evolution.

---

## 1. What the spike built

A standalone, isolated `/spike` surface (throwaway; not wired to auth/character flow):

| Piece | File | What it proves |
|---|---|---|
| Shared sim core | `shared/spike/world.mjs` | One pure module (constants + `integrateMovement` + collision) imported by **both** the Node server and the Vite client. |
| Authoritative tick server | `backend/spike/spikeServer.js` | Standalone WS server on `:3002`, fixed **20 Hz** tick (hrtime accumulator), integrates movement from client **inputs** (never positions), broadcasts snapshots. Reuses **real OtG content**. |
| Net hook (client) | `frontend/src/spike/useSpikeNet.js` | The IWorld seam: sends inputs @20 Hz, applies snapshots, client-side prediction + reconcile, RTT/drift metrics, **offline fallback** to local-only play. |
| Input | `frontend/src/spike/useSpikeInput.js` | WASD + Shift-run + Q/E / pointer-drag camera yaw. |
| Animated character | `frontend/src/spike/RobotModel.jsx` | CC0 Quaternius **RobotExpressive** glTF via `useGLTF`; Idle/Walking/Running **crossfade** by speed, foot-speed-matched, per-instance `SkeletonUtils.clone`. |
| Scene | `frontend/src/spike/SpikeScene.jsx` | Lit low-poly ground + props (also **colliders**), third-person **follow camera**, **world-streaming seam** (props load by area chunk), remote players + enemies interpolated from snapshots, nameplates. |
| Page + HUD | `frontend/src/spike/SpikePage.jsx` | Full-screen `<Canvas>` + DOM **overlay** HUD (the "don't rebuild UI in 3D" rule). |

Wiring: `vite.config.js` proxies `/spike-ws → ws://localhost:3002`, allows the
out-of-root shared import (`fs.allow`), and **dedupes three** (see §4). Route added
to `App.jsx` (`/spike`, unauthenticated). `ws` added to backend deps;
`npm run spike` starts the tick server.

**Run it:** `cd backend && npm run spike` (tick server), then the frontend dev
server, then open `/spike`. With the tick server down, the scene still plays in
OFFLINE local-prediction mode.

---

## 2. What it measured (verified live in-browser)

| Signal | Result | Reading |
|---|---|---|
| **Client frame rate** | **60 fps** | R3F hits the budget for this scene class with headroom. |
| **Server tick cost** | **0.005–0.06 ms / tick** (EMA) | Against a 50 ms tick window, the loop is effectively free; thousands of entities of headroom. |
| **Round-trip (localhost)** | **28–35 ms** | Snappy through the Vite WS proxy. |
| **Prediction drift** | **0.00 m idle, ~0.15 m running** | Shared sim ⇒ client prediction tracks server authority; no rubber-banding. |
| **Snapshot rate received** | **~19–20 Hz** | Matches the tick. |
| **Collision** | Player walked W into the north wall (face z=−13.4, radius 0.55) and **plateaued at z=−12.81** (expected ≈−12.85); world bounds clamp at the corner. | Shared circle-vs-AABB collision is correct and identical on both ends. |
| **Animated glTF** | 463 KB CC0 model, **12 skinned meshes across 3 instances**, idle/walk/run crossfade. | The asset + animation pipeline works in R3F via `useGLTF`/`useAnimations`. |
| **Content reuse** | Server `require()`s `backend/src/data/enemyTemplates.js` and spawns **Ironclad (L1)** + **Pirate (L2)** as live patrolling actors via the real `getEnemyTemplate()` accessor. | Existing OtG content/domain runs **unchanged** behind a real-time loop. |
| **Cross-runtime sim** | `world.mjs` imported by Node (`await import()` across the CJS→ESM boundary) **and** the Vite client. | A single shared sim core is achievable on OtG's two-package split. |

---

## 3. The decision: evolve vs. greenfield vs. hybrid → **HYBRID**

**Why not pure evolve (REST-ify the live world).** The current backend grain is
request/response per action. A walkable real-time world needs a *stateful, long-lived,
fixed-step* loop that owns positions and resolves abilities server-side. You cannot
express a 20 Hz authoritative sim as REST handlers. So the live loop must be new code.

**Why not greenfield (rewrite à la ClaudeCraft's single TS package).** ClaudeCraft
shares `src/sim` by relative import because client+server are one TS package. OtG is
two packages (CJS backend, ESM frontend) with **a lot of proven, reusable value**:
auth, character CRUD, and a deep content/domain layer (enemies, items, factions,
quests, abilities). The spike showed that content layer runs **as-is** behind the
loop (`getEnemyTemplate()` → live actors). Throwing that away to match ClaudeCraft's
layout would be expensive and pointless.

**Why hybrid wins.** The spike demonstrated both halves coexisting cheaply:
- The authoritative tick (`ws` + `setInterval` accumulator) is **~200 lines** and
  touches none of Express/Sequelize. In production it attaches to the same
  `http.Server` (one process, `app.listen` → `new WebSocketServer({ server })`).
- The REST/Sequelize stack stays for what it's good at; the sim stays a **pure
  in-memory object** ticked on a timer (ClaudeCraft's `Sim` has zero HTTP/DB
  knowledge — mirror that).
- Persistence follows ClaudeCraft: **JSONB character-state blob on a 30 s interval +
  on disconnect**, never per-tick. Fits a Sequelize `JSONB` column with zero schema churn.

**This also fits the LOCKED combat decision.** Real-time tab-target / action-RPG is
exactly "cast ability → server validates range/cooldown/cost → resolves cone/projectile."
The spike's input→authoritative-integrate→snapshot loop is that shape; combat math
slots in server-side beside movement. The turns→timers conversion is real: the spike
reinterprets an enemy's 3-"turn" cadence as a 2.4 s real-time cooldown — same data,
new clock.

### R3F vs. vanilla three.js
**Stay on R3F.** DX was excellent: `useGLTF`/`useAnimations`/drei `Grid`/`Html`
made the scene fast, and the existing galaxy-map pipeline + `assetManager` pattern
carried over directly. R3F's component-per-entity model (`<Entity key={id}/>`) is
*more* ergonomic than ClaudeCraft's manual `views: Map<id,View>` create/dispose. No
evidence the browser can't hit the bar here. Keep three@0.169 / fiber@8.17 /
drei@9.114 (React 18 pins). For the P2 lighting stack, use `@react-three/postprocessing`
(`N8AO` + `Bloom` + `ToneMapping`) — the R3F-native equivalent of ClaudeCraft's post chain.

---

## 4. Friction found (bake these into Phase 1)

1. **CJS↔ESM sim sharing is a real seam.** It works two ways: Node loads the ESM sim
   via `await import(pathToFileURL(...))`; Vite needs `server.fs.allow` to import a
   module outside `/frontend`. Keep the shared module **runtime-neutral** (no three,
   no Node, no DOM). For Phase 1, promote `shared/` to a small first-class workspace
   package (`@otg/sim`) consumed by both, rather than reaching across folders.
2. **"Multiple instances of Three.js"** — importing `three/examples/jsm/*`
   (SkeletonUtils for skinned-mesh cloning) pulled a 2nd three copy, which **breaks
   skinned-mesh cloning after a reload**. Fixed with `resolve.dedupe: ['three', …]`
   in `vite.config.js`. Non-negotiable once you load glTF + examples/jsm.
3. **Inputs, not positions.** The server must integrate movement from button flags
   (security). The spike already does this; keep it as the rule.
4. **Interpolation details matter** (from ClaudeCraft, partially applied): re-anchor a
   networked entity's `prevPos` at its *currently-rendered* pose on each snapshot, and
   give distance-throttled entities a per-entity interpolation clock. ~30 lines,
   smooth vs. janky.
5. **Reconnect.** The spike connects once and falls to OFFLINE on drop. Phase 1 needs
   backoff reconnection.
6. (Dev-env note) The headless preview pauses `requestAnimationFrame` on a hidden tab,
   so `useFrame` (and FPS) freeze until interacted with — a harness artifact, not the
   app. `SpikeScene` exposes R3F's `advance()` (`window.__spikeThree`) so frames can be
   stepped deterministically for verification.

---

## 5. Phase-1 plan (what to build next, on this decision)

1. **Promote the sim to `@otg/sim`** (runtime-neutral package): movement, collision,
   entity/zone state, RNG, the tick. Server imports it for the authoritative loop;
   client imports it for prediction/offline. (Generalize `shared/spike/world.mjs`.)
2. **Stand up the authoritative process for real:** attach WS to the existing
   `http.Server`, port the spike tick loop, add auth handshake (reuse JWT), interest
   management (spatial grid, ~radius), and delta snapshots.
3. **Client IWorld seam as a store:** a Zustand/ref `Map<id, Entity>` written by either
   a local tick or `applySnapshot`; `useFrame` lerps `prevPos→pos`. Single-player ships
   on the local path; multiplayer flips the same seam to the net path.
4. **First lit walkable surface (P1/P2):** replace one planet/station surface's tiles
   with a glTF kit (swappable model manifest, mirroring the `*SpriteMap` pattern), then
   add the atmosphere stack (day/night, N8AO, bloom, dynamic lights).
5. **Combat turns→timers (P4 seam, design now):** model abilities as cooldown/resource
   timers resolved server-side; keep stat-driven outcomes. The spike's cooldown
   reinterpretation is the template.
6. **Persistence:** JSONB character-state on a 30 s autosave + on disconnect.

**Open question still parked (don't let it block P1):** multiplayer scale/timing
(co-op parties vs. shards, when). The hybrid + IWorld seam keeps both options open.
