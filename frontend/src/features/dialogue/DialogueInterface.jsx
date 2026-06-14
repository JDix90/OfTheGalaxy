/**
 * DialogueInterface Component
 * Handles NPC dialogue interactions (refactored from survivor encounters)
 */

import React, { useState, useEffect, useRef } from 'react';
import { formatDisplayName } from '../../utils/formatName';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCharacterStore } from '../../state/characterSlice';
import { npcApi } from '../../services/api/npcApi';
import { addTutorialTarget, TUTORIAL_TARGETS } from '../../services/tutorialTargetRegistry';
import { tutorialEventBus, TUTORIAL_EVENTS } from '../../services/tutorialEventBus';
import { gameEventBus, GAME_EVENTS } from '../../services/gameEventBus';
import { useConversationHistory } from '../../hooks/useConversationHistory';
import NPCDetailsModal from '../../components/npc/NPCDetailsModal';
import QuestOfferModal from '../../components/quest/QuestOfferModal';
import GameIcon from '../../components/common/GameIcon';
import ConversationTopics from '../../components/dialogue/ConversationTopics';
import ConversationSearch from '../../components/dialogue/ConversationSearch';
import './DialogueInterface.css';

// Faction display names
const getFactionDisplayName = (factionId) => {
  if (!factionId) return 'Unaffiliated';
  
  const displayNames = {
    'old_concord': 'Old Concord',
    'iron_dominion': 'Iron Dominion',
    'free_worlds': 'Free Worlds',
    'concord': 'Concord',
    'ascendancy': 'Ascendancy',
    'uprising': 'Uprising',
    'keeper_order': 'Keeper Order',
    'hollow': 'Hollow',
    'ironkin': 'Ironkin',
    'vorr': 'Vorr',
    'umbra': 'Umbra',
    'scarlet_tide': 'Scarlet Tide',
    'independent': 'Independent',
    'neutral': 'Neutral',
    'smugglers': 'Smugglers',
    'the_tally': 'Bounty Hunters',
    'commerce_league': 'Commerce League',
    'secession': 'Secessionists',
    'vorne_ascendancy': 'Vorne Ascendancy',
    'hesperan_consortium': 'Hesperan Consortium'
  };

  return displayNames[factionId] || factionId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

export default function DialogueInterface({ npc, onClose, autoSendMessage }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentCharacter } = useCharacterStore();
  const [relationship, setRelationship] = useState(null);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedResponses, setSuggestedResponses] = useState([]);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [fullNPCData, setFullNPCData] = useState(null);
  const [isQuestOfferModalOpen, setIsQuestOfferModalOpen] = useState(false);
  const [offeredQuestId, setOfferedQuestId] = useState(null);
  // Golden-path closing fork: set once the player picks where the fragment goes.
  const [closingDestination, setClosingDestination] = useState(null);
  const messagesEndRef = useRef(null);
  const dialogueRef = useRef(null);
  const inputRef = useRef(null);
  const sendButtonRef = useRef(null);
  const hasTutorialResponsesRef = useRef(false); // Track if we have tutorial responses with actions
  
  // NEW: Load conversation history
  const [selectedTopic, setSelectedTopic] = useState(null);
  const {
    messages: historyMessages,
    topics,
    isLoading: historyLoading,
    addMessage: addHistoryMessage,
    reload: reloadHistory,
    filterByTopic,
    search: searchHistory, // Phase 5: Search function
    searchQuery // Phase 5: Current search query
  } = useConversationHistory(npc?.id, currentCharacter?.id);
  
  // Session messages (new messages in current dialogue session)
  const [sessionMessages, setSessionMessages] = useState([]);
  
  // Merge historical messages with session messages
  // Convert history messages to match DialogueInterface format
  // Deduplicate by message ID or text + timestamp to avoid showing messages twice
  const historyMessagesFormatted = (historyMessages || []).map(msg => ({
    id: msg.id || `history_${msg.timestamp}_${msg.text?.substring(0, 20)}`,
    sender: msg.sender || (msg.player ? 'player' : 'npc'),
    text: msg.text || msg.player || msg.npc || '',
    timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date()
  }));
  
  const sessionMessagesWithIds = sessionMessages.map((msg, idx) => ({
    ...msg,
    id: msg.id || `session_${msg.timestamp?.getTime()}_${idx}_${msg.text?.substring(0, 20)}`
  }));
  
  // Merge and deduplicate by ID or by text + sender + timestamp
  // Use a consistent key format that matches messages even if IDs differ
  const allMessagesMap = new Map();
  
  // Helper function to create a deduplication key
  const getDedupKey = (msg) => {
    if (!msg || !msg.sender || !msg.text) return null;
    // Use text + sender + timestamp (rounded to nearest second) for deduplication
    // This matches messages even if they have different IDs
    const timestamp = msg.timestamp?.getTime() || 0;
    const timestampRounded = Math.floor(timestamp / 1000) * 1000; // Round to nearest second
    return `${msg.sender}_${msg.text}_${timestampRounded}`;
  };
  
  // Add history messages first
  historyMessagesFormatted.forEach(msg => {
    if (!msg || !msg.sender || !msg.text) {
      console.warn('[Dialogue] Skipping invalid history message:', msg);
      return;
    }
    const key = getDedupKey(msg);
    if (key && !allMessagesMap.has(key)) {
      allMessagesMap.set(key, msg);
    }
  });
  
  // Add session messages (they take precedence if duplicate)
  // Session messages are newer, so they should override history messages
  sessionMessagesWithIds.forEach(msg => {
    if (!msg || !msg.sender || !msg.text) {
      console.warn('[Dialogue] Skipping invalid session message:', msg);
      return;
    }
    const key = getDedupKey(msg);
    if (key) {
      // Session messages override history messages if they match
      if (allMessagesMap.has(key)) {
        console.log(`[Dialogue] Session message overriding history message:`, { key, sender: msg.sender, text: msg.text?.substring(0, 30) });
      }
      allMessagesMap.set(key, msg);
    }
  });
  
  // Convert back to array and sort by timestamp
  const allMessages = Array.from(allMessagesMap.values())
    .filter(msg => msg && msg.sender && msg.text) // Filter out any invalid messages
    .sort((a, b) => {
      const timeA = a.timestamp?.getTime() || 0;
      const timeB = b.timestamp?.getTime() || 0;
      return timeA - timeB;
    });
  
  console.log(`[Dialogue] Message merge: ${historyMessagesFormatted.length} history, ${sessionMessagesWithIds.length} session, ${allMessages.length} total (after filtering)`);
  
  // Use allMessages as the messages state
  const messages = allMessages;
  
  // Debug: Log message counts
  useEffect(() => {
    console.log('[Dialogue] Message state:', {
      historyCount: historyMessages.length,
      sessionCount: sessionMessages.length,
      totalCount: messages.length,
      historyLoading,
      sessionMessages: sessionMessages.map(m => ({ sender: m.sender, text: m.text?.substring(0, 30) }))
    });
  }, [historyMessages.length, sessionMessages.length, messages.length, historyLoading]);
  
  // Clear old session messages when history loads to prevent duplicates
  // Only clear messages that are actually in history (to prevent duplicates)
  // IMPORTANT: Don't clear messages that are very recent (less than 3 seconds old)
  useEffect(() => {
    if (!historyLoading && historyMessages.length > 0 && sessionMessages.length > 0) {
      const now = Date.now();
      setSessionMessages(prev => {
        // Check each session message against history to see if it's a duplicate
        const filtered = prev.filter(sessionMsg => {
          if (!sessionMsg || !sessionMsg.sender || !sessionMsg.text) {
            return false; // Remove invalid messages
          }
          
          // Keep messages that are very recent (less than 10 seconds old) - they might not be in history yet
          // This is especially important for NPC responses which need to be displayed immediately
          const msgTime = sessionMsg.timestamp?.getTime() || 0;
          const age = now - msgTime;
          if (age < 10000) {
            console.log(`[Dialogue] Keeping recent session message (${age}ms old):`, sessionMsg.sender, sessionMsg.text?.substring(0, 30));
            return true; // Keep very recent messages - they might not be in history yet
          }
          
          // Check if this message exists in history (duplicate check)
          // Use rounded timestamps to match messages within the same second
          const msgTimeRounded = Math.floor(msgTime / 1000) * 1000;
          const isDuplicate = historyMessages.some(historyMsg => {
            const historyTime = historyMsg.timestamp ? new Date(historyMsg.timestamp).getTime() : 0;
            const historyTimeRounded = Math.floor(historyTime / 1000) * 1000;
            const historyText = historyMsg.text || historyMsg.player || historyMsg.npc || '';
            const historySender = historyMsg.sender || (historyMsg.player ? 'player' : 'npc');
            
            // Match by text, sender, and timestamp (within same second, rounded)
            const textMatch = historyText === sessionMsg.text;
            const senderMatch = historySender === sessionMsg.sender;
            const timeMatch = Math.abs(msgTimeRounded - historyTimeRounded) < 2000; // Within 2 seconds (rounded)
            
            return senderMatch && textMatch && timeMatch;
          });
          
          if (isDuplicate) {
            console.log(`[Dialogue] Removing duplicate session message:`, sessionMsg.sender, sessionMsg.text?.substring(0, 30));
          }
          
          // Remove if it's a duplicate
          return !isDuplicate;
        });
        
        if (filtered.length !== prev.length) {
          console.log(`[Dialogue] Cleared ${prev.length - filtered.length} duplicate session messages, kept ${filtered.length}`);
        }
        return filtered;
      });
    }
  }, [historyLoading, historyMessages, sessionMessages.length]);

  // Debug: Log modal state changes
  useEffect(() => {
    console.log('[Dialogue] Quest modal state changed:', {
      isQuestOfferModalOpen,
      offeredQuestId
    });
  }, [isQuestOfferModalOpen, offeredQuestId]);

  // Add tutorial targets
  useEffect(() => {
    if (dialogueRef.current) {
      addTutorialTarget(dialogueRef.current, TUTORIAL_TARGETS.DIALOGUE_INTERFACE);
    }
    if (inputRef.current) {
      addTutorialTarget(inputRef.current, TUTORIAL_TARGETS.DIALOGUE_INPUT);
    }
    if (sendButtonRef.current) {
      addTutorialTarget(sendButtonRef.current, TUTORIAL_TARGETS.DIALOGUE_SEND_BUTTON);
    }
  }, [npc]);

  // Emit dialogue started event
  useEffect(() => {
    if (npc && currentCharacter && messages.length > 0) {
      // Determine location based on current route
      const isOnPlanetSurface = location.pathname.includes('/planet/');
      const isTutorialNPC = npc.id?.startsWith('npc_tutorial_');
      
      tutorialEventBus.emit(TUTORIAL_EVENTS.DIALOGUE_STARTED, {
        npcId: npc.id,
        npcName: npc.name,
        characterId: currentCharacter.id,
        location: isOnPlanetSurface ? 'planet_surface' : 'spaceport',
        isTutorialNPC,
        timestamp: new Date().toISOString()
      });
    }
  }, [npc, currentCharacter, messages.length, location.pathname]);

  useEffect(() => {
    if (npc && currentCharacter) {
      hasTutorialResponsesRef.current = false; // Reset when NPC changes
      loadNPCData();
    }
  }, [npc, currentCharacter]);

  // NEW: Set initial greeting when history finishes loading and is empty
  useEffect(() => {
    // Only set greeting if:
    // 1. History has finished loading (not loading)
    // 2. No historical messages exist
    // 3. No session messages exist (haven't set greeting yet)
    // 4. Relationship is loaded
    // 5. Not returning from combat
    // 6. NPC data is loaded
    if (!historyLoading && 
        historyMessages.length === 0 && 
        sessionMessages.length === 0 && 
        relationship && 
        npc && 
        currentCharacter &&
        autoSendMessage === undefined &&
        !isLoading) {
      
      console.log('[Dialogue] History loaded with no messages, setting initial greeting');
      
      // Check if a quest was recently accepted (handled separately)
      const checkRecentlyAcceptedQuest = async () => {
        try {
          const { useQuestStore } = await import('../../state/questSlice');
          const activeQuests = useQuestStore.getState().activeQuests;
          const now = new Date();
          const recentlyAcceptedQuest = activeQuests.find(qp => {
            if (!qp.startedAt) return false;
            const startedAt = new Date(qp.startedAt);
            const secondsSinceAcceptance = (now - startedAt) / 1000;
            return secondsSinceAcceptance < 30 && secondsSinceAcceptance >= 0;
          });
          
          if (recentlyAcceptedQuest) {
            const quest = recentlyAcceptedQuest.quest;
            if (quest && (quest.questGiverId === npc.id || quest.giverId === npc.id || quest.npcId === npc.id)) {
              console.log('[Dialogue] Quest recently accepted, triggering thank-you message');
              setTimeout(async () => {
                try {
                  await handleSendMessage('');
                } catch (error) {
                  console.error('[Dialogue] Error sending thank you trigger:', error);
                  // Fallback to normal greeting
                  setInitialGreeting();
                }
              }, 100);
              return;
            }
          }
          
          // No recently accepted quest, set normal greeting
          setInitialGreeting();
        } catch (error) {
          console.error('[Dialogue] Error checking recently accepted quest:', error);
          setInitialGreeting();
        }
      };
      
      const setInitialGreeting = () => {
        const relationshipLevel = relationship.relationshipLevel || 0;
        let greeting;
        if (npc.id && npc.id.startsWith('npc_tutorial_')) {
          greeting = `Welcome, ${currentCharacter.name || 'traveler'}. I'm ${npc.name}. I see you've just arrived at the spaceport. Let me help you get oriented and ready to begin your journey.`;
        } else {
          // Use fullNPCData if available, otherwise npc
          const npcForGreeting = fullNPCData || npc;
          greeting = getGreeting(npcForGreeting, relationshipLevel);
        }
        setSessionMessages([{
          sender: 'npc',
          text: greeting,
          timestamp: new Date()
        }]);
      };
      
      checkRecentlyAcceptedQuest();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyLoading, historyMessages.length, sessionMessages.length, relationship, npc, currentCharacter, autoSendMessage, isLoading, fullNPCData]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Load suggested responses for all NPCs, including tutorial NPCs
    // The backend will handle tutorial NPCs correctly via suggestedResponseService
    // Tutorial dialogue responses from handleSendMessage will override these if needed
    // BUT: Don't reload if we already have tutorial suggested responses with actions
    // (to prevent overwriting the action property)
    if (npc && currentCharacter && relationship && messages.length > 0) {
      // Only load if we have messages (initial greeting has been set)
      // For tutorial NPCs, the backend will return tutorial-specific suggestions
      const isTutorialNPC = npc?.id && npc.id.startsWith('npc_tutorial_');
      
      // Check if we already have tutorial responses with actions - if so, don't reload
      // This prevents overwriting responses that were set by handleSendMessage
      if (isTutorialNPC && (hasTutorialResponsesRef.current || (suggestedResponses.length > 0 && suggestedResponses.some(r => r && typeof r === 'object' && r.action)))) {
        console.log('[Dialogue] Skipping suggested response reload - already have tutorial responses with actions');
        return;
      }
      
      // Reset the ref when loading new responses (non-tutorial or initial load)
      if (!isTutorialNPC) {
        hasTutorialResponsesRef.current = false;
      }
      
      if (isTutorialNPC) {
        // For tutorial NPCs, load suggested responses after initial greeting
        // The backend's suggestedResponseService will call tutorialDialogueService
        loadSuggestedResponses();
      } else {
        // For non-tutorial NPCs, load suggested responses normally
        loadSuggestedResponses();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [npc, currentCharacter, relationship, messages.length]);

  // Auto-send message if provided (e.g., when returning from combat)
  // Use a ref to track if we've already auto-sent to prevent multiple sends
  const autoSentRef = useRef(false);
  const lastAutoSendMessageRef = useRef(null);
  
  useEffect(() => {
    // Reset auto-sent flag if autoSendMessage changes (allows re-sending with new message)
    if (autoSendMessage !== lastAutoSendMessageRef.current) {
      autoSentRef.current = false;
      lastAutoSendMessageRef.current = autoSendMessage;
    }
    
    // Allow auto-send even if messages is empty (for post-combat dialogue)
    if (autoSendMessage !== undefined && relationship && !isLoading && !autoSentRef.current) {
      console.log('[Dialogue] Auto-send message triggered:', { autoSendMessage, hasRelationship: !!relationship, isLoading, autoSentRef: autoSentRef.current });
      // Small delay to ensure dialogue is ready
      const timer = setTimeout(() => {
        console.log('[Dialogue] Executing auto-send message:', autoSendMessage || '(empty)');
        autoSentRef.current = true;
        handleSendMessage(autoSendMessage || '');
      }, 500);
      return () => clearTimeout(timer);
    } else {
      console.log('[Dialogue] Auto-send conditions not met:', { 
        autoSendMessage: autoSendMessage !== undefined, 
        hasRelationship: !!relationship, 
        isLoading, 
        alreadySent: autoSentRef.current 
      });
    }
    
    // Reset auto-sent flag when NPC changes
    if (!npc) {
      autoSentRef.current = false;
      lastAutoSendMessageRef.current = null;
    }
  }, [autoSendMessage, relationship, isLoading, npc]);

  const loadNPCData = async () => {
    try {
      const response = await npcApi.getWithRelationship(npc.id, currentCharacter.id);
      
      // Handle response structure (response.data.data or response.data)
      const responseData = response.data.data || response.data;
      const npcData = responseData.npc || npc;
      const relationshipData = responseData.relationship || responseData;
      
      setRelationship(relationshipData);
      setFullNPCData(npcData); // Store full NPC data for modal
      
      // If session messages already exist, don't overwrite them (preserve conversation)
      if (sessionMessages.length > 0) {
        console.log('[Dialogue] Session messages already exist, preserving conversation');
        return;
      }
      
      // If we have historical messages, don't set initial greeting (history will be shown)
      if (!historyLoading && historyMessages && historyMessages.length > 0) {
        console.log(`[Dialogue] Loaded ${historyMessages.length} historical messages, skipping initial greeting`);
        return;
      }
      
      // If history is still loading, wait for it (the useEffect will handle greeting)
      if (historyLoading) {
        console.log('[Dialogue] History still loading, will set greeting when history finishes loading');
        return;
      }
      
      // History has finished loading and is empty - set greeting now
      console.log('[Dialogue] History loaded and empty, setting initial greeting in loadNPCData');
      
      // Check if we're returning from combat - if so, skip initial greeting
      // The auto-send message will trigger the post-combat dialogue
      const isReturningFromCombat = autoSendMessage !== undefined;
      
      if (isReturningFromCombat && npcData.id && npcData.id.startsWith('npc_tutorial_')) {
        // Don't set initial greeting - let the auto-send message handle it
        // This allows the post-combat congratulatory message to be shown
        console.log('[Dialogue] Returning from combat, skipping initial greeting for tutorial NPC');
        setSessionMessages([]);
        return;
      }
      
      // Check if a quest was recently accepted from this NPC
      // If so, send an empty message to trigger the backend's thank-you logic
      try {
        const { useQuestStore } = await import('../../state/questSlice');
        const activeQuests = useQuestStore.getState().activeQuests;
        const now = new Date();
        const recentlyAcceptedQuest = activeQuests.find(qp => {
          if (!qp.startedAt) return false;
          const startedAt = new Date(qp.startedAt);
          const secondsSinceAcceptance = (now - startedAt) / 1000;
          // Check if quest was accepted within last 30 seconds
          return secondsSinceAcceptance < 30 && secondsSinceAcceptance >= 0;
        });
        
        if (recentlyAcceptedQuest) {
          const quest = recentlyAcceptedQuest.quest;
          // Only trigger thank you if this NPC is the quest giver
          if (quest && (quest.questGiverId === npc.id || quest.giverId === npc.id || quest.npcId === npc.id)) {
            console.log('[Dialogue] Quest recently accepted from this NPC, triggering thank-you message');
            // Send empty message to trigger backend's thank-you logic
            // Use npcApi directly since handleSendMessage might not be available yet
            setTimeout(async () => {
              try {
                const thankYouResponse = await npcApi.sendDialogue(npc.id, currentCharacter.id, '');
                const thankYouData = thankYouResponse.data.data || thankYouResponse.data;
                const thankYouMessage = thankYouData.response || thankYouData.message || 'Thank you for accepting the quest!';
                const thankYouMsg = {
                  id: `npc_${Date.now()}_${Math.random()}`,
                  sender: 'npc',
                  text: thankYouMessage,
                  timestamp: new Date()
                };
                setSessionMessages([thankYouMsg]);
                // Load suggested responses after thank you message
                if (thankYouData.suggestedResponses) {
                  setSuggestedResponses(thankYouData.suggestedResponses || []);
                }
              } catch (error) {
                console.error('[Dialogue] Error sending thank you trigger:', error);
                // Fallback to normal greeting if sending fails
                const relationshipLevel = relationshipData.relationshipLevel || 0;
                const greeting = getGreeting(npcData, relationshipLevel);
                const greetingMsg = {
                  id: `npc_${Date.now()}_${Math.random()}`,
                  sender: 'npc',
                  text: greeting,
                  timestamp: new Date()
                };
                setSessionMessages([greetingMsg]);
              }
            }, 100);
            return;
          }
        }
      } catch (error) {
        console.error('[Dialogue] Error checking for recently accepted quest:', error);
        // Continue with normal greeting if quest check fails
      }
      
      // Add greeting message - use tutorial greeting if this is a tutorial NPC
      const relationshipLevel = relationshipData.relationshipLevel || 0;
      let greeting;
      if (npcData.id && npcData.id.startsWith('npc_tutorial_')) {
        // Use tutorial-specific initial greeting
        const tutorialDialogueService = await import('../../services/api/tutorialApi');
        // For now, use a tutorial-specific greeting
        greeting = `Welcome, ${currentCharacter.name || 'traveler'}. I'm ${npcData.name}. I see you've just arrived at the spaceport. Let me help you get oriented and ready to begin your journey.`;
      } else {
        greeting = getGreeting(npcData, relationshipLevel);
      }
      // Add greeting as session message (not to history - it's just for display)
      setSessionMessages([{
        sender: 'npc',
        text: greeting,
        timestamp: new Date()
      }]);
    } catch (error) {
      console.error('Failed to load NPC data:', error);
      // Only set default greeting on error if no messages exist
      if (allMessages.length === 0) {
        setSessionMessages([{
          sender: 'npc',
          text: `Hello. I'm ${npc.name}.`,
          timestamp: new Date()
        }]);
      }
      setFullNPCData(npc); // Fallback to basic NPC data
    }
  };

  const handleNPCInfoClick = async () => {
    // If we don't have full NPC data, fetch it
    if (!fullNPCData || !fullNPCData.personalityProfile) {
      try {
        const response = await npcApi.getWithRelationship(npc.id, currentCharacter.id);
        const responseData = response.data.data || response.data;
        const npcData = responseData.npc || npc;
        setFullNPCData(npcData);
      } catch (error) {
        console.error('Failed to load full NPC data:', error);
        setFullNPCData(npc); // Fallback to basic NPC data
      }
    }
    setIsDetailsModalOpen(true);
  };

  const loadSuggestedResponses = async () => {
    try {
      const conversationHistory = messages.map(m => ({
        sender: m.sender,
        text: m.text,
        timestamp: m.timestamp
      }));
      
      const response = await npcApi.getSuggestedResponses(
        npc.id,
        currentCharacter.id,
        conversationHistory
      );
      
      const responseData = response.data.data || response.data;
      setSuggestedResponses(responseData || []);
    } catch (error) {
      console.error('Failed to load suggested responses:', error);
      setSuggestedResponses([]);
    }
  };

  const getGreeting = (npcData, relationshipLevel) => {
    const tier = getRelationshipTier(relationshipLevel);
    
    if (npcData.dialogue?.greeting?.[tier]) {
      return npcData.dialogue.greeting[tier];
    }
    
    // Default greetings
    const defaults = {
      stranger: `Hello. I don't believe we've met.`,
      acquaintance: `Oh, hello again.`,
      friend: `Good to see you, friend.`,
      confidant: `My dear friend, welcome.`
    };
    
    return defaults[tier];
  };

  const getRelationshipTier = (level) => {
    // Enhancement: Lowered tier thresholds to match backend (15, 40, 70)
    // Changed from (21, 51, 81) to (15, 40, 70) for faster progression feel
    if (level < 15) return 'stranger';
    if (level < 40) return 'acquaintance';
    if (level < 70) return 'friend';
    return 'confidant';
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (messageText = null) => {
    // Allow empty messages when explicitly provided (e.g., for post-combat dialogue)
    const isExplicitMessage = messageText !== null;
    const userMessage = isExplicitMessage ? (messageText || '') : (inputMessage || '').trim();
    
    // Only block empty messages if they come from the input field
    if (!isExplicitMessage && (!userMessage || isLoading)) return;
    if (isLoading) return;

    setInputMessage('');

    // Add user message to chat (skip if empty - e.g., for post-combat auto-dialogue)
    if (userMessage) {
      const playerMessage = {
        id: `player_${Date.now()}_${Math.random()}`,
        sender: 'player',
        text: userMessage,
        timestamp: new Date()
      };
      // Add to session messages for immediate display
      // Don't add to history here - backend will save it, and history will reload
      // This prevents duplicates when history reloads
      setSessionMessages(prev => [...prev, playerMessage]);
    }

    // Emit tutorial event for message sent (even for empty messages - backend needs to process them)
    tutorialEventBus.emit(TUTORIAL_EVENTS.DIALOGUE_MESSAGE_SENT, {
      npcId: npc.id,
      message: userMessage || ''
    });

    setIsLoading(true);

    try {
      const response = await npcApi.sendDialogue(npc.id, currentCharacter.id, userMessage);
      
      // Handle response structure (response.data.data or response.data)
      const responseData = response.data.data || response.data;
      
      const npcResponse = responseData.response || responseData.message || 'No response';
      
      // Add NPC response
      const npcMessage = {
        id: `npc_${Date.now()}_${Math.random()}`,
        sender: 'npc',
        text: npcResponse,
        timestamp: new Date()
      };
      // Add to session messages for immediate display
      // Don't add to history here - backend will save it, and history will reload
      // This prevents duplicates when history reloads
      console.log('[Dialogue] Adding NPC response to session messages:', {
        id: npcMessage.id,
        sender: npcMessage.sender,
        text: npcMessage.text?.substring(0, 50),
        timestamp: npcMessage.timestamp
      });
      setSessionMessages(prev => {
        const updated = [...prev, npcMessage];
        console.log('[Dialogue] Session messages after adding NPC response:', {
          count: updated.length,
          messages: updated.map(m => ({ sender: m.sender, text: m.text?.substring(0, 30) }))
        });
        return updated;
      });
      
      // Scroll to bottom to show new NPC response immediately
      setTimeout(() => {
        scrollToBottom();
      }, 50);
      
      // Reload history after a longer delay to ensure backend has saved the messages
      // This ensures we have the saved messages with proper IDs
      // Use a longer delay to prevent the clearing logic from removing the NPC response too soon
      setTimeout(() => {
        console.log('[Dialogue] Reloading history after NPC response');
        reloadHistory();
      }, 3000); // Increased delay to ensure backend has saved and to prevent premature clearing

      // Emit tutorial event for message received
      tutorialEventBus.emit(TUTORIAL_EVENTS.DIALOGUE_MESSAGE_RECEIVED, {
        npcId: npc.id,
        response: npcResponse
      });

      // Update relationship
      if (responseData.relationshipLevel !== undefined) {
        setRelationship(prev => ({
          ...prev,
          relationshipLevel: responseData.relationshipLevel
        }));
      }

      // Surface any faction standing changes (rep toast + tier-up modal via ReputationHost)
      if (Array.isArray(responseData.reputationChanges)) {
        responseData.reputationChanges.forEach((change) => {
          if (change && change.factionId && change.delta) {
            gameEventBus.emit(GAME_EVENTS.REP_CHANGED, change);
          }
        });
      }

      // Golden-path closing fork: the player has chosen where to take the Veil
      // resonance fragment. The backend has already applied the faction lean and
      // spawned the first real quest — refresh the quest log so it shows up, and
      // surface a "set course" CTA that routes to the galaxy map with a zoom
      // payoff toward the destination world.
      if (responseData.closingChoice && responseData.closingChoice.destinationPlanet) {
        const cc = responseData.closingChoice;
        try {
          const { useQuestStore } = await import('../../state/questSlice');
          useQuestStore.getState().loadActiveQuests(currentCharacter.id);
        } catch (questErr) {
          console.warn('[Dialogue] Failed to refresh quests after closing choice (non-fatal):', questErr.message);
        }
        setClosingDestination({
          destinationPlanet: cc.destinationPlanet,
          followOnQuestTitle: cc.followOnQuestTitle,
          choice: cc.choice
        });
      }

      // Handle quest offer (mini-quest or regular quest)
      console.log('[Dialogue] Response data:', responseData);
      console.log('[Dialogue] Checking for combat intro - nextState:', responseData.nextState, 'isTutorial:', responseData.isTutorial);
      
      // Update suggested responses if tutorial dialogue provided them
      // Tutorial responses should always take precedence over generic suggested responses
      if (responseData.isTutorial && responseData.suggestedResponses) {
        console.log('[Dialogue] Setting tutorial suggested responses:', responseData.suggestedResponses);
        console.log('[Dialogue] First suggested response details:', JSON.stringify(responseData.suggestedResponses[0], null, 2));
        // Ensure we preserve all properties including action
        const responsesWithActions = responseData.suggestedResponses.map(r => {
          const response = {
            text: r.text || r,
            ...(typeof r === 'object' ? r : {}) // Preserve all object properties
          };
          console.log('[Dialogue] Mapped response:', JSON.stringify(response, null, 2));
          return response;
        });
        console.log('[Dialogue] Processed suggested responses with actions:', responsesWithActions);
        hasTutorialResponsesRef.current = true; // Mark that we have tutorial responses
        setSuggestedResponses(responsesWithActions);
      } else if (!responseData.isTutorial && responseData.suggestedResponses) {
        // For non-tutorial NPCs, also update suggested responses if provided
        setSuggestedResponses(responseData.suggestedResponses);
      } else if (!responseData.isTutorial) {
        // For non-tutorial NPCs, reload suggested responses from API
        loadSuggestedResponses();
      }
      
      // Handle combat readiness confirmation for tutorial
      if (responseData.isTutorial && responseData.nextState === 'combat_intro') {
        console.log('[Dialogue] ✅ Emitting COMBAT_INTRO event');
        // Small delay to ensure quest acceptance state has been processed
        setTimeout(() => {
          // Transition to combat intro state
          tutorialEventBus.emit(TUTORIAL_EVENTS.COMBAT_INTRO, {
            npcId: npc.id,
            characterId: currentCharacter.id
          });
        }, 100);
        
        // Show combat tutorial modal will be handled by TutorialOverlay
        // The combat will be triggered after the player clicks "Next" on the combat intro modal
      } else if (responseData.isTutorial) {
        console.log('[Dialogue] ⚠️ Tutorial dialogue but no combat_intro nextState. nextState:', responseData.nextState);
      }
      
      // Check if quest is offered
      // Primary indicator: questId exists and is not null/undefined/empty
      // Secondary indicator: offerQuest flag is true (but questId might be generated asynchronously)
      const questId = responseData.questId;
      const offerQuest = responseData.offerQuest === true;
      const hasQuestOffer = questId && (questId !== null && questId !== undefined && questId !== '');
      
      console.log('[Dialogue] Quest offer check:', {
        questId,
        questIdType: typeof questId,
        questIdTruthy: !!questId,
        offerQuest: responseData.offerQuest,
        hasQuestOffer,
        fullResponse: responseData
      });
      
      // If offerQuest is true but questId is null, log a warning but don't show modal
      // The backend should always provide questId when offering a quest
      if (offerQuest && !hasQuestOffer) {
        console.warn('[Dialogue] ⚠️ Backend returned offerQuest=true but questId is null/undefined. Quest cannot be displayed without questId.');
      }
      
      if (hasQuestOffer) {
        // Emit tutorial event for quest offered
        // Determine location based on current route
        const isOnPlanetSurface = location.pathname.includes('/planet/');
        
        tutorialEventBus.emit(TUTORIAL_EVENTS.QUEST_OFFERED, {
          questId: questId,
          npcId: npc.id,
          npcName: npc.name,
          characterId: currentCharacter.id,
          location: isOnPlanetSurface ? 'planet_surface' : 'spaceport',
          isTutorial: responseData.isTutorial || false,
          timestamp: new Date().toISOString()
        });
        
        // Show quest offer modal
        console.log('[Dialogue] ✅ Quest offered - opening modal:', {
          offerQuest: responseData.offerQuest,
          questId: responseData.questId,
          questType: responseData.questType,
          moralAlignment: responseData.moralAlignment
        });
        setOfferedQuestId(responseData.questId);
        setIsQuestOfferModalOpen(true);
        console.log('[Dialogue] Modal state set - isQuestOfferModalOpen should be true, questId:', responseData.questId);
      } else {
        console.log('[Dialogue] ❌ No quest offer in response:', {
          offerQuest: responseData.offerQuest,
          questId: responseData.questId,
          hasOfferQuest: 'offerQuest' in responseData,
          hasQuestId: 'questId' in responseData,
          questIdType: typeof responseData.questId,
          questIdValue: responseData.questId
        });
      }

    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage = {
        id: `system_${Date.now()}_${Math.random()}`,
        sender: 'system',
        text: 'Failed to send message. Please try again.',
        timestamp: new Date()
      };
      setSessionMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Golden-path payoff: route the player to the galaxy map with a reveal/zoom
  // toward the world they chose for the resonance fragment.
  const handleSetCourse = () => {
    if (!closingDestination) return;
    navigate('/game/galaxy', {
      state: {
        revealPlanet: closingDestination.destinationPlanet,
        fromTutorialClosing: true,
        followOnQuestTitle: closingDestination.followOnQuestTitle
      }
    });
    if (typeof onClose === 'function') onClose();
  };

  const handleSuggestedResponseClick = async (suggestion) => {
    console.log('[Dialogue] Suggested response clicked:', { suggestion, hasAction: !!suggestion.action, action: suggestion.action });
    
    // Check if suggestion has an action that should be handled specially
    if (suggestion.action === 'accept_quest') {
      // If quest is already accepted, don't send the message again
      // The quest acceptance is handled by the QuestOfferModal
      if (offeredQuestId) {
        console.log('[Dialogue] Quest already offered, ignoring accept_quest action (should use modal)');
        return;
      }
      
      // Also check if the quest is already active
      try {
        const { useQuestStore } = await import('../../state/questSlice');
        const activeQuests = useQuestStore.getState().activeQuests;
        const isQuestActive = activeQuests.some(qp => 
          qp.quest && (qp.quest.id === 'tutorial_001_dockside_initiation' || qp.questId === 'tutorial_001_dockside_initiation')
        );
        if (isQuestActive) {
          console.log('[Dialogue] Quest already active, ignoring accept_quest action');
          return;
        }
      } catch (error) {
        console.error('[Dialogue] Error checking active quests:', error);
      }
      
      // If no quest is currently offered or active, send the message normally
      console.log('[Dialogue] No quest currently offered or active, sending message normally');
      handleSendMessage(suggestion.text);
      return;
    } else if (suggestion.action === 'quest_details') {
      // For quest details, just send the message to get more info
      handleSendMessage(suggestion.text);
      return;
    } else if (suggestion.action === 'open_vendor') {
      console.log('[Dialogue] Executing open_vendor action');
      // Open vendor interface for tutorial NPC
      const isTutorialNPC = npc.id && npc.id.startsWith('npc_tutorial_');
      let vendorId = npc.id; // Fallback to NPC ID

      // For tutorial NPCs, they act as vendors themselves
      // The vendorId in the config is just a reference - use the NPC's own ID
      // Tutorial NPCs are created with isVendor: true and vendorInventory
      if (isTutorialNPC) {
        vendorId = npc.id; // Tutorial NPCs are vendors themselves
        console.log('[Dialogue] Using tutorial NPC ID as vendor ID:', vendorId);
      }
      
      console.log('[Dialogue] Navigating to vendor interface:', { npcId: npc.id, vendorId, isTutorialNPC, path: `/game/vendor/${vendorId}` });
      
      // Emit tutorial event for vendor opened BEFORE navigation
      if (isTutorialNPC) {
        tutorialEventBus.emit(TUTORIAL_EVENTS.UI_OPENED_VENDOR, {
          npcId: npc.id,
          vendorId: vendorId,
          characterId: currentCharacter?.id
        });
      }
      
      // Navigate to vendor interface
      navigate(`/game/vendor/${vendorId}`);
    } else {
      // Default: send the message text
      console.log('[Dialogue] No special action, sending message text:', suggestion.text);
      handleSendMessage(suggestion.text);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getRelationshipColor = (level) => {
    if (level < 21) return '#666';
    if (level < 51) return '#4a9eff';
    if (level < 81) return '#4ade80';
    return '#fbbf24';
  };

  return (
    <div ref={dialogueRef} className="dialogue-interface">
      <div className="dialogue-header">
        <div 
          className="npc-info clickable-npc-info" 
          onClick={handleNPCInfoClick}
          title="Click to view NPC details"
        >
          <div className="npc-avatar">
            <span className="npc-avatar-initial">{npc.name.charAt(0)}</span>
          </div>
          <div className="npc-details">
            <h2>{npc.name}</h2>
            <div className="npc-meta">
              <span className="npc-occupation">{formatDisplayName(npc.occupation) || 'Citizen'}</span>
              {npc.species && <span className="npc-species">• {formatDisplayName(npc.species)}</span>}
              {npc.factionId && (
                <span className="npc-faction" title={getFactionDisplayName(npc.factionId)}>
                  • {getFactionDisplayName(npc.factionId)}
                </span>
              )}
            </div>
          </div>
        </div>

        {relationship && (
          <div className="relationship-indicator">
            <div className="relationship-label">
              {getRelationshipTier(relationship.relationshipLevel)}
            </div>
            <div className="relationship-bar">
              <div
                className="relationship-fill"
                style={{
                  width: `${relationship.relationshipLevel}%`,
                  backgroundColor: getRelationshipColor(relationship.relationshipLevel)
                }}
              />
            </div>
            <div className="relationship-value">
              {relationship.relationshipLevel}/100
            </div>
          </div>
        )}

        <button onClick={onClose} className="close-button">×</button>
      </div>

      {/* Phase 5: Conversation Search */}
      <ConversationSearch
        onSearch={searchHistory}
        searchQuery={searchQuery}
      />

      {/* Conversation Topics */}
      {topics && topics.length > 0 && (
        <ConversationTopics
          topics={topics}
          selectedTopic={selectedTopic}
          onTopicClick={(topic) => {
            setSelectedTopic(topic);
            filterByTopic(topic);
          }}
          onClearFilter={() => {
            setSelectedTopic(null);
            filterByTopic(null);
          }}
        />
      )}

      <div className="dialogue-messages">
        {messages.length === 0 ? (
          <div className="no-messages">No messages yet. Start the conversation!</div>
        ) : (
          messages.map((message, index) => {
            // Ensure message has required fields
            if (!message || !message.sender || !message.text) {
              console.warn('[Dialogue] Invalid message found:', message);
              return null;
            }
            
            return (
              <div key={message.id || `msg_${index}_${message.timestamp?.getTime()}`} className={`message message-${message.sender}`}>
                {message.sender === 'npc' && (
                  <div className="message-avatar npc-avatar-small">
                    <span>{npc.name.charAt(0)}</span>
                  </div>
                )}
                <div className="message-bubble">
                  <div className="message-content">
                    {message.text}
                  </div>
                  <div className="message-timestamp">
                    {message.timestamp ? message.timestamp.toLocaleTimeString() : new Date().toLocaleTimeString()}
                  </div>
                </div>
                {message.sender === 'player' && (
                  <div className="message-avatar player-avatar-small">
                    <span>You</span>
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {suggestedResponses.length > 0 && (
        <div className="dialogue-suggested-responses" data-tutorial-target={TUTORIAL_TARGETS.DIALOGUE_SUGGESTED_REPLIES}>
          <div className="suggested-responses-label">Suggested:</div>
          <div className="suggested-responses-list">
            {suggestedResponses.map((suggestion, index) => (
              <button
                key={index}
                className="suggested-response-button"
                onClick={() => handleSuggestedResponseClick(suggestion)}
                disabled={isLoading}
                title={suggestion.text}
              >
                <span className="suggestion-icon">{suggestion.icon || '💬'}</span>
                <span className="suggestion-text">{suggestion.text}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {closingDestination && (
        <div className="dialogue-closing-cta">
          <div className="closing-cta-label">Your first quest awaits:</div>
          <button className="btn-primary set-course-button" onClick={handleSetCourse}>
            <GameIcon name="course" size={16} /> Set course for {closingDestination.destinationPlanet
              ? closingDestination.destinationPlanet.charAt(0).toUpperCase() + closingDestination.destinationPlanet.slice(1)
              : 'the Reach'}
            {closingDestination.followOnQuestTitle ? ` — “${closingDestination.followOnQuestTitle}”` : ''}
          </button>
        </div>
      )}

      <div className="dialogue-input-area">
        <textarea
          ref={inputRef}
          className="dialogue-input"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your message..."
          disabled={isLoading}
          rows={3}
        />
        <button
          ref={sendButtonRef}
          onClick={() => handleSendMessage()}
          disabled={!inputMessage.trim() || isLoading}
          className="dialogue-send-btn"
        >
          {isLoading ? 'Sending...' : 'Send'}
        </button>
      </div>

      <div className="dialogue-actions">
        {npc.npcType === 'vendor' && (
          <button
            className="btn-primary shop-button"
            onClick={() => {
              navigate(`/game/vendor/${npc.id}`);
            }}
          >
            🛒 Shop
          </button>
        )}
        
        {npc.isCompanion && relationship && relationship.relationshipLevel >= 50 && (
          <>
            {!relationship.isRecruited ? (
              <button className="btn-primary">
                Recruit as Companion
              </button>
            ) : (
              <button className="btn-secondary">
                Dismiss Companion
              </button>
            )}
          </>
        )}
      </div>

      {/* NPC Details Modal */}
      <NPCDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        npc={fullNPCData || npc}
        characterId={currentCharacter?.id}
      />

      {/* Quest Offer Modal */}
      <QuestOfferModal
        isOpen={isQuestOfferModalOpen}
        onClose={() => {
          setIsQuestOfferModalOpen(false);
          setOfferedQuestId(null);
        }}
        questId={offeredQuestId}
        npcName={npc?.name}
        onQuestAccepted={async (quest) => {
          console.log('[Dialogue] Quest accepted:', quest);
          
          // For tutorial quests, continue the dialogue instead of closing
          if (quest.questType === 'tutorial' || quest.id === 'tutorial_001_dockside_initiation') {
            // Add NPC response about combat readiness
            const combatReadinessMessage = "Great! Are you ready to learn the combat rules of engagement?";
            const combatMessage = {
              id: `npc_${Date.now()}_${Math.random()}`,
              sender: 'npc',
              text: combatReadinessMessage,
              timestamp: new Date()
            };
            setSessionMessages(prev => [...prev, combatMessage]);
            
            // Update suggested responses for combat readiness
            setSuggestedResponses([
              { text: "Yes, I'm ready", action: 'ready_for_combat', icon: '⚔️' },
              { text: "Not yet", action: 'not_ready', icon: '⏸️' }
            ]);
            
            // Update tutorial state to quest_accepted so dialogue service knows the context
            tutorialEventBus.emit(TUTORIAL_EVENTS.QUEST_ACCEPTED, {
              questId: quest.id,
              questTitle: quest.title,
              characterId: currentCharacter.id
            });
            
            // Don't close the dialogue interface
            return;
          }
          
          // For non-tutorial quests, add system message and trigger NPC thank you
          const systemMessage = {
            id: `system_${Date.now()}_${Math.random()}`,
            sender: 'system',
            text: `Quest "${quest.title}" has been accepted!`,
            timestamp: new Date()
          };
          setSessionMessages(prev => [...prev, systemMessage]);
          
          // Send an empty message to trigger NPC thank you response
          // This will be handled by the backend's quest acceptance detection
          // The backend will detect the recently accepted quest and show a thank you message
          setTimeout(async () => {
            try {
              // Send empty message to trigger thank you (backend detects recently accepted quest)
              await handleSendMessage('');
            } catch (error) {
              console.error('[Dialogue] Error sending thank you trigger:', error);
            }
          }, 200);
          
          // Don't close the dialogue interface - keep it open so player can see the thank you
          // The quest modal will close, but dialogue stays open
        }}
      />
    </div>
  );
}
