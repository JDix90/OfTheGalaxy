# NPC Dialogue Enhancement Requirements Plan

**Version:** 1.0  
**Date:** December 2024  
**Status:** Requirements & Implementation Plan  
**Based On:** CONSULTANT_FEEDBACK_ANALYSIS.md

---

## Table of Contents

1. [Overview](#overview)
2. [Phase 1: Foundation & Quick Wins](#phase-1-foundation--quick-wins)
3. [Phase 2: Motivation & Trust](#phase-2-motivation--trust)
4. [Phase 3: Advanced Features](#phase-3-advanced-features)
5. [Phase 4: Polish & Optimization](#phase-4-polish--optimization)
6. [Cross-Phase Requirements](#cross-phase-requirements)
7. [Testing Strategy](#testing-strategy)
8. [Deployment Plan](#deployment-plan)

---

## Overview

### Purpose
This document provides detailed requirements and implementation steps for enhancing the NPC dialogue system based on consultant recommendations. The plan is divided into four phases, each building upon the previous phase's foundation.

### Goals
- Enhance NPC personality and emotional depth
- Improve dialogue variety and contextual awareness
- Reduce AI API costs through template optimization
- Create meaningful NPC-player relationships
- Maintain system performance and scalability

### Success Criteria
- 90% of dialogue uses templates (cost reduction)
- NPCs feel distinct and memorable
- Dialogue generation < 200ms average
- AI costs < $20/day for 1000 active players
- Player satisfaction with NPCs improved

---

## Phase 1: Foundation & Quick Wins

**Duration:** 4-6 weeks  
**Priority:** High  
**Goal:** Implement core systems with maximum impact and minimal complexity

---

### 1.1 Enhanced Personality System

#### 1.1.1 Requirements

**Objective:** Add 5-7 core personality traits to NPCs and improve their utilization in dialogue generation.

**Functional Requirements:**
- NPCs must have a personality profile with 5-7 core traits
- Personality traits must influence dialogue generation
- Existing personality traits (empathy, formality, humor) must be better utilized
- Personality must be separate from emotional state

**Non-Functional Requirements:**
- Personality data must be stored in JSONB for flexibility
- Personality calculations must not add >50ms to dialogue generation
- System must support gradual migration of existing NPCs

#### 1.1.2 Database Schema Changes

**File:** `backend/src/migrations/XXX-add-personality-profile.js`

```sql
-- Add personality_profile column to npcs table
ALTER TABLE npcs 
ADD COLUMN personality_profile JSONB DEFAULT '{
  "openness": 50,
  "extraversion": 50,
  "agreeableness": 50,
  "conscientiousness": 50,
  "neuroticism": 50,
  "forceAlignment": 50,
  "authorityRespect": 50,
  "riskTolerance": 50,
  "directness": 50,
  "currentMood": 50,
  "stressLevel": 30,
  "fatigueLevel": 20
}'::jsonb;

-- Add index for personality queries (if needed)
CREATE INDEX idx_npcs_personality_profile ON npcs USING GIN (personality_profile);
```

**Migration Strategy:**
1. Add column with default values
2. Migrate existing `personalityTraits` data to new structure
3. Preserve existing traits (empathy, formality, humor) in new structure
4. No breaking changes to existing API

#### 1.1.3 Model Changes

**File:** `backend/src/models/NPC.js`

**Changes Required:**
1. Add `personalityProfile` field to model definition
2. Add getter/setter methods for personality traits
3. Add validation for personality trait ranges (0-100)
4. Add helper methods:
   - `getPersonalityTrait(traitName)` - Get specific trait value
   - `hasPersonalityTrait(traitName, threshold)` - Check if trait exceeds threshold
   - `getPersonalitySummary()` - Get concise personality description

**Code Structure:**
```javascript
// Add to NPC model
personalityProfile: {
  type: DataTypes.JSONB,
  field: 'personality_profile',
  defaultValue: {
    openness: 50,
    extraversion: 50,
    agreeableness: 50,
    conscientiousness: 50,
    neuroticism: 50,
    forceAlignment: 50,
    authorityRespect: 50,
    riskTolerance: 50,
    directness: 50,
    currentMood: 50,
    stressLevel: 30,
    fatigueLevel: 20
  }
}

// Add instance methods
NPC.prototype.getPersonalityTrait = function(traitName) {
  return this.personalityProfile?.[traitName] || 50;
};

NPC.prototype.hasPersonalityTrait = function(traitName, threshold = 70) {
  return this.getPersonalityTrait(traitName) >= threshold;
};
```

#### 1.1.4 Service Layer Implementation

**File:** `backend/src/services/personalityService.js` (NEW)

**Responsibilities:**
- Generate personality profiles for new NPCs
- Calculate personality-based dialogue modifiers
- Provide personality summaries for AI prompts

**Key Methods:**
```javascript
class PersonalityService {
  /**
   * Generate personality profile for new NPC
   * @param {Object} npcData - NPC data (species, occupation, faction)
   * @returns {Object} Personality profile
   */
  generatePersonalityProfile(npcData) {
    // Generate based on species, occupation, faction
    // Return personality profile object
  }

  /**
   * Build concise personality prompt for AI
   * @param {Object} npc - NPC instance
   * @returns {string} Personality prompt text
   */
  buildPersonalityPrompt(npc) {
    const p = npc.personalityProfile;
    let prompt = '';
    
    // Only include significant traits (above 70 or below 30)
    if (p.openness > 70) prompt += "- Curious, shares unusual insights\n";
    if (p.openness < 30) prompt += "- Traditional, prefers familiar topics\n";
    if (p.extraversion > 70) prompt += "- Outgoing, asks questions\n";
    if (p.extraversion < 30) prompt += "- Reserved, brief responses\n";
    // ... etc
    
    return prompt;
  }

  /**
   * Get personality-based dialogue modifiers
   * @param {Object} npc - NPC instance
   * @returns {Object} Modifiers (responseLength, formality, etc.)
   */
  getDialogueModifiers(npc) {
    const p = npc.personalityProfile;
    return {
      responseLength: p.extraversion > 70 ? 'long' : p.extraversion < 30 ? 'short' : 'medium',
      formality: p.authorityRespect > 70 ? 'formal' : 'casual',
      directness: p.directness > 70 ? 'direct' : 'diplomatic',
      humor: p.humor > 70 ? 'humorous' : 'serious'
    };
  }
}
```

#### 1.1.5 AI Dialogue Service Integration

**File:** `backend/src/services/aiDialogueService.js`

**Changes Required:**
1. Import `personalityService`
2. Integrate personality prompt into `buildSystemPrompt()`
3. Keep personality prompt concise (< 200 tokens)

**Implementation:**
```javascript
buildSystemPrompt(npc, relationship, character, context) {
  let prompt = `You are ${npc.name}, a ${npc.species} ${npc.occupation}.\n\n`;
  
  // Add personality (concise)
  const personalityPrompt = personalityService.buildPersonalityPrompt(npc);
  if (personalityPrompt) {
    prompt += "PERSONALITY:\n" + personalityPrompt;
  }
  
  // ... rest of prompt
}
```

#### 1.1.6 Template Service Integration

**File:** `backend/src/services/dialogueTemplateService.js`

**Changes Required:**
1. Add personality-based template filtering
2. Apply personality modifiers to template selection
3. Use personality traits to weight template selection

**Implementation:**
```javascript
// In generateResponse()
const personalityModifiers = personalityService.getDialogueModifiers(npc);

// Filter templates by personality
if (personalityModifiers.formality === 'formal') {
  matchingTemplates = matchingTemplates.filter(t => 
    t.personalityRequirements?.formality?.min <= npc.getPersonalityTrait('authorityRespect')
  );
}
```

#### 1.1.7 NPC Generator Integration

**File:** `backend/src/services/npcGenerator.js`

**Changes Required:**
1. Generate personality profiles for new NPCs
2. Use species, occupation, faction to influence personality
3. Ensure personality variety across NPCs

**Implementation:**
```javascript
// In generateNPC()
const personalityProfile = personalityService.generatePersonalityProfile({
  species: npcData.species,
  occupation: npcData.occupation,
  factionId: npcData.factionId
});

npcData.personalityProfile = personalityProfile;
```

#### 1.1.8 Testing Requirements

**Unit Tests:**
- Personality profile generation
- Personality prompt building
- Dialogue modifier calculation
- Trait validation

**Integration Tests:**
- Personality affects dialogue generation
- Existing NPCs migrate correctly
- AI prompts include personality

**Test Cases:**
1. High extraversion NPC asks questions
2. Low agreeableness NPC is more confrontational
3. High formality NPC uses formal language
4. Personality traits persist across conversations

#### 1.1.9 Success Criteria
- ✅ All NPCs have personality profiles
- ✅ Personality visible in 80%+ of dialogue
- ✅ Personality prompt adds < 200 tokens
- ✅ No performance degradation

---

### 1.2 Faction-Driven Dialogue

#### 1.2.1 Requirements

**Objective:** Integrate faction reputation and faction-specific rhetoric into dialogue generation.

**Functional Requirements:**
- NPCs must react to player's faction reputation
- Faction-specific communication styles must be applied
- Faction rhetoric must influence dialogue
- Reputation tiers must affect dialogue tone

**Non-Functional Requirements:**
- Reputation lookup must be cached
- Faction data must be stored in config file (not hardcoded)
- No additional database queries per dialogue request

#### 1.2.2 Configuration File

**File:** `backend/src/config/factionProfiles.js` (NEW)

**Structure:**
```javascript
module.exports = {
  galactic_empire: {
    displayName: 'Galactic Empire',
    communicationStyle: 'formal_authoritarian',
    values: ['order', 'efficiency', 'loyalty', 'strength'],
    rhetoric: {
      keywords: ['order', 'security', 'stability', 'discipline', 'duty'],
      framings: {
        rebellion: 'terrorists and traitors',
        empire: 'legitimate government',
        force_users: 'dangerous extremists (unless Sith)'
      }
    },
    relationshipModifiers: {
      imperial_remnant: 1.0,
      new_republic: -0.8,
      rebel_alliance: -1.0,
      jedi_order: -0.6
    }
  },
  rebel_alliance: {
    displayName: 'Rebel Alliance',
    communicationStyle: 'passionate_informal',
    values: ['freedom', 'justice', 'equality', 'hope'],
    rhetoric: {
      keywords: ['freedom', 'tyranny', 'hope', 'resistance', 'justice'],
      framings: {
        empire: 'oppressive regime',
        rebellion: 'freedom fighters',
        civilians: 'oppressed citizens we fight for'
      }
    },
    relationshipModifiers: {
      new_republic: 1.0,
      galactic_empire: -1.0,
      imperial_remnant: -0.9,
      jedi_order: 0.7
    }
  }
  // ... other factions
};
```

#### 1.2.3 Service Layer Implementation

**File:** `backend/src/services/factionService.js` (NEW)

**Responsibilities:**
- Load faction profiles
- Get faction display names
- Calculate faction relationships
- Build faction dialogue prompts

**Key Methods:**
```javascript
class FactionService {
  /**
   * Get faction profile
   * @param {string} factionId - Faction ID
   * @returns {Object} Faction profile
   */
  getFactionProfile(factionId) {
    return factionProfiles[factionId] || null;
  }

  /**
   * Get faction display name
   * @param {string} factionId - Faction ID
   * @returns {string} Display name
   */
  getFactionDisplayName(factionId) {
    const profile = this.getFactionProfile(factionId);
    return profile?.displayName || factionId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Build faction dialogue prompt
   * @param {Object} npc - NPC instance
   * @param {Object} character - Player character
   * @returns {string} Faction prompt text
   */
  async buildFactionPrompt(npc, character) {
    if (!npc.factionId) return '';
    
    const faction = this.getFactionProfile(npc.factionId);
    if (!faction) return '';
    
    let prompt = `\n\nFACTION: ${faction.displayName}\n`;
    prompt += `- Communication style: ${faction.communicationStyle.replace('_', ', ')}\n`;
    prompt += `- Core values: ${faction.values.join(', ')}\n`;
    
    // Add reputation context
    const reputation = await this.getPlayerReputation(character.id, npc.factionId);
    if (reputation) {
      const tier = reputation.getTier();
      prompt += `\nPLAYER REPUTATION: ${tier} (${reputation.reputation}/100)\n`;
      prompt += this.getReputationInstructions(tier);
    }
    
    return prompt;
  }

  /**
   * Get reputation-based dialogue instructions
   * @param {string} tier - Reputation tier
   * @returns {string} Instructions
   */
  getReputationInstructions(tier) {
    const instructions = {
      hostile: "Be suspicious and hostile. Refuse to help unless forced.",
      unfriendly: "Be cautious and unhelpful. Don't share sensitive information.",
      neutral: "Treat as a stranger. Be professional but not warm.",
      friendly: "Be helpful and share useful information.",
      honored: "Be very helpful, offer special assistance, show gratitude."
    };
    return instructions[tier] || instructions.neutral;
  }

  /**
   * Get player reputation with faction (cached)
   * @param {number} characterId - Character ID
   * @param {string} factionId - Faction ID
   * @returns {Promise<Object>} Reputation record
   */
  async getPlayerReputation(characterId, factionId) {
    // Use cache if available
    const cacheKey = `reputation_${characterId}_${factionId}`;
    // ... caching logic
    
    const { FactionReputation } = require('../models');
    return await FactionReputation.findOne({
      where: { characterId, factionId }
    });
  }
}
```

#### 1.2.4 AI Dialogue Service Integration

**File:** `backend/src/services/aiDialogueService.js`

**Changes Required:**
1. Import `factionService`
2. Add faction prompt to `buildSystemPrompt()`
3. Cache reputation lookups

**Implementation:**
```javascript
async buildSystemPrompt(npc, relationship, character, context) {
  let prompt = `You are ${npc.name}, a ${npc.species} ${npc.occupation}.\n\n`;
  
  // Add faction context
  const factionPrompt = await factionService.buildFactionPrompt(npc, character);
  if (factionPrompt) {
    prompt += factionPrompt;
  }
  
  // ... rest of prompt
}
```

#### 1.2.5 Template Service Integration

**File:** `backend/src/services/dialogueTemplateService.js`

**Changes Required:**
1. Filter templates by faction
2. Apply faction rhetoric to template variables
3. Weight templates based on faction alignment

**Implementation:**
```javascript
// In generateResponse()
if (npc.factionId) {
  const faction = factionService.getFactionProfile(npc.factionId);
  if (faction) {
    // Filter templates that match faction style
    matchingTemplates = matchingTemplates.filter(t => 
      !t.factionExclusions?.includes(npc.factionId)
    );
    
    // Add faction keywords to template variables
    context.factionKeywords = faction.rhetoric.keywords;
  }
}
```

#### 1.2.6 Caching Strategy

**File:** `backend/src/services/cacheService.js` (NEW or existing)

**Requirements:**
- Cache faction profiles (static, long TTL)
- Cache reputation lookups (per character, 5 min TTL)
- Invalidate cache on reputation updates

**Implementation:**
```javascript
// Cache reputation lookups
const reputationCache = new Map();

async function getCachedReputation(characterId, factionId) {
  const key = `${characterId}_${factionId}`;
  const cached = reputationCache.get(key);
  
  if (cached && Date.now() - cached.timestamp < 300000) { // 5 min
    return cached.data;
  }
  
  const reputation = await FactionReputation.findOne({
    where: { characterId, factionId }
  });
  
  reputationCache.set(key, {
    data: reputation,
    timestamp: Date.now()
  });
  
  return reputation;
}
```

#### 1.2.7 Testing Requirements

**Unit Tests:**
- Faction profile loading
- Reputation tier calculation
- Faction prompt building
- Cache functionality

**Integration Tests:**
- Faction reputation affects dialogue
- Faction rhetoric appears in responses
- Cache reduces database queries

**Test Cases:**
1. Hostile reputation → NPC is suspicious
2. Honored reputation → NPC is very helpful
3. Faction keywords appear in dialogue
4. Reputation cache works correctly

#### 1.2.8 Success Criteria
- ✅ Faction reputation affects dialogue in 100% of cases
- ✅ Faction rhetoric visible in 70%+ of faction NPC dialogue
- ✅ Reputation lookups cached (90%+ cache hit rate)
- ✅ No additional database queries per dialogue request

---

### 1.3 Basic Emotional State

#### 1.3.1 Requirements

**Objective:** Add emotional state tracking to NPCs with decay over time and event-based updates.

**Functional Requirements:**
- NPCs must have primary emotion and intensity
- Emotions must decay over time
- Events must trigger emotional changes
- Emotional cues must appear in dialogue

**Non-Functional Requirements:**
- Emotional state stored in JSONB
- Emotion updates must be event-driven (not polling)
- Emotion decay calculation must be efficient

#### 1.3.2 Database Schema Changes

**File:** `backend/src/migrations/XXX-add-emotional-state.js`

```sql
-- Add emotional_state column to npcs table
ALTER TABLE npcs 
ADD COLUMN emotional_state JSONB DEFAULT '{
  "primaryEmotion": "neutral",
  "emotionIntensity": 0.3,
  "lastUpdated": null,
  "decayRate": 0.1,
  "positiveTriggers": ["quest_completed", "player_helped"],
  "negativeTriggers": ["player_betrayed", "faction_attacked"],
  "recentEvents": []
}'::jsonb;

-- Add index for emotional state queries (if needed)
CREATE INDEX idx_npcs_emotional_state ON npcs USING GIN (emotional_state);
```

#### 1.3.3 Model Changes

**File:** `backend/src/models/NPC.js`

**Changes Required:**
1. Add `emotionalState` field
2. Add helper methods for emotion management
3. Add timestamp tracking

**Code Structure:**
```javascript
emotionalState: {
  type: DataTypes.JSONB,
  field: 'emotional_state',
  defaultValue: {
    primaryEmotion: 'neutral',
    emotionIntensity: 0.3,
    lastUpdated: null,
    decayRate: 0.1,
    positiveTriggers: ['quest_completed', 'player_helped'],
    negativeTriggers: ['player_betrayed', 'faction_attacked'],
    recentEvents: []
  }
}

// Add instance methods
NPC.prototype.getEmotion = function() {
  return {
    emotion: this.emotionalState?.primaryEmotion || 'neutral',
    intensity: this.emotionalState?.emotionIntensity || 0.3
  };
};

NPC.prototype.isEmotional = function() {
  return (this.emotionalState?.emotionIntensity || 0) > 0.6;
};
```

#### 1.3.4 Service Layer Implementation

**File:** `backend/src/services/emotionalStateService.js` (NEW)

**Responsibilities:**
- Update emotional state based on events
- Calculate emotion decay
- Apply emotional cues to dialogue
- Manage emotional event history

**Key Methods:**
```javascript
class EmotionalStateService {
  /**
   * Update emotional state based on event
   * @param {Object} npc - NPC instance
   * @param {Object} event - Event data
   */
  async updateEmotionalState(npc, event) {
    // Apply decay first
    this.applyDecay(npc);
    
    // Update based on event
    const emotionalState = npc.emotionalState || this.getDefaultState();
    
    if (emotionalState.positiveTriggers.includes(event.type)) {
      emotionalState.primaryEmotion = 'happy';
      emotionalState.emotionIntensity = Math.min(1.0, 
        emotionalState.emotionIntensity + 0.3
      );
    } else if (emotionalState.negativeTriggers.includes(event.type)) {
      emotionalState.primaryEmotion = 'angry';
      emotionalState.emotionIntensity = Math.min(1.0, 
        emotionalState.emotionIntensity + 0.4
      );
    }
    
    // Record event
    this.addEmotionalEvent(emotionalState, event);
    
    // Update timestamp
    emotionalState.lastUpdated = new Date().toISOString();
    
    npc.emotionalState = emotionalState;
    await npc.save();
  }

  /**
   * Apply emotion decay over time
   * @param {Object} npc - NPC instance
   */
  applyDecay(npc) {
    const emotionalState = npc.emotionalState || this.getDefaultState();
    
    if (!emotionalState.lastUpdated) {
      emotionalState.lastUpdated = new Date().toISOString();
      return;
    }
    
    const hoursSinceUpdate = (Date.now() - new Date(emotionalState.lastUpdated)) / (1000 * 60 * 60);
    const decay = emotionalState.decayRate * hoursSinceUpdate;
    
    emotionalState.emotionIntensity = Math.max(0, 
      emotionalState.emotionIntensity - decay
    );
    
    // Reset to neutral if intensity is very low
    if (emotionalState.emotionIntensity < 0.1) {
      emotionalState.primaryEmotion = 'neutral';
      emotionalState.emotionIntensity = 0.3;
    }
  }

  /**
   * Add emotional event to history
   * @param {Object} emotionalState - Emotional state object
   * @param {Object} event - Event data
   */
  addEmotionalEvent(emotionalState, event) {
    if (!emotionalState.recentEvents) {
      emotionalState.recentEvents = [];
    }
    
    emotionalState.recentEvents.push({
      emotion: emotionalState.primaryEmotion,
      intensity: emotionalState.emotionIntensity,
      cause: event.type,
      timestamp: new Date().toISOString()
    });
    
    // Keep only last 5 events
    if (emotionalState.recentEvents.length > 5) {
      emotionalState.recentEvents.shift();
    }
  }

  /**
   * Apply emotional cues to dialogue
   * @param {string} response - Dialogue response
   * @param {Object} npc - NPC instance
   * @returns {string} Response with emotional cues
   */
  applyEmotionalCues(response, npc) {
    const emotion = npc.getEmotion();
    
    // Only apply cues if intensity is significant
    if (emotion.intensity < 0.6) {
      return response;
    }
    
    const cues = {
      happy: ['*smiles*', '*grins*', '*chuckles*'],
      sad: ['*sighs*', '*looks down*', '*voice wavers*'],
      angry: ['*clenches jaw*', '*glares*', '*voice hardens*'],
      fearful: ['*glances around*', '*lowers voice*', '*tenses up*']
    };
    
    const emotionCues = cues[emotion.emotion] || [];
    if (emotionCues.length > 0) {
      const cue = emotionCues[Math.floor(Math.random() * emotionCues.length)];
      return `${cue} ${response}`;
    }
    
    return response;
  }

  /**
   * Get default emotional state
   * @returns {Object} Default state
   */
  getDefaultState() {
    return {
      primaryEmotion: 'neutral',
      emotionIntensity: 0.3,
      lastUpdated: new Date().toISOString(),
      decayRate: 0.1,
      positiveTriggers: ['quest_completed', 'player_helped'],
      negativeTriggers: ['player_betrayed', 'faction_attacked'],
      recentEvents: []
    };
  }
}
```

#### 1.3.5 Event Integration

**Files:** Various service files (questService, npcService, etc.)

**Requirements:**
- Trigger emotional updates on relevant events
- Use event-driven architecture
- Don't block main event processing

**Implementation:**
```javascript
// In questService.js - on quest completion
async function onQuestCompleted(questId, characterId, npcId) {
  // ... quest completion logic
  
  // Update NPC emotional state
  if (npcId) {
    const npc = await NPC.findByPk(npcId);
    const emotionalService = require('./emotionalStateService');
    await emotionalService.updateEmotionalState(npc, {
      type: 'quest_completed',
      questId: questId,
      characterId: characterId
    });
  }
}
```

#### 1.3.6 AI Dialogue Service Integration

**File:** `backend/src/services/aiDialogueService.js`

**Changes Required:**
1. Add emotional state to system prompt
2. Keep emotional context concise

**Implementation:**
```javascript
buildSystemPrompt(npc, relationship, character, context) {
  let prompt = `You are ${npc.name}, a ${npc.species} ${npc.occupation}.\n\n`;
  
  // Add emotional state (if significant)
  const emotion = npc.getEmotion();
  if (emotion.intensity > 0.6) {
    prompt += `CURRENT EMOTION: ${emotion.emotion} (intensity: ${Math.round(emotion.intensity * 100)}%)\n`;
    if (emotion.emotion === 'happy') prompt += "- You're in a good mood. Be cheerful.\n";
    if (emotion.emotion === 'sad') prompt += "- You're feeling down. Be more somber.\n";
    if (emotion.emotion === 'angry') prompt += "- You're angry. Be more confrontational.\n";
    if (emotion.emotion === 'fearful') prompt += "- You're afraid. Be cautious and nervous.\n";
  }
  
  // ... rest of prompt
}
```

#### 1.3.7 Template Service Integration

**File:** `backend/src/services/dialogueTemplateService.js`

**Changes Required:**
1. Apply emotional cues to template responses
2. Filter templates by emotional state (optional)

**Implementation:**
```javascript
// In generateResponse()
const response = await this.fillTemplateVariables(selectedTemplate, ...);

// Apply emotional cues
const emotionalService = require('./emotionalStateService');
const finalResponse = emotionalService.applyEmotionalCues(response, npc);

return finalResponse;
```

#### 1.3.8 Testing Requirements

**Unit Tests:**
- Emotion decay calculation
- Event-based emotion updates
- Emotional cue application
- Event history management

**Integration Tests:**
- Quest completion triggers happiness
- Player betrayal triggers anger
- Emotions decay over time
- Emotional cues appear in dialogue

**Test Cases:**
1. Quest completion → NPC becomes happy
2. 24 hours pass → Emotion decays
3. High intensity emotion → Cues appear in dialogue
4. Multiple events → Recent events tracked

#### 1.3.9 Success Criteria
- ✅ Emotional state updates on relevant events
- ✅ Emotions decay over time correctly
- ✅ Emotional cues appear in 60%+ of high-intensity responses
- ✅ No performance impact from emotion calculations

---

### 1.4 Simplified Memory System

#### 1.4.1 Requirements

**Objective:** Implement basic memory system allowing NPCs to remember past interactions with players.

**Functional Requirements:**
- NPCs must remember significant past interactions
- NPCs must recall player knowledge (facts, traits)
- Memory must influence dialogue generation
- Only top 3 most significant memories in AI prompts

**Non-Functional Requirements:**
- Memory stored in JSONB
- Memory retrieval must be fast (< 20ms)
- Limit memory size (last 10-20 events per NPC)

#### 1.4.2 Database Schema Changes

**File:** `backend/src/migrations/XXX-add-memory-system.js`

```sql
-- Add memory column to npcs table
ALTER TABLE npcs 
ADD COLUMN memory JSONB DEFAULT '{
  "episodes": [],
  "playerKnowledge": {
    "traits": [],
    "knownFacts": []
  },
  "conversationStyle": "direct"
}'::jsonb;

-- Add index for memory queries (if needed)
CREATE INDEX idx_npcs_memory ON npcs USING GIN (memory);
```

#### 1.4.3 Model Changes

**File:** `backend/src/models/NPC.js`

**Changes Required:**
1. Add `memory` field
2. Add helper methods for memory access

**Code Structure:**
```javascript
memory: {
  type: DataTypes.JSONB,
  defaultValue: {
    episodes: [],
    playerKnowledge: {
      traits: [],
      knownFacts: []
    },
    conversationStyle: 'direct'
  }
}

// Add instance methods
NPC.prototype.getSignificantMemories = function(characterId, limit = 3) {
  const episodes = this.memory?.episodes || [];
  return episodes
    .filter(e => e.participants?.includes(characterId))
    .sort((a, b) => b.significance - a.significance)
    .slice(0, limit);
};
```

#### 1.4.4 Service Layer Implementation

**File:** `backend/src/services/memoryService.js` (NEW)

**Responsibilities:**
- Add memories after conversations
- Calculate memory significance
- Retrieve memories for prompts
- Update player knowledge

**Key Methods:**
```javascript
class MemoryService {
  /**
   * Add memory after conversation
   * @param {Object} npc - NPC instance
   * @param {Object} character - Player character
   * @param {Object} conversation - Conversation data
   */
  async addMemory(npc, character, conversation) {
    const memory = npc.memory || this.getDefaultMemory();
    
    // Extract information
    const topics = this.extractTopics(conversation);
    const emotionalImpact = this.calculateEmotionalImpact(conversation, npc);
    const summary = this.generateSummary(conversation, npc);
    const significance = this.calculateSignificance(emotionalImpact, conversation.type);
    
    // Create episodic memory
    const episode = {
      id: `ep_${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: conversation.type || 'conversation',
      summary: summary,
      emotionalImpact: emotionalImpact,
      participants: [character.id],
      topics: topics,
      significance: significance
    };
    
    memory.episodes.push(episode);
    
    // Keep only last 10 episodes
    if (memory.episodes.length > 10) {
      memory.episodes.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      memory.episodes = memory.episodes.slice(0, 10);
    }
    
    // Update player knowledge
    this.updatePlayerKnowledge(memory, character, conversation);
    
    npc.memory = memory;
    await npc.save();
  }

  /**
   * Calculate memory significance
   * @param {number} emotionalImpact - Emotional impact (0-1)
   * @param {string} eventType - Event type
   * @returns {number} Significance (0-1)
   */
  calculateSignificance(emotionalImpact, eventType) {
    let significance = emotionalImpact * 0.6;
    
    // Boost for important events
    const importantEvents = ['quest_completed', 'player_betrayed', 'player_helped'];
    if (importantEvents.includes(eventType)) {
      significance += 0.3;
    }
    
    return Math.min(1.0, significance);
  }

  /**
   * Generate conversation summary (rule-based, no AI)
   * @param {Object} conversation - Conversation data
   * @param {Object} npc - NPC instance
   * @returns {string} Summary
   */
  generateSummary(conversation, npc) {
    const intent = conversation.intent || {};
    
    if (intent.type === 'quest') {
      return `Player asked about quests. I ${npc.motivations?.primaryGoal?.urgency > 0.7 ? 'desperately asked for help' : 'mentioned work available'}.`;
    } else if (intent.type === 'faction_info') {
      return `Player asked about ${intent.factionId || 'factions'}. I shared information about my faction.`;
    } else if (intent.type === 'planet_info') {
      return `Player asked about the planet. I provided information.`;
    } else {
      return `Player asked about ${conversation.topics?.join(', ') || 'various topics'}. We had a conversation.`;
    }
  }

  /**
   * Extract topics from conversation
   * @param {Object} conversation - Conversation data
   * @returns {Array<string>} Topics
   */
  extractTopics(conversation) {
    const topics = [];
    
    if (conversation.intent) {
      topics.push(conversation.intent.type);
    }
    
    if (conversation.playerMessage) {
      // Simple keyword extraction
      const keywords = ['quest', 'faction', 'planet', 'empire', 'rebel', 'jedi', 'sith'];
      keywords.forEach(keyword => {
        if (conversation.playerMessage.toLowerCase().includes(keyword)) {
          topics.push(keyword);
        }
      });
    }
    
    return topics;
  }

  /**
   * Calculate emotional impact
   * @param {Object} conversation - Conversation data
   * @param {Object} npc - NPC instance
   * @returns {number} Emotional impact (0-1)
   */
  calculateEmotionalImpact(conversation, npc) {
    // Base impact
    let impact = 0.3;
    
    // Increase if quest-related
    if (conversation.intent?.type === 'quest') {
      impact += 0.3;
    }
    
    // Increase if emotional state is high
    const emotion = npc.getEmotion();
    if (emotion.intensity > 0.7) {
      impact += 0.2;
    }
    
    return Math.min(1.0, impact);
  }

  /**
   * Update player knowledge
   * @param {Object} memory - Memory object
   * @param {Object} character - Player character
   * @param {Object} conversation - Conversation data
   */
  updatePlayerKnowledge(memory, character, conversation) {
    if (!memory.playerKnowledge) {
      memory.playerKnowledge = { traits: [], knownFacts: [] };
    }
    
    // Add known facts
    if (conversation.intent?.type === 'quest' && !memory.playerKnowledge.knownFacts.includes('seeks_work')) {
      memory.playerKnowledge.knownFacts.push('seeks_work');
    }
    
    // Update traits based on behavior
    if (conversation.playerMessage?.toLowerCase().includes('help')) {
      if (!memory.playerKnowledge.traits.includes('helpful')) {
        memory.playerKnowledge.traits.push('helpful');
      }
    }
    
    // Limit known facts
    if (memory.playerKnowledge.knownFacts.length > 10) {
      memory.playerKnowledge.knownFacts = memory.playerKnowledge.knownFacts.slice(-10);
    }
  }

  /**
   * Build memory prompt for AI
   * @param {Object} npc - NPC instance
   * @param {Object} character - Player character
   * @returns {string} Memory prompt
   */
  buildMemoryPrompt(npc, character) {
    const memory = npc.memory || this.getDefaultMemory();
    let prompt = '';
    
    // Get top 3 significant memories
    const significantMemories = npc.getSignificantMemories(character.id, 3);
    
    if (significantMemories.length > 0) {
      prompt += "\n\nMEMORIES OF THIS PERSON:\n";
      significantMemories.forEach(mem => {
        prompt += `- ${mem.summary}\n`;
      });
    }
    
    // Add player knowledge
    if (memory.playerKnowledge?.knownFacts.length > 0) {
      prompt += "\n\nWHAT YOU KNOW ABOUT THEM:\n";
      memory.playerKnowledge.knownFacts.slice(0, 5).forEach(fact => {
        prompt += `- ${fact.replace(/_/g, ' ')}\n`;
      });
    }
    
    return prompt;
  }

  /**
   * Get default memory structure
   * @returns {Object} Default memory
   */
  getDefaultMemory() {
    return {
      episodes: [],
      playerKnowledge: {
        traits: [],
        knownFacts: []
      },
      conversationStyle: 'direct'
    };
  }
}
```

#### 1.4.5 Integration Points

**File:** `backend/src/services/npcService.js`

**Changes Required:**
- Call `memoryService.addMemory()` after dialogue processing
- Pass conversation data to memory service

**Implementation:**
```javascript
// In processDialogue()
async processDialogue(npcId, characterId, playerMessage) {
  // ... existing dialogue processing
  
  // Add memory after conversation
  const memoryService = require('./memoryService');
  await memoryService.addMemory(npc, character, {
    type: 'conversation',
    playerMessage: playerMessage,
    npcResponse: response,
    intent: detectedIntent,
    topics: extractedTopics
  });
  
  return response;
}
```

#### 1.4.6 AI Dialogue Service Integration

**File:** `backend/src/services/aiDialogueService.js`

**Changes Required:**
- Add memory prompt to system prompt
- Limit to top 3 memories

**Implementation:**
```javascript
async buildSystemPrompt(npc, relationship, character, context) {
  let prompt = `You are ${npc.name}, a ${npc.species} ${npc.occupation}.\n\n`;
  
  // Add memory context
  const memoryService = require('./memoryService');
  const memoryPrompt = memoryService.buildMemoryPrompt(npc, character);
  if (memoryPrompt) {
    prompt += memoryPrompt;
  }
  
  // ... rest of prompt
}
```

#### 1.4.7 Testing Requirements

**Unit Tests:**
- Memory addition
- Significance calculation
- Memory retrieval
- Player knowledge updates

**Integration Tests:**
- Memories persist across conversations
- NPCs reference past interactions
- Memory size limits enforced
- Top memories retrieved correctly

**Test Cases:**
1. Quest completion → Memory added with high significance
2. Multiple conversations → Only top 3 memories in prompt
3. Player knowledge → Facts tracked correctly
4. Memory retrieval → Fast (< 20ms)

#### 1.4.8 Success Criteria
- ✅ NPCs remember past interactions
- ✅ Memories influence dialogue in 70%+ of cases
- ✅ Memory retrieval < 20ms
- ✅ Memory size stays within limits

---

### 1.5 Enhanced Templates

#### 1.5.1 Requirements

**Objective:** Expand template library and add contextual/emotional template selection.

**Functional Requirements:**
- Add 50-100 new templates
- Templates must support emotional layering
- Contextual template selection (emotion, stress, location)
- Template variable filling improvements

**Non-Functional Requirements:**
- Template selection must be fast (< 10ms)
- Templates must cover 90% of common interactions
- Template library must be maintainable

#### 1.5.2 Template Data Structure

**File:** `backend/src/data/dialogueTemplates.js`

**Enhanced Template Structure:**
```javascript
{
  id: 'greeting_stranger_stressed',
  category: 'greeting',
  relationshipTier: 'stranger',
  emotionalState: ['stressed', 'anxious'],  // NEW
  contextRequirements: {  // NEW
    stressLevel: { min: 60 },
    locationSafety: { max: 0.5 }
  },
  personalityRequirements: {  // NEW
    formality: { min: 70 }
  },
  topics: ['greeting', 'casual'],
  responses: {
    stranger: "*glances around nervously* What do you want? Make it quick.",
    acquaintance: "Not a great time, but... what do you need?",
    friend: "Hey, sorry I'm stressed. What's up?",
    confidant: "Friend, I'm dealing with something. Can we make this quick?"
  },
  weight: 1.0,
  helpful: true  // NEW: indicates if response provides useful information
}
```

#### 1.5.3 Template Service Enhancements

**File:** `backend/src/services/dialogueTemplateService.js`

**New Features:**
1. Contextual template filtering
2. Emotional state matching
3. Personality-based filtering
4. Emotional layering application

**Implementation:**
```javascript
// Enhanced template selection
function selectContextualTemplate(criteria, npc, context) {
  let templates = dialogueTemplates.filter(t => {
    // Basic matching
    if (t.relationshipTier !== criteria.relationshipTier) return false;
    if (criteria.intent && !t.topics.includes(criteria.intent.type)) return false;
    
    // Emotional state matching (NEW)
    if (t.emotionalState && criteria.emotionalState) {
      if (!t.emotionalState.includes(criteria.emotionalState.primaryEmotion)) {
        return false;
      }
    }
    
    // Context requirements (NEW)
    if (t.contextRequirements) {
      if (t.contextRequirements.stressLevel) {
        const stress = npc.personalityProfile?.stressLevel || 30;
        if (t.contextRequirements.stressLevel.min && stress < t.contextRequirements.stressLevel.min) {
          return false;
        }
        if (t.contextRequirements.stressLevel.max && stress > t.contextRequirements.stressLevel.max) {
          return false;
        }
      }
      
      if (t.contextRequirements.locationSafety) {
        const safety = context.locationContext?.locationSafety || 0.5;
        if (t.contextRequirements.locationSafety.min && safety < t.contextRequirements.locationSafety.min) {
          return false;
        }
        if (t.contextRequirements.locationSafety.max && safety > t.contextRequirements.locationSafety.max) {
          return false;
        }
      }
    }
    
    // Personality requirements (NEW)
    if (t.personalityRequirements) {
      for (const [trait, requirement] of Object.entries(t.personalityRequirements)) {
        const value = npc.getPersonalityTrait(trait);
        if (requirement.min && value < requirement.min) return false;
        if (requirement.max && value > requirement.max) return false;
      }
    }
    
    return true;
  });
  
  // Fallback to basic templates if no contextual match
  if (templates.length === 0) {
    templates = dialogueTemplates.filter(t => 
      t.relationshipTier === criteria.relationshipTier && 
      !t.contextRequirements &&
      !t.emotionalState
    );
  }
  
  // Weight-based selection
  return this.selectWeightedTemplate(templates);
}

// Apply emotional layering to templates
function applyEmotionalLayer(response, npc) {
  const emotion = npc.getEmotion();
  
  if (emotion.intensity < 0.6) {
    return response;  // No layering for low intensity
  }
  
  const emotionalService = require('./emotionalStateService');
  return emotionalService.applyEmotionalCues(response, npc);
}
```

#### 1.5.4 New Template Categories

**Required Templates:**
1. **Emotional Greetings** (20 templates)
   - Stressed/anxious greetings
   - Happy/excited greetings
   - Sad/melancholic greetings
   - Angry/frustrated greetings

2. **Contextual Responses** (30 templates)
   - Unsafe location responses
   - High stress responses
   - Time-based responses (morning/night)

3. **Personality-Specific** (20 templates)
   - High formality responses
   - Low formality responses
   - High humor responses
   - High empathy responses

4. **Faction-Aware** (30 templates)
   - Faction-specific rhetoric
   - Reputation-based responses
   - Political topic responses

#### 1.5.5 Template Variable Enhancements

**New Variables:**
- `{emotionalCue}` - Emotional action cue
- `{stressLevel}` - Current stress level description
- `{factionRhetoric}` - Faction-specific phrasing
- `{personalityTrait}` - Personality-based modifier

**Implementation:**
```javascript
// Enhanced variable filling
async fillTemplateVariables(template, relationshipTier, npc, character, planet, options = {}) {
  let response = template.responses[relationshipTier] || template.responses.stranger;
  
  // ... existing variable replacement
  
  // NEW: Emotional cues
  if (response.includes('{emotionalCue}')) {
    const emotion = npc.getEmotion();
    if (emotion.intensity > 0.6) {
      const cues = {
        happy: ['*smiles*', '*grins*'],
        sad: ['*sighs*', '*looks down*'],
        angry: ['*glares*', '*clenches jaw*'],
        fearful: ['*glances around*', '*lowers voice*']
      };
      const emotionCues = cues[emotion.emotion] || [];
      const cue = emotionCues[Math.floor(Math.random() * emotionCues.length)] || '';
      response = response.replace(/{emotionalCue}/g, cue);
    } else {
      response = response.replace(/{emotionalCue}/g, '');
    }
  }
  
  // NEW: Stress level
  if (response.includes('{stressLevel}')) {
    const stress = npc.personalityProfile?.stressLevel || 30;
    const stressDesc = stress > 70 ? 'very stressed' : stress > 50 ? 'stressed' : 'calm';
    response = response.replace(/{stressLevel}/g, stressDesc);
  }
  
  // ... rest of variable replacement
}
```

#### 1.5.6 Testing Requirements

**Unit Tests:**
- Contextual template filtering
- Emotional state matching
- Personality-based filtering
- Variable filling

**Integration Tests:**
- Templates selected based on context
- Emotional layering applied correctly
- Template variety maintained

**Test Cases:**
1. Stressed NPC → Stressed templates selected
2. Unsafe location → Cautious templates selected
3. High formality NPC → Formal templates selected
4. Emotional cues appear in responses

#### 1.5.7 Success Criteria
- ✅ 90% of dialogue uses templates
- ✅ Contextual templates selected correctly
- ✅ Emotional layering visible in 60%+ of responses
- ✅ Template selection < 10ms

---

## Phase 2: Motivation & Trust

**Duration:** 4-6 weeks  
**Priority:** Medium-High  
**Goal:** Add NPC motivations and trust system

---

### 2.1 Motivation System

#### 2.1.1 Requirements

**Objective:** Add motivation framework to NPCs enabling goal-driven dialogue and quest hints.

**Functional Requirements:**
- NPCs must have primary goals
- NPCs must have immediate needs
- NPCs must have fears and values
- Motivations must influence dialogue
- Motivations must hint at quest opportunities

**Non-Functional Requirements:**
- Motivation data stored in JSONB
- Motivation-driven dialogue hints (not full quest generation yet)
- No performance impact

#### 2.1.2 Database Schema Changes

**File:** `backend/src/migrations/XXX-add-motivations.js`

```sql
-- Add motivations column to npcs table
ALTER TABLE npcs 
ADD COLUMN motivations JSONB DEFAULT '{
  "primaryGoal": {
    "type": "survival",
    "description": "",
    "urgency": 0.5
  },
  "immediateNeeds": [],
  "fears": [],
  "values": []
}'::jsonb;

-- Add index for motivation queries (if needed)
CREATE INDEX idx_npcs_motivations ON npcs USING GIN (motivations);
```

#### 2.1.3 Service Layer Implementation

**File:** `backend/src/services/motivationService.js` (NEW)

**Key Methods:**
```javascript
class MotivationService {
  /**
   * Generate motivations for new NPC
   * @param {Object} npcData - NPC data
   * @returns {Object} Motivation structure
   */
  generateMotivations(npcData) {
    const goalTypes = ['survival', 'wealth', 'knowledge', 'revenge', 'duty', 'freedom', 'power'];
    const goalType = goalTypes[Math.floor(Math.random() * goalTypes.length)];
    
    return {
      primaryGoal: {
        type: goalType,
        description: this.generateGoalDescription(goalType, npcData),
        urgency: Math.random() * 0.5 + 0.3  // 0.3-0.8
      },
      immediateNeeds: this.generateImmediateNeeds(npcData),
      fears: this.generateFears(npcData),
      values: this.generateValues(npcData)
    };
  }

  /**
   * Build motivation prompt for AI
   * @param {Object} npc - NPC instance
   * @returns {string} Motivation prompt
   */
  buildMotivationPrompt(npc) {
    const motivations = npc.motivations || {};
    const goal = motivations.primaryGoal;
    
    if (!goal) return '';
    
    let prompt = `\n\nYOUR PRIMARY MOTIVATION:\n`;
    prompt += `- Goal: ${goal.description}\n`;
    prompt += `- Urgency: ${goal.urgency > 0.7 ? 'extremely urgent' : goal.urgency > 0.4 ? 'moderately important' : 'long-term goal'}\n`;
    
    // Add immediate needs
    const urgentNeeds = motivations.immediateNeeds?.filter(n => n.urgency > 0.6) || [];
    if (urgentNeeds.length > 0) {
      prompt += "\nIMMEDIATE CONCERNS:\n";
      urgentNeeds.forEach(need => {
        prompt += `- ${need.description}\n`;
      });
    }
    
    // Add fears
    if (motivations.fears?.length > 0) {
      prompt += "\nYOU ARE AFRAID OF:\n";
      motivations.fears.slice(0, 3).forEach(fear => {
        prompt += `- ${fear.replace(/_/g, ' ')}\n`;
      });
    }
    
    // Hint at quest opportunity
    if (goal.urgency > 0.6) {
      prompt += "\n- You're looking for help with this goal. If the player seems willing, you might ask for assistance.\n";
    }
    
    return prompt;
  }
}
```

#### 2.1.4 Model Changes

**File:** `backend/src/models/NPC.js`

**Changes Required:**
1. Add `motivations` field
2. Add helper methods for motivation access

**Code Structure:**
```javascript
motivations: {
  type: DataTypes.JSONB,
  defaultValue: {
    primaryGoal: {
      type: 'survival',
      description: '',
      urgency: 0.5
    },
    immediateNeeds: [],
    fears: [],
    values: []
  }
}

// Add instance methods
NPC.prototype.getPrimaryGoal = function() {
  return this.motivations?.primaryGoal || null;
};

NPC.prototype.hasUrgentNeed = function() {
  const needs = this.motivations?.immediateNeeds || [];
  return needs.some(need => need.urgency > 0.8);
};
```

#### 2.1.5 Service Layer Implementation (Complete)

**File:** `backend/src/services/motivationService.js` (NEW)

**Complete Implementation:**
```javascript
class MotivationService {
  /**
   * Generate motivations for new NPC
   * @param {Object} npcData - NPC data (species, occupation, faction, location)
   * @returns {Object} Motivation structure
   */
  generateMotivations(npcData) {
    const goalTypes = ['survival', 'wealth', 'knowledge', 'revenge', 'duty', 'freedom', 'power'];
    const goalType = this.selectGoalType(npcData);
    
    return {
      primaryGoal: {
        type: goalType,
        description: this.generateGoalDescription(goalType, npcData),
        urgency: this.calculateUrgency(goalType, npcData)
      },
      immediateNeeds: this.generateImmediateNeeds(npcData),
      fears: this.generateFears(npcData),
      values: this.generateValues(npcData)
    };
  }

  /**
   * Select goal type based on NPC characteristics
   * @param {Object} npcData - NPC data
   * @returns {string} Goal type
   */
  selectGoalType(npcData) {
    // Occupation-based goals
    if (npcData.occupation === 'vendor' || npcData.occupation === 'merchant') {
      return 'wealth';
    }
    if (npcData.occupation === 'scholar' || npcData.occupation === 'researcher') {
      return 'knowledge';
    }
    if (npcData.occupation === 'guard' || npcData.occupation === 'soldier') {
      return 'duty';
    }
    
    // Faction-based goals
    if (npcData.factionId === 'rebel_alliance') {
      return 'freedom';
    }
    if (npcData.factionId === 'galactic_empire') {
      return 'power';
    }
    
    // Default random
    const goalTypes = ['survival', 'wealth', 'knowledge', 'duty', 'freedom'];
    return goalTypes[Math.floor(Math.random() * goalTypes.length)];
  }

  /**
   * Generate goal description
   * @param {string} goalType - Goal type
   * @param {Object} npcData - NPC data
   * @returns {string} Goal description
   */
  generateGoalDescription(goalType, npcData) {
    const descriptions = {
      survival: `Earn enough credits to leave ${npcData.location?.planet || 'this planet'}`,
      wealth: 'Accumulate enough credits to start my own business',
      knowledge: 'Learn more about the Force and ancient Jedi teachings',
      revenge: 'Find and confront those who wronged my family',
      duty: `Protect ${npcData.location?.area || 'this settlement'} from threats`,
      freedom: 'Help liberate this sector from Imperial control',
      power: 'Rise through the ranks and gain influence'
    };
    
    return descriptions[goalType] || 'Achieve my personal goals';
  }

  /**
   * Calculate goal urgency
   * @param {string} goalType - Goal type
   * @param {Object} npcData - NPC data
   * @returns {number} Urgency (0.0-1.0)
   */
  calculateUrgency(goalType, npcData) {
    // Base urgency
    let urgency = 0.3 + Math.random() * 0.4;  // 0.3-0.7
    
    // Increase if location is dangerous
    if (npcData.location?.dangerLevel > 7) {
      urgency += 0.2;
    }
    
    // Increase for survival goals
    if (goalType === 'survival') {
      urgency += 0.1;
    }
    
    return Math.min(1.0, urgency);
  }

  /**
   * Generate immediate needs
   * @param {Object} npcData - NPC data
   * @returns {Array} Immediate needs
   */
  generateImmediateNeeds(npcData) {
    const needs = [];
    const needTypes = ['food', 'safety', 'information', 'medical', 'credits'];
    
    // Generate 1-3 immediate needs
    const count = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < count; i++) {
      const needType = needTypes[Math.floor(Math.random() * needTypes.length)];
      needs.push({
        type: needType,
        urgency: 0.5 + Math.random() * 0.4,  // 0.5-0.9
        description: this.generateNeedDescription(needType, npcData)
      });
    }
    
    return needs;
  }

  /**
   * Generate need description
   * @param {string} needType - Need type
   * @param {Object} npcData - NPC data
   * @returns {string} Need description
   */
  generateNeedDescription(needType, npcData) {
    const descriptions = {
      food: 'Need to find food for my family',
      safety: 'Raiders spotted nearby, need protection',
      information: 'Need to know if the spaceport is safe',
      medical: 'Need medical supplies for injured friend',
      credits: 'Need credits to pay off debts'
    };
    
    return descriptions[needType] || 'Need assistance';
  }

  /**
   * Generate fears
   * @param {Object} npcData - NPC data
   * @returns {Array} Fears
   */
  generateFears(npcData) {
    const allFears = [
      'imperial_discovery',
      'losing_family',
      'starvation',
      'being_betrayed',
      'faction_attack',
      'slavery',
      'death'
    ];
    
    // Select 2-4 fears
    const count = Math.floor(Math.random() * 3) + 2;
    const selected = [];
    const available = [...allFears];
    
    for (let i = 0; i < count && available.length > 0; i++) {
      const index = Math.floor(Math.random() * available.length);
      selected.push(available.splice(index, 1)[0]);
    }
    
    return selected;
  }

  /**
   * Generate values
   * @param {Object} npcData - NPC data
   * @returns {Array} Values
   */
  generateValues(npcData) {
    const allValues = [
      { name: 'family', importance: 0.9 },
      { name: 'freedom', importance: 0.8 },
      { name: 'honesty', importance: 0.6 },
      { name: 'wealth', importance: 0.3 },
      { name: 'loyalty', importance: 0.7 },
      { name: 'justice', importance: 0.8 },
      { name: 'survival', importance: 0.9 }
    ];
    
    // Select 3-5 values
    const count = Math.floor(Math.random() * 3) + 3;
    const selected = [];
    const available = [...allValues];
    
    for (let i = 0; i < count && available.length > 0; i++) {
      const index = Math.floor(Math.random() * available.length);
      selected.push(available.splice(index, 1)[0]);
    }
    
    // Sort by importance
    return selected.sort((a, b) => b.importance - a.importance);
  }

  /**
   * Build motivation prompt for AI
   * @param {Object} npc - NPC instance
   * @returns {string} Motivation prompt
   */
  buildMotivationPrompt(npc) {
    const motivations = npc.motivations || {};
    const goal = motivations.primaryGoal;
    
    if (!goal) return '';
    
    let prompt = `\n\nYOUR PRIMARY MOTIVATION:\n`;
    prompt += `- Goal: ${goal.description}\n`;
    prompt += `- Urgency: ${goal.urgency > 0.7 ? 'extremely urgent' : goal.urgency > 0.4 ? 'moderately important' : 'long-term goal'}\n`;
    
    // Add immediate needs
    const urgentNeeds = motivations.immediateNeeds?.filter(n => n.urgency > 0.6) || [];
    if (urgentNeeds.length > 0) {
      prompt += "\nIMMEDIATE CONCERNS:\n";
      urgentNeeds.forEach(need => {
        prompt += `- ${need.description}\n`;
      });
    }
    
    // Add fears
    if (motivations.fears?.length > 0) {
      prompt += "\nYOU ARE AFRAID OF:\n";
      motivations.fears.slice(0, 3).forEach(fear => {
        prompt += `- ${fear.replace(/_/g, ' ')}\n`;
      });
    }
    
    // Add values
    const topValues = motivations.values?.slice(0, 3) || [];
    if (topValues.length > 0) {
      prompt += "\nYOUR CORE VALUES:\n";
      topValues.forEach(value => {
        prompt += `- ${value.name} (${Math.round(value.importance * 100)}% important)\n`;
      });
    }
    
    // Hint at quest opportunity
    if (goal.urgency > 0.6) {
      prompt += "\n- You're looking for help with this goal. If the player seems willing, you might ask for assistance.\n";
    }
    
    return prompt;
  }

  /**
   * Get default motivation structure
   * @returns {Object} Default motivations
   */
  getDefaultMotivations() {
    return {
      primaryGoal: {
        type: 'survival',
        description: 'Survive and provide for my family',
        urgency: 0.5
      },
      immediateNeeds: [],
      fears: [],
      values: []
    };
  }
}
```

#### 2.1.6 AI Dialogue Service Integration

**File:** `backend/src/services/aiDialogueService.js`

**Changes Required:**
1. Import `motivationService`
2. Add motivation prompt to `buildSystemPrompt()`
3. Keep motivation prompt concise

**Implementation:**
```javascript
async buildSystemPrompt(npc, relationship, character, context) {
  let prompt = `You are ${npc.name}, a ${npc.species} ${npc.occupation}.\n\n`;
  
  // Add motivation context
  const motivationService = require('./motivationService');
  const motivationPrompt = motivationService.buildMotivationPrompt(npc);
  if (motivationPrompt) {
    prompt += motivationPrompt;
  }
  
  // ... rest of prompt
}
```

#### 2.1.7 Template Service Integration

**File:** `backend/src/services/dialogueTemplateService.js`

**Changes Required:**
1. Create motivation-based templates
2. Filter templates by motivation urgency
3. Add motivation variables to templates

**Implementation:**
```javascript
// Add motivation-based template filtering
if (npc.hasUrgentNeed()) {
  // Prioritize templates that hint at quests
  matchingTemplates = matchingTemplates.filter(t => 
    t.topics.includes('quest') || t.topics.includes('help')
  );
}

// Add motivation variables
if (response.includes('{primaryGoal}')) {
  const goal = npc.getPrimaryGoal();
  response = response.replace(/{primaryGoal}/g, goal?.description || 'my goals');
}
```

#### 2.1.8 NPC Generator Integration

**File:** `backend/src/services/npcGenerator.js`

**Changes Required:**
1. Generate motivations for new NPCs
2. Use NPC characteristics to influence motivations

**Implementation:**
```javascript
// In generateNPC()
const motivationService = require('./motivationService');
const motivations = motivationService.generateMotivations({
  species: npcData.species,
  occupation: npcData.occupation,
  factionId: npcData.factionId,
  location: npcData.location
});

npcData.motivations = motivations;
```

#### 2.1.9 Testing Requirements

**Unit Tests:**
- Motivation generation
- Goal type selection
- Urgency calculation
- Need/fear/value generation
- Motivation prompt building

**Integration Tests:**
- Motivations influence dialogue
- Urgent needs trigger quest hints
- Fears affect dialogue tone
- Values influence NPC behavior

**Test Cases:**
1. High urgency goal → NPC hints at quest
2. Immediate need → NPC asks for help
3. Fear mentioned → NPC reacts emotionally
4. Values conflict → NPC reacts appropriately

#### 2.1.10 Success Criteria
- ✅ All NPCs have motivations
- ✅ Motivations visible in 70%+ of dialogue
- ✅ Urgent needs trigger quest hints
- ✅ No performance impact

---

### 2.2 Trust System

#### 2.2.1 Requirements

**Objective:** Implement trust system separate from relationship level, affecting what NPCs share.

**Functional Requirements:**
- Trust level (0-100) separate from relationship
- Trust factors (quests completed, help provided, etc.)
- Trust-gated dialogue
- Trust thresholds for actions

**Non-Functional Requirements:**
- Trust stored in JSONB
- Trust updates event-driven
- Trust decay over time

#### 2.2.2 Database Schema Changes

**File:** `backend/src/migrations/XXX-add-trust-system.js`

```sql
-- Add trust_system column to npcs table
ALTER TABLE npcs 
ADD COLUMN trust_system JSONB DEFAULT '{
  "trustLevel": 50,
  "trustFactors": {
    "questsCompleted": 0,
    "questsFailed": 0,
    "helpProvided": 0,
    "harmCaused": 0
  },
  "thresholds": {
    "shareSecret": 60,
    "requestFavor": 50,
    "revealWeakness": 70
  },
  "lastInteraction": null
}'::jsonb;
```

#### 2.2.3 Model Changes

**File:** `backend/src/models/NPC.js`

**Changes Required:**
1. Add `trustSystem` field
2. Add helper methods for trust access

**Code Structure:**
```javascript
trustSystem: {
  type: DataTypes.JSONB,
  defaultValue: {
    trustLevel: 50,
    trustFactors: {
      questsCompleted: 0,
      questsFailed: 0,
      helpProvided: 0,
      harmCaused: 0
    },
    thresholds: {
      shareSecret: 60,
      requestFavor: 50,
      revealWeakness: 70
    },
    lastInteraction: null
  }
}

// Add instance methods
NPC.prototype.getTrustLevel = function() {
  return this.trustSystem?.trustLevel || 50;
};

NPC.prototype.hasTrustThreshold = function(thresholdName) {
  const trust = this.trustSystem || {};
  const threshold = trust.thresholds?.[thresholdName] || 50;
  return this.getTrustLevel() >= threshold;
};
```

#### 2.2.4 Service Layer Implementation (Complete)

**File:** `backend/src/services/trustService.js` (NEW)

**Complete Implementation:**
```javascript
class TrustService {
  /**
   * Initialize trust system for new NPC
   * @param {Object} npc - NPC instance
   * @param {Object} relationship - Initial relationship (if exists)
   * @returns {Object} Trust system
   */
  initializeTrust(npc, relationship = null) {
    const trust = {
      trustLevel: relationship ? Math.min(50, relationship.relationshipLevel) : 50,
      trustFactors: {
        questsCompleted: 0,
        questsFailed: 0,
        helpProvided: 0,
        harmCaused: 0
      },
      thresholds: {
        shareSecret: 60,
        requestFavor: 50,
        revealWeakness: 70
      },
      lastInteraction: new Date().toISOString()
    };
    
    npc.trustSystem = trust;
    return trust;
  }

  /**
   * Update trust based on event
   * @param {Object} npc - NPC instance
   * @param {Object} event - Event data
   */
  async updateTrust(npc, event) {
    const trust = npc.trustSystem || this.getDefaultTrust();
    
    // Apply decay first
    this.applyDecay(trust);
    
    // Update based on event type
    switch(event.type) {
      case 'quest_completed':
        trust.trustLevel = Math.min(100, trust.trustLevel + 5);
        trust.trustFactors.questsCompleted++;
        break;
        
      case 'quest_failed':
      case 'quest_abandoned':
        trust.trustLevel = Math.max(0, trust.trustLevel - 10);
        trust.trustFactors.questsFailed++;
        break;
        
      case 'player_helped':
        trust.trustLevel = Math.min(100, trust.trustLevel + 3);
        trust.trustFactors.helpProvided++;
        break;
        
      case 'player_harmed':
      case 'player_attacked':
        trust.trustLevel = Math.max(0, trust.trustLevel - 15);
        trust.trustFactors.harmCaused++;
        break;
        
      case 'player_betrayed':
        trust.trustLevel = Math.max(0, trust.trustLevel - 25);
        trust.trustFactors.harmCaused += 2;
        break;
        
      case 'secret_shared':
        // NPC shared a secret, trust increases slightly
        trust.trustLevel = Math.min(100, trust.trustLevel + 2);
        break;
        
      case 'secret_betrayed':
        // Player revealed NPC's secret
        trust.trustLevel = Math.max(0, trust.trustLevel - 20);
        trust.trustFactors.harmCaused++;
        break;
    }
    
    // Update timestamp
    trust.lastInteraction = new Date().toISOString();
    
    npc.trustSystem = trust;
    await npc.save();
    
    return trust;
  }

  /**
   * Apply trust decay over time
   * @param {Object} trust - Trust system object
   */
  applyDecay(trust) {
    if (!trust.lastInteraction) {
      trust.lastInteraction = new Date().toISOString();
      return;
    }
    
    const daysSinceInteraction = (Date.now() - new Date(trust.lastInteraction)) / (1000 * 60 * 60 * 24);
    
    // Trust decays 1 point per week of no interaction
    if (daysSinceInteraction > 7) {
      const weeks = Math.floor(daysSinceInteraction / 7);
      trust.trustLevel = Math.max(0, trust.trustLevel - weeks);
    }
  }

  /**
   * Check if trust level meets threshold
   * @param {Object} npc - NPC instance
   * @param {string} thresholdName - Threshold name
   * @returns {boolean} True if threshold met
   */
  meetsThreshold(npc, thresholdName) {
    const trust = npc.trustSystem || this.getDefaultTrust();
    const threshold = trust.thresholds?.[thresholdName] || 50;
    return trust.trustLevel >= threshold;
  }

  /**
   * Build trust prompt for AI
   * @param {Object} npc - NPC instance
   * @returns {string} Trust prompt
   */
  buildTrustPrompt(npc) {
    const trust = npc.trustSystem || this.getDefaultTrust();
    const trustLevel = trust.trustLevel;
    
    let prompt = `\n\nTRUST LEVEL: ${trustLevel}/100\n`;
    
    if (trustLevel < 30) {
      prompt += "- You don't trust them at all. Be guarded and reveal nothing important.\n";
      prompt += "- Refuse to help unless forced.\n";
    } else if (trustLevel < 50) {
      prompt += "- You're cautious. Share basic information but nothing sensitive.\n";
      prompt += "- Don't share secrets or ask for significant favors.\n";
    } else if (trustLevel < 70) {
      prompt += "- You trust them somewhat. Share useful information but keep some secrets.\n";
      prompt += "- You might ask for small favors.\n";
    } else if (trustLevel < 90) {
      prompt += "- You trust them significantly. Share secrets and ask for help.\n";
      prompt += "- You're comfortable discussing personal matters.\n";
    } else {
      prompt += "- You trust them completely. Share everything, including vulnerabilities.\n";
      prompt += "- You would ask them for major favors.\n";
    }
    
    // Add trust-gated information hints
    if (this.meetsThreshold(npc, 'shareSecret')) {
      const goal = npc.motivations?.primaryGoal;
      if (goal) {
        prompt += `\n- You trust them enough to share secrets about: ${goal.description}\n`;
      }
    }
    
    return prompt;
  }

  /**
   * Get default trust system
   * @returns {Object} Default trust
   */
  getDefaultTrust() {
    return {
      trustLevel: 50,
      trustFactors: {
        questsCompleted: 0,
        questsFailed: 0,
        helpProvided: 0,
        harmCaused: 0
      },
      thresholds: {
        shareSecret: 60,
        requestFavor: 50,
        revealWeakness: 70
      },
      lastInteraction: new Date().toISOString()
    };
  }
}
```

#### 2.2.5 Event Integration

**Files:** `questService.js`, `npcService.js`, `combatService.js`

**Requirements:**
- Trigger trust updates on relevant events
- Use event-driven architecture

**Implementation:**
```javascript
// In questService.js - on quest completion
async function onQuestCompleted(questId, characterId, npcId) {
  // ... quest completion logic
  
  if (npcId) {
    const npc = await NPC.findByPk(npcId);
    const trustService = require('./trustService');
    await trustService.updateTrust(npc, {
      type: 'quest_completed',
      questId: questId,
      characterId: characterId
    });
  }
}

// In npcService.js - on player help
async function onPlayerHelped(npcId, characterId, helpType) {
  const npc = await NPC.findByPk(npcId);
  const trustService = require('./trustService');
  await trustService.updateTrust(npc, {
    type: 'player_helped',
    helpType: helpType,
    characterId: characterId
  });
}
```

#### 2.2.6 AI Dialogue Service Integration

**File:** `backend/src/services/aiDialogueService.js`

**Changes Required:**
1. Import `trustService`
2. Add trust prompt to `buildSystemPrompt()`
3. Keep trust prompt concise

**Implementation:**
```javascript
async buildSystemPrompt(npc, relationship, character, context) {
  let prompt = `You are ${npc.name}, a ${npc.species} ${npc.occupation}.\n\n`;
  
  // Add trust context
  const trustService = require('./trustService');
  const trustPrompt = trustService.buildTrustPrompt(npc);
  if (trustPrompt) {
    prompt += trustPrompt;
  }
  
  // ... rest of prompt
}
```

#### 2.2.7 Template Service Integration

**File:** `backend/src/services/dialogueTemplateService.js`

**Changes Required:**
1. Filter templates by trust level
2. Create trust-gated templates
3. Block sensitive information if trust is low

**Implementation:**
```javascript
// In generateResponse()
const trustService = require('./trustService');
const trustLevel = npc.getTrustLevel();

// Filter out trust-gated templates if trust is low
if (trustLevel < 30) {
  matchingTemplates = matchingTemplates.filter(t => 
    !t.requiresTrust || t.requiresTrust <= trustLevel
  );
}

// Block sensitive information
if (trustLevel < 50 && intent.type === 'faction_info') {
  // Use generic faction templates, not detailed ones
  matchingTemplates = matchingTemplates.filter(t => 
    !t.sensitive || t.relationshipTier === 'confidant'
  );
}
```

#### 2.2.8 Testing Requirements

**Unit Tests:**
- Trust initialization
- Trust updates based on events
- Trust decay calculation
- Threshold checking
- Trust prompt building

**Integration Tests:**
- Quest completion increases trust
- Quest failure decreases trust
- Trust affects dialogue content
- Trust decays over time
- Trust-gated information blocked

**Test Cases:**
1. Quest completed → Trust increases by 5
2. Quest failed → Trust decreases by 10
3. Low trust → Sensitive information blocked
4. High trust → Secrets shared
5. 2 weeks no interaction → Trust decays by 2

#### 2.2.9 Success Criteria
- ✅ Trust updates on relevant events
- ✅ Trust affects dialogue in 80%+ of cases
- ✅ Trust-gated information properly blocked
- ✅ Trust decay works correctly

---

### 2.3 Simple Behavior Trees

#### 2.3.1 Requirements

**Objective:** Implement basic behavior tree framework for conversation decision-making.

**Functional Requirements:**
- Behavior tree framework
- Conversation behavior trees
- Urgent need detection
- Trust-based blocking

**Non-Functional Requirements:**
- Behavior tree execution < 50ms
- Simple trees (3-5 nodes)
- Event-driven execution

#### 2.3.2 Database Schema Changes

**Note:** Behavior trees are runtime constructs, no database changes needed. Trees are built dynamically from NPC state.

#### 2.3.3 Service Layer Implementation (Complete)

**File:** `backend/src/services/behaviorTreeService.js` (NEW)

**Complete Implementation:**
```javascript
/**
 * Behavior Node Types:
 * - 'sequence': All children must succeed
 * - 'selector': First child to succeed wins
 * - 'condition': Check condition, return success/failure
 * - 'action': Execute action, return success/failure
 */
class BehaviorNode {
  constructor(type, config) {
    this.type = type;
    this.config = config;
    this.children = [];
  }
  
  addChild(node) {
    this.children.push(node);
    return this;
  }
  
  async execute(context) {
    switch(this.type) {
      case 'sequence':
        return await this.executeSequence(context);
      case 'selector':
        return await this.executeSelector(context);
      case 'condition':
        return await this.executeCondition(context);
      case 'action':
        return await this.executeAction(context);
      default:
        return 'failure';
    }
  }
  
  async executeSequence(context) {
    // All children must succeed
    for (const child of this.children) {
      const result = await child.execute(context);
      if (result !== 'success') return result;
    }
    return 'success';
  }
  
  async executeSelector(context) {
    // First child to succeed wins
    for (const child of this.children) {
      const result = await child.execute(context);
      if (result === 'success') return 'success';
    }
    return 'failure';
  }
  
  async executeCondition(context) {
    const result = await this.config.check(context);
    return result ? 'success' : 'failure';
  }
  
  async executeAction(context) {
    try {
      await this.config.execute(context);
      return 'success';
    } catch (error) {
      console.error('Behavior action failed:', error);
      return 'failure';
    }
  }
}

class BehaviorTreeService {
  /**
   * Build conversation behavior tree for NPC
   * @param {Object} npc - NPC instance
   * @returns {BehaviorNode} Root node
   */
  buildConversationBehaviorTree(npc) {
    const root = new BehaviorNode('selector', {});
    
    // Branch 1: Urgent need (highest priority)
    const urgentBranch = new BehaviorNode('sequence', {});
    urgentBranch.addChild(new BehaviorNode('condition', {
      check: (ctx) => {
        const urgentNeed = npc.motivations?.immediateNeeds?.find(n => n.urgency > 0.8);
        return urgentNeed !== undefined;
      }
    }));
    urgentBranch.addChild(new BehaviorNode('action', {
      execute: async (ctx) => {
        const need = npc.motivations.immediateNeeds.find(n => n.urgency > 0.8);
        ctx.response = `*looks distressed* I need help. ${need.description}. Can you assist me?`;
        ctx.offerQuest = true;
        ctx.questType = need.type;
        ctx.priority = 'high';
      }
    }));
    root.addChild(urgentBranch);
    
    // Branch 2: High stress (second priority)
    const stressBranch = new BehaviorNode('sequence', {});
    stressBranch.addChild(new BehaviorNode('condition', {
      check: (ctx) => {
        const stress = npc.personalityProfile?.stressLevel || 30;
        return stress > 70;
      }
    }));
    stressBranch.addChild(new BehaviorNode('action', {
      execute: async (ctx) => {
        ctx.response = "Look, I'm under a lot of pressure right now. Can we make this quick?";
        ctx.mood = 'stressed';
        ctx.responseLength = 'short';
      }
    }));
    root.addChild(stressBranch);
    
    // Branch 3: Low trust (block information)
    const lowTrustBranch = new BehaviorNode('sequence', {});
    lowTrustBranch.addChild(new BehaviorNode('condition', {
      check: (ctx) => {
        const trustLevel = npc.trustSystem?.trustLevel || 50;
        const relationshipLevel = ctx.relationship?.relationshipLevel || 0;
        return trustLevel < 30 || relationshipLevel < 20;
      }
    }));
    lowTrustBranch.addChild(new BehaviorNode('action', {
      execute: async (ctx) => {
        ctx.response = "I don't know you well enough to discuss that.";
        ctx.trustGated = true;
        ctx.shareInformation = false;
      }
    }));
    root.addChild(lowTrustBranch);
    
    // Branch 4: Faction conflict (if player is enemy)
    const factionConflictBranch = new BehaviorNode('sequence', {});
    factionConflictBranch.addChild(new BehaviorNode('condition', {
      check: async (ctx) => {
        if (!npc.factionId) return false;
        const { FactionReputation } = require('../models');
        const factionService = require('./factionService');
        const faction = factionService.getFactionProfile(npc.factionId);
        
        if (!faction) return false;
        
        // Check if player is allied with enemy faction
        for (const [enemyFaction, modifier] of Object.entries(faction.relationshipModifiers || {})) {
          if (modifier < -0.7) {
            const enemyRep = await FactionReputation.findOne({
              where: { characterId: ctx.character.id, factionId: enemyFaction }
            });
            if (enemyRep && enemyRep.reputation > 60) {
              ctx.enemyFaction = enemyFaction;
              return true;
            }
          }
        }
        return false;
      }
    }));
    factionConflictBranch.addChild(new BehaviorNode('action', {
      execute: async (ctx) => {
        const factionService = require('./factionService');
        const enemyName = factionService.getFactionDisplayName(ctx.enemyFaction);
        ctx.response = `*eyes narrow* I know you're allied with the ${enemyName}. We have nothing to discuss.`;
        ctx.hostile = true;
        ctx.endConversation = true;
      }
    }));
    root.addChild(factionConflictBranch);
    
    // Branch 5: Normal conversation (default)
    const normalBranch = new BehaviorNode('action', {
      execute: async (ctx) => {
        ctx.proceedNormal = true;
      }
    });
    root.addChild(normalBranch);
    
    return root;
  }

  /**
   * Execute behavior tree
   * @param {BehaviorNode} tree - Behavior tree root
   * @param {Object} context - Execution context
   * @returns {Promise<string>} Result status
   */
  async executeTree(tree, context) {
    return await tree.execute(context);
  }
}
```

#### 2.3.4 Integration with Dialogue System

**File:** `backend/src/services/npcService.js`

**Changes Required:**
1. Execute behavior tree before dialogue generation
2. Use behavior tree results to modify dialogue approach

**Implementation:**
```javascript
// In processDialogue()
async processDialogue(npcId, characterId, playerMessage) {
  const { npc, relationship } = await this.getNPCWithRelationship(npcId, characterId);
  const character = await PlayerCharacter.findByPk(characterId);
  
  // Build and execute behavior tree
  const behaviorTreeService = require('./behaviorTreeService');
  const behaviorTree = behaviorTreeService.buildConversationBehaviorTree(npc);
  
  const behaviorContext = {
    npc,
    relationship,
    character,
    playerMessage,
    response: null,
    proceedNormal: false,
    offerQuest: false,
    trustGated: false,
    endConversation: false
  };
  
  await behaviorTreeService.executeTree(behaviorTree, behaviorContext);
  
  // Check if behavior tree determined special response
  if (behaviorContext.endConversation) {
    return behaviorContext.response;
  }
  
  if (behaviorContext.offerQuest) {
    // Handle quest offer (Phase 2: hint only, Phase 3: full quest generation)
    // For now, just hint at quest
    return behaviorContext.response || "I might have work for you, but I need to think about it.";
  }
  
  if (behaviorContext.trustGated) {
    return behaviorContext.response;
  }
  
  // Proceed with normal dialogue generation
  // ... existing dialogue generation logic
}
```

#### 2.3.5 Testing Requirements

**Unit Tests:**
- Behavior node execution
- Sequence node logic
- Selector node logic
- Condition checking
- Action execution

**Integration Tests:**
- Urgent need triggers quest offer
- Low trust blocks information
- Faction conflict ends conversation
- Normal conversation proceeds

**Test Cases:**
1. Urgent need → Quest offer triggered
2. High stress → Short responses
3. Low trust → Information blocked
4. Enemy faction → Conversation ends
5. Normal state → Standard dialogue

#### 2.3.6 Success Criteria
- ✅ Behavior trees execute < 50ms
- ✅ Urgent needs detected correctly
- ✅ Trust-based blocking works
- ✅ Faction conflicts handled
- ✅ Normal conversation flows correctly

---

## Phase 3: Advanced Features

**Duration:** 6-8 weeks  
**Priority:** Medium  
**Goal:** Add contextual awareness and advanced systems

---

### 3.1 Contextual Awareness

#### 3.1.1 Requirements

**Objective:** Add time, location, and faction context to dialogue generation.

**Functional Requirements:**
- NPCs must react to time of day
- NPCs must react to location safety
- NPCs must react to faction tensions
- Context must influence dialogue tone and content
- Only relevant context included in prompts

**Non-Functional Requirements:**
- Context gathering must be fast (< 30ms)
- Context data cached when possible
- Context prompt must be concise (< 100 tokens)

#### 3.1.2 Database Schema Changes

**File:** `backend/src/migrations/XXX-add-contextual-awareness.js`

```sql
-- Add contextual_awareness column to npcs table
ALTER TABLE npcs 
ADD COLUMN contextual_awareness JSONB DEFAULT '{
  "timeContext": {
    "timeOfDay": "afternoon",
    "dayOfWeek": 1
  },
  "locationContext": {
    "currentLocation": "unknown",
    "locationSafety": 0.5,
    "locationType": "generic"
  },
  "factionContext": {
    "localFactionControl": null,
    "factionTension": 0.5
  },
  "lastUpdated": null
}'::jsonb;
```

#### 3.1.3 Service Layer Implementation (Complete)

**File:** `backend/src/services/contextService.js` (NEW)

**Complete Implementation:**
```javascript
class ContextService {
  /**
   * Gather contextual awareness for NPC
   * @param {Object} npc - NPC instance
   * @returns {Object} Context data
   */
  gatherContext(npc) {
    return {
      timeContext: {
        timeOfDay: this.getTimeOfDay(),
        dayOfWeek: new Date().getDay(),
        hour: new Date().getHours()
      },
      locationContext: {
        currentLocation: npc.location?.area || 'unknown',
        locationSafety: this.getLocationSafety(npc.location),
        locationType: this.getLocationType(npc.location),
        planet: npc.location?.planet || null
      },
      factionContext: {
        localFactionControl: this.getLocalFaction(npc.location),
        factionTension: this.getFactionTension(npc.location, npc.factionId)
      }
    };
  }

  /**
   * Get time of day
   * @returns {string} Time of day
   */
  getTimeOfDay() {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    if (hour >= 18 && hour < 22) return 'evening';
    return 'night';
  }

  /**
   * Get location safety level
   * @param {Object} location - Location data
   * @returns {number} Safety level (0.0-1.0)
   */
  getLocationSafety(location) {
    if (!location) return 0.5;
    
    const safeAreas = ['residential', 'market', 'spaceport', 'cantina', 'government'];
    const dangerousAreas = ['wilderness', 'lower_levels', 'outskirts', 'ruins', 'abandoned'];
    
    if (safeAreas.includes(location.area)) return 0.8;
    if (dangerousAreas.includes(location.area)) return 0.3;
    
    // Check planet danger level
    if (location.planet) {
      // Would need to load planet data
      // For now, use area-based heuristic
    }
    
    return 0.5;  // Default
  }

  /**
   * Get location type
   * @param {Object} location - Location data
   * @returns {string} Location type
   */
  getLocationType(location) {
    if (!location) return 'generic';
    
    const types = {
      'market': 'commercial',
      'cantina': 'social',
      'residential': 'residential',
      'spaceport': 'transport',
      'government': 'official',
      'wilderness': 'dangerous',
      'lower_levels': 'dangerous'
    };
    
    return types[location.area] || 'generic';
  }

  /**
   * Get local faction control
   * @param {Object} location - Location data
   * @returns {string|null} Faction ID
   */
  getLocalFaction(location) {
    // Would integrate with world state system
    // For now, return null (unknown)
    return null;
  }

  /**
   * Get faction tension level
   * @param {Object} location - Location data
   * @param {string} npcFactionId - NPC's faction
   * @returns {number} Tension level (0.0-1.0)
   */
  getFactionTension(location, npcFactionId) {
    // Would integrate with world state system
    // For now, return default
    return 0.5;
  }

  /**
   * Build context prompt for AI (concise, only relevant context)
   * @param {Object} context - Context data
   * @returns {string} Context prompt
   */
  buildContextPrompt(context) {
    let prompt = '';
    
    // Time context (only if significant)
    if (context.timeContext.timeOfDay === 'night') {
      prompt += "- It's night. You're tired, keep responses brief.\n";
    } else if (context.timeContext.timeOfDay === 'morning') {
      prompt += "- It's morning. You're fresh and more willing to talk.\n";
    }
    
    // Location context (only if unsafe)
    if (context.locationContext.locationSafety < 0.5) {
      prompt += `- Location: ${context.locationContext.currentLocation} (unsafe). Be cautious.\n`;
    }
    
    // Faction context (only if tense)
    if (context.factionContext.factionTension > 0.7) {
      prompt += "- Faction tensions are HIGH. Be cautious about politics.\n";
    }
    
    return prompt;
  }

  /**
   * Update NPC contextual awareness
   * @param {Object} npc - NPC instance
   */
  async updateContextualAwareness(npc) {
    const context = this.gatherContext(npc);
    npc.contextualAwareness = {
      ...context,
      lastUpdated: new Date().toISOString()
    };
    await npc.save();
  }
}
```

#### 3.1.4 Integration Points

**Files:** `aiDialogueService.js`, `dialogueTemplateService.js`, `npcService.js`

**Changes:**
- Gather context before dialogue generation
- Include context in AI prompts (concise)
- Filter templates by context

**Implementation:**
```javascript
// In npcService.processDialogue()
const contextService = require('./contextService');
const context = contextService.gatherContext(npc);

// Pass context to dialogue generation
const response = await dialogueService.generateResponse(
  npc, relationship, character, playerMessage, { context }
);
```

#### 3.1.5 Testing Requirements

**Unit Tests:**
- Time of day calculation
- Location safety calculation
- Context prompt building
- Context caching

**Integration Tests:**
- Night time → Brief responses
- Unsafe location → Cautious dialogue
- High tension → Political caution
- Context updates correctly

**Test Cases:**
1. Night time → NPC wants quick conversation
2. Unsafe location → NPC is cautious
3. High faction tension → Political topics avoided
4. Context cached → Fast retrieval

#### 3.1.6 Success Criteria
- ✅ Context gathered < 30ms
- ✅ Context affects dialogue in 60%+ of cases
- ✅ Context prompt < 100 tokens
- ✅ No performance degradation

---

### 3.2 Advanced Memory

#### 3.2.1 Requirements

**Objective:** Enhance memory system with consolidation and improved significance calculation.

**Key Features:**
- Memory consolidation (remove low-significance old memories)
- Improved significance calculation
- Better memory retrieval
- Memory-based dialogue adaptation

---

### 3.3 Conversation Trees

#### 3.3.1 Requirements

**Objective:** Implement branching conversation trees for quest negotiations.

**Key Features:**
- Conversation tree framework
- Quest negotiation trees
- Player choice detection
- Effects on relationships/trust

---

### 3.4 Dynamic Quest Generation

#### 3.4.1 Requirements

**Objective:** Generate quests dynamically from NPC motivations.

**Key Features:**
- Motivation-to-quest conversion
- Dynamic quest creation
- Quest system integration
- Quest balancing

---

## Phase 4: Polish & Optimization

**Duration:** 4-6 weeks  
**Priority:** High  
**Goal:** Optimize performance, reduce costs, polish UX

---

### 4.1 Performance Optimization

#### 4.1.1 Requirements

**Objective:** Optimize dialogue generation performance.

**Key Tasks:**
- Database query optimization
- Caching implementation
- Prompt length optimization
- Async processing where possible

---

### 4.2 Cost Optimization

#### 4.2.1 Requirements

**Objective:** Reduce AI API costs.

**Key Tasks:**
- Expand template library to 90%+ coverage
- Implement aggressive response caching
- Optimize AI usage (tiered prompts)
- Monitor and alert on costs

---

### 4.3 UI/UX Polish

#### 4.3.1 Requirements

**Objective:** Improve dialogue interface and player feedback.

**Key Tasks:**
- Add emotional state indicators
- Show trust/relationship changes
- Improve dialogue interface
- Add visual feedback for system changes

---

### 4.4 Testing & Balancing

#### 4.4.1 Requirements

**Objective:** Comprehensive testing and system balancing.

**Key Tasks:**
- Unit test coverage > 80%
- Integration test all systems
- Balance personality traits
- Balance trust thresholds
- Player feedback integration

---

## Cross-Phase Requirements

### Database Migrations

**Strategy:**
- All new fields use JSONB for flexibility
- Add columns with defaults (no breaking changes)
- Gradual migration of existing NPCs
- Rollback plan for each migration

### Service Architecture

**Pattern:**
- Service per feature (personalityService, memoryService, etc.)
- Centralized dialogue orchestration in npcService
- Event-driven updates
- Caching layer for performance

### API Design

**Principles:**
- Backward compatible
- Additive changes only
- Clear versioning strategy
- Comprehensive error handling

### Testing Strategy

**Approach:**
- Unit tests for all services
- Integration tests for dialogue flow
- Performance tests for dialogue generation
- Cost monitoring tests

---

## Testing Strategy

### Unit Testing

**Coverage Requirements:**
- All service methods > 80% coverage
- All model methods > 90% coverage
- Edge cases and error handling

### Integration Testing

**Test Scenarios:**
- Full dialogue generation flow
- Event-driven updates
- Memory persistence
- Trust calculation
- Template selection

### Performance Testing

**Metrics:**
- Dialogue generation < 200ms (p95)
- Database queries < 50ms
- Memory usage within limits
- Cache hit rates > 80%

### Cost Testing

**Monitoring:**
- AI API call counts
- Token usage per call
- Cost per conversation
- Daily cost tracking

---

## Deployment Plan

### Phase 1 Deployment

**Steps:**
1. Deploy database migrations
2. Deploy service layer changes
3. Deploy API changes
4. Gradual rollout (10% → 50% → 100%)
5. Monitor performance and costs

### Rollback Plan

**For Each Phase:**
- Database migration rollback scripts
- Feature flags for gradual disable
- Service versioning for quick revert
- Monitoring and alerting

### Monitoring

**Key Metrics:**
- Dialogue generation latency
- AI API costs
- Template usage percentage
- Error rates
- Player satisfaction (surveys)

---

## Summary & Next Steps

### Implementation Priority Summary

**Phase 1 (Weeks 1-6): Foundation & Quick Wins**
- **Critical Path:** Personality → Faction → Emotion → Memory → Templates
- **Dependencies:** None (can start immediately)
- **Risk Level:** Low (incremental changes)
- **Expected Impact:** High (immediate visible improvements)

**Phase 2 (Weeks 7-12): Motivation & Trust**
- **Critical Path:** Motivation → Trust → Behavior Trees
- **Dependencies:** Phase 1 complete
- **Risk Level:** Medium (new systems, event integration)
- **Expected Impact:** High (NPCs feel more alive)

**Phase 3 (Weeks 13-20): Advanced Features**
- **Critical Path:** Context → Advanced Memory → Conversation Trees → Dynamic Quests
- **Dependencies:** Phase 1 & 2 complete
- **Risk Level:** Medium-High (complex integrations)
- **Expected Impact:** Very High (truly immersive NPCs)

**Phase 4 (Weeks 21-26): Polish & Optimization**
- **Critical Path:** Performance → Cost → UX → Testing
- **Dependencies:** All previous phases
- **Risk Level:** Low (optimization work)
- **Expected Impact:** High (production readiness)

### Key Implementation Principles

1. **Start Simple:** Implement basic versions first, enhance based on results
2. **Template First:** Prioritize template expansion to reduce AI costs
3. **Event-Driven:** Use events for updates, not polling
4. **JSONB Storage:** Flexible schema without migrations
5. **Incremental Rollout:** Gradual deployment with monitoring

### Critical Success Factors

1. **Template Coverage:** Must reach 90%+ to control costs
2. **Performance:** Dialogue generation must stay < 200ms
3. **Cost Control:** AI costs must stay < $20/day for 1000 players
4. **Player Experience:** NPCs must feel distinct and memorable
5. **System Stability:** No breaking changes, backward compatible

### Risk Mitigation Checklist

- [ ] Database migrations tested in staging
- [ ] Rollback scripts prepared for each phase
- [ ] Feature flags implemented for gradual rollout
- [ ] Cost monitoring dashboard set up
- [ ] Performance benchmarks established
- [ ] Unit test coverage > 80%
- [ ] Integration tests for all dialogue flows
- [ ] Player feedback mechanism in place

### Recommended First Steps

1. **Week 1:** Set up monitoring and feature flags
2. **Week 1:** Create database migration for Phase 1
3. **Week 2:** Implement personality service and model changes
4. **Week 2:** Integrate personality into AI prompts
5. **Week 3:** Implement faction service and integration
6. **Week 3:** Test with small NPC subset
7. **Week 4:** Roll out to 10% of NPCs, monitor
8. **Week 5:** Expand to 50%, then 100%
9. **Week 6:** Begin Phase 2 planning

### Documentation Requirements

For each phase, maintain:
- API documentation updates
- Database schema documentation
- Service architecture diagrams
- Testing documentation
- Deployment runbooks
- Rollback procedures

### Success Metrics Dashboard

Track the following metrics weekly:
- Template usage percentage (target: 90%+)
- AI API costs per day (target: < $20/day)
- Dialogue generation latency p95 (target: < 200ms)
- NPC personality distinctiveness (qualitative)
- Player satisfaction scores (surveys)
- Memory system effectiveness (qualitative)
- Trust system usage (qualitative)

---

**End of Requirements Document**

**Document Version:** 1.0  
**Last Updated:** December 2024  
**Next Review:** After Phase 1 completion

