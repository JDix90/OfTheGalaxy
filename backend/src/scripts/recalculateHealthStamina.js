/**
 * Recalculate Health and Stamina Script
 * Updates existing characters to use the corrected formulas:
 * - Health: 100 + ((endurance - 10) * 10) + ((level - 1) * 5)
 * - Stamina: 100 + ((endurance - 10) * 5) + ((level - 1) * 5)
 */

require('dotenv').config();
const { sequelize, PlayerCharacter } = require('../models');
const { ProgressionSystem } = require('../utils/progressionSystem');

async function recalculateHealthStamina(characterId = null) {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    // Get character(s) to update
    let characters;
    if (characterId) {
      const character = await PlayerCharacter.findByPk(characterId);
      if (!character) {
        console.error(`❌ Character with ID ${characterId} not found`);
        process.exit(1);
      }
      characters = [character];
    } else {
      characters = await PlayerCharacter.findAll();
    }

    console.log(`\n📊 Recalculating health and stamina for ${characters.length} character(s)...\n`);

    for (const character of characters) {
      const oldMaxHealth = character.maxHealth;
      const oldMaxStamina = character.maxStamina;
      const oldCurrentHealth = character.currentHealth;
      const oldCurrentStamina = character.currentStamina;

      // Calculate new max health
      const endurance = character.stats?.endurance || 10;
      const newMaxHealth = 100 + ((endurance - 10) * 10) + ((character.level - 1) * 5);

      // Calculate new max stamina (including skill bonuses)
      const progressionSystem = new ProgressionSystem(character);
      const passiveBonuses = progressionSystem.getPassiveBonuses();
      const skillBonus = passiveBonuses.other?.maxStamina || 0;
      const newMaxStamina = 100 + ((endurance - 10) * 5) + ((character.level - 1) * 5) + skillBonus;

      // Maintain percentage of current health/stamina if max increases
      // If max decreases, cap at new max
      let newCurrentHealth = oldCurrentHealth;
      let newCurrentStamina = oldCurrentStamina;

      if (newMaxHealth > oldMaxHealth && oldMaxHealth > 0) {
        // Max increased - maintain percentage
        const healthPercent = oldCurrentHealth / oldMaxHealth;
        newCurrentHealth = Math.floor(newMaxHealth * healthPercent);
      } else if (newMaxHealth < oldMaxHealth) {
        // Max decreased - cap at new max
        newCurrentHealth = Math.min(oldCurrentHealth, newMaxHealth);
      }

      if (newMaxStamina > oldMaxStamina && oldMaxStamina > 0) {
        // Max increased - maintain percentage
        const staminaPercent = oldCurrentStamina / oldMaxStamina;
        newCurrentStamina = Math.floor(newMaxStamina * staminaPercent);
      } else if (newMaxStamina < oldMaxStamina) {
        // Max decreased - cap at new max
        newCurrentStamina = Math.min(oldCurrentStamina, newMaxStamina);
      }

      // Update character
      character.maxHealth = newMaxHealth;
      character.maxStamina = newMaxStamina;
      character.currentHealth = newCurrentHealth;
      character.currentStamina = newCurrentStamina;

      await character.save();

      console.log(`✅ ${character.name} (Level ${character.level}, Endurance ${endurance}):`);
      console.log(`   Health: ${oldCurrentHealth}/${oldMaxHealth} → ${newCurrentHealth}/${newMaxHealth}`);
      console.log(`   Stamina: ${oldCurrentStamina}/${oldMaxStamina} → ${newCurrentStamina}/${newMaxStamina}`);
      if (skillBonus > 0) {
        console.log(`   (Stamina includes +${skillBonus} from skills)`);
      }
      console.log('');
    }

    console.log('✅ Recalculation complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error recalculating health/stamina:', error);
    process.exit(1);
  }
}

// Get character ID from command line argument if provided
const characterId = process.argv[2] || null;

if (characterId) {
  console.log(`🎯 Recalculating for character ID: ${characterId}\n`);
} else {
  console.log('🌍 Recalculating for ALL characters\n');
}

recalculateHealthStamina(characterId);

