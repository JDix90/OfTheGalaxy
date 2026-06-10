# Mini-Quest System Implementation Plan

**Date:** December 2024  
**Status:** Planning  
**Purpose:** Create a separate quest category for interpersonal mini-quests generated from NPC motivations, spanning the full moral spectrum

---

## Executive Summary

The Mini-Quest system will provide a dedicated category for small, interpersonal quests that NPCs offer based on their motivations, needs, and personalities. These quests are:
- **Separate** from main storyline quests
- **Separate** from faction-related quests
- **More interpersonal** and focused on personal connections
- **Less impactful** to the overall game/galaxy
- **Moral spectrum variety**: From altruistic help to sabotage, deception, theft, and violence
- **Dynamically generated** from NPC motivations, personality, and urgent needs
- **Personality-driven**: NPC personality and faction determine quest moral alignment

---

## Objectives

1. Create a new `mini` quest type separate from existing quest categories
2. Build a dynamic mini-quest generation system based on NPC motivations, personality, and needs
3. Design quests across the moral spectrum (good, neutral, evil)
4. Implement personality-driven quest generation (NPC traits influence quest type)
5. Design appropriate objectives for all quest types
6. Implement appropriate rewards and consequences based on moral alignment
7. Integrate with existing quest service while maintaining separation
8. Create UI differentiation for mini-quests with moral indicators
9. Ensure seamless integration with Phase 2 motivation, personality, and behavior tree systems

---

## Current Quest System Analysis

### Existing Quest Types
- **main**: Main storyline quests
- **side**: Side quests with moderate impact
- **dynamic**: Dynamically generated quests
- **companion**: Companion-specific quests
- **repeatable**: Repeatable quests

### Quest Model Structure
- `questType`: Enum validation (needs update to include 'mini')
- `objectives`: JSONB array with id, type, description
- `rewards`: JSONB with xp, credits, reputation, items, unlocks
- `prerequisites`: JSONB with level, reputation, completedQuests, items
- `questGiverId`: Links to NPC
- `difficulty`: easy, medium, hard, very_hard

### Quest Service Features
- Prerequisite checking
- Quest progress tracking
- Reward distribution
- Quest chains
- NPC-specific quest retrieval

---

## Mini-Quest System Design

### 1. Quest Type: "mini"

**Characteristics:**
- **Duration**: 5-15 minutes (vs 30+ for main quests)
- **Objectives**: 1-2 simple objectives (vs 3-5 for main quests)
- **Difficulty**: Always "easy" or "medium"
- **Impact**: Personal/interpersonal only, no galaxy-wide consequences
- **Moral Spectrum**: Ranges from altruistic to neutral to malicious
- **Rewards**: Variable based on moral alignment and NPC personality
- **Prerequisites**: Minimal (usually just level 1+)
- **Repeatability**: Can be repeated with different NPCs, but not the same NPC

**Moral Alignment Categories:**
1. **Altruistic** (Good): Help NPCs, save lives, provide resources
2. **Neutral**: Information gathering, trade, simple favors
3. **Deceptive** (Questionable): Lie, mislead, manipulate
4. **Criminal** (Evil): Theft, sabotage, attack, kill

---

## Moral Spectrum Quest Examples

### Altruistic Mini-Quests
- "Help Owen find food supplies" (collect food items)
- "Escort Reegesk to safety" (travel to safe location)
- "Gather medical supplies for injured friend" (collect medical items)
- "Rescue trapped citizen" (free NPC from danger)

### Neutral Mini-Quests
- "Find information about spaceport safety" (gather intel)
- "Deliver message to another NPC" (simple delivery)
- "Collect trade goods" (gather items for trade)
- "Arrange meeting between NPCs" (facilitate interaction)

### Deceptive Mini-Quests
- "Lie to guard about NPC's location" (deceive NPC)
- "Spread false information about faction" (misinformation)
- "Pretend to be someone else" (impersonation)
- "Manipulate NPC into making decision" (social manipulation)

### Criminal Mini-Quests
- "Steal item from vendor" (theft)
- "Sabotage equipment at location" (sabotage)
- "Attack rival NPC" (assault)
- "Eliminate target NPC" (assassination)

---

## Implementation Plan

### Phase 1: Database & Model Updates

#### 1.1 Update Quest Model

**File:** `backend/src/models/Quest.js`

**Changes:**
1. Add 'mini' to questType validation enum
2. Add optional `miniQuestData` JSONB field for mini-quest specific metadata
3. Add `moralAlignment` field to track quest morality
4. Add `isMiniQuest()` helper method

**Code:**
```javascript
questType: {
  type: DataTypes.STRING(50),
  allowNull: false,
  field: 'quest_type',
  validate: {
    isIn: [['main', 'side', 'dynamic', 'companion', 'repeatable', 'mini']] // Add 'mini'
  }
},
moralAlignment: {
  type: DataTypes.STRING(20),
  allowNull: true,
  field: 'moral_alignment',
  validate: {
    isIn: [['altruistic', 'neutral', 'deceptive', 'criminal', null]]
  }
},
miniQuestData: {
  type: DataTypes.JSONB,
  field: 'mini_quest_data',
  defaultValue: {
    needType: null,        // food, safety, medical, etc.
    motivationType: null,  // survival, wealth, revenge, etc.
    urgency: 0.5,          // 0.0-1.0
    generatedFrom: null,   // NPC ID that generated this
    expiresAt: null,       // Optional expiration timestamp
    relationshipBonus: 0,  // Extra relationship points on completion
    moralAlignment: null,  // altruistic, neutral, deceptive, criminal
    consequences: {       // Reputation/faction consequences
      reputationChanges: {},
      factionChanges: {}
    }
  }
}

// Add instance methods
Quest.prototype.isMiniQuest = function() {
  return this.questType === 'mini';
};

Quest.prototype.getMoralAlignment = function() {
  return this.moralAlignment || this.miniQuestData?.moralAlignment || 'neutral';
};
```

