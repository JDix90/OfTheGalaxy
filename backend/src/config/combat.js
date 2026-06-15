/**
 * Combat configuration + lightweight telemetry for the combat-system migration.
 *
 * `COMBAT_3D_ONLY` (env, default false) is the migration kill-switch: when enabled, player-
 * facing combat is expected to flow exclusively through the real-time 3D engine. It is NOT
 * yet enforced across every entry point (that lands in later migration phases — see
 * docs/3d-migration/COMBAT-MIGRATION-PLAN.md); it exists now as a single source of truth that
 * instrumentation and future gates can read.
 */

/** Read the migration flag (env-driven so it can be toggled per-deploy without a rebuild). */
function isCombat3DOnly() {
  return String(process.env.COMBAT_3D_ONLY || '').toLowerCase() === 'true';
}

/**
 * Structured, low-noise telemetry for a combat finalization — one line per ended encounter,
 * tagged with the engine (realtime vs turn-based) so the migration can be watched in logs.
 * Never throws (telemetry must not break combat).
 */
function logCombatOutcome(info = {}) {
  try {
    console.log('[combat.metrics]', JSON.stringify({
      ev: 'endEncounter',
      engine: info.engine || 'turn-based',
      encounterType: info.encounterType || null,
      status: info.status || null,
      characterId: info.characterId || null,
      encounterId: info.encounterId || null,
      combat3dOnly: isCombat3DOnly(),
      ...(info.extra || {}),
    }));
  } catch (e) { /* swallow */ }
}

module.exports = { isCombat3DOnly, logCombatOutcome };
