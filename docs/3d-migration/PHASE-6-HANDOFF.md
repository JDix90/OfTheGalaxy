# Phase 6 Handoff — Tutorial → 3D real-time combat (make the spaceport real-time)

> **STATUS: COMPLETE** (branch `feat/combat-migration-phase-6-tutorial`, PR pending merge).
> 6a backend + 6a frontend + 6b tutorial are all implemented, adversarially reviewed (6 lenses,
> 4 fixes applied), and verified (90 DB-free logic tests green; frontend + backend builds green).
> The only thing left is an **authed live play-test** of the end-to-end onboarding flow (the
> realtime/authed path can't be verified headlessly) and then **Phase 7** (retire the turn-based
> route — the offline fallback in `TutorialOverlay` COMBAT_INTRO is the last consumer to remove).
> The sections below are the original plan, kept for reference.

Resume doc for a fresh session. Pairs with the living tracker in
`docs/3d-migration/COMBAT-MIGRATION-PLAN.md` (read that first for the full picture).

## Where we are

Combat migration **Phases 0–5 are merged to `main`** (PRs #10, #11, #12, #13, #14). Phase 6 is
in progress on branch **`feat/combat-migration-phase-6-tutorial`**.

**Phase 6 = make the tutorial's combat real-time 3D.** The user chose (over alternatives) to
**make the spaceport submap a real-time world** so the tutorial fight happens in-place. Split into:
- **6a — real-time spaceport infrastructure** (movement + presence + the real-time combat layer).
  This also makes the Phase-5 NPC/POI combat work in the spaceport.
- **6b — tutorial drone + combat-step redesign** on top of 6a.

### Why this is feasible (the key discovery)
Client and server build **identical** submap sims via the shared `shared/sim/submap.mjs`
`submapToMapData()` (handles dungeon grids AND `collisionMap.cells` for spaceport/city). The client
(`createSubmapSimWith`) and server (`WorldManager.getOrCreateSubmapWorld`) both call it, so
prediction reconciliation works for the spaceport with **zero alignment work**. The dungeon
real-time path generalizes cleanly.

## DONE in this branch (committed as WIP) — 6a BACKEND, verified

- `backend/src/realtime/PlanetWorld.js`: added an `ambient` option (default true). Hub submaps
  pass `ambient:false` → no initial spawn + no ambient respawn, **but `spawnScriptedEnemy` still
  works** (NPC/POI/quest/tutorial). The respawn loop in `step()` is gated on `this.ambient`.
- `backend/src/realtime/WorldManager.js`: `getOrCreateDungeon` generalized to
  **`getOrCreateSubmapWorld(subMapId, opts)`** — `isDungeon = subMap.type === 'dungeon'`; dungeons
  populate (`ambient:true`, `zone.type:'dungeon'`), hub submaps are safe (`ambient:false`,
  `zone.type:subMap.type`). `getOrCreateDungeon` kept as a back-compat alias.
- `backend/src/realtime/index.js`: WS join routes **any** `subMapId` (not just dungeons) to
  `getOrCreateSubmapWorld`.
- `backend/tests/unit/logic/ambientSpawns.test.js`: new test — `ambient:false` spawns 0 enemies
  initially + on respawn, but `spawnScriptedEnemy` still adds one. **79 logic tests green.**

Verified DB-free (logic suite). No DB-backed test needed for this slice (the realtime world build
goes through ESM sim modules; covered by the live-DB harness pattern below if desired).

## TODO — 6a FRONTEND (the bulk; mechanical reuse, but touches the stabilized `SubMapView3D`)

Goal: render the spaceport (`subMap.type === 'spaceport'`) as a real-time world; keep all other
submaps local. Patterns to copy from working files:
- `frontend/src/pages/DungeonView3D.jsx` — netOptions (`token`/`characterId`/`onStatus`),
  `useDungeonWorld`, combat-state polling (`cdSnap`/`log`/`hp` via `worldRef.current.combat()` etc.),
  `castAbility`, keybinds (1–9 / Space), `combatTarget`.
- `frontend/src/components/submap3d/DungeonScene.jsx` — the real-time trio
  (`RemotePlayers`/`RemoteEnemies`/`CombatFx`) + `PlayerActor` composition.
- `frontend/src/pages/PlanetSurface3D.jsx` — `onAttackNpc` (NPC `onAttack` → `requestSpawn`),
  `<CombatToasts>`, `<ConsumableQuickslot>`, the combat HUD block (health bar + hotbar w/ cooldown
  sweep), and the `combat`/`hotbar`/`castCd`/`log` 100ms poll.

Concrete steps:
1. `frontend/src/components/submap3d/SubmapScene.jsx`: accept `realtime`, `combatTarget`,
   `onCombatTarget` props; when `realtime`, also render `<RemotePlayers world={world}/>`,
   `<RemoteEnemies world={world} targetId={combatTarget} onTarget={onCombatTarget}/>`,
   `<CombatFx world={world} targetId={combatTarget} onClearTarget={()=>onCombatTarget(null)}/>`
   (imports from `../surface3d/...`). PlayerActor already renders.
2. `frontend/src/pages/SubMapView3D.jsx`:
   - `const isRealtime = !!subMap && subMap.type === 'spaceport';` (a set, so it's easy to extend
     to city/market later).
   - **Both** world hooks must be called unconditionally (React rules); null-guard the inactive one:
     `const rtWorld = useDungeonWorld(isRealtime ? subMap : null, isRealtime ? sim : null, netOptions);`
     `const localWorld = useSubmapWorld((!isRealtime && is3D) ? subMap : null, sim);`
     `const worldRef = isRealtime ? rtWorld : localWorld;`
   - `netOptions` (memoized): `{ enabled: isRealtime && import.meta.env.VITE_REALTIME !== 'false', token: getAuthToken(), characterId, onStatus: setNetStatus }`.
   - When realtime: combat state (`combatTarget`, `cdSnap`, `log`, `hp`) + 100ms poll; `castAbility`
     + keybinds (1–9 / Space); pass `realtime`/`combatTarget`/`onCombatTarget` to `<SubmapScene>`;
     render the combat HUD + `<CombatToasts world={worldRef}/>` + `<ConsumableQuickslot world={worldRef} characterId={...} enabledRef={inputEnabledRef}/>`; pass `onAttack={onAttackNpc}` to `NPCInteractionMenu` (re-homes spaceport NPC "Attack").
   - `onAttackNpc` mirrors PlanetSurface3D: `worldRef.current?.requestSpawn?.({kind:'npc', npcId})`,
     return true if online (else fall back to legacy).
   - Keep the local path (city/market/civic/building_interior) **unchanged**.
3. Build-verify (`cd frontend && npx vite build`). Live behavior (spaceport realtime movement,
   presence, NPC attack → in-world fight) needs an **authed play-test** — can't be verified headlessly.

## TODO — 6b (tutorial)

- **Tutorial venue is `SubMapView3D` (the spaceport submap)** — now real-time after 6a.
- Replace `TutorialOverlay`'s combat launch (`startEncounter('scripted',['droid_security'])` + navigate
  to `/game/combat`) with a `spawnScriptedEnemy` of the tutorial drone in the spaceport. Tag it (e.g.
  `tutorial:true`) so the kill is detectable.
