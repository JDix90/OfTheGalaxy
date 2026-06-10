/**
 * Add Credits to Character Script
 * Adds credits to a character for testing purposes
 * 
 * Usage: node backend/src/scripts/add-credits-to-character.js [characterName] [amount]
 * Example: node backend/src/scripts/add-credits-to-character.js Alyria 1000000
 */

// Load environment variables
const path = require('path');
const fs = require('fs');

// Try loading .env from different locations
const envPaths = [
  path.join(__dirname, '../../.env'),           // backend/.env (most likely)
  path.join(__dirname, '../../../.env'),        // Root directory
  path.join(__dirname, '../.env'),             // backend/src/.env
];

let envLoaded = false;
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
    envLoaded = true;
    break;
  }
}

// If no .env found, try default dotenv behavior
if (!envLoaded) {
  require('dotenv').config();
}

const { sequelize, PlayerCharacter } = require('../models');

/**
 * Add credits to a character
 */
async function addCreditsToCharacter(characterName, amount) {
  try {
    console.log(`🔍 Looking for character: "${characterName}"...\n`);

    // Find character by name (case-insensitive)
    const character = await PlayerCharacter.findOne({
      where: sequelize.where(
        sequelize.fn('LOWER', sequelize.col('name')),
        characterName.toLowerCase()
      )
    });

    if (!character) {
      console.error(`❌ Character "${characterName}" not found!`);
      console.error('\nAvailable characters:');
      const allCharacters = await PlayerCharacter.findAll({
        attributes: ['id', 'name', 'credits'],
        limit: 20
      });
      allCharacters.forEach(c => {
        console.error(`  - ${c.name} (ID: ${c.id}, Credits: ${c.credits})`);
      });
      process.exit(1);
    }

    console.log(`✓ Found character: ${character.name}`);
    console.log(`  Current credits: ${character.credits.toLocaleString()}`);
    console.log(`  Adding: ${amount.toLocaleString()} credits\n`);

    // Update credits
    const newCredits = character.credits + amount;
    await character.update({ credits: newCredits });

    console.log(`✅ Successfully updated credits!`);
    console.log(`  New balance: ${newCredits.toLocaleString()} credits\n`);
    console.log(`⚠️  IMPORTANT: The frontend caches character data.`);
    console.log(`   To see the updated credits:`);
    console.log(`   1. Refresh the page (F5 or Cmd+R)`);
    console.log(`   2. OR navigate away and back to the Galaxy Map`);
    console.log(`   3. OR change character and select Alyria again\n`);

    return character;
  } catch (error) {
    console.error('❌ Error updating character credits:', error.message);
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  try {
    // Get command line arguments
    const args = process.argv.slice(2);
    const characterName = args[0] || 'Alyria';
    const amount = parseInt(args[1]) || 1000000;

    if (isNaN(amount) || amount < 0) {
      console.error('❌ Invalid amount. Please provide a positive number.');
      process.exit(1);
    }

    console.log('💰 Adding Credits to Character\n');
    console.log(`Character: ${characterName}`);
    console.log(`Amount: ${amount.toLocaleString()} credits\n`);

    // Check database connection
    if (!process.env.DB_PASSWORD) {
      console.error('❌ ERROR: DB_PASSWORD not set in environment variables!');
      process.exit(1);
    }

    // Test database connection
    try {
      await sequelize.authenticate();
      console.log('✓ Database connection successful\n');
    } catch (authError) {
      console.error('❌ Database authentication failed!');
      console.error('Please check your .env file and database connection.');
      throw authError;
    }

    // Add credits
    await addCreditsToCharacter(characterName, amount);

    console.log('✅ Script completed successfully!');

  } catch (error) {
    console.error('\n❌ Script failed:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
    console.log('\n🔌 Database connection closed.');
  }
}

// Run script
if (require.main === module) {
  main();
}

module.exports = { addCreditsToCharacter };

