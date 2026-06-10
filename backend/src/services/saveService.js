/**
 * Save Service
 * Business logic for game save/load management
 */

const { SaveSlot, PlayerCharacter, PlayerInventory, QuestProgress, FactionReputation, Discovery, sequelize } = require('../models');

// Character columns that represent gameplay progression and are safe to roll back
// on restore. Identity/ownership columns (id, userId, name, species, background,
// createdAt) are intentionally excluded.
const RESTORABLE_CHARACTER_FIELDS = [
  'level', 'xp', 'skillPoints', 'attributePoints', 'specializationPoints',
  'stats', 'skills', 'abilities', 'appearance',
  'currentPlanet', 'currentLocation',
  'credits', 'currentHealth', 'maxHealth', 'currentStamina', 'maxStamina'
];

class SaveService {
  /**
   * Create or update a save slot
   */
  async createSave(userId, characterId, slotNumber, saveName = null) {
    // Verify character belongs to user
    const character = await PlayerCharacter.findByPk(characterId);
    if (!character) {
      throw new Error('Character not found');
    }
    if (character.userId !== userId) {
      throw new Error('Access denied');
    }

    // Get complete game state
    const inventory = await PlayerInventory.findForCharacter(characterId);
    const questProgress = await QuestProgress.findAll({
      where: { characterId, status: 'active' }
    });
    const completedQuests = await QuestProgress.findAll({
      where: { characterId, status: 'completed' }
    });
    const factionReputation = await FactionReputation.findAll({ where: { characterId } });
    const discoveries = await Discovery.findAll({ where: { characterId } });

    const saveData = {
      character: character.toJSON(),
      inventory: inventory.map(item => item.toJSON()),
      questProgress: questProgress.map(qp => qp.toJSON()),
      completedQuests: completedQuests.map(qp => qp.toJSON()),
      factionReputation: factionReputation.map(fr => fr.toJSON()),
      discoveries: discoveries.map(d => d.toJSON()),
      timestamp: new Date().toISOString(),
      version: '1.1'
    };

    // Create or update save slot
    const [saveSlot, created] = await SaveSlot.findOrCreate({
      where: { userId, slotNumber },
      defaults: {
        userId,
        characterId,
        slotNumber,
        saveName: saveName || `Save ${slotNumber}`,
        saveData,
        playtime: 0 // TODO: Calculate actual playtime
      }
    });

    if (!created) {
      saveSlot.saveData = saveData;
      saveSlot.saveName = saveName || saveSlot.saveName;
      saveSlot.characterId = characterId;
      await saveSlot.save();
    }

    return saveSlot.toJSON();
  }

  /**
   * Load a save slot
   */
  async loadSave(userId, slotNumber) {
    const saveSlot = await SaveSlot.findOne({
      where: { userId, slotNumber }
    });

    if (!saveSlot) {
      throw new Error('Save slot not found');
    }

    if (saveSlot.userId !== userId) {
      throw new Error('Access denied');
    }

    return saveSlot.saveData;
  }

