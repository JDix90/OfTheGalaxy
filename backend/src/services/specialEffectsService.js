/**
 * Special Effects Service
 * Handles item special effects that modify gameplay
 */

class SpecialEffectsService {
  /**
   * Effect registry - maps effect IDs to handlers
   */
  constructor() {
    this.effects = {
      // Force Effects
      force_enhancement: {
        name: 'Force Enhancement',
        description: 'Increases Force power by 10%',
        type: 'stat_modifier',
        apply: (stats, value = 0.1) => {
          if (stats.forcePower) {
            stats.forcePower = Math.floor(stats.forcePower * (1 + value));
          }
        }
      },
      force_mastery: {
        name: 'Force Mastery',
        description: 'Unlocks Force abilities',
        type: 'ability_unlock',
        apply: (abilities) => {
          if (!abilities.includes('force_mastery')) {
            abilities.push('force_mastery');
          }
        }
      },
      force_insight: {
        name: 'Force Insight',
        description: 'Improves Force perception',
        type: 'stat_modifier',
        apply: (stats, value = 5) => {
          stats.perception = (stats.perception || 0) + value;
        }
      },
      lightsaber_mastery: {
        name: 'Lightsaber Mastery',
        description: '+10% damage with lightsabers',
        type: 'combat_modifier',
        apply: (combatStats) => {
          combatStats.lightsaberDamageBonus = 0.1;
        }
      },
      
      // Combat Effects
      ion_damage: {
        name: 'Ion Damage',
        description: 'Extra damage to droids (+50%)',
        type: 'combat_modifier',
        apply: (combatStats) => {
          combatStats.droidDamageBonus = 0.5;
        }
      },
      droid_bonus: {
        name: 'Droid Bonus',
        description: '+25% damage to droids',
        type: 'combat_modifier',
        apply: (combatStats) => {
          combatStats.droidDamageBonus = (combatStats.droidDamageBonus || 0) + 0.25;
        }
      },
      energy_resistance: {
        name: 'Energy Resistance',
        description: '-20% energy damage taken',
        type: 'defense_modifier',
        apply: (defenseStats) => {
          defenseStats.energyResistance = 0.2;
        }
      },
      masterwork_quality: {
        name: 'Masterwork Quality',
        description: '+5% to all combat stats',
        type: 'stat_modifier',
        apply: (stats) => {
          if (stats.damage) stats.damage = Math.floor(stats.damage * 1.05);
          if (stats.defense) stats.defense = Math.floor(stats.defense * 1.05);
          if (stats.accuracy) stats.accuracy = Math.floor(stats.accuracy * 1.05);
          if (stats.attack) stats.attack = Math.floor(stats.attack * 1.05);
        }
      },
      
      // Utility Effects
      data_analysis: {
        name: 'Data Analysis',
        description: 'Unlocks information from datapads',
        type: 'utility',
        apply: (abilities) => {
          if (!abilities.includes('data_analysis')) {
            abilities.push('data_analysis');
          }
        }
      },
      long_range_comm: {
        name: 'Long-Range Communication',
        description: 'Enables long-distance communication',
        type: 'utility',
        apply: (abilities) => {
          if (!abilities.includes('long_range_comm')) {
            abilities.push('long_range_comm');
          }
        }
      },
      secure_comm: {
        name: 'Secure Communication',
        description: 'Encrypted communication',
        type: 'utility',
        apply: (abilities) => {
          if (!abilities.includes('secure_comm')) {
            abilities.push('secure_comm');
          }
        }
      },
      stealth_bonus: {
        name: 'Stealth Bonus',
        description: '+15% stealth effectiveness',
        type: 'stat_modifier',
        apply: (stats) => {
          stats.stealth = (stats.stealth || 0) + 15;
        }
      },
      detection_reduction: {
        name: 'Detection Reduction',
        description: '-20% detection chance',
        type: 'stat_modifier',
        apply: (stats) => {
          stats.detectionReduction = (stats.detectionReduction || 0) + 20;
        }
      },
      
      // Faction Effects
      imperial_identification: {
        name: 'Imperial Identification',
        description: 'Recognized as Imperial (access benefits)',
        type: 'faction',
        apply: (factionStatus) => {
          factionStatus.imperial_remnant = {
            recognized: true,
            accessLevel: 'standard'
          };
        }
      },
      mandalorian_craftsmanship: {
        name: 'Mandalorian Craftsmanship',
        description: '+10% durability',
        type: 'durability_modifier',
        apply: (durabilityStats) => {
          durabilityStats.durabilityBonus = 0.1;
        }
      },
      beskar_quality: {
        name: 'Beskar Quality',
        description: '+25% durability, energy resistance',
        type: 'durability_modifier',
        apply: (durabilityStats, defenseStats) => {
          durabilityStats.durabilityBonus = 0.25;
          if (defenseStats) {
            defenseStats.energyResistance = (defenseStats.energyResistance || 0) + 0.15;
          }
        }
      },
      smuggling_bonus: {
        name: 'Smuggling Bonus',
        description: '+15% smuggling success',
        type: 'stat_modifier',
        apply: (stats) => {
          stats.smugglingBonus = (stats.smugglingBonus || 0) + 15;
        }
      },
      
      // Legendary Effects
      legendary_weapon: {
        name: 'Legendary Weapon',
        description: '+10% to all stats',
        type: 'stat_modifier',
        apply: (stats) => {
          if (stats.damage) stats.damage = Math.floor(stats.damage * 1.1);
          if (stats.defense) stats.defense = Math.floor(stats.defense * 1.1);
          if (stats.accuracy) stats.accuracy = Math.floor(stats.accuracy * 1.1);
          if (stats.attack) stats.attack = Math.floor(stats.attack * 1.1);
          if (stats.speed) stats.speed = Math.floor(stats.speed * 1.1);
        }
      },
      luck_bonus: {
        name: 'Luck Bonus',
        description: '+5% to all random rolls',
        type: 'luck_modifier',
        apply: (luckStats) => {
          luckStats.luckBonus = 0.05;
        }
      },
      legendary_armor: {
        name: 'Legendary Armor',
        description: '+15% defense, +10% durability',
        type: 'defense_modifier',
        apply: (stats, durabilityStats) => {
          if (stats.defense) stats.defense = Math.floor(stats.defense * 1.15);
          if (durabilityStats) {
            durabilityStats.durabilityBonus = 0.1;
          }
        }
      },
      
      // Additional effects from items
      ancient_power: {
        name: 'Ancient Power',
        description: 'Mysterious power from ancient times',
        type: 'stat_modifier',
        apply: (stats) => {
          // Small bonus to all stats
          if (stats.intelligence) stats.intelligence = Math.floor(stats.intelligence * 1.05);
          if (stats.charisma) stats.charisma = Math.floor(stats.charisma * 1.05);
          if (stats.perception) stats.perception = Math.floor(stats.perception * 1.05);
          if (stats.forcePower) stats.forcePower = Math.floor(stats.forcePower * 1.1);
        }
      },
      legendary_artifact: {
        name: 'Legendary Artifact',
        description: 'Powerful artifact properties',
        type: 'stat_modifier',
        apply: (stats) => {
          // Significant bonuses
          if (stats.intelligence) stats.intelligence = Math.floor(stats.intelligence * 1.15);
          if (stats.charisma) stats.charisma = Math.floor(stats.charisma * 1.15);
          if (stats.perception) stats.perception = Math.floor(stats.perception * 1.15);
          if (stats.forcePower) stats.forcePower = Math.floor(stats.forcePower * 1.2);
        }
      },
      specialized_repair: {
        name: 'Specialized Repair',
        description: 'Specialized repair capabilities',
        type: 'tool_modifier',
        apply: (toolStats) => {
          toolStats.repair = (toolStats.repair || 0) + 5;
        }
      },
      healing_bonus: {
        name: 'Healing Bonus',
        description: 'Bonus to healing actions',
        type: 'stat_modifier',
        apply: (stats) => {
          stats.medical = (stats.medical || 0) + 5;
        }
      },
      instant_heal: {
        name: 'Instant Heal',
        description: 'Enables instant healing',
        type: 'ability_unlock',
        apply: (abilities) => {
          if (!abilities.includes('instant_heal')) {
            abilities.push('instant_heal');
          }
        }
      },
      master_craftsmanship: {
        name: 'Master Craftsmanship',
        description: 'Enhances all crafting skills',
        type: 'stat_modifier',
        apply: (stats) => {
          stats.crafting = (stats.crafting || 0) + 10;
          stats.repair = (stats.repair || 0) + 5;
          stats.hacking = (stats.hacking || 0) + 5;
          stats.medical = (stats.medical || 0) + 5;
        }
      },
      durability_bonus: {
        name: 'Durability Bonus',
        description: 'Increases item durability',
        type: 'durability_modifier',
        apply: (durabilityStats) => {
          durabilityStats.durabilityBonus = (durabilityStats.durabilityBonus || 0) + 0.1;
        }
      }
    };
  }

