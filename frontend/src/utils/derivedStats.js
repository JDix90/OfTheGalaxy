/**
 * Derived Stats Utility (Frontend)
 * Shared calculations with backend for UI display
 */

// Note: This is a simplified version for frontend use
// Full calculations should be done on backend and passed to frontend
// This is mainly for preview/display purposes

import { ProgressionSystem } from '../core/progression/ProgressionSystem';
import { calculateCritChance, calculateDodgeChance } from './diminishingReturns';

/**
 * Apply diminishing returns curve
 * @param {number} raw - Raw value
 * @param {number} cap - Maximum value
 * @param {number} threshold - Threshold for curve
 * @param {number} power - Power exponent
 * @returns {number} Effective value after DR
 */
export function applyDR(raw, cap, threshold, power = 1.5) {
  if (raw <= 0) return 0;
  if (raw >= cap * 10) return cap; // Early exit for very high values
  
  const ratio = raw / (raw + threshold);
  const effective = cap * Math.pow(ratio, power);
  
  return Math.max(0, Math.min(cap, effective));
}

/**
 * Calculate logistic success function
 * @param {number} raw - Raw value (skill + attribute - difficulty)
 * @param {number} k - Curve steepness (default 0.35)
 * @returns {number} Success chance (0-1)
 */
export function calculateLogistic(raw, k = 0.35) {
  const logistic = 1 / (1 + Math.exp(-k * raw));
  return Math.max(0.1, Math.min(0.95, logistic));
}

/**
 * Calculate crit chance preview (for UI)
 * @param {number} perception - Perception attribute
 * @param {number} advWeapons - Advanced Weapons skill level
 * @param {number} skillCritBonus - Additional crit bonus from skills (as decimal, e.g., 0.05 = 5%)
 * @returns {number} Crit chance (0-0.5)
 */
export function calculateCritChancePreview(perception, advWeapons = 0, skillCritBonus = 0) {
  const baseCrit = 0.05;
  const perceptionBonus = Math.max(0, (perception - 10) * 0.01);
  const advWeaponsBonus = advWeapons * 0.01;
  const rawCrit = baseCrit + perceptionBonus + advWeaponsBonus + skillCritBonus;
  
  return applyDR(rawCrit, 0.50, 0.15, 1.5);
}

/**
 * Calculate attack rating preview (for UI)
 * @param {number} baseAttack - Base attack from attributes
 * @param {number} weaponBase - Weapon base damage
 * @param {number} strength - Strength attribute
 * @param {number} advWeapons - Advanced Weapons skill level
 * @returns {number} Attack rating
 */
export function calculateAttackRatingPreview(baseAttack, weaponBase, strength, advWeapons = 0) {
  return (baseAttack + weaponBase) * (1 + advWeapons * 0.02) * (1 + strength * 0.01);
}

/**
 * Calculate defense rating preview (for UI)
 * @param {number} baseDefense - Base defense from attributes
 * @param {number} armorBase - Armor base defense
 * @param {number} endurance - Endurance attribute
 * @param {number} tacticalAwareness - Tactical Awareness skill level
 * @returns {number} Defense rating
 */
export function calculateDefenseRatingPreview(baseDefense, armorBase, endurance, tacticalAwareness = 0) {
  return (baseDefense + armorBase) * (1 + tacticalAwareness * 0.03) * (1 + endurance * 0.01);
}

/**
 * Format stat breakdown for display
 * @param {Object} breakdown - Breakdown object from backend
 * @returns {Array} Formatted breakdown items
 */
export function formatStatBreakdown(breakdown) {
  if (!breakdown || typeof breakdown !== 'object') return [];
  
  return Object.entries(breakdown).map(([key, component]) => ({
    key,
    label: component.description || key,
    value: component.value,
    source: component.source
  }));
}

/**
 * Calculate combat stats for character (simplified frontend version)
 * @param {Object} character - Character object
 * @param {Object} equipment - Equipment data
 * @returns {Object} Combat stats with breakdowns
 */
export function calculateCombatStats({ character, equipment = {} }) {
  if (!character) {
    return {
      attackRating: { value: 0, breakdown: {} },
      defenseRating: { value: 0, breakdown: {} },
      critChance: { value: 0, breakdown: {} },
      dodgeChance: { value: 0, breakdown: {} }
    };
  }

  const stats = character.stats || {};
  const progressionSystem = new ProgressionSystem(character);
  
  // Get skill levels
  const advWeapons = progressionSystem.getSkillLevel('combat', 'advanced_weapons');
  const tacticalAwareness = progressionSystem.getSkillLevel('combat', 'tactical_awareness');
  const basicCombat = progressionSystem.getSkillLevel('combat', 'basic_combat');
  const basicStealth = progressionSystem.getSkillLevel('stealth', 'basic_stealth');
  
  // Get passive bonuses
  const passiveBonuses = progressionSystem.getPassiveBonuses();
  
  // Calculate base stats
  const baseAttack = Math.floor((stats.strength || 10) / 2) + Math.floor((stats.agility || 10) / 4);
  const baseDefense = Math.floor((stats.endurance || 10) / 2);
  
  const weaponBase = equipment.weaponBase || 10;
  const armorBase = equipment.armorBase || 0;
  
  // Attack Rating
  const attackRating = (baseAttack + weaponBase) * (1 + advWeapons * 0.02) * (1 + (stats.strength || 10) * 0.01);
  
  // Defense Rating
  const defenseRating = (baseDefense + armorBase) * (1 + tacticalAwareness * 0.03) * (1 + (stats.endurance || 10) * 0.01);
  
  // Crit Chance (with DR)
  const critChance = calculateCritChance(
    stats.perception || 10,
    passiveBonuses.combat.critChance || 0,
    0
  );
  
  // Dodge Chance (with DR)
  const dodgeChance = calculateDodgeChance(
    stats.agility || 10,
    passiveBonuses.combat.dodge || 0,
    0
  );
  
  return {
    attackRating: {
      value: attackRating,
      breakdown: {
        base: { label: 'Base Attack', value: baseAttack },
        weapon: { label: 'Weapon', value: weaponBase },
        advWeapons: { label: 'Advanced Weapons', value: advWeapons, unit: ' level' },
        strength: { label: 'Strength', value: stats.strength || 10 }
      }
    },
    defenseRating: {
      value: defenseRating,
      breakdown: {
        base: { label: 'Base Defense', value: baseDefense },
        armor: { label: 'Armor', value: armorBase },
        tacticalAwareness: { label: 'Tactical Awareness', value: tacticalAwareness, unit: ' level' },
        endurance: { label: 'Endurance', value: stats.endurance || 10 }
      }
    },
    critChance: {
      value: critChance,
      breakdown: {
        base: { label: 'Base', value: 0.05, unit: ' (5%)' },
        perception: { label: 'Perception', value: stats.perception || 10 },
        skillBonus: { label: 'Skill Bonus', value: passiveBonuses.combat.critChance || 0, unit: '%' }
      }
    },
    dodgeChance: {
      value: dodgeChance,
      breakdown: {
        agility: { label: 'Agility', value: stats.agility || 10 },
        skillBonus: { label: 'Skill Bonus', value: passiveBonuses.combat.dodge || 0, unit: '%' }
      }
    }
  };
}

