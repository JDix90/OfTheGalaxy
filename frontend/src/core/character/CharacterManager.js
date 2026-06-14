/**
 * CharacterManager
 * Core character management system (non-UI logic)
 */

import { calculateCritChance, calculateDodgeChance } from '../../utils/diminishingReturns';
import { ProgressionSystem } from '../progression/ProgressionSystem';

export class CharacterManager {
  constructor(characterData) {
    this.id = characterData.id;
    this.name = characterData.name;
    this.species = characterData.species;
    this.background = characterData.background;
    this.level = characterData.level || 1;
    this.xp = characterData.xp || 0;
    this.skillPoints = characterData.skillPoints || 5;
    this.attributePoints = characterData.attributePoints || 0;
    this.stats = characterData.stats || this.getDefaultStats();
    this.skills = characterData.skills || this.getDefaultSkills();
    this.currentPlanet = characterData.currentPlanet || 'solenne';
    this.currentLocation = characterData.currentLocation || { x: 0, y: 0, area: 'landing_zone' };
    this.appearance = characterData.appearance || {};
    this.credits = characterData.credits || 1000;
    this.currentHealth = characterData.currentHealth || 100;
    this.maxHealth = characterData.maxHealth || 100;
    this.currentStamina = characterData.currentStamina || 100;
    this.maxStamina = characterData.maxStamina || 100;
    this.abilities = characterData.abilities || [];
  }

  /**
   * Get default stats
   */
  getDefaultStats() {
    return {
      strength: 10,
      agility: 10,
      intelligence: 10,
      charisma: 10,
      perception: 10,
      endurance: 10
    };
  }

  /**
   * Get default skills
   */
  getDefaultSkills() {
    return {
      combat: {},
      stealth: {},
      diplomacy: {},
      technical: {},
      survival: {}
    };
  }

  /**
   * Calculate XP needed for next level
   */
  getXPForNextLevel() {
    // Mirror of backend PlayerCharacter.getXPForNextLevel (curve exponent 1.25).
    return Math.floor(100 * Math.pow(this.level, 1.25));
  }

  /**
   * Get XP progress percentage
   */
  getXPProgress() {
    const needed = this.getXPForNextLevel();
    return (this.xp / needed) * 100;
  }

  /**
   * Check if character can level up
   */
  canLevelUp() {
    return this.xp >= this.getXPForNextLevel();
  }

  /**
   * Calculate derived stats
   * Formula: 100 + (endurance - 10) * scaling + (level - 1) * 5
   * This ensures level 1 with endurance 10 = 100 health/stamina
   */
  getMaxHealth() {
    const endurance = this.stats?.endurance || 10;
    return 100 + ((endurance - 10) * 10) + ((this.level - 1) * 5);
  }

  getMaxStamina() {
    const endurance = this.stats?.endurance || 10;
    const baseMax = 100 + ((endurance - 10) * 5) + ((this.level - 1) * 5);
    
    // Add skill bonuses
    const progressionSystem = new ProgressionSystem(this);
    const passiveBonuses = progressionSystem.getPassiveBonuses();
    const skillBonus = passiveBonuses.other?.maxStamina || 0;
    
    return baseMax + skillBonus;
  }

  getCarryWeight() {
    return 50 + (this.stats.strength * 5);
  }

  getCritChance() {
    const perception = this.stats.perception || 10;
    
    // Get skill bonuses
    const progressionSystem = new ProgressionSystem(this);
    const passiveBonuses = progressionSystem.getPassiveBonuses();
    const skillCritBonus = passiveBonuses.combat.critChance || 0;
    
    // Item bonuses (if available - would need to be passed in or retrieved)
    const itemCritBonus = 0; // TODO: Get from equipped items if needed
    
    return calculateCritChance(perception, skillCritBonus, itemCritBonus);
  }
  
  getDodgeChance() {
    const agility = this.stats.agility || 10;
    
    // Get skill bonuses
    const progressionSystem = new ProgressionSystem(this);
    const passiveBonuses = progressionSystem.getPassiveBonuses();
    const skillDodgeBonus = passiveBonuses.combat.dodge || 0;
    
    // Item bonuses (if available)
    const itemDodgeBonus = 0; // TODO: Get from equipped items if needed
    
    return calculateDodgeChance(agility, skillDodgeBonus, itemDodgeBonus);
  }

  getPersuasionBonus() {
    return this.stats.charisma * 2;
  }

  getStealthBonus() {
    return this.stats.agility * 1.5;
  }

  getHackingBonus() {
    return this.stats.intelligence * 2;
  }

  /**
   * Get health percentage
   */
  getHealthPercentage() {
    return (this.currentHealth / this.maxHealth) * 100;
  }

  /**
   * Get stamina percentage
   */
  getStaminaPercentage() {
    return (this.currentStamina / this.maxStamina) * 100;
  }

  /**
   * Check if character is alive
   */
  isAlive() {
    return this.currentHealth > 0;
  }

  /**
   * Check if character is at full health
   */
  isFullHealth() {
    return this.currentHealth >= this.maxHealth;
  }

  /**
   * Get skill level
   */
  getSkillLevel(tree, skillId) {
    if (!this.skills[tree] || !this.skills[tree][skillId]) {
      return 0;
    }
    return this.skills[tree][skillId].level || 0;
  }

  /**
   * Check if skill is unlocked
   */
  hasSkill(tree, skillId) {
    return this.getSkillLevel(tree, skillId) > 0;
  }

  /**
   * Get total skill points spent in a tree
   */
  getSkillPointsInTree(tree) {
    if (!this.skills[tree]) return 0;
    
    return Object.values(this.skills[tree]).reduce((total, skill) => {
      return total + (skill.level || 0);
    }, 0);
  }

  /**
   * Get character summary for display
   */
  getSummary() {
    return {
      id: this.id,
      name: this.name,
      species: this.species,
      background: this.background,
      level: this.level,
      xp: this.xp,
      xpForNextLevel: this.getXPForNextLevel(),
      xpProgress: this.getXPProgress(),
      skillPoints: this.skillPoints,
      attributePoints: this.attributePoints,
      credits: this.credits,
      health: {
        current: this.currentHealth,
        max: this.maxHealth,
        percentage: this.getHealthPercentage()
      },
      stamina: {
        current: this.currentStamina,
        max: this.maxStamina,
        percentage: this.getStaminaPercentage()
      },
      location: {
        planet: this.currentPlanet,
        ...this.currentLocation
      }
    };
  }

  /**
   * Serialize to JSON
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      species: this.species,
      background: this.background,
      level: this.level,
      xp: this.xp,
      skillPoints: this.skillPoints,
      attributePoints: this.attributePoints,
      stats: this.stats,
      skills: this.skills,
      currentPlanet: this.currentPlanet,
      currentLocation: this.currentLocation,
      appearance: this.appearance,
      credits: this.credits,
      currentHealth: this.currentHealth,
      maxHealth: this.maxHealth,
      currentStamina: this.currentStamina,
      maxStamina: this.maxStamina
    };
  }

  /**
   * Create from JSON
   */
  static fromJSON(data) {
    return new CharacterManager(data);
  }
}
