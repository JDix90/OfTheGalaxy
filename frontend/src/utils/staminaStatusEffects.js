/**
 * Stamina Status Effects (Frontend)
 * Utility functions for determining and displaying stamina status effects
 */

/**
 * Get active stamina status effects for a character
 * @param {Object} character - Character object
 * @returns {Array} Array of active status effect objects
 */
export function getActiveStaminaStatusEffects(character) {
  const activeEffects = [];
  
  if (!character) return activeEffects;
  
  const currentStamina = character.currentStamina || 0;
  const maxStamina = character.maxStamina || 100;
  const staminaPercent = maxStamina > 0 ? (currentStamina / maxStamina) * 100 : 0;
  
  // Exhausted: 0 stamina
  if (currentStamina === 0) {
    activeEffects.push({
      id: 'exhausted',
      name: 'Exhausted',
      description: 'Completely out of stamina. Movement and actions are severely impaired.',
      icon: '⚠️',
      severity: 'critical'
    });
  }
  // Fatigued: < 25% stamina
  else if (staminaPercent < 25 && staminaPercent > 0) {
    activeEffects.push({
      id: 'fatigued',
      name: 'Fatigued',
      description: 'Low on stamina. Actions are less effective.',
      icon: '⚡',
      severity: 'warning'
    });
  }
  
  return activeEffects;
}

/**
 * Get stamina status color based on percentage
 * @param {number} staminaPercent - Stamina percentage (0-100)
 * @returns {string} CSS color class
 */
export function getStaminaStatusColor(staminaPercent) {
  if (staminaPercent === 0) return 'critical';
  if (staminaPercent < 25) return 'warning';
  if (staminaPercent < 50) return 'low';
  return 'normal';
}

/**
 * Get stamina status warning message
 * @param {number} staminaPercent - Stamina percentage (0-100)
 * @returns {string|null} Warning message or null
 */
export function getStaminaWarning(staminaPercent) {
  if (staminaPercent === 0) {
    return 'Exhausted! Rest to recover stamina.';
  }
  if (staminaPercent < 10) {
    return 'Critical stamina! Actions will be severely impaired.';
  }
  if (staminaPercent < 25) {
    return 'Low stamina! Consider resting soon.';
  }
  return null;
}

