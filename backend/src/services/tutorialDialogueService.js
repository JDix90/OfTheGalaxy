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
    // #16: the onboarding guide is unified to Dockmaster Jax for every
    // background — one memorable, authored voice. Background still flavors the
    // character's starting planet/credits/skills; only the guide is shared.
    return this.getJaxDialogueTree();
  }

  /**
   * Get NPC name. Unified to the single authored onboarding guide.
   */
  getNPCName(background) {
    return 'Dockmaster Jax';
  }

  /**
   * Cold-open greeting — establishes place (Solenne), the guide, the unsettled
   * mood of the Reach, and the player's precarious footing as a newcomer.
   */
  getInitialGreeting(background, characterName) {
    const name = characterName || 'stranger';
    return `Welcome to the docks, ${name}. Dockmaster Jax — I run these landing bays, which mostly means I keep the wrong people from running them. You picked a restless season to make planetfall. The Concord swears the lanes are safe; the freighter crews who actually fly them say otherwise. Either way, a newcomer with no creds and no contacts doesn't last a week out here. Lucky for you, I've got a soft spot for strays. Stay close and I'll teach you how to keep breathing.`;
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
    let closingChoice = null; // set when the player makes the golden-path closing fork
    
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
    } else if ((tutorialState === 'spaceport_exit_explained' || tutorialState === 'tutorial_complete') && this.matchesKeyword(normalizedMessage, ['keeper', 'caldon', 'order', 'choose_keeper'])) {
      // Closing fork — player takes the resonance fragment to the Keepers on Caldon.
      const tree = this.getJaxDialogueTree();
      response = tree.closingKeeper;
      nextState = 'tutorial_complete';
      offerQuest = false;
      suggestedResponses = [];
      closingChoice = await this._applyClosingChoice(characterId, 'keeper');
      console.log(`[TutorialDialogue] Closing choice: KEEPER (Caldon)`);
    } else if ((tutorialState === 'spaceport_exit_explained' || tutorialState === 'tutorial_complete') && this.matchesKeyword(normalizedMessage, ['cartel', 'sinkport', 'sell', 'buyer', 'choose_cartel'])) {
      // Closing fork — player sells the resonance fragment to the Drift Cartel on Sinkport.
      const tree = this.getJaxDialogueTree();
      response = tree.closingCartel;
      nextState = 'tutorial_complete';
      offerQuest = false;
      suggestedResponses = [];
      closingChoice = await this._applyClosingChoice(characterId, 'cartel');
      console.log(`[TutorialDialogue] Closing choice: CARTEL (Sinkport)`);
    } else if (tutorialState === 'spaceport_exit_explained' && (!playerMessage || playerMessage.trim() === '')) {
      // Closing beat: Jax hands over the Veil resonance fragment and presents the
      // two-option fork (Keeper contact on Caldon vs. Drift Cartel on Sinkport).
      const tree = this.getJaxDialogueTree();
      response = `${tree.farewell} ${tree.closingChoiceIntro}`;
      nextState = 'spaceport_exit_explained';
      suggestedResponses = tree.closingChoiceResponses;
      console.log(`[TutorialDialogue] Closing fork presented for ${tutorialState} state`);
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
    
    // Personalize authored copy: replace {{name}} tokens with the character's name.
    const playerName = character?.name || 'stranger';
    if (typeof response === 'string') {
      response = response.replace(/\{\{name\}\}/g, playerName);
    }

    const { deriveSuggestionTone } = require('./suggestionTone');
    const result = {
      response,
      suggestedResponses: suggestedResponses.map(r => {
        const o = typeof r === 'string' ? { text: r } : r;
        return { ...o, tone: o.tone || deriveSuggestionTone(o) };
      }),
      offerQuest: offerQuest || false,
      nextState,
      isTutorial: true
    };

    // Golden-path closing fork: carry the faction lean + destination so the
    // client can surface rep toasts/tier-ups and point the player onward.
    if (closingChoice) {
      result.closingChoice = closingChoice;
      result.reputationChanges = closingChoice.reputationChanges || [];
    }
    
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
   * Apply the consequences of the golden-path closing choice: a faction lean
   * (routed through the central applyReputationChange so the client gets rep
   * toasts / tier-ups) plus the destination + follow-on quest pointer. Faction
   * mutations are best-effort — a failure here never blocks finishing the tutorial.
   * @param {string} characterId
   * @param {'keeper'|'cartel'} choice
   * @returns {Promise<Object>} closing-choice payload for the dialogue result
   */
  async _applyClosingChoice(characterId, choice) {
    // Explicit display names: the backend faction-profile registry and the
    // frontend faction screen use slightly different ids, so we name these here
    // to keep the rep toast correct while storing ids the faction screen knows.
    const FACTION_NAMES = { keeper_order: 'The Keeper Order', drift_cartel: 'The Drift Cartel' };
    const CHOICES = {
      keeper: {
        choice: 'keeper',
        destinationPlanet: 'caldon',
        followOnQuest: 'mq_keeper_fragment_01',
        followOnQuestTitle: 'What Sleeps in the Shard',
        reputation: { keeper_order: 15, drift_cartel: -5 }
      },
      cartel: {
        choice: 'cartel',
        destinationPlanet: 'sinkport',
        followOnQuest: 'mq_cartel_fragment_01',
        followOnQuestTitle: 'No Questions Asked',
        reputation: { drift_cartel: 15, keeper_order: -5 }
      }
    };
    const cfg = CHOICES[choice];
    const reputationChanges = [];

    try {
      const factionService = require('./factionService');
      for (const [factionId, delta] of Object.entries(cfg.reputation)) {
        if (!delta) continue;
        const r = await factionService.applyReputationChange(characterId, factionId, delta, { reason: 'tutorial-closing-choice' });
        reputationChanges.push({
          factionId: r.factionId,
          factionName: FACTION_NAMES[factionId] || factionId,
          delta: r.delta,
          oldTier: r.oldTier,
          newTier: r.newTier,
          tierChanged: r.tierChanged,
          total: r.total
        });
      }
    } catch (err) {
      console.error('[TutorialDialogue] Failed to apply closing-choice reputation:', err.message);
    }

    // Spawn the first real quest: upsert its definition (so it exists for a fresh
    // DB without a seed run) then start it for this character. Best-effort — a
    // failure here never blocks finishing the tutorial.
    const questSpawned = await this._spawnFollowOnQuest(characterId, cfg.followOnQuest);

    return {
      choice: cfg.choice,
      destinationPlanet: cfg.destinationPlanet,
      followOnQuest: cfg.followOnQuest,
      followOnQuestTitle: cfg.followOnQuestTitle,
      questSpawned,
      reputationChanges
    };
  }

  /**
   * Ensure a tutorial follow-on quest exists in the Quest table and is active for
   * the character. Returns true if the quest is active afterward, false on failure.
   * @param {string} characterId
   * @param {string} questId
   * @returns {Promise<boolean>}
   */
  async _spawnFollowOnQuest(characterId, questId) {
    try {
      const { FOLLOW_ON_QUESTS } = require('../data/tutorialFollowOnQuests');
      const def = FOLLOW_ON_QUESTS[questId];
      if (!def) {
        console.warn(`[TutorialDialogue] No follow-on quest definition for ${questId}`);
        return false;
      }

      const { Quest } = require('../models');
      // Upsert the definition so the quest row exists even on a freshly-seeded DB.
      await Quest.upsert(def);

      const questService = require('./questService');
      const result = await questService.startQuest(characterId, questId);
      const active = !!(result && result.progress && (result.progress.status === 'active' || result.alreadyActive));
      console.log(`[TutorialDialogue] Follow-on quest ${questId} spawned for ${characterId}: active=${active}`);
      return active;
    } catch (err) {
      console.error(`[TutorialDialogue] Failed to spawn follow-on quest ${questId}:`, err.message);
      return false;
    }
  }

  /**
   * The unified onboarding guide: Dockmaster Jax of the Solenne docks.
   * One authored voice for every background — weathered, dryly funny, quietly
   * kind. The tree carries the golden-path beats: world cold-open, the combat
   * Veil-resonance hook, the heal/trade lessons, and the closing fork.
   */
  getJaxDialogueTree() {
    return {
      greeting: "Welcome to the docks. Dockmaster Jax — I run these landing bays. New face, empty pockets, that look in your eye like the galaxy already owes you something. I know the type. Stick with me and I'll make sure your first week isn't your last.",
      initialResponses: [
        { text: "Is there any work going?", action: 'quest_offer' },
        { text: "What is this place?", action: 'location_info' },
        { text: "Where do I even start?", action: 'guidance' }
      ],
      locationInfo: "These docks? Edge of the Reach, last honest fuel stop before the lanes get mean. The Concord flies its banners over the upper docks and pretends that means order. Down here it's freighter crews, Drift Cartel runners, and whoever else needs to disappear for a while. It's not pretty, but it's mine, and it'll teach you everything the core worlds won't.",
      guidance: "First thing you do anywhere new — learn to walk before you run. Move with the arrow keys or W-A-S-D. Get a feel for the deck. Then come find me and we'll talk about earning your keep.",
      questOffer: "As it happens, yes. Call it 'Dockside Initiation' — nothing glamorous, but it'll teach you the four things that keep a drifter alive out here: how to move, how to fight, how to patch yourself up, and how to drive a bargain. Do it right and I'll see you squared away with creds and a direction. You in?",
      questDetails: "Simple enough. You'll learn to find your footing on the docks, hold your own against a training drone, heal up afterward, and trade for supplies. Master those and the rest of the Reach is just variations on a theme. Ready when you are.",
      questAccept: "Good. 'Dockside Initiation' is on your slate — check the quest log up in your HUD whenever you lose the thread. Start by getting comfortable on your feet. When you're ready to test your nerve, I've got a training drone warmed up and waiting.",
      combatReady: "Then let's see what you're made of. The drone hits back, but it won't kill you — much. Watch the turn order on the left, pick your action from the menu, and aim for the thing trying to dent your skull. Go.",
      combatGuidance: "Combat's turn-based — no shame in thinking it through. Each round you choose: strike, defend, or burn an item. Read the turn order, spend your moves where they hurt the enemy most, and don't be a hero when half-health says retreat.",
      combatComplete: "Hah — still in one piece. Most aren't, their first time. You handled that clean.\n\n…Hold on. That drone's core just spiked — resonance readings climbing right off my board, and they're pointing at you, not the machine. I've watched Veil-touched come through these bays before, but I've never seen one light up by accident. We'll get to that. First you're bleeding on my deck plating. Let's get you a medpac before you faint and embarrass us both.",
      veilHook: "That spike wasn't the drone, {{name}}. That was you. Whatever's sleeping behind your ribs, it woke up a little just now — and things that wake up tend to get noticed. Keep it quiet for now. We'll figure out what it means.",
      vendorOffer: "Smart. I'll open my stall. Medpacs to put you back together, regen patches, a few odds and ends worth carrying. Buy what keeps you alive — sell me what's just weighing you down.",
      medpacInfo: "Medpacs? Field medicine in a tube. Crack one and it knits you back together — works mid-fight or after. Out here, a full pack is worth more than a full clip. Grab a couple before you go anywhere.",
      notReady: "No rush. The drone's not going anywhere, and neither am I. Say the word when your nerve catches up to your ambition.",
      general: "I'm right here. Ask me anything — better you look green now than dead later.",
      default: "I'm here to get you started, not to hold your hand forever. Want that job, or you just enjoying the view?",
      // Closing fork — handed to the player as they're ready to leave the docks.
      // The resonance fragment pulled from the drone's core, and a choice of where
      // to take it. (Wired to spawn the follow-on starter quest + faction lean.)
      farewell: "Before you wander off — I dug this out of the drone's core after you fried it.",
      closingChoiceIntro: "It's a resonance fragment, and it's keyed to whatever stirred in you back there. I can't read it, but I know two people who can. There's a Keeper contact on Caldon — Order folk, they live and breathe Veil-resonance, and they'll want to see this badly. Or there's a buyer on Sinkport — Drift Cartel, no names, no questions, and they pay in full and in coin. Your fragment, your call. Where's it going?",
      closingChoiceResponses: [
        { text: "Take it to the Keeper contact on Caldon.", action: 'choose_keeper', icon: '🛡️' },
        { text: "Sell it to the Drift Cartel on Sinkport.", action: 'choose_cartel', icon: '💰' }
      ],
      closingKeeper: "The Order, then. Figures — you've got that look. Caldon's a quiet world, and the Keepers are quieter, but they keep their word, which is rarer than it sounds. Tell them Jax sent you; it'll buy you a hearing. Watch yourself on the lanes, {{name}}. The Reach is wide and it doesn't care about you — but I do, a little. Now get going.",
      closingCartel: "Sinkport it is. Can't say I blame you — coin spends, mysteries don't. The Cartel buyer's fair, by their standards, long as you don't count your fingers afterward. Tell them Jax vouched and they'll deal straight. Watch yourself on the lanes, {{name}}. The Reach is wide and it doesn't care about you — but I do, a little. Now get going."
    };
  }
}

module.exports = new TutorialDialogueService();

