/**
 * Script to randomize Phase 1 data for all existing NPCs
 * This ensures all NPCs have varied personality profiles and emotional states
 * 
 * Usage: node backend/src/scripts/randomizeNPCPhase1Data.js
 */

require('dotenv').config();
const { sequelize } = require('../models');
const { NPC } = require('../models');
const personalityService = require('../services/personalityService');
const emotionalStateService = require('../services/emotionalStateService');
const memoryService = require('../services/memoryService');
const factionService = require('../services/factionService');

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

async function randomizeNPCPhase1Data() {
  try {
    console.log('🚀 Starting NPC Phase 1 data randomization...\n');

    // Connect to database
    await sequelize.authenticate();
    console.log('✓ Database connection successful.\n');

    // Get all NPCs
    const npcs = await NPC.findAll();
    console.log(`📊 Found ${npcs.length} NPCs to process.\n`);

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const npc of npcs) {
      try {
        let needsUpdate = false;
        const updates = {};

        // Generate personality profile if missing or all traits are 50 (default)
        if (!npc.personalityProfile || 
            (npc.personalityProfile.openness === 50 && 
             npc.personalityProfile.extraversion === 50 &&
             npc.personalityProfile.agreeableness === 50)) {
          
          const seed = getSeedFromId(npc.id);
          const rnd = seededRandom(seed);
          
          updates.personalityProfile = personalityService.generatePersonalityProfile(
            { npcType: npc.npcType, occupation: npc.occupation, factionId: npc.factionId },
            rnd
          );

          // Apply faction modifiers if applicable
          if (npc.factionId) {
            const factionModifiers = factionService.getPersonalityModifiers(npc.factionId);
            Object.keys(factionModifiers).forEach(key => {
              if (updates.personalityProfile[key] !== undefined) {
                updates.personalityProfile[key] = personalityService.clamp(
                  0,
                  100,
                  updates.personalityProfile[key] + (factionModifiers[key] - 50) * 0.3
                );
              }
            });
          }

          needsUpdate = true;
        }

        // Generate emotional state if missing or default
        if (!npc.emotionalState || 
            (npc.emotionalState.primaryEmotion === 'neutral' && 
             npc.emotionalState.emotionIntensity === 0.3)) {
          
          const seed = getSeedFromId(npc.id);
          const rnd = seededRandom(seed);
          
          updates.emotionalState = emotionalStateService.initializeEmotionalState({}, rnd);
          needsUpdate = true;
        }

        // Initialize memory if missing
        if (!npc.memory) {
          updates.memory = memoryService.initializeMemory({});
          needsUpdate = true;
        }

        if (needsUpdate) {
          await npc.update(updates);
          updated++;
          
          if (updated % 100 === 0) {
            console.log(`  ✓ Updated ${updated} NPCs...`);
          }
        } else {
          skipped++;
        }
      } catch (error) {
        console.error(`  ✗ Error updating NPC ${npc.id} (${npc.name}):`, error.message);
        errors++;
      }
    }

    console.log('\n✅ Randomization complete!');
    console.log(`   - Updated: ${updated} NPCs`);
    console.log(`   - Skipped: ${skipped} NPCs (already had varied data)`);
    console.log(`   - Errors: ${errors} NPCs`);
    console.log('\n🎉 All NPCs now have randomized Phase 1 data!');

  } catch (error) {
    console.error('\n✗ Error during randomization:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
    console.log('\n🔌 Database connection closed.');
  }
}

// Run the script
if (require.main === module) {
  randomizeNPCPhase1Data()
    .then(() => {
      console.log('\n✨ Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n✗ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { randomizeNPCPhase1Data };








