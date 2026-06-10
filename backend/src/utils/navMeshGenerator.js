/**
 * Nav-Mesh Generator
 * Generates Nav-Mesh from biome boundaries
 */

/**
 * Generate Nav-Mesh from biome polygons
 * @param {Array} biomes - Array of biome objects with polygon and terrainType
 * @param {string} planetId - Planet identifier
 * @returns {Object} Nav-Mesh data structure
 */
function generateNavMeshFromBiomes(biomes, planetId) {
  const polygons = [];
  const connections = [];
  const polygonMap = new Map();

  // Filter out impassable biomes
  const navigableBiomes = biomes.filter(b => 
    b.terrainType === 'navigable' || b.terrainType === 'difficult'
  );

  // Create initial polygons from biome boundaries
  navigableBiomes.forEach((biome, index) => {
    const polygonId = `nav_${String(index + 1).padStart(3, '0')}`;
    
    // Ensure vertices are in clockwise order
    const vertices = ensureClockwiseOrder(biome.polygon || biome.vertices);
    
    const polygon = {
      id: polygonId,
      terrainType: biome.terrainType,
      vertices: vertices,
      neighbors: [],
      center: calculateCenter(vertices),
      area: calculateArea(vertices)
    };

    polygons.push(polygon);
    polygonMap.set(polygonId, polygon);
  });

  // Find connections between polygons
  for (let i = 0; i < polygons.length; i++) {
    for (let j = i + 1; j < polygons.length; j++) {
      const poly1 = polygons[i];
      const poly2 = polygons[j];
      
      const sharedEdge = findSharedEdge(poly1.vertices, poly2.vertices);
      
      if (sharedEdge) {
        // Add neighbors
        poly1.neighbors.push(poly2.id);
        poly2.neighbors.push(poly1.id);

        // Calculate connection cost
        const cost = calculateConnectionCost(poly1.terrainType, poly2.terrainType);

        // Add connection (bidirectional)
        connections.push({
          from: poly1.id,
          to: poly2.id,
          cost: cost,
          edge: sharedEdge
        });
      }
    }
  }

  // Subdivide large polygons if needed
  const subdividedPolygons = [];
  polygons.forEach(poly => {
    if (needsSubdivision(poly)) {
      const subPolys = subdividePolygon(poly);
      subdividedPolygons.push(...subPolys);
    } else {
      subdividedPolygons.push(poly);
    }
  });

  return {
    version: "1.0",
    planetId: planetId,
    polygons: subdividedPolygons,
    connections: connections,
    metadata: {
      created: new Date().toISOString().split('T')[0],
      polygonCount: subdividedPolygons.length,
      maxComplexity: Math.max(...subdividedPolygons.map(p => p.vertices.length))
    }
  };
}

/**
 * Ensure vertices are in clockwise order
 */
function ensureClockwiseOrder(vertices) {
  if (vertices.length < 3) return vertices;

  // Calculate signed area to determine winding order
  let area = 0;
  for (let i = 0; i < vertices.length; i++) {
    const j = (i + 1) % vertices.length;
    area += (vertices[j].x - vertices[i].x) * (vertices[j].y + vertices[i].y);
  }

  // If counter-clockwise (negative area), reverse the order
  if (area < 0) {
    return [...vertices].reverse();
  }

  return vertices;
}

/**
 * Calculate polygon center
 */
function calculateCenter(vertices) {
  let sumX = 0, sumY = 0;
  vertices.forEach(v => {
    sumX += v.x;
    sumY += v.y;
  });
  return {
    x: sumX / vertices.length,
    y: sumY / vertices.length
  };
}

/**
 * Calculate polygon area using shoelace formula
 */
function calculateArea(vertices) {
  let area = 0;
  for (let i = 0; i < vertices.length; i++) {
    const j = (i + 1) % vertices.length;
    area += vertices[i].x * vertices[j].y;
    area -= vertices[j].x * vertices[i].y;
  }
  return Math.abs(area) / 2;
}

/**
 * Find shared edge between two polygons
 */
