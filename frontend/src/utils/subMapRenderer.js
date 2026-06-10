/**
 * Sub-Map Renderer
 * Renders sub-maps (cities, buildings, interiors) on canvas
 */

/**
 * Render a sub-map on canvas
 */
export function renderSubMap(ctx, width, height, subMap, zoom = 1, pan = { x: 0, y: 0 }, hoverState = {}) {
  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  // Calculate center point for pan/zoom
  const centerX = width / 2;
  const centerY = height / 2;

  // Apply pan/zoom transformations
  ctx.save();
  ctx.translate(centerX + pan.x, centerY + pan.y);
  ctx.scale(zoom, zoom);
  ctx.translate(-centerX, -centerY);

  const layout = subMap.layoutData || subMap.layout || {};

  // Draw background/floor
  drawBackground(ctx, width, height, subMap.type);

  // Draw dungeon grid if this is a dungeon
  if (subMap.type === 'dungeon' && layout.grid) {
    drawDungeonGrid(ctx, width, height, layout);
  }

  // Draw zones (for non-dungeon submaps)
  if (subMap.type !== 'dungeon' && layout.zones && layout.zones.length > 0) {
    drawZones(ctx, width, height, layout.zones, subMap.type, layout);
  }

  // Draw rooms (for building interiors)
  if (subMap.type === 'building_interior' && layout.rooms && layout.rooms.length > 0) {
    drawRooms(ctx, width, height, layout.rooms, layout);
  }

  // Draw furniture (for building interiors)
  if (subMap.type === 'building_interior' && layout.furniture && layout.furniture.length > 0) {
    drawFurniture(ctx, width, height, layout.furniture, layout);
  }

  // Draw decorations (for building interiors)
  if (subMap.type === 'building_interior' && layout.decorations && layout.decorations.length > 0) {
    drawDecorations(ctx, width, height, layout.decorations, layout);
  }

  // Draw buildings/structures
  if (layout.buildings && layout.buildings.length > 0) {
    drawBuildings(ctx, width, height, layout.buildings, hoverState.hoveredBuilding, layout);
  }

  // Draw entry/exit points
  if (layout.entryPoints && layout.entryPoints.length > 0) {
    drawEntryPoints(ctx, width, height, layout.entryPoints, layout);
  }

  if (layout.exitPoints && layout.exitPoints.length > 0) {
    drawExitPoints(ctx, width, height, layout.exitPoints, layout);
  }

  // Draw points of interest
  if (layout.pointsOfInterest && layout.pointsOfInterest.length > 0) {
    drawPointsOfInterest(ctx, width, height, layout.pointsOfInterest, hoverState.hoveredPOI, layout);
  }

  // Draw NPCs (outside pan/zoom for now, will be drawn with player position)
  ctx.restore();

  // Draw NPCs with pan/zoom
  if (hoverState.npcs && hoverState.npcs.length > 0) {
    ctx.save();
    ctx.translate(centerX + pan.x, centerY + pan.y);
    ctx.scale(zoom, zoom);
    ctx.translate(-centerX, -centerY);
    drawNPCs(ctx, width, height, hoverState.npcs, hoverState.hoveredNPC, hoverState.selectedNPC, layout);
    ctx.restore();
  }
}

/**
 * Draw background/floor based on sub-map type
 */
