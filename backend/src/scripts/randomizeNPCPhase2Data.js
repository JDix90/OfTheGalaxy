/**
 * Randomize NPC Phase 2 Data Script
 * Randomizes motivations, trust levels, and trust thresholds for existing NPCs
 * to create more diverse and immersive conversations
 */

require('dotenv').config();
const { sequelize, NPC } = require('../models');
const motivationService = require('../services/motivationService');
const trustService = require('../services/trustService');

/**
 * Seeded random function for consistent randomization per NPC
 */
function seededRandom(seed) {
  let value = seed;
  return function() {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}

/**
 * Get seed from NPC ID
 */
function getSeedFromId(id) {
  return id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
}

/**
 * Randomize Phase 2 data for all NPCs
 */
async function randomizeNPCPhase2Data() {
  try {
    await sequelize.authenticate();
    console.log('✓ Database connected\n');

    console.log('🎲 Randomizing NPC Phase 2 Data (Motivations & Trust)...\n');

    // Get all NPCs
    const npcs = await NPC.findAll({
      where: {
        isAvailable: true
      }
    });

    console.log(`Found ${npcs.length} NPCs to process\n`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const npc of npcs) {
      try {
        // Generate seed from NPC ID for consistent randomization
        const seed = getSeedFromId(npc.id);
        const rnd = seededRandom(seed);

        let updated = false;

        // Randomize motivations if missing or needs update
        if (!npc.motivations || !npc.motivations.primaryGoal?.description) {
          npc.motivations = motivationService.generateMotivations(
            {
              species: npc.species,
              occupation: npc.occupation,
              factionId: npc.factionId,
              location: npc.location,
              npcType: npc.npcType
            },
            rnd
          );
          updated = true;
        } else {
          // Even if motivations exist, randomize urgency for diversity
          if (npc.motivations.primaryGoal) {
            const newUrgency = motivationService.calculateUrgency(
              npc.motivations.primaryGoal.type,
              {
                species: npc.species,
                occupation: npc.occupation,
                factionId: npc.factionId,
                location: npc.location,
                npcType: npc.npcType
              },
              rnd
            );
            npc.motivations.primaryGoal.urgency = newUrgency;
            updated = true;
          }
          
          // Randomize immediate needs urgency
          if (npc.motivations.immediateNeeds && npc.motivations.immediateNeeds.length > 0) {
            npc.motivations.immediateNeeds.forEach(need => {
              // Randomize urgency: 0.3-0.95 for diversity
              need.urgency = 0.3 + (rnd() * 0.65);
            });
            updated = true;
          }
        }

        // Randomize trust system
        if (!npc.trustSystem) {
          // Initialize trust with randomization
          npc.trustSystem = trustService.initializeTrust(npc, null, rnd);
          updated = true;
        } else {
          // Randomize existing trust system
          // Trust level: 20-80 for diversity
          npc.trustSystem.trustLevel = 20 + Math.floor(rnd() * 61);
          
          // Randomize thresholds
          npc.trustSystem.thresholds = {
            shareSecret: 50 + Math.floor(rnd() * 26), // 50-75
            requestFavor: 30 + Math.floor(rnd() * 31), // 30-60
            revealWeakness: 60 + Math.floor(rnd() * 26) // 60-85
          };
          
          // Preserve trust factors (quests completed, etc.)
          if (!npc.trustSystem.trustFactors) {
            npc.trustSystem.trustFactors = {
              questsCompleted: 0,
              questsFailed: 0,
              helpProvided: 0,
              harmCaused: 0
            };
          }
          
          updated = true;
        }

        if (updated) {
          await npc.save();
          updatedCount++;
          
          if (updatedCount % 50 === 0) {
            console.log(`  Processed ${updatedCount} NPCs...`);
          }
        } else {
          skippedCount++;
        }
      } catch (error) {
        console.error(`  ✗ Error processing NPC ${npc.id}:`, error.message);
      }
    }

    console.log(`\n✅ Phase 2 data randomized successfully!`);
    console.log(`   - Updated: ${updatedCount} NPCs`);
    console.log(`   - Skipped: ${skippedCount} NPCs`);
    console.log(`\n📊 Summary:`);
    console.log(`   - Motivations: Randomized urgency and goals`);
    console.log(`   - Trust Levels: Randomized (20-80 range)`);
    console.log(`   - Trust Thresholds: Randomized per NPC`);
    console.log(`\n🎮 NPCs now have diverse motivations and trust levels for more varied conversations!`);

  } catch (error) {
    console.error('✗ Error randomizing NPC Phase 2 data:', error);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await sequelize.close();
    console.log('\n✓ Database connection closed');
  }
}

// Run if called directly
if (require.main === module) {
  randomizeNPCPhase2Data();
}

module.exports = { randomizeNPCPhase2Data };








