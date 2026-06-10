/**
 * Crafting API Service
 * API calls for crafting system
 */

import { apiClient } from './client';

export const craftingApi = {
  /**
   * Get available recipes for a character
   */
  getRecipes: async (characterId) => {
    return await apiClient.get(`/crafting/${characterId}/recipes`);
  },

  /**
   * Get recipe details
   */
  getRecipeDetails: async (recipeId) => {
    return await apiClient.get(`/crafting/recipes/${recipeId}`);
  },

  /**
   * Check if character can craft a recipe
   */
  canCraft: async (characterId, recipeId) => {
    return await apiClient.get(`/crafting/${characterId}/can-craft/${recipeId}`);
  },

  /**
   * Craft an item
   */
  craftItem: async (characterId, recipeId, quantity = 1) => {
    return await apiClient.post(`/crafting/${characterId}/craft/${recipeId}`, {
      quantity
    });
  }
};


