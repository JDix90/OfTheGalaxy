/**
 * Tutorial Dialogue Service
 * Handles structured dialogue trees for tutorial NPCs to guide players through the tutorial
 */

class TutorialDialogueService {
  /**
   * Check if an NPC is a tutorial NPC
   */
  isTutorialNPC(npcId) {
    return npcId && npcId.startsWith('npc_tutorial_');
  }

  /**
   * Get tutorial dialogue tree based on character background and tutorial state
   */
  getTutorialDialogueTree(background, tutorialState) {
    const trees = {
      soldier: this.getSoldierDialogueTree(),
      pilot: this.getPilotDialogueTree(),
      smuggler: this.getSmugglerDialogueTree(),
      scholar: this.getScholarDialogueTree(),
      medic: this.getMedicDialogueTree(),
      engineer: this.getEngineerDialogueTree(),
      diplomat: this.getDiplomatDialogueTree()
    };

    return trees[background] || trees.soldier;
  }

  /**
   * Get NPC name based on background
   */
  getNPCName(background) {
    const names = {
      soldier: 'Sergeant Kael',
      pilot: 'Flight Controller Dex',
      smuggler: 'Dockmaster Jax',
      scholar: 'Archivist Tera',
      medic: 'Medic Voss',
      engineer: 'Tech Specialist Rynn',
      diplomat: 'Ambassador Lira'
    };

    return names[background] || names.soldier;
  }

  /**
   * Get initial greeting for tutorial NPC based on background
   */
  getInitialGreeting(background, characterName) {
    const greetings = {
      soldier: `Welcome, ${characterName || 'recruit'}. I'm Sergeant Kael. I see you've just arrived at the spaceport. Let me help you get oriented.`,
      pilot: `Greetings, ${characterName || 'pilot'}. I'm Flight Controller Dex. Welcome to the spaceport. I'm here to help you get started on your journey.`,
      smuggler: `Hey there, ${characterName || 'friend'}. I'm Dockmaster Jax. Looks like you're new around here. Let me show you the ropes.`,
      scholar: `Hello, ${characterName || 'traveler'}. I'm Archivist Tera. I see you've just arrived. Allow me to guide you through your first steps.`,
      medic: `Welcome, ${characterName || 'newcomer'}. I'm Medic Voss. I'm here to help you get started. Let's begin with the basics.`,
      engineer: `Greetings, ${characterName || 'colleague'}. I'm Tech Specialist Rynn. Welcome to the spaceport. I'll help you learn the essentials.`,
      diplomat: `Hello, ${characterName || 'visitor'}. I'm Ambassador Lira. Welcome. Let me guide you through your introduction to this world.`
    };

    return greetings[background] || greetings.soldier;
  }

