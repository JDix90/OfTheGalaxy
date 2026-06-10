/**
 * Diminishing Returns Utility (Frontend)
 * Shared calculations with backend
 */

/**
 * Apply diminishing returns using power curve
 * @param {number} raw - Raw value (before DR)
 * @param {number} cap - Maximum effective value
 * @param {number} threshold - Threshold for DR curve (higher = steeper curve)
 * @param {number} power - Power exponent (default 1.5, higher = steeper)
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
 * Calculate critical hit chance with DR
 * @param {number} perception - Perception attribute value
 * @param {number} skillBonus - Flat crit bonus from skills (as percentage, e.g., 3 = 3%)
 * @param {number} itemBonus - Flat crit bonus from items (as percentage)
 * @returns {number} Effective crit chance (0-0.5, i.e., 0-50%)
 */
export function calculateCritChance(perception, skillBonus = 0, itemBonus = 0) {
  // Base crit chance: 5%
  const baseCrit = 0.05;
  
  // Perception bonus: +1% per point above 10 (linear, no DR)
  const perceptionBonus = Math.max(0, (perception - 10) * 0.01);
  
  // Skill and item bonuses (flat additions)
  const flatBonus = (skillBonus + itemBonus) / 100;
  
  // Total raw crit chance
  const rawCrit = baseCrit + perceptionBonus + flatBonus;
  
  // Apply DR curve: cap at 50%, threshold 15, power 1.5
  return applyDR(rawCrit, 0.50, 0.15, 1.5);
}

/**
 * Calculate dodge/evasion chance with DR
 * @param {number} agility - Agility attribute value
 * @param {number} skillBonus - Flat dodge bonus from skills (as percentage)
 * @param {number} itemBonus - Flat dodge bonus from items (as percentage)
 * @returns {number} Effective dodge chance (0-0.6, i.e., 0-60%)
 */
export function calculateDodgeChance(agility, skillBonus = 0, itemBonus = 0) {
  // Base dodge: 0% (no base dodge)
  const baseDodge = 0;
  
  // Agility bonus: +0.5% per point above 10
  const agilityBonus = Math.max(0, (agility - 10) * 0.005);
  
  // Skill and item bonuses
  const flatBonus = (skillBonus + itemBonus) / 100;
  
  // Total raw dodge
  const rawDodge = baseDodge + agilityBonus + flatBonus;
  
  // Apply DR curve: cap at 60%, threshold 12, power 1.5
  return applyDR(rawDodge, 0.60, 0.12, 1.5);
}

/**
 * Calculate cooldown reduction with DR
 * @param {number} rawCDR - Raw cooldown reduction (as percentage, e.g., 20 = 20%)
 * @returns {number} Effective CDR (0-0.4, i.e., 0-40%)
 */
export function calculateCooldownReduction(rawCDR) {
  // Convert percentage to decimal
  const rawDecimal = rawCDR / 100;
  
  // Apply DR curve: cap at 40%, threshold 10, power 1.5
  return applyDR(rawDecimal, 0.40, 0.10, 1.5);
}

/**
 * Get DR curve preview (for UI display)
 * @param {number} cap - Maximum value
 * @param {number} threshold - Threshold
 * @param {number} power - Power exponent
 * @param {number} maxRaw - Maximum raw value to preview
 * @returns {Array} Array of {raw, effective} pairs
 */
export function getDRCurvePreview(cap, threshold, power, maxRaw = 100) {
  const preview = [];
  for (let raw = 0; raw <= maxRaw; raw += 5) {
    const effective = applyDR(raw / 100, cap, threshold, power);
    preview.push({
      raw: raw,
      effective: effective * 100, // Convert to percentage
      percentage: (effective / cap) * 100 // Percentage of cap
    });
  }
  return preview;
}

