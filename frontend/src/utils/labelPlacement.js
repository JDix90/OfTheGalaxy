/**
 * Label Placement Utility
 * Implements force-directed layout algorithm for POI labels to prevent overlaps
 */

/**
 * Calculate label bounds (width and height) for a given text
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {string} text - Label text
 * @param {string} font - Font string
 * @returns {{width: number, height: number}} Label dimensions
 */
function measureLabel(ctx, text, font) {
  ctx.save();
  ctx.font = font;
  const metrics = ctx.measureText(text);
  ctx.restore();
  return {
    width: metrics.width,
    height: parseInt(font.match(/\d+/)?.[0] || '11', 10) * 1.2 // Approximate height
  };
}

/**
 * Check if two rectangles overlap
 * @param {Object} rect1 - First rectangle {x, y, width, height}
 * @param {Object} rect2 - Second rectangle {x, y, width, height}
 * @param {number} padding - Additional padding between rectangles
 * @returns {boolean} True if rectangles overlap
 */
function rectanglesOverlap(rect1, rect2, padding = 2) {
  return !(
    rect1.x + rect1.width + padding < rect2.x ||
    rect2.x + rect2.width + padding < rect1.x ||
    rect1.y + rect1.height + padding < rect2.y ||
    rect2.y + rect2.height + padding < rect1.y
  );
}

/**
 * Calculate optimal label position using force-directed layout
 * @param {Object} poi - POI object with x, y, name
 * @param {Array} placedLabels - Array of already placed labels
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @param {number} iconSize - Size of POI icon
 * @param {boolean} isHovered - Whether this POI is hovered
 * @returns {{x: number, y: number, leaderLine: {start: {x, y}, end: {x, y}} | null}} Label position and optional leader line
 */
function calculateLabelPosition(poi, placedLabels, ctx, width, height, iconSize, isHovered) {
  const poiX = (poi.x / 100) * width;
  const poiY = (poi.y / 100) * height;
  
  const font = isHovered ? 'bold 13px sans-serif' : '11px sans-serif';
  const labelMetrics = measureLabel(ctx, poi.name, font);
  const labelWidth = labelMetrics.width;
  const labelHeight = labelMetrics.height;
  
  // Default position: below icon
  const defaultY = poiY + iconSize / 2 + (isHovered ? 6 : 4);
  const defaultX = poiX;
  
  // Try default position first
  let labelX = defaultX;
  let labelY = defaultY;
  let needsLeaderLine = false;
  
  // Create label rectangle
  const labelRect = {
    x: labelX - labelWidth / 2,
    y: labelY,
    width: labelWidth,
    height: labelHeight
  };
  
  // Check for overlaps with placed labels
  let hasOverlap = false;
  for (const placed of placedLabels) {
    if (rectanglesOverlap(labelRect, placed.rect, 4)) {
      hasOverlap = true;
      break;
    }
  }
  
  // If no overlap, use default position
  if (!hasOverlap) {
    return {
      x: labelX,
      y: labelY,
      leaderLine: null
    };
  }
  
  // Try alternative positions (force-directed approach)
  const offsets = [
    { x: 0, y: labelHeight + 8 },      // Further below
    { x: 0, y: -(iconSize / 2 + labelHeight + 8) }, // Above
    { x: labelWidth / 2 + iconSize / 2 + 8, y: 0 }, // Right
    { x: -(labelWidth / 2 + iconSize / 2 + 8), y: 0 }, // Left
    { x: labelWidth / 2 + iconSize / 2 + 8, y: labelHeight + 8 }, // Bottom-right
    { x: -(labelWidth / 2 + iconSize / 2 + 8), y: labelHeight + 8 }, // Bottom-left
    { x: labelWidth / 2 + iconSize / 2 + 8, y: -(iconSize / 2 + labelHeight + 8) }, // Top-right
    { x: -(labelWidth / 2 + iconSize / 2 + 8), y: -(iconSize / 2 + labelHeight + 8) } // Top-left
  ];
  
  let bestPosition = null;
  let minOverlaps = Infinity;
  
  for (const offset of offsets) {
    const testX = poiX + offset.x;
    const testY = poiY + iconSize / 2 + offset.y;
    
    // Check bounds
    if (testX - labelWidth / 2 < 0 || testX + labelWidth / 2 > width ||
        testY < 0 || testY + labelHeight > height) {
      continue;
    }
    
    const testRect = {
      x: testX - labelWidth / 2,
      y: testY,
      width: labelWidth,
      height: labelHeight
    };
    
    // Count overlaps
    let overlapCount = 0;
    for (const placed of placedLabels) {
      if (rectanglesOverlap(testRect, placed.rect, 4)) {
        overlapCount++;
      }
    }
    
    if (overlapCount < minOverlaps) {
      minOverlaps = overlapCount;
      bestPosition = {
        x: testX,
        y: testY,
        leaderLine: offset.x !== 0 || offset.y !== (isHovered ? 6 : 4) ? {
          start: { x: poiX, y: poiY + iconSize / 2 },
          end: { x: testX, y: testY }
        } : null
      };
    }
  }
  
  // If we found a good position, use it
  if (bestPosition && minOverlaps < 3) {
    return bestPosition;
  }
  
  // Fallback: use default position with leader line
  return {
    x: defaultX,
    y: defaultY,
    leaderLine: {
      start: { x: poiX, y: poiY + iconSize / 2 },
      end: { x: defaultX, y: defaultY }
    }
  };
}

/**
 * Calculate optimal positions for all POI labels
 * @param {Array} pois - Array of POI objects
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @param {Object} hoveredPOI - Currently hovered POI
 * @returns {Array} Array of label positions with leader lines
 */
export function calculatePOILabelPositions(pois, ctx, width, height, hoveredPOI = null) {
  if (!pois || pois.length === 0) return [];
  
  // Sort POIs by importance (hovered first, then by type priority)
  const typePriority = {
    spaceport: 1,
    city: 2,
    palace: 3,
    medical_center: 4,
    market: 5,
    cantina: 6,
    base: 7,
    danger: 8,
    entertainment: 9
  };
  
  const sortedPOIs = [...pois].sort((a, b) => {
    if (hoveredPOI === a) return -1;
    if (hoveredPOI === b) return 1;
    const priorityA = typePriority[a.type] || 10;
    const priorityB = typePriority[b.type] || 10;
    return priorityA - priorityB;
  });
  
  const placedLabels = [];
  const labelPositions = [];
  
  // Determine icon size (hovered POIs are larger)
  const getIconSize = (poi) => hoveredPOI === poi ? 96 : 80;
  
  for (const poi of sortedPOIs) {
    const iconSize = getIconSize(poi);
    const isHovered = hoveredPOI === poi;
    
    const position = calculateLabelPosition(
      poi,
      placedLabels,
      ctx,
      width,
      height,
      iconSize,
      isHovered
    );
    
    // Measure label for collision detection
    const font = isHovered ? 'bold 13px sans-serif' : '11px sans-serif';
    const labelMetrics = measureLabel(ctx, poi.name, font);
    
    // Store placed label
    placedLabels.push({
      poi,
      rect: {
        x: position.x - labelMetrics.width / 2,
        y: position.y,
        width: labelMetrics.width,
        height: labelMetrics.height
      }
    });
    
    labelPositions.push({
      poi,
      position,
      isHovered
    });
  }
  
  return labelPositions;
}

