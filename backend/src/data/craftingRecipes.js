/**
 * Crafting Recipes
 * Defines all crafting recipes for weapons, armor, consumables, and tools
 */

const RECIPE_CATEGORIES = {
  WEAPON: 'weapon',
  ARMOR: 'armor',
  CONSUMABLE: 'consumable',
  TOOL: 'tool',
  ACCESSORY: 'accessory'
};

/**
 * Crafting Recipe Definitions
 * Each recipe has:
 * - id: Unique recipe identifier
 * - name: Display name
 * - description: Recipe description
 * - category: Recipe category
 * - result: Item ID and quantity produced
 * - materials: Required materials (itemId: quantity)
 * - skillRequirement: Optional skill requirement (tree: skillId: level)
 * - craftingTime: Time to craft in seconds (optional)
 * - unlockLevel: Character level required to unlock (optional)
 */
const CRAFTING_RECIPES = {
  // Starter Recipes (No skill requirements)
  basic_medpac: {
    id: 'basic_medpac',
    name: 'Basic Medpac',
    description: 'Craft a basic medpac from common materials.',
    category: RECIPE_CATEGORIES.CONSUMABLE,
    result: {
      itemId: 'medpac_01',
      quantity: 1
    },
    materials: {
      'scrap_metal_01': 2,
      'energy_cell_01': 1
    }
    // No skill requirement - available to all players
  },
  basic_stimpack: {
    id: 'basic_stimpack',
    name: 'Basic Stimpack',
    description: 'Craft a basic stimpack for stamina restoration.',
    category: RECIPE_CATEGORIES.CONSUMABLE,
    result: {
      itemId: 'stimpack_01',
      quantity: 1
    },
    materials: {
      'energy_cell_01': 2
    }
    // No skill requirement - available to all players
  },
  basic_repair_kit: {
    id: 'basic_repair_kit',
    name: 'Basic Repair Kit',
    description: 'Craft a basic repair toolkit.',
    category: RECIPE_CATEGORIES.TOOL,
    result: {
      itemId: 'repair_toolkit',
      quantity: 1
    },
    materials: {
      'scrap_metal_01': 3,
      'energy_cell_01': 1
    }
    // No skill requirement - available to all players
  },

  // Weapon Crafting
  arcblade_basic: {
    id: 'arcblade_basic',
    name: 'Basic Arcblade',
    description: 'Craft a basic arcblade using a crystal and materials.',
    category: RECIPE_CATEGORIES.WEAPON,
    result: {
      itemId: 'arcblade_01',
      quantity: 1
    },
    materials: {
      'arcblade_crystal': 1,
      'dantari_crystals': 3,
      'scrap_metal_01': 5,
      'energy_cell_01': 2
    },
    skillRequirement: {
      tree: 'technical',
      skillId: 'engineering',
      level: 3
    },
    unlockLevel: 5
  },
  pulser_custom: {
    id: 'pulser_custom',
    name: 'Custom Pulser Pistol',
    description: 'Craft a custom pulser pistol with enhanced components.',
    category: RECIPE_CATEGORIES.WEAPON,
    result: {
      itemId: 'pulser_pistol_01',
      quantity: 1
    },
    materials: {
      'pulser_pistol_01': 1, // Base item
      'energy_cell_01': 3,
      'scrap_metal_01': 2
    },
    skillRequirement: {
      tree: 'technical',
      skillId: 'engineering',
      level: 2
    }
  },
  pulser_rifle_enhanced: {
    id: 'pulser_rifle_enhanced',
    name: 'Enhanced Pulser Rifle',
    description: 'Enhance a pulser rifle with better components.',
    category: RECIPE_CATEGORIES.WEAPON,
    result: {
      itemId: 'pulser_rifle_01',
      quantity: 1
    },
    materials: {
      'pulser_rifle_01': 1,
      'energy_cell_01': 5,
      'scrap_metal_01': 3
    },
    skillRequirement: {
      tree: 'technical',
      skillId: 'weapon_crafting',
      level: 3
    }
  },

  // Armor Crafting
  armor_heavy_crafted: {
    id: 'armor_heavy_crafted',
    name: 'Crafted Heavy Armor',
    description: 'Craft heavy armor from scrap metal and energy cells.',
    category: RECIPE_CATEGORIES.ARMOR,
    result: {
      itemId: 'armor_heavy_01',
      quantity: 1
    },
    materials: {
      'scrap_metal_01': 10,
      'energy_cell_01': 2
    },
    skillRequirement: {
      tree: 'technical',
      skillId: 'engineering',
      level: 4
    },
    unlockLevel: 8
  },
  armor_medium_crafted: {
    id: 'armor_medium_crafted',
    name: 'Crafted Medium Armor',
    description: 'Craft medium armor from scrap metal.',
    category: RECIPE_CATEGORIES.ARMOR,
    result: {
      itemId: 'armor_medium_01',
      quantity: 1
    },
    materials: {
      'scrap_metal_01': 7,
      'energy_cell_01': 1
    },
    skillRequirement: {
      tree: 'technical',
      skillId: 'engineering',
      level: 2
    }
  },
  armor_beskar: {
    id: 'armor_beskar',
    name: 'Beskar Armor',
    description: 'Craft Ironkin armor from beskar ingots.',
    category: RECIPE_CATEGORIES.ARMOR,
    result: {
      itemId: 'armor_heavy_beskar',
      quantity: 1
    },
    materials: {
      'beskar_ingot': 5,
      'scrap_metal_01': 3,
      'energy_cell_01': 2
    },
    skillRequirement: {
      tree: 'technical',
      skillId: 'engineering',
      level: 5
    },
    unlockLevel: 15
  },

  // Consumable Crafting
  medpac_advanced: {
    id: 'medpac_advanced',
    name: 'Advanced Medpac',
    description: 'Craft an advanced medpac with enhanced healing properties.',
    category: RECIPE_CATEGORIES.CONSUMABLE,
    result: {
      itemId: 'medpac_01',
      quantity: 1
    },
    materials: {
      'medpac_01': 2,
      'energy_cell_01': 1
    },
    skillRequirement: {
      tree: 'survival',
      skillId: 'field_medic',
      level: 2
    }
  },
  survival_kit: {
    id: 'survival_kit',
    name: 'Survival Kit',
    description: 'Craft a survival kit with medpac, stimpack, and rations.',
    category: RECIPE_CATEGORIES.CONSUMABLE,
    result: {
      itemId: 'medpac_01', // Using medpac as placeholder for survival kit
      quantity: 1
    },
    materials: {
      'medpac_01': 1,
      'stimpack_01': 1,
      'ration_01': 1
    },
    skillRequirement: {
      tree: 'survival',
      skillId: 'basic_survival',
      level: 3
    }
  },
  stimpack_enhanced: {
    id: 'stimpack_enhanced',
    name: 'Enhanced Stimpack',
    description: 'Craft an enhanced stimpack for better stamina restoration.',
    category: RECIPE_CATEGORIES.CONSUMABLE,
    result: {
      itemId: 'stimpack_01',
      quantity: 1
    },
    materials: {
      'stimpack_01': 2,
      'energy_cell_01': 1
    },
    skillRequirement: {
      tree: 'survival',
      skillId: 'field_medic',
      level: 1
    }
  },

  // Tool Crafting
  toolkit_advanced: {
    id: 'toolkit_advanced',
    name: 'Advanced Toolkit',
    description: 'Craft an advanced repair toolkit with better components.',
    category: RECIPE_CATEGORIES.TOOL,
    result: {
      itemId: 'repair_toolkit',
      quantity: 1
    },
    materials: {
      'repair_toolkit': 1,
      'scrap_metal_01': 3,
      'energy_cell_01': 2
    },
    skillRequirement: {
      tree: 'technical',
      skillId: 'engineering',
      level: 2
    }
  },
  slicer_toolkit: {
    id: 'slicer_toolkit',
    name: 'Slicer Toolkit',
    description: 'Craft a toolkit for hacking and slicing computer systems.',
    category: RECIPE_CATEGORIES.TOOL,
    result: {
      itemId: 'slicer_toolkit',
      quantity: 1
    },
    materials: {
      'energy_cell_01': 2,
      'scrap_metal_01': 2
    },
    skillRequirement: {
      tree: 'technical',
      skillId: 'hacking',
      level: 2
    }
  },
  medical_scanner: {
    id: 'medical_scanner',
    name: 'Medical Scanner',
    description: 'Craft a medical scanner for advanced diagnostics.',
    category: RECIPE_CATEGORIES.TOOL,
    result: {
      itemId: 'medical_scanner',
      quantity: 1
    },
    materials: {
      'energy_cell_01': 3,
      'scrap_metal_01': 2
    },
    skillRequirement: {
      tree: 'survival',
      skillId: 'field_medic',
      level: 3
    }
  },

  // Accessory Crafting
  datapad_advanced: {
    id: 'datapad_advanced',
    name: 'Advanced Datapad',
    description: 'Craft an advanced datapad with improved processing.',
    category: RECIPE_CATEGORIES.ACCESSORY,
    result: {
      itemId: 'datapad_01',
      quantity: 1
    },
    materials: {
      'datapad_01': 1,
      'energy_cell_01': 2,
      'scrap_metal_01': 1
    },
    skillRequirement: {
      tree: 'technical',
      skillId: 'basic_tech',
      level: 2
    }
  },
  comlink_enhanced: {
    id: 'comlink_enhanced',
    name: 'Enhanced Comlink',
    description: 'Craft an enhanced comlink with better range.',
    category: RECIPE_CATEGORIES.ACCESSORY,
    result: {
      itemId: 'comlink_01',
      quantity: 1
    },
    materials: {
      'comlink_01': 1,
      'energy_cell_01': 2
    },
    skillRequirement: {
      tree: 'technical',
      skillId: 'basic_tech',
      level: 1
    }
  }
};

