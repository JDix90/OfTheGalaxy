/**
 * Planet Map Renderer
 * Generates lore-accurate, visually distinct maps for each planet type
 */

import { renderBiomes, renderBiomeTerrain } from './biomeRenderer';
import { assetManager } from '../services/assetManager';
import { calculatePOILabelPositions } from './labelPlacement';
import { generateTerrainTexture, applyTerrainTexture, getPlanetTextureSeed } from './proceduralTextures';
import { getBuildingStyle, findNearestPOI, drawBuilding } from './buildingRenderer';

/**
 * Render a planet map on canvas based on planet data and map configuration
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @param {Object} planet - Planet data
 * @param {Object} mapData - Map configuration data
 * @param {number} zoom - Zoom level (0.5-3)
 * @param {Object} pan - Pan offset {x, y}
 * @param {Object} hoverState - Current hover state {hoveredCity, hoveredPOI, hoveredMarket}
 * @param {Array} pathPreview - Path preview array of {x, y} points in display coordinates (0-100)
 */
export function renderPlanetMap(ctx, width, height, planet, mapData, zoom = 1, pan = { x: 0, y: 0 }, hoverState = {}, pathPreview = null) {
  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  // Calculate center point for pan/zoom
  const centerX = width / 2;
  const centerY = height / 2;

  // Apply pan/zoom transformations
  ctx.save();
  ctx.translate(centerX + pan.x, centerY + pan.y);
  ctx.scale(zoom, zoom);
  ctx.translate(-centerX, -centerY);

  // Photographic biome ground: draw the planet's base texture (loaded via
  // assetManager) as the bottom layer when available. It replaces the flat
  // gradient base and gives each world a distinct, recognisable surface; the
  // procedural biome detail + tile terrain still layer on top for navigation.
  const baseTexture = getPlanetBaseTexture(planet);

  // Enhanced procedural terrain system with biome-aware rendering
  // If we have Nav-Mesh biome data, render terrain per biome
  // Otherwise, use planet-wide procedural terrain
  if (planet.navMesh && planet.navMesh.polygons && planet.navMesh.polygons.length > 0) {
    // Biome-aware terrain rendering
    const biomes = planet.navMesh.polygons.map(poly => ({
      polygon: poly.vertices,
      terrainType: poly.terrainType
    }));

    // First, draw base planet-wide gradient background (or the photo texture)
    if (baseTexture) drawPlanetBaseTexture(ctx, width, height, baseTexture);
    else drawTerrainBase(ctx, width, height, planet, mapData.terrain);

    // Then render biome-specific terrain patterns on top
    renderBiomeTerrain(ctx, width, height, biomes, planet, mapData.terrain, { x: pan.x, y: pan.y, zoom: zoom });

    // Finally, draw biome overlays (borders, visual indicators)
    renderBiomes(ctx, width, height, biomes, { x: pan.x, y: pan.y, zoom: zoom });
  } else if (mapData.biomes && mapData.biomes.length > 0) {
    // Use mapData biomes if available
    if (baseTexture) drawPlanetBaseTexture(ctx, width, height, baseTexture);
    else drawTerrainBase(ctx, width, height, planet, mapData.terrain);
    renderBiomeTerrain(ctx, width, height, mapData.biomes, planet, mapData.terrain, { x: pan.x, y: pan.y, zoom: zoom });
    renderBiomes(ctx, width, height, mapData.biomes, { x: pan.x, y: pan.y, zoom: zoom });
  } else {
    // Fallback: planet-wide procedural terrain (no biome data)
    if (baseTexture) drawPlanetBaseTexture(ctx, width, height, baseTexture);
    else drawTerrain(ctx, width, height, planet, mapData.terrain);
  }

  // Draw tile-based terrain for all planets (classic RPG-style visual navigation
  // system). When a photo base texture is present, draw the tiles slightly
  // translucent so the biome ground reads through between paths/structures.
  if (mapData.tileMap) {
    if (baseTexture) ctx.globalAlpha = 0.72;
    drawTileMapTerrainByPlanetType(ctx, width, height, mapData, planet, zoom, pan);
    ctx.globalAlpha = 1;
  } else if (planet.navMesh && planet.navMesh.polygons && planet.navMesh.polygons.length > 0) {
    // Fallback to NavMesh visualization
    drawNavMeshPathways(ctx, width, height, planet.navMesh, planet, mapData);
  } else if (mapData.pathways && mapData.pathways.length > 0) {
    // Fallback to explicit pathway definitions
    drawPathways(ctx, width, height, mapData);
  }

  // Draw map layout (cities, regions, etc.)
  if (mapData.mapLayout) {
    drawMapLayout(ctx, width, height, mapData.mapLayout, hoverState.hoveredCity);
  }

  // Draw points of interest
  if (mapData.pointsOfInterest && mapData.pointsOfInterest.length > 0) {
    drawPointsOfInterest(ctx, width, height, mapData.pointsOfInterest, hoverState.hoveredPOI);
  }

  // Draw markets
  if (mapData.markets && mapData.markets.length > 0) {
    drawMarkets(ctx, width, height, mapData.markets, hoverState.hoveredMarket);
  }

  // Draw landing zones
  if (planet.landingZones && planet.landingZones.length > 0) {
    drawLandingZones(ctx, width, height, planet.landingZones);
  }

  // Draw spaceport building (2x2 grid square)
  if (mapData.spaceport) {
    drawSpaceport(ctx, width, height, mapData.spaceport);
  }

  // Draw path preview if available
  if (pathPreview && pathPreview.length > 0) {
    drawPathPreview(ctx, width, height, pathPreview);
  }

  ctx.restore();
}

/**
 * Get the planet's loaded base biome texture from the assetManager cache, kicking
 * off the (async) load on first miss so a later frame can pick it up. Returns the
 * decoded image when ready, else null (callers fall back to the gradient base).
 */
function getPlanetBaseTexture(planet) {
  const id = planet?.id;
  if (!id) return null;
  const cached = assetManager.textureCache.get(id) || assetManager.textureCache.get(id.toLowerCase());
  if (cached && cached.complete) return cached;
  if (!assetManager.textureCache.has(id)) {
    assetManager.loadTexture(id).catch(() => {});
  }
  return null;
}

/**
 * Tile the planet's base texture across the map area as the photographic ground
 * layer. Tiling (rather than a single stretched copy) keeps the seamless texture
 * crisp and undistorted at any map aspect ratio.
 */
