/**
 * ProgressionSystem
 * Handles leveling, skill trees, and progression mechanics
 */

import { SKILL_DEFINITIONS } from '../../data/skills';

export class ProgressionSystem {
  constructor(character) {
    this.character = character;
  }

  /**
   * Safely get skill level - works with both CharacterManager and plain objects
   */
  getSkillLevel(tree, skillId) {
    // If character has getSkillLevel method (CharacterManager instance)
    if (typeof this.character.getSkillLevel === 'function') {
      return this.character.getSkillLevel(tree, skillId) || 0;
    }
    
    // Fallback: access skills directly
    if (this.character.skills?.[tree]?.[skillId]?.level) {
      return this.character.skills[tree][skillId].level || 0;
    }
    
    return 0;
  }

  /**
   * Calculate XP for a given level
   */
  static calculateXPForLevel(level) {
    return Math.floor(100 * Math.pow(level, 1.5));
  }

  /**
   * Calculate total XP needed to reach a level
   */
  static calculateTotalXPForLevel(level) {
    let total = 0;
    for (let i = 1; i < level; i++) {
      total += ProgressionSystem.calculateXPForLevel(i);
    }
    return total;
  }

  /**
   * Calculate level from total XP
   */
  static calculateLevelFromXP(totalXP) {
    let level = 1;
    let xpAccumulated = 0;
    
    while (xpAccumulated + ProgressionSystem.calculateXPForLevel(level) <= totalXP) {
      xpAccumulated += ProgressionSystem.calculateXPForLevel(level);
      level++;
    }
    
    return level;
  }

  /**
   * Check if skill can be unlocked
   */
  canUnlockSkill(tree, skillId) {
    const skill = SKILL_DEFINITIONS[tree]?.[skillId];
    
    if (!skill) {
      return { can: false, reason: 'Skill not found' };
    }
    
    // Check if already at max level (use safe getSkillLevel method)
    const currentLevel = this.getSkillLevel(tree, skillId);
    if (currentLevel >= (skill.maxLevel || 5)) {
      return { can: false, reason: 'Skill at max level' };
    }
    
    // Check skill points
    if ((this.character.skillPoints || 0) <= 0) {
      return { can: false, reason: 'No skill points available' };
    }
    
    // Check prerequisites
    if (skill.prerequisites) {
      // Level requirement
      if (skill.prerequisites.level && (this.character.level || 1) < skill.prerequisites.level) {
        return { can: false, reason: `Requires level ${skill.prerequisites.level}` };
      }
      
      // Required skills
      if (skill.prerequisites.skills) {
        for (const [reqTree, reqSkills] of Object.entries(skill.prerequisites.skills)) {
          for (const [reqSkillId, reqLevel] of Object.entries(reqSkills)) {
            const hasLevel = this.getSkillLevel(reqTree, reqSkillId);
            if (hasLevel < reqLevel) {
              return { can: false, reason: `Requires ${reqSkillId} level ${reqLevel}` };
            }
          }
        }
      }
      
      // Stat requirements
      if (skill.prerequisites.stats) {
        for (const [stat, value] of Object.entries(skill.prerequisites.stats)) {
          const currentStat = (this.character.stats?.[stat] || 10);
          if (currentStat < value) {
            return { can: false, reason: `Requires ${stat} ${value}` };
          }
        }
      }
    }
    
    return { can: true };
  }

  /**
   * Get available skills for a tree
   */
  getAvailableSkills(tree) {
    const skills = SKILL_DEFINITIONS[tree] || {};
    const available = [];
    
    for (const [skillId, skill] of Object.entries(skills)) {
      const check = this.canUnlockSkill(tree, skillId);
      if (check.can) {
        available.push({
          id: skillId,
          ...skill,
          currentLevel: this.getSkillLevel(tree, skillId)
        });
      }
    }
    
    return available;
  }

  /**
   * Get all skills in a tree with their status
   */
  getSkillTree(tree) {
    const skills = SKILL_DEFINITIONS[tree] || {};
    const skillTree = [];
    
    for (const [skillId, skill] of Object.entries(skills)) {
      const currentLevel = this.getSkillLevel(tree, skillId);
      const check = this.canUnlockSkill(tree, skillId);
      
      skillTree.push({
        id: skillId,
        ...skill,
        currentLevel,
        canUnlock: check.can,
        unlockReason: check.reason,
        isUnlocked: currentLevel > 0,
        isMaxLevel: currentLevel >= (skill.maxLevel || 5)
      });
    }
    
    return skillTree;
  }

  /**
   * Get active abilities from unlocked skills
   */
  getActiveAbilities() {
    const abilities = [];
    
    for (const [tree, skills] of Object.entries(this.character.skills)) {
      for (const [skillId, skillData] of Object.entries(skills)) {
        if (skillData.level > 0) {
          const skillDef = SKILL_DEFINITIONS[tree]?.[skillId];
          if (skillDef && skillDef.abilities) {
            abilities.push(...skillDef.abilities.map(ability => ({
              ...ability,
              skillTree: tree,
              skillId,
              skillLevel: skillData.level
            })));
          }
        }
      }
    }
    
    return abilities;
  }

  /**
   * Get passive bonuses from skills
   */
  getPassiveBonuses() {
    const bonuses = {
      stats: {},
      combat: {},
      other: {}
    };
    
    for (const [tree, skills] of Object.entries(this.character.skills)) {
      for (const [skillId, skillData] of Object.entries(skills)) {
        if (skillData.level > 0) {
          const skillDef = SKILL_DEFINITIONS[tree]?.[skillId];
          if (skillDef && skillDef.passives) {
            // Apply passive bonuses based on skill level
            for (const [bonusType, bonusValue] of Object.entries(skillDef.passives)) {
              const scaledValue = bonusValue * skillData.level;
              
              if (bonusType in bonuses.stats) {
                bonuses.stats[bonusType] = (bonuses.stats[bonusType] || 0) + scaledValue;
              } else if (bonusType.includes('damage') || bonusType.includes('defense')) {
                bonuses.combat[bonusType] = (bonuses.combat[bonusType] || 0) + scaledValue;
              } else {
                bonuses.other[bonusType] = (bonuses.other[bonusType] || 0) + scaledValue;
              }
            }
          }
        }
      }
    }
    
    return bonuses;
  }

  /**
   * Calculate effective stats with bonuses
   */
  getEffectiveStats() {
    const base = { ...this.character.stats };
    const bonuses = this.getPassiveBonuses();
    
    const effective = { ...base };
    for (const [stat, bonus] of Object.entries(bonuses.stats)) {
      effective[stat] = (effective[stat] || 0) + bonus;
    }
    
    return effective;
  }
}
