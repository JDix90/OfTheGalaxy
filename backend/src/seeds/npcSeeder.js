/**
 * NPC Seeder
 * Loads NPC data from content files and procedurally generates NPCs for all planets
 */

const fs = require("fs");
const path = require("path");
const { NPC, Planet } = require("../models");
const npcGenerator = require("../services/npcGenerator");

const NPCS_DIR = path.join(__dirname, "../data/npcs");

const run = async () => {
  console.log("  - Seeding NPCs...");

  try {
    // Step 1: Load NPCs from content files (if any)
    let fileBasedCount = 0;
    const npcFiles = findNpcFiles(NPCS_DIR);
    
    if (npcFiles.length > 0) {
      console.log(`    Loading ${npcFiles.length} NPC(s) from content files...`);
      let createdCount = 0;
      let skippedCount = 0;

      for (const file of npcFiles) {
        const npcData = JSON.parse(fs.readFileSync(file, "utf-8"));

        const [npc, created] = await NPC.findOrCreate({
          where: { id: npcData.id },
          defaults: npcData,
        });

        if (created) {
          createdCount++;
          console.log(`      ✓ Created NPC: ${npc.name}`);
        } else {
          skippedCount++;
        }
      }

      fileBasedCount = createdCount;
      console.log(`    ✓ File-based NPCs: ${createdCount} created, ${skippedCount} skipped.`);
    } else {
      console.log("    ⚠ No NPC files found. Skipping file-based NPC seeding.");
    }

    // Step 2: Procedurally generate NPCs for all planets
    console.log("    Generating NPCs for all planets...");
    const planets = await Planet.findAll({
      order: [['name', 'ASC']]
    });

    if (planets.length === 0) {
      console.log("    ⚠ No planets found. Make sure galaxy data is seeded first.");
      return;
    }

    let planetNPCsGenerated = 0;
    let planetNPCsSkipped = 0;
    let totalNPCsGenerated = 0;
    const batchSize = 10; // Process in batches to show progress

    // Process planets in batches for better progress visibility
    for (let i = 0; i < planets.length; i += batchSize) {
      const batch = planets.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(planets.length / batchSize);
      
      console.log(`    Processing batch ${batchNum}/${totalBatches} (${batch.length} planets)...`);

      for (const planet of batch) {
        try {
          // Check if NPCs already exist for this planet
          const existingNPCs = await NPC.findByLocation(planet.id, 'surface');
          
          if (existingNPCs.length > 0) {
            planetNPCsSkipped++;
            // Only log skipped planets if verbose or in first batch
            if (batchNum === 1) {
              console.log(`      ⊘ ${planet.name}: ${existingNPCs.length} NPCs already exist`);
            }
            continue;
          }

          // Generate NPCs for planet surface
          const generatedNPCs = await npcGenerator.generatePlanetNPCs(planet);
          const count = generatedNPCs.length;
          totalNPCsGenerated += count;
          planetNPCsGenerated++;
          
          console.log(`      ✓ ${planet.name}: Generated ${count} NPCs`);
        } catch (error) {
          console.error(`      ✗ ${planet.name}: Error generating NPCs - ${error.message}`);
          // Continue with other planets even if one fails
        }
      }
    }

    console.log(`  ✓ NPC seeding completed:`);
    console.log(`    - File-based: ${fileBasedCount} created`);
    console.log(`    - Planet surface NPCs: ${totalNPCsGenerated} generated across ${planetNPCsGenerated} planets`);
    console.log(`    - Planets skipped (already had NPCs): ${planetNPCsSkipped}`);
    console.log(`    - Total planets processed: ${planets.length}`);
    
  } catch (error) {
    console.error("  ✗ Error seeding NPCs:", error);
    throw error;
  }
};

const findNpcFiles = (dir) => {
  let files = [];
  
  // Check if directory exists
  if (!fs.existsSync(dir)) {
    console.log(`    ⚠ NPC directory not found: ${dir}`);
    return files;
  }
  
  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      files = [...files, ...findNpcFiles(fullPath)];
    } else if (item.isFile() && item.name.endsWith(".json")) {
      files.push(fullPath);
    }
  }

  return files;
};

module.exports = { run };
