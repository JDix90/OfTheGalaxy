/**
 * Inventory API Service
 * API calls for inventory management
 */

import { apiClient } from './client';

export const inventoryApi = {
  /**
   * Get inventory for a character
   * @param {string} characterId - Character ID
   * @param {string|null} rarity - Optional rarity filter
   */
  getInventory: async (characterId, rarity = null) => {
    const params = rarity ? { rarity } : {};
    return await apiClient.get(`/inventory/${characterId}`, { params });
  },

  /**
   * Get equipped items
   */
  getEquipped: async (characterId) => {
    return await apiClient.get(`/inventory/${characterId}/equipped`);
  },

  /**
   * Add item to inventory
   */
  addItem: async (characterId, itemId, quantity = 1, acquiredFrom = null) => {
    return await apiClient.post(`/inventory/${characterId}/items`, {
      itemId,
      quantity,
      acquiredFrom
    });
  },

  /**
   * Remove item from inventory
   */
  removeItem: async (characterId, itemId, quantity = 1) => {
    return await apiClient.delete(`/inventory/${characterId}/items/${itemId}`, {
      data: { quantity }
    });
  },

  /**
   * Equip an item
   */
  equipItem: async (characterId, itemId, slot) => {
    return await apiClient.put(`/inventory/${characterId}/equip/${itemId}`, {
      slot
    });
  },

  /**
   * Unequip an item
   */
  unequipItem: async (characterId, itemId) => {
    return await apiClient.put(`/inventory/${characterId}/unequip/${itemId}`);
  },

  /**
   * Use a consumable item
   */
  useItem: async (characterId, itemId) => {
    return await apiClient.post(`/inventory/${characterId}/use/${itemId}`);
  }
};


