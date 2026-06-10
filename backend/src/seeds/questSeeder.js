/**
 * Quest Seeder
 * Loads quest data from content files into the database
 */

const fs = require("fs");
const path = require("path");
const { Quest } = require("../models");

const QUESTS_DIR = path.join(__dirname, "../data/quests");

const run = async () => {
  console.log("  - Seeding quests...");

  try {
    const questFiles = findQuestFiles(QUESTS_DIR);
    
    if (questFiles.length === 0) {
      console.log("  ⚠ No quest files found. Skipping quest seeding.");
      return;
    }
    
    let createdCount = 0;
    let skippedCount = 0;

    for (const file of questFiles) {
      const questData = JSON.parse(fs.readFileSync(file, "utf-8"));

      const [quest, created] = await Quest.findOrCreate({
        where: { id: questData.id },
        defaults: questData,
      });

      if (created) {
        createdCount++;
        console.log(`    ✓ Created quest: ${quest.title}`);
      } else {
        skippedCount++;
      }
    }

    console.log(`  ✓ Quests seeded: ${createdCount} created, ${skippedCount} skipped.`);
  } catch (error) {
    console.error("  ✗ Error seeding quests:", error);
    throw error;
  }
};

const findQuestFiles = (dir) => {
  let files = [];
  
  // Check if directory exists
  if (!fs.existsSync(dir)) {
    console.log(`    ⚠ Quest directory not found: ${dir}`);
    return files;
  }
  
  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      files = [...files, ...findQuestFiles(fullPath)];
    } else if (item.isFile() && item.name.endsWith(".json")) {
      files.push(fullPath);
    }
  }

  return files;
};

module.exports = { run };