  /**
   * Process tutorial dialogue based on player message and tutorial state
   */
  async processTutorialDialogue(npcId, characterId, playerMessage, tutorialState, character) {
    const background = character.background || 'soldier';
    const dialogueTree = this.getTutorialDialogueTree(background, tutorialState);
    
    // Normalize player message for matching
    const normalizedMessage = playerMessage.toLowerCase().trim();
    
    console.log(`[TutorialDialogue] Processing dialogue:`, {
      npcId,
      characterId,
      playerMessage,
      normalizedMessage,
      tutorialState,
      background,
      isEmptyMessage: !playerMessage || playerMessage.trim() === ''
    });
    
    // Find matching dialogue node
    let response = null;
    let nextState = null;
    let suggestedResponses = [];
    let offerQuest = false;
    
    // Handle post-combat vendor tutorial (when tutorial state is combat_complete or vendor_intro)
    const isEmptyMessage = !playerMessage || playerMessage.trim() === '';
    const isPostCombatState = tutorialState === 'combat_complete' || tutorialState === 'vendor_intro';
    
    if (isPostCombatState && isEmptyMessage) {
      console.log(`[TutorialDialogue] Post-combat vendor tutorial detected: state=${tutorialState}, emptyMessage=${isEmptyMessage}`);
      // Initial post-combat greeting - show congratulatory message and guide to vendor
      // Always guide player to purchase medpac after combat (they likely took damage)
      response = dialogueTree.combatComplete || `Excellent work! You've completed your first combat encounter. I can see you've taken some damage. Now that you've defeated an enemy in combat, let's heal your injuries. To do that, let's purchase a medpac. I'll open my vendor interface so you can buy one.`;
      nextState = 'vendor_intro';
      suggestedResponses = [
        { text: "Yes, show me what you have", action: 'open_vendor' },
        { text: "What are medpacs?", action: 'medpac_info' },
        { text: "Not right now", action: 'decline_vendor' }
      ];
      console.log(`[TutorialDialogue] Post-combat vendor tutorial message for ${tutorialState} state`);
    } else if (tutorialState === 'spaceport_exit_explained' && (!playerMessage || playerMessage.trim() === '')) {
      // Farewell message when player is ready to exit the spaceport
      const characterName = character.name || 'traveler';
      const npcName = this.getNPCName(background);
      response = `Farewell, ${characterName}! You've done excellently learning the basics. You're now ready to leave the spaceport and explore the planet's vast and unique surface. Out there, you'll find friends, foes, interesting locations, and possibly hidden treasures. Remember, if you ever need anything explained again, feel free to return and speak with me. Good luck on your journey, ${characterName}!`;
      nextState = 'spaceport_exit_explained';
      suggestedResponses = [
        { text: "Thank you!", action: 'acknowledge' },
        { text: "I'll be back", action: 'acknowledge' }
      ];
      console.log(`[TutorialDialogue] Spaceport exit farewell message for ${tutorialState} state`);
    } else if ((tutorialState === 'item_sold' || tutorialState === 'loot_received' || tutorialState === 'inventory_opened') && (!playerMessage || playerMessage.trim() === '')) {
      // Initial post-vendor greeting - guide player to inventory and medpac usage
      response = `Excellent! You've learned how to buy and sell items. Now that you have a medpac, let's learn how to use it. Press the "i" key to open your inventory, then use the medpac to restore your health.`;
      nextState = 'loot_received';
      suggestedResponses = [
        { text: "How do I open my inventory?", action: 'inventory_help' },
        { text: "I'll try it", action: 'acknowledge' }
      ];
      console.log(`[TutorialDialogue] Post-vendor inventory tutorial message for ${tutorialState} state`);
    } else if (this.matchesKeyword(normalizedMessage, ['inventory', 'i key', 'hotkey', 'keyboard'])) {
      // Player asking about inventory
      if (tutorialState === 'item_sold' || tutorialState === 'loot_received' || tutorialState === 'inventory_opened') {
        response = `Press the "i" key on your keyboard to open your inventory. Once it's open, you'll see all your items. Find the medpac you just bought and click "Use" to restore your health.`;
        nextState = 'inventory_opened';
        suggestedResponses = [
          { text: "Got it", action: 'acknowledge' }
        ];
      } else {
        response = dialogueTree.greeting || this.getInitialGreeting(background, character.name);
        suggestedResponses = dialogueTree.initialResponses || [];
      }
    } else if (this.matchesKeyword(normalizedMessage, ['hello', 'hi', 'greetings', 'hey'])) {
      // If in item_sold or loot_received state, show post-vendor greeting
      if (tutorialState === 'item_sold' || tutorialState === 'loot_received' || tutorialState === 'inventory_opened') {
        response = `Great work on the trading! Now let's learn about using items. Press "i" to open your inventory and use the medpac you bought to heal.`;
        nextState = 'loot_received';
        suggestedResponses = [
          { text: "How do I open my inventory?", action: 'inventory_help' },
          { text: "I'll try it", action: 'acknowledge' }
        ];
      } else if (tutorialState === 'combat_complete' || tutorialState === 'vendor_intro') {
        response = dialogueTree.combatComplete || `Welcome back! Great job completing your combat training. I can see you've taken some damage. Now that you've defeated an enemy in combat, let's heal your injuries. To do that, let's purchase a medpac. I'll open my vendor interface so you can buy one.`;
        nextState = 'vendor_intro';
        suggestedResponses = [
          { text: "Yes, show me what you have", action: 'open_vendor' },
          { text: "What are medpacs?", action: 'medpac_info' }
        ];
      } else {
        response = dialogueTree.greeting || this.getInitialGreeting(background, character.name);
        suggestedResponses = dialogueTree.initialResponses || [];
      }
    } else if (this.matchesKeyword(normalizedMessage, ['work', 'job', 'quest', 'mission', 'task', 'help', 'something to do'])) {
      response = dialogueTree.questOffer || "I have a task that would be perfect for you to learn the basics. It's called 'Dockside Initiation'. Would you like to accept it?";
      offerQuest = true;
      nextState = 'quest_offered';
      suggestedResponses = [
        { text: "Yes, I'll help", action: 'accept_quest' },
        { text: "Tell me more about it", action: 'quest_details' }
      ];
    } else if (this.matchesKeyword(normalizedMessage, ['yes', 'accept', 'i will', 'i\'ll help', 'sure', 'okay', 'ok', 'ready', 'i\'m ready', 'yes i\'m ready', 'yes im ready', 'im ready', 'i am ready', 'lets go', 'let\'s go', 'lets do it', 'let\'s do it', 'begin', 'start', 'go'])) {
      console.log(`[TutorialDialogue] Processing "Yes" response, tutorialState: ${tutorialState}`);
      
      // Check if quest is already accepted (could be quest_accepted or quest_objective_tracking)
      if (tutorialState === 'quest_accepted' || tutorialState === 'quest_objective_tracking') {
        // Check if combat has already been completed
        const { QuestProgress, Quest } = require('../models');
        const questProgress = await QuestProgress.findOne({
          where: {
            characterId,
            questId: 'tutorial_001_dockside_initiation',
            status: 'active'
          }
        });
        
        const combatCompleted = questProgress?.objectivesCompleted?.['tutorial_combat'];
        
        if (combatCompleted) {
          // Combat already completed, guide to vendor instead
          console.log(`[TutorialDialogue] Combat already completed, guiding to vendor`);
          response = dialogueTree.vendorOffer || "You've already completed the combat training! Great work. Now let's learn about buying and selling items. I can show you my vendor interface.";
          nextState = 'vendor_intro';
          suggestedResponses = [
            { text: "Yes, show me what you have", action: 'open_vendor' },
            { text: "What should I do next?", action: 'guidance' }
          ];
        } else {
          // Player is confirming they're ready for combat
          console.log(`[TutorialDialogue] Player ready for combat, transitioning to combat_intro`);
          response = dialogueTree.combatReady || "Perfect! Let's begin your combat training. You'll face a training opponent. Pay attention to the turn order and action menu - I'll guide you through it.";
          nextState = 'combat_intro';
          suggestedResponses = [];
        }
      } else if (tutorialState === 'quest_offered' || tutorialState === 'dialogue_started') {
        response = dialogueTree.questAccept || "Excellent! I've assigned you the 'Dockside Initiation' quest. This will teach you the basics of combat and exploration. Check your quest log to see the objectives.";
        offerQuest = true;
        nextState = 'quest_accepted';
        suggestedResponses = [
          { text: "How do I check my quest log?", action: 'quest_log_help' },
          { text: "What should I do first?", action: 'quest_guidance' }
        ];
      } else if (tutorialState === 'combat_complete' || tutorialState === 'vendor_intro') {
        // Handle vendor-related "Yes" responses after combat
        response = dialogueTree.vendorOffer || "Perfect! I'll open my vendor interface. You can buy medpacs to restore health, and other useful supplies. Take a look at what's available.";
        nextState = 'vendor_intro';
        suggestedResponses = [
          { text: "Open vendor", action: 'open_vendor' }
        ];
      } else {
        response = dialogueTree.general || "I'm glad you're interested. Let me know if you have any questions about how things work around here.";
        suggestedResponses = dialogueTree.initialResponses || [];
      }
    } else if (this.matchesKeyword(normalizedMessage, ['show', 'vendor', 'shop', 'buy', 'sell', 'supplies', 'medpac', 'stimpack', 'items'])) {
      // Handle vendor-related keywords (excluding 'yes' which is handled above)
      if (tutorialState === 'combat_complete' || tutorialState === 'vendor_intro') {
        response = dialogueTree.vendorOffer || "Perfect! I'll open my vendor interface. You can buy medpacs to restore health, and other useful supplies. Take a look at what's available.";
        nextState = 'vendor_intro';
        suggestedResponses = [
          { text: "Open vendor", action: 'open_vendor' }
        ];
      } else {
        response = dialogueTree.default || "I'm here to help you get started. Would you like to take on a task to learn the basics?";
        suggestedResponses = dialogueTree.initialResponses || [];
      }
    } else if (this.matchesKeyword(normalizedMessage, ['no', 'not yet', 'wait', 'later'])) {
      if (tutorialState === 'quest_accepted') {
        response = dialogueTree.notReady || "That's fine. Take your time. When you're ready, just let me know and we'll begin the combat training.";
        suggestedResponses = [
          { text: "I'm ready now", action: 'ready_for_combat', icon: '⚔️' },
          { text: "Tell me more about combat", action: 'combat_info' }
        ];
      } else {
        response = dialogueTree.general || "I'm here when you need me. Let me know if you have any questions.";
        suggestedResponses = dialogueTree.initialResponses || [];
      }
    } else if (this.matchesKeyword(normalizedMessage, ['combat', 'fight', 'battle', 'enemy'])) {
      response = dialogueTree.combatGuidance || "Combat is turn-based. You'll learn the basics when you encounter your first enemy. For now, focus on accepting the quest and following the objectives.";
      suggestedResponses = [
        { text: "Tell me about the quest", action: 'quest_details' },
        { text: "How do I start?", action: 'quest_guidance' }
      ];
    } else {
      // Default response that guides back to tutorial flow
      // IMPORTANT: Do NOT set nextState to 'combat_intro' here - it should only be set when player explicitly says "Yes"
      // The NPC will ask "Are you ready?" but we should wait for the player's response before transitioning
      if (tutorialState === 'quest_accepted' || tutorialState === 'quest_objective_tracking') {
        // Quest is accepted, but player hasn't confirmed readiness yet
        // Just provide a response that encourages them to confirm, but don't transition to combat_intro
        console.log(`[TutorialDialogue] Quest accepted but player hasn't confirmed readiness yet`);
        response = "When you're ready to begin combat training, just let me know!";
        suggestedResponses = [
          { text: "Yes, I'm ready", action: 'ready_for_combat', icon: '⚔️' },
          { text: "Not yet", action: 'not_ready', icon: '⏸️' }
        ];
        // Don't set nextState here - wait for explicit "Yes" response
      } else if (tutorialState === 'combat_intro') {
        // Already in combat_intro state, provide combat ready response
        response = dialogueTree.combatReady || "Perfect! Let's begin your combat training. You'll face a training opponent. Pay attention to the turn order and action menu - I'll guide you through it.";
        nextState = 'combat_intro';
        suggestedResponses = [];
      } else if (tutorialState === 'combat_complete' || tutorialState === 'vendor_intro') {
        // Post-combat state - guide to vendor
        response = dialogueTree.combatComplete || `Excellent work! You've completed your first combat encounter. I can see you've taken some damage. Now that you've defeated an enemy in combat, let's heal your injuries. To do that, let's purchase a medpac. I'll open my vendor interface so you can buy one.`;
        nextState = 'vendor_intro';
        suggestedResponses = [
          { text: "Yes, show me what you have", action: 'open_vendor' },
          { text: "What are medpacs?", action: 'medpac_info' },
          { text: "Not right now", action: 'decline_vendor' }
        ];
      } else {
        response = dialogueTree.default || "I'm here to help you get started. Would you like to take on a task to learn the basics?";
        suggestedResponses = [
          { text: "Yes, I'd like a task", action: 'quest_offer' },
          { text: "Tell me about this place", action: 'location_info' }
        ];
      }
    }

    // Ensure response is not null or undefined
    if (!response) {
      console.error(`[TutorialDialogue] No response generated for message:`, playerMessage, 'tutorialState:', tutorialState);
      response = "I'm here to help you get started. Let me know if you have any questions.";
    }
    
    // Ensure suggestedResponses is an array
    if (!Array.isArray(suggestedResponses)) {
      console.warn(`[TutorialDialogue] suggestedResponses is not an array, defaulting to empty array`);
      suggestedResponses = [];
    }
    
    const result = {
      response,
      suggestedResponses: suggestedResponses.map(r => typeof r === 'string' ? { text: r } : r),
      offerQuest: offerQuest || false,
      nextState,
      isTutorial: true
    };
    
    console.log(`[TutorialDialogue] Returning dialogue result:`, {
      response: result.response ? result.response.substring(0, 50) + '...' : 'null',
      nextState: result.nextState,
      offerQuest: result.offerQuest,
      suggestedResponsesCount: result.suggestedResponses.length,
      firstSuggestedResponse: result.suggestedResponses[0] ? JSON.stringify(result.suggestedResponses[0]) : 'none'
    });
    
    return result;
  }

