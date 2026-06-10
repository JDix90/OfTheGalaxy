/**
 * Skill Definitions
 * Defines all skill trees and their abilities
 * Shared between frontend and backend
 */

const SKILL_DEFINITIONS = {
  combat: {
    basic_combat: {
      name: 'Basic Combat',
      description: 'Fundamental combat training',
      maxLevel: 5,
      passives: {
        damage: 2, // +2% damage per level
        staminaCostReduction: 3 // -3% stamina cost for combat abilities per level
      }
    },
    advanced_weapons: {
      name: 'Advanced Weapons',
      description: 'Mastery of advanced weaponry',
      maxLevel: 5,
      prerequisites: {
        level: 5,
        skills: {
          combat: { basic_combat: 3 }
        }
      },
      passives: {
        critChance: 1 // +1% crit chance per level
      }
    },
    tactical_awareness: {
      name: 'Tactical Awareness',
      description: 'Improved combat positioning and awareness',
      maxLevel: 3,
      prerequisites: {
        level: 8,
        stats: { perception: 15 }
      },
      passives: {
        defense: 3 // +3% defense per level
      }
    }
  },
  
  stealth: {
    basic_stealth: {
      name: 'Basic Stealth',
      description: 'Move quietly and avoid detection',
      maxLevel: 5,
      passives: {
        stealthBonus: 5, // +5 stealth per level
        staminaRegenBonus: 3 // +3% stamina regen per level (stealthy characters recover faster)
      }
    },
    lockpicking: {
      name: 'Lockpicking',
      description: 'Open locked doors and containers',
      maxLevel: 5,
      prerequisites: {
        level: 3,
        skills: {
          stealth: { basic_stealth: 2 }
        }
      },
      abilities: [
        {
          id: 'pick_lock',
          name: 'Pick Lock',
          description: 'Attempt to pick a lock'
        }
      ]
    },
    shadow_operative: {
      name: 'Shadow Operative',
      description: 'Master of infiltration',
      maxLevel: 3,
      prerequisites: {
        level: 10,
        skills: {
          stealth: { basic_stealth: 5, lockpicking: 3 }
        },
        stats: { agility: 18 }
      },
      passives: {
        stealthBonus: 10,
        critChance: 2
      }
    }
  },
  
  diplomacy: {
    persuasion: {
      name: 'Persuasion',
      description: 'Convince others through words',
      maxLevel: 5,
      passives: {
        persuasionBonus: 5 // +5 persuasion per level
      }
    },
    intimidation: {
      name: 'Intimidation',
      description: 'Threaten and coerce others',
      maxLevel: 5,
      prerequisites: {
        level: 4
      },
      passives: {
        intimidationBonus: 5
      }
    },
    leadership: {
      name: 'Leadership',
      description: 'Inspire and command others',
      maxLevel: 3,
      prerequisites: {
        level: 12,
        skills: {
          diplomacy: { persuasion: 4 }
        },
        stats: { charisma: 20 }
      },
      passives: {
        companionBonus: 10 // +10% companion effectiveness
      }
    }
  },
  
  technical: {
    basic_tech: {
      name: 'Basic Tech',
      description: 'Understand and use technology',
      maxLevel: 5,
      passives: {
        hackingBonus: 5
      }
    },
    hacking: {
      name: 'Hacking',
      description: 'Bypass security systems',
      maxLevel: 5,
      prerequisites: {
        level: 5,
        skills: {
          technical: { basic_tech: 3 }
        }
      },
      abilities: [
        {
          id: 'hack_terminal',
          name: 'Hack Terminal',
          description: 'Attempt to hack a computer terminal'
        }
      ]
    },
    engineering: {
      name: 'Engineering',
      description: 'Craft and modify equipment',
      maxLevel: 5,
      prerequisites: {
        level: 6,
        skills: {
          technical: { basic_tech: 4 }
        },
        stats: { intelligence: 16 }
      },
      abilities: [
        {
          id: 'craft_item',
          name: 'Craft Item',
          description: 'Craft items from components'
        },
        {
          id: 'modify_weapon',
          name: 'Modify Weapon',
          description: 'Add modifications to weapons'
        }
      ]
    }
  },
  
  survival: {
    basic_survival: {
      name: 'Basic Survival',
      description: 'Survive in harsh environments',
      maxLevel: 5,
      passives: {
        healthRegen: 1 // +1% health regen per level
      }
    },
    scavenging: {
      name: 'Scavenging',
      description: 'Find more resources when looting',
      maxLevel: 5,
      prerequisites: {
        level: 4,
        skills: {
          survival: { basic_survival: 2 }
        }
      },
      passives: {
        lootBonus: 10 // +10% loot quality per level
      }
    },
    field_medic: {
      name: 'Field Medic',
      description: 'Heal yourself and others',
      maxLevel: 5,
      prerequisites: {
        level: 7,
        skills: {
          survival: { basic_survival: 4 }
        },
        stats: { intelligence: 14 }
      },
      passives: {
        healthRegen: 1, // +1% health regen per level
        staminaRegenBonus: 5, // +5% stamina regen per level
        healingBonus: 15 // +15% healing effectiveness per level
      },
      abilities: [
        {
          id: 'field_heal',
          name: 'Field Heal',
          description: 'Restore health to yourself or an ally'
        }
      ]
    },
    endurance_training: {
      name: 'Endurance Training',
      description: 'Physical conditioning and stamina building',
      maxLevel: 5,
      prerequisites: {
        level: 5,
        stats: { endurance: 12 }
      },
      passives: {
        maxStamina: 15, // +15 max stamina per level
        staminaCostReduction: 2 // -2% stamina cost per level
      }
    }
  }
};

/**
 * Get a specific skill definition
 * @param {string} tree - Skill tree name
 * @param {string} skillId - Skill ID
 * @returns {Object|null} Skill definition or null if not found
 */
function getSkillDefinition(tree, skillId) {
  return SKILL_DEFINITIONS[tree]?.[skillId] || null;
}

/**
 * Get all skills in a tree
 * @param {string} tree - Skill tree name
 * @returns {Object} Skills in the tree
 */
function getSkillsInTree(tree) {
  return SKILL_DEFINITIONS[tree] || {};
}

/**
 * Get all skill trees
 * @returns {Array<string>} Array of skill tree names
 */
function getSkillTrees() {
  return Object.keys(SKILL_DEFINITIONS);
}

module.exports = {
  SKILL_DEFINITIONS,
  getSkillDefinition,
  getSkillsInTree,
  getSkillTrees
};

