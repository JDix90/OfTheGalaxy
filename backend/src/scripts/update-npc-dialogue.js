/**
 * Update NPC Dialogue Script
 * Updates NPC dialogue from content files to ensure quest dialogue is current
 * 
 * Usage: node backend/src/scripts/update-npc-dialogue.js
 */

// Load environment variables
const path = require('path');
const fs = require('fs');

// Try loading .env from different locations
const envPaths = [
  path.join(__dirname, '../../.env'),
  path.join(__dirname, '../../../.env'),
  path.join(__dirname, '../.env'),
];

let envLoaded = false;
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  require('dotenv').config();
}

const { sequelize, NPC } = require('../models');

async function updateNPCDialogue() {
  try {
    await sequelize.authenticate();
    console.log('✓ Database connected\n');

    // Find all NPC content files
    const contentDir = path.join(__dirname, '../../../content/factions');
    const npcFiles = [];

    function findNPCFiles(dir) {
      if (!fs.existsSync(dir)) return;
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
          findNPCFiles(filePath);
        } else if (file.endsWith('.json') && filePath.includes('/npcs/')) {
          npcFiles.push(filePath);
        }
      }
    }

    findNPCFiles(contentDir);
    console.log(`Found ${npcFiles.length} NPC files\n`);

    let updated = 0;
    let notFound = 0;
    let unchanged = 0;

    for (const filePath of npcFiles) {
      try {
        const npcData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        // Find NPC in database
        const npc = await NPC.findByPk(npcData.id);
        
        if (!npc) {
          console.log(`⚠ NPC not found in database: ${npcData.id}`);
          notFound++;
          continue;
        }

        // Update dialogue if it exists in file
        if (npcData.dialogue) {
          const oldDialogue = JSON.stringify(npc.dialogue);
          const newDialogue = JSON.stringify(npcData.dialogue);
          
          if (oldDialogue !== newDialogue) {
            await npc.update({ dialogue: npcData.dialogue });
            console.log(`✓ Updated dialogue for ${npcData.id} (${npcData.name})`);
            updated++;
          } else {
            unchanged++;
          }
        }
      } catch (error) {
        console.error(`✗ Error processing ${filePath}:`, error.message);
      }
    }

    console.log(`\n✅ Update complete:`);
    console.log(`   Updated: ${updated} NPCs`);
    console.log(`   Unchanged: ${unchanged} NPCs`);
    console.log(`   Not found: ${notFound} NPCs`);
    console.log(`   Total files: ${npcFiles.length}`);

  } catch (error) {
    console.error('❌ Error updating NPC dialogue:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the update
updateNPCDialogue();

