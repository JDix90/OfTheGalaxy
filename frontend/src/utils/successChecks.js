/**
 * Success Check Utility (Frontend)
 * Shared calculations with backend for UI previews
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
export function calculateSuccessChance(skill, attribute, difficulty, toolBonus = 0, k = 0.35) {
  // Raw value: skill + attribute - difficulty + tool bonus
  const raw = skill + attribute - difficulty + toolBonus;
  
  // Logistic function: 1 / (1 + e^(-k * raw))
  const logistic = 1 / (1 + Math.exp(-k * raw));
  
  // Clamp to [0.1, 0.95] to prevent impossible/easy checks
  return Math.max(0.1, Math.min(0.95, logistic));
}

/**
 * Calculate lockpicking success chance preview
 * @param {number} lockpickingLevel - Lockpicking skill level
 * @param {number} agility - Agility attribute
 * @param {number} lockTier - Lock tier (1-5)
 * @param {number} toolQuality - Tool quality bonus
 * @returns {number} Success chance (0-1)
 */
export function calculateLockpickChance(lockpickingLevel, agility, lockTier, toolQuality = 0) {
  const difficulty = 10 + (lockTier * 5);
  return calculateSuccessChance(lockpickingLevel, agility, difficulty, toolQuality);
}

/**
 * Calculate hacking success chance preview
 * @param {number} hackingLevel - Hacking skill level
 * @param {number} intelligence - Intelligence attribute
 * @param {number} terminalTier - Terminal tier (1-5)
 * @param {number} toolQuality - Tool quality bonus
 * @returns {number} Success chance (0-1)
 */
export function calculateHackChance(hackingLevel, intelligence, terminalTier, toolQuality = 0) {
  const difficulty = 12 + (terminalTier * 6);
  return calculateSuccessChance(hackingLevel, intelligence, difficulty, toolQuality);
}

/**
 * Get success chance previews (for UI display)
 * @param {number} currentChance - Current success chance
 * @param {number} skill - Current skill level
 * @param {number} attribute - Current attribute value
 * @param {number} difficulty - Current difficulty
 * @returns {Array} Array of preview objects
 */
export function getSuccessPreviews(currentChance, skill, attribute, difficulty) {
  return [
    {
      label: 'If skill +1',
      chance: calculateSuccessChance(skill + 1, attribute, difficulty)
    },
    {
      label: 'If attribute +1',
      chance: calculateSuccessChance(skill, attribute + 1, difficulty)
    },
    {
      label: 'If skill +3',
      chance: calculateSuccessChance(skill + 3, attribute, difficulty)
    }
  ];
}