#### 1.2 Database Migration

**File:** `backend/src/migrations/013-add-mini-quest-support.js`

**Changes:**
1. Add 'mini' to quest_type enum (if using enum type)
2. Add `moral_alignment` column to quests table
3. Add `mini_quest_data` JSONB column to quests table
4. Add indexes for queries

**SQL:**
```sql
-- Add moral_alignment column
ALTER TABLE quests 
ADD COLUMN moral_alignment VARCHAR(20) CHECK (moral_alignment IN ('altruistic', 'neutral', 'deceptive', 'criminal') OR moral_alignment IS NULL);

-- Add mini_quest_data column
ALTER TABLE quests 
ADD COLUMN mini_quest_data JSONB DEFAULT '{
  "needType": null,
  "motivationType": null,
  "urgency": 0.5,
  "generatedFrom": null,
  "expiresAt": null,
  "relationshipBonus": 0,
  "moralAlignment": null,
  "consequences": {
    "reputationChanges": {},
    "factionChanges": {}
  }
}'::jsonb;

-- Add indexes
CREATE INDEX idx_quests_mini_quest_data ON quests USING GIN (mini_quest_data);
CREATE INDEX idx_quests_type_mini ON quests (quest_type) WHERE quest_type = 'mini';
CREATE INDEX idx_quests_moral_alignment ON quests (moral_alignment) WHERE quest_type = 'mini';
```

---

### Phase 2: Mini-Quest Generation Service

#### 2.1 Create Mini-Quest Service

**File:** `backend/src/services/miniQuestService.js` (NEW)

**Responsibilities:**
- Generate mini-quests from NPC motivations, personality, and needs
- Determine moral alignment based on NPC traits
- Create appropriate objectives based on quest type and moral alignment
- Calculate rewards and consequences based on moral alignment
- Handle quest expiration and cleanup
- Prevent duplicate mini-quests for same NPC

**Key Methods:**