  /**
   * Get suggested responses for tutorial NPC based on tutorial state
   */
  getSuggestedResponses(tutorialState, background) {
    const dialogueTree = this.getTutorialDialogueTree(background, tutorialState);
    
    if (tutorialState === 'dialogue_started' || tutorialState === 'npc_menu_opened') {
      return dialogueTree.initialResponses || [
        { text: "Do you have any work for me?", action: 'quest_offer' },
        { text: "Tell me about this place", action: 'location_info' },
        { text: "What should I do first?", action: 'guidance' }
      ];
    } else if (tutorialState === 'quest_offered') {
      return [
        { text: "Yes, I'll help", action: 'accept_quest' },
        { text: "Tell me more about it", action: 'quest_details' }
      ];
    } else if (tutorialState === 'quest_accepted' || tutorialState === 'quest_objective_tracking') {
      return [
        { text: "Yes, I'm ready", action: 'ready_for_combat', icon: '⚔️' },
        { text: "Not yet", action: 'not_ready', icon: '⏸️' }
      ];
    } else if (tutorialState === 'combat_complete' || tutorialState === 'vendor_intro') {
      // After combat, guide player to vendor
      return [
        { text: "Yes, show me what you have", action: 'open_vendor' },
        { text: "What are medpacs?", action: 'medpac_info' },
        { text: "Not right now", action: 'decline_vendor' }
      ];
    }

    return dialogueTree.initialResponses || [];
  }

