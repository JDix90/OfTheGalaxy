/**
 * Inventory Service
 * Business logic for player inventory management
 */

const { PlayerInventory, PlayerCharacter, Item, FactionReputation } = require('../models');
const { getItemDefinition } = require('../data/items');
const { calculateSetBonuses } = require('../data/itemSets');

class InventoryService {
  /**
   * Get all items for a character
   */
  async getInventory(characterId) {
    const items = await PlayerInventory.findForCharacter(characterId);
    const equipped = await PlayerInventory.findEquipped(characterId);
    
    return {
      items: items.map(item => item.toJSON()),
      equipped: equipped.map(item => item.toJSON())
    };
  }

  /**
   * Add item to inventory
   */
  async addItem(characterId, itemId, quantity = 1, acquiredFrom = null, options = {}) {
    const { transaction } = options;
    // Verify character exists
    const character = await PlayerCharacter.findByPk(characterId, { transaction });
    if (!character) {
      throw new Error('Character not found');
    }

    const item = await PlayerInventory.addItem(characterId, itemId, quantity, acquiredFrom, { transaction });

    // Track quest objectives for collect type.
    // When running inside a transaction, let tracking errors propagate so the
    // whole operation rolls back atomically; otherwise preserve the original
    // best-effort behavior (item is added even if tracking fails).
    if (transaction) {
      await this.trackCollectObjectives(characterId, itemId, quantity, options);
    } else {
      try {
        await this.trackCollectObjectives(characterId, itemId, quantity, options);
      } catch (error) {
        console.error('[Inventory Service] Failed to track collect objectives:', error);
      }
    }

    return item.toJSON();
  }

  /**
   * Track collect objectives when items are added to inventory
   * @param {string} characterId - Character ID
   * @param {string} itemId - Item ID that was added
   * @param {number} quantity - Quantity added
   */
  async trackCollectObjectives(characterId, itemId, quantity, options = {}) {
    const { transaction } = options;
    const { QuestProgress, Quest } = require('../models');
    const questService = require('./questService');

    // Get all active quests for this character
    const activeQuests = await QuestProgress.findAll({
      where: {
        characterId,
        status: 'active'
      },
      transaction
    });

    // Check each active quest for collect objectives
    for (const questProgress of activeQuests) {
      const quest = await Quest.findByPk(questProgress.questId, { transaction });
      if (!quest || !quest.objectives) continue;
      
      for (const objective of quest.objectives) {
        // Skip if already completed
        if (questProgress.isObjectiveComplete(objective.id)) {
          continue;
        }
        
        // Check if this is a collect objective for this item
        if (objective.type === 'collect' && objective.target === itemId) {
          // Get current progress
          const currentProgress = questProgress.objectiveProgress[objective.id] || { count: 0 };
          const currentCount = typeof currentProgress === 'number' ? currentProgress : (currentProgress.count || 0);
          
          // Add quantity to progress
          const newCount = currentCount + quantity;
          const requiredCount = objective.count || 1;
          
          // Check if objective is complete
          const isComplete = newCount >= requiredCount;
          
          // Update objective
          await questService.updateObjective(
            characterId,
            quest.id,
            objective.id,
            isComplete,
            { count: newCount, required: requiredCount },
            options
          );
          
          console.log(`[Quest] Collect objective ${objective.id}: ${newCount}/${requiredCount} (added ${quantity} ${itemId})`);
        }
      }
    }
  }

  /**
   * Remove item from inventory
   */
  async removeItem(characterId, itemId, quantity = 1) {
    const item = await PlayerInventory.removeItem(characterId, itemId, quantity);
    return item ? item.toJSON() : null;
  }

  /**
   * Equip an item
   */
  async equipItem(characterId, itemId, slot) {
    // Verify character exists
    const character = await PlayerCharacter.findByPk(characterId);
    if (!character) {
      throw new Error('Character not found');
    }

    // Find the item
    const item = await PlayerInventory.findOne({
      where: {
        characterId,
        itemId,
        equipped: false
      }
    });

    if (!item) {
      throw new Error('Item not found in inventory or already equipped');
    }

    // Validate slot
    const validSlots = ['weapon', 'armor', 'accessory', 'tool'];
    if (!validSlots.includes(slot)) {
      throw new Error(`Invalid equipment slot: ${slot}`);
    }

    // Equip the item (this will unequip any existing item in that slot)
    await item.equip(slot);

    // Check if item unlocks a permanent ability
    let abilityUnlocked = null;
    const itemDef = getItemDefinition(itemId);
    if (itemDef && itemDef.stats?.permanentAbility) {
      try {
        const abilityService = require('./abilityService');
        const unlockResult = await abilityService.unlockAbility(characterId, itemId);
        if (unlockResult.success) {
          console.log(`[Inventory Service] Unlocked ability "${unlockResult.ability}" for character ${characterId} from item ${itemId}`);
          abilityUnlocked = {
            ability: unlockResult.ability,
            message: unlockResult.message
          };
        }
      } catch (error) {
        console.error('[Inventory Service] Failed to unlock ability:', error);
        // Don't fail equipment if ability unlock fails
      }
    }

    // Reload to get updated data
    await item.reload();
    const itemData = item.toJSON();
    
    // Include ability unlock info if applicable
    if (abilityUnlocked) {
      itemData.abilityUnlocked = abilityUnlocked;
    }
    
    return itemData;
  }