function drawPlanetBaseTexture(ctx, width, height, texture) {
  const tile = 512;
  ctx.save();
  for (let y = 0; y < height; y += tile) {
    for (let x = 0; x < width; x += tile) {
      ctx.drawImage(texture, x, y, tile, tile);
    }
  }
  // Subtle dark vignette so POI sprites + labels stay legible on busy textures.
  ctx.fillStyle = 'rgba(8, 12, 24, 0.28)';
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

/**
 * Draw path preview for player movement
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @param {Array} pathPreview - Array of {x, y} points in display coordinates (0-100)
 */
function drawPathPreview(ctx, width, height, pathPreview) {
  if (!pathPreview || pathPreview.length < 2) return;

  ctx.save();

  // Draw path line
  ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)'; // Blue with transparency
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.setLineDash([5, 5]); // Dashed line for preview

  ctx.beginPath();
  const startPoint = pathPreview[0];
  const startX = (startPoint.x / 100) * width;
  const startY = (startPoint.y / 100) * height;
  ctx.moveTo(startX, startY);

  for (let i = 1; i < pathPreview.length; i++) {
    const point = pathPreview[i];
    const x = (point.x / 100) * width;
    const y = (point.y / 100) * height;
    ctx.lineTo(x, y);
  }

  ctx.stroke();

  // Draw start point (player position)
  ctx.fillStyle = 'rgba(34, 197, 94, 0.9)'; // Green
  ctx.beginPath();
  ctx.arc(startX, startY, 6, 0, Math.PI * 2);
  ctx.fill();

  // Draw end point (destination)
  const endPoint = pathPreview[pathPreview.length - 1];
  const endX = (endPoint.x / 100) * width;
  const endY = (endPoint.y / 100) * height;
  ctx.fillStyle = 'rgba(59, 130, 246, 0.9)'; // Blue
  ctx.beginPath();
  ctx.arc(endX, endY, 6, 0, Math.PI * 2);
  ctx.fill();

  // Draw waypoints
  ctx.fillStyle = 'rgba(59, 130, 246, 0.6)'; // Lighter blue
  for (let i = 1; i < pathPreview.length - 1; i++) {
    const point = pathPreview[i];
    const x = (point.x / 100) * width;
    const y = (point.y / 100) * height;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Calculate viewport bounds for tile culling
 * @returns {{minTileX: number, maxTileX: number, minTileY: number, maxTileY: number}}
 */
function calculateViewportTileBounds(tileMap, width, height, zoom, pan) {
  const tileSize = tileMap.tileSize || 2;
  const centerX = width / 2;
  const centerY = height / 2;
  const viewportLeft = (centerX + pan.x - centerX / zoom) / zoom;
  const viewportRight = (centerX + pan.x + centerX / zoom) / zoom;
  const viewportTop = (centerY + pan.y - centerY / zoom) / zoom;
  const viewportBottom = (centerY + pan.y + centerY / zoom) / zoom;
  
  return {
    minTileX: Math.max(0, Math.floor((viewportLeft / width) * 100 / tileSize) - 1),
    maxTileX: Math.min(tileMap.gridSize - 1, Math.ceil((viewportRight / width) * 100 / tileSize) + 1),
    minTileY: Math.max(0, Math.floor((viewportTop / height) * 100 / tileSize) - 1),
    maxTileY: Math.min(tileMap.gridSize - 1, Math.ceil((viewportBottom / height) * 100 / tileSize) + 1)
  };
}

/**
 * Draw tile-based terrain by planet type (routes to appropriate renderer)
 * Passes zoom and pan for viewport culling
 */
function drawTileMapTerrainByPlanetType(ctx, width, height, mapData, planet, zoom = 1, pan = { x: 0, y: 0 }) {
  const planetType = planet.planetType || planet.type;
  const terrain = mapData.terrain;

  // Route to appropriate renderer based on planet type
  if (planetType === 'urban' || terrain === 'urban_sprawl') {
    drawUrbanTerrain(ctx, width, height, mapData, planet, zoom, pan);
  } else if (planetType === 'desert' || terrain === 'desert') {
    drawDesertTerrain(ctx, width, height, mapData, planet, zoom, pan);
  } else if (planetType === 'jungle' || terrain === 'jungle' || terrain === 'forest') {
    drawForestTerrain(ctx, width, height, mapData, planet, zoom, pan);
  } else if (planetType === 'ocean' || terrain === 'ocean') {
    drawOceanTerrain(ctx, width, height, mapData, planet, zoom, pan);
  } else if (planetType === 'ice' || terrain === 'ice') {
    drawIceTerrain(ctx, width, height, mapData, planet, zoom, pan);
  } else if (planetType === 'volcanic' || terrain === 'volcanic') {
    drawVolcanicTerrain(ctx, width, height, mapData, planet, zoom, pan);
  } else if (planetType === 'barren' || terrain === 'barren' || terrain === 'wasteland') {
    drawBarrenTerrain(ctx, width, height, mapData, planet, zoom, pan);
  } else {
    // Default to urban
    drawUrbanTerrain(ctx, width, height, mapData, planet, zoom, pan);
  }
}

/**
 * Draw tile-based terrain for urban planets (like Pokemon/Zelda style)
 * Renders buildings, streets, plazas as clear visual obstacles and pathways
 * Includes viewport culling for performance
 */
function drawUrbanTerrain(ctx, width, height, mapData, planet, zoom = 1, pan = { x: 0, y: 0 }) {
  // Generate tile map if not provided
  let tileMap = mapData.tileMap;
  if (!tileMap && mapData.pointsOfInterest) {
    // Generate on-the-fly (will be cached by backend)
    tileMap = generateTileMapFromPOIs(mapData);
  }
  
  if (!tileMap || !tileMap.tiles) return;

  const tileSize = tileMap.tileSize || 2; // 2% per tile = 50x50 grid
  const tileWidth = (tileSize / 100) * width;
  const tileHeight = (tileSize / 100) * height;

  // Calculate viewport bounds for culling
  const bounds = calculateViewportTileBounds(tileMap, width, height, zoom, pan);
  const { minTileX, maxTileX, minTileY, maxTileY } = bounds;

  // Render in layers: buildings first, then streets, then plazas
  for (let y = minTileY; y <= maxTileY; y++) {
    for (let x = minTileX; x <= maxTileX; x++) {
      const tile = tileMap.tiles[y] && tileMap.tiles[y][x];
      if (!tile) continue;

      const screenX = (x * tileSize / 100) * width;
      const screenY = (y * tileSize / 100) * height;

      switch (tile.type) {
        case 'building':
          // Enhanced building rendering with varied types, lighting, and shadows
          const pois = mapData.pointsOfInterest || [];
          const nearestPOI = findNearestPOI(x, y, pois, tileSize);
          const buildingStyle = getBuildingStyle(nearestPOI?.type || 'default');
          
          // Draw building with style, shadow, and lighting
          drawBuilding(ctx, screenX, screenY, tileWidth, tileHeight, buildingStyle, true);
          break;

        case 'main_street':
          // Wide light street (main pathway) - Enhanced with gradients, borders, and textures
          // Create gradient for depth
          const mainStreetGradient = ctx.createLinearGradient(screenX, screenY, screenX, screenY + tileHeight);
          mainStreetGradient.addColorStop(0, 'rgba(220, 220, 240, 0.9)');
          mainStreetGradient.addColorStop(0.5, 'rgba(200, 200, 220, 0.85)');
          mainStreetGradient.addColorStop(1, 'rgba(180, 180, 200, 0.8)');
          ctx.fillStyle = mainStreetGradient;
          ctx.fillRect(screenX, screenY, tileWidth, tileHeight);
          
          // Apply procedural texture
          const planetSeed = getPlanetTextureSeed(planet);
          const streetTexture = generateTerrainTexture('urban', x, y, planetSeed);
          applyTerrainTexture(ctx, screenX, screenY, tileWidth, tileHeight, streetTexture, 'rgba(200, 200, 220, 0.85)');
          
          // Enhanced border for visual hierarchy
          ctx.strokeStyle = 'rgba(240, 240, 255, 0.95)';
          ctx.lineWidth = 2;
          ctx.strokeRect(screenX, screenY, tileWidth, tileHeight);
          
          // Street markings (center line) for clarity
          ctx.strokeStyle = 'rgba(160, 160, 180, 0.8)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(screenX + tileWidth / 2, screenY);
          ctx.lineTo(screenX + tileWidth / 2, screenY + tileHeight);
          ctx.stroke();
          
          // Edge markings for road boundaries
          ctx.strokeStyle = 'rgba(150, 150, 170, 0.6)';
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(screenX + tileWidth * 0.25, screenY);
          ctx.lineTo(screenX + tileWidth * 0.25, screenY + tileHeight);
          ctx.moveTo(screenX + tileWidth * 0.75, screenY);
          ctx.lineTo(screenX + tileWidth * 0.75, screenY + tileHeight);
          ctx.stroke();
          break;

        case 'alley':
          // Narrow darker alley (secondary pathway) - Enhanced with subtle gradients and textures
          const alleyGradient = ctx.createLinearGradient(screenX, screenY, screenX, screenY + tileHeight);
          alleyGradient.addColorStop(0, 'rgba(150, 150, 170, 0.75)');
          alleyGradient.addColorStop(0.5, 'rgba(140, 140, 160, 0.7)');
          alleyGradient.addColorStop(1, 'rgba(130, 130, 150, 0.65)');
          ctx.fillStyle = alleyGradient;
          ctx.fillRect(screenX, screenY, tileWidth, tileHeight);
          
          // Apply procedural texture
          const planetSeedAlley = getPlanetTextureSeed(planet);
          const alleyTexture = generateTerrainTexture('urban', x, y, planetSeedAlley);
          applyTerrainTexture(ctx, screenX, screenY, tileWidth, tileHeight, alleyTexture, 'rgba(140, 140, 160, 0.7)');
          
          // Subtle border for alleys
          ctx.strokeStyle = 'rgba(120, 120, 140, 0.8)';
          ctx.lineWidth = 1;
          ctx.strokeRect(screenX, screenY, tileWidth, tileHeight);
          break;

        case 'plaza':
          // Open plaza area (walkable)
          ctx.fillStyle = 'rgba(220, 220, 240, 0.5)';
          ctx.strokeStyle = 'rgba(200, 200, 220, 0.6)';
          ctx.lineWidth = 0.5;
          ctx.fillRect(screenX, screenY, tileWidth, tileHeight);
          ctx.strokeRect(screenX, screenY, tileWidth, tileHeight);
          break;

        case 'open':
        default:
          // Open terrain (walkable, but less prominent)
          // Don't draw - let base terrain show through
          break;
      }
    }
  }
}

/**
 * Draw tile-based terrain for desert planets
 * Includes viewport culling for performance
 */
function drawDesertTerrain(ctx, width, height, mapData, planet, zoom = 1, pan = { x: 0, y: 0 }) {
  const tileMap = mapData.tileMap;
  if (!tileMap || !tileMap.tiles) return;

  const tileSize = tileMap.tileSize || 2;
  const tileWidth = (tileSize / 100) * width;
  const tileHeight = (tileSize / 100) * height;

  // Viewport culling
  const bounds = calculateViewportTileBounds(tileMap, width, height, zoom, pan);
  const { minTileX, maxTileX, minTileY, maxTileY } = bounds;

  for (let y = minTileY; y <= maxTileY; y++) {
    for (let x = minTileX; x <= maxTileX; x++) {
      const tile = tileMap.tiles[y] && tileMap.tiles[y][x];
      if (!tile) continue;

      const screenX = (x * tileSize / 100) * width;
      const screenY = (y * tileSize / 100) * height;

      switch (tile.type) {
        case 'rock':
          // Enhanced rock with texture, shadow, and lighting
          // Draw shadow first
          ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
          ctx.beginPath();
          ctx.arc(screenX + tileWidth / 2 + 1, screenY + tileHeight / 2 + 1, Math.min(tileWidth, tileHeight) / 2, 0, Math.PI * 2);
          ctx.fill();
          
          // Draw rock with base color
          ctx.fillStyle = 'rgba(60, 50, 40, 0.9)';
          ctx.strokeStyle = 'rgba(40, 30, 20, 1.0)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(screenX + tileWidth / 2, screenY + tileHeight / 2, Math.min(tileWidth, tileHeight) / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          
          // Apply procedural texture
          const planetSeedRock = getPlanetTextureSeed(planet);
          const rockTexture = generateTerrainTexture('rock', x, y, planetSeedRock);
          applyTerrainTexture(ctx, screenX, screenY, tileWidth, tileHeight, rockTexture, 'rgba(60, 50, 40, 0.9)');
          
          // Add lighting highlight
          const highlightGradient = ctx.createRadialGradient(
            screenX + tileWidth * 0.3, screenY + tileHeight * 0.3, 0,
            screenX + tileWidth / 2, screenY + tileHeight / 2, Math.min(tileWidth, tileHeight) / 2
          );
          highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
          highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
          ctx.fillStyle = highlightGradient;
          ctx.beginPath();
          ctx.arc(screenX + tileWidth / 2, screenY + tileHeight / 2, Math.min(tileWidth, tileHeight) / 2, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'sand_dune':
          // Enhanced sand dune with texture and lighting
          const duneGradient = ctx.createLinearGradient(screenX, screenY, screenX, screenY + tileHeight);
          duneGradient.addColorStop(0, 'rgba(210, 190, 160, 0.65)');
          duneGradient.addColorStop(0.5, 'rgba(200, 180, 150, 0.6)');
          duneGradient.addColorStop(1, 'rgba(190, 170, 140, 0.55)');
          ctx.fillStyle = duneGradient;
          ctx.fillRect(screenX, screenY, tileWidth, tileHeight);
          
          // Apply procedural texture
          const planetSeedDune = getPlanetTextureSeed(planet);
          const duneTexture = generateTerrainTexture('sand', x, y, planetSeedDune);
          applyTerrainTexture(ctx, screenX, screenY, tileWidth, tileHeight, duneTexture, 'rgba(200, 180, 150, 0.6)');
          
          // Add shadow on one side for depth
          ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
          ctx.fillRect(screenX + tileWidth * 0.6, screenY, tileWidth * 0.4, tileHeight);
          break;
        case 'canyon':
          ctx.fillStyle = 'rgba(20, 15, 10, 0.95)';
          ctx.strokeStyle = 'rgba(10, 5, 0, 1.0)';
          ctx.lineWidth = 2;
          ctx.fillRect(screenX, screenY, tileWidth, tileHeight);
          ctx.strokeRect(screenX, screenY, tileWidth, tileHeight);
          break;
        case 'oasis':
          ctx.fillStyle = 'rgba(50, 150, 50, 0.7)';
          ctx.strokeStyle = 'rgba(30, 120, 30, 0.8)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(screenX + tileWidth / 2, screenY + tileHeight / 2, Math.min(tileWidth, tileHeight) / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          break;
        case 'building':
          ctx.fillStyle = 'rgba(80, 60, 40, 0.9)';
          ctx.strokeStyle = 'rgba(60, 40, 20, 1.0)';
          ctx.lineWidth = 1;
          ctx.fillRect(screenX, screenY, tileWidth, tileHeight);
          ctx.strokeRect(screenX, screenY, tileWidth, tileHeight);
          break;
        case 'road':
          // Enhanced road with gradient, borders, and textures
          const roadGradient = ctx.createLinearGradient(screenX, screenY, screenX, screenY + tileHeight);
          roadGradient.addColorStop(0, 'rgba(130, 110, 90, 0.85)');
          roadGradient.addColorStop(0.5, 'rgba(120, 100, 80, 0.8)');
          roadGradient.addColorStop(1, 'rgba(110, 90, 70, 0.75)');
          ctx.fillStyle = roadGradient;
          ctx.fillRect(screenX, screenY, tileWidth, tileHeight);
          
          // Apply procedural texture
          const planetSeedRoad = getPlanetTextureSeed(planet);
          const roadTexture = generateTerrainTexture('sand', x, y, planetSeedRoad);
          applyTerrainTexture(ctx, screenX, screenY, tileWidth, tileHeight, roadTexture, 'rgba(120, 100, 80, 0.8)');
          
          // Enhanced border
          ctx.strokeStyle = 'rgba(100, 80, 60, 0.9)';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(screenX, screenY, tileWidth, tileHeight);
          
          // Center line for roads
          ctx.strokeStyle = 'rgba(90, 70, 50, 0.7)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(screenX + tileWidth / 2, screenY);
          ctx.lineTo(screenX + tileWidth / 2, screenY + tileHeight);
          ctx.stroke();
          break;
        case 'trail':
          // Enhanced trail with subtle gradient and textures
          const trailGradient = ctx.createLinearGradient(screenX, screenY, screenX, screenY + tileHeight);
          trailGradient.addColorStop(0, 'rgba(190, 170, 150, 0.75)');
          trailGradient.addColorStop(0.5, 'rgba(180, 160, 140, 0.7)');
          trailGradient.addColorStop(1, 'rgba(170, 150, 130, 0.65)');
          ctx.fillStyle = trailGradient;
          ctx.fillRect(screenX, screenY, tileWidth, tileHeight);
          
          // Apply procedural texture
          const planetSeedTrail = getPlanetTextureSeed(planet);
          const trailTexture = generateTerrainTexture('sand', x, y, planetSeedTrail);
          applyTerrainTexture(ctx, screenX, screenY, tileWidth, tileHeight, trailTexture, 'rgba(180, 160, 140, 0.7)');
          
          // Subtle border for trails
          ctx.strokeStyle = 'rgba(160, 140, 120, 0.6)';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(screenX, screenY, tileWidth, tileHeight);
          break;
      }
    }
  }
}

/**
 * Draw tile-based terrain for forest/jungle planets
 * Includes viewport culling for performance
 */
function drawForestTerrain(ctx, width, height, mapData, planet, zoom = 1, pan = { x: 0, y: 0 }) {
  const tileMap = mapData.tileMap;
  if (!tileMap || !tileMap.tiles) return;

  const tileSize = tileMap.tileSize || 2;
  const tileWidth = (tileSize / 100) * width;
  const tileHeight = (tileSize / 100) * height;

  // Viewport culling
  const bounds = calculateViewportTileBounds(tileMap, width, height, zoom, pan);
  const { minTileX, maxTileX, minTileY, maxTileY } = bounds;

  for (let y = minTileY; y <= maxTileY; y++) {
    for (let x = minTileX; x <= maxTileX; x++) {
      const tile = tileMap.tiles[y] && tileMap.tiles[y][x];
      if (!tile) continue;

      const screenX = (x * tileSize / 100) * width;
      const screenY = (y * tileSize / 100) * height;

      switch (tile.type) {
        case 'tree':
          // Enhanced tree with shadow and lighting
          // Draw shadow
          ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
          ctx.beginPath();
          ctx.arc(screenX + tileWidth / 2 + 1, screenY + tileHeight / 2 + 1, Math.min(tileWidth, tileHeight) / 2, 0, Math.PI * 2);
          ctx.fill();
          
          // Draw tree
          ctx.fillStyle = 'rgba(20, 60, 20, 0.9)';
          ctx.strokeStyle = 'rgba(10, 40, 10, 1.0)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(screenX + tileWidth / 2, screenY + tileHeight / 2, Math.min(tileWidth, tileHeight) / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          
          // Add lighting highlight
          const treeHighlight = ctx.createRadialGradient(
            screenX + tileWidth * 0.3, screenY + tileHeight * 0.3, 0,
            screenX + tileWidth / 2, screenY + tileHeight / 2, Math.min(tileWidth, tileHeight) / 2
          );
          treeHighlight.addColorStop(0, 'rgba(100, 200, 100, 0.3)');
          treeHighlight.addColorStop(1, 'rgba(100, 200, 100, 0)');
          ctx.fillStyle = treeHighlight;
          ctx.beginPath();
          ctx.arc(screenX + tileWidth / 2, screenY + tileHeight / 2, Math.min(tileWidth, tileHeight) / 2, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'swamp':
          ctx.fillStyle = 'rgba(30, 80, 40, 0.7)';
          ctx.strokeStyle = 'rgba(20, 60, 30, 0.8)';
          ctx.lineWidth = 0.5;
          ctx.fillRect(screenX, screenY, tileWidth, tileHeight);
          break;
        case 'clearing':
          ctx.fillStyle = 'rgba(100, 150, 100, 0.5)';
          ctx.strokeStyle = 'rgba(80, 120, 80, 0.6)';
          ctx.lineWidth = 0.5;
          ctx.fillRect(screenX, screenY, tileWidth, tileHeight);
          ctx.strokeRect(screenX, screenY, tileWidth, tileHeight);
          break;
        case 'trail':
          // Enhanced trail with gradient
          const forestTrailGradient = ctx.createLinearGradient(screenX, screenY, screenX, screenY + tileHeight);
          forestTrailGradient.addColorStop(0, 'rgba(150, 130, 90, 0.75)');
          forestTrailGradient.addColorStop(0.5, 'rgba(140, 120, 80, 0.7)');
          forestTrailGradient.addColorStop(1, 'rgba(130, 110, 70, 0.65)');
          ctx.fillStyle = forestTrailGradient;
          ctx.fillRect(screenX, screenY, tileWidth, tileHeight);
          
          // Subtle border
          ctx.strokeStyle = 'rgba(120, 100, 60, 0.6)';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(screenX, screenY, tileWidth, tileHeight);
          break;
      }
    }
  }
}

/**
 * Draw tile-based terrain for ocean planets
 * Includes viewport culling for performance
 */
function drawOceanTerrain(ctx, width, height, mapData, planet, zoom = 1, pan = { x: 0, y: 0 }) {
  const tileMap = mapData.tileMap;
  if (!tileMap || !tileMap.tiles) return;

  const tileSize = tileMap.tileSize || 2;
  const tileWidth = (tileSize / 100) * width;
  const tileHeight = (tileSize / 100) * height;

  // Viewport culling
  const bounds = calculateViewportTileBounds(tileMap, width, height, zoom, pan);
  const { minTileX, maxTileX, minTileY, maxTileY } = bounds;

  for (let y = minTileY; y <= maxTileY; y++) {
    for (let x = minTileX; x <= maxTileX; x++) {
      const tile = tileMap.tiles[y] && tileMap.tiles[y][x];
      if (!tile) continue;

      const screenX = (x * tileSize / 100) * width;
      const screenY = (y * tileSize / 100) * height;

      switch (tile.type) {
        case 'water':
          // Enhanced water with gradient and texture
          const waterGradient = ctx.createLinearGradient(screenX, screenY, screenX, screenY + tileHeight);
          waterGradient.addColorStop(0, 'rgba(30, 50, 90, 0.95)');
          waterGradient.addColorStop(0.5, 'rgba(20, 40, 80, 0.9)');
          waterGradient.addColorStop(1, 'rgba(10, 30, 70, 0.85)');
          ctx.fillStyle = waterGradient;
          ctx.fillRect(screenX, screenY, tileWidth, tileHeight);
          
          // Apply procedural texture
          const planetSeedWater = getPlanetTextureSeed(planet);
          const waterTexture = generateTerrainTexture('water', x, y, planetSeedWater);
          applyTerrainTexture(ctx, screenX, screenY, tileWidth, tileHeight, waterTexture, 'rgba(20, 40, 80, 0.9)');
          break;
        case 'island':
          ctx.fillStyle = 'rgba(150, 120, 80, 0.8)';
          ctx.strokeStyle = 'rgba(130, 100, 60, 0.9)';
          ctx.lineWidth = 1;
          ctx.fillRect(screenX, screenY, tileWidth, tileHeight);
          ctx.strokeRect(screenX, screenY, tileWidth, tileHeight);
          break;
        case 'channel':
          ctx.fillStyle = 'rgba(60, 100, 150, 0.7)';
          ctx.strokeStyle = 'rgba(40, 80, 130, 0.8)';
          ctx.lineWidth = 1;
          ctx.fillRect(screenX, screenY, tileWidth, tileHeight);
          ctx.strokeRect(screenX, screenY, tileWidth, tileHeight);
          break;
        case 'building':
          ctx.fillStyle = 'rgba(100, 80, 60, 0.9)';
          ctx.strokeStyle = 'rgba(80, 60, 40, 1.0)';
          ctx.lineWidth = 1;
          ctx.fillRect(screenX, screenY, tileWidth, tileHeight);
          ctx.strokeRect(screenX, screenY, tileWidth, tileHeight);
          break;
      }
    }
  }
}

/**
 * Draw tile-based terrain for ice/snow planets
 * Includes viewport culling for performance
 */
function drawIceTerrain(ctx, width, height, mapData, planet, zoom = 1, pan = { x: 0, y: 0 }) {
  const tileMap = mapData.tileMap;
  if (!tileMap || !tileMap.tiles) return;

  const tileSize = tileMap.tileSize || 2;
  const tileWidth = (tileSize / 100) * width;
  const tileHeight = (tileSize / 100) * height;

  // Viewport culling
  const bounds = calculateViewportTileBounds(tileMap, width, height, zoom, pan);
  const { minTileX, maxTileX, minTileY, maxTileY } = bounds;

  for (let y = minTileY; y <= maxTileY; y++) {
    for (let x = minTileX; x <= maxTileX; x++) {
      const tile = tileMap.tiles[y] && tileMap.tiles[y][x];
      if (!tile) continue;

      const screenX = (x * tileSize / 100) * width;
      const screenY = (y * tileSize / 100) * height;

      switch (tile.type) {
        case 'canyon':
        case 'crevasse':
          ctx.fillStyle = 'rgba(20, 40, 80, 0.95)';
          ctx.strokeStyle = 'rgba(10, 30, 70, 1.0)';
          ctx.lineWidth = 2;
          ctx.fillRect(screenX, screenY, tileWidth, tileHeight);
          ctx.strokeRect(screenX, screenY, tileWidth, tileHeight);
          break;
        case 'snow_drift':
          ctx.fillStyle = 'rgba(240, 250, 255, 0.6)';
          ctx.strokeStyle = 'rgba(220, 240, 250, 0.7)';
          ctx.lineWidth = 0.5;
          ctx.fillRect(screenX, screenY, tileWidth, tileHeight);
          break;
        case 'frozen_lake':
          ctx.fillStyle = 'rgba(180, 220, 255, 0.7)';
          ctx.strokeStyle = 'rgba(160, 200, 240, 0.8)';
          ctx.lineWidth = 1;
          ctx.fillRect(screenX, screenY, tileWidth, tileHeight);
          ctx.strokeRect(screenX, screenY, tileWidth, tileHeight);
          break;
        case 'road':
          ctx.fillStyle = 'rgba(200, 220, 240, 0.8)';
          ctx.strokeStyle = 'rgba(180, 200, 220, 0.9)';
          ctx.lineWidth = 1;
          ctx.fillRect(screenX, screenY, tileWidth, tileHeight);
          ctx.strokeRect(screenX, screenY, tileWidth, tileHeight);
          break;
        case 'building':
          ctx.fillStyle = 'rgba(220, 230, 240, 0.9)';
          ctx.strokeStyle = 'rgba(200, 210, 230, 1.0)';
          ctx.lineWidth = 1;
          ctx.fillRect(screenX, screenY, tileWidth, tileHeight);
          ctx.strokeRect(screenX, screenY, tileWidth, tileHeight);
          break;
      }
    }
  }
}

/**
 * Draw tile-based terrain for volcanic planets
 * Includes viewport culling for performance
 */
function drawVolcanicTerrain(ctx, width, height, mapData, planet, zoom = 1, pan = { x: 0, y: 0 }) {
  const tileMap = mapData.tileMap;
  if (!tileMap || !tileMap.tiles) return;

  const tileSize = tileMap.tileSize || 2;
  const tileWidth = (tileSize / 100) * width;
  const tileHeight = (tileSize / 100) * height;

  // Viewport culling
  const bounds = calculateViewportTileBounds(tileMap, width, height, zoom, pan);
  const { minTileX, maxTileX, minTileY, maxTileY } = bounds;

  for (let y = minTileY; y <= maxTileY; y++) {
    for (let x = minTileX; x <= maxTileX; x++) {
      const tile = tileMap.tiles[y] && tileMap.tiles[y][x];
      if (!tile) continue;

      const screenX = (x * tileSize / 100) * width;
      const screenY = (y * tileSize / 100) * height;

      switch (tile.type) {
        case 'lava_flow':
          ctx.fillStyle = 'rgba(255, 100, 0, 0.95)';
          ctx.strokeStyle = 'rgba(255, 50, 0, 1.0)';
          ctx.lineWidth = 2;
          ctx.fillRect(screenX, screenY, tileWidth, tileHeight);
          ctx.strokeRect(screenX, screenY, tileWidth, tileHeight);
          ctx.shadowBlur = 10;
          ctx.shadowColor = 'rgba(255, 150, 0, 0.8)';
          ctx.fillRect(screenX, screenY, tileWidth, tileHeight);
          ctx.shadowBlur = 0;
          break;
        case 'volcanic_vent':
          ctx.fillStyle = 'rgba(150, 20, 20, 0.95)';
          ctx.strokeStyle = 'rgba(100, 10, 10, 1.0)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(screenX + tileWidth / 2, screenY + tileHeight / 2, Math.min(tileWidth, tileHeight) / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          break;
        case 'unstable_ground':
          ctx.fillStyle = 'rgba(60, 50, 40, 0.7)';
          ctx.strokeStyle = 'rgba(40, 30, 20, 0.8)';
          ctx.lineWidth = 0.5;
          ctx.fillRect(screenX, screenY, tileWidth, tileHeight);
          ctx.strokeStyle = 'rgba(20, 10, 0, 0.5)';
          ctx.beginPath();
          ctx.moveTo(screenX, screenY + tileHeight / 2);
          ctx.lineTo(screenX + tileWidth, screenY + tileHeight / 2);
          ctx.stroke();
          break;
        case 'clearing':
          ctx.fillStyle = 'rgba(80, 70, 60, 0.6)';
          ctx.strokeStyle = 'rgba(60, 50, 40, 0.7)';
          ctx.lineWidth = 0.5;
          ctx.fillRect(screenX, screenY, tileWidth, tileHeight);
          ctx.strokeRect(screenX, screenY, tileWidth, tileHeight);
          break;
        case 'trail':
          ctx.fillStyle = 'rgba(100, 90, 80, 0.7)';
          ctx.strokeStyle = 'rgba(80, 70, 60, 0.8)';
          ctx.lineWidth = 0.5;
          ctx.fillRect(screenX, screenY, tileWidth, tileHeight);
          break;
        case 'building':
          ctx.fillStyle = 'rgba(40, 35, 30, 0.9)';
          ctx.strokeStyle = 'rgba(20, 15, 10, 1.0)';
          ctx.lineWidth = 1;
          ctx.fillRect(screenX, screenY, tileWidth, tileHeight);
          ctx.strokeRect(screenX, screenY, tileWidth, tileHeight);
          break;
      }
    }
  }
}

/**
 * Draw tile-based terrain for barren/desolate planets
 * Includes viewport culling for performance
 */
function drawBarrenTerrain(ctx, width, height, mapData, planet, zoom = 1, pan = { x: 0, y: 0 }) {
  const tileMap = mapData.tileMap;
  if (!tileMap || !tileMap.tiles) return;

  const tileSize = tileMap.tileSize || 2;
  const tileWidth = (tileSize / 100) * width;
  const tileHeight = (tileSize / 100) * height;

  // Viewport culling
  const bounds = calculateViewportTileBounds(tileMap, width, height, zoom, pan);
  const { minTileX, maxTileX, minTileY, maxTileY } = bounds;

  for (let y = minTileY; y <= maxTileY; y++) {
    for (let x = minTileX; x <= maxTileX; x++) {
      const tile = tileMap.tiles[y] && tileMap.tiles[y][x];
      if (!tile) continue;

      const screenX = (x * tileSize / 100) * width;
      const screenY = (y * tileSize / 100) * height;

      switch (tile.type) {
        case 'crater':
          ctx.fillStyle = 'rgba(20, 15, 10, 0.95)';
          ctx.strokeStyle = 'rgba(10, 5, 0, 1.0)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(screenX + tileWidth / 2, screenY + tileHeight / 2, Math.min(tileWidth, tileHeight) / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          break;
        case 'rock':
          ctx.fillStyle = 'rgba(60, 55, 50, 0.9)';
          ctx.strokeStyle = 'rgba(40, 35, 30, 1.0)';
          ctx.lineWidth = 1;
          ctx.fillRect(screenX, screenY, tileWidth, tileHeight);
          ctx.strokeRect(screenX, screenY, tileWidth, tileHeight);
          break;
        case 'ruin':
          ctx.fillStyle = 'rgba(70, 65, 60, 0.7)';
          ctx.strokeStyle = 'rgba(50, 45, 40, 0.8)';
          ctx.lineWidth = 0.5;
          ctx.fillRect(screenX, screenY, tileWidth, tileHeight);
          ctx.strokeStyle = 'rgba(30, 25, 20, 0.6)';
          ctx.beginPath();
          ctx.moveTo(screenX, screenY);
          ctx.lineTo(screenX + tileWidth, screenY + tileHeight);
          ctx.stroke();
          break;
        case 'building':
          ctx.fillStyle = 'rgba(80, 70, 60, 0.9)';
          ctx.strokeStyle = 'rgba(60, 50, 40, 1.0)';
          ctx.lineWidth = 1;
          ctx.fillRect(screenX, screenY, tileWidth, tileHeight);
          ctx.strokeRect(screenX, screenY, tileWidth, tileHeight);
          break;
        case 'road':
          ctx.fillStyle = 'rgba(100, 90, 80, 0.8)';
          ctx.strokeStyle = 'rgba(80, 70, 60, 0.9)';
          ctx.lineWidth = 1;
          ctx.fillRect(screenX, screenY, tileWidth, tileHeight);
          ctx.strokeRect(screenX, screenY, tileWidth, tileHeight);
          break;
        case 'trail':
          ctx.fillStyle = 'rgba(140, 130, 120, 0.7)';
          ctx.strokeStyle = 'rgba(120, 110, 100, 0.8)';
          ctx.lineWidth = 0.5;
          ctx.fillRect(screenX, screenY, tileWidth, tileHeight);
          break;
      }
    }
  }
}

/**
 * Generate a simple tile map from POIs (fallback if backend doesn't provide)
 */
function generateTileMapFromPOIs(mapData) {
  const gridSize = 50; // 50x50 grid (2% per tile)
  const tileSize = 2;
  const tiles = [];
  
  // Initialize all as open
  for (let y = 0; y < gridSize; y++) {
    tiles[y] = [];
    for (let x = 0; x < gridSize; x++) {
      tiles[y][x] = { type: 'open', walkable: true, visual: 'terrain' };
    }
  }

  const pois = mapData.pointsOfInterest || [];
  
  // Place buildings around POIs
  pois.forEach(poi => {
    if (poi.type !== 'city' && poi.type !== 'entertainment') {
      const tileX = Math.floor(poi.x / tileSize);
      const tileY = Math.floor(poi.y / tileSize);
      
      // Create 2x2 building
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const tx = tileX + dx;
          const ty = tileY + dy;
          if (tx >= 0 && tx < gridSize && ty >= 0 && ty < gridSize) {
            tiles[ty][tx] = { type: 'building', walkable: false, visual: 'building' };
          }
        }
      }
    }
  });

  // Create streets connecting major POIs
  const spaceport = pois.find(p => p.type === 'spaceport');
  if (spaceport) {
    pois.forEach(poi => {
      if (poi !== spaceport && (poi.type === 'city' || poi.type === 'palace' || poi.type === 'entertainment')) {
        createStreetPath(tiles, spaceport, poi, gridSize, tileSize, 3);
      }
    });
  }

  return { gridSize, tileSize, tiles };
}

/**
 * Create a street path between two POIs
 */
function createStreetPath(tiles, fromPOI, toPOI, gridSize, tileSize, width) {
  const fromX = Math.floor(fromPOI.x / tileSize);
  const fromY = Math.floor(fromPOI.y / tileSize);
  const toX = Math.floor(toPOI.x / tileSize);
  const toY = Math.floor(toPOI.y / tileSize);

  const dx = Math.abs(toX - fromX);
  const dy = Math.abs(toY - fromY);
  const sx = fromX < toX ? 1 : -1;
  const sy = fromY < toY ? 1 : -1;
  let err = dx - dy;

  let x = fromX;
  let y = fromY;

  while (true) {
    const halfWidth = Math.floor(width / 2);
    for (let wy = -halfWidth; wy <= halfWidth; wy++) {
      for (let wx = -halfWidth; wx <= halfWidth; wx++) {
        const tx = x + wx;
        const ty = y + wy;
        if (tx >= 0 && tx < gridSize && ty >= 0 && ty < gridSize) {
          const existing = tiles[ty][tx];
          if (existing.type !== 'building') {
            tiles[ty][tx] = {
              type: width >= 3 ? 'main_street' : 'alley',
              walkable: true,
              visual: width >= 3 ? 'main_street' : 'alley'
            };
          }
        }
      }
    }

    if (x === toX && y === toY) break;

    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }
}

/**
 * Draw NavMesh pathways and building blocks for urban planets
 * Shows navigable areas and impediments (buildings) for immersive navigation
 */
function drawNavMeshPathways(ctx, width, height, navMesh, planet, mapData) {
  if (!navMesh || !navMesh.polygons || navMesh.polygons.length === 0) return;

  const isUrban = planet.type === 'urban' || mapData.terrain === 'urban_sprawl';
  
  // For urban planets, draw building blocks (impassable areas) first
  if (isUrban && mapData.pointsOfInterest) {
    ctx.fillStyle = 'rgba(20, 20, 30, 0.6)'; // Dark building color
    ctx.strokeStyle = 'rgba(40, 40, 60, 0.8)';
    ctx.lineWidth = 1;
    
    mapData.pointsOfInterest.forEach(poi => {
      // Create building blocks around POIs (except pathways themselves)
      if (poi.type !== 'city' && poi.type !== 'entertainment') {
        const x = (poi.x / 100) * width;
        const y = (poi.y / 100) * height;
        const size = 15; // Building size in pixels
        
        // Draw building shadow
        ctx.fillStyle = 'rgba(10, 10, 20, 0.4)';
        ctx.fillRect(x - size/2 + 2, y - size/2 + 2, size, size);
        
        // Draw building
        ctx.fillStyle = 'rgba(30, 30, 50, 0.5)';
        ctx.fillRect(x - size/2, y - size/2, size, size);
        ctx.strokeRect(x - size/2, y - size/2, size, size);
      }
    });
  }

  // Draw NavMesh polygons as navigable pathways
  ctx.fillStyle = isUrban 
    ? 'rgba(100, 100, 120, 0.15)' // Urban: subtle gray for streets
    : 'rgba(150, 200, 255, 0.1)'; // Other: subtle blue for paths
  
  ctx.strokeStyle = isUrban
    ? 'rgba(150, 150, 180, 0.3)' // Urban: street borders
    : 'rgba(100, 150, 255, 0.2)'; // Other: path borders
  
  ctx.lineWidth = 1;

  navMesh.polygons.forEach(polygon => {
    if (!polygon.vertices || polygon.vertices.length < 3) return;

    // Convert vertices from 0-1000 range to screen coordinates
    ctx.beginPath();
    const firstVertex = polygon.vertices[0];
    const screenX = (firstVertex.x / 10) * (width / 100); // Convert 0-1000 to 0-100 then to screen
    const screenY = (firstVertex.y / 10) * (height / 100);
    ctx.moveTo(screenX, screenY);

    for (let i = 1; i < polygon.vertices.length; i++) {
      const vertex = polygon.vertices[i];
      const x = (vertex.x / 10) * (width / 100);
      const y = (vertex.y / 10) * (height / 100);
      ctx.lineTo(x, y);
    }
    ctx.closePath();
    
    // Fill polygon (navigable area)
    ctx.fill();
    
    // Stroke polygon border (pathway edge)
    ctx.stroke();
  });

  // Draw connections between polygons as visible pathways
  if (navMesh.connections && navMesh.connections.length > 0) {
    ctx.strokeStyle = isUrban
      ? 'rgba(200, 200, 220, 0.4)' // Urban: brighter street lines
      : 'rgba(150, 200, 255, 0.3)'; // Other: path lines
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    navMesh.connections.forEach(connection => {
      if (connection.edge && connection.edge.start && connection.edge.end) {
        const startX = (connection.edge.start.x / 10) * (width / 100);
        const startY = (connection.edge.start.y / 10) * (height / 100);
        const endX = (connection.edge.end.x / 10) * (width / 100);
        const endY = (connection.edge.end.y / 10) * (height / 100);

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
      }
    });
  }
}

/**
 * Draw pathways/roads between locations
 */
function drawPathways(ctx, width, height, mapData) {
  // Generate pathways if not explicitly defined
  const pathways = mapData.pathways || generatePathways(mapData);
  
  if (!pathways || pathways.length === 0) return;

  ctx.strokeStyle = '#8b7355'; // Road color (brown/dirt)
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  pathways.forEach(pathway => {
    const fromX = (pathway.from.x / 100) * width;
    const fromY = (pathway.from.y / 100) * height;
    const toX = (pathway.to.x / 100) * width;
    const toY = (pathway.to.y / 100) * height;

    // Draw road with border for depth
    // Outer border (darker)
    ctx.strokeStyle = '#6b5d4d';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    // Main road (lighter)
    ctx.strokeStyle = '#8b7355';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    // Inner highlight
    ctx.strokeStyle = '#a0826d';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();
  });
}

/**
 * Generate pathways between major locations
 */
function generatePathways(mapData) {
  const pathways = [];
  const locations = [];

  // Collect all major locations
  if (mapData.mapLayout) {
    const layout = mapData.mapLayout;
    if (layout.locations) locations.push(...layout.locations);
    if (layout.regions) locations.push(...layout.regions);
    if (layout.districts) locations.push(...layout.districts);
    if (layout.settlements) locations.push(...layout.settlements);
  }

  // Add major POIs as connection points
  if (mapData.pointsOfInterest) {
    mapData.pointsOfInterest.forEach(poi => {
      if (poi.type === 'spaceport' || poi.type === 'palace' || poi.type === 'city') {
        locations.push(poi);
      }
    });
  }

  // Connect major cities and important locations
  for (let i = 0; i < locations.length; i++) {
    for (let j = i + 1; j < locations.length; j++) {
      const loc1 = locations[i];
      const loc2 = locations[j];
      
      // Only connect if both are major locations (cities, capitals, spaceports)
      const isMajor1 = loc1.type === 'capital' || loc1.type === 'city' || loc1.type === 'spaceport' || loc1.size === 'large';
      const isMajor2 = loc2.type === 'capital' || loc2.type === 'city' || loc2.type === 'spaceport' || loc2.size === 'large';
      
      if (isMajor1 && isMajor2) {
        // Calculate distance
        const dx = loc1.x - loc2.x;
        const dy = loc1.y - loc2.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Only connect if reasonably close (within 60% of map)
        if (distance < 60) {
          pathways.push({
            from: { x: loc1.x, y: loc1.y },
            to: { x: loc2.x, y: loc2.y },
            distance: distance
          });
        }
      }
    }
  }

  return pathways;
}

/**
 * Draw spaceport building (2x2 grid square)
 */
function drawSpaceport(ctx, width, height, spaceport) {
  // Spaceport coordinates are in percentage (0-100)
  const x = (spaceport.x / 100) * width;
  const y = (spaceport.y / 100) * height;
  // Spaceport is a 2x2 grid building - each grid square is 1.5% of map, total 3%
  const gridSquareSize = (1.5 / 100) * Math.min(width, height);
  const totalSize = gridSquareSize * 2; // 2x2 grid = 2 squares per side
  
  // Draw 2x2 grid squares
  const gridSize = gridSquareSize;
  
  // Base building color (gray/industrial with slight blue tint)
  ctx.fillStyle = '#4a5568';
  ctx.strokeStyle = '#2d3748';
  ctx.lineWidth = 2;
  
  // Draw 4 squares in a 2x2 grid
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 2; col++) {
      const squareX = x - totalSize/2 + col * gridSize;
      const squareY = y - totalSize/2 + row * gridSize;
      
      // Draw square with slight variation in color
      const colorVariation = (row + col) % 2 === 0 ? '#4a5568' : '#5a6578';
      ctx.fillStyle = colorVariation;
      ctx.fillRect(squareX, squareY, gridSize, gridSize);
      ctx.strokeRect(squareX, squareY, gridSize, gridSize);
      
      // Add detail lines (runway/landing pad markings)
      if (row === 0 && col === 0) {
        // Top-left square: landing pad markings
        ctx.strokeStyle = '#718096';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(squareX + gridSize/4, squareY + gridSize/2);
        ctx.lineTo(squareX + gridSize * 3/4, squareY + gridSize/2);
        ctx.moveTo(squareX + gridSize/2, squareY + gridSize/4);
        ctx.lineTo(squareX + gridSize/2, squareY + gridSize * 3/4);
        ctx.stroke();
        ctx.strokeStyle = '#2d3748';
        ctx.lineWidth = 2;
      }
    }
  }
  
  // Draw outer border (thicker for visibility)
  ctx.strokeStyle = '#1a202c';
  ctx.lineWidth = 3;
  ctx.strokeRect(x - totalSize/2, y - totalSize/2, totalSize, totalSize);
  
  // Draw label with background for readability
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(x - 35, y + totalSize/2 + 2, 70, 18);
  
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  ctx.shadowBlur = 3;
  ctx.fillText('Spaceport', x, y + totalSize/2 + 5);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
}

