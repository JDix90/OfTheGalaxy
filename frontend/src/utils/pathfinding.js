/**
 * A* Pathfinding Implementation for Planet Maps
 * Uses Nav-Mesh data structure for pathfinding
 */

/**
 * A* pathfinding algorithm
 * @param {Object} navMesh - Nav-Mesh data structure
 * @param {Object} start - Start point {x, y}
 * @param {Object} end - End point {x, y}
 * @returns {Array} Path as array of points, or null if no path found
 */
export function findPath(navMesh, start, end) {
  if (!navMesh || !navMesh.polygons || !navMesh.connections) {
    console.error('[Pathfinding] Invalid Nav-Mesh data');
    return null;
  }

  // Find polygons containing start and end points
  const startPolygon = findPolygonContainingPoint(navMesh.polygons, start);
  const endPolygon = findPolygonContainingPoint(navMesh.polygons, end);

  if (!startPolygon) {
    console.warn(`[Pathfinding] Start point (${start.x}, ${start.y}) not in any polygon`);
    return null;
  }

  if (!endPolygon) {
    console.warn(`[Pathfinding] End point (${end.x}, ${end.y}) not in any polygon`);
    return null;
  }

  // If start and end are in the same polygon, return direct path
  if (startPolygon.id === endPolygon.id) {
    return [start, end];
  }

  // Run A* algorithm
  const path = aStar(navMesh, startPolygon, endPolygon, start, end);

  if (!path) {
    console.warn('[Pathfinding] No path found');
    return null;
  }

  // Smooth path and add start/end points
  const smoothedPath = smoothPath(path, start, end);
  return smoothedPath;
}

/**
 * Find polygon containing a point
 */
function findPolygonContainingPoint(polygons, point) {
  for (const polygon of polygons) {
    if (pointInPolygon(point, polygon.vertices)) {
      return polygon;
    }
  }
  return null;
}

/**
 * Point-in-polygon test using ray casting algorithm
 */
