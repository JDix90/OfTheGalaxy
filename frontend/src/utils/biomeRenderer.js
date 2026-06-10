/**
 * Biome Renderer
 * Renders biome polygons on the planet map with enhanced visual details
 * Now includes biome-aware terrain rendering that matches gameplay mechanics
 */

/**
 * Get terrain pattern type based on planet and biome terrain type
 */
function getTerrainPatternForBiome(planet, biomeTerrainType, planetTerrainType) {
  // For navigable terrain, use planet-appropriate smooth patterns
  if (biomeTerrainType === 'navigable') {
    const navigablePatterns = {
      'desert': 'smooth_sand',
      'arid_plains': 'smooth_rock',
      'temperate_plains': 'smooth_grass',
      'jungle': 'smooth_jungle',
      'forest': 'smooth_forest',
      'ice': 'smooth_ice',
      'urban_sprawl': 'smooth_urban'
    };
    return navigablePatterns[planetTerrainType] || 'smooth_grass';
  }
  
  // For difficult terrain, use rough/challenging patterns
  if (biomeTerrainType === 'difficult') {
    const difficultPatterns = {
      'desert': 'rough_dunes',
      'arid_plains': 'rough_canyons',
      'temperate_plains': 'rough_hills',
      'jungle': 'rough_undergrowth',
      'forest': 'rough_forest',
      'ice': 'rough_ice',
      'swamp': 'rough_swamp'
    };
    return difficultPatterns[planetTerrainType] || 'rough_terrain';
  }
  
  // For impassable terrain, use blocked/barrier patterns
  if (biomeTerrainType === 'impassable') {
    return 'blocked_terrain';
  }
  
  return 'smooth_grass';
}

/**
 * Get biome colors and styles based on terrain type
 * Reduced opacity to allow terrain patterns to show through
 */
function getBiomeStyle(terrainType) {
  const styles = {
    'navigable': {
      fill: 'rgba(100, 200, 100, 0.15)', // Reduced opacity - terrain patterns show through
      border: 'rgba(60, 180, 60, 0.4)', // Subtle border
      pattern: 'grass',
      gradient: ['rgba(120, 220, 120, 0.2)', 'rgba(80, 180, 80, 0.1)']
    },
    'difficult': {
      fill: 'rgba(255, 180, 80, 0.15)', // Reduced opacity
      border: 'rgba(220, 140, 40, 0.5)', // More visible border for difficult terrain
      pattern: 'rocky',
      gradient: ['rgba(255, 200, 100, 0.2)', 'rgba(220, 160, 60, 0.1)']
    },
    'impassable': {
      fill: 'rgba(220, 80, 80, 0.2)', // Slightly more visible for blocked areas
      border: 'rgba(180, 40, 40, 0.7)', // Strong border for impassable
      pattern: 'barren',
      gradient: ['rgba(240, 100, 100, 0.25)', 'rgba(200, 60, 60, 0.15)']
    }
  };
  return styles[terrainType] || styles['navigable'];
}

/**
 * Draw texture pattern within a biome polygon
 */
