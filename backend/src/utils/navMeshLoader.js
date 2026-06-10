/**
 * Nav-Mesh Loader
 * Loads Nav-Mesh data from files or database
 */

const fs = require('fs');
const path = require('path');

/**
 * Load Nav-Mesh for a planet
 */
function loadNavMesh(planetId) {
  try {
    // Try to load from file
    const navMeshPath = path.join(__dirname, '../data/navmeshes', `${planetId}_navmesh.json`);
    
    if (fs.existsSync(navMeshPath)) {
      const data = JSON.parse(fs.readFileSync(navMeshPath, 'utf8'));
      return data.navMesh || data;
    }

    // If no Nav-Mesh file exists, return null (will use fallback behavior)
    return null;
  } catch (error) {
    console.error(`[Nav-Mesh] Failed to load Nav-Mesh for ${planetId}:`, error);
    return null;
  }
}

/**
 * Check if Nav-Mesh exists for a planet
 */
function hasNavMesh(planetId) {
  const navMeshPath = path.join(__dirname, '../data/navmeshes', `${planetId}_navmesh.json`);
  return fs.existsSync(navMeshPath);
}

/**
 * Get all available Nav-Meshes
 */
function getAllNavMeshes() {
  const navMeshDir = path.join(__dirname, '../data/navmeshes');
  
  if (!fs.existsSync(navMeshDir)) {
    return [];
  }

  const files = fs.readdirSync(navMeshDir)
    .filter(file => file.endsWith('_navmesh.json'))
    .map(file => file.replace('_navmesh.json', ''));

  return files;
}

module.exports = {
  loadNavMesh,
  hasNavMesh,
  getAllNavMeshes
};


