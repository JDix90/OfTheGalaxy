/**
 * Phase 1 & Phase 2 Content Seeder
 * Seeds NPCs, Items, Quests, and Planet Data for Phase 1 planets (Sytha, Gravenmoor, Caldon, Centralis)
 * 
 * Usage: node backend/src/scripts/seed-phase1-content.js
 */

// Load environment variables
// The .env file is in the backend directory
const path = require('path');
const fs = require('fs');

// Try loading .env from different locations (in order of preference)
const envPaths = [
  path.join(__dirname, '../../.env'),           // backend/.env (most likely)
  path.join(__dirname, '../../../.env'),        // Root directory
  path.join(__dirname, '../.env'),             // backend/src/.env
];

let envLoaded = false;
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
    console.log(`✓ Loaded .env from: ${envPath}`);
    envLoaded = true;
    break;
  }
}

// If no .env found in expected locations, try default dotenv behavior
if (!envLoaded) {
  require('dotenv').config();
  if (process.env.DB_PASSWORD) {
    console.log(`✓ Loaded .env from default location`);
  }
}

const { sequelize, NPC, Quest, Item, Planet } = require('../models');

// Content directory is in the project root, not backend directory
// From backend/src/scripts/, we need to go up 3 levels to reach project root
const CONTENT_DIR = path.join(__dirname, '../../../content');

/**
 * Load and parse JSON file
 */
