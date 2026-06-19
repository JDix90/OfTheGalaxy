/**
 * Progression System Utility
 * Calculates passive bonuses from character skills
 */

const { getSkillDefinition } = require('../data/skills');

class ProgressionSystem {
  /**
   * @param {Object} character
   * @param {Object} [equipmentSkillBonuses] - flat skillId→bonus map from equipped gear (non-tool
   *   slots; tool-slot bonuses are applied separately by toolService). Added on top of the trained
   *   level in getSkillLevel so a +skill accessory actually improves the check.
   */
  constructor(character, equipmentSkillBonuses = null) {
    this.character = character;
    this.equipmentSkillBonuses = equipmentSkillBonuses || null;
  }

  /**
   * Get passive bonuses from skills
   * @returns {Object} Passive bonuses grouped by category
   */
  getPassiveBonuses() {
    const bonuses = {
      stats: {},
      combat: {},
      other: {}
    };

    // Ensure skills object exists
    const skills = this.character.skills || {};
    
    for (const [tree, treeSkills] of Object.entries(skills)) {
      if (!treeSkills || typeof treeSkills !== 'object') continue;
      
      for (const [skillId, skillData] of Object.entries(treeSkills)) {
        if (!skillData || typeof skillData !== 'object') continue;
        
        const skillLevel = skillData.level || 0;
        if (skillLevel <= 0) continue;

        const skillDef = getSkillDefinition(tree, skillId);
        if (!skillDef || !skillDef.passives) continue;

        // Apply passive bonuses based on skill level
        for (const [bonusType, bonusValue] of Object.entries(skillDef.passives)) {
          const scaledValue = bonusValue * skillLevel;
          
          // Categorize bonuses
          if (['strength', 'agility', 'intelligence', 'charisma', 'perception', 'endurance'].includes(bonusType)) {
            bonuses.stats[bonusType] = (bonuses.stats[bonusType] || 0) + scaledValue;
          } else if (bonusType.includes('damage') || bonusType.includes('defense') || 
                     bonusType.includes('accuracy') || bonusType.includes('crit')) {
            bonuses.combat[bonusType] = (bonuses.combat[bonusType] || 0) + scaledValue;
          } else if (bonusType === 'maxStamina') {
            bonuses.other.maxStamina = (bonuses.other.maxStamina || 0) + scaledValue;
          } else if (bonusType === 'staminaRegenBonus') {
            bonuses.other.staminaRegenBonus = (bonuses.other.staminaRegenBonus || 0) + scaledValue;
          } else if (bonusType === 'staminaCostReduction') {
            bonuses.other.staminaCostReduction = (bonuses.other.staminaCostReduction || 0) + scaledValue;
          } else {
            bonuses.other[bonusType] = (bonuses.other[bonusType] || 0) + scaledValue;
          }
        }
      }
    }

    return bonuses;
  }

  /**
   * Get skill level for a specific skill
   * @param {string} tree - Skill tree name
   * @param {string} skillId - Skill ID
   * @returns {number} Skill level (0 if not unlocked)
   */
  getSkillLevel(tree, skillId) {
    const skills = this.character.skills || {};
    const treeSkills = skills[tree] || {};
    const skillData = treeSkills[skillId];
    const trained = skillData?.level || 0;
    // Flat bonus from equipped gear (e.g. a +lockpicking accessory), keyed by skill id.
    const gear = (this.equipmentSkillBonuses && this.equipmentSkillBonuses[skillId]) || 0;
    return trained + gear;
  }

  /**
   * Check if a skill can be unlocked
   * @param {string} tree - Skill tree name
   * @param {string} skillId - Skill ID
   * @returns {Object} { can: boolean, reason: string }
   */
  canUnlockSkill(tree, skillId) {
    const skillDef = getSkillDefinition(tree, skillId);
    if (!skillDef) {
      return { can: false, reason: 'Skill not found' };
    }

    const currentLevel = this.getSkillLevel(tree, skillId);
    if (currentLevel >= (skillDef.maxLevel || 5)) {
      return { can: false, reason: 'Skill already at max level' };
    }

    // Check prerequisites
    if (skillDef.prerequisites) {
      // Check level requirement
      if (skillDef.prerequisites.level && this.character.level < skillDef.prerequisites.level) {
        return { can: false, reason: `Requires level ${skillDef.prerequisites.level}` };
      }

      // Check stat requirements
      if (skillDef.prerequisites.stats) {
        for (const [stat, requiredValue] of Object.entries(skillDef.prerequisites.stats)) {
          const currentStat = this.character.stats?.[stat] || 10;
          if (currentStat < requiredValue) {
            return { can: false, reason: `Requires ${stat} ${requiredValue}` };
          }
        }
      }

      // Check skill requirements
      if (skillDef.prerequisites.skills) {
        for (const [prereqTree, prereqSkills] of Object.entries(skillDef.prerequisites.skills)) {
          for (const [prereqSkillId, requiredLevel] of Object.entries(prereqSkills)) {
            const prereqLevel = this.getSkillLevel(prereqTree, prereqSkillId);
            if (prereqLevel < requiredLevel) {
              const prereqName = getSkillDefinition(prereqTree, prereqSkillId)?.name
                || prereqSkillId.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
              return { can: false, reason: `Requires ${prereqName} level ${requiredLevel}` };
            }
          }
        }
      }
    }

    return { can: true, reason: null };
  }
}

module.exports = { ProgressionSystem };