```javascript
class MiniQuestService {
  /**
   * Generate a mini-quest from NPC motivation/need
   * @param {Object} npc - NPC instance
   * @param {Object} character - Player character
   * @param {Object} context - Context (urgent need, motivation, etc.)
   * @returns {Promise<Quest>} Generated mini-quest
   */
  async generateMiniQuest(npc, character, context) {
    // Determine moral alignment based on NPC personality and motivation
    const moralAlignment = this.determineMoralAlignment(npc, context);
    
    // Generate quest based on moral alignment and context
    const questData = await this.generateQuestData(npc, character, context, moralAlignment);
    
    // Generate quest ID
    const questId = this.generateQuestId(npc, context, moralAlignment);
    
    // Check if quest already exists
    const existing = await Quest.findByPk(questId);
    if (existing) {
      return existing;
    }
    
    // Create quest
    const quest = await Quest.create({
      id: questId,
      questType: 'mini',
      moralAlignment: moralAlignment,
      title: questData.title,
      description: questData.description,
      shortDescription: questData.shortDescription,
      objectives: questData.objectives,
      rewards: questData.rewards,
      prerequisites: {
        level: 1,
        reputation: {},
        completedQuests: [],
        items: []
      },
      questGiverId: npc.id,
      startLocation: {
        planet: npc.location?.planet || null,
        area: npc.location?.area || null
      },
      estimatedTime: this.estimateTime(questData.objectives),
      difficulty: this.determineDifficulty(context, moralAlignment),
      isActive: true,
      miniQuestData: {
        needType: context.urgentNeed?.type || null,
        motivationType: npc.motivations?.primaryGoal?.type || null,
        urgency: context.urgentNeed?.urgency || 0.5,
        generatedFrom: npc.id,
        expiresAt: this.calculateExpiration(context.urgentNeed?.urgency || 0.5),
        relationshipBonus: questData.relationshipBonus,
        moralAlignment: moralAlignment,
        consequences: questData.consequences
      }
    });
    
    return quest;
  }

  /**
   * Determine moral alignment based on NPC personality and motivation
   */
  determineMoralAlignment(npc, context) {
    const personality = npc.personalityProfile || {};
    const motivation = npc.motivations?.primaryGoal || {};
    const faction = npc.factionId;
    const urgentNeed = context.urgentNeed;
    
    // Base alignment from personality traits
    let alignmentScore = 0;
    
    // Agreeableness influences alignment (high = good, low = evil)
    if (personality.agreeableness > 70) {
      alignmentScore += 2;
    } else if (personality.agreeableness < 30) {
      alignmentScore -= 2;
    }
    
    // Conscientiousness influences alignment
    if (personality.conscientiousness > 70) {
      alignmentScore += 1;
    } else if (personality.conscientiousness < 30) {
      alignmentScore -= 1;
    }
    
    // Neuroticism can push toward desperate actions
    if (personality.neuroticism > 70) {
      alignmentScore -= 1;
    }
    
    // Motivation type influences alignment
    const motivationAlignment = {
      survival: 0,      // Neutral
      wealth: -1,       // Slightly negative (greed)
      knowledge: 1,     // Positive (curiosity)
      revenge: -3,      // Very negative
      duty: 1,          // Positive (responsibility)
      freedom: 0,       // Neutral
      power: -2,        // Negative (ambition)
      honor: 1          // Positive
    };
    
    alignmentScore += motivationAlignment[motivation.type] || 0;
    
    // Faction alignment modifiers
    const factionAlignment = {
      'galactic_empire': -1,
      'first_order': -1,
      'sith': -2,
      'hutts': -2,
      'hutt_cartel': -2,
      'rebel_alliance': 1,
      'resistance': 1,
      'jedi_order': 2,
      'new_republic': 1
    };
    
    alignmentScore += factionAlignment[faction] || 0;
    
    // Urgency can push toward desperate actions
    if (urgentNeed && urgentNeed.urgency > 0.8) {
      alignmentScore -= 1; // Desperate times = desperate measures
    }
    
    // Random variation (±1)
    alignmentScore += Math.floor(Math.random() * 3) - 1;
    
    // Determine alignment category
    if (alignmentScore >= 3) {
      return 'altruistic';
    } else if (alignmentScore >= 1) {
      return 'neutral';
    } else if (alignmentScore >= -1) {
      return 'deceptive';
    } else {
      return 'criminal';
    }
  }

  /**
   * Generate quest data based on moral alignment
   */
  async generateQuestData(npc, character, context, moralAlignment) {
    const urgentNeed = context.urgentNeed;
    const motivation = npc.motivations?.primaryGoal;
    
    switch(moralAlignment) {
      case 'altruistic':
        return this.generateAltruisticQuest(npc, character, urgentNeed);
      case 'neutral':
        return this.generateNeutralQuest(npc, character, urgentNeed, motivation);
      case 'deceptive':
        return this.generateDeceptiveQuest(npc, character, urgentNeed, motivation);
      case 'criminal':
        return this.generateCriminalQuest(npc, character, urgentNeed, motivation);
      default:
        return this.generateNeutralQuest(npc, character, urgentNeed, motivation);
    }
  }

  /**
   * Generate altruistic quest
   */
  generateAltruisticQuest(npc, character, urgentNeed) {
    const needType = urgentNeed?.type || 'supplies';
    
    const questTypes = {
      food: {
        title: `Help ${npc.name} Find Food`,
        description: `${npc.name} is struggling to find enough food. They need your help gathering supplies.`,
        objectives: [
          {
            id: 'collect_food',
            type: 'collect',
            description: `Collect ${this.getFoodAmount(urgentNeed.urgency)} food items`,
            target: 'food_item',
            count: this.getFoodAmount(urgentNeed.urgency),
            location: this.getLocationHint(npc)
          },
          {
            id: 'deliver_food',
            type: 'deliver',
            description: `Deliver the food to ${npc.name}`,
            target: npc.id
          }
        ],
        rewards: {
          xp: 75,
          credits: 30,
          reputation: { [npc.factionId]: 10 },
          items: [],
          unlocks: []
        },
        relationshipBonus: 15,
        consequences: {
          reputationChanges: { [npc.factionId]: 5 },
          factionChanges: {}
        }
      },
      safety: {
        title: `Escort ${npc.name} to Safety`,
        description: `${npc.name} feels unsafe in their current location and needs an escort to a safer area.`,
        objectives: [
          {
            id: 'escort_npc',
            type: 'travel',
            description: `Escort ${npc.name} to a safe location`,
            location: this.findSafeLocation(npc.location),
            npcId: npc.id
          }
        ],
        rewards: {
          xp: 100,
          credits: 40,
          reputation: { [npc.factionId]: 12 },
          items: [],
          unlocks: []
        },
        relationshipBonus: 20,
        consequences: {
          reputationChanges: { [npc.factionId]: 8 },
          factionChanges: {}
        }
      },
      medical: {
        title: `Medical Aid for ${npc.name}`,
        description: `${npc.name} needs medical supplies urgently. Can you help gather them?`,
        objectives: [
          {
            id: 'collect_medical',
            type: 'collect',
            description: `Collect medical supplies`,
            target: 'medical_supply',
            count: 3,
            location: this.getLocationHint(npc)
          },
          {
            id: 'deliver_medical',
            type: 'deliver',
            description: `Deliver medical supplies to ${npc.name}`,
            target: npc.id
          }
        ],
        rewards: {
          xp: 90,
          credits: 35,
          reputation: { [npc.factionId]: 11 },
          items: [],
          unlocks: []
        },
        relationshipBonus: 18,
        consequences: {
          reputationChanges: { [npc.factionId]: 6 },
          factionChanges: {}
        }
      }
    };
    
    return questTypes[needType] || questTypes.food;
  }

  /**
   * Generate neutral quest
   */
  generateNeutralQuest(npc, character, urgentNeed, motivation) {
    const questTypes = [
      {
        title: `Information for ${npc.name}`,
        description: `${npc.name} needs information about the area. Can you gather it for them?`,
        objectives: [
          {
            id: 'gather_info',
            type: 'discover',
            description: `Gather information about ${urgentNeed?.description || 'the area'}`,
            location: this.getLocationHint(npc)
          },
          {
            id: 'report_info',
            type: 'interact',
            description: `Report the information to ${npc.name}`,
            target: npc.id
          }
        ],
        rewards: {
          xp: 60,
          credits: 25,
          reputation: { [npc.factionId]: 5 },
          items: [],
          unlocks: []
        },
        relationshipBonus: 10,
        consequences: {
          reputationChanges: {},
          factionChanges: {}
        }
      },
      {
        title: `Delivery for ${npc.name}`,
        description: `${npc.name} needs a message delivered to another NPC.`,
        objectives: [
          {
            id: 'deliver_message',
            type: 'interact',
            description: `Deliver message to target NPC`,
            target: this.findTargetNPC(npc.location),
            message: this.generateMessage(npc)
          }
        ],
        rewards: {
          xp: 50,
          credits: 20,
          reputation: { [npc.factionId]: 3 },
          items: [],
          unlocks: []
        },
        relationshipBonus: 8,
        consequences: {
          reputationChanges: {},
          factionChanges: {}
        }
      }
    ];
    
    return questTypes[Math.floor(Math.random() * questTypes.length)];
  }

  /**
   * Generate deceptive quest
   */
  generateDeceptiveQuest(npc, character, urgentNeed, motivation) {
    const personality = npc.personalityProfile || {};
    const targetNPC = this.findTargetNPC(npc.location);
    
    const questTypes = [
      {
        title: `Misinformation for ${npc.name}`,
        description: `${npc.name} needs you to spread false information about ${targetNPC?.name || 'a rival'}.`,
        objectives: [
          {
            id: 'spread_lies',
            type: 'interact',
            description: `Tell ${targetNPC?.name || 'target NPC'} false information`,
            target: targetNPC?.id,
            deceptionType: 'misinformation'
          }
        ],
        rewards: {
          xp: 80,
          credits: 50,
          reputation: { [npc.factionId]: 8 },
          items: [],
          unlocks: []
        },
        relationshipBonus: 12,
        consequences: {
          reputationChanges: {
            [npc.factionId]: 5,
            [targetNPC?.factionId]: -5
          },
          factionChanges: {}
        }
      },
      {
        title: `Deception Mission for ${npc.name}`,
        description: `${npc.name} needs you to lie to ${targetNPC?.name || 'someone'} about their location.`,
        objectives: [
          {
            id: 'deceive_npc',
            type: 'interact',
            description: `Lie to ${targetNPC?.name || 'target NPC'} about ${npc.name}'s location`,
            target: targetNPC?.id,
            deceptionType: 'location_lie'
          }
        ],
        rewards: {
          xp: 75,
          credits: 45,
          reputation: { [npc.factionId]: 7 },
          items: [],
          unlocks: []
        },
        relationshipBonus: 10,
        consequences: {
          reputationChanges: {
            [npc.factionId]: 4,
            [targetNPC?.factionId]: -4
          },
          factionChanges: {}
        }
      },
      {
        title: `Manipulation for ${npc.name}`,
        description: `${npc.name} wants you to manipulate ${targetNPC?.name || 'someone'} into making a decision.`,
        objectives: [
          {
            id: 'manipulate_npc',
            type: 'interact',
            description: `Manipulate ${targetNPC?.name || 'target NPC'} into making a decision`,
            target: targetNPC?.id,
            deceptionType: 'manipulation'
          }
        ],
        rewards: {
          xp: 85,
          credits: 55,
          reputation: { [npc.factionId]: 9 },
          items: [],
          unlocks: []
        },
        relationshipBonus: 14,
        consequences: {
          reputationChanges: {
            [npc.factionId]: 6,
            [targetNPC?.factionId]: -6
          },
          factionChanges: {}
        }
      }
    ];
    
    return questTypes[Math.floor(Math.random() * questTypes.length)];
  }

  /**
   * Generate criminal quest
   */
  generateCriminalQuest(npc, character, urgentNeed, motivation) {
    const personality = npc.personalityProfile || {};
    const targetNPC = this.findTargetNPC(npc.location);
    const targetLocation = this.findTargetLocation(npc.location);
    
    const questTypes = [
      {
        title: `Theft for ${npc.name}`,
        description: `${npc.name} needs you to steal ${this.getTargetItem()} from ${targetLocation?.name || 'a location'}.`,
        objectives: [
          {
            id: 'steal_item',
            type: 'collect',
            description: `Steal ${this.getTargetItem()} from ${targetLocation?.name || 'target location'}`,
            target: this.getTargetItem(),
            count: 1,
            location: targetLocation?.id,
            illegal: true
          },
          {
            id: 'deliver_stolen',
            type: 'deliver',
            description: `Deliver stolen item to ${npc.name}`,
            target: npc.id
          }
        ],
        rewards: {
          xp: 100,
          credits: 75,
          reputation: { [npc.factionId]: 10 },
          items: [],
          unlocks: []
        },
        relationshipBonus: 15,
        consequences: {
          reputationChanges: {
            [npc.factionId]: 8,
            [targetLocation?.factionId]: -10
          },
          factionChanges: {}
        }
      },
      {
        title: `Sabotage for ${npc.name}`,
        description: `${npc.name} wants you to sabotage equipment at ${targetLocation?.name || 'a location'}.`,
        objectives: [
          {
            id: 'sabotage_equipment',
            type: 'interact',
            description: `Sabotage equipment at ${targetLocation?.name || 'target location'}`,
            target: targetLocation?.id,
            sabotageType: 'equipment',
            illegal: true
          }
        ],
        rewards: {
          xp: 120,
          credits: 90,
          reputation: { [npc.factionId]: 12 },
          items: [],
          unlocks: []
        },
        relationshipBonus: 18,
        consequences: {
          reputationChanges: {
            [npc.factionId]: 10,
            [targetLocation?.factionId]: -15
          },
          factionChanges: {}
        }
      },
      {
        title: `Attack ${targetNPC?.name || 'Target'} for ${npc.name}`,
        description: `${npc.name} wants you to attack ${targetNPC?.name || 'a rival'}.`,
        objectives: [
          {
            id: 'attack_npc',
            type: 'defeat',
            description: `Attack and defeat ${targetNPC?.name || 'target NPC'}`,
            target: targetNPC?.id,
            count: 1,
            illegal: true
          }
        ],
        rewards: {
          xp: 150,
          credits: 100,
          reputation: { [npc.factionId]: 15 },
          items: [],
          unlocks: []
        },
        relationshipBonus: 20,
        consequences: {
          reputationChanges: {
            [npc.factionId]: 12,
            [targetNPC?.factionId]: -20
          },
          factionChanges: {}
        }
      },
      {
        title: `Eliminate ${targetNPC?.name || 'Target'} for ${npc.name}`,
        description: `${npc.name} wants you to eliminate ${targetNPC?.name || 'a target'}. This is a serious request.`,
        objectives: [
          {
            id: 'eliminate_npc',
            type: 'defeat',
            description: `Eliminate ${targetNPC?.name || 'target NPC'}`,
            target: targetNPC?.id,
            count: 1,
            kill: true,
            illegal: true
          }
        ],
        rewards: {
          xp: 200,
          credits: 150,
          reputation: { [npc.factionId]: 20 },
          items: [],
          unlocks: []
        },
        relationshipBonus: 25,
        consequences: {
          reputationChanges: {
            [npc.factionId]: 15,
            [targetNPC?.factionId]: -30
          },
          factionChanges: {}
        }
      }
    ];
    
    // Filter based on NPC personality (very evil NPCs more likely to request kill quests)
    let availableTypes = questTypes;
    if (personality.agreeableness < 20 && personality.neuroticism > 70) {
      // Very evil, desperate NPC - all quest types available
    } else if (personality.agreeableness < 40) {
      // Evil NPC - exclude kill quests unless very urgent
      if (urgentNeed?.urgency < 0.9) {
        availableTypes = questTypes.filter(q => !q.objectives.some(o => o.kill));
      }
    } else {
      // Less evil - only theft and sabotage
      availableTypes = questTypes.filter(q => 
        q.objectives.some(o => o.type === 'collect' && o.illegal) || 
        q.objectives.some(o => o.type === 'interact' && o.sabotageType)
      );
    }
    
    return availableTypes[Math.floor(Math.random() * availableTypes.length)];
  }

  /**
   * Calculate rewards based on moral alignment
   */
  calculateRewards(urgentNeed, npc, moralAlignment) {
    const baseRewards = {
      altruistic: { xp: 75, credits: 30, reputation: 10 },
      neutral: { xp: 60, credits: 25, reputation: 5 },
      deceptive: { xp: 80, credits: 50, reputation: 8 },
      criminal: { xp: 120, credits: 90, reputation: 12 }
    };
    
    const base = baseRewards[moralAlignment] || baseRewards.neutral;
    const urgencyMultiplier = urgentNeed?.urgency || 0.5;
    
    return {
      xp: Math.floor(base.xp * (1 + urgencyMultiplier)),
      credits: Math.floor(base.credits * (1 + urgencyMultiplier)),
      reputation: {
        [npc.factionId]: Math.floor(base.reputation * (1 + urgencyMultiplier))
      },
      items: [],
      unlocks: []
    };
  }

  /**
   * Calculate relationship bonus based on moral alignment
   */
  calculateRelationshipBonus(urgency, moralAlignment) {
    const baseBonuses = {
      altruistic: 15,
      neutral: 10,
      deceptive: 12,
      criminal: 18
    };
    
    const base = baseBonuses[moralAlignment] || 10;
    return Math.floor(base + (urgency * 10));
  }

  /**
   * Calculate consequences based on moral alignment
   */
  calculateConsequences(npc, moralAlignment, targetNPC, targetLocation) {
    const consequences = {
      reputationChanges: {},
      factionChanges: {}
    };
    
    // Positive consequences for quest giver
    const questGiverBonus = {
      altruistic: 5,
      neutral: 0,
      deceptive: 4,
      criminal: 8
    };
    
    if (npc.factionId) {
      consequences.reputationChanges[npc.factionId] = questGiverBonus[moralAlignment] || 0;
    }
    
    // Negative consequences for targets (deceptive/criminal)
    if (moralAlignment === 'deceptive' || moralAlignment === 'criminal') {
      if (targetNPC?.factionId) {
        consequences.reputationChanges[targetNPC.factionId] = 
          moralAlignment === 'criminal' ? -15 : -5;
      }
      if (targetLocation?.factionId) {
        consequences.reputationChanges[targetLocation.factionId] = 
          moralAlignment === 'criminal' ? -20 : -8;
      }
    }
    
    return consequences;
  }

  /**
   * Generate unique quest ID
   */
  generateQuestId(npc, context, moralAlignment) {
    const timestamp = Date.now();
    const needType = context.urgentNeed?.type || 'general';
    return `mini_${npc.id}_${moralAlignment}_${needType}_${timestamp}`;
  }

  /**
   * Find target NPC for quests
   */
  async findTargetNPC(location) {
    // Find NPCs in same location, excluding quest giver
    const { NPC } = require('../models');
    const npcs = await NPC.findAll({
      where: {
        isAvailable: true,
        location: {
          planet: location?.planet,
          area: location?.area
        }
      },
      limit: 10
    });
    
    if (npcs.length > 0) {
      return npcs[Math.floor(Math.random() * npcs.length)];
    }
    
    return null;
  }

  /**
   * Find target location for quests
   */
  findTargetLocation(npcLocation) {
    // Return nearby location or same location
    return {
      id: `location_${npcLocation?.area || 'unknown'}`,
      name: npcLocation?.area || 'Unknown Location',
      factionId: null
    };
  }

  /**
   * Get target item for theft quests
   */
  getTargetItem() {
    const items = ['credits', 'data_pad', 'weapon', 'supplies', 'artifact'];
    return items[Math.floor(Math.random() * items.length)];
  }

  /**
   * Check if NPC already has active mini-quest
   */
  async hasActiveMiniQuest(npcId, characterId) {
    const { QuestProgress, Quest } = require('../models');
    const activeQuests = await QuestProgress.findAll({
      where: {
        characterId,
        status: 'active'
      },
      include: [{
        model: Quest,
        where: {
          questType: 'mini',
          questGiverId: npcId
        }
      }]
    });
    
    return activeQuests.length > 0;
  }

  /**
   * Clean up expired mini-quests
   */
  async cleanupExpiredMiniQuests() {
    const { Quest } = require('../models');
    const now = new Date();
    const expired = await Quest.findAll({
      where: {
        questType: 'mini',
        isActive: true
      }
    });
    
    for (const quest of expired) {
      const expiresAt = quest.miniQuestData?.expiresAt;
      if (expiresAt && new Date(expiresAt) < now) {
        await quest.update({ isActive: false });
      }
    }
  }
}