/**
 * Seeded random number generator for consistent terrain generation
 */
function seededRandom(seed) {
  let value = seed;
  return function() {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}

/**
 * Get seed from planet ID for deterministic terrain
 */
function getPlanetSeed(planet) {
  if (!planet || !planet.id) return 12345; // Default seed
  // Convert planet ID to numeric seed
  let hash = 0;
  for (let i = 0; i < planet.id.length; i++) {
    const char = planet.id.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash) || 12345;
}

/**
 * Draw base terrain background (planet-wide gradient)
 * This provides the foundation layer before biome-specific terrain is rendered
 */
function drawTerrainBase(ctx, width, height, planet, terrainType) {
  // Determine terrain type from planet if not provided
  if (!terrainType && planet) {
    terrainType = getTerrainTypeFromPlanet(planet);
  }
  
  // Get base color for planet type
  const terrainStyles = {
    urban_sprawl: { baseColor: '#1a1a2e', gradient: ['#0a0a1a', '#1a1a2e', '#2a2a3e'] },
    temperate_plains: { baseColor: '#3d6b1f', gradient: ['#2d5016', '#3d6b1f', '#4a7c2a', '#5a8c3a'] },
    desert: { baseColor: '#d4a574', gradient: ['#c49464', '#d4a574', '#e4b584', '#f4c594'] },
    arid_plains: { baseColor: '#9b8365', gradient: ['#8b7355', '#9b8365', '#ab9375', '#bba385'] },
    jungle: { baseColor: '#1a4d2e', gradient: ['#0a3d1e', '#1a4d2e', '#2d5f3f', '#3d6f4f'] },
    tropical_forest: { baseColor: '#2d5f3f', gradient: ['#1a4d2e', '#2d5f3f', '#3d6f4f', '#4d7f5f'] },
    ocean: { baseColor: '#1a5d7e', gradient: ['#0a4d6e', '#1a5d7e', '#2a6d8e', '#3a7d9e'] },
    ice: { baseColor: '#b2dfdb', gradient: ['#a0cfcb', '#b2dfdb', '#c2efeb', '#d2fffb'] },
    volcanic: { baseColor: '#3d2a2a', gradient: ['#2d1a1a', '#3d2a2a', '#4d3a3a', '#5d4a4a'] },
    lava_field: { baseColor: '#4d1a1a', gradient: ['#3d0a0a', '#4d1a1a', '#5d2a2a', '#6d3a3a'] },
    forest: { baseColor: '#2d5f3f', gradient: ['#1b4332', '#2d5f3f', '#40916c', '#50a17c'] },
    swamp: { baseColor: '#3d5f4f', gradient: ['#2d4f3f', '#3d5f4f', '#4d6f5f', '#5d7f6f'] },
    barren: { baseColor: '#6b6b5f', gradient: ['#5b5b4f', '#6b6b5f', '#7b7b6f', '#8b8b7f'] },
    gas_giant: { baseColor: '#1a1a3e', gradient: ['#0a0a2e', '#1a1a3e', '#2a2a4e', '#3a3a5e'] }
  };

  const style = terrainStyles[terrainType] || terrainStyles.temperate_plains;

  // Draw base gradient background
  const gradient = ctx.createRadialGradient(
    width / 2, height / 2, 0,
    width / 2, height / 2, Math.max(width, height) * 0.8
  );
  style.gradient.forEach((color, index) => {
    gradient.addColorStop(index / (style.gradient.length - 1), color);
  });
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Add subtle lighting effect
  addTerrainLighting(ctx, width, height);
}

/**
 * Add lighting effects to terrain
 */
function addTerrainLighting(ctx, width, height) {
  // Subtle lighting from top-left
  const lightGradient = ctx.createRadialGradient(
    width * 0.2, height * 0.2, 0,
    width * 0.2, height * 0.2, Math.max(width, height) * 0.6
  );
  lightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
  lightGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.04)');
  lightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = lightGradient;
  ctx.fillRect(0, 0, width, height);

  // Subtle shadow from opposite corner
  const shadowGradient = ctx.createRadialGradient(
    width * 0.8, height * 0.8, 0,
    width * 0.8, height * 0.8, Math.max(width, height) * 0.5
  );
  shadowGradient.addColorStop(0, 'rgba(0, 0, 0, 0.08)');
  shadowGradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.04)');
  shadowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = shadowGradient;
  ctx.fillRect(0, 0, width, height);
}

