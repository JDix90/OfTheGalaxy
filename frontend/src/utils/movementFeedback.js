/**
 * Movement Feedback Utility
 * Provides visual feedback for player movement and blocked paths
 */

/**
 * Draw blocked movement indicator
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} x - X position (screen coordinates)
 * @param {number} y - Y position (screen coordinates)
 * @param {string} obstacleName - Name of the obstacle blocking movement
 */
export function drawBlockedMovementIndicator(ctx, x, y, obstacleName) {
  ctx.save();
  
  // Draw pulsing red circle
  const time = Date.now() / 1000;
  const pulseScale = 1 + Math.sin(time * 4) * 0.2; // Pulse faster for urgency
  const alpha = 0.6 + Math.sin(time * 4) * 0.2;
  
  // Outer glow
  const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, 20 * pulseScale);
  glowGradient.addColorStop(0, `rgba(239, 68, 68, ${alpha * 0.8})`);
  glowGradient.addColorStop(0.5, `rgba(239, 68, 68, ${alpha * 0.4})`);
  glowGradient.addColorStop(1, 'rgba(239, 68, 68, 0)');
  ctx.fillStyle = glowGradient;
  ctx.beginPath();
  ctx.arc(x, y, 20 * pulseScale, 0, Math.PI * 2);
  ctx.fill();
  
  // Inner circle
  ctx.fillStyle = `rgba(239, 68, 68, ${alpha})`;
  ctx.beginPath();
  ctx.arc(x, y, 8 * pulseScale, 0, Math.PI * 2);
  ctx.fill();
  
  // X mark
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - 5, y - 5);
  ctx.lineTo(x + 5, y + 5);
  ctx.moveTo(x + 5, y - 5);
  ctx.lineTo(x - 5, y + 5);
  ctx.stroke();
  
  // Draw obstacle name tooltip
  if (obstacleName) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(x - 40, y - 30, 80, 20);
    ctx.fillStyle = '#ffffff';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Blocked: ${obstacleName}`, x, y - 20);
  }
  
  ctx.restore();
}

/**
 * Draw movement direction indicator
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} fromX - Starting X position
 * @param {number} fromY - Starting Y position
 * @param {number} toX - Target X position
 * @param {number} toY - Target Y position
 */
export function drawMovementDirection(ctx, fromX, fromY, toX, toY) {
  ctx.save();
  
  // Draw arrow
  const angle = Math.atan2(toY - fromY, toX - fromX);
  const arrowLength = 15;
  const arrowHeadSize = 6;
  
  ctx.strokeStyle = 'rgba(34, 197, 94, 0.8)';
  ctx.fillStyle = 'rgba(34, 197, 94, 0.8)';
  ctx.lineWidth = 2;
  
  // Draw arrow line
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(
    fromX + Math.cos(angle) * arrowLength,
    fromY + Math.sin(angle) * arrowLength
  );
  ctx.stroke();
  
  // Draw arrow head
  ctx.beginPath();
  const headX = fromX + Math.cos(angle) * arrowLength;
  const headY = fromY + Math.sin(angle) * arrowLength;
  ctx.moveTo(headX, headY);
  ctx.lineTo(
    headX - Math.cos(angle - Math.PI / 6) * arrowHeadSize,
    headY - Math.sin(angle - Math.PI / 6) * arrowHeadSize
  );
  ctx.lineTo(
    headX - Math.cos(angle + Math.PI / 6) * arrowHeadSize,
    headY - Math.sin(angle + Math.PI / 6) * arrowHeadSize
  );
  ctx.closePath();
  ctx.fill();
  
  ctx.restore();
}

