require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { sequelize } = require('../models');
const SubMap = require('../models/SubMap')(sequelize);

async function regenerateDungeon() {
  try {
    await sequelize.authenticate();
    console.log('✓ Database connected');

    // Delete the existing dungeon
    const deleted = await SubMap.destroy({
      where: { id: 'gravenmoor_devourer_pit_dungeon' }
    });
    
    if (deleted > 0) {
      console.log('✓ Deleted existing dungeon submap');
      console.log('The dungeon will be regenerated with walls when the player enters it again.');
    } else {
      console.log('No existing dungeon found to delete');
    }
    
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await sequelize.close();
    process.exit(1);
  }
}

regenerateDungeon();


