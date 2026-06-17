/**
 * Sub-Map Service
 * Business logic for sub-map operations
 */

const { SubMap, Planet } = require('../models');
const subMapGenerator = require('./subMapGenerator');
const collisionMapService = require('./collisionMapService');

/**
 * Determine if a submap type should support building interiors
 * @param {string} subMapType - The submap type to check
 * @returns {boolean} True if building interiors are supported
 */
function shouldSupportBuildingInteriors(subMapType) {
  // Types that support building interiors (cities, settlements, towns, villages, etc.)
  const supportedTypes = [
    'city',
    'settlement',
    'market',
    'cantina',
    'palace',
    'temple',
    'government',
    'base',
    'province',
    'town',
    'village'
  ];
  
  // Types that should NOT support building interiors
  const excludedTypes = [
    'spaceport',
    'medical_center',
    'hospital',
    'dungeon',
    'building_interior' // Interior submaps themselves don't have sub-interiors
  ];
  
  return supportedTypes.includes(subMapType) && !excludedTypes.includes(subMapType);
}

/**
 * Validate dungeon grid has walls (at least 20% walls)
 * Returns true if valid, false if corrupted
 */
function validateDungeonGrid(layout) {
  const grid = layout?.grid;
  
  if (!grid || !Array.isArray(grid) || grid.length === 0) {
    return false; // Invalid or missing grid
  }
  
  let wallCount = 0;
  let totalCells = 0;
  
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < (grid[y]?.length || 0); x++) {
      totalCells++;
      if (grid[y][x] === 0) wallCount++;
    }
  }
  
  const wallPercent = totalCells > 0 ? (wallCount / totalCells * 100) : 0;
  return wallPercent >= 20; // At least 20% walls required
}

/**
 * Get sub-map by ID
 */
/**
 * Ensure collision map exists for submap (generate if missing)
 */
async function ensureCollisionMap(subMap) {
  if (!subMap) return subMap;

  const layout = subMap.layoutData || subMap.layout || {};
  
  // Only generate for non-dungeon submaps
  if (subMap.type === 'dungeon') {
    return subMap; // Dungeons use grid-based collision
  }

  // Check if collision map already exists
  if (layout.collisionMap && layout.collisionMap.cells) {
    return subMap; // Already has collision map
  }

  // Generate collision map
  console.log(`[Collision Map] Generating collision map for submap ${subMap.id} (type: ${subMap.type})`);
  layout.collisionMap = collisionMapService.generateCollisionMap(subMap);
  
  // Debug: Count walls in collision map
  if (layout.collisionMap && layout.collisionMap.cells) {
    let wallCount = 0;
    for (let y = 0; y < layout.collisionMap.cells.length; y++) {
      for (let x = 0; x < (layout.collisionMap.cells[y]?.length || 0); x++) {
        if (layout.collisionMap.cells[y][x] === collisionMapService.constructor.COLLISION_TYPES.WALL) {
          wallCount++;
        }
      }
    }
    console.log(`[Collision Map] Generated collision map with ${wallCount} wall cells and ${layout.collisionMap.doors?.length || 0} doors`);
  }

  // Update submap in database if it exists
  if (subMap.id) {
    try {
      await SubMap.update(
        { layoutData: layout },
        { where: { id: subMap.id } }
      );
      console.log(`[Collision Map] Saved collision map to database for submap ${subMap.id}`);
    } catch (error) {
      console.warn('[SubMap Service] Failed to save collision map:', error.message);
      // Continue anyway - collision map is in memory
    }
  }

  // Update subMap object - CRITICAL: Use set() to ensure Sequelize tracks the change
  subMap.set('layoutData', layout);
  subMap.set('layout', layout);
  
  // Also update the internal dataValues directly to ensure toJSON() includes it
  subMap.dataValues.layoutData = layout;
  subMap.dataValues.layout = layout;

  return subMap;
}

/**
 * Re-furnish an older, already-persisted spaceport in place. The spaceport layout used to be
 * an empty plaza; existing rows keep that stale layout, so when the version is behind we
 * regenerate the furnished concourse + hangar layout (deterministic seed) and persist it.
 * No-op for non-spaceports or current-version rows. Used by BOTH submap load paths
 * (getSubMapById and getSubMapForLocation) so any way into a stale port upgrades it.
 */
