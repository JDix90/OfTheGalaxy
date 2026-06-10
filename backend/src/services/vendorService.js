/**
 * Vendor Service
 * Handles trading and vendor interactions
 */

const { NPC, PlayerCharacter, PlayerInventory } = require('../models');
const { getItemDefinition } = require('../data/items');
const npcService = require('./npcService');
const factionService = require('./factionService');

class VendorService {
  /**
   * Get vendor inventory
   * @param {string} npcId - NPC ID
   * @returns {Promise<Object>} Vendor inventory with enriched item data
   */
  async getVendorInventory(npcId) {
    const npc = await NPC.findByPk(npcId);
    
    if (!npc) {
      throw new Error('NPC not found');
    }
    
    // Check if this is a tutorial NPC that needs vendor inventory
    const isTutorialNPC = npcId && npcId.startsWith('npc_tutorial_');
    if (isTutorialNPC && (!npc.vendorInventory || !npc.vendorInventory.items || npc.vendorInventory.items.length === 0)) {
      // Ensure tutorial NPC has vendor inventory
      const defaultVendorInventory = {
        items: [
          { itemId: 'medpac_01', quantity: 10, price: 50 },
          { itemId: 'stimpack_01', quantity: 5, price: 75 }
        ],
        currency: 'credits'
      };
      
      await npc.update({
        vendorInventory: defaultVendorInventory,
        isVendor: true
      });
      await npc.reload();
      console.log(`[VendorService] Initialized vendor inventory for tutorial NPC ${npcId}`);
    }
    
    if (!npc.vendorInventory || !npc.vendorInventory.items) {
      throw new Error('NPC is not a vendor or has no inventory');
    }
    
    // Enrich vendor inventory with item definitions
    const enrichedItems = npc.vendorInventory.items.map(vendorItem => {
      const itemDef = getItemDefinition(vendorItem.itemId);
      return {
        ...vendorItem,
        itemDefinition: itemDef || {
          id: vendorItem.itemId,
          name: vendorItem.itemId,
          type: 'misc',
          value: 10,
          description: 'Unknown item'
        }
      };
    });
    
    return {
      vendorId: npcId,
      vendorName: npc.name,
      items: enrichedItems,
      currency: npc.vendorInventory.currency || 'credits'
    };
  }

  /**
   * Calculate buy price (what player pays to vendor)
   * @param {number} baseValue - Base item value
   * @param {Object} character - Character instance
   * @param {Object} npc - NPC instance
   * @param {Object} relationship - NPC relationship (optional)
   * @returns {number} Final price
   */
  calculatePrice(baseValue, character, npc, relationship = null) {
    let price = baseValue;
    
    // Charisma affects price (higher charisma = better prices, max 10% discount)
    const charisma = character.stats?.charisma || 10;
    const charismaBonus = Math.max(0, Math.min(0.1, ((charisma - 10) / 100) * 0.1));
    
    // Relationship affects price (better relationship = better prices, max 15% discount)
    let relationshipBonus = 0;
    if (relationship) {
      const relationshipLevel = relationship.relationshipLevel || 0;
      relationshipBonus = Math.max(0, Math.min(0.15, (relationshipLevel / 100) * 0.15));
    }
    
    // Faction reputation affects price (better reputation = better prices, max 10% discount)
    let factionBonus = 0;
    if (npc.factionId) {
      // We'll need to get faction reputation - for now, assume neutral
      // This will be enhanced when we integrate faction reputation
      factionBonus = 0; // Placeholder
    }
    
    // Apply discounts (stack multiplicatively)
    const totalDiscount = charismaBonus + relationshipBonus + factionBonus;
    price = price * (1 - totalDiscount);
    
    // Vendor markup (vendors sell at 120% of base value)
    price = price * 1.2;
    
    return Math.max(1, Math.floor(price));
  }