  /**
   * Unequip an item
   */
  async unequipItem(characterId, itemId) {
    // Find the equipped item
    const item = await PlayerInventory.findOne({
      where: {
        characterId,
        itemId,
        equipped: true
      }
    });

    if (!item) {
      throw new Error('Item not found or not equipped');
    }

    await item.unequip();

    // Reload to get updated data
    await item.reload();
    return item.toJSON();
  }

  /**
   * Get equipped items
   */
  async getEquipped(characterId) {
    const equipped = await PlayerInventory.findEquipped(characterId);
    return equipped.map(item => item.toJSON());
  }

  /**
   * Get item data (from database or data file)
   */
  async getItemData(itemId) {
    // Try database first
    let item = await Item.findByPk(itemId);
    
    if (item) {
      return item.toJSON();
    }
    
    // Fallback to data file
    const itemDef = getItemDefinition(itemId);
    if (itemDef) {
      return {
        id: itemDef.id,
        name: itemDef.name,
        description: itemDef.description,
        itemType: itemDef.type,
        rarity: itemDef.rarity || 'common',
        factionId: itemDef.factionId || null,
        minReputationTier: itemDef.minReputationTier || null,
        stats: itemDef.stats || {},
        baseValue: itemDef.value || 0,
        weight: itemDef.weight || 0,
        stackSize: itemDef.stackSize || 1,
        equipmentSlot: itemDef.equipmentSlot || null,
        icon: itemDef.icon || null,
        metadata: itemDef.metadata || {}
      };
    }
    
    throw new Error(`Item not found: ${itemId}`);
  }

  /**
   * Get items by rarity
   */
  async getItemsByRarity(characterId, rarity) {
    const inventory = await this.getInventory(characterId);
    
    // Enrich items with item data
    const enrichedItems = await Promise.all(
      inventory.items.map(async (invItem) => {
        try {
          const itemData = await this.getItemData(invItem.itemId);
          return {
            ...invItem,
            ...itemData
          };
        } catch (e) {
          return invItem;
        }
      })
    );
    
    return enrichedItems.filter(item => item.rarity === rarity);
  }

  /**
   * Check if character can equip an item (faction requirements)
   */
  async canEquipItem(characterId, itemId) {
    const itemData = await this.getItemData(itemId);
    
    // Check faction requirement
    if (itemData.factionId && itemData.minReputationTier) {
      const character = await PlayerCharacter.findByPk(characterId);
      if (!character) {
        return { canEquip: false, reason: 'Character not found' };
      }

      const reputation = await FactionReputation.findOne({
        where: { characterId, factionId: itemData.factionId }
      });

      if (!reputation) {
        return {
          canEquip: false,
          reason: `Requires ${itemData.minReputationTier} reputation with ${itemData.factionId}`
        };
      }

      if (!this.meetsReputationTier(reputation.tier, itemData.minReputationTier)) {
        return {
          canEquip: false,
          reason: `Requires ${itemData.minReputationTier} reputation with ${itemData.factionId}. Current: ${reputation.tier}`
        };
      }
    }

    return { canEquip: true };
  }

  /**
   * Check if current reputation tier meets required tier
   */
  meetsReputationTier(currentTier, requiredTier) {
    const tiers = ['neutral', 'friendly', 'trusted', 'allied', 'revered'];
    const currentIndex = tiers.indexOf(currentTier);
    const requiredIndex = tiers.indexOf(requiredTier);
    
    if (currentIndex === -1 || requiredIndex === -1) {
      return false;
    }
    
    return currentIndex >= requiredIndex;
  }

