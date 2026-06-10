/**
 * Escort Service
 * Handles NPC following player during escort quests
 */

const { NPC, Quest, QuestProgress, PlayerCharacter } = require('../models');

class EscortService {
  /**
   * Get active escort quest for character
   * @param {string} characterId - Character ID
   * @returns {Promise<Object|null>} Active escort quest with NPC info
   */
  async getActiveEscortQuest(characterId) {
    try {
      const activeQuests = await QuestProgress.findAll({
        where: {
          characterId,
          status: 'active'
        }
      });

      if (activeQuests.length === 0) return null;

      const questIds = activeQuests.map(qp => qp.questId);
      const escortQuests = await Quest.findAll({
        where: {
          id: { [require('sequelize').Op.in]: questIds },
          questType: 'mini'
        }
      });

      // Find escort quest
      for (const quest of escortQuests) {
        const objectives = quest.objectives || [];
        const escortObjective = objectives.find(obj => obj.type === 'escort' || obj.isEscort);
        
        if (escortObjective) {
          const npcId = escortObjective.npcId || quest.questGiverId;
          const npc = await NPC.findByPk(npcId);
          
          if (npc) {
            return {
              quest,
              questProgress: activeQuests.find(qp => qp.questId === quest.id),
              npc,
              objective: escortObjective,
              destination: escortObjective.destination
            };
          }
        }
      }

      return null;
    } catch (error) {
      console.error('[Escort Service] Error getting active escort quest:', error);
      return null;
    }
  }

  /**
   * Update NPC position to follow player
   * @param {string} characterId - Character ID
   * @param {Object} playerLocation - Player's current location {x, y, planet, area}
   * @returns {Promise<Object|null>} Updated NPC location
   */
  async updateEscortNPCPosition(characterId, playerLocation) {
    const escortQuest = await this.getActiveEscortQuest(characterId);
    
    if (!escortQuest || !escortQuest.npc) {
      return null;
    }

    const npc = escortQuest.npc;
    const npcLocation = npc.location || {};
    
    // Calculate follow distance (NPC stays close but not on top of player)
    const followDistance = 2; // 2% of map distance
    const currentDistance = this.calculateDistance(
      playerLocation.x || 50,
      playerLocation.y || 50,
      npcLocation.x || 50,
      npcLocation.y || 50
    );

    // If NPC is too far, move closer
    if (currentDistance > followDistance) {
      const angle = Math.atan2(
        (playerLocation.y || 50) - (npcLocation.y || 50),
        (playerLocation.x || 50) - (npcLocation.x || 50)
      );
      
      // Move NPC closer to player (but maintain follow distance)
      const newX = (playerLocation.x || 50) - Math.cos(angle) * followDistance;
      const newY = (playerLocation.y || 50) - Math.sin(angle) * followDistance;
      
      // Clamp to valid range
      const clampedX = Math.max(0, Math.min(100, newX));
      const clampedY = Math.max(0, Math.min(100, newY));

      // Update NPC location
      npc.location = {
        ...npcLocation,
        planet: playerLocation.planet || npcLocation.planet,
        area: playerLocation.area || npcLocation.area,
        x: clampedX,
        y: clampedY
      };

      await npc.save();
      
      return {
        npcId: npc.id,
        location: npc.location,
        following: true
      };
    }

    return {
      npcId: npc.id,
      location: npc.location,
      following: true,
      distance: currentDistance
    };
  }

  /**
   * Check if player has reached escort destination
   * @param {string} characterId - Character ID
   * @param {Object} playerLocation - Player's current location
   * @returns {Promise<boolean>} True if destination reached
   */
  async checkDestinationReached(characterId, playerLocation) {
    const escortQuest = await this.getActiveEscortQuest(characterId);
    
    if (!escortQuest || !escortQuest.destination) {
      return false;
    }

    const destination = escortQuest.destination;
    const arrivalDistance = 5; // 5% of map distance (increased for easier completion)

    // Check if player is at destination
    const playerPlanet = playerLocation.planet || playerLocation.currentPlanet;
    const playerArea = playerLocation.area || 'surface';
    
    if (playerPlanet === destination.planet && 
        playerArea === destination.area) {
      const distance = this.calculateDistance(
        playerLocation.x || 50,
        playerLocation.y || 50,
        destination.x || 50,
        destination.y || 50
      );

      if (distance <= arrivalDistance) {
        // Also move escort NPC to destination
        if (escortQuest.npc) {
          escortQuest.npc.location = {
            ...escortQuest.npc.location,
            x: destination.x,
            y: destination.y
          };
          await escortQuest.npc.save();
        }
        return true;
      }
    }

    return false;
  }

  /**
   * Calculate distance between two points
   */
  calculateDistance(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Get escort quest marker data for map display
   * @param {string} characterId - Character ID
   * @returns {Promise<Object|null>} Marker data {x, y, planet, area, type, label}
   */
  async getEscortQuestMarker(characterId) {
    const escortQuest = await this.getActiveEscortQuest(characterId);
    
    if (!escortQuest || !escortQuest.destination) {
      return null;
    }

    const destination = escortQuest.destination;
    
    return {
      x: destination.x,
      y: destination.y,
      planet: destination.planet,
      area: destination.area,
      type: 'escort_destination',
      label: destination.name || 'Destination',
      questId: escortQuest.quest.id,
      color: '#22c55e', // Green for safe destination
      icon: '📍'
    };
  }
}

module.exports = new EscortService();

