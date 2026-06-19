/**
 * Combat Service
 * Business logic for turn-based combat system
 */

const { CombatEncounter, PlayerCharacter, PlayerInventory, QuestProgress, Quest, sequelize } = require('../models');
const { getItemDefinition, weaponClass } = require('../data/items');
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
        // range/class let the realtime sim gate attacks by the equipped weapon (ranged vs melee)
        // instead of a hardcoded melee reach. See data/items.weaponWorldRange.
        weapon: weapon ? { itemId: equippedMap.weapon.itemId, damage: weaponDamage, range: weapon.stats?.range, class: weaponClass(weapon) } : null,
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

      // Faction reputation on kill (Phase 8.1): killing faction-tagged enemies lowers your
      // standing with their faction. Best-effort and isolated from rewards — a rep failure
      // must never roll back XP/credits/loot or leave the encounter stuck.
      let reputation = [];
      try {
        reputation = await this.applyFactionReputationForKills(encounter);
      } catch (error) {
        console.warn('[Combat Service] Faction reputation update failed (encounter still ended):', error);
      }

      // Store rewards in encounter metadata for frontend display. Fold reputation into the
      // same `rewards` object so it rides the existing realtime reward-toast path.
      if (rewards || reputation.length) {
        encounter.metadata = {
          ...encounter.metadata,
          rewards: { ...(rewards || {}), reputation }
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
   * Apply faction reputation changes for the enemies a player killed in this encounter
   * (Phase 8.1). Killing faction-tagged enemies lowers your standing with that faction.
   *
   * - Only DEAD enemy combatants with a non-null `faction` count (untagged enemies — droids,
   *   wild animals — are politically neutral and grant no rep change).
   * - Deltas are tier-scaled (combatReputation.repDeltaForKill) and accumulated per faction,
   *   so three smuggler kills apply one summed change rather than three writes.
   * - Each faction write is best-effort: one faction failing must not block the others.
   * - In multiplayer the realtime engine finalizes per-player off that player's own
   *   `engagedEnemies`, so `encounter.combatants` only holds the kills attributable to THIS
   *   character — attribution is correct without extra bookkeeping.
   *
   * @param {CombatEncounter} encounter
   * @returns {Promise<Array<{factionId:string,name:string,delta:number,newTier:string,tierChanged:boolean}>>}
   *          per-faction summary for the reward toast (empty when nothing applied / feature off).
   */
  async applyFactionReputationForKills(encounter) {
    const { repDeltaForKill } = require('../config/combatReputation');
    const combatants = Array.isArray(encounter.combatants) ? encounter.combatants : [];

    // Accumulate tier-scaled deltas per faction across all of this character's kills.
    const deltaByFaction = new Map();
    for (const c of combatants) {
      if (!c || c.type !== 'enemy') continue;
      if (!(c.stats && c.stats.health <= 0)) continue; // only the dead grant rep
      if (!c.faction) continue;                          // untagged = neutral, no change
      const delta = repDeltaForKill(c);
      if (!delta) continue;                              // feature off / zero-weighted
      deltaByFaction.set(c.faction, (deltaByFaction.get(c.faction) || 0) + delta);
    }
    if (deltaByFaction.size === 0) return [];

    const factionService = require('./factionService');
    const { getFactionProfile } = require('../config/factionProfiles');
    const changes = [];
    for (const [factionId, delta] of deltaByFaction) {
      try {
        const result = await factionService.applyReputationChange(
          encounter.characterId, factionId, delta, { reason: 'combat_kill' }
        );
        const profile = getFactionProfile(factionId);
        changes.push({
          factionId,
          name: (profile && profile.name) || factionId, // display name for the toast
          delta: result.delta,
          newTier: result.newTier,
          tierChanged: result.tierChanged,
        });
      } catch (error) {
        console.warn(`[Combat Service] rep change failed for faction ${factionId}:`, error.message);
      }
    }
    return changes;
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

