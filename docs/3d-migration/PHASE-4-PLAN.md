# Phase 4 — living world: authoritative server + real-time combat (implementation plan)

> The big one. Phases 1–3 made the planet surface a walkable, lit, populated 3D scene
> driven by a **client-side** sim (`useSurfaceWorld` = LocalWorld). Phase 4 moves the
> world onto an **authoritative real-time server** and rebuilds combat from turn-based to
> **real-time tab-target / action-RPG** (the LOCKED decision — see 3D-MIGRATION-PLAN.md
> "Combat feel"). This doc is the durable plan; read it + PHASE-0-SPIKE-RECOMMENDATION.md
> before writing P4 code.

## 0. What's already de-risked (don't re-litigate)
- **Architecture = HYBRID** (PHASE-0-SPIKE-RECOMMENDATION.md): keep Express/Sequelize/
  Postgres for auth + character/content CRUD; add a long-lived **20 Hz authoritative WS
  sim** alongside it. Not a rewrite, not REST-ified.
- **The spike already proved every hard part**: a 20 Hz hrtime-accumulator tick
  (`backend/spike/spikeServer.js`), inputs-not-positions, a shared runtime-neutral sim
  imported by both server and client (`shared/spike/world.mjs`), client prediction +
  reconcile + offline fallback (`frontend/src/spike/useSpikeNet.js`), and **OtG content
  running unchanged behind the loop** (`getEnemyTemplate()` → live actors). Measured:
  60 fps client, 0.005–0.06 ms/tick, ~30 ms RTT, ~0.15 m drift.
- **The IWorld seam already exists in production**: `frontend/src/world/useSurfaceWorld.js`
  returns a `world` object the scene reads; today it's the single-player LocalWorld. P4
  adds a `NetWorld` behind the same shape — single-player still works, MP flips the seam.
- **The combat MATH is already reusable server-side** (see §3).

## 1. Target architecture
```
Browser (R3F)                         Node process (one app.listen)
─────────────                         ──────────────────────────────
SurfaceScene  ── renders ──▶ entities   Express/Sequelize (REST)  ← auth, CRUD, content
   ▲                                     http.Server
useSurfaceWorld (IWorld)                   └─ WebSocketServer (attached, JWT handshake)
   ├─ LocalWorld  (offline / SP)              └─ WorldManager
   └─ NetWorld  ── inputs @20Hz ─────▶            └─ per-zone authoritative Sim (20 Hz)
        ◀── snapshots (interest-scoped) ──            ├─ movement  (shared sim, integrate)
   client prediction + reconcile                      ├─ enemies   (AI, from enemyTemplates)
   (same shared sim module)                           └─ combat    (reuses combatService math)
                                                    JSONB character-state autosave (30s + disconnect)
```
- **Movement** is predicted on the client and authoritative on the server via the **same**
  shared sim (`shared/sim/surface.mjs` integrate/collision) → ~0 drift.
- **Combat** is **server-authoritative only** — the client never resolves damage; it sends
  "cast ability" intents, the server validates + resolves with the existing math, and the
  client just renders results (damage numbers, telegraphs, VFX). So combat math does **not**
  need to become runtime-neutral; it stays server-side CJS in the authoritative process.

## 2. Reuse vs. rebuild (from the combat-system survey)
**REUSE as-is, server-side (the authoritative sim `require()`s these):**
- Damage/hit/crit/dodge/defense math — `backend/src/services/combatService.js`
  `calculateDamage` (~L862), `calculateAbilityDamage` (~L1393).
- Stat scaling + caps — `backend/src/utils/{abilityScaling,derivedStats,diminishingReturns}.js`.
- Ability definitions + effects — `backend/src/data/abilityDefinitions.js`.
- Status/buff/debuff application — `applyAbilityBuff/Debuff` (~L1529).
- Rewards/victory/defeat — `endEncounter` (~L1945), `distributeRewards` (~L1974),
  `respawnService`, quest-objective completion.
- Enemy content — `backend/src/data/enemyTemplates.js` (`getEnemyTemplate`).

