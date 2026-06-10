/**
 * Add Credits to Character by User Email Script
 * Adds credits to a character for a specific user (for testing purposes)
 * 
 * Usage: node backend/src/scripts/add-credits-by-user-email.js [userEmail] [amount]
 * Example: node backend/src/scripts/add-credits-by-user-email.js darth.admin@galaxy.com 1000000
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

const { sequelize, User, PlayerCharacter } = require('../models');

/**
 * Add credits to a character by user email
 */
async function addCreditsByUserEmail(userEmail, amount) {
  try {
    console.log(`🔍 Looking for user: "${userEmail}"...\n`);

    // Find user by email (case-insensitive)
    const user = await User.findOne({
      where: sequelize.where(
        sequelize.fn('LOWER', sequelize.col('email')),
        userEmail.toLowerCase()
      )
    });

    if (!user) {
      console.error(`❌ User "${userEmail}" not found!`);
      console.error('\nAvailable users:');
      const allUsers = await User.findAll({
        attributes: ['id', 'email'],
        limit: 20
      });
      allUsers.forEach(u => {
        console.error(`  - ${u.email} (ID: ${u.id})`);
      });
      process.exit(1);
    }

    console.log(`✓ Found user: ${user.email} (ID: ${user.id})\n`);

    // Find characters for this user
    const characters = await PlayerCharacter.findAll({
      where: { userId: user.id },
      order: [['createdAt', 'DESC']]
    });

    if (characters.length === 0) {
      console.error(`❌ No characters found for user "${userEmail}"!`);
      process.exit(1);
    }

    // Use the first character (most recently created)
    const character = characters[0];
    
    console.log(`✓ Found character: ${character.name} (ID: ${character.id})`);
    console.log(`  Current credits: ${(character.credits || 0).toLocaleString()}`);
    console.log(`  Adding: ${amount.toLocaleString()} credits\n`);

    // Update credits
    const currentCredits = character.credits || 0;
    const newCredits = currentCredits + amount;
    await character.update({ credits: newCredits });

    console.log(`✅ Successfully updated credits!`);
    console.log(`  Character: ${character.name}`);
    console.log(`  New balance: ${newCredits.toLocaleString()} credits\n`);
    
    if (characters.length > 1) {
      console.log(`ℹ️  Note: User has ${characters.length} character(s). Updated the most recent one.`);
      console.log(`   Other characters:`);
      characters.slice(1).forEach(c => {
        console.log(`     - ${c.name} (${(c.credits || 0).toLocaleString()} credits)`);
      });
      console.log('');
    }
    
    console.log(`⚠️  IMPORTANT: The frontend caches character data.`);
    console.log(`   To see the updated credits:`);
    console.log(`   1. Refresh the page (F5 or Cmd+R)`);
    console.log(`   2. OR navigate away and back to the Galaxy Map`);
    console.log(`   3. OR change character and select again\n`);

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
    const userEmail = args[0] || 'darth.admin@galaxy.com';
    const amount = parseInt(args[1]) || 1000000;

    if (isNaN(amount) || amount < 0) {
      console.error('❌ Invalid amount. Please provide a positive number.');
      process.exit(1);
    }

    console.log('💰 Adding Credits to Character by User Email\n');
    console.log(`User Email: ${userEmail}`);
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
    await addCreditsByUserEmail(userEmail, amount);

    console.log('✅ Script completed successfully!');

  } catch (error) {
    console.error('\n❌ Script failed:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
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

module.exports = { addCreditsByUserEmail };