  /**
   * Get effect definition
   * @param {string} effectId - Effect ID
   * @returns {Object|null} Effect definition
   */
  getEffect(effectId) {
    return this.effects[effectId] || null;
  }

  /**
   * Apply special effects from equipped items
   * @param {Array} equippedItems - Array of equipped items
   * @param {Object} characterStats - Character stats object to modify
   * @returns {Object} Modified stats and active effects
   */
  applyEffects(equippedItems, characterStats = {}) {
    const activeEffects = [];
    const stats = { ...characterStats };
    const combatStats = {};
    const defenseStats = {};
    const durabilityStats = {};
    const luckStats = {};
    const abilities = [];
    const factionStatus = {};

    // Process each equipped item
    for (const item of equippedItems) {
      if (!item.specialEffects || !Array.isArray(item.specialEffects)) {
        continue;
      }

      for (const effectId of item.specialEffects) {
        const effect = this.getEffect(effectId);
        if (!effect) {
          console.warn(`[Special Effects] Unknown effect: ${effectId}`);
          continue;
        }

        // Apply effect based on type
        switch (effect.type) {
          case 'stat_modifier':
            effect.apply(stats);
            break;
          case 'combat_modifier':
            effect.apply(combatStats);
            break;
          case 'defense_modifier':
            effect.apply(defenseStats, durabilityStats);
            break;
          case 'durability_modifier':
            effect.apply(durabilityStats, defenseStats);
            break;
          case 'luck_modifier':
            effect.apply(luckStats);
            break;
          case 'ability_unlock':
            effect.apply(abilities);
            break;
          case 'utility':
            effect.apply(abilities);
            break;
          case 'faction':
            effect.apply(factionStatus);
            break;
          case 'tool_modifier':
            effect.apply(stats);
            break;
        }

        activeEffects.push({
          id: effectId,
          name: effect.name,
          description: effect.description,
          source: item.itemId || item.id
        });
      }
    }

    return {
      stats,
      combatStats,
      defenseStats,
      durabilityStats,
      luckStats,
      abilities,
      factionStatus,
      activeEffects
    };
  }

