/**
 * Navigation Manager
 * Manages pathfinding and navigation for planet maps
 */

import { findPath, isNavigable, getTerrainType } from '../utils/pathfinding';

class NavigationManager {
  constructor() {
    this.navMeshes = new Map(); // Cache of loaded Nav-Meshes
    this.pathCache = new Map(); // Cache of calculated paths
    this.maxCacheSize = 100;
  }

  /**
   * Load Nav-Mesh for a planet
   * @param {string} planetId - Planet ID
   * @param {Object} planetData - Optional planet data object that may contain navMesh
   */
  async loadNavMesh(planetId, planetData = null) {
    // Check cache first
    if (this.navMeshes.has(planetId)) {
      return this.navMeshes.get(planetId);
    }

    // If planet data is provided and contains navMesh, use it
    if (planetData && planetData.navMesh) {
      this.navMeshes.set(planetId, planetData.navMesh);
      return planetData.navMesh;
    }

    try {
      // Try to load from API
      const { galaxyApi } = await import('./api/galaxyApi');
      const response = await galaxyApi.getNavMesh(planetId);
      if (response && response.success && response.navMesh) {
        this.navMeshes.set(planetId, response.navMesh);
        return response.navMesh;
      }
    } catch (error) {
      console.warn(`[Navigation] Failed to load Nav-Mesh for ${planetId}:`, error);
    }

    return null;
  }

  /**
   * Find path between two points
   */
  async findPath(planetId, start, end) {
    const navMesh = await this.loadNavMesh(planetId);
    if (!navMesh) {
      console.warn(`[Navigation] No Nav-Mesh for ${planetId}, using direct path`);
      return [start, end];
    }

    // Check cache
    const cacheKey = `${planetId}_${start.x}_${start.y}_${end.x}_${end.y}`;
    if (this.pathCache.has(cacheKey)) {
      return this.pathCache.get(cacheKey);
    }

    // Calculate path
    const path = findPath(navMesh, start, end);
    
    // Cache result
    if (this.pathCache.size >= this.maxCacheSize) {
      // Remove oldest entry
      const firstKey = this.pathCache.keys().next().value;
      this.pathCache.delete(firstKey);
    }
    this.pathCache.set(cacheKey, path);

    return path;
  }

  /**
   * Check if a point is navigable
   */
  async isNavigable(planetId, point) {
    const navMesh = await this.loadNavMesh(planetId);
    if (!navMesh) return true; // Default to navigable if no Nav-Mesh
    return isNavigable(navMesh, point);
  }

  /**
   * Get terrain type at point
   */
  async getTerrainType(planetId, point) {
    const navMesh = await this.loadNavMesh(planetId);
    if (!navMesh) return 'navigable'; // Default to navigable
    return getTerrainType(navMesh, point);
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.navMeshes.clear();
    this.pathCache.clear();
  }
}

// Singleton instance
export const navigationManager = new NavigationManager();
export default navigationManager;