function drawBackground(ctx, width, height, type) {
  const gridSize = 40; // Base grid size in pixels

  switch (type) {
    case 'city':
      // Urban floor - gray concrete
      ctx.fillStyle = '#4a5568';
      ctx.fillRect(0, 0, width, height);
      
      // Draw street grid
      ctx.strokeStyle = '#2d3748';
      ctx.lineWidth = 2;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      break;

    case 'spaceport':
      // Industrial floor - dark gray
      ctx.fillStyle = '#2d3748';
      ctx.fillRect(0, 0, width, height);
      
      // Landing pad markings
      ctx.strokeStyle = '#718096';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      for (let x = 0; x < width; x += gridSize * 2) {
        for (let y = 0; y < height; y += gridSize * 2) {
          ctx.strokeRect(x, y, gridSize, gridSize);
        }
      }
      ctx.setLineDash([]);
      break;

    case 'market':
      // Market floor - warm brown
      ctx.fillStyle = '#8b7355';
      ctx.fillRect(0, 0, width, height);
      
      // Market pattern (simple, no random needed for static background)
      ctx.fillStyle = '#9b8365';
      // Use a simple grid pattern instead of random
      for (let x = 0; x < width; x += 40) {
        for (let y = 0; y < height; y += 40) {
          if ((x + y) % 80 === 0) {
            ctx.fillRect(x, y, 10, 10);
          }
        }
      }
      break;

    case 'cantina':
      // Cantina floor - warm wood-like
      ctx.fillStyle = '#6b4e3d';
      ctx.fillRect(0, 0, width, height);
      
      // Wood planks
      ctx.strokeStyle = '#5a3e2d';
      ctx.lineWidth = 1;
      for (let y = 0; y < height; y += 20) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      break;

    case 'palace':
      // Palace floor - ornate marble
      ctx.fillStyle = '#e8e4d9';
      ctx.fillRect(0, 0, width, height);
      
      // Marble pattern
      ctx.strokeStyle = '#d4d0c5';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += gridSize) {
        for (let y = 0; y < height; y += gridSize) {
          ctx.strokeRect(x, y, gridSize, gridSize);
        }
      }
      break;

    case 'dungeon':
      // Dungeon floor - very dark, ominous
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, width, height);
      
      // Subtle texture pattern for depth
      ctx.fillStyle = '#0f0f0f';
      for (let x = 0; x < width; x += 20) {
        for (let y = 0; y < height; y += 20) {
          if ((x + y) % 40 === 0) {
            ctx.fillRect(x, y, 2, 2);
          }
        }
      }
      break;

    case 'building_interior':
      // Interior floor - warm, lived-in feel
      ctx.fillStyle = '#3a3528';
      ctx.fillRect(0, 0, width, height);
      
      // Floor tiles/planks
      ctx.strokeStyle = '#2a2518';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      
      // Add subtle texture
      ctx.fillStyle = '#4a4538';
      for (let x = 0; x < width; x += gridSize * 2) {
        for (let y = 0; y < height; y += gridSize * 2) {
          if ((x + y) % (gridSize * 4) === 0) {
            ctx.fillRect(x, y, gridSize / 2, gridSize / 2);
          }
        }
      }
      break;

    default:
      // Default floor
      ctx.fillStyle = '#4a5568';
      ctx.fillRect(0, 0, width, height);
  }
}

/**
 * Draw dungeon grid (maze structure)
 */
