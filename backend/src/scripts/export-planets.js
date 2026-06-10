/**
 * Export Planets Script
 * Exports all planets with their traits and nested submaps to JSON
 * Usage: node backend/src/scripts/export-planets.js > planets-export.json
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { sequelize, Planet, SubMap, StarSystem } = require('../models');

async function exportPlanets() {
  try {
    // Suppress Sequelize logging for clean JSON output
    sequelize.options.logging = false;
    await sequelize.authenticate();

    // Get all planets with their system and submaps
    const planets = await Planet.findAll({
      include: [
        {
          model: StarSystem,
          as: 'system',
          attributes: ['id', 'name', 'region', 'coordinates']
        },
        {
          model: SubMap,
          as: 'subMaps',
          attributes: ['id', 'name', 'type', 'template', 'parentLocationId', 'parentLocationType', 'metadata'],
          required: false
        }
      ],
      order: [
        [{ model: StarSystem, as: 'system' }, 'name', 'ASC'],
        ['name', 'ASC']
      ]
    });

    // Transform to export format
    const exportData = {
      exportDate: new Date().toISOString(),
      totalPlanets: planets.length,
      planets: planets.map(planet => {
        const planetData = planet.toJSON();
        
        return {
          id: planetData.id,
          name: planetData.name,
          system: {
            id: planetData.system?.id,
            name: planetData.system?.name,
            region: planetData.system?.region,
            coordinates: planetData.system?.coordinates
          },
          traits: {
            planetType: planetData.planetType,
            climate: planetData.climate,
            atmosphere: planetData.atmosphere,
            gravity: planetData.gravity ? parseFloat(planetData.gravity) : null,
            dayLength: planetData.dayLength,
            yearLength: planetData.yearLength,
            population: planetData.population ? parseInt(planetData.population) : 0,
            factionControl: planetData.factionControl,
            dangerLevel: planetData.dangerLevel,
            terrain: planetData.terrain,
            description: planetData.description,
            lore: planetData.lore
          },
          locations: {
            majorCities: planetData.majorCities || [],
            pointsOfInterest: planetData.pointsOfInterest || [],
            landingZones: planetData.landingZones || [],
            resources: planetData.resources || []
          },
          submaps: (planetData.subMaps || []).map(subMap => ({
            id: subMap.id,
            name: subMap.name,
            type: subMap.type,
            template: subMap.template,
            parentLocationId: subMap.parentLocationId,
            parentLocationType: subMap.parentLocationType,
            metadata: subMap.metadata || {}
          })),
          metadata: planetData.metadata || {}
        };
      })
    };

    // Output as JSON
    console.log(JSON.stringify(exportData, null, 2));
    
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('Error exporting planets:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  exportPlanets();
}

module.exports = { exportPlanets };