module.exports = new MiniQuestService();
```

---

### Phase 3: Integration with Existing Systems

#### 3.1 Update Behavior Tree Service

**File:** `backend/src/services/behaviorTreeService.js`

**Changes:**
- When player accepts help offer, generate mini-quest with moral alignment
- Pass mini-quest ID and moral alignment in behavior context

**Code:**
```javascript
// In acceptHelpBranch action
execute: async (ctx) => {
  const motivationService = require('./motivationService');
  const miniQuestService = require('./miniQuestService');
  const urgentNeeds = motivationService.getUrgentNeeds(npc);
  const mostUrgent = urgentNeeds[0];
  
  if (mostUrgent) {
    // Generate mini-quest (moral alignment determined by NPC)
    const miniQuest = await miniQuestService.generateMiniQuest(
      npc,
      ctx.character,
      { urgentNeed: mostUrgent }
    );
    
    const moralAlignment = miniQuest.moralAlignment;
    const responseTemplates = {
      altruistic: `*relief washes over their face* Thank you! ${actionDescription} This would mean a lot to me.`,
      neutral: `I appreciate it. ${actionDescription} Can you help me with this?`,
      deceptive: `*looks around nervously* I need you to ${actionDescription}. Can you do this for me?`,
      criminal: `*eyes narrow* I need you to ${actionDescription}. This is important, and I'll make it worth your while.`
    };
    
    ctx.response = responseTemplates[moralAlignment] || responseTemplates.neutral;
    ctx.offerQuest = true;
    ctx.questId = miniQuest.id;
    ctx.questType = 'mini';
    ctx.moralAlignment = moralAlignment;
    ctx.priority = 'high';
    ctx.acceptHelp = true;
    ctx.behaviorOverride = true;
  }
}
```

#### 3.2 Update Quest Service

**File:** `backend/src/services/questService.js`

**Changes:**
1. Add method to get mini-quests separately
2. Add method to filter by moral alignment
3. Update completion handler to apply relationship bonus and consequences
4. Filter mini-quests in main quest lists (optional)

**Code:**
```javascript
/**
 * Get available mini-quests for character
 */
