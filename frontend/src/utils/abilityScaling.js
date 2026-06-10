/**
 * Ability Scaling Utility (Frontend)
 * Shared calculations with backend for UI display
 */

/**
 * Calculate piecewise attribute multiplier
 * @param {number} attribute - Attribute value
 * @param {number} baseAttribute - Base attribute (usually 10)
 * @param {Array} tiers - Array of {max, multiplier} tiers
 * @returns {number} Multiplier (e.g., 1.3 = +30%)
 */
export function calculateAttributeMultiplier(attribute, baseAttribute = 10, tiers) {
  if (!tiers || tiers.length === 0) return 1.0;
  
  const bonus = attribute - baseAttribute;
  if (bonus <= 0) return 1.0;
  
  let multiplier = 1.0;
  let remaining = bonus;
  let lastMax = 0;
  
  for (const tier of tiers) {
    const tierRange = tier.max - lastMax;
    const tierBonus = Math.min(remaining, tierRange);
    
    multiplier += tierBonus * tier.multiplier;
    remaining -= tierBonus;
    
    if (remaining <= 0) break;
    lastMax = tier.max;
  }
  
  // If bonus exceeds all tiers, apply last tier's multiplier to remainder
  if (remaining > 0 && tiers.length > 0) {
    const lastTier = tiers[tiers.length - 1];
    multiplier += remaining * lastTier.multiplier;
  }
  
  return multiplier;
}

/**
 * Calculate healing with piecewise scaling
 * @param {number} baseHealing - Base healing amount
 * @param {number} intelligence - Intelligence attribute
 * @param {number} medicLevel - Field Medic skill level
 * @returns {number} Final healing amount
 */
export function calculateHealing(baseHealing, intelligence, medicLevel) {
  // Piecewise intelligence scaling (2 tiers)
  const intTiers = [
    { max: 10, multiplier: 0.03 },  // +3% per point (0-10 above base)
    { max: Infinity, multiplier: 0.015 } // +1.5% per point (11+ above base)
  ];
  
  const intMultiplier = calculateAttributeMultiplier(intelligence, 10, intTiers);
  
  // Multiplicative skill bonus: +5% per level
  const skillMultiplier = 1 + (medicLevel * 0.05);
  
  // Final calculation: base * attribute * skill (multiplicative)
  return Math.floor(baseHealing * intMultiplier * skillMultiplier);
}

/**
 * Calculate damage with piecewise scaling
 * @param {number} baseDamage - Base damage amount
 * @param {number} strength - Strength attribute
 * @param {number} skillLevel - Combat skill level
 * @param {number} skillBonusPercent - Skill bonus as percentage (e.g., 10 = +10%)
 * @returns {number} Final damage amount
 */
export function calculateDamage(baseDamage, strength, skillLevel, skillBonusPercent = 0) {
  // Piecewise strength scaling (2 tiers)
  const strTiers = [
    { max: 10, multiplier: 0.02 },  // +2% per point (0-10 above base)
    { max: Infinity, multiplier: 0.01 } // +1% per point (11+ above base)
  ];
  
  const strMultiplier = calculateAttributeMultiplier(strength, 10, strTiers);
  
  // Multiplicative skill bonus
  const skillMultiplier = 1 + (skillBonusPercent / 100);
  
  // Final calculation: base * attribute * skill (multiplicative)
  return Math.floor(baseDamage * strMultiplier * skillMultiplier);
}

/**
 * Calculate crafting success with piecewise scaling
 * @param {number} baseSuccess - Base success chance (0-1)
 * @param {number} intelligence - Intelligence attribute
 * @param {number} engineeringLevel - Engineering skill level
 * @param {number} difficulty - Difficulty modifier (0-1, higher = harder)
 * @returns {number} Final success chance (0-1)
 */
export function calculateCraftingSuccess(baseSuccess, intelligence, engineeringLevel, difficulty = 0) {
  // Piecewise intelligence scaling (2 tiers)
  const intTiers = [
    { max: 10, multiplier: 0.02 },  // +2% per point (0-10 above base)
    { max: Infinity, multiplier: 0.01 } // +1% per point (11+ above base)
  ];
  
  const intMultiplier = calculateAttributeMultiplier(intelligence, 10, intTiers);
  
  // Multiplicative skill bonus: +5% per level
  const skillMultiplier = 1 + (engineeringLevel * 0.05);
  
  // Final calculation: base * attribute * skill - difficulty
  const finalSuccess = baseSuccess * intMultiplier * skillMultiplier - difficulty;
  
  // Clamp to reasonable range
  return Math.max(0.1, Math.min(0.95, finalSuccess));
}

