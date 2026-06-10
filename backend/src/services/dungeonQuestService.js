/**
 * Dungeon Quest Service
 * Handles quest tracking for dungeon-specific objectives
 */

const { QuestProgress, Quest } = require('../models');
const questService = require('./questService');

class DungeonQuestService {
  /**
   * Track enemy defeat in dungeon
   * Updates quest objectives for clear_dungeon and defeat_boss
   * @param {string} characterId - Character ID
   * @param {string} subMapId - SubMap ID (dungeon)
   * @param {Object} enemy - Defeated enemy object
   */
  async trackEnemyDefeat(characterId, subMapId, enemy) {
    try {
      // Get all active quests for this character
      const activeQuests = await QuestProgress.findActiveForCharacter(characterId);
      
      if (!activeQuests || activeQuests.length === 0) {
        return; // No active quests
      }
      
      // Get quest details for each active quest
      for (const questProgress of activeQuests) {
        const quest = await Quest.findByPk(questProgress.questId);
        if (!quest || !quest.objectives) continue;
        
        // Check each objective
        for (const objective of quest.objectives) {
          // Skip if already completed
          if (questProgress.isObjectiveComplete(objective.id)) {
            continue;
          }
          
          // Check for clear_dungeon objective
          if (objective.type === 'clear_dungeon') {
            // Check if target matches this dungeon
            const targetMatches = await this.checkDungeonTarget(objective, subMapId);
            if (targetMatches) {
              // Get current progress
              const currentProgress = questProgress.objectiveProgress[objective.id] || { defeated: 0 };
              
              // Increment defeated count
              const newProgress = {
                ...currentProgress,
                defeated: (currentProgress.defeated || 0) + 1
              };
              
              // Check if objective is complete
              const requiredCount = objective.count || 0;
              const isComplete = requiredCount === 0 
                ? await this.isDungeonCleared(characterId, subMapId) // All enemies defeated
                : newProgress.defeated >= requiredCount; // Specific count reached
              
              // Update objective
              await questService.updateObjective(
                characterId,
                quest.id,
                objective.id,
                isComplete,
                newProgress
              );
            }
          }
          
          // Check for defeat_boss objective
          if (objective.type === 'defeat_boss' && enemy.isBoss) {
            const targetMatches = await this.checkDungeonTarget(objective, subMapId);
            if (targetMatches) {
              // Mark boss defeat objective as complete
              await questService.updateObjective(
                characterId,
                quest.id,
                objective.id,
                true,
                { bossDefeated: true, bossId: enemy.id }
              );
            }
          }
        }
      }
    } catch (error) {
      console.error('[Dungeon Quest Service] Error tracking enemy defeat:', error);
      // Don't throw - quest tracking shouldn't break gameplay
    }
  }
  
  /**
   * Track depth reached in dungeon
   * Updates quest objectives for reach_depth
   * @param {string} characterId - Character ID
   * @param {string} subMapId - SubMap ID (dungeon)
   * @param {number} depthZone - Current depth zone (0-4)
   */
  async trackDepthReached(characterId, subMapId, depthZone) {
    try {
      // Get all active quests for this character
      const activeQuests = await QuestProgress.findActiveForCharacter(characterId);
      
      if (!activeQuests || activeQuests.length === 0) {
        return; // No active quests
      }
      
      // Get quest details for each active quest
      for (const questProgress of activeQuests) {
        const quest = await Quest.findByPk(questProgress.questId);
        if (!quest || !quest.objectives) continue;
        
        // Check each objective
        for (const objective of quest.objectives) {
          // Skip if already completed
          if (questProgress.isObjectiveComplete(objective.id)) {
            continue;
          }
          
          // Check for reach_depth objective
          if (objective.type === 'reach_depth') {
            const targetMatches = await this.checkDungeonTarget(objective, subMapId);
            const requiredDepth = objective.depthZone !== undefined ? objective.depthZone : 3;
            
            if (targetMatches && depthZone >= requiredDepth) {
              // Mark depth objective as complete
              await questService.updateObjective(
                characterId,
                quest.id,
                objective.id,
                true,
                { depthReached: depthZone, requiredDepth }
              );
            }
          }
        }
      }
    } catch (error) {
      console.error('[Dungeon Quest Service] Error tracking depth reached:', error);
      // Don't throw - quest tracking shouldn't break gameplay
    }
  }
  
