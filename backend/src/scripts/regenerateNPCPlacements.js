/**
 * Regenerate NPC Placements Script
 * Updates existing NPC locations to be distributed around cities, cantinas, and spaceports
 * instead of randomly clustered
 */

require('dotenv').config();
const { sequelize, NPC, Planet } = require('../models');
const npcGenerator = require('../services/npcGenerator');

/**
 * Regenerate NPC placements for a specific planet
 * @param {string} planetId - Planet ID
 */
async function regenerateNPCPlacements(planetId) {
  try {
    console.log(`\n🌍 Regenerating NPC placements for ${planetId}...`);

    // Get planet with POIs
    const planet = await Planet.findByPk(planetId);
    if (!planet) {
      console.error(`  ✗ Planet ${planetId} not found`);
      return 0;
    }

    // Get all existing NPCs on this planet's surface
    const existingNPCs = await NPC.findByLocation(planetId, 'surface');
    console.log(`  Found ${existingNPCs.length} existing NPCs`);

    if (existingNPCs.length === 0) {
      console.log(`  ℹ No NPCs to regenerate. Generating new NPCs...`);
      // Generate new NPCs with new placement logic
      await npcGenerator.generatePlanetNPCs(planet, null, { force: true });
      return 0;
    }

    // Get POIs for intelligent NPC placement
    const pois = planet.pointsOfInterest || [];
    const relevantPOITypes = ['city', 'spaceport', 'cantina', 'market', 'medical_center', 'trading_post', 'bazaar'];
    const relevantPOIs = pois.filter(poi => {
      const poiType = (poi.type || '').toLowerCase();
      return relevantPOITypes.some(type => poiType.includes(type) || poi.name?.toLowerCase().includes(type));
    });

    // Also include major cities from planet data
    const majorCities = planet.majorCities || [];
    const cityPOIs = majorCities.map(city => ({
      name: city,
      x: 50, // Default center if no coordinates
      y: 50,
      type: 'city'
    }));

    // Combine POIs and cities
    const allLocations = [...relevantPOIs, ...cityPOIs];

    // If no POIs found, create default locations based on planet
    let npcLocations = allLocations;
    if (npcLocations.length === 0) {
      // Create default locations: center, corners, and midpoints
      npcLocations = [
        { name: 'Center', x: 50, y: 50, type: 'settlement' },
        { name: 'North', x: 50, y: 20, type: 'settlement' },
        { name: 'South', x: 50, y: 80, type: 'settlement' },
        { name: 'East', x: 80, y: 50, type: 'settlement' },
        { name: 'West', x: 20, y: 50, type: 'settlement' }
      ];
    }

    console.log(`  Found ${npcLocations.length} relevant locations (POIs/cities)`);
    npcLocations.forEach(loc => {
      console.log(`    - ${loc.name} (${loc.type}) at (${loc.x}, ${loc.y})`);
    });

    // Regenerate locations for each NPC
    let updatedCount = 0;
    for (const npc of existingNPCs) {
      // Use NPC ID as seed for consistent placement
      let seedValue = npc.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const seededRandom = () => {
        seedValue = (seedValue * 9301 + 49297) % 233280;
        return seedValue / 233280;
      };
      
      // Get a random location from available locations
      const locationIndex = Math.floor(seededRandom() * npcLocations.length);
      const baseLocation = npcLocations[locationIndex];
      
      // Add variance around the location (5-15 units away)
      const variance = 5 + (seededRandom() * 10); // 5-15 unit radius
      const angle = seededRandom() * Math.PI * 2; // Random angle
      const offsetX = Math.cos(angle) * variance;
      const offsetY = Math.sin(angle) * variance;
      
      // Ensure coordinates stay within bounds (0-100)
      const npcX = Math.max(0, Math.min(100, (baseLocation.x || 50) + offsetX));
      const npcY = Math.max(0, Math.min(100, (baseLocation.y || 50) + offsetY));

      // Update NPC location
      npc.location = {
        ...npc.location,
        x: Math.round(npcX),
        y: Math.round(npcY)
      };

      await npc.save();
      updatedCount++;
    }

    console.log(`  ✓ Updated ${updatedCount} NPC locations`);
    return updatedCount;
  } catch (error) {
    console.error(`  ✗ Error regenerating NPC placements for ${planetId}:`, error.message);
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  try {
    await sequelize.authenticate();
    console.log('✓ Database connected\n');

    // Get planet ID from command line argument or default to Tatooine
    const planetId = process.argv[2] || 'tatooine';

    if (planetId === 'all') {
      // Regenerate for all planets
      const planets = await Planet.findAll();
      console.log(`Regenerating NPC placements for ${planets.length} planets...\n`);
      
      let totalUpdated = 0;
      for (const planet of planets) {
        const count = await regenerateNPCPlacements(planet.id);
        totalUpdated += count;
      }
      
      console.log(`\n✅ Total NPCs updated: ${totalUpdated}`);
    } else {
      // Regenerate for specific planet
      const count = await regenerateNPCPlacements(planetId);
      console.log(`\n✅ NPC placements regenerated for ${planetId}: ${count} NPCs updated`);
    }

  } catch (error) {
    console.error('✗ Error:', error);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await sequelize.close();
    console.log('\n✓ Database connection closed');
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { regenerateNPCPlacements };