- **The 3D `finalize` must emit `COMBAT_ENDED {isTutorial:true}`** — today the ONLY emitter is the
  turn-based `VictoryScreen.jsx:33-45`, so a 3D tutorial fight would stall at `COMBAT_INTRO`/`STARTED`.
  Add a WS `t:'combat_done'` (or reuse the Phase-2 reward path) from `CombatManager.finalize` when the
  killed enemy is tutorial-tagged → client re-emits `tutorialEventBus.emit(COMBAT_ENDED,{isTutorial})`.
- **Redesign the combat steps for 3D.** `frontend/src/components/tutorial/TutorialOverlay.jsx`
  lines ~98–135 define COMBAT_INTRO / COMBAT_STARTED / COMBAT_TURN_ORDER_EXPLAINED /
  COMBAT_ACTION_MENU_EXPLAINED / COMBAT_TARGETING_EXPLAINED — all anchored to turn-based card UI
  (`combat-turn-order`, `combat-action-menu`, `combat-enemy-combatant`). Re-theme to 3D: "click the
  drone to target", "press 1 to use your ability", "press Space to dodge". The state enum
  (`tutorialStateMachine.js:10-117`) and the `COMBAT_COMPLETE → VENDOR_INTRO` chain stay intact.
- **Review EVERY tutorial step for 3D coherence** (the user explicitly asked): movement, NPC menu,
  dialogue, vendor (sell droid_parts / buy medpac), inventory, **healing/medpac → now the
  ConsumableQuickslot / `t:'item'` path**, HUD, spaceport exit, then the planet-surface section.
