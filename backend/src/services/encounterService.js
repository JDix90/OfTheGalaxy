/**
 * Encounter Service
 * Handles random encounter generation and triggering
 */

const { PlayerCharacter } = require('../models');
const { generateRandomEnemy } = require('../data/enemyTemplates');

class EncounterService {
  constructor() {
    this.encounterCooldowns = new Map(); // Map<characterId, timestamp>
  }
  /**
   * Calculate encounter chance based on planet danger level
   * @param {Object} planet - Planet object with dangerLevel
   * @param {Object} character - Character object with level
   * @param {Date} lastEncounterTime - Timestamp of last encounter
   * @returns {number} Encounter chance (0-1)
   */
  calculateEncounterChance(planet, character, lastEncounterTime = null) {
    const dangerLevel = planet.dangerLevel || 1;
    const characterLevel = character.level || 1;
    
    // Base chance: 5% per danger level (max 50%)
    const baseChance = Math.min(0.5, dangerLevel * 0.05);
    
    // Time modifier: Increase chance over time (cooldown system)
    let timeModifier = 1.0;
    if (lastEncounterTime) {
      const cooldown = this.getEncounterCooldown(planet);
      const timeSinceLastEncounter = Date.now() - new Date(lastEncounterTime).getTime();
      const cooldownMs = cooldown * 60 * 1000; // Convert minutes to ms
      
      // Gradually increase chance as cooldown expires
      timeModifier = Math.min(1.0, timeSinceLastEncounter / cooldownMs);
    }
    
    // Level modifier: Higher level characters face more danger
    // But also have better stats to handle it
    const levelModifier = Math.max(0.5, Math.min(1.5, characterLevel / 10));
    
    // Final chance calculation
    const finalChance = baseChance * timeModifier * levelModifier;
    
    return Math.min(1.0, finalChance);
  }

  /**
   * Check if an encounter should trigger
   * @param {Object} planet - Planet object
   * @param {Object} character - Character object
   * @param {Date} lastEncounterTime - Timestamp of last encounter
   * @returns {boolean} True if encounter should trigger
   */
  shouldTriggerEncounter(planet, character, lastEncounterTime = null) {
    const chance = this.calculateEncounterChance(planet, character, lastEncounterTime);
    const roll = Math.random();
    
    return roll <= chance;
  }

  /**
   * Get encounter cooldown time in minutes
   * @param {Object} planet - Planet object with dangerLevel
   * @returns {number} Cooldown in minutes
   */
  getEncounterCooldown(planet) {
    const dangerLevel = planet.dangerLevel || 1;
    
    // Higher danger = shorter cooldown (more frequent encounters)
    if (dangerLevel <= 3) {
      return 5; // 5 minutes for low danger
    } else if (dangerLevel <= 6) {
      return 3; // 3 minutes for medium danger
    } else {
      return 2; // 2 minutes for high danger
    }
  }

  /**
   * Generate random encounter enemies
   * @param {Object} planet - Planet object
   * @param {Object} character - Character object
   * @returns {Array} Array of enemy template IDs
   */
  generateRandomEncounter(planet, character) {
    const dangerLevel = planet.dangerLevel || 1;
    const characterLevel = character.level || 1;
    
    // Determine number of enemies based on danger level
    let enemyCount = 1;
    if (dangerLevel >= 7) {
      enemyCount = Math.floor(Math.random() * 2) + 2; // 2-3 enemies
    } else if (dangerLevel >= 4) {
      enemyCount = Math.random() < 0.3 ? 2 : 1; // 30% chance of 2 enemies
    }
    
    // Determine difficulty based on danger level
    let difficulty = 'moderate';
    if (dangerLevel <= 3) {
      difficulty = Math.random() < 0.7 ? 'easy' : 'moderate';
    } else if (dangerLevel <= 6) {
      difficulty = Math.random() < 0.5 ? 'moderate' : 'hard';
    } else {
      difficulty = Math.random() < 0.3 ? 'moderate' : 'hard';
    }

    // Generate enemies
    const enemies = [];
    for (let i = 0; i < enemyCount; i++) {
      const enemy = generateRandomEnemy(characterLevel, difficulty);
      if (enemy && enemy.id) {
        enemies.push(enemy.id);
      }
    }
    
    return enemies;
  }