async getAvailableMiniQuests(characterId, moralAlignment = null) {
  const allQuests = await this.getAvailableQuests(characterId);
  let miniQuests = allQuests.filter(q => q.questType === 'mini');
  
  if (moralAlignment) {
    miniQuests = miniQuests.filter(q => 
      q.moralAlignment === moralAlignment || 
      q.miniQuestData?.moralAlignment === moralAlignment
    );
  }
  
  return miniQuests;
}

/**
 * Complete mini-quest with relationship bonus and consequences
 */
async completeQuest(characterId, questId) {
  // ... existing completion logic ...
  
  const quest = await Quest.findByPk(questId);
  
  // If mini-quest, apply relationship bonus and consequences
  if (quest.questType === 'mini' && quest.miniQuestData) {
    const npcId = quest.questGiverId;
    if (npcId) {
      const npc = await NPC.findByPk(npcId);
      const { NPCRelationship } = require('../models');
      const relationship = await NPCRelationship.findOne({
        where: { characterId, npcId }
      });
      
      if (relationship) {
        const bonus = quest.miniQuestData.relationshipBonus || 10;
        relationship.increaseRelationship(bonus);
        await relationship.save();
      }
      
      // Apply reputation consequences
      const consequences = quest.miniQuestData.consequences || {};
      if (consequences.reputationChanges) {
        const factionService = require('./factionService');
        for (const [factionId, change] of Object.entries(consequences.reputationChanges)) {
          if (change !== 0) {
            await factionService.updateReputation(characterId, factionId, change);
          }
        }
      }
    }
  }
  
  // ... rest of completion logic ...
}
```

#### 3.3 Update NPC Service

**File:** `backend/src/services/npcService.js`

**Changes:**
- When behavior tree offers quest, check if it's a mini-quest
- Return quest ID and moral alignment in response

**Code:**
```javascript
// In processDialogue, when behaviorContext.offerQuest is true
if (behaviorContext.offerQuest && behaviorContext.questId) {
  return {
    response: behaviorContext.response,
    relationshipLevel: relationship.relationshipLevel,
    relationshipTier: relationship.getRelationshipTier(),
    offerQuest: true,
    questId: behaviorContext.questId,
    questType: behaviorContext.questType || 'mini',
    moralAlignment: behaviorContext.moralAlignment
  };
}
```

---

### Phase 4: Frontend Integration

#### 4.1 Quest List Component Updates

**Files:** `frontend/src/components/quests/QuestList.jsx` (or similar)

**Changes:**
1. Add filter for mini-quests
2. Add filter for moral alignment
3. Display mini-quests in separate section or with badge
4. Show relationship bonus and consequences in quest card
5. Color-code by moral alignment

**UI Elements:**
- "Mini-Quests" tab or section
- Moral alignment filters (All, Altruistic, Neutral, Deceptive, Criminal)
- Badge/icon indicating mini-quest type and moral alignment
- Relationship bonus indicator
- Consequences warning for deceptive/criminal quests
- Simpler quest card design for mini-quests

#### 4.2 Quest Card Component

**File:** `frontend/src/components/quests/QuestCard.jsx` (or similar)

**Changes:**
- Detect mini-quest type
- Display appropriate styling based on moral alignment
- Show relationship bonus
- Show consequences (reputation changes)
- Show expiration time if applicable
- Warning indicators for illegal quests

**Code:**
```jsx
{quest.questType === 'mini' && (
  <div className={`quest-badge mini-quest ${quest.moralAlignment || 'neutral'}`}>
    <span className="badge-icon">
      {quest.moralAlignment === 'altruistic' && '💝'}
      {quest.moralAlignment === 'neutral' && '📋'}
      {quest.moralAlignment === 'deceptive' && '🎭'}
      {quest.moralAlignment === 'criminal' && '⚔️'}
    </span>
    <span className="badge-text">
      {quest.moralAlignment === 'altruistic' && 'Altruistic'}
      {quest.moralAlignment === 'neutral' && 'Neutral'}
      {quest.moralAlignment === 'deceptive' && 'Deceptive'}
      {quest.moralAlignment === 'criminal' && 'Criminal'}
    </span>
  </div>
)}