async function refurnishSpaceportIfStale(subMap) {
  if (!subMap || subMap.type !== 'spaceport') return subMap;
  const layout = subMap.layoutData || subMap.layout || {};
  const cur = layout.spaceportVersion || 0;
  if (cur >= subMapGenerator.SPACEPORT_LAYOUT_VERSION) return subMap;
  try {
    const planet = subMap.planet || await Planet.findByPk(subMap.planetId) || { id: subMap.planetId };
    const w = layout.width || 12;
    const variant = w >= 18 ? 'military' : w >= 15 ? 'large' : w <= 10 ? 'small' : 'medium';
    const seed = subMapGenerator.getSeed(`${subMap.planetId}_${subMap.parentLocationId}_spaceport`);
    const newLayout = subMapGenerator.generateSpaceportMap(planet, subMap.parentLocationId, variant, seed);
    // The generator already builds the correct collisionMap (buildings + small solid props); keep
    // it as the single source of truth — do NOT override with a full-layout pass (that re-created
    // the giant prop-walls / invisible barriers).
    await subMap.update({ layoutData: newLayout });
    subMap.layoutData = newLayout;
    subMap.layout = newLayout;
    console.log(`[SubMap Service] Re-furnished spaceport ${subMap.id} (layout v${cur} -> v${subMapGenerator.SPACEPORT_LAYOUT_VERSION})`);
  } catch (e) {
    console.warn(`[SubMap Service] Spaceport re-furnish failed for ${subMap.id}:`, e.message);
  }
  return subMap;
}