  /**
   * Calculate combat damage with special effects
   * @param {Object} attacker - Attacker combatant with equipped items
   * @param {Object} defender - Defender combatant with equipped items
   * @param {number} baseDamage - Base damage value
   * @returns {Object} Modified damage calculation
   */
  calculateCombatDamage(attacker, defender, baseDamage) {
    let finalDamage = baseDamage;
    const modifiers = {
      droidBonus: 0,
      lightsaberBonus: 0,
      energyResistance: 0
    };

    // Get attacker's equipped items
    const attackerItems = attacker.equippedItems || [];
    const attackerEffects = this.applyEffects(attackerItems);
    
    // Apply attacker combat modifiers
    if (attackerEffects.combatStats.droidDamageBonus) {
      modifiers.droidBonus = attackerEffects.combatStats.droidDamageBonus;
    }
    if (attackerEffects.combatStats.lightsaberDamageBonus) {
      modifiers.lightsaberBonus = attackerEffects.combatStats.lightsaberDamageBonus;
    }

    // Get defender's equipped items
    const defenderItems = defender.equippedItems || [];
    const defenderEffects = this.applyEffects(defenderItems);
    
    // Apply defender resistance
    if (defenderEffects.defenseStats.energyResistance) {
      modifiers.energyResistance = defenderEffects.defenseStats.energyResistance;
    }

    // Calculate final damage
    // Apply droid bonus if target is droid
    if (defender.type === 'droid' && modifiers.droidBonus > 0) {
      finalDamage = Math.floor(finalDamage * (1 + modifiers.droidBonus));
    }

    // Apply lightsaber bonus if weapon is lightsaber
    const attackerWeapon = attackerItems.find(item => item.equipmentSlot === 'weapon');
    if (attackerWeapon && attackerWeapon.itemId && attackerWeapon.itemId.includes('lightsaber') && modifiers.lightsaberBonus > 0) {
      finalDamage = Math.floor(finalDamage * (1 + modifiers.lightsaberBonus));
    }

    // Apply energy resistance
    if (modifiers.energyResistance > 0) {
      finalDamage = Math.floor(finalDamage * (1 - modifiers.energyResistance));
    }

    return {
      damage: Math.max(1, finalDamage),
      modifiers
    };
  }

  /**
   * Get display information for special effects
   * @param {Array} specialEffects - Array of effect IDs
   * @returns {Array} Array of effect display objects
   */
  getEffectDisplay(specialEffects) {
    if (!specialEffects || !Array.isArray(specialEffects)) {
      return [];
    }

    return specialEffects
      .map(effectId => {
        const effect = this.getEffect(effectId);
        if (!effect) return null;
        return {
          id: effectId,
          name: effect.name,
          description: effect.description,
          type: effect.type
        };
      })
      .filter(effect => effect !== null);
  }
}

module.exports = new SpecialEffectsService();


