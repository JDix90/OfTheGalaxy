/**
 * Crafting Service
 * Handles item crafting logic
 */

const { PlayerCharacter, PlayerInventory } = require('../models');
const { getRecipe, getAvailableRecipes } = require('../data/craftingRecipes');
const inventoryService = require('./inventoryService');
const { getItemDefinition } = require('../data/items');
const { ProgressionSystem } = require('../utils/progressionSystem');
const { getSkillDefinition } = require('../data/skills');

class CraftingService {
  /**
   * Check if character can craft a recipe
   * @param {string} characterId - Character UUID
   * @param {string} recipeId - Recipe ID
   * @returns {Promise<Object>} Validation result
   */
  async canCraft(characterId, recipeId) {
    const character = await PlayerCharacter.findByPk(characterId);
    if (!character) {
      throw new Error('Character not found');
    }

    const recipe = getRecipe(recipeId);
    if (!recipe) {
      throw new Error('Recipe not found');
    }

    // Check level requirement
    if (recipe.unlockLevel && character.level < recipe.unlockLevel) {
      return {
        canCraft: false,
        reason: `Requires level ${recipe.unlockLevel}`
      };
    }

    // Check skill requirement
    if (recipe.skillRequirement) {
      const { tree, skillId, level } = recipe.skillRequirement;
      const skills = character.skills || {};
      const treeSkills = skills[tree] || {};
      const skill = treeSkills[skillId];
      
      if (!skill || skill.level < level) {
        // Show the skill's natural-language name ("Advanced Weapons") instead of
        // the raw "advanced_weapons" / "combat" ids in the requirement message.
        const skillName = getSkillDefinition(tree, skillId)?.name
          || skillId.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
        const treeName = tree.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
        return {
          canCraft: false,
          reason: `Requires ${skillName} level ${level} in the ${treeName} tree`
        };
      }
    }

    // Check materials
    const inventory = await inventoryService.getInventory(characterId);
    const missingMaterials = [];
    
    for (const [materialId, requiredQuantity] of Object.entries(recipe.materials)) {
      const inventoryItem = inventory.items.find(item => item.itemId === materialId);
      const availableQuantity = inventoryItem ? inventoryItem.quantity : 0;
      
      if (availableQuantity < requiredQuantity) {
        missingMaterials.push({
          itemId: materialId,
          required: requiredQuantity,
          available: availableQuantity
        });
      }
    }

    if (missingMaterials.length > 0) {
      return {
        canCraft: false,
        reason: 'Missing required materials',
        missingMaterials
      };
    }

    return {
      canCraft: true,
      recipe: recipe
    };
  }

  /**
   * Calculate crafting success chance and bonuses
   * @param {string} characterId - Character UUID
   * @param {string} recipeId - Recipe ID
   * @returns {Promise<Object>} Crafting bonuses
   */
  async calculateCraftingBonuses(characterId, recipeId) {
    const character = await PlayerCharacter.findByPk(characterId);
    if (!character) {
      throw new Error('Character not found');
    }

    const { calculateCraftingSuccess, calculateMaterialCostReduction, calculateQualityBonus } = require('../utils/abilityScaling');
    // Equipped gear can grant engineering/crafting + intelligence (e.g. an engineer's accessory).
    const equipBonuses = await require('./toolService').getEquipmentBonuses(characterId);
    const progressionSystem = new ProgressionSystem(character, equipBonuses.skills);

    // Get engineering skill level
    const engineeringLevel = progressionSystem.getSkillLevel('technical', 'engineering');

    // Get intelligence
    const intelligence = (character.stats.intelligence || 10) + (equipBonuses.attributes.intelligence || 0);
    
    // Get tool bonus from equipped crafting tool
    let toolBonus = 0;
    try {
      const toolService = require('./toolService');
      toolBonus = await toolService.getToolBonus(characterId, 'crafting');
    } catch (error) {
      console.debug('[Crafting Service] Could not retrieve tool bonus:', error.message);
    }
    
    // Get recipe difficulty (if available)
    const recipe = getRecipe(recipeId);
    const recipeDifficulty = recipe?.difficulty || 0; // 0 = normal, 0.1 = hard, 0.2 = very hard, etc.
    
    // Base success chance (as decimal)
    const baseSuccess = 0.50; // 50%
    
    // Calculate success with piecewise scaling (including tool bonus)
    const successChance = calculateCraftingSuccess(
      baseSuccess,
      intelligence,
      engineeringLevel,
      recipeDifficulty,
      toolBonus
    );
    
    // Convert to percentage for return value
    const successChancePercent = successChance * 100;
    
    // Calculate material cost reduction
    const materialCostMultiplier = calculateMaterialCostReduction(engineeringLevel, intelligence);
    const materialCostReduction = 1 - materialCostMultiplier; // Convert to reduction percentage
    
    // Calculate quality bonus (including tool bonus)
    const qualityMultiplier = calculateQualityBonus(engineeringLevel, intelligence, toolBonus);
    const qualityBonus = (qualityMultiplier - 1) * 100; // Convert to bonus percentage
    
    return {
      successChance: successChancePercent,
      successChanceDecimal: successChance, // Store as decimal for success checks
      materialCostReduction,
      materialCostMultiplier, // Store multiplier for actual cost calculation
      qualityBonus,
      qualityMultiplier, // Store multiplier for quality calculation
      toolBonus, // Include tool bonus in return
      engineeringLevel
    };
  }

