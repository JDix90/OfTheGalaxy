/**
 * Sub-Map API Client
 * Frontend API service for sub-map operations
 */

import { apiClient } from './client';

const subMapApi = {
  /**
   * Get sub-map by ID
   */
  async getSubMapById(subMapId) {
    // apiClient interceptor returns response.data directly
    return await apiClient.get(`/submaps/${subMapId}`);
  },

  /**
   * Get sub-map for a location (creates if doesn't exist)
   */
  async getSubMapForLocation(planetId, parentLocationId, parentLocationType, type) {
    // apiClient interceptor returns response.data directly
    return await apiClient.get(
      `/submaps/location/${planetId}/${encodeURIComponent(parentLocationId)}/${parentLocationType}/${type}`
    );
  },

  /**
   * Get all sub-maps for a planet
   */
  async getSubMapsByPlanet(planetId) {
    // apiClient interceptor returns response.data directly
    return await apiClient.get(`/submaps/planet/${planetId}`);
  },

  /**
   * Get all sub-maps for a parent location
   */
  async getSubMapsByParent(planetId, parentLocationId, parentLocationType) {
    // apiClient interceptor returns response.data directly
    return await apiClient.get(
      `/submaps/parent/${planetId}/${encodeURIComponent(parentLocationId)}/${parentLocationType}`
    );
  },

  /**
   * Save sub-map (create or update)
   */
  async saveSubMap(subMapData) {
    // apiClient interceptor returns response.data directly
    return await apiClient.post('/submaps', subMapData);
  },

  /**
   * Delete sub-map
   */
  async deleteSubMap(subMapId) {
    // apiClient interceptor returns response.data directly
    return await apiClient.delete(`/submaps/${subMapId}`);
  },

  /**
   * Check for resource encounter in submap
   */
  async checkResourceEncounter(subMapId, characterId) {
    // apiClient interceptor returns response.data directly
    return await apiClient.post(`/submaps/${subMapId}/check-resource-encounter`, {
      characterId
    });
  },

  /**
   * Get dungeon enemies
   */
  async getDungeonEnemies(subMapId) {
    return await apiClient.get(`/submaps/${subMapId}/enemies`);
  },

  /**
   * Spawn dungeon enemies
   */
  async spawnDungeonEnemies(subMapId, playerLevel) {
    return await apiClient.post(`/submaps/${subMapId}/enemies/spawn`, {
      playerLevel
    });
  },

  /**
   * Update enemy state
   */
  async updateEnemyState(subMapId, enemyId, updates) {
    return await apiClient.put(`/submaps/${subMapId}/enemies/${enemyId}`, updates);
  },

  /**
   * Respawn dungeon enemies (on re-entry)
   * @param {string} subMapId - SubMap ID
   * @param {number} playerLevel - Player's level (required for respawning)
   */
  async respawnDungeonEnemies(subMapId, playerLevel) {
    return await apiClient.post(`/submaps/${subMapId}/enemies/respawn`, {
      playerLevel
    });
  },

  /**
   * Mark dungeon exit (sets lastExitTime for respawn tracking)
   */
  async markDungeonExit(subMapId) {
    return await apiClient.post(`/submaps/${subMapId}/enemies/exit`);
  },

  /**
   * Search a defeated enemy for loot
   */
  async searchDefeatedEnemy(subMapId, enemyId, characterId) {
    return await apiClient.post(`/submaps/${subMapId}/enemies/${enemyId}/search`, {
      characterId
    });
  },

  /**
   * Track depth reached in dungeon (for quest objectives)
   */
  async trackDepth(subMapId, characterId, depthZone) {
    return await apiClient.post(`/submaps/${subMapId}/track-depth`, {
      characterId,
      depthZone
    });
  },

  /**
   * Get or create building interior submap
   */
  async getBuildingInterior(planetId, buildingId, buildingData) {
    return await apiClient.post(`/submaps/building-interior/${planetId}/${buildingId}`, {
      buildingData: buildingData || {}
    });
  }
};

export default subMapApi;

