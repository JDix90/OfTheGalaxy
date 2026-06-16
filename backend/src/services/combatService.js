/**
 * Combat Service
 * Business logic for turn-based combat system
 */

const { CombatEncounter, PlayerCharacter, PlayerInventory, QuestProgress, Quest, sequelize } = require('../models');
const { getItemDefinition } = require('../data/items');
const { generateRandomEnemy, getEnemyTemplate, scaleEnemyForLevel } = require('../data/enemyTemplates');
const { getAbilityDefinition, isCombatUsable } = require('../data/abilityDefinitions');
const { calculateSetBonuses, applySetBonuses } = require('../data/itemSets');
const { ProgressionSystem } = require('../utils/progressionSystem');
const characterService = require('./characterService');
const inventoryService = require('./inventoryService');
const questService = require('./questService');
const specialEffectsService = require('./specialEffectsService');
const abilityService = require('./abilityService');

class CombatService {
  /**
   * Create a new combat encounter
   * @param {string} characterId - Character UUID
   * @param {string} encounterType - Type of encounter (random, quest, scripted, bounty, poi, dungeon)
   * @param {Array} enemies - Array of enemy template IDs or enemy objects
   * @param {Object} options - Optional parameters (dungeonEnemy: dungeon enemy object)
   * @returns {Promise<Object>} Combat encounter
   */
  async createEncounter(characterId, encounterType, enemies = null, options = {}) {
    try {
      // Get character
      const character = await PlayerCharacter.findByPk(characterId, {
        include: [{ model: PlayerInventory, as: 'inventory' }]
      });

      if (!character) {
        throw new Error('Character not found');
      }

      // Check if character already has an active encounter
      const activeEncounter = await CombatEncounter.findOne({
        where: {
          characterId,
          status: 'active'
        }
      });

      if (activeEncounter) {
        // Return the existing encounter instead of throwing an error
        console.log('⚔️ Character already has active encounter, returning existing:', activeEncounter.id);
        return activeEncounter.toJSON();
      }

      // Build combatants array
      const combatants = [];

      // Add player as combatant
      const playerCombatant = await this.buildPlayerCombatant(character);
      combatants.push(playerCombatant);

      // Check for active escort quest and add NPC as companion
      const escortService = require('./escortService');
      const activeEscortQuest = await escortService.getActiveEscortQuest(characterId);
      if (activeEscortQuest && activeEscortQuest.npc) {
        const npcCompanion = await this.buildNPCCompanionCombatant(activeEscortQuest.npc, character.level);
        if (npcCompanion) {
          combatants.push(npcCompanion);
          console.log(`⚔️ Added escort NPC "${activeEscortQuest.npc.name}" as companion in combat`);
        }
      }

      // Handle dungeon enemies specially
      if (encounterType === 'dungeon' && options.dungeonEnemy) {
        // Use dungeon enemy data directly
        const dungeonEnemy = options.dungeonEnemy;
        const enemyCombatant = {
          id: dungeonEnemy.id,
          type: 'enemy',
          name: dungeonEnemy.name,
          level: dungeonEnemy.level,
          stats: dungeonEnemy.stats,
          equipment: dungeonEnemy.equipment || {},
          lootTable: dungeonEnemy.lootTable || [],
          xpReward: dungeonEnemy.xpReward || 0, // Include XP reward for dungeon enemies
          creditsReward: dungeonEnemy.creditsReward || 0, // Include credits reward for dungeon enemies
          dungeonEnemyId: dungeonEnemy.id, // Store reference for post-combat updates
          subMapId: options.subMapId // Store submap ID for enemy state updates
        };
        combatants.push(enemyCombatant);
        console.log('⚔️ Creating dungeon encounter with enemy:', dungeonEnemy.name, {
          xpReward: enemyCombatant.xpReward,
          creditsReward: enemyCombatant.creditsReward
        });
      } else {
        // Generate enemies if not provided
        if (!enemies || enemies.length === 0) {
          // Default to moderate difficulty for random encounters
          const randomEnemy = generateRandomEnemy(character.level, 'moderate');
          if (randomEnemy && randomEnemy.id) {
            enemies = [randomEnemy.id];
          } else {
            enemies = ['ironclad']; // Fallback
          }
        }

        console.log('⚔️ Creating encounter with enemies:', enemies, 'Type:', typeof enemies[0]);

        // Add enemies as combatants
        for (const enemy of enemies) {
          let enemyTemplate;
          
          if (typeof enemy === 'string') {
            // Enemy template ID
            enemyTemplate = getEnemyTemplate(enemy);
            if (!enemyTemplate) {
              console.error(`❌ Enemy template not found: ${enemy}`);
              throw new Error(`Enemy template not found: ${enemy}`);
            }
            // Default to moderate difficulty when scaling
            enemyTemplate = scaleEnemyForLevel(enemyTemplate, character.level, 'moderate');
          } else {
            // Enemy object (already scaled)
            enemyTemplate = enemy;
          }

          const enemyCombatant = this.buildEnemyCombatant(enemyTemplate);
          combatants.push(enemyCombatant);
        }
      }

      // Roll initiative to determine turn order
      const turnOrder = this.rollInitiative(combatants);

      // Create encounter
      const encounter = await CombatEncounter.create({
        characterId,
        encounterType,
        combatants,
        turnOrder,
        currentTurn: 0,
        status: 'active',
        metadata: options.subMapId ? { subMapId: options.subMapId } : {}
      });

      // Save encounter first to ensure it's persisted
      await encounter.save();
      
      // Check if the first turn is an enemy's turn
      // If so, automatically process all enemy turns until it's the player's turn
      const firstCombatantId = turnOrder[0];
      const firstCombatant = combatants.find(c => c.id === firstCombatantId);
      
      if (firstCombatant && firstCombatant.type === 'enemy') {
        // Reload encounter to ensure we have the latest state
        await encounter.reload();
        
        // Process all enemy turns until it's the player's turn
        try {
          await this.advanceTurn(encounter);
          await encounter.reload(); // Reload to get updated state
        } catch (advanceError) {
          console.error('❌ Error advancing turn during encounter creation:', advanceError);
          // Don't fail the encounter creation if advanceTurn fails
          // The encounter is still valid, just start with the player's turn
        }
      }

      // Final reload to ensure we have the latest state
      await encounter.reload();
      return encounter.toJSON();
    } catch (error) {
      console.error('❌ Error creating encounter:', error);
      console.error('Stack:', error.stack);
      throw error;
    }
  }