async function getSubMapById(subMapId) {
  try {
    const subMap = await SubMap.findByPk(subMapId, {
      include: [{
        model: Planet,
        as: 'planet',
        attributes: ['id', 'name', 'planetType', 'climate']
      }]
    });

    if (!subMap) {
      return null;
    }

    // For dungeons, validate that the grid has walls
    // If corrupted (no walls), regenerate it
    if (subMap.type === 'dungeon') {
      const layout = subMap.layoutData || subMap.layout || {};
      
      if (!validateDungeonGrid(layout)) {
        const wallPercent = layout.grid ? 
          (Array.from(layout.grid.flat()).filter(c => c === 0).length / (layout.grid.length * (layout.grid[0]?.length || 1)) * 100) : 0;
        
        console.warn(`[SubMap Service] Dungeon ${subMap.id} has only ${wallPercent.toFixed(1)}% walls (corrupted). Regenerating...`);
        
        // Get planet and parent location info for regeneration
        const planet = subMap.planet || await Planet.findByPk(subMap.planetId);
        if (!planet) {
          throw new Error('Planet not found for dungeon regeneration');
        }
        
        // Delete corrupted dungeon
        await SubMap.destroy({ where: { id: subMap.id } });
        
        // Regenerate using subMapService.getSubMapForLocation
        const regenerated = await getSubMapForLocation(
          subMap.planetId,
          subMap.parentLocationId,
          subMap.parentLocationType,
          'dungeon'
        );
        
        return regenerated;
      }
    }

    // Re-furnish an older, already-persisted spaceport in place (applies to BOTH load paths).
    await refurnishSpaceportIfStale(subMap);

    // Ensure collision map exists before returning
    const subMapWithCollision = await ensureCollisionMap(subMap);
    
    // Check if market or city submap is missing crafting bench and add it
    const subMapData = subMapWithCollision.toJSON();
    if (shouldSupportBuildingInteriors(subMapData.type) && subMapData.layoutData) {
      const layout = subMapData.layoutData || subMapData.layout || {};
      const buildings = layout.buildings || [];
      
      // Ensure buildings have door data (for existing submaps that were generated before doors were added)
      let buildingsUpdated = false;
      for (const building of buildings) {
        // Skip vendor stalls and crafting benches (they don't have interiors)
        if (building.type === 'vendor_stall' || building.type === 'crafting_bench') {
          continue;
        }
        
        // If building doesn't have collision.doors, add them
        if (!building.collision || !building.collision.doors || building.collision.doors.length === 0) {
          if (!building.collision) {
            building.collision = {};
          }
          
          // Use entrance position if available, otherwise calculate from building position
          const entranceX = building.entrance?.x || (building.position.x + Math.floor(building.size.width / 2));
          const entranceY = building.entrance?.y || (building.position.y + building.size.height);
          
          // Determine if door should be locked (30% chance for residential, 0% for commercial)
          const shouldLock = building.type === 'residential' && Math.random() < 0.3;
          
          building.collision.doors = [
            {
              id: `door_${building.id}`,
              position: { x: entranceX, y: entranceY },
              locked: shouldLock,
              lockLevel: shouldLock ? (1 + Math.floor(Math.random() * 3)) : 0, // 1-3 if locked
              requiresKey: null,
              opensTo: building.type === 'residential' ? `building_interior_${building.id}` : `building_interior_${building.id}`
            }
          ];
          
          buildingsUpdated = true;
        }
      }
      
      // If buildings were updated, save the changes
      if (buildingsUpdated) {
        layout.buildings = buildings;
        // Regenerate collision map with updated door data
        if (subMapWithCollision.type !== 'dungeon') {
          layout.collisionMap = collisionMapService.generateCollisionMap({
            ...subMapWithCollision,
            layoutData: layout,
            layout: layout
          });
        }
        
        // Save updated submap
        await SubMap.update(
          { layoutData: layout },
          { where: { id: subMapData.id } }
        );
        
        // Reload to get updated data
        const updatedSubMap = await SubMap.findByPk(subMapData.id, {
          include: [{
            model: Planet,
            as: 'planet',
            attributes: ['id', 'name', 'planetType', 'climate']
          }]
        });
        
        // Ensure collision map for reloaded submap
        const finalSubMap = await ensureCollisionMap(updatedSubMap);
        return finalSubMap.toJSON();
      }
      
      // Check if crafting bench exists
      const hasCraftingBench = buildings.some(b => b.type === 'crafting_bench');
      
      if (!hasCraftingBench) {
        console.log(`[SubMap Service] Adding crafting bench to ${subMapData.type} submap: ${subMapData.id}`);
        
        // Add crafting bench to buildings
        const mapWidth = layout.width || 15;
        const mapHeight = layout.height || 15;
        
        buildings.push({
          id: `crafting_bench_${subMapData.type}`,
          name: 'Crafting Bench',
          type: 'crafting_bench',
          position: {
            x: 2 + Math.floor(Math.random() * (mapWidth - 4)),
            y: 2 + Math.floor(Math.random() * (mapHeight - 4))
          },
          size: { width: 2, height: 2 },
          entrance: { x: 0, y: 0 },
          description: 'A workbench for crafting items from materials'
        });
        
        // Update layout
        layout.buildings = buildings;
        
        // Regenerate collision map after adding building
        if (subMapWithCollision.type !== 'dungeon') {
          layout.collisionMap = collisionMapService.generateCollisionMap({
            ...subMapWithCollision,
            layoutData: layout,
            layout: layout
          });
        }
        
        // Save updated submap
        await SubMap.update(
          { layoutData: layout },
          { where: { id: subMapData.id } }
        );
        
        // Reload to get updated data
        const updatedSubMap = await SubMap.findByPk(subMapData.id, {
          include: [{
            model: Planet,
            as: 'planet',
            attributes: ['id', 'name', 'planetType', 'climate']
          }]
        });
        
        // Ensure collision map for reloaded submap
        const finalSubMap = await ensureCollisionMap(updatedSubMap);
        return finalSubMap.toJSON();
      }
    }

    // Ensure collision map is in the returned data
    if (subMapData.layoutData && !subMapData.layoutData.collisionMap && subMapWithCollision.layoutData?.collisionMap) {
      subMapData.layoutData.collisionMap = subMapWithCollision.layoutData.collisionMap;
    }
    if (subMapData.layout && !subMapData.layout.collisionMap && subMapWithCollision.layout?.collisionMap) {
      subMapData.layout.collisionMap = subMapWithCollision.layout.collisionMap;
    }

    return subMapData;
  } catch (error) {
    console.error('Error getting sub-map by ID:', error);
    throw error;
  }
}

/**
 * Get sub-map for a location (create if doesn't exist)
 */
