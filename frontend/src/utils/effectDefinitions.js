/**
 * Effect Definitions
 * Shared frontend definitions for special effects
 * This should match the backend specialEffectsService.js definitions
 */

export const EFFECT_DEFINITIONS = {
  // Veil Effects
  veil_enhancement: {
    name: 'Veil Enhancement',
    description: 'Increases Veil power by 10%',
    icon: '✨',
    category: 'force'
  },
  veil_mastery: {
    name: 'Veil Mastery',
    description: 'Unlocks Veil abilities',
    icon: '⚡',
    category: 'force'
  },
  veil_insight: {
    name: 'Veil Insight',
    description: 'Improves Veil perception',
    icon: '👁️',
    category: 'force'
  },
  arcblade_mastery: {
    name: 'Arcblade Mastery',
    description: '+10% damage with arcblades',
    icon: '⚔️',
    category: 'combat'
  },
  
  // Combat Effects
  ion_damage: {
    name: 'Ion Damage',
    description: 'Extra damage to droids (+50%)',
    icon: '⚡',
    category: 'combat'
  },
  droid_bonus: {
    name: 'Droid Bonus',
    description: '+25% damage to droids',
    icon: '🤖',
    category: 'combat'
  },
  energy_resistance: {
    name: 'Energy Uprising',
    description: '-20% energy damage taken',
    icon: '🛡️',
    category: 'defense'
  },
  masterwork_quality: {
    name: 'Masterwork Quality',
    description: '+5% to all combat stats',
    icon: '⭐',
    category: 'combat'
  },
  
  // Utility Effects
  data_analysis: {
    name: 'Data Analysis',
    description: 'Unlocks information from datapads',
    icon: '📊',
    category: 'utility'
  },
  long_range_comm: {
    name: 'Long-Range Communication',
    description: 'Enables long-distance communication',
    icon: '📡',
    category: 'utility'
  },
  secure_comm: {
    name: 'Secure Communication',
    description: 'Encrypted communication',
    icon: '🔒',
    category: 'utility'
  },
  stealth_bonus: {
    name: 'Stealth Bonus',
    description: '+15% stealth effectiveness',
    icon: '👤',
    category: 'utility'
  },
  detection_reduction: {
    name: 'Detection Reduction',
    description: '-20% detection chance',
    icon: '👁️',
    category: 'utility'
  },
  
  // Faction Effects
  dominion_identification: {
    name: 'Dominion Identification',
    description: 'Recognized as Dominion (access benefits)',
    icon: '🏛️',
    category: 'faction'
  },
  ironkin_craftsmanship: {
    name: 'Ironkin Craftsmanship',
    description: '+10% durability',
    icon: '🔨',
    category: 'craftsmanship'
  },
  beskar_quality: {
    name: 'Beskar Quality',
    description: '+25% durability, energy resistance',
    icon: '💎',
    category: 'craftsmanship'
  },
  smuggling_bonus: {
    name: 'Smuggling Bonus',
    description: '+15% smuggling success',
    icon: '📦',
    category: 'utility'
  },
  
  // Legendary Effects
  legendary_weapon: {
    name: 'Legendary Weapon',
    description: '+10% to all stats',
    icon: '🌟',
    category: 'legendary'
  },
  luck_bonus: {
    name: 'Luck Bonus',
    description: '+5% to all random rolls',
    icon: '🍀',
    category: 'legendary'
  },
  legendary_armor: {
    name: 'Legendary Armor',
    description: '+15% defense, +10% durability',
    icon: '🛡️',
    category: 'legendary'
  },
  ancient_power: {
    name: 'Ancient Power',
    description: 'Mysterious power from ancient times',
    icon: '🔮',
    category: 'legendary'
  },
  legendary_artifact: {
    name: 'Legendary Artifact',
    description: 'Powerful artifact properties',
    icon: '💫',
    category: 'legendary'
  },
  specialized_repair: {
    name: 'Specialized Repair',
    description: 'Specialized repair capabilities',
    icon: '🔧',
    category: 'utility'
  },
  healing_bonus: {
    name: 'Healing Bonus',
    description: 'Bonus to healing actions',
    icon: '💚',
    category: 'utility'
  },
  instant_heal: {
    name: 'Instant Heal',
    description: 'Enables instant healing',
    icon: '⚡',
    category: 'utility'
  },
  master_craftsmanship: {
    name: 'Master Craftsmanship',
    description: 'Enhances all crafting skills',
    icon: '🎨',
    category: 'craftsmanship'
  },
  durability_bonus: {
    name: 'Durability Bonus',
    description: 'Increases item durability',
    icon: '💪',
    category: 'craftsmanship'
  }
};

/**
 * Get effect display information
 * @param {string} effectId - Effect ID
 * @returns {Object} Effect display info with fallback
 */
export function getEffectDisplay(effectId) {
  const effect = EFFECT_DEFINITIONS[effectId];
  if (effect) {
    return effect;
  }
  
  // Fallback for unknown effects
  return {
    name: effectId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    description: 'Unknown effect',
    icon: '✨',
    category: 'unknown'
  };
}

/**
 * Get all effects for display
 * @param {Array<string>} effectIds - Array of effect IDs
 * @returns {Array<Object>} Array of effect display objects
 */
export function getEffectsDisplay(effectIds) {
  if (!effectIds || !Array.isArray(effectIds)) {
    return [];
  }
  
  return effectIds.map(effectId => getEffectDisplay(effectId));
}


