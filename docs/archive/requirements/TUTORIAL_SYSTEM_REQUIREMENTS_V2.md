# Tutorial System Requirements & Integration Plan v2.0
## Comprehensive Onboarding System - Consultant Feedback Integrated

**Date:** December 2024  
**Status:** Updated Requirements Based on Consultant Review  
**Priority:** Critical (Addresses Primary Player Churn Issue)  
**Version:** 2.0 (Rebaselined on Actual Codebase)

---

## Executive Summary

This document provides a **comprehensive, updated tutorial system requirements and integration plan** that addresses consultant feedback and is **re-baselined on the actual current codebase**. The original proposal correctly identified the core problem (new players lack guidance) and the right solution shape (hybrid tutorial quest + overlay system), but required significant updates to:

1. **Match actual product reality** - Tutorial must teach the systems that actually exist
2. **Expand scope appropriately** - Include inventory, healing, vendors, travel, sub-maps in first 10-20 minutes
3. **Build resilient architecture** - Event-driven state machine with persistence, not fragile step integers

**Key Changes from v1.0:**
- ✅ Re-baselined on actual UI pages and routes (`PlanetSurface`, `SubMapView`, `GalaxyMap`, `InventoryView`, `TradingView`)
- ✅ Expanded tutorial scope to include all early-game loops (inventory/healing, vendor, travel, sub-maps)
- ✅ Event-driven architecture with state machine for reliability
- ✅ Narrative integration with background/species reactivity
- ✅ Momentum handoff with choice-based next steps
- ✅ Dialogue scaffolding to prevent "blank prompt" churn

---

## Table of Contents