  /**
   * Helper to check if message matches keywords
   */
  matchesKeyword(message, keywords) {
    return keywords.some(keyword => message.includes(keyword));
  }

  /**
   * Soldier background dialogue tree
   */
  getSoldierDialogueTree() {
    return {
      greeting: "Welcome, recruit. I'm Sergeant Kael. I see you've just arrived at the spaceport. Let me help you get oriented and ready for action.",
      initialResponses: [
        { text: "Do you have any work for me?", action: 'quest_offer' },
        { text: "Tell me about this spaceport", action: 'location_info' },
        { text: "What should I do first?", action: 'guidance' }
      ],
      questOffer: "I have a training mission called 'Dockside Initiation' that's perfect for new recruits. It will teach you combat basics, exploration, and how to handle yourself in the field. Are you ready to accept it?",
      questAccept: "Excellent! I've assigned you the 'Dockside Initiation' quest. This will teach you the fundamentals. Check your quest log in the HUD to see your objectives. Your first task is to explore the area and engage in combat training.",
      questDetails: "The 'Dockside Initiation' quest will guide you through: 1) Basic movement and exploration, 2) Combat mechanics, 3) Loot collection, 4) Inventory management, and 5) Quest completion. It's designed to teach you everything you need to know.",
      combatReady: "Perfect! Let's begin your combat training. You'll face a training opponent. Pay attention to the turn order and action menu - I'll guide you through it.",
      combatGuidance: "Combat is turn-based. When you encounter an enemy, you'll see your action menu. You can attack, use abilities, or use items. Pay attention to turn order and plan your moves strategically.",
      combatComplete: "Excellent work, recruit! You've completed your first combat encounter. You handled yourself well. I can see you've taken some damage. Now that you've defeated an enemy in combat, let's heal your injuries. To do that, let's purchase a medpac. I'll open my vendor interface so you can buy one.",
      vendorOffer: "Perfect! I'll open my vendor interface. You can buy medpacs to restore health during combat, and other useful supplies. Take a look at what's available.",
      medpacInfo: "Medpacs are consumable items that restore health. They're essential for surviving combat. You can use them during battle or between encounters. I have some basic medpacs available for purchase.",
      notReady: "That's fine. Take your time. When you're ready, just let me know and we'll begin the combat training.",
      default: "I'm here to help you get started, recruit. Would you like to take on the training mission?",
      general: "Good. Let's get you ready for action. Accept the quest when you're ready."
    };
  }

