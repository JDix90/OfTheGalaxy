/**
 * Procedural Texture Generation Utility
 * Generates textures using noise functions for terrain variation
 */

/**
 * Simple seeded random number generator
 */
function seededRandom(seed) {
  let value = seed;
  return function() {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}

/**
 * Simple 2D noise function (simplified Perlin-like noise)
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {number} scale - Noise scale (higher = more variation)
 * @param {Function} random - Random function
 * @returns {number} Noise value between 0 and 1
 */
function noise2D(x, y, scale, random) {
  const x0 = Math.floor(x * scale);
  const y0 = Math.floor(y * scale);
  const x1 = x0 + 1;
  const y1 = y0 + 1;

  // Get random values at corners
  const n00 = random();
  const n10 = random();
  const n01 = random();
  const n11 = random();

  // Interpolate
  const fx = (x * scale) - x0;
  const fy = (y * scale) - y0;

  const nx0 = n00 * (1 - fx) + n10 * fx;
  const nx1 = n01 * (1 - fx) + n11 * fx;
  return nx0 * (1 - fy) + nx1 * fy;
}

/**
 * Generate terrain texture pattern for a tile
 * @param {string} terrainType - Type of terrain (sand, urban, water, etc.)
 * @param {number} x - Tile X coordinate
 * @param {number} y - Tile Y coordinate
 * @param {number} seed - Seed for random generation
 * @returns {Object} Texture data with pattern and variation
 */
export function generateTerrainTexture(terrainType, x, y, seed) {
  const random = seededRandom(seed + x * 1000 + y);
  const noise = (scale) => noise2D(x, y, scale, random);

  switch (terrainType) {
    case 'sand':
    case 'desert':
      // Sand dune patterns
      const sandNoise = noise(0.3);
      return {
        pattern: 'dune',
        variation: sandNoise,
        intensity: 0.3 + sandNoise * 0.4,
        colorVariation: sandNoise * 0.1
      };

    case 'urban':
    case 'urban_sprawl':
      // Urban grid patterns
      const urbanNoise = noise(0.5);
      return {
        pattern: 'grid',
        variation: urbanNoise,
        intensity: 0.2 + urbanNoise * 0.3,
        colorVariation: urbanNoise * 0.05
      };

    case 'water':
    case 'ocean':
      // Water ripple patterns
      const waterNoise = noise(0.4);
      return {
        pattern: 'ripple',
        variation: waterNoise,
        intensity: 0.25 + waterNoise * 0.35,
        colorVariation: waterNoise * 0.08
      };

    case 'rock':
    case 'barren':
      // Rock texture patterns
      const rockNoise = noise(0.2);
      return {
        pattern: 'rock',
        variation: rockNoise,
        intensity: 0.4 + rockNoise * 0.5,
        colorVariation: rockNoise * 0.15
      };

    case 'grass':
    case 'temperate':
      // Grass texture patterns
      const grassNoise = noise(0.35);
      return {
        pattern: 'grass',
        variation: grassNoise,
        intensity: 0.3 + grassNoise * 0.4,
        colorVariation: grassNoise * 0.1
      };

    default:
      return {
        pattern: 'none',
        variation: 0,
        intensity: 0,
        colorVariation: 0
      };
  }
}

/**
 * Apply texture pattern to a canvas context
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} width - Width
 * @param {number} height - Height
 * @param {Object} texture - Texture data from generateTerrainTexture
 * @param {string} baseColor - Base color in rgba format
 */
export function applyTerrainTexture(ctx, x, y, width, height, texture, baseColor) {
  if (texture.pattern === 'none' || texture.intensity < 0.1) {
    return; // No texture to apply
  }

  ctx.save();

  switch (texture.pattern) {
    case 'dune':
      // Sand dune pattern - wavy lines
      ctx.strokeStyle = `rgba(200, 180, 150, ${texture.intensity * 0.3})`;
      ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        const offset = (texture.variation * 10 + i * 3) % height;
        ctx.beginPath();
        ctx.moveTo(x, y + offset);
        ctx.quadraticCurveTo(
          x + width / 2,
          y + offset + (texture.variation - 0.5) * 5,
          x + width,
          y + offset
        );
        ctx.stroke();
      }
      break;

    case 'grid':
      // Urban grid pattern - subtle grid lines
      ctx.strokeStyle = `rgba(100, 100, 120, ${texture.intensity * 0.2})`;
      ctx.lineWidth = 0.5;
      // Vertical lines
      for (let i = 1; i < 3; i++) {
        const offset = (x + (width / 3) * i) % width;
        ctx.beginPath();
        ctx.moveTo(x + offset, y);
        ctx.lineTo(x + offset, y + height);
        ctx.stroke();
      }
      // Horizontal lines
      for (let i = 1; i < 3; i++) {
        const offset = (y + (height / 3) * i) % height;
        ctx.beginPath();
        ctx.moveTo(x, y + offset);
        ctx.lineTo(x + width, y + offset);
        ctx.stroke();
      }
      break;

    case 'ripple':
      // Water ripple pattern - concentric circles
      ctx.strokeStyle = `rgba(50, 100, 150, ${texture.intensity * 0.25})`;
      ctx.lineWidth = 0.5;
      const centerX = x + width / 2;
      const centerY = y + height / 2;
      for (let i = 1; i <= 2; i++) {
        const radius = (width / 4) * i + texture.variation * 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;

    case 'rock':
      // Rock texture - irregular shapes
      ctx.fillStyle = `rgba(60, 50, 40, ${texture.intensity * 0.4})`;
      for (let i = 0; i < 2; i++) {
        const rockX = x + (texture.variation + i * 0.3) * width;
        const rockY = y + (texture.variation * 0.7 + i * 0.2) * height;
        const rockSize = width * 0.2 + texture.variation * width * 0.1;
        ctx.beginPath();
        ctx.arc(rockX, rockY, rockSize, 0, Math.PI * 2);
        ctx.fill();
      }
      break;

    case 'grass':
      // Grass texture - small vertical lines
      ctx.strokeStyle = `rgba(50, 100, 50, ${texture.intensity * 0.3})`;
      ctx.lineWidth = 0.5;
      for (let i = 0; i < 4; i++) {
        const grassX = x + (texture.variation + i * 0.25) * width;
        const grassY = y + height * 0.3;
        ctx.beginPath();
        ctx.moveTo(grassX, grassY);
        ctx.lineTo(grassX + (texture.variation - 0.5) * 2, grassY - height * 0.3);
        ctx.stroke();
      }
      break;
  }

  ctx.restore();
}

/**
 * Get planet seed for consistent texture generation
 * @param {Object} planet - Planet object
 * @returns {number} Seed value
 */
export function getPlanetTextureSeed(planet) {
  if (!planet || !planet.id) return 12345;
  // Generate seed from planet ID
  let seed = 0;
  for (let i = 0; i < planet.id.length; i++) {
    seed = ((seed << 5) - seed) + planet.id.charCodeAt(i);
    seed = seed & seed; // Convert to 32-bit integer
  }
  return Math.abs(seed);
}

