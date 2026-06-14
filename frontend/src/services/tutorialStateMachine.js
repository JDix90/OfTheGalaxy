/**
 * Tutorial State Machine
 * Manages tutorial state transitions and handles out-of-order completion
 */

import { tutorialEventBus, TUTORIAL_EVENTS } from './tutorialEventBus';
import { tutorialApi } from './api/tutorialApi';

// Tutorial states enum
export const TUTORIAL_STATES = {
  // Initial states
  NOT_STARTED: 'not_started',
  STARTING: 'starting',
  
  // Orientation
  ORIENT_UI: 'orient_ui',
  MOVEMENT_INTRO: 'movement_intro',
  MOVEMENT_COMPLETE: 'movement_complete',
  
  // NPC interaction
  NPC_INTERACTION_INTRO: 'npc_interaction_intro',
  NPC_MENU_OPENED: 'npc_menu_opened',
  DIALOGUE_STARTED: 'dialogue_started',
  DIALOGUE_COMPLETE: 'dialogue_complete',
  
  // Quest system
  QUEST_OFFERED: 'quest_offered',
  QUEST_ACCEPTED: 'quest_accepted',
  QUEST_OBJECTIVE_TRACKING: 'quest_objective_tracking',
  
  // Sub-map (if applicable)
  SUBMAP_ENTRY_INTRO: 'submap_entry_intro',
  SUBMAP_ENTERED: 'submap_entered',
  SUBMAP_EXITED: 'submap_exited',
  
  // Combat
  COMBAT_INTRO: 'combat_intro',
  COMBAT_STARTED: 'combat_started',
  COMBAT_TURN_ORDER_EXPLAINED: 'combat_turn_order_explained',
  COMBAT_ACTION_MENU_EXPLAINED: 'combat_action_menu_explained',
  COMBAT_TARGETING_EXPLAINED: 'combat_targeting_explained',
  COMBAT_COMPLETE: 'combat_complete',
  
  // Loot & inventory
  LOOT_RECEIVED: 'loot_received',
  INVENTORY_OPENED: 'inventory_opened',
  ITEM_EQUIPPED: 'item_equipped',
  HEALING_EXPLAINED: 'healing_explained',
  MEDPAC_USED: 'medpac_used',
  
  // HUD orientation
  HUD_HEALTH_STAMINA_EXPLAINED: 'hud_health_stamina_explained',
  HUD_CREDITS_LEVEL_XP_EXPLAINED: 'hud_credits_level_xp_explained',
  SPACEPORT_EXIT_EXPLAINED: 'spaceport_exit_explained',
  
  // Vendor
  VENDOR_INTRO: 'vendor_intro',
  VENDOR_OPENED: 'vendor_opened',
  VENDOR_ITEM_HOVER_EXPLAINED: 'vendor_item_hover_explained',
  VENDOR_BUY_MEDPAC: 'vendor_buy_medpac',
  ITEM_BOUGHT: 'item_bought',
  VENDOR_SELL_DROID_PARTS: 'vendor_sell_droid_parts',
  ITEM_SOLD: 'item_sold',
  
  // Travel
  TRAVEL_INTRO: 'travel_intro',
  GALAXY_MAP_OPENED: 'galaxy_map_opened',
  TRAVEL_INITIATED: 'travel_initiated',
  TRAVEL_COMPLETE: 'travel_complete',
  
  // Completion
  QUEST_TURN_IN: 'quest_turn_in',
  TUTORIAL_COMPLETE: 'tutorial_complete',
  MOMENTUM_HANDOFF: 'momentum_handoff',
  TUTORIAL_SKIPPED: 'tutorial_skipped',
  
  // Planet Surface Orientation
  PLANET_SURFACE_INTRO: 'planet_surface_intro',
  PLANET_SURFACE_MOVEMENT: 'planet_surface_movement',
  
  // POI System
  POI_DISCOVERED: 'poi_discovered',
  POI_INTERACTION_MENU_OPENED: 'poi_interaction_menu_opened',
  POI_ENTERED: 'poi_entered',
  POI_INVESTIGATED: 'poi_investigated',
  
  // NPC Interaction on Planet Surface
  PLANET_NPC_CLICKED: 'planet_npc_clicked',
  PLANET_NPC_DIALOGUE_STARTED: 'planet_npc_dialogue_started',
  
  // Quest System on Planet Surface
  QUEST_FOUND: 'quest_found',
  QUEST_OBJECTIVE_LOCATION_REACHED: 'quest_objective_location_reached',
  QUEST_OBJECTIVE_COMPLETED: 'quest_objective_completed',
  QUEST_RETURN_TO_GIVER: 'quest_return_to_giver',
  
  // Advanced Mechanics
  LOCKPICKING_SKILL_REQUIRED: 'lockpicking_skill_required',
  LOCKPICKING_ATTEMPTED: 'lockpicking_attempted',
  FAST_TRAVEL_DISCOVERED: 'fast_travel_discovered',
  FAST_TRAVEL_USED: 'fast_travel_used',
  
  // Character Progression
  LEVEL_UP_OCCURRED: 'level_up_occurred',
  SKILL_POINTS_AVAILABLE: 'skill_points_available',
  ATTRIBUTE_POINTS_AVAILABLE: 'attribute_points_available',
  
  // Random Encounters
  RANDOM_ENCOUNTER_TRIGGERED: 'random_encounter_triggered',
  
  // Exploration
  DISCOVERY_RECORDED: 'discovery_recorded',
  EXPLORATION_JOURNAL_OPENED: 'exploration_journal_opened',
  
  // Planet Surface Completion
  PLANET_SURFACE_TUTORIAL_COMPLETE: 'planet_surface_tutorial_complete'
};

