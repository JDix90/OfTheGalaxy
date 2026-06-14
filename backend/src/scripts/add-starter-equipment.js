/**
 * Add Starter Equipment to Existing Character
 * Adds starter equipment (weapon, armor, consumables) to an existing character
 * and auto-equips the weapon and armor
 */

// Load environment variables - try multiple paths
const path = require('path');
const envPath = path.join(__dirname, '../../.env');
if (require('fs').existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
} else {
  require('dotenv').config();
}

const { sequelize, PlayerCharacter, PlayerInventory } = require('../models');
const inventoryService = require('../services/inventoryService');

async function addStarterEquipment(characterName) {
  try {
    await sequelize.authenticate();
    console.log('✓ Database connected');

    // Find character by name
    const character = await PlayerCharacter.findOne({ 
      where: { name: characterName } 
    });

    if (!character) {
      console.error(`✗ Character not found with name: ${characterName}`);
      return;
    }

    console.log(`✓ Found character: ${character.name} (${character.id})`);
    console.log(`  User ID: ${character.userId}`);
    console.log(`  Level: ${character.level}`);
    console.log(`  Background: ${character.background}`);

    // Determine starter items based on background (or use default)
    const starterItems = getStarterItemsForBackground(character.background);

    console.log(`\n📦 Adding starter equipment...`);
    console.log(`  Items: ${starterItems.join(', ')}`);

    // Add items to inventory
    const addedItems = [];
    for (const itemId of starterItems) {
      try {
        const item = await inventoryService.addItem(
          character.id, 
          itemId, 
          1, 
          'starter_equipment_script'
        );
        addedItems.push({ itemId, item });
        console.log(`  ✓ Added: ${itemId}`);
      } catch (error) {
        console.error(`  ✗ Failed to add ${itemId}:`, error.message);
      }
    }

    // Auto-equip weapon and armor
    console.log(`\n⚔️ Auto-equipping weapon and armor...`);
    
    for (const { itemId } of addedItems) {
      try {
        const itemData = await inventoryService.getItemData(itemId);
        
        if (itemData.equipmentSlot && (itemData.equipmentSlot === 'weapon' || itemData.equipmentSlot === 'armor')) {
          // Check if already equipped
          const existingEquipped = await PlayerInventory.findOne({
            where: {
              characterId: character.id,
              itemId: itemId,
              equipped: true
            }
          });

          if (!existingEquipped) {
            await inventoryService.equipItem(character.id, itemId, itemData.equipmentSlot);
            console.log(`  ✓ Equipped: ${itemId} to ${itemData.equipmentSlot} slot`);
          } else {
            console.log(`  - Already equipped: ${itemId}`);
          }
        }
      } catch (error) {
        console.warn(`  ⚠ Could not equip ${itemId}:`, error.message);
      }
    }

    // Show final equipped items
    const equipped = await inventoryService.getEquipped(character.id);
    console.log(`\n✅ Starter equipment added and equipped!`);
    console.log(`\n📋 Currently Equipped:`);
    if (equipped.length === 0) {
      console.log(`  (none)`);
    } else {
      equipped.forEach(item => {
        console.log(`  - ${item.itemId} (${item.equipmentSlot})`);
      });
    }

  } catch (error) {
    console.error('❌ Error adding starter equipment:', error);
    console.error('Stack:', error.stack);
  } finally {
    await sequelize.close();
  }
}

/**
 * Get starter items based on background
 */
function getStarterItemsForBackground(background) {
  const backgrounds = {
    smuggler: ['pulser_pistol_01', 'armor_light_01', 'medpac_01'],
    scholar: ['datapad_01', 'armor_light_01', 'medpac_01'],
    soldier: ['pulser_rifle_01', 'armor_medium_01', 'medpac_01', 'stimpack_01'],
    medic: ['pulser_pistol_01', 'armor_light_01', 'medpac_01', 'medpac_01'],
    engineer: ['pulser_pistol_01', 'armor_light_01', 'medpac_01'],
    diplomat: ['pulser_pistol_01', 'armor_light_01', 'comlink_01', 'medpac_01'],
    pilot: ['pulser_pistol_01', 'armor_light_01', 'medpac_01']
  };

  // Default to smuggler items if background not found
  return backgrounds[background] || backgrounds.smuggler;
}

// Get character name from command line arguments
const args = process.argv.slice(2);
const characterName = args[0] || 'Alyria';

if (!characterName) {
  console.log('Usage: node add-starter-equipment.js <characterName>');
  console.log('Example: node add-starter-equipment.js Alyria');
  process.exit(1);
}

addStarterEquipment(characterName);