function loadJSON(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error loading ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Seed NPCs from a directory
 */
async function seedNPCs(npcDir) {
  if (!fs.existsSync(npcDir)) {
    console.log(`NPC directory not found: ${npcDir}`);
    return 0;
  }

  const files = fs.readdirSync(npcDir).filter(f => f.endsWith('.json'));
  let count = 0;

  for (const file of files) {
    const filePath = path.join(npcDir, file);
    const npcData = loadJSON(filePath);
    
    if (!npcData) continue;

    try {
      const [npc, created] = await NPC.findOrCreate({
        where: { id: npcData.id },
        defaults: npcData
      });

      if (created) {
        console.log(`  ✓ Created NPC: ${npcData.id} (${npcData.name})`);
        count++;
      } else {
        // Update existing NPC with latest data (especially dialogue)
        await npc.update(npcData);
        console.log(`  - Updated NPC: ${npcData.id} (${npcData.name})`);
        count++; // Count updates too
      }
    } catch (error) {
      console.error(`  ✗ Error creating NPC ${npcData.id}:`, error.message);
    }
  }

  return count;
}

/**
 * Seed Items from items.js data file
 */
async function seedItems() {
  const itemsData = require('../data/items');
  const allItems = itemsData.getAllItemDefinitions();
  let count = 0;

  for (const [itemId, itemData] of Object.entries(allItems)) {
    try {
      // Convert to database format
      const dbItem = {
        id: itemData.id,
        name: itemData.name,
        itemType: itemData.type,
        rarity: itemData.rarity || 'common',
        description: itemData.description || '',
        stats: itemData.stats || {},
        equipmentSlot: itemData.equipmentSlot || null,
        value: itemData.value || 0,
        weight: itemData.weight || 0,
        factionId: itemData.factionId || null,
        minReputationTier: itemData.minReputationTier || null
      };

      const [item, created] = await Item.findOrCreate({
        where: { id: itemId },
        defaults: dbItem
      });

      if (created) {
        console.log(`  ✓ Created Item: ${itemId} (${itemData.name})`);
        count++;
      } else {
        // Update existing item
        await item.update(dbItem);
        console.log(`  - Updated Item: ${itemId}`);
      }
    } catch (error) {
      console.error(`  ✗ Error creating item ${itemId}:`, error.message);
    }
  }

  return count;
}

/**
 * Seed Quests from a directory
 */
async function seedQuests(questDir) {
  if (!fs.existsSync(questDir)) {
    console.log(`Quest directory not found: ${questDir}`);
    return 0;
  }

  const files = fs.readdirSync(questDir).filter(f => f.endsWith('.json'));
  let count = 0;

  for (const file of files) {
    const filePath = path.join(questDir, file);
    const questData = loadJSON(filePath);
    
    if (!questData) continue;

    try {
      const [quest, created] = await Quest.findOrCreate({
        where: { id: questData.id },
        defaults: questData
      });

      if (created) {
        console.log(`  ✓ Created Quest: ${questData.id} (${questData.title})`);
        count++;
      } else {
        // Update existing quest with latest data
        await quest.update(questData);
        console.log(`  - Updated Quest: ${questData.id} (${questData.title})`);
      }
    } catch (error) {
      console.error(`  ✗ Error creating quest ${questData.id}:`, error.message);
    }
  }

  return count;
}

/**
 * Update planet POIs and resources from JSON files
 */
async function updatePlanetContent(planetId) {
  const planetDir = path.join(CONTENT_DIR, 'planets', planetId);
  
  if (!fs.existsSync(planetDir)) {
    console.log(`  ✗ Planet directory not found: ${planetDir}`);
    console.log(`    (Looking for: ${path.resolve(planetDir)})`);
    return false;
  }
  
  console.log(`    Found planet directory: ${planetDir}`);

  try {
    const planet = await Planet.findByPk(planetId);
    if (!planet) {
      console.log(`  - Planet not found in database: ${planetId}`);
      return false;
    }

    // Load POIs
    const poisPath = path.join(planetDir, 'pois.json');
    if (fs.existsSync(poisPath)) {
      const poisData = loadJSON(poisPath);
      if (poisData && poisData.pointsOfInterest) {
        // Transform POIs from location.x/y format to x/y format for frontend compatibility
        const transformedPOIs = poisData.pointsOfInterest.map(poi => {
          const transformed = { ...poi };
          // If POI has location object, extract x and y to top level
          if (poi.location && typeof poi.location.x !== 'undefined' && typeof poi.location.y !== 'undefined') {
            // Convert coordinates: if > 100, assume 0-1000 range and divide by 10 to get 0-100 percentage
            let x = poi.location.x;
            let y = poi.location.y;
            
            // If coordinates are > 100, they're likely in 0-1000 range, convert to 0-100
            if (x > 100) {
              x = x / 10;
            }
            if (y > 100) {
              y = y / 10;
            }
            
            // Ensure coordinates are within valid range (0-100)
            transformed.x = Math.max(0, Math.min(100, x));
            transformed.y = Math.max(0, Math.min(100, y));
            
            // Keep area if it exists
            if (poi.location.area) {
              transformed.area = poi.location.area;
            }
          } else if (typeof poi.x !== 'undefined' && typeof poi.y !== 'undefined') {
            // POI already has x/y at top level, but may need conversion
            let x = poi.x;
            let y = poi.y;
            
            // If coordinates are > 100, they're likely in 0-1000 range, convert to 0-100
            if (x > 100) {
              x = x / 10;
            }
            if (y > 100) {
              y = y / 10;
            }
            
            transformed.x = Math.max(0, Math.min(100, x));
            transformed.y = Math.max(0, Math.min(100, y));
          }
          
          // Ensure x and y are numbers (0-100 percentage)
          if (typeof transformed.x === 'undefined' || transformed.x === null) {
            transformed.x = 50; // Default center
          }
          if (typeof transformed.y === 'undefined' || transformed.y === null) {
            transformed.y = 50; // Default center
          }
          
          return transformed;
        });
        planet.pointsOfInterest = transformedPOIs;
        console.log(`  ✓ Updated POIs for ${planetId}: ${transformedPOIs.length} POIs`);
      }
    }

    // Load resources
    const resourcesPath = path.join(planetDir, 'resources.json');
    if (fs.existsSync(resourcesPath)) {
      const resourcesData = loadJSON(resourcesPath);
      if (resourcesData && resourcesData.resources) {
        planet.resources = resourcesData.resources;
        console.log(`  ✓ Updated resources for ${planetId}: ${resourcesData.resources.length} resources`);
      }
    }

    await planet.save();
    return true;
  } catch (error) {
    console.error(`  ✗ Error updating planet ${planetId}:`, error.message);
    return false;
  }
}

/**
 * Main seeder function
 */
async function seedPhase1Content() {
  try {
    console.log('🚀 Seeding Phase 1 & Phase 2 Content...\n');

    // Check database connection first
    console.log('🔌 Checking database connection...');
    console.log(`   Host: ${process.env.DB_HOST || 'localhost'}`);
    console.log(`   Port: ${process.env.DB_PORT || 5432}`);
    console.log(`   Database: ${process.env.DB_NAME || 'of_the_galaxy_dev'}`);
    console.log(`   User: ${process.env.DB_USER || 'postgres'}`);
    console.log(`   Password: ${process.env.DB_PASSWORD ? '***' : 'NOT SET'}\n`);

    if (!process.env.DB_PASSWORD) {
      console.error('❌ ERROR: DB_PASSWORD not set in environment variables!');
      console.error('\nPlease ensure you have a .env file with database credentials.');
      console.error('Expected location: /Users/jefe/Downloads/of-the-galaxy-rpg-foundation/.env');
      console.error('\nRequired variables:');
      console.error('  DB_HOST=localhost');
      console.error('  DB_PORT=5432');
      console.error('  DB_NAME=of_the_galaxy_dev');
      console.error('  DB_USER=postgres');
      console.error('  DB_PASSWORD=your_postgres_password');
      process.exit(1);
    }

    // Test database connection
    try {
      await sequelize.authenticate();
      console.log('✓ Database connection successful\n');
    } catch (authError) {
      console.error('❌ Database authentication failed!');
      console.error('\nPossible issues:');
      console.error('  1. PostgreSQL is not running');
      console.error('  2. Database password is incorrect');
      console.error('  3. Database does not exist');
      console.error('  4. User does not have access');
      console.error('\nTroubleshooting steps:');
      console.error('  1. Check if PostgreSQL is running:');
      console.error('     brew services list  # macOS');
      console.error('     sudo systemctl status postgresql  # Linux');
      console.error('  2. Test connection manually:');
      console.error(`     psql -h ${process.env.DB_HOST || 'localhost'} -U ${process.env.DB_USER || 'postgres'} -d ${process.env.DB_NAME || 'of_the_galaxy_dev'}`);
      console.error('  3. Verify .env file has correct credentials');
      throw authError;
    }

    // Ensure database is synced
    await sequelize.sync();
    console.log('✓ Database synced\n');

    let totalNPCs = 0;
    let totalItems = 0;
    let totalQuests = 0;
    let planetsUpdated = 0;

    // Seed NPCs by faction
    console.log('📝 Seeding NPCs...');
    const factions = [
      'independent_investigators',
      'drift_cartel',
      'keeper_seekers',
      'concord',
      'dominion_remnant',
      'outer_rim_settlers'
    ];

    for (const faction of factions) {
      const npcDir = path.join(CONTENT_DIR, 'factions', faction, 'npcs');
      if (fs.existsSync(npcDir)) {
        console.log(`\n  Faction: ${faction}`);
        const files = fs.readdirSync(npcDir).filter(f => f.endsWith('.json'));
        console.log(`    Found ${files.length} NPC files`);
        const count = await seedNPCs(npcDir);
        totalNPCs += count;
      } else {
        console.log(`\n  Faction: ${faction} - NPC directory not found: ${npcDir}`);
      }
    }

    console.log(`\n✓ NPCs seeded: ${totalNPCs} new NPCs\n`);

    // Seed Items
    console.log('🎒 Seeding Items...');
    totalItems = await seedItems();
    console.log(`\n✓ Items seeded: ${totalItems} items\n`);

    // Seed Quests by faction
    console.log('📜 Seeding Quests...');
    const questTypes = ['main_quests', 'side_quests'];

    for (const faction of factions) {
      for (const questType of questTypes) {
        const questDir = path.join(CONTENT_DIR, 'factions', faction, questType);
        if (fs.existsSync(questDir)) {
          console.log(`\n  Faction: ${faction} (${questType})`);
          const files = fs.readdirSync(questDir).filter(f => f.endsWith('.json'));
          console.log(`    Found ${files.length} quest files`);
          const count = await seedQuests(questDir);
          totalQuests += count;
        } else {
          console.log(`\n  Faction: ${faction} (${questType}) - Directory not found: ${questDir}`);
        }
      }
    }

    console.log(`\n✓ Quests seeded: ${totalQuests} new quests\n`);

    // Update Planet Content
    console.log('🌍 Updating Planet Content...');
    const phase1Planets = ['sytha', 'gravenmoor', 'caldon', 'centralis', 'sinkport'];
    
    for (const planetId of phase1Planets) {
      console.log(`\n  Planet: ${planetId}`);
      const updated = await updatePlanetContent(planetId);
      if (updated) planetsUpdated++;
    }

    console.log(`\n✓ Planets updated: ${planetsUpdated}/${phase1Planets.length}\n`);

    console.log('✅ Phase 1 & Phase 2 content seeded successfully!');
    console.log(`\nSummary:`);
    console.log(`  - NPCs: ${totalNPCs} new`);
    console.log(`  - Items: ${totalItems}`);
    console.log(`  - Quests: ${totalQuests} new`);
    console.log(`  - Planets: ${planetsUpdated} updated`);

  } catch (error) {
    console.error('❌ Failed to seed Phase 1 content:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
    console.log('\n🔌 Database connection closed.');
  }
}

// Run seeder
if (require.main === module) {
  seedPhase1Content();
}

module.exports = { seedPhase1Content };

