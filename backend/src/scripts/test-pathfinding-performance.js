/**
 * Pathfinding Performance Test
 * Tests A* pathfinding performance on sample Nav-Mesh data
 */

const { findPath, calculatePathDistance } = require('../../frontend/src/utils/pathfinding');

// Sample Nav-Mesh for testing (simple 2-polygon setup)
const testNavMesh = {
  version: "1.0",
  planetId: "test",
  polygons: [
    {
      id: "nav_001",
      terrainType: "navigable",
      vertices: [
        { x: 0, y: 0 },
        { x: 1000, y: 0 },
        { x: 1000, y: 500 },
        { x: 0, y: 500 }
      ],
      neighbors: ["nav_002"],
      center: { x: 500, y: 250 },
      area: 500000
    },
    {
      id: "nav_002",
      terrainType: "navigable",
      vertices: [
        { x: 0, y: 500 },
        { x: 1000, y: 500 },
        { x: 1000, y: 1000 },
        { x: 0, y: 1000 }
      ],
      neighbors: ["nav_001"],
      center: { x: 500, y: 750 },
      area: 500000
    }
  ],
  connections: [
    {
      from: "nav_001",
      to: "nav_002",
      cost: 1.0,
      edge: {
        start: { x: 0, y: 500 },
        end: { x: 1000, y: 500 }
      }
    }
  ],
  metadata: {
    created: "2024-12-01",
    polygonCount: 2,
    maxComplexity: 4
  }
};

/**
 * Performance test
 */
function performanceTest() {
  console.log('\n🧪 Pathfinding Performance Test\n');
  console.log('='.repeat(60));

  const testCases = [
    { name: 'Short distance (same polygon)', start: { x: 100, y: 100 }, end: { x: 200, y: 200 } },
    { name: 'Medium distance (adjacent polygons)', start: { x: 100, y: 100 }, end: { x: 900, y: 900 } },
    { name: 'Long distance (opposite corners)', start: { x: 50, y: 50 }, end: { x: 950, y: 950 } }
  ];

  const results = [];

  testCases.forEach((testCase, index) => {
    console.log(`\nTest ${index + 1}: ${testCase.name}`);
    console.log(`  Start: (${testCase.start.x}, ${testCase.start.y})`);
    console.log(`  End: (${testCase.end.x}, ${testCase.end.y})`);

    // Warm-up run
    findPath(testNavMesh, testCase.start, testCase.end);

    // Performance test
    const iterations = 100;
    const startTime = performance.now();

    for (let i = 0; i < iterations; i++) {
      findPath(testNavMesh, testCase.start, testCase.end);
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const avgTime = totalTime / iterations;

    // Single run for path details
    const path = findPath(testNavMesh, testCase.start, testCase.end);
    const distance = path ? calculatePathDistance(path) : 0;

    results.push({
      name: testCase.name,
      avgTime: avgTime,
      totalTime: totalTime,
      pathLength: path ? path.length : 0,
      distance: distance
    });

    console.log(`  ✅ Average time: ${avgTime.toFixed(3)}ms`);
    console.log(`  ✅ Total time (${iterations} iterations): ${totalTime.toFixed(2)}ms`);
    console.log(`  ✅ Path length: ${path ? path.length : 0} waypoints`);
    console.log(`  ✅ Path distance: ${distance.toFixed(2)} units`);
  });

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Performance Summary\n');

  const avgTime = results.reduce((sum, r) => sum + r.avgTime, 0) / results.length;
  const maxTime = Math.max(...results.map(r => r.avgTime));

  console.log(`Average pathfinding time: ${avgTime.toFixed(3)}ms`);
  console.log(`Maximum pathfinding time: ${maxTime.toFixed(3)}ms`);

  // Performance budget check
  const targetTime = 16.67; // 60 FPS = 16.67ms per frame
  const budgetTime = 10; // Leave 6.67ms for other operations

  console.log(`\n🎯 Performance Budget: ${budgetTime}ms (target: <${targetTime}ms for 60 FPS)`);

  if (maxTime < budgetTime) {
    console.log('✅ PASS: Pathfinding meets performance budget');
  } else if (maxTime < targetTime) {
    console.log('⚠️  WARNING: Pathfinding is close to budget limit');
  } else {
    console.log('❌ FAIL: Pathfinding exceeds performance budget');
    console.log('   Consider:');
    console.log('   - Using hierarchical pathfinding for long distances');
    console.log('   - Caching common paths');
    console.log('   - Simplifying Nav-Mesh (fewer polygons)');
  }

  return results;
}

// Run test
if (require.main === module) {
  try {
    performanceTest();
  } catch (error) {
    console.error('❌ Performance test failed:', error);
    process.exit(1);
  }
}

module.exports = { performanceTest, testNavMesh };


