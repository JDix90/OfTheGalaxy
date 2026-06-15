# Phase 4 — living world (build notes)

> Implements PHASE-4-PLAN.md. The planet surface moves onto an **authoritative real-time
> server** with **multiplayer presence** and **living enemies**, on the HYBRID architecture
> the Phase-0 spike chose. Single-player still works (transparent offline fallback).
> Branch: `feat/3d-phase-4`.

## Status
- ✅ **P4.0 — authoritative movement** (the netcode backbone)
- ✅ **P4.1 — multiplayer presence** (other players in your world)
- ✅ **P4.2 — real-time enemies** (server-driven patrol/aggro AI)
- ✅ **P4.3 — real-time combat resolution** (full encounter integration)
- ✅ **P4.4 — action-RPG feel** (ability hotbar, dodge-roll, combat log, damage numbers)
- ⏳ P4.5 — persistence + hardening + MP scale; P4.4b — AoE telegraphs + enemy ability patterns + threat + cast bars

## P4.4 — action-RPG feel (shipped)
- **Ability hotbar**: the `welcome` carries the character's known combat abilities; client
  shows a hotbar (keys **1–9**, click) with cooldown sweeps + stamina. `resolveCast` handles
  enemy-targeted **damage/debuff** and self-cast **heal/buff** (routed by `targetType`), with
  a server-authoritative "must know the ability" check.
- **Dodge-roll**: **Space** → `resolveDodge` grants ~450 ms i-frames + a dash (applied in
  `step`); enemy melee whiffs during i-frames. Independent dodge cooldown + throttle.
- **Combat log** (bottom-right, deduped with ×N) + **floating damage/heal numbers** (red /
  crit-gold / green) at the server-embedded hit position.
- **Adversarial review: 15 findings fixed** (deduped): permanent-i-frames-after-respawn,
  ability-guard empty-array bypass, **separate cast/dodge throttles**, targetType-authoritative
  self-cast routing, client target-validation (no cooldown desync), faster cd poll, log dedupe.
- **Verified**: server combat 7/7 (damage ability, self-cast heal, unknown-ability reject,
  dodge i-frames + whiff + dash) + fix re-checks 4/4 (incl. empty-abilities reject, respawn
  clears i-frames); wire smoke (hotbar delivered, cast/dodge stable); frontend 63/63; builds green.

## P4.3 — real-time combat (shipped, full encounter integration)
Server-authoritative combat reusing the existing math + reward machinery; turns → timers.
- **Combatant blocks**: every actor carries a real combat stat block — player via
  `buildPlayerCombatant` on join, enemy via `buildEnemyCombatant` at spawn. hp lives in
  `combatant.stats.health`.
- **Resolution** (`backend/src/realtime/combat.js`, in-memory, reuses `calculateDamage`/
  `calculateAbilityDamage`/`getTemporaryEffects`/`applyAbilityDebuff`): client `{t:'cast',
  ability, targetId}` → server validates range/cooldown(ms)/stamina → applies damage →
  fx events (carry hit position). Basic attack + damage/debuff abilities. Enemy AI attacks
  players in melee. Stamina regenerates in-world (integer); status effects decay (~1 turn/1.2s).
- **Engagement = a CombatEncounter record** managed by `CombatManager`: engage creates it
  (abandoning any stale `active` first — single-active invariant), win/lost/flee finalizes
  via the real `endEncounter` → `distributeRewards`/quests/achievements (won) or
  `respawnService` (lost). A per-player `_finalizing` mutex serializes finalization; a 5-min
  reaper marks orphaned `active` rows `fled`; combat vitals autosave in `flushPlayer`.
- **Client**: click a hostile to soft-target (target ring) → auto-attacks in range;
  `RemoteEnemies` health bars + a player HP HUD + floating damage numbers (`CombatFx`) +
  a "Defeated → respawning" overlay; `netClient` carries self hp / fx / respawn.
- **Adversarial review: 20 findings fixed** (encounter-orphan reaper, single-active guard,
  finalize mutex/race serialization, permanent-debuff decay, stamina regen + integer-stamina
  DB-type bug, fx hit-position, optimistic enemy hp, cast rate-limit, …).
- **Verified vs the real dev DB**: kill → `won` encounter + rewards distributed; no stacked
  active encounters; integer stamina regen; enemy kills player → real `respawnService`
  respawn (40% hp at a medical center) — 6/6; client netcode unit incl. cast/fx/respawn 5/5;
  frontend 63/63, backend logic 48/48, builds green.

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
