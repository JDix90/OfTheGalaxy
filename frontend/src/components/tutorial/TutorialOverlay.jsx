/**
 * Tutorial Overlay Component
 * Main component that orchestrates tutorial tooltips and highlights
 */

import React, { useMemo, useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTutorial } from '../../contexts/TutorialContext';
import { useCharacterStore } from '../../state/characterSlice';
import { useCombatStore } from '../../state/combatSlice';
import { TUTORIAL_STATES } from '../../services/tutorialStateMachine';
import { tutorialApi } from '../../services/api/tutorialApi';
import { tutorialEventBus, TUTORIAL_EVENTS } from '../../services/tutorialEventBus';
import tutorialMetrics from '../../services/tutorialMetrics';
import TutorialTooltip from './TutorialTooltip';
import TutorialHighlight from './TutorialHighlight';
import './TutorialOverlay.css';

// Tutorial step configurations
const TUTORIAL_STEPS = {
  [TUTORIAL_STATES.STARTING]: {
    title: 'Planetfall on Solenne',
    description: "You've made planetfall at the Solenne docks, edge of the Severed Reach. Dockmaster Jax runs these landing bays — find him and he'll show you how to stay breathing out here.",
    target: null, // Center tooltip
    position: 'center',
    showHighlight: false
  },
  [TUTORIAL_STATES.ORIENT_UI]: {
    title: 'Planetfall on Solenne',
    description: "Welcome to the Solenne docks. Get your bearings, then look for Dockmaster Jax. Move with the arrow keys or WASD.",
    target: null, // Center tooltip
    position: 'center',
    showHighlight: false
  },
  [TUTORIAL_STATES.MOVEMENT_INTRO]: {
    title: 'Find Your Feet',
    description: 'Move with WASD or the arrow keys. Make your way toward the highlighted contact — that\'s Dockmaster Jax.',
    target: 'planet-map-canvas',
    position: 'center',
    showHighlight: true,
    highlightTarget: 'npc-icon'
  },
  [TUTORIAL_STATES.MOVEMENT_COMPLETE]: {
    title: 'Great! You\'ve Moved',
    description: "You've learned how to move! Now click on the highlighted NPC to interact with them.",
    target: 'npc-icon',
    position: 'right',
    showHighlight: true,
    highlightTarget: 'npc-icon'
  },
  [TUTORIAL_STATES.NPC_INTERACTION_INTRO]: {
    title: 'NPC Interaction',
    description: 'Click on the NPC icon to interact. You can talk, trade, accept quests, or attack.',
    target: 'npc-icon',
    position: 'right',
    showHighlight: true,
    highlightTarget: 'npc-icon'
  },
  [TUTORIAL_STATES.NPC_MENU_OPENED]: {
    title: 'Interaction Menu',
    description: "This is the interaction menu. Click 'Talk' to start a conversation.",
    target: 'npc-interaction-menu',
    position: 'right',
    showHighlight: true,
    highlightTarget: 'npc-talk-button'
  },
  [TUTORIAL_STATES.DIALOGUE_STARTED]: {
    title: 'Dialogue Interface',
    description: "This is the dialogue interface. You can type messages or use suggested replies.",
    target: 'dialogue-interface',
    position: 'top',
    showHighlight: true,
    highlightTarget: 'dialogue-input'
  },
  [TUTORIAL_STATES.QUEST_OFFERED]: {
    title: 'Quest Offer',
    description: "NPCs can offer quests. This is your first quest! Review the objectives and rewards, then click 'Accept'.",
    target: 'quest-offer-modal',
    position: 'center',
    showHighlight: true,
    highlightTarget: 'quest-accept-button'
  },
  [TUTORIAL_STATES.QUEST_ACCEPTED]: {
    title: 'Quest Accepted!',
    description: 'Your quest has been added to your quest log. You can track objectives in the HUD or open the full quest log.',
    target: 'hud-quest-tracker',
    position: 'bottom',
    showHighlight: true,
    highlightTarget: 'hud-quest-tracker'
  },
  [TUTORIAL_STATES.QUEST_OBJECTIVE_TRACKING]: {
    title: 'Continue the Tutorial',
    description: 'Great! You\'ve accepted the quest. Continue talking with the tutorial NPC - they\'ll guide you through the next steps.',
    target: null,
    position: 'center',
    showHighlight: false
  },
  [TUTORIAL_STATES.COMBAT_INTRO]: {
    title: 'Combat Tutorial',
    description: "You're about to enter your first combat encounter! This tutorial will teach you the basics of turn-based combat. Pay attention to the turn order, action menu, and how to use your abilities. Ready to begin?",
    target: null, // Center tooltip
    position: 'center',
    showHighlight: false
  },
  [TUTORIAL_STATES.COMBAT_STARTED]: {
    title: 'Combat Started!',
    description: "Welcome to combat! Let's learn the basics. First, look at the turn order panel to see who acts when.",
    target: 'combat-turn-order',
    position: 'right',
    showHighlight: true,
    highlightTarget: 'combat-turn-order'
  },
  [TUTORIAL_STATES.COMBAT_TURN_ORDER_EXPLAINED]: {
    title: 'Turn Order',
    description: 'This shows the turn order. The highlighted combatant is currently acting. You\'ll see when it\'s your turn.',
    target: 'combat-turn-order',
    position: 'right',
    showHighlight: true,
    highlightTarget: 'combat-turn-order'
  },
  [TUTORIAL_STATES.COMBAT_ACTION_MENU_EXPLAINED]: {
    title: 'Action Menu',
    description: 'During your turn, select an action. You can Attack, Defend, Use Items, or Flee.',
    target: 'combat-action-menu',
    position: 'top',
    showHighlight: true,
    highlightTarget: 'combat-action-menu'
  },
  [TUTORIAL_STATES.COMBAT_TARGETING_EXPLAINED]: {
    title: 'Targeting',
    description: 'Now select a target. Click on an enemy to attack them.',
    target: 'combat-enemy-combatant',
    position: 'bottom',
    showHighlight: true,
    highlightTarget: 'combat-enemy-combatant'
  },
  [TUTORIAL_STATES.LOOT_RECEIVED]: {
    title: 'Open Your Inventory',
    description: "Great! Now that you've learned about trading, let's learn about your inventory. Press the 'i' key on your keyboard or click the inventory button to open your inventory and see your items, including the medpac you just bought.",
    target: 'hud-inventory-button',
    position: 'bottom',
    showHighlight: true,
    highlightTarget: 'hud-inventory-button'
  },
  [TUTORIAL_STATES.INVENTORY_OPENED]: {
    title: 'Inventory',
    description: 'This is your inventory. Items you collect appear here. You can equip weapons and armor, or use consumables like medpacs. Find the medpac you just bought and click "Use" to restore your health.',
    target: 'inventory-view',
    position: 'center',
    showHighlight: false
  },
  [TUTORIAL_STATES.HEALING_EXPLAINED]: {
    title: 'Use Your Medpac',
    description: 'Great! You found your medpac. Click the "Use" button on the medpac to restore your health. Medpacs are essential for healing after combat.',
    target: 'inventory-item-medpac',
    position: 'center',
    showHighlight: true,
    highlightTarget: 'inventory-item-medpac'
  },
  [TUTORIAL_STATES.MEDPAC_USED]: {
    title: 'Medpac Used!',
    description: 'Excellent! You\'ve successfully used a medpac to restore your health. Notice how your health bar at the top of the screen has been updated. Let\'s learn about the HUD elements that help you track your character\'s status.',
    target: null,
    position: 'center',
    showHighlight: false
  },
  [TUTORIAL_STATES.HUD_HEALTH_STAMINA_EXPLAINED]: {
    title: 'Health & Stamina HUD',
    description: 'At the top left of your screen, you can see your Health and Stamina bars. Health shows how much damage you can take before being defeated. Stamina is used for actions like attacking in combat. Keep an eye on these bars to monitor your character\'s condition.',
    target: 'hud-health-stamina',
    position: 'bottom',
    showHighlight: true,
    highlightTarget: 'hud-health-stamina'
  },
  [TUTORIAL_STATES.HUD_CREDITS_LEVEL_XP_EXPLAINED]: {
    title: 'Credits, Level & XP HUD',
    description: 'At the top right, you can see your Credits (currency), Level, and XP (experience points). Credits are used to buy items from vendors. Level shows your character\'s current level, and XP tracks your progress toward the next level. Click on these elements to open related menus.',
    target: 'hud-credits-level-xp',
    position: 'bottom',
    showHighlight: true,
    highlightTarget: 'hud-credits-level-xp'
  },
  [TUTORIAL_STATES.SPACEPORT_EXIT_EXPLAINED]: {
    title: 'Exit the Spaceport',
    description: 'To exit the spaceport and return to the planet surface, move your character to the Spaceport Entrance icon on the map. When you get close, you\'ll automatically exit to the planet surface. This is how you navigate between locations in the game.',
    target: 'spaceport-exit-point',
    position: 'center',
    showHighlight: true,
    highlightTarget: 'spaceport-exit-point'
  },
  [TUTORIAL_STATES.VENDOR_INTRO]: {
    title: 'Vendor',
    description: 'This is a vendor. You can buy and sell items here. Credits are used for trading, travel, and equipment.',
    target: 'npc-icon',
    position: 'right',
    showHighlight: true,
    highlightTarget: 'npc-icon'
  },
  [TUTORIAL_STATES.VENDOR_OPENED]: {
    title: 'Trading Interface',
    description: 'This is the trading interface. You can buy items from the vendor or sell items from your inventory. Hover over items in the list to see detailed information about them.',
    target: 'vendor-item-list',
    position: 'right',
    showHighlight: true,
    highlightTarget: 'vendor-item-list'
  },
  [TUTORIAL_STATES.VENDOR_ITEM_HOVER_EXPLAINED]: {
    title: 'Item Information',
    description: 'When you hover over or click an item, you\'ll see its description, price, and other details in the transaction panel. Try hovering over the Medpac to see its information.',
    target: 'vendor-item-medpac',
    position: 'left',
    showHighlight: true,
    highlightTarget: 'vendor-item-medpac'
  },
  [TUTORIAL_STATES.VENDOR_BUY_MEDPAC]: {
    title: 'Buy a Medpac',
    description: 'Great! You\'ve selected the Medpac. This item will restore your health. Click the "Buy" button to purchase it. You\'ll need 50 credits.',
    target: 'vendor-buy-button',
    position: 'top',
    showHighlight: true,
    highlightTarget: 'vendor-buy-button'
  },
  [TUTORIAL_STATES.VENDOR_SELL_DROID_PARTS]: {
    title: 'Sell Your Loot',
    description: 'Now let\'s sell the droid parts you collected from the combat encounter. Switch to the "Sell" tab, then select the droid parts and click "Sell".',
    target: 'vendor-sell-tab',
    position: 'bottom',
    showHighlight: true,
    highlightTarget: 'vendor-sell-tab'
  },
  [TUTORIAL_STATES.ITEM_BOUGHT]: {
    title: 'Item Purchased!',
    description: 'Great! You\'ve purchased a medpac. This item is now in your inventory and can be used to restore health. Now let\'s sell the droid parts you collected from combat.',
    target: null,
    position: 'center',
    showHighlight: false
  },
  [TUTORIAL_STATES.ITEM_SOLD]: {
    title: 'Item Sold!',
    description: 'Excellent! You\'ve successfully sold the droid parts. You\'ve learned how to buy and sell items with vendors. This is an important skill for managing your resources in the galaxy.',
    target: null,
    position: 'center',
    showHighlight: false
  },
  [TUTORIAL_STATES.TRAVEL_INTRO]: {
    title: 'Galaxy Map',
    description: 'Ready to explore? Open the galaxy map to travel to other planets. Each planet has unique quests, NPCs, and opportunities.',
    target: 'hud-galaxy-map-button',
    position: 'bottom',
    showHighlight: true,
    highlightTarget: 'hud-galaxy-map-button'
  },
  [TUTORIAL_STATES.GALAXY_MAP_OPENED]: {
    title: 'Galaxy Map',
    description: 'This is the galaxy map. Click on a star system to see its planets, then select a planet to travel there.',
    target: 'galaxy-map-view',
    position: 'center',
    showHighlight: false
  },
  [TUTORIAL_STATES.TUTORIAL_COMPLETE]: {
    title: "You're On Your Way",
    description: "You've learned the four things that keep a drifter alive: move with WASD, fight turn-by-turn, heal with medpacs from your inventory (I), and trade where your standing changes the price. The galaxy map is open now — there are quests waiting across the Reach. It's wide and it doesn't care about you, but Jax does, a little. Now get going.",
    target: null,
    position: 'center',
    showHighlight: false
  },
  
  // Planet Surface Tutorial Steps
  [TUTORIAL_STATES.PLANET_SURFACE_INTRO]: {
    title: 'Welcome to the Planet Surface',
    description: "You've left the spaceport and are now exploring the planet surface. This is where you'll find quests, discover locations, and encounter challenges. Use WASD or arrow keys to move around.",
    target: null,
    position: 'center',
    showHighlight: false
  },
  [TUTORIAL_STATES.PLANET_SURFACE_MOVEMENT]: {
    title: 'Movement on Planet Surface',
    description: 'Move your character using WASD or arrow keys. You can click on icons you see on the map to interact with them. Try moving around to explore!',
    target: 'player-character-icon',
    position: 'top',
    showHighlight: true,
    highlightTarget: 'player-character-icon'
  },
  [TUTORIAL_STATES.POI_DISCOVERED]: {
    title: 'Points of Interest',
    description: "You've found a Point of Interest (POI)! These are locations you can explore, such as cities, cantinas, ruins, and more. Click on the POI to see what actions are available.",
    target: 'poi-icon',
    position: 'right',
    showHighlight: true,
    highlightTarget: 'poi-icon'
  },
  [TUTORIAL_STATES.POI_INTERACTION_MENU_OPENED]: {
    title: 'POI Interaction Menu',
    description: "This menu shows what you can do at this location. Common actions include 'Enter' (to go inside), 'Investigate' (to learn more), and 'Search' (to find loot). Different POI types offer different actions.",
    target: 'poi-interaction-menu',
    position: 'left',
    showHighlight: true,
    highlightTarget: 'poi-interaction-menu'
  },
  [TUTORIAL_STATES.POI_ENTERED]: {
    title: 'Entering a Location',
    description: "You've entered a sub-map! This is an interior view of the location. You can explore, talk to NPCs, and find quests here. To return to the planet surface, look for the exit point (usually marked on the map).",
    target: null,
    position: 'center',
    showHighlight: false
  },
  [TUTORIAL_STATES.POI_INVESTIGATED]: {
    title: 'Investigating a POI',
    description: "You've investigated this location and learned more about it. Some POIs provide lore, while others may reveal hidden items or quests. Keep exploring to discover more!",
    target: null,
    position: 'center',
    showHighlight: false
  },
  [TUTORIAL_STATES.PLANET_NPC_CLICKED]: {
    title: 'NPCs on Planet Surface',
    description: "NPCs on the planet surface can offer quests, provide information, or trade with you. Click on an NPC to see what options are available. Many quests start by talking to NPCs.",
    target: 'planet-npc-icon',
    position: 'right',
    showHighlight: true,
    highlightTarget: 'planet-npc-icon'
  },
  [TUTORIAL_STATES.PLANET_NPC_DIALOGUE_STARTED]: {
    title: 'Talking to NPCs',
    description: "You're now in a dialogue with an NPC. NPCs can offer quests, share information, or provide services. Read their messages and use the suggested responses or type your own. Some NPCs will offer quests - accept them to get objectives!",
    target: 'dialogue-interface',
    position: 'top',
    showHighlight: true,
    highlightTarget: 'dialogue-interface'
  },
  [TUTORIAL_STATES.QUEST_FOUND]: {
    title: 'Quest Offered!',
    description: "An NPC has offered you a quest! Quests give you objectives to complete and reward you with experience, credits, and items. You can accept or decline quests. Check your quest log (press 'Q' or click the quest tracker in the HUD) to see active quests.",
    target: 'quest-offer-ui',
    position: 'bottom',
    showHighlight: true,
    highlightTarget: 'quest-offer-ui'
  },
  [TUTORIAL_STATES.QUEST_OBJECTIVE_LOCATION_REACHED]: {
    title: 'Quest Objective Location',
    description: "You've reached a quest objective location! Check your quest tracker in the HUD to see what you need to do here. Objectives might require talking to an NPC, finding an item, or defeating enemies.",
    target: 'hud-quest-tracker',
    position: 'bottom',
    showHighlight: true,
    highlightTarget: 'hud-quest-tracker'
  },
  [TUTORIAL_STATES.QUEST_OBJECTIVE_COMPLETED]: {
    title: 'Objective Complete!',
    description: "You've completed a quest objective! Check your quest tracker to see if there are more objectives. When all objectives are complete, return to the quest giver to turn in the quest and receive your rewards.",
    target: 'hud-quest-tracker',
    position: 'bottom',
    showHighlight: true,
    highlightTarget: 'hud-quest-tracker'
  },
  [TUTORIAL_STATES.QUEST_RETURN_TO_GIVER]: {
    title: 'Turn In Your Quest',
    description: "All your quest objectives are complete! Return to the quest giver and talk to them to turn in the quest. You'll receive experience points, credits, and possibly items as rewards.",
    target: 'quest-giver-npc',
    position: 'right',
    showHighlight: true,
    highlightTarget: 'quest-giver-npc'
  },
  [TUTORIAL_STATES.LOCKPICKING_SKILL_REQUIRED]: {
    title: 'Lockpicking Skill Required',
    description: "This door is locked and requires the Lockpicking skill to open. To unlock Lockpicking, you need to be Level 3 and have Basic Stealth Level 2. Once you meet these requirements, you can spend a skill point to unlock Lockpicking in the Stealth skill tree. Check your Character Sheet to see your current level and skills.",
    target: 'locked-door',
    position: 'top',
    showHighlight: true,
    highlightTarget: 'locked-door'
  },
  [TUTORIAL_STATES.LEVEL_UP_OCCURRED]: {
    title: 'Level Up!',
    description: "Congratulations! You've leveled up! Leveling up increases your maximum health and stamina, and grants you skill points and attribute points to spend. Check your Character Sheet to allocate these points and improve your character.",
    target: 'hud-level-display',
    position: 'bottom',
    showHighlight: true,
    highlightTarget: 'hud-level-display'
  },
  [TUTORIAL_STATES.SKILL_POINTS_AVAILABLE]: {
    title: 'Skill Points Available',
    description: "You have skill points to spend! Skills provide passive bonuses and unlock abilities. Open your Character Sheet and navigate to the Skills tab. Each skill tree (Combat, Stealth, Survival, etc.) has different skills you can unlock and improve. Spend your points wisely!",
    target: 'character-sheet-skills-tab',
    position: 'right',
    showHighlight: true,
    highlightTarget: 'character-sheet-skills-tab'
  },
  [TUTORIAL_STATES.FAST_TRAVEL_DISCOVERED]: {
    title: 'Fast Travel',
    description: "You've discovered a fast travel point! Spaceports act as fast travel hubs. Once you've visited a spaceport, you can fast travel to it from other spaceports. This makes traveling between planets much faster. Click 'Fast Travel' to see available destinations.",
    target: 'fast-travel-button',
    position: 'left',
    showHighlight: true,
    highlightTarget: 'fast-travel-button'
  },
  [TUTORIAL_STATES.RANDOM_ENCOUNTER_TRIGGERED]: {
    title: 'Random Encounter',
    description: "You've encountered a random event! While exploring, you may encounter combat, NPCs, or other events. You can choose to engage, avoid, or investigate. These encounters provide opportunities for rewards and experience.",
    target: 'encounter-dialog',
    position: 'bottom',
    showHighlight: true,
    highlightTarget: 'encounter-dialog'
  },
  [TUTORIAL_STATES.PLANET_SURFACE_TUTORIAL_COMPLETE]: {
    title: 'Planet Surface Tutorial Complete',
    description: "Congratulations! You've learned the basics of exploring the planet surface. You can now explore POIs, accept and complete quests, interact with NPCs, and discover new locations. Continue exploring to find more adventures!",
    target: null,
    position: 'center',
    showHighlight: false
  }
};