{quest.miniQuestData?.relationshipBonus && (
  <div className="relationship-bonus">
    +{quest.miniQuestData.relationshipBonus} Relationship
  </div>
)}

{quest.miniQuestData?.consequences?.reputationChanges && 
 Object.keys(quest.miniQuestData.consequences.reputationChanges).length > 0 && (
  <div className="consequences-warning">
    <span className="warning-icon">⚠️</span>
    <span className="warning-text">This quest will affect your reputation</span>
  </div>
)}

{quest.objectives?.some(o => o.illegal) && (
  <div className="illegal-warning">
    <span className="warning-icon">🚨</span>
    <span className="warning-text">Illegal Activity</span>
  </div>
)}
```

#### 4.3 Dialogue Interface Updates

**File:** `frontend/src/features/dialogue/DialogueInterface.jsx`

**Changes:**
- When NPC offers mini-quest, show accept button with moral alignment indicator
- Display quest preview when offered
- Show consequences warning for deceptive/criminal quests
- Handle quest acceptance

---

### Phase 5: Objective Type Extensions

#### 5.1 New Objective Types

**File:** `backend/src/models/Quest.js` (update validation)

**New Objective Types:**
- `deceive`: Deceive an NPC
- `sabotage`: Sabotage equipment/location
- `steal`: Steal item (illegal)
- `attack`: Attack NPC (illegal)
- `eliminate`: Kill NPC (illegal, most severe)

**Code:**
```javascript
// Update objective type validation in quest service
const validObjectiveTypes = [
  'interact', 'discover', 'collect', 'defeat', 'travel', 'deliver', 
  'custom', 'clear_dungeon', 'defeat_boss', 'reach_depth',
  'deceive', 'sabotage', 'steal', 'attack', 'eliminate' // New types
];
```

---

## Database Schema Changes

### Migration: 013-add-mini-quest-support.js

```javascript
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add moral_alignment column
    const tableDescription = await queryInterface.describeTable('quests');
    if (!tableDescription.moral_alignment) {
      await queryInterface.addColumn('quests', 'moral_alignment', {
        type: Sequelize.STRING(20),
        allowNull: true,
        comment: 'Moral alignment: altruistic, neutral, deceptive, criminal'
      });
      console.log('  ✓ Added moral_alignment column to quests table');
    }

    // Add mini_quest_data column
    if (!tableDescription.mini_quest_data) {
      await queryInterface.addColumn('quests', 'mini_quest_data', {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {
          needType: null,
          motivationType: null,
          urgency: 0.5,
          generatedFrom: null,
          expiresAt: null,
          relationshipBonus: 0,
          moralAlignment: null,
          consequences: {
            reputationChanges: {},
            factionChanges: {}
          }
        },
        comment: 'Mini-quest specific metadata'
      });
      console.log('  ✓ Added mini_quest_data column to quests table');
    }

    // Add indexes
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_quests_mini_quest_data 
      ON quests USING GIN (mini_quest_data);
    `);
    
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_quests_type_mini 
      ON quests (quest_type) 
      WHERE quest_type = 'mini';
    `);
    
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_quests_moral_alignment 
      ON quests (moral_alignment) 
      WHERE quest_type = 'mini';
    `);
    
    console.log('  ✓ Added indexes for mini-quest queries');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('quests', 'moral_alignment');
    await queryInterface.removeColumn('quests', 'mini_quest_data');
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS idx_quests_mini_quest_data;');
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS idx_quests_type_mini;');
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS idx_quests_moral_alignment;');
  }
};
```