  /**
   * Build player combatant from character
   */
  async buildPlayerCombatant(character) {
    // Get equipped items
    const equipped = await PlayerInventory.findEquipped(character.id);
    const equippedMap = {};
    if (equipped && Array.isArray(equipped)) {
      equipped.forEach(item => {
        if (item.equipmentSlot) {
          equippedMap[item.equipmentSlot] = item;
        }
      });
    }

    // Calculate combat stats from character stats and equipment
    const weapon = equippedMap.weapon ? getItemDefinition(equippedMap.weapon.itemId) : null;
    const armor = equippedMap.armor ? getItemDefinition(equippedMap.armor.itemId) : null;

    // Base stats from character attributes
    const stats = character.stats || {};
    const baseAttack = Math.floor((stats.strength || 10) / 2) + (stats.agility || 10) / 4;
    const baseDefense = Math.floor((stats.endurance || 10) / 2);
    const baseSpeed = Math.floor((stats.agility || 10) / 2);
    const baseAccuracy = 70 + Math.floor((stats.perception || 10) / 2);

    // Equipment bonuses
    const weaponDamage = weapon?.stats?.damage || 10;
    const armorDefense = armor?.stats?.defense || 0;
    const armorMobility = armor?.stats?.mobility || 0; // Positive = faster, negative = slower
    // Apply weapon accuracy if available, otherwise use base accuracy
    const weaponAccuracy = weapon?.stats?.accuracy;
    let finalAccuracy = weaponAccuracy !== undefined ? weaponAccuracy : baseAccuracy;

    // Calculate skill passive bonuses
    const progressionSystem = new ProgressionSystem(character);
    const passiveBonuses = progressionSystem.getPassiveBonuses();

    // Calculate derived stats using centralized system
    const { calculateCombatStats } = require('../utils/derivedStats');
    
    const combatStats = calculateCombatStats({
      character,
      equipment: {
        weaponBase: weaponDamage,
        armorBase: armorDefense
      }
    });
    
    // Start with derived stats for attack and defense
    let modifiedAttack = Math.floor(combatStats.attackRating.value);
    let modifiedDefense = Math.floor(combatStats.defenseRating.value);
    // Apply armor mobility to base speed (positive = faster, negative = slower)
    let modifiedSpeed = baseSpeed + armorMobility;
    // Per-level accuracy growth (caps at +8) so leveling improves hit rate, not
    // just HP. Mirrored in scripts/gameplay-sim.js makePlayer.
    let modifiedAccuracy = finalAccuracy + Math.min(8, (character.level || 1) * 0.5);

    // Apply additional combat bonuses from skills (beyond what's in derived stats)
    // Basic Combat damage bonus is multiplicative on top of derived attack rating
    if (passiveBonuses.combat.damage) {
      // damage is typically a percentage (e.g., +10% = 10)
      modifiedAttack = Math.floor(modifiedAttack * (1 + (passiveBonuses.combat.damage / 100)));
    }

    // Tactical Awareness defense is already in derived stats, but check for other defense bonuses
    const tacticalDefenseBonus = passiveBonuses.combat.defense || 0;
    // Only apply if it's not from Tactical Awareness (which is already in derived stats)
    // For now, we'll apply it anyway as it might come from other sources
    if (tacticalDefenseBonus > 0) {
      modifiedDefense = Math.floor(modifiedDefense * (1 + (tacticalDefenseBonus / 100)));
    }

    if (passiveBonuses.combat.accuracy) {
      // accuracy is typically a flat bonus
      modifiedAccuracy = Math.min(100, modifiedAccuracy + passiveBonuses.combat.accuracy);
    }

    if (passiveBonuses.combat.speed) {
      // speed is typically a flat bonus
      modifiedSpeed += passiveBonuses.combat.speed;
    }

    // Apply stat bonuses from skills
    if (passiveBonuses.stats.strength) {
      // Strength affects attack (additional to derived stats)
      modifiedAttack += Math.floor(passiveBonuses.stats.strength * 0.5);
    }
    if (passiveBonuses.stats.agility) {
      // Agility affects accuracy and speed
      modifiedAccuracy += Math.floor(passiveBonuses.stats.agility * 0.5);
      modifiedSpeed += Math.floor(passiveBonuses.stats.agility * 0.3);
    }
    if (passiveBonuses.stats.endurance) {
      // Endurance affects defense (additional to derived stats)
      modifiedDefense += Math.floor(passiveBonuses.stats.endurance * 0.3);
    }
    
    // Store stat breakdowns for UI/debugging
    const statBreakdowns = {
      attackRating: combatStats.attackRating.breakdown,
      defenseRating: combatStats.defenseRating.breakdown,
      critChance: combatStats.critChance.breakdown,
      dodgeChance: combatStats.dodgeChance.breakdown
    };

    // Get all equipped items for special effects
    const equippedItems = (equipped && Array.isArray(equipped) ? equipped : []).map(item => {
      const itemDef = getItemDefinition(item.itemId);
      return {
        ...item.toJSON(),
        specialEffects: itemDef?.specialEffects || [],
        stats: itemDef?.stats || {}
      };
    });

    // Calculate item set bonuses
    const equippedItemIds = equippedItems.map(item => item.itemId);
    const setBonuses = calculateSetBonuses(equippedItemIds);

    // Apply special effects (using modified stats that include skill bonuses)
    const effectResults = specialEffectsService.applyEffects(equippedItems, {
      attack: modifiedAttack,
      defense: modifiedDefense,
      speed: modifiedSpeed,
      accuracy: modifiedAccuracy,
      forcePower: stats.forcePower || 0,
      perception: stats.perception || 0,
      intelligence: stats.intelligence || 0,
      charisma: stats.charisma || 0
    });

    // Apply set bonuses to effect results
    const statsWithSetBonuses = applySetBonuses(effectResults.stats, setBonuses);

    // Apply effect stat modifications (including set bonuses)
    const finalAttack = statsWithSetBonuses.attack || modifiedAttack;
    const finalDefense = statsWithSetBonuses.defense || modifiedDefense;
    const finalSpeed = statsWithSetBonuses.speed || modifiedSpeed;
    const finalEffectAccuracy = statsWithSetBonuses.accuracy || modifiedAccuracy;

    // Crit chance: use the value already computed by calculateCombatStats, which
    // accounts for perception, skills, DR — and (P2 fix) the per-level term. This
    // previously recomputed crit via calculateCritChance(), discarding the
    // formula value, so any level scaling never reached combat.
    const perception = stats.perception || 10;
    const skillCritBonus = passiveBonuses.combat.critChance || 0; // Already in percentage
    const finalCritChance = combatStats.critChance.value;
    
    // Store raw values for calculateDamage to add item bonuses
    const critChanceData = {
      base: finalCritChance,
      perception,
      skillBonus: skillCritBonus
    };

    // Apply stamina-based status effects
    const { getActiveStaminaStatusEffects, calculateStaminaStatusModifiers } = require('../data/staminaStatusEffects');
    const staminaStatusEffects = getActiveStaminaStatusEffects(character);
    const staminaModifiers = calculateStaminaStatusModifiers(character);
    
    // Apply stamina status modifiers to combat stats
    let finalAttackWithStamina = finalAttack;
    let finalAccuracyWithStamina = finalEffectAccuracy;
    let finalSpeedWithStamina = finalSpeed;
    
    if (staminaModifiers.damage !== 0) {
      finalAttackWithStamina = Math.max(1, Math.floor(finalAttackWithStamina * (1 + staminaModifiers.damage / 100)));
    }
    if (staminaModifiers.accuracy !== 0) {
      finalAccuracyWithStamina = Math.max(0, Math.min(100, finalAccuracyWithStamina + staminaModifiers.accuracy));
    }
    if (staminaModifiers.movementSpeed !== 0) {
      finalSpeedWithStamina = Math.max(1, Math.floor(finalSpeedWithStamina * (1 + staminaModifiers.movementSpeed / 100)));
    }

    return {
      id: `player_${character.id}`,
      name: character.name,
      equippedItems: equippedItems, // Store for special effects in combat
      activeEffects: effectResults.activeEffects, // Store active effects
      setBonuses: setBonuses, // Store item set bonuses
      passiveBonuses: passiveBonuses, // Store for debugging/reference
      statBreakdowns: statBreakdowns, // Store derived stat breakdowns for UI
      type: 'player',
      characterId: character.id,
      stats: {
        health: character.currentHealth,
        maxHealth: character.maxHealth,
        stamina: character.currentStamina,
        maxStamina: character.maxStamina,
        attack: finalAttackWithStamina,
        defense: finalDefense,
        speed: finalSpeedWithStamina,
        accuracy: finalAccuracyWithStamina,
        critChance: finalCritChance, // Store calculated critical chance (with DR)
        dodgeChance: combatStats.dodgeChance.value, // Store calculated dodge chance (with DR)
        forcePower: effectResults.stats.forcePower || 0,
        perception: effectResults.stats.perception || 0,
        intelligence: effectResults.stats.intelligence || 0,
        charisma: effectResults.stats.charisma || 0
      },
      combatModifiers: effectResults.combatStats, // Store combat modifiers
      defenseModifiers: effectResults.defenseStats, // Store defense modifiers
      luckModifiers: effectResults.luckStats, // Store luck modifiers
      equipment: {
        weapon: weapon ? { itemId: equippedMap.weapon.itemId, damage: weaponDamage } : null,
        armor: armor ? { itemId: equippedMap.armor.itemId, defense: armorDefense } : null
      },
      statusEffects: staminaStatusEffects, // Include stamina-based status effects
      position: { x: 0, y: 0 }
    };
  }