  /**
   * Craft an item from a recipe
   * @param {string} characterId - Character UUID
   * @param {string} recipeId - Recipe ID
   * @param {number} quantity - Quantity to craft (default: 1)
   * @returns {Promise<Object>} Crafting result
   */
  async craftItem(characterId, recipeId, quantity = 1) {
    // Validate crafting
    const validation = await this.canCraft(characterId, recipeId);
    if (!validation.canCraft) {
      throw new Error(validation.reason);
    }

    const recipe = validation.recipe;
    const character = await PlayerCharacter.findByPk(characterId);

    // Get crafting bonuses
    const bonuses = await this.calculateCraftingBonuses(characterId, recipeId);
    
    // Stamina cost based on recipe difficulty
    const staminaCost = 10 + ((recipe.difficulty || 0) * 5); // 10 base + 5 per difficulty
    const totalStaminaCost = staminaCost * quantity;
    
    // Check stamina
    if (character.currentStamina < totalStaminaCost) {
      throw new Error(`Not enough stamina. Need ${totalStaminaCost}, have ${character.currentStamina}`);
    }
    
    // Deduct stamina
    character.currentStamina = Math.max(0, character.currentStamina - totalStaminaCost);
    await character.save();
    
    // Use success check system
    const { attemptCraft } = require('../utils/successChecks');
    const craftResult = attemptCraft(bonuses.successChanceDecimal, recipe.difficulty || 0);
    
    if (!craftResult.success) {
      // Crafting failed - still consume materials (or partial materials based on design)
      // For now, we'll consume full materials even on failure (can be adjusted)
      const materialsToConsume = {};
      for (const [materialId, requiredQuantity] of Object.entries(recipe.materials)) {
        const baseRequired = requiredQuantity * quantity;
        const reducedRequired = Math.max(1, Math.floor(baseRequired * bonuses.materialCostMultiplier));
        materialsToConsume[materialId] = reducedRequired;
      }
      
      // Consume materials even on failure
      for (const [materialId, requiredQuantity] of Object.entries(materialsToConsume)) {
        await inventoryService.removeItem(characterId, materialId, requiredQuantity);
      }
      
      return {
        success: false,
        recipe: recipeId,
        recipeName: recipe.name,
        chance: craftResult.chance,
        message: `Crafting failed! (${Math.round(craftResult.chance * 100)}% chance)`,
        staminaCost: totalStaminaCost,
        remainingStamina: character.currentStamina
      };
    }

    // Apply material cost reduction using multiplier
    const materialsToConsume = {};
    for (const [materialId, requiredQuantity] of Object.entries(recipe.materials)) {
      const baseRequired = requiredQuantity * quantity;
      const reducedRequired = Math.max(1, Math.floor(baseRequired * bonuses.materialCostMultiplier));
      materialsToConsume[materialId] = reducedRequired;
    }

    // Consume materials (with cost reduction applied)
    for (const [materialId, requiredQuantity] of Object.entries(materialsToConsume)) {
      await inventoryService.removeItem(characterId, materialId, requiredQuantity);
    }

    // Add crafted item(s)
    const resultItemId = recipe.result.itemId;
    const resultQuantity = recipe.result.quantity * quantity;
    
    for (let i = 0; i < resultQuantity; i++) {
      await inventoryService.addItem(characterId, resultItemId, 1, 'crafted');
    }

    // Get item definition for display
    const itemDef = getItemDefinition(resultItemId);

    return {
      success: true,
      recipe: recipeId,
      recipeName: recipe.name,
      itemId: resultItemId,
      itemName: itemDef?.name || resultItemId,
      quantity: resultQuantity,
      message: `Successfully crafted ${resultQuantity}x ${itemDef?.name || resultItemId}!`,
      staminaCost: totalStaminaCost,
      remainingStamina: character.currentStamina
    };
  }

  /**
   * Get available recipes for a character
   * @param {string} characterId - Character UUID
   * @returns {Promise<Array>} Array of available recipes
   */
  async getAvailableRecipes(characterId) {
    const character = await PlayerCharacter.findByPk(characterId);
    if (!character) {
      throw new Error('Character not found');
    }

    const availableRecipes = getAvailableRecipes(character);
    
    // Check which recipes the character has materials for
    const inventory = await inventoryService.getInventory(characterId);
    const recipesWithMaterials = [];

    for (const recipe of availableRecipes) {
      const canCraft = await this.canCraft(characterId, recipe.id);
      recipesWithMaterials.push({
        ...recipe,
        canCraft: canCraft.canCraft,
        missingMaterials: canCraft.missingMaterials || []
      });
    }

    return recipesWithMaterials;
  }

  /**
   * Get recipe details
   * @param {string} recipeId - Recipe ID
   * @returns {Object|null} Recipe definition
   */
  getRecipeDetails(recipeId) {
    return getRecipe(recipeId);
  }
}

module.exports = new CraftingService();


