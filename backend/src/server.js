/**
 * Server Entry Point
 * Main Express server configuration
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { sequelize } = require('./models');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');

// Import routes
const authRoutes = require('./routes/authRoutes');
const characterRoutes = require('./routes/characterRoutes');
const questRoutes = require('./routes/questRoutes');
const npcRoutes = require('./routes/npcRoutes');
const galaxyRoutes = require('./routes/galaxyRoutes');
const subMapRoutes = require('./routes/subMapRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const saveRoutes = require('./routes/saveRoutes');
const factionRoutes = require('./routes/factionRoutes');
const vendorRoutes = require('./routes/vendorRoutes');
const discoveryRoutes = require('./routes/discoveryRoutes');
const combatRoutes = require('./routes/combatRoutes');
const poiRoutes = require('./routes/poiRoutes');
const fastTravelRoutes = require('./routes/fastTravelRoutes');
const achievementRoutes = require('./routes/achievementRoutes');
const healthRegenRoutes = require('./routes/healthRegenRoutes');
const staminaRegenRoutes = require('./routes/staminaRegenRoutes');
const craftingRoutes = require('./routes/craftingRoutes');
const lockpickingRoutes = require('./routes/lockpickingRoutes');
const tutorialRoutes = require('./routes/tutorialRoutes');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet()); // Security headers
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
})); // Enable CORS
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(morgan('dev')); // HTTP request logging
app.use('/api/', apiLimiter); // Rate limiting for API routes

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/characters', characterRoutes);
app.use('/api/quests', questRoutes);
app.use('/api/npcs', npcRoutes);
app.use('/api/galaxy', galaxyRoutes);
app.use('/api/submaps', subMapRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/saves', saveRoutes);
app.use('/api/factions', factionRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/discoveries', discoveryRoutes);
app.use('/api/combat', combatRoutes);
app.use('/api/pois', poiRoutes);
app.use('/api/fast-travel', fastTravelRoutes);
app.use('/api/achievements', achievementRoutes);
app.use('/api/health-regen', healthRegenRoutes);
app.use('/api/stamina-regen', staminaRegenRoutes);
app.use('/api/crafting', craftingRoutes);
app.use('/api/lockpicking', lockpickingRoutes);
app.use('/api/tutorial', tutorialRoutes);

// 404 handler
app.use(notFound);

// Error handler (must be last)
app.use(errorHandler);

// Background jobs
const startBackgroundJobs = () => {
  const staminaRegenService = require('./services/staminaRegenService');
  const healthRegenService = require('./services/healthRegenService');
  
  // Stamina regeneration: every 30 seconds
  setInterval(async () => {
    try {
      await staminaRegenService.processAllRegeneration();
    } catch (error) {
      console.error('Stamina regeneration job failed:', error);
    }
  }, 30000); // 30 seconds
  
  // Health regeneration: every 30 seconds
  setInterval(async () => {
    try {
      await healthRegenService.processAllRegeneration();
    } catch (error) {
      console.error('Health regeneration job failed:', error);
    }
  }, 30000); // 30 seconds
  
  console.log('✓ Background jobs started (stamina & health regeneration)');
};

// Database connection and server start
const startServer = async () => {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('✓ Database connection established successfully');
    
    // Sync database (in development)
    // Note: Using migrations for schema changes, sync only for quick dev setup
    if (process.env.NODE_ENV === 'development') {
      try {
        await sequelize.sync({ alter: true });
        console.log('✓ Database synchronized');
      } catch (syncError) {
        // Ignore constraint errors during sync - migrations handle schema
        if (syncError.name === 'SequelizeUnknownConstraintError') {
          console.log('⚠️  Sync constraint warning (migrations handle schema):', syncError.constraint);
        } else {
          console.error('✗ Database sync error:', syncError.message);
          // Don't exit - let the server start anyway
        }
      }
    }
    
    // Start server
    app.listen(PORT, () => {
      console.log(`✓ Server running on port ${PORT}`);
      console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
      
      // Start background jobs after server starts
      startBackgroundJobs();
    });
  } catch (error) {
    console.error('✗ Unable to start server:', error);
    process.exit(1);
  }
};

// Start the server only when run directly (`node src/server.js`). When the app is
// imported (e.g. supertest integration tests), do NOT auto-listen — multiple imports
// would otherwise collide on the port (EADDRINUSE). Supertest drives the app object.
if (require.main === module) {
  startServer();
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing server gracefully');
  await sequelize.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, closing server gracefully');
  await sequelize.close();
  process.exit(0);
});

module.exports = app;