---

## API Endpoints

### New Endpoints

1. **GET /api/quests/mini** - Get available mini-quests
   ```javascript
   // Returns only mini-quests, optionally filtered by moral alignment
   GET /api/quests/mini?characterId=xxx&moralAlignment=altruistic
   ```

2. **POST /api/quests/mini/generate** - Generate mini-quest from NPC need
   ```javascript
   // Generate mini-quest when player accepts help
   POST /api/quests/mini/generate
   Body: { npcId, characterId, needType }
   ```

3. **GET /api/quests/mini/active** - Get active mini-quests
   ```javascript
   // Get player's active mini-quests
   GET /api/quests/mini/active?characterId=xxx&moralAlignment=criminal
   ```

### Updated Endpoints

1. **GET /api/quests** - Add filter parameters
   ```javascript
   // Filter by quest type and moral alignment
   GET /api/quests?characterId=xxx&type=mini&moralAlignment=altruistic
   GET /api/quests?characterId=xxx&excludeType=mini
   ```

---

## Testing Strategy

### Unit Tests

1. **Moral Alignment Determination**
   - Test alignment calculation from personality traits
   - Test faction modifiers
   - Test motivation type influence
   - Test urgency impact

2. **Quest Generation**
   - Test altruistic quest generation
   - Test neutral quest generation
   - Test deceptive quest generation
   - Test criminal quest generation
   - Test objective generation for each type