function drawDungeonGrid(ctx, width, height, layout) {
  const grid = layout.grid;
  if (!grid || !Array.isArray(grid) || grid.length === 0) return;

  const gridWidth = layout.size?.width || grid[0]?.length || 20;
  const gridHeight = layout.size?.height || grid.length || 20;
  
  const cellWidth = width / gridWidth;
  const cellHeight = height / gridHeight;

  // Draw each cell in the grid
  for (let y = 0; y < gridHeight; y++) {
    for (let x = 0; x < gridWidth; x++) {
      const cellValue = grid[y]?.[x] ?? 0;
      const pixelX = x * cellWidth;
      const pixelY = y * cellHeight;

      switch (cellValue) {
        case 0: // Wall (impassable)
          // Dark, solid walls with visible borders
          ctx.fillStyle = '#000000';
          ctx.fillRect(pixelX, pixelY, cellWidth, cellHeight);
          // Add visible border to make walls stand out
          ctx.strokeStyle = '#1a1a1a';
          ctx.lineWidth = 2;
          ctx.strokeRect(pixelX, pixelY, cellWidth, cellHeight);
          // Add texture pattern to walls
          ctx.fillStyle = '#0a0a0a';
          for (let py = pixelY; py < pixelY + cellHeight; py += 3) {
            for (let px = pixelX; px < pixelX + cellWidth; px += 3) {
              if ((px + py) % 6 === 0) {
                ctx.fillRect(px, py, 1, 1);
              }
            }
          }
          break;

        case 1: // Corridor (navigable) - MAKE THESE VERY VISIBLE AS PATHWAYS
          // Bright gray to clearly show pathways
          ctx.fillStyle = '#5a5a5a';
          ctx.fillRect(pixelX, pixelY, cellWidth, cellHeight);
          // Even brighter center to show it's a walkable path
          ctx.fillStyle = '#6a6a6a';
          ctx.fillRect(pixelX + 1, pixelY + 1, cellWidth - 2, cellHeight - 2);
          // Add visible border to define corridor edges clearly
          ctx.strokeStyle = '#4a4a4a';
          ctx.lineWidth = 1;
          ctx.strokeRect(pixelX, pixelY, cellWidth, cellHeight);
          // Add center marker to make corridors stand out
          ctx.fillStyle = '#7a7a7a';
          const centerX = pixelX + cellWidth / 2;
          const centerY = pixelY + cellHeight / 2;
          ctx.beginPath();
          ctx.arc(centerX, centerY, Math.min(cellWidth, cellHeight) * 0.15, 0, Math.PI * 2);
          ctx.fill();
          break;

        case 2: // Room (combat/loot area) - distinct from corridors but still navigable
          // Slightly darker than corridors to distinguish rooms
          ctx.fillStyle = '#3a3a3a';
          ctx.fillRect(pixelX, pixelY, cellWidth, cellHeight);
          // Room highlight
          ctx.fillStyle = '#4a4a4a';
          ctx.fillRect(pixelX + 1, pixelY + 1, cellWidth - 2, cellHeight - 2);
          // Room border - thicker and more visible to show room boundaries
          ctx.strokeStyle = '#666666';
          ctx.lineWidth = 2;
          ctx.strokeRect(pixelX, pixelY, cellWidth, cellHeight);
          break;

        case 3: // Entrance (safe zone)
          ctx.fillStyle = '#2a4a2a';
          ctx.fillRect(pixelX, pixelY, cellWidth, cellHeight);
          // Entrance highlight
          ctx.fillStyle = '#3a6a3a';
          ctx.fillRect(pixelX + 1, pixelY + 1, cellWidth - 2, cellHeight - 2);
          // Entrance border
          ctx.strokeStyle = '#4a8a4a';
          ctx.lineWidth = 2;
          ctx.strokeRect(pixelX, pixelY, cellWidth, cellHeight);
          break;

        case 4: // Boss room
          ctx.fillStyle = '#4a2a2a';
          ctx.fillRect(pixelX, pixelY, cellWidth, cellHeight);
          // Boss room highlight (ominous red)
          ctx.fillStyle = '#6a3a3a';
          ctx.fillRect(pixelX + 1, pixelY + 1, cellWidth - 2, cellHeight - 2);
          // Boss room border (threatening red)
          ctx.strokeStyle = '#8a4a4a';
          ctx.lineWidth = 2;
          ctx.strokeRect(pixelX, pixelY, cellWidth, cellHeight);
          break;

        default:
          // Unknown cell type - treat as wall
          ctx.fillStyle = '#0a0a0a';
          ctx.fillRect(pixelX, pixelY, cellWidth, cellHeight);
      }
    }
  }

  // Draw rooms with labels if available
  if (layout.rooms && Array.isArray(layout.rooms)) {
    layout.rooms.forEach((room, index) => {
      const roomX = (room.x / gridWidth) * width;
      const roomY = (room.y / gridHeight) * height;
      const roomW = (room.width / gridWidth) * width;
      const roomH = (room.height / gridHeight) * height;

      // Draw room outline
      ctx.strokeStyle = '#666666';
      ctx.lineWidth = 2;
      ctx.strokeRect(roomX, roomY, roomW, roomH);

      // Draw room label if it has a name
      if (room.id || room.name) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '9px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
        ctx.shadowBlur = 3;
        ctx.fillText(room.name || room.id || `Room ${index + 1}`, roomX + roomW / 2, roomY + roomH / 2);
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
      }
    });
  }

  // Draw boss room marker if available
  if (layout.bossRoom) {
    const bossX = (layout.bossRoom.x / gridWidth) * width;
    const bossY = (layout.bossRoom.y / gridHeight) * height;

    // Draw boss room indicator
    ctx.fillStyle = '#ff4444';
    ctx.beginPath();
    ctx.arc(bossX, bossY, Math.min(cellWidth, cellHeight) * 0.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Draw label
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 3;
    ctx.fillText('BOSS', bossX, bossY - 8);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  }
}

/**
 * Draw zones
 */
