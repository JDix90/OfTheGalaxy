/**
 * Coordinate Converter
 * Handles conversion between different coordinate systems
 */

/**
 * Convert internal coordinates (0-1000) to display coordinates (0-100)
 */
export function internalToDisplay(internalX, internalY) {
  return {
    x: (internalX / 1000) * 100,
    y: (internalY / 1000) * 100
  };
}

/**
 * Convert display coordinates (0-100) to internal coordinates (0-1000)
 */
export function displayToInternal(displayX, displayY) {
  return {
    x: (displayX / 100) * 1000,
    y: (displayY / 100) * 1000
  };
}

/**
 * Convert normalized coordinates (0.0-1.0) to internal coordinates (0-1000)
 */
export function normalizedToInternal(normalizedX, normalizedY) {
  return {
    x: normalizedX * 1000,
    y: normalizedY * 1000
  };
}

/**
 * Convert internal coordinates (0-1000) to normalized coordinates (0.0-1.0)
 */
export function internalToNormalized(internalX, internalY) {
  return {
    x: internalX / 1000,
    y: internalY / 1000
  };
}

/**
 * Convert screen coordinates (pixels) to world coordinates (0-1000)
 * @param {number} screenX - Screen X coordinate in pixels
 * @param {number} screenY - Screen Y coordinate in pixels
 * @param {number} canvasWidth - Canvas width in pixels
 * @param {number} canvasHeight - Canvas height in pixels
 * @param {Object} camera - Camera object with {x, y, zoom}
 * @returns {Object} World coordinates {x, y} in 0-1000 range
 */
export function screenToWorld(screenX, screenY, canvasWidth, canvasHeight, camera = { x: 0, y: 0, zoom: 1 }) {
  // Convert screen coordinates to display coordinates (0-100)
  const displayX = (screenX / canvasWidth) * 100;
  const displayY = (screenY / canvasHeight) * 100;

  // Account for camera pan and zoom
  const adjustedX = (displayX - camera.x) / camera.zoom;
  const adjustedY = (displayY - camera.y) / camera.zoom;

  // Convert to internal coordinates (0-1000)
  return displayToInternal(adjustedX, adjustedY);
}

/**
 * Convert world coordinates (0-1000) to screen coordinates (pixels)
 * @param {number} worldX - World X coordinate in 0-1000 range
 * @param {number} worldY - World Y coordinate in 0-1000 range
 * @param {number} canvasWidth - Canvas width in pixels
 * @param {number} canvasHeight - Canvas height in pixels
 * @param {Object} camera - Camera object with {x, y, zoom}
 * @returns {Object} Screen coordinates {x, y} in pixels
 */
export function worldToScreen(worldX, worldY, canvasWidth, canvasHeight, camera = { x: 0, y: 0, zoom: 1 }) {
  // Convert internal coordinates to display coordinates
  const display = internalToDisplay(worldX, worldY);

  // Apply camera transform
  const adjustedX = display.x * camera.zoom + camera.x;
  const adjustedY = display.y * camera.zoom + camera.y;

  // Convert to screen coordinates
  return {
    x: (adjustedX / 100) * canvasWidth,
    y: (adjustedY / 100) * canvasHeight
  };
}

/**
 * Clamp coordinates to valid range
 */
export function clampCoordinates(x, y, minX = 0, minY = 0, maxX = 1000, maxY = 1000) {
  return {
    x: Math.max(minX, Math.min(maxX, x)),
    y: Math.max(minY, Math.min(maxY, y))
  };
}

/**
 * Convert legacy coordinates (handles both 0-100 and 0-1000 ranges)
 */
export function normalizeCoordinates(x, y) {
  // If coordinates are > 100, assume they're in 0-1000 range
  // Otherwise, assume they're in 0-100 range and convert
  if (x > 100 || y > 100) {
    // Already in 0-1000 range, but might need conversion to 0-100 for display
    return internalToDisplay(x, y);
  }
  // Already in 0-100 range
  return { x, y };
}