// State order for auto-advance logic
const STATE_ORDER = Object.values(TUTORIAL_STATES);

class TutorialStateMachine {
  constructor(characterId) {
    this.characterId = characterId;
    this.currentState = TUTORIAL_STATES.NOT_STARTED;
    this.completedStates = new Set();
    this.milestones = {};
    this.listeners = new Map();
    this.isInitialized = false;
  }
  
  /**
   * Initialize the state machine
   */
  async initialize() {
    if (this.isInitialized) return;
    
    try {
      // Load tutorial state from backend
      const response = await tutorialApi.getState(this.characterId);
      if (response.success && response.data) {
        const progress = response.data;
        this.currentState = progress.state || TUTORIAL_STATES.NOT_STARTED;
        this.completedStates = new Set(progress.completedStates || []);
        this.milestones = progress.milestones || {};
      }
      
      // Setup event listeners
      this.setupEventListeners();
      this.isInitialized = true;
      
      console.log(`[TutorialStateMachine] Initialized for character ${this.characterId}, state: ${this.currentState}`);
    } catch (error) {
      console.error('[TutorialStateMachine] Failed to initialize:', error);
      // Continue with default state
      this.setupEventListeners();
      this.isInitialized = true;
    }
  }
  
  /**
   * Transition to a new state
   */
  async transitionTo(newState, data = {}) {
    if (!STATE_ORDER.includes(newState)) {
      console.warn(`[TutorialStateMachine] Invalid state: ${newState}`);
      return;
    }
    
    const currentIndex = STATE_ORDER.indexOf(this.currentState);
    const newIndex = STATE_ORDER.indexOf(newState);
    
    // Allow specific tutorial flow transitions even if they appear "backward" in enum order
    // These are valid tutorial progressions that happen to be defined in a different order
    const allowedBackwardTransitions = [
      [TUTORIAL_STATES.ITEM_SOLD, TUTORIAL_STATES.LOOT_RECEIVED],
      [TUTORIAL_STATES.LOOT_RECEIVED, TUTORIAL_STATES.INVENTORY_OPENED],
      [TUTORIAL_STATES.INVENTORY_OPENED, TUTORIAL_STATES.HEALING_EXPLAINED],
      [TUTORIAL_STATES.HEALING_EXPLAINED, TUTORIAL_STATES.MEDPAC_USED],
      [TUTORIAL_STATES.MEDPAC_USED, TUTORIAL_STATES.HUD_HEALTH_STAMINA_EXPLAINED],
      [TUTORIAL_STATES.HUD_HEALTH_STAMINA_EXPLAINED, TUTORIAL_STATES.HUD_CREDITS_LEVEL_XP_EXPLAINED],
      [TUTORIAL_STATES.HUD_CREDITS_LEVEL_XP_EXPLAINED, TUTORIAL_STATES.SPACEPORT_EXIT_EXPLAINED]
    ];
    
    const isAllowedBackwardTransition = allowedBackwardTransitions.some(
      ([from, to]) => this.currentState === from && newState === to
    );
    
    // Check if this is a forward transition (new state is after current)
    if (newIndex > currentIndex) {
      // Forward transition - always allow
      // Auto-advance through any skipped states
      if (newIndex > currentIndex + 1) {
        await this.autoAdvanceTo(newState, data);
        return;
      }
    } else if (newIndex <= currentIndex) {
      // State is at or before current
      if (isAllowedBackwardTransition) {
        // This is an allowed backward transition for tutorial flow - allow it
        console.log(`[TutorialStateMachine] Allowing backward transition: ${this.currentState} -> ${newState}`);
      } else if (this.completedStates.has(newState)) {
        // State already completed - allow retry/revisit
      } else {
        // State is before current and not completed - ignore
        console.log(`[TutorialStateMachine] Blocking backward transition: ${this.currentState} -> ${newState}`);
        return;
      }
    }
    
    // Valid transition (forward, allowed backward, or already completed state)
    if (newIndex > currentIndex || isAllowedBackwardTransition || this.completedStates.has(newState) || newIndex === currentIndex) {
      const oldState = this.currentState;
      this.currentState = newState;
      
      // Don't mark certain states as completed automatically - they should only be marked when player dismisses them
      // These states need to be shown to the player even after transitioning to them
      const statesThatShouldNotAutoComplete = [
        TUTORIAL_STATES.VENDOR_SELL_DROID_PARTS,
        TUTORIAL_STATES.DIALOGUE_STARTED,
        TUTORIAL_STATES.VENDOR_BUY_MEDPAC,
        TUTORIAL_STATES.ITEM_BOUGHT,
        TUTORIAL_STATES.ITEM_SOLD,
        TUTORIAL_STATES.LOOT_RECEIVED,
        TUTORIAL_STATES.INVENTORY_OPENED,
        TUTORIAL_STATES.HEALING_EXPLAINED,
        TUTORIAL_STATES.MEDPAC_USED,
        TUTORIAL_STATES.HUD_HEALTH_STAMINA_EXPLAINED,
        TUTORIAL_STATES.HUD_CREDITS_LEVEL_XP_EXPLAINED,
        TUTORIAL_STATES.SPACEPORT_EXIT_EXPLAINED,
        // Planet Surface Tutorial States
        TUTORIAL_STATES.PLANET_SURFACE_INTRO,
        TUTORIAL_STATES.PLANET_SURFACE_MOVEMENT,
        TUTORIAL_STATES.POI_DISCOVERED,
        TUTORIAL_STATES.POI_INTERACTION_MENU_OPENED,
        TUTORIAL_STATES.POI_ENTERED,
        TUTORIAL_STATES.PLANET_NPC_CLICKED,
        TUTORIAL_STATES.PLANET_NPC_DIALOGUE_STARTED,
        TUTORIAL_STATES.QUEST_FOUND,
        TUTORIAL_STATES.QUEST_OBJECTIVE_LOCATION_REACHED,
        TUTORIAL_STATES.QUEST_OBJECTIVE_COMPLETED,
        TUTORIAL_STATES.QUEST_RETURN_TO_GIVER,
        TUTORIAL_STATES.LOCKPICKING_SKILL_REQUIRED,
        TUTORIAL_STATES.LEVEL_UP_OCCURRED,
        TUTORIAL_STATES.SKILL_POINTS_AVAILABLE,
        TUTORIAL_STATES.FAST_TRAVEL_DISCOVERED,
        TUTORIAL_STATES.RANDOM_ENCOUNTER_TRIGGERED
      ];
      
      if (!statesThatShouldNotAutoComplete.includes(newState)) {
        this.completedStates.add(newState);
        
        // Save milestone
        this.milestones[newState] = {
          completedAt: new Date().toISOString(),
          ...data
        };
      }
      
      // Save to backend
      await this.saveState();
      
      // Notify listeners
      this.notifyListeners('stateChanged', {
        oldState,
        newState,
        data
      });
      
      console.log(`[TutorialStateMachine] Transitioned from ${oldState} to ${newState}`);
    }
  }
  
