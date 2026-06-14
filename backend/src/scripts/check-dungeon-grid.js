require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { sequelize } = require('../models');
const SubMap = require('../models/SubMap')(sequelize);

async function checkDungeonGrid() {
  try {
    await sequelize.authenticate();
    console.log('✓ Database connected');

    const subMap = await SubMap.findByPk('gravenmoor_devourer_pit_dungeon');
    
    if (!subMap) {
      console.log('SubMap not found');
      await sequelize.close();
      return;
    }

    const layout = subMap.layoutData || subMap.layout || {};
    const grid = layout.grid;
    
    if (!grid || !Array.isArray(grid)) {
      console.log('❌ No grid found in layoutData');
      console.log('LayoutData keys:', Object.keys(layout));
      await sequelize.close();
      return;
    }

    console.log('✓ Grid found in database');
    console.log('Grid dimensions:', grid.length, 'x', grid[0]?.length || 0);
    
    let wallCount = 0;
    let corridorCount = 0;
    let roomCount = 0;
    let entranceCount = 0;
    let bossCount = 0;
    let otherCount = 0;
    
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < (grid[y]?.length || 0); x++) {
        const val = grid[y][x];
        if (val === 0) wallCount++;
        else if (val === 1) corridorCount++;
        else if (val === 2) roomCount++;
        else if (val === 3) entranceCount++;
        else if (val === 4) bossCount++;
        else otherCount++;
      }
    }
    
    const totalCells = grid.length * (grid[0]?.length || 0);
    const wallPercent = totalCells > 0 ? (wallCount / totalCells * 100).toFixed(1) : 0;
    
    console.log('\nGrid Analysis:');
    console.log('  Walls (0):', wallCount, `(${wallPercent}%)`);
    console.log('  Corridors (1):', corridorCount);
    console.log('  Rooms (2):', roomCount);
    console.log('  Entrance (3):', entranceCount);
    console.log('  Boss (4):', bossCount);
    console.log('  Other:', otherCount);
    console.log('  Total cells:', totalCells);
    
    if (wallCount === 0) {
      console.log('\n❌ CRITICAL: Grid has NO WALLS!');
    } else {
      console.log('\n✓ Grid has walls');
    }
    
    console.log('\nFirst 10 rows:');
    for (let y = 0; y < Math.min(10, grid.length); y++) {
      let row = '';
      for (let x = 0; x < Math.min(20, grid[y]?.length || 0); x++) {
        row += grid[y][x] + ' ';
      }
      console.log(`Row ${y}: ${row}`);
    }
    
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await sequelize.close();
    process.exit(1);
  }
}

checkDungeonGrid();


