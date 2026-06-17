/**
 * useSurfaceWorld — the IWorld seam for the walkable 3D surface.
 *
 * The scene reads ONE `world` object and doesn't care where movement authority lives:
 *  - SINGLE-PLAYER / OFFLINE (LocalWorld): the player is integrated by the shared surface
 *    sim at render rate, and position is persisted to the backend on a throttle.
 *  - NETWORKED (Phase 4): when `net` options are supplied, a NetClient streams inputs to
 *    the authoritative server and reconciles the predicted player against snapshots; the
 *    server owns position + persistence. If the server is unreachable it transparently
 *    falls back to the LocalWorld behavior (offline), so single-player always works.
 *
 * Everything the render loop touches lives in a ref (no per-frame React re-renders).
 */

import { useEffect, useRef } from 'react';
import { useCharacterStore } from '../state/characterSlice';
import { createSurfaceSim, DEFAULTS } from '../../../shared/sim/surface.mjs';
import { NetClient } from './netClient';
import { snapToWalkable } from '../components/surface3d/surfaceData';

const PERSIST_INTERVAL_MS = 2000; // throttle backend writes while walking (offline path)
const PERSIST_MIN_MOVE = 0.6;     // world units; skip writes for tiny jitter

export function useSurfaceWorld(planet, sharedSim, netOptions) {
  const worldRef = useRef(null);
  const netEnabled = !!(netOptions && netOptions.enabled && netOptions.token && netOptions.characterId);

  // (Re)build the world whenever the planet changes.
  useEffect(() => {
    if (!planet) { worldRef.current = null; return; }

    const sim = sharedSim || createSurfaceSim(planet.mapData || {}, { scale: DEFAULTS.scale });

    // Initial spawn (also the authoritative server's spawn formula): resume saved position
    // on THIS planet, else the spaceport pad, else map center.
    const ch = useCharacterStore.getState().currentCharacter;
    const sp = planet.mapData?.spaceport;
    let surf = { x: 50, y: 50, area: 'surface' };
    const onThisPlanet = ch && (ch.currentPlanet === planet.id);
    const loc = ch?.currentLocation;
    // Only resume a SURFACE-area saved position. A 'submap' position (e.g. just exited a
    // dungeon) is in the submap's own coord space — using it here would teleport the player
    // to garbage surface coords; fall through to the spaceport spawn instead.
    if (onThisPlanet && loc && loc.area !== 'submap' && Number.isFinite(loc.x) && Number.isFinite(loc.y) && (loc.x || loc.y)) {
      surf = { x: loc.x > 100 ? loc.x / 10 : loc.x, y: loc.y > 100 ? loc.y / 10 : loc.y, area: loc.area || 'surface' };
    } else if (sp && Number.isFinite(sp.spawnX)) {
      surf = { x: sp.spawnX, y: sp.spawnY, area: 'spaceport' };
    } else if (sp && Number.isFinite(sp.x)) {
      surf = { x: sp.x, y: sp.y, area: 'spaceport' };
    }
    // Snap out of any wall (e.g. a saved position from before the planet's tileMap changed, like
    // the dense medina) so the player is never boxed in. Mirrors the server's spawn guard; no-op
    // on open planets or already-walkable spots.
    const snapped = snapToWalkable(sim, surf.x, surf.y);
    surf = { ...surf, x: snapped.x, y: snapped.y };
    const w0 = sim.surfaceToWorld(surf.x, surf.y);

    const world = {
      planetId: planet.id,
      sim,
      ready: true,
      player: { x: w0.x, z: w0.z, facing: Math.PI, moving: false, speed: 0 },
      _net: null,
      // persistence bookkeeping (offline path)
      _persistAcc: 0,
      _lastPersist: { x: surf.x, y: surf.y },
      _persisting: false,

      /** True when there's no live server authority (single-player / server down). */
      isOffline() { return !this._net || this._net.mode === 'offline'; },

      /** Integrate the player for one frame from the current input. */
      step(input, dt) {
        // Local prediction (also the sole authority when offline).
        const next = sim.integrate(this.player, input, dt);
        this.player.x = next.x;
        this.player.z = next.z;
        this.player.facing = next.facing;
        this.player.moving = next.moving;
        this.player.speed = next.speed;

        if (this._net && this._net.mode === 'online') {
          // Server is authoritative + autosaves; just stream inputs (reconcile is async).
          this._net.pushInput(input, dt);
        } else {
          // Offline: persist position ourselves, throttled.
          this._persistAcc += dt;
          if (this._persistAcc >= PERSIST_INTERVAL_MS / 1000) {
            this._persistAcc = 0;
            this.persist(false);
          }
        }
        return this.player;
      },

      /** Live remote players (Phase 4.1) — empty unless online. */
      remotes() { return this._net ? this._net.remotes : null; },

      /** Combat (Phase 4.3) — cast an ability at a target enemy; server resolves. */
      cast(ability, targetId) { if (this._net) this._net.cast(ability, targetId); },
      /** Dodge-roll (Phase 4.4). */
      dodge() { if (this._net) this._net.dodge(); },
      /** Use a consumable in-world (Phase 3); server resolves on the authoritative combatant. */
      useItem(itemId) { if (this._net) this._net.useItem(itemId); },
      /** Request a server-authoritative scripted spawn (NPC/POI/quest combat, Phase 5). */
      requestSpawn(payload) { if (this._net) this._net.requestSpawn(payload); },
      /** Ability hotbar [{id,name,type,cd,stam,target}] (online). */
      hotbar() { return this._net ? this._net.hotbar : []; },
      /** Local ability-cooldown map (id → ms-until-ready) for the hotbar sweep. */
      castCd() { return this._net ? this._net.castCdUntil : null; },
      /** Recent combat log lines. */
      combatLog() { return this._net ? this._net.log : null; },
      /** Authoritative player combat state ({ hp, maxHp, dead }) or null offline. */
      combat() {
        const n = this._net;
        return n && n.selfHp != null ? { hp: n.selfHp, maxHp: n.selfMaxHp, dead: n.selfDead } : null;
      },
      /** Drain combat fx events (hit/death) for rendering damage numbers. */
      drainFx() { return this._net ? this._net.drainFx() : null; },
      /** Drain non-blocking combat toasts (reward/death) for the HUD. */
      drainToasts() { return this._net ? this._net.drainToasts() : null; },

      /** Current player position in 0–100 surface coords. */
      getSurfacePos() {
        return sim.worldToSurface(this.player.x, this.player.z);
      },

      /** Persist to the backend (offline path only; throttled). */
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
          // Non-fatal: keep walking; retry next interval.
        } finally {
          this._persisting = false;
        }
      },
    };

    worldRef.current = world;

    // Connect the authoritative net layer (with offline fallback) when enabled.
    if (netEnabled) {
      world._net = new NetClient({
        token: netOptions.token,
        characterId: netOptions.characterId,
        planetId: planet.id,
        sim,
        player: world.player,
        onStatus: netOptions.onStatus,
      });
      world._net.connect();
    }

    // Record arrival (offline path sets currentPlanet + location). Online: the server does it.
    const arrivalTimer = setTimeout(() => {
      try { if (world.isOffline()) world.persist(true); } catch (e) {}
    }, 800);

    return () => {
      clearTimeout(arrivalTimer);
      try { if (world.isOffline()) world.persist(true); } catch (e) { /* ignore */ }
      if (world._net) world._net.close();
      worldRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planet?.id, netEnabled]);

  return worldRef;
}
