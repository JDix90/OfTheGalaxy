/**
 * Character Bonuses Utility
 * Calculates species and background attribute bonuses
 */

// Species attribute bonuses
export const SPECIES_BONUSES = {
  human: { strength: 1, intelligence: 1, charisma: 1 },
  wookiee: { strength: 3, endurance: 2, intelligence: -1, charisma: -1 },
  twilek: { charisma: 2, agility: 2, strength: -1 },
  rodian: { perception: 2, agility: 2, endurance: -1 },
  zabrak: { endurance: 2, strength: 2, charisma: -1 },
  togruta: { perception: 2, intelligence: 2, strength: -1 },
  mirialan: { agility: 2, perception: 2, endurance: -1 },
  chiss: { intelligence: 2, perception: 2, strength: -1 }
};

// Background attribute bonuses
export const BACKGROUND_BONUSES = {
  smuggler: { agility: 2, charisma: 1 },
  scholar: { intelligence: 3 },
  soldier: { strength: 2, endurance: 1 },
  medic: { intelligence: 1, charisma: 2 },
  engineer: { intelligence: 2, perception: 1 },
  diplomat: { charisma: 3 },
  pilot: { agility: 2, perception: 1 }
};

/**
 * Calculate base stats with species and background bonuses
 * @param {string} species - Character species
 * @param {string} background - Character background
 * @returns {Object} Base stats object with bonuses applied
 */
export function calculateBaseStats(species, background) {
  const baseStats = {
    strength: 10,
    agility: 10,
    intelligence: 10,
    charisma: 10,
    perception: 10,
    endurance: 10
  };

  // Apply species bonuses
  const speciesBonus = SPECIES_BONUSES[species] || {};
  Object.keys(speciesBonus).forEach(stat => {
    baseStats[stat] = baseStats[stat] + speciesBonus[stat];
  });

  // Apply background bonuses
  const backgroundBonus = BACKGROUND_BONUSES[background] || {};
  Object.keys(backgroundBonus).forEach(stat => {
    baseStats[stat] = baseStats[stat] + backgroundBonus[stat];
  });

  return baseStats;
}

/**
 * Get species bonus for a specific attribute
 * @param {string} species - Character species
 * @param {string} attribute - Attribute name
 * @returns {number} Bonus value (0 if no bonus)
 */
export function getSpeciesBonus(species, attribute) {
  const bonuses = SPECIES_BONUSES[species] || {};
  return bonuses[attribute] || 0;
}

/**
 * Get background bonus for a specific attribute
 * @param {string} background - Character background
 * @param {string} attribute - Attribute name
 * @returns {number} Bonus value (0 if no bonus)
 */
export function getBackgroundBonus(background, attribute) {
  const bonuses = BACKGROUND_BONUSES[background] || {};
  return bonuses[attribute] || 0;
}

/**
 * Get total bonus (species + background) for a specific attribute
 * @param {string} species - Character species
 * @param {string} background - Character background
 * @param {string} attribute - Attribute name
 * @returns {number} Total bonus value
 */
export function getTotalBonus(species, background, attribute) {
  return getSpeciesBonus(species, attribute) + getBackgroundBonus(background, attribute);
}






