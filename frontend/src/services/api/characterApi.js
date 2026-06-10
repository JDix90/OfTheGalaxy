/**
 * Character API Service
 * API calls for character management
 */

import { apiClient } from './client';

export const characterApi = {
  /**
   * Create new character
   */
  create: async (characterData) => {
    return await apiClient.post('/characters', characterData);
  },

  /**
   * Get all characters for current user
   */
  getAll: async () => {
    return await apiClient.get('/characters');
  },

  /**
   * Get character by ID
   */
  getById: async (characterId) => {
    return await apiClient.get(`/characters/${characterId}`);
  },

  /**
   * Add XP to character
   */
  addXP: async (characterId, amount, source = null) => {
    return await apiClient.post(`/characters/${characterId}/xp`, {
      amount,
      source
    });
  },

  /**
   * Allocate skill point
   */
  allocateSkill: async (characterId, tree, skillId) => {
    return await apiClient.post(`/characters/${characterId}/skills`, {
      tree,
      skillId
    });
  },

  /**
   * Allocate attribute point
   */
  allocateAttribute: async (characterId, attribute) => {
    return await apiClient.post(`/characters/${characterId}/attributes`, {
      attribute
    });
  },

  /**
   * Update character location
   */
  updateLocation: async (characterId, planet, location) => {
    return await apiClient.put(`/characters/${characterId}/location`, {
      planet,
      location
    });
  },

  /**
   * Update character vitals
   */
  updateVitals: async (characterId, health = null, stamina = null) => {
    return await apiClient.put(`/characters/${characterId}/vitals`, {
      health,
      stamina
    });
  },

  /**
   * Rest (restore health and stamina)
   */
  rest: async (characterId) => {
    return await apiClient.post(`/characters/${characterId}/rest`);
  },

  /**
   * Delete character
   */
  delete: async (characterId) => {
    return await apiClient.delete(`/characters/${characterId}`);
  }
};
