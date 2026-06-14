/**
 * Add Missing Travel Routes
 * Adds routes connecting casmer_system and myssia_system to the main network
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { sequelize } = require('../models');
const TravelRoute = require('../models/TravelRoute')(sequelize);
const { v4: uuidv4 } = require('uuid');

const missingRoutes = [
  { from: 'eloria_system', to: 'casmer_system', time: 4, cost: 200 },
  { from: 'casmer_system', to: 'eloria_system', time: 4, cost: 200 },
  { from: 'verdholm_system', to: 'myssia_system', time: 5, cost: 250 },
  { from: 'myssia_system', to: 'verdholm_system', time: 5, cost: 250 },
];

async function addMissingRoutes() {
  try {
    await sequelize.authenticate();
    console.log('✓ Database connected');

    for (const routeData of missingRoutes) {
      const [route, created] = await TravelRoute.findOrCreate({
        where: {
          fromSystemId: routeData.from,
          toSystemId: routeData.to
        },
        defaults: {
          id: uuidv4(),
          fromSystemId: routeData.from,
          toSystemId: routeData.to,
          routeType: 'foldlane',
          travelTime: routeData.time,
          cost: routeData.cost,
          isActive: true
        }
      });

      if (created) {
        console.log(`✓ Created route: ${routeData.from} → ${routeData.to}`);
      } else {
        console.log(`- Route already exists: ${routeData.from} → ${routeData.to}`);
      }
    }

    console.log('\n✓ Missing routes added!');
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
    await sequelize.close();
    process.exit(1);
  }
}

addMissingRoutes();