  /**
   * Build enemy combatant from template
   */
  buildEnemyCombatant(enemyTemplate) {
    const id = `enemy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      id,
      name: enemyTemplate.name,
      type: 'enemy',
      enemyTemplate: enemyTemplate.name,
      tier: enemyTemplate.tier || 'normal', // threat tier, surfaced in the combat UI
      level: enemyTemplate.level,
      stats: {
        ...enemyTemplate.stats,
        // Modest evasion from speed (cap 15%) so dodge applies to enemies too.
        dodgeChance: Math.min(0.15, Math.max(0, ((enemyTemplate.stats.speed || 10) - 10) * 0.01))
      },
      equipment: { ...enemyTemplate.equipment },
      statusEffects: [],
      position: { x: 0, y: 0 },
      lootTable: enemyTemplate.lootTable,
      xpReward: enemyTemplate.xpReward,
      creditsReward: enemyTemplate.creditsReward,
      faction: enemyTemplate.faction
    };
  }

  /**
   * Build NPC companion combatant for escort quests
   * @param {Object} npc - NPC instance
   * @param {number} playerLevel - Player's level for scaling
   * @returns {Object} Companion combatant
   */
  async buildNPCCompanionCombatant(npc, playerLevel) {
    const id = `companion_${npc.id}_${Date.now()}`;
    
    // Get NPC stats based on background, personality, and faction
    const stats = this.calculateNPCCompanionStats(npc, playerLevel);
    
    // Get equipment based on NPC background and faction
    const equipment = this.getNPCCompanionEquipment(npc);
    
    return {
      id,
      name: npc.name,
      type: 'companion',
      npcId: npc.id,
      stats,
      equipment,
      statusEffects: [],
      position: { x: 0, y: 0 },
      abilities: this.getNPCCompanionAbilities(npc)
    };
  }

  /**
   * Calculate NPC companion stats based on background, personality, and faction
   */
  calculateNPCCompanionStats(npc, playerLevel) {
    const personality = npc.personalityProfile || {};
    const background = npc.background || 'civilian';
    const factionId = npc.factionId;
    
    // Base stats scaled to player level
    const baseLevel = Math.max(1, playerLevel - 2); // NPC slightly below player level
    const baseHealth = 50 + (baseLevel * 15);
    const baseStamina = 50 + (baseLevel * 10);
    
    // Personality modifiers
    const aggression = personality.aggression || 50;
    const courage = personality.courage || 50;
    const intelligence = personality.intelligence || 50;
    const charisma = personality.charisma || 50;
    
    // Background modifiers
    const backgroundModifiers = {
      'smuggler': { attack: 1.2, defense: 0.9, speed: 1.3, accuracy: 1.1 },
      'soldier': { attack: 1.3, defense: 1.2, speed: 1.0, accuracy: 1.2 },
      'merchant': { attack: 0.8, defense: 0.9, speed: 0.9, accuracy: 0.9 },
      'scholar': { attack: 0.7, defense: 0.8, speed: 0.8, accuracy: 1.0 },
      'bounty_hunter': { attack: 1.4, defense: 1.1, speed: 1.2, accuracy: 1.3 },
      'civilian': { attack: 0.9, defense: 0.9, speed: 0.9, accuracy: 0.9 }
    };
    
    const modifiers = backgroundModifiers[background] || backgroundModifiers['civilian'];
    
    // Calculate stats
    const attack = Math.floor((baseLevel * 5 + (aggression / 10)) * modifiers.attack);
    const defense = Math.floor((baseLevel * 3 + (courage / 10)) * modifiers.defense);
    const speed = Math.floor((baseLevel * 2 + (aggression / 20)) * modifiers.speed);
    const accuracy = Math.floor(70 + (intelligence / 5) + (baseLevel * 2)) * modifiers.accuracy;
    
    // Health and stamina
    const health = Math.floor(baseHealth * (1 + (courage / 200)));
    const stamina = Math.floor(baseStamina * (1 + (aggression / 200)));
    
    return {
      health,
      maxHealth: health,
      stamina,
      maxStamina: stamina,
      attack,
      defense,
      speed,
      accuracy: Math.min(95, accuracy),
      level: baseLevel
    };
  }

  /**
   * Get NPC companion equipment based on background and faction
   */
  getNPCCompanionEquipment(npc) {
    const background = npc.background || 'civilian';
    const factionId = npc.factionId;
    
    // Default equipment based on background
    const equipmentMap = {
      'smuggler': {
        weapon: 'pulser_pistol_01',
        armor: 'armor_light_01'
      },
      'soldier': {
        weapon: 'pulser_rifle_01',
        armor: 'armor_medium_01'
      },
      'bounty_hunter': {
        weapon: 'pulser_rifle_01',
        armor: 'armor_medium_01'
      },
      'merchant': {
        weapon: 'pulser_pistol_01',
        armor: 'armor_light_01'
      },
      'scholar': {
        weapon: 'pulser_pistol_01',
        armor: 'armor_light_01'
      },
      'civilian': {
        weapon: 'pulser_pistol_01',
        armor: null // No armor for civilians
      }
    };
    
    return equipmentMap[background] || equipmentMap['civilian'];
  }

  /**
   * Get NPC companion abilities based on background and personality
   */
  getNPCCompanionAbilities(npc) {
    const background = npc.background || 'civilian';
    const personality = npc.personalityProfile || {};
    const aggression = personality.aggression || 50;
    
    const abilities = [];
    
    // Background-specific abilities
    if (background === 'soldier' || background === 'bounty_hunter') {
      abilities.push('suppressing_fire');
    }
    
    if (background === 'smuggler') {
      abilities.push('quick_shot');
    }
    
    // High aggression NPCs get offensive abilities
    if (aggression > 70) {
      abilities.push('aggressive_strike');
    }
    
    // Default ability for all companions
    if (abilities.length === 0) {
      abilities.push('basic_attack');
    }
    
    return abilities;
  }

  /**
   * Roll initiative to determine turn order
   * Higher speed = earlier turn
   */
  rollInitiative(combatants) {
    // Sort by speed (with random tiebreaker)
    const sorted = [...combatants].sort((a, b) => {
      const speedDiff = b.stats.speed - a.stats.speed;
      if (speedDiff !== 0) return speedDiff;
      return Math.random() - 0.5; // Random tiebreaker
    });

    return sorted.map(c => c.id);
  }

  /**
   * Get encounter state
   */
  async getEncounterState(encounterId) {
    const encounter = await CombatEncounter.findByPk(encounterId);
    
    if (!encounter) {
      throw new Error('Combat encounter not found');
    }

    return encounter.toJSON();
  }

  /**
   * Execute a combat action
   * @param {string} encounterId - Encounter UUID
   * @param {string} combatantId - Combatant ID
   * @param {string} actionType - Action type (attack, defend, use_item, ability, flee)
   * @param {string} targetId - Target combatant ID (if applicable)
   * @param {Object} params - Additional action parameters
   * @returns {Promise<Object>} Action result
   */
  async executeAction(encounterId, combatantId, actionType, targetId = null, params = {}) {
    const encounter = await CombatEncounter.findByPk(encounterId);
    
    if (!encounter) {
      throw new Error('Combat encounter not found');
    }

    if (encounter.status !== 'active') {
      throw new Error('Combat encounter is not active');
    }

    // Verify it's the combatant's turn
    const currentCombatantId = encounter.turnOrder[encounter.currentTurn];
    if (currentCombatantId !== combatantId) {
      throw new Error('Not your turn');
    }

    const combatants = encounter.combatants;
    const combatant = combatants.find(c => c.id === combatantId);
    
    if (!combatant) {
      throw new Error('Combatant not found');
    }

    // Execute action
    let actionResult;
    switch (actionType) {
      case 'attack':
        actionResult = await this.executeAttack(encounter, combatant, targetId);
        break;
      case 'defend':
        actionResult = await this.executeDefend(encounter, combatant);
        break;
      case 'use_item':
        actionResult = await this.executeUseItem(encounter, combatant, params.itemId, targetId);
        break;
      case 'ability':
        actionResult = await this.executeAbility(encounter, combatant, params.abilityId, targetId);
        break;
      case 'flee':
        actionResult = await this.executeFlee(encounter, combatant);
        // If flee was successful, the encounter has already been ended
        // Reload and return early
        if (actionResult.success) {
          await encounter.reload();
          return {
            action: actionResult,
            encounter: encounter.toJSON(),
            gameOver: true,
            status: 'fled'
          };
        }
        // If flee failed, continue with normal turn processing
        break;
      default:
        throw new Error(`Unknown action type: ${actionType}`);
    }

    // Reload encounter to get updated state (in case it was modified)
    await encounter.reload();

    // Check if encounter is still active (might have been ended by the action)
    if (encounter.status !== 'active') {
      return {
        action: actionResult,
        encounter: encounter.toJSON(),
        gameOver: true,
        status: encounter.status
      };
    }

    // Check victory/defeat conditions BEFORE advancing turn
    // (in case the action killed the enemy)
    let victoryCheck = await this.checkVictoryConditions(encounter);
    if (victoryCheck.gameOver) {
      await this.endEncounter(encounter.id, victoryCheck.status);
    } else {
      // Advance to next turn and process enemy turns
      const enemyActions = await this.advanceTurn(encounter);
      
      // Add enemy actions to the result
      actionResult.enemyActions = enemyActions || [];
      
      // Ensure encounter is saved before reloading
      await encounter.save();
      
      // Check victory conditions again after enemy turns
      await encounter.reload();
      victoryCheck = await this.checkVictoryConditions(encounter);
      if (victoryCheck.gameOver) {
        await this.endEncounter(encounter.id, victoryCheck.status);
        // Reload after ending encounter
        await encounter.reload();
      }
    }

    // Final reload to get updated state
    await encounter.reload();
    
    // Log combatant health for debugging (especially after item use)
    if (actionResult.type === 'use_item' && actionResult.healing > 0) {
      const healedCombatant = encounter.combatants.find(c => c.id === actionResult.target);
      if (healedCombatant) {
        console.log(`[Combat Service] Final encounter state - ${healedCombatant.name} health: ${healedCombatant.stats.health}/${healedCombatant.stats.maxHealth}`);
      }
    }

    return {
      action: actionResult,
      encounter: encounter.toJSON(),
      gameOver: victoryCheck.gameOver,
      status: victoryCheck.status
    };
  }

  /**
   * Execute attack action
   */
  async executeAttack(encounter, attacker, targetId) {
    if (!targetId) {
      throw new Error('Target required for attack');
    }

    // Reload encounter to ensure we have the latest state
    await encounter.reload();
    
    const combatants = encounter.combatants;
    const target = combatants.find(c => c.id === targetId);
    
    if (!target) {
      throw new Error('Target not found');
    }

    // Calculate and deduct stamina cost for player attacks
    let staminaCost = 0;
    if (attacker.type === 'player') {
      const { PlayerCharacter } = require('../models');
      const character = await PlayerCharacter.findByPk(encounter.characterId);
      if (!character) {
        throw new Error('Character not found');
      }

      // Get Endurance stat
      const endurance = character.stats?.endurance || 10;
      
      // Calculate stamina cost based on Endurance progression
      if (endurance >= 25) {
        staminaCost = 1;
      } else if (endurance >= 20) {
        staminaCost = 2;
      } else if (endurance >= 15) {
        staminaCost = 3;
      } else {
        staminaCost = 4;
      }

      // Check if player has enough stamina
      if (attacker.stats.stamina < staminaCost) {
        throw new Error(`Not enough stamina to attack. Need ${staminaCost}, have ${attacker.stats.stamina}`);
      }

      // Deduct stamina
      attacker.stats.stamina = Math.max(0, attacker.stats.stamina - staminaCost);
      console.log(`⚡ ${attacker.name} used ${staminaCost} stamina to attack (Endurance: ${endurance}, Stamina: ${attacker.stats.stamina}/${attacker.stats.maxStamina})`);
    }

    const oldHealth = target.stats.health;

    // Calculate damage
    const damageResult = this.calculateDamage(attacker, target);

    // Apply damage only if hit
    if (damageResult.hit) {
      // Handle temporary shield
      const defenderEffects = this.getTemporaryEffects(target);
      if (defenderEffects.shield > 0 && damageResult.shieldDamage > 0) {
        // Reduce shield value
        if (target.temporaryEffects) {
          for (const effect of target.temporaryEffects) {
            if (effect.type === 'shield' && effect.duration > 0) {
              effect.value = Math.max(0, effect.value - damageResult.shieldDamage);
              if (effect.value <= 0) {
                effect.duration = 0; // Expire shield if depleted
              }
              break;
            }
          }
        }
        console.log(`🛡️ ${target.name}'s shield absorbed ${damageResult.shieldDamage} damage`);
      }
      
