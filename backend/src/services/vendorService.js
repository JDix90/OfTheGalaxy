/**
 * Vendor Service
 * Handles trading and vendor interactions
 */

const { NPC, PlayerCharacter, PlayerInventory } = require('../models');
const { getItemDefinition } = require('../data/items');
const npcService = require('./npcService');
const factionService = require('./factionService');

class VendorService {
  // Vendors sell at this multiple of an item's base value. This is the "sticker
  // price" shown in the vendor list; per-character discounts (charisma /
  // relationship / faction) are applied at checkout and only ever REDUCE it, so
  // the player never pays more than the listed price.
  static MARKUP = 1.2;

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
      const baseValue = (itemDef && itemDef.value) || vendorItem.price || 10;
      return {
        ...vendorItem,
        // Sticker price shown in the list — matches what checkout charges before
        // any personal discount, so the listed price is never undercut by a
        // surprise markup at purchase time.
        buyPrice: Math.max(1, Math.floor(baseValue * VendorService.MARKUP)),
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
  calculatePrice(baseValue, character, npc, relationship = null, factionRep = null) {
    return this.calculateBuyBreakdown(baseValue, character, npc, relationship, factionRep).unitPrice;
  }

  /**
   * Buy price with an itemized breakdown of every modifier, for transparent
   * "Base 300 · Faction −6% · Rep −5% = 268" display.
   * @returns {{ unitPrice: number, breakdown: Object }}
   */
  calculateBuyBreakdown(baseValue, character, npc, relationship = null, factionRep = null) {
    // Charisma affects price (higher charisma = better prices, max 10% discount)
    const charisma = character.stats?.charisma || 10;
    // +0.5% per point of charisma above the base of 10, capped at 10% (reached
    // at charisma 30 — a clear charisma-focused investment). Mirrors the
    // relationship lever, which ramps to its cap at the top of its range.
    const charismaPct = Math.max(0, Math.min(0.1, ((charisma - 10) / 100) * 0.5));

    // Relationship affects price (better relationship = better prices, max 15% discount)
    let relationshipPct = 0;
    if (relationship) {
      const relationshipLevel = relationship.relationshipLevel || 0;
      relationshipPct = Math.max(0, Math.min(0.15, (relationshipLevel / 100) * 0.15));
    }

    // Faction standing affects price. Signed: friendly/honored/exalted discount,
    // unfriendly/hostile/hated add a surcharge (can push above the sticker price).
    let factionPct = 0;
    if (npc.factionId && factionRep) {
      factionPct = factionService.getPriceModifier(factionRep.tier);
    }

    // Discounts/surcharges stack additively, then the vendor markup is applied.
    const totalDiscount = charismaPct + relationshipPct + factionPct;
    const unitPrice = Math.max(1, Math.floor(baseValue * (1 - totalDiscount) * VendorService.MARKUP));

    return {
      unitPrice,
      breakdown: {
        base: baseValue,
        markupPct: VendorService.MARKUP - 1, // +0.2 sticker markup
        charismaPct,
        relationshipPct,
        factionPct, // signed
        factionTier: (npc.factionId && factionRep) ? factionRep.tier : null,
        factionId: npc.factionId || null,
        unitPrice
      }
    };
  }

  /**
   * Calculate sell price (what vendor pays player)
   * @param {number} baseValue - Base item value
   * @param {Object} character - Character instance
   * @param {Object} npc - NPC instance
   * @param {Object} relationship - NPC relationship (optional)
   * @param {Object} factionRep - Faction reputation record (optional)
   * @returns {number} Final price
   */
  calculateSellPrice(baseValue, character, npc, relationship = null, factionRep = null) {
    return this.calculateSellBreakdown(baseValue, character, npc, relationship, factionRep).unitPrice;
  }

  /**
   * Sell price with an itemized breakdown of every modifier.
   * @returns {{ unitPrice: number, breakdown: Object }}
   */
  calculateSellBreakdown(baseValue, character, npc, relationship = null, factionRep = null) {
    // Charisma affects sell price (higher charisma = better prices, max 10% bonus)
    const charisma = character.stats?.charisma || 10;
    // +0.5% per point of charisma above the base of 10, capped at 10% (reached
    // at charisma 30 — a clear charisma-focused investment). Mirrors the
    // relationship lever, which ramps to its cap at the top of its range.
    const charismaPct = Math.max(0, Math.min(0.1, ((charisma - 10) / 100) * 0.5));

    // Relationship affects sell price (better relationship = better prices, max 15% bonus)
    let relationshipPct = 0;
    if (relationship) {
      const relationshipLevel = relationship.relationshipLevel || 0;
      relationshipPct = Math.max(0, Math.min(0.15, (relationshipLevel / 100) * 0.15));
    }

    // Faction standing affects sell price (signed; hostile factions pay less).
    let factionPct = 0;
    if (npc.factionId && factionRep) {
      factionPct = factionService.getPriceModifier(factionRep.tier);
    }

    // Vendors buy at 80% of base value, then standing/charisma adjust it.
    const sellRate = 0.8;
    const totalBonus = charismaPct + relationshipPct + factionPct;
    const unitPrice = Math.max(1, Math.floor(baseValue * sellRate * (1 + totalBonus)));

    return {
      unitPrice,
      breakdown: {
        base: baseValue,
        sellRate,
        charismaPct,
        relationshipPct,
        factionPct, // signed
        factionTier: (npc.factionId && factionRep) ? factionRep.tier : null,
        factionId: npc.factionId || null,
        unitPrice
      }
    };
  }

  /**
   * Fetch the player's reputation record with an NPC's faction, or null when the
   * NPC is unaligned. Never throws — pricing degrades gracefully to no faction
   * modifier.
   * @param {string} characterId
   * @param {Object} npc
   * @returns {Promise<Object|null>}
   */
  async getFactionRepForNpc(characterId, npc) {
    if (!npc || !npc.factionId) return null;
    try {
      return await factionService.getReputation(characterId, npc.factionId);
    } catch (err) {
      console.warn(`[VendorService] Failed to load faction rep for ${npc.factionId}:`, err.message);
      return null;
    }
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
    
    // Check faction requirement for item — compare against the canonical tier
    // ladder (factionService.meetsTier), not an ad-hoc list.
    if (itemDef.factionId && itemDef.minReputationTier) {
      const reputation = await factionService.getReputation(characterId, itemDef.factionId);

      if (!factionService.meetsTier(reputation.tier, itemDef.minReputationTier)) {
        const factionName = factionService.getFactionProfile(itemDef.factionId)?.name || itemDef.factionId;
        throw new Error(`This item requires ${itemDef.minReputationTier} reputation with ${factionName}. Your current standing: ${reputation.tier}.`);
      }
    }

    // Get NPC relationship + faction standing for price calculation
    const { relationship } = await npcService.getNPCWithRelationship(npcId, characterId);
    const factionRep = await this.getFactionRepForNpc(characterId, npc);

    // Calculate price
    const unitPrice = this.calculatePrice(itemDef.value, character, npc, relationship, factionRep);
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
    
    // Get NPC relationship + faction standing for price calculation
    const { relationship } = await npcService.getNPCWithRelationship(npcId, characterId);
    const factionRep = await this.getFactionRepForNpc(characterId, npc);

    // Calculate sell price
    const unitPrice = this.calculateSellPrice(itemValue, character, npc, relationship, factionRep);
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
    const factionRep = await this.getFactionRepForNpc(characterId, npc);
    const { unitPrice, breakdown } = this.calculateBuyBreakdown(itemDef.value, character, npc, relationship, factionRep);
    const totalCost = unitPrice * quantity;

    return {
      itemId,
      itemName: itemDef.name,
      quantity,
      unitPrice,
      totalCost,
      canAfford: character.credits >= totalCost,
      breakdown
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
      const factionRep = await this.getFactionRepForNpc(characterId, npc);
      const { unitPrice, breakdown } = this.calculateSellBreakdown(defaultValue, character, npc, relationship, factionRep);
      const totalValue = unitPrice * quantity;

      return {
        itemId,
        itemName: itemId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        quantity,
        unitPrice,
        totalValue,
        breakdown
      };
    }

    const { relationship } = await npcService.getNPCWithRelationship(npcId, characterId);
    const factionRep = await this.getFactionRepForNpc(characterId, npc);
    const { unitPrice, breakdown } = this.calculateSellBreakdown(itemDef.value, character, npc, relationship, factionRep);
    const totalValue = unitPrice * quantity;

    return {
      itemId,
      itemName: itemDef.name,
      quantity,
      unitPrice,
      totalValue,
      breakdown
    };
  }
}

module.exports = new VendorService();

