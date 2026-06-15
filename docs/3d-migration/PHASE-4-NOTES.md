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

## P4.3 design — real-time combat (full encounter integration, chosen)
Kills run through the EXISTING reward machinery (loot/quests/achievements/respawn), reusing
the combat math verbatim; only the loop becomes real-time.

**Combatant blocks (the key change).** Every actor carries a real combat stat block:
- Player: `combatService.buildPlayerCombatant(character)` (async, DB) — build ONCE on WS join
  (in realtime/index.js before addPlayer) and hang it on the player as `player.combatant`.
- Enemy: `buildEnemyCombatant(scaledTemplate)` — `generateRandomEnemy()` already returns the
  scaled template, so build the combatant at spawn and store as `enemy.combatant`
  (hp lives in `combatant.stats.health`; the wire `hp/maxHp` mirror it).

**Engagement = a CombatEncounter record.** On first hit between a player and enemies, create a
`CombatEncounter` (status 'active', `encounterType:'random'`, `combatants:[player, ...enemies]`,
`metadata:{ realtime:true }`, turnOrder/currentTurn unused). Track `encounterId` on the player.
As more enemies aggro into the fight, add their combatants to the record. Keep the record's
`combatants` pointing at the SAME in-memory blocks so hp stays in sync.

**Resolution (server-authoritative, reuse the math).**
- Client → `{t:'cast', ability, targetId}`. Server validates: target exists + in range
  (ability.range or melee), ability off cooldown (turns→seconds: store `cooldownUntil` ms),
  stamina/energy cost affordable. Then `calculateDamage(player.combatant, enemy.combatant)` /
  `calculateAbilityDamage(...)`; apply hp; start a cooldown timer.
- Default basic attack = a cheap, short-cooldown ability (always available).
- Enemy AI (extend P4.2): in chase + melee range + off cooldown → `calculateDamage(enemy.combatant,
  player.combatant)` → player hp down.
- Broadcast combat events in snapshots (or a `{t:'fx'}` channel): `{hit, dmg, crit, targetId,
  sourceId, death}` so the client shows damage numbers + health bars.

**Death / finalize.**
- Enemy hp ≤ 0 → mark dead (combatant.stats.health=0), remove the actor; when all the
  encounter's enemies are dead → `save encounter.combatants` then `endEncounter(id, 'won')`
  (distributeRewards/quests/achievements). XP/loot/credits flow through the existing path.
- Player hp ≤ 0 → `endEncounter(id, 'lost')` → respawnService (40% hp, fee) → teleport the
  authoritative player to the respawn location + broadcast.
- Disengage (no combat for ~6s, all enemies out of leash) → `endEncounter(id, 'fled')` to
  release the record (so a fresh fight starts a new encounter).

**Client (P4.3 UI slice).** Soft-target the nearest enemy (Tab / click); basic attack on a
key/click; enemy health bars (drei Html) + floating damage numbers; death/respawn feedback.
Action bar + telegraphs + dodge = P4.4.

**Risks/edge cases to handle:** one active encounter per character (createEncounter guards
this — reuse or bypass), encounter cleanup on disconnect mid-fight (endEncounter 'fled' on
flush), reconciling real-time hp into `encounter.combatants` before endEncounter, and the
turn-based fields (turnOrder/currentTurn) being inert for realtime encounters.

## Deferred to P4.3+
Real-time ability casting + cooldowns (turns→timers), enemy attacks + damage, death/respawn/
rewards (reusing combatService math), the action bar / damage numbers / enemy health bars,
interest management (currently whole-planet), per-IP rate limiting.
