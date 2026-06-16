# Phase 6 — play-test follow-ups (out of scope, captured for later)

Phase 6 (real-time spaceport + 3D tutorial combat) is **complete and play-test-confirmed**
(movement, proximity combat, and the tutorial drone fight all work in the authed build). These
items surfaced during that play-test but are **separate concerns**, deferred by mutual decision:

## 1. Quest system — "collect / find items" objective has no obtainable item (review + makeover)

**Symptom (play-test):** accept a quest with a `collect`-type objective (e.g. *"Theft for Hera"*) →
a POI appears on the surface (*"Supply Cache — a storage facility where you can find items for
Theft for Hera."*) → the player interacts / enters, but **no findable/collectible item ever
appears**, so the objective can't be completed.

**What exists (scoping done 2026-06-16):**
- `backend/src/services/questPOIService.js` — `generatePOIForObjectiveType` creates the POI for a
  `collect` objective (`getCollectPOIType` / `generateCollectPOIName`; description *"…where you can
  find items for {questTitle}."*). So the POI placement works.
- `backend/src/services/poiService.js` — `executeInteraction` routes POI actions; `handleLootPOI`
  (`:255`) generates loot + `inventoryService.addItem`, and `handleInvestigatePOI` (`:197`) handles
  the Investigate action. The 3D POI menu (`frontend/src/components/poi/POIInteractionMenu.jsx`,
  `InvestigationModal.jsx`) shows **Investigate / Explore**.
- `backend/src/services/questService.js:386` — objective crediting special-cases
  `['collect','discover','travel']`.

**The gap to investigate:** the chain *accept collect quest → POI → Investigate/Explore (or enter
the POI submap) → obtain the quest item AND credit the `collect` objective* is not closed. Decide
the intended mechanic — (a) Investigate/Explore the surface POI grants the item + credits the
objective (no submap needed), or (b) entering the POI's submap spawns a physical collectible to
walk to — then wire the missing path. Verify the `collect` objective actually advances on item
pickup. This likely wants a broader quest-flow review (objective types, POI↔objective binding,
crediting) — the user flagged the quest system generally as needing a makeover.

## 2. Distant skyline polish (minor)

The `DistantSkyline` backdrop (Phase 6) fixed the blank-edge dropoff and reads better, but isn't
perfect. Possible tuning: building height/density/contrast, light brightness + twinkle rate, haze
thickness, and how it composes with the open-submap `SubmapEnclosure` walls. Pure visual tuning in
`frontend/src/components/surface3d/atmosphere/DistantSkyline.jsx` — no logic risk.
