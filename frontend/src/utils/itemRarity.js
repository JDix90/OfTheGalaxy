/**
 * Item Rarity Utilities
 * Provides color coding and utilities for item rarity system
 */

export const RARITY_COLORS = {
  common: '#9ca3af',      // Grey
  uncommon: '#10b981',   // Green
  rare: '#3b82f6',       // Blue
  epic: '#a855f7',       // Purple
  legendary: '#f97316'   // Orange
};

export const RARITY_NAMES = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary'
};

/**
 * Get color for rarity
 */
export const getRarityColor = (rarity) => {
  return RARITY_COLORS[rarity] || RARITY_COLORS.common;
};

/**
 * Get display name for rarity
 */
export const getRarityName = (rarity) => {
  return RARITY_NAMES[rarity] || 'Common';
};

/**
 * Get CSS class for rarity
 */
export const getRarityClass = (rarity) => {
  return `rarity-${rarity}`;
};

/**
 * Get border color for rarity (for item tooltips/cards)
 */
export const getRarityBorderColor = (rarity) => {
  return RARITY_COLORS[rarity] || RARITY_COLORS.common;
};

/**
 * Check if rarity is valid
 */
export const isValidRarity = (rarity) => {
  return Object.keys(RARITY_COLORS).includes(rarity);
};

/**
 * Get rarity order (for sorting)
 */
export const getRarityOrder = (rarity) => {
  const order = {
    common: 1,
    uncommon: 2,
    rare: 3,
    epic: 4,
    legendary: 5
  };
  return order[rarity] || 0;
};

/**
 * Sort items by rarity (legendary first)
 */
export const sortByRarity = (items) => {
  return [...items].sort((a, b) => {
    const aOrder = getRarityOrder(a.rarity || 'common');
    const bOrder = getRarityOrder(b.rarity || 'common');
    return bOrder - aOrder; // Descending (legendary first)
  });
};



