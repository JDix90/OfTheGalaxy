/**
 * Tool Service
 * Handles tool bonuses for actions
 */

const { PlayerInventory } = require('../models');
const { getItemDefinition } = require('../data/items');

class ToolService {
  /**
   * Get equipped tool for a character
   * @param {string} characterId - Character UUID
   * @returns {Promise<Object|null>} Equipped tool or null
   */
  async getEquippedTool(characterId) {
    const inventory = await PlayerInventory.findEquipped(characterId);
    const tool = inventory.find(item => item.equipmentSlot === 'tool');
    
    if (!tool) {
      return null;
    }
    
    // Enrich with item definition
    const itemDef = getItemDefinition(tool.itemId);
    if (!itemDef) {
      return null;
    }
    
    return {
      ...tool.toJSON(),
      itemDefinition: itemDef
    };
  }
  
  /**
   * Get tool bonus for a specific action type
   * @param {string} characterId - Character UUID
   * @param {string} actionType - Action type (repair, hacking, medical, archaeology, mining, crafting)
   * @returns {Promise<number>} Tool bonus value
   */
  async getToolBonus(characterId, actionType) {
    const tool = await this.getEquippedTool(characterId);
    
    if (!tool || !tool.itemDefinition) {
      return 0;
    }
    
    const stats = tool.itemDefinition.stats || {};
    
    // Map action types to stat names
    const statMap = {
      repair: 'repair',
      hacking: 'hacking',
      medical: 'medical',
      archaeology: 'archaeology',
      mining: 'mining',
      crafting: 'crafting'
    };
    
    const statName = statMap[actionType];
    if (!statName) {
      return 0;
    }
    
    return stats[statName] || 0;
  }
  
  /**
   * Get all tool bonuses for a character
   * @param {string} characterId - Character UUID
   * @returns {Promise<Object>} Object with all tool bonuses
   */
  async getAllToolBonuses(characterId) {
    const tool = await this.getEquippedTool(characterId);
    
    if (!tool || !tool.itemDefinition) {
      return {
        repair: 0,
        hacking: 0,
        medical: 0,
        archaeology: 0,
        mining: 0,
        crafting: 0
      };
    }
    
    const stats = tool.itemDefinition.stats || {};
    
    return {
      repair: stats.repair || 0,
      hacking: stats.hacking || 0,
      medical: stats.medical || 0,
      archaeology: stats.archaeology || 0,
      mining: stats.mining || 0,
      crafting: stats.crafting || 0
    };
  }
  
  /**
   * Check if character has required tool for action
   * @param {string} characterId - Character UUID
   * @param {string} actionType - Action type
   * @returns {Promise<boolean>} True if tool is equipped
   */
  async hasRequiredTool(characterId, actionType) {
    const bonus = await this.getToolBonus(characterId, actionType);
    return bonus > 0;
  }
}

module.exports = new ToolService();


