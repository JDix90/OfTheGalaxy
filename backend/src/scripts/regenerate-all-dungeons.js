require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { sequelize } = require('../models');
const SubMap = require('../models/SubMap')(sequelize);

async function regenerateAllDungeons() {
  try {
    await sequelize.authenticate();
    console.log('✓ Database connected');

    // Find all dungeon submaps
    const dungeons = await SubMap.findAll({
      where: { type: 'dungeon' },
      attributes: ['id', 'name', 'planetId', 'parentLocationId', 'parentLocationType']
    });

    console.log(`\nFound ${dungeons.length} dungeon submaps to regenerate:`);
    dungeons.forEach(d => {
      console.log(`  - ${d.name} (${d.id}) on planet ${d.planetId}`);
    });

    if (dungeons.length === 0) {
      console.log('\n✓ No dungeons found. Nothing to regenerate.');
      await sequelize.close();
      return;
    }

    // Delete all dungeon submaps
    const deleted = await SubMap.destroy({
      where: { type: 'dungeon' }
    });

    console.log(`\n✓ Deleted ${deleted} dungeon submaps`);
    console.log('The dungeons will be regenerated with proper walls when players enter them.');
    console.log('\nNote: Players will need to re-enter each dungeon to trigger regeneration.');
    
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await sequelize.close();
    process.exit(1);
  }
}

regenerateAllDungeons();