  /**
   * Calculate sell price (what vendor pays player)
   * @param {number} baseValue - Base item value
   * @param {Object} character - Character instance
   * @param {Object} npc - NPC instance
   * @param {Object} relationship - NPC relationship (optional)
   * @returns {number} Final price
   */
  calculateSellPrice(baseValue, character, npc, relationship = null) {
    let price = baseValue;
    
    // Charisma affects sell price (higher charisma = better prices, max 10% bonus)
    const charisma = character.stats?.charisma || 10;
    const charismaBonus = Math.max(0, Math.min(0.1, ((charisma - 10) / 100) * 0.1));
    
    // Relationship affects sell price (better relationship = better prices, max 15% bonus)
    let relationshipBonus = 0;
    if (relationship) {
      const relationshipLevel = relationship.relationshipLevel || 0;
      relationshipBonus = Math.max(0, Math.min(0.15, (relationshipLevel / 100) * 0.15));
    }
    
    // Faction reputation affects sell price
    let factionBonus = 0;
    if (npc.factionId) {
      // Placeholder for faction reputation integration
      factionBonus = 0;
    }
    
    // Vendor buy rate (vendors buy at 80% of base value)
    price = price * 0.8;
    
    // Apply bonuses (stack multiplicatively)
    const totalBonus = charismaBonus + relationshipBonus + factionBonus;
    price = price * (1 + totalBonus);
    
    return Math.max(1, Math.floor(price));
  }

  /**
   * Buy item from vendor
   * @param {string} characterId - Character UUID
   * @param {string} npcId - NPC ID
   * @param {string} itemId - Item ID
   * @param {number} quantity - Quantity to buy
   * @returns {Promise<Object>} Purchase result
   */
  async buyItem(characterId, npcId, itemId, quantity = 1) {
    const character = await PlayerCharacter.findByPk(characterId);
    if (!character) {
      throw new Error('Character not found');
    }
    
    const npc = await NPC.findByPk(npcId);
    if (!npc || !npc.vendorInventory || !npc.vendorInventory.items) {
      throw new Error('NPC is not a vendor');
    }
    
    const itemDef = getItemDefinition(itemId);
    if (!itemDef) {
      throw new Error('Item not found');
    }
    
    // Check faction requirement for item
    if (itemDef.factionId && itemDef.minReputationTier) {
      const { FactionReputation } = require('../models');
      const reputation = await FactionReputation.findOne({
        where: { characterId, factionId: itemDef.factionId }
      });
      
      if (!reputation) {
        throw new Error(`This item requires ${itemDef.minReputationTier} reputation with ${itemDef.factionId}. You have no reputation with this faction.`);
      }
      
      const tiers = ['neutral', 'friendly', 'trusted', 'allied', 'revered'];
      const currentIndex = tiers.indexOf(reputation.tier);
      const requiredIndex = tiers.indexOf(itemDef.minReputationTier);
      
      if (currentIndex === -1 || requiredIndex === -1 || currentIndex < requiredIndex) {
        throw new Error(`This item requires ${itemDef.minReputationTier} reputation with ${itemDef.factionId}. Your current reputation: ${reputation.tier}`);
      }
    }
    
    // Get NPC relationship for price calculation
    const { relationship } = await npcService.getNPCWithRelationship(npcId, characterId);
    
    // Calculate price
    const unitPrice = this.calculatePrice(itemDef.value, character, npc, relationship);
    const totalCost = unitPrice * quantity;
    
    // Check player has enough credits
    if (character.credits < totalCost) {
      throw new Error(`Insufficient credits. Need ${totalCost}, have ${character.credits}`);
    }
    
    // Check vendor has item
    const vendorItem = npc.vendorInventory.items.find(i => i.itemId === itemId);
    if (!vendorItem) {
      throw new Error('Vendor does not have this item');
    }
    
    // Check if item has unlimited stock (quantity: -1 or null)
    const isUnlimited = vendorItem.quantity === -1 || vendorItem.quantity === null;
    
    if (!isUnlimited && vendorItem.quantity < quantity) {
      throw new Error(`Vendor only has ${vendorItem.quantity} of this item`);
    }
    
    // Deduct credits
    character.credits -= totalCost;
    await character.save();
    
    // Add item to player inventory
    await PlayerInventory.addItem(characterId, itemId, quantity, `purchased from ${npc.name}`);
    
    // Update vendor inventory (only decrease quantity if not unlimited)
    if (!isUnlimited) {
      vendorItem.quantity -= quantity;
      if (vendorItem.quantity <= 0) {
        npc.vendorInventory.items = npc.vendorInventory.items.filter(i => i.itemId !== itemId);
      }
      await npc.save();
    }
    // If unlimited, don't update quantity - it stays at -1
    
    // Small relationship increase for successful trade
    if (relationship) {
      relationship.increaseRelationship(1);
      await relationship.save();
    }
    
    return {
      item: itemDef,
      quantity,
      unitPrice,
      totalCost,
      remainingCredits: character.credits
    };
  }