function drawZones(ctx, width, height, zones, subMapType, layout) {
  const gridSize = layout?.gridSize || 40; // Base grid size
  const mapWidth = layout?.width || 15; // Grid units
  const mapHeight = layout?.height || 15; // Grid units

  zones.forEach(zone => {
    // Convert grid coordinates to pixels
    const x = (zone.bounds.x / mapWidth) * width;
    const y = (zone.bounds.y / mapHeight) * height;
    const w = (zone.bounds.width / mapWidth) * width;
    const h = (zone.bounds.height / mapHeight) * height;

    // Draw zone based on type
    switch (zone.type) {
      case 'street':
        ctx.fillStyle = 'rgba(100, 100, 100, 0.3)';
        ctx.fillRect(x, y, w, h);
        break;
      case 'residential':
        ctx.fillStyle = 'rgba(150, 150, 200, 0.2)';
        ctx.fillRect(x, y, w, h);
        break;
      case 'commercial':
        ctx.fillStyle = 'rgba(200, 150, 150, 0.2)';
        ctx.fillRect(x, y, w, h);
        break;
      case 'landing_pad':
        ctx.fillStyle = 'rgba(100, 100, 100, 0.5)';
        ctx.fillRect(x, y, w, h);
        // Landing pad circle
        ctx.strokeStyle = '#718096';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x + w/2, y + h/2, Math.min(w, h) / 2, 0, Math.PI * 2);
        ctx.stroke();
        break;
      case 'market':
        ctx.fillStyle = 'rgba(200, 180, 150, 0.3)';
        ctx.fillRect(x, y, w, h);
        break;
      default:
        ctx.fillStyle = 'rgba(150, 150, 150, 0.2)';
        ctx.fillRect(x, y, w, h);
    }
  });
}

/**
 * Draw buildings/structures
 */
