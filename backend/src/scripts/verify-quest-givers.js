/**
 * Verify and ensure quest giver NPCs are seeded
 * This script checks if the quest giver NPCs exist and creates them if they don't
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const fs = require('fs');
const path = require('path');
const { sequelize, NPC } = require('../models');

const CONTENT_DIR = path.join(__dirname, '../../../content');

const questGiverNPCs = [
  {
    id: 'npc_village_elder',
    file: path.join(CONTENT_DIR, 'factions/new_republic/npcs/twi_lek_village_elder.json')
  },
  {
    id: 'npc_twi_lek_informant',
    file: path.join(CONTENT_DIR, 'factions/independent_investigators/npcs/twi_lek_informant.json')
  },
  {
    id: 'npc_smuggler_contact_ryloth',
    file: path.join(CONTENT_DIR, 'factions/smugglers_guild/npcs/smuggler_contact_ryloth.json')
  }
];

async function loadJSON(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error loading ${filePath}:`, error.message);
    return null;
  }
}

async function verifyAndSeed() {
  try {
    await sequelize.authenticate();
    console.log('✓ Database connected\n');

    for (const npcInfo of questGiverNPCs) {
      console.log(`Checking ${npcInfo.id}...`);
      
      // Check if NPC exists
      const existing = await NPC.findByPk(npcInfo.id);
      
      if (existing) {
        console.log(`  ✓ Found: ${existing.name}`);
        console.log(`    Location: ${JSON.stringify(existing.location)}`);
        console.log(`    Type: ${existing.npcType}`);
        console.log(`    Available: ${existing.isAvailable}`);
      } else {
        console.log(`  ✗ Not found, creating from file...`);
        
        // Load from JSON file
        const npcData = loadJSON(npcInfo.file);
        if (!npcData) {
          console.log(`  ✗ Could not load file: ${npcInfo.file}`);
          continue;
        }
        
        // Create NPC
        try {
          const created = await NPC.create(npcData);
          console.log(`  ✓ Created: ${created.name}`);
          console.log(`    Location: ${JSON.stringify(created.location)}`);
        } catch (error) {
          console.error(`  ✗ Error creating: ${error.message}`);
        }
      }
      console.log('');
    }
    
    // Also check for any NPCs on Ryloth
    console.log('\nChecking all NPCs on Ryloth...');
    const Sequelize = require('sequelize');
    const rylothNPCs = await NPC.findAll({
      where: {
        [Sequelize.Op.and]: [
          Sequelize.where(
            Sequelize.fn('jsonb_extract_path_text', Sequelize.col('location'), 'planet'),
            'ryloth'
          )
        ]
      }
    });
    
    console.log(`Found ${rylothNPCs.length} NPCs on Ryloth:`);
    rylothNPCs.forEach(npc => {
      console.log(`  - ${npc.id}: ${npc.name} (${npc.npcType}) | Area: ${npc.location?.area || 'none'}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

verifyAndSeed();



