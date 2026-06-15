# Phase 4 — living world (build notes)

> Implements PHASE-4-PLAN.md. The planet surface moves onto an **authoritative real-time
> server** with **multiplayer presence** and **living enemies**, on the HYBRID architecture
> the Phase-0 spike chose. Single-player still works (transparent offline fallback).
> Branch: `feat/3d-phase-4`.

## Status
- ✅ **P4.0 — authoritative movement** (the netcode backbone)
- ✅ **P4.1 — multiplayer presence** (other players in your world)
- ✅ **P4.2 — real-time enemies** (server-driven patrol/aggro AI; no damage yet)
- ⏳ **P4.3 — real-time combat resolution** (next)
- ⏳ P4.4 — action-RPG feel / UX vocab · P4.5 — persistence + hardening + MP scale

## Architecture (as built)
```
Browser (R3F)                          Node (one app.listen / http.Server)
SurfaceScene ── renders ──▶ entities    Express/Sequelize (REST)  ← auth, CRUD, content
useSurfaceWorld (IWorld)                http.Server
  ├─ LocalWorld (offline/SP)              └─ WebSocketServer (path /realtime, JWT handshake)
  └─ NetClient ── inputs@20Hz ─────▶          └─ WorldManager (20Hz tick, hrtime accumulator)
       ◀── snapshots ──                          └─ PlanetWorld (players + enemies, shared sim)
   prediction + input-replay reconcile        30s autosave + on-disconnect flush
```
- **Movement**: predicted on the client, authoritative on the server, both via the SAME
  `shared/sim/surface.mjs` → reconcile correction ≈ 0.
- The realtime world attaches to the existing `http.Server` (no new port); opt out with
  `REALTIME_ENABLED=false` (server) / `VITE_REALTIME=false` (client).

## Files
```
backend/src/realtime/
  index.js        # attachRealtime(server): WS, JWT+ownership+planet-match handshake, input routing
  WorldManager.js # 20Hz tick loop, per-planet world lifecycle, snapshots, 30s autosave, caps
  PlanetWorld.js  # one planet: players + enemies; movement integrate; enemy patrol/aggro AI
  planetData.js   # load a planet's mapData (+tileMap) for the sim (mirrors the REST path)
backend/src/server.js          # app.listen → http.createServer + attachRealtime; awaited shutdown flush; morgan skips /realtime
frontend/src/world/
  netClient.js    # inputs@20Hz, input-replay reconcile, remotes+enemies tracking, offline + backoff reconnect
  useSurfaceWorld.js  # layers NetClient over LocalWorld (prediction + offline persist)
frontend/src/components/surface3d/
  RemotePlayers.jsx   # other players (robot tinted by color, interpolated, nameplate)
  RemoteEnemies.jsx   # server enemies (alien glTF, hostile nameplate, interpolated)
frontend/src/pages/PlanetSurface3D.jsx  # net wiring + connection-status pill
frontend/vite.config.js                 # /realtime WS proxy → :3001
frontend/tests/unit/netClient.test.js   # client netcode unit tests
```

## Protocol (ws path `/realtime?token=<JWT>`)
- client → `{t:'join', characterId, planetId}` → server validates ownership + that the
  character is actually on that planet (closes a travel-cost bypass) → `{t:'welcome', you,
  spawn, color, tickHz}`.
- client → `{t:'input', f,b,l,r,run,yaw, seq, ct}` (flags + camera yaw only; never positions).
- server → `{t:'snap', tick, serverMs, ack, actMs, self, players[], enemies[], n}` @20Hz,
  interest = whole planet for now.

## Security / robustness (from an adversarial review — 17 findings fixed)
No token in logs (morgan skip), WS `maxPayload` + per-message size + 25ms input flood guard,
origin allowlist (prod), 10s join timeout, world/player caps, `_loading` cleanup on failed
planet load, awaited disconnect + shutdown persistence, fixed-timestep input replay, reconnect
timer hygiene + stale-ack watchdog, yaw normalization.

## Verification (all green)
- **Server smoke** (real dev DB): auth ±, ownership ±, planet-match, 20Hz snapshots,
  server-authoritative movement (10.7u) — and **presence** (2 chars on solenne see each
  other; updates on leave) — and **enemies** (spawn/patrol/chase 8u→0.1u; live snapshots
  carry name/level/hp).
- **Client netcode unit** (vitest): handshake, input-replay reconcile (fixed dt), remotes,
  offline — 4/4.
- **No regressions**: frontend 62/62, backend logic 48/48, supertest `/health` 200, builds green.

## To run online (live page)
Restart the backend so it picks up `/realtime` (`cd backend && npm run dev`); the frontend
proxies `/realtime` → :3001. The surface then shows an **Online** pill; with the server down
it shows **Offline** and plays locally (single-player). `/surface-test` stays local (no auth).

## Deferred to P4.3+
Real-time ability casting + cooldowns (turns→timers), enemy attacks + damage, death/respawn/
rewards (reusing combatService math), the action bar / damage numbers / enemy health bars,
interest management (currently whole-planet), per-IP rate limiting.
