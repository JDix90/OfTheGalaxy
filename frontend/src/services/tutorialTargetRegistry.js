/**
 * Tutorial Target Registry
 * Central registry of UI targets for tutorial system
 */

// Central registry of tutorial targets
export const TUTORIAL_TARGETS = {
  // Planet Surface
  PLANET_MAP_CANVAS: 'planet-map-canvas',
  PLAYER_ICON: 'player-icon',
  PLAYER_CHARACTER_ICON: 'player-character-icon',
  NPC_ICON: 'npc-icon',
  PLANET_NPC_ICON: 'planet-npc-icon',
  POI_ICON: 'poi-icon',
  POI_INTERACTION_MENU: 'poi-interaction-menu',
  SUBMAP_ENTRY_POINT: 'submap-entry-point',
  
  // HUD
  HUD_HEALTH_BAR: 'hud-health-bar',
  HUD_STAMINA_BAR: 'hud-stamina-bar',
  HUD_HEALTH_STAMINA: 'hud-health-stamina',
  HUD_CREDITS_LEVEL_XP: 'hud-credits-level-xp',
  HUD_LEVEL_DISPLAY: 'hud-level-display',
  HUD_QUEST_TRACKER: 'hud-quest-tracker',
  HUD_INVENTORY_BUTTON: 'hud-inventory-button',
  HUD_QUEST_LOG_BUTTON: 'hud-quest-log-button',
  HUD_GALAXY_MAP_BUTTON: 'hud-galaxy-map-button',
  
  // NPC Interaction
  NPC_INTERACTION_MENU: 'npc-interaction-menu',
  NPC_TALK_BUTTON: 'npc-talk-button',
  NPC_QUEST_BUTTON: 'npc-quest-button',
  NPC_SHOP_BUTTON: 'npc-shop-button',
  
  // Dialogue
  DIALOGUE_INTERFACE: 'dialogue-interface',
  DIALOGUE_INPUT: 'dialogue-input',
  DIALOGUE_SUGGESTED_REPLIES: 'dialogue-suggested-replies',
  DIALOGUE_SEND_BUTTON: 'dialogue-send-button',
  
  // Quest
  QUEST_OFFER_MODAL: 'quest-offer-modal',
  QUEST_OFFER_UI: 'quest-offer-ui',
  QUEST_ACCEPT_BUTTON: 'quest-accept-button',
  QUEST_DECLINE_BUTTON: 'quest-decline-button',
  QUEST_LOG_VIEW: 'quest-log-view',
  QUEST_OBJECTIVE_LIST: 'quest-objective-list',
  QUEST_GIVER_NPC: 'quest-giver-npc',
  
  // Combat
  COMBAT_VIEW: 'combat-view',
  COMBAT_TURN_ORDER: 'combat-turn-order',
  COMBAT_ACTION_MENU: 'combat-action-menu',
  COMBAT_TARGET_SELECTION: 'combat-target-selection',
  COMBAT_ENEMY_COMBATANT: 'combat-enemy-combatant',
  
  // Inventory
  INVENTORY_VIEW: 'inventory-view',
  INVENTORY_GRID: 'inventory-grid',
  INVENTORY_EQUIPMENT_PANEL: 'inventory-equipment-panel',
  INVENTORY_ITEM_SLOT: 'inventory-item-slot',
  INVENTORY_USE_BUTTON: 'inventory-use-button',
  
  // Vendor
  VENDOR_VIEW: 'vendor-view',
  VENDOR_BUY_TAB: 'vendor-buy-tab',
  VENDOR_SELL_TAB: 'vendor-sell-tab',
  VENDOR_ITEM_LIST: 'vendor-item-list',
  VENDOR_BUY_BUTTON: 'vendor-buy-button',
  VENDOR_SELL_BUTTON: 'vendor-sell-button',
  
  // Galaxy Map
  GALAXY_MAP_VIEW: 'galaxy-map-view',
  GALAXY_SYSTEM_ICON: 'galaxy-system-icon',
  GALAXY_PLANET_ICON: 'galaxy-planet-icon',
  GALAXY_TRAVEL_BUTTON: 'galaxy-travel-button',
  
  // Sub-map
  SUBMAP_VIEW: 'submap-view',
  SUBMAP_EXIT_POINT: 'submap-exit-point',
  SUBMAP_DOOR: 'submap-door',
  LOCKED_DOOR: 'locked-door',
  SUBMAP_LOCKPICKING_UI: 'submap-lockpicking-ui',
  SPACEPORT_EXIT_POINT: 'spaceport-exit-point',
  
  // Character Sheet
  CHARACTER_SHEET_BUTTON: 'character-sheet-button',
  CHARACTER_SHEET_SKILLS_TAB: 'character-sheet-skills-tab',
  
  // Fast Travel
  FAST_TRAVEL_BUTTON: 'fast-travel-button',
  
  // Random Encounters
  ENCOUNTER_DIALOG: 'encounter-dialog'
};

/**
 * Add tutorial target data attribute to an element
 * @param {HTMLElement} element - DOM element
 * @param {string} targetId - Target ID from TUTORIAL_TARGETS
 */
export function addTutorialTarget(element, targetId) {
  if (element && targetId) {
    element.setAttribute('data-tutorial-target', targetId);
  }
}

/**
 * Find tutorial target element by ID
 * @param {string} targetId - Target ID from TUTORIAL_TARGETS
 * @returns {HTMLElement|null} - Found element or null
 */
export function findTutorialTarget(targetId) {
  if (!targetId) return null;
  return document.querySelector(`[data-tutorial-target="${targetId}"]`);
}

/**
 * Find all tutorial target elements by ID
 * @param {string} targetId - Target ID from TUTORIAL_TARGETS
 * @returns {NodeList} - Found elements
 */
export function findAllTutorialTargets(targetId) {
  if (!targetId) return [];
  return document.querySelectorAll(`[data-tutorial-target="${targetId}"]`);
}

/**
 * Remove tutorial target data attribute from an element
 * @param {HTMLElement} element - DOM element
 */
export function removeTutorialTarget(element) {
  if (element) {
    element.removeAttribute('data-tutorial-target');
  }
}




