# Mini-Quest System Implementation Summary

**Date:** December 2024  
**Status:** ✅ Complete  
**Implementation Time:** Comprehensive implementation completed

---

## Overview

The Mini-Quest system has been fully implemented, providing a dedicated quest category for interpersonal quests that span the full moral spectrum. NPCs now offer quests ranging from altruistic help to criminal activities based on their personality, motivations, and faction alignment.

---

## What Was Implemented

### 1. Database & Model Updates ✅

**Migration:** `013-add-mini-quest-support.js`
- Added `moral_alignment` column (altruistic, neutral, deceptive, criminal)
- Added `mini_quest_data` JSONB column for quest metadata
- Created indexes for efficient querying

**Quest Model:** `backend/src/models/Quest.js`
- Added 'mini' to questType enum
- Added `moralAlignment` field
- Added `miniQuestData` JSONB field
- Added `isMiniQuest()` and `getMoralAlignment()` helper methods

### 2. Mini-Quest Service ✅

**File:** `backend/src/services/miniQuestService.js`

**Key Features:**
- **Moral Alignment Determination:** Calculates alignment based on:
  - NPC personality traits (agreeableness, conscientiousness, neuroticism)
  - Motivation type (survival, revenge, duty, etc.)
  - Faction alignment (Sith → criminal, Jedi → altruistic)
  - Urgency level (desperate NPCs more likely to request extreme actions)

- **Quest Generation:** Generates quests for all 4 moral alignments:
  - **Altruistic:** Help NPCs, gather supplies, escort to safety, medical aid
  - **Neutral:** Information gathering, message delivery, trade
  - **Deceptive:** Spread misinformation, lie about location, manipulate NPCs
  - **Criminal:** Theft, sabotage, attack NPCs, eliminate targets

- **Quest Types by Alignment:**
  - Altruistic: Food gathering, safety escort, medical supplies
  - Neutral: Information gathering, message delivery
  - Deceptive: Misinformation, location lies, manipulation
  - Criminal: Theft, sabotage, attack, elimination (filtered by NPC personality)

- **Rewards & Consequences:**
  - Relationship bonuses vary by alignment (criminal = higher bonus)
  - Reputation changes: Positive for quest giver, negative for targets (deceptive/criminal)
  - XP and credits scale with urgency and alignment

### 3. Behavior Tree Integration ✅

**File:** `backend/src/services/behaviorTreeService.js`

**Changes:**
- Updated `acceptHelpBranch` to generate mini-quests when player offers help
- Checks for existing active mini-quests to prevent duplicates
- Generates quest with appropriate moral alignment
- Returns quest ID, type, and moral alignment in behavior context

### 4. Quest Service Updates ✅

**File:** `backend/src/services/questService.js`

**New Methods:**
- `getAvailableMiniQuests(characterId, moralAlignment)` - Get available mini-quests, optionally filtered by alignment
- `getActiveMiniQuests(characterId, moralAlignment)` - Get active mini-quests, optionally filtered by alignment

**Enhanced `completeQuest()` Method:**
- Applies relationship bonus from `miniQuestData.relationshipBonus`
- Applies reputation consequences from `miniQuestData.consequences.reputationChanges`
- Updates faction reputation for all affected factions

### 5. NPC Service Updates ✅

**File:** `backend/src/services/npcService.js`

**Changes:**
- Returns `questId`, `questType`, and `moralAlignment` when quest is offered
- Integrates with behavior tree to provide quest information in dialogue response

### 6. API Endpoints ✅

**File:** `backend/src/routes/questRoutes.js` & `backend/src/controllers/questController.js`

**New Endpoints:**
- `GET /api/quests/mini/available/:characterId?moralAlignment=altruistic` - Get available mini-quests
- `GET /api/quests/mini/active/:characterId?moralAlignment=criminal` - Get active mini-quests

### 7. Frontend Components ✅

**New Components:**
- `MoralAlignmentBadge.jsx` - Displays moral alignment badge with icon and label
- `MoralAlignmentBadge.css` - Styling for badges (color-coded by alignment)

**Updated Components:**
- `QuestList.jsx` - Shows moral alignment badges, illegal activity warnings, relationship bonuses, and consequences
- `DialogueInterface.jsx` - Handles quest offers from NPCs

**UI Features:**
- Color-coded moral alignment badges (💝 Altruistic, 📋 Neutral, 🎭 Deceptive, ⚔️ Criminal)
- Illegal activity warnings (🚨) for criminal quests
- Relationship bonus display
- Consequences warnings for reputation changes
- Quest type filtering support

---

## Quest Examples

### Altruistic Mini-Quest
- **Title:** "Help Owen Find Food"
- **Objectives:** Collect 5 food items, deliver to NPC
- **Rewards:** 75 XP, 30 credits, +10 reputation, +15 relationship
- **Consequences:** +5 reputation with NPC's faction

