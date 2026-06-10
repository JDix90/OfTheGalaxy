/**
 * Dungeon Enemy Service
 * Manages enemy combatants in dungeon submaps
 */

const { SubMap } = require('../models');
const { spawnDungeonEnemies } = require('../utils/dungeonEnemySpawner');

class DungeonEnemyService {
  /**
   * Get enemies for a dungeon submap
   * @param {string} subMapId - SubMap ID
   * @returns {Promise<Array>} Array of enemy objects
   */
  async getDungeonEnemies(subMapId) {
    const subMap = await SubMap.findByPk(subMapId);
    if (!subMap) {
      throw new Error('SubMap not found');
    }
    
    if (subMap.type !== 'dungeon') {
      throw new Error('SubMap is not a dungeon');
    }
    
    // Reload to ensure we have the latest data
    await subMap.reload();
    
    // Get metadata as a plain object (not Sequelize getter)
    // Use toJSON() to ensure we get a plain object with properly parsed JSON
    const subMapData = subMap.toJSON();
    const metadata = subMapData.metadata || {};
    const enemies = metadata.enemies || [];
    
    console.log(`[Dungeon Enemy Service] Retrieved ${enemies.length} enemies for dungeon ${subMapId}`, {
      defeated: enemies.filter(e => e.defeated).length,
      active: enemies.filter(e => !e.defeated && !e.inCombat).length,
      inCombat: enemies.filter(e => e.inCombat).length
    });
    
    return enemies;
  }
  
  /**
   * Spawn enemies for a dungeon
   * @param {string} subMapId - SubMap ID
   * @param {number} playerLevel - Player's level
   * @param {boolean} forceRespawn - If true, respawn even if enemies exist (default: false)
   * @returns {Promise<Array>} Array of spawned enemy objects
   */
  async spawnDungeonEnemies(subMapId, playerLevel, forceRespawn = false) {
    const subMap = await SubMap.findByPk(subMapId);
    if (!subMap) {
      throw new Error('SubMap not found');
    }
    
    if (subMap.type !== 'dungeon') {
      throw new Error('SubMap is not a dungeon');
    }
    
    const metadata = subMap.metadata || {};
    const existingEnemies = metadata.enemies || [];
    
    // If enemies already exist and we're not forcing respawn, don't overwrite them
    // This prevents respawning when returning from combat
    if (existingEnemies.length > 0 && !forceRespawn) {
      console.log(`[Dungeon Enemy Service] Enemies already exist for dungeon ${subMapId}, not respawning`);
      return existingEnemies;
    }
    
    const layout = subMap.layoutData || {};
    const dungeonType = metadata.dungeonType || 'danger';
    
    // Spawn enemies - this creates completely new enemies with new IDs
    const enemies = spawnDungeonEnemies(layout, playerLevel, dungeonType);
    
    // Ensure all spawned enemies are active (not defeated, not in combat)
    const activeEnemies = enemies.map(enemy => ({
      ...enemy,
      defeated: false,
      inCombat: false,
      stats: {
        ...enemy.stats,
        health: enemy.stats.maxHealth // Ensure full health
      }
    }));
    
    // Create new metadata object to ensure proper serialization
    // When forceRespawn is true, we completely replace the enemies array
    const updatedMetadata = {
      ...metadata,
      enemies: activeEnemies, // Use active enemies (all defeated: false, inCombat: false)
      progress: {
        ...metadata.progress,
        lastEntryTime: new Date().toISOString()
      }
    };
    // Clear lastExitTime when spawning (fresh entry)
    if (updatedMetadata.progress.lastExitTime) {
      delete updatedMetadata.progress.lastExitTime;
    }
    // Clear defeated enemies list when respawning
    if (forceRespawn && updatedMetadata.progress.defeatedEnemies) {
      delete updatedMetadata.progress.defeatedEnemies;
    }
    
    // Update submap metadata - use set() and save() to ensure Sequelize tracks the change
    subMap.set('metadata', updatedMetadata);
    await subMap.save();
    await subMap.reload();
    
    // Verify enemies were saved
    const savedData = subMap.toJSON();
    const savedEnemies = savedData.metadata?.enemies || [];
    
    console.log(`[Dungeon Enemy Service] Spawned ${activeEnemies.length} enemies for dungeon ${subMapId}`, {
      savedEnemiesCount: savedEnemies.length,
      enemyIds: activeEnemies.map(e => e?.id).filter(Boolean).slice(0, 5), // Log first 5 IDs
      forceRespawn,
      allActive: activeEnemies.every(e => !e.defeated && !e.inCombat)
    });
    
    if (savedEnemies.length !== activeEnemies.length) {
      console.error(`[Dungeon Enemy Service] WARNING: Enemy count mismatch! Spawned ${activeEnemies.length}, saved ${savedEnemies.length}`);
    }
    
    // Verify saved enemies are all active
    const savedDefeatedCount = savedEnemies.filter(e => e.defeated).length;
    if (savedDefeatedCount > 0) {
      console.warn(`[Dungeon Enemy Service] WARNING: ${savedDefeatedCount} saved enemies are marked as defeated!`);
    }
    
    return activeEnemies;
  }
  
