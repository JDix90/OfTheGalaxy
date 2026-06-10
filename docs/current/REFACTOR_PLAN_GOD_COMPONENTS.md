# Refactor plan: SubMapView.jsx & PlanetSurface.jsx

`SubMapView.jsx` (~4,160 lines, 54 hooks) and `PlanetSurface.jsx` (~2,880 lines)
are the two largest, most intertwined components. Much of their heavy logic is
already extracted into pure utils (`dungeonPathfinding`, `collisionDetection`,
`subMapRenderer`, `movementAnimator`, `dungeonEnemyRenderer`, …). What remains is
intrinsic stateful orchestration over many hooks.

**Why this wasn't done in one blind pass:** these components drive the core
play loop (navigation, rendering, combat triggers). Splitting stateful effects
and event handlers safely requires running the app and visually verifying
movement/rendering/combat after each extraction. That runtime verification
wasn't available in the environment where the rest of the hardening was done.

## Safety net already in place
Characterization tests now lock the pure navigation logic these components rely
on (run with `npm run test:utils` in `frontend/`):
- `tests/unit/utils/dungeonPathfinding.test.js`
- `tests/unit/utils/collisionDetection.test.js`

> While writing these, a **critical A\* bug was found and fixed**: `gScore.get(current) || Infinity`
> returned `Infinity` for the start node (gScore 0 is falsy), so dungeon
> click-to-move returned `null` for every non-adjacent path. Fixed to `?? Infinity`.

## Sequenced decomposition (run the app + smoke-test after each step)

Each step is independently shippable; stop and verify in-browser between them.

### SubMapView.jsx
1. **Extract custom hooks (no JSX change):**
   - `useSubMapData(params)` — load submap/NPCs/enemies, loading/error state.
   - `useDungeonMovement(...)` — pending target, path, movement animation, collision.
   - `useDungeonCombat(...)` — enemy proximity, encounter trigger, combat hand-off.
   - `useSubMapCamera(...)` — zoom/pan/drag state and handlers.
   Move one hook at a time; the component keeps rendering the same JSX, just
   consuming the hook's return value. Verify movement/combat after each.
2. **Extract presentational subcomponents:** `<SubMapCanvas>`, `<SubMapHud>`,
   `<DungeonOverlays>` (depth indicator, enemy tooltips). Pass data/handlers as props.
3. **Thin the container** to composition + wiring only (target < ~400 lines).

### PlanetSurface.jsx
1. Extract `usePlanetData`, `usePlanetMovement`, `usePlanetCamera` hooks.
2. Move the terrain/biome constant tables (`terrainColors`, `terrainMap`,
   `mapLayout`) into a `planetSurfaceConfig.js` module (pure data — safe).
3. Extract `<PlanetCanvas>` and `<PlanetHud>` presentational components.

## Verification per step
- `npm run test:utils` stays green (navigation contract unchanged).
- Manually: enter a dungeon, click-to-move across rooms, trigger a combat,
  enter/exit a building; on a planet surface, move, open a POI, enter a submap.
- Add a Playwright smoke test for "enter dungeon → move → start combat" once the
  e2e harness deps are installed (see note below).

## Note: frontend test harness is currently broken
`frontend/tests/setup/testUtils.jsx` imports `@testing-library/react`, which is
not in `node_modules`, so the default `npm test` (vitest) fails to start. Install
`@testing-library/react` + `@testing-library/jest-dom` (and wire Playwright) to
restore component/e2e tests. The pure-logic `npm run test:utils` runs without it.
