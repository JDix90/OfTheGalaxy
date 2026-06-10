/**
 * Building Renderer Utility
 * Renders varied building types with architectural details based on POI types
 */

/**
 * Get building style based on POI type
 * @param {string} poiType - Type of POI
 * @returns {Object} Building style configuration
 */
export function getBuildingStyle(poiType) {
  const styles = {
    spaceport: {
      size: 'large',
      color: 'rgba(40, 50, 70, 0.95)',
      borderColor: 'rgba(60, 80, 100, 1.0)',
      windowColor: 'rgba(100, 150, 200, 0.7)',
      windowPattern: 'grid',
      roofStyle: 'flat',
      hasLandingPad: true
    },
    palace: {
      size: 'very_large',
      color: 'rgba(60, 40, 30, 0.95)',
      borderColor: 'rgba(80, 60, 50, 1.0)',
      windowColor: 'rgba(200, 180, 100, 0.8)',
      windowPattern: 'ornate',
      roofStyle: 'domed',
      hasLandingPad: false
    },
    medical_center: {
      size: 'medium',
      color: 'rgba(50, 60, 70, 0.95)',
      borderColor: 'rgba(70, 90, 110, 1.0)',
      windowColor: 'rgba(150, 200, 255, 0.8)',
      windowPattern: 'medical',
      roofStyle: 'flat',
      hasLandingPad: false
    },
    market: {
      size: 'medium',
      color: 'rgba(45, 45, 55, 0.95)',
      borderColor: 'rgba(65, 65, 75, 1.0)',
      windowColor: 'rgba(120, 150, 180, 0.7)',
      windowPattern: 'storefront',
      roofStyle: 'flat',
      hasLandingPad: false
    },
    cantina: {
      size: 'small',
      color: 'rgba(50, 35, 25, 0.95)',
      borderColor: 'rgba(70, 55, 45, 1.0)',
      windowColor: 'rgba(200, 150, 50, 0.8)',
      windowPattern: 'neon',
      roofStyle: 'flat',
      hasLandingPad: false
    },
    base: {
      size: 'large',
      color: 'rgba(35, 40, 45, 0.95)',
      borderColor: 'rgba(55, 60, 65, 1.0)',
      windowColor: 'rgba(100, 120, 140, 0.6)',
      windowPattern: 'military',
      roofStyle: 'flat',
      hasLandingPad: true
    },
    default: {
      size: 'small',
      color: 'rgba(15, 15, 25, 0.9)',
      borderColor: 'rgba(30, 30, 50, 1.0)',
      windowColor: 'rgba(60, 80, 120, 0.6)',
      windowPattern: 'simple',
      roofStyle: 'flat',
      hasLandingPad: false
    }
  };

  return styles[poiType] || styles.default;
}

/**
 * Find nearest POI to a tile coordinate
 * @param {number} tileX - Tile X coordinate
 * @param {number} tileY - Tile Y coordinate
 * @param {Array} pois - Array of POIs
 * @param {number} tileSize - Size of each tile as percentage
 * @returns {Object|null} Nearest POI or null
 */
export function findNearestPOI(tileX, tileY, pois, tileSize) {
  if (!pois || pois.length === 0) return null;

  let nearest = null;
  let minDistance = Infinity;

  const tileWorldX = (tileX * tileSize);
  const tileWorldY = (tileY * tileSize);

  for (const poi of pois) {
    const distance = Math.sqrt(
      Math.pow(poi.x - tileWorldX, 2) + Math.pow(poi.y - tileWorldY, 2)
    );
    if (distance < minDistance && distance < 5) { // Within 5% of map
      minDistance = distance;
      nearest = poi;
    }
  }

  return nearest;
}

/**
 * Draw building with style and details
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} width - Width
 * @param {number} height - Height
 * @param {Object} style - Building style from getBuildingStyle
 * @param {boolean} hasShadow - Whether to draw shadow
 */
export function drawBuilding(ctx, x, y, width, height, style, hasShadow = true) {
  // Draw shadow first if enabled
  if (hasShadow) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(x + 2, y + 2, width, height);
  }

  // Draw main building with gradient for depth
  const buildingGradient = ctx.createLinearGradient(x, y, x, y + height);
  const baseColor = style.color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (baseColor) {
    const r = parseInt(baseColor[1]);
    const g = parseInt(baseColor[2]);
    const b = parseInt(baseColor[3]);
    buildingGradient.addColorStop(0, `rgba(${Math.min(255, r + 10)}, ${Math.min(255, g + 10)}, ${Math.min(255, b + 10)}, 0.95)`);
    buildingGradient.addColorStop(0.5, style.color);
    buildingGradient.addColorStop(1, `rgba(${Math.max(0, r - 10)}, ${Math.max(0, g - 10)}, ${Math.max(0, b - 10)}, 0.9)`);
  } else {
    buildingGradient.addColorStop(0, style.color);
    buildingGradient.addColorStop(1, style.color);
  }
  ctx.fillStyle = buildingGradient;
  ctx.strokeStyle = style.borderColor;
  ctx.lineWidth = 2;
  ctx.fillRect(x, y, width, height);
  ctx.strokeRect(x, y, width, height);

  // Add lighting highlight (top-left corner)
  const highlightGradient = ctx.createLinearGradient(x, y, x + width * 0.3, y + height * 0.3);
  highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
  highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = highlightGradient;
  ctx.fillRect(x, y, width * 0.4, height * 0.4);

  // Draw windows based on pattern
  drawWindows(ctx, x, y, width, height, style);

  // Draw roof if applicable
  if (style.roofStyle === 'domed') {
    drawDomedRoof(ctx, x, y, width, height);
  }

  // Draw landing pad if applicable
  if (style.hasLandingPad && width > 15 && height > 15) {
    drawLandingPad(ctx, x, y, width, height);
  }
}

