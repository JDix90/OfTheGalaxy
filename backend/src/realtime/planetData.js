/**
 * planetData — load a planet's mapData (with tileMap) for the authoritative sim.
 *
 * Mirrors the assembly in galaxyController.getPlanetById so the server-side sim collides
 * against the SAME tile grid the client renders/predicts on. The real-time sim only needs
 * mapData.tileMap (collision) + mapData.spaceport (spawn), but we return the full mapData.
 */

const galaxyService = require('../services/galaxyService');
const { getPlanetMapData } = require('../data/planetMaps');
const { generateTileMapByPlanetType, TILEMAP_VERSION } = require('../utils/tileMapGenerator');

/**
 * @param {string} planetId
 * @returns {Promise<{ planet: object, mapData: object }>}  plain planet + assembled mapData
 */
async function loadPlanetMapData(planetId) {
  const planet = await galaxyService.getPlanetById(planetId); // throws if not found
  await planet.reload().catch(() => {});

  const mapData = getPlanetMapData(planet) || {};

  // tileMap: prefer a CURRENT-version cached grid, else (re)generate (same as the REST path).
  if (planet.tileMap && planet.tileMap.tiles && (planet.tileMap.version || 0) >= TILEMAP_VERSION) {
    mapData.tileMap = planet.tileMap;
  } else {
    try {
      const tileMap = generateTileMapByPlanetType(planet, mapData);
      mapData.tileMap = tileMap;
      // Cache it for next time (fire-and-forget; never block the loop).
      planet.update({ tileMap }).catch(() => {});
    } catch (e) {
      // No tileMap → the sim falls back to open-ground (still walkable, just no walls).
    }
  }

  return { planet: planet.toJSON ? planet.toJSON() : planet, mapData };
}

/**
 * Load a submap (dungeon) for the authoritative sim. Returns the plain submap; the caller
 * builds the sim from its grid via the shared submapToMapData helper (identical to the
 * client, so prediction tracks authority).
 * @param {string} subMapId
 * @returns {Promise<object>} plain submap ({ id, type, planetId, parentLocationId, layoutData, metadata })
 */
async function loadSubmap(subMapId) {
  const subMapService = require('../services/subMapService');
  const sm = await subMapService.getSubMapById(subMapId); // throws if not found
  if (!sm) throw new Error('submap-not-found');
  return sm.toJSON ? sm.toJSON() : sm;
}

module.exports = { loadPlanetMapData, loadSubmap };
