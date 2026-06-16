# Combat System Migration Report — Of the Galaxy

## Migrating player-facing combat to the real-time 3D engine (while preserving old-system capabilities)

> Produced via a multi-agent code audit (8 parallel subsystem audits) + an adversarial verification pass that re-read the load-bearing files. All file:line refs were checked against the working tree on 2026-06-15. Goal: make the **server-authoritative real-time 3D combat** the single player-facing combat engine, while preserving every reward / XP / quest / death / inventory / tutorial capability the old systems own. **Nothing is deleted before its capability is mapped and re-homed.**

---

## Migration Status (living tracker)

| Phase | Scope | Status |
|---|---|---|
| **0 — Instrumentation & guardrails** | telemetry, `COMBAT_3D_ONLY` flag, cross-engine guard | ✅ **Done** (PR #10) |
| **1 — S1 backend correctness** | dungeon encounterType/subMapId, dungeon-aware respawn, level-up combatant refresh | ✅ **Done** (PR #10) |
| **2 — 3D combat UX** | reward toast, death/medical-fee toast, mid-session hotbar refresh (health bars / damage numbers / hotbar cooldowns / target ring already shipped in P4.3/4.4) | ✅ **Done** (PR #11) |
| **3 — Consumables + regen in 3D** | WS `t:'item'` → in-world `useItem`, HTTP `useItem` routes in-world for live players, consumable quickslot (Q), in-tick OOC health regen | ✅ **Done** (PR #12) |
| **4 — Re-home random encounters** | ambient in-world respawn (faction pools + level-blend + escort escalation); removed the turn-based dual-engine on the 3D surface | ✅ **Done** (PR #13) |
| **5 — Re-home NPC / POI / quest combat** | `'npc'` enum fix + server-authoritative `spawnScriptedEnemy` (NPC/POI/quest) + keystone (tagged + enemyType objective crediting) | ✅ **Done** (PR #14) |
| **6 — Tutorial → 3D scripted fight** | make the spaceport real-time, then tutorial drone + 3D combat-step redesign (old route kept as fallback) | ✅ **DONE + play-test-confirmed** (branch `feat/combat-migration-phase-6-tutorial`, PR #16) — 6a real-time spaceport + 6b 3D tutorial drone. Adversarially reviewed (6 lenses, 4 fixes) + 2 play-test fixes (spaceport movement: `spawnFor` generalized to hub submaps; distant-skyline backdrop). Movement, proximity combat, and the drone fight verified working in the authed build. 93 logic tests green. Deferred follow-ups (NOT combat-migration scope) in `PHASE-6-FOLLOWUPS.md`: quest `collect`-objective item-spawn gap + skyline polish. See `PHASE-6-HANDOFF.md` |
| **7 — Retire turn-based UI** | flip flag, remove old layer; keep the shared funnel | ✅ **DONE** (7a PR #19, 7b PR #20, 7c PR pending) — **decisions:** combat is 3D-only; when realtime is offline, combat triggers show a graceful "needs a live connection" message (no turn-based fallback); executed STAGED (gate → delete). **7a DONE (this branch):** frontend `COMBAT_3D_ONLY` flag (`config/combat.js`, default ON; `VITE_COMBAT_3D_ONLY=false` reverts) gates the three offline fallbacks (NPC attack / POI combat / TutorialOverlay COMBAT_INTRO) → graceful message instead of `/game/combat`. Turn-based UI/engine now DORMANT (online combat unaffected — gates fire only after the 3D handler returns false). **7b DONE (PR pending, branch `feat/combat-migration-phase-7b-delete-turnbased`):** deleted the turn-based UI (`CombatView` + `features/combat/*` incl. `VictoryScreen`, the `/game/combat` route), the frontend modules (`combatSlice`, `combatApi`, `EncounterDialog`, `dungeonCombatTrigger`), the dormant fallback blocks in the 3 menus (now an unconditional graceful message), the combat triggers in the 2D fallback pages (`PlanetSurface.jsx`/`SubMapView.jsx`), and the backend HTTP entry (`combatController`, `combatRoutes`, the `/api/combat` mount, the integration test). adversarially reviewed (2 findings fixed: a backend defect where `/api/pois/interact {actionType:'combat'}` still reached `handleCombatPOI`→`createEncounter`, persisting a non-realtime active encounter that suppressed the AUTHORITATIVE realtime record for up to `FRESH_TURNBASED_MS` — now `handleCombatPOI` is removed + a server-side guard rejects a `'combat'` interaction; plus dead `isOnCombat`/`/game/combat` refs cleaned from `TutorialOverlay`). build + 104 logic tests green; the shared funnel + pure math + realtime engine untouched. `combatService.createEncounter` now has ZERO live callers (only the DB tests). **7c DONE (PR pending, branch `feat/combat-migration-phase-7c-cleanup`):** deleted the now-dead `combatService` turn-based methods (`createEncounter`/`executeAction`/`executeAttack`/`executeDefend`/`executeUseItem`/`executeAbility`/`executeFlee`/`processEnemyTurns`/`advanceTurn`/`executeCompanionTurn`/`processStatusEffects`/`executeEnemyTurn`/`checkVictoryConditions`/`getEncounterState`/`rollInitiative`/companion builders) — **combatService.js 2425→1083 lines**; trimmed `combatService.test.js` to the kept `buildPlayerCombatant` suite; dropped the obsolete `createEncounter('npc')` test from `realtimeCombat.test.js`. `createEncounter` now has ZERO references; all 8 realtime-called methods verified present. The shared funnel + pure math (`endEncounter`/`distributeRewards`/`updateQuestCombatObjectives`/`calculateDamage`/`calculateAbility*`/`applyAbility*`/`build*Combatant`/`getTemporaryEffects`) + salvaged `encounterService.getPlanetEnemyTypes` are untouched. **The player-facing combat migration is COMPLETE: all combat is real-time 3D; the turn-based layer is fully removed.** |
| 8 — Faction rep + polish (flagged) | rep-on-kill (MP-aware), enemy abilities/telegraphs, `defeat_boss` hook, companion actor | ⬜ Optional |

**Decisions locked so far:**
- **O3 (dungeon respawn destination): respawn at the dungeon ENTRANCE, staying in the dungeon** (implemented in Phase 1) — `currentLocation` keeps its `subMapId`; no eject-to-surface.
- **O2 (random-encounter pacing after conversion):** ambient hostiles maintain a danger-scaled population (`clamp(2 + ⌊danger/2⌋, 2, 8)`, +2 while escorting) that trickles back one every 8 s; enemies scale to `max(danger, avg player level)` and draw from the planet's faction pool. `encounterService` is **salvaged, not deleted** (Phase 4 reuses `getPlanetEnemyTypes`; full removal is deferred to Phase 7 with the rest of the turn-based layer).

**Still open (need a product call before their phase):** O1 faction-rep policy/deltas (Phase 8) · O2 random-encounter pacing after conversion (Phase 4) · O4 companion/escort combat in 3D — parity or drop? (Phase 5/8) · O5 enemy abilities/boss behavior (Phase 8) · O6 `defeat_boss` achievement hook (Phase 8).

**Carried-forward follow-ups:** _(none open)_ — the mid-session hotbar UI refresh deferred from Phase 1 was completed in Phase 2 (server pushes `t:'hotbar'` after a level-up; client adopts it).

**Phase 5 notes:** combat objectives carry `target`+`count` but **no location** (only the quest's `startLocation: {planet, area}`), so quest combat is wired without content edits: when the player is on the quest's planet and a `defeat*` objective is the current step (prior steps done), the server spawns `count` enemies **near the player**, named after `target` and tagged `questId`/`objectiveId`; the keystone credits that exact objective on kill. Trade-off (noted): quest enemies appear near the player rather than at the named area (e.g. "the palace") — a proper location/submap link is future content work. Spawns are **server-authoritative** (client sends only a reference id; server validates active-quest/sequence/planet/once + a 30-enemy/world cap). Deferred **multiplayer hardening** (inherent to the shared-world model, see §6): quest-tagged enemies are kill-stealable (no false credit, but stealable) and the spawn cap is a per-planet grief lever — a per-player spawn budget / instanced quest enemies would close these. Scripted spawns are visible to all players on the planet.

**Phase 2 notes:** much of the original §4.8 UX was already shipped in P4.3/4.4 (enemy health bars via `Nameplate`, floating damage numbers via `CombatFx`, the red target ring, hotbar cooldown sweep, combat log). Phase 2 added the genuinely-missing victory/death feedback as **non-blocking toasts** (`CombatToasts`, fed by new `t:'reward'` + enriched `t:'respawn'` WS messages) plus the mid-session hotbar push. Deferred polish (optional, not blocking): screen-shake / hit-flash on player-taken crits.

---

## 1. Current System Inventory

There are **two live combat engines**, **one shared finalization funnel**, and **one dead-but-shipped path**.

### 1A. OLD 2D turn-based "card" combat (`features/combat/CombatView`)
- **What:** server-authoritative *turn-based* combat. All logic in `backend/src/services/combatService.js`; the frontend is a thin REST client (`frontend/src/state/combatSlice.js`, `frontend/src/features/combat/CombatView.jsx`). An encounter is a `CombatEncounter` row (JSONB `combatants`/`turnOrder`/`metadata`, status `active|won|lost|fled`).
- **Where:** `combatService.createEncounter` (`combatService.js:27`), `executeAction`/`advanceTurn` (`:1654`), `endEncounter` (`:1945`), `distributeRewards` (`:2176`); `combatRoutes.js`, `combatController.js`. Single frontend route `App.jsx:200` → `CombatView`.
- **Entered via:** `useCombatStore.startEncounter` → `combatApi.startEncounter` (POST `/api/combat/start`) → `navigate('/game/combat/:encounterId')`. The one route serves **random, POI, NPC, quest, 2D-dungeon, and scripted-tutorial** combat, distinguished only by an `encounterType` string.
- **Does:** speed-based initiative, recursive auto-enemy turns, `calculateDamage` (accuracy → dodge → crit → `def/(def+50)` reduction → shield), `use_item` consumables, victory/defeat, `endEncounter` → rewards/quests/respawn. `VictoryScreen.jsx` reads `encounter.metadata.rewards` and shows level-up.

### 1B. OLD random encounters (`encounterService` + `EncounterDialog`)
- **What:** a movement-driven RNG roll — *not* its own engine; it produces a turn-based encounter.
- **Where:** `encounterService.js:160` (`checkRandomEncounter`), exposed via `combatController.checkEncounter` (POST `/api/combat/check-encounter`, `combatController.js:141`); frontend `combatApi.checkEncounter`.
- **Entered via:** on movement, surface pages poll `checkEncounter`; on `shouldTrigger`, `EncounterDialog` opens; **Fight** → `startEncounter('random')` → `/game/combat`.
- **Does:** `chance = 0.10 + dangerLevel*0.03 + level*0.01` (×2 with an active escort quest, cap 0.8), a **server-side 10s in-memory per-character cooldown** (`encounterService.js:11,167-172`), and escort-quest detection — generates 1–3 enemy template IDs. **Dead code in the same file:** `calculateEncounterChance`, `shouldTriggerEncounter`, `generateRandomEncounter`, `getEncounterCooldown`, `getPlanetEnemyTypes` (the only faction-aware pool reference) are never called.

### 1C. Tutorial scripted combat (a state machine, *not* an engine)
- **What:** one authored fight in "Dockside Initiation" (`tutorial_001_dockside_initiation`), driven by `frontend/src/services/tutorialStateMachine.js` + `tutorialEventBus.js`.
- **Where:** `DialogueInterface.jsx:785` emits `COMBAT_INTRO` on backend `nextState='combat_intro'`; `TutorialOverlay.jsx:1355-1497` `handleNext` launches combat; completion is detected in `VictoryScreen.jsx:33-45`.
- **Entered via:** `startEncounter(charId, 'scripted', ['droid_security'])` → `/game/combat/:id` with `state.isTutorial:true`. **Hard-bound to the OLD turn-based engine.**
- **Does:** coaches turn-order/action-menu/targeting via DOM-anchored overlays, advances `COMBAT_INTRO → COMBAT_STARTED → COMBAT_COMPLETE → VENDOR_INTRO`, feeds the `droid_parts` loot → vendor-sell lesson and the Veil "Resonance Spike" hook on `combat_complete`.

### 1D. NEW server-authoritative real-time 3D combat (`backend/src/realtime/*`)
- **What:** the Phase 4.3/4.4 + 5.1 engine. `WorldManager` ticks one `PlanetWorld` per active planet/dungeon at 20 Hz (`WorldManager.js:99-122`). Resolution is in-memory/synchronous and **reuses `combatService`'s pure math**; the lifecycle is async and backs each fight with a real `CombatEncounter` row. **It is multi-player by construction** (`MAX_PLAYERS=200`, one shared world per planet — see §6).
- **Where:** `backend/src/realtime/{combat.js, PlanetWorld.js, WorldManager.js, index.js}`; frontend `world/{netClient.js, useSurfaceWorld.js, useDungeonWorld.js}`, `components/surface3d/{RemoteEnemies.jsx, CombatFx.jsx}`, `pages/{PlanetSurface3D.jsx, DungeonView3D.jsx}`.
- **Entered via:** **implicitly — there is no "start combat" call.** The first landed hit (player `cast`, `combat.js:140` `afterPlayerHit`, or enemy AI melee, `combat.js:158` `enemyTryAttack`) pushes an `engage` intent; `CombatManager.ensureEncounter` (`combat.js:212`) lazily creates the row. Player input: click-to-target (`RemoteEnemies.jsx:48`), auto basic-attack (`CombatFx.jsx:38`), abilities `1-9` + dodge `Space` (`PlanetSurface3D.jsx:112-135` / `DungeonView3D.jsx:74-86`).
- **Does:** spawns 2–8 patrolling enemies **once at world construction** (`PlanetWorld.js:48,88`; no respawn loop), proximity aggro (`AGGRO_RADIUS=16`, `PlanetWorld.js:276-310`), melee enemy AI (`ENEMY_CD_MS=1400`), dodge i-frames (`IFRAME_MS=450`), server-authoritative `calculateDamage`, death/respawn, and finalizes through the **same** `combatService.endEncounter`.

### 1E. Shared finalization funnel (the seam that makes this migration safe)
**Both engines converge on `combatService.endEncounter(id, status)` (`combatService.js:1945`).** Turn-based calls it from win/loss/flee; real-time calls it from `CombatManager.finalize` (`combat.js:241`). On `won`: `distributeRewards` (XP/credits/loot, atomic + row-locked, `:2179`) → `updateQuestCombatObjectives` (`:1978`, **not** dungeon-gated) → dungeon-service branch (gated `encounterType==='dungeon' && metadata.subMapId`, `:1990`) → `achievementService.checkCombatAchievements`. On `lost`: `respawnService.respawnPlayer({healthRestorePercent:40, chargeFee:true})` (`:2047`). HP/stamina always saved back. **Verified.**

### Complete combat-trigger table

| # | Entry point (file:line) | Trigger mechanism | Engine entered |
|---|---|---|---|
| 1 | `PlanetSurface3D.jsx:231` `onMoved` → `:276` Fight | 3D surface move → `checkEncounter` roll → `EncounterDialog` → `startEncounter('random')` | **OLD turn-based** (runs *on top of* the live 3D world — S1) |
| 2 | `PlanetSurface.jsx:953/1122/813` → `:2849` Fight | 2D surface move → `checkEncounter` → `EncounterDialog` | OLD turn-based (route `/game/planet2d` only — **orphaned**, no UI links) |
| 3 | `PlanetSurface.jsx:2186-2207` | Click 2D quest marker `type:'combat_encounter'` → `startEncounter('quest')` | OLD turn-based (navigation buggy: passes encounter as charId) |
| 4 | `NPCInteractionMenu.jsx:108-112` (button `:238`) | "Attack" on NPC → `startEncounter('npc', [enemy])` | OLD turn-based — **likely THROWS today**: `'npc'` not in `CombatEncounter` enum (`CombatEncounter.js:29`) |
| 5 | `POIInteractionMenu.jsx:145-183` | POI `combat` action → `poiService.handleCombatPOI` → `startEncounter('poi')` | OLD turn-based |
| 6 | `SubMapView.jsx:3036-3098` (`dungeonCombatTrigger.js:14`) | 2D dungeon Manhattan dist ≤1 → `startEncounter('dungeon')` | OLD turn-based — **unreachable** (`DELEGATE_2D` empty, `SubMapView3D.jsx:40`; note `App.jsx:30` comment is stale) |
| 7 | `DialogueInterface.jsx:785` → `TutorialOverlay.jsx:1355-1497` | Tutorial `nextState='combat_intro'` → Next → `startEncounter('scripted', ['droid_security'])` | OLD turn-based (tutorial) |
| 8 | `CombatView.jsx:208-234` | Mount-time resume/start of active encounter | OLD turn-based (self-navigation) |
| 9 | `index.js:154-158` `t:'cast'` → `combat.js:70` → `:144` | Player cast lands hit → `engage` intent | **NEW real-time 3D** |
| 10 | `PlanetWorld.js:276-310` → `combat.js:158-180` | Enemy AI proximity/aggro melee → `engage` (no player action) | NEW real-time 3D |
| 11 | `index.js:159-164` `t:'dodge'` → `combat.js:42` | Space → i-frames + dash | NEW real-time 3D |
| 12 | `index.js:114-116` join w/ `subMapId` → `WorldManager.js:72` | Enter dungeon submap (3D) → dedicated dungeon world | NEW real-time 3D (dungeon) |
| 13 | `index.js:172` close / `PlanetWorld.js:259-262` `DISENGAGE_MS=6000` | Disconnect or 6s idle → `finalize('fled')` (deletes the encounter row) | NEW real-time finalize (shared funnel) |

---

## 2. Problems: Overlaps & Conflicts (severity-ranked)

**S1 — Dual combat on the same 3D screen (player-facing breakage).** `PlanetSurface3D.jsx` runs real-time WS combat *and* the old random-encounter path (`onMoved`→`checkEncounter`→`EncounterDialog`→`/game/combat`, `:261/:285`). A player fighting live, walkable enemies can be yanked into a turn-based card battle by the same movement. Top migration target.

**S1 — Cross-engine encounter collision (the abandon-on-create bug).** `CombatManager._createRecord` does `CombatEncounter.update({status:'fled'}, {where:{characterId, status:'active'}})` (`combat.js:198-201`) before creating its row. This force-flees **any** active encounter for that character — **including a live turn-based one**. While both engines coexist (every phase until the engine is retired), a player who opens a turn-based fight and then takes one 3D melee hit has their turn-based encounter silently `fled` mid-fight. Must be guarded *early*, not at the end.

**S1 — Real-time dungeon kills lose dungeon semantics + corrupt saved location.**
- `_createRecord` hard-codes `encounterType:'random'` with no `subMapId` (`combat.js:202-207`) even in dungeon worlds. So the dungeon-service branch (`combatService.js:1990`) never runs: `dungeonQuestService.trackEnemyDefeat` / `dungeonEnemyService.updateEnemyState` / `checkDungeonCleared` / the **0.5× dungeon reward penalty** all skip. *(Note: generic `defeat`/`defeat_boss`/`combat` objectives still fire via the un-gated `updateQuestCombatObjectives` at `:2112` — see parity matrix. Only the dungeon-*service* tracking + penalty are lost.)*
- **Worse — persisted-location corruption on dungeon death:** `endEncounter('lost')` → `respawnService.respawnPlayer` resolves a safe location from the **planet's** `mapData.pointsOfInterest` (`respawnService.js:14-90`) and writes `character.currentLocation = {x,y,area:'medical_center'|'spaceport'}` with **no `subMapId`**. Realtime `_respawn` (`combat.js:262-268`) then applies that *surface* coord through the *dungeon* sim and keeps the player in the dungeon. Net: player stuck at a garbage in-world position **and** the DB location now points at a surface POI with `subMapId` dropped, so the next REST load/reconnect is also wrong. This is a **data-integrity** bug, not cosmetic.

**S1 — Tutorial is hard-bound to the engine being retired.** No realtime/3D file emits any `TUTORIAL_EVENTS.COMBAT_*`. `COMBAT_INTRO` is emitted only from `DialogueInterface.jsx`, `COMBAT_STARTED` only from `TutorialOverlay.jsx`, `COMBAT_ENDED` only from the turn-based `VictoryScreen.jsx:33-45`. Route a tutorial player to 3D combat today and the tutorial **stalls at `COMBAT_INTRO`/`COMBAT_STARTED`** forever. Migrating combat without re-wiring the tutorial bricks onboarding.

**S1 — NPC "Attack" is likely already broken.** `NPCInteractionMenu.handleAttack` calls `startEncounter(charId,'npc',[enemy])` (`:108-112`) but `'npc'` is **not** in the `encounterType` enum `['random','quest','scripted','bounty','poi','dungeon']` (`CombatEncounter.js:29`), so creation likely throws. Phase 5 must *verify NPC combat works at all* before "preserving" it.

**S2 — No faction reputation from any combat path.** `factionService.applyReputationChange` (`:123`) is called only from dialogue/quest/tutorial. Enemy combatants carry `faction` (`combatService.js:414`) but it's never read. A *missing capability* to decide on deliberately, not an accident of migration.

**S2 — In-memory combatant + hotbar go stale on level-up / equip / ability unlock.** The 3D combatant **and the hotbar** are snapshotted once at WS join (`index.js:124-127,137` `buildHotbar`). `PlayerCharacter.addXP` heals + raises `maxHealth` on level-up (`PlayerCharacter.js:230-264`), but `player.combatant.stats` isn't refreshed (stale HP bar/math). Equipping a better weapon or unlocking a new ability mid-session has **no effect until rejoin**.

**S2 — `inventoryService.useItem` is not engagement-gated → 3D desync, and 3D has no consumable path at all.** A player can POST `/inventory/:id/use/:itemId` during a 3D fight; it writes DB `currentHealth`, but authoritative HP lives in `player.combatant.stats.health` and gets overwritten on the next `flushPlayer`. The 3D engine handles only `input`/`cast`/`dodge` (`index.js:149-164`) — no item message.

**S2 — Two unsynchronized regen systems + a disengage leak.** HTTP `healthRegenService`/`staminaRegenService` gate on the `CombatEncounter` row; the realtime tick has its own `STAMINA_REGEN=3/s` (`PlanetWorld.js:23,252`) and **no in-tick health regen**. Worse, `DISENGAGE_MS=6000` flees + **deletes** the encounter row (`PlanetWorld.js:259-262` → `combat.js:218`), which *opens* the HTTP regen gate (`healthRegenService.js:22-29`) even while enemies are still aggroed/chasing → free regen while kiting.

**S3 — Duplicate/dead code.** (a) `checkForEncounter` (2D) and `onMoved` (3D) are near-identical. (b) `dungeonCombatTrigger.js` is dead (`DELEGATE_2D` empty). (c) `encounterService` dead API surface. (d) Two enemy-turn loops + a redundant `CombatView` poller. (e) Three XP-award impls with differing transaction safety (`distributeRewards` is atomic; `questService.awardRewards`/`achievementService.awardRewards` use unsafe read-modify-write on credits).

**S3 — Dead turn-based status effects.** TB `statusEffects` (Defend bonus, ability buffs/debuffs, stun) are *written but never read* by `calculateDamage` (only consumable `temporaryEffects` function). Little is lost migrating away; the RT path's real buff/shield/debuff handling (`combat.js:53-64,111-135`, decayed by `PlanetWorld._decay`) is strictly better.

**S3 — Double-scaling waste in random encounters.** `encounterService` scales enemies then returns only template-id strings; `createEncounter` re-scales at hard-coded `'moderate'` (`combatService.js:118`), discarding the difficulty scaling.

---

## 3. Capability Parity Matrix

Columns: **TB** = old turn-based · **RE** = random encounters · **TUT** = tutorial card flow · **RT** = new 3D real-time.

| Capability | TB | RE | TUT | RT | Gap / nuance | Migration action |
|---|---|---|---|---|---|---|
| Rewards (credits) | Yes (`distributeRewards:2306`) | via TB | via TB | Yes (shared funnel) | none | Keep shared funnel |
| XP + level-up | Yes (`addXP`→`PlayerCharacter.addXP`) | via TB | via TB | Yes (shared) | RT combatant **not refreshed** on level-up (S2) | Refresh `combatant.stats` post-`addXP` |
| Quest — generic kill objectives (`defeat`/`defeat_enemies`/`combat`) | Yes | via TB | `combat` type | Yes (`updateQuestCombatObjectives`, un-gated `:1978`) | **Targeted** `defeat`/`defeat_specific_enemy` match **by name-substring only** — `buildEnemyCombatant` gives random `id` + no `enemyType` (`:394`); pre-existing fragility in *both* engines | Teach matcher to honor `metadata.questId/objectiveId` (see §5.3) |
| Quest — generic `defeat_boss` | Yes | via TB | n/a | **Yes** (matches at `:2112`, un-gated) | works in 3D today | none |
| Quest — dungeon-service (`clear_dungeon`, dungeon enemy-state, 0.5× penalty) | Yes (2D dungeon) | n/a | n/a | **No** (gated out: `_createRecord` hardcodes type, `:202`) | the dungeon-*specific* path never fires in 3D (S1) | Set real `encounterType`/`subMapId` in `_createRecord` |
| Damage calc | Yes (`calculateDamage:862`) | via TB | via TB | Yes (reuses same pure fn, `combat.js:81`) | none | Single source of truth |
| Crit / dodge | Yes | via TB | via TB | Yes (crit shared; dodge = i-frame roll, `combat.js:165`) | none | Reuse |
| Status effects / buffs | Partial (written, never read) | n/a | n/a | Partial (real buff/debuff/shield + decay) | RT is *better*; TB effects are dead | Do **not** port dead TB effects |
| Death / respawn | Yes (`endEncounter`→`respawnPlayer`) | via TB | via TB | Partial | **Dungeon respawn corrupts saved location** (drops `subMapId`, writes surface POI) — **S1, not cosmetic** | Add dungeon-aware target in **both** `respawnService` and `_respawn` |
| Medical fee on death (`100 + level*50`) | Yes (`respawnService:175`) | via TB | via TB | Yes (shared) but **silent, no UI** | 3D charges credits with no feedback | Add death/fee UI (§4.8) |
| Inventory / consumable use | Partial (`executeUseItem:1015`, medpac UI) | n/a | heal step uses it | **No** (`index.js` has no item msg) | 3D cannot use consumables at all (S2) | Add `t:'item'` WS path + hotbar slot |
| Faction reputation | No | No | No | No | absent everywhere | Decide (opt-in, flagged) |
| Achievements | Yes (`checkCombatAchievements:2035`) | via TB | via TB | Yes (count-based off `won` rows; `fled`-all-dead upgrades to `won`, `combat.js:234`) | `defeat_boss` achievement defined, never triggered | Optional boss-kill hook |
| Loot | Yes (`distributeRewards:2258`) | via TB | `droid_parts` | Yes (shared) but **no reward UI** | no victory screen in 3D | WS reward summary + 3D toast |
| Enemy spawn | per level/difficulty | `generateRandomEnemy(level, diff)` | `droid_security` (hard-coded) | Yes (`spawnEnemies:88`, 2–8) but **scales to dangerLevel only, once, no respawn loop** | RT ignores player level + has no respawn/escort escalation | Blend player level; add respawn + scripted spawn API |
| Aggro | n/a | n/a | n/a | Yes (`stepEnemies:276`, radius 16, leash 24) | no LoS/threat table | Acceptable; optional later |
| Attack AI | Partial (always-attack) | n/a | via TB | Partial (melee-only, no abilities) | both shallow | Acceptable; enrich later |
| Player-initiated flee | **Yes** (`executeFlee`, success roll) | via TB | n/a | **No** (only 6s-idle/disconnect disengage) | **capability drop** — players can't choose to flee in 3D | Add a flee/disengage affordance |
| Companion / escort-NPC combat | Yes (`buildNPCCompanionCombatant`/`executeCompanionTurn`) | n/a | n/a | **No** (no companion actor in 3D) | escort allies don't fight in 3D | Decide: add RT companion actor or drop (O4) |
| Resume / active-encounter redirect | Yes (`checkActiveEncounter`) | n/a | n/a | **No** (disconnect mid-fight just flees) | no "rejoin your fight" | Acceptable (RT fights are short) |
| Tutorial scripting hooks | coupled to TB `VictoryScreen` | emits `RANDOM_ENCOUNTER_TRIGGERED` | Yes | **No `COMBAT_*` emitters** | RT can't signal the tutorial (S1) | Emit `COMBAT_STARTED/ENDED` from 3D on scripted kill |
| Readability / UX | menu/log/turn board | modal | coached overlays | **Sparse** (fx + target ring) | no health bars, reward/death screens | Full UX plan (§4.8) |
| Persistence / transactions | Yes (atomic `distributeRewards:2179`) | via TB | via TB | Yes (shared) | quest-objective `updateObjective` not transactional (lost-update risk) | Thread transaction/lock |

---

## 4. Recommended Unified Combat Design (target: 3D real-time)

**Principle:** keep the real-time engine as the only player-facing combat, keep `endEncounter`/`distributeRewards` as the only reward funnel, fix the S1 defects + S2 gaps, and **reuse, don't reinvent**.

### 4.1 Enemy spawning
- Keep `PlanetWorld.spawnEnemies` at construction (`:88`), `count = clamp(2 + floor(dangerLevel/2), 2, 8)`, homes via `_randomWalkable`.
- **Scaling fix:** blend in player level — scale to `max(dangerLevel, round(avgPartyLevel))` so a high-level player isn't trivially safe nor a low-level player overrun. Keep the blend conservative to preserve danger-tier pacing.
- **Respawn/escalation (net-new — see §6/§3.1):** add a tick-driven respawn cap + an escort-quest modifier (denser/tougher when `getActiveEscortQuest` is truthy). This does **not** exist today; the old `encounterService` was the only escort-escalation + anti-spam-cooldown impl, so salvage that logic before deleting it.
- **Scripted spawn API (new):** `world.spawnScriptedEnemy(templateId, { atSurfaceXY, tag, questId, objectiveId, tutorial })` — deterministic, taggable, completion-trackable (used by tutorial + `combat_encounter` quests; §5, §5.3).
- **Faction-aware pools:** fold `encounterService.getPlanetEnemyTypes` into `generateRandomEnemy(dangerLevel, { factionControl, planetType })` so spawns reflect who controls the planet.

### 4.2 Aggro & attack behavior
Keep `stepEnemies` nearest-target aggro (radius 16, leash 24) + melee `enemyTryAttack`. Sufficient for parity (old `executeEnemyTurn` was also always-attack). Defer LoS/threat-tables/enemy-abilities to post-migration polish.

### 4.3 Damage model
**Reuse `combatService.calculateDamage` verbatim** (already shared, `combat.js:81/169`). One formula, no drift. Do **not** port dead TB `statusEffects`.

### 4.4 Death / respawn (data-integrity fix, not polish)
- Keep `finalize('lost')` → `endEncounter('lost')` → `respawnService.respawnPlayer(40%, fee)` → `_respawn`.
- **Fix in two places:** (1) `respawnService.respawnPlayer` must take a dungeon branch — when the character is in a dungeon submap, respawn at the **dungeon entrance** (`zone.entrance`, `WorldManager.js:90`) *or* eject to the surface, and write a coherent `currentLocation` (preserve/clear `subMapId` correctly) so REST reload isn't corrupted. (2) `_respawn` (`combat.js:262`) must use a dungeon-appropriate in-world coord, not a surface coord through the dungeon sim. Decide entrance-vs-eject explicitly (O3).

### 4.5 Rewards / XP / quest / faction / achievement hooks
- **Reuse `distributeRewards`** unchanged (atomic).
- **Fix `_createRecord` (highest-value backend fix):** set `encounterType` + `metadata.subMapId` from `world.zone` for dungeon worlds, so the dungeon-service branch runs (dungeon-clear/boss tracking, enemy-state, 0.5× penalty).
- **Quest attribution:** teach `updateQuestCombatObjectives` to honor `encounter.metadata.questId/objectiveId` when present (scripted spawns), falling back to today's name-match. This fixes both the name-substring fragility and mis-credit across same-named enemies.
- **Level-up refresh (S2):** after `addXP` returns levels, re-derive `maxHealth`/`maxStamina`/derived stats into `player.combatant.stats`; also refresh the **hotbar/ability set** (ability unlock/equip mid-session).
- **Faction rep (opt-in, flagged):** in `distributeRewards`, after a confirmed kill, `applyReputationChange(charId, enemy.faction, delta)` for faction-tagged enemies. Note MP attribution (§6.3).

### 4.6 Inventory / consumable use in real-time (new capability)
- WS `t:'item'` → `world.handleItem(playerId, {itemId})` → new `resolveUseItem` in `combat.js` mirroring `executeUseItem`'s effect onto `combatant.stats` + `temporaryEffects`, decrement via `inventoryService.removeItem`, push a `heal`/`buff` fx.
- **Engagement-gate** `inventoryService.useItem` on *actual engagement* (not mere existence of a `CombatEncounter` row) so it doesn't break OOC use or the tutorial heal step within the 6s disengage window (§5.5).
- Frontend: consumable quickslot beside the `1-9` hotbar (bind medpac to `Q`/slot `0`).

### 4.7 Status effects & regen
Keep RT `_decay` + `STAMINA_REGEN`. Add in-tick **out-of-combat health regen** gated on *no active engagement* (not on the row), closing the disengage leak (S2/§2.5).

### 4.8 UX / readability plan (make it feel modern)
| Element | Plan | Anchor |
|---|---|---|
| Enemy health bars | Floating hp% bar above each hostile (promote the existing nameplate) | `surface3d/Nameplate.jsx`, `RemoteEnemies.jsx` |
| Damage numbers | Render the `hit` fx (`dmg`/`crit`/`dodged`/`miss`, `combat.js:143`) as floating combat text (white / yellow-crit / grey-miss) | `CombatFx.jsx` |
| Hit feedback | Flash/knockback on hit, screen-shake on player-taken crit, distinct dodge whiff | `CombatFx.jsx` |
| Target indication | Red target ring on click + hover outline | `RemoteEnemies.jsx` |
| Lock-on | Tab-cycle nearest hostile; auto-face on cast | `PlanetSurface3D.jsx` keybinds |
| Hotbar | Ability bar from `welcome.hotbar` w/ cooldown sweep + stamina cost + consumable slot | `PlanetSurface3D.jsx:112-135` |
| Telegraphs | Wind-up indicator before `enemyTryAttack` lands (use the `ENEMY_CD_MS=1400` cadence) | `PlanetWorld.js:309` + client |
| **Reward screen** | Send `t:'reward'` WS summary on `finalize('won')` (xp/credits/loot, level-up flag); non-blocking toast reusing `VictoryScreen` rarity/loot rendering | `combat.js:241`, `netClient.js` |
| **Death screen** | On `t:'respawn'`, overlay "Defeated — revived at <safe location>, medical fee <n>" before returning control | `netClient.js:118` |

---

## 5. Tutorial Redesign (scripted 3D combat encounter)

**Goal:** replace the card-combat beat with a scripted 3D fight against one training drone, keeping the state-machine contract (`COMBAT_INTRO → COMBAT_STARTED → COMBAT_COMPLETE → VENDOR_INTRO`) byte-for-byte, and preserving the `droid_parts`→vendor lesson + the Veil hook on `combat_complete`.

### 5.1 New state flow (contract preserved)
1. Dialogue still returns `nextState='combat_intro'`; `DialogueInterface.jsx:785` still emits `COMBAT_INTRO`; `TutorialOverlay` still shows the intro modal. **No change to the enum/transitions.**
2. **`COMBAT_INTRO` "Next" no longer navigates to `/game/combat`.** Instead it: (a) stays on `PlanetSurface3D`, (b) calls `world.spawnTutorialEnemy()` (WS `t:'tutorial_spawn'`), (c) emits `COMBAT_STARTED` + `transitionTo(COMBAT_STARTED)` exactly as today (`TutorialOverlay.jsx:1476-1483`).
3. Coaching overlays re-anchor to 3D DOM targets ("click the drone", "press 1", "press Space to dodge") instead of `combat-turn-order`/`combat-action-menu` (`tutorialTargetRegistry.js:50-55`).
4. On kill, the 3D engine emits `COMBAT_ENDED {isTutorial:true}` (§5.3); the existing listener (`tutorialStateMachine.js:485-488`) advances `COMBAT_COMPLETE → VENDOR_INTRO` **unchanged**.

### 5.2 Spawning the scripted tutorial enemy
- Backend WS `t:'tutorial_spawn'` → `world.spawnScriptedEnemy('droid_security', { atSurfaceXY: nearPlayer, tag:'tutorial', tutorial:true })` — one deterministic, low-aggro drone ~6–8u in front of the player (not the RNG patrol), preserving the `droid_parts` drop (`enemyTemplates.js:171`).
- **Shared-world caveat (§6.4):** the tutorial must run in an **instanced/private context** (or the spawn + aggro-suppression must be scoped to the tutorial player only) so it doesn't leak into other players on the same planet world.

### 5.3 Completion detection + advance
- In `CombatManager.finalize(world, player, 'won')`, when the killed engaged enemy carries `tutorial:true` (or `metadata.tutorial`), send WS `t:'combat_done', tutorial:true`; `netClient`/`PlanetSurface3D` re-emits `tutorialEventBus.emit(COMBAT_ENDED, {isTutorial:true})`.
- The backend objective is satisfied by `endEncounter` → `updateQuestCombatObjectives` completing the `combat`-type `tutorial_combat` objective on any kill (`combatService.js:2100-2111`) — works once the kill flows through `endEncounter` (it does in RT). **For non-tutorial scripted quest spawns, also pass `metadata.questId/objectiveId`** and teach the matcher to honor it (§4.5) — the matcher does *not* read `metadata.questId` today, so tagging alone is insufficient.
- Enemy-id indirection (`tutorialConfig.combatEnemyId='enemy_tutorial_customs_drone'` vs the front-end remap to `droid_security`, `TutorialOverlay.jsx:1370-1381`) is harmless: the `combat`-type objective completes on *any* kill.

### 5.4 First-time-player guidance / telegraphing
Step 1 target ring + "Click the drone." → Step 2 "Your blaster fires automatically in range." → Step 3 "Press **1** to use your ability." → Step 4 (telegraph) "Press **Space** to dodge!" → Step 5 reward toast → auto-advance to `VENDOR_INTRO`. Keep the drone weak; **clamp player HP above a floor** so a first-timer cannot die in the tutorial.

### 5.5 Contract-preservation checklist
- State enum (`TutorialProgress.js:51-56`) unchanged · `COMBAT_ENDED`→`VENDOR_INTRO` chain unchanged (`tutorialStateMachine.js:485-488`) · `droid_parts` source preserved · Veil hook is dialogue-only on `combat_complete` (auto-preserved).
- **Migrate + verify the tutorial while the turn-based route still exists** (do not bundle with engine retirement — §6 sequencing).

---

## 6. Technical Migration Plan (phased, each shippable + verifiable)

**Convert-vs-remove decisions:**
- **Random encounters → CONVERT, then retire the turn-based handoff.** Keep the *capability* (ambient danger pacing, escort escalation, 10s anti-spam); drop the *turn-based destination*. **The "fold into spawn density" is net-new work** (no respawn loop / escort awareness exists, §3.1) — build it before removing `encounterService`'s escort-doubling + cooldown.
- **`CombatView`/turn-based UI → KEEP as a reachable fallback until the tutorial + all entry points are verified on 3D, then REMOVE.** **Never delete** `endEncounter`/`distributeRewards`/`updateQuestCombatObjectives`/`calculateDamage`/`build*Combatant` — the shared funnel + pure math.
- **`dungeonCombatTrigger.js` + 2D `SubMapView` combat → REMOVE** (already unreachable). Fix the stale `App.jsx:30` comment.
- **`encounterService` → SALVAGE then remove:** `getPlanetEnemyTypes` (faction pools), the **10s cooldown**, and **escort detection** must move into the 3D spawner before the file is deleted.

### Phase 0 — Instrumentation, guardrails, **cross-engine guard**
- Metrics around `endEncounter`/`finalize` (engine, encounterType, outcome); feature flag `COMBAT_3D_ONLY`.
- **Add the cross-engine guard NOW (S1):** suppress 3D `engage` while a non-realtime `active` `CombatEncounter` exists for that character (or vice-versa), so `_createRecord` can't silently flee a live turn-based fight during the coexistence window.
- Verify: logs show every kill's path; opening a turn-based fight then taking a 3D hit does **not** flee the turn-based encounter.

### Phase 1 — Fix the S1 backend defects (correctness)
- `_createRecord` sets real `encounterType`/`metadata.subMapId` from `world.zone`.
- **Dungeon-aware respawn in BOTH `respawnService.respawnPlayer` (DB `currentLocation`) and `_respawn` (in-world coord)** — fixes the persisted-location corruption, not just the visual.
- Level-up refresh of `combatant.stats` **and hotbar/abilities**.
- Verify (jest): dungeon-world finalize calls `endEncounter` with `encounterType:'dungeon'`+`subMapId`; `dungeonQuestService.trackEnemyDefeat` invoked; 0.5× reward applied; dungeon death writes a coherent `currentLocation` (REST reload valid).

### Phase 2 — 3D combat UX (reward/death screens, health bars, damage numbers)
§4.8. `t:'reward'`/`t:'combat_done'` from `finalize`; reward toast, death+medical-fee overlay, floating combat text, enemy health bars, hotbar cooldowns. Verify in preview.

### Phase 3 — Consumables + regen in 3D
§4.6/§4.7. WS `t:'item'`, `resolveUseItem`, **engagement-gated** `inventoryService.useItem` (don't break OOC/tutorial heal), in-tick OOC health regen (closes the disengage leak). Verify jest + preview.

### Phase 4 — Re-home random encounters onto 3D (kill dual-engine on surface)
Remove `onMoved`→`checkEncounter`→`EncounterDialog`→`/game/combat` from `PlanetSurface3D.jsx`; **first** build the respawn/escort-escalation + salvage cooldown/faction pools into `PlanetWorld`. Depends on the Phase 0 guard. Verify: walk a high-danger planet — more hostiles, no `EncounterDialog`, no `/game/combat`.

### Phase 5 — Re-home NPC / POI / quest combat onto 3D
NPC "Attack", POI combat, and 3D `combat_encounter` objectives use `spawnScriptedEnemy` (tagged with `questId/objectiveId`) instead of `startEncounter`+navigate. **First fix the `'npc'` enum** (`CombatEncounter.js:29`) / verify NPC combat works at all, and **teach `updateQuestCombatObjectives` to honor `metadata.questId/objectiveId`** (§5.3) — tagging alone won't credit correctly. Verify jest + preview.

### Phase 6 — Tutorial migration (turn-based route still present)
§5. `COMBAT_INTRO` "Next" spawns the tutorial drone in an instanced context; 3D `finalize` emits `COMBAT_ENDED{isTutorial}`; re-anchor coaching overlays. **Do not retire the engine yet** — verify onboarding end-to-end with the old path still available as a fallback.

### Phase 7 — Retire the turn-based UI
Flip `COMBAT_3D_ONLY`; remove `CombatView` route, `EncounterDialog`, `dungeonCombatTrigger.js`, 2D `SubMapView` combat, redundant `processTurn`, salvaged-then-dead `encounterService` methods. **Keep the shared funnel + pure math.** Verify: `/game/combat` unreachable; all entry points resolve in 3D.

### Phase 8 — Faction rep + polish (optional, flagged)
§4.5 faction rep on kill (with MP attribution, §6.3); enemy abilities/telegraphs; `defeat_boss` achievement hook; companion/escort RT actor if required (O4).

---

## 7. Implementation Tasks (dependency-ordered)

1. **Combat flag + outcome metrics** — backend — `COMBAT_3D_ONLY`; log `{engine,encounterType,outcome}` at `endEncounter`/`finalize`. Risk: low. Deps: none.
2. **Cross-engine `active`-encounter guard** — backend — suppress 3D `engage` while a non-RT `active` row exists (and/or block turn-based start during RT engagement). Risk: med (onboarding/coexistence-critical). Deps: 1.
3. **Fix `_createRecord` encounterType/subMapId from `world.zone`** — backend — `combat.js:202-207`. Risk: med. Deps: 1.
4. **Dungeon-aware respawn (respawnService + `_respawn`)** — backend — coherent `currentLocation` + valid in-world coord. Risk: med (data-integrity). Deps: 3.
5. **Refresh combatant + hotbar/abilities on level-up/equip** — backend — after `addXP`. Risk: low. Deps: none.
6. **Teach `updateQuestCombatObjectives` to honor `metadata.questId/objectiveId`** — backend — `combatService.js:2068-2164`. Risk: med. Deps: none.
7. **Emit reward/death/combat-done WS messages** — backend — from `finalize`. Risk: low. Deps: 1.
8. **3D reward toast + death/medical-fee overlay** — frontend — `netClient.js`; reuse `VictoryScreen` loot UI. Risk: low. Deps: 7.
9. **Enemy health bars + damage numbers + hit feedback** — frontend — `CombatFx`/`Nameplate`/`RemoteEnemies`. Risk: low. Deps: none.
10. **Hotbar cooldown/stamina UI + lock-on (Tab) + flee affordance** — frontend. Risk: low. Deps: none.
11. **WS `t:'item'` + `resolveUseItem` + consumable hotbar slot** — backend+frontend. Risk: med. Deps: 1.
12. **Engagement-gate `inventoryService.useItem`** (not row-existence; preserve OOC/tutorial heal) — backend. Risk: med. Deps: 11.
13. **In-tick OOC health regen (engagement-gated)** — backend — closes disengage leak. Risk: low. Deps: none.
14. **`world.spawnScriptedEnemy(templateId, opts)` (deterministic, tagged, aggro-suppress, instanced for tutorial)** — backend. Risk: med. Deps: 1, 14a.
14a. **Respawn loop + escort escalation + salvaged cooldown/faction pools in `PlanetWorld`** — backend — net-new (precondition for removing `encounterService`). Risk: med. Deps: 1.
15. **Remove dual-engine on 3D surface (random encounters)** — frontend+backend. Risk: med. Deps: 2, 9, 14a.
16. **Fix `'npc'` enum / verify NPC combat works** — backend — `CombatEncounter.js:29`. Risk: low. Deps: none.
17. **Re-home NPC/POI/quest combat to 3D scripted spawns** — frontend+backend. Risk: med. Deps: 6, 14, 16.
18. **Tutorial → 3D scripted fight (instanced)** — frontend+backend — onboarding-critical; verify with old route still present. Risk: high. Deps: 7, 8, 14.
19. **Faction rep on kill (flagged, MP-aware attribution)** — backend. Risk: med. Deps: 3.
20. **Retire turn-based UI** — frontend+backend — flip flag, remove old UI layer; keep shared funnel + pure math. Risk: high. Deps: 15, 17, 18.

---

## 8. QA Test Plan

> **A** = automatable (jest/vitest) · **M** = manual/preview.

1. **Tutorial combat (M + A).** New char → accept Jax quest → "ready" → Next. Expect: drone spawns in 3D; coaching prompts; auto-attack; kill → reward toast → `COMBAT_COMPLETE` → `VENDOR_INTRO`. **A:** tagged-tutorial kill → `endEncounter`→`updateQuestCombatObjectives` completes `tutorial_combat`; `combat_done{tutorial}` emitted; player HP clamped (can't die).
2. **Cross-engine collision (A + M, regression, every coexistence phase).** Open a turn-based fight (NPC/tutorial), take one 3D melee hit → assert the turn-based `CombatEncounter` is **not** silently `fled`; no double `endEncounter` (§2 S1).
3. **Surface aggro (M).** danger≥4 planet: 2–8 hostiles patrol; radius-16 chase; melee lands; **no `EncounterDialog`, no `/game/combat`**; health bars + damage numbers render.
4. **Dungeon boss/clear (A + M).** **A:** finalize creates `encounterType:'dungeon'`+`subMapId`; `dungeonQuestService.trackEnemyDefeat`/`checkDungeonCleared` invoked; 0.5× reward. **M:** `clear_dungeon` advances.
5. **`defeat_boss` split coverage (A).** Generic `defeat_boss` fires via `updateQuestCombatObjectives` in 3D today; dungeon-service boss tracking fires only post-Phase-1 (verifies §3 nuance).
6. **Dungeon-death persistence (A + M).** Die in a 3D dungeon → assert `currentLocation` is **not** a surface POI with `subMapId` dropped; in-world position valid; REST reload coherent (§2 S1).
7. **Death / respawn / medical fee (A + M).** **A:** `finalize('lost')`→`respawnPlayer(40%,fee)` charges `100+level*50`; clears iframe timers. **M:** death+fee overlay shows; surface→medical_center, dungeon→entrance/eject (O3).
8. **Rewards / XP / level-up (A + M).** **A:** atomic grant of summed `xpReward`/`creditsReward`/filtered loot; level-up refreshes in-world `maxHealth`. **M:** reward toast matches; HP bar reflects new max immediately.
9. **Quest-credit attribution for scripted spawns (A).** Kill a `spawnScriptedEnemy` tagged `questId/objectiveId` → **only** the intended objective advances, not a same-named enemy in an unrelated quest (§4.5/§5.3).
10. **Targeted-objective name-match fragility (A).** Verify `defeat_specific_enemy` behavior given random enemy `id` + missing `enemyType` (pre-existing weakness; confirm the metadata path fixes it).
11. **Consumable use (A + M).** **A:** `resolveUseItem` heals + decrements inventory; `useItem` rejected/proxied during *engagement* but allowed OOC and in the tutorial heal step. **M:** medpac via hotbar heals in 3D; no wasted-item desync.
12. **Ability/equipment mid-session refresh (A + M).** Unlock an ability / equip a stronger weapon mid-session → usable/effective without rejoin (§2.4).
13. **Disengage regen leak (A).** Engage, then leave `AGGRO_RADIUS` >6s while enemy alive → HTTP health regen does **not** apply while still aggroed (§2.5).
14. **Faction rep (A, flagged).** Killing a `faction`-tagged enemy moves that faction's rep by the configured delta; non-faction enemies don't.
15. **Achievements (A).** ≥10 3D kills → `defeat_10_enemies` progresses (off `won` rows; confirm `fled`-all-dead upgrades to `won`).
16. **Single-finalization (A).** Engage in 3D with a stale `active` REST row present → exactly one `won` finalization, one reward grant (with the Phase-0 guard).
17. **Player-initiated flee (M).** Confirm a deliberate disengage/flee affordance exists (TB had `executeFlee`); idle/disconnect-only is a capability gap.
18. **MP kill-steal / double-credit (A + M).** Two players damage one enemy → exactly one reward grant; no phantom credit to the non-killer on their next finalize (§6.1).
19. **Tutorial in a shared world (M, MP).** Second player on the same planet → the tutorial drone + aggro-suppression don't affect them (instancing, §6.4).
20. **Regression: turn-based retired (M, post-Phase-7).** `/game/combat` unreachable from any UI; tutorial/NPC/POI/quest/dungeon combat all function in 3D.

---

## 6.5 / §6 — Multiplayer / shared-world implications (must inform every phase)

The 3D engine is **server-authoritative and multi-player** (`WorldManager` ticks one shared `PlanetWorld` per planet; `MAX_PLAYERS=200`). The old systems were single-player. Concrete consequences:

- **Kill-steal / double-credit.** `engagedEnemies` is per-player (`PlanetWorld.js:177`); `onEnemyDeath` credits the killer and deletes the enemy for everyone (`combat.js:152-155`). Two players on one enemy → one gets credit; the other may still hold the dead combatant in their map and get phantom credit on their next finalize. Rewards/quest attribution in a shared world needs explicit handling.
- **30-min reaper invariant.** `WorldManager.js:128-135` flees `active` rows globally after 30 min — fine, but the design assumes no real-time fight exceeds 30 min. State it as an invariant.
- **Faction rep in MP (Phase 8).** Rep-on-kill accrues only to the killer (whose `engagedEnemies` holds the corpse); decide whether assists earn rep.
- **Tutorial leakage.** `spawnScriptedEnemy` + aggro-suppression mutate the *shared* world. The tutorial must spawn in an **instanced/private context** or it leaks into other players' sessions (§5.2).

---

## Open Questions
- **O1 — Faction-rep policy.** Should kills move rep, and by how much? Design decision (Phase 8).
- **O2 — Random-encounter pacing after conversion.** Reference: `chance = 0.10 + dangerLevel*0.03 + level*0.01`, escort ×2, 10s cooldown. Tune spawn density/escalation to feel equivalent.
- **O3 — Dungeon respawn destination.** Entrance vs eject-to-surface. Product decision.
- **O4 — Companion/escort combat in 3D.** TB has `buildNPCCompanionCombatant`/`executeCompanionTurn`; RT has no companion actor. Required parity or accepted drop?
- **O5 — Enemy abilities/telegraphs / boss behavior.** RT enemies are melee-only; old `executeEnemyTurn` was also always-attack, so parity is likely fine, but boss enemies are unverified.
- **O6 — `defeat_boss` achievement** is defined but never triggered; needs a boss-kill hook (Phase 8).
