/**
 * useSurfaceWorld — the IWorld seam for the walkable 3D surface (Phase 1).
 *
 * The scene reads ONE `world` object and doesn't care where movement comes from.
 * Phase 1 ships the SINGLE-PLAYER (LocalWorld) path: the player is integrated by the
 * shared surface sim at render rate, position is persisted to the backend on a
 * throttle, and the character store is kept loosely in sync. The future multiplayer
 * path swaps this internal for a NetWorld (send inputs → apply snapshots) behind the
 * same `world` shape — see PHASE-0-SPIKE-RECOMMENDATION.md.
 *
 * Everything the render loop touches lives in a ref (no per-frame React re-renders).
 */

import { useEffect, useRef } from 'react';
import { useCharacterStore } from '../state/characterSlice';
import { createSurfaceSim, DEFAULTS } from '../../../shared/sim/surface.mjs';

const PERSIST_INTERVAL_MS = 2000; // throttle backend writes while walking
const PERSIST_MIN_MOVE = 0.6;     // world units; skip writes for tiny jitter

export function useSurfaceWorld(planet, sharedSim) {
  const worldRef = useRef(null);

  // (Re)build the world whenever the planet changes.
  useEffect(() => {
    if (!planet) { worldRef.current = null; return; }

    // Reuse the page's sim instance so POI/NPC placement and the player share one
    // coordinate mapping; fall back to creating one if not supplied.
    const sim = sharedSim || createSurfaceSim(planet.mapData || {}, { scale: DEFAULTS.scale });

    // Initial spawn: resume the character's saved position on THIS planet, else the
    // spaceport spawn pad, else map center.
    const ch = useCharacterStore.getState().currentCharacter;
    const sp = planet.mapData?.spaceport;
    let surf = { x: 50, y: 50, area: 'surface' };
    const onThisPlanet = ch && (ch.currentPlanet === planet.id);
    const loc = ch?.currentLocation;
    if (onThisPlanet && loc && Number.isFinite(loc.x) && Number.isFinite(loc.y) && (loc.x || loc.y)) {
      surf = { x: loc.x > 100 ? loc.x / 10 : loc.x, y: loc.y > 100 ? loc.y / 10 : loc.y, area: loc.area || 'surface' };
    } else if (sp && Number.isFinite(sp.spawnX)) {
      surf = { x: sp.spawnX, y: sp.spawnY, area: 'spaceport' };
    } else if (sp && Number.isFinite(sp.x)) {
      surf = { x: sp.x, y: sp.y, area: 'spaceport' };
    }
    const w0 = sim.surfaceToWorld(surf.x, surf.y);

    const world = {
      planetId: planet.id,
      sim,
      ready: true,
      player: { x: w0.x, z: w0.z, facing: Math.PI, moving: false, speed: 0 },
      // persistence bookkeeping
      _persistAcc: 0,
      _lastPersist: { x: surf.x, y: surf.y },
      _persisting: false,

      /** Integrate the player for one frame from the current input. */
      step(input, dt) {
        const next = sim.integrate(this.player, input, dt);
        this.player.x = next.x;
        this.player.z = next.z;
        this.player.facing = next.facing;
        this.player.moving = next.moving;
        this.player.speed = next.speed;

        this._persistAcc += dt;
        if (this._persistAcc >= PERSIST_INTERVAL_MS / 1000) {
          this._persistAcc = 0;
          this.persist(false);
        }
        return this.player;
      },

      /** Current player position in 0–100 surface coords. */
      getSurfacePos() {
        return sim.worldToSurface(this.player.x, this.player.z);
      },

      /** Persist to the backend (throttled; skips tiny/no movement unless forced). */
      async persist(force) {
        if (this._persisting) return;
        const s = sim.worldToSurface(this.player.x, this.player.z);
        const moved = Math.hypot(
          (s.x - this._lastPersist.x) * sim.scale,
          (s.y - this._lastPersist.y) * sim.scale,
        );
        if (!force && moved < PERSIST_MIN_MOVE) return;
        this._persisting = true;
        this._lastPersist = { x: s.x, y: s.y };
        try {
          const { updateLocation } = useCharacterStore.getState();
          await updateLocation(planet.id, {
            x: Math.max(0, Math.min(100, s.x)),
            y: Math.max(0, Math.min(100, s.y)),
            area: 'surface',
          });
        } catch (e) {
          // Non-fatal: keep walking; we'll retry on the next interval.
        } finally {
          this._persisting = false;
        }
      },
    };

    worldRef.current = world;

    // Record arrival (sets currentPlanet + location) shortly after mount.
    const arrivalTimer = setTimeout(() => { try { world.persist(true); } catch (e) {} }, 600);

    return () => {
      clearTimeout(arrivalTimer);
      // Final save on unmount / planet change.
      try { world.persist(true); } catch (e) { /* ignore */ }
      worldRef.current = null;
    };
  }, [planet?.id]);

  return worldRef;
}
