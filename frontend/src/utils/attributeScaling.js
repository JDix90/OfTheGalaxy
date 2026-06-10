/**
 * Attribute Scaling Utility (Frontend)
 * Shared calculations with backend for UI display
 */

/**
 * Calculate attribute point cost
 * @param {number} current - Current attribute value
 * @param {number} softCap - Soft cap (default 50)
 * @returns {number} Cost in attribute points
 */
export function getAttributePointCost(current, softCap = 50) {
  const baseCost = 1;
  if (current < softCap) return baseCost;
  
  const overSoft = current - softCap;
  // Cost increases: base * (1 + ((current - softCap) / 10)^1.5)
  const multiplier = 1 + Math.pow(overSoft / 10, 1.5);
  return Math.ceil(baseCost * multiplier);
}

/**
 * Calculate attribute gain (with flattening past soft cap)
 * @param {number} current - Current attribute value
 * @param {number} baseGain - Base gain per point (usually 1)
 * @param {number} softCap - Soft cap (default 50)
 * @returns {number} Actual gain
 */
export function getAttributeGain(current, baseGain = 1, softCap = 50) {
  if (current < softCap) return baseGain;
  
  const ratio = softCap / Math.max(softCap, current);
  // Gain flattens: baseGain * (softCap / current)^1.35
  const flattenedGain = baseGain * Math.pow(ratio, 1.35);
  return Math.max(0.5, flattenedGain); // Minimum 0.5 gain
}

/**
 * Check if attribute can be increased
 * @param {number} current - Current attribute value
 * @param {number} availablePoints - Available attribute points
 * @param {number} hardCap - Hard cap (default 100)
 * @param {number} softCap - Soft cap (default 50)
 * @returns {Object} {canIncrease: boolean, cost: number, gain: number, reason: string}
 */
export function canIncreaseAttribute(current, availablePoints, hardCap = 100, softCap = 50) {
  if (current >= hardCap) {
    return {
      canIncrease: false,
      cost: 0,
      gain: 0,
      reason: 'Attribute at hard cap (100)'
    };
  }
  
  const cost = getAttributePointCost(current, softCap);
  const gain = getAttributeGain(current, 1, softCap);
  
  if (availablePoints < cost) {
    return {
      canIncrease: false,
      cost,
      gain,
      reason: `Need ${cost} attribute point(s), have ${availablePoints}`
    };
  }
  
  return {
    canIncrease: true,
    cost,
    gain,
    reason: null
  };
}

/**
 * Get cost preview for multiple levels
 * @param {number} current - Current attribute value
 * @param {number} levels - Number of levels to preview
 * @param {number} softCap - Soft cap (default 50)
 * @returns {Array} Array of {level: number, cost: number, totalCost: number}
 */
export function getCostPreview(current, levels = 5, softCap = 50) {
  const preview = [];
  let totalCost = 0;
  
  for (let i = 0; i < levels; i++) {
    const level = current + i;
    if (level >= 100) break; // Hard cap
    
    const cost = getAttributePointCost(level, softCap);
    totalCost += cost;
    
    preview.push({
      level: level + 1,
      cost,
      totalCost
    });
  }
  
  return preview;
}

