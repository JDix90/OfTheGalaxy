/**
 * Jest globalSetup — runs ONCE before the suite (serial, before workers).
 *
 * Builds the test schema directly from the Sequelize models with sync({ force: true })
 * instead of relying on the migration files, which have drifted from the models (e.g.
 * player_characters is missing the `abilities` column the model defines). The dev server
 * papers over this with sync({ alter: true }); tests need the same source of truth.
 *
 * Doing this in globalSetup (not per-file beforeAll) avoids parallel workers racing to
 * drop/recreate the shared test database.
 */
module.exports = async () => {
  process.env.NODE_ENV = 'test';
  const { sequelize } = require('../../src/models');
  await sequelize.authenticate();
  await sequelize.sync({ force: true });
  await sequelize.close();
};