  /**
   * Update enemy state (defeated, inCombat, etc.)
   * @param {string} subMapId - SubMap ID
   * @param {string} enemyId - Enemy ID
   * @param {Object} updates - Updates to apply
   * @returns {Promise<Object>} Updated enemy object
   */
  async updateEnemyState(subMapId, enemyId, updates) {
    try {
      const subMap = await SubMap.findByPk(subMapId);
      if (!subMap) {
        throw new Error(`SubMap not found: ${subMapId}`);
      }
      
      if (subMap.type !== 'dungeon') {
        throw new Error(`SubMap is not a dungeon: ${subMap.type}`);
      }
      
      // Get metadata as a plain object (not Sequelize getter)
      // Use toJSON() to ensure we get a plain object
      const subMapData = subMap.toJSON();
      const metadata = subMapData.metadata || {};
      
      // Ensure enemies array exists
      if (!Array.isArray(metadata.enemies)) {
        metadata.enemies = [];
      }
      
      const enemies = [...metadata.enemies];
      
      // If enemies array is empty, this is a critical error - enemies should have been spawned
      if (enemies.length === 0) {
        console.error(`[Dungeon Enemy Service] CRITICAL: Enemies array is empty for dungeon ${subMapId}!`, {
          enemyId,
          metadataKeys: Object.keys(metadata),
          hasProgress: !!metadata.progress,
          subMapType: subMap.type
        });
        
        // Try to reload the submap to get fresh data
        await subMap.reload();
        const reloadedData = subMap.toJSON();
        const reloadedEnemies = reloadedData.metadata?.enemies || [];
        
        if (reloadedEnemies.length === 0) {
          throw new Error(`Enemy not found: ${enemyId}. Enemies array is empty - enemies may not have been spawned or were cleared.`);
        }
        
        // Use reloaded enemies
        enemies.push(...reloadedEnemies);
      }
      
      const enemyIndex = enemies.findIndex(e => e && e.id === enemyId);
      if (enemyIndex === -1) {
        // Log available enemy IDs for debugging
        const availableIds = enemies.map(e => e?.id).filter(Boolean);
        console.error(`[Dungeon Enemy Service] Enemy not found: ${enemyId}. Available enemies:`, {
          availableIds,
          enemyCount: enemies.length,
          enemyDetails: enemies.map(e => ({ id: e?.id, name: e?.name, defeated: e?.defeated }))
        });
        throw new Error(`Enemy not found: ${enemyId}. Available enemy IDs: ${availableIds.join(', ')}`);
      }
      
      // Update enemy - create a new object to avoid mutation issues
      const updatedEnemy = {
        ...enemies[enemyIndex],
        ...updates
      };
      enemies[enemyIndex] = updatedEnemy;
      
      // Update progress if enemy was defeated
      if (updates.defeated && !updatedEnemy.isBoss) {
        const progress = metadata.progress || {};
        const defeatedEnemies = Array.isArray(progress.defeatedEnemies) ? [...progress.defeatedEnemies] : [];
        if (!defeatedEnemies.includes(enemyId)) {
          defeatedEnemies.push(enemyId);
        }
        metadata.progress = {
          ...progress,
          defeatedEnemies
        };
      }
      
      // Create new metadata object to ensure it's a plain object
      const updatedMetadata = {
        ...metadata,
        enemies: enemies
      };
      
      // Update submap - use set() and save() to ensure Sequelize tracks the change
      subMap.set('metadata', updatedMetadata);
      await subMap.save();
      await subMap.reload();
      
      // Verify the update was saved
      const savedData = subMap.toJSON();
      const savedEnemies = savedData.metadata?.enemies || [];
      
      console.log(`[Dungeon Enemy Service] Updated enemy ${enemyId} state:`, {
        updates,
        totalEnemies: enemies.length,
        defeatedCount: enemies.filter(e => e.defeated).length,
        activeCount: enemies.filter(e => !e.defeated && !e.inCombat).length,
        savedEnemiesCount: savedEnemies.length,
        savedEnemyIds: savedEnemies.map(e => e?.id).filter(Boolean)
      });
      
      // Verify the enemy was actually saved
      const savedEnemy = savedEnemies.find(e => e && e.id === enemyId);
      if (!savedEnemy) {
        console.error(`[Dungeon Enemy Service] WARNING: Enemy ${enemyId} not found after save!`, {
          savedEnemies: savedEnemies.map(e => ({ id: e?.id, name: e?.name }))
        });
      }
      
      return updatedEnemy;
    } catch (error) {
      console.error('[Dungeon Enemy Service] Error updating enemy state:', error);
      console.error('[Dungeon Enemy Service] Error details:', {
        subMapId,
        enemyId,
        updates,
        errorMessage: error.message,
        errorStack: error.stack
      });
      throw error;
    }
  }
  