function drawBuildings(ctx, width, height, buildings, hoveredBuilding, layout) {
  const gridSize = layout?.gridSize || 40;
  const mapWidth = layout?.width || 15;
  const mapHeight = layout?.height || 15;

  buildings.forEach(building => {
    // Convert grid coordinates to pixels
    const x = (building.position.x / mapWidth) * width;
    const y = (building.position.y / mapHeight) * height;
    const w = (building.size.width / mapWidth) * width;
    const h = (building.size.height / mapHeight) * height;

    const isHovered = hoveredBuilding && hoveredBuilding.id === building.id;

    // Draw building based on type
    switch (building.type) {
      case 'residential':
        ctx.fillStyle = isHovered ? '#8b9dc3' : '#6b7fa3';
        break;
      case 'commercial':
        ctx.fillStyle = isHovered ? '#c3a88b' : '#a37f6b';
        break;
      case 'vendor_stall':
        ctx.fillStyle = isHovered ? '#c3c38b' : '#a3a36b';
        break;
      case 'crafting_bench':
        ctx.fillStyle = isHovered ? '#34d399' : '#059669';
        break;
      default:
        ctx.fillStyle = isHovered ? '#9d9d9d' : '#7d7d7d';
    }

    ctx.fillRect(x, y, w, h);

    // Special rendering for crafting bench
    if (building.type === 'crafting_bench') {
      // Draw hammer/tool icon in center
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🔨', x + w/2, y + h/2);
    }

    // Draw doors as single-cell gridlines on building edges - color-coded for status
    if (building.collision && building.collision.doors && building.collision.doors.length > 0) {
      building.collision.doors.forEach(door => {
        // Convert door position to pixel coordinates
        const doorGridX = door.position.x;
        const doorGridY = door.position.y;
        const doorPixelX = (doorGridX / mapWidth) * width;
        const doorPixelY = (doorGridY / mapHeight) * height;
        
        // Calculate cell size for grid-based rendering
        const cellWidth = width / mapWidth;
        const cellHeight = height / mapHeight;
        
        // Determine which edge the door is on
        const buildingLeft = (building.position.x / mapWidth) * width;
        const buildingRight = ((building.position.x + building.size.width) / mapWidth) * width;
        const buildingTop = (building.position.y / mapHeight) * height;
        const buildingBottom = ((building.position.y + building.size.height) / mapHeight) * height;
        
        const tolerance = cellWidth * 0.3; // Tolerance for edge detection
        const isOnTopEdge = Math.abs(doorPixelY - buildingTop) < tolerance;
        const isOnBottomEdge = Math.abs(doorPixelY - buildingBottom) < tolerance;
        const isOnLeftEdge = Math.abs(doorPixelX - buildingLeft) < tolerance;
        const isOnRightEdge = Math.abs(doorPixelX - buildingRight) < tolerance;
        
        // Draw door as a single-cell gridline (half size)
        if (isOnTopEdge || isOnBottomEdge) {
          // Horizontal door (top or bottom edge) - draw as a horizontal line
          const doorLineY = isOnTopEdge ? buildingTop : buildingBottom;
          const doorLineX = doorPixelX - cellWidth / 4; // Half width
          const doorLineWidth = cellWidth / 2; // Half size
          
          // Color-code: Red for locked, Green for unlocked
          if (door.locked) {
            // Locked door - RED
            ctx.strokeStyle = '#dc2626'; // Red
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(doorLineX, doorLineY);
            ctx.lineTo(doorLineX + doorLineWidth, doorLineY);
            ctx.stroke();
            
            // Add a subtle red glow
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(doorLineX, doorLineY);
            ctx.lineTo(doorLineX + doorLineWidth, doorLineY);
            ctx.stroke();
          } else {
            // Unlocked door - GREEN
            ctx.strokeStyle = '#22c55e'; // Green
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(doorLineX, doorLineY);
            ctx.lineTo(doorLineX + doorLineWidth, doorLineY);
            ctx.stroke();
            
            // Add a subtle green glow
            ctx.strokeStyle = '#16a34a';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(doorLineX, doorLineY);
            ctx.lineTo(doorLineX + doorLineWidth, doorLineY);
            ctx.stroke();
          }
        } else if (isOnLeftEdge || isOnRightEdge) {
          // Vertical door (left or right edge) - draw as a vertical line
          const doorLineX = isOnLeftEdge ? buildingLeft : buildingRight;
          const doorLineY = doorPixelY - cellHeight / 4; // Half height
          const doorLineHeight = cellHeight / 2; // Half size
          
          // Color-code: Red for locked, Green for unlocked
          if (door.locked) {
            // Locked door - RED
            ctx.strokeStyle = '#dc2626'; // Red
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(doorLineX, doorLineY);
            ctx.lineTo(doorLineX, doorLineY + doorLineHeight);
            ctx.stroke();
            
            // Add a subtle red glow
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(doorLineX, doorLineY);
            ctx.lineTo(doorLineX, doorLineY + doorLineHeight);
            ctx.stroke();
          } else {
            // Unlocked door - GREEN
            ctx.strokeStyle = '#22c55e'; // Green
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(doorLineX, doorLineY);
            ctx.lineTo(doorLineX, doorLineY + doorLineHeight);
            ctx.stroke();
            
            // Add a subtle green glow
            ctx.strokeStyle = '#16a34a';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(doorLineX, doorLineY);
            ctx.lineTo(doorLineX, doorLineY + doorLineHeight);
            ctx.stroke();
          }
        } else {
          // Door position doesn't match an edge - draw as a small colored square at position
          const doorSize = Math.min(cellWidth, cellHeight) * 0.3; // Half size
          if (door.locked) {
            // Locked door - RED square
            ctx.fillStyle = '#dc2626';
            ctx.fillRect(doorPixelX - doorSize/2, doorPixelY - doorSize/2, doorSize, doorSize);
            ctx.strokeStyle = '#991b1b';
            ctx.lineWidth = 2;
            ctx.strokeRect(doorPixelX - doorSize/2, doorPixelY - doorSize/2, doorSize, doorSize);
          } else {
            // Unlocked door - GREEN square
            ctx.fillStyle = '#22c55e';
            ctx.fillRect(doorPixelX - doorSize/2, doorPixelY - doorSize/2, doorSize, doorSize);
            ctx.strokeStyle = '#16a34a';
            ctx.lineWidth = 2;
            ctx.strokeRect(doorPixelX - doorSize/2, doorPixelY - doorSize/2, doorSize, doorSize);
          }
        }
      });
    }

    // Draw border AFTER doors so border is on top
    ctx.strokeStyle = isHovered ? '#fbbf24' : (building.type === 'crafting_bench' ? '#10b981' : '#4a5568');
    ctx.lineWidth = isHovered ? 3 : 2;
    ctx.strokeRect(x, y, w, h);

    // Draw label
    if (isHovered || building.name) {
      ctx.fillStyle = '#ffffff';
      ctx.font = isHovered ? 'bold 11px sans-serif' : '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 2;
      ctx.fillText(building.name, x + w/2, y + h + 2);
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
    }
  });
}

/**
 * Draw entry points
 */
function drawEntryPoints(ctx, width, height, entryPoints, layout) {
  // For dungeons, use size.width/height; for others, use width/height
  const mapWidth = layout?.size?.width || layout?.width || 15;
  const mapHeight = layout?.size?.height || layout?.height || 15;

  entryPoints.forEach(point => {
    // Convert grid coordinates to pixels
    const x = (point.position.x / mapWidth) * width;
    const y = (point.position.y / mapHeight) * height;

    // Draw entry marker
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#16a34a';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw label
    ctx.fillStyle = '#ffffff';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 2;
    ctx.fillText(point.label || 'Entry', x, y - 10);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  });
}

