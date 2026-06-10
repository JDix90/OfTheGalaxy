/**
 * Nav-Mesh Validation Tool
 * Validates Nav-Mesh data structure against specification
 */

const fs = require('fs');
const path = require('path');

/**
 * Validate Nav-Mesh structure
 */
function validateNavMesh(navMesh, planetId) {
  const errors = [];
  const warnings = [];

  // Check required fields
  if (!navMesh.version) errors.push('Missing version field');
  if (!navMesh.planetId) errors.push('Missing planetId field');
  if (!navMesh.polygons) errors.push('Missing polygons array');
  if (!navMesh.connections) errors.push('Missing connections array');
  if (!navMesh.metadata) errors.push('Missing metadata object');

  if (errors.length > 0) {
    return { valid: false, errors, warnings };
  }

  // Validate planet ID matches
  if (navMesh.planetId !== planetId) {
    warnings.push(`Planet ID mismatch: expected ${planetId}, got ${navMesh.planetId}`);
  }

  // Validate polygons
  if (!Array.isArray(navMesh.polygons) || navMesh.polygons.length === 0) {
    errors.push('Polygons array is empty or invalid');
  } else {
    const polygonIds = new Set();
    navMesh.polygons.forEach((poly, index) => {
      const prefix = `Polygon ${index} (${poly.id || 'unknown'}):`;

      // Check required fields
      if (!poly.id) errors.push(`${prefix} Missing id`);
      if (!poly.terrainType) errors.push(`${prefix} Missing terrainType`);
      if (!poly.vertices || !Array.isArray(poly.vertices)) {
        errors.push(`${prefix} Missing or invalid vertices array`);
      }
      if (!poly.neighbors || !Array.isArray(poly.neighbors)) {
        errors.push(`${prefix} Missing or invalid neighbors array`);
      }

      // Check ID uniqueness
      if (polygonIds.has(poly.id)) {
        errors.push(`${prefix} Duplicate polygon ID: ${poly.id}`);
      }
      polygonIds.add(poly.id);

      // Check terrain type
      if (!['navigable', 'difficult', 'impassable'].includes(poly.terrainType)) {
        errors.push(`${prefix} Invalid terrainType: ${poly.terrainType}`);
      }

      // Check for impassable terrain in Nav-Mesh
      if (poly.terrainType === 'impassable') {
        errors.push(`${prefix} Impassable terrain should not be in Nav-Mesh`);
      }

      // Validate vertices
      if (poly.vertices) {
        if (poly.vertices.length < 3) {
          errors.push(`${prefix} Polygon must have at least 3 vertices`);
        }
        if (poly.vertices.length > 20) {
          errors.push(`${prefix} Polygon exceeds maximum vertex count (20)`);
        }

        poly.vertices.forEach((vertex, vIndex) => {
          if (typeof vertex.x !== 'number' || typeof vertex.y !== 'number') {
            errors.push(`${prefix} Vertex ${vIndex}: Invalid coordinates`);
          }
          if (vertex.x < 0 || vertex.x > 1000 || vertex.y < 0 || vertex.y > 1000) {
            errors.push(`${prefix} Vertex ${vIndex}: Coordinates out of range (0-1000)`);
          }
        });

        // Check for duplicate consecutive vertices
        for (let i = 0; i < poly.vertices.length; i++) {
          const v1 = poly.vertices[i];
          const v2 = poly.vertices[(i + 1) % poly.vertices.length];
          if (v1.x === v2.x && v1.y === v2.y) {
            errors.push(`${prefix} Duplicate consecutive vertices at index ${i}`);
          }
        }
      }

      // Validate neighbors reference valid polygons
      if (poly.neighbors) {
        poly.neighbors.forEach(neighborId => {
          if (!polygonIds.has(neighborId)) {
            errors.push(`${prefix} Neighbor ${neighborId} does not exist`);
          }
        });
      }
    });
  }

  // Validate connections
  if (!Array.isArray(navMesh.connections)) {
    errors.push('Connections must be an array');
  } else {
    const connectionSet = new Set();
    navMesh.connections.forEach((conn, index) => {
      const prefix = `Connection ${index}:`;

      // Check required fields
      if (!conn.from) errors.push(`${prefix} Missing from field`);
      if (!conn.to) errors.push(`${prefix} Missing to field`);
      if (typeof conn.cost !== 'number') errors.push(`${prefix} Missing or invalid cost`);
      if (!conn.edge) errors.push(`${prefix} Missing edge definition`);

      // Check polygon references
      const polygonIds = new Set(navMesh.polygons.map(p => p.id));
      if (conn.from && !polygonIds.has(conn.from)) {
        errors.push(`${prefix} From polygon ${conn.from} does not exist`);
      }
      if (conn.to && !polygonIds.has(conn.to)) {
        errors.push(`${prefix} To polygon ${conn.to} does not exist`);
      }

      // Check bidirectional connections
      const connKey = `${conn.from}-${conn.to}`;
      const reverseKey = `${conn.to}-${conn.from}`;
      if (connectionSet.has(connKey)) {
        warnings.push(`${prefix} Duplicate connection`);
      }
      if (!connectionSet.has(reverseKey) && conn.from && conn.to) {
        warnings.push(`${prefix} Missing reverse connection (should be bidirectional)`);
      }
      connectionSet.add(connKey);

      // Validate cost
      if (conn.cost !== undefined) {
        if (conn.cost < 1.0 || conn.cost > 10.0) {
          warnings.push(`${prefix} Unusual connection cost: ${conn.cost}`);
        }
      }
    });
  }

  // Validate metadata
  if (navMesh.metadata) {
    if (navMesh.polygons && navMesh.metadata.polygonCount !== navMesh.polygons.length) {
      warnings.push(`Metadata polygonCount (${navMesh.metadata.polygonCount}) does not match actual count (${navMesh.polygons.length})`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats: {
      polygonCount: navMesh.polygons?.length || 0,
      connectionCount: navMesh.connections?.length || 0,
      navigableCount: navMesh.polygons?.filter(p => p.terrainType === 'navigable').length || 0,
      difficultCount: navMesh.polygons?.filter(p => p.terrainType === 'difficult').length || 0
    }
  };
}

/**
 * Validate POI coverage
 */
function validatePOICoverage(navMesh, pois) {
  const errors = [];
  const warnings = [];

  if (!pois || pois.length === 0) {
    warnings.push('No POIs provided for coverage validation');
    return { valid: true, errors, warnings };
  }

  pois.forEach(poi => {
    const point = { x: poi.x, y: poi.y };
    let found = false;

    for (const poly of navMesh.polygons) {
      if (pointInPolygon(point, poly.vertices)) {
        found = true;
        if (poly.terrainType === 'impassable') {
          errors.push(`POI ${poi.name || poi.id} is in impassable terrain`);
        }
        break;
      }
    }

    if (!found) {
      errors.push(`POI ${poi.name || poi.id} (${point.x}, ${point.y}) is not within any Nav-Mesh polygon`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
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
 * Main validation function
 */
function validateNavMeshFile(filePath, planetId = null) {
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const navMesh = data.navMesh || data;
    const detectedPlanetId = planetId || navMesh.planetId || path.basename(filePath, '_navmesh.json');

    console.log(`\n🔍 Validating Nav-Mesh for: ${detectedPlanetId}`);
    console.log(`📁 File: ${filePath}\n`);

    const result = validateNavMesh(navMesh, detectedPlanetId);

    if (result.valid) {
      console.log('✅ Nav-Mesh structure is valid!\n');
    } else {
      console.log('❌ Nav-Mesh structure has errors:\n');
      result.errors.forEach(error => console.log(`  • ${error}`));
    }

    if (result.warnings.length > 0) {
      console.log('\n⚠️  Warnings:\n');
      result.warnings.forEach(warning => console.log(`  • ${warning}`));
    }

    if (result.stats) {
      console.log('\n📊 Statistics:');
      console.log(`  • Total Polygons: ${result.stats.polygonCount}`);
      console.log(`  • Navigable: ${result.stats.navigableCount}`);
      console.log(`  • Difficult: ${result.stats.difficultCount}`);
      console.log(`  • Connections: ${result.stats.connectionCount}`);
    }

    return result;
  } catch (error) {
    console.error(`❌ Error validating Nav-Mesh: ${error.message}`);
    return { valid: false, errors: [error.message], warnings: [] };
  }
}

// CLI usage
if (require.main === module) {
  const filePath = process.argv[2];
  const planetId = process.argv[3] || null;

  if (!filePath) {
    console.error('Usage: node validate-navmesh.js <navmesh-file> [planet-id]');
    process.exit(1);
  }

  const result = validateNavMeshFile(filePath, planetId);
  process.exit(result.valid ? 0 : 1);
}

module.exports = {
  validateNavMesh,
  validatePOICoverage,
  pointInPolygon,
  validateNavMeshFile
};


