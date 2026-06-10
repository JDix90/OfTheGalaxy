/**
 * Assign Character to User
 * Script to assign an existing character to a user account
 * 
 * Usage: node src/scripts/assign-character-to-user.js <characterName> <userEmail>
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { sequelize, User, PlayerCharacter } = require('../models');

async function assignCharacterToUser(characterName, userEmail) {
  try {
    await sequelize.authenticate();
    console.log('✓ Database connected');

    // Find user by email
    const user = await User.findOne({ where: { email: userEmail.toLowerCase() } });
    if (!user) {
      console.error(`❌ User not found: ${userEmail}`);
      console.log('\nAvailable users:');
      const allUsers = await User.findAll({ attributes: ['id', 'email'] });
      allUsers.forEach(u => console.log(`  - ${u.email} (${u.id})`));
      await sequelize.close();
      process.exit(1);
    }

    console.log(`✓ Found user: ${user.email} (${user.id})`);

    // Find character by name
    const character = await PlayerCharacter.findOne({ where: { name: characterName } });
    if (!character) {
      console.error(`❌ Character not found: ${characterName}`);
      console.log('\nAvailable characters:');
      const allCharacters = await PlayerCharacter.findAll({ 
        attributes: ['id', 'name', 'userId'],
        include: [{ model: User, as: 'user', attributes: ['email'], required: false }]
      });
      allCharacters.forEach(c => {
        const userEmail = c.user ? c.user.email : 'No user';
        console.log(`  - ${c.name} (${c.id}) - User: ${userEmail}`);
      });
      await sequelize.close();
      process.exit(1);
    }

    console.log(`✓ Found character: ${character.name} (${character.id})`);
    console.log(`  Current user: ${character.userId || 'No user assigned'}`);

    // Update character's userId
    await character.update({ userId: user.id });
    await character.reload();

    console.log(`\n✅ Successfully assigned character "${characterName}" to user "${userEmail}"`);
    console.log(`   Character ID: ${character.id}`);
    console.log(`   User ID: ${user.id}`);

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('Error assigning character to user:', error.message);
    console.error(error.stack);
    await sequelize.close();
    process.exit(1);
  }
}

// Get command line arguments
const characterName = process.argv[2];
const userEmail = process.argv[3];

if (!characterName || !userEmail) {
  console.error('Usage: node src/scripts/assign-character-to-user.js <characterName> <userEmail>');
  console.error('Example: node src/scripts/assign-character-to-user.js Alyria darth.admin@galaxy.com');
  process.exit(1);
}

assignCharacterToUser(characterName, userEmail);