  /**
   * Pilot background dialogue tree
   */
  getPilotDialogueTree() {
    return {
      greeting: "Greetings, pilot. I'm Flight Controller Dex. Welcome to the spaceport. I'm here to help you get started on your journey through the galaxy.",
      initialResponses: [
        { text: "Do you have any work for me?", action: 'quest_offer' },
        { text: "Tell me about this spaceport", action: 'location_info' },
        { text: "What should I do first?", action: 'guidance' }
      ],
      questOffer: "I have an orientation mission called 'Dockside Initiation' that will help you learn the basics of piloting through life in the galaxy. It covers combat, exploration, and survival. Ready to begin?",
      questAccept: "Perfect! I've assigned you the 'Dockside Initiation' quest. Check your quest log to see the objectives. This will teach you everything you need to know to navigate the galaxy safely.",
      combatReady: "Perfect! Let's begin your combat training. You'll face a training opponent. Pay attention to the turn order and action menu - I'll guide you through it.",
      combatComplete: "Outstanding work, pilot! You've completed your first combat encounter. I can see you've taken some damage. Now that you've defeated an enemy in combat, let's heal your injuries. To do that, let's purchase a medpac. I'll open my vendor interface so you can buy one.",
      vendorOffer: "Perfect! I'll open my vendor interface. You can buy medpacs to restore health during combat, and other useful supplies. Take a look at what's available.",
      notReady: "That's fine. Take your time. When you're ready, just let me know and we'll begin the combat training.",
      default: "I'm here to help you get started, pilot. Would you like to begin the orientation mission?"
    };
  }