/**
 * Draw terrain background with lore-accurate Star Wars planet visuals (procedural fallback)
 */
function drawTerrain(ctx, width, height, planet, terrainType) {
  // Determine terrain type from planet if not provided
  if (!terrainType && planet) {
    terrainType = getTerrainTypeFromPlanet(planet);
  }
  
  // Get seeded random function for this planet
  const seed = getPlanetSeed(planet);
  const random = seededRandom(seed);

  const terrainStyles = {
    // Urban/Industrial Planets (Centralis, Sinkport, etc.)
    urban_sprawl: {
      baseColor: '#1a1a2e',
      gradient: ['#0a0a1a', '#1a1a2e', '#2a2a3e'],
      pattern: 'urban_grid',
      overlay: 'city_lights',
      texture: 'metallic'
    },
    
    // Temperate Terrestrial Planets (Drydock, Caelmore, Solenne, etc.)
    temperate_plains: {
      baseColor: '#3d6b1f',
      gradient: ['#2d5016', '#3d6b1f', '#4a7c2a', '#5a8c3a'],
      pattern: 'temperate_grassland',
      overlay: 'rolling_hills',
      texture: 'grass'
    },
    
    // Desert Planets (Gravenmoor, Karrn, Talveen, etc.)
    desert: {
      baseColor: '#d4a574',
      gradient: ['#c49464', '#d4a574', '#e4b584', '#f4c594'],
      pattern: 'sand_dunes',
      overlay: 'desert_wind',
      texture: 'sand'
    },
    
    // Arid Plains (Sytha, Casmer, etc.)
    arid_plains: {
      baseColor: '#9b8365',
      gradient: ['#8b7355', '#9b8365', '#ab9375', '#bba385'],
      pattern: 'rocky_arid',
      overlay: 'canyons',
      texture: 'rock'
    },
    
    // Jungle Planets (Verdholm, Myssia, Verdance, etc.)
    jungle: {
      baseColor: '#1a4d2e',
      gradient: ['#0a3d1e', '#1a4d2e', '#2d5f3f', '#3d6f4f'],
      pattern: 'dense_jungle',
      overlay: 'canopy',
      texture: 'foliage'
    },
    
    // Tropical Forest (Eloria, Coralsec, etc.)
    tropical_forest: {
      baseColor: '#2d5f3f',
      gradient: ['#1a4d2e', '#2d5f3f', '#3d6f4f', '#4d7f5f'],
      pattern: 'tropical_vegetation',
      overlay: 'beaches',
      texture: 'palm_trees'
    },
    
    // Ocean Worlds (Tethys, Thessmar/Dorrun, etc.)
    ocean: {
      baseColor: '#1a5d7e',
      gradient: ['#0a4d6e', '#1a5d7e', '#2a6d8e', '#3a7d9e'],
      pattern: 'ocean_waves',
      overlay: 'coral_reefs',
      texture: 'water'
    },
    
    // Tropical Ocean (Coralsec beaches, etc.)
    tropical_ocean: {
      baseColor: '#2a7d9e',
      gradient: ['#1a6d8e', '#2a7d9e', '#3a8dae', '#4a9dbe'],
      pattern: 'tropical_waves',
      overlay: 'islands',
      texture: 'tropical_water'
    },
    
    // Ice/Frozen Planets (Rime, Kthala, Glaiv, etc.)
    ice: {
      baseColor: '#b2dfdb',
      gradient: ['#a0cfcb', '#b2dfdb', '#c2efeb', '#d2fffb'],
      pattern: 'ice_sheet',
      overlay: 'snow_drifts',
      texture: 'ice'
    },
    
    // Tundra (Cold but not frozen)
    tundra: {
      baseColor: '#d0e0e0',
      gradient: ['#c0d0d0', '#d0e0e0', '#e0f0f0', '#f0ffff'],
      pattern: 'tundra_grass',
      overlay: 'frost',
      texture: 'frozen_ground'
    },
    
    // Volcanic Planets (Embervast, Pyrren, etc.)
    volcanic: {
      baseColor: '#3d2a2a',
      gradient: ['#2d1a1a', '#3d2a2a', '#4d3a3a', '#5d4a4a'],
      pattern: 'lava_flows',
      overlay: 'volcanic_ash',
      texture: 'lava'
    },
    
    // Lava Fields (Embervast surface)
    lava_field: {
      baseColor: '#4d1a1a',
      gradient: ['#3d0a0a', '#4d1a1a', '#5d2a2a', '#6d3a3a'],
      pattern: 'molten_lava',
      overlay: 'smoke',
      texture: 'lava_pools'
    },
    
    // Forest Worlds (Verdance, etc.)
    forest: {
      baseColor: '#2d5f3f',
      gradient: ['#1b4332', '#2d5f3f', '#40916c', '#50a17c'],
      pattern: 'temperate_forest',
      overlay: 'tree_canopy',
      texture: 'trees'
    },
    
    // Swamp/Marsh (Mirefen, Eloria swamps, etc.)
    swamp: {
      baseColor: '#3d5f4f',
      gradient: ['#2d4f3f', '#3d5f4f', '#4d6f5f', '#5d7f6f'],
      pattern: 'swamp_marsh',
      overlay: 'mist',
      texture: 'mud'
    },
    
    // Barren/Rocky (Crait, Jedha, etc.)
    barren: {
      baseColor: '#6b6b5f',
      gradient: ['#5b5b4f', '#6b6b5f', '#7b7b6f', '#8b8b7f'],
      pattern: 'rocky_barren',
      overlay: 'dust_storms',
      texture: 'stone'
    },
    
    // Mountainous (Caelmore mountains, etc.)
    mountainous: {
      baseColor: '#5a5a4a',
      gradient: ['#4a4a3a', '#5a5a4a', '#6a6a5a', '#7a7a6a'],
      pattern: 'mountain_peaks',
      overlay: 'snow_caps',
      texture: 'rocky'
    },
    
    // Canyon (Casmer sinkholes, etc.)
    canyon: {
      baseColor: '#8b7355',
      gradient: ['#7b6345', '#8b7355', '#9b8365', '#ab9375'],
      pattern: 'canyon_walls',
      overlay: 'shadows',
      texture: 'layered_rock'
    },
    
    // Gas Giant (Cloud City, etc.)
    gas_giant: {
      baseColor: '#2a2a4e',
      gradient: ['#1a1a3e', '#2a2a4e', '#3a3a5e', '#4a4a6e'],
      pattern: 'gas_clouds',
      overlay: 'atmospheric_storms',
      texture: 'clouds'
    },
    
    // Varied Terrain (Mixed biomes)
    varied_terrain: {
      baseColor: '#4d5d3f',
      gradient: ['#3d4d2e', '#4d5d3f', '#5d6d4f', '#6d7d5f'],
      pattern: 'mixed_biomes',
      overlay: 'varied_features',
      texture: 'mixed'
    },
    
    // Crystal Caves (Kthala, etc.)
    crystal_caves: {
      baseColor: '#4a3a5a',
      gradient: ['#3a2a4a', '#4a3a5a', '#5a4a6a', '#6a5a7a'],
      pattern: 'crystal_formations',
      overlay: 'crystal_glow',
      texture: 'crystalline'
    },
    
    // Toxic (Sinkport lower levels, etc.)
    toxic: {
      baseColor: '#4a5a3a',
      gradient: ['#3a4a2a', '#4a5a3a', '#5a6a4a', '#6a7a5a'],
      pattern: 'toxic_waste',
      overlay: 'toxic_fog',
      texture: 'hazardous'
    },
    
    // Asteroid Field
    asteroid_field: {
      baseColor: '#2a2a2a',
      gradient: ['#1a1a1a', '#2a2a2a', '#3a3a3a', '#4a4a4a'],
      pattern: 'asteroids',
      overlay: 'space_debris',
      texture: 'rocky_space'
    }
  };

  const style = terrainStyles[terrainType] || terrainStyles.temperate_plains;

  // Draw base gradient background with enhanced lighting
  const gradient = ctx.createRadialGradient(
    width / 2, height / 2, 0,
    width / 2, height / 2, Math.max(width, height) * 0.8
  );
  style.gradient.forEach((color, index) => {
    gradient.addColorStop(index / (style.gradient.length - 1), color);
  });
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Add subtle lighting effect (simulated light source from top-left)
  const lightGradient = ctx.createRadialGradient(
    width * 0.2, height * 0.2, 0,
    width * 0.2, height * 0.2, Math.max(width, height) * 0.6
  );
  lightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
  lightGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.05)');
  lightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = lightGradient;
  ctx.fillRect(0, 0, width, height);

  // Add subtle shadow from opposite corner
  const shadowGradient = ctx.createRadialGradient(
    width * 0.8, height * 0.8, 0,
    width * 0.8, height * 0.8, Math.max(width, height) * 0.5
  );
  shadowGradient.addColorStop(0, 'rgba(0, 0, 0, 0.1)');
  shadowGradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.05)');
  shadowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = shadowGradient;
  ctx.fillRect(0, 0, width, height);

  // Draw terrain pattern (main texture) - pass seeded random function
  drawTerrainPattern(ctx, width, height, style.pattern, style.baseColor, style.texture, random);
  
  // Draw overlay (secondary features) - pass seeded random function
  drawTerrainOverlay(ctx, width, height, style.overlay, style.baseColor, random);
}