3. **Consequences Calculation**
   - Test reputation changes for each alignment
   - Test faction reputation impacts
   - Test relationship bonuses

### Integration Tests

1. **Full Flow - Altruistic**
   - NPC expresses need
   - Player offers help
   - Altruistic mini-quest generated
   - Player completes quest
   - Relationship bonus applied
   - Positive reputation changes

2. **Full Flow - Criminal**
   - NPC with evil personality expresses need
   - Player offers help
   - Criminal mini-quest generated
   - Player completes quest
   - Relationship bonus applied
   - Negative reputation changes for target faction

3. **Quest Separation**
   - Mini-quests don't appear in main quest lists
   - Mini-quests can be filtered by moral alignment
   - Mini-quests don't affect main quest prerequisites

### Performance Tests

1. **Generation Performance**
   - Mini-quest generation < 100ms
   - No database query spikes
   - Alignment calculation < 10ms

2. **Cleanup Performance**
   - Expired quest cleanup < 500ms for 1000 quests

---

## Success Criteria

1. ✅ Mini-quests span full moral spectrum
2. ✅ Moral alignment determined by NPC personality and motivation
3. ✅ Altruistic quests provide positive reputation
4. ✅ Criminal quests provide negative reputation for targets
5. ✅ Quest generation reflects NPC personality
6. ✅ UI clearly indicates moral alignment
7. ✅ Consequences properly applied on completion
8. ✅ No performance degradation

---

## Implementation Timeline

### Week 1: Foundation
- Database migration
- Quest model updates
- Moral alignment system
- Mini-quest service skeleton

### Week 2: Generation System
- Moral alignment determination
- Quest type generation (all 4 types)
- Objective generation for all types
- Reward and consequence calculation

### Week 3: Integration
- Behavior tree integration
- Quest service updates
- NPC service updates
- Consequence application

### Week 4: Frontend & Polish
- UI components with moral indicators
- Quest filtering by alignment
- Warning systems for illegal quests
- Testing and bug fixes

**Total Duration:** 4 weeks

---

## Risk Mitigation

### Risks

1. **Quest Spam**: Too many mini-quests generated
   - **Mitigation**: Limit active mini-quests per NPC, expiration system

2. **Moral Balance**: Too many evil quests or too few
   - **Mitigation**: Configurable alignment distribution, personality-based weighting

3. **Reputation Exploitation**: Players gaming reputation system
   - **Mitigation**: Balanced consequences, cooldowns on reputation changes

4. **Performance**: Generation overhead
   - **Mitigation**: Caching, async generation, cleanup jobs

5. **Content Concerns**: Violent/illegal quest content
   - **Mitigation**: Clear warnings, optional filtering, content ratings

---

## Future Enhancements

1. **Moral Choice System**: Player choices affect alignment
2. **Reputation Tracking**: Track player's moral alignment based on quest choices
3. **Dynamic Consequences**: More complex reputation webs
4. **Quest Chains**: Related mini-quests from same NPC
5. **Location-Based**: Mini-quests tied to specific locations
6. **Time-Sensitive**: More urgent mini-quests with shorter expiration
7. **Faction Reactions**: Factions react to player's moral choices

---

## Conclusion

The Mini-Quest system will provide players with meaningful, interpersonal quest opportunities that reflect the full moral spectrum of the Star Wars universe. NPCs with different personalities, motivations, and factions will offer quests ranging from altruistic help to criminal activities, creating a rich and diverse questing experience that builds relationships while maintaining separation from the main storyline.

**Status:** Ready for Implementation