  /**
   * Auto-advance through skipped states
   */
  async autoAdvanceTo(targetState, data = {}) {
    const currentIndex = STATE_ORDER.indexOf(this.currentState);
    const targetIndex = STATE_ORDER.indexOf(targetState);
    
    if (targetIndex <= currentIndex) return;
    
    // Don't mark certain states as completed automatically - they should only be marked when player dismisses them
    const statesThatShouldNotAutoComplete = [
      TUTORIAL_STATES.VENDOR_SELL_DROID_PARTS,
      TUTORIAL_STATES.DIALOGUE_STARTED,
      TUTORIAL_STATES.VENDOR_BUY_MEDPAC,
      TUTORIAL_STATES.ITEM_BOUGHT,
      TUTORIAL_STATES.ITEM_SOLD,
      TUTORIAL_STATES.LOOT_RECEIVED,
      TUTORIAL_STATES.INVENTORY_OPENED,
      TUTORIAL_STATES.HEALING_EXPLAINED,
      TUTORIAL_STATES.MEDPAC_USED,
      TUTORIAL_STATES.HUD_HEALTH_STAMINA_EXPLAINED,
      TUTORIAL_STATES.HUD_CREDITS_LEVEL_XP_EXPLAINED,
      TUTORIAL_STATES.SPACEPORT_EXIT_EXPLAINED,
      // Planet Surface Tutorial States
      TUTORIAL_STATES.PLANET_SURFACE_INTRO,
      TUTORIAL_STATES.PLANET_SURFACE_MOVEMENT,
      TUTORIAL_STATES.POI_DISCOVERED,
      TUTORIAL_STATES.POI_INTERACTION_MENU_OPENED,
      TUTORIAL_STATES.POI_ENTERED,
      TUTORIAL_STATES.PLANET_NPC_CLICKED,
      TUTORIAL_STATES.PLANET_NPC_DIALOGUE_STARTED,
      TUTORIAL_STATES.QUEST_FOUND,
      TUTORIAL_STATES.QUEST_OBJECTIVE_LOCATION_REACHED,
      TUTORIAL_STATES.QUEST_OBJECTIVE_COMPLETED,
      TUTORIAL_STATES.QUEST_RETURN_TO_GIVER,
      TUTORIAL_STATES.LOCKPICKING_SKILL_REQUIRED,
      TUTORIAL_STATES.LEVEL_UP_OCCURRED,
      TUTORIAL_STATES.SKILL_POINTS_AVAILABLE,
      TUTORIAL_STATES.FAST_TRAVEL_DISCOVERED,
      TUTORIAL_STATES.RANDOM_ENCOUNTER_TRIGGERED
    ];
    
    // Mark intermediate states as auto-advanced (except those that shouldn't auto-complete)
    const skippedStates = STATE_ORDER.slice(currentIndex + 1, targetIndex);
    skippedStates.forEach(state => {
      if (!this.completedStates.has(state) && !statesThatShouldNotAutoComplete.includes(state)) {
        this.completedStates.add(state);
        this.milestones[state] = {
          autoAdvanced: true,
          timestamp: new Date().toISOString()
        };
      }
    });
    
    // Now transition to target state directly (bypass transition check since we're auto-advancing)
    const oldState = this.currentState;
    this.currentState = targetState;
    
    // Only mark target state as completed if it's not in the exclusion list
    if (!statesThatShouldNotAutoComplete.includes(targetState)) {
      this.completedStates.add(targetState);
      
      // Save milestone
      this.milestones[targetState] = {
        completedAt: new Date().toISOString(),
        autoAdvanced: true,
        ...data
      };
    }
    
    // Save to backend
    await this.saveState();
    
    // Notify listeners
    this.notifyListeners('stateChanged', {
      oldState,
      newState: targetState,
      data
    });
    
    console.log(`[TutorialStateMachine] Auto-advanced from ${oldState} to ${targetState}`);
  }
  
