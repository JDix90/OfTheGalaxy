/**
 * Achievement Service
 * Handles achievement tracking and rewards
 */

const { Achievement, PlayerCharacter, Discovery, CombatEncounter } = require('../models');
const { Op } = require('sequelize');
const inventoryService = require('./inventoryService');

// Achievement definitions
const ACHIEVEMENT_DEFINITIONS = {
  // Discovery achievements
  'discover_10_planets': {
    type: 'discovery',
    name: 'Explorer',
    target: 10,
    rewards: { xp: 500, credits: 1000 }
  },
  'discover_50_locations': {
    type: 'discovery',
    name: 'Wanderer',
    target: 50,
    rewards: { xp: 1000, credits: 2000 }
  },
  'discover_all_planets': {
    type: 'discovery',
    name: 'Galactic Explorer',
    target: 86, // Total planets
    rewards: { xp: 5000, credits: 10000 }
  },
  // Combat achievements
  'defeat_10_enemies': {
    type: 'combat',
    name: 'Warrior',
    target: 10,
    rewards: { xp: 300, credits: 500 }
  },
  'defeat_100_enemies': {
    type: 'combat',
    name: 'Veteran',
    target: 100,
    rewards: { xp: 2000, credits: 5000 }
  },
  'defeat_boss': {
    type: 'combat',
    name: 'Boss Slayer',
    target: 1,
    rewards: { xp: 1000, credits: 2000 }
  }
};

class AchievementService {
  /**
   * Get or create achievement record
   */
  async getOrCreateAchievement(characterId, achievementId) {
    let achievement = await Achievement.findOne({
      where: {
        characterId,
        achievementId
      }
    });

    if (!achievement) {
      const definition = ACHIEVEMENT_DEFINITIONS[achievementId];
      if (!definition) {
        throw new Error(`Unknown achievement: ${achievementId}`);
      }

      achievement = await Achievement.create({
        characterId,
        achievementType: definition.type,
        achievementId,
        achievementName: definition.name,
        target: definition.target,
        progress: 0,
        rewards: definition.rewards,
        completed: false
      });
    }

    return achievement;
  }

  /**
   * Update achievement progress
   */
  async updateProgress(characterId, achievementId, progressDelta = 1) {
    const achievement = await this.getOrCreateAchievement(characterId, achievementId);
    
    if (achievement.completed) {
      return achievement; // Already completed
    }

    achievement.progress = Math.min(achievement.progress + progressDelta, achievement.target);
    
    // Check if completed
    if (achievement.progress >= achievement.target && !achievement.completed) {
      achievement.completed = true;
      achievement.completedAt = new Date();
      
      // Award rewards
      await this.awardRewards(characterId, achievement);
    }

    await achievement.save();
    return achievement;
  }

  /**
   * Award achievement rewards
   */
  async awardRewards(characterId, achievement) {
    const character = await PlayerCharacter.findByPk(characterId);
    if (!character) return;

    const rewards = achievement.rewards || {};

    // Award XP
    if (rewards.xp) {
      character.xp += rewards.xp;
      // Check for level up (simplified)
      const xpForNextLevel = character.level * 100;
      if (character.xp >= xpForNextLevel) {
        character.level += 1;
        character.xp -= xpForNextLevel;
      }
    }

    // Award credits
    if (rewards.credits) {
      character.credits += rewards.credits;
    }

    // Award items
    if (rewards.items) {
      for (const item of rewards.items) {
        await inventoryService.addItem(characterId, item.itemId, item.quantity || 1);
      }
    }

    await character.save();
  }

  /**
   * Check and update discovery achievements
   */
  async checkDiscoveryAchievements(characterId) {
    // Count discovered planets
    const planetCount = await Discovery.count({
      where: {
        characterId,
        locationType: 'poi',
        locationId: { [Op.like]: 'planet_%' }
      },
      distinct: true,
      col: 'planet_id'
    });

    // Update planet discovery achievements
    if (planetCount >= 10) {
      await this.updateProgress(characterId, 'discover_10_planets', planetCount);
    }
    if (planetCount >= 86) {
      await this.updateProgress(characterId, 'discover_all_planets', planetCount);
    }

    // Count total discoveries
    const totalDiscoveries = await Discovery.count({
      where: { characterId }
    });

    if (totalDiscoveries >= 50) {
      await this.updateProgress(characterId, 'discover_50_locations', totalDiscoveries);
    }
  }

  /**
   * Check and update combat achievements
   */
  async checkCombatAchievements(characterId) {
    // Count defeated enemies
    const victories = await CombatEncounter.count({
      where: {
        characterId,
        status: 'won'
      }
    });

    // Count enemies defeated (sum from all encounters)
    const encounters = await CombatEncounter.findAll({
      where: {
        characterId,
        status: 'won'
      }
    });

    let totalEnemiesDefeated = 0;
    for (const encounter of encounters) {
      const enemies = encounter.combatants?.filter(c => c.type === 'enemy' && c.stats.health <= 0) || [];
      totalEnemiesDefeated += enemies.length;
    }

    // Update combat achievements
    if (totalEnemiesDefeated >= 10) {
      await this.updateProgress(characterId, 'defeat_10_enemies', totalEnemiesDefeated);
    }
    if (totalEnemiesDefeated >= 100) {
      await this.updateProgress(characterId, 'defeat_100_enemies', totalEnemiesDefeated);
    }
  }

  /**
   * Get all achievements for character
   */
  async getAchievements(characterId) {
    return await Achievement.findAll({
      where: { characterId },
      order: [['completed', 'DESC'], ['achievementType', 'ASC'], ['createdAt', 'ASC']]
    });
  }

  /**
   * Get achievement statistics
   */
  async getAchievementStats(characterId) {
    const achievements = await Achievement.findAll({
      where: { characterId }
    });

    const total = achievements.length;
    const completed = achievements.filter(a => a.completed).length;
    const byType = {};
    
    achievements.forEach(a => {
      byType[a.achievementType] = (byType[a.achievementType] || 0) + 1;
    });

    return {
      total,
      completed,
      progress: total > 0 ? (completed / total) * 100 : 0,
      byType
    };
  }
}

module.exports = new AchievementService();