function findSharedEdge(vertices1, vertices2) {
  for (let i = 0; i < vertices1.length; i++) {
    const v1 = vertices1[i];
    const v2 = vertices1[(i + 1) % vertices1.length];
    
    for (let j = 0; j < vertices2.length; j++) {
      const v3 = vertices2[j];
      const v4 = vertices2[(j + 1) % vertices2.length];
      
      // Check if edges match (in either direction)
      if ((v1.x === v4.x && v1.y === v4.y && v2.x === v3.x && v2.y === v3.y) ||
          (v1.x === v3.x && v1.y === v3.y && v2.x === v4.x && v2.y === v4.y)) {
        return {
          start: v1,
          end: v2
        };
      }
    }
  }
  return null;
}

/**
 * Calculate connection cost based on terrain types
 */
function calculateConnectionCost(type1, type2) {
  const costs = {
    'navigable': 1.0,
    'difficult': 2.0
  };
  return (costs[type1] || 1.0 + costs[type2] || 1.0) / 2;
}

/**
 * Check if polygon needs subdivision
 */
function needsSubdivision(polygon) {
  // Subdivide if polygon is too large or has too many vertices
  const maxSize = 200; // units
  const maxVertices = 20;

  if (polygon.vertices.length > maxVertices) {
    return true;
  }

  // Check if any edge is too long
  for (let i = 0; i < polygon.vertices.length; i++) {
    const v1 = polygon.vertices[i];
    const v2 = polygon.vertices[(i + 1) % polygon.vertices.length];
    const distance = Math.sqrt(Math.pow(v2.x - v1.x, 2) + Math.pow(v2.y - v1.y, 2));
    if (distance > maxSize) {
      return true;
    }
  }

  return false;
}

/**
 * Subdivide a polygon into smaller polygons
 */
function subdividePolygon(polygon) {
  // Simple subdivision: split polygon into triangles or quads
  // For complex polygons, use quadtree or similar algorithm
  
  if (polygon.vertices.length <= 4) {
    // Already simple enough, just return as-is
    return [polygon];
  }

  // Find longest edge and split polygon along it
  let maxDist = 0;
  let maxIndex = 0;
  
  for (let i = 0; i < polygon.vertices.length; i++) {
    const v1 = polygon.vertices[i];
    const v2 = polygon.vertices[(i + 1) % polygon.vertices.length];
    const dist = Math.sqrt(Math.pow(v2.x - v1.x, 2) + Math.pow(v2.y - v1.y, 2));
    
    if (dist > maxDist) {
      maxDist = dist;
      maxIndex = i;
    }
  }

  // Split polygon at longest edge
  const v1 = polygon.vertices[maxIndex];
  const v2 = polygon.vertices[(maxIndex + 1) % polygon.vertices.length];
  const center = calculateCenter(polygon.vertices);

  // Create two new polygons
  const poly1 = {
    id: `${polygon.id}_a`,
    terrainType: polygon.terrainType,
    vertices: [
      v1,
      v2,
      center,
      ...polygon.vertices.slice(maxIndex + 1)
    ],
    neighbors: [],
    center: calculateCenter([v1, v2, center]),
    area: 0
  };

  const poly2 = {
    id: `${polygon.id}_b`,
    terrainType: polygon.terrainType,
    vertices: [
      v1,
      center,
      v2,
      ...polygon.vertices.slice(0, maxIndex + 1)
    ],
    neighbors: [],
    center: calculateCenter([v1, center, v2]),
    area: 0
  };

  // Recursively subdivide if still too large
  const result = [];
  if (needsSubdivision(poly1)) {
    result.push(...subdividePolygon(poly1));
  } else {
    result.push(poly1);
  }

  if (needsSubdivision(poly2)) {
    result.push(...subdividePolygon(poly2));
  } else {
    result.push(poly2);
  }

  return result;
}

module.exports = {
  generateNavMeshFromBiomes,
  ensureClockwiseOrder,
  calculateCenter,
  calculateArea,
  findSharedEdge,
  calculateConnectionCost,
  needsSubdivision,
  subdividePolygon
};