  /**
   * Setup event listeners for game events
   */
  setupEventListeners() {
    // Player movement
    tutorialEventBus.on(TUTORIAL_EVENTS.PLAYER_MOVED, (data) => {
      if (this.currentState === TUTORIAL_STATES.MOVEMENT_INTRO) {
        this.transitionTo(TUTORIAL_STATES.MOVEMENT_COMPLETE, data);
      }
    });
    
    // NPC interaction
    tutorialEventBus.on(TUTORIAL_EVENTS.NPC_INTERACTION_OPENED, (data) => {
      if (this.currentState === TUTORIAL_STATES.NPC_INTERACTION_INTRO) {
        this.transitionTo(TUTORIAL_STATES.NPC_MENU_OPENED, data);
      }
    });
    
    // Dialogue
    tutorialEventBus.on(TUTORIAL_EVENTS.DIALOGUE_STARTED, (data) => {
      if (this.currentState === TUTORIAL_STATES.NPC_MENU_OPENED || 
          this.currentState === TUTORIAL_STATES.DIALOGUE_STARTED) {
        this.transitionTo(TUTORIAL_STATES.DIALOGUE_STARTED, data);
      }
    });
    
    // Quest offered
    tutorialEventBus.on(TUTORIAL_EVENTS.QUEST_OFFERED, (data) => {
      if (this.currentState === TUTORIAL_STATES.DIALOGUE_STARTED ||
          this.currentState === TUTORIAL_STATES.NPC_MENU_OPENED) {
        this.transitionTo(TUTORIAL_STATES.QUEST_OFFERED, data);
      }
    });
    
    // Quest accepted
    tutorialEventBus.on(TUTORIAL_EVENTS.QUEST_ACCEPTED, async (data) => {
      console.log(`[TutorialStateMachine] QUEST_ACCEPTED event received, currentState: ${this.currentState}`);
      if (this.currentState === TUTORIAL_STATES.QUEST_OFFERED ||
          this.currentState === TUTORIAL_STATES.DIALOGUE_STARTED ||
          this.currentState === TUTORIAL_STATES.QUEST_OBJECTIVE_TRACKING) {
        console.log(`[TutorialStateMachine] Transitioning to QUEST_ACCEPTED from ${this.currentState}`);
        await this.transitionTo(TUTORIAL_STATES.QUEST_ACCEPTED, data);
      } else {
        // If we're not in the expected state, try to sync with backend
        console.log(`[TutorialStateMachine] Current state ${this.currentState} doesn't match expected states, syncing with backend...`);
        try {
          const response = await tutorialApi.getState(this.characterId);
          if (response.success && response.data) {
            const backendState = response.data.state;
            if (backendState === TUTORIAL_STATES.QUEST_ACCEPTED || backendState === TUTORIAL_STATES.QUEST_OBJECTIVE_TRACKING) {
              console.log(`[TutorialStateMachine] Backend state is ${backendState}, syncing...`);
              this.currentState = backendState;
              this.completedStates = new Set(response.data.completedStates || []);
              this.notifyListeners('stateChanged', {
                oldState: this.currentState,
                newState: backendState
              });
            }
          }
        } catch (error) {
          console.error(`[TutorialStateMachine] Failed to sync state:`, error);
        }
      }
    });
    
    // Combat intro
    tutorialEventBus.on(TUTORIAL_EVENTS.COMBAT_INTRO, async (data) => {
      console.log(`[TutorialStateMachine] COMBAT_INTRO event received, currentState: ${this.currentState}`);
      
      // First, ensure we're in a valid state for combat intro
      // If we're not in QUEST_ACCEPTED, try to sync with backend first
      if (this.currentState !== TUTORIAL_STATES.QUEST_ACCEPTED && 
          this.currentState !== TUTORIAL_STATES.QUEST_OBJECTIVE_TRACKING &&
          this.currentState !== TUTORIAL_STATES.DIALOGUE_STARTED) {
        console.log(`[TutorialStateMachine] Current state ${this.currentState} not ideal for COMBAT_INTRO, syncing with backend...`);
        try {
          const response = await tutorialApi.getState(this.characterId);
          if (response.success && response.data) {
            const backendState = response.data.state;
            console.log(`[TutorialStateMachine] Backend state: ${backendState}`);
            if (backendState === TUTORIAL_STATES.QUEST_ACCEPTED || 
                backendState === TUTORIAL_STATES.QUEST_OBJECTIVE_TRACKING ||
                backendState === TUTORIAL_STATES.DIALOGUE_STARTED) {
              this.currentState = backendState;
              this.completedStates = new Set(response.data.completedStates || []);
              this.notifyListeners('stateChanged', {
                oldState: this.currentState,
                newState: backendState
              });
              console.log(`[TutorialStateMachine] Synced to ${backendState}, now transitioning to COMBAT_INTRO`);
            }
          }
        } catch (error) {
          console.error(`[TutorialStateMachine] Failed to sync state:`, error);
        }
      }
      
      // Allow transition from quest_accepted, quest_objective_tracking, or dialogue_started states
      // Also allow if we're in any state that comes before COMBAT_INTRO in the order
      const currentIndex = STATE_ORDER.indexOf(this.currentState);
      const combatIntroIndex = STATE_ORDER.indexOf(TUTORIAL_STATES.COMBAT_INTRO);
      
      if (this.currentState === TUTORIAL_STATES.QUEST_ACCEPTED || 
          this.currentState === TUTORIAL_STATES.QUEST_OBJECTIVE_TRACKING ||
          this.currentState === TUTORIAL_STATES.DIALOGUE_STARTED ||
          (currentIndex >= 0 && currentIndex < combatIntroIndex)) {
        console.log(`[TutorialStateMachine] Transitioning to COMBAT_INTRO from ${this.currentState} (index ${currentIndex} -> ${combatIntroIndex})`);
        await this.transitionTo(TUTORIAL_STATES.COMBAT_INTRO, data);
      } else {
        console.warn(`[TutorialStateMachine] Cannot transition to COMBAT_INTRO from state: ${this.currentState} (index ${currentIndex}, combat intro index ${combatIntroIndex})`);
        // Veil transition anyway if we're past combat intro (shouldn't happen, but be safe)
        if (currentIndex > combatIntroIndex) {
          console.log(`[TutorialStateMachine] Forcing transition to COMBAT_INTRO despite being past it`);
          await this.transitionTo(TUTORIAL_STATES.COMBAT_INTRO, data);
        }
      }
    });
    
    // Combat
    tutorialEventBus.on(TUTORIAL_EVENTS.COMBAT_STARTED, (data) => {
      if (data.isTutorial) {
        this.transitionTo(TUTORIAL_STATES.COMBAT_STARTED, data);
      }
    });
    
    tutorialEventBus.on(TUTORIAL_EVENTS.COMBAT_ENDED, (data) => {
      if (data.isTutorial) {
        this.transitionTo(TUTORIAL_STATES.COMBAT_COMPLETE, data);
        // After combat completes, immediately transition to vendor intro
        // Combat ending is an action, so this transition happens automatically
        this.transitionTo(TUTORIAL_STATES.VENDOR_INTRO, { ...data, fromCombat: true });
      }
    });
    
    // Items
    tutorialEventBus.on(TUTORIAL_EVENTS.ITEM_ADDED, (data) => {
      if (this.currentState === TUTORIAL_STATES.COMBAT_COMPLETE ||
          this.currentState === TUTORIAL_STATES.LOOT_RECEIVED) {
        this.transitionTo(TUTORIAL_STATES.LOOT_RECEIVED, data);
      }
    });
    
    tutorialEventBus.on(TUTORIAL_EVENTS.ITEM_USED, (data) => {
      if (data.itemId === 'medpac_01' || data.itemType === 'consumable') {
        // Allow medpac usage if we're in inventory tutorial states
        if (this.currentState === TUTORIAL_STATES.HEALING_EXPLAINED ||
            this.currentState === TUTORIAL_STATES.INVENTORY_OPENED ||
            this.currentState === TUTORIAL_STATES.LOOT_RECEIVED) {
          this.transitionTo(TUTORIAL_STATES.MEDPAC_USED, data);
          // Player will click "Next" on the modal to proceed to HUD_HEALTH_STAMINA_EXPLAINED
        }
      }
    });
    
    // Inventory
    tutorialEventBus.on(TUTORIAL_EVENTS.UI_OPENED_INVENTORY, (data) => {
      if (this.currentState === TUTORIAL_STATES.LOOT_RECEIVED ||
          this.currentState === TUTORIAL_STATES.INVENTORY_OPENED) {
        this.transitionTo(TUTORIAL_STATES.INVENTORY_OPENED, data);
        // Player will click "Next" on the modal to proceed to HEALING_EXPLAINED
      }
    });
    
    // Vendor
    tutorialEventBus.on(TUTORIAL_EVENTS.UI_OPENED_VENDOR, (data) => {
      if (this.currentState === TUTORIAL_STATES.VENDOR_INTRO ||
          this.currentState === TUTORIAL_STATES.VENDOR_OPENED) {
        this.transitionTo(TUTORIAL_STATES.VENDOR_OPENED, data);
      }
    });
    
    tutorialEventBus.on(TUTORIAL_EVENTS.ITEM_HOVERED, (data) => {
      if (this.currentState === TUTORIAL_STATES.VENDOR_OPENED) {
        this.transitionTo(TUTORIAL_STATES.VENDOR_ITEM_HOVER_EXPLAINED, data);
      }
    });
    
    tutorialEventBus.on(TUTORIAL_EVENTS.ITEM_BOUGHT, (data) => {
      // Check if this is a medpac purchase during tutorial
      if (data.itemId === 'medpac_01' && 
          (this.currentState === TUTORIAL_STATES.VENDOR_BUY_MEDPAC ||
           this.currentState === TUTORIAL_STATES.VENDOR_ITEM_HOVER_EXPLAINED)) {
        this.transitionTo(TUTORIAL_STATES.ITEM_BOUGHT, data);
        // Player will click "Next" on the modal to proceed to VENDOR_SELL_DROID_PARTS
      } else if (this.currentState === TUTORIAL_STATES.VENDOR_BUY_MEDPAC ||
                 this.currentState === TUTORIAL_STATES.ITEM_BOUGHT) {
        this.transitionTo(TUTORIAL_STATES.ITEM_BOUGHT, data);
      }
    });
    
    tutorialEventBus.on(TUTORIAL_EVENTS.ITEM_SOLD, (data) => {
      // Check if this is droid parts being sold during tutorial
      if (data.itemId === 'droid_parts' && 
          (this.currentState === TUTORIAL_STATES.VENDOR_SELL_DROID_PARTS ||
           this.currentState === TUTORIAL_STATES.ITEM_BOUGHT)) {
        this.transitionTo(TUTORIAL_STATES.ITEM_SOLD, data);
        // Player will click "Next" on the modal to proceed to LOOT_RECEIVED
      } else if (this.currentState === TUTORIAL_STATES.VENDOR_SELL_DROID_PARTS ||
                 this.currentState === TUTORIAL_STATES.ITEM_SOLD) {
        this.transitionTo(TUTORIAL_STATES.ITEM_SOLD, data);
        // Player will click "Next" on the modal to proceed to LOOT_RECEIVED
      }
    });
    
    // Travel
    tutorialEventBus.on(TUTORIAL_EVENTS.UI_OPENED_GALAXYMAP, (data) => {
      if (this.currentState === TUTORIAL_STATES.TRAVEL_INTRO ||
          this.currentState === TUTORIAL_STATES.GALAXY_MAP_OPENED) {
        this.transitionTo(TUTORIAL_STATES.GALAXY_MAP_OPENED, data);
      }
    });
    
    tutorialEventBus.on(TUTORIAL_EVENTS.TRAVEL_INITIATED, (data) => {
      if (this.currentState === TUTORIAL_STATES.GALAXY_MAP_OPENED ||
          this.currentState === TUTORIAL_STATES.TRAVEL_INITIATED) {
        this.transitionTo(TUTORIAL_STATES.TRAVEL_INITIATED, data);
      }
    });
    
    // Sub-map
    tutorialEventBus.on(TUTORIAL_EVENTS.SUBMAP_ENTERED, (data) => {
      if (this.currentState === TUTORIAL_STATES.SUBMAP_ENTRY_INTRO ||
          this.currentState === TUTORIAL_STATES.SUBMAP_ENTERED) {
        this.transitionTo(TUTORIAL_STATES.SUBMAP_ENTERED, data);
      }
    });
    
    // Quest completed
    tutorialEventBus.on(TUTORIAL_EVENTS.QUEST_COMPLETED, (data) => {
      if (data.questId === 'tutorial_001_dockside_initiation') {
        this.transitionTo(TUTORIAL_STATES.TUTORIAL_COMPLETE, data);
      }
    });
    
    // Planet Surface Tutorial Events
    tutorialEventBus.on(TUTORIAL_EVENTS.PLANET_SURFACE_ENTERED, (data) => {
      if (this.currentState === TUTORIAL_STATES.SPACEPORT_EXIT_EXPLAINED ||
          (!this.isStateCompleted(TUTORIAL_STATES.PLANET_SURFACE_INTRO) && 
           data.fromSpaceport)) {
        this.transitionTo(TUTORIAL_STATES.PLANET_SURFACE_INTRO, data);
      }
    });
    
    tutorialEventBus.on(TUTORIAL_EVENTS.PLAYER_MOVED, (data) => {
      // Handle planet surface movement tutorial
      if (this.currentState === TUTORIAL_STATES.PLANET_SURFACE_INTRO && 
          data.location === 'planet_surface') {
        this.transitionTo(TUTORIAL_STATES.PLANET_SURFACE_MOVEMENT, data);
      }
    });
    
    tutorialEventBus.on(TUTORIAL_EVENTS.POI_CLICKED, (data) => {
      if (this.currentState === TUTORIAL_STATES.PLANET_SURFACE_MOVEMENT ||
          this.currentState === TUTORIAL_STATES.PLANET_SURFACE_INTRO ||
          !this.isStateCompleted(TUTORIAL_STATES.POI_DISCOVERED)) {
        this.transitionTo(TUTORIAL_STATES.POI_DISCOVERED, data);
      }
    });
    
    tutorialEventBus.on(TUTORIAL_EVENTS.POI_MENU_OPENED, (data) => {
      if (this.currentState === TUTORIAL_STATES.POI_DISCOVERED ||
          !this.isStateCompleted(TUTORIAL_STATES.POI_INTERACTION_MENU_OPENED)) {
        this.transitionTo(TUTORIAL_STATES.POI_INTERACTION_MENU_OPENED, data);
      }
    });
    
    tutorialEventBus.on(TUTORIAL_EVENTS.POI_ENTERED, (data) => {
      if (this.currentState === TUTORIAL_STATES.POI_INTERACTION_MENU_OPENED ||
          !this.isStateCompleted(TUTORIAL_STATES.POI_ENTERED)) {
        this.transitionTo(TUTORIAL_STATES.POI_ENTERED, data);
      }
    });
    
    tutorialEventBus.on(TUTORIAL_EVENTS.POI_INVESTIGATED, (data) => {
      if (this.currentState === TUTORIAL_STATES.POI_INTERACTION_MENU_OPENED ||
          !this.isStateCompleted(TUTORIAL_STATES.POI_INVESTIGATED)) {
        this.transitionTo(TUTORIAL_STATES.POI_INVESTIGATED, data);
      }
    });
    
    tutorialEventBus.on(TUTORIAL_EVENTS.PLANET_NPC_CLICKED, (data) => {
      if (data.location === 'planet_surface' &&
          (this.currentState === TUTORIAL_STATES.POI_ENTERED ||
           !this.isStateCompleted(TUTORIAL_STATES.PLANET_NPC_CLICKED))) {
        this.transitionTo(TUTORIAL_STATES.PLANET_NPC_CLICKED, data);
      }
    });
    
    tutorialEventBus.on(TUTORIAL_EVENTS.DIALOGUE_STARTED, (data) => {
      // Check if this is a planet surface dialogue (not tutorial NPC)
      if (data.location === 'planet_surface' &&
          !data.isTutorialNPC &&
          (this.currentState === TUTORIAL_STATES.PLANET_NPC_CLICKED ||
           !this.isStateCompleted(TUTORIAL_STATES.PLANET_NPC_DIALOGUE_STARTED))) {
        this.transitionTo(TUTORIAL_STATES.PLANET_NPC_DIALOGUE_STARTED, data);
      }
    });
    
    tutorialEventBus.on(TUTORIAL_EVENTS.QUEST_OFFERED, (data) => {
      // Check if this is a planet surface quest (not tutorial quest)
      if (data.location === 'planet_surface' &&
          data.questId !== 'tutorial_001_dockside_initiation' &&
          (this.currentState === TUTORIAL_STATES.PLANET_NPC_DIALOGUE_STARTED ||
           !this.isStateCompleted(TUTORIAL_STATES.QUEST_FOUND))) {
        this.transitionTo(TUTORIAL_STATES.QUEST_FOUND, data);
      }
    });
    
    tutorialEventBus.on(TUTORIAL_EVENTS.QUEST_OBJECTIVE_LOCATION_REACHED, (data) => {
      if (this.currentState === TUTORIAL_STATES.QUEST_ACCEPTED ||
          (this.isStateCompleted(TUTORIAL_STATES.QUEST_ACCEPTED) && 
           !this.isStateCompleted(TUTORIAL_STATES.QUEST_OBJECTIVE_LOCATION_REACHED))) {
        this.transitionTo(TUTORIAL_STATES.QUEST_OBJECTIVE_LOCATION_REACHED, data);
      }
    });
    
    tutorialEventBus.on(TUTORIAL_EVENTS.QUEST_OBJECTIVE_COMPLETED, (data) => {
      if (this.currentState === TUTORIAL_STATES.QUEST_OBJECTIVE_LOCATION_REACHED ||
          data.isFirstObjective) {
        this.transitionTo(TUTORIAL_STATES.QUEST_OBJECTIVE_COMPLETED, data);
      }
    });
    
    tutorialEventBus.on(TUTORIAL_EVENTS.QUEST_READY_TO_TURN_IN, (data) => {
      if (this.currentState === TUTORIAL_STATES.QUEST_OBJECTIVE_COMPLETED ||
          (this.isStateCompleted(TUTORIAL_STATES.QUEST_OBJECTIVE_COMPLETED) &&
           !this.isStateCompleted(TUTORIAL_STATES.QUEST_RETURN_TO_GIVER))) {
        this.transitionTo(TUTORIAL_STATES.QUEST_RETURN_TO_GIVER, data);
      }
    });
    
    // Advanced Mechanics
    tutorialEventBus.on(TUTORIAL_EVENTS.LOCKPICKING_FAILED_NO_SKILL, (data) => {
      if (data.reason === 'Lockpicking skill not unlocked' &&
          !this.isStateCompleted(TUTORIAL_STATES.LOCKPICKING_SKILL_REQUIRED)) {
        this.transitionTo(TUTORIAL_STATES.LOCKPICKING_SKILL_REQUIRED, data);
      }
    });
    
    tutorialEventBus.on(TUTORIAL_EVENTS.LEVEL_UP, (data) => {
      if (!this.isStateCompleted(TUTORIAL_STATES.LEVEL_UP_OCCURRED) ||
          data.isFirstLevelUpOnPlanet) {
        this.transitionTo(TUTORIAL_STATES.LEVEL_UP_OCCURRED, data);
      }
    });
    
    tutorialEventBus.on(TUTORIAL_EVENTS.SKILL_POINTS_AVAILABLE, (data) => {
      if ((this.currentState === TUTORIAL_STATES.LEVEL_UP_OCCURRED ||
           this.isStateCompleted(TUTORIAL_STATES.LEVEL_UP_OCCURRED)) &&
          !this.isStateCompleted(TUTORIAL_STATES.SKILL_POINTS_AVAILABLE)) {
        this.transitionTo(TUTORIAL_STATES.SKILL_POINTS_AVAILABLE, data);
      }
    });
    
    tutorialEventBus.on(TUTORIAL_EVENTS.FAST_TRAVEL_OPTION_SHOWN, (data) => {
      if (data.poiType === 'spaceport' &&
          !this.isStateCompleted(TUTORIAL_STATES.FAST_TRAVEL_DISCOVERED)) {
        this.transitionTo(TUTORIAL_STATES.FAST_TRAVEL_DISCOVERED, data);
      }
    });
    
    tutorialEventBus.on(TUTORIAL_EVENTS.RANDOM_ENCOUNTER_TRIGGERED, (data) => {
      if (data.location === 'planet_surface' &&
          !this.isStateCompleted(TUTORIAL_STATES.RANDOM_ENCOUNTER_TRIGGERED)) {
        this.transitionTo(TUTORIAL_STATES.RANDOM_ENCOUNTER_TRIGGERED, data);
      }
    });
  }
  