/**
 * Draw exit points
 */
function drawExitPoints(ctx, width, height, exitPoints, layout) {
  // For dungeons, use size.width/height; for others, use width/height
  const mapWidth = layout?.size?.width || layout?.width || 15;
  const mapHeight = layout?.size?.height || layout?.height || 15;

  exitPoints.forEach(point => {
    // Convert grid coordinates to pixels
    const x = (point.position.x / mapWidth) * width;
    const y = (point.position.y / mapHeight) * height;

    // Draw exit marker
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw label
    ctx.fillStyle = '#ffffff';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 2;
    ctx.fillText(point.label || 'Exit', x, y + 10);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  });
}

/**
 * Draw points of interest
 */
function drawPointsOfInterest(ctx, width, height, pois, hoveredPOI, layout) {
  const mapWidth = layout?.width || 15;
  const mapHeight = layout?.height || 15;

  pois.forEach(poi => {
    // Convert grid coordinates to pixels
    const x = (poi.position.x / mapWidth) * width;
    const y = (poi.position.y / mapHeight) * height;

    const isHovered = hoveredPOI && hoveredPOI.id === poi.id;

    // Draw POI marker
    ctx.fillStyle = isHovered ? '#fbbf24' : '#60a5fa';
    ctx.beginPath();
    ctx.arc(x, y, isHovered ? 6 : 5, 0, Math.PI * 2);
    ctx.fill();

    // Draw label
    if (isHovered || poi.name) {
      ctx.fillStyle = '#ffffff';
      ctx.font = isHovered ? 'bold 11px sans-serif' : '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 2;
      ctx.fillText(poi.name, x, y - 8);
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
    }
  });
}

/**
 * Draw NPCs on sub-map
 */
function drawNPCs(ctx, width, height, npcs, hoveredNPC, selectedNPC, layout) {
  if (!npcs || npcs.length === 0) return;

  const mapWidth = layout?.width || 15;
  const mapHeight = layout?.height || 15;

  npcs.forEach(npc => {
    const location = npc.location || {};
    
    // Convert grid coordinates to pixels
    // NPCs in sub-maps use grid coordinates (0-15), not percentages
    // If coordinates are > mapWidth/Height, they're likely percentages (0-100) and need conversion
    let npcX = location.x;
    let npcY = location.y;
    
    // Check if coordinates are percentages (0-100) instead of grid coordinates (0-15)
    if (npcX > mapWidth || npcY > mapHeight) {
      // Convert percentage to grid coordinates
      npcX = Math.round((npcX / 100) * mapWidth);
      npcY = Math.round((npcY / 100) * mapHeight);
      // Clamp to valid range
      npcX = Math.max(0, Math.min(mapWidth - 1, npcX));
      npcY = Math.max(0, Math.min(mapHeight - 1, npcY));
    }
    
    const x = (npcX / mapWidth) * width;
    const y = (npcY / mapHeight) * height;
    
    // Debug log for tutorial NPC (only log once per NPC, not every frame)
    if (npc.id && npc.id.startsWith('npc_tutorial_')) {
      // Only log if coordinates are invalid (warning case)
      // Remove the verbose logging that happens every frame
      if (npcX < 0 || npcX >= mapWidth || npcY < 0 || npcY >= mapHeight) {
        console.warn(`[SubMapRenderer] Tutorial NPC ${npc.id} has invalid coordinates, using center of map`);
        const centerX = Math.floor(mapWidth / 2);
        const centerY = Math.floor(mapHeight / 2);
        const centerScreenX = (centerX / mapWidth) * width;
        const centerScreenY = (centerY / mapHeight) * height;
        // Use center coordinates for rendering
        const finalX = centerScreenX;
        const finalY = centerScreenY;
        
        // Render with center coordinates
        ctx.beginPath();
        ctx.arc(finalX, finalY, 8, 0, Math.PI * 2); // Slightly larger for visibility
        ctx.fillStyle = '#fbbf24'; // Yellow for quest giver
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Always show name for tutorial NPC
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 2;
        ctx.fillText(npc.name, finalX, finalY - 10);
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        return; // Skip normal rendering
      }
    }

    const isSelected = selectedNPC?.id === npc.id;
    const isHovered = hoveredNPC === npc.id;
    const isTutorialNPC = npc.id && npc.id.startsWith('npc_tutorial_');

    // NPC marker - make tutorial NPCs larger and more visible
    const radius = isTutorialNPC ? 10 : (isSelected ? 8 : isHovered ? 7 : 6);
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    
    // Color based on NPC type
    let color = '#60a5fa'; // Default blue
    if (npc.npcType === 'quest_giver') color = '#fbbf24'; // Yellow
    else if (npc.npcType === 'vendor') color = '#34d399'; // Green
    else if (npc.npcType === 'companion') color = '#a78bfa'; // Purple
    else if (npc.npcType === 'faction_leader') color = '#ef4444'; // Red
    
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = isTutorialNPC ? '#ffffff' : (isSelected ? '#ffffff' : '#1e293b');
    ctx.lineWidth = isTutorialNPC ? 4 : (isSelected ? 3 : 2);
    ctx.stroke();

    // NPC name - always show for tutorial NPCs
    if (isSelected || isHovered || isTutorialNPC) {
      ctx.fillStyle = '#ffffff';
      ctx.font = (isSelected || isTutorialNPC) ? 'bold 12px sans-serif' : '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 2;
      ctx.fillText(npc.name, x, y - (radius + 2));
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
    }
  });
}

