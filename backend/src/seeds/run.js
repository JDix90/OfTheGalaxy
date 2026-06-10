/**
 * Seed Runner
 * Populates the database with initial content
 */

require("dotenv").config();
const { sequelize } = require("../models");
const questSeeder = require("./questSeeder");
const npcSeeder = require("./npcSeeder");
const { seedGalaxy } = require("./galaxySeeder");

const runSeeds = async () => {
  try {
    console.log("🌱 Starting database seeding...");

    // Check database connection
    await sequelize.authenticate();
    console.log("✓ Database connection successful.");

    // Run seeders
    await seedGalaxy();
    await questSeeder.run();
    await npcSeeder.run();

    console.log("\n✅ Database seeding completed successfully!");
  } catch (error) {
    console.error("\n✗ Seeding failed:", error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
    console.log("\n🔌 Database connection closed.");
  }
};

runSeeds();
