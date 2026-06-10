/**
 * Force Refresh Character Script
 * Updates character credits and provides instructions to clear frontend cache
 * 
 * Usage: node backend/src/scripts/force-refresh-character.js [characterName] [amount]
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

const { sequelize, PlayerCharacter } = require('../models');

/**
 * Force update character credits
 */
async function forceUpdateCredits(characterName, amount) {
  try {
    console.log(`🔍 Finding character: "${characterName}"...\n`);

    // Find character by name (case-insensitive)
    const character = await PlayerCharacter.findOne({
      where: sequelize.where(
        sequelize.fn('LOWER', sequelize.col('name')),
        characterName.toLowerCase()
      )
    });

    if (!character) {
      console.error(`❌ Character "${characterName}" not found!`);
      process.exit(1);
    }

    console.log(`✓ Found character: ${character.name}`);
    console.log(`  ID: ${character.id}`);
    console.log(`  Current credits: ${character.credits.toLocaleString()}`);
    console.log(`  Setting credits to: ${amount.toLocaleString()}\n`);

    // Force update credits directly
    await PlayerCharacter.update(
      { credits: amount },
      { where: { id: character.id } }
    );

    // Verify update
    const updated = await PlayerCharacter.findByPk(character.id);
    console.log(`✅ Credits updated successfully!`);
    console.log(`  New balance: ${updated.credits.toLocaleString()} credits\n`);

    console.log(`📋 IMPORTANT: Clear frontend cache to see changes:`);
    console.log(`\n   Option 1: Clear Browser LocalStorage`);
    console.log(`   - Open browser DevTools (F12)`);
    console.log(`   - Go to Application/Storage tab`);
    console.log(`   - Find "Local Storage" → your domain`);
    console.log(`   - Delete key: "character-storage"`);
    console.log(`   - Refresh page (F5)\n`);

    console.log(`   Option 2: Use Browser Console`);
    console.log(`   - Open browser DevTools (F12)`);
    console.log(`   - Go to Console tab`);
    console.log(`   - Run: localStorage.removeItem('character-storage')`);
    console.log(`   - Refresh page (F5)\n`);

    console.log(`   Option 3: Hard Refresh`);
    console.log(`   - Windows/Linux: Ctrl+Shift+R`);
    console.log(`   - Mac: Cmd+Shift+R`);
    console.log(`   - This clears cache and reloads from server\n`);

    console.log(`   Character ID for API testing: ${character.id}`);
    console.log(`   Test API: GET http://localhost:3001/api/characters/${character.id}\n`);

    return updated;
  } catch (error) {
    console.error('❌ Error updating character:', error.message);
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  try {
    const args = process.argv.slice(2);
    const characterName = args[0] || 'Alyria';
    const amount = parseInt(args[1]) || 1000000;

    if (isNaN(amount) || amount < 0) {
      console.error('❌ Invalid amount. Please provide a positive number.');
      process.exit(1);
    }

    console.log('💰 Force Updating Character Credits\n');
    console.log(`Character: ${characterName}`);
    console.log(`Amount: ${amount.toLocaleString()} credits\n`);

    if (!process.env.DB_PASSWORD) {
      console.error('❌ ERROR: DB_PASSWORD not set!');
      process.exit(1);
    }

    await sequelize.authenticate();
    console.log('✓ Database connection successful\n');

    await forceUpdateCredits(characterName, amount);

    console.log('✅ Script completed successfully!');

  } catch (error) {
    console.error('\n❌ Script failed:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
    console.log('\n🔌 Database connection closed.');
  }
}

if (require.main === module) {
  main();
}

module.exports = { forceUpdateCredits };