  /**
   * Restore a save slot: authoritatively write the saved snapshot back into the
   * live database so the game truly rolls back to the saved state (loadSave only
   * returns the snapshot for preview; this applies it).
   *
   * Runs in a single transaction so a failure leaves the character untouched.
   * Restores: character progression fields, full inventory (replace), and the
   * saved active quest progress (upsert; quests not in the snapshot are left
   * alone since the save format only captures active quests).
   *
   * @returns {Promise<object>} summary incl. the restored characterId
   */
  async restoreSave(userId, slotNumber) {
    const saveSlot = await SaveSlot.findOne({ where: { userId, slotNumber } });

    if (!saveSlot) {
      throw new Error('Save slot not found');
    }
    if (saveSlot.userId !== userId) {
      throw new Error('Access denied');
    }

    const saveData = saveSlot.saveData;
    if (!saveData || !saveData.character || !saveData.character.id) {
      throw new Error('Save data is empty or corrupted');
    }

    const snapshot = saveData.character;
    const characterId = snapshot.id;

    return await sequelize.transaction(async (t) => {
      // The save belongs to a specific character; it must still exist and still
      // belong to this user (guards against restoring onto a deleted/foreign row).
      const character = await PlayerCharacter.findByPk(characterId, {
        transaction: t,
        lock: t.LOCK.UPDATE
      });
      if (!character) {
        throw new Error('The character this save belongs to no longer exists');
      }
      if (character.userId !== userId) {
        throw new Error('Access denied');
      }

      // 1) Restore character progression fields (allowlist only).
      for (const field of RESTORABLE_CHARACTER_FIELDS) {
        if (snapshot[field] !== undefined) {
          character[field] = snapshot[field];
        }
      }
      await character.save({ transaction: t });

      // 2) Replace inventory with the snapshot's items.
      await PlayerInventory.destroy({ where: { characterId }, transaction: t });
      const inventoryRows = (saveData.inventory || []).map((item) => ({
        characterId,
        itemId: item.itemId,
        quantity: item.quantity,
        equipped: item.equipped || false,
        equipmentSlot: item.equipmentSlot || null,
        acquiredFrom: item.acquiredFrom || 'save_restore'
      }));
      if (inventoryRows.length > 0) {
        await PlayerInventory.bulkCreate(inventoryRows, { transaction: t });
      }

      // 3) Restore saved active quest progress (upsert by character + quest).
      for (const qp of (saveData.questProgress || [])) {
        if (!qp.questId) continue;
        const [row, created] = await QuestProgress.findOrCreate({
          where: { characterId, questId: qp.questId },
          defaults: {
            characterId,
            questId: qp.questId,
            status: qp.status || 'active',
            objectivesCompleted: qp.objectivesCompleted || {},
            objectiveProgress: qp.objectiveProgress || {}
          },
          transaction: t
        });
        if (!created) {
          row.status = qp.status || 'active';
          row.objectivesCompleted = qp.objectivesCompleted || {};
          row.objectiveProgress = qp.objectiveProgress || {};
          await row.save({ transaction: t });
        }
      }

      // 3b) Restore completed quests (save format v1.1+). Upsert by character+quest
      // and force status back to completed so progression history is preserved.
      for (const qp of (saveData.completedQuests || [])) {
        if (!qp.questId) continue;
        const [row, created] = await QuestProgress.findOrCreate({
          where: { characterId, questId: qp.questId },
          defaults: {
            characterId,
            questId: qp.questId,
            status: 'completed',
            objectivesCompleted: qp.objectivesCompleted || {},
            objectiveProgress: qp.objectiveProgress || {},
            completedAt: qp.completedAt || new Date()
          },
          transaction: t
        });
        if (!created) {
          row.status = 'completed';
          row.objectivesCompleted = qp.objectivesCompleted || {};
          row.objectiveProgress = qp.objectiveProgress || {};
          row.completedAt = qp.completedAt || row.completedAt || new Date();
          await row.save({ transaction: t });
        }
      }

      // 4) Restore faction reputation (save format v1.1+).
      for (const fr of (saveData.factionReputation || [])) {
        if (!fr.factionId) continue;
        const [row, created] = await FactionReputation.findOrCreate({
          where: { characterId, factionId: fr.factionId },
          defaults: {
            characterId,
            factionId: fr.factionId,
            reputation: fr.reputation || 0,
            tier: fr.tier || 'neutral'
          },
          transaction: t
        });
        if (!created) {
          row.reputation = fr.reputation || 0;
          row.tier = fr.tier || 'neutral';
          await row.save({ transaction: t });
        }
      }

      // 5) Restore discoveries (save format v1.1+). Additive: ensure each saved
      // discovery exists; we do not delete discoveries made after the save.
      for (const d of (saveData.discoveries || [])) {
        // Match the DB unique index (character_id, planet_id, location_id).
        await Discovery.findOrCreate({
          where: {
            characterId,
            planetId: d.planetId,
            locationId: d.locationId
          },
          defaults: {
            characterId,
            planetId: d.planetId,
            locationType: d.locationType,
            locationId: d.locationId,
            locationName: d.locationName,
            firstDiscovery: d.firstDiscovery,
            metadata: d.metadata || {}
          },
          transaction: t
        });
      }

      return {
        characterId,
        character: character.toJSON(),
        savedAt: saveData.timestamp || null,
        version: saveData.version || null,
        restoredAt: new Date().toISOString()
      };
    });
  }

  /**
   * Get all save slots for a user
   */
  async getSaveSlots(userId) {
    const slots = await SaveSlot.findAll({
      where: { userId },
      order: [['slot_number', 'ASC']]
    });

    // Manually attach character info from saveData if available
    return slots.map(slot => {
      const slotData = slot.toJSON();
      if (slotData.saveData && slotData.saveData.character) {
        slotData.character = {
          id: slotData.saveData.character.id,
          name: slotData.saveData.character.name,
          level: slotData.saveData.character.level,
          currentPlanet: slotData.saveData.character.currentPlanet
        };
      }
      return slotData;
    });
  }

  /**
   * Delete a save slot
   */
  async deleteSave(userId, slotNumber) {
    const saveSlot = await SaveSlot.findOne({
      where: { userId, slotNumber }
    });

    if (!saveSlot) {
      throw new Error('Save slot not found');
    }

    if (saveSlot.userId !== userId) {
      throw new Error('Access denied');
    }

    await saveSlot.destroy();
    return true;
  }
}

module.exports = new SaveService();