  /**
   * Save state to backend
   */
  async saveState() {
    try {
      await tutorialApi.updateState(this.characterId, {
        state: this.currentState,
        completedStates: Array.from(this.completedStates),
        milestones: this.milestones
      });
    } catch (error) {
      console.error('[TutorialStateMachine] Failed to save state:', error);
    }
  }
  
  /**
   * Complete a step
   */
  async completeStep(stepId, stepData = {}) {
    try {
      await tutorialApi.completeStep(this.characterId, stepId, stepData);
      this.completedStates.add(stepId);
      this.milestones[stepId] = {
        completedAt: new Date().toISOString(),
        ...stepData
      };
      await this.saveState();
    } catch (error) {
      console.error('[TutorialStateMachine] Failed to complete step:', error);
    }
  }
  
  /**
   * Start tutorial
   */
  async start() {
    try {
      const response = await tutorialApi.start(this.characterId);
      
      if (response.success && response.data) {
        // Update state from backend response
        const progress = response.data.progress;
        const backendState = progress?.state;
        
        if (backendState) {
          const oldState = this.currentState;
          this.currentState = backendState;
          
          // Sync completed states and milestones from backend if provided
          // Only sync if the tutorial is actually in progress (not just starting)
          if (progress.completedStates && Array.isArray(progress.completedStates)) {
            this.completedStates = new Set(progress.completedStates);
            console.log(`[TutorialStateMachine] Loaded completed states from backend:`, Array.from(this.completedStates));
          } else {
            // If no completed states from backend, start fresh
            this.completedStates = new Set();
          }
          
          // Don't auto-add current state to completed states - let the player complete it
          // Only add if it's explicitly in the backend's completedStates array
          if (progress.milestones) {
            this.milestones = progress.milestones;
          }
          
          // Don't save state here - backend already saved it
          // Just notify listeners of the state change
          this.notifyListeners('stateChanged', {
            oldState,
            newState: backendState
          });
          
          console.log(`[TutorialStateMachine] Tutorial started, state: ${backendState}`);
        } else {
          // Fallback: transition manually
          console.warn('[TutorialStateMachine] Backend response missing state, transitioning manually');
          await this.transitionTo(TUTORIAL_STATES.STARTING);
          await this.transitionTo(TUTORIAL_STATES.ORIENT_UI);
        }
      } else {
        // Fallback: transition manually even if API response is unexpected
        console.warn('[TutorialStateMachine] Unexpected API response, transitioning manually');
        await this.transitionTo(TUTORIAL_STATES.STARTING);
        await this.transitionTo(TUTORIAL_STATES.ORIENT_UI);
      }
    } catch (error) {
      console.error('[TutorialStateMachine] Failed to start tutorial:', error);
      // Try to transition anyway so tutorial can still show
      try {
        await this.transitionTo(TUTORIAL_STATES.STARTING);
        await this.transitionTo(TUTORIAL_STATES.ORIENT_UI);
      } catch (transitionError) {
        console.error('[TutorialStateMachine] Failed to transition states:', transitionError);
      }
    }
  }
  
