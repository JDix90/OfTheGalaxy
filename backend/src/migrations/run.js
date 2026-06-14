/**
 * Migration Runner
 * Executes database migrations in order
 */

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { sequelize, Sequelize } = require("../models");

const MIGRATIONS_DIR = path.join(__dirname);
const MIGRATION_TABLE = "SequelizeMeta";

const runMigrations = async () => {
  try {
    console.log("🚀 Starting migration process...");

    // Check database connection
    await sequelize.authenticate();
    console.log("✓ Database connection successful.");

    // Create migration tracking table if it doesn't exist
    await sequelize.queryInterface.createTable(MIGRATION_TABLE, {
      name: {
        type: Sequelize.STRING,
        allowNull: false,
        primaryKey: true,
      },
    });
    console.log(`✓ Migration table '${MIGRATION_TABLE}' is ready.`);

    // Get executed migrations
    const executedMigrations = (await sequelize.query(
      `SELECT name FROM "${MIGRATION_TABLE}"`,
      { type: Sequelize.QueryTypes.SELECT }
    )).map((row) => row.name);

    console.log(`✓ Found ${executedMigrations.length} executed migrations.`);

    // Get all migration files
    const migrationFiles = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((file) => file.endsWith(".js") && file !== "run.js")
      .sort();

    console.log(`✓ Found ${migrationFiles.length} migration files in total.`);

    // Determine pending migrations
    const pendingMigrations = migrationFiles.filter(
      (file) => !executedMigrations.includes(file)
    );

    if (pendingMigrations.length === 0) {
      console.log("✨ Database is already up to date. No migrations to run.");
      return;
    }

    console.log(`⏳ Running ${pendingMigrations.length} pending migrations...`);

    // Run pending migrations
    for (const file of pendingMigrations) {
      console.log(`  - Executing: ${file}`);
      const migration = require(path.join(MIGRATIONS_DIR, file));
      
      // Check for users table dependency before running 001
      if (file === '001-create-rpg-tables.js') {
        const tables = await sequelize.queryInterface.showAllTables();
        if (!tables.includes('users')) {
          // Check if 000-create-users-table.js is in pending migrations and will run before this
          const currentIndex = pendingMigrations.indexOf(file);
          const usersTableIndex = pendingMigrations.indexOf('000-create-users-table.js');
          
          if (usersTableIndex === -1 || usersTableIndex >= currentIndex) {
            // Users table doesn't exist and won't be created before this migration
            console.error("\n✗ ERROR: The 'users' table was not found.");
            console.error("This RPG foundation requires a 'users' table.");
            console.error("Please ensure migration '000-create-users-table.js' has been run.");
            throw new Error("Dependency 'users' table not found.");
          }
          // If 000 is earlier in the list, it will run first, so this check will pass after it runs
        }
      }

      await migration.up(sequelize.queryInterface, Sequelize);

      // Record migration as executed
      await sequelize.queryInterface.bulkInsert(MIGRATION_TABLE, [
        { name: file },
      ]);
      console.log(`  ✓ Completed: ${file}`);
    }

    console.log("\n✅ All migrations completed successfully!");
  } catch (error) {
    console.error("\n✗ Migration failed:", error.message);
    throw error;
  }
};

module.exports = { runMigrations };

// Direct CLI use (`npm run migrate`): own the connection lifecycle + exit code here,
// so runMigrations() stays safe to import (e.g. from the Jest setup) without
// process.exit-ing the worker or closing the shared models connection.
if (require.main === module) {
  runMigrations()
    .then(async () => { await sequelize.close(); process.exit(0); })
    .catch(async () => { await sequelize.close(); process.exit(1); });
}