  /**
   * Handle enemy respawn on dungeon re-entry
   * When player leaves dungeon and returns, ALL enemies should respawn (not just defeated ones)
   * This prevents players from gaming the system by leaving to heal and returning
   * @param {string} subMapId - SubMap ID
   * @param {number} playerLevel - Player's level (required for respawning)
   * @returns {Promise<Array>} Array of respawned enemies
   */
  async handleDungeonReEntry(subMapId, playerLevel) {
    const subMap = await SubMap.findByPk(subMapId);
    if (!subMap) {
      throw new Error('SubMap not found');
    }
    
    if (subMap.type !== 'dungeon') {
      throw new Error('SubMap is not a dungeon');
    }
    
    const metadata = subMap.metadata || {};
    const progress = metadata.progress || {};
    
    // Check if this is a re-entry (has lastExitTime)
    const lastExitTime = progress.lastExitTime;
    const hasReEntered = lastExitTime && (Date.now() - new Date(lastExitTime).getTime()) > 1000; // 1 second buffer
    
    if (hasReEntered) {
      // Player left dungeon and returned - FULLY respawn ALL enemies
      // This prevents players from leaving to heal and returning to easily clear the dungeon
      if (!playerLevel || typeof playerLevel !== 'number') {
        throw new Error('Player level is required for respawning enemies');
      }
      
      console.log(`[Dungeon Enemy Service] Player re-entered dungeon ${subMapId} after leaving - fully respawning all enemies`);
      
      // Use spawnDungeonEnemies with forceRespawn=true to completely regenerate all enemies
      // This will spawn new enemies and save them to metadata
      const respawnedEnemies = await this.spawnDungeonEnemies(subMapId, playerLevel, true);
      
      // Reload submap to get the latest metadata (spawnDungeonEnemies already saved enemies)
      await subMap.reload();
      const reloadedData = subMap.toJSON();
      const reloadedMetadata = reloadedData.metadata || {};
      
      // Update progress metadata only (enemies are already saved by spawnDungeonEnemies)
      const updatedMetadata = {
        ...reloadedMetadata, // This includes the newly spawned enemies
        progress: {
          ...reloadedMetadata.progress,
          lastEntryTime: new Date().toISOString()
        }
      };
      // Clear lastExitTime since player is back in dungeon
      delete updatedMetadata.progress.lastExitTime;
      
      // Save updated metadata (includes the newly spawned enemies from reloadedMetadata)
      subMap.set('metadata', updatedMetadata);
      await subMap.save();
      await subMap.reload();
      
      // Get the final enemies from the saved metadata
      const finalData = subMap.toJSON();
      const finalEnemies = finalData.metadata?.enemies || respawnedEnemies;
      
      // Verify all enemies are not defeated
      const defeatedCount = finalEnemies.filter(e => e.defeated).length;
      if (defeatedCount > 0) {
        console.warn(`[Dungeon Enemy Service] WARNING: ${defeatedCount} enemies are still marked as defeated after respawn!`);
      }
      
      console.log(`[Dungeon Enemy Service] Fully respawned ${finalEnemies.length} enemies for dungeon ${subMapId}`, {
        respawnedCount: respawnedEnemies.length,
        finalCount: finalEnemies.length,
        defeatedCount,
        allActive: finalEnemies.every(e => !e.defeated && !e.inCombat)
      });
      
      return finalEnemies;
    }
    
    // First entry or returning from combat - update entry time
    const updatedMetadata = {
      ...metadata,
      progress: {
        ...progress,
        lastEntryTime: new Date().toISOString()
      }
    };
    // Clear lastExitTime on entry (player is back in dungeon)
    // This ensures that if player returns from combat, they don't trigger respawn
    delete updatedMetadata.progress.lastExitTime;
    
    subMap.set('metadata', updatedMetadata);
    await subMap.save();
    await subMap.reload();
    
    const enemies = metadata.enemies || [];
    return enemies;
  }