function drawBiomePattern(ctx, vertices, pattern, baseColor) {
  if (!vertices || vertices.length < 3) return;

  // Calculate bounding box
  const xs = vertices.map(v => v.x);
  const ys = vertices.map(v => v.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  ctx.save();
  ctx.globalAlpha = 0.15;

  switch (pattern) {
    case 'grass':
      // Draw small grass-like dots
      for (let i = 0; i < 50; i++) {
        const x = minX + Math.random() * (maxX - minX);
        const y = minY + Math.random() * (maxY - minY);
        if (pointInPolygon({ x, y }, vertices)) {
          ctx.fillStyle = 'rgba(60, 140, 60, 0.4)';
          ctx.fillRect(x, y, 1.5, 3);
        }
      }
      break;
    case 'rocky':
      // Draw rocky texture dots
      for (let i = 0; i < 40; i++) {
        const x = minX + Math.random() * (maxX - minX);
        const y = minY + Math.random() * (maxY - minY);
        if (pointInPolygon({ x, y }, vertices)) {
          ctx.fillStyle = 'rgba(160, 120, 80, 0.5)';
          ctx.beginPath();
          ctx.arc(x, y, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    case 'barren':
      // Draw sparse dots for barren terrain
      for (let i = 0; i < 20; i++) {
        const x = minX + Math.random() * (maxX - minX);
        const y = minY + Math.random() * (maxY - minY);
        if (pointInPolygon({ x, y }, vertices)) {
          ctx.fillStyle = 'rgba(140, 100, 100, 0.4)';
          ctx.beginPath();
          ctx.arc(x, y, 1, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
  }

  ctx.restore();
}

/**
 * Point-in-polygon test
 */
function pointInPolygon(point, vertices) {
  let inside = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const xi = vertices[i].x, yi = vertices[i].y;
    const xj = vertices[j].x, yj = vertices[j].y;
    const intersect = ((yi > point.y) !== (yj > point.y)) &&
      (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Render biome polygons with enhanced visual details
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @param {Array} biomes - Array of biome objects with polygon and terrainType
 * @param {Object} camera - Camera object with {x, y, zoom}
 */
export function renderBiomes(ctx, width, height, biomes, camera = { x: 0, y: 0, zoom: 1 }) {
  if (!biomes || biomes.length === 0) return;

  // Calculate center point for pan/zoom (matching planetMapRenderer)
  const centerX = width / 2;
  const centerY = height / 2;

  ctx.save();
  ctx.translate(centerX + camera.x, centerY + camera.y);
  ctx.scale(camera.zoom, camera.zoom);
  ctx.translate(-centerX, -centerY);

  biomes.forEach(biome => {
    if (!biome.polygon || !biome.terrainType) return;

    // Convert polygon vertices from internal (0-1000) to display coordinates (0-100)
    const displayVertices = biome.polygon.map(vertex => {
      const displayX = (vertex.x / 1000) * 100;
      const displayY = (vertex.y / 1000) * 100;
      
      // Convert to screen coordinates
      return {
        x: (displayX / 100) * width,
        y: (displayY / 100) * height
      };
    });

    // Get biome style
    const style = getBiomeStyle(biome.terrainType);

    // Draw biome polygon with gradient fill
    ctx.beginPath();
    ctx.moveTo(displayVertices[0].x, displayVertices[0].y);
    for (let i = 1; i < displayVertices.length; i++) {
      ctx.lineTo(displayVertices[i].x, displayVertices[i].y);
    }
    ctx.closePath();

    // Create gradient for the biome
    const centerX = displayVertices.reduce((sum, v) => sum + v.x, 0) / displayVertices.length;
    const centerY = displayVertices.reduce((sum, v) => sum + v.y, 0) / displayVertices.length;
    const maxDist = Math.max(
      ...displayVertices.map(v => Math.sqrt((v.x - centerX) ** 2 + (v.y - centerY) ** 2))
    );

    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, maxDist);
    gradient.addColorStop(0, style.gradient[0]);
    gradient.addColorStop(1, style.gradient[1]);
    
    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw texture pattern
    drawBiomePattern(ctx, displayVertices, style.pattern, style.fill);

    // Draw enhanced border with shadow (thicker for difficult/impassable)
    const borderWidth = biome.terrainType === 'impassable' ? 3 : 
                       biome.terrainType === 'difficult' ? 2.5 : 2;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 2;
    ctx.strokeStyle = style.border;
    ctx.lineWidth = borderWidth;
    ctx.stroke();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  });

  ctx.restore();
}

/**
 * Render biome-specific terrain patterns
 * This renders detailed terrain patterns within each biome polygon,
 * matching the biome's terrain type (navigable/difficult/impassable)
 */
export function renderBiomeTerrain(ctx, width, height, biomes, planet, planetTerrainType, camera = { x: 0, y: 0, zoom: 1 }) {
  if (!biomes || biomes.length === 0) return;

  // Calculate center point for pan/zoom (matching planetMapRenderer)
  const centerX = width / 2;
  const centerY = height / 2;

  ctx.save();
  ctx.translate(centerX + camera.x, centerY + camera.y);
  ctx.scale(camera.zoom, camera.zoom);
  ctx.translate(-centerX, -centerY);

  // Get planet seed for consistent patterns
  const planetSeed = getPlanetSeed(planet);
  const random = seededRandom(planetSeed);

  biomes.forEach(biome => {
    if (!biome.polygon || !biome.terrainType) return;

    // Convert polygon vertices from internal (0-1000) to display coordinates (0-100)
    const displayVertices = biome.polygon.map(vertex => {
      const displayX = (vertex.x / 1000) * 100;
      const displayY = (vertex.y / 1000) * 100;
      
      // Convert to screen coordinates
      return {
        x: (displayX / 100) * width,
        y: (displayY / 100) * height
      };
    });

    // Get terrain pattern type for this biome
    const patternType = getTerrainPatternForBiome(planet, biome.terrainType, planetTerrainType);
    
    // Render terrain pattern within biome polygon
    drawBiomeTerrainPattern(ctx, displayVertices, patternType, biome.terrainType, planetTerrainType, random);
  });

  ctx.restore();
}

/**
 * Draw terrain pattern within a biome polygon
 */
function drawBiomeTerrainPattern(ctx, vertices, patternType, terrainType, planetTerrainType, random) {
  if (!vertices || vertices.length < 3) return;

  // Calculate bounding box
  const xs = vertices.map(v => v.x);
  const ys = vertices.map(v => v.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const width = maxX - minX;
  const height = maxY - minY;

  ctx.save();
  
  // Set clipping path to biome polygon
  ctx.beginPath();
  ctx.moveTo(vertices[0].x, vertices[0].y);
  for (let i = 1; i < vertices.length; i++) {
    ctx.lineTo(vertices[i].x, vertices[i].y);
  }
  ctx.closePath();
  ctx.clip();

  // Render pattern based on type
  switch (patternType) {
    case 'smooth_sand':
      drawSmoothSandPattern(ctx, minX, minY, width, height, random);
      break;
    case 'smooth_rock':
      drawSmoothRockPattern(ctx, minX, minY, width, height, random);
      break;
    case 'smooth_grass':
      drawSmoothGrassPattern(ctx, minX, minY, width, height, random);
      break;
    case 'smooth_jungle':
      drawSmoothJunglePattern(ctx, minX, minY, width, height, random);
      break;
    case 'smooth_forest':
      drawSmoothForestPattern(ctx, minX, minY, width, height, random);
      break;
    case 'smooth_ice':
      drawSmoothIcePattern(ctx, minX, minY, width, height, random);
      break;
    case 'smooth_urban':
      drawSmoothUrbanPattern(ctx, minX, minY, width, height, random);
      break;
    case 'rough_dunes':
      drawRoughDunesPattern(ctx, minX, minY, width, height, random);
      break;
    case 'rough_canyons':
      drawRoughCanyonsPattern(ctx, minX, minY, width, height, random);
      break;
    case 'rough_hills':
      drawRoughHillsPattern(ctx, minX, minY, width, height, random);
      break;
    case 'rough_undergrowth':
      drawRoughUndergrowthPattern(ctx, minX, minY, width, height, random);
      break;
    case 'rough_forest':
      drawRoughForestPattern(ctx, minX, minY, width, height, random);
      break;
    case 'rough_ice':
      drawRoughIcePattern(ctx, minX, minY, width, height, random);
      break;
    case 'rough_swamp':
      drawRoughSwampPattern(ctx, minX, minY, width, height, random);
      break;
    case 'blocked_terrain':
      drawBlockedTerrainPattern(ctx, minX, minY, width, height, random);
      break;
    default:
      drawSmoothGrassPattern(ctx, minX, minY, width, height, random);
  }

  ctx.restore();
}

/**
 * Get planet seed for consistent patterns
 */
function getPlanetSeed(planet) {
  if (!planet || !planet.id) return 12345;
  let hash = 0;
  for (let i = 0; i < planet.id.length; i++) {
    const char = planet.id.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash) || 12345;
}

/**
 * Seeded random number generator
 */
function seededRandom(seed) {
  let value = seed;
  return function() {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}

/**
 * Smooth terrain patterns (for navigable terrain)
 */
function drawSmoothSandPattern(ctx, x, y, width, height, random) {
  ctx.globalAlpha = 0.4;
  // Gentle sand waves
  for (let i = 0; i < Math.floor((width * height) / 5000); i++) {
    const px = x + random() * width;
    const py = y + random() * height;
    const size = 20 + random() * 40;
    const gradient = ctx.createRadialGradient(px, py, 0, px, py, size);
    gradient.addColorStop(0, 'rgba(220, 180, 140, 0.6)');
    gradient.addColorStop(1, 'rgba(200, 160, 120, 0.2)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(px, py, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1.0;
}

function drawSmoothRockPattern(ctx, x, y, width, height, random) {
  ctx.globalAlpha = 0.35;
  // Smooth rocky texture
  for (let i = 0; i < Math.floor((width * height) / 4000); i++) {
    const px = x + random() * width;
    const py = y + random() * height;
    const size = 15 + random() * 30;
    ctx.fillStyle = `rgba(${120 + random() * 40}, ${100 + random() * 30}, ${80 + random() * 20}, 0.5)`;
    ctx.beginPath();
    ctx.arc(px, py, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1.0;
}

function drawSmoothGrassPattern(ctx, x, y, width, height, random) {
  ctx.globalAlpha = 0.3;
  // Smooth grass texture
  for (let i = 0; i < Math.floor((width * height) / 3000); i++) {
    const px = x + random() * width;
    const py = y + random() * height;
    ctx.fillStyle = `rgba(${60 + random() * 40}, ${120 + random() * 40}, ${40 + random() * 20}, 0.4)`;
    ctx.fillRect(px, py, 1 + random() * 2, 2 + random() * 4);
  }
  ctx.globalAlpha = 1.0;
}

function drawSmoothJunglePattern(ctx, x, y, width, height, random) {
  ctx.globalAlpha = 0.4;
  // Smooth jungle canopy
  for (let i = 0; i < Math.floor((width * height) / 2500); i++) {
    const px = x + random() * width;
    const py = y + random() * height;
    const size = 10 + random() * 20;
    ctx.fillStyle = `rgba(${20 + random() * 30}, ${60 + random() * 40}, ${30 + random() * 20}, 0.5)`;
    ctx.beginPath();
    ctx.arc(px, py, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1.0;
}

function drawSmoothForestPattern(ctx, x, y, width, height, random) {
  ctx.globalAlpha = 0.35;
  // Smooth forest floor
  for (let i = 0; i < Math.floor((width * height) / 3500); i++) {
    const px = x + random() * width;
    const py = y + random() * height;
    ctx.fillStyle = `rgba(${30 + random() * 30}, ${80 + random() * 30}, ${40 + random() * 20}, 0.4)`;
    ctx.fillRect(px, py, 1.5, 3 + random() * 4);
  }
  ctx.globalAlpha = 1.0;
}

function drawSmoothIcePattern(ctx, x, y, width, height, random) {
  ctx.globalAlpha = 0.3;
  // Smooth ice surface
  for (let i = 0; i < Math.floor((width * height) / 6000); i++) {
    const px = x + random() * width;
    const py = y + random() * height;
    const size = 25 + random() * 50;
    const gradient = ctx.createRadialGradient(px, py, 0, px, py, size);
    gradient.addColorStop(0, 'rgba(240, 250, 255, 0.4)');
    gradient.addColorStop(1, 'rgba(200, 220, 240, 0.1)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(px, py, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1.0;
}

function drawSmoothUrbanPattern(ctx, x, y, width, height, random) {
  ctx.globalAlpha = 0.25;
  // Smooth urban surface
  const gridSize = 40;
  ctx.strokeStyle = 'rgba(100, 150, 200, 0.2)';
  ctx.lineWidth = 1;
  for (let gx = x; gx < x + width; gx += gridSize) {
    ctx.beginPath();
    ctx.moveTo(gx, y);
    ctx.lineTo(gx, y + height);
    ctx.stroke();
  }
  for (let gy = y; gy < y + height; gy += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, gy);
    ctx.lineTo(x + width, gy);
    ctx.stroke();
  }
  ctx.globalAlpha = 1.0;
}

/**
 * Rough terrain patterns (for difficult terrain)
 */
function drawRoughDunesPattern(ctx, x, y, width, height, random) {
  ctx.globalAlpha = 0.5;
  // Rough, challenging sand dunes
  for (let i = 0; i < Math.floor((width * height) / 2000); i++) {
    const px = x + random() * width;
    const py = y + random() * height;
    const size = 30 + random() * 60;
    const gradient = ctx.createRadialGradient(px, py, 0, px, py, size);
    gradient.addColorStop(0, 'rgba(180, 140, 100, 0.7)');
    gradient.addColorStop(1, 'rgba(160, 120, 80, 0.3)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(px, py, size, 0, Math.PI * 2);
    ctx.fill();
  }
  // Add rough texture
  for (let i = 0; i < Math.floor((width * height) / 1000); i++) {
    const px = x + random() * width;
    const py = y + random() * height;
    ctx.fillStyle = `rgba(150, 120, 90, ${0.4 + random() * 0.3})`;
    ctx.fillRect(px, py, 1, 1);
  }
  ctx.globalAlpha = 1.0;
}

function drawRoughCanyonsPattern(ctx, x, y, width, height, random) {
  ctx.globalAlpha = 0.5;
  // Rough canyon terrain
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  for (let i = 0; i < Math.floor((width * height) / 3000); i++) {
    const px = x + random() * width;
    const py = y + random() * height;
    const w = 20 + random() * 40;
    const h = 30 + random() * 60;
    ctx.fillRect(px, py, w, h);
  }
  // Add rocky texture
  for (let i = 0; i < Math.floor((width * height) / 2000); i++) {
    const px = x + random() * width;
    const py = y + random() * height;
    const size = 8 + random() * 15;
    ctx.fillStyle = `rgba(${100 + random() * 40}, ${80 + random() * 30}, ${60 + random() * 20}, 0.6)`;
    ctx.beginPath();
    ctx.arc(px, py, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1.0;
}

function drawRoughHillsPattern(ctx, x, y, width, height, random) {
  ctx.globalAlpha = 0.4;
  // Rough, hilly terrain
  ctx.strokeStyle = 'rgba(20, 40, 10, 0.4)';
  ctx.lineWidth = 3;
  for (let gy = y; gy < y + height; gy += 30) {
    ctx.beginPath();
    ctx.moveTo(x, gy);
    for (let gx = x; gx < x + width; gx += 5) {
      ctx.lineTo(gx, gy + Math.sin(gx / 30) * 4);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1.0;
}

function drawRoughUndergrowthPattern(ctx, x, y, width, height, random) {
  ctx.globalAlpha = 0.5;
  // Dense, challenging undergrowth
  for (let i = 0; i < Math.floor((width * height) / 1500); i++) {
    const px = x + random() * width;
    const py = y + random() * height;
    const size = 8 + random() * 18;
    ctx.fillStyle = `rgba(${15 + random() * 20}, ${50 + random() * 30}, ${20 + random() * 15}, 0.7)`;
    ctx.beginPath();
    ctx.arc(px, py, size, 0, Math.PI * 2);
    ctx.fill();
  }
  // Add dense vertical elements
  for (let i = 0; i < Math.floor((width * height) / 2000); i++) {
    const px = x + random() * width;
    const py = y + random() * height;
    ctx.fillStyle = `rgba(${10 + random() * 15}, ${40 + random() * 25}, ${15 + random() * 10}, 0.8)`;
    ctx.fillRect(px, py, 2 + random() * 4, 12 + random() * 24);
  }
  ctx.globalAlpha = 1.0;
}

function drawRoughForestPattern(ctx, x, y, width, height, random) {
  ctx.globalAlpha = 0.45;
  // Dense, rough forest
  for (let i = 0; i < Math.floor((width * height) / 1800); i++) {
    const px = x + random() * width;
    const py = y + random() * height;
    ctx.fillStyle = `rgba(${20 + random() * 25}, ${60 + random() * 35}, ${25 + random() * 20}, 0.6)`;
    ctx.fillRect(px, py, 2 + random() * 3, 8 + random() * 16);
  }
  ctx.globalAlpha = 1.0;
}

function drawRoughIcePattern(ctx, x, y, width, height, random) {
  ctx.globalAlpha = 0.4;
  // Rough, cracked ice
  ctx.strokeStyle = 'rgba(150, 180, 200, 0.5)';
  ctx.lineWidth = 2;
  for (let i = 0; i < Math.floor((width * height) / 4000); i++) {
    ctx.beginPath();
    ctx.moveTo(x + random() * width, y + random() * height);
    ctx.lineTo(x + random() * width, y + random() * height);
    ctx.stroke();
  }
  ctx.globalAlpha = 1.0;
}

function drawRoughSwampPattern(ctx, x, y, width, height, random) {
  ctx.globalAlpha = 0.5;
  // Rough, muddy swamp
  for (let i = 0; i < Math.floor((width * height) / 2500); i++) {
    const px = x + random() * width;
    const py = y + random() * height;
    const size = 12 + random() * 25;
    ctx.fillStyle = `rgba(${40 + random() * 30}, ${60 + random() * 40}, ${50 + random() * 30}, 0.6)`;
    ctx.beginPath();
    ctx.arc(px, py, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1.0;
}

/**
 * Blocked terrain pattern (for impassable terrain)
 */
function drawBlockedTerrainPattern(ctx, x, y, width, height, random) {
  ctx.globalAlpha = 0.6;
  // Dark, blocked appearance
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.fillRect(x, y, width, height);
  
  // Add barrier indicators
  ctx.strokeStyle = 'rgba(180, 40, 40, 0.7)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 10; i++) {
    ctx.beginPath();
    ctx.moveTo(x + random() * width, y + random() * height);
    ctx.lineTo(x + random() * width, y + random() * height);
    ctx.stroke();
  }
  ctx.globalAlpha = 1.0;
}

/**
 * Get biome at a point
 */
export function getBiomeAtPoint(biomes, point) {
  if (!biomes) return null;

  for (const biome of biomes) {
    if (!biome.polygon) continue;
    if (pointInPolygon(point, biome.polygon)) {
      return biome;
    }
  }

  return null;
}

