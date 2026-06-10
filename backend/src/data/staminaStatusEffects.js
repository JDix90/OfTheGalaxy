/**
 * Stamina Status Effects
 * Defines status effects that apply when stamina is low
 */

const STAMINA_STATUS_EFFECTS = {
  exhausted: {
    id: 'exhausted',
    name: 'Exhausted',
    description: 'Completely out of stamina. Movement and actions are severely impaired.',
    icon: '⚠️',
    effects: {
      movementSpeed: -50, // -50% movement speed
      accuracy: -25, // -25% accuracy
      staminaRegenBonus: -50, // -50% regeneration rate
      damage: -10 // -10% damage output
    },
    condition: (character) => {
      return character.currentStamina === 0;
    },
    priority: 1 // Higher priority (applied first)
  },
  fatigued: {
    id: 'fatigued',
    name: 'Fatigued',
    description: 'Low on stamina. Actions are less effective.',
    icon: '⚡',
    effects: {
      accuracy: -10, // -10% accuracy
      damage: -5, // -5% damage output
      staminaRegenBonus: -20 // -20% regeneration rate
    },
    condition: (character) => {
      const staminaPercent = character.maxStamina > 0 
        ? (character.currentStamina / character.maxStamina) * 100 
        : 0;
      return staminaPercent < 25 && staminaPercent > 0;
    },
    priority: 2 // Lower priority (applied after exhausted)
  }
};

/**
 * Get active stamina status effects for a character
 * @param {Object} character - Character object
 * @returns {Array} Array of active status effect IDs
 */
function getActiveStaminaStatusEffects(character) {
  const activeEffects = [];
  
  // Check each status effect condition
  for (const [effectId, effect] of Object.entries(STAMINA_STATUS_EFFECTS)) {
    if (effect.condition(character)) {
      activeEffects.push(effectId);
    }
  }
  
  // Sort by priority (lower number = higher priority)
  return activeEffects.sort((a, b) => {
    const priorityA = STAMINA_STATUS_EFFECTS[a].priority || 999;
    const priorityB = STAMINA_STATUS_EFFECTS[b].priority || 999;
    return priorityA - priorityB;
  });
}

/**
 * Get status effect definition
 * @param {string} effectId - Effect ID
 * @returns {Object|null} Effect definition or null
 */
function getStatusEffect(effectId) {
  return STAMINA_STATUS_EFFECTS[effectId] || null;
}

/**
 * Get all status effect definitions
 * @returns {Object} All status effects
 */
function getAllStatusEffects() {
  return STAMINA_STATUS_EFFECTS;
}

/**
 * Calculate stat modifiers from active stamina status effects
 * @param {Object} character - Character object
 * @returns {Object} Stat modifiers
 */
function calculateStaminaStatusModifiers(character) {
  const activeEffects = getActiveStaminaStatusEffects(character);
  const modifiers = {
    movementSpeed: 0,
    accuracy: 0,
    damage: 0,
    staminaRegenBonus: 0
  };
  
  // Apply modifiers from active effects
  for (const effectId of activeEffects) {
    const effect = STAMINA_STATUS_EFFECTS[effectId];
    if (effect && effect.effects) {
      for (const [stat, value] of Object.entries(effect.effects)) {
        if (modifiers.hasOwnProperty(stat)) {
          modifiers[stat] += value;
        }
      }
    }
  }
  
  return modifiers;
}

module.exports = {
  STAMINA_STATUS_EFFECTS,
  getActiveStaminaStatusEffects,
  getStatusEffect,
  getAllStatusEffects,
  calculateStaminaStatusModifiers
};