/**
 * Draw player position
 */
/**
 * Draw rooms for building interiors
 */
function drawRooms(ctx, width, height, rooms, layout) {
  const gridWidth = layout.width || 10;
  const gridHeight = layout.height || 10;
  const cellWidth = width / gridWidth;
  const cellHeight = height / gridHeight;

  rooms.forEach((room) => {
    const roomX = (room.x / gridWidth) * width;
    const roomY = (room.y / gridHeight) * height;
    const roomW = (room.width / gridWidth) * width;
    const roomH = (room.height / gridHeight) * height;

    // Draw room background (slightly different shade)
    ctx.fillStyle = '#4a4538';
    ctx.fillRect(roomX, roomY, roomW, roomH);

    // Draw room border
    ctx.strokeStyle = '#5a5548';
    ctx.lineWidth = 2;
    ctx.strokeRect(roomX, roomY, roomW, roomH);

    // Draw room label
    if (room.name) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 2;
      ctx.fillText(room.name, roomX + roomW / 2, roomY + 5);
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
    }
  });
}

/**
 * Draw furniture for building interiors
 */
function drawFurniture(ctx, width, height, furniture, layout) {
  const gridWidth = layout.width || 10;
  const gridHeight = layout.height || 10;
  const cellWidth = width / gridWidth;
  const cellHeight = height / gridHeight;

  furniture.forEach((item) => {
    const itemX = (item.position.x / gridWidth) * width;
    const itemY = (item.position.y / gridHeight) * height;
    const itemW = ((item.size?.width || 1) / gridWidth) * width;
    const itemH = ((item.size?.height || 1) / gridHeight) * height;

    // Draw furniture based on type
    switch (item.type) {
      case 'bed':
        // Bed - rectangular with pillow
        ctx.fillStyle = '#6b5b4f';
        ctx.fillRect(itemX, itemY, itemW, itemH);
        ctx.strokeStyle = '#5a4a3e';
        ctx.lineWidth = 1;
        ctx.strokeRect(itemX, itemY, itemW, itemH);
        // Pillow
        ctx.fillStyle = '#8b7b6f';
        ctx.fillRect(itemX + itemW * 0.1, itemY, itemW * 0.3, itemH * 0.4);
        break;
      case 'table':
        // Table - simple rectangle
        ctx.fillStyle = '#5a4a3e';
        ctx.fillRect(itemX, itemY, itemW, itemH);
        ctx.strokeStyle = '#4a3a2e';
        ctx.lineWidth = 1;
        ctx.strokeRect(itemX, itemY, itemW, itemH);
        break;
      case 'chair':
        // Chair - small square
        ctx.fillStyle = '#6b5b4f';
        ctx.fillRect(itemX, itemY, itemW, itemH);
        ctx.strokeStyle = '#5a4a3e';
        ctx.lineWidth = 1;
        ctx.strokeRect(itemX, itemY, itemW, itemH);
        break;
      case 'storage':
      case 'chest':
        // Storage - box with lid
        ctx.fillStyle = '#5a4a3e';
        ctx.fillRect(itemX, itemY, itemW, itemH);
        ctx.strokeStyle = '#4a3a2e';
        ctx.lineWidth = 2;
        ctx.strokeRect(itemX, itemY, itemW, itemH);
        // Lid
        ctx.fillStyle = '#6b5b4f';
        ctx.fillRect(itemX, itemY, itemW, itemH * 0.3);
        break;
      case 'counter':
        // Counter - long rectangle
        ctx.fillStyle = '#6b5b4f';
        ctx.fillRect(itemX, itemY, itemW, itemH);
        ctx.strokeStyle = '#5a4a3e';
        ctx.lineWidth = 2;
        ctx.strokeRect(itemX, itemY, itemW, itemH);
        break;
      case 'shelf':
        // Shelf - vertical rectangle
        ctx.fillStyle = '#5a4a3e';
        ctx.fillRect(itemX, itemY, itemW, itemH);
        ctx.strokeStyle = '#4a3a2e';
        ctx.lineWidth = 1;
        ctx.strokeRect(itemX, itemY, itemW, itemH);
        // Shelf dividers
        for (let i = 1; i < 3; i++) {
          ctx.beginPath();
          ctx.moveTo(itemX, itemY + (itemH / 3) * i);
          ctx.lineTo(itemX + itemW, itemY + (itemH / 3) * i);
          ctx.stroke();
        }
        break;
      case 'display':
        // Display case - glass-like
        ctx.fillStyle = '#7a8a9a';
        ctx.fillRect(itemX, itemY, itemW, itemH);
        ctx.strokeStyle = '#6a7a8a';
        ctx.lineWidth = 2;
        ctx.strokeRect(itemX, itemY, itemW, itemH);
        // Glass reflection
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(itemX, itemY, itemW * 0.3, itemH);
        break;
      default:
        // Generic furniture
        ctx.fillStyle = '#6b5b4f';
        ctx.fillRect(itemX, itemY, itemW, itemH);
        ctx.strokeStyle = '#5a4a3e';
        ctx.lineWidth = 1;
        ctx.strokeRect(itemX, itemY, itemW, itemH);
    }
  });
}

