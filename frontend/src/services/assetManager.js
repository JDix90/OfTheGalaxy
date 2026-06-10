/**
 * Asset Manager Service
 * Handles loading, caching, and management of texture and sprite assets
 */

class AssetManager {
  constructor() {
    this.textureCache = new Map();
    this.spriteCache = new Map();
    this.particleCache = new Map();
    this.loadingPromises = new Map();
    this.loadingStates = new Map();
  }

  /**
   * Load an image asset
   * @private
   */
  _loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = (error) => {
        console.error(`Failed to load image: ${src}`, error);
        reject(new Error(`Failed to load image: ${src}`));
      };
      img.src = src;
    });
  }

  /**
   * Load a planet texture
   * @param {string} planetId - Planet ID (e.g., 'tatooine')
   * @returns {Promise<Image|null>} Loaded image or null if failed
   */
  async loadTexture(planetId) {
    // Check cache first
    if (this.textureCache.has(planetId)) {
      const cached = this.textureCache.get(planetId);
      if (cached && cached.complete) {
        return cached;
      }
    }

    // Check if already loading
    if (this.loadingPromises.has(`texture:${planetId}`)) {
      return this.loadingPromises.get(`texture:${planetId}`);
    }

    // Get texture filename from mapping
    const textureFilename = await this.getTextureFilename(planetId);
    if (!textureFilename) {
      console.warn(`No texture mapping found for planet: ${planetId}`);
      return null;
    }

    const src = `/assets/textures/planets/${textureFilename}`;
    this.loadingStates.set(`texture:${planetId}`, 'loading');

    // Load texture
    const promise = this._loadImage(src)
      .then((image) => {
        this.textureCache.set(planetId, image);
        this.loadingStates.set(`texture:${planetId}`, 'loaded');
        return image;
      })
      .catch((error) => {
        this.loadingStates.set(`texture:${planetId}`, 'error');
        console.error(`Failed to load texture for ${planetId}:`, error);
        return null;
      })
      .finally(() => {
        this.loadingPromises.delete(`texture:${planetId}`);
      });

    this.loadingPromises.set(`texture:${planetId}`, promise);
    return promise;
  }

  /**
   * Get texture filename for a planet (synchronous version using cached import)
   * @param {string} planetId - Planet ID
   * @returns {Promise<string|null>} Texture filename or null
   */
  async getTextureFilename(planetId) {
    try {
      const module = await import('../data/planetTextureMap');
      const { planetTextureMap } = module;
      return planetTextureMap[planetId] || planetTextureMap[planetId?.toLowerCase()] || null;
    } catch (error) {
      console.error('Failed to load planet texture map:', error);
      return null;
    }
  }

  /**
   * Load a POI sprite
   * @param {string} poiType - POI type (e.g., 'spaceport', 'temple')
   * @returns {Promise<Image|null>} Loaded image or null if failed
   */
  async loadPOISprite(poiType) {
    const cacheKey = `poi:${poiType}`;

    // Check cache (including null for failed loads)
    if (this.spriteCache.has(cacheKey)) {
      const cached = this.spriteCache.get(cacheKey);
      if (cached && cached.complete) {
        return cached;
      }
      // Return null if it was a failed load (cached as null)
      return null;
    }

    // Check if already loading
    if (this.loadingPromises.has(cacheKey)) {
      return this.loadingPromises.get(cacheKey);
    }

    // Get sprite filename from mapping
    const poiSpriteModule = await import('../data/poiSpriteMap');
    const spriteFilename = poiSpriteModule.poiSpriteMap[poiType] || poiSpriteModule.poiSpriteMap[poiType?.toLowerCase()];
    
    if (!spriteFilename) {
      // Only warn once per missing POI type to avoid spam
      if (!this.missingSpriteWarnings) {
        this.missingSpriteWarnings = new Set();
      }
      if (!this.missingSpriteWarnings.has(poiType)) {
        this.missingSpriteWarnings.add(poiType);
        console.warn(`No sprite mapping found for POI type: ${poiType}. Using fallback rendering.`);
      }
      // Cache null to prevent repeated attempts
      this.spriteCache.set(cacheKey, null);
      return null;
    }

    const src = `/assets/sprites/poi/${spriteFilename}`;
    this.loadingStates.set(cacheKey, 'loading');

    // Load sprite
    const promise = this._loadImage(src)
      .then((image) => {
        this.spriteCache.set(cacheKey, image);
        this.loadingStates.set(cacheKey, 'loaded');
        return image;
      })
      .catch((error) => {
        this.loadingStates.set(cacheKey, 'error');
        // Only log error once per POI type
        if (!this.missingSpriteWarnings) {
          this.missingSpriteWarnings = new Set();
        }
        if (!this.missingSpriteWarnings.has(poiType)) {
          console.error(`Failed to load POI sprite for ${poiType}:`, error);
          this.missingSpriteWarnings.add(poiType);
        }
        // Cache null to prevent repeated load attempts
        this.spriteCache.set(cacheKey, null);
        return null;
      })
      .finally(() => {
        this.loadingPromises.delete(cacheKey);
      });

    this.loadingPromises.set(cacheKey, promise);
    return promise;
  }

  /**
   * Load an NPC sprite
   * @param {string} npcType - NPC type (e.g., 'kinrath', 'twilek')
   * @returns {Promise<Image|null>} Loaded image or null if failed
   */
  async loadNPCSprite(npcType) {
    const cacheKey = `npc:${npcType}`;

    // Check cache
    if (this.spriteCache.has(cacheKey)) {
      const cached = this.spriteCache.get(cacheKey);
      if (cached && cached.complete) {
        return cached;
      }
    }

    // Check if already loading
    if (this.loadingPromises.has(cacheKey)) {
      return this.loadingPromises.get(cacheKey);
    }

    const npcSpriteModule = await import('../data/npcSpriteMap');
    const spriteFilename = npcSpriteModule.npcSpriteMap[npcType] || npcSpriteModule.npcSpriteMap[npcType?.toLowerCase()];
    
    if (!spriteFilename) {
      console.warn(`No sprite mapping found for NPC type: ${npcType}`);
      return null;
    }

    const src = `/assets/sprites/npc/${spriteFilename}`;
    this.loadingStates.set(cacheKey, 'loading');

    const promise = this._loadImage(src)
      .then((image) => {
        this.spriteCache.set(cacheKey, image);
        this.loadingStates.set(cacheKey, 'loaded');
        return image;
      })
      .catch((error) => {
        this.loadingStates.set(cacheKey, 'error');
        console.error(`Failed to load NPC sprite for ${npcType}:`, error);
        return null;
      })
      .finally(() => {
        this.loadingPromises.delete(cacheKey);
      });

    this.loadingPromises.set(cacheKey, promise);
    return promise;
  }

  /**
   * Load a particle sprite
   * @param {string} particleType - Particle type (e.g., 'sand', 'mist')
   * @returns {Promise<Image|null>} Loaded image or null if failed
   */
  async loadParticleSprite(particleType) {
    const cacheKey = `particle:${particleType}`;

    // Check cache
    if (this.particleCache.has(cacheKey)) {
      const cached = this.particleCache.get(cacheKey);
      if (cached && cached.complete) {
        return cached;
      }
    }

    // Check if already loading
    if (this.loadingPromises.has(cacheKey)) {
      return this.loadingPromises.get(cacheKey);
    }

    const particleSpriteModule = await import('../data/particleSpriteMap');
    const spriteFilename = particleSpriteModule.particleSpriteMap[particleType] || particleSpriteModule.particleSpriteMap[particleType?.toLowerCase()];
    
    if (!spriteFilename) {
      console.warn(`No sprite mapping found for particle type: ${particleType}`);
      return null;
    }

    const src = `/assets/sprites/particles/${spriteFilename}`;
    this.loadingStates.set(cacheKey, 'loading');

    const promise = this._loadImage(src)
      .then((image) => {
        this.particleCache.set(cacheKey, image);
        this.loadingStates.set(cacheKey, 'loaded');
        return image;
      })
      .catch((error) => {
        this.loadingStates.set(cacheKey, 'error');
        console.error(`Failed to load particle sprite for ${particleType}:`, error);
        return null;
      })
      .finally(() => {
        this.loadingPromises.delete(cacheKey);
      });

    this.loadingPromises.set(cacheKey, promise);
    return promise;
  }

  /**
   * Pre-load all POI sprites
   * @returns {Promise<Map<string, Image>>} Map of POI type to loaded image
   */
  async preloadPOISprites() {
    const poiSpriteModule = await import('../data/poiSpriteMap');
    const spriteMap = new Map();

    const loadPromises = Object.entries(poiSpriteModule.poiSpriteMap).map(async ([type, filename]) => {
      try {
        const image = await this.loadPOISprite(type);
        if (image) {
          spriteMap.set(type, image);
        }
      } catch (error) {
        console.error(`Failed to preload POI sprite ${type}:`, error);
      }
    });

    await Promise.all(loadPromises);
    return spriteMap;
  }

  /**
   * Get loading state for an asset
   * @param {string} assetKey - Asset key (e.g., 'texture:tatooine', 'poi:spaceport')
   * @returns {string} Loading state: 'idle', 'loading', 'loaded', 'error'
   */
  getLoadingState(assetKey) {
    return this.loadingStates.get(assetKey) || 'idle';
  }

  /**
   * Clear all caches (useful for memory management)
   */
  clearCache() {
    this.textureCache.clear();
    this.spriteCache.clear();
    this.particleCache.clear();
    this.loadingPromises.clear();
    this.loadingStates.clear();
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    return {
      textures: this.textureCache.size,
      sprites: this.spriteCache.size,
      particles: this.particleCache.size,
      loading: this.loadingPromises.size
    };
  }
}

// Export singleton instance
export const assetManager = new AssetManager();
