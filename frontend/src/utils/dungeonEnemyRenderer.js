/**
 * Dungeon Enemy Renderer
 * Renders enemy combatants on dungeon submaps with red icons and animations
 */

/**
 * Draw a single enemy icon
 */
function drawEnemyIcon(ctx, x, y, enemy, isHovered, pulsePhase = 0) {
  const radius = isHovered ? 12 : 10;
  
  // Red fill
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  
  // White border
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.stroke();
  
  // Pulsing animation (if not in combat and not defeated)
  if (!enemy.inCombat && !enemy.defeated) {
    const pulseOpacity = 0.5 + (Math.sin(pulsePhase) * 0.3);
    ctx.strokeStyle = `rgba(239, 68, 68, ${pulseOpacity})`;
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  
  // If defeated, gray out
  if (enemy.defeated) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // Label
  if (!enemy.defeated) {
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 2;
    ctx.fillText(enemy.name || 'Enemy', x, y + radius + 4);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  }
}

/**
 * Draw enemy tooltip
 */
function drawEnemyTooltip(ctx, x, y, enemy) {
  const tooltipWidth = 150;
  const tooltipHeight = 80;
  const tooltipX = x - tooltipWidth / 2;
  const tooltipY = y - tooltipHeight - 20;
  
  // Background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
  ctx.fillRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);
  
  // Border
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 2;
  ctx.strokeRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);
  
  // Text
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(enemy.name || 'Enemy', tooltipX + 10, tooltipY + 10);
  
  ctx.font = '10px sans-serif';
  ctx.fillText(`Level: ${enemy.level}`, tooltipX + 10, tooltipY + 28);
  ctx.fillText(`Difficulty: ${enemy.difficultyTier || 'moderate'}`, tooltipX + 10, tooltipY + 43);
  ctx.fillText(`Zone: ${enemy.depthZone || 'unknown'}`, tooltipX + 10, tooltipY + 58);
  
  // Health bar (if visible)
  if (enemy.stats && enemy.stats.maxHealth) {
    const healthPercent = enemy.stats.health / enemy.stats.maxHealth;
    const barWidth = tooltipWidth - 20;
    const barHeight = 4;
    const barX = tooltipX + 10;
    const barY = tooltipY + 70;
    
    // Background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(barX, barY, barWidth, barHeight);
    
    // Health
    ctx.fillStyle = healthPercent > 0.5 ? '#4ade80' : healthPercent > 0.25 ? '#fbbf24' : '#ef4444';
    ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
  }
}

/**
 * Draw all dungeon enemies
 */
export function drawDungeonEnemies(ctx, width, height, enemies, grid, layout, hoveredEnemy) {
  if (!enemies || enemies.length === 0) return;
  
  const gridWidth = layout.size?.width || layout.width || 20;
  const gridHeight = layout.size?.height || layout.height || 20;
  const cellWidth = width / gridWidth;
  const cellHeight = height / gridHeight;
  
  // Calculate pulse phase for animation
  const pulsePhase = (Date.now() / 500) % (Math.PI * 2);
  
  enemies.forEach(enemy => {
    // Draw all enemies, including defeated ones (grayed out)
    // Convert grid coordinates to pixel coordinates (center of cell)
    const pixelX = (enemy.position.x + 0.5) * cellWidth;
    const pixelY = (enemy.position.y + 0.5) * cellHeight;
    
    // Draw enemy icon (defeated enemies are grayed out in drawEnemyIcon)
    drawEnemyIcon(ctx, pixelX, pixelY, enemy, hoveredEnemy?.id === enemy.id, pulsePhase);
    
    // Draw tooltip if hovered (show different tooltip for defeated enemies)
    if (hoveredEnemy?.id === enemy.id) {
      if (enemy.defeated) {
        drawDefeatedEnemyTooltip(ctx, pixelX, pixelY, enemy);
      } else {
        drawEnemyTooltip(ctx, pixelX, pixelY, enemy);
      }
    }
  });
}

/**
 * Draw tooltip for defeated enemy (shows search option)
 */
function drawDefeatedEnemyTooltip(ctx, x, y, enemy) {
  const tooltipWidth = 180;
  const tooltipHeight = 60;
  const tooltipX = x - tooltipWidth / 2;
  const tooltipY = y - tooltipHeight - 20;
  
  // Background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
  ctx.fillRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);
  
  // Border
  ctx.strokeStyle = '#666666';
  ctx.lineWidth = 2;
  ctx.strokeRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);
  
  // Text
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(enemy.name || 'Defeated Enemy', tooltipX + tooltipWidth / 2, tooltipY + 10);
  
  ctx.font = '10px sans-serif';
  if (enemy.searched) {
    ctx.fillStyle = '#888888';
    ctx.fillText('Already searched', tooltipX + tooltipWidth / 2, tooltipY + 30);
  } else {
    ctx.fillStyle = '#4ade80';
    ctx.fillText('Click to search for loot', tooltipX + tooltipWidth / 2, tooltipY + 30);
  }
}

/**
 * Check if a point (in pixel coordinates) is over an enemy
 */
export function getEnemyAtPoint(x, y, enemies, layout, width, height) {
  if (!enemies || enemies.length === 0) return null;
  
  const gridWidth = layout.size?.width || layout.width || 20;
  const gridHeight = layout.size?.height || layout.height || 20;
  const cellWidth = width / gridWidth;
  const cellHeight = height / gridHeight;
  
  // Convert pixel to grid coordinates
  const gridX = Math.floor(x / cellWidth);
  const gridY = Math.floor(y / cellHeight);
  
  // Check each enemy (including defeated ones for searching)
  for (const enemy of enemies) {
    const enemyGridX = enemy.position.x;
    const enemyGridY = enemy.position.y;
    
    // Check if point is within enemy's cell (with some tolerance)
    if (Math.abs(gridX - enemyGridX) <= 1 && Math.abs(gridY - enemyGridY) <= 1) {
      // Check if point is within icon radius
      const enemyPixelX = (enemyGridX + 0.5) * cellWidth;
      const enemyPixelY = (enemyGridY + 0.5) * cellHeight;
      const distance = Math.sqrt(
        Math.pow(x - enemyPixelX, 2) + Math.pow(y - enemyPixelY, 2)
      );
      
      if (distance <= 12) { // Icon radius + tolerance
        return enemy;
      }
    }
  }
  
  return null;
}