  /**
   * Check if dungeon is cleared (all enemies defeated)
   * @param {string} characterId - Character ID
   * @param {string} subMapId - SubMap ID
   * @returns {Promise<boolean>} True if all enemies are defeated
   */
  async isDungeonCleared(characterId, subMapId) {
    try {
      const { SubMap } = require('../models');
      const subMap = await SubMap.findByPk(subMapId);
      
      if (!subMap || subMap.type !== 'dungeon') {
        return false;
      }
      
      const metadata = subMap.metadata || {};
      const enemies = metadata.enemies || [];
      
      // Check if all non-boss enemies are defeated
      const nonBossEnemies = enemies.filter(e => !e.isBoss);
      const allNonBossDefeated = nonBossEnemies.length > 0 && 
                                 nonBossEnemies.every(e => e.defeated);
      
      // Check if boss is defeated (if boss exists)
      const boss = enemies.find(e => e.isBoss);
      const bossDefeated = !boss || boss.defeated;
      
      return allNonBossDefeated && bossDefeated;
    } catch (error) {
      console.error('[Dungeon Quest Service] Error checking dungeon cleared:', error);
      return false;
    }
  }
  
  /**
   * Check if objective target matches dungeon
   * @param {Object} objective - Quest objective
   * @param {string} subMapId - SubMap ID
   * @param {Object} subMap - Optional subMap object (to avoid extra query)
   * @returns {Promise<boolean>} True if target matches
   */
  async checkDungeonTarget(objective, subMapId, subMap = null) {
    // If no target specified, match any dungeon
    if (!objective.target) {
      return true;
    }
    
    // Check if target matches subMapId directly
    if (objective.target === subMapId) {
      return true;
    }
    
    // Get submap if not provided
    if (!subMap) {
      const { SubMap } = require('../models');
      subMap = await SubMap.findByPk(subMapId);
    }
    
    if (!subMap) {
      return false;
    }
    
    // Check if target matches parentLocationId
    if (objective.target === subMap.parentLocationId) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Check and update clear_dungeon objectives when dungeon is fully cleared
   * @param {string} characterId - Character ID
   * @param {string} subMapId - SubMap ID
   */
  async checkDungeonCleared(characterId, subMapId) {
    try {
      const isCleared = await this.isDungeonCleared(characterId, subMapId);
      
      if (!isCleared) {
        return; // Not cleared yet
      }
      
      // Get all active quests
      const activeQuests = await QuestProgress.findActiveForCharacter(characterId);
      
      for (const questProgress of activeQuests) {
        const quest = await Quest.findByPk(questProgress.questId);
        if (!quest || !quest.objectives) continue;
        
        // Check for clear_dungeon objectives
        for (const objective of quest.objectives) {
          if (objective.type === 'clear_dungeon' && 
              !questProgress.isObjectiveComplete(objective.id)) {
            const targetMatches = await this.checkDungeonTarget(objective, subMapId);
            
            if (targetMatches) {
              // Mark as complete - this will trigger quest completion check if all objectives are done
              const result = await questService.updateObjective(
                characterId,
                quest.id,
                objective.id,
                true,
                { dungeonCleared: true, clearedAt: new Date().toISOString() }
              );
              
              // If quest was completed, result will contain quest completion info
              if (result && result.quest && result.rewards) {
                console.log(`[Dungeon Quest Service] Quest "${quest.title}" completed after clearing dungeon!`);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('[Dungeon Quest Service] Error checking dungeon cleared:', error);
      // Don't throw - quest tracking shouldn't break gameplay
    }
  }
  
  /**
   * Track boss defeat in dungeon
   * Separate from trackEnemyDefeat for clarity
   * @param {string} characterId - Character ID
   * @param {string} subMapId - SubMap ID
   * @param {Object} boss - Boss enemy object
   */
  async trackBossDefeat(characterId, subMapId, boss) {
    try {
      // Use the same logic as trackEnemyDefeat but specifically for bosses
      await this.trackEnemyDefeat(characterId, subMapId, boss);
      
      // Also check if dungeon is cleared after boss defeat
      await this.checkDungeonCleared(characterId, subMapId);
    } catch (error) {
      console.error('[Dungeon Quest Service] Error tracking boss defeat:', error);
      // Don't throw - quest tracking shouldn't break gameplay
    }
  }
}

module.exports = new DungeonQuestService();

