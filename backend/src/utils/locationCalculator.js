/**
 * Location Calculator Utility
 * Converts vague location hints ("east", "nearby") into actual map coordinates
 */

class LocationCalculator {
  /**
   * Calculate location coordinates from a hint
   * @param {string|Object} hint - Location hint (e.g., "east", "nearby", or structured object)
   * @param {Object} questGiverLocation - Quest giver's location { planet, area, x, y }
   * @param {Object} planet - Planet model instance
   * @returns {Object} Calculated location { x, y, area, planet }
   */
  calculateLocationFromHint(hint, questGiverLocation, planet) {
    const planetId = questGiverLocation?.planet || planet?.id;
    const area = questGiverLocation?.area || 'surface';
    const baseX = questGiverLocation?.x || 50; // Default to center if no coordinates
    const baseY = questGiverLocation?.y || 50;

    // If hint is already a structured object with coordinates, use it
    if (typeof hint === 'object' && hint.x !== undefined && hint.y !== undefined) {
      return {
        x: Math.max(5, Math.min(95, hint.x)),
        y: Math.max(5, Math.min(95, hint.y)),
        area: hint.area || area,
        planet: hint.planet || planetId
      };
    }

    // Parse string hints
    const hintStr = typeof hint === 'string' ? hint.toLowerCase().trim() : 'nearby';
    
    let x = baseX;
    let y = baseY;
    let distance = 15; // Default distance in map percentage

    // Parse distance from hint (e.g., "5 clicks east", "a few clicks")
    const distanceMatch = hintStr.match(/(\d+)\s*(?:clicks?|units?|steps?)/);
    if (distanceMatch) {
      distance = parseInt(distanceMatch[1], 10);
      // Clamp distance to reasonable range
      distance = Math.max(5, Math.min(30, distance));
    } else if (hintStr.includes('few')) {
      distance = 8;
    } else if (hintStr.includes('several') || hintStr.includes('many')) {
      distance = 20;
    }

    // Parse direction
    if (hintStr.includes('east') || hintStr.includes('right')) {
      x = baseX + distance;
    } else if (hintStr.includes('west') || hintStr.includes('left')) {
      x = baseX - distance;
    } else if (hintStr.includes('north') || hintStr.includes('up')) {
      y = baseY - distance;
    } else if (hintStr.includes('south') || hintStr.includes('down')) {
      y = baseY + distance;
    } else if (hintStr.includes('northeast') || hintStr.includes('north-east')) {
      x = baseX + (distance * 0.7);
      y = baseY - (distance * 0.7);
    } else if (hintStr.includes('northwest') || hintStr.includes('north-west')) {
      x = baseX - (distance * 0.7);
      y = baseY - (distance * 0.7);
    } else if (hintStr.includes('southeast') || hintStr.includes('south-east')) {
      x = baseX + (distance * 0.7);
      y = baseY + (distance * 0.7);
    } else if (hintStr.includes('southwest') || hintStr.includes('south-west')) {
      x = baseX - (distance * 0.7);
      y = baseY + (distance * 0.7);
    } else {
      // "nearby" or unknown - place at random nearby location
      const angle = Math.random() * Math.PI * 2;
      x = baseX + Math.cos(angle) * distance;
      y = baseY + Math.sin(angle) * distance;
    }

    // Clamp to map bounds (5-95% to avoid edges)
    x = Math.max(5, Math.min(95, x));
    y = Math.max(5, Math.min(95, y));

    return {
      x: Math.round(x * 10) / 10, // Round to 1 decimal place
      y: Math.round(y * 10) / 10,
      area: area,
      planet: planetId
    };
  }

  /**
   * Check if a location is too close to existing POIs
   * @param {Object} location - Location to check { x, y }
   * @param {Array} existingPOIs - Array of existing POIs
   * @param {number} minDistance - Minimum distance in map percentage (default: 8)
   * @returns {boolean} True if location is too close
   */
  isTooCloseToPOI(location, existingPOIs, minDistance = 8) {
    if (!existingPOIs || existingPOIs.length === 0) {
      return false;
    }

    return existingPOIs.some(poi => {
      const poiX = poi.x || 0;
      const poiY = poi.y || 0;
      const dx = location.x - poiX;
      const dy = location.y - poiY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance < minDistance;
    });
  }

  /**
   * Find a valid location near a point, avoiding POI overlaps
   * @param {Object} preferredLocation - Preferred location { x, y }
   * @param {Array} existingPOIs - Array of existing POIs
   * @param {number} minDistance - Minimum distance from other POIs
   * @param {number} maxAttempts - Maximum attempts to find valid location
   * @returns {Object} Valid location { x, y }
   */
  findValidLocation(preferredLocation, existingPOIs, minDistance = 8, maxAttempts = 20) {
    let location = { ...preferredLocation };
    let attempts = 0;

    while (this.isTooCloseToPOI(location, existingPOIs, minDistance) && attempts < maxAttempts) {
      // Try nearby positions in a spiral pattern
      const angle = (attempts / maxAttempts) * Math.PI * 2;
      const radius = minDistance + (attempts * 0.5);
      location = {
        x: Math.max(5, Math.min(95, preferredLocation.x + Math.cos(angle) * radius)),
        y: Math.max(5, Math.min(95, preferredLocation.y + Math.sin(angle) * radius))
      };
      attempts++;
    }

    return location;
  }

  /**
   * Generate a location hint string from coordinates (for NPC dialogue)
   * @param {Object} targetLocation - Target location { x, y }
   * @param {Object} questGiverLocation - Quest giver's location { x, y }
   * @returns {string} Human-readable location hint
   */
  generateLocationHint(targetLocation, questGiverLocation) {
    const baseX = questGiverLocation?.x || 50;
    const baseY = questGiverLocation?.y || 50;
    const targetX = targetLocation?.x || 50;
    const targetY = targetLocation?.y || 50;

    const dx = targetX - baseX;
    const dy = targetY - baseY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Determine primary direction
    let direction = '';
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0) {
        direction = 'east';
      } else {
        direction = 'west';
      }
    } else {
      if (dy > 0) {
        direction = 'south';
      } else {
        direction = 'north';
      }
    }

    // Estimate distance in "clicks"
    const clicks = Math.round(distance / 5);
    
    if (clicks <= 2) {
      return `just ${direction} of here`;
    } else if (clicks <= 5) {
      return `a few clicks ${direction}`;
    } else if (clicks <= 10) {
      return `${clicks} clicks ${direction}`;
    } else {
      return `several clicks ${direction}`;
    }
  }
}

module.exports = new LocationCalculator();




