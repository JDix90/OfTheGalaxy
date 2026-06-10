/**
 * Combat Stats Calculator (Frontend)
 * Calculates combat stats for UI display
 */

// Import calculateCombatStats from derivedStats (it's exported there)
import { calculateCombatStats as calculateCombatStatsFromDerived } from './derivedStats';

/**
 * Calculate combat stats for character display
 * @param {Object} character - Character object
 * @param {Object} equipment - Equipment data (optional)
 * @returns {Object} Combat stats with breakdowns
 */
export function calculateCharacterCombatStats(character, equipment = {}) {
  if (!character) {
    return {
      attackRating: { value: 0, breakdown: {} },
      defenseRating: { value: 0, breakdown: {} },
      critChance: { value: 0, breakdown: {} },
      dodgeChance: { value: 0, breakdown: {} }
    };
  }

  // Get equipment values (default if not provided)
  const weaponBase = equipment.weaponBase || 10;
  const armorBase = equipment.armorBase || 0;

  // Calculate combat stats
  const combatStats = calculateCombatStatsFromDerived({
    character,
    equipment: {
      weaponBase,
      armorBase
    }
  });

  return combatStats;
}

/**
 * Get stat breakdown for display
 * @param {Object} statData - Stat data with breakdown
 * @returns {Object} Formatted breakdown
 */
export function formatStatBreakdown(statData) {
  if (!statData || !statData.breakdown) {
    return {};
  }

  const formatted = {};
  for (const [key, component] of Object.entries(statData.breakdown)) {
    formatted[key] = {
      label: component.label || key,
      value: component.calculatedValue !== undefined 
        ? component.calculatedValue 
        : component.value || 0,
      unit: component.unit || ''
    };
  }

  return formatted;
}

