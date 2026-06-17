/**
 * Vendor API Service
 * Frontend API calls for vendor/trading operations
 */

import { apiClient } from './client';

export const vendorApi = {
  /**
   * Get vendor inventory
   * @param {string} npcId - NPC ID
   * @returns {Promise} API response
   */
  getVendorInventory: async (npcId) => {
    return apiClient.get(`/vendors/${npcId}`);
  },

  /**
   * Get buy price quote
   * @param {string} npcId - NPC ID
   * @param {string} itemId - Item ID
   * @param {string} characterId - Character UUID
   * @param {number} quantity - Quantity
   * @returns {Promise} API response
   */
  getBuyPrice: async (npcId, itemId, characterId, quantity = 1) => {
    return apiClient.get(`/vendors/${npcId}/buy/${itemId}`, {
      params: { characterId, quantity }
    });
  },

  /**
   * Get sell price quote
   * @param {string} npcId - NPC ID
   * @param {string} itemId - Item ID
   * @param {string} characterId - Character UUID
   * @param {number} quantity - Quantity
   * @returns {Promise} API response
   */
  getSellPrice: async (npcId, itemId, characterId, quantity = 1) => {
    return apiClient.get(`/vendors/${npcId}/sell/${itemId}`, {
      params: { characterId, quantity }
    });
  },

  /**
   * Buy item from vendor
   * @param {string} npcId - NPC ID
   * @param {string} characterId - Character UUID
   * @param {string} itemId - Item ID
   * @param {number} quantity - Quantity
   * @returns {Promise} API response
   */
  buyItem: async (npcId, characterId, itemId, quantity = 1) => {
    return apiClient.post(`/vendors/${npcId}/buy`, {
      characterId,
      itemId,
      quantity
    });
  },

  /**
   * Sell item to vendor
   * @param {string} npcId - NPC ID
   * @param {string} characterId - Character UUID
   * @param {string} itemId - Item ID
   * @param {number} quantity - Quantity
   * @returns {Promise} API response
   */
  sellItem: async (npcId, characterId, itemId, quantity = 1) => {
    return apiClient.post(`/vendors/${npcId}/sell`, {
      characterId,
      itemId,
      quantity
    });
  },

  /**
   * Get buyback list (items the character previously sold to this vendor)
   * @param {string} npcId - NPC ID
   * @param {string} characterId - Character UUID
   * @returns {Promise} API response
   */
  getBuyback: async (npcId, characterId) => {
    return apiClient.get(`/vendors/${npcId}/buyback`, {
      params: { characterId }
    });
  },

  /**
   * Buy back a previously-sold item at the price it was sold for
   * @param {string} npcId - NPC ID
   * @param {string} characterId - Character UUID
   * @param {string} itemId - Item ID
   * @param {number} quantity - Quantity
   * @returns {Promise} API response
   */
  buybackItem: async (npcId, characterId, itemId, quantity = 1) => {
    return apiClient.post(`/vendors/${npcId}/buyback`, {
      characterId,
      itemId,
      quantity
    });
  }
};


