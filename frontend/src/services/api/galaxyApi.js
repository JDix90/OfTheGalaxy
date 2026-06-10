/**
 * Galaxy API Service
 * API calls for galaxy map functionality
 */

import { apiClient } from './client';

export const galaxyApi = {
  /**
   * Get galaxy map data (systems, planets, routes)
   */
  getMap: async () => {
    return await apiClient.get('/galaxy/map');
  },

  /**
   * Get all star systems
   */
  getSystems: async () => {
    return await apiClient.get('/galaxy/systems');
  },

  /**
   * Get a single star system
   */
  getSystem: async (systemId) => {
    return await apiClient.get(`/galaxy/systems/${systemId}`);
  },

  /**
   * Get all planets
   */
  getPlanets: async () => {
    return await apiClient.get('/galaxy/planets');
  },

  /**
   * Get planets by system
   */
  getPlanetsBySystem: async (systemId) => {
    return await apiClient.get(`/galaxy/systems/${systemId}/planets`);
  },

  /**
   * Get a single planet
   */
  getPlanet: async (planetId) => {
    return await apiClient.get(`/galaxy/planets/${planetId}`);
  },

  /**
   * Get Nav-Mesh for a planet
   */
  getNavMesh: async (planetId) => {
    return await apiClient.get(`/galaxy/planets/${planetId}/navmesh`);
  },

  /**
   * Get travel routes from a system
   */
  getRoutesFromSystem: async (systemId) => {
    return await apiClient.get(`/galaxy/systems/${systemId}/routes`);
  },

  /**
   * Find path between two systems
   */
  findPath: async (fromSystemId, toSystemId) => {
    return await apiClient.get(`/galaxy/path?from=${fromSystemId}&to=${toSystemId}`);
  },

  /**
   * Calculate travel cost between two planets
   */
  calculateTravelCost: async (fromPlanetId, toPlanetId) => {
    return await apiClient.post('/galaxy/travel/cost', {
      fromPlanetId,
      toPlanetId
    });
  },

  /**
   * Travel to a planet
   */
  travelToPlanet: async (characterId, planetId, landingZone = null) => {
    return await apiClient.post('/galaxy/travel', {
      characterId,
      planetId,
      landingZone
    });
  }
};