1. [Consultant Feedback Analysis](#consultant-feedback-analysis)
2. [Current System Reality Check](#current-system-reality-check)
3. [Updated Tutorial Requirements](#updated-tutorial-requirements)
4. [Technical Architecture](#technical-architecture)
5. [Tutorial Content & Flow](#tutorial-content--flow)
6. [Implementation Plan](#implementation-plan)
7. [Success Metrics](#success-metrics)

---

## 1. Consultant Feedback Analysis

### 1.1 Key Findings from Consultant Review

The consultant panel (UX Director, Game Systems Designer, Technical Architect, Narrative Designer, LiveOps Specialist) identified **three critical issues** with the original proposal:

#### Issue 1: Out of Sync with Product Reality
- **Problem:** Proposal referenced "Phase 1 foundation" messaging, but codebase contains full systems
- **Impact:** Tutorial would teach wrong UI and wrong mental model
- **Solution:** Re-baseline all tutorial content on actual current codebase

#### Issue 2: Tutorial Scope Too Narrow
- **Problem:** Only taught movement → talk → quest → combat → turn-in
- **Missing:** Inventory/healing, vendors, travel, sub-maps, factions, discovery
- **Impact:** Players still confused after tutorial, leading to churn
- **Solution:** Expand to 3-layer approach: Core loop → Practical extension → Macro fantasy

#### Issue 3: Missing Critical Technical "Glue"
- **Problem:** No event hooks, fragile UI targeting, no state machine, no reload safety
- **Impact:** Tutorial would break easily and be unreliable
- **Solution:** Build resilient tutorial engine (event-driven + state machine + persistence)

### 1.2 Consultant Recommendations

#### Critical Priority
1. **Re-baseline tutorial plan** to match actual current UI/flows
2. **Expand tutorial scope** to include inventory/healing + travel/sub-map + vendor basics
3. **Build resilient tutorial engine** (event-driven + state machine + persistence)

#### High Priority
4. Add dialogue scaffolding (suggested replies/goals) to prevent "blank prompt churn"
5. Add momentum handoff: immediate next quests with different fantasies
6. Add skip + "resume later" that doesn't strand players

#### Medium Priority
7. Integrate character creation guidance (preview starting conditions)
8. Add tooltips for sub-map transitions and lockpicking gates

### 1.3 What the Original Proposal Got Right

✅ **Hybrid approach** (tutorial quest + overlay system) is correct  
✅ **Core sequence** (movement → NPC → dialogue → quest → combat) is solid  
✅ **Consultant requirements** (guided quest, contextual pop-ups, tutorial combat, rewards) are addressed  
✅ **KPI thinking** (completion rate, time-to-first-quest) is good

---

## 2. Current System Reality Check

### 2.1 Actual UI Pages & Routes

Based on codebase analysis (`frontend/src/App.jsx`):

| Route | Component | Status | Tutorial Relevance |
|-------|-----------|--------|-------------------|
| `/game` | `GameWorld.jsx` | Hub shell | Entry point, but players quickly navigate to planet |
| `/game/planet/:planetId` | `PlanetSurface.jsx` | **Primary tutorial surface** | Movement, NPCs, POIs, sub-map entry |
| `/game/location/:planetId/:parentLocationId/:parentLocationType/:type` | `SubMapView.jsx` | **Critical for tutorial** | Sub-map navigation, lockpicking, building interiors |
| `/game/galaxy` | `GalaxyMap.jsx` | **Must be taught** | Travel system, planet selection |
| `/game/inventory` | `InventoryView.jsx` | **Must be taught** | Inventory, equipment, item usage |
| `/game/vendor/:npcId` | `TradingView.jsx` | **Must be taught** | Buying, selling, credits |
| `/game/quests` | `QuestLog.jsx` | Quest tracking | Quest log introduction |
| `/game/combat/:encounterId` | `CombatView.jsx` | Combat system | Tutorial combat encounter |
| `/game/factions` | `FactionView.jsx` | Faction system | Faction introduction (tease) |
| `/game/exploration` | `ExplorationJournal.jsx` | Discovery system | Discovery/journal introduction (tease) |

### 2.2 Actual Game Systems (Implemented)

| System | Evidence | Tutorial Priority | Notes |
|--------|----------|-------------------|-------|
| **Character Creation** | 5-step wizard | High | Add light guidance, preview starting conditions |
| **Planet Surface** | `PlanetSurface.jsx` | **Critical** | Movement (WASD/arrows), NPC interaction, POI entry |
| **Sub-Maps** | `SubMapView.jsx` | **Critical** | Enter/exit, lockpicking, building interiors |
| **NPC Interaction** | `NPCInteractionMenu.jsx` | **Critical** | Click NPC → menu → Talk/Quest/Shop/Attack |
| **Dialogue** | `DialogueInterface.jsx` | **Critical** | AI-powered, needs scaffolding (suggested replies) |
| **Combat** | `CombatView.jsx` | **Critical** | Turn-based, action menu, turn order, targeting |
| **Inventory** | `InventoryView.jsx`, `InventoryOverlay.jsx` | **Critical** | Items, equipment, consumables (medpac usage) |
| **Vendors/Trading** | `TradingView.jsx` | **High** | Buy/sell, credits, prices |
| **Galaxy Map/Travel** | `GalaxyMap.jsx` | **High** | System selection, planet selection, travel |
| **Quests** | Quest system | **Critical** | Quest log, acceptance, objectives, completion |
| **Factions** | `FactionView.jsx` | Medium | Reputation, consequences (tease in tutorial) |
| **Discovery/Journal** | `ExplorationJournal.jsx` | Medium | Achievements, discoveries (tease in tutorial) |
| **Crafting** | `CraftingView.jsx` | Low | Too heavy for tutorial, but tease |
| **Lockpicking** | Lockpicking routes | Medium | Common early "stuck" point, needs hint |

### 2.3 Entry Point Reality

**Actual Flow:**
1. Character creation completes → redirects to `/game` (`GameWorld.jsx`)
2. `GameWorld.jsx` is a hub with quick actions (Quest Log, Galaxy Map, NPCs, Inventory, Factions, Test Combat)
3. Players typically navigate to `/game/planet/:planetId` (`PlanetSurface.jsx`) immediately
4. `PlanetSurface.jsx` is the **primary game surface** with:
   - Canvas-based planet map
   - Player icon (movable with WASD/arrows)
   - NPC icons (clickable)
   - POI icons (clickable for sub-map entry)
   - HUD overlay (health, stamina, XP, quest tracker)

**Tutorial Must Handle:**
- Tutorial can start on `GameWorld.jsx` (hub) OR `PlanetSurface.jsx` (planet surface)
- Must detect which page player is on and show appropriate tooltips
- Must handle navigation between pages during tutorial

---

## 3. Updated Tutorial Requirements

### 3.1 Core Requirements (From Original Consultant Feedback)

✅ **Guided First Quest** - Tutorial framed as player's first quest  
✅ **Contextual Pop-ups** - Non-intrusive tooltips introducing concepts one at a time  
✅ **Tutorial Combat** - Scripted, simplified combat with UI callouts  
✅ **Reward & Next Steps** - Clear completion reward and direction

### 3.2 Expanded Requirements (From Consultant Review)

#### 3.2.1 Expanded Scope (3-Layer Approach)

**Layer 1: Core Loop Win (5-7 minutes)**
- Movement → NPC interaction → Dialogue → Quest acceptance → Combat → Loot → Heal → Turn-in

**Layer 2: Practical Loop Extension (3-5 minutes)**
- Inventory/equipment → Vendor (sell/buy) → Sub-map entry/exit → Travel (galaxy map)

**Layer 3: Macro Fantasy Tease (2-3 minutes)**
- Faction introduction → Discovery/journal → Long-term goals → Choice handoff

#### 3.2.2 Dialogue Scaffolding

**Requirement:** Prevent "blank prompt" churn by providing:
- 2-3 suggested reply options (player can still type freely)
- Conversation goals ("Ask about quests", "Learn about the planet")
- Contextual hints based on NPC type and situation

#### 3.2.3 Narrative Integration

**Requirement:** Tutorial must feel like **first chapter**, not training overlay:
- Diegetic framing (spaceport orientation, dock liaison, faction recruiter)
- Background/species reactivity (different mentor, starting location, combat scenario)
- Dynamic dialogue based on player identity

#### 3.2.4 Momentum Handoff

**Requirement:** Tutorial completion must provide **immediate next steps**:
- Choice of 3 leads (Faction / Profit / Exploration)
- Each lead points to different system/fantasy
- Prevents "what do I do now?" confusion

#### 3.2.5 Technical Resilience

**Requirement:** Tutorial engine must be:
- **Event-driven** (subscribe to game events, not scrape UI state)
- **State machine-based** (explicit states + guards, handles out-of-order completion)
- **Persistence-safe** (survives reloads, saves, edge cases)
- **UI-agnostic** (targets survive refactors, graceful fallbacks)

---

## 4. Technical Architecture

### 4.1 Tutorial Engine Architecture

#### 4.1.1 Event Bus System

**Location:** `frontend/src/services/tutorialEventBus.js`

**Purpose:** Lightweight client event bus that emits canonical game events

**Events:**
```javascript
// Player actions
'player.moved'                    // { x, y, planetId }
'player.spawned'                  // { planetId, location }
'player.health.changed'           // { current, max }
'player.stamina.changed'          // { current, max }

// UI interactions
'ui.opened.inventory'             // { characterId }
'ui.opened.questlog'              // { characterId }
'ui.opened.galaxymap'             // { characterId }
'ui.opened.factions'              // { characterId }
'ui.closed.inventory'             // { characterId }

// NPC interactions
'npc.interaction.opened'           // { npcId, npcName, planetId }
'npc.interaction.closed'           // { npcId }
'dialogue.started'                 // { npcId, characterId }
'dialogue.message.sent'            // { npcId, message }
'dialogue.message.received'        // { npcId, response }

// Quest system
'quest.accepted'                   // { questId, questTitle, characterId }
'quest.objective.completed'        // { questId, objectiveId, characterId }
'quest.completed'                  // { questId, characterId, rewards }

// Combat
'combat.started'                  // { encounterId, characterId, isTutorial }
'combat.turn.started'             // { encounterId, combatantId, isPlayer }
'combat.action.performed'         // { encounterId, action, target }
'combat.ended'                    // { encounterId, result, rewards }

// Items
'item.added'                      // { characterId, itemId, quantity, source }
'item.equipped'                   // { characterId, itemId, slot }
'item.used'                       // { characterId, itemId, effect }
'item.sold'                       // { characterId, itemId, quantity, credits }

// Travel
'travel.initiated'                // { fromPlanetId, toPlanetId, characterId }
'travel.completed'                 // { planetId, characterId }

// Sub-maps
'submap.entered'                  // { subMapId, parentLocationId, characterId }
'submap.exited'                   // { subMapId, characterId }
'lockpicking.started'             // { doorId, subMapId }
'lockpicking.completed'           // { doorId, success }
```

**Implementation:**
```javascript
class TutorialEventBus {
  constructor() {
    this.listeners = new Map();
  }
  
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }
  
  off(event, callback) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) callbacks.splice(index, 1);
    }
  }
  
  emit(event, data) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }
}

export const tutorialEventBus = new TutorialEventBus();
```

#### 4.1.2 Tutorial State Machine

**Location:** `frontend/src/services/tutorialStateMachine.js`

**Purpose:** Explicit state machine with guards to handle out-of-order completion

**States:**
```javascript
const TUTORIAL_STATES = {
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
  ITEM_EQUIPPED: 'item_equipped', // Optional if loot is equippable
  HEALING_EXPLAINED: 'healing_explained',
  MEDPAC_USED: 'medpac_used', // OR health threshold reached
  
  // Vendor
  VENDOR_INTRO: 'vendor_intro',
  VENDOR_OPENED: 'vendor_opened',
  ITEM_SOLD: 'item_sold',
  ITEM_BOUGHT: 'item_bought',
  
  // Travel
  TRAVEL_INTRO: 'travel_intro',
  GALAXY_MAP_OPENED: 'galaxy_map_opened',
  TRAVEL_INITIATED: 'travel_initiated',
  TRAVEL_COMPLETE: 'travel_complete',
  
  // Completion
  QUEST_TURN_IN: 'quest_turn_in',
  TUTORIAL_COMPLETE: 'tutorial_complete',
  MOMENTUM_HANDOFF: 'momentum_handoff'
};
```

**State Machine Implementation:**
```javascript
class TutorialStateMachine {
  constructor(characterId) {
    this.characterId = characterId;
    this.currentState = TUTORIAL_STATES.NOT_STARTED;
    this.completedStates = new Set();
    this.milestones = {};
    
    // State transition rules
    this.transitions = {
      [TUTORIAL_STATES.NOT_STARTED]: {
        canTransitionTo: [TUTORIAL_STATES.STARTING],
        onEnter: () => this.handleStarting()
      },
      [TUTORIAL_STATES.STARTING]: {
        canTransitionTo: [TUTORIAL_STATES.ORIENT_UI],
        onEnter: () => this.handleOrientUI()
      },
      [TUTORIAL_STATES.ORIENT_UI]: {
        canTransitionTo: [TUTORIAL_STATES.MOVEMENT_INTRO],
        onEnter: () => this.handleMovementIntro()
      },
      [TUTORIAL_STATES.MOVEMENT_INTRO]: {
        canTransitionTo: [TUTORIAL_STATES.MOVEMENT_COMPLETE],
        onEnter: () => this.handleMovementIntro(),
        guards: {
          'player.moved': (data) => this.checkMovementComplete(data)
        }
      },
      // ... more states
    };
    
    // Subscribe to events
    this.setupEventListeners();
  }
  
  transitionTo(newState, data = {}) {
    const current = this.transitions[this.currentState];
    if (current && current.canTransitionTo.includes(newState)) {
      this.currentState = newState;
      this.completedStates.add(newState);
      const next = this.transitions[newState];
      if (next && next.onEnter) {
        next.onEnter(data);
      }
      this.saveState();
    } else {
      // Check if state can be auto-advanced (out of order completion)
      this.checkAutoAdvance(newState, data);
    }
  }
  
  checkAutoAdvance(newState, data) {
    // If player completes a later step, auto-advance through intermediate states
    const stateIndex = Object.values(TUTORIAL_STATES).indexOf(newState);
    const currentIndex = Object.values(TUTORIAL_STATES).indexOf(this.currentState);
    
    if (stateIndex > currentIndex) {
      // Auto-advance through skipped states
      const skippedStates = Object.values(TUTORIAL_STATES).slice(currentIndex + 1, stateIndex);
      skippedStates.forEach(state => {
        this.completedStates.add(state);
        this.milestones[state] = { autoAdvanced: true, timestamp: Date.now() };
      });
      this.transitionTo(newState, data);
    }
  }
  
  setupEventListeners() {
    // Subscribe to relevant events
    tutorialEventBus.on('player.moved', (data) => {
      if (this.currentState === TUTORIAL_STATES.MOVEMENT_INTRO) {
        this.transitionTo(TUTORIAL_STATES.MOVEMENT_COMPLETE, data);
      }
    });
    
    tutorialEventBus.on('npc.interaction.opened', (data) => {
      if (this.currentState === TUTORIAL_STATES.NPC_INTERACTION_INTRO) {
        this.transitionTo(TUTORIAL_STATES.NPC_MENU_OPENED, data);
      }
    });
    
    // ... more event listeners
  }
  
  saveState() {
    // Persist to backend
    tutorialApi.updateProgress(this.characterId, {
      state: this.currentState,
      completedStates: Array.from(this.completedStates),
      milestones: this.milestones
    });
  }
}
```

#### 4.1.3 UI Targeting Strategy

**Location:** `frontend/src/services/tutorialTargetRegistry.js`

**Purpose:** Central registry of UI targets that survives refactors

**Implementation:**
```javascript
// Central registry of tutorial targets
export const TUTORIAL_TARGETS = {
  // Planet Surface
  PLANET_MAP_CANVAS: 'planet-map-canvas',
  PLAYER_ICON: 'player-icon',
  NPC_ICON: 'npc-icon',
  POI_ICON: 'poi-icon',
  SUBMAP_ENTRY_POINT: 'submap-entry-point',
  
  // HUD
  HUD_HEALTH_BAR: 'hud-health-bar',
  HUD_STAMINA_BAR: 'hud-stamina-bar',
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
  QUEST_ACCEPT_BUTTON: 'quest-accept-button',
  QUEST_DECLINE_BUTTON: 'quest-decline-button',
  QUEST_LOG_VIEW: 'quest-log-view',
  QUEST_OBJECTIVE_LIST: 'quest-objective-list',
  
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
  SUBMAP_LOCKPICKING_UI: 'submap-lockpicking-ui'
};

// Helper to add data attributes to components
export function addTutorialTarget(element, targetId) {
  if (element) {
    element.setAttribute('data-tutorial-target', targetId);
  }
}

// Helper to find target element
export function findTutorialTarget(targetId) {
  return document.querySelector(`[data-tutorial-target="${targetId}"]`);
}
```

**Usage in Components:**
```javascript
// In PlanetSurface.jsx
useEffect(() => {
  const canvas = canvasRef.current;
  if (canvas) {
    addTutorialTarget(canvas, TUTORIAL_TARGETS.PLANET_MAP_CANVAS);
  }
}, []);

// In NPCInteractionMenu.jsx
useEffect(() => {
  const menu = menuRef.current;
  if (menu) {
    addTutorialTarget(menu, TUTORIAL_TARGETS.NPC_INTERACTION_MENU);
  }
}, []);
```

#### 4.1.4 Backend Tutorial Service

**Location:** `backend/src/services/tutorialService.js`

**Database Schema:**
```sql
CREATE TABLE tutorial_progress (
  id SERIAL PRIMARY KEY,
  character_id UUID NOT NULL REFERENCES player_characters(id),
  tutorial_id VARCHAR(255) NOT NULL DEFAULT 'tutorial_001_dockside_initiation',
  state VARCHAR(100) NOT NULL DEFAULT 'not_started',
  completed_states JSONB DEFAULT '[]',
  milestones JSONB DEFAULT '{}',
  skipped BOOLEAN DEFAULT FALSE,
  version INTEGER DEFAULT 1,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(character_id, tutorial_id)
);

-- Add tutorial flags to player_characters
ALTER TABLE player_characters
ADD COLUMN tutorial_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN tutorial_quest_id VARCHAR(255);
```

**Service Implementation:**
```javascript
class TutorialService {
  async getTutorialState(characterId) {
    const progress = await TutorialProgress.findOne({
      where: { characterId, tutorialId: 'tutorial_001_dockside_initiation' }
    });
    
    if (!progress) {
      // Initialize tutorial progress
      return await this.initializeTutorial(characterId);
    }
    
    return progress;
  }
  
  async updateTutorialState(characterId, updates) {
    const progress = await TutorialProgress.findOne({
      where: { characterId, tutorialId: 'tutorial_001_dockside_initiation' }
    });
    
    if (progress) {
      await progress.update({
        state: updates.state,
        completedStates: updates.completedStates,
        milestones: updates.milestones,
        updatedAt: new Date()
      });
    }
    
    return progress;
  }
  
  async completeTutorial(characterId) {
    const progress = await TutorialProgress.findOne({
      where: { characterId, tutorialId: 'tutorial_001_dockside_initiation' }
    });
    
    if (progress) {
      await progress.update({
        state: 'tutorial_complete',
        completedAt: new Date()
      });
      
      await PlayerCharacter.update(
        { tutorialCompleted: true },
        { where: { id: characterId } }
      );
    }
    
    return progress;
  }
  
  async skipTutorial(characterId) {
    const progress = await TutorialProgress.findOne({
      where: { characterId, tutorialId: 'tutorial_001_dockside_initiation' }
    });
    
    if (progress) {
      await progress.update({
        skipped: true,
        state: 'tutorial_skipped'
      });
    }
    
    return progress;
  }
}
```

---

## 5. Tutorial Content & Flow

### 5.1 Revised Tutorial Flow (Based on Consultant Recommendations)

#### **Chapter 0: Character Creation (Light Guidance)**

**Step 0.1: Species Selection**
- Tooltip: "Your species affects traits and how NPCs react to you."
- Show preview of species traits

**Step 0.2: Background Selection**
- Tooltip: "Your background determines your starting planet, items, and credits."
- **Show preview:** Starting planet name, starting items list, starting credits amount
- Example: "Smuggler → Nar Shaddaa, Blaster Pistol + Light Armor + Medpac, 2000 credits"

**Step 0.3: Attribute Allocation**
- Tooltip: "Attributes affect combat, dialogue, and exploration. Recommended values shown for your background."
- Show recommended attribute ranges based on background

**Step 0.4: Appearance & Name**
- No tooltips needed (self-explanatory)

**Step 0.5: Confirmation**
- Tooltip: "Ready to begin? You'll start at the spaceport on [Planet Name]."

---

#### **Chapter 1: Dockside Orientation (2-3 minutes)**

**Step 1.1: Spawn & Welcome**
- **Event:** `player.spawned`
- **State:** `ORIENT_UI`
- **Tooltip:** "Welcome to [Planet Name], [Player Name]! You've arrived at the spaceport. Let's get you oriented."
- **Target:** Planet map canvas
- **Action:** Highlight HUD elements (health, stamina, quest tracker)

**Step 1.2: Movement Introduction**
- **Event:** `player.moved` (first movement)
- **State:** `MOVEMENT_INTRO`
- **Tooltip:** "Use WASD or arrow keys to move your character. Try moving toward the highlighted contact."
- **Target:** Planet map canvas
- **Action:** Highlight tutorial NPC (spawned nearby, distinctive appearance)
- **Objective:** "Move to Dock Liaison [NPC Name]" (radius trigger: 2% of map)

**Step 1.3: Movement Complete**
- **Event:** Player within 2% of tutorial NPC
- **State:** `MOVEMENT_COMPLETE`
- **Tooltip:** "Great! You've reached the contact. Now let's learn how to interact."
- **Action:** Highlight NPC icon

---

#### **Chapter 2: Your First Contract (3-5 minutes)**

**Step 2.1: NPC Interaction Introduction**
- **State:** `NPC_INTERACTION_INTRO`
- **Tooltip:** "Click on the NPC icon to interact. You can talk, trade, accept quests, or attack."
- **Target:** NPC icon
- **Action:** Highlight NPC icon with pulse animation

**Step 2.2: NPC Menu Opened**
- **Event:** `npc.interaction.opened`
- **State:** `NPC_MENU_OPENED`
- **Tooltip:** "This is the interaction menu. Click 'Talk' to start a conversation."
- **Target:** NPC interaction menu, "Talk" button
- **Action:** Highlight "Talk" button

**Step 2.3: Dialogue Started**
- **Event:** `dialogue.started`
- **State:** `DIALOGUE_STARTED`
- **Tooltip:** "This is the dialogue interface. You can type messages or use suggested replies."
- **Target:** Dialogue interface
- **Action:** Show suggested replies (2-3 options based on context)
- **Dialogue Scaffolding:**
  - Suggested Reply 1: "I'm new here. Can you help me get started?"
  - Suggested Reply 2: "What kind of work is available?"
  - Suggested Reply 3: "Tell me about this planet."
- **NPC Response:** Contextual based on background/species

**Step 2.4: Quest Offer**
- **Event:** Quest offer modal appears
- **State:** `QUEST_OFFERED`
- **Tooltip:** "NPCs can offer quests. This is your first quest! Review the objectives and rewards, then click 'Accept'."
- **Target:** Quest offer modal, "Accept" button
- **Action:** Highlight "Accept" button

**Step 2.5: Quest Accepted**
- **Event:** `quest.accepted`
- **State:** `QUEST_ACCEPTED`
- **Tooltip:** "Your quest has been added to your quest log. You can track objectives in the HUD or open the full quest log."
- **Target:** HUD quest tracker
- **Action:** Highlight quest tracker, show quest objectives

**Step 2.6: Sub-map Entry (If Applicable)**
- **Event:** Player approaches sub-map entry point
- **State:** `SUBMAP_ENTRY_INTRO`
- **Tooltip:** "Some locations have interiors. Click 'Enter' to go inside. You can return anytime."
- **Target:** Sub-map entry modal
- **Action:** Highlight "Enter" button
- **Note:** Only if tutorial quest requires sub-map entry

**Step 2.7: Sub-map Entered**
- **Event:** `submap.entered`
- **State:** `SUBMAP_ENTERED`
- **Tooltip:** "You're now inside a building. The layout is different from the planet surface. Find your objective here."
- **Target:** Sub-map view
- **Action:** Highlight objective location in sub-map

---

#### **Chapter 3: First Fight, First Loot (3-5 minutes)**

**Step 3.1: Combat Introduction**
- **Event:** `combat.started` (scripted tutorial combat)
- **State:** `COMBAT_INTRO`
- **Tooltip:** "This is combat! Let's learn how it works. Combat is turn-based - you and enemies take turns."
- **Target:** Combat view
- **Action:** Dim non-combat UI, highlight combat view

**Step 3.2: Turn Order Explanation**
- **State:** `COMBAT_TURN_ORDER_EXPLAINED`
- **Tooltip:** "This shows the turn order. The highlighted combatant is currently acting. You'll see when it's your turn."
- **Target:** Turn order display
- **Action:** Highlight turn order, pulse current turn indicator

**Step 3.3: Action Menu Explanation**
- **Event:** Player's turn starts
- **State:** `COMBAT_ACTION_MENU_EXPLAINED`
- **Tooltip:** "During your turn, select an action. You can Attack, Defend, Use Items, or Flee."
- **Target:** Action menu
- **Action:** Highlight action menu, show action descriptions

**Step 3.4: Targeting Explanation**
- **Event:** Player selects "Attack" action
- **State:** `COMBAT_TARGETING_EXPLAINED`
- **Tooltip:** "Now select a target. Click on an enemy to attack them."
- **Target:** Enemy combatant
- **Action:** Highlight enemy, show targeting cursor

**Step 3.5: Combat Execution**
- **Event:** `combat.action.performed`
- **Tooltip:** "Great! You've learned the basics of combat. The enemy will take their turn next."
- **Action:** Show combat result, continue combat

**Step 3.6: Combat Complete**
- **Event:** `combat.ended` (player wins)
- **State:** `COMBAT_COMPLETE`
- **Tooltip:** "Combat complete! You've defeated the enemy. Check your inventory for loot."
- **Action:** Show victory message, highlight loot notification

**Step 3.7: Loot Received**
- **Event:** `item.added` (guaranteed loot drop)
- **State:** `LOOT_RECEIVED`
- **Tooltip:** "You've received loot! Open your inventory to see what you got."
- **Target:** HUD inventory button
- **Action:** Highlight inventory button, show notification

**Step 3.8: Inventory Opened**
- **Event:** `ui.opened.inventory`
- **State:** `INVENTORY_OPENED`
- **Tooltip:** "This is your inventory. Items you collect appear here. You can equip weapons and armor, or use consumables like medpacs."
- **Target:** Inventory view, looted item slot
- **Action:** Highlight looted item

**Step 3.9: Item Equipped (If Applicable)**
- **Event:** `item.equipped` (if loot is equippable)
- **State:** `ITEM_EQUIPPED`
- **Tooltip:** "You've equipped an item! Equipped items appear in the equipment panel and affect your stats."
- **Target:** Equipment panel
- **Action:** Highlight equipped item in equipment panel

**Step 3.10: Healing Explanation**
- **State:** `HEALING_EXPLAINED`
- **Tooltip:** "After combat, you may need to heal. You can use medpacs from your inventory, or wait for health to regenerate over time."
- **Target:** Inventory, medpac item
- **Action:** Highlight medpac, show "Use" button
- **Objective:** Use medpac OR wait until health >= 80% (regen)

**Step 3.11: Medpac Used**
- **Event:** `item.used` (medpac) OR health threshold reached
- **State:** `MEDPAC_USED`
- **Tooltip:** "Good! You've learned how to heal. Always keep medpacs handy for combat."
- **Action:** Show healing effect

---

#### **Chapter 4: The Galaxy Opens (2-4 minutes)**

**Step 4.1: Vendor Introduction**
- **Event:** Player approaches vendor NPC (spawned near tutorial completion area)
- **State:** `VENDOR_INTRO`
- **Tooltip:** "This is a vendor. You can buy and sell items here. Credits are used for trading, travel, and equipment."
- **Target:** Vendor NPC icon
- **Action:** Highlight vendor NPC

**Step 4.2: Vendor Opened**
- **Event:** `ui.opened.vendor` (via NPC interaction menu → Shop)
- **State:** `VENDOR_OPENED`
- **Tooltip:** "This is the trading interface. You can buy items from the vendor or sell items from your inventory."
- **Target:** Vendor view
- **Action:** Highlight vendor interface

**Step 4.3: Item Sold**
- **Event:** `item.sold`
- **State:** `ITEM_SOLD`
- **Tooltip:** "You've sold an item! Credits have been added to your account. Use credits to buy useful items or pay for travel."
- **Target:** Credits display
- **Action:** Show credits increase animation

**Step 4.4: Item Bought (Optional)**
- **Event:** `item.bought`
- **State:** `ITEM_BOUGHT`
- **Tooltip:** "You've purchased an item! It's been added to your inventory."
- **Target:** Inventory
- **Action:** Highlight purchased item

**Step 4.5: Travel Introduction**
- **State:** `TRAVEL_INTRO`
- **Tooltip:** "Ready to explore? Open the galaxy map to travel to other planets. Each planet has unique quests, NPCs, and opportunities."
- **Target:** HUD galaxy map button
- **Action:** Highlight galaxy map button

**Step 4.6: Galaxy Map Opened**
- **Event:** `ui.opened.galaxymap`
- **State:** `GALAXY_MAP_OPENED`
- **Tooltip:** "This is the galaxy map. Click on a star system to see its planets, then select a planet to travel there."
- **Target:** Galaxy map view
- **Action:** Highlight nearby system/planet

**Step 4.7: Travel Initiated**
- **Event:** `travel.initiated`
- **State:** `TRAVEL_INITIATED`
- **Tooltip:** "Travel initiated! You'll arrive at your destination shortly. Travel costs credits, so plan your routes wisely."
- **Action:** Show travel animation/loading

**Step 4.8: Travel Complete**
- **Event:** `travel.completed`
- **State:** `TRAVEL_COMPLETE`
- **Tooltip:** "You've arrived! Each planet offers new adventures. Explore, complete quests, and build your reputation."
- **Action:** Show arrival message

---

#### **Chapter 5: Completion & Momentum Handoff (1-2 minutes)**

**Step 5.1: Quest Turn-in**
- **Event:** Player returns to tutorial NPC
- **State:** `QUEST_TURN_IN`
- **Tooltip:** "Return to the quest giver to complete your quest and receive rewards."
- **Target:** Tutorial NPC
- **Action:** Highlight tutorial NPC

**Step 5.2: Quest Completed**
- **Event:** `quest.completed`
- **State:** `TUTORIAL_COMPLETE`
- **Tooltip:** "Congratulations! You've completed your first quest. Here are your rewards."
- **Action:** Show reward animation (credits, XP, items, title)

**Step 5.3: Tutorial Complete**
- **State:** `TUTORIAL_COMPLETE`
- **Rewards:**
  - Credits: 500
  - XP: 100
  - Items: 1x Medpac (if not already have)
  - Title: "Dockside Initiate"
  - Faction Reputation: +1 with chosen faction (based on background)
  - Discovery: "First Steps" achievement
  - Unlock: Access to safehouse sub-map (optional)

**Step 5.4: Momentum Handoff**
- **State:** `MOMENTUM_HANDOFF`
- **Tooltip:** "You're ready to explore the galaxy! Choose your next adventure:"
- **Action:** Show choice modal with 3 leads:
  1. **Faction Lead:** "Join a faction and build your reputation"
  2. **Profit Lead:** "Take on trading missions and build your wealth"
  3. **Exploration Lead:** "Discover new planets and uncover secrets"
- **Each lead:** Points to specific quest/system, provides immediate direction

**Step 5.5: Tutorial Overlay Dismissed**
- **State:** `TUTORIAL_COMPLETE`
- **Action:** Tutorial overlay fades out, normal gameplay begins
- **Note:** Contextual hints remain available (can be toggled in settings)

---

### 5.2 Narrative Integration

#### 5.2.1 Background Reactivity

**Smuggler:**
- Tutorial NPC: "Dockmaster Jax" (smuggler contact)
- Starting location: Restricted bay (more dangerous area)
- Combat scenario: Customs drone "inspection gone wrong"
- Faction nudge: Smuggler's Alliance

**Scholar:**
- Tutorial NPC: "Archivist Tera" (data specialist)
- Starting location: Data terminal area
- Combat scenario: Data-theft scavenger
- Faction nudge: Jedi Scholars / Research Consortium

**Soldier:**
- Tutorial NPC: "Sergeant Kael" (militia officer)
- Starting location: Military checkpoint
- Combat scenario: Live-fire "certification" exercise
- Faction nudge: Republic Military / Local Militia

**Medic:**
- Tutorial NPC: "Medic Voss" (field medic)
- Starting location: Medical bay
- Combat scenario: Hostile patient / medical emergency
- Faction nudge: Medical Corps / Humanitarian Aid

**Engineer:**
- Tutorial NPC: "Tech Specialist Rynn" (systems engineer)
- Starting location: Engineering bay
- Combat scenario: Malfunctioning security droid
- Faction nudge: Tech Guild / Engineering Corps

**Diplomat:**
- Tutorial NPC: "Ambassador Lira" (diplomatic attaché)
- Starting location: Diplomatic quarters
- Combat scenario: Political threat / assassin
- Faction nudge: Republic Diplomatic Corps

**Pilot:**
- Tutorial NPC: "Flight Controller Dex" (spaceport coordinator)
- Starting location: Hangar bay
- Combat scenario: Rogue pilot / ship hijacker
- Faction nudge: Pilot's Guild / Freelance Transport

#### 5.2.2 Species Reactivity

**Dialogue Tone Adjustments:**
- Twi'lek: More respectful, cultural references
- Human: Standard professional tone
- Wookiee: Simplified (if player is Wookiee, NPC uses basic Galactic Basic)
- Droid: Technical, logical explanations
- Alien species: Cultural awareness, potential misunderstandings

**Starting Items:**
- Species-appropriate equipment hints
- Cultural items (optional flavor)

---

### 5.3 Dialogue Scaffolding

#### 5.3.1 Suggested Replies System

**Location:** `frontend/src/components/tutorial/TutorialDialogueScaffold.jsx`

**Implementation:**
```javascript
export function getSuggestedReplies(context) {
  const { npcType, questState, background, tutorialStep } = context;
  
  if (tutorialStep === 'dialogue_started') {
    return [
      {
        text: "I'm new here. Can you help me get started?",
        intent: 'tutorial_intro',
        icon: '👋'
      },
      {
        text: "What kind of work is available?",
        intent: 'quest_inquiry',
        icon: '📜'
      },
      {
        text: "Tell me about this planet.",
        intent: 'location_info',
        icon: '🌍'
      }
    ];
  }
  
  if (questState === 'offered') {
    return [
      {
        text: "I'll take the job.",
        intent: 'accept_quest',
        icon: '✅'
      },
      {
        text: "Tell me more about the objectives.",
        intent: 'quest_details',
        icon: '❓'
      },
      {
        text: "What's in it for me?",
        intent: 'quest_rewards',
        icon: '💰'
      }
    ];
  }
  
  // ... more contexts
}
```

**Usage in DialogueInterface:**
```javascript
// In DialogueInterface.jsx
const suggestedReplies = isTutorialActive 
  ? getSuggestedReplies({
      npcType: npc.npcType,
      questState: currentQuestState,
      background: currentCharacter.background,
      tutorialStep: tutorialState.currentStep
    })
  : null;

// Render suggested replies above input
{suggestedReplies && (
  <div className="dialogue-suggested-replies">
    {suggestedReplies.map((reply, index) => (
      <button
        key={index}
        className="suggested-reply"
        onClick={() => handleSendMessage(reply.text)}
      >
        <span className="reply-icon">{reply.icon}</span>
        <span className="reply-text">{reply.text}</span>
      </button>
    ))}
  </div>
)}
```

---

## 6. Implementation Plan

### 6.1 Phase 1: Foundation (Week 1-2)

**Backend:**
- [ ] Create `tutorial_progress` table migration
- [ ] Add tutorial flags to `player_characters` table
- [ ] Create `TutorialService` (backend)
- [ ] Create `/api/tutorial/state` endpoints (GET, POST, PUT)
- [ ] Integrate tutorial quest assignment in `characterService.createCharacter`

**Frontend:**
- [ ] Create `tutorialEventBus.js` (event bus system)
- [ ] Create `tutorialStateMachine.js` (state machine)
- [ ] Create `tutorialTargetRegistry.js` (UI target registry)
- [ ] Create `TutorialProvider` (React context)
- [ ] Create `TutorialOverlay` component
- [ ] Create `TutorialTooltip` component
- [ ] Create `TutorialHighlight` component
- [ ] Instrument game events (movement, UI opens, quest accepted, etc.)

**Integration:**
- [ ] Add `data-tutorial-target` attributes to key UI components
- [ ] Integrate tutorial initialization in `GameWorld.jsx` and `PlanetSurface.jsx`
- [ ] Add tutorial state persistence (save/load)

### 6.2 Phase 2: Content Creation (Week 2-3)

**Tutorial Quest:**
- [ ] Create `tutorial_001_dockside_initiation` quest definition
- [ ] Create tutorial NPC definitions (8 variants based on background)
- [ ] Create tutorial dialogue content (background/species reactive)
- [ ] Create scripted combat encounter (weak enemy, guaranteed win)
- [ ] Create tutorial rewards (credits, XP, items, title, reputation, discovery)

**Tutorial Tooltips:**
- [ ] Write all tooltip content (title + description for each step)
- [ ] Create tooltip positioning logic
- [ ] Create tooltip animations (fade in/out, pulse)

**Dialogue Scaffolding:**
- [ ] Create `TutorialDialogueScaffold` component
- [ ] Implement suggested replies system
- [ ] Create suggested reply content for all tutorial dialogue contexts

**Narrative:**
- [ ] Write background-specific tutorial NPC dialogue
- [ ] Write species-reactive dialogue variations
- [ ] Create momentum handoff content (3 leads)

### 6.3 Phase 3: System Integration (Week 3-4)

**Character Creation:**
- [ ] Add tooltips to character creation steps
- [ ] Add starting conditions preview (planet, items, credits)
- [ ] Integrate tutorial flag setting on character creation

**Game World Integration:**
- [ ] Integrate tutorial overlay in `PlanetSurface.jsx`
- [ ] Integrate tutorial overlay in `SubMapView.jsx`
- [ ] Integrate tutorial overlay in `CombatView.jsx`
- [ ] Integrate tutorial overlay in `InventoryView.jsx`
- [ ] Integrate tutorial overlay in `TradingView.jsx`
- [ ] Integrate tutorial overlay in `GalaxyMap.jsx`

**Event Instrumentation:**
- [ ] Add event emissions to `PlanetSurface.jsx` (movement, NPC interaction)
- [ ] Add event emissions to `NPCInteractionMenu.jsx` (menu opened)
- [ ] Add event emissions to `DialogueInterface.jsx` (dialogue started, messages)
- [ ] Add event emissions to quest system (quest accepted, completed)
- [ ] Add event emissions to combat system (combat started, actions, ended)
- [ ] Add event emissions to inventory system (item added, equipped, used)
- [ ] Add event emissions to vendor system (vendor opened, item sold/bought)
- [ ] Add event emissions to travel system (travel initiated, completed)
- [ ] Add event emissions to sub-map system (sub-map entered/exited)

**Skip Functionality:**
- [ ] Add "Skip Tutorial" button (with confirmation)
- [ ] Implement skip logic (mark as skipped, provide contextual hints)
- [ ] Add "Resume Tutorial" option (if skipped, can resume later)

### 6.4 Phase 4: Polish & Testing (Week 4-5)

**UI/UX Polish:**
- [ ] Refine tooltip positioning (handle edge cases, screen boundaries)
- [ ] Add tooltip animations (smooth transitions)
- [ ] Refine highlight effects (pulse, glow, overlay dimming)
- [ ] Test on different screen sizes (responsive design)

**Flow Testing:**
- [ ] Test complete tutorial flow (all steps)
- [ ] Test out-of-order completion (auto-advance)
- [ ] Test skip functionality
- [ ] Test reload safety (tutorial state persists)
- [ ] Test edge cases (NPC not found, combat lost, etc.)

**Bug Fixes:**
- [ ] Fix any tutorial breakage issues
- [ ] Fix UI targeting issues (missing targets, wrong positions)
- [ ] Fix event emission issues (missing events, wrong data)

**Performance:**
- [ ] Optimize tutorial overlay rendering (React.memo, lazy loading)
- [ ] Optimize event bus (debounce, throttle where needed)
- [ ] Test performance impact (should be minimal)

### 6.5 Phase 5: Analytics & Monitoring (Week 5)

**Analytics Events:**
- [ ] Add tutorial analytics events (started, step completed, skipped, completed)
- [ ] Add tutorial quest analytics (assigned, objectives completed, completed)
- [ ] Add tutorial combat analytics (started, steps completed, completed)
- [ ] Integrate with analytics service

**Monitoring:**
- [ ] Set up tutorial completion rate dashboard
- [ ] Set up tutorial step completion rate dashboard
- [ ] Set up tutorial skip rate dashboard
- [ ] Set up tutorial time-to-completion tracking

**A/B Testing (Optional):**
- [ ] Set up A/B test framework for tutorial variations
- [ ] Test different tooltip styles
- [ ] Test different tutorial lengths
- [ ] Test different momentum handoff options

---

## 7. Success Metrics

### 7.1 Primary Metrics

1. **Tutorial Completion Rate**
   - Target: >80% of new players complete tutorial
   - Measurement: Track `tutorialCompleted` flag in database
   - Analytics Event: `tutorial.completed`

2. **Player Retention (Day 1)**
   - Target: >60% of players who complete tutorial return on Day 1
   - Measurement: Track login events after tutorial completion
   - Analytics Event: `player.login` (with `tutorialCompleted: true`)

3. **Time to First Quest**
   - Target: <5 minutes from character creation to first quest acceptance
   - Measurement: Track quest assignment timestamps
   - Analytics Event: `quest.accepted` (with `isTutorial: false`)

4. **Time to First Combat**
   - Target: <10 minutes from character creation to first combat
   - Measurement: Track combat encounter timestamps
   - Analytics Event: `combat.started` (with `isTutorial: false`)

5. **Time to First Vendor Transaction**
   - Target: <15 minutes from character creation to first buy/sell
   - Measurement: Track vendor transaction timestamps
   - Analytics Event: `item.sold` or `item.bought`

### 7.2 Secondary Metrics

1. **Tutorial Skip Rate**
   - Target: <20% of players skip tutorial
   - Measurement: Track `tutorialSkipped` flag
   - Analytics Event: `tutorial.skipped`

2. **Tutorial Step Completion Rate**
   - Target: >90% completion for each step
   - Measurement: Track step completion events
   - Analytics Event: `tutorial.step.completed`

3. **Average Tutorial Completion Time**
   - Target: 10-15 minutes (not too fast, not too slow)
   - Measurement: Track time from `tutorial.started` to `tutorial.completed`

4. **Momentum Handoff Selection**
   - Target: >70% of players select a lead within 2 minutes of tutorial completion
   - Measurement: Track lead selection events
   - Analytics Event: `tutorial.lead.selected`

5. **Player Feedback**
   - Target: >4.0/5.0 average rating for tutorial
   - Measurement: Post-tutorial survey (optional)
   - Analytics Event: `tutorial.feedback.submitted`

6. **Support Ticket Reduction**
   - Target: 50% reduction in "how do I..." support tickets
   - Measurement: Track support ticket categories before/after tutorial launch

### 7.3 Analytics Events (Complete List)

```javascript
// Tutorial lifecycle
tutorial.started                    // { characterId, tutorialId, background, species }
tutorial.step.completed             // { characterId, stepId, stepName, timeSpent }
tutorial.step.skipped               // { characterId, stepId, stepName }
tutorial.completed                  // { characterId, tutorialId, totalTime, stepsCompleted }
tutorial.skipped                    // { characterId, tutorialId, stepAtSkip }

// Tutorial quest
tutorial.quest.assigned             // { characterId, questId }
tutorial.quest.objective.completed  // { characterId, questId, objectiveId }
tutorial.quest.completed            // { characterId, questId, rewards }

// Tutorial combat
tutorial.combat.started             // { characterId, encounterId }
tutorial.combat.step.completed      // { characterId, stepId, stepName }
tutorial.combat.completed           // { characterId, encounterId, result }

// Momentum handoff
tutorial.lead.selected              // { characterId, leadType, leadId }
tutorial.lead.quest.accepted        // { characterId, leadType, questId }

// Dialogue scaffolding
tutorial.dialogue.suggested_reply.used  // { characterId, npcId, replyText, replyIntent }
tutorial.dialogue.custom_message.sent   // { characterId, npcId, messageLength }
```

---

## 8. Risk Mitigation

### 8.1 Technical Risks

**Risk:** Tutorial system adds complexity and performance overhead  
**Mitigation:**
- Use React.memo for tutorial components
- Lazy load tutorial overlay (only when active)
- Debounce/throttle event emissions
- Optimize state machine transitions

**Risk:** Tutorial breaks when UI is refactored  
**Mitigation:**
- Central target registry (lintable, maintainable)
- Graceful fallbacks (missing target → modal instead of hard fail)
- Event-driven architecture (less dependent on UI structure)
- Comprehensive testing

**Risk:** Tutorial state gets corrupted or lost  
**Mitigation:**
- Server-side persistence (not just client-side)
- Version field in tutorial_progress (can migrate old states)
- Reload safety (resume from last saved state)
- Edge case handling (NPC not found, combat lost, etc.)

### 8.2 User Experience Risks

**Risk:** Tutorial feels too long or intrusive  
**Mitigation:**
- Keep to 10-15 minutes total
- Make skippable at any time
- Provide "resume later" option
- Allow players to dismiss individual tooltips

**Risk:** Players skip tutorial and still don't understand game  
**Mitigation:**
- Make tutorial engaging (narrative, not just instructions)
- Show value (rewards, unlocks)
- Provide persistent contextual hints after skip
- Add "tutorial replay" option in settings

**Risk:** Tutorial doesn't address all player confusion points  
**Mitigation:**
- User testing before launch
- Iterate based on feedback
- Add more tutorial steps if needed
- Create "advanced tutorials" for complex systems

**Risk:** Dialogue scaffolding feels too hand-holdy  
**Mitigation:**
- Suggested replies are optional (player can still type freely)
- Gradually reduce scaffolding as tutorial progresses
- Make suggested replies contextual and helpful, not prescriptive

### 8.3 Content Risks

**Risk:** Tutorial content becomes outdated as game evolves  
**Mitigation:**
- Store tutorial content in database (not hardcoded)
- Version tutorial content (can update without code changes)
- A/B test different tutorial approaches
- Regular content reviews

**Risk:** Narrative integration feels forced or generic  
**Mitigation:**
- Write background-specific dialogue (8 variants)
- Test narrative integration with different backgrounds
- Iterate based on player feedback
- Consider hiring narrative designer for polish

---

## 9. Conclusion

This updated tutorial system requirements document addresses all consultant feedback and provides a comprehensive, resilient, and engaging onboarding experience that:

✅ **Matches actual product reality** - Re-baselined on current codebase  
✅ **Expands scope appropriately** - Includes all early-game loops  
✅ **Builds resilient architecture** - Event-driven state machine with persistence  
✅ **Integrates narrative** - Background/species reactive, feels like first chapter  
✅ **Provides momentum** - Choice-based handoff prevents "what now?" confusion  
✅ **Scaffolds dialogue** - Prevents "blank prompt" churn  
✅ **Tracks success** - Comprehensive metrics and analytics

**Next Steps:**
1. Review and approve this updated requirements document
2. Begin Phase 1 implementation (Foundation)
3. Create detailed technical specifications for each component
4. Set up project tracking and milestones
5. Begin content creation (tutorial quest, dialogue, tooltips)

---

**Document Version:** 2.0  
**Last Updated:** December 2024  
**Status:** Ready for Implementation  
**Based On:** Consultant Review + Current Codebase Analysis