  /**
   * Smuggler background dialogue tree
   */
  getSmugglerDialogueTree() {
    return {
      greeting: "Hey there, friend. I'm Dockmaster Jax. Looks like you're new around here. Let me show you the ropes and help you get your bearings.",
      initialResponses: [
        { text: "Do you have any work for me?", action: 'quest_offer' },
        { text: "Tell me about this place", action: 'location_info' },
        { text: "What should I do first?", action: 'guidance' }
      ],
      questOffer: "I've got a job called 'Dockside Initiation' that's perfect for someone just starting out. It'll teach you the basics of how things work around here - combat, looting, the works. Interested?",
      questAccept: "Great! I've set you up with the 'Dockside Initiation' job. Check your quest log to see what you need to do. This'll teach you everything you need to know to survive out here.",
      combatReady: "Perfect! Let's begin your combat training. You'll face a training opponent. Pay attention to the turn order and action menu - I'll guide you through it.",
      combatComplete: "Nice work, friend! You handled that combat well. I can see you've taken some damage. Now that you've defeated an enemy in combat, let's heal your injuries. To do that, let's purchase a medpac. I'll open my vendor interface so you can buy one.",
      vendorOffer: "Good choice! I'll open my vendor interface. You can buy medpacs to restore health, and other useful supplies. Check out what's available.",
      notReady: "That's fine. Take your time. When you're ready, just let me know and we'll begin the combat training.",
      default: "I'm here to help you get started. Want to take on a job to learn the basics?"
    };
  }

  /**
   * Scholar background dialogue tree
   */
  getScholarDialogueTree() {
    return {
      greeting: "Hello, traveler. I'm Archivist Tera. I see you've just arrived. Allow me to guide you through your first steps in this new world.",
      initialResponses: [
        { text: "Do you have any work for me?", action: 'quest_offer' },
        { text: "Tell me about this place", action: 'location_info' },
        { text: "What should I do first?", action: 'guidance' }
      ],
      questOffer: "I have a research assignment called 'Dockside Initiation' that will help you learn about this world through hands-on experience. It covers exploration, combat, and discovery. Would you like to begin?",
      questAccept: "Excellent! I've assigned you the 'Dockside Initiation' research assignment. Check your quest log for the objectives. This will be an excellent learning experience.",
      combatReady: "Perfect! Let's begin your combat training. You'll face a training opponent. Pay attention to the turn order and action menu - I'll guide you through it.",
      combatComplete: "Well done, traveler! You've completed your first combat encounter. I can see you've taken some damage. Now that you've defeated an enemy in combat, let's heal your injuries. To do that, let's purchase a medpac. I'll open my vendor interface so you can buy one.",
      vendorOffer: "Excellent! I'll open my vendor interface. You can buy medpacs to restore health during combat, and other useful supplies. Take a look at what's available.",
      notReady: "That's fine. Take your time. When you're ready, just let me know and we'll begin the combat training.",
      default: "I'm here to help you learn and explore. Would you like to begin the research assignment?"
    };
  }