  /**
   * Get appropriate enemy types for a planet
   * Based on faction control and planet type
   * @param {Object} planet - Planet object
   * @returns {Array} Array of preferred enemy template IDs
   */
  getPlanetEnemyTypes(planet) {
    const factionControl = planet.factionControl;
    const planetType = planet.planetType;
    
    // Default enemy pool
    const defaultEnemies = ['ironclad', 'pirate', 'bounty_hunter'];
    
    // Faction-specific enemies
    if (factionControl === 'empire' || factionControl === 'ascendancy') {
      return ['ironclad', 'dominion_officer', 'bounty_hunter'];
    } else if (factionControl === 'free_worlds' || factionControl === 'uprising') {
      return ['pirate', 'smuggler', 'bounty_hunter'];
    } else if (factionControl === 'vorr_cartel') {
      return ['pirate', 'bounty_hunter', 'criminal'];
    }
    
    // Planet type specific enemies
    if (planetType === 'urban') {
      return ['ironclad', 'bounty_hunter', 'criminal'];
    } else if (planetType === 'desert' || planetType === 'barren') {
      return ['pirate', 'bounty_hunter', 'smuggler'];
    }
    
    return defaultEnemies;
  }

  /**
   * Check if a random encounter should trigger
   * @param {string} characterId - The ID of the player character
   * @param {string} planetId - The ID of the current planet
   * @param {number} dangerLevel - The danger level of the current location (1-10)
   * @param {object} location - The character's current location on the planet
   * @returns {Promise<object>} { shouldTrigger: boolean, enemies: Array<object> }
   */
  async checkRandomEncounter(characterId, planetId, dangerLevel, location) {
    const character = await PlayerCharacter.findByPk(characterId);
    if (!character) {
      throw new Error('Character not found');
    }

    // Check cooldown
    const lastEncounterTime = this.encounterCooldowns.get(characterId);
    const now = Date.now();
    const COOLDOWN_MS = 10000; // 10 seconds cooldown between random encounters

    if (lastEncounterTime && (now - lastEncounterTime < COOLDOWN_MS)) {
      return { shouldTrigger: false, enemies: [] };
    }

    // Calculate encounter chance
    // Base chance: 10% + (dangerLevel * 3%) + (characterLevel * 1%)
    // This gives a reasonable chance for encounters
    let encounterChance = 0.10; // 10% base chance
    encounterChance += (dangerLevel * 0.03); // +3% per danger level
    encounterChance += (character.level * 0.01); // +1% per character level

    // Check if player has active escort quest - double the encounter chance
    const escortService = require('./escortService');
    const activeEscortQuest = await escortService.getActiveEscortQuest(characterId);
    if (activeEscortQuest) {
      encounterChance *= 2; // Double the chance
      console.log(`[Encounter] Escort quest active - doubled encounter chance to ${(encounterChance * 100).toFixed(1)}%`);
    }

    // Cap chance at 80% for random encounters (increased from 60% to account for escort doubling)
    encounterChance = Math.min(encounterChance, 0.8);

    const roll = Math.random();

    if (roll <= encounterChance) {
      // Trigger encounter
      this.encounterCooldowns.set(characterId, now);

      // Determine difficulty based on danger level and character level
      // Lower danger = easier enemies, higher danger = harder enemies
      let difficulty = 'moderate';
      if (dangerLevel <= 3) {
        difficulty = Math.random() < 0.7 ? 'easy' : 'moderate'; // 70% easy, 30% moderate
      } else if (dangerLevel <= 6) {
        difficulty = Math.random() < 0.5 ? 'moderate' : 'hard'; // 50% moderate, 50% hard
      } else {
        difficulty = Math.random() < 0.3 ? 'moderate' : 'hard'; // 30% moderate, 70% hard
      }

      // Generate enemies based on danger level and character level
      let numEnemies = Math.min(3, Math.ceil(dangerLevel / 3) + Math.floor(Math.random() * 2)); // 1-3 enemies
      
      // If escort quest is active, 50% chance of 2-3 enemies instead of 1
      if (activeEscortQuest) {
        const escortEnemyRoll = Math.random();
        if (escortEnemyRoll < 0.5) {
          // 50% chance of 2-3 enemies
          numEnemies = 2 + Math.floor(Math.random() * 2); // 2 or 3
          console.log(`[Encounter] Escort quest active - increased enemy count to ${numEnemies}`);
        }
      }
      
      const enemies = [];
      for (let i = 0; i < numEnemies; i++) {
        const enemy = generateRandomEnemy(character.level, difficulty);
        if (enemy && enemy.id) {
          enemies.push(enemy.id);
        }
      }

      return { 
        shouldTrigger: true, 
        enemies,
        enemyCount: enemies.length,
        planetDangerLevel: dangerLevel
      };
    }

    return { 
      shouldTrigger: false, 
      enemies: [],
      enemyCount: 0,
      planetDangerLevel: dangerLevel
    };
  }
}

module.exports = new EncounterService();

