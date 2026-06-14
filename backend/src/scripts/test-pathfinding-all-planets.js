/**
 * Performance Test for Pathfinding on All Planets
 * Tests pathfinding performance across all planets with Nav-Mesh data
 */

const fs = require('fs');
const path = require('path');

// Simplified pathfinding functions for testing (standalone version)
function findPath(navMesh, start, end) {
  if (!navMesh || !navMesh.polygons || !navMesh.connections) {
    return null;
  }

  // Find polygons containing start and end points
  const startPolygon = findPolygonContainingPoint(navMesh.polygons, start);
  const endPolygon = findPolygonContainingPoint(navMesh.polygons, end);

  if (!startPolygon || !endPolygon) {
    return null;
  }

  // If same polygon, return direct path
  if (startPolygon.id === endPolygon.id) {
    return [start, end];
  }

  // Simple pathfinding: find path through polygon centers
  const path = aStar(navMesh, startPolygon, endPolygon, start, end);
  return path ? [start, ...path, end] : null;
}

function findPolygonContainingPoint(polygons, point) {
  for (const polygon of polygons) {
    if (pointInPolygon(point, polygon.vertices)) {
      return polygon;
    }
  }
  return null;
}

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

function aStar(navMesh, startPolygon, endPolygon, startPoint, endPoint) {
  const openSet = new Set([startPolygon.id]);
  const closedSet = new Set();
  const cameFrom = new Map();
  const gScore = new Map();
  const fScore = new Map();

  const polygonMap = new Map(navMesh.polygons.map(p => [p.id, p]));
  const connectionMap = buildConnectionMap(navMesh.connections);

  navMesh.polygons.forEach(poly => {
    gScore.set(poly.id, Infinity);
    fScore.set(poly.id, Infinity);
  });

  gScore.set(startPolygon.id, 0);
  fScore.set(startPolygon.id, heuristic(startPolygon, endPolygon, startPoint, endPoint));

  while (openSet.size > 0) {
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

    if (currentId === endPolygon.id) {
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

    const neighbors = connectionMap.get(currentId) || [];
    for (const neighborId of neighbors) {
      if (closedSet.has(neighborId)) continue;

      const neighborPoly = polygonMap.get(neighborId);
      if (!neighborPoly) continue;

      const connection = findConnection(navMesh.connections, currentId, neighborId);
      const cost = connection ? connection.cost : 1.0;
      const tentativeG = gScore.get(currentId) + cost;

      if (!openSet.has(neighborId)) {
        openSet.add(neighborId);
      } else if (tentativeG >= gScore.get(neighborId)) {
        continue;
      }

      cameFrom.set(neighborId, currentId);
      gScore.set(neighborId, tentativeG);
      fScore.set(neighborId, tentativeG + heuristic(neighborPoly, endPolygon, neighborPoly.center, endPoint));
    }
  }

  return null;
}

function heuristic(poly1, poly2, point1, point2) {
  const p1 = point1 || poly1.center || { x: 0, y: 0 };
  const p2 = point2 || poly2.center || { x: 0, y: 0 };
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function buildConnectionMap(connections) {
  const map = new Map();
  connections.forEach(conn => {
    if (!map.has(conn.from)) map.set(conn.from, []);
    if (!map.has(conn.to)) map.set(conn.to, []);
    map.get(conn.from).push(conn.to);
    map.get(conn.to).push(conn.from);
  });
  return map;
}

function findConnection(connections, fromId, toId) {
  return connections.find(c => 
    (c.from === fromId && c.to === toId) || 
    (c.from === toId && c.to === fromId)
  );
}

function calculatePathDistance(path) {
  if (!path || path.length < 2) return 0;
  let distance = 0;
  for (let i = 1; i < path.length; i++) {
    const dx = path[i].x - path[i - 1].x;
    const dy = path[i].y - path[i - 1].y;
    distance += Math.sqrt(dx * dx + dy * dy);
  }
  return distance;
}

// Test planets with Nav-Mesh data
const testPlanets = [
  { id: 'gravenmoor', name: 'Gravenmoor' },
  { id: 'caldon', name: 'Caldon' },
  { id: 'rime', name: 'Rime' }
];

/**
 * Load Nav-Mesh for a planet
 */
function loadNavMesh(planetId) {
  try {
    const navMeshPath = path.join(__dirname, '../data/navmeshes', `${planetId}_navmesh.json`);
    if (fs.existsSync(navMeshPath)) {
      const data = JSON.parse(fs.readFileSync(navMeshPath, 'utf8'));
      return data.navMesh || data;
    }
  } catch (error) {
    console.error(`Failed to load Nav-Mesh for ${planetId}:`, error);
  }
  return null;
}

/**
 * Generate test cases for a planet
 */
function generateTestCases(navMesh) {
  if (!navMesh || !navMesh.polygons || navMesh.polygons.length === 0) {
    return [];
  }

  const testCases = [];
  const polygons = navMesh.polygons;

  // Test 1: Short distance (same polygon)
  if (polygons.length > 0) {
    const poly = polygons[0];
    const center = poly.center || { x: 500, y: 500 };
    const offset = { x: center.x + 50, y: center.y + 50 };
    testCases.push({
      name: 'Short distance (same polygon)',
      start: center,
      end: offset
    });
  }

  // Test 2: Medium distance (adjacent polygons)
  if (polygons.length >= 2) {
    const poly1 = polygons[0];
    const poly2 = polygons[1];
    const start = poly1.center || { x: 500, y: 500 };
    const end = poly2.center || { x: 500, y: 500 };
    testCases.push({
      name: 'Medium distance (adjacent polygons)',
      start: start,
      end: end
    });
  }

  // Test 3: Long distance (opposite corners)
  if (polygons.length >= 2) {
    const firstPoly = polygons[0];
    const lastPoly = polygons[polygons.length - 1];
    const start = firstPoly.center || { x: 100, y: 100 };
    const end = lastPoly.center || { x: 900, y: 900 };
    testCases.push({
      name: 'Long distance (opposite corners)',
      start: start,
      end: end
    });
  }

  // Test 4: Edge case (very close points)
  if (polygons.length > 0) {
    const poly = polygons[0];
    const center = poly.center || { x: 500, y: 500 };
    testCases.push({
      name: 'Edge case (very close)',
      start: center,
      end: { x: center.x + 1, y: center.y + 1 }
    });
  }

  return testCases;
}

/**
 * Run performance test for a planet
 */
function testPlanet(planetId, planetName) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing: ${planetName} (${planetId})`);
  console.log('='.repeat(60));

  const navMesh = loadNavMesh(planetId);
  if (!navMesh) {
    console.log(`❌ No Nav-Mesh found for ${planetName}`);
    return null;
  }

  console.log(`✅ Nav-Mesh loaded: ${navMesh.polygons?.length || 0} polygons, ${navMesh.connections?.length || 0} connections`);

  const testCases = generateTestCases(navMesh);
  if (testCases.length === 0) {
    console.log(`⚠️  No test cases generated`);
    return null;
  }

  const results = [];

  testCases.forEach((testCase, index) => {
    console.log(`\nTest ${index + 1}: ${testCase.name}`);
    console.log(`  Start: (${testCase.start.x}, ${testCase.start.y})`);
    console.log(`  End: (${testCase.end.x}, ${testCase.end.y})`);

    // Warm-up run
    findPath(navMesh, testCase.start, testCase.end);

    // Performance test
    const iterations = 100;
    const startTime = performance.now();

    for (let i = 0; i < iterations; i++) {
      findPath(navMesh, testCase.start, testCase.end);
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const avgTime = totalTime / iterations;

    // Single run for path details
    const path = findPath(navMesh, testCase.start, testCase.end);
    const distance = path ? calculatePathDistance(path) : 0;

    results.push({
      name: testCase.name,
      avgTime: avgTime,
      totalTime: totalTime,
      pathLength: path ? path.length : 0,
      distance: distance,
      success: path !== null && path.length > 0
    });

    const status = results[results.length - 1].success ? '✅' : '❌';
    console.log(`  ${status} Average time: ${avgTime.toFixed(3)}ms`);
    console.log(`  ${status} Total time (${iterations} iterations): ${totalTime.toFixed(2)}ms`);
    console.log(`  ${status} Path length: ${path ? path.length : 0} waypoints`);
    console.log(`  ${status} Path distance: ${distance.toFixed(2)} units`);
  });

  return {
    planetId,
    planetName,
    navMesh: {
      polygonCount: navMesh.polygons?.length || 0,
      connectionCount: navMesh.connections?.length || 0
    },
    results
  };
}

/**
 * Main test function
 */
function runAllTests() {
  console.log('\n🧪 Pathfinding Performance Test - All Planets\n');
  console.log('='.repeat(60));

  const allResults = [];

  testPlanets.forEach(planet => {
    const result = testPlanet(planet.id, planet.name);
    if (result) {
      allResults.push(result);
    }
  });

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Performance Summary\n');
  console.log('='.repeat(60));

  if (allResults.length === 0) {
    console.log('❌ No test results available');
    return;
  }

  let totalTests = 0;
  let totalSuccess = 0;
  let totalAvgTime = 0;
  let maxTime = 0;

  allResults.forEach(planetResult => {
    console.log(`\n${planetResult.planetName}:`);
    console.log(`  Nav-Mesh: ${planetResult.navMesh.polygonCount} polygons, ${planetResult.navMesh.connectionCount} connections`);

    planetResult.results.forEach(result => {
      totalTests++;
      if (result.success) totalSuccess++;
      totalAvgTime += result.avgTime;
      maxTime = Math.max(maxTime, result.avgTime);

      const status = result.success ? '✅' : '❌';
      console.log(`  ${status} ${result.name}: ${result.avgTime.toFixed(3)}ms (${result.pathLength} waypoints)`);
    });
  });

  const overallAvgTime = totalAvgTime / totalTests;
  const successRate = (totalSuccess / totalTests) * 100;

  console.log('\n' + '='.repeat(60));
  console.log('\n📈 Overall Statistics\n');
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Success Rate: ${successRate.toFixed(1)}%`);
  console.log(`Average Pathfinding Time: ${overallAvgTime.toFixed(3)}ms`);
  console.log(`Maximum Pathfinding Time: ${maxTime.toFixed(3)}ms`);

  // Performance budget check
  const targetTime = 16.67; // 60 FPS = 16.67ms per frame
  const budgetTime = 10; // Leave 6.67ms for other operations

  console.log(`\n🎯 Performance Budget: ${budgetTime}ms (target: <${targetTime}ms for 60 FPS)`);

  if (maxTime < budgetTime) {
    console.log('✅ PASS: All pathfinding operations meet performance budget');
  } else if (maxTime < targetTime) {
    console.log('⚠️  WARNING: Some pathfinding operations are close to budget limit');
    console.log('   Consider optimization for better performance');
  } else {
    console.log('❌ FAIL: Some pathfinding operations exceed performance budget');
    console.log('   Recommendations:');
    console.log('   - Use hierarchical pathfinding for long distances');
    console.log('   - Cache common paths');
    console.log('   - Simplify Nav-Mesh (fewer polygons)');
  }

  return allResults;
}

// Run tests
if (require.main === module) {
  try {
    runAllTests();
  } catch (error) {
    console.error('❌ Performance test failed:', error);
    process.exit(1);
  }
}

module.exports = { runAllTests, testPlanet };