  /**
   * Use a consumable item (outside of combat)
   * @param {string} characterId - Character ID
   * @param {string} itemId - Item ID to use
   * @returns {Promise<Object>} Result with healing/stamina restoration info
   */
  async useItem(characterId, itemId) {
    // Verify character exists
    const character = await PlayerCharacter.findByPk(characterId);
    if (!character) {
      throw new Error('Character not found');
    }

    // Find the item in inventory
    const item = await PlayerInventory.findOne({
      where: {
        characterId,
        itemId,
        equipped: false
      }
    });

    if (!item || item.quantity < 1) {
      throw new Error('Item not found in inventory');
    }

    // Get item definition
    const itemDef = getItemDefinition(itemId);
    if (!itemDef) {
      throw new Error('Item definition not found');
    }

    // Verify it's a consumable
    if (itemDef.type !== 'consumable') {
      throw new Error('Item is not a consumable');
    }

    const result = {
      itemId,
      itemName: itemDef.name,
      healthRestored: 0,
      staminaRestored: 0,
      fullHeal: false
    };

    // Handle health restoration
    const healthRestore = itemDef.stats?.healthRestore || 0;
    const isFullHeal = itemDef.stats?.fullHeal === true;

    if (healthRestore > 0 || isFullHeal) {
      const oldHealth = character.currentHealth;
      
      if (isFullHeal) {
        character.currentHealth = character.maxHealth;
        result.fullHeal = true;
      } else {
        character.currentHealth = Math.min(
          character.maxHealth,
          character.currentHealth + healthRestore
        );
      }

      result.healthRestored = character.currentHealth - oldHealth;
      
      console.log(`[Inventory Service] Health restoration: ${oldHealth} -> ${character.currentHealth} (restored ${result.healthRestored} HP)`);
    }

    // Handle stamina restoration
    const staminaRestore = itemDef.stats?.staminaRestore || 0;
    if (staminaRestore > 0) {
      const oldStamina = character.currentStamina;
      character.currentStamina = Math.min(
        character.maxStamina,
        character.currentStamina + staminaRestore
      );
      result.staminaRestored = character.currentStamina - oldStamina;
      console.log(`[Inventory Service] Stamina restoration: ${oldStamina} -> ${character.currentStamina} (restored ${result.staminaRestored} Stamina)`);
    }

    // Save character changes
    console.log(`[Inventory Service] Saving character with updated health: ${character.currentHealth}/${character.maxHealth}, stamina: ${character.currentStamina}/${character.maxStamina}`);
    await character.save();
    
    // Reload character to ensure we have the latest data
    await character.reload();
    console.log(`[Inventory Service] Character reloaded - verified health: ${character.currentHealth}/${character.maxHealth}, stamina: ${character.currentStamina}/${character.maxStamina}`);

    // Remove one quantity of the item
    await this.removeItem(characterId, itemId, 1);

    // Track quest objectives for use_item type (e.g., tutorial_heal)
    try {
      await this.trackUseItemObjectives(characterId, itemId);
    } catch (error) {
      console.error('[Inventory Service] Failed to track use_item objectives:', error);
      // Don't fail item usage if quest tracking fails
    }

    return result;
  }

  /**
   * Track use_item objectives when items are used
   * @param {string} characterId - Character ID
   * @param {string} itemId - Item ID that was used
   */
  async trackUseItemObjectives(characterId, itemId) {
    const { QuestProgress, Quest } = require('../models');
    const questService = require('./questService');
    
    // Get all active quests for this character
    const activeQuests = await QuestProgress.findAll({
      where: {
        characterId,
        status: 'active'
      }
    });
    
    // Check each active quest for use_item objectives
    for (const questProgress of activeQuests) {
      const quest = await Quest.findByPk(questProgress.questId);
      if (!quest || !quest.objectives) continue;
      
      for (const objective of quest.objectives) {
        // Skip if already completed
        if (questProgress.isObjectiveComplete(objective.id)) {
          continue;
        }
        
        // Check if this is a use_item objective for this item
        if (objective.type === 'use_item' && objective.target === itemId) {
          // Mark objective as complete
          await questService.updateObjective(
            characterId,
            quest.id,
            objective.id,
            true,
            { itemId, usedAt: new Date().toISOString() }
          );
          
          console.log(`[Quest] Use item objective ${objective.id} completed (used ${itemId})`);
        }
      }
    }
  }

  /**
   * Get inventory with enriched item data (including rarity)
   */
  async getInventoryWithItemData(characterId, rarityFilter = null) {
    const inventory = await this.getInventory(characterId);
    
    // Enrich items with item data
    const enrichedItems = await Promise.all(
      inventory.items.map(async (invItem) => {
        try {
          const itemData = await this.getItemData(invItem.itemId);
          return {
            ...invItem,
            itemDefinition: itemData, // Store item definition separately for frontend
            ...itemData // Also spread for backward compatibility
          };
        } catch (e) {
          // If item not found, return basic data
          return {
            ...invItem,
            itemDefinition: {
              rarity: 'common',
              itemType: 'misc'
            },
            rarity: 'common',
            itemType: 'misc'
          };
        }
      })
    );
    
    // Filter by rarity if specified
    let filteredItems = enrichedItems;
    if (rarityFilter) {
      filteredItems = enrichedItems.filter(item => item.rarity === rarityFilter);
    }
    
    // Enrich equipped items
    const enrichedEquipped = await Promise.all(
      inventory.equipped.map(async (invItem) => {
        try {
          const itemData = await this.getItemData(invItem.itemId);
          return {
            ...invItem,
            itemDefinition: itemData, // Store item definition separately for frontend
            ...itemData // Also spread for backward compatibility
          };
        } catch (e) {
          return {
            ...invItem,
            itemDefinition: {
              rarity: 'common',
              itemType: 'misc'
            },
            rarity: 'common',
            itemType: 'misc'
          };
        }
      })
    );
    
    return {
      items: filteredItems,
      equipped: enrichedEquipped,
      setBonuses: inventory.setBonuses || {}
    };
  }
}

module.exports = new InventoryService();