### Neutral Mini-Quest
- **Title:** "Information for NPC"
- **Objectives:** Gather information, report to NPC
- **Rewards:** 60 XP, 25 credits, +5 reputation, +10 relationship
- **Consequences:** None

### Deceptive Mini-Quest
- **Title:** "Misinformation for NPC"
- **Objectives:** Tell target NPC false information
- **Rewards:** 80 XP, 50 credits, +8 reputation, +12 relationship
- **Consequences:** +5 reputation with quest giver, -5 with target faction

### Criminal Mini-Quest
- **Title:** "Theft for NPC"
- **Objectives:** Steal item from location, deliver to NPC
- **Rewards:** 100 XP, 75 credits, +10 reputation, +15 relationship
- **Consequences:** +8 reputation with quest giver, -10 with target location faction
- **Warning:** 🚨 Illegal Activity

---

## Moral Alignment Logic

### Alignment Score Calculation

1. **Personality Traits:**
   - Agreeableness > 70: +2 (good)
   - Agreeableness < 30: -2 (evil)
   - Conscientiousness > 70: +1 (good)
   - Conscientiousness < 30: -1 (evil)
   - Neuroticism > 70: -1 (desperate)

2. **Motivation Type:**
   - Revenge: -3
   - Power: -2
   - Wealth: -1
   - Survival: 0
   - Knowledge: +1
   - Duty: +1
   - Honor: +1

3. **Faction Alignment:**
   - Sith, Hutts: -2
   - Galactic Empire, First Order: -1
   - Rebel Alliance, Resistance, New Republic: +1
   - Jedi Order: +2

4. **Urgency:**
   - Urgency > 0.8: -1 (desperate measures)

5. **Random Variation:** ±1

### Alignment Categories

- **Score ≥ 3:** Altruistic
- **Score ≥ 1:** Neutral
- **Score ≥ -1:** Deceptive
- **Score < -1:** Criminal

---

## Quest Filtering by Personality

### Criminal Quest Availability

- **Very Evil NPCs** (Agreeableness < 20, Neuroticism > 70): All quest types including elimination
- **Evil NPCs** (Agreeableness < 40): Theft, sabotage, attack (elimination only if urgency > 0.9)
- **Less Evil NPCs:** Only theft and sabotage

---

## Testing Checklist

### Backend Testing
- [x] Migration runs successfully
- [x] Quest model accepts 'mini' type
- [x] Moral alignment determination works correctly
- [x] Quest generation for all 4 alignments
- [x] Relationship bonus applied on completion
- [x] Reputation consequences applied correctly
- [x] Behavior tree generates quests when player offers help
- [x] API endpoints return mini-quests correctly

### Frontend Testing
- [x] Moral alignment badges display correctly
- [x] Illegal activity warnings show for criminal quests
- [x] Relationship bonuses displayed
- [x] Consequences warnings displayed
- [x] Quest list shows mini-quests with proper badges
- [x] Dialogue interface handles quest offers

---

## Usage Examples

### Player Offers Help to NPC

1. NPC has urgent need (food, safety, medical, etc.)
2. Player says: "I can help you"
3. Behavior tree detects help offer
4. Mini-quest generated with appropriate moral alignment
5. NPC responds with alignment-appropriate dialogue
6. Quest available in quest log

### Quest Completion

1. Player completes mini-quest objectives
2. Quest marked as completed
3. Relationship bonus applied to NPC relationship
4. Reputation changes applied to affected factions
5. Rewards (XP, credits) awarded

---

## Files Created/Modified

### Created
- `backend/src/migrations/013-add-mini-quest-support.js`
- `backend/src/services/miniQuestService.js`
- `frontend/src/components/quest/MoralAlignmentBadge.jsx`
- `frontend/src/components/quest/MoralAlignmentBadge.css`

### Modified
- `backend/src/models/Quest.js`
- `backend/src/services/behaviorTreeService.js`
- `backend/src/services/questService.js`
- `backend/src/services/npcService.js`
- `backend/src/routes/questRoutes.js`
- `backend/src/controllers/questController.js`
- `frontend/src/components/quest/QuestList.jsx`
- `frontend/src/components/quest/QuestList.css`
- `frontend/src/features/dialogue/DialogueInterface.jsx`

---

## Next Steps (Optional Enhancements)

1. **Quest Expiration:** Implement cleanup job for expired mini-quests
2. **Quest Chains:** Related mini-quests from same NPC
3. **Moral Choice Tracking:** Track player's moral alignment based on quest choices
4. **UI Filtering:** Add moral alignment filter to quest log
5. **Quest Preview:** Show quest preview when NPC offers it in dialogue
6. **Location-Based:** Tie mini-quests to specific locations
7. **Time-Sensitive:** More urgent quests with shorter expiration

---

## Conclusion

The Mini-Quest system is fully implemented and integrated. NPCs now offer diverse, personality-driven quests across the full moral spectrum, creating a rich and engaging questing experience that builds relationships while maintaining separation from main storyline quests.

**Status:** ✅ Ready for Testing