  /**
   * Mark dungeon exit (sets lastExitTime for respawn tracking)
   * @param {string} subMapId - SubMap ID
   * @returns {Promise<void>}
   */
  async markDungeonExit(subMapId) {
    const subMap = await SubMap.findByPk(subMapId);
    if (!subMap) {
      throw new Error('SubMap not found');
    }
    
    if (subMap.type !== 'dungeon') {
      throw new Error('SubMap is not a dungeon');
    }
    
    // Get metadata as a plain object
    const subMapData = subMap.toJSON();
    const metadata = subMapData.metadata || {};
    
    // Create updated metadata with lastExitTime
    const updatedMetadata = {
      ...metadata,
      progress: {
        ...metadata.progress,
        lastExitTime: new Date().toISOString()
      }
    };
    
    // Save using set() and save() to ensure Sequelize tracks the change
    subMap.set('metadata', updatedMetadata);
    await subMap.save();
    await subMap.reload();
    
    // Verify it was saved
    const savedData = subMap.toJSON();
    const savedLastExitTime = savedData.metadata?.progress?.lastExitTime;
    
    console.log(`[Dungeon Enemy Service] Marked exit time for dungeon ${subMapId}`, {
      lastExitTime: savedLastExitTime,
      saved: !!savedLastExitTime
    });
    
    if (!savedLastExitTime) {
      console.error(`[Dungeon Enemy Service] WARNING: lastExitTime was not saved for dungeon ${subMapId}!`);
    }
  }
  
  /**
   * Mark enemy as defeated after combat
   * @param {string} subMapId - SubMap ID
   * @param {string} enemyId - Enemy ID
   * @returns {Promise<Object>} Updated enemy object
   */
  async markEnemyDefeated(subMapId, enemyId) {
    return this.updateEnemyState(subMapId, enemyId, {
      defeated: true,
      inCombat: false
    });
  }
  
  /**
   * Set enemy combat state
   * @param {string} subMapId - SubMap ID
   * @param {string} enemyId - Enemy ID
   * @param {boolean} inCombat - Combat state
   * @returns {Promise<Object>} Updated enemy object
   */
  async setEnemyCombatState(subMapId, enemyId, inCombat) {
    return this.updateEnemyState(subMapId, enemyId, { inCombat });
  }

  /**
   * Search a defeated enemy for loot
   * @param {string} subMapId - SubMap ID
   * @param {string} enemyId - Enemy ID
   * @param {string} characterId - Character ID searching the enemy
   * @returns {Promise<Object>} Loot found and updated enemy state
   */
  async searchDefeatedEnemy(subMapId, enemyId, characterId) {
    const subMap = await SubMap.findByPk(subMapId);
    if (!subMap) {
      throw new Error('SubMap not found');
    }
    
    if (subMap.type !== 'dungeon') {
      throw new Error('SubMap is not a dungeon');
    }
    
    const metadata = subMap.get('metadata') || {};
    const enemies = Array.isArray(metadata.enemies) ? [...metadata.enemies] : [];
    
    const enemyIndex = enemies.findIndex(e => e && e.id === enemyId);
    if (enemyIndex === -1) {
      throw new Error(`Enemy not found: ${enemyId}`);
    }
    
    const enemy = enemies[enemyIndex];
    
    // Check if enemy is defeated
    if (!enemy.defeated) {
      throw new Error('Enemy is not defeated. Cannot search active enemies.');
    }
    
    // Check if already searched
    if (enemy.searched) {
      return {
        enemy,
        loot: {
          credits: 0,
          items: [],
          message: 'This enemy has already been searched.'
        }
      };
    }
    
    // Generate loot from enemy's loot table (filter quest items based on active quests)
    const loot = await this.generateLootFromEnemy(enemy, characterId);
    
    // Mark enemy as searched
    enemies[enemyIndex] = {
      ...enemy,
      searched: true
    };
    
    const updatedMetadata = {
      ...metadata,
      enemies: enemies
    };
    
    await subMap.update({ metadata: updatedMetadata });
    
    // Add loot to character inventory
    const inventoryService = require('./inventoryService');
    const characterService = require('./characterService');
    const { PlayerCharacter } = require('../models');
    
    const character = await PlayerCharacter.findByPk(characterId);
    if (character) {
      // Add credits
      if (loot.credits > 0) {
        character.credits = (character.credits || 0) + loot.credits;
        await character.save();
      }
      
      // Add items to inventory
      for (const item of loot.items) {
        try {
          await inventoryService.addItem(characterId, item.itemId, item.quantity, 'dungeon_loot');
        } catch (error) {
          console.error(`[Dungeon Enemy Service] Failed to add loot item ${item.itemId}:`, error);
        }
      }
    }
    
    return {
      enemy: enemies[enemyIndex],
      loot
    };
  }

