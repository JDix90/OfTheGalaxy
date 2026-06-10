/**
 * Dungeon Combat Trigger
 * Checks if player is within 1 adjacent cell of an enemy to trigger combat
 */

/**
 * Check if player is within 1 adjacent cell of any enemy
 * Uses Manhattan distance (|dx| + |dy| <= 1)
 * 
 * @param {Object} playerGridPos - Player position in grid coordinates { x, y }
 * @param {Array} enemies - Array of enemy objects with position property
 * @returns {Object} { shouldTrigger: boolean, enemy: Object|null, distance: number }
 */
export function checkCombatProximity(playerGridPos, enemies) {
  if (!enemies || enemies.length === 0) {
    return { shouldTrigger: false, enemy: null, distance: Infinity };
  }
  
  if (!playerGridPos || typeof playerGridPos.x !== 'number' || typeof playerGridPos.y !== 'number') {
    return { shouldTrigger: false, enemy: null, distance: Infinity };
  }
  
  let closestEnemy = null;
  let closestDistance = Infinity;
  
  for (const enemy of enemies) {
    // Skip defeated or in-combat enemies
    if (enemy.defeated || enemy.inCombat) continue;
    
    if (!enemy.position || typeof enemy.position.x !== 'number' || typeof enemy.position.y !== 'number') {
      continue;
    }
    
    // Calculate Manhattan distance
    const dx = Math.abs(playerGridPos.x - enemy.position.x);
    const dy = Math.abs(playerGridPos.y - enemy.position.y);
    const distance = dx + dy;
    
    // Check if adjacent (distance <= 1)
    if (distance <= 1) {
      // Track closest enemy (in case multiple are adjacent)
      if (distance < closestDistance) {
        closestDistance = distance;
        closestEnemy = enemy;
      }
    }
  }
  
  if (closestEnemy && closestDistance <= 1) {
    return {
      shouldTrigger: true,
      enemy: closestEnemy,
      distance: closestDistance
    };
  }
  
  return { shouldTrigger: false, enemy: null, distance: Infinity };
}

/**
 * Get all enemies within 1 adjacent cell (for multiple enemy encounters)
 * @param {Object} playerGridPos - Player position in grid coordinates
 * @param {Array} enemies - Array of enemy objects
 * @returns {Array} Array of enemy objects within range
 */
export function getAdjacentEnemies(playerGridPos, enemies) {
  if (!enemies || enemies.length === 0) return [];
  
  if (!playerGridPos || typeof playerGridPos.x !== 'number' || typeof playerGridPos.y !== 'number') {
    return [];
  }
  
  const adjacentEnemies = [];
  
  for (const enemy of enemies) {
    if (enemy.defeated || enemy.inCombat) continue;
    
    if (!enemy.position || typeof enemy.position.x !== 'number' || typeof enemy.position.y !== 'number') {
      continue;
    }
    
    const dx = Math.abs(playerGridPos.x - enemy.position.x);
    const dy = Math.abs(playerGridPos.y - enemy.position.y);
    const distance = dx + dy;
    
    if (distance <= 1) {
      adjacentEnemies.push(enemy);
    }
  }
  
  return adjacentEnemies;
}


