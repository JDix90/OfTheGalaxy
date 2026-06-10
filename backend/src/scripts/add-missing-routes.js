/**
 * Add Missing Travel Routes
 * Adds routes connecting utapau_system and felucia_system to the main network
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { sequelize } = require('../models');
const TravelRoute = require('../models/TravelRoute')(sequelize);
const { v4: uuidv4 } = require('uuid');

const missingRoutes = [
  { from: 'naboo_system', to: 'utapau_system', time: 4, cost: 200 },
  { from: 'utapau_system', to: 'naboo_system', time: 4, cost: 200 },
  { from: 'kashyyyk_system', to: 'felucia_system', time: 5, cost: 250 },
  { from: 'felucia_system', to: 'kashyyyk_system', time: 5, cost: 250 },
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
          routeType: 'hyperlane',
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


