/**
 * Success Check Utility
 * Handles logistic success functions and advantage system
 */

/**
 * Calculate success chance using logistic function
 * @param {number} skill - Skill level or skill value
 * @param {number} attribute - Attribute value
 * @param {number} difficulty - Difficulty modifier (higher = harder)
 * @param {number} toolBonus - Tool quality bonus
 * @param {number} k - Logistic curve steepness (default 0.35)
 * @returns {number} Success chance (0-1)
 */
function calculateSuccessChance(skill, attribute, difficulty, toolBonus = 0, k = 0.35) {
  // Raw value: skill + attribute - difficulty + tool bonus
  const raw = skill + attribute - difficulty + toolBonus;
  
  // Logistic function: 1 / (1 + e^(-k * raw))
  const logistic = 1 / (1 + Math.exp(-k * raw));
  
  // Clamp to [0.1, 0.95] to prevent impossible/easy checks
  return Math.max(0.1, Math.min(0.95, logistic));
}

/**
 * Roll for success (single roll)
 * @param {number} successChance - Success chance (0-1)
 * @returns {boolean} True if successful
 */
function rollForSuccess(successChance) {
  return Math.random() <= successChance;
}

/**
 * Roll for success with advantage (two rolls, keep best)
 * @param {number} successChance - Success chance (0-1)
 * @returns {boolean} True if successful
 */
function rollWithAdvantage(successChance) {
  const roll1 = Math.random();
  const roll2 = Math.random();
  const bestRoll = Math.min(roll1, roll2); // Lower is better for success
  return bestRoll <= successChance;
}

/**
 * Roll for success with disadvantage (two rolls, keep worst)
 * @param {number} successChance - Success chance (0-1)
 * @returns {boolean} True if successful
 */
function rollWithDisadvantage(successChance) {
  const roll1 = Math.random();
  const roll2 = Math.random();
  const worstRoll = Math.max(roll1, roll2); // Higher is worse for success
  return worstRoll <= successChance;
}

/**
 * Roll for success with best-of-3 (for expensive actions)
 * @param {number} successChance - Success chance (0-1)
 * @returns {boolean} True if at least one roll succeeds
 */
function rollBestOfThree(successChance) {
  const roll1 = Math.random() <= successChance;
  const roll2 = Math.random() <= successChance;
  const roll3 = Math.random() <= successChance;
  return roll1 || roll2 || roll3;
}

/**
 * Calculate lockpicking success
 * @param {number} lockpickingLevel - Lockpicking skill level
 * @param {number} agility - Agility attribute
 * @param {number} lockTier - Lock tier (1-5, higher = harder)
 * @param {number} toolQuality - Tool quality bonus (0-5)
 * @param {boolean} hasAdvantage - Whether player has advantage (master lockpicks, etc.)
 * @returns {Object} {success: boolean, chance: number, usedAdvantage: boolean}
 */
function attemptLockpick(lockpickingLevel, agility, lockTier, toolQuality = 0, hasAdvantage = false) {
  // Difficulty: base 10 + (tier * 5)
  const difficulty = 10 + (lockTier * 5);
  
  // Calculate success chance
  const chance = calculateSuccessChance(lockpickingLevel, agility, difficulty, toolQuality);
  
  // Roll with advantage if available
  const success = hasAdvantage 
    ? rollWithAdvantage(chance)
    : rollForSuccess(chance);
  
  return {
    success,
    chance,
    usedAdvantage: hasAdvantage
  };
}

/**
 * Calculate hacking success
 * @param {number} hackingLevel - Hacking skill level
 * @param {number} intelligence - Intelligence attribute
 * @param {number} terminalTier - Terminal tier (1-5)
 * @param {number} toolQuality - Tool quality bonus
 * @param {boolean} hasAdvantage - Whether player has advantage
 * @returns {Object} {success: boolean, chance: number, usedAdvantage: boolean}
 */
function attemptHack(hackingLevel, intelligence, terminalTier, toolQuality = 0, hasAdvantage = false) {
  // Difficulty: base 12 + (tier * 6)
  const difficulty = 12 + (terminalTier * 6);
  
  // Calculate success chance
  const chance = calculateSuccessChance(hackingLevel, intelligence, difficulty, toolQuality);
  
  // Roll with advantage if available
  const success = hasAdvantage 
    ? rollWithAdvantage(chance)
    : rollForSuccess(chance);
  
  return {
    success,
    chance,
    usedAdvantage: hasAdvantage
  };
}

/**
 * Calculate crafting success (uses ability scaling, but also logistic for final check)
 * @param {number} baseSuccess - Base success from ability scaling
 * @param {number} difficulty - Recipe difficulty modifier
 * @returns {Object} {success: boolean, chance: number}
 */
function attemptCraft(baseSuccess, difficulty = 0) {
  // Apply difficulty modifier
  const chance = Math.max(0.1, Math.min(0.95, baseSuccess - difficulty));
  
  // Roll for success
  const success = rollForSuccess(chance);
  
  return {
    success,
    chance
  };
}

module.exports = {
  calculateSuccessChance,
  rollForSuccess,
  rollWithAdvantage,
  rollWithDisadvantage,
  rollBestOfThree,
  attemptLockpick,
  attemptHack,
  attemptCraft
};

