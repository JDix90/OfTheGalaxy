/**
 * Movement Animator
 * Handles smooth animation of player movement along paths
 */

import { calculatePathDistance } from './pathfinding';

/**
 * Animate player movement along a path
 * @param {Array} path - Array of {x, y} points in display coordinates (0-100)
 * @param {Function} onUpdate - Callback called with current position {x, y} and progress (0-1)
 * @param {Object} options - Animation options
 * @returns {Promise} Resolves when animation completes
 */
export async function animateMovement(path, onUpdate, options = {}) {
  if (!path || path.length < 2) {
    console.warn('[Movement] Invalid path for animation');
    return;
  }

  const {
    duration = 1000, // Total animation duration in ms
    easing = 'easeInOutQuad', // Easing function
    speedMultiplier = 1.0 // Movement speed multiplier based on terrain
  } = options;

  return new Promise((resolve) => {
    const startTime = performance.now();
    const totalDistance = calculatePathDistance(path);
    const adjustedDuration = duration / speedMultiplier;

    function animate(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / adjustedDuration, 1);

      // Apply easing
      const easedProgress = applyEasing(progress, easing);

      // Calculate current position along path
      const currentPosition = getPositionAlongPath(path, easedProgress, totalDistance);

      // Call update callback
      if (onUpdate) {
        onUpdate(currentPosition, easedProgress);
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        resolve();
      }
    }

    requestAnimationFrame(animate);
  });
}

// calculatePathDistance is imported from pathfinding.js

/**
 * Get position along path based on progress
 */
function getPositionAlongPath(path, progress, totalDistance) {
  if (progress <= 0) return { x: path[0].x, y: path[0].y };
  if (progress >= 1) return { x: path[path.length - 1].x, y: path[path.length - 1].y };

  const targetDistance = totalDistance * progress;
  let accumulatedDistance = 0;

  for (let i = 1; i < path.length; i++) {
    const dx = path[i].x - path[i - 1].x;
    const dy = path[i].y - path[i - 1].y;
    const segmentDistance = Math.sqrt(dx * dx + dy * dy);

    if (accumulatedDistance + segmentDistance >= targetDistance) {
      // Position is in this segment
      const segmentProgress = (targetDistance - accumulatedDistance) / segmentDistance;
      return {
        x: path[i - 1].x + (dx * segmentProgress),
        y: path[i - 1].y + (dy * segmentProgress)
      };
    }

    accumulatedDistance += segmentDistance;
  }

  // Fallback to end position
  return { x: path[path.length - 1].x, y: path[path.length - 1].y };
}

/**
 * Apply easing function to progress value
 */
function applyEasing(t, easingType) {
  switch (easingType) {
    case 'linear':
      return t;
    case 'easeInQuad':
      return t * t;
    case 'easeOutQuad':
      return t * (2 - t);
    case 'easeInOutQuad':
      return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    case 'easeInCubic':
      return t * t * t;
    case 'easeOutCubic':
      return (--t) * t * t + 1;
    case 'easeInOutCubic':
      return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
    default:
      return t;
  }
}

/**
 * Calculate movement speed multiplier based on terrain type
 */
export function getTerrainSpeedMultiplier(terrainType) {
  const multipliers = {
    'navigable': 1.0,
    'difficult': 0.5,
    'impassable': 0.0
  };
  return multipliers[terrainType] || 1.0;
}

/**
 * Calculate animation duration based on path distance and terrain
 */
export function calculateAnimationDuration(path, baseSpeed = 50) {
  if (!path || path.length < 2) return 500; // Default duration
  
  // Calculate distance manually since path is in display coordinates
  let distance = 0;
  for (let i = 1; i < path.length; i++) {
    const dx = path[i].x - path[i - 1].x;
    const dy = path[i].y - path[i - 1].y;
    distance += Math.sqrt(dx * dx + dy * dy);
  }
  
  // baseSpeed is units per second (in display coordinates 0-100)
  const duration = (distance / baseSpeed) * 1000; // Convert to milliseconds
  return Math.max(300, Math.min(3000, duration)); // Clamp between 300ms and 3s
}