export default function TutorialOverlay() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentCharacter } = useCharacterStore();
  const { startEncounter } = useCombatStore();
  const { currentState, isActive, skipTutorial, transitionTo, isLoading, isStateCompleted, completeStep, stateMachine } = useTutorial();
  const [dismissedSteps, setDismissedSteps] = useState(new Set());

  // Dev-only golden-path pacing instrumentation: timestamp each state entry so we
  // can measure the run against the ~10-minute target and spot stalls. A fresh
  // run (leaving not_started) resets the clock. No-op in production.
  const prevMetricStateRef = useRef(null);
  useEffect(() => {
    if (!currentState || currentState === TUTORIAL_STATES.NOT_STARTED) {
      prevMetricStateRef.current = currentState;
      return;
    }
    if (prevMetricStateRef.current === TUTORIAL_STATES.NOT_STARTED) {
      tutorialMetrics.reset();
    }
    tutorialMetrics.mark(currentState);
    prevMetricStateRef.current = currentState;
  }, [currentState]);

  // Debug log at component level
  if (currentState === TUTORIAL_STATES.COMBAT_INTRO) {
    console.log('[TutorialOverlay] COMBAT_INTRO state detected:', { currentState, isActive, isLoading });
  }
  
  // Check if we're on the planet surface, submap, combat page, or vendor page
  const isOnPlanetSurface = location.pathname.startsWith('/game/planet/');
  const isOnSubmap = location.pathname.startsWith('/game/location/') || location.pathname.startsWith('/game/submap/');
  const isOnGameWorld = location.pathname === '/game';
  const isOnCombat = location.pathname.startsWith('/game/combat/');
  const isOnVendor = location.pathname.startsWith('/game/vendor/');
  
  // Track if we've already navigated for this tutorial state to prevent loops
  const navigationRef = useRef({ state: null, hasNavigated: false });
  
  // Close inventory when MEDPAC_USED or HUD tutorial steps are reached so HUD elements are visible
  useEffect(() => {
    const statesThatRequireInventoryClosed = [
      TUTORIAL_STATES.MEDPAC_USED,
      TUTORIAL_STATES.HUD_HEALTH_STAMINA_EXPLAINED,
      TUTORIAL_STATES.HUD_CREDITS_LEVEL_XP_EXPLAINED,
      TUTORIAL_STATES.SPACEPORT_EXIT_EXPLAINED
    ];
    
    if (statesThatRequireInventoryClosed.includes(currentState)) {
      // Check if inventory is open
      const inventoryOverlay = document.querySelector('.inventory-overlay');
      if (inventoryOverlay) {
        // Emit event to close inventory
        window.dispatchEvent(new CustomEvent('hud:closeInventory'));
        console.log(`[TutorialOverlay] Closing inventory for ${currentState} step`);
      }
    }
  }, [currentState]);
  
  // Navigate to planet surface when movement tutorial starts (only if not on submap and not on /game)
  // CRITICAL: Do NOT navigate if we're on a submap - tutorial should stay on submap
  // CRITICAL: Do NOT auto-navigate if player is on /game page - let them navigate manually
  useEffect(() => {
    // Reset navigation tracking if tutorial state changes
    if (navigationRef.current.state !== currentState) {
      navigationRef.current = { state: currentState, hasNavigated: false };
    }
    
    // Only auto-navigate if:
    // 1. We're in movement_intro state
    // 2. We're NOT on planet surface
    // 3. We're NOT on submap
    // 4. We're NOT on /game page (let player navigate manually)
    // 5. We haven't already navigated for this state
    if (
      currentState === TUTORIAL_STATES.MOVEMENT_INTRO && 
      !isOnPlanetSurface && 
      !isOnSubmap && 
      !isOnGameWorld &&
      currentCharacter &&
      !navigationRef.current.hasNavigated
    ) {
      console.log('[TutorialOverlay] Auto-navigating to planet surface for movement tutorial');
      navigationRef.current.hasNavigated = true;
      navigate(`/game/planet/${currentCharacter.currentPlanet}`);
    } else if (currentState === TUTORIAL_STATES.MOVEMENT_INTRO && isOnSubmap) {
      console.log('[TutorialOverlay] Movement tutorial on submap - staying on submap');
    } else if (currentState === TUTORIAL_STATES.MOVEMENT_INTRO && isOnGameWorld) {
      console.log('[TutorialOverlay] Movement tutorial on /game page - waiting for player to navigate manually');
    }
  }, [currentState, isOnPlanetSurface, isOnSubmap, isOnGameWorld, currentCharacter, navigate]);
  
  // Get tutorial NPC name based on character background
  // #16: the onboarding guide is unified to Dockmaster Jax for every background.
  const tutorialNPCName = 'Dockmaster Jax';
  
  // Get current step configuration - adjust based on current page
  const currentStep = useMemo(() => {
    const baseStep = TUTORIAL_STEPS[currentState] || null;
    
    if (!baseStep) return null;
    
    // Adjust step content based on current page
    if (currentState === TUTORIAL_STATES.ORIENT_UI && isOnGameWorld) {
      // On GameWorld page - show welcome that makes sense for this page
      return {
        ...baseStep,
        title: 'Welcome to the Severed Reach',
        description: "Your ship's logged in and the docks are waiting. Click 'Next' to make planetfall and meet the dockmaster who'll show you the ropes.",
        target: null,
        position: 'center'
      };
    }
    
    // Adjust MOVEMENT_COMPLETE step to use correct NPC name
    if (currentState === TUTORIAL_STATES.MOVEMENT_COMPLETE) {
      return {
        ...baseStep,
        description: `You've learned how to move! Now click on the highlighted NPC (${tutorialNPCName}) to interact with them.`
      };
    }
    
    // Adjust movement tutorial based on current page context
    if (currentState === TUTORIAL_STATES.MOVEMENT_INTRO) {
      if (isOnSubmap) {
        // On submap - show submap-specific instructions with correct NPC name
        return {
          ...baseStep,
          title: 'Movement',
          description: `Use WASD or arrow keys to move your character. Try moving toward ${tutorialNPCName} (the highlighted NPC).`,
          target: 'submap-view',
          position: 'center',
          showHighlight: true,
          highlightTarget: 'npc-icon'
        };
      } else if (isOnGameWorld) {
        // On /game page - show instructions to navigate to planet manually
        return {
          ...baseStep,
          title: 'Ready to Explore?',
          description: "To learn movement, navigate to a planet surface. Use the Galaxy Map button or click on a planet location to travel there. The tutorial will continue once you're on a planet.",
          target: null,
          position: 'center',
          showHighlight: false
        };
      } else if (!isOnPlanetSurface) {
        // Not on planet surface or submap (and not on /game) - show traveling message
        return {
          ...baseStep,
          title: 'Traveling to Planet...',
          description: "Navigating to your starting planet. You'll learn movement controls there.",
          target: null,
          position: 'center',
          showHighlight: false
        };
      }
    }
    
    // Adjust QUEST_ACCEPTED step - if dialogue interface is open, don't try to highlight quest tracker
    // (it will be hidden behind the dialogue interface)
    if (currentState === TUTORIAL_STATES.QUEST_ACCEPTED) {
      // Check if dialogue interface is visible by looking for the dialogue element in DOM
      const dialogueElement = document.querySelector('[data-tutorial-target="dialogue-interface"]');
      const isDialogueOpen = dialogueElement && dialogueElement.offsetParent !== null;
      
      if (isDialogueOpen) {
        // Dialogue is open - show centered message without highlighting
        return {
          ...baseStep,
          title: 'Quest Accepted!',
          description: 'Your quest has been added to your quest log. After you finish talking, you can track objectives in the HUD quest tracker (top right) or open the full quest log from the menu.',
          target: null,
          position: 'center',
          showHighlight: false
        };
      }
      // Dialogue is closed - show normal step with quest tracker highlight
      // (baseStep already has the correct configuration)
    }
    
    // Vendor tutorial steps - adjust based on current state
    if (currentState === TUTORIAL_STATES.VENDOR_SELL_DROID_PARTS) {
      // Check if player is on sell tab
      const sellTabActive = document.querySelector('[data-tutorial-target="vendor-sell-tab"]')?.classList.contains('active');
      if (sellTabActive) {
        return {
          ...baseStep,
          description: 'Good! You\'re on the Sell tab. Now select the droid parts from your inventory and click "Sell".',
          target: 'vendor-item-droid-parts',
          highlightTarget: 'vendor-item-droid-parts'
        };
      }
    }
    
    return baseStep;
      }, [currentState, isOnPlanetSurface, isOnSubmap, isOnGameWorld, tutorialNPCName]);
  
  // Don't render tutorial on /game page - it should only show on spaceport submap
  // This prevents the tutorial from appearing when player navigates back to /game
  // BUT allow it to show on submap, planet surface, and combat page
  if (isOnGameWorld && currentState !== TUTORIAL_STATES.TUTORIAL_COMPLETE && !isOnCombat) {
    return null;
  }
  
  // Don't render if tutorial is loading or no step configured
  if (isLoading || !currentStep) {
    console.log('[TutorialOverlay] Not rendering - loading or no step:', { isLoading, currentStep: !!currentStep, currentState });
    return null;
  }

  // Anchor the overlay to the right screen so it never "follows" the player onto an
  // unrelated page (e.g. a movement/NPC step lingering on top of the vendor screen):
  // vendor steps show ONLY on the vendor page, and non-vendor steps NEVER show there.
  const VENDOR_STATES = [
    TUTORIAL_STATES.VENDOR_INTRO,
    TUTORIAL_STATES.VENDOR_OPENED,
    TUTORIAL_STATES.VENDOR_ITEM_HOVER_EXPLAINED,
    TUTORIAL_STATES.VENDOR_BUY_MEDPAC,
    TUTORIAL_STATES.VENDOR_SELL_DROID_PARTS
  ];
  const isVendorState = VENDOR_STATES.includes(currentState);
  if (isOnVendor && !isVendorState) return null;
  if (!isOnVendor && isVendorState && !isOnGameWorld) return null;


  // Don't show tutorial overlay if the current state has already been completed
  // This prevents the overlay from reappearing for states the player has already dismissed
  // BUT allow early tutorial states and COMBAT_INTRO to show even if marked as completed
  // (because transitionTo marks states as completed immediately, but we still want to show them)
  // EXCEPT for DIALOGUE_STARTED - once the player dismisses it, don't show it again
  // Include combat tutorial states so they display during combat
  // Include vendor tutorial states so they display during vendor interactions
  const earlyTutorialStatesForDisplay = [
    TUTORIAL_STATES.STARTING,
    TUTORIAL_STATES.ORIENT_UI,
    TUTORIAL_STATES.MOVEMENT_INTRO,
    TUTORIAL_STATES.MOVEMENT_COMPLETE,
    TUTORIAL_STATES.NPC_INTERACTION_INTRO,
    TUTORIAL_STATES.NPC_MENU_OPENED,
    TUTORIAL_STATES.DIALOGUE_STARTED,
    TUTORIAL_STATES.QUEST_OFFERED,
    TUTORIAL_STATES.QUEST_ACCEPTED,
    TUTORIAL_STATES.QUEST_OBJECTIVE_TRACKING,
    TUTORIAL_STATES.COMBAT_INTRO,
    TUTORIAL_STATES.COMBAT_STARTED,
    TUTORIAL_STATES.COMBAT_TURN_ORDER_EXPLAINED,
    TUTORIAL_STATES.COMBAT_ACTION_MENU_EXPLAINED,
    TUTORIAL_STATES.COMBAT_TARGETING_EXPLAINED,
    TUTORIAL_STATES.VENDOR_INTRO,
    TUTORIAL_STATES.VENDOR_OPENED,
    TUTORIAL_STATES.VENDOR_ITEM_HOVER_EXPLAINED,
    TUTORIAL_STATES.VENDOR_BUY_MEDPAC,
    TUTORIAL_STATES.VENDOR_SELL_DROID_PARTS,
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
  
  // Special handling for DIALOGUE_STARTED - if completed, don't show it again
  // (player has dismissed it, let them continue the conversation)
  if (currentState === TUTORIAL_STATES.DIALOGUE_STARTED && isStateCompleted(currentState)) {
    console.log('[TutorialOverlay] DIALOGUE_STARTED already dismissed by player, not showing again');
    return null;
  }
  
  // Special handling for VENDOR_SELL_DROID_PARTS - only hide if player explicitly dismissed it
  // Check both the state machine milestone and local dismissedSteps state for immediate hiding
  if (currentState === TUTORIAL_STATES.VENDOR_SELL_DROID_PARTS) {
    const wasExplicitlyCompleted = stateMachine?.milestones?.[TUTORIAL_STATES.VENDOR_SELL_DROID_PARTS]?.completedAt;
    const wasLocallyDismissed = dismissedSteps.has(TUTORIAL_STATES.VENDOR_SELL_DROID_PARTS);
    if (wasExplicitlyCompleted || wasLocallyDismissed) {
      console.log('[TutorialOverlay] VENDOR_SELL_DROID_PARTS already dismissed by player, waiting for sale event');
      return null;
    }
    // Otherwise, show it - this is the first time transitioning to this state
  }
  
  // Special handling for ITEM_SOLD - only hide if player explicitly dismissed it
  if (currentState === TUTORIAL_STATES.ITEM_SOLD) {
    const wasExplicitlyCompleted = stateMachine?.milestones?.[TUTORIAL_STATES.ITEM_SOLD]?.completedAt;
    const wasLocallyDismissed = dismissedSteps.has(TUTORIAL_STATES.ITEM_SOLD);
    if (wasExplicitlyCompleted || wasLocallyDismissed) {
      console.log('[TutorialOverlay] ITEM_SOLD already dismissed by player, waiting for next step');
      return null;
    }
    // Otherwise, show it - this is the first time transitioning to this state
  }
  
  // Special handling for LOOT_RECEIVED - only hide if player explicitly dismissed it
  if (currentState === TUTORIAL_STATES.LOOT_RECEIVED) {
    const wasExplicitlyCompleted = stateMachine?.milestones?.[TUTORIAL_STATES.LOOT_RECEIVED]?.completedAt;
    const wasLocallyDismissed = dismissedSteps.has(TUTORIAL_STATES.LOOT_RECEIVED);
    if (wasExplicitlyCompleted || wasLocallyDismissed) {
      console.log('[TutorialOverlay] LOOT_RECEIVED already dismissed by player, waiting for inventory open');
      return null;
    }
  }
  
  // Special handling for INVENTORY_OPENED - only hide if player explicitly dismissed it
  if (currentState === TUTORIAL_STATES.INVENTORY_OPENED) {
    const wasExplicitlyCompleted = stateMachine?.milestones?.[TUTORIAL_STATES.INVENTORY_OPENED]?.completedAt;
    const wasLocallyDismissed = dismissedSteps.has(TUTORIAL_STATES.INVENTORY_OPENED);
    if (wasExplicitlyCompleted || wasLocallyDismissed) {
      console.log('[TutorialOverlay] INVENTORY_OPENED already dismissed by player, waiting for healing explanation');
      return null;
    }
  }
  
  // Special handling for HEALING_EXPLAINED - only hide if player explicitly dismissed it
  if (currentState === TUTORIAL_STATES.HEALING_EXPLAINED) {
    const wasExplicitlyCompleted = stateMachine?.milestones?.[TUTORIAL_STATES.HEALING_EXPLAINED]?.completedAt;
    const wasLocallyDismissed = dismissedSteps.has(TUTORIAL_STATES.HEALING_EXPLAINED);
    if (wasExplicitlyCompleted || wasLocallyDismissed) {
      console.log('[TutorialOverlay] HEALING_EXPLAINED already dismissed by player, waiting for medpac usage');
      return null;
    }
  }
  
  // Special handling for SPACEPORT_EXIT_EXPLAINED - only hide if player explicitly dismissed it
  if (currentState === TUTORIAL_STATES.SPACEPORT_EXIT_EXPLAINED) {
    const wasExplicitlyCompleted = stateMachine?.milestones?.[TUTORIAL_STATES.SPACEPORT_EXIT_EXPLAINED]?.completedAt;
    const wasLocallyDismissed = dismissedSteps.has(TUTORIAL_STATES.SPACEPORT_EXIT_EXPLAINED);
    if (wasExplicitlyCompleted || wasLocallyDismissed) {
      console.log('[TutorialOverlay] SPACEPORT_EXIT_EXPLAINED already dismissed by player, waiting for exit');
      return null;
    }
  }
  
  // Special handling for PLANET_SURFACE_INTRO - only hide if player explicitly dismissed it
  if (currentState === TUTORIAL_STATES.PLANET_SURFACE_INTRO) {
    const wasExplicitlyCompleted = stateMachine?.milestones?.[TUTORIAL_STATES.PLANET_SURFACE_INTRO]?.completedAt;
    const wasLocallyDismissed = dismissedSteps.has(TUTORIAL_STATES.PLANET_SURFACE_INTRO);
    if (wasExplicitlyCompleted || wasLocallyDismissed) {
      console.log('[TutorialOverlay] PLANET_SURFACE_INTRO already dismissed by player, waiting for movement');
      return null;
    }
  }
  
  // Special handling for PLANET_SURFACE_MOVEMENT - only hide if player explicitly dismissed it
  if (currentState === TUTORIAL_STATES.PLANET_SURFACE_MOVEMENT) {
    const wasExplicitlyCompleted = stateMachine?.milestones?.[TUTORIAL_STATES.PLANET_SURFACE_MOVEMENT]?.completedAt;
    const wasLocallyDismissed = dismissedSteps.has(TUTORIAL_STATES.PLANET_SURFACE_MOVEMENT);
    if (wasExplicitlyCompleted || wasLocallyDismissed) {
      console.log('[TutorialOverlay] PLANET_SURFACE_MOVEMENT already dismissed by player, waiting for POI click');
      return null;
    }
  }
  
  // Special handling for POI_DISCOVERED - only hide if player explicitly dismissed it
  if (currentState === TUTORIAL_STATES.POI_DISCOVERED) {
    const wasExplicitlyCompleted = stateMachine?.milestones?.[TUTORIAL_STATES.POI_DISCOVERED]?.completedAt;
    const wasLocallyDismissed = dismissedSteps.has(TUTORIAL_STATES.POI_DISCOVERED);
    if (wasExplicitlyCompleted || wasLocallyDismissed) {
      console.log('[TutorialOverlay] POI_DISCOVERED already dismissed by player, waiting for interaction menu');
      return null;
    }
  }
  
  // Special handling for POI_INTERACTION_MENU_OPENED - only hide if player explicitly dismissed it
  if (currentState === TUTORIAL_STATES.POI_INTERACTION_MENU_OPENED) {
    const wasExplicitlyCompleted = stateMachine?.milestones?.[TUTORIAL_STATES.POI_INTERACTION_MENU_OPENED]?.completedAt;
    const wasLocallyDismissed = dismissedSteps.has(TUTORIAL_STATES.POI_INTERACTION_MENU_OPENED);
    if (wasExplicitlyCompleted || wasLocallyDismissed) {
      console.log('[TutorialOverlay] POI_INTERACTION_MENU_OPENED already dismissed by player, waiting for POI action');
      return null;
    }
  }
  
  // Special handling for POI_ENTERED - only hide if player explicitly dismissed it
  if (currentState === TUTORIAL_STATES.POI_ENTERED) {
    const wasExplicitlyCompleted = stateMachine?.milestones?.[TUTORIAL_STATES.POI_ENTERED]?.completedAt;
    const wasLocallyDismissed = dismissedSteps.has(TUTORIAL_STATES.POI_ENTERED);
    if (wasExplicitlyCompleted || wasLocallyDismissed) {
      console.log('[TutorialOverlay] POI_ENTERED already dismissed by player');
      return null;
    }
  }
  
  // Special handling for PLANET_NPC_CLICKED - only hide if player explicitly dismissed it
  if (currentState === TUTORIAL_STATES.PLANET_NPC_CLICKED) {
    const wasExplicitlyCompleted = stateMachine?.milestones?.[TUTORIAL_STATES.PLANET_NPC_CLICKED]?.completedAt;
    const wasLocallyDismissed = dismissedSteps.has(TUTORIAL_STATES.PLANET_NPC_CLICKED);
    if (wasExplicitlyCompleted || wasLocallyDismissed) {
      console.log('[TutorialOverlay] PLANET_NPC_CLICKED already dismissed by player, waiting for dialogue');
      return null;
    }
  }
  
  // Special handling for PLANET_NPC_DIALOGUE_STARTED - only hide if player explicitly dismissed it
  if (currentState === TUTORIAL_STATES.PLANET_NPC_DIALOGUE_STARTED) {
    const wasExplicitlyCompleted = stateMachine?.milestones?.[TUTORIAL_STATES.PLANET_NPC_DIALOGUE_STARTED]?.completedAt;
    const wasLocallyDismissed = dismissedSteps.has(TUTORIAL_STATES.PLANET_NPC_DIALOGUE_STARTED);
    if (wasExplicitlyCompleted || wasLocallyDismissed) {
      console.log('[TutorialOverlay] PLANET_NPC_DIALOGUE_STARTED already dismissed by player, waiting for quest offer');
      return null;
    }
  }
  
  // Special handling for QUEST_FOUND - only hide if player explicitly dismissed it
  if (currentState === TUTORIAL_STATES.QUEST_FOUND) {
    const wasExplicitlyCompleted = stateMachine?.milestones?.[TUTORIAL_STATES.QUEST_FOUND]?.completedAt;
    const wasLocallyDismissed = dismissedSteps.has(TUTORIAL_STATES.QUEST_FOUND);
    if (wasExplicitlyCompleted || wasLocallyDismissed) {
      console.log('[TutorialOverlay] QUEST_FOUND already dismissed by player, waiting for quest acceptance');
      return null;
    }
  }
  
  // Special handling for QUEST_OBJECTIVE_LOCATION_REACHED - only hide if player explicitly dismissed it
  if (currentState === TUTORIAL_STATES.QUEST_OBJECTIVE_LOCATION_REACHED) {
    const wasExplicitlyCompleted = stateMachine?.milestones?.[TUTORIAL_STATES.QUEST_OBJECTIVE_LOCATION_REACHED]?.completedAt;
    const wasLocallyDismissed = dismissedSteps.has(TUTORIAL_STATES.QUEST_OBJECTIVE_LOCATION_REACHED);
    if (wasExplicitlyCompleted || wasLocallyDismissed) {
      console.log('[TutorialOverlay] QUEST_OBJECTIVE_LOCATION_REACHED already dismissed by player, waiting for objective completion');
      return null;
    }
  }
  
  // Special handling for VENDOR_ITEM_HOVER_EXPLAINED - only hide if player explicitly dismissed it
  if (currentState === TUTORIAL_STATES.VENDOR_ITEM_HOVER_EXPLAINED) {
    const wasExplicitlyCompleted = stateMachine?.milestones?.[TUTORIAL_STATES.VENDOR_ITEM_HOVER_EXPLAINED]?.completedAt;
    const wasLocallyDismissed = dismissedSteps.has(TUTORIAL_STATES.VENDOR_ITEM_HOVER_EXPLAINED);
    if (wasExplicitlyCompleted || wasLocallyDismissed) {
      console.log('[TutorialOverlay] VENDOR_ITEM_HOVER_EXPLAINED already dismissed by player, waiting for item hover or purchase');
      return null;
    }
  }
  
  // Special handling for QUEST_OBJECTIVE_COMPLETED - only hide if player explicitly dismissed it
  if (currentState === TUTORIAL_STATES.QUEST_OBJECTIVE_COMPLETED) {
    const wasExplicitlyCompleted = stateMachine?.milestones?.[TUTORIAL_STATES.QUEST_OBJECTIVE_COMPLETED]?.completedAt;
    const wasLocallyDismissed = dismissedSteps.has(TUTORIAL_STATES.QUEST_OBJECTIVE_COMPLETED);
    if (wasExplicitlyCompleted || wasLocallyDismissed) {
      console.log('[TutorialOverlay] QUEST_OBJECTIVE_COMPLETED already dismissed by player');
      return null;
    }
  }
  
  // Special handling for QUEST_RETURN_TO_GIVER - only hide if player explicitly dismissed it
  if (currentState === TUTORIAL_STATES.QUEST_RETURN_TO_GIVER) {
    const wasExplicitlyCompleted = stateMachine?.milestones?.[TUTORIAL_STATES.QUEST_RETURN_TO_GIVER]?.completedAt;
    const wasLocallyDismissed = dismissedSteps.has(TUTORIAL_STATES.QUEST_RETURN_TO_GIVER);
    if (wasExplicitlyCompleted || wasLocallyDismissed) {
      console.log('[TutorialOverlay] QUEST_RETURN_TO_GIVER already dismissed by player, waiting for quest turn-in');
      return null;
    }
  }
  
  // Special handling for contextual tutorials - only hide if player explicitly dismissed them
  const contextualTutorialStates = [
    TUTORIAL_STATES.LOCKPICKING_SKILL_REQUIRED,
    TUTORIAL_STATES.LEVEL_UP_OCCURRED,
    TUTORIAL_STATES.SKILL_POINTS_AVAILABLE,
    TUTORIAL_STATES.FAST_TRAVEL_DISCOVERED,
    TUTORIAL_STATES.RANDOM_ENCOUNTER_TRIGGERED
  ];
  
  if (contextualTutorialStates.includes(currentState)) {
    const wasExplicitlyCompleted = stateMachine?.milestones?.[currentState]?.completedAt;
    const wasLocallyDismissed = dismissedSteps.has(currentState);
    if (wasExplicitlyCompleted || wasLocallyDismissed) {
      console.log(`[TutorialOverlay] ${currentState} already dismissed by player`);
      return null;
    }
  }
  
  // Allow DIALOGUE_STARTED to show initially (before it's dismissed)
  // But once dismissed, it won't show again (handled above)
  if (currentState === TUTORIAL_STATES.DIALOGUE_STARTED && !isStateCompleted(currentState)) {
    // Show it - this is the first time
  } else if (isStateCompleted(currentState) && 
      currentState !== TUTORIAL_STATES.TUTORIAL_COMPLETE && 
      !earlyTutorialStatesForDisplay.includes(currentState)) {
    console.log('[TutorialOverlay] Not rendering - state already completed:', { currentState, isStateCompleted: isStateCompleted(currentState) });
    return null;
  }
  
  // Show tutorial overlay for starting states even if isActive is false
  // This ensures the tutorial appears immediately when a new character enters the spaceport
  // Also show for COMBAT_INTRO and combat tutorial states to ensure they display during combat
  // Include early tutorial states to ensure they display during initial tutorial progression
  const earlyTutorialStates = [
    TUTORIAL_STATES.STARTING,
    TUTORIAL_STATES.ORIENT_UI,
    TUTORIAL_STATES.MOVEMENT_INTRO,
    TUTORIAL_STATES.NPC_INTERACTION_INTRO,
    TUTORIAL_STATES.NPC_MENU_OPENED,
    TUTORIAL_STATES.DIALOGUE_STARTED,
    TUTORIAL_STATES.QUEST_OFFERED,
    TUTORIAL_STATES.QUEST_ACCEPTED,
    TUTORIAL_STATES.QUEST_OBJECTIVE_TRACKING,
    TUTORIAL_STATES.COMBAT_INTRO,
    TUTORIAL_STATES.COMBAT_STARTED,
    TUTORIAL_STATES.COMBAT_TURN_ORDER_EXPLAINED,
    TUTORIAL_STATES.COMBAT_ACTION_MENU_EXPLAINED,
    TUTORIAL_STATES.COMBAT_TARGETING_EXPLAINED,
    TUTORIAL_STATES.VENDOR_INTRO,
    TUTORIAL_STATES.VENDOR_OPENED,
    TUTORIAL_STATES.VENDOR_ITEM_HOVER_EXPLAINED,
    TUTORIAL_STATES.VENDOR_BUY_MEDPAC,
    TUTORIAL_STATES.VENDOR_SELL_DROID_PARTS,
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
  
  // Check if inventory is open - if so, show inventory tutorial states
  const isInventoryOpen = document.querySelector('.inventory-overlay') !== null;
  
  const shouldShow = isActive || 
                     earlyTutorialStates.includes(currentState) ||
                     (currentState === TUTORIAL_STATES.NOT_STARTED && isOnSubmap) ||
                     (isOnCombat && [
                       TUTORIAL_STATES.COMBAT_STARTED,
                       TUTORIAL_STATES.COMBAT_TURN_ORDER_EXPLAINED,
                       TUTORIAL_STATES.COMBAT_ACTION_MENU_EXPLAINED,
                       TUTORIAL_STATES.COMBAT_TARGETING_EXPLAINED
                     ].includes(currentState)) ||
                     (isOnVendor && [
                       TUTORIAL_STATES.VENDOR_OPENED,
                       TUTORIAL_STATES.VENDOR_ITEM_HOVER_EXPLAINED,
                       TUTORIAL_STATES.VENDOR_BUY_MEDPAC,
                       TUTORIAL_STATES.VENDOR_SELL_DROID_PARTS,
                       TUTORIAL_STATES.ITEM_BOUGHT,
                       TUTORIAL_STATES.ITEM_SOLD
                     ].includes(currentState)) ||
                     (isInventoryOpen && [
                       TUTORIAL_STATES.INVENTORY_OPENED,
                       TUTORIAL_STATES.HEALING_EXPLAINED,
                       TUTORIAL_STATES.MEDPAC_USED
                     ].includes(currentState)) ||
                     ([
                       TUTORIAL_STATES.HUD_HEALTH_STAMINA_EXPLAINED,
                       TUTORIAL_STATES.HUD_CREDITS_LEVEL_XP_EXPLAINED,
                       TUTORIAL_STATES.SPACEPORT_EXIT_EXPLAINED
                     ].includes(currentState));
  
  if (!shouldShow) {
    console.log('[TutorialOverlay] Not showing overlay:', { isActive, currentState, shouldShow });
    return null;
  }
  
  console.log('[TutorialOverlay] Rendering overlay for state:', currentState, { isActive, shouldShow });
  
  const handleNext = () => {
    // Note: We don't call completeStep here globally anymore
    // Each step's handleNext logic will call completeStep and setDismissedSteps as needed
    // This prevents double-completion and ensures proper dismissal
    
    // Special handling for ORIENT_UI
    if (currentState === TUTORIAL_STATES.ORIENT_UI) {
      if (isOnGameWorld) {
        // Navigate to planet surface first, then transition to movement intro
        if (currentCharacter) {
          console.log('[TutorialOverlay] Navigating to planet surface from GameWorld');
          navigate(`/game/planet/${currentCharacter.currentPlanet}`);
          // Small delay to let navigation complete, then transition
          setTimeout(() => {
            transitionTo(TUTORIAL_STATES.MOVEMENT_INTRO);
          }, 500);
        }
      } else if (isOnSubmap) {
        // Already on submap, transition directly to movement intro
        console.log('[TutorialOverlay] On submap, transitioning to MOVEMENT_INTRO');
        transitionTo(TUTORIAL_STATES.MOVEMENT_INTRO);
      } else {
        // On planet surface or other location, transition to movement intro
        console.log('[TutorialOverlay] Transitioning to MOVEMENT_INTRO');
        transitionTo(TUTORIAL_STATES.MOVEMENT_INTRO);
      }
      return;
    }
    
    // For DIALOGUE_STARTED, mark as completed but don't auto-advance
    // The tutorial will progress naturally when quest is offered/accepted
    // But allow the player to dismiss the step by clicking "Next"
    if (currentState === TUTORIAL_STATES.DIALOGUE_STARTED) {
      // Mark as completed so the overlay doesn't show again
      // The next tutorial step will appear when quest is offered
      // Don't transition to a new state - just dismiss the current step
      return;
    }
    
    // Vendor tutorial progression
    if (currentState === TUTORIAL_STATES.VENDOR_OPENED) {
      // After vendor opened, guide player to hover over items
      transitionTo(TUTORIAL_STATES.VENDOR_ITEM_HOVER_EXPLAINED);
      return;
    }
    
    if (currentState === TUTORIAL_STATES.VENDOR_ITEM_HOVER_EXPLAINED) {
      // Mark as completed so the modal dismisses immediately
      if (completeStep) {
        completeStep(currentState);
      }
      // Immediately mark as dismissed locally to hide the overlay right away
      setDismissedSteps(prev => new Set(prev).add(currentState));
      // After explaining hover, guide to buy medpac
      transitionTo(TUTORIAL_STATES.VENDOR_BUY_MEDPAC);
      return;
    }
    
    if (currentState === TUTORIAL_STATES.VENDOR_BUY_MEDPAC) {
      // Wait for player to buy medpac - don't auto-advance
      // The ITEM_BOUGHT event will trigger the next step
      // But if player clicks Next, we can still mark it as complete and wait for purchase
      return;
    }
    
    if (currentState === TUTORIAL_STATES.ITEM_BOUGHT) {
      // After buying medpac, guide to sell droid parts
      transitionTo(TUTORIAL_STATES.VENDOR_SELL_DROID_PARTS);
      return;
    }
    
    if (currentState === TUTORIAL_STATES.VENDOR_SELL_DROID_PARTS) {
      // Player can click Next to dismiss this step
      // Mark as complete so the modal dismisses immediately
      // The actual sale event will trigger the transition to ITEM_SOLD
      // This allows the player to dismiss the modal and interact with the vendor interface
      if (completeStep) {
        completeStep(currentState);
      }
      // Immediately mark as dismissed locally to hide the overlay right away
      setDismissedSteps(prev => new Set(prev).add(currentState));
      return;
    }
    
    if (currentState === TUTORIAL_STATES.ITEM_SOLD) {
      // Mark as completed so the modal dismisses immediately
      if (completeStep) {
        completeStep(currentState);
      }
      // Immediately mark as dismissed locally to hide the overlay right away
      setDismissedSteps(prev => new Set(prev).add(currentState));
      // After selling droid parts, transition to inventory/medpac tutorial
      transitionTo(TUTORIAL_STATES.LOOT_RECEIVED);
      return;
    }
    
    if (currentState === TUTORIAL_STATES.LOOT_RECEIVED) {
      // Mark as completed so the modal dismisses immediately
      if (completeStep) {
        completeStep(currentState);
      }
      // Immediately mark as dismissed locally to hide the overlay right away
      setDismissedSteps(prev => new Set(prev).add(currentState));
      // Guide player to open inventory
      // The UI_OPENED_INVENTORY event will trigger transition to INVENTORY_OPENED
      return;
    }
    
    if (currentState === TUTORIAL_STATES.INVENTORY_OPENED) {
      // Mark as completed so the modal dismisses immediately
      if (completeStep) {
        completeStep(currentState);
      }
      // Immediately mark as dismissed locally to hide the overlay right away
      setDismissedSteps(prev => new Set(prev).add(currentState));
      // After inventory is opened, guide player to use medpac
      transitionTo(TUTORIAL_STATES.HEALING_EXPLAINED);
      return;
    }
    
    if (currentState === TUTORIAL_STATES.HEALING_EXPLAINED) {
      // Mark as completed so the modal dismisses immediately
      if (completeStep) {
        completeStep(currentState);
      }
      // Immediately mark as dismissed locally to hide the overlay right away
      setDismissedSteps(prev => new Set(prev).add(currentState));
      // Wait for player to use medpac - the ITEM_USED event will trigger MEDPAC_USED
      return;
    }
    
    if (currentState === TUTORIAL_STATES.MEDPAC_USED) {
      // After using medpac, guide player to HUD health/stamina explanation
      transitionTo(TUTORIAL_STATES.HUD_HEALTH_STAMINA_EXPLAINED);
      return;
    }
    
    if (currentState === TUTORIAL_STATES.HUD_HEALTH_STAMINA_EXPLAINED) {
      // After explaining health/stamina, guide to credits/level/XP
      transitionTo(TUTORIAL_STATES.HUD_CREDITS_LEVEL_XP_EXPLAINED);
      return;
    }
    
    if (currentState === TUTORIAL_STATES.HUD_CREDITS_LEVEL_XP_EXPLAINED) {
      // After explaining credits/level/XP, guide to spaceport exit
      transitionTo(TUTORIAL_STATES.SPACEPORT_EXIT_EXPLAINED);
      return;
    }
    
    if (currentState === TUTORIAL_STATES.SPACEPORT_EXIT_EXPLAINED) {
      // Mark as completed so the modal dismisses immediately
      if (completeStep) {
        completeStep(currentState);
      }
      // Immediately mark as dismissed locally to hide the overlay right away
      setDismissedSteps(prev => new Set(prev).add(currentState));
      // After explaining spaceport exit, wait for player to exit
      // The PLANET_SURFACE_ENTERED event will trigger PLANET_SURFACE_INTRO
      // Don't transition to a new state - let the player exit naturally
      return;
    }
    
    // Planet Surface Tutorial Transitions
    if (currentState === TUTORIAL_STATES.PLANET_SURFACE_INTRO) {
      // Mark as completed so the modal dismisses immediately
      if (completeStep) {
        completeStep(currentState);
      }
      // Immediately mark as dismissed locally to hide the overlay right away
      setDismissedSteps(prev => new Set(prev).add(currentState));
      // Transition to movement tutorial
      transitionTo(TUTORIAL_STATES.PLANET_SURFACE_MOVEMENT);
      return;
    }
    
    if (currentState === TUTORIAL_STATES.PLANET_SURFACE_MOVEMENT) {
      // Mark as completed so the modal dismisses immediately
      if (completeStep) {
        completeStep(currentState);
      }
      // Immediately mark as dismissed locally to hide the overlay right away
      setDismissedSteps(prev => new Set(prev).add(currentState));
      // Wait for POI click - the POI_CLICKED event will trigger POI_DISCOVERED
      // Don't transition here - let the player explore and click a POI
      return;
    }
    
    if (currentState === TUTORIAL_STATES.POI_DISCOVERED) {
      // Mark as completed so the modal dismisses immediately
      if (completeStep) {
        completeStep(currentState);
      }
      // Immediately mark as dismissed locally to hide the overlay right away
      setDismissedSteps(prev => new Set(prev).add(currentState));
      // Transition to POI interaction menu tutorial
      transitionTo(TUTORIAL_STATES.POI_INTERACTION_MENU_OPENED);
      return;
    }
    
    if (currentState === TUTORIAL_STATES.POI_INTERACTION_MENU_OPENED) {
      // Mark as completed so the modal dismisses immediately
      if (completeStep) {
        completeStep(currentState);
      }
      // Immediately mark as dismissed locally to hide the overlay right away
      setDismissedSteps(prev => new Set(prev).add(currentState));
      // Wait for player action (Enter, Investigate, etc.) - the POI_ENTERED or POI_INVESTIGATED event will trigger next step
      // Don't transition here - let the player interact with the POI menu
      return;
    }
    
    if (currentState === TUTORIAL_STATES.POI_ENTERED) {
      // Mark as completed so the modal dismisses immediately
      if (completeStep) {
        completeStep(currentState);
      }
      // Immediately mark as dismissed locally to hide the overlay right away
      setDismissedSteps(prev => new Set(prev).add(currentState));
      // Tutorial complete for POI entry - wait for next action
      return;
    }
    
    if (currentState === TUTORIAL_STATES.PLANET_NPC_CLICKED) {
      // Mark as completed so the modal dismisses immediately
      if (completeStep) {
        completeStep(currentState);
      }
      // Immediately mark as dismissed locally to hide the overlay right away
      setDismissedSteps(prev => new Set(prev).add(currentState));
      // Transition to dialogue started
      transitionTo(TUTORIAL_STATES.PLANET_NPC_DIALOGUE_STARTED);
      return;
    }
    
    if (currentState === TUTORIAL_STATES.PLANET_NPC_DIALOGUE_STARTED) {
      // Mark as completed so the modal dismisses immediately
      if (completeStep) {
        completeStep(currentState);
      }
      // Immediately mark as dismissed locally to hide the overlay right away
      setDismissedSteps(prev => new Set(prev).add(currentState));
      // Wait for quest offer or dialogue completion - the QUEST_OFFERED event will trigger QUEST_FOUND
      // Don't transition here - let the player interact with the dialogue
      return;
    }
    
    if (currentState === TUTORIAL_STATES.QUEST_FOUND) {
      // Mark as completed so the modal dismisses immediately
      if (completeStep) {
        completeStep(currentState);
      }
      // Immediately mark as dismissed locally to hide the overlay right away
      setDismissedSteps(prev => new Set(prev).add(currentState));
      // Wait for quest acceptance - the QUEST_ACCEPTED event will trigger next step
      // Don't transition here - let the player accept or decline the quest
      return;
    }
    
    if (currentState === TUTORIAL_STATES.QUEST_OBJECTIVE_LOCATION_REACHED) {
      // Mark as completed so the modal dismisses immediately
      if (completeStep) {
        completeStep(currentState);
      }
      // Immediately mark as dismissed locally to hide the overlay right away
      setDismissedSteps(prev => new Set(prev).add(currentState));
      // Wait for objective completion - the QUEST_OBJECTIVE_COMPLETED event will trigger
      return;
    }
    
    if (currentState === TUTORIAL_STATES.QUEST_OBJECTIVE_COMPLETED) {
      // Mark as completed so the modal dismisses immediately
      if (completeStep) {
        completeStep(currentState);
      }
      // Immediately mark as dismissed locally to hide the overlay right away
      setDismissedSteps(prev => new Set(prev).add(currentState));
      // Check if quest is complete, otherwise wait for more objectives
      // If quest complete, transition to QUEST_RETURN_TO_GIVER
      // Otherwise, wait for next objective
      return;
    }
    
    if (currentState === TUTORIAL_STATES.QUEST_RETURN_TO_GIVER) {
      // Mark as completed so the modal dismisses immediately
      if (completeStep) {
        completeStep(currentState);
      }
      // Immediately mark as dismissed locally to hide the overlay right away
      setDismissedSteps(prev => new Set(prev).add(currentState));
      // Wait for quest turn-in - event will handle completion
      return;
    }
    
    // Contextual tutorials
    if (currentState === TUTORIAL_STATES.LOCKPICKING_SKILL_REQUIRED) {
      // Mark as completed so the modal dismisses immediately
      if (completeStep) {
        completeStep(currentState);
      }
      // Immediately mark as dismissed locally to hide the overlay right away
      setDismissedSteps(prev => new Set(prev).add(currentState));
      return;
    }
    
    if (currentState === TUTORIAL_STATES.LEVEL_UP_OCCURRED) {
      // Mark as completed so the modal dismisses immediately
      if (completeStep) {
        completeStep(currentState);
      }
      // Immediately mark as dismissed locally to hide the overlay right away
      setDismissedSteps(prev => new Set(prev).add(currentState));
      // Check if skill/attribute points available, otherwise complete
      return;
    }
    
    if (currentState === TUTORIAL_STATES.SKILL_POINTS_AVAILABLE) {
      // Mark as completed so the modal dismisses immediately
      if (completeStep) {
        completeStep(currentState);
      }
      // Immediately mark as dismissed locally to hide the overlay right away
      setDismissedSteps(prev => new Set(prev).add(currentState));
      return;
    }
    
    if (currentState === TUTORIAL_STATES.FAST_TRAVEL_DISCOVERED) {
      // Mark as completed so the modal dismisses immediately
      if (completeStep) {
        completeStep(currentState);
      }
      // Immediately mark as dismissed locally to hide the overlay right away
      setDismissedSteps(prev => new Set(prev).add(currentState));
      // Wait for fast travel usage - event will trigger
      return;
    }
    
    if (currentState === TUTORIAL_STATES.RANDOM_ENCOUNTER_TRIGGERED) {
      // Mark as completed so the modal dismisses immediately
      if (completeStep) {
        completeStep(currentState);
      }
      // Immediately mark as dismissed locally to hide the overlay right away
      setDismissedSteps(prev => new Set(prev).add(currentState));
      return;
    }
    
    if (currentState === TUTORIAL_STATES.PLANET_SURFACE_TUTORIAL_COMPLETE) {
      // Planet surface tutorial complete
      if (completeStep) {
        completeStep(currentState);
      }
      return;
    }
    
    // For COMBAT_INTRO, trigger combat after player clicks Next
    if (currentState === TUTORIAL_STATES.COMBAT_INTRO) {
      // Mark combat intro as completed
      if (completeStep) {
        completeStep(currentState);
      }
      
      // Launch tutorial combat encounter
      if (currentCharacter && startEncounter) {
        console.log('[TutorialOverlay] Launching tutorial combat encounter');
        
        // Start tutorial combat encounter with a simple enemy
        // Map tutorial enemy IDs to actual enemy templates
        // The backend tutorial config defines enemy IDs like 'enemy_tutorial_training_droid',
        // but we need to use actual enemy template IDs from enemyTemplates.js
        const tutorialEnemyMap = {
          'enemy_tutorial_training_droid': 'droid_security',
          'enemy_tutorial_customs_drone': 'droid_security',
          'enemy_tutorial_data_scavenger': 'pirate',
          'enemy_tutorial_security_droid': 'droid_security',
          'enemy_tutorial_hostile_patient': 'pirate',
          'enemy_tutorial_assassin': 'bounty_hunter',
          'enemy_tutorial_rogue_pilot': 'pirate'
        };
        
        // Use droid_security as default tutorial enemy (simple, level-appropriate)
        const tutorialEnemy = 'droid_security';
        console.log('[TutorialOverlay] Starting tutorial combat with enemy:', tutorialEnemy);
        
        startEncounter(
          currentCharacter.id,
          'scripted', // Use scripted encounter type for tutorial
          [tutorialEnemy] // Use a simple security droid for tutorial
        ).then((encounter) => {
          if (encounter && encounter.id) {
            console.log('[TutorialOverlay] Tutorial combat encounter created:', encounter.id);
            
            // Store return location (submap where player was)
            // Extract submap information from URL params or location state
            let returnLocation = null;
            
            if (isOnSubmap) {
              // Extract from URL path: /game/location/:planetId/:parentLocationId/:parentLocationType/:type
              const pathMatch = location.pathname.match(/\/game\/location\/([^/]+)\/([^/]+)\/([^/]+)\/([^/]+)/);
              
              if (pathMatch) {
                const [, planetId, parentLocationId, parentLocationType, type] = pathMatch;
                const subMapId = location.state?.subMapId || currentCharacter.currentLocation?.subMapId;
                
                returnLocation = {
                  planetId: decodeURIComponent(planetId),
                  parentLocationId: decodeURIComponent(parentLocationId),
                  parentLocationType: decodeURIComponent(parentLocationType),
                  type: decodeURIComponent(type),
                  subMapId: subMapId,
                  location: currentCharacter.currentLocation || { 
                    x: 50, 
                    y: 50,
                    area: 'submap',
                    subMapId: subMapId
                  }
                };
              } else {
                // Fallback: try to get from location.state (set when navigating to submap)
                const stateSubMapId = location.state?.subMapId;
                const statePlanetId = location.state?.planetId;
                const stateParentLocationId = location.state?.parentLocationId;
                const stateParentLocationType = location.state?.parentLocationType;
                const stateType = location.state?.type;
                
                if (stateSubMapId && statePlanetId && stateParentLocationId) {
                  returnLocation = {
                    planetId: statePlanetId,
                    parentLocationId: stateParentLocationId,
                    parentLocationType: stateParentLocationType || 'poi',
                    type: stateType || 'spaceport',
                    subMapId: stateSubMapId,
                    location: currentCharacter.currentLocation || { 
                      x: 50, 
                      y: 50,
                      area: 'submap',
                      subMapId: stateSubMapId
                    }
                  };
                } else {
                  // Last resort: use character's current location
                  const charLocation = currentCharacter.currentLocation || {};
                  returnLocation = {
                    planetId: currentCharacter.currentPlanet,
                    parentLocationId: charLocation.parentLocationId || 'spaceport',
                    parentLocationType: 'poi',
                    type: 'spaceport',
                    subMapId: charLocation.subMapId,
                    location: {
                      x: charLocation.x || 50,
                      y: charLocation.y || 50,
                      area: 'submap',
                      subMapId: charLocation.subMapId
                    }
                  };
                }
              }
            } else {
              // Not on submap, return to planet surface
              returnLocation = {
                planetId: currentCharacter.currentPlanet,
                location: currentCharacter.currentLocation || { x: 50, y: 50 }
              };
            }
            
            console.log('[TutorialOverlay] Constructed return location:', returnLocation);
            
            // Navigate to combat view
            navigate(`/game/combat/${encounter.id}`, {
              state: {
                returnLocation: returnLocation,
                isTutorial: true
              }
            });
            
            // Emit COMBAT_STARTED event for tutorial tracking
            tutorialEventBus.emit(TUTORIAL_EVENTS.COMBAT_STARTED, {
              encounterId: encounter.id,
              characterId: currentCharacter.id,
              isTutorial: true
            });
            
            // Transition to COMBAT_STARTED state
            transitionTo(TUTORIAL_STATES.COMBAT_STARTED);
          } else {
            console.error('[TutorialOverlay] Failed to create combat encounter - no encounter ID');
            alert('Failed to start combat tutorial. Please try again.');
          }
        }).catch((error) => {
          console.error('[TutorialOverlay] Failed to start tutorial combat:', error);
          alert(`Failed to start combat tutorial: ${error.message || 'Unknown error'}`);
        });
      } else {
        console.error('[TutorialOverlay] Cannot start combat - missing character or startEncounter function');
      }
      
      return;
    }
    
    // Special handling for COMBAT_STARTED - transition to turn order explanation
    if (currentState === TUTORIAL_STATES.COMBAT_STARTED) {
      console.log('[TutorialOverlay] Combat started, transitioning to COMBAT_TURN_ORDER_EXPLAINED');
      transitionTo(TUTORIAL_STATES.COMBAT_TURN_ORDER_EXPLAINED);
      return;
    }
    
    // Special handling for MOVEMENT_COMPLETE - transition to NPC_INTERACTION_INTRO
    if (currentState === TUTORIAL_STATES.MOVEMENT_COMPLETE) {
      console.log('[TutorialOverlay] Movement complete, transitioning to NPC_INTERACTION_INTRO');
      transitionTo(TUTORIAL_STATES.NPC_INTERACTION_INTRO);
      return;
    }
    
    // Auto-advance to next logical state for other states
    // This is a simplified version - in production, you'd have more sophisticated logic
    const stateOrder = Object.values(TUTORIAL_STATES);
    const currentIndex = stateOrder.indexOf(currentState);
    if (currentIndex < stateOrder.length - 1) {
      const nextState = stateOrder[currentIndex + 1];
      transitionTo(nextState);
    }
  };
  
  const handleSkip = () => {
    if (window.confirm('Are you sure you want to skip the tutorial? You\'ll miss important guidance.')) {
      skipTutorial();
    }
  };
  
  // Check if random encounter tutorial is active
  const isRandomEncounterTutorial = currentState === TUTORIAL_STATES.RANDOM_ENCOUNTER_TRIGGERED;
  
  return (
    <div className={`tutorial-overlay ${isRandomEncounterTutorial ? 'random-encounter-active' : ''}`}>
      {currentStep.showHighlight && currentStep.highlightTarget && (
        <TutorialHighlight target={currentStep.highlightTarget} />
      )}
      <TutorialTooltip
        title={currentStep.title}
        description={currentStep.description}
        target={currentStep.target}
        position={currentStep.position}
        onNext={handleNext}
        onSkip={handleSkip}
        showSkip={currentState !== TUTORIAL_STATES.TUTORIAL_COMPLETE}
        isRandomEncounter={isRandomEncounterTutorial}
      />
    </div>
  );
}