/**
 * Get terrain type from planet characteristics
 */
function getTerrainTypeFromPlanet(planet) {
  const planetType = planet.planetType?.toLowerCase();
  const climate = planet.climate?.toLowerCase();
  const name = planet.name?.toLowerCase() || '';
  
  // Lore-accurate mapping for specific planets
  const specificPlanets = {
    'centralis': 'urban_sprawl',
    'gravenmoor': 'desert',
    'karrn': 'desert',
    'talveen': 'desert',
    'verdholm': 'jungle',
    'myssia': 'jungle',
    'verdance': 'forest',
    'eloria': 'tropical_forest',
    'coralsec': 'tropical_ocean',
    'tethys': 'ocean',
    'mon cala': 'ocean',
    'dorrun': 'ocean',
    'rime': 'ice',
    'kthala': 'ice',
    'glaiv': 'ice',
    'embervast': 'lava_field',
    'pyrren': 'volcanic',
    'mirefen': 'swamp',
    'casmer': 'canyon',
    'sytha': 'arid_plains',
    'cirruan': 'gas_giant',
    'crait': 'barren',
    'jedha': 'barren'
  };
  
  if (specificPlanets[name]) {
    return specificPlanets[name];
  }
  
  // Generic mapping based on planet type and climate
  const terrainMap = {
    'urban': 'urban_sprawl',
    'desert': 'desert',
    'jungle': 'jungle',
    'ocean': climate === 'tropical' ? 'tropical_ocean' : 'ocean',
    'ice': 'ice',
    'volcanic': 'volcanic',
    'barren': 'barren',
    'terrestrial': {
      'temperate': 'temperate_plains',
      'arid': 'arid_plains',
      'tropical': 'tropical_forest',
      'frozen': 'tundra',
      'variable': 'varied_terrain'
    }
  };
  
  if (terrainMap[planetType]) {
    if (typeof terrainMap[planetType] === 'object') {
      return terrainMap[planetType][climate] || 'temperate_plains';
    }
    return terrainMap[planetType];
  }
  
  return 'temperate_plains';
}