  /**
   * Medic background dialogue tree
   */
  getMedicDialogueTree() {
    return {
      greeting: "Welcome, newcomer. I'm Medic Voss. I'm here to help you get started and ensure you understand how to take care of yourself out there.",
      initialResponses: [
        { text: "Do you have any work for me?", action: 'quest_offer' },
        { text: "Tell me about this place", action: 'location_info' },
        { text: "What should I do first?", action: 'guidance' }
      ],
      questOffer: "I have a training exercise called 'Dockside Initiation' that will teach you the basics of survival, combat, and medical care. It's designed for newcomers. Ready to start?",
      questAccept: "Good! I've assigned you the 'Dockside Initiation' training exercise. Check your quest log for the objectives. You'll learn about combat, healing, and survival.",
      combatReady: "Perfect! Let's begin your combat training. You'll face a training opponent. Pay attention to the turn order and action menu - I'll guide you through it.",
      combatComplete: "Excellent work! You've completed your first combat encounter. I can see you've taken some damage. Now that you've defeated an enemy in combat, let's heal your injuries. As a medic, I can help you purchase a medpac. I'll open my vendor interface so you can buy one.",
      vendorOffer: "Perfect! I'll open my medical supply vendor interface. You can buy medpacs to restore health during combat, and other useful medical supplies. Take a look at what's available.",
      notReady: "That's fine. Take your time. When you're ready, just let me know and we'll begin the combat training.",
      default: "I'm here to help you get started. Would you like to begin the training exercise?"
    };
  }

  /**
   * Engineer background dialogue tree
   */
  getEngineerDialogueTree() {
    return {
      greeting: "Greetings, colleague. I'm Tech Specialist Rynn. Welcome to the spaceport. I'll help you learn the essentials of how things work here.",
      initialResponses: [
        { text: "Do you have any work for me?", action: 'quest_offer' },
        { text: "Tell me about this place", action: 'location_info' },
        { text: "What should I do first?", action: 'guidance' }
      ],
      questOffer: "I have a technical orientation called 'Dockside Initiation' that will teach you the systems and mechanics you'll need to know. It covers combat, inventory, and exploration. Interested?",
      questAccept: "Perfect! I've assigned you the 'Dockside Initiation' orientation. Check your quest log for the objectives. This will teach you all the technical aspects you need to know.",
      combatReady: "Perfect! Let's begin your combat training. You'll face a training opponent. Pay attention to the turn order and action menu - I'll guide you through it.",
      combatComplete: "Excellent work, colleague! You've completed your first combat encounter. I can see you've taken some damage. Now that you've defeated an enemy in combat, let's heal your injuries. To do that, let's purchase a medpac. I'll open my vendor interface so you can buy one.",
      vendorOffer: "Perfect! I'll open my vendor interface. You can buy medpacs to restore health during combat, and other useful supplies. Take a look at what's available.",
      notReady: "That's fine. Take your time. When you're ready, just let me know and we'll begin the combat training.",
      default: "I'm here to help you learn the systems. Would you like to begin the technical orientation?"
    };
  }

  /**
   * Diplomat background dialogue tree
   */
  getDiplomatDialogueTree() {
    return {
      greeting: "Hello, visitor. I'm Ambassador Lira. Welcome. Let me guide you through your introduction to this world and help you understand how things work here.",
      initialResponses: [
        { text: "Do you have any work for me?", action: 'quest_offer' },
        { text: "Tell me about this place", action: 'location_info' },
        { text: "What should I do first?", action: 'guidance' }
      ],
      questOffer: "I have an introduction mission called 'Dockside Initiation' that will help you learn about this world through guided experience. It covers diplomacy, combat, and exploration. Would you like to begin?",
      questAccept: "Wonderful! I've assigned you the 'Dockside Initiation' introduction mission. Check your quest log for the objectives. This will be an excellent way to learn about this world.",
      combatReady: "Perfect! Let's begin your combat training. You'll face a training opponent. Pay attention to the turn order and action menu - I'll guide you through it.",
      combatComplete: "Excellent work, visitor! You've completed your first combat encounter. I can see you've taken some damage. Now that you've defeated an enemy in combat, let's heal your injuries. To do that, let's purchase a medpac. I'll open my vendor interface so you can buy one.",
      vendorOffer: "Perfect! I'll open my vendor interface. You can buy medpacs to restore health during combat, and other useful supplies. Take a look at what's available.",
      notReady: "That's fine. Take your time. When you're ready, just let me know and we'll begin the combat training.",
      default: "I'm here to help you get started. Would you like to begin the introduction mission?"
    };
  }
}

module.exports = new TutorialDialogueService();