/**
 * Draw decorations for building interiors
 */
function drawDecorations(ctx, width, height, decorations, layout) {
  const gridWidth = layout.width || 10;
  const gridHeight = layout.height || 10;
  const cellWidth = width / gridWidth;
  const cellHeight = height / gridHeight;

  decorations.forEach((decoration) => {
    const decX = (decoration.position.x / gridWidth) * width;
    const decY = (decoration.position.y / gridHeight) * height;
    const decW = ((decoration.size?.width || 1) / gridWidth) * width;
    const decH = ((decoration.size?.height || 1) / gridHeight) * height;

    switch (decoration.type) {
      case 'wall_art':
        // Wall art - simple frame
        ctx.strokeStyle = '#8b7b6f';
        ctx.lineWidth = 2;
        ctx.strokeRect(decX, decY, decW, decH);
        ctx.fillStyle = '#6b5b4f';
        ctx.fillRect(decX + 2, decY + 2, decW - 4, decH - 4);
        break;
      case 'light':
        // Light fixture - glowing circle
        const radius = Math.min(decW, decH) / 2;
        const gradient = ctx.createRadialGradient(decX + decW / 2, decY + decH / 2, 0, decX + decW / 2, decY + decH / 2, radius);
        gradient.addColorStop(0, 'rgba(255, 255, 200, 0.8)');
        gradient.addColorStop(0.5, 'rgba(255, 255, 150, 0.4)');
        gradient.addColorStop(1, 'rgba(255, 255, 100, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(decX + decW / 2, decY + decH / 2, radius, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'sign':
        // Sign - rectangular board
        ctx.fillStyle = '#8b7b6f';
        ctx.fillRect(decX, decY, decW, decH);
        ctx.strokeStyle = '#6b5b4f';
        ctx.lineWidth = 2;
        ctx.strokeRect(decX, decY, decW, decH);
        break;
      default:
        // Generic decoration
        ctx.fillStyle = '#7a6b5f';
        ctx.fillRect(decX, decY, decW, decH);
    }
  });
}

export function drawPlayerPosition(ctx, width, height, playerPosition, gridSize) {
  if (!playerPosition || !playerPosition.x || !playerPosition.y) return;

  const x = (playerPosition.x / 100) * width;
  const y = (playerPosition.y / 100) * height;

  // Draw player marker
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.arc(x, y, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Draw label
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  ctx.shadowBlur = 2;
  ctx.fillText('You', x, y + 10);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
}

