# Planet Surface Tutorial System - Comprehensive Requirements Document

**Version:** 1.0  
**Date:** December 2024  
**Status:** Requirements Specification

---

## Table of Contents

1. [Overview](#overview)
2. [Tutorial State Definitions](#tutorial-state-definitions)
3. [Tutorial Flow Architecture](#tutorial-flow-architecture)
4. [Detailed Tutorial Steps](#detailed-tutorial-steps)
5. [Trigger Conditions & Prerequisites](#trigger-conditions--prerequisites)
6. [Edge Cases & Error Handling](#edge-cases--error-handling)
7. [Implementation Requirements](#implementation-requirements)
8. [Testing Requirements](#testing-requirements)

---

## Overview

### Purpose
This document defines the comprehensive tutorial system for the planet surface gameplay experience. The tutorial guides new players through exploration, POI interaction, quest systems, NPC interactions, and advanced mechanics like lockpicking.

### Scope
- **Location:** Planet Surface (`PlanetSurface.jsx`)
- **Target Audience:** New players who have completed the spaceport tutorial
- **Goal:** Teach players how to explore, interact with POIs, find and complete quests, and understand advanced mechanics

### Design Principles
1. **Contextual Learning:** Tutorial steps appear when the player encounters the relevant mechanic
2. **Non-Blocking:** Players can dismiss tutorials and continue playing
3. **Progressive Disclosure:** Introduce concepts gradually, building on previous knowledge
4. **State-Aware:** Tutorial system checks player state (skills, level, inventory) before showing steps
5. **Action-Driven:** Tutorials advance based on player actions, not timeouts

---

## Tutorial State Definitions

### New Tutorial States

```javascript
export const TUTORIAL_STATES = {
  // ... existing states ...
  
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
```

---

## Tutorial Flow Architecture

### State Transition Diagram

```
SPACEPORT_EXIT_EXPLAINED
    ↓ (Player exits spaceport)
PLANET_SURFACE_INTRO
    ↓ (Player moves on planet surface)
PLANET_SURFACE_MOVEMENT
    ↓ (Player clicks POI)
POI_DISCOVERED
    ↓ (POI menu opens)
POI_INTERACTION_MENU_OPENED
    ↓ (Player clicks "Enter")
POI_ENTERED
    ↓ (Player exits POI back to surface)
    ↓ (Player clicks NPC)
PLANET_NPC_CLICKED
    ↓ (Dialogue starts)
PLANET_NPC_DIALOGUE_STARTED
    ↓ (Quest offered)
QUEST_FOUND
    ↓ (Player accepts quest)
QUEST_ACCEPTED (existing state)
    ↓ (Player reaches objective location)
QUEST_OBJECTIVE_LOCATION_REACHED
    ↓ (Player completes objective)
QUEST_OBJECTIVE_COMPLETED
    ↓ (Player returns to quest giver)
QUEST_RETURN_TO_GIVER
    ↓ (Player tries to access locked door without skill)
LOCKPICKING_SKILL_REQUIRED (contextual)
    ↓ (Player levels up)
LEVEL_UP_OCCURRED (contextual)
    ↓ (Player has skill points)
SKILL_POINTS_AVAILABLE (contextual)
    ↓ (All planet surface tutorials complete)
PLANET_SURFACE_TUTORIAL_COMPLETE
```

### Parallel Tutorial Paths

Some tutorials can occur in parallel or out of order:
- **Lockpicking Tutorial:** Only appears when player attempts to access locked door without skill
- **Level Up Tutorial:** Appears immediately when player levels up
- **Fast Travel Tutorial:** Appears when player discovers a fast travel point
- **Random Encounter Tutorial:** Appears on first random encounter

---

## Detailed Tutorial Steps

### 1. Planet Surface Introduction

**State:** `PLANET_SURFACE_INTRO`

**Trigger Conditions:**
- Player has completed `SPACEPORT_EXIT_EXPLAINED`
- Player is on planet surface (`PlanetSurface.jsx` is mounted)
- Player has just exited spaceport (check `location.state.fromSpaceport` or similar)

**Prerequisites:**
- Tutorial state: `SPACEPORT_EXIT_EXPLAINED` completed
- Character exists and is on planet surface
- Planet data loaded

**Display Logic:**
```javascript
if (currentState === TUTORIAL_STATES.SPACEPORT_EXIT_EXPLAINED && 
    isOnPlanetSurface && 
    justExitedSpaceport) {
  transitionTo(TUTORIAL_STATES.PLANET_SURFACE_INTRO);
}
```

**Tutorial Content:**
- **Title:** "Welcome to the Planet Surface"
- **Description:** "You've left the spaceport and are now exploring the planet surface. This is where you'll find quests, discover locations, and encounter challenges. Use WASD or arrow keys to move around."
- **Target:** Center of screen (no specific UI element)
- **Position:** `center`
- **Show Highlight:** `false`
- **Actions:** "Next" button

**Completion:**
- Player clicks "Next" → Transition to `PLANET_SURFACE_MOVEMENT`

**Edge Cases:**
- If player is already on planet surface when tutorial loads, show immediately
- If player navigates away before completing, resume on return

---

### 2. Planet Surface Movement

**State:** `PLANET_SURFACE_MOVEMENT`

**Trigger Conditions:**
- Player has completed `PLANET_SURFACE_INTRO`
- Player is on planet surface
- Player has not yet moved (check if player location has changed from spawn point)

**Prerequisites:**
- Tutorial state: `PLANET_SURFACE_INTRO` completed
- Character is on planet surface
- Player location tracked

**Display Logic:**
```javascript
if (currentState === TUTORIAL_STATES.PLANET_SURFACE_INTRO && 
    playerHasNotMoved) {
  transitionTo(TUTORIAL_STATES.PLANET_SURFACE_MOVEMENT);
}
```

**Tutorial Content:**
- **Title:** "Movement on Planet Surface"
- **Description:** "Move your character using WASD or arrow keys. You can click on icons you see on the map to interact with them. Try moving around to explore!"
- **Target:** Player character icon on map
- **Position:** `top`
- **Show Highlight:** `true`
- **Highlight Target:** Player character icon
- **Actions:** "Got it" button (optional, can auto-complete on movement)

**Completion:**
- Player moves (WASD/arrows) → Transition to `POI_DISCOVERED` (when POI is clicked)
- OR player clicks "Got it" → Wait for POI click

**Edge Cases:**
- If player moves before tutorial appears, skip to next step
- If player clicks POI before moving, show POI tutorial first, then movement tutorial

---

### 3. POI Discovered

**State:** `POI_DISCOVERED`

**Trigger Conditions:**
- Player clicks on a POI icon on the planet surface
- Player has completed `PLANET_SURFACE_MOVEMENT` (or skipped it)
- POI interaction menu has not yet opened

**Prerequisites:**
- Tutorial state: `PLANET_SURFACE_MOVEMENT` completed (or skipped)
- POI exists and is clickable
- Player is on planet surface

**Display Logic:**
```javascript
tutorialEventBus.on(TUTORIAL_EVENTS.POI_CLICKED, (data) => {
  if (currentState === TUTORIAL_STATES.PLANET_SURFACE_MOVEMENT ||
      currentState === TUTORIAL_STATES.PLANET_SURFACE_INTRO ||
      !isStateCompleted(TUTORIAL_STATES.POI_DISCOVERED)) {
    transitionTo(TUTORIAL_STATES.POI_DISCOVERED, data);
  }
});
```

**Tutorial Content:**
- **Title:** "Points of Interest"
- **Description:** "You've found a Point of Interest (POI)! These are locations you can explore, such as cities, cantinas, ruins, and more. Click on the POI to see what actions are available."
- **Target:** Clicked POI icon
- **Position:** `right`
- **Show Highlight:** `true`
- **Highlight Target:** POI icon
- **Actions:** "Next" button

**Completion:**
- Player clicks "Next" → Transition to `POI_INTERACTION_MENU_OPENED`
- OR POI interaction menu opens automatically → Transition to `POI_INTERACTION_MENU_OPENED`

**Edge Cases:**
- If player clicks POI before tutorial appears, show tutorial immediately
- If POI menu opens before tutorial, show tutorial with menu visible

---

### 4. POI Interaction Menu Opened

**State:** `POI_INTERACTION_MENU_OPENED`

**Trigger Conditions:**
- POI interaction menu is open (`POIInteractionMenu` component is rendered)
- Player has completed `POI_DISCOVERED` (or it was skipped)
- This is the first time player has seen a POI menu

**Prerequisites:**
- Tutorial state: `POI_DISCOVERED` completed (or skipped)
- POI interaction menu component is mounted
- POI data loaded

**Display Logic:**
```javascript
tutorialEventBus.on(TUTORIAL_EVENTS.POI_MENU_OPENED, (data) => {
  if (currentState === TUTORIAL_STATES.POI_DISCOVERED ||
      !isStateCompleted(TUTORIAL_STATES.POI_INTERACTION_MENU_OPENED)) {
    transitionTo(TUTORIAL_STATES.POI_INTERACTION_MENU_OPENED, data);
  }
});
```

**Tutorial Content:**
- **Title:** "POI Interaction Menu"
- **Description:** "This menu shows what you can do at this location. Common actions include 'Enter' (to go inside), 'Investigate' (to learn more), and 'Search' (to find loot). Different POI types offer different actions."
- **Target:** POI interaction menu component
- **Position:** `left`
- **Show Highlight:** `true`
- **Highlight Target:** POI interaction menu
- **Actions:** "Next" button

**Completion:**
- Player clicks "Next" → Wait for player action (Enter, Investigate, etc.)
- OR player clicks an action button → Transition based on action type

**Edge Cases:**
- If menu closes before tutorial appears, show tutorial when menu reopens
- If player clicks action before tutorial, show tutorial for that specific action

---

### 5. POI Entered

**State:** `POI_ENTERED`

**Trigger Conditions:**
- Player clicks "Enter" on a POI interaction menu
- Player successfully navigates to sub-map
- Player has completed `POI_INTERACTION_MENU_OPENED` (or it was skipped)
- This is the first time player has entered a POI

**Prerequisites:**
- Tutorial state: `POI_INTERACTION_MENU_OPENED` completed (or skipped)
- POI has "Enter" action available
- Sub-map navigation successful

**Display Logic:**
```javascript
tutorialEventBus.on(TUTORIAL_EVENTS.POI_ENTERED, (data) => {
  if (currentState === TUTORIAL_STATES.POI_INTERACTION_MENU_OPENED ||
      !isStateCompleted(TUTORIAL_STATES.POI_ENTERED)) {
    transitionTo(TUTORIAL_STATES.POI_ENTERED, data);
  }
});
```

**Tutorial Content:**
- **Title:** "Entering a Location"
- **Description:** "You've entered a sub-map! This is an interior view of the location. You can explore, talk to NPCs, and find quests here. To return to the planet surface, look for the exit point (usually marked on the map)."
- **Target:** Center of sub-map view
- **Position:** `center`
- **Show Highlight:** `false`
- **Actions:** "Got it" button

**Completion:**
- Player clicks "Got it" → Tutorial complete, player can explore
- OR player exits sub-map → Transition to next surface tutorial when appropriate

**Edge Cases:**
- If player exits immediately, show tutorial on planet surface about returning
- If sub-map fails to load, show error message instead of tutorial

---

### 6. Planet NPC Clicked

**State:** `PLANET_NPC_CLICKED`

**Trigger Conditions:**
- Player clicks on an NPC icon on planet surface
- Player has completed `POI_ENTERED` (or relevant previous state)
- NPC interaction menu has not yet opened
- This is the first time player has clicked a planet surface NPC (not spaceport NPC)

**Prerequisites:**
- Tutorial state: Previous planet surface tutorials completed
- NPC exists and is clickable
- Player is on planet surface (not in sub-map)

**Display Logic:**
```javascript
tutorialEventBus.on(TUTORIAL_EVENTS.NPC_CLICKED, (data) => {
  // Check if this is a planet surface NPC (not spaceport)
  if (data.location === 'planet_surface' &&
      (currentState === TUTORIAL_STATES.POI_ENTERED ||
       !isStateCompleted(TUTORIAL_STATES.PLANET_NPC_CLICKED))) {
    transitionTo(TUTORIAL_STATES.PLANET_NPC_CLICKED, data);
  }
});
```

**Tutorial Content:**
- **Title:** "NPCs on Planet Surface"
- **Description:** "NPCs on the planet surface can offer quests, provide information, or trade with you. Click on an NPC to see what options are available. Many quests start by talking to NPCs."
- **Target:** Clicked NPC icon
- **Position:** `right`
- **Show Highlight:** `true`
- **Highlight Target:** NPC icon
- **Actions:** "Next" button

**Completion:**
- Player clicks "Next" → Transition to `PLANET_NPC_DIALOGUE_STARTED`
- OR NPC interaction menu opens → Transition to `PLANET_NPC_DIALOGUE_STARTED`

**Edge Cases:**
- If NPC menu opens before tutorial, show tutorial with menu visible
- If NPC is not quest-giver, adjust tutorial text accordingly

---

### 7. Planet NPC Dialogue Started

**State:** `PLANET_NPC_DIALOGUE_STARTED`

**Trigger Conditions:**
- NPC dialogue interface is open
- Player has completed `PLANET_NPC_CLICKED` (or it was skipped)
- This is the first planet surface NPC dialogue (not spaceport tutorial NPC)

**Prerequisites:**
- Tutorial state: `PLANET_NPC_CLICKED` completed (or skipped)
- Dialogue interface component is mounted
- NPC dialogue data loaded

**Display Logic:**
```javascript
tutorialEventBus.on(TUTORIAL_EVENTS.DIALOGUE_STARTED, (data) => {
  // Check if this is a planet surface dialogue (not tutorial NPC)
  if (data.location === 'planet_surface' &&
      !data.isTutorialNPC &&
      (currentState === TUTORIAL_STATES.PLANET_NPC_CLICKED ||
       !isStateCompleted(TUTORIAL_STATES.PLANET_NPC_DIALOGUE_STARTED))) {
    transitionTo(TUTORIAL_STATES.PLANET_NPC_DIALOGUE_STARTED, data);
  }
});
```

**Tutorial Content:**
- **Title:** "Talking to NPCs"
- **Description:** "You're now in a dialogue with an NPC. NPCs can offer quests, share information, or provide services. Read their messages and use the suggested responses or type your own. Some NPCs will offer quests - accept them to get objectives!"
- **Target:** Dialogue interface component
- **Position:** `top`
- **Show Highlight:** `true`
- **Highlight Target:** Dialogue interface
- **Actions:** "Got it" button

**Completion:**
- Player clicks "Got it" → Wait for quest offer or dialogue completion
- OR quest is offered → Transition to `QUEST_FOUND`

**Edge Cases:**
- If quest is offered immediately, skip this tutorial and go to `QUEST_FOUND`
- If dialogue closes before tutorial, show tutorial when dialogue reopens

---

### 8. Quest Found

**State:** `QUEST_FOUND`

**Trigger Conditions:**
- NPC offers a quest to the player
- Player has completed `PLANET_NPC_DIALOGUE_STARTED` (or it was skipped)
- This is the first quest offered on planet surface (not tutorial quest)

**Prerequisites:**
- Tutorial state: `PLANET_NPC_DIALOGUE_STARTED` completed (or skipped)
- Quest offer event triggered
- Quest data loaded

**Display Logic:**
```javascript
tutorialEventBus.on(TUTORIAL_EVENTS.QUEST_OFFERED, (data) => {
  // Check if this is a planet surface quest (not tutorial quest)
  if (data.location === 'planet_surface' &&
      data.questId !== 'tutorial_001_dockside_initiation' &&
      (currentState === TUTORIAL_STATES.PLANET_NPC_DIALOGUE_STARTED ||
       !isStateCompleted(TUTORIAL_STATES.QUEST_FOUND))) {
    transitionTo(TUTORIAL_STATES.QUEST_FOUND, data);
  }
});
```

**Tutorial Content:**
- **Title:** "Quest Offered!"
- **Description:** "An NPC has offered you a quest! Quests give you objectives to complete and reward you with experience, credits, and items. You can accept or decline quests. Check your quest log (press 'Q' or click the quest tracker in the HUD) to see active quests."
- **Target:** Quest offer UI (dialogue interface or quest notification)
- **Position:** `bottom`
- **Show Highlight:** `true`
- **Highlight Target:** Quest offer UI
- **Actions:** "Got it" button

**Completion:**
- Player clicks "Got it" → Wait for quest acceptance
- OR player accepts quest → Transition to `QUEST_ACCEPTED` (existing state)

**Edge Cases:**
- If player accepts quest before tutorial, show tutorial after acceptance
- If quest is declined, tutorial still completes (player learned about quests)

---

### 9. Quest Objective Location Reached

**State:** `QUEST_OBJECTIVE_LOCATION_REACHED`

**Trigger Conditions:**
- Player has an active quest with a location-based objective
- Player enters the target location (POI, sub-map, or reaches coordinates)
- Quest objective tracker shows player is at objective location
- Player has completed `QUEST_ACCEPTED` (existing state)

**Prerequisites:**
- Tutorial state: `QUEST_ACCEPTED` completed
- Player has at least one active quest
- Quest has location-based objective
- Player is at objective location

**Display Logic:**
```javascript
tutorialEventBus.on(TUTORIAL_EVENTS.QUEST_OBJECTIVE_LOCATION_REACHED, (data) => {
  if (currentState === TUTORIAL_STATES.QUEST_ACCEPTED ||
      hasActiveQuestWithLocationObjective) {
    transitionTo(TUTORIAL_STATES.QUEST_OBJECTIVE_LOCATION_REACHED, data);
  }
});
```

**Tutorial Content:**
- **Title:** "Quest Objective Location"
- **Description:** "You've reached a quest objective location! Check your quest tracker in the HUD to see what you need to do here. Objectives might require talking to an NPC, finding an item, or defeating enemies."
- **Target:** Quest tracker in HUD
- **Position:** `bottom`
- **Show Highlight:** `true`
- **Highlight Target:** Quest tracker
- **Actions:** "Got it" button

**Completion:**
- Player clicks "Got it" → Wait for objective completion
- OR objective is completed → Transition to `QUEST_OBJECTIVE_COMPLETED`

**Edge Cases:**
- If objective completes before tutorial, skip to `QUEST_OBJECTIVE_COMPLETED`
- If player leaves location, tutorial can be shown again when returning

---

### 10. Quest Objective Completed

**State:** `QUEST_OBJECTIVE_COMPLETED`

**Trigger Conditions:**
- Player completes a quest objective (not the entire quest)
- Player has completed `QUEST_OBJECTIVE_LOCATION_REACHED` (or it was skipped)
- Quest still has remaining objectives OR quest is complete

**Prerequisites:**
- Tutorial state: `QUEST_OBJECTIVE_LOCATION_REACHED` completed (or skipped)
- Quest objective completion event triggered
- Quest data updated

**Display Logic:**
```javascript
tutorialEventBus.on(TUTORIAL_EVENTS.QUEST_OBJECTIVE_COMPLETED, (data) => {
  if (currentState === TUTORIAL_STATES.QUEST_OBJECTIVE_LOCATION_REACHED ||
      data.isFirstObjective) {
    transitionTo(TUTORIAL_STATES.QUEST_OBJECTIVE_COMPLETED, data);
  }
});
```

**Tutorial Content:**
- **Title:** "Objective Complete!"
- **Description:** "You've completed a quest objective! Check your quest tracker to see if there are more objectives. When all objectives are complete, return to the quest giver to turn in the quest and receive your rewards."
- **Target:** Quest tracker showing completed objective
- **Position:** `bottom`
- **Show Highlight:** `true`
- **Highlight Target:** Quest tracker
- **Actions:** "Got it" button

**Completion:**
- Player clicks "Got it" → If quest complete, transition to `QUEST_RETURN_TO_GIVER`
- OR if more objectives remain, tutorial completes and wait for next objective

**Edge Cases:**
- If all objectives complete immediately, transition to `QUEST_RETURN_TO_GIVER`
- If quest is abandoned, tutorial still completes (player learned about objectives)

---

### 11. Quest Return to Giver

**State:** `QUEST_RETURN_TO_GIVER`

**Trigger Conditions:**
- Player has completed all objectives for a quest
- Player is near or talking to the quest giver NPC
- Player has completed `QUEST_OBJECTIVE_COMPLETED` (or it was skipped)

**Prerequisites:**
- Tutorial state: `QUEST_OBJECTIVE_COMPLETED` completed (or skipped)
- Quest has all objectives completed
- Quest giver NPC exists and is accessible

**Display Logic:**
```javascript
tutorialEventBus.on(TUTORIAL_EVENTS.QUEST_READY_TO_TURN_IN, (data) => {
  if (currentState === TUTORIAL_STATES.QUEST_OBJECTIVE_COMPLETED ||
      (hasCompletedQuest && isNearQuestGiver)) {
    transitionTo(TUTORIAL_STATES.QUEST_RETURN_TO_GIVER, data);
  }
});
```

**Tutorial Content:**
- **Title:** "Turn In Your Quest"
- **Description:** "All your quest objectives are complete! Return to the quest giver and talk to them to turn in the quest. You'll receive experience points, credits, and possibly items as rewards."
- **Target:** Quest giver NPC (if visible) or quest tracker
- **Position:** `right` (if NPC visible) or `bottom` (if quest tracker)
- **Show Highlight:** `true`
- **Highlight Target:** Quest giver NPC or quest tracker
- **Actions:** "Got it" button

**Completion:**
- Player clicks "Got it" → Wait for quest turn-in
- OR quest is turned in → Tutorial complete, show rewards

**Edge Cases:**
- If quest giver is not on current map, show tutorial with general guidance
- If player turns in quest before tutorial, show tutorial after turn-in

---

### 12. Lockpicking Skill Required (Contextual)

**State:** `LOCKPICKING_SKILL_REQUIRED`

**Trigger Conditions:**
- Player attempts to interact with a locked door/container
- Player does NOT have lockpicking skill unlocked
- Lockpicking skill check fails (skill level <= 0)
- This is the first time player encounters this situation

**Prerequisites:**
- Player attempts lockpicking action
- Lockpicking service returns `reason: 'Lockpicking skill not unlocked'`
- Player character exists

**Display Logic:**
```javascript
tutorialEventBus.on(TUTORIAL_EVENTS.LOCKPICKING_FAILED_NO_SKILL, (data) => {
  if (data.reason === 'Lockpicking skill not unlocked' &&
      !isStateCompleted(TUTORIAL_STATES.LOCKPICKING_SKILL_REQUIRED)) {
    transitionTo(TUTORIAL_STATES.LOCKPICKING_SKILL_REQUIRED, data);
  }
});
```

**Tutorial Content:**
- **Title:** "Lockpicking Skill Required"
- **Description:** "This door is locked and requires the Lockpicking skill to open. To unlock Lockpicking, you need to be Level 3 and have Basic Stealth Level 2. Once you meet these requirements, you can spend a skill point to unlock Lockpicking in the Stealth skill tree. Check your Character Sheet to see your current level and skills."
- **Target:** Locked door/container or error message
- **Position:** `top`
- **Show Highlight:** `true`
- **Highlight Target:** Locked door/container
- **Actions:** "Got it" button, "Open Character Sheet" button (optional)

**Completion:**
- Player clicks "Got it" → Tutorial complete
- OR player opens character sheet → Tutorial complete, show skill tree if applicable

**Edge Cases:**
- If player already has skill but lacks stamina, show different message (not this tutorial)
- If player has skill but lockpicking fails for other reason, show different message
- If player is below Level 3, mention level requirement specifically

**State Checks Required:**
```javascript
// Before showing tutorial, check:
const character = await getCharacter(characterId);
const level = character.level || 1;
const stealthLevel = getSkillLevel(character, 'stealth', 'basic_stealth');
const lockpickingLevel = getSkillLevel(character, 'stealth', 'lockpicking');

if (lockpickingLevel <= 0) {
  // Show tutorial
  if (level < 3) {
    // Customize message: "You need to reach Level 3 first"
  } else if (stealthLevel < 2) {
    // Customize message: "You need Basic Stealth Level 2 first"
  } else {
    // Customize message: "You can unlock it now in your Character Sheet"
  }
}
```

---

### 13. Level Up Occurred (Contextual)

**State:** `LEVEL_UP_OCCURRED`

**Trigger Conditions:**
- Player character levels up (XP threshold reached)
- Level up event is triggered
- This is the first level up on planet surface (or first level up after tutorial start)

**Prerequisites:**
- Character XP >= level XP threshold
- Level up calculation successful
- Character level increased

**Display Logic:**
```javascript
tutorialEventBus.on(TUTORIAL_EVENTS.LEVEL_UP, (data) => {
  if (!isStateCompleted(TUTORIAL_STATES.LEVEL_UP_OCCURRED) ||
      data.isFirstLevelUpOnPlanet) {
    transitionTo(TUTORIAL_STATES.LEVEL_UP_OCCURRED, data);
  }
});
```

**Tutorial Content:**
- **Title:** "Level Up!"
- **Description:** "Congratulations! You've leveled up! Leveling up increases your maximum health and stamina, and grants you skill points and attribute points to spend. Check your Character Sheet to allocate these points and improve your character."
- **Target:** Level display in HUD (stats bar)
- **Position:** `bottom`
- **Show Highlight:** `true`
- **Highlight Target:** Level display in HUD
- **Actions:** "Got it" button, "Open Character Sheet" button (optional)

**Completion:**
- Player clicks "Got it" → If skill/attribute points available, transition to respective tutorials
- OR player opens character sheet → Tutorial complete

**Edge Cases:**
- If player levels up multiple times quickly, show tutorial once
- If player has no skill/attribute points (edge case), still show level up tutorial

---

### 14. Skill Points Available (Contextual)

**State:** `SKILL_POINTS_AVAILABLE`

**Trigger Conditions:**
- Player has skill points available (`character.skillPoints > 0`)
- Player has completed `LEVEL_UP_OCCURRED` (or it was skipped)
- Player opens character sheet OR skill points become available
- This is the first time player has skill points on planet surface

**Prerequisites:**
- Tutorial state: `LEVEL_UP_OCCURRED` completed (or skipped)
- Character has `skillPoints > 0`
- Character sheet is accessible

**Display Logic:**
```javascript
// Check when character sheet opens or skill points change
if (character.skillPoints > 0 &&
    (characterSheetOpen || skillPointsJustBecameAvailable) &&
    !isStateCompleted(TUTORIAL_STATES.SKILL_POINTS_AVAILABLE)) {
  transitionTo(TUTORIAL_STATES.SKILL_POINTS_AVAILABLE);
}
```

**Tutorial Content:**
- **Title:** "Skill Points Available"
- **Description:** "You have skill points to spend! Skills provide passive bonuses and unlock abilities. Open your Character Sheet and navigate to the Skills tab. Each skill tree (Combat, Stealth, Survival, etc.) has different skills you can unlock and improve. Spend your points wisely!"
- **Target:** Character Sheet Skills tab (if open) or Character Sheet button in HUD
- **Position:** `right` (if character sheet open) or `bottom` (if button)
- **Show Highlight:** `true`
- **Highlight Target:** Skills tab or Character Sheet button
- **Actions:** "Got it" button, "Open Character Sheet" button (if sheet not open)

**Completion:**
- Player clicks "Got it" → Tutorial complete
- OR player allocates a skill point → Tutorial complete

**Edge Cases:**
- If player allocates skill point before tutorial, show tutorial after allocation (explaining what they did)
- If player has multiple skill points, mention they can allocate multiple

---

### 15. Fast Travel Discovered (Contextual)

**State:** `FAST_TRAVEL_DISCOVERED`

**Trigger Conditions:**
- Player clicks on a spaceport POI on planet surface
- POI interaction menu shows "Fast Travel" option
- Player has not used fast travel before
- This is the first time player sees fast travel option

**Prerequisites:**
- POI type is 'spaceport'
- POI interaction menu is open
- Fast travel option is available

**Display Logic:**
```javascript
tutorialEventBus.on(TUTORIAL_EVENTS.FAST_TRAVEL_OPTION_SHOWN, (data) => {
  if (data.poiType === 'spaceport' &&
      !isStateCompleted(TUTORIAL_STATES.FAST_TRAVEL_DISCOVERED)) {
    transitionTo(TUTORIAL_STATES.FAST_TRAVEL_DISCOVERED, data);
  }
});
```

**Tutorial Content:**
- **Title:** "Fast Travel"
- **Description:** "You've discovered a fast travel point! Spaceports act as fast travel hubs. Once you've visited a spaceport, you can fast travel to it from other spaceports. This makes traveling between planets much faster. Click 'Fast Travel' to see available destinations."
- **Target:** Fast Travel button in POI menu
- **Position:** `left`
- **Show Highlight:** `true`
- **Highlight Target:** Fast Travel button
- **Actions:** "Got it" button

**Completion:**
- Player clicks "Got it" → Wait for fast travel usage
- OR player uses fast travel → Transition to `FAST_TRAVEL_USED`

**Edge Cases:**
- If player uses fast travel before tutorial, show tutorial after first use
- If fast travel is not available (no destinations), adjust message

---

### 16. Random Encounter Triggered (Contextual)

**State:** `RANDOM_ENCOUNTER_TRIGGERED`

**Trigger Conditions:**
- Random encounter is triggered while player is moving on planet surface
- Encounter dialog appears
- This is the first random encounter on planet surface

**Prerequisites:**
- Player is moving on planet surface
- Random encounter system triggers encounter
- Encounter dialog component is mounted

**Display Logic:**
```javascript
tutorialEventBus.on(TUTORIAL_EVENTS.RANDOM_ENCOUNTER_TRIGGERED, (data) => {
  if (data.location === 'planet_surface' &&
      !isStateCompleted(TUTORIAL_STATES.RANDOM_ENCOUNTER_TRIGGERED)) {
    transitionTo(TUTORIAL_STATES.RANDOM_ENCOUNTER_TRIGGERED, data);
  }
});
```

**Tutorial Content:**
- **Title:** "Random Encounter"
- **Description:** "You've encountered a random event! While exploring, you may encounter combat, NPCs, or other events. You can choose to engage, avoid, or investigate. These encounters provide opportunities for rewards and experience."
- **Target:** Encounter dialog
- **Position:** `bottom`
- **Show Highlight:** `true`
- **Highlight Target:** Encounter dialog
- **Actions:** "Got it" button

**Completion:**
- Player clicks "Got it" → Tutorial complete, player can interact with encounter
- OR player interacts with encounter → Tutorial complete

**Edge Cases:**
- If encounter is combat, mention combat will start
- If encounter is avoidable, explain avoidance options

---

### 17. Planet Surface Tutorial Complete

**State:** `PLANET_SURFACE_TUTORIAL_COMPLETE`

**Trigger Conditions:**
- Player has completed all critical planet surface tutorials:
  - `PLANET_SURFACE_INTRO`
  - `POI_ENTERED` (or `POI_INVESTIGATED`)
  - `QUEST_FOUND` (or `QUEST_ACCEPTED`)
  - `QUEST_OBJECTIVE_COMPLETED` (at least one)
- Optional tutorials can be incomplete (lockpicking, fast travel, etc.)

**Prerequisites:**
- Critical tutorials completed
- Player has demonstrated understanding of core mechanics

**Display Logic:**
```javascript
const criticalTutorials = [
  TUTORIAL_STATES.PLANET_SURFACE_INTRO,
  TUTORIAL_STATES.POI_ENTERED,
  TUTORIAL_STATES.QUEST_FOUND,
  TUTORIAL_STATES.QUEST_OBJECTIVE_COMPLETED
];

if (criticalTutorials.every(tutorial => isStateCompleted(tutorial))) {
  transitionTo(TUTORIAL_STATES.PLANET_SURFACE_TUTORIAL_COMPLETE);
}
```

**Tutorial Content:**
- **Title:** "Planet Surface Tutorial Complete"
- **Description:** "Congratulations! You've learned the basics of exploring the planet surface. You can now explore POIs, accept and complete quests, interact with NPCs, and discover new locations. Continue exploring to find more adventures!"
- **Target:** Center of screen
- **Position:** `center`
- **Show Highlight:** `false`
- **Actions:** "Continue Exploring" button

**Completion:**
- Player clicks "Continue Exploring" → Tutorial system inactive for planet surface
- Tutorial system will still show contextual tutorials (lockpicking, level up, etc.) as needed

---

## Trigger Conditions & Prerequisites

### Event Bus Events Required

New events to add to `tutorialEventBus.js`:

```javascript
export const TUTORIAL_EVENTS = {
  // ... existing events ...
  
  // Planet Surface
  PLANET_SURFACE_ENTERED: 'planet_surface_entered',
  POI_CLICKED: 'poi_clicked',
  POI_MENU_OPENED: 'poi_menu_opened',
  POI_ENTERED: 'poi_entered',
  POI_INVESTIGATED: 'poi_investigated',
  PLANET_NPC_CLICKED: 'planet_npc_clicked',
  QUEST_OBJECTIVE_LOCATION_REACHED: 'quest_objective_location_reached',
  QUEST_OBJECTIVE_COMPLETED: 'quest_objective_completed',
  QUEST_READY_TO_TURN_IN: 'quest_ready_to_turn_in',
  
  // Advanced Mechanics
  LOCKPICKING_FAILED_NO_SKILL: 'lockpicking_failed_no_skill',
  LOCKPICKING_ATTEMPTED: 'lockpicking_attempted',
  LEVEL_UP: 'level_up',
  SKILL_POINTS_AVAILABLE: 'skill_points_available',
  ATTRIBUTE_POINTS_AVAILABLE: 'attribute_points_available',
  FAST_TRAVEL_OPTION_SHOWN: 'fast_travel_option_shown',
  FAST_TRAVEL_USED: 'fast_travel_used',
  RANDOM_ENCOUNTER_TRIGGERED: 'random_encounter_triggered',
  
  // Exploration
  DISCOVERY_RECORDED: 'discovery_recorded',
  EXPLORATION_JOURNAL_OPENED: 'exploration_journal_opened'
};
```

### State Checks Required

**Character State Checks:**
- Level
- Skill points available
- Attribute points available
- Skill levels (especially lockpicking, basic stealth)
- Current location (planet surface vs sub-map)

**Quest State Checks:**
- Active quests
- Quest objectives status
- Quest giver location
- Objective locations

**POI State Checks:**
- POI type
- POI interaction state
- Available actions for POI

**Location State Checks:**
- Current map (planet surface vs sub-map)
- Recently exited spaceport
- Fast travel points discovered

---

## Edge Cases & Error Handling

### 1. Player Skips Tutorial Steps

**Scenario:** Player performs actions out of order (e.g., clicks POI before movement tutorial)

**Handling:**
- Tutorial system should auto-advance through skipped states
- Show tutorial for current action if it hasn't been shown
- Don't block player progress

**Implementation:**
```javascript
// In tutorialStateMachine.js
if (playerActionOccurs && !isStateCompleted(requiredTutorial)) {
  // Auto-advance to current tutorial
  autoAdvanceTo(currentTutorialState);
  // Show tutorial
  transitionTo(currentTutorialState);
}
```

### 2. Player Already Knows Mechanics

**Scenario:** Player has played before or is experienced

**Handling:**
- Provide "Skip Tutorial" option on first planet surface tutorial
- Allow dismissal of individual tutorials
- Don't force tutorials if player demonstrates understanding

### 3. Tutorial State Desync

**Scenario:** Frontend and backend tutorial states don't match

**Handling:**
- Sync with backend on component mount
- Use backend state as source of truth
- Log desync for debugging

### 4. Missing Prerequisites

**Scenario:** Tutorial tries to show but prerequisite data is missing (e.g., POI data not loaded)

**Handling:**
- Wait for data to load before showing tutorial
- Show loading state if needed
- Timeout after reasonable wait period

### 5. Player Leaves Planet Surface

**Scenario:** Player navigates away during tutorial

**Handling:**
- Save tutorial state
- Resume tutorial when player returns
- Don't show tutorial if player has completed it

### 6. Multiple Tutorials Eligible

**Scenario:** Multiple tutorial conditions are met simultaneously (e.g., level up + quest complete)

**Handling:**
- Prioritize tutorials by importance:
  1. Contextual tutorials (lockpicking, level up) - show immediately
  2. Quest-related tutorials - show after contextual
  3. General tutorials - show last
- Queue tutorials if needed
- Show one at a time

---

## Implementation Requirements

### Backend Changes

1. **Update TutorialProgress Model:**
   - Add new tutorial states to `isIn` validation array
   - Ensure state field can store all new states

2. **Update Tutorial Service:**
   - Add methods to check player state (level, skills, etc.)
   - Add methods to determine if tutorial should show

3. **Add Event Emitters:**
   - Emit tutorial events from relevant services:
     - POI service: `POI_CLICKED`, `POI_ENTERED`
     - Quest service: `QUEST_OBJECTIVE_LOCATION_REACHED`, `QUEST_OBJECTIVE_COMPLETED`
     - Lockpicking service: `LOCKPICKING_FAILED_NO_SKILL`
     - Character service: `LEVEL_UP`, `SKILL_POINTS_AVAILABLE`

### Frontend Changes

1. **Update Tutorial State Machine:**
   - Add new states to `TUTORIAL_STATES`
   - Add new states to `STATE_ORDER`
   - Add event listeners for new events
   - Add state transition logic

2. **Update Tutorial Overlay:**
   - Add step configurations for new tutorials
   - Add target registrations for new UI elements
   - Update `handleNext` logic for new states

3. **Add Event Emitters:**
   - Emit events from relevant components:
     - `PlanetSurface.jsx`: `PLANET_SURFACE_ENTERED`, `POI_CLICKED`
     - `POIInteractionMenu.jsx`: `POI_MENU_OPENED`, `POI_ENTERED`
     - `NPCInteractionMenu.jsx`: `PLANET_NPC_CLICKED`
     - `SubMapView.jsx`: Lockpicking events
     - `StatsBar.jsx`: `LEVEL_UP` (if level changes)

4. **Add Tutorial Targets:**
   - Register tutorial targets in `tutorialTargetRegistry.js`:
     - `POI_ICON`
     - `POI_INTERACTION_MENU`
     - `PLANET_NPC_ICON`
     - `QUEST_TRACKER`
     - `LOCKED_DOOR`
     - `CHARACTER_SHEET_BUTTON`
     - `FAST_TRAVEL_BUTTON`

5. **Update Components:**
   - Add `data-tutorial-target` attributes to relevant elements
   - Emit tutorial events at appropriate times
   - Check tutorial state before showing/hiding UI elements

### Data Requirements

1. **Tutorial Step Configurations:**
   - Title, description, target, position for each step
   - Highlight targets
   - Action buttons

2. **State Validation:**
   - Character level thresholds
   - Skill level thresholds
   - Quest state checks

---

## Testing Requirements

### Unit Tests

1. **Tutorial State Machine:**
   - State transitions work correctly
   - Event listeners trigger appropriate transitions
   - State validation works

2. **Tutorial Overlay:**
   - Tutorials display with correct content
   - Targets are highlighted correctly
   - "Next" button advances tutorial

### Integration Tests

1. **Planet Surface Flow:**
   - Player exits spaceport → `PLANET_SURFACE_INTRO` shows
   - Player moves → `PLANET_SURFACE_MOVEMENT` shows
   - Player clicks POI → `POI_DISCOVERED` shows
   - Player enters POI → `POI_ENTERED` shows

2. **Quest Flow:**
   - Player talks to NPC → `PLANET_NPC_DIALOGUE_STARTED` shows
   - NPC offers quest → `QUEST_FOUND` shows
   - Player accepts quest → Quest objectives tracked
   - Player reaches objective location → `QUEST_OBJECTIVE_LOCATION_REACHED` shows
   - Player completes objective → `QUEST_OBJECTIVE_COMPLETED` shows
   - Player returns to giver → `QUEST_RETURN_TO_GIVER` shows

3. **Contextual Tutorials:**
   - Player tries locked door without skill → `LOCKPICKING_SKILL_REQUIRED` shows
   - Player levels up → `LEVEL_UP_OCCURRED` shows
   - Player has skill points → `SKILL_POINTS_AVAILABLE` shows
   - Player sees fast travel → `FAST_TRAVEL_DISCOVERED` shows

### Edge Case Tests

1. **Out-of-Order Actions:**
   - Player clicks POI before movement tutorial
   - Player accepts quest before dialogue tutorial
   - Player completes objective before location tutorial

2. **State Desync:**
   - Frontend and backend states differ
   - Tutorial state lost on refresh

3. **Missing Data:**
   - POI data not loaded
   - Quest data not loaded
   - Character data not loaded

4. **Multiple Tutorials:**
   - Level up + quest complete simultaneously
   - Multiple POIs clicked quickly
   - Multiple quests active

### User Acceptance Tests

1. **First-Time Player:**
   - Complete tutorial flow from spaceport exit to quest completion
   - Verify all critical tutorials appear
   - Verify tutorials are helpful and not intrusive

2. **Experienced Player:**
   - Skip tutorial option works
   - Tutorials don't block progress
   - Contextual tutorials still appear when relevant

3. **Returning Player:**
   - Tutorial state persists
   - Completed tutorials don't reappear
   - In-progress tutorials resume correctly

---

## Appendix

### Tutorial State Priority

When multiple tutorials are eligible, show in this order:

1. **Critical Contextual:** Lockpicking skill required, Level up, Skill points available
2. **Quest-Related:** Quest found, Objective location reached, Objective completed, Return to giver
3. **POI-Related:** POI discovered, POI menu opened, POI entered
4. **General:** Planet surface intro, Movement, NPC interaction
5. **Optional:** Fast travel, Random encounter, Exploration journal

### Tutorial Dismissal Rules

- **Cannot Dismiss:** Critical contextual tutorials (lockpicking, level up) - must click "Got it"
- **Can Dismiss:** General tutorials - can click "Skip" or close overlay
- **Auto-Dismiss:** Movement tutorials - auto-complete on action

### Tutorial Completion Tracking

- Track completion in `TutorialProgress.completedStates` array
- Store completion timestamp in `TutorialProgress.milestones`
- Use completion status to prevent re-showing tutorials

---

**End of Document**