/**
 * Draw detailed terrain pattern overlay with Star Wars lore-accurate visuals
 * Uses seeded random for consistent terrain across redraws
 */
function drawTerrainPattern(ctx, width, height, pattern, baseColor, texture, random) {
  ctx.save();
  
  // Use seeded random if provided, otherwise fall back to Math.random (shouldn't happen)
  const rnd = random || (() => Math.random());
  
  switch (pattern) {
    case 'urban_grid':
      // Centralis-style city grid
      ctx.strokeStyle = 'rgba(100, 150, 200, 0.3)';
      ctx.lineWidth = 1;
      const gridSize = 50;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      // Add building-like rectangles
      ctx.fillStyle = 'rgba(50, 50, 80, 0.4)';
      for (let i = 0; i < 100; i++) {
        const x = rnd() * width;
        const y = rnd() * height;
        const w = 10 + rnd() * 30;
        const h = 20 + rnd() * 50;
        ctx.fillRect(x, y, w, h);
      }
      break;

    case 'temperate_grassland':
      // Rolling green plains - scaled for overview map
      ctx.globalAlpha = 0.4;
      // Larger grass patches (fewer, bigger elements for overview scale)
      for (let i = 0; i < Math.floor((width * height) / 8000); i++) {
        const x = rnd() * width;
        const y = rnd() * height;
        const size = 30 + rnd() * 60; // Larger patches for overview
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
        gradient.addColorStop(0, `rgba(${60 + rnd() * 40}, ${120 + rnd() * 40}, ${40 + rnd() * 20}, 0.5)`);
        gradient.addColorStop(1, `rgba(${40 + rnd() * 30}, ${100 + rnd() * 30}, ${30 + rnd() * 15}, 0.2)`);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
      // Larger patches of darker grass
      for (let i = 0; i < Math.floor((width * height) / 20000); i++) {
        const x = rnd() * width;
        const y = rnd() * height;
        const size = 40 + rnd() * 80; // Larger for overview
        ctx.fillStyle = 'rgba(30, 80, 20, 0.25)';
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
      break;

    case 'sand_dunes':
      // Gravenmoor-style desert dunes - scaled for overview map
      ctx.globalAlpha = 0.5;
      // Larger dune shapes (fewer, bigger for overview scale)
      for (let i = 0; i < Math.floor((width * height) / 10000); i++) {
        const x = rnd() * width;
        const y = rnd() * height;
        const size = 60 + rnd() * 120; // Larger dunes for overview
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
        gradient.addColorStop(0, `rgba(220, 180, 120, 0.7)`);
        gradient.addColorStop(0.7, `rgba(200, 160, 110, 0.5)`);
        gradient.addColorStop(1, `rgba(180, 140, 100, 0.3)`);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
      // Reduced sand texture (larger, fewer dots)
      for (let i = 0; i < Math.floor((width * height) / 5000); i++) {
        const x = rnd() * width;
        const y = rnd() * height;
        const dotSize = 1.5 + rnd() * 1.5; // Slightly larger dots
        ctx.fillStyle = `rgba(200, 170, 130, ${0.25 + rnd() * 0.25})`;
        ctx.fillRect(x, y, dotSize, dotSize);
      }
      break;

    case 'rocky_arid':
      // Sytha/Casmer-style rocky terrain - scaled for overview map
      ctx.globalAlpha = 0.45;
      // Larger rock formations (fewer, bigger for overview)
      for (let i = 0; i < Math.floor((width * height) / 6000); i++) {
        const x = rnd() * width;
        const y = rnd() * height;
        const size = 20 + rnd() * 50; // Larger rocks for overview
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
        gradient.addColorStop(0, `rgba(${120 + rnd() * 40}, ${100 + rnd() * 30}, ${80 + rnd() * 20}, 0.6)`);
        gradient.addColorStop(1, `rgba(${100 + rnd() * 30}, ${80 + rnd() * 25}, ${60 + rnd() * 15}, 0.3)`);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
      // Larger, more visible cracks and fissures
      ctx.strokeStyle = 'rgba(80, 70, 60, 0.35)';
      ctx.lineWidth = 2; // Thicker lines for overview
      for (let i = 0; i < Math.floor((width * height) / 15000); i++) {
        ctx.beginPath();
        const startX = rnd() * width;
        const startY = rnd() * height;
        ctx.moveTo(startX, startY);
        ctx.lineTo(startX + (rnd() - 0.5) * 100, startY + (rnd() - 0.5) * 100);
        ctx.stroke();
      }
      break;

    case 'dense_jungle':
      // Verdholm/Myssia-style jungle - scaled for overview map
      ctx.globalAlpha = 0.5;
      // Larger foliage clusters (fewer, bigger for overview)
      for (let i = 0; i < Math.floor((width * height) / 5000); i++) {
        const x = rnd() * width;
        const y = rnd() * height;
        const size = 15 + rnd() * 40; // Larger clusters for overview
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
        gradient.addColorStop(0, `rgba(${20 + rnd() * 30}, ${60 + rnd() * 40}, ${30 + rnd() * 20}, 0.6)`);
        gradient.addColorStop(1, `rgba(${15 + rnd() * 25}, ${50 + rnd() * 35}, ${25 + rnd() * 15}, 0.3)`);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
      // Larger tree-like shapes
      for (let i = 0; i < Math.floor((width * height) / 12000); i++) {
        const x = rnd() * width;
        const y = rnd() * height;
        ctx.fillStyle = `rgba(${15 + rnd() * 20}, ${50 + rnd() * 30}, ${20 + rnd() * 15}, 0.7)`;
        ctx.fillRect(x, y, 4 + rnd() * 6, 20 + rnd() * 40); // Larger trees
      }
      break;

    case 'tropical_vegetation':
      // Eloria/Coralsec-style tropical
      ctx.globalAlpha = 0.5;
      // Palm-like shapes
      for (let i = 0; i < 100; i++) {
        const x = rnd() * width;
        const y = rnd() * height;
        ctx.fillStyle = `rgba(${30 + rnd() * 40}, ${80 + rnd() * 50}, ${40 + rnd() * 30}, 0.6)`;
        // Trunk
        ctx.fillRect(x, y, 2, 10 + rnd() * 15);
        // Fronds
        for (let j = 0; j < 4; j++) {
          ctx.beginPath();
          ctx.moveTo(x + 1, y);
          ctx.lineTo(x + 1 + (rnd() - 0.5) * 8, y - 5 - rnd() * 5);
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
      // Lush grass patches
      for (let i = 0; i < 400; i++) {
        const x = rnd() * width;
        const y = rnd() * height;
        ctx.fillStyle = `rgba(${40 + rnd() * 30}, ${100 + rnd() * 40}, ${50 + rnd() * 20}, 0.5)`;
        ctx.fillRect(x, y, 1, 2 + rnd() * 4);
      }
      break;

    case 'ocean_waves':
      // Tethys/Thessmar-style ocean - scaled for overview map
      ctx.globalAlpha = 0.6;
      ctx.strokeStyle = baseColor;
      ctx.lineWidth = 2.5; // Thicker waves for overview
      // Larger wave patterns (fewer, bigger waves)
      for (let y = 0; y < height; y += 25) { // Increased spacing
        ctx.beginPath();
        ctx.moveTo(0, y);
        for (let x = 0; x < width; x += 8) { // Larger steps
          ctx.lineTo(x, y + Math.sin((x / 50) + (y / 35)) * 6); // Larger amplitude
        }
        ctx.stroke();
      }
      // Larger water depth variations
      for (let i = 0; i < Math.floor((width * height) / 10000); i++) {
        const x = rnd() * width;
        const y = rnd() * height;
        const size = 50 + rnd() * 100; // Larger depth areas
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
        gradient.addColorStop(0, `rgba(10, 60, 100, ${0.3 + rnd() * 0.2})`);
        gradient.addColorStop(1, `rgba(10, 60, 100, ${0.1 + rnd() * 0.1})`);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
      break;

    case 'tropical_waves':
      // Coralsec-style tropical ocean
      ctx.globalAlpha = 0.6;
      // Lighter, more turquoise waves
      ctx.strokeStyle = 'rgba(50, 150, 180, 0.5)';
      ctx.lineWidth = 2;
      for (let y = 0; y < height; y += 12) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        for (let x = 0; x < width; x += 5) {
          ctx.lineTo(x, y + Math.sin((x / 25) + (y / 18)) * 3);
        }
        ctx.stroke();
      }
      // Coral patches
      for (let i = 0; i < 30; i++) {
        const x = rnd() * width;
        const y = rnd() * height;
        const size = 10 + rnd() * 20;
        ctx.fillStyle = `rgba(${150 + rnd() * 50}, ${100 + rnd() * 50}, ${80 + rnd() * 40}, 0.4)`;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
      break;

    case 'ice_sheet':
      // Rime/Kthala-style ice - scaled for overview map
      ctx.globalAlpha = 0.5;
      // Larger ice cracks (fewer, more visible)
      ctx.strokeStyle = 'rgba(150, 200, 220, 0.4)';
      ctx.lineWidth = 2; // Thicker for overview
      for (let i = 0; i < Math.floor((width * height) / 20000); i++) {
        ctx.beginPath();
        const startX = rnd() * width;
        const startY = rnd() * height;
        ctx.moveTo(startX, startY);
        ctx.lineTo(startX + (rnd() - 0.5) * 120, startY + (rnd() - 0.5) * 120);
        ctx.stroke();
      }
      // Reduced snow texture (larger, fewer elements)
      for (let i = 0; i < Math.floor((width * height) / 4000); i++) {
        const x = rnd() * width;
        const y = rnd() * height;
        const dotSize = 1.5 + rnd() * 1.5;
        ctx.fillStyle = `rgba(240, 250, 255, ${0.4 + rnd() * 0.3})`;
        ctx.fillRect(x, y, dotSize, dotSize);
      }
      // Larger ice formations
      for (let i = 0; i < Math.floor((width * height) / 8000); i++) {
        const x = rnd() * width;
        const y = rnd() * height;
        const size = 25 + rnd() * 60; // Larger for overview
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
        gradient.addColorStop(0, 'rgba(200, 230, 240, 0.5)');
        gradient.addColorStop(1, 'rgba(180, 210, 230, 0.2)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
      break;

    case 'tundra_grass':
      // Cold but not frozen tundra
      ctx.globalAlpha = 0.5;
      // Sparse grass
      for (let i = 0; i < 200; i++) {
        const x = rnd() * width;
        const y = rnd() * height;
        ctx.fillStyle = `rgba(${180 + rnd() * 40}, ${200 + rnd() * 30}, ${190 + rnd() * 20}, 0.6)`;
        ctx.fillRect(x, y, 1, 2 + rnd() * 3);
      }
      // Frost patches
      for (let i = 0; i < 50; i++) {
        const x = rnd() * width;
        const y = rnd() * height;
        const size = 10 + rnd() * 20;
        ctx.fillStyle = 'rgba(220, 240, 250, 0.3)';
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
      break;

    case 'lava_flows':
      // Embervast/Pyrren-style volcanic - scaled for overview map
      ctx.globalAlpha = 0.6;
      // Larger lava rivers (fewer, thicker)
      ctx.strokeStyle = '#ff4444';
      ctx.lineWidth = 4; // Thicker for overview
      for (let i = 0; i < Math.floor((width * height) / 15000); i++) {
        ctx.beginPath();
        let x = rnd() * width;
        let y = rnd() * height;
        ctx.moveTo(x, y);
        for (let j = 0; j < 4; j++) {
          x += (rnd() - 0.5) * 150; // Longer segments
          y += (rnd() - 0.5) * 150;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      // Larger lava pools
      for (let i = 0; i < Math.floor((width * height) / 12000); i++) {
        const x = rnd() * width;
        const y = rnd() * height;
        const size = 30 + rnd() * 70; // Larger pools for overview
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
        gradient.addColorStop(0, 'rgba(255, 100, 50, 0.8)');
        gradient.addColorStop(0.7, 'rgba(200, 70, 35, 0.5)');
        gradient.addColorStop(1, 'rgba(150, 50, 20, 0.2)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
      break;

    case 'molten_lava':
      // Embervast surface - more intense
      ctx.globalAlpha = 0.8;
      // Bright lava pools
      for (let i = 0; i < 30; i++) {
        const x = rnd() * width;
        const y = rnd() * height;
        const size = 20 + rnd() * 40;
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
        gradient.addColorStop(0, 'rgba(255, 150, 50, 1.0)');
        gradient.addColorStop(0.5, 'rgba(255, 80, 30, 0.8)');
        gradient.addColorStop(1, 'rgba(100, 20, 10, 0.4)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
      // Lava cracks
      ctx.strokeStyle = '#ff6600';
      ctx.lineWidth = 2;
      for (let i = 0; i < 25; i++) {
        ctx.beginPath();
        ctx.moveTo(rnd() * width, rnd() * height);
        ctx.lineTo(rnd() * width, rnd() * height);
        ctx.stroke();
      }
      break;

    case 'temperate_forest':
      // Verdance-style forest
      ctx.globalAlpha = 0.5;
      // Tree clusters
      for (let i = 0; i < 150; i++) {
        const x = rnd() * width;
        const y = rnd() * height;
        const size = 8 + rnd() * 20;
        ctx.fillStyle = `rgba(${20 + rnd() * 30}, ${70 + rnd() * 50}, ${40 + rnd() * 30}, 0.7)`;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
      // Tree trunks
      for (let i = 0; i < 100; i++) {
        const x = rnd() * width;
        const y = rnd() * height;
        ctx.fillStyle = `rgba(${40 + rnd() * 20}, ${30 + rnd() * 15}, ${20 + rnd() * 10}, 0.8)`;
        ctx.fillRect(x, y, 2 + rnd() * 3, 10 + rnd() * 25);
      }
      break;

    case 'swamp_marsh':
      // Mirefen-style swamp
      ctx.globalAlpha = 0.6;
      // Muddy water patches
      for (let i = 0; i < 60; i++) {
        const x = rnd() * width;
        const y = rnd() * height;
        const size = 20 + rnd() * 40;
        ctx.fillStyle = `rgba(${40 + rnd() * 30}, ${50 + rnd() * 20}, ${30 + rnd() * 15}, 0.5)`;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
      // Swamp vegetation
      for (let i = 0; i < 120; i++) {
        const x = rnd() * width;
        const y = rnd() * height;
        ctx.fillStyle = `rgba(${30 + rnd() * 20}, ${60 + rnd() * 30}, ${40 + rnd() * 20}, 0.6)`;
        ctx.fillRect(x, y, 2 + rnd() * 4, 5 + rnd() * 10);
      }
      break;

    case 'rocky_barren':
      // Crait/Jedha-style barren
      ctx.globalAlpha = 0.5;
      // Rock formations
      for (let i = 0; i < 80; i++) {
        const x = rnd() * width;
        const y = rnd() * height;
        const size = 8 + rnd() * 25;
        ctx.fillStyle = `rgba(${90 + rnd() * 40}, ${85 + rnd() * 35}, ${75 + rnd() * 30}, 0.7)`;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
      // Dust texture
      for (let i = 0; i < 200; i++) {
        const x = rnd() * width;
        const y = rnd() * height;
        ctx.fillStyle = `rgba(${100 + rnd() * 30}, ${95 + rnd() * 25}, ${85 + rnd() * 20}, 0.4)`;
        ctx.fillRect(x, y, 1, 1);
      }
      break;

    case 'mountain_peaks':
      // Caelmore-style mountains
      ctx.globalAlpha = 0.6;
      // Mountain shapes
      for (let i = 0; i < 30; i++) {
        const x = rnd() * width;
        const y = rnd() * height;
        const size = 25 + rnd() * 50;
        ctx.fillStyle = `rgba(${70 + rnd() * 30}, ${65 + rnd() * 25}, ${55 + rnd() * 20}, 0.7)`;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - size/2, y + size);
        ctx.lineTo(x + size/2, y + size);
        ctx.closePath();
        ctx.fill();
      }
      break;

    case 'canyon_walls':
      // Casmer-style canyons
      ctx.globalAlpha = 0.5;
      // Layered rock walls
      for (let i = 0; i < 40; i++) {
        const x = rnd() * width;
        const y = rnd() * height;
        const w = 30 + rnd() * 60;
        const h = 40 + rnd() * 80;
        ctx.fillStyle = `rgba(${120 + rnd() * 40}, ${100 + rnd() * 30}, ${80 + rnd() * 20}, 0.6)`;
        ctx.fillRect(x, y, w, h);
        // Add layers
        for (let j = 0; j < 3; j++) {
          ctx.strokeStyle = `rgba(${80 + rnd() * 20}, ${70 + rnd() * 15}, ${60 + rnd() * 10}, 0.5)`;
          ctx.strokeRect(x + j * 2, y + j * 2, w - j * 4, h - j * 4);
        }
      }
      break;

    case 'gas_clouds':
      // Cirruan-style gas giant
      ctx.globalAlpha = 0.6;
      // Swirling cloud patterns
      for (let i = 0; i < 50; i++) {
        const x = rnd() * width;
        const y = rnd() * height;
        const size = 40 + rnd() * 80;
        ctx.fillStyle = `rgba(${40 + rnd() * 30}, ${50 + rnd() * 40}, ${70 + rnd() * 50}, 0.5)`;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
      break;

    case 'mixed_biomes':
      // Varied terrain
      ctx.globalAlpha = 0.4;
      // Mix of different textures
      for (let i = 0; i < 100; i++) {
        const x = rnd() * width;
        const y = rnd() * height;
        const type = Math.floor(rnd() * 3);
        if (type === 0) {
          // Grass
          ctx.fillStyle = `rgba(${60 + rnd() * 40}, ${120 + rnd() * 40}, ${40 + rnd() * 20}, 0.5)`;
          ctx.fillRect(x, y, 1, 3 + rnd() * 5);
        } else if (type === 1) {
          // Rock
          const size = 5 + rnd() * 15;
          ctx.fillStyle = `rgba(${100 + rnd() * 40}, ${90 + rnd() * 30}, ${80 + rnd() * 20}, 0.6)`;
          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Water
          const size = 10 + rnd() * 20;
          ctx.fillStyle = `rgba(20, 60, 100, 0.4)`;
          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;

    case 'crystal_formations':
      // Kthala-style crystals
      ctx.globalAlpha = 0.7;
      // Crystal shapes
      for (let i = 0; i < 60; i++) {
        const x = rnd() * width;
        const y = rnd() * height;
        const size = 8 + rnd() * 20;
        ctx.fillStyle = `rgba(${150 + rnd() * 50}, ${180 + rnd() * 40}, ${200 + rnd() * 30}, 0.6)`;
        // Diamond shape
        ctx.beginPath();
        ctx.moveTo(x, y - size);
        ctx.lineTo(x + size/2, y);
        ctx.lineTo(x, y + size);
        ctx.lineTo(x - size/2, y);
        ctx.closePath();
        ctx.fill();
      }
      break;

    case 'asteroids':
      // Asteroid field
      ctx.globalAlpha = 0.8;
      // Rocky asteroids
      for (let i = 0; i < 100; i++) {
        const x = rnd() * width;
        const y = rnd() * height;
        const size = 5 + rnd() * 20;
        ctx.fillStyle = `rgba(${40 + rnd() * 30}, ${35 + rnd() * 25}, ${30 + rnd() * 20}, 0.9)`;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
      break;

    default:
      // Default grass pattern
      ctx.globalAlpha = 0.4;
      for (let i = 0; i < 200; i++) {
        const x = rnd() * width;
        const y = rnd() * height;
        ctx.fillStyle = baseColor;
        ctx.fillRect(x, y, 2, 8);
      }
  }
  
  ctx.restore();
}

/**
 * Draw terrain overlay (secondary features)
 * Uses seeded random for consistent terrain across redraws
 */
function drawTerrainOverlay(ctx, width, height, overlay, baseColor, random) {
  ctx.save();
  ctx.globalAlpha = 0.4; // Increased from 0.3 for better visibility
  
  // Use seeded random if provided, otherwise fall back to Math.random (shouldn't happen)
  const rnd = random || (() => Math.random());
  
  switch (overlay) {
    case 'city_lights':
      // Enhanced urban planet lights with glow
      for (let i = 0; i < 300; i++) { // Increased from 200
        const x = rnd() * width;
        const y = rnd() * height;
        const brightness = 0.6 + rnd() * 0.4;
        const size = 1 + rnd() * 2;
        
        // Glow effect
        ctx.fillStyle = `rgba(255, 255, 200, ${brightness * 0.3})`;
        ctx.beginPath();
        ctx.arc(x, y, size * 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Light source
        ctx.fillStyle = `rgba(255, 255, 200, ${brightness})`;
        ctx.fillRect(x - size/2, y - size/2, size, size);
      }
      // Add larger light clusters for major areas
      for (let i = 0; i < 20; i++) {
        const x = rnd() * width;
        const y = rnd() * height;
        const clusterSize = 15 + rnd() * 25;
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, clusterSize);
        gradient.addColorStop(0, 'rgba(255, 255, 200, 0.8)');
        gradient.addColorStop(0.5, 'rgba(255, 255, 200, 0.4)');
        gradient.addColorStop(1, 'rgba(255, 255, 200, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, clusterSize, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
      
    case 'rolling_hills':
      // Enhanced hill shadows with depth
      ctx.strokeStyle = 'rgba(20, 40, 10, 0.3)';
      ctx.lineWidth = 3;
      for (let y = 0; y < height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        for (let x = 0; x < width; x += 5) {
          ctx.lineTo(x, y + Math.sin(x / 50) * 3);
        }
        ctx.stroke();
      }
      // Add shadow fills for depth
      ctx.fillStyle = 'rgba(20, 40, 10, 0.15)';
      for (let y = 0; y < height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        for (let x = 0; x < width; x += 5) {
          ctx.lineTo(x, y + Math.sin(x / 50) * 3);
        }
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();
        ctx.fill();
      }
      break;
      
    case 'desert_wind':
      // Enhanced sand wind patterns with depth
      ctx.strokeStyle = 'rgba(200, 180, 140, 0.4)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 30; i++) { // Increased from 20
        ctx.beginPath();
        let x = rnd() * width;
        let y = rnd() * height;
        ctx.moveTo(x, y);
        for (let j = 0; j < 4; j++) { // More segments
          x += 20 + rnd() * 30;
          y += (rnd() - 0.5) * 12;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      // Add heat shimmer effect
      for (let i = 0; i < 100; i++) {
        const x = rnd() * width;
        const y = rnd() * height;
        ctx.fillStyle = `rgba(255, 240, 200, ${0.2 + rnd() * 0.2})`;
        ctx.fillRect(x, y, 2, 1);
      }
      break;
      
    case 'canyons':
      // Enhanced canyon shadows with depth
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      for (let i = 0; i < 20; i++) { // Increased from 15
        const x = rnd() * width;
        const y = rnd() * height;
        const w = 25 + rnd() * 50;
        const h = 40 + rnd() * 80;
        // Add gradient for depth
        const gradient = ctx.createLinearGradient(x, y, x + w, y + h);
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0.4)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.2)');
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, w, h);
      }
      // Add canyon edges
      ctx.strokeStyle = 'rgba(60, 50, 40, 0.5)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 10; i++) {
        ctx.beginPath();
        ctx.moveTo(rnd() * width, rnd() * height);
        ctx.lineTo(rnd() * width, rnd() * height);
        ctx.stroke();
      }
      break;
      
    case 'canopy':
      // Enhanced jungle canopy shadows with layers
      for (let i = 0; i < 70; i++) { // Increased from 50
        const x = rnd() * width;
        const y = rnd() * height;
        const size = 35 + rnd() * 60;
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0.4)');
        gradient.addColorStop(0.7, 'rgba(0, 0, 0, 0.3)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
      // Add light filtering through canopy
      for (let i = 0; i < 30; i++) {
        const x = rnd() * width;
        const y = rnd() * height;
        ctx.fillStyle = `rgba(255, 255, 200, ${0.1 + rnd() * 0.2})`;
        ctx.beginPath();
        ctx.arc(x, y, 2 + rnd() * 4, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
      
    case 'beaches':
      // Beach sand patches
      for (let i = 0; i < 30; i++) {
        const x = rnd() * width;
        const y = rnd() * height;
        const size = 15 + rnd() * 30;
        ctx.fillStyle = 'rgba(240, 220, 180, 0.4)';
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
      
    case 'coral_reefs':
      // Ocean coral
      for (let i = 0; i < 40; i++) {
        const x = rnd() * width;
        const y = rnd() * height;
        const size = 8 + rnd() * 15;
        ctx.fillStyle = `rgba(${200 + rnd() * 50}, ${100 + rnd() * 50}, ${80 + rnd() * 40}, 0.3)`;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
      
    case 'islands':
      // Tropical islands
      for (let i = 0; i < 10; i++) {
        const x = rnd() * width;
        const y = rnd() * height;
        const size = 20 + rnd() * 40;
        ctx.fillStyle = 'rgba(100, 150, 80, 0.5)';
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
      
    case 'snow_drifts':
      // Snow accumulation
      for (let i = 0; i < 30; i++) {
        const x = rnd() * width;
        const y = rnd() * height;
        const w = 20 + rnd() * 40;
        const h = 5 + rnd() * 15;
        ctx.fillStyle = 'rgba(240, 250, 255, 0.5)';
        ctx.fillRect(x, y, w, h);
      }
      break;
      
    case 'frost':
      // Frost patterns
      ctx.strokeStyle = 'rgba(200, 230, 250, 0.4)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 50; i++) {
        ctx.beginPath();
        ctx.moveTo(rnd() * width, rnd() * height);
        for (let j = 0; j < 3; j++) {
          ctx.lineTo(
            rnd() * width,
            rnd() * height
          );
        }
        ctx.stroke();
      }
      break;
      
    case 'volcanic_ash':
      // Ash clouds
      for (let i = 0; i < 25; i++) {
        const x = rnd() * width;
        const y = rnd() * height;
        const size = 30 + rnd() * 60;
        ctx.fillStyle = 'rgba(50, 50, 50, 0.4)';
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
      
    case 'smoke':
      // Volcanic smoke
      ctx.strokeStyle = 'rgba(60, 60, 60, 0.3)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 15; i++) {
        let x = rnd() * width;
        let y = rnd() * height;
        ctx.beginPath();
        ctx.moveTo(x, y);
        for (let j = 0; j < 5; j++) {
          y -= 10 + rnd() * 20;
          x += (rnd() - 0.5) * 15;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      break;
      
    case 'tree_canopy':
      // Forest canopy
      for (let i = 0; i < 40; i++) {
        const x = rnd() * width;
        const y = rnd() * height;
        const size = 25 + rnd() * 45;
        ctx.fillStyle = 'rgba(10, 30, 15, 0.3)';
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
      
    case 'mist':
      // Swamp mist
      for (let i = 0; i < 20; i++) {
        const x = rnd() * width;
        const y = rnd() * height;
        const size = 40 + rnd() * 80;
        ctx.fillStyle = 'rgba(200, 220, 230, 0.3)';
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
      
    case 'dust_storms':
      // Barren dust
      ctx.strokeStyle = 'rgba(150, 140, 120, 0.3)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 10; i++) {
        ctx.beginPath();
        let x = rnd() * width;
        let y = rnd() * height;
        ctx.moveTo(x, y);
        for (let j = 0; j < 4; j++) {
          x += (rnd() - 0.5) * 80;
          y += (rnd() - 0.5) * 80;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      break;
      
    case 'snow_caps':
      // Mountain snow
      for (let i = 0; i < 20; i++) {
        const x = rnd() * width;
        const y = rnd() * height;
        const size = 15 + rnd() * 30;
        ctx.fillStyle = 'rgba(240, 250, 255, 0.6)';
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
      
    case 'shadows':
      // Canyon shadows
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      for (let i = 0; i < 20; i++) {
        const x = rnd() * width;
        const y = rnd() * height;
        const w = 15 + rnd() * 30;
        const h = 40 + rnd() * 80;
        ctx.fillRect(x, y, w, h);
      }
      break;
      
    case 'layered_rock':
      // Rock layers
      ctx.strokeStyle = 'rgba(80, 70, 60, 0.4)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 30; i++) {
        const x = rnd() * width;
        const y = rnd() * height;
        const w = 30 + rnd() * 60;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + w, y);
        ctx.stroke();
      }
      break;
      
    case 'atmospheric_storms':
      // Gas giant storms
      for (let i = 0; i < 15; i++) {
        const x = rnd() * width;
        const y = rnd() * height;
        const w = 50 + rnd() * 100;
        const h = 20 + rnd() * 40;
        ctx.fillStyle = 'rgba(30, 40, 60, 0.4)';
        ctx.fillRect(x, y, w, h);
      }
      break;
      
    case 'varied_features':
      // Mixed terrain features
      // Random mix of overlays
      break;
      
    case 'crystal_glow':
      // Crystal glow effect
      for (let i = 0; i < 30; i++) {
        const x = rnd() * width;
        const y = rnd() * height;
        const size = 10 + rnd() * 20;
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
        gradient.addColorStop(0, 'rgba(200, 220, 255, 0.6)');
        gradient.addColorStop(1, 'rgba(100, 120, 150, 0.2)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
      
    case 'toxic_fog':
      // Toxic atmosphere
      for (let i = 0; i < 25; i++) {
        const x = rnd() * width;
        const y = rnd() * height;
        const size = 30 + rnd() * 60;
        ctx.fillStyle = 'rgba(100, 150, 50, 0.3)';
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
      
    case 'space_debris':
      // Asteroid field debris
      for (let i = 0; i < 50; i++) {
        const x = rnd() * width;
        const y = rnd() * height;
        ctx.fillStyle = `rgba(${30 + rnd() * 20}, ${25 + rnd() * 15}, ${20 + rnd() * 10}, 0.5)`;
        ctx.fillRect(x, y, 1, 1);
      }
      break;
  }
  
  ctx.restore();
}

/**
 * Draw map layout (cities, regions, districts)
 */
function drawMapLayout(ctx, width, height, mapLayout, hoveredCity = null) {
  if (!mapLayout.locations && !mapLayout.districts && !mapLayout.regions && !mapLayout.settlements) {
    return;
  }

  const locations = mapLayout.locations || mapLayout.districts || mapLayout.regions || mapLayout.settlements || [];

    locations.forEach(location => {
      const x = (location.x / 100) * width;
      const y = (location.y / 100) * height;
      const size = location.size === 'large' ? 40 : location.size === 'medium' ? 30 : location.size === 'huge' ? 60 : 20;
      const isHovered = hoveredCity === location;

      // Draw location area
      ctx.fillStyle = getLocationColor(location.type);
      ctx.globalAlpha = isHovered ? 0.5 : 0.3;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1.0;

      // Draw location border (thicker if hovered)
      ctx.strokeStyle = getLocationColor(location.type);
      ctx.lineWidth = isHovered ? 3 : 2;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.stroke();

      // Draw location label (larger if hovered)
      ctx.fillStyle = isHovered ? '#fbbf24' : '#ffffff';
      ctx.font = isHovered ? 'bold 14px sans-serif' : 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 3;
      ctx.fillText(location.name, x, y - size - 5);
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
    });
}

/**
 * Draw points of interest with sprite rendering or enhanced visual effects fallback
 * Uses smart label placement to prevent overlaps
 */
function drawPointsOfInterest(ctx, width, height, pois, hoveredPOI = null) {
  if (!pois || pois.length === 0) return;
  
  // Calculate optimal label positions using force-directed layout
  const labelPositions = calculatePOILabelPositions(pois, ctx, width, height, hoveredPOI);
  
  // First pass: Draw POI icons
  pois.forEach(poi => {
    const isHovered = hoveredPOI === poi;
    const x = (poi.x / 100) * width;
    const y = (poi.y / 100) * height;

    // Try to get sprite first (use assetManager cache key format)
    const spriteCacheKey = `poi:${poi.type}`;
    const sprite = assetManager.spriteCache.get(spriteCacheKey);

    // If sprite not in cache, try to load it (async, won't block rendering)
    // Only attempt load if sprite is not already cached (including null for failed loads)
    if (!assetManager.spriteCache.has(spriteCacheKey) && poi.type) {
      assetManager.loadPOISprite(poi.type).catch(() => {
        // Silently fail - will use fallback rendering
      });
    }

    if (sprite && sprite.complete) {
      // Use sprite rendering - reduced size for better map organization
      const spriteSize = isHovered ? 96 : 80; // Smaller icons to prevent overlap
      const spriteX = x - spriteSize / 2;
      const spriteY = y - spriteSize / 2;

      // Draw glow effect for hovered POIs - reduced size
      if (isHovered) {
        const color = getPOIColor(poi.type);
        const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, 20);
        glowGradient.addColorStop(0, color + '60');
        glowGradient.addColorStop(0.5, color + '30');
        glowGradient.addColorStop(1, color + '00');
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(x, y, 20, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw sprite with scaling
      ctx.save();
      ctx.globalAlpha = isHovered ? 1.0 : 0.95;
      if (isHovered) {
        ctx.translate(x, y);
        ctx.scale(1.125, 1.125); // 12.5% larger on hover
        ctx.translate(-x, -y);
      }
      ctx.drawImage(sprite, spriteX, spriteY, spriteSize, spriteSize);
      ctx.restore();
    } else {
      // Fallback to enhanced circle rendering
      const color = getPOIColor(poi.type);

      // Draw glow effect for hovered POIs - reduced size
      if (isHovered) {
        const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, 15);
        glowGradient.addColorStop(0, color + '40');
        glowGradient.addColorStop(0.5, color + '20');
        glowGradient.addColorStop(1, color + '00');
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(x, y, 15, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw outer ring for depth - reduced size
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, (isHovered ? 10 : 7), 0, Math.PI * 2);
      ctx.stroke();

      // Draw POI marker with gradient - reduced size
      const markerGradient = ctx.createRadialGradient(x, y, 0, x, y, isHovered ? 9 : 6);
      markerGradient.addColorStop(0, color);
      markerGradient.addColorStop(0.7, color);
      markerGradient.addColorStop(1, adjustBrightness(color, -30));
      
      ctx.fillStyle = markerGradient;
      ctx.beginPath();
      ctx.arc(x, y, isHovered ? 9 : 6, 0, Math.PI * 2);
      ctx.fill();

      // Draw inner highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.beginPath();
      ctx.arc(x - 1.5, y - 1.5, (isHovered ? 3 : 2), 0, Math.PI * 2);
      ctx.fill();

      // Draw icon symbol based on type
      ctx.fillStyle = '#ffffff';
      ctx.font = isHovered ? 'bold 9px sans-serif' : 'bold 7px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const iconSymbol = getPOISymbol(poi.type);
      ctx.fillText(iconSymbol, x, y);

      // Draw border with shadow
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 3;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = isHovered ? 2.5 : 1.5;
      ctx.beginPath();
      ctx.arc(x, y, isHovered ? 9 : 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
    }
  });
  
  // Second pass: Draw labels and leader lines
  labelPositions.forEach(({ poi, position, isHovered }) => {
    const x = (poi.x / 100) * width;
    const y = (poi.y / 100) * height;
    
    // Draw leader line if needed
    if (position.leaderLine) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(position.leaderLine.start.x, position.leaderLine.start.y);
      ctx.lineTo(position.leaderLine.end.x, position.leaderLine.end.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    
    // Draw label at calculated position
    ctx.fillStyle = isHovered ? '#fbbf24' : '#ffffff';
    ctx.font = isHovered ? 'bold 13px sans-serif' : '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 4;
    ctx.fillText(poi.name, position.x, position.y);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  });
}

/**
 * Get POI symbol/icon character based on type
 */
function getPOISymbol(type) {
  const symbols = {
    government: '⚖',
    temple: '⛩',
    palace: '🏰',
    base: '⚔',
    danger: '⚠',
    entertainment: '🎭',
    market: '💰',
    spaceport: '🚀',
    medical_center: '➕',
    industrial: '⚙',
    landscape: '🏔',
    wilderness: '🌲',
    city: '🏙',
    village: '🏘',
    cantina: '🍺',
    arena: '⚔',
    fortress: '🏯',
    wreckage: '💥',
    facility: '🏭'
  };
  return symbols[type] || '📍';
}

/**
 * Adjust color brightness
 */
function adjustBrightness(color, amount) {
  // Handle hex colors
  if (color.startsWith('#')) {
    const num = parseInt(color.replace('#', ''), 16);
    const r = Math.max(0, Math.min(255, (num >> 16) + amount));
    const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount));
    const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }
  // Handle rgba colors
  if (color.startsWith('rgba')) {
    const matches = color.match(/\d+/g);
    if (matches) {
      const r = Math.max(0, Math.min(255, parseInt(matches[0]) + amount));
      const g = Math.max(0, Math.min(255, parseInt(matches[1]) + amount));
      const b = Math.max(0, Math.min(255, parseInt(matches[2]) + amount));
      const a = matches[3] || '1';
      return `rgba(${r}, ${g}, ${b}, ${a})`;
    }
  }
  return color;
}

/**
 * Draw markets
 */
function drawMarkets(ctx, width, height, markets, hoveredMarket = null) {
  markets.forEach(market => {
    const isHovered = hoveredMarket === market;
    const x = (market.x / 100) * width;
    const y = (market.y / 100) * height;

    // Market icon (shopping bag/coin) - larger if hovered
    ctx.fillStyle = '#34d399';
    ctx.beginPath();
    ctx.arc(x, y, isHovered ? 14 : 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = isHovered ? 3 : 2;
    ctx.stroke();

    // Market symbol (M)
    ctx.fillStyle = '#ffffff';
    ctx.font = isHovered ? 'bold 12px sans-serif' : 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('M', x, y);

    // Market label (always show if hovered)
    ctx.fillStyle = isHovered ? '#fbbf24' : '#34d399';
    ctx.font = isHovered ? 'bold 12px sans-serif' : '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 2;
    ctx.fillText(market.name, x, y + (isHovered ? 18 : 15));
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  });
}

/**
 * Draw landing zones
 */
function drawLandingZones(ctx, width, height, landingZones) {
  landingZones.forEach(zone => {
    const x = ((zone.x || 0) / 1000) * width;
    const y = ((zone.y || 0) / 1000) * height;

    // Landing zone icon
    ctx.fillStyle = '#4ade80';
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Landing zone symbol (L)
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('L', x, y);

    // Landing zone label
    ctx.fillStyle = '#4ade80';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 2;
    ctx.fillText(zone.name || 'Landing Zone', x, y + 12);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  });
}

/**
 * Get location color based on type
 */
function getLocationColor(type) {
  const colors = {
    capital: '#fbbf24',
    city: '#60a5fa',
    settlement: '#94a3b8',
    village: '#a78bfa',
    base: '#ef4444',
    mine: '#f59e0b',
    industrial: '#64748b',
    government: '#3b82f6',
    entertainment: '#ec4899',
    temple: '#8b5cf6',
    underwater: '#06b6d4',
    water: '#0ea5e9',
    grassland: '#84cc16',
    swamp: '#65a30d',
    desert: '#d4a574',
    forest: '#22c55e',
    ice: '#e0f2f1',
    lava: '#ef4444',
    volcanic: '#dc2626',
    spaceport: '#34d399'
  };
  return colors[type] || '#94a3b8';
}

/**
 * Get POI color based on type
 */
function getPOIColor(type) {
  const colors = {
    government: '#3b82f6',
    temple: '#8b5cf6',
    palace: '#fbbf24',
    base: '#ef4444',
    danger: '#dc2626',
    entertainment: '#ec4899',
    market: '#34d399',
    spaceport: '#0ea5e9',
    medical_center: '#ffffff', // White/medical cross color
    industrial: '#64748b',
    landscape: '#84cc16',
    wilderness: '#65a30d',
    city: '#60a5fa',
    village: '#a78bfa',
    cantina: '#f59e0b',
    arena: '#ec4899',
    fortress: '#dc2626',
    wreckage: '#64748b',
    facility: '#94a3b8'
  };
  return colors[type] || '#fbbf24';
}

/**
 * Get POI icon (for future use with sprites)
 */
function getPOIIcon(type) {
  // Could return icon paths for sprite-based rendering
  return type;
}

