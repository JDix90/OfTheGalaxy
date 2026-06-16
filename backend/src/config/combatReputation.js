/**
 * Combat → faction reputation config (Phase 8.1).
 *
 * Killing a faction-tagged enemy lowers your standing with that faction. The deltas
 * are tier-scaled so tougher foes cost more rep. Everything here is pure (no DB, no
 * side effects) so it can be unit-tested without a database; the actual write happens
 * in combatService.applyFactionReputationForKills via factionService.
 *
 * Toggle: FACTION_REP_ON_KILL env var. Default ON. Set to 'false' to disable the
 * whole feature (repDeltaForKill then returns 0 for every kill, so the funnel hook
 * becomes a no-op). Read at call-time, not module-load, so tests can flip it.
 */

// Negative deltas — killing a faction's members makes them like you less. Magnitudes
// are deliberately small: a normal grunt is a rounding error, but farming elites adds
// up. Tiers come from enemy templates (normal/veteran/elite); 'boss' is reserved for
// scripted set-pieces (spawnScriptedEnemy isBoss / tier:'boss').
const REP_DELTA_BY_TIER = {
  normal: -2,
  veteran: -4,
  elite: -8,
  boss: -12,
};

/**
 * Is the combat→reputation feature enabled? Read live so env changes (and tests that
 * set process.env.FACTION_REP_ON_KILL) take effect without a module reload.
 * @returns {boolean}
 */
function repOnKillEnabled() {
  return String(process.env.FACTION_REP_ON_KILL ?? 'true').toLowerCase() !== 'false';
}

/**
 * Reputation delta earned for killing a single enemy combatant.
 * Returns 0 (no-op) when the feature is off, the combatant is missing/untagged, or the
 * tier is unknown-but-faction-tagged (falls back to the 'normal' magnitude).
 * @param {{ faction?: string|null, tier?: string }} combatant
 * @returns {number} signed reputation delta (<= 0)
 */
function repDeltaForKill(combatant) {
  if (!repOnKillEnabled()) return 0;
  if (!combatant || !combatant.faction) return 0;
  const tier = combatant.tier || 'normal';
  return REP_DELTA_BY_TIER[tier] ?? REP_DELTA_BY_TIER.normal;
}

module.exports = {
  REP_DELTA_BY_TIER,
  repOnKillEnabled,
  repDeltaForKill,
};
