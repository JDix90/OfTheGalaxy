/**
 * useDungeonWorld — the IWorld seam for a walkable 3D dungeon (Phase 5.1).
 *
 * The dungeon counterpart to useSurfaceWorld's NetWorld path: it connects a NetClient to
 * the authoritative dungeon submap world (real-time, server-resolved combat — same as the
 * surface), reconciling the predicted player against snapshots. Falls back to local
 * prediction + REST persistence (area:'submap') if the realtime server is unreachable.
 * Exposes the identical `world` contract the scene + combat UI read.
 */

import { useEffect, useRef } from 'react';
import { useCharacterStore } from '../state/characterSlice';
import { createSubmapSim, submapSpawn } from '../components/submap3d/submapData';
import { NetClient } from './netClient';

const PERSIST_INTERVAL_MS = 2000;
const PERSIST_MIN_MOVE = 0.6;

export function useDungeonWorld(subMap, sharedSim, netOptions) {
  const worldRef = useRef(null);
  const netEnabled = !!(netOptions && netOptions.enabled && netOptions.token && netOptions.characterId);

  useEffect(() => {
    if (!subMap) { worldRef.current = null; return; }
    const sim = sharedSim || createSubmapSim(subMap);
    const ch = useCharacterStore.getState().currentCharacter;
    const surf = submapSpawn(subMap, ch, sim);
    const w0 = sim.surfaceToWorld(surf.x, surf.y);
    const planetId = subMap.planetId || (ch && ch.currentPlanet);
    const parentLocationId = subMap.parentLocationId;

    const world = {
      subMapId: subMap.id,
      planetId,
      sim,
      ready: true,
      player: { x: w0.x, z: w0.z, facing: Math.PI, moving: false, speed: 0 },
      _net: null,
      _persistAcc: 0,
      _lastPersist: { x: surf.x, y: surf.y },
      _persisting: false,

      isOffline() { return !this._net || this._net.mode === 'offline'; },
      step(input, dt) {
        const n = sim.integrate(this.player, input, dt);
        this.player.x = n.x; this.player.z = n.z; this.player.facing = n.facing;
        this.player.moving = n.moving; this.player.speed = n.speed;
        if (this._net && this._net.mode === 'online') this._net.pushInput(input, dt);
        else { this._persistAcc += dt; if (this._persistAcc >= PERSIST_INTERVAL_MS / 1000) { this._persistAcc = 0; this.persist(false); } }
        return this.player;
      },
      remotes() { return this._net ? this._net.remotes : null; },
      cast(a, t) { if (this._net) this._net.cast(a, t); },
      dodge() { if (this._net) this._net.dodge(); },
      useItem(itemId) { if (this._net) this._net.useItem(itemId); },
      hotbar() { return this._net ? this._net.hotbar : []; },
      castCd() { return this._net ? this._net.castCdUntil : null; },
      combatLog() { return this._net ? this._net.log : null; },
      combat() { const n = this._net; return n && n.selfHp != null ? { hp: n.selfHp, maxHp: n.selfMaxHp, dead: n.selfDead } : null; },
      drainFx() { return this._net ? this._net.drainFx() : null; },
      drainToasts() { return this._net ? this._net.drainToasts() : null; },
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
          await updateLocation(planetId, { x: Math.max(0, Math.min(100, s.x)), y: Math.max(0, Math.min(100, s.y)), area: 'submap', subMapId: subMap.id, parentLocationId });
        } catch (e) { /* non-fatal */ } finally { this._persisting = false; }
      },
    };

    worldRef.current = world;
    if (netEnabled) {
      world._net = new NetClient({ token: netOptions.token, characterId: netOptions.characterId, planetId, subMapId: subMap.id, sim, player: world.player, onStatus: netOptions.onStatus });
      world._net.connect();
    }
    const arrival = setTimeout(() => { try { if (world.isOffline()) world.persist(true); } catch (e) {} }, 800);
    return () => {
      clearTimeout(arrival);
      try { if (world.isOffline()) world.persist(true); } catch (e) {}
      if (world._net) world._net.close();
      worldRef.current = null;
    };
  }, [subMap?.id, netEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

  return worldRef;
}
