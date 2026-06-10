/**
 * Models Index
 * Exports all database models and sets up associations
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');
const config = require('../../config/database');

// Get environment-specific config
const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

// Initialize Sequelize
const sequelize = new Sequelize(dbConfig.database, dbConfig.username, dbConfig.password, {
  host: dbConfig.host,
  port: dbConfig.port,
  dialect: dbConfig.dialect,
  logging: dbConfig.logging,
  pool: dbConfig.pool,
  dialectOptions: dbConfig.dialectOptions
});

// Import models
const User = require('./User')(sequelize);
const PlayerCharacter = require('./PlayerCharacter')(sequelize);
const Quest = require('./Quest')(sequelize);
const QuestProgress = require('./QuestProgress')(sequelize);
const NPC = require('./NPC')(sequelize);
const NPCRelationship = require('./NPCRelationship')(sequelize);
const PlayerInventory = require('./PlayerInventory')(sequelize);
const Item = require('./Item')(sequelize);
const StarSystem = require('./StarSystem')(sequelize);
const Planet = require('./Planet')(sequelize);
const TravelRoute = require('./TravelRoute')(sequelize);
const SubMap = require('./SubMap')(sequelize);
const SaveSlot = require('./SaveSlot')(sequelize);
const FactionReputation = require('./FactionReputation')(sequelize);
const Discovery = require('./Discovery')(sequelize);
const CombatEncounter = require('./CombatEncounter')(sequelize);
const POIInteraction = require('./POIInteraction')(sequelize);
const Achievement = require('./Achievement')(sequelize);
const TutorialProgress = require('./TutorialProgress')(sequelize);
const ConversationTopics = require('./ConversationTopics')(sequelize);
const ConversationContext = require('./ConversationContext')(sequelize);

// Define associations

// User associations
User.hasMany(PlayerCharacter, {
  foreignKey: 'userId',
  as: 'characters'
});

User.hasMany(SaveSlot, {
  foreignKey: 'userId',
  as: 'saveSlots'
});

// PlayerCharacter associations
PlayerCharacter.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});
PlayerCharacter.hasMany(QuestProgress, {
  foreignKey: 'characterId',
  as: 'questProgress'
});

PlayerCharacter.hasMany(NPCRelationship, {
  foreignKey: 'characterId',
  as: 'npcRelationships'
});

PlayerCharacter.hasMany(PlayerInventory, {
  foreignKey: 'characterId',
  as: 'inventory'
});

PlayerCharacter.hasMany(FactionReputation, {
  foreignKey: 'characterId',
  as: 'factionReputations'
});

PlayerCharacter.hasMany(Discovery, {
  foreignKey: 'characterId',
  as: 'discoveries'
});

PlayerCharacter.hasMany(CombatEncounter, {
  foreignKey: 'characterId',
  as: 'combatEncounters'
});

PlayerCharacter.hasMany(POIInteraction, {
  foreignKey: 'characterId',
  as: 'poiInteractions'
});

PlayerCharacter.hasMany(Achievement, {
  foreignKey: 'characterId',
  as: 'achievements'
});

PlayerCharacter.hasMany(TutorialProgress, {
  foreignKey: 'characterId',
  as: 'tutorialProgress'
});

// Quest associations
Quest.hasMany(QuestProgress, {
  foreignKey: 'questId',
  as: 'progress'
});

// QuestProgress associations
QuestProgress.belongsTo(PlayerCharacter, {
  foreignKey: 'characterId',
  as: 'character'
});

QuestProgress.belongsTo(Quest, {
  foreignKey: 'questId',
  as: 'quest'
});

// NPC associations
NPC.hasMany(NPCRelationship, {
  foreignKey: 'npcId',
  as: 'relationships'
});

// NPCRelationship associations
NPCRelationship.belongsTo(PlayerCharacter, {
  foreignKey: 'characterId',
  as: 'character'
});

NPCRelationship.belongsTo(NPC, {
  foreignKey: 'npcId',
  as: 'npc'
});

NPCRelationship.hasMany(ConversationTopics, {
  foreignKey: 'relationshipId',
  as: 'conversationTopics'
});

NPCRelationship.hasMany(ConversationContext, {
  foreignKey: 'relationshipId',
  as: 'conversationContexts'
});

// ConversationTopics associations
ConversationTopics.belongsTo(NPCRelationship, {
  foreignKey: 'relationshipId',
  as: 'relationship'
});

// ConversationContext associations
ConversationContext.belongsTo(NPCRelationship, {
  foreignKey: 'relationshipId',
  as: 'relationship'
});

// PlayerInventory associations
PlayerInventory.belongsTo(PlayerCharacter, {
  foreignKey: 'characterId',
  as: 'character'
});

// SaveSlot associations
SaveSlot.belongsTo(PlayerCharacter, {
  foreignKey: 'characterId',
  as: 'character'
});

// FactionReputation associations
FactionReputation.belongsTo(PlayerCharacter, {
  foreignKey: 'characterId',
  as: 'character'
});

// Discovery associations
Discovery.belongsTo(PlayerCharacter, {
  foreignKey: 'characterId',
  as: 'character'
});

// CombatEncounter associations
CombatEncounter.belongsTo(PlayerCharacter, {
  foreignKey: 'characterId',
  as: 'character'
});

// POIInteraction associations
POIInteraction.belongsTo(PlayerCharacter, {
  foreignKey: 'characterId',
  as: 'character'
});

// Achievement associations
Achievement.belongsTo(PlayerCharacter, {
  foreignKey: 'characterId',
  as: 'character'
});

// TutorialProgress associations
TutorialProgress.belongsTo(PlayerCharacter, {
  foreignKey: 'characterId',
  as: 'character'
});

// Galaxy map associations
const models = {
  User,
  PlayerCharacter,
  Quest,
  QuestProgress,
  NPC,
  NPCRelationship,
  PlayerInventory,
  Item,
  StarSystem,
  Planet,
  TravelRoute,
  SubMap,
  SaveSlot,
  FactionReputation,
  Discovery,
  CombatEncounter,
  POIInteraction,
  Achievement,
  TutorialProgress,
  ConversationTopics,
  ConversationContext
};

// Set up associations for galaxy models
StarSystem.associate(models);
Planet.associate(models);
TravelRoute.associate(models);
SubMap.associate(models);

// Export models and sequelize instance
module.exports = {
  sequelize,
  Sequelize,
  User,
  PlayerCharacter,
  Quest,
  QuestProgress,
  NPC,
  NPCRelationship,
  PlayerInventory,
  Item,
  StarSystem,
  Planet,
  TravelRoute,
  SubMap,
  SaveSlot,
  FactionReputation,
  Discovery,
  CombatEncounter,
  POIInteraction,
  Achievement,
  TutorialProgress,
  ConversationTopics,
  ConversationContext
};
