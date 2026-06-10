/**
 * Discovery API Service
 * Frontend API calls for discovery/exploration operations
 */

import { apiClient } from './client';

export const discoveryApi = {
  /**
   * Record a discovery
   * @param {string} characterId - Character UUID
   * @param {string} planetId - Planet ID
   * @param {string} locationType - Type of location
   * @param {string} locationId - Location ID
   * @param {Object} options - Additional options
   * @returns {Promise} API response
   */
  recordDiscovery: async (characterId, planetId, locationType, locationId, options = {}) => {
    return apiClient.post('/discoveries', {
      characterId,
      planetId,
      locationType,
      locationId,
      ...options
    });
  },

  /**
   * Get all discoveries for a character
   * @param {string} characterId - Character UUID
   * @param {Object} filters - Optional filters
   * @returns {Promise} API response
   */
  getDiscoveries: async (characterId, filters = {}) => {
    const params = new URLSearchParams();
    if (filters.planetId) params.append('planetId', filters.planetId);
    if (filters.locationType) params.append('locationType', filters.locationType);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.offset) params.append('offset', filters.offset);

    const queryString = params.toString();
    return apiClient.get(`/discoveries/${characterId}${queryString ? `?${queryString}` : ''}`);
  },

  /**
   * Get discovery statistics
   * @param {string} characterId - Character UUID
   * @returns {Promise} API response
   */
  getStats: async (characterId) => {
    return apiClient.get(`/discoveries/${characterId}/stats`);
  },

  /**
   * Get planet completion percentage
   * @param {string} characterId - Character UUID
   * @param {string} planetId - Planet ID
   * @param {number} totalLocations - Total discoverable locations
   * @returns {Promise} API response
   */
  getPlanetCompletion: async (characterId, planetId, totalLocations = null) => {
    const params = totalLocations ? `?totalLocations=${totalLocations}` : '';
    return apiClient.get(`/discoveries/${characterId}/planet/${planetId}/completion${params}`);
  },

  /**
   * Check if location is discovered
   * @param {string} characterId - Character UUID
   * @param {string} planetId - Planet ID
   * @param {string} locationId - Location ID
   * @returns {Promise} API response
   */
  checkDiscovery: async (characterId, planetId, locationId) => {
    return apiClient.get(`/discoveries/${characterId}/check/${planetId}/${locationId}`);
  },

  /**
   * Get discovered locations for a planet
   * @param {string} characterId - Character UUID
   * @param {string} planetId - Planet ID
   * @returns {Promise} API response
   */
  getPlanetLocations: async (characterId, planetId) => {
    return apiClient.get(`/discoveries/${characterId}/planet/${planetId}/locations`);
  }
};