**REBUILD as real-time (turn-loop-specific):**
- `advanceTurn` / `turnOrder` / `currentTurn` → continuous tick; no turns.
- Cooldowns & status durations: **turns → seconds** (the spike's `3 turns → 2.4 s` template).
- Enemy AI: today `executeEnemyTurn` just "always attack" (~L1902) → continuous decision
  loop (acquire target by threat/proximity, approach, cast on cooldown, dodge telegraphs).
- Initiative/sequential resolution → parallel, server-clocked.
- Frontend polling (`combatSlice.processTurn`, `CombatView` 300 ms poll) → WS events.
- Stamina/energy economy → retune for real-time cadence.

## 3. Incremental sub-phases (each ships value + is verifiable; netcode de-risked before combat)

### P4.0 — Authoritative movement (the netcode backbone, no gameplay change)
Promote the spike into production, movement only.
- **Sim package**: generalize `shared/sim/surface.mjs` (+ the spike's `world.mjs`) into one
  runtime-neutral module (entities, zones, RNG, tick). Server + client both import it.
- **Server**: a `WorldManager` + per-planet `Sim`, WS attached to the existing `http.Server`
  (`new WebSocketServer({ server })`), **JWT handshake** reusing the auth token, loads the
  player's character onto the planet's authoritative world. Port the spike's tick/accumulator.
- **Client**: add `NetWorld` behind `useSurfaceWorld` (send inputs @20 Hz, apply `self`
  snapshot, predict + reconcile with the shared sim). Keep LocalWorld as the **offline
  fallback** (reuse `useSpikeNet`'s offline pattern + add backoff reconnect).
- **Ship**: the same single-player surface, but your position is now server-owned/validated.
  *Invisible to the player; the whole real-time backbone is now real.*
- **Verify**: drift metrics ~0; walking is rejected through walls server-side; offline still
  works; reconnect resumes.

### P4.1 — Multiplayer presence (other players in your world)
- Interest management (spatial grid, ~radius), **delta snapshots**, remote-player entities
  interpolated `prevPos→pos` (re-anchor on each snapshot — friction note #4), nameplates
  (reuse `Nameplate.jsx`), the existing instanced-proxy path for distant players.
- **Ship**: see other players walk the same planet in real time. The "it's alive" moment.
  Still zero combat changes.

### P4.2 — Real-time enemies on the surface
- Spawn enemy actors in the authoritative world from `enemyTemplates` (spike-proven).
  Server-driven AI v1: patrol → aggro radius → approach. Render with the **Enemy_* glTF
  already wired in the manifest** (`npc.random_encounter` roster) via the existing actor/LOD
  pipeline.
- **Ship**: living, patrolling enemies that notice and chase you. No damage yet.

### P4.3 — Real-time combat resolution (the core rebuild)
- **Cast loop**: client sends `castAbility(id, target|direction)` → server validates
  range/cooldown/cost → resolves with the **reused** `calculateAbilityDamage`/`calculateDamage`
  → applies HP/status → broadcasts result events (hit, damage, death) interest-scoped.
- **turns→timers**: abilities carry real cooldowns (s) + stamina/energy cost; statuses tick
  in seconds on the server clock.
- **Aiming**: soft-target/reticle (face target); abilities as server-resolved cones/
  projectiles (no client hitscan). **Dodge-roll** (i-frames) + **AoE telegraphs** (server
  spawns a telegraph that resolves after a delay; client renders the decal).
- **Enemy AI v2**: target by threat/proximity, cast on cooldown, react to telegraphs.
- **Death/rewards**: when HP→0, reuse `endEncounter`/`distributeRewards`/`respawnService`
  and quest-objective completion — triggered by the sim, not a turn loop.
- **Transition**: surface encounters now resolve **in-world** instead of routing to the 2D
  `/game/combat`. Keep the turn-based screen available (e.g. `/game/combat`) as a fallback
  during rollout, then retire it.
- **Ship**: kill an enemy in real time on the surface, get XP/loot, quest updates.

### P4.4 — Action-RPG feel + WoW UX vocabulary
- Hotbar/action bar on cooldowns, cast bars, damage numbers, threat/aggro indicators,
  combat log, AoE telegraph decals, dodge feedback. VFX: muzzle flashes/impacts/ability FX
  (reuse `particleEngine`/`ParticleField`). Retune stamina/energy + per-level power for the
  faster cadence.

### P4.5 — Persistence + hardening
- JSONB character-state autosave (30 s + on disconnect; never per-tick) on a Sequelize JSONB
  column. Reconnect/backoff, server-validates-everything (anti-cheat), interest-scoped combat
  events, basic load test. Decide MP scale (co-op parties vs. shards) — still parked.

## 4. Key risks & mitigations
- **Netcode correctness** → shared sim for prediction (proven); re-anchor interpolation;
  reconcile on snapshot ack. De-risk in P4.0/4.1 *before* combat.
- **Security** → inputs not positions (rule); server validates every ability
  (range/cooldown/cost/LoS); never trust client damage.
- **Scope creep** → ship P4.0–4.2 (no damage) first; they're independently valuable and make
  P4.3 safe. Don't build the action bar before resolution works.
- **CJS↔ESM seam** → keep the shared sim runtime-neutral (no three/Node/DOM); promote
  `shared/` to a first-class `@otg/sim` package (friction note #1).
- **three duplication** → keep `resolve.dedupe:['three']` (friction note #2).
- **Combat math drift** → the authoritative sim imports the *existing* combatService math
  verbatim; no reimplementation, so single-source-of-truth for outcomes is preserved.

## 5. Recommended first increment
**P4.0, narrowed**: attach a WS server to the existing `http.Server` with a JWT handshake,
stand up one per-planet authoritative `Sim` that integrates movement from inputs via the
shared sim, and add a `NetWorld` behind `useSurfaceWorld` with prediction + offline
fallback. No enemies, no combat, no other players yet — just "your movement is now
server-authoritative, and it still feels identical." That single step turns the whole
hybrid architecture from designed-for into real, and everything else (presence, enemies,
combat) builds on it.

## 6. Touch list (anchors)
- Promote: `shared/sim/surface.mjs` + `shared/spike/world.mjs` → unified `@otg/sim`.
- New (server): `backend/src/realtime/{wsServer,worldManager,sim,combat}.js`, attached in
  `backend/src/server.js` (or wherever `app.listen`/`http.Server` lives).
- New (client): `frontend/src/world/NetWorld.js` (behind `useSurfaceWorld`), reuse patterns
  from `frontend/src/spike/useSpikeNet.js`.
- Reuse (server): `backend/src/services/combatService.js` math, `backend/src/utils/*`,
  `backend/src/data/{abilityDefinitions,enemyTemplates}.js`, `respawnService`.
- Retire later: turn-based `frontend/src/features/combat/*`, `combatSlice` polling,
  `POST /combat/:id/action|process-turn` (keep models/rewards).
```
Today: 3D surface (client sim) + 2D turn combat
  → P4.0 authoritative movement     (netcode backbone; invisible)
  → P4.1 multiplayer presence        (others in your world)
  → P4.2 real-time enemies           (living, no damage)
  → P4.3 real-time combat resolution (the rebuild; in-world kills)
  → P4.4 action-RPG feel + UX vocab
  → P4.5 persistence + hardening + MP scale decision
```
