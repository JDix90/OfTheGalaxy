/**
 * useSubmapWorld — the IWorld seam for a walkable 3D submap interior (Phase 5).
 *
 * The submap analogue of useSurfaceWorld: a single-player LocalWorld over the shared
 * sim (built from the submap's collisionMap). Same `world` contract the scene reads
 * (player {x,z,facing,moving,speed}, step(input,dt), getSurfacePos(), persist()), so the
 * surface3d components drop in unchanged. Position persists scoped to the submap
 * (area:'submap', subMapId, parentLocationId) — distinct from the surface persist path.
 *
 * Submaps stay single-player/local for now (no realtime server); combat on submaps
 * still flows through the existing encounter → /game/combat path.
 */

import { useEffect, useRef } from 'react';
import { useCharacterStore } from '../state/characterSlice';
import { createSubmapSim, submapSpawn } from '../components/submap3d/submapData';

const PERSIST_INTERVAL_MS = 2000;
const PERSIST_MIN_MOVE = 0.6;

export function useSubmapWorld(subMap, sharedSim) {
  const worldRef = useRef(null);

  useEffect(() => {
    if (!subMap) { worldRef.current = null; return; }
    const sim = sharedSim || createSubmapSim(subMap);
    const ch = useCharacterStore.getState().currentCharacter;
    const surf = submapSpawn(subMap, ch);
    const w0 = sim.surfaceToWorld(surf.x, surf.y);
    const parentLocationId = subMap.parentLocationId || (subMap.layoutData && subMap.layoutData.parentLocationId);

    const world = {
      subMapId: subMap.id,
      planetId: subMap.planetId || (ch && ch.currentPlanet),
      sim,
      ready: true,
      player: { x: w0.x, z: w0.z, facing: Math.PI, moving: false, speed: 0 },
      _persistAcc: 0,
      _lastPersist: { x: surf.x, y: surf.y },
      _persisting: false,

      step(input, dt) {
        const next = sim.integrate(this.player, input, dt);
        this.player.x = next.x; this.player.z = next.z;
        this.player.facing = next.facing;
        this.player.moving = next.moving; this.player.speed = next.speed;
        this._persistAcc += dt;
        if (this._persistAcc >= PERSIST_INTERVAL_MS / 1000) { this._persistAcc = 0; this.persist(false); }
        return this.player;
      },

      getSurfacePos() { return sim.worldToSurface(this.player.x, this.player.z); },

      async persist(force) {
        if (this._persisting) return;
        const s = sim.worldToSurface(this.player.x, this.player.z);
        const moved = Math.hypot((s.x - this._lastPersist.x) * sim.scale, (s.y - this._lastPersist.y) * sim.scale);
        if (!force && moved < PERSIST_MIN_MOVE) return;
        this._persisting = true;
        this._lastPersist = { x: s.x, y: s.y };
        try {
          const { updateLocation } = useCharacterStore.getState();
          await updateLocation(this.planetId, {
            x: Math.max(0, Math.min(100, s.x)),
            y: Math.max(0, Math.min(100, s.y)),
            area: 'submap',
            subMapId: subMap.id,
            parentLocationId,
          });
        } catch (e) { /* non-fatal */ } finally { this._persisting = false; }
      },
    };

    worldRef.current = world;
    const arrival = setTimeout(() => { try { world.persist(true); } catch (e) {} }, 600);
    return () => {
      clearTimeout(arrival);
      try { world.persist(true); } catch (e) {}
      worldRef.current = null;
    };
  }, [subMap?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return worldRef;
}