/**
 * Draw windows based on pattern
 */
function drawWindows(ctx, x, y, width, height, style) {
  ctx.fillStyle = style.windowColor;

  switch (style.windowPattern) {
    case 'grid':
      // Grid pattern for spaceports/bases
      const gridCols = Math.floor(width / 8);
      const gridRows = Math.floor(height / 8);
      for (let row = 0; row < gridRows; row++) {
        for (let col = 0; col < gridCols; col++) {
          const winX = x + (col + 0.5) * (width / gridCols) - 2;
          const winY = y + (row + 0.5) * (height / gridRows) - 2;
          ctx.fillRect(winX, winY, 4, 4);
        }
      }
      break;

    case 'storefront':
      // Storefront windows (larger, at bottom)
      const storeWinWidth = width * 0.3;
      const storeWinHeight = height * 0.4;
      ctx.fillRect(x + width * 0.1, y + height * 0.5, storeWinWidth, storeWinHeight);
      ctx.fillRect(x + width * 0.6, y + height * 0.5, storeWinWidth, storeWinHeight);
      break;

    case 'neon':
      // Neon signs for cantinas
      ctx.strokeStyle = style.windowColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + width * 0.2, y + height * 0.3);
      ctx.lineTo(x + width * 0.8, y + height * 0.3);
      ctx.moveTo(x + width * 0.2, y + height * 0.7);
      ctx.lineTo(x + width * 0.8, y + height * 0.7);
      ctx.stroke();
      break;

    case 'medical':
      // Medical center windows (bright, evenly spaced)
      const medWinSize = Math.min(width, height) * 0.15;
      ctx.fillRect(x + width * 0.2, y + height * 0.2, medWinSize, medWinSize);
      ctx.fillRect(x + width * 0.7, y + height * 0.2, medWinSize, medWinSize);
      ctx.fillRect(x + width * 0.2, y + height * 0.6, medWinSize, medWinSize);
      ctx.fillRect(x + width * 0.7, y + height * 0.6, medWinSize, medWinSize);
      break;

    case 'ornate':
      // Ornate windows for palaces
      const ornateSize = Math.min(width, height) * 0.2;
      ctx.fillRect(x + width * 0.15, y + height * 0.2, ornateSize, ornateSize);
      ctx.fillRect(x + width * 0.65, y + height * 0.2, ornateSize, ornateSize);
      // Add decorative border
      ctx.strokeStyle = 'rgba(200, 180, 100, 0.5)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + width * 0.15, y + height * 0.2, ornateSize, ornateSize);
      ctx.strokeRect(x + width * 0.65, y + height * 0.2, ornateSize, ornateSize);
      break;

    case 'military':
      // Small, sparse windows for military bases
      if (width > 10 && height > 10) {
        ctx.fillRect(x + width * 0.3, y + height * 0.3, 3, 3);
        ctx.fillRect(x + width * 0.7, y + height * 0.3, 3, 3);
        ctx.fillRect(x + width * 0.3, y + height * 0.7, 3, 3);
        ctx.fillRect(x + width * 0.7, y + height * 0.7, 3, 3);
      }
      break;

    case 'simple':
    default:
      // Simple windows (default)
      if (width > 10 && height > 10) {
        ctx.fillRect(x + width * 0.2, y + height * 0.2, width * 0.15, height * 0.15);
        ctx.fillRect(x + width * 0.65, y + height * 0.2, width * 0.15, height * 0.15);
      }
      break;
  }
}

/**
 * Draw domed roof for palaces
 */
function drawDomedRoof(ctx, x, y, width, height) {
  ctx.fillStyle = 'rgba(80, 60, 50, 0.9)';
  ctx.strokeStyle = 'rgba(100, 80, 70, 1.0)';
  ctx.lineWidth = 2;
  const centerX = x + width / 2;
  const roofY = y - height * 0.2;
  const roofRadius = width * 0.4;
  ctx.beginPath();
  ctx.arc(centerX, roofY, roofRadius, 0, Math.PI, true);
  ctx.fill();
  ctx.stroke();
}

/**
 * Draw landing pad for spaceports/bases
 */
function drawLandingPad(ctx, x, y, width, height) {
  const padSize = Math.min(width, height) * 0.6;
  const padX = x + (width - padSize) / 2;
  const padY = y + height * 0.7;
  
  // Landing pad base
  ctx.fillStyle = 'rgba(100, 100, 100, 0.8)';
  ctx.fillRect(padX, padY, padSize, padSize * 0.3);
  
  // Landing pad markings
  ctx.strokeStyle = 'rgba(200, 200, 200, 0.9)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padX + padSize / 2, padY);
  ctx.lineTo(padX + padSize / 2, padY + padSize * 0.3);
  ctx.moveTo(padX, padY + padSize * 0.15);
  ctx.lineTo(padX + padSize, padY + padSize * 0.15);
  ctx.stroke();
}