function pointInPolygon(point, vertices) {
  let inside = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const xi = vertices[i].x, yi = vertices[i].y;
    const xj = vertices[j].x, yj = vertices[j].y;
    const intersect = ((yi > point.y) !== (yj > point.y)) &&
      (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * A* algorithm implementation
 */
function aStar(navMesh, startPolygon, endPolygon, startPoint, endPoint) {
  const openSet = new Set([startPolygon.id]);
  const closedSet = new Set();
  const cameFrom = new Map();
  const gScore = new Map(); // Cost from start
  const fScore = new Map(); // Estimated total cost

  // Initialize scores
  navMesh.polygons.forEach(poly => {
    gScore.set(poly.id, Infinity);
    fScore.set(poly.id, Infinity);
  });

  gScore.set(startPolygon.id, 0);
  fScore.set(startPolygon.id, heuristic(startPolygon, endPolygon, startPoint, endPoint));

  const polygonMap = new Map(navMesh.polygons.map(p => [p.id, p]));
  const connectionMap = buildConnectionMap(navMesh.connections);

  while (openSet.size > 0) {
    // Find polygon with lowest fScore
    let currentId = null;
    let lowestF = Infinity;
    for (const id of openSet) {
      const f = fScore.get(id);
      if (f < lowestF) {
        lowestF = f;
        currentId = id;
      }
    }

    if (!currentId) break;

    // If we reached the end polygon
    if (currentId === endPolygon.id) {
      // Reconstruct path
      const path = [];
      let current = currentId;
      while (current) {
        const poly = polygonMap.get(current);
        if (poly && poly.center) {
          path.unshift(poly.center);
        }
        current = cameFrom.get(current);
      }
      return path;
    }

    openSet.delete(currentId);
    closedSet.add(currentId);

    const currentPoly = polygonMap.get(currentId);
    if (!currentPoly) continue;

    // Check all neighbors
    const neighbors = connectionMap.get(currentId) || [];
    for (const neighborId of neighbors) {
      if (closedSet.has(neighborId)) continue;

      const neighborPoly = polygonMap.get(neighborId);
      if (!neighborPoly) continue;

      // Find connection cost
      const connection = findConnection(navMesh.connections, currentId, neighborId);
      const cost = connection ? connection.cost : 1.0;
      const terrainCost = getTerrainCost(neighborPoly.terrainType);

      // Calculate tentative gScore
      const tentativeG = gScore.get(currentId) + cost * terrainCost;

      if (!openSet.has(neighborId)) {
        openSet.add(neighborId);
      } else if (tentativeG >= gScore.get(neighborId)) {
        continue; // This is not a better path
      }

      // This is a better path
      cameFrom.set(neighborId, currentId);
      gScore.set(neighborId, tentativeG);
      fScore.set(neighborId, tentativeG + heuristic(neighborPoly, endPolygon, neighborPoly.center, endPoint));
    }
  }

  return null; // No path found
}

/**
 * Heuristic function (Euclidean distance)
 */
function heuristic(poly1, poly2, point1, point2) {
  const p1 = point1 || poly1.center || { x: 0, y: 0 };
  const p2 = point2 || poly2.center || { x: 0, y: 0 };
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Build connection map for fast lookup
 */
function buildConnectionMap(connections) {
  const map = new Map();
  connections.forEach(conn => {
    if (!map.has(conn.from)) {
      map.set(conn.from, []);
    }
    if (!map.has(conn.to)) {
      map.set(conn.to, []);
    }
    map.get(conn.from).push(conn.to);
    map.get(conn.to).push(conn.from); // Bidirectional
  });
  return map;
}

/**
 * Find connection between two polygons
 */
function findConnection(connections, fromId, toId) {
  return connections.find(c => 
    (c.from === fromId && c.to === toId) || 
    (c.from === toId && c.to === fromId)
  );
}

/**
 * Get terrain cost multiplier
 */
function getTerrainCost(terrainType) {
  const costs = {
    'navigable': 1.0,
    'difficult': 2.0
  };
  return costs[terrainType] || 1.0;
}

/**
 * Smooth path by removing unnecessary waypoints
 */
function smoothPath(path, start, end) {
  if (!path || path.length === 0) {
    return [start, end];
  }

  const smoothed = [start];
  
  // Simple smoothing: remove points that are collinear
  for (let i = 1; i < path.length - 1; i++) {
    const prev = path[i - 1];
    const curr = path[i];
    const next = path[i + 1];

    // Check if current point is necessary (not collinear)
    const angle1 = Math.atan2(curr.y - prev.y, curr.x - prev.x);
    const angle2 = Math.atan2(next.y - curr.y, next.x - curr.x);
    const angleDiff = Math.abs(angle1 - angle2);

    // If angle difference is significant, keep the point
    if (angleDiff > 0.1) { // ~6 degrees
      smoothed.push(curr);
    }
  }

  smoothed.push(end);
  return smoothed;
}

/**
 * Calculate path distance
 */
export function calculatePathDistance(path) {
  if (!path || path.length < 2) return 0;

  let distance = 0;
  for (let i = 1; i < path.length; i++) {
    const dx = path[i].x - path[i - 1].x;
    const dy = path[i].y - path[i - 1].y;
    distance += Math.sqrt(dx * dx + dy * dy);
  }
  return distance;
}

/**
 * Check if point is on navigable terrain
 */
export function isNavigable(navMesh, point) {
  if (!navMesh || !navMesh.polygons) return false;
  return findPolygonContainingPoint(navMesh.polygons, point) !== null;
}

/**
 * Get terrain type at point
 */
export function getTerrainType(navMesh, point) {
  if (!navMesh || !navMesh.polygons) return 'impassable';
  const polygon = findPolygonContainingPoint(navMesh.polygons, point);
  return polygon ? polygon.terrainType : 'impassable';
}