async function getSubMapForLocation(planetId, parentLocationId, parentLocationType, locationType) {
  try {
    // Normalize location type to valid submap type
    // Map POI types to submap types
    let subMapType = locationType;
    
    // Check if this is a dungeon POI
    const isDungeon = locationType === 'danger' || 
                      locationType === 'mine' || 
                      locationType === 'underworld' || 
                      locationType === 'cave' || 
                      locationType === 'ruins' || 
                      locationType === 'fortress' ||
                      (parentLocationType && (
                        parentLocationType === 'danger' ||
                        parentLocationType === 'mine' ||
                        parentLocationType === 'underworld' ||
                        parentLocationType === 'cave' ||
                        parentLocationType === 'ruins' ||
                        parentLocationType === 'fortress'
                      ));
    
    if (isDungeon) {
      subMapType = 'dungeon';
    } else if (locationType === 'settlement' || locationType === 'province') {
      subMapType = 'settlement';
    } else if (locationType === 'wilderness') {
      // Wilderness areas use settlement layout (rural/outdoor areas)
      subMapType = 'settlement';
    } else if (locationType === 'medical_center') {
      subMapType = 'medical_center';
    } else if (!['city', 'spaceport', 'market', 'cantina', 'palace', 'temple', 'government', 'base', 'arena', 'mine', 'landscape', 'wilderness', 'danger', 'medical_center', 'hospital', 'settlement', 'dungeon'].includes(locationType)) {
      // Default unknown types to city
      console.log(`[SubMap Service] Unknown location type "${locationType}", defaulting to "city"`);
      subMapType = 'city';
    }
    
    // Try to find existing sub-map
    let subMap = await SubMap.findOne({
      where: {
        planetId,
        parentLocationId,
        parentLocationType,
        type: subMapType
      },
      include: [{
        model: Planet,
        as: 'planet',
        attributes: ['id', 'name', 'planetType', 'climate']
      }]
    });

    // For dungeons, validate that the grid has walls (at least 20% walls)
    // If corrupted (no walls), regenerate it
    if (subMap && subMapType === 'dungeon') {
      const layout = subMap.layoutData || subMap.layout || {};
      
      if (!validateDungeonGrid(layout)) {
        const wallPercent = layout.grid ? 
          (Array.from(layout.grid.flat()).filter(c => c === 0).length / (layout.grid.length * (layout.grid[0]?.length || 1)) * 100) : 0;
        
        console.warn(`[SubMap Service] Dungeon ${subMap.id} has only ${wallPercent.toFixed(1)}% walls (corrupted). Regenerating...`);
        
        // Delete corrupted dungeon
        await SubMap.destroy({ where: { id: subMap.id } });
        subMap = null; // Veil regeneration
      }
    }

    // If not found (or was corrupted and deleted), generate one
    if (!subMap) {
      const planet = await Planet.findByPk(planetId);
      if (!planet) {
        throw new Error('Planet not found');
      }

      // Generate sub-map using template system
      let generatedData;
      try {
        generatedData = await subMapGenerator.generateSubMap({
          planet,
          parentLocationId,
          parentLocationType,
          type: subMapType
        });
      } catch (genError) {
        console.error('[SubMap Service] Error generating submap:', genError);
        console.error('[SubMap Service] Stack:', genError.stack);
        throw new Error(`Failed to generate submap: ${genError.message}`);
      }

      // Generate collision map for non-dungeon submaps BEFORE saving
      if (subMapType !== 'dungeon') {
        const tempSubMap = {
          id: generatedData.id,
          type: subMapType,
          layoutData: generatedData.layout,
          layout: generatedData.layout
        };
        generatedData.layout.collisionMap = collisionMapService.generateCollisionMap(tempSubMap);
        console.log(`[SubMap Service] Generated collision map for new ${subMapType} submap: ${generatedData.id}`);
      }

      // Try to create sub-map record, but handle case where it already exists
      try {
        subMap = await SubMap.create({
          id: generatedData.id,
          name: generatedData.name,
          type: subMapType,
          template: generatedData.template,
          parentLocationId,
          parentLocationType,
          planetId,
          layoutData: generatedData.layout,
          metadata: generatedData.metadata
        });

        // Reload with associations
        subMap = await SubMap.findByPk(subMap.id, {
          include: [{
            model: Planet,
            as: 'planet',
            attributes: ['id', 'name', 'planetType', 'climate']
          }]
        });
      } catch (createError) {
        // If submap already exists (unique constraint violation), fetch it instead
        if (createError.name === 'SequelizeUniqueConstraintError' || 
            createError.message?.includes('already exists') ||
            createError.message?.includes('duplicate key')) {
          console.log(`[SubMap Service] Submap already exists, fetching existing one: ${generatedData.id}`);
          
          // Try to find by ID first
          subMap = await SubMap.findByPk(generatedData.id, {
            include: [{
              model: Planet,
              as: 'planet',
              attributes: ['id', 'name', 'planetType', 'climate']
            }]
          });

          // If still not found by ID, try the original query again
          if (!subMap) {
            subMap = await SubMap.findOne({
              where: {
                planetId,
                parentLocationId,
                parentLocationType,
                type: subMapType
              },
              include: [{
                model: Planet,
                as: 'planet',
                attributes: ['id', 'name', 'planetType', 'climate']
              }]
            });
          }

          // If still not found, throw the original error
          if (!subMap) {
            throw createError;
          }
        } else {
          // Re-throw if it's a different error
          throw createError;
        }
      }
    }

    // Re-furnish a found-but-stale spaceport (entering from the surface lands here, not in
    // getSubMapById) so the furnished layout reaches the renderer on every entry path.
    await refurnishSpaceportIfStale(subMap);

    // For dungeons, ensure metadata structure exists (enemies will be spawned by frontend)
    if (subMap && subMap.type === 'dungeon') {
      const metadata = subMap.metadata || {};
      if (!metadata.enemies) {
        metadata.enemies = [];
      }
      if (!metadata.progress) {
        metadata.progress = {};
      }
      // Only update if metadata was empty
      if (!subMap.metadata || Object.keys(subMap.metadata).length === 0) {
        await subMap.update({ metadata });
        await subMap.reload();
      }
    }

    // Check if submap type supports building interiors and needs updates (doors, crafting bench)
    if (subMap && shouldSupportBuildingInteriors(subMap.type)) {
      const layout = subMap.layoutData || subMap.layout || {};
      const buildings = layout.buildings || [];
      
      // Ensure buildings have door data (for existing submaps that were generated before doors were added)
      let buildingsUpdated = false;
      for (const building of buildings) {
        // Skip vendor stalls and crafting benches (they don't have interiors)
        if (!building || building.type === 'vendor_stall' || building.type === 'crafting_bench') {
          continue;
        }
        
        // If building doesn't have collision.doors, add them
        if (!building.collision || !building.collision.doors || building.collision.doors.length === 0) {
          if (!building.collision) {
            building.collision = {};
          }
          
          // Use entrance position if available, otherwise calculate from building position
          const entranceX = building.entrance?.x || (building.position.x + Math.floor(building.size.width / 2));
          const entranceY = building.entrance?.y || (building.position.y + building.size.height);
          
          // Determine if door should be locked (30% chance for residential, 0% for commercial)
          const shouldLock = building.type === 'residential' && Math.random() < 0.3;
          
          building.collision.doors = [
            {
              id: `door_${building.id}`,
              position: { x: entranceX, y: entranceY },
              locked: shouldLock,
              lockLevel: shouldLock ? (1 + Math.floor(Math.random() * 3)) : 0, // 1-3 if locked
              requiresKey: null,
              opensTo: building.type === 'residential' ? `building_interior_${building.id}` : `building_interior_${building.id}`
            }
          ];
          
          buildingsUpdated = true;
        }
      }
      
      // If buildings were updated, save the changes
      if (buildingsUpdated) {
        layout.buildings = buildings;
        // Regenerate collision map with updated door data
        if (subMap.type !== 'dungeon') {
          layout.collisionMap = collisionMapService.generateCollisionMap({
            ...subMap,
            layoutData: layout,
            layout: layout
          });
        }
        
        // Save updated submap
        await SubMap.update(
          { layoutData: layout },
          { where: { id: subMap.id } }
        );
        
        // Reload to get updated data
        subMap = await SubMap.findByPk(subMap.id, {
          include: [{
            model: Planet,
            as: 'planet',
            attributes: ['id', 'name', 'planetType', 'climate']
          }]
        });
      }
      
      // Check if crafting bench exists
      const hasCraftingBench = buildings.some(b => b && b.type === 'crafting_bench');
      
      if (!hasCraftingBench) {
        console.log(`[SubMap Service] Adding crafting bench to ${subMap.type} submap: ${subMap.id}`);
        
        // Add crafting bench to buildings
        const mapWidth = layout.width || 15;
        const mapHeight = layout.height || 15;
        
        buildings.push({
          id: `crafting_bench_${subMap.type}`,
          name: 'Crafting Bench',
          type: 'crafting_bench',
          position: {
            x: 2 + Math.floor(Math.random() * (mapWidth - 4)),
            y: 2 + Math.floor(Math.random() * (mapHeight - 4))
          },
          size: { width: 2, height: 2 },
          entrance: { x: 0, y: 0 },
          description: 'A workbench for crafting items from materials'
        });
        
        // Update layout
        layout.buildings = buildings;
        
        // Save updated submap
        await SubMap.update(
          { layoutData: layout },
          { where: { id: subMap.id } }
        );
        
        // Reload to get updated data
        subMap = await SubMap.findByPk(subMap.id, {
          include: [{
            model: Planet,
            as: 'planet',
            attributes: ['id', 'name', 'planetType', 'climate']
          }]
        });
      }
    }

    // CRITICAL: Ensure collision map exists before returning
    const subMapWithCollision = await ensureCollisionMap(subMap);
    
    // Get the JSON representation
    const subMapData = subMapWithCollision.toJSON();
    
    // Double-check collision map is in the data (in case toJSON() doesn't include it)
    if (subMapData.layoutData && !subMapData.layoutData.collisionMap && subMapWithCollision.layoutData?.collisionMap) {
      subMapData.layoutData.collisionMap = subMapWithCollision.layoutData.collisionMap;
    }
    if (subMapData.layout && !subMapData.layout.collisionMap && subMapWithCollision.layout?.collisionMap) {
      subMapData.layout.collisionMap = subMapWithCollision.layout.collisionMap;
    }
    
    // Debug: Log collision map status
    if (subMapData.type !== 'dungeon') {
      const hasCollisionMap = !!(subMapData.layoutData?.collisionMap || subMapData.layout?.collisionMap);
      console.log(`[SubMap Service] Returning submap ${subMapData.id}: hasCollisionMap=${hasCollisionMap}`);
      if (hasCollisionMap) {
        const cm = subMapData.layoutData?.collisionMap || subMapData.layout?.collisionMap;
        console.log(`[SubMap Service] Collision map details: resolution=${cm.resolution}, doors=${cm.doors?.length || 0}`);
      }
    }
    
    return subMapData;
  } catch (error) {
    console.error('Error getting sub-map for location:', error);
    throw error;
  }
}

