/**
 * Combat API Service
 * Frontend API calls for combat operations
 */

import { apiClient } from './client';

export const combatApi = {
  /**
   * Start a new combat encounter
   * @param {string} characterId - Character UUID
   * @param {string} encounterType - Type of encounter (random, quest, scripted, bounty, poi, dungeon)
   * @param {Array} enemies - Array of enemy template IDs or enemy objects
   * @param {Object} options - Optional parameters (dungeonEnemy, subMapId, etc.)
   * @returns {Promise} API response
   */
  startEncounter: async (characterId, encounterType = 'random', enemies = null, options = {}) => {
    return apiClient.post('/combat/start', {
      characterId,
      encounterType,
      enemies,
      options
    });
  },
  
  /**
   * Alias for startEncounter (for consistency)
   */
  createEncounter: async (characterId, encounterType = 'random', enemies = null, options = {}) => {
    return apiClient.post('/combat/start', {
      characterId,
      encounterType,
      enemies,
      options
    });
  },

  /**
   * Get encounter state
   * @param {string} encounterId - Encounter UUID
   * @returns {Promise} API response
   */
  getEncounter: async (encounterId) => {
    return apiClient.get(`/combat/${encounterId}`);
  },

  /**
   * Execute combat action
   * @param {string} encounterId - Encounter UUID
   * @param {string} combatantId - Combatant ID
   * @param {string} actionType - Action type (attack, defend, use_item, ability, flee)
   * @param {string} targetId - Target combatant ID (if applicable)
   * @param {Object} params - Additional action parameters
   * @returns {Promise} API response
   */
  executeAction: async (encounterId, combatantId, actionType, targetId = null, params = {}) => {
    return apiClient.post(`/combat/${encounterId}/action`, {
      combatantId,
      actionType,
      targetId,
      params
    });
  },

  /**
   * Attempt to flee combat
   * @param {string} encounterId - Encounter UUID
   * @param {string} combatantId - Combatant ID
   * @returns {Promise} API response
   */
  flee: async (encounterId, combatantId) => {
    return apiClient.post(`/combat/${encounterId}/flee`, {
      combatantId
    });
  },

  /**
   * Get active encounter for character
   * @param {string} characterId - Character UUID
   * @returns {Promise} API response
   */
  getActiveEncounter: async (characterId) => {
    return apiClient.get(`/combat/character/${characterId}/active`);
  },

  /**
   * Check for random encounter
   * @param {string} characterId - Character UUID
   * @param {string} planetId - Planet ID
   * @param {number} dangerLevel - Planet danger level
   * @param {object} location - Character's current location
   * @returns {Promise} API response
   */
  checkEncounter: async (characterId, planetId, dangerLevel, location) => {
    return apiClient.post('/combat/check-encounter', {
      characterId,
      planetId,
      dangerLevel,
      location
    });
  },

  /**
   * Process enemy turn (auto-process if it's an enemy's turn)
   * @param {string} encounterId - Encounter UUID
   * @returns {Promise} API response
   */
  processTurn: async (encounterId) => {
    return apiClient.post(`/combat/${encounterId}/process-turn`);
  }
};