      // Apply health damage
      if (damageResult.damage > 0) {
        target.stats.health = Math.max(0, target.stats.health - damageResult.damage);
        console.log(`💥 ${attacker.name} attacked ${target.name}: ${oldHealth} -> ${target.stats.health} HP (damage: ${damageResult.damage}${damageResult.shieldDamage > 0 ? `, ${damageResult.shieldDamage} absorbed by shield` : ''})`);
      } else {
        console.log(`🛡️ ${attacker.name} attacked ${target.name} but all damage was absorbed by shield`);
      }
    } else if (damageResult.dodged) {
      console.log(`✨ ${target.name} dodged ${attacker.name}'s attack`);
    } else {
      console.log(`💥 ${attacker.name} missed ${target.name} (health: ${target.stats.health})`);
    }

    // Update combatants array - create new references for all combatants
    const updatedCombatants = combatants.map(c => {
      if (c.id === target.id) {
        // Return new object for target with updated health
        return {
          ...c,
          stats: {
            ...c.stats,
            health: target.stats.health
          }
        };
      } else if (c.id === attacker.id) {
        // Return new object for attacker with updated stamina
        return {
          ...c,
          stats: {
            ...c.stats,
            stamina: attacker.stats.stamina
          }
        };
      }
      return { ...c };
    });
    
    // Veil Sequelize to recognize the change in JSONB field by creating a new object reference
    encounter.setDataValue('combatants', JSON.parse(JSON.stringify(updatedCombatants)));
    encounter.changed('combatants', true); // Explicitly mark as changed

    await encounter.save();
    
    // Reload to verify the save worked
    await encounter.reload();
    const savedTarget = encounter.combatants.find(c => c.id === targetId);
    console.log(`✅ Saved health for ${target.name}: ${savedTarget.stats.health} HP`);

    return {
      type: 'attack',
      attacker: attacker.id,
      target: targetId,
      damage: damageResult.damage,
      hit: damageResult.hit,
      dodged: damageResult.dodged || false,
      critical: damageResult.critical,
      message: damageResult.message,
      staminaCost: staminaCost > 0 ? staminaCost : undefined
    };
  }

  /**
   * Calculate damage
   */
  calculateDamage(attacker, defender) {
    const baseDamage = attacker.stats.attack || 10;
    const defense = defender.stats.defense || 0;
    
    // Get temporary effects for attacker
    const attackerEffects = this.getTemporaryEffects(attacker);
    
    // Apply special effects damage modifiers
    let damageModifier = 1.0;
    if (attacker.combatModifiers) {
      // Apply droid bonus if target is droid
      if (defender.type === 'droid' && attacker.combatModifiers.droidDamageBonus) {
        damageModifier += attacker.combatModifiers.droidDamageBonus;
      }
      // Apply arcblade bonus if weapon is arcblade
      if (attacker.combatModifiers.lightsaberDamageBonus) {
        const weapon = attacker.equippedItems?.find(item => item.equipmentSlot === 'weapon');
        if (weapon && weapon.itemId && weapon.itemId.includes('arcblade')) {
          damageModifier += attacker.combatModifiers.lightsaberDamageBonus;
        }
      }
    }
    
    // Accuracy roll with temporary accuracy boost
    const baseAccuracy = attacker.stats.accuracy || 70;
    const accuracy = Math.min(100, baseAccuracy + attackerEffects.accuracy);
    const hitRoll = Math.random() * 100;
    const hit = hitRoll <= accuracy;

    if (!hit) {
      return {
        damage: 0,
        hit: false,
        critical: false,
        message: `${attacker.name} missed!`
      };
    }

    // Evasion: even on a hit, the defender may dodge. This is the consumer of
    // stats.dodgeChance (Agility/derived), which was previously computed and
    // displayed but never rolled in combat.
    const dodgeChance = defender.stats.dodgeChance || 0;
    if (dodgeChance > 0 && Math.random() < dodgeChance) {
      return {
        damage: 0,
        shieldDamage: 0,
        hit: false,
        dodged: true,
        critical: false,
        message: `${defender.name} dodged ${attacker.name}'s attack!`
      };
    }

    // Critical hit chance calculation with DR
    // Use the calculated critChance from combatant stats (includes Perception and skill bonuses with DR)
    const { calculateCritChance } = require('../utils/diminishingReturns');
    
    // Get base crit chance (already includes perception and skill bonuses with DR)
    let criticalChance = attacker.stats.critChance || 0.05;
    
    // Apply luck modifiers if present
    // Note: Luck modifiers are typically small bonuses, so we add them to the already-DR'd value
    // and re-cap at 50% to ensure we don't exceed the hard cap
    if (attacker.luckModifiers && attacker.luckModifiers.luckBonus) {
      // Add luck bonus (already in decimal form, e.g., 0.05 = 5%)
      criticalChance += attacker.luckModifiers.luckBonus;
      // Re-apply cap to ensure we don't exceed 50%
      criticalChance = Math.min(0.50, criticalChance);
    }
    
    const criticalRoll = Math.random();
    const isCritical = criticalRoll <= criticalChance;
    const damageMultiplier = isCritical ? 2 : 1;

    // Calculate final damage with temporary damage boost and special effects
    const rawDamage = (baseDamage + attackerEffects.damage) * damageMultiplier * damageModifier;
    
    // Apply defense: Use percentage-based reduction instead of flat subtraction
    // Defense reduces damage by a percentage, with diminishing returns
    // Formula: damageReduction = defense / (defense + 50)
    // This means 50 defense = 50% reduction, 100 defense = 66% reduction
    const damageReduction = defense / (defense + 50);
    const damageAfterDefense = rawDamage * (1 - damageReduction);
    
    // Apply energy resistance if defender has it
    let finalDamage = Math.max(1, Math.floor(damageAfterDefense));
    if (defender.defenseModifiers && defender.defenseModifiers.energyResistance) {
      finalDamage = Math.floor(finalDamage * (1 - defender.defenseModifiers.energyResistance));
    }
    
    // Get temporary shield for defender
    const defenderEffects = this.getTemporaryEffects(defender);
    let shieldDamage = 0;
    let healthDamage = finalDamage;
    
    // Apply shield if present
    if (defenderEffects.shield > 0) {
      // Shield absorbs damage first
      if (finalDamage <= defenderEffects.shield) {
        shieldDamage = finalDamage;
        healthDamage = 0;
      } else {
        shieldDamage = defenderEffects.shield;
        healthDamage = finalDamage - defenderEffects.shield;
      }
    }

    return {
      damage: healthDamage,
      shieldDamage: shieldDamage,
      hit: true,
      critical: isCritical,
      message: isCritical 
        ? `${attacker.name} critical hit for ${finalDamage} damage!`
        : `${attacker.name} hit for ${finalDamage} damage`
    };
  }

  /**
   * Execute defend action
   */
  async executeDefend(encounter, combatant) {
    // Add defense status effect for this turn
    if (!combatant.statusEffects) {
      combatant.statusEffects = [];
    }

    combatant.statusEffects.push({
      type: 'defend',
      defenseBonus: 5,
      duration: 1
    });

    // Update combatants array
    const combatants = encounter.combatants;
    const index = combatants.findIndex(c => c.id === combatant.id);
    combatants[index] = combatant;
    
    // Veil Sequelize to recognize the change in JSONB field by creating a new object reference
    encounter.setDataValue('combatants', JSON.parse(JSON.stringify(combatants)));

    await encounter.save();

    return {
      type: 'defend',
      combatant: combatant.id,
      message: `${combatant.name} takes a defensive stance`
    };
  }

  /**
   * Execute use item action
   */
  async executeUseItem(encounter, combatant, itemId, targetId = null) {
    // Only players can use items
    if (combatant.type !== 'player') {
      throw new Error('Only players can use items');
    }

    // Get character inventory
    const character = await PlayerCharacter.findByPk(combatant.characterId);
    const inventory = await inventoryService.getInventory(character.id);
    
    // Find item in inventory
    const item = inventory.items.find(i => i.itemId === itemId);
    if (!item || item.quantity < 1) {
      throw new Error('Item not found in inventory');
    }

    // Get item definition
    const itemDef = getItemDefinition(itemId);
    if (!itemDef || itemDef.type !== 'consumable') {
      throw new Error('Item is not a consumable');
    }

    // Determine target ID (use targetId if provided, otherwise use combatant's own ID)
    const finalTargetId = targetId || combatant.id;

    // Apply healing or other effects
    // Check for both 'healing' and 'healthRestore' stat names
    const healthRestore = itemDef.stats?.healthRestore || itemDef.stats?.healing || 0;
    let actualHealing = 0;
    let actualStaminaRestore = 0;
    
    // Get a fresh copy of combatants array to avoid reference issues
    const combatants = JSON.parse(JSON.stringify(encounter.combatants));
    const targetIndex = combatants.findIndex(c => c.id === finalTargetId);
    
    if (targetIndex === -1) {
      throw new Error(`Target combatant not found in encounter: ${finalTargetId}`);
    }
    
    const targetCombatant = combatants[targetIndex];
    
    if (!targetCombatant) {
      throw new Error('Target combatant is null');
    }
    
    // Handle full heal flag
    const isFullHeal = itemDef.stats?.fullHeal === true;
    
    if (healthRestore > 0) {
      const oldHealth = targetCombatant.stats.health;
      if (isFullHeal) {
        // Full heal restores to maximum health
        targetCombatant.stats.health = targetCombatant.stats.maxHealth;
        actualHealing = targetCombatant.stats.health - oldHealth;
        console.log(`[Combat Service] Full heal: ${oldHealth} -> ${targetCombatant.stats.health} (restored ${actualHealing} HP)`);
      } else {
        // Standard healing
        targetCombatant.stats.health = Math.min(
          targetCombatant.stats.maxHealth,
          targetCombatant.stats.health + healthRestore
        );
        actualHealing = targetCombatant.stats.health - oldHealth;
        console.log(`[Combat Service] Medpac healing: ${oldHealth} -> ${targetCombatant.stats.health} (restored ${actualHealing} HP)`);
      }
    }
    
    // Handle stamina restore
    const staminaRestore = itemDef.stats?.staminaRestore || 0;
    if (staminaRestore > 0) {
      const oldStamina = targetCombatant.stats.stamina;
      targetCombatant.stats.stamina = Math.min(
        targetCombatant.stats.maxStamina,
        targetCombatant.stats.stamina + staminaRestore
      );
      actualStaminaRestore = targetCombatant.stats.stamina - oldStamina;
    }
    
    // Handle temporary effects
    const temporaryEffects = [];
    
    // Initialize temporaryEffects array if it doesn't exist
    if (!targetCombatant.temporaryEffects) {
      targetCombatant.temporaryEffects = [];
    }
    
    // Temporary shield
    if (itemDef.stats?.temporaryShield) {
      temporaryEffects.push({
        type: 'shield',
        value: itemDef.stats.temporaryShield,
        duration: itemDef.stats.duration || 300, // Default 5 minutes
        source: itemId
      });
    }
    
    // Temporary accuracy boost
    if (itemDef.stats?.temporaryAccuracy) {
      temporaryEffects.push({
        type: 'accuracy',
        value: itemDef.stats.temporaryAccuracy,
        duration: itemDef.stats.duration || 180, // Default 3 minutes
        source: itemId
      });
    }
    
    // Temporary damage boost
    if (itemDef.stats?.temporaryDamage) {
      temporaryEffects.push({
        type: 'damage',
        value: itemDef.stats.temporaryDamage,
        duration: itemDef.stats.duration || 240, // Default 4 minutes
        source: itemId
      });
    }
    
    // Temporary stealth boost
    if (itemDef.stats?.temporaryStealth) {
      temporaryEffects.push({
        type: 'stealth',
        value: itemDef.stats.temporaryStealth,
        duration: itemDef.stats.duration || 300, // Default 5 minutes
        source: itemId
      });
    }
    
    // Add temporary effects to combatant
    if (temporaryEffects.length > 0) {
      targetCombatant.temporaryEffects = [
        ...(targetCombatant.temporaryEffects || []),
        ...temporaryEffects
      ];
      console.log(`[Combat Service] Applied ${temporaryEffects.length} temporary effect(s) to ${targetCombatant.name}`);
    }

    // Remove item from inventory
    await inventoryService.removeItem(character.id, itemId, 1);

    // Update the combatants array with the modified target
    combatants[targetIndex] = targetCombatant;
    
    // Veil Sequelize to recognize the change in JSONB field by creating a new object reference
    encounter.setDataValue('combatants', combatants);
    
    // Explicitly mark the field as changed to ensure Sequelize detects the update
    encounter.changed('combatants', true);

    await encounter.save();
    
    // Verify the save worked by checking the saved data
    await encounter.reload();
    const savedCombatant = encounter.combatants.find(c => c.id === finalTargetId);
    if (savedCombatant) {
      if (healthRestore > 0) {
        console.log(`[Combat Service] Verified saved health: ${savedCombatant.stats.health}/${savedCombatant.stats.maxHealth} (healed ${actualHealing} HP)`);
      }
      if (staminaRestore > 0) {
        console.log(`[Combat Service] Verified saved stamina: ${savedCombatant.stats.stamina}/${savedCombatant.stats.maxStamina} (restored ${actualStaminaRestore} stamina)`);
      }
    } else {
      console.error(`[Combat Service] ERROR: Could not find saved combatant with ID ${finalTargetId} after reload!`);
    }

    // Build message based on what was restored
    let message = `${combatant.name} used ${itemDef.name}`;
    const messageParts = [];
    
    if (actualHealing > 0) {
      messageParts.push(`restored ${actualHealing} health`);
    }
    if (actualStaminaRestore > 0) {
      messageParts.push(`restored ${actualStaminaRestore} stamina`);
    }
    if (temporaryEffects.length > 0) {
      const effectNames = temporaryEffects.map(e => {
        switch (e.type) {
          case 'shield': return `${e.value} shield`;
          case 'accuracy': return `+${e.value} accuracy`;
          case 'damage': return `+${e.value} damage`;
          case 'stealth': return `+${e.value} stealth`;
          default: return e.type;
        }
      }).join(', ');
      messageParts.push(`gained ${effectNames}`);
    }
    
    if (messageParts.length > 0) {
      message = `${combatant.name} used ${itemDef.name} and ${messageParts.join(', ')}`;
    }
    
    // Get use speed for frontend
    const useSpeed = itemDef.stats?.useSpeed || 'normal';
    
    return {
      type: 'use_item',
      combatant: combatant.id,
      target: finalTargetId,
      itemId,
      healing: actualHealing,
      staminaRestore: actualStaminaRestore,
      temporaryEffects: temporaryEffects.length > 0 ? temporaryEffects : undefined,
      useSpeed: useSpeed,
      message: message
    };
  }

  /**
   * Execute ability action
   */
  async executeAbility(encounter, combatant, abilityId, targetId = null) {
    // Get ability definition
    const abilityDef = getAbilityDefinition(abilityId);
    if (!abilityDef) {
      throw new Error(`Unknown ability: ${abilityId}`);
    }

    // Check if ability is usable in combat
    if (!isCombatUsable(abilityId)) {
      throw new Error(`Ability ${abilityId} is not usable in combat`);
    }

    // Get stamina cost reduction from skills
    const { ProgressionSystem } = require('../utils/progressionSystem');
    const { PlayerCharacter } = require('../models');
    const character = await PlayerCharacter.findByPk(encounter.characterId);
    if (!character) {
      throw new Error('Character not found');
    }
    const progressionSystem = new ProgressionSystem(character);
    const passiveBonuses = progressionSystem.getPassiveBonuses();
    const costReduction = passiveBonuses.other?.staminaCostReduction || 0;
    
    // Calculate actual stamina cost with reduction
    let actualStaminaCost = 0;
    if (abilityDef.cost && abilityDef.cost.stamina) {
      const baseCost = abilityDef.cost.stamina;
      actualStaminaCost = Math.max(1, Math.floor(baseCost * (1 - costReduction / 100)));
      
      if (combatant.stats.stamina < actualStaminaCost) {
        throw new Error(`Not enough stamina. Need ${actualStaminaCost}, have ${combatant.stats.stamina}`);
      }
    }

    // Check cooldown (stored in combatant metadata)
    if (!combatant.abilityCooldowns) {
      combatant.abilityCooldowns = {};
    }
    const combatantCooldowns = combatant.abilityCooldowns;
    if (combatantCooldowns[abilityId] && combatantCooldowns[abilityId] > 0) {
      throw new Error(`Ability ${abilityDef.name} is on cooldown for ${combatantCooldowns[abilityId]} more turn(s)`);
    }

    // Validate target based on target type
    const combatants = encounter.combatants;
    let target = null;
    
    if (abilityDef.targetType === 'self') {
      target = combatant;
      targetId = combatant.id;
    } else if (abilityDef.targetType === 'enemy' || abilityDef.targetType === 'ally') {
      if (!targetId) {
        throw new Error(`Target required for ability ${abilityId}`);
      }
      target = combatants.find(c => c.id === targetId);
      if (!target) {
        throw new Error('Target not found');
      }
      
      // Validate target type
      if (abilityDef.targetType === 'enemy' && target.type === combatant.type) {
        throw new Error('Cannot target ally with enemy-targeted ability');
      }
      if (abilityDef.targetType === 'ally' && target.type !== combatant.type) {
        throw new Error('Cannot target enemy with ally-targeted ability');
      }
    } else if (abilityDef.targetType === 'all_enemies' || abilityDef.targetType === 'all_allies') {
      // Multi-target abilities - will handle in effects
      target = null;
    }

    // Consume stamina (with cost reduction applied)
    if (actualStaminaCost > 0) {
      combatant.stats.stamina = Math.max(0, combatant.stats.stamina - actualStaminaCost);
    }

    // Set cooldown
    if (abilityDef.cooldown > 0) {
      combatantCooldowns[abilityId] = abilityDef.cooldown;
    }

    // Apply ability effects
    const messages = [];
    let totalDamage = 0;
    let totalHealing = 0;

    if (abilityDef.effects.damage) {
      const damageResult = this.calculateAbilityDamage(encounter, combatant, target || combatants, abilityDef);
      totalDamage = damageResult.damage;
      if (damageResult.targets) {
        damageResult.targets.forEach(t => {
          messages.push(`${combatant.name} used ${abilityDef.name} on ${t.name} for ${t.damage} damage!`);
        });
      } else if (target) {
        messages.push(`${combatant.name} used ${abilityDef.name} on ${target.name} for ${totalDamage} damage!`);
      }
    }

    if (abilityDef.effects.heal) {
      const healResult = this.calculateAbilityHeal(encounter, combatant, target || combatant, abilityDef);
      totalHealing = healResult.healing;
      messages.push(`${combatant.name} used ${abilityDef.name} and restored ${totalHealing} health!`);
    }

    if (abilityDef.effects.selfHeal) {
      if (abilityDef.effects.selfHeal.stamina) {
        const staminaHeal = abilityDef.effects.selfHeal.stamina;
        combatant.stats.stamina = Math.min(
          combatant.stats.maxStamina,
          combatant.stats.stamina + staminaHeal
        );
        messages.push(`${combatant.name} restored ${staminaHeal} stamina!`);
      }
      if (abilityDef.effects.selfHeal.health) {
        const healthHeal = abilityDef.effects.selfHeal.health;
        combatant.stats.health = Math.min(
          combatant.stats.maxHealth,
          combatant.stats.health + healthHeal
        );
        messages.push(`${combatant.name} restored ${healthHeal} health!`);
      }
    }

    if (abilityDef.effects.buff) {
      this.applyAbilityBuff(encounter, combatant, target || combatant, abilityDef.effects.buff);
      messages.push(`${target ? target.name : combatant.name} gained ${abilityDef.name} buff!`);
    }

    if (abilityDef.effects.debuff) {
      this.applyAbilityDebuff(encounter, combatant, target, abilityDef.effects.debuff);
      if (target) {
        messages.push(`${target.name} was affected by ${abilityDef.name}!`);
      }
    }

    // Update combatants array
    const combatantsArray = encounter.combatants;
    const combatantIndex = combatantsArray.findIndex(c => c.id === combatant.id);
    if (combatantIndex !== -1) {
      combatantsArray[combatantIndex] = combatant;
    }
    if (target && target.id !== combatant.id) {
      const targetIndex = combatantsArray.findIndex(c => c.id === target.id);
      if (targetIndex !== -1) {
        combatantsArray[targetIndex] = target;
      }
    }
    
    // Veil Sequelize to recognize the change
    encounter.setDataValue('combatants', JSON.parse(JSON.stringify(combatantsArray)));
    encounter.changed('combatants', true);

    // Save encounter state
    await encounter.save();

    return {
      type: 'ability',
      ability: abilityId,
      abilityName: abilityDef.name,
      user: combatant.id,
      target: targetId,
      damage: totalDamage,
      healing: totalHealing,
      message: messages.join(' ') || `${combatant.name} used ${abilityDef.name}!`,
      success: true
    };
  }

  /**
   * Calculate ability damage
   */
  calculateAbilityDamage(encounter, attacker, targets, abilityDef) {
    const damageEffect = abilityDef.effects.damage;
    const baseDamage = damageEffect.base || 0;
    
    // Calculate scaling damage
    let scalingDamage = 0;
    if (damageEffect.scaling) {
      if (damageEffect.scaling.attack) {
        scalingDamage += (attacker.stats.attack || 0) * damageEffect.scaling.attack;
      }
      if (damageEffect.scaling.forcePower) {
        scalingDamage += (attacker.stats.forcePower || 0) * damageEffect.scaling.forcePower;
      }
    }

    const totalBaseDamage = baseDamage + scalingDamage;

    // Handle multi-target vs single target
    const targetList = Array.isArray(targets) ? targets : [targets];
    const isEnemyTarget = abilityDef.targetType === 'all_enemies';
    const validTargets = isEnemyTarget 
      ? targetList.filter(t => t.type !== attacker.type && t.stats.health > 0)
      : targetList.filter(t => t.stats.health > 0);

    const damageResults = [];
    let totalDamage = 0;

    validTargets.forEach(target => {
      // Apply damage type modifiers
      let damage = totalBaseDamage;
      
      // Droid bonus for ion damage
      if (damageEffect.type === 'ion' && damageEffect.droidBonus && target.type === 'droid') {
        damage = Math.floor(damage * (1 + damageEffect.droidBonus));
      }

      // Apply defense
      const defense = target.stats.defense || 0;
      damage = Math.max(1, Math.floor(damage - defense * 0.5)); // Abilities ignore 50% of defense

      // Check for crit
      let isCritical = false;
      if (damageEffect.critChance) {
        isCritical = Math.random() <= damageEffect.critChance;
        if (isCritical) {
          damage = Math.floor(damage * 1.5);
        }
      }

      // Apply shield
      const defenderEffects = this.getTemporaryEffects(target);
      let shieldDamage = 0;
      let healthDamage = damage;
      
      if (defenderEffects.shield > 0) {
        if (damage <= defenderEffects.shield) {
          shieldDamage = damage;
          healthDamage = 0;
        } else {
          shieldDamage = defenderEffects.shield;
          healthDamage = damage - defenderEffects.shield;
        }
      }

      // Apply damage to target
      const oldHealth = target.stats.health;
      target.stats.health = Math.max(0, target.stats.health - healthDamage);
      
      // Update shield if present
      if (shieldDamage > 0 && target.statusEffects) {
        const shieldEffect = target.statusEffects.find(e => e.shield > 0);
        if (shieldEffect) {
          shieldEffect.shield = Math.max(0, shieldEffect.shield - shieldDamage);
          if (shieldEffect.shield === 0) {
            target.statusEffects = target.statusEffects.filter(e => e.shield === 0 || e.shield > 0);
          }
        }
      }

      totalDamage += healthDamage;
      damageResults.push({
        target: target.id,
        targetName: target.name,
        damage: healthDamage,
        shieldDamage: shieldDamage,
        critical: isCritical,
        oldHealth: oldHealth,
        newHealth: target.stats.health
      });
    });

    return {
      damage: totalDamage,
      targets: damageResults
    };
  }

  /**
   * Calculate ability healing
   */
  calculateAbilityHeal(encounter, healer, target, abilityDef) {
    const { calculateHealing } = require('../utils/abilityScaling');
    const { ProgressionSystem } = require('../utils/progressionSystem');
    
    const healEffect = abilityDef.effects.heal;
    const baseHeal = healEffect.base || 40; // Default base healing
    
    // Get intelligence
    const intelligence = healer.stats.intelligence || 10;
    
    // Get Field Medic skill level
    const progressionSystem = new ProgressionSystem(healer);
    const medicLevel = progressionSystem.getSkillLevel('survival', 'field_medic');
    
    // Calculate healing with piecewise scaling
    const totalHealing = calculateHealing(baseHeal, intelligence, medicLevel);
    
    const oldHealth = target.stats.health;
    target.stats.health = Math.min(target.stats.maxHealth, target.stats.health + totalHealing);
    const actualHealing = target.stats.health - oldHealth;

    return {
      healing: actualHealing,
      oldHealth: oldHealth,
      newHealth: target.stats.health,
      baseHeal,
      intelligence,
      medicLevel,
      totalHealing // Store for debugging/UI
    };
  }

  /**
   * Apply ability buff
   */
  applyAbilityBuff(encounter, caster, target, buffEffect) {
    if (!target.statusEffects) {
      target.statusEffects = [];
    }

    const buff = {
      type: 'ability_buff',
      name: buffEffect.name || 'Ability Buff',
      duration: buffEffect.duration || 1,
      attack: buffEffect.attack || 0,
      defense: buffEffect.defense || 0,
      accuracy: buffEffect.accuracy || 0,
      critChance: buffEffect.critChance || 0,
      damageReduction: buffEffect.damageReduction || 0
    };

    target.statusEffects.push(buff);
  }

  /**
   * Apply ability debuff
   */
  applyAbilityDebuff(encounter, caster, target, debuffEffect) {
    if (!target.statusEffects) {
      target.statusEffects = [];
    }

    const debuff = {
      type: 'ability_debuff',
      name: debuffEffect.name || 'Ability Debuff',
      duration: debuffEffect.duration || 1,
      accuracy: debuffEffect.accuracy || 0,
      stun: debuffEffect.stun || false
    };

    target.statusEffects.push(debuff);
  }

  /**
   * Execute flee action
   */
  async executeFlee(encounter, combatant) {
    // Flee chance based on speed
    const fleeChance = 0.3 + (combatant.stats.speed / 100);
    const fleeRoll = Math.random();

    if (fleeRoll <= fleeChance) {
      await this.endEncounter(encounter.id, 'fled');
      return {
        type: 'flee',
        success: true,
        message: `${combatant.name} successfully fled`
      };
    } else {
      return {
        type: 'flee',
        success: false,
        message: `${combatant.name} failed to flee`
      };
    }
  }

  /**
   * Process all enemy turns until it's the player's turn
   * @param {string} encounterId - Encounter UUID
   * @returns {Promise<Object>} Result with encounter and enemy actions
   */
  async processEnemyTurns(encounterId) {
    const encounter = await CombatEncounter.findByPk(encounterId);
    
    if (!encounter) {
      throw new Error('Combat encounter not found');
    }

    if (encounter.status !== 'active') {
      return {
        encounter: encounter.toJSON(),
        enemyActions: [],
        processed: false
      };
    }

    const enemyActions = [];

    // Keep processing enemy turns until it's the player's turn or combat ends
    while (encounter.status === 'active') {
      const currentCombatantId = encounter.turnOrder[encounter.currentTurn];
      const currentCombatant = encounter.combatants.find(c => c.id === currentCombatantId);

      if (!currentCombatant || currentCombatant.type !== 'enemy') {
        // It's the player's turn, stop processing
        break;
      }

      // Process this enemy's turn
      await this.processStatusEffects(encounter);
      const enemyAction = await this.executeEnemyTurn(encounter, currentCombatant);
      if (enemyAction) {
        enemyActions.push(enemyAction);
      }

      // Check victory conditions
      const victoryCheck = await this.checkVictoryConditions(encounter);
      if (victoryCheck.gameOver) {
        await this.endEncounter(encounter.id, victoryCheck.status);
        break;
      }

      // Advance to next turn
      encounter.currentTurn = (encounter.currentTurn + 1) % encounter.turnOrder.length;
      await encounter.save();
    }

    await encounter.reload();
    return {
      encounter: encounter.toJSON(),
      enemyActions,
      processed: true
    };
  }

  /**
   * Advance to next turn
   * Returns array of enemy actions if any were executed
   */
  async advanceTurn(encounter) {
    const enemyActions = [];

    // Process status effects
    await this.processStatusEffects(encounter);

    // Advance turn
    const previousTurn = encounter.currentTurn;
    encounter.currentTurn = (encounter.currentTurn + 1) % encounter.turnOrder.length;
    
    // Save the turn advancement immediately to persist it
    await encounter.save();
    
    console.log(`🔄 Advancing turn: ${previousTurn} -> ${encounter.currentTurn}`);

    // Reload to ensure we have the latest state
    await encounter.reload();

    // If it's an enemy's or companion's turn, execute AI action
    const currentCombatantId = encounter.turnOrder[encounter.currentTurn];
    const currentCombatant = encounter.combatants.find(c => c.id === currentCombatantId);

    console.log(`🎯 Current combatant: ${currentCombatant?.name} (${currentCombatant?.type}), health: ${currentCombatant?.stats?.health}`);

    if (currentCombatant && currentCombatant.type === 'enemy') {
      // Check if enemy is still alive
      if (currentCombatant.stats.health <= 0) {
        console.log(`💀 Enemy ${currentCombatant.name} is dead, skipping turn`);
        // Skip dead enemy, continue to next turn
        const nextEnemyActions = await this.advanceTurn(encounter);
        enemyActions.push(...(nextEnemyActions || []));
      } else {
        // Execute AI turn
        console.log(`🤖 Executing enemy turn for ${currentCombatant.name} (health: ${currentCombatant.stats.health})`);
        const enemyAction = await this.executeEnemyTurn(encounter, currentCombatant);
        if (enemyAction) {
          enemyActions.push(enemyAction);
        }
        
        // Save encounter after enemy action
        await encounter.save();
        
        // Reload to get updated state after enemy action
        await encounter.reload();
        
        // Check victory conditions again
        const victoryCheck = await this.checkVictoryConditions(encounter);
        if (victoryCheck.gameOver) {
          await this.endEncounter(encounter.id, victoryCheck.status);
          await encounter.reload();
        } else {
          // Continue to next turn (recursively process all enemy turns)
          const nextEnemyActions = await this.advanceTurn(encounter);
          enemyActions.push(...(nextEnemyActions || []));
        }
      }
    } else if (currentCombatant && currentCombatant.type === 'companion') {
      // Handle NPC companion turn
      if (currentCombatant.stats.health <= 0) {
        console.log(`💀 Companion ${currentCombatant.name} is dead, skipping turn`);
        const nextEnemyActions = await this.advanceTurn(encounter);
        enemyActions.push(...(nextEnemyActions || []));
      } else {
        console.log(`🤝 Executing companion turn for ${currentCombatant.name} (health: ${currentCombatant.stats.health})`);
        const companionAction = await this.executeCompanionTurn(encounter, currentCombatant);
        if (companionAction) {
          enemyActions.push(companionAction); // Use same array for consistency
        }
        
        await encounter.save();
        await encounter.reload();
        
        const victoryCheck = await this.checkVictoryConditions(encounter);
        if (victoryCheck.gameOver) {
          await this.endEncounter(encounter.id, victoryCheck.status);
          await encounter.reload();
        } else {
          const nextEnemyActions = await this.advanceTurn(encounter);
          enemyActions.push(...(nextEnemyActions || []));
        }
      }
    }

    return enemyActions;
  }

  /**
   * Execute NPC companion turn
   */
  async executeCompanionTurn(encounter, companion) {
    const enemyCombatants = encounter.combatants.filter(c => c.type === 'enemy' && c.stats.health > 0);
    
    if (enemyCombatants.length === 0) {
      return null; // No enemies to attack
    }
    
    // Simple AI: Attack random enemy
    const target = enemyCombatants[Math.floor(Math.random() * enemyCombatants.length)];
    
    // Calculate damage
    // TODO: route companion attacks through calculateDamage() so they share the
    // accuracy/crit/dodge/defense model instead of this simplified inline calc.
    const baseDamage = companion.stats.attack || 10;
    const defense = target.stats.defense || 0;
    const damage = Math.max(1, baseDamage - Math.floor(defense / 2));
    
    // Apply damage
    target.stats.health = Math.max(0, target.stats.health - damage);
    
    console.log(`🤝 ${companion.name} attacks ${target.name} for ${damage} damage`);
    
    // Check if target is dead
    if (target.stats.health <= 0) {
      console.log(`💀 ${target.name} defeated by ${companion.name}`);
    }
    
    // Update encounter
    const targetIndex = encounter.combatants.findIndex(c => c.id === target.id);
    if (targetIndex !== -1) {
      encounter.combatants[targetIndex] = target;
    }
    
    await encounter.save();
    
    return {
      type: 'companion_attack',
      actor: companion.name,
      target: target.name,
      damage,
      targetHealth: target.stats.health
    };
  }

  /**
   * Process status effects and temporary effects
   */
  async processStatusEffects(encounter) {
    const combatants = encounter.combatants;
    let hasChanges = false;
    
    for (const combatant of combatants) {
      // Process status effects
      if (combatant.statusEffects && combatant.statusEffects.length > 0) {
        const oldLength = combatant.statusEffects.length;
        // Decrease duration and remove expired effects
        combatant.statusEffects = combatant.statusEffects
          .map(effect => ({
            ...effect,
            duration: effect.duration - 1
          }))
          .filter(effect => effect.duration > 0);
        
        if (combatant.statusEffects.length !== oldLength) {
          hasChanges = true;
        }
      }

      // Process temporary effects (from consumables)
      if (combatant.temporaryEffects && combatant.temporaryEffects.length > 0) {
        const oldLength = combatant.temporaryEffects.length;
        // Decrease duration (in seconds, but we process per turn)
        // Each turn is roughly 6 seconds, so we decrease by 6
        combatant.temporaryEffects = combatant.temporaryEffects
          .map(effect => ({
            ...effect,
            duration: Math.max(0, effect.duration - 6) // Decrease by 6 seconds per turn
          }))
          .filter(effect => effect.duration > 0);
        
        if (combatant.temporaryEffects.length !== oldLength) {
          hasChanges = true;
          console.log(`[Combat Service] Removed expired temporary effects from ${combatant.name}`);
        }
      }

      // Process ability cooldowns
      if (combatant.abilityCooldowns) {
        let cooldownChanged = false;
        for (const abilityId in combatant.abilityCooldowns) {
          if (combatant.abilityCooldowns[abilityId] > 0) {
            combatant.abilityCooldowns[abilityId]--;
            cooldownChanged = true;
          }
          // Remove cooldown if it reaches 0
          if (combatant.abilityCooldowns[abilityId] <= 0) {
            delete combatant.abilityCooldowns[abilityId];
          }
        }
        if (cooldownChanged) {
          hasChanges = true;
        }
      }
    }

    // Only save if there were changes
    if (hasChanges) {
      // Veil Sequelize to recognize the change in JSONB field
      encounter.setDataValue('combatants', JSON.parse(JSON.stringify(combatants)));
      encounter.changed('combatants', true);
      await encounter.save();
    }
  }
  
  /**
   * Get active temporary effects for a combatant
   */
  getTemporaryEffects(combatant) {
    if (!combatant.temporaryEffects || combatant.temporaryEffects.length === 0) {
      return {
        shield: 0,
        accuracy: 0,
        damage: 0,
        stealth: 0
      };
    }
    
    const effects = {
      shield: 0,
      accuracy: 0,
      damage: 0,
      stealth: 0
    };
    
    for (const effect of combatant.temporaryEffects) {
      if (effect.duration > 0) {
        switch (effect.type) {
          case 'shield':
            effects.shield += effect.value;
            break;
          case 'accuracy':
            effects.accuracy += effect.value;
            break;
          case 'damage':
            effects.damage += effect.value;
            break;
          case 'stealth':
            effects.stealth += effect.value;
            break;
        }
      }
    }
    
    return effects;
  }

  /**
   * Execute enemy AI turn
   */
  async executeEnemyTurn(encounter, enemy) {
    const combatants = encounter.combatants;
    const player = combatants.find(c => c.type === 'player');

    if (!player) {
      return null;
    }

    // Simple AI: always attack player
    const attackResult = await this.executeAttack(encounter, enemy, player.id);
    
    // Return formatted action result for frontend
    return {
      ...attackResult,
      combatantId: enemy.id,
      combatantName: enemy.name
    };
  }

  /**
   * Check victory/defeat conditions
   */
  async checkVictoryConditions(encounter) {
    const combatants = encounter.combatants;
    const player = combatants.find(c => c.type === 'player');
    const enemies = combatants.filter(c => c.type === 'enemy');

    // Check if player is dead
    if (player && player.stats.health <= 0) {
      return { gameOver: true, status: 'lost' };
    }

    // Check if all enemies are dead
    if (enemies.length === 0 || enemies.every(e => e.stats.health <= 0)) {
      return { gameOver: true, status: 'won' };
    }

    return { gameOver: false, status: 'active' };
  }

  /**
   * End combat encounter
   */
  async endEncounter(encounterId, status) {
    const encounter = await CombatEncounter.findByPk(encounterId);
    
    if (!encounter) {
      throw new Error('Combat encounter not found');
    }

    encounter.status = status;
    encounter.endedAt = new Date();

    // Migration telemetry: one structured line per ended encounter, tagged by engine.
    try {
      const { logCombatOutcome } = require('../config/combat');
      logCombatOutcome({
        encounterId: encounter.id,
        characterId: encounter.characterId,
        encounterType: encounter.encounterType,
        status,
        engine: encounter.metadata && encounter.metadata.realtime ? 'realtime' : 'turn-based',
      });
    } catch (e) { /* telemetry must never break combat */ }

    // Save player health and stamina back to character (regardless of win/loss/flee)
    const character = await PlayerCharacter.findByPk(encounter.characterId);
    if (character) {
      const playerCombatant = encounter.combatants.find(c => c.type === 'player');
      if (playerCombatant) {
        // Save current health and stamina from combat back to character
        character.currentHealth = Math.max(0, Math.min(character.maxHealth, playerCombatant.stats.health));
        character.currentStamina = Math.max(0, Math.min(character.maxStamina, playerCombatant.stats.stamina));
        await character.save();
        console.log(`💾 Saved player health: ${character.currentHealth}/${character.maxHealth}, stamina: ${character.currentStamina}/${character.maxStamina}`);
      }
    }

    // If won, distribute rewards and update quest objectives.
    // Reward distribution is atomic (all-or-nothing); if it fails it rolls back
    // cleanly. We still mark the encounter ended so combat can't get stuck.
    if (status === 'won') {
      let rewards = null;
      try {
        rewards = await this.distributeRewards(encounter);
      } catch (error) {
        console.error('[Combat Service] Reward distribution failed (encounter still ended):', error);
      }
      await this.updateQuestCombatObjectives(encounter);

      // Store rewards in encounter metadata for frontend display
      if (rewards) {
        encounter.metadata = {
          ...encounter.metadata,
          rewards: rewards
        };
        await encounter.save();
      }
      
      // Track dungeon quest objectives if this is a dungeon encounter
      if (encounter.encounterType === 'dungeon' && encounter.metadata?.subMapId) {
        try {
          const dungeonQuestService = require('./dungeonQuestService');
          const dungeonEnemyService = require('./dungeonEnemyService');
          
          // Get defeated enemies
          const defeatedEnemies = encounter.combatants.filter(c => c.type === 'enemy' && c.stats.health <= 0);
          
          // Mark enemies as defeated in dungeon and track quest progress
          for (const enemy of defeatedEnemies) {
            if (enemy.id && encounter.metadata.subMapId) {
              // Mark enemy as defeated
              await dungeonEnemyService.updateEnemyState(
                encounter.metadata.subMapId,
                enemy.id,
                { 
                  defeated: true,
                  inCombat: false,
                  characterId: encounter.characterId // Pass characterId for quest tracking
                }
              );
              
              // Track quest progress for this enemy defeat
              await dungeonQuestService.trackEnemyDefeat(
                encounter.characterId,
                encounter.metadata.subMapId,
                enemy
              );
            }
          }
          
          // Check if dungeon is now cleared
          await dungeonQuestService.checkDungeonCleared(
            encounter.characterId,
            encounter.metadata.subMapId
          );
        } catch (error) {
          console.warn('[Combat Service] Failed to track dungeon quest progress:', error);
          // Don't fail combat if quest tracking fails
        }
      }
      
      // Check combat achievements
      try {
        const achievementService = require('./achievementService');
        await achievementService.checkCombatAchievements(encounter.characterId);
      } catch (error) {
        console.warn('Failed to check combat achievements:', error);
        // Don't fail combat if achievement check fails
      }
    }

    // If lost, respawn player at safe location
    if (status === 'lost') {
      const respawnService = require('./respawnService');
      // Dungeon deaths respawn at the dungeon ENTRANCE (staying in the dungeon) so the saved
      // location stays coherent (preserves subMapId) instead of being overwritten with a
      // surface POI. The entrance %-coords + ids come from the encounter metadata that the
      // realtime _createRecord stamped (buildEncounterMeta).
      const md = encounter.metadata || {};
      // Any realtime SUBMAP death (dungeon OR hub like the spaceport) respawns at the submap
      // entrance so the saved location stays coherent (keeps subMapId) instead of being kicked to
      // a surface POI. The %-coords + ids come from the metadata that realtime _createRecord
      // stamped (buildEncounterMeta). The legacy turn-based path is left untouched.
      const dungeon = (md.realtime && md.subMapId) ? {
        subMapId: md.subMapId,
        parentLocationId: md.parentLocationId || null,
        x: md.respawn && Number.isFinite(md.respawn.x) ? md.respawn.x : undefined,
        y: md.respawn && Number.isFinite(md.respawn.y) ? md.respawn.y : undefined,
      } : null;
      try {
        const respawnResult = await respawnService.respawnPlayer(encounter.characterId, {
          healthRestorePercent: 40, // Restore to 40% health — a slightly bigger setback (light retune)
          chargeFee: true, // Charge medical fee
          dungeon, // null for surface; dungeon-entrance respawn target otherwise
        });
        // Stash a respawn summary so the realtime death toast can show where you revived + the fee.
        if (respawnResult && respawnResult.location) {
          encounter.metadata = {
            ...encounter.metadata,
            respawn: {
              area: respawnResult.location.name || respawnResult.location.area || null,
              medicalFee: respawnResult.medicalFee || 0,
              healthRestored: respawnResult.healthRestored,
            },
          };
        }
        console.log(`💀 Player defeated, respawned at safe location`);
      } catch (error) {
        console.error('Failed to respawn player:', error);
        // Fallback: Just set health to 0 if respawn fails
        if (character) {
          character.currentHealth = 0;
          await character.save();
        }
      }
    }

    await encounter.save();
    return encounter.toJSON();
  }

  /**
   * Update quest objectives related to combat
   */
  async updateQuestCombatObjectives(encounter) {
    try {
      const characterId = encounter.characterId;
      const combatants = encounter.combatants;
      const defeatedEnemies = combatants.filter(c => c.type === 'enemy' && c.stats.health <= 0);

      if (defeatedEnemies.length === 0) {
        return;
      }

      // Phase 5 keystone: precisely credit enemies tagged with an explicit objective (scripted
      // quest spawns) — increment that exact objective, bypassing the fragile name matching.
      // Group by objective so multiple kills in one fight credit the right amount at once; these
      // enemies are then excluded from the type/name pass below so they aren't double-counted.
      const taggedHandled = new Set();
      const taggedByObjective = new Map(); // `${questId}::${objectiveId}` -> { questId, objectiveId, count }
      for (const e of defeatedEnemies) {
        if (!e.questId || !e.objectiveId) continue;
        taggedHandled.add(e);
        const key = `${e.questId}::${e.objectiveId}`;
        const g = taggedByObjective.get(key) || { questId: e.questId, objectiveId: e.objectiveId, count: 0 };
        g.count += 1;
        taggedByObjective.set(key, g);
      }
      for (const g of taggedByObjective.values()) {
        try {
          const qp = await QuestProgress.findOne({ where: { characterId, questId: g.questId, status: 'active' } });
          if (!qp) continue;
          const q = await Quest.findByPk(g.questId);
          const obj = q && (q.objectives || []).find(o => o.id === g.objectiveId);
          if (!obj) continue;
          const cur = (qp.objectiveProgress && qp.objectiveProgress[g.objectiveId]) || 0;
          const next = cur + g.count;
          const target = obj.count || 1;
          console.log(`[Combat] Tagged quest credit: ${g.questId}/${g.objectiveId} ${next}/${target}`);
          await questService.updateObjective(characterId, g.questId, g.objectiveId, next >= target, next);
        } catch (err) {
          console.error('[Combat] Tagged quest credit failed:', err.message);
        }
      }

      // Remaining (untagged) kills use the existing type/name matching across active quests.
      const untagged = defeatedEnemies.filter(e => !taggedHandled.has(e));
      if (untagged.length === 0) return;

      // Get all active quests for character
      const activeQuests = await QuestProgress.findAll({
        where: {
          characterId,
          status: 'active'
        },
        include: [{
          model: Quest,
          as: 'quest'
        }]
      });

      // Get quest details for each active quest
      for (const questProgress of activeQuests) {
        const quest = await Quest.findByPk(questProgress.questId);
        if (!quest || !quest.objectives) continue;

        const objectives = quest.objectives || [];
        
        for (const objective of objectives) {
          // Check if objective is combat-related
          // Support multiple objective types: 'defeat', 'defeat_enemies', 'defeat_boss', 'defeat_specific_enemy', 'combat'
          if (objective.type === 'combat') {
            // Tutorial combat objective - mark as complete if any enemy was defeated
            if (untagged.length > 0) {
              console.log(`[Combat] Marking tutorial combat objective ${objective.id} as complete`);
              await questService.updateObjective(
                characterId,
                quest.id,
                objective.id,
                true,
                { defeatedEnemies: untagged.length, completedAt: new Date().toISOString() }
              );
            }
          } else if (objective.type === 'defeat' || objective.type === 'defeat_enemies' || objective.type === 'defeat_boss') {
            // Check if defeated enemies match the target type
            const targetEnemyType = objective.target;
            let matchedEnemies = untagged;

            // If target is specified, filter enemies by type
            if (targetEnemyType) {
              matchedEnemies = untagged.filter(e =>
                e.id?.includes(targetEnemyType) || 
                e.name?.toLowerCase().includes(targetEnemyType?.toLowerCase()) ||
                e.type === targetEnemyType ||
                e.enemyType === targetEnemyType
              );
            }
            
            if (matchedEnemies.length > 0) {
              const currentProgress = questProgress.objectiveProgress?.[objective.id] || 0;
              const newProgress = currentProgress + matchedEnemies.length;
              const target = objective.count || objective.target || 1;
              
              console.log(`[Combat] Updating quest objective ${objective.id}: ${newProgress}/${target} (defeated ${matchedEnemies.length} enemies)`);
              
              // Update objective progress
              await questService.updateObjective(
                characterId,
                quest.id,
                objective.id,
                newProgress >= target,
                newProgress
              );
            }
          } else if (objective.type === 'defeat_specific_enemy') {
            // Check if any defeated enemy matches the target
            const targetEnemyType = objective.targetEnemyType || objective.target;
            const matchedEnemies = untagged.filter(e =>
              e.id?.includes(targetEnemyType) ||
              e.name?.toLowerCase().includes(targetEnemyType?.toLowerCase()) ||
              e.enemyType === targetEnemyType ||
              e.type === targetEnemyType
            );
            
            if (matchedEnemies.length > 0) {
              const currentProgress = questProgress.objectiveProgress?.[objective.id] || 0;
              const newProgress = currentProgress + matchedEnemies.length;
              const target = objective.count || objective.target || 1;
              
              await questService.updateObjective(
                characterId,
                quest.id,
                objective.id,
                newProgress >= target,
                newProgress
              );
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to update quest combat objectives:', error);
      // Don't throw - quest updates shouldn't break combat
    }
  }

  /**
   * Distribute combat rewards
   */
  async distributeRewards(encounter) {
    // Atomic: XP + credits + loot are committed together (or not at all) so a
    // crash mid-reward cannot leave a character partially rewarded / duplicated.
    const t = await sequelize.transaction();
    try {
    // Lock the character row for the duration so concurrent reward distributions
    // (e.g. two combats resolving at once) cannot clobber credits/XP.
    const character = await PlayerCharacter.findByPk(encounter.characterId, {
      transaction: t,
      lock: t.LOCK.UPDATE
    });
    if (!character) {
      await t.rollback();
      return;
    }

    const combatants = encounter.combatants;
    const enemies = combatants.filter(c => c.type === 'enemy');

    let totalXP = 0;
    let totalCredits = 0;
    const loot = [];

    // Get quest item info (all quest items + active quest items) - fetch once for all enemies
    const { QuestProgress, Quest } = require('../models');

    // Get all quests to identify quest-specific items
    const allQuests = await Quest.findAll({
      where: { isActive: true },
      transaction: t
    });

    // Get active quests for this character
    const activeQuests = await QuestProgress.findAll({
      where: {
        characterId: character.id,
        status: 'active'
      },
      transaction: t
    });
    
    const allQuestItems = new Set();
    const activeQuestItems = new Set();
    
    // Identify all quest-specific items (from all quests)
    for (const quest of allQuests) {
      if (!quest.objectives) continue;
      for (const objective of quest.objectives) {
        if (objective.type === 'collect' && objective.target) {
          allQuestItems.add(objective.target);
        }
      }
    }
    
    // Get active quest items (only from active, incomplete objectives)
    for (const questProgress of activeQuests) {
      const quest = await Quest.findByPk(questProgress.questId, { transaction: t });
      if (!quest || !quest.objectives) continue;
      for (const objective of quest.objectives) {
        if (!questProgress.isObjectiveComplete(objective.id) && 
            objective.type === 'collect' && 
            objective.target) {
          activeQuestItems.add(objective.target);
        }
      }
    }

    // Check if this is a dungeon encounter - reduce rewards by 50%
    const isDungeonEncounter = encounter.encounterType === 'dungeon';
    const rewardMultiplier = isDungeonEncounter ? 0.5 : 1.0;
    
    // Calculate rewards from defeated enemies
    for (const enemy of enemies) {
      if (enemy.stats.health <= 0) {
        // Apply dungeon penalty to XP and credits (50% reduction).
        // Coerce to a finite number first: malformed enemy data must not turn
        // totalXP/totalCredits into NaN and corrupt the character record.
        const xpReward = Number(enemy.xpReward);
        const creditsReward = Number(enemy.creditsReward);
        totalXP += Math.max(0, Math.floor((Number.isFinite(xpReward) ? xpReward : 0) * rewardMultiplier));
        totalCredits += Math.max(0, Math.floor((Number.isFinite(creditsReward) ? creditsReward : 0) * rewardMultiplier));

        // Roll for loot (filter quest items based on active quests)
        if (enemy.lootTable) {
          for (const lootItem of enemy.lootTable) {
            if (Math.random() <= lootItem.chance) {
              const itemId = lootItem.itemId;
              
              // Filter quest items - only include if quest is active
              if (itemId === 'credits') {
                // Credits are always allowed (handled separately in credits calculation)
                continue;
              }
              
              // Check if this is a quest-specific item
              const isQuestItem = allQuestItems.has(itemId);
              
              if (isQuestItem) {
                // This is a quest item - only include if quest is active
                if (activeQuestItems.has(itemId)) {
                  // Quest is active, include the item
                  loot.push({
                    itemId: itemId,
                    quantity: lootItem.quantity || 1
                  });
                } else {
                  // Quest item but quest is not active, skip it
                  console.log(`[Combat Service] Skipping quest item ${itemId} - quest not active`);
                }
              } else {
                // Not a quest item, always include it
                loot.push({
                  itemId: itemId,
                  quantity: lootItem.quantity || 1
                });
              }
            }
          }
        }
      }
    }

    // Award XP (capture level-up info so the victory toast can celebrate it)
    let levelInfo = null;
    if (totalXP > 0) {
      levelInfo = await characterService.addXP(character.id, totalXP, 'combat', { transaction: t });
      if (isDungeonEncounter) {
        console.log(`[Combat Service] Dungeon encounter: Awarded ${totalXP} XP (50% of base ${Math.floor(totalXP / rewardMultiplier)})`);
      }
    }

    // Award credits via atomic DB increment (avoids read-modify-write lost updates)
    if (totalCredits > 0) {
      await character.increment('credits', { by: totalCredits, transaction: t });
      if (isDungeonEncounter) {
        console.log(`[Combat Service] Dungeon encounter: Awarded ${totalCredits} credits (50% of base ${Math.floor(totalCredits / rewardMultiplier)})`);
      }
    }

    // Log loot for dungeon encounters
    if (isDungeonEncounter && loot.length > 0) {
      console.log(`[Combat Service] Dungeon encounter: Awarded ${loot.length} loot items:`, loot.map(l => `${l.itemId} x${l.quantity}`).join(', '));
    }

    // Add loot to inventory (within the same transaction)
    for (const lootItem of loot) {
      await inventoryService.addItem(character.id, lootItem.itemId, lootItem.quantity, 'combat', { transaction: t });
    }

    await t.commit();
    // Enrich loot for the reward screen: display name + rarity (so the UI shows
    // "Regen Patch (Rare)" with a rarity glow instead of a raw item id).
    const enrichedLoot = loot.map((l) => {
      const def = getItemDefinition(l.itemId);
      return { ...l, name: def?.name || l.itemId, rarity: def?.rarity || 'common' };
    });
    return {
      xp: totalXP,
      credits: totalCredits,
      loot: enrichedLoot,
      leveledUp: (levelInfo && levelInfo.leveledUp) || [],
      newLevel: levelInfo ? levelInfo.newLevel : undefined
    };
    } catch (error) {
      await t.rollback();
      console.error('[Combat Service] Reward distribution failed, rolled back:', error);
      throw error;
    }
  }
}

module.exports = new CombatService();