  /**
   * Sell item to vendor
   * @param {string} characterId - Character UUID
   * @param {string} npcId - NPC ID
   * @param {string} itemId - Item ID
   * @param {number} quantity - Quantity to sell
   * @returns {Promise<Object>} Sale result
   */
  async sellItem(characterId, npcId, itemId, quantity = 1) {
    const character = await PlayerCharacter.findByPk(characterId);
    if (!character) {
      throw new Error('Character not found');
    }
    
    const npc = await NPC.findByPk(npcId);
    if (!npc) {
      throw new Error('NPC not found');
    }
    
    // Check if NPC is a vendor (vendors can buy items even if they don't have vendorInventory)
    // For now, we'll allow selling to any NPC, but in the future we might restrict this
    
    const itemDef = getItemDefinition(itemId);
    // Use default value if item definition doesn't exist
    const itemValue = itemDef ? itemDef.value : 10;
    
    // Check player has item
    const playerItem = await PlayerInventory.findOne({
      where: {
        characterId,
        itemId,
        equipped: false
      }
    });
    
    if (!playerItem) {
      throw new Error('You do not have this item');
    }
    
    if (playerItem.quantity < quantity) {
      throw new Error(`You only have ${playerItem.quantity} of this item`);
    }
    
    // Get NPC relationship for price calculation
    const { relationship } = await npcService.getNPCWithRelationship(npcId, characterId);
    
    // Calculate sell price
    const unitPrice = this.calculateSellPrice(itemValue, character, npc, relationship);
    const totalValue = unitPrice * quantity;
    
    // Add credits
    character.credits += totalValue;
    await character.save();
    
    // Remove item from inventory
    await PlayerInventory.removeItem(characterId, itemId, quantity);
    
    // Add to vendor inventory (vendors can buy items)
    // Initialize vendorInventory if it doesn't exist
    if (!npc.vendorInventory) {
      npc.vendorInventory = {
        items: [],
        currency: 'credits'
      };
    }
    if (!npc.vendorInventory.items) {
      npc.vendorInventory.items = [];
    }
    
    const existingVendorItem = npc.vendorInventory.items.find(i => i.itemId === itemId);
    if (existingVendorItem) {
      existingVendorItem.quantity += quantity;
    } else {
      npc.vendorInventory.items.push({
        itemId,
        quantity
      });
    }
    await npc.save();
    
    // Small relationship increase for successful trade
    if (relationship) {
      relationship.increaseRelationship(1);
      await relationship.save();
    }
    
    // Track quest objectives for interact type (e.g., tutorial_vendor)
    try {
      const questService = require('./questService');
      const { QuestProgress, Quest } = require('../models');
      
      // Get all active quests for this character
      const activeQuests = await QuestProgress.findAll({
        where: {
          characterId,
          status: 'active'
        }
      });
      
      // Check each active quest for interact objectives
      for (const questProgress of activeQuests) {
        const quest = await Quest.findByPk(questProgress.questId);
        if (!quest || !quest.objectives) continue;
        
        for (const objective of quest.objectives) {
          // Skip if already completed
          if (questProgress.isObjectiveComplete(objective.id)) {
            continue;
          }
          
          // Check if this is an interact objective for vendor (tutorial_vendor)
          if (objective.type === 'interact' && 
              (objective.target === npcId || 
               objective.target === 'any_vendor' ||
               objective.id === 'tutorial_vendor')) {
            // Mark objective as complete
            await questService.updateObjective(
              characterId,
              quest.id,
              objective.id,
              true,
              { npcId, itemId, quantity, soldAt: new Date().toISOString() }
            );
            
            console.log(`[Quest] Interact objective ${objective.id} completed (sold ${itemId} to ${npcId})`);
          }
        }
      }
    } catch (error) {
      console.error('[Vendor Service] Failed to track interact objectives:', error);
      // Don't fail sale if quest tracking fails
    }
    
    return {
      item: itemDef || { id: itemId, name: itemId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), value: itemValue },
      quantity,
      unitPrice,
      totalValue,
      newCredits: character.credits
    };
  }

  /**
   * Get price quote for buying an item (without actually buying)
   * @param {string} characterId - Character UUID
   * @param {string} npcId - NPC ID
   * @param {string} itemId - Item ID
   * @param {number} quantity - Quantity
   * @returns {Promise<Object>} Price quote
   */
  async getBuyPrice(characterId, npcId, itemId, quantity = 1) {
    const character = await PlayerCharacter.findByPk(characterId);
    if (!character) {
      throw new Error('Character not found');
    }
    
    const npc = await NPC.findByPk(npcId);
    if (!npc || !npc.vendorInventory) {
      throw new Error('NPC is not a vendor');
    }
    
    const itemDef = getItemDefinition(itemId);
    if (!itemDef) {
      throw new Error('Item not found');
    }
    
    const { relationship } = await npcService.getNPCWithRelationship(npcId, characterId);
    const unitPrice = this.calculatePrice(itemDef.value, character, npc, relationship);
    const totalCost = unitPrice * quantity;
    
    return {
      itemId,
      itemName: itemDef.name,
      quantity,
      unitPrice,
      totalCost,
      canAfford: character.credits >= totalCost
    };
  }

  /**
   * Get price quote for selling an item (without actually selling)
   * @param {string} characterId - Character UUID
   * @param {string} npcId - NPC ID
   * @param {string} itemId - Item ID
   * @param {number} quantity - Quantity
   * @returns {Promise<Object>} Price quote
   */
  async getSellPrice(characterId, npcId, itemId, quantity = 1) {
    const character = await PlayerCharacter.findByPk(characterId);
    if (!character) {
      throw new Error('Character not found');
    }
    
    const npc = await NPC.findByPk(npcId);
    if (!npc) {
      throw new Error('NPC not found');
    }
    
    // Check if NPC is a vendor (vendors can buy items even if they don't have vendorInventory)
    // For now, we'll allow selling to any NPC, but in the future we might restrict this
    
    const itemDef = getItemDefinition(itemId);
    if (!itemDef) {
      // If item definition doesn't exist, use a default value
      // This handles items that were added to inventory before item definitions existed
      const defaultValue = 10; // Default value for unknown items
      const { relationship } = await npcService.getNPCWithRelationship(npcId, characterId);
      const unitPrice = this.calculateSellPrice(defaultValue, character, npc, relationship);
      const totalValue = unitPrice * quantity;
      
      return {
        itemId,
        itemName: itemId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        quantity,
        unitPrice,
        totalValue
      };
    }
    
    const { relationship } = await npcService.getNPCWithRelationship(npcId, characterId);
    const unitPrice = this.calculateSellPrice(itemDef.value, character, npc, relationship);
    const totalValue = unitPrice * quantity;
    
    return {
      itemId,
      itemName: itemDef.name,
      quantity,
      unitPrice,
      totalValue
    };
  }
}

module.exports = new VendorService();