  /**
   * Complete tutorial
   */
  async complete() {
    try {
      await tutorialApi.complete(this.characterId);
      await this.transitionTo(TUTORIAL_STATES.TUTORIAL_COMPLETE);
      await this.transitionTo(TUTORIAL_STATES.MOMENTUM_HANDOFF);
    } catch (error) {
      console.error('[TutorialStateMachine] Failed to complete tutorial:', error);
    }
  }
  
  /**
   * Skip tutorial
   */
  async skip() {
    try {
      await tutorialApi.skip(this.characterId);
      await this.transitionTo(TUTORIAL_STATES.TUTORIAL_SKIPPED);
    } catch (error) {
      console.error('[TutorialStateMachine] Failed to skip tutorial:', error);
    }
  }
  
  /**
   * Add state change listener
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }
  
  /**
   * Remove state change listener
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
   * Notify listeners
   */
  notifyListeners(event, data) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[TutorialStateMachine] Error in listener for ${event}:`, error);
        }
      });
    }
  }
  
  /**
   * Get current state
   */
  getState() {
    return this.currentState;
  }
  
  /**
   * Check if state is completed
   */
  isStateCompleted(state) {
    return this.completedStates.has(state);
  }
  
  /**
   * Check if tutorial is active
   */
  isActive() {
    // Tutorial is active if it's in any state except not_started, complete, or skipped
    // Include STARTING and ORIENT_UI as active states
    return this.currentState !== TUTORIAL_STATES.NOT_STARTED &&
           this.currentState !== TUTORIAL_STATES.TUTORIAL_COMPLETE &&
           this.currentState !== TUTORIAL_STATES.TUTORIAL_SKIPPED;
  }
  
  /**
   * Cleanup
   */
  destroy() {
    tutorialEventBus.removeAllListeners();
    this.listeners.clear();
  }
}

export default TutorialStateMachine;

