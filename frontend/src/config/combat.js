/**
 * Frontend mirror of the backend COMBAT_3D_ONLY migration flag (Phase 7 — retire turn-based).
 *
 * When ON (the default), player-facing combat flows EXCLUSIVELY through the real-time 3D engine.
 * The legacy turn-based card route (/game/combat) is NO LONGER used as an offline fallback — when
 * the realtime server is unreachable, combat triggers surface a graceful "needs a live connection"
 * message instead of starting a turn-based encounter.
 *
 * It is reversible: set `VITE_COMBAT_3D_ONLY=false` to temporarily restore the turn-based fallback
 * (the old UI/engine is still present but dormant during the staged retirement; it is deleted in
 * Phase 7b). Mirrors backend/src/config/combat.js `isCombat3DOnly()`.
 */
export function isCombat3DOnly() {
  // Default to '3D-only ON' — anything other than an explicit 'false' keeps the new behavior.
  const v = (import.meta && import.meta.env && import.meta.env.VITE_COMBAT_3D_ONLY);
  return String(v ?? 'true').toLowerCase() !== 'false';
}

/** User-facing copy when a combat action can't proceed because the realtime server is unreachable. */
export const COMBAT_OFFLINE_MESSAGE = 'Combat needs a live connection — reconnecting to the server…';