  /**
   * Get all quest-specific items (from all quests) and active quest items
   * @param {string} characterId - Character ID
   * @returns {Promise<{allQuestItems: Set<string>, activeQuestItems: Set<string>}>}
   */
  async getQuestItemInfo(characterId) {
    try {
      const { QuestProgress, Quest } = require('../models');
      
      // Get all quests to identify quest-specific items
      const allQuests = await Quest.findAll({
        where: { isActive: true }
      });
      
      // Get all active quests for this character
      const activeQuests = await QuestProgress.findAll({
        where: {
          characterId,
          status: 'active'
        }
      });
      
      const allQuestItems = new Set();
      const activeQuestItems = new Set();
      
      // First, identify all quest-specific items (from all quests)
      for (const quest of allQuests) {
        if (!quest.objectives) continue;
        for (const objective of quest.objectives) {
          if (objective.type === 'collect' && objective.target) {
            allQuestItems.add(objective.target);
          }
        }
      }
      
      // Then, get active quest items (only from active, incomplete objectives)
      for (const questProgress of activeQuests) {
        const quest = await Quest.findByPk(questProgress.questId);
        if (!quest || !quest.objectives) continue;
        
        for (const objective of quest.objectives) {
          // Check if objective is not yet completed
          if (!questProgress.isObjectiveComplete(objective.id)) {
            // If it's a collect objective, add the target item
            if (objective.type === 'collect' && objective.target) {
              activeQuestItems.add(objective.target);
            }
          }
        }
      }
      
      return {
        allQuestItems,
        activeQuestItems
      };
    } catch (error) {
      console.error('[Dungeon Enemy Service] Error getting quest items:', error);
      return {
        allQuestItems: new Set(),
        activeQuestItems: new Set()
      }; // Return empty sets on error to prevent blocking
    }
  }

  /**
   * Generate loot from enemy's loot table
   * @param {Object} enemy - Enemy object with lootTable
   * @param {string} characterId - Character ID (optional, for quest item filtering)
   * @returns {Promise<Object>} Generated loot
   */
  async generateLootFromEnemy(enemy, characterId = null) {
    const loot = {
      credits: 0,
      items: []
    };
    
    if (!enemy.lootTable || !Array.isArray(enemy.lootTable)) {
      // Default loot if no loot table
      loot.credits = Math.floor((enemy.creditsReward || 50) * 0.5); // 50% of combat reward
      return loot;
    }
    
    // Get quest item info if characterId is provided
    let allQuestItems = new Set();
    let activeQuestItems = new Set();
    if (characterId) {
      const questInfo = await this.getQuestItemInfo(characterId);
      allQuestItems = questInfo.allQuestItems;
      activeQuestItems = questInfo.activeQuestItems;
    }
    
    // Roll for each loot item
    for (const lootEntry of enemy.lootTable) {
      const roll = Math.random();
      
      if (roll <= lootEntry.chance) {
        if (lootEntry.itemId === 'credits') {
          // Credits reward
          const baseAmount = lootEntry.quantity || enemy.creditsReward || 50;
          loot.credits += Math.floor(baseAmount * (0.5 + Math.random() * 0.5)); // 50-100% of base
        } else {
          // Item reward - filter out quest items if quest is not active
          const itemId = lootEntry.itemId;
          
          // Check if this is a quest-specific item
          const isQuestItem = allQuestItems.has(itemId);
          
          if (isQuestItem) {
            // This is a quest item - only include if quest is active
            if (activeQuestItems.has(itemId)) {
              // Quest is active, include the item
              loot.items.push({
                itemId: itemId,
                quantity: lootEntry.quantity || 1
              });
            } else {
              // Quest item but quest is not active, skip it
              console.log(`[Dungeon Enemy Service] Skipping quest item ${itemId} - quest not active`);
            }
          } else {
            // Not a quest item, always include it
            loot.items.push({
              itemId: itemId,
              quantity: lootEntry.quantity || 1
            });
          }
        }
      }
    }
    
    // If no loot rolled, give minimum credits
    if (loot.credits === 0 && loot.items.length === 0) {
      loot.credits = Math.floor((enemy.creditsReward || 50) * 0.3); // 30% of combat reward as fallback
    }
    
    return loot;
  }
}

module.exports = new DungeonEnemyService();