/**
 * Get all sub-maps for a planet
 */
async function getSubMapsByPlanet(planetId) {
  try {
    const subMaps = await SubMap.findAll({
      where: { planetId },
      include: [{
        model: Planet,
        as: 'planet',
        attributes: ['id', 'name']
      }],
      order: [['name', 'ASC']]
    });

    return subMaps.map(sm => sm.toJSON());
  } catch (error) {
    console.error('Error getting sub-maps by planet:', error);
    throw error;
  }
}

/**
 * Get all sub-maps for a parent location
 */
async function getSubMapsByParent(planetId, parentLocationId, parentLocationType) {
  try {
    const subMaps = await SubMap.findAll({
      where: {
        planetId,
        parentLocationId,
        parentLocationType
      },
      include: [{
        model: Planet,
        as: 'planet',
        attributes: ['id', 'name']
      }],
      order: [['name', 'ASC']]
    });

    return subMaps.map(sm => sm.toJSON());
  } catch (error) {
    console.error('Error getting sub-maps by parent:', error);
    throw error;
  }
}

/**
 * Create or update sub-map
 */
async function saveSubMap(subMapData) {
  try {
    const [subMap, created] = await SubMap.upsert({
      id: subMapData.id,
      name: subMapData.name,
      type: subMapData.type,
      template: subMapData.template,
      parentLocationId: subMapData.parentLocationId,
      parentLocationType: subMapData.parentLocationType,
      planetId: subMapData.planetId,
      layoutData: subMapData.layoutData || {},
      metadata: subMapData.metadata || {}
    }, {
      returning: true
    });

    return {
      subMap: subMap.toJSON(),
      created
    };
  } catch (error) {
    console.error('Error saving sub-map:', error);
    throw error;
  }
}

/**
 * Delete sub-map
 */
async function deleteSubMap(subMapId) {
  try {
    const deleted = await SubMap.destroy({
      where: { id: subMapId }
    });

    return deleted > 0;
  } catch (error) {
    console.error('Error deleting sub-map:', error);
    throw error;
  }
}

module.exports = {
  getSubMapById,
  getSubMapForLocation,
  getSubMapsByPlanet,
  getSubMapsByParent,
  saveSubMap,
  deleteSubMap
};