- **Spaceport death/respawn**: `buildEncounterMeta` (combat.js) treats non-dungeon zones as `'random'`
  with no respawn metadata → a spaceport death would route to the surface respawn path (wrong coord
  through the submap sim). Extend `buildEncounterMeta`/`_respawn` to handle hub-submap zones (respawn
  at the submap entrance, like the dungeon fix). Keep the tutorial drone weak + clamp player HP so a
  first-timer can't die.
- **Shared-world instancing**: the spaceport real-time world is shared; the tutorial drone +
  aggro-suppression must be scoped to the tutorial player (instanced) or it leaks to others.
- Keep the OLD turn-based route as a fallback (its removal is **Phase 7**).

Key tutorial files: `tutorialStateMachine.js`, `tutorialEventBus.js`, `tutorialTargetRegistry.js`,
`TutorialOverlay.jsx`, `DialogueInterface.jsx` (emits `COMBAT_INTRO` at ~:785), backend
`tutorialService.js` / `tutorialDialogueService.js`, `content/tutorial/golden_path.json`,
`models/TutorialProgress.js`.

## Project conventions (for the resuming session)

- **Verification**: backend logic tests `cd backend && npm run test:logic` (DB-free, run locally).
  DB-backed tests live in `backend/tests/unit/services/*.test.js` and **run in CI only** (no local
  test DB — `jefe` can't createdb). For local confidence, write a throwaway harness under
  `backend/scripts/_*.js` with `process.env.NODE_ENV='development'` against the live dev DB
  (createTestUser/createTestCharacter from `tests/setup/testHelpers`, clean up after), then `rm` it.
  Frontend: `cd frontend && npx vite build` (+ `/submap-test` and preview tools for visuals).
- **Quest objectives require `id`, `type`, AND `description`**; `Quest` requires `questType`.
- **CI**: pushing the PR runs `backend-tests` (`npm test -- --coverage`) + `frontend-tests`. Don't
  write DB-backed tests that depend on seeded planets (the test DB isn't seeded — e.g. `solenne`
  has no mapData there; use the dungeon-entrance / direct paths instead).
- **Git**: branch off `main`; commit only when asked; end commit messages with the
  `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>` line; PR bodies end with the
  Generated-with-Claude line. The user merges PRs themselves, then says "proceed".
- The live dev DB is reachable as user `jefe` (the running backend uses it). Sinkport/solenne/caldon/
  drydock have submaps; sinkport spaceport submap id is `sinkport_sinkport_city_spaceport_spaceport`.

## Resume checklist
1. `git switch feat/combat-migration-phase-6-tutorial` (the WIP backend is the latest commit).
2. Do 6a frontend (above) → build → commit.
3. Do 6b (tutorial) → verify → commit.
4. Open the PR (title "Combat migration Phase 6: real-time spaceport + 3D tutorial combat"),
   confirm CI green, update the tracker + memory, hand to the user to merge.
