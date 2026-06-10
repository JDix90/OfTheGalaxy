/**
 * Tutorial Event Bus
 * Lightweight client event bus for canonical game events
 */

class TutorialEventBus {
  constructor() {
    this.listeners = new Map();
  }
  
  /**
   * Subscribe to an event
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }
  
  /**
   * Unsubscribe from an event
   * @param {string} event - Event name
   * @param {Function} callback - Callback function to remove
   */
  off(event, callback) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }
  
  /**
   * Emit an event
   * @param {string} event - Event name
   * @param {Object} data - Event data
   */
  emit(event, data) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[TutorialEventBus] Error in event listener for ${event}:`, error);
        }
      });
    }
  }
  
  /**
   * Remove all listeners for an event
   * @param {string} event - Event name (optional, removes all if not provided)
   */
  removeAllListeners(event) {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}

// Export singleton instance
export const tutorialEventBus = new TutorialEventBus();

// Export event names as constants for type safety
export const TUTORIAL_EVENTS = {
  // Player actions
  PLAYER_MOVED: 'player.moved',
  PLAYER_SPAWNED: 'player.spawned',
  PLAYER_HEALTH_CHANGED: 'player.health.changed',
  PLAYER_STAMINA_CHANGED: 'player.stamina.changed',
  
  // UI interactions
  UI_OPENED_INVENTORY: 'ui.opened.inventory',
  UI_OPENED_QUESTLOG: 'ui.opened.questlog',
  UI_OPENED_GALAXYMAP: 'ui.opened.galaxymap',
  UI_OPENED_FACTIONS: 'ui.opened.factions',
  UI_CLOSED_INVENTORY: 'ui.closed.inventory',
  UI_OPENED_VENDOR: 'ui.opened.vendor',
  
  // NPC interactions
  NPC_INTERACTION_OPENED: 'npc.interaction.opened',
  NPC_INTERACTION_CLOSED: 'npc.interaction.closed',
  DIALOGUE_STARTED: 'dialogue.started',
  DIALOGUE_MESSAGE_SENT: 'dialogue.message.sent',
  DIALOGUE_MESSAGE_RECEIVED: 'dialogue.message.received',
  
  // Quest system
  QUEST_OFFERED: 'quest.offered',
  QUEST_ACCEPTED: 'quest.accepted',
  QUEST_OBJECTIVE_COMPLETED: 'quest.objective.completed',
  QUEST_COMPLETED: 'quest.completed',
  
  // Combat
  COMBAT_INTRO: 'combat.intro',
  COMBAT_STARTED: 'combat.started',
  COMBAT_TURN_STARTED: 'combat.turn.started',
  COMBAT_ACTION_PERFORMED: 'combat.action.performed',
  COMBAT_ENDED: 'combat.ended',
  
  // Items
  ITEM_ADDED: 'item.added',
  ITEM_EQUIPPED: 'item.equipped',
  ITEM_USED: 'item.used',
  ITEM_SOLD: 'item.sold',
  ITEM_BOUGHT: 'item.bought',
  ITEM_HOVERED: 'item.hovered',
  
  // Travel
  TRAVEL_INITIATED: 'travel.initiated',
  TRAVEL_COMPLETED: 'travel.completed',
  
  // Sub-maps
  SUBMAP_ENTERED: 'submap.entered',
  SUBMAP_EXITED: 'submap.exited',
  LOCKPICKING_STARTED: 'lockpicking.started',
  LOCKPICKING_COMPLETED: 'lockpicking.completed',
  
  // Planet Surface
  PLANET_SURFACE_ENTERED: 'planet_surface.entered',
  POI_CLICKED: 'poi.clicked',
  POI_MENU_OPENED: 'poi.menu.opened',
  POI_ENTERED: 'poi.entered',
  POI_INVESTIGATED: 'poi.investigated',
  PLANET_NPC_CLICKED: 'planet_npc.clicked',
  QUEST_OBJECTIVE_LOCATION_REACHED: 'quest.objective.location.reached',
  QUEST_READY_TO_TURN_IN: 'quest.ready.to.turn.in',
  
  // Advanced Mechanics
  LOCKPICKING_FAILED_NO_SKILL: 'lockpicking.failed.no.skill',
  LOCKPICKING_ATTEMPTED: 'lockpicking.attempted',
  LEVEL_UP: 'level.up',
  SKILL_POINTS_AVAILABLE: 'skill.points.available',
  ATTRIBUTE_POINTS_AVAILABLE: 'attribute.points.available',
  FAST_TRAVEL_OPTION_SHOWN: 'fast_travel.option.shown',
  FAST_TRAVEL_USED: 'fast_travel.used',
  RANDOM_ENCOUNTER_TRIGGERED: 'random.encounter.triggered',
  
  // Exploration
  DISCOVERY_RECORDED: 'discovery.recorded',
  EXPLORATION_JOURNAL_OPENED: 'exploration.journal.opened'
};