/**
 * Get recipe by ID
 * @param {string} recipeId - Recipe ID
 * @returns {Object|null} Recipe definition
 */
function getRecipe(recipeId) {
  return CRAFTING_RECIPES[recipeId] || null;
}

/**
 * Get all recipes
 * @returns {Object} All recipe definitions
 */
function getAllRecipes() {
  return CRAFTING_RECIPES;
}

/**
 * Get recipes by category
 * @param {string} category - Recipe category
 * @returns {Array} Array of recipes in category
 */
function getRecipesByCategory(category) {
  return Object.values(CRAFTING_RECIPES).filter(recipe => recipe.category === category);
}

/**
 * Get available recipes for a character
 * @param {Object} character - Character object
 * @returns {Array} Array of available recipes
 */
function getAvailableRecipes(character) {
  const available = [];
  
  for (const recipe of Object.values(CRAFTING_RECIPES)) {
    // Check level requirement
    if (recipe.unlockLevel && character.level < recipe.unlockLevel) {
      continue;
    }
    
    // Check skill requirement
    if (recipe.skillRequirement) {
      const { tree, skillId, level } = recipe.skillRequirement;
      const skills = character.skills || {};
      const treeSkills = skills[tree] || {};
      const skill = treeSkills[skillId];
      
      if (!skill || skill.level < level) {
        continue;
      }
    }
    
    available.push(recipe);
  }
  
  return available;
}

module.exports = {
  RECIPE_CATEGORIES,
  CRAFTING_RECIPES,
  getRecipe,
  getAllRecipes,
  getRecipesByCategory,
  getAvailableRecipes
};

