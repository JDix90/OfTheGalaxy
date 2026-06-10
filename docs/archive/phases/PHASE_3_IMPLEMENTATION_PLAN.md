# Phase 3: The Dangerous World - Implementation Plan

## 📋 Executive Summary

**Goal:** Introduce conflict and deeper exploration. Complete the core RPG loop for 1.0 launch.

**Timeline:** Weeks 1-9 (9 weeks / ~2-3 months)

**Outcome:** 1.0 LAUNCH CANDIDATE - The core RPG loop is complete. Players can explore, fight, trade, and progress.

---

## 🎯 Phase 3 Overview

### Key Features
1. **Simplified Combat System (Turn-Based)** - Weeks 1-6
2. **Enhanced Exploration** - Weeks 7-9
3. **Quest Integration Polish** - Throughout

### Success Criteria
- [ ] Turn-based combat functional
- [ ] Combat encounters trigger correctly
- [ ] Victory/defeat conditions work
- [ ] Combat rewards distributed
- [ ] POI interactions work
- [ ] Fast travel functional
- [ ] All core systems integrated

---

## 🗡️ 3.1 Simplified Combat System (Turn-Based)

### Timeline: Weeks 1-6 (6 weeks)

### Why Turn-Based?
- ✅ Faster to implement than real-time
- ✅ Easier to balance
- ✅ Less prone to latency issues
- ✅ More strategic gameplay
- ✅ Can be enhanced to real-time post-launch

---

### 3.1.1 Database Schema & Models

**Migration:** `007-create-combat.js`

**Tables to Create:**
1. `combat_encounters` - Active combat sessions
2. `combat_actions` - Action history (optional, for replay/debugging)
3. `enemy_templates` - Enemy definitions (optional, can use JSONB in encounters)

**Key Fields:**
```javascript
combat_encounters:
  - id (UUID)
  - characterId (UUID, FK to player_characters)
  - encounterType (STRING) - 'random', 'quest', 'scripted', 'bounty'
  - combatants (JSONB) - Array of combatant objects with stats
  - turnOrder (JSONB) - Array of combatant IDs in initiative order
  - currentTurn (INTEGER) - Index into turnOrder
  - status (STRING) - 'active', 'won', 'lost', 'fled'
  - startedAt (TIMESTAMP)
  - endedAt (TIMESTAMP)
```

**Combatant JSONB Structure:**
```javascript
{
  id: "combatant_uuid",
  name: "Stormtrooper",
  type: "enemy", // or "player", "companion"
  stats: {
    health: 100,
    maxHealth: 100,
    stamina: 50,
    maxStamina: 50,
    attack: 15,
    defense: 10,
    speed: 12,
    accuracy: 75
  },
  equipment: {
    weapon: { itemId: "blaster_rifle_01", damage: 20 },
    armor: { itemId: "stormtrooper_armor", defense: 15 }
  },
  statusEffects: [], // Array of active status effects
  position: { x: 0, y: 0 } // For visual positioning
}
```

---

### 3.1.2 Backend Services

**File:** `backend/src/services/combatService.js`

**Core Methods:**
1. `createEncounter(characterId, encounterType, enemies)` - Initialize combat
2. `rollInitiative(combatants)` - Calculate turn order based on speed
3. `executeAction(encounterId, combatantId, actionType, targetId, params)` - Process combat action
4. `checkVictoryConditions(encounterId)` - Check if combat is over
5. `endEncounter(encounterId, status)` - Finalize combat and distribute rewards
6. `calculateDamage(attacker, defender, action)` - Damage calculation
7. `applyStatusEffect(combatantId, effect)` - Apply buffs/debuffs
8. `getEncounterState(encounterId)` - Get current combat state

**Action Types:**
- `attack` - Basic weapon attack
- `defend` - Increase defense for this turn
- `use_item` - Use consumable item
- `ability` - Use character ability/skill
- `flee` - Attempt to escape combat

**Damage Calculation:**
```javascript
baseDamage = attacker.stats.attack + weapon.damage
defense = defender.stats.defense + armor.defense
finalDamage = Math.max(1, baseDamage - defense)
// Apply accuracy roll (75% = 75% chance to hit)
if (Math.random() * 100 > attacker.stats.accuracy) {
  finalDamage = 0; // Miss
}
```

**Reward Distribution:**
- XP based on enemy level/difficulty
- Credits based on enemy type
- Loot items (from enemy loot table)
- Discovery rewards (if first combat encounter in location)

---

### 3.1.3 Backend Controllers & Routes

**File:** `backend/src/controllers/combatController.js`

**Endpoints:**
- `POST /api/combat/start` - Start a new encounter
- `GET /api/combat/:encounterId` - Get encounter state
- `POST /api/combat/:encounterId/action` - Execute combat action
- `POST /api/combat/:encounterId/flee` - Attempt to flee
- `GET /api/combat/:encounterId/history` - Get action history (optional)

**File:** `backend/src/routes/combatRoutes.js`

---

### 3.1.4 Enemy System

**Enemy Templates:**
```javascript
// backend/src/data/enemyTemplates.js
const enemyTemplates = {
  stormtrooper: {
    name: "Stormtrooper",
    level: 1,
    stats: {
      health: 100,
      maxHealth: 100,
      stamina: 50,
      maxStamina: 50,
      attack: 15,
      defense: 10,
      speed: 12,
      accuracy: 60 // Stormtroopers miss a lot!
    },
    equipment: {
      weapon: { itemId: "blaster_rifle_01", damage: 20 },
      armor: { itemId: "stormtrooper_armor", defense: 15 }
    },
    lootTable: [
      { itemId: "blaster_rifle_01", chance: 0.1 },
      { itemId: "credits", quantity: 50, chance: 1.0 }
    ],
    xpReward: 25,
    creditsReward: 50
  },
  // ... more enemies
};
```

**Enemy Generation:**
- Scale enemy stats based on player level
- Randomize equipment and stats slightly
- Generate appropriate enemies for planet/system danger level

---

### 3.1.5 Frontend Implementation

**Components to Create:**
```
frontend/src/features/combat/
├── CombatView.jsx          # Main combat container
├── CombatView.css
├── CombatantDisplay.jsx     # Individual combatant (player/enemy)
├── CombatantDisplay.css
├── ActionMenu.jsx           # Action selection menu
├── ActionMenu.css
├── TurnOrder.jsx            # Turn order indicator
├── TurnOrder.css
├── CombatLog.jsx            # Action log
├── CombatLog.css
└── VictoryScreen.jsx        # Victory/defeat screen
```

**Combat Flow:**
1. Player triggers encounter (random, quest, or scripted)
2. `CombatView` loads encounter state
3. Display combatants (player + enemies)
4. Show turn order
5. Player selects action from `ActionMenu`
6. Execute action via API
7. Update combat state
8. Process enemy turns (AI)
9. Check victory/defeat conditions
10. Show `VictoryScreen` with rewards
11. Return to game world

**State Management:**
- Create `combatSlice.js` (Zustand store)
- Store current encounter state
- Handle action execution
- Update combat state after each action

**API Integration:**
- `combatApi.js` - API calls for combat operations
- Real-time state updates (polling or WebSocket if needed)

---

### 3.1.6 Combat Encounter Triggers

**Where Combat Can Trigger:**
1. **Random Encounters** - On planet surface (based on danger level)
2. **Quest Encounters** - Scripted combat for quest objectives
3. **POI Encounters** - Entering dangerous POIs (pirates, hostile bases)
4. **Bounty Encounters** - Bounty quest targets
5. **Faction Conflicts** - Hostile faction members attack

**Implementation:**
- Add `dangerLevel` to planet/system data
- Random encounter chance based on danger level
- Quest system integration (combat objectives)
- POI interaction system (trigger combat on entry)

---

### 3.1.7 Integration Points

**Inventory System:**
- Use equipped weapons/armor in combat
- Consumable items usable in combat
- Loot items added to inventory after victory

**Character System:**
- Character stats affect combat (strength, agility, etc.)
- XP awarded after combat
- Health/stamina updates persist

**Quest System:**
- Combat objectives (defeat X enemies, defeat boss)
- Quest rewards after combat completion

**Discovery System:**
- First combat encounter in location = discovery
- Combat rewards include discovery bonuses

**Faction System:**
- Faction reputation affects enemy spawns
- Hostile factions attack player
- Friendly factions provide combat assistance (future)

---

## 🗺️ 3.2 Enhanced Exploration

### Timeline: Weeks 7-9 (3 weeks)

### 3.2.1 POI Interaction System

**Current State:**
- POIs exist on planet maps
- Players can click to view POI details
- Players can enter POIs (sub-maps)

**Enhancements:**
1. **POI Interaction Types:**
   - **Combat POIs** - Trigger combat encounters
   - **Loot POIs** - Search for items/credits
   - **Quest POIs** - Trigger quest events
   - **Discovery POIs** - Hidden locations
   - **Fast Travel POIs** - Fast travel points

2. **POI Interaction UI:**
   - Context menu when clicking POI
   - Options: "Enter", "Search", "Investigate", "Fast Travel"
   - Different options based on POI type

3. **POI States:**
   - `undiscovered` - Not yet found
   - `discovered` - Found but not interacted with
   - `searched` - Already looted
   - `completed` - Quest/objective completed

**Implementation:**
- Add `interactionType` to POI data
- Add `interactionState` to player's POI tracking
- Create `POIInteractionMenu` component
- Integrate with combat, quest, and discovery systems

---

### 3.2.2 Fast Travel System

**Features:**
- Unlock fast travel points by discovering them
- Fast travel between discovered locations
- Cost: Credits or time (or free)
- Restrictions: Cannot fast travel during combat, in certain quests

**Implementation:**
- Add `fastTravelPoints` to planet map data
- Track discovered fast travel points in discovery system
- Create `FastTravelMenu` component
- Add fast travel API endpoint
- Update character location after fast travel

**Fast Travel UI:**
- Show available fast travel points
- Display travel cost
- Confirm travel
- Show travel animation/loading

---

### 3.2.3 Exploration Achievements

**Achievement Types:**
- Discovery milestones (10 planets, 50 locations, etc.)
- Combat achievements (defeat 100 enemies, defeat boss, etc.)
- Exploration achievements (visit all systems, complete all planets)

**Implementation:**
- Create `achievements` table (optional, can use discovery stats)
- Track achievement progress
- Display achievements in UI
- Award achievement rewards

**UI:**
- Add "Achievements" section to Exploration Journal
- Show progress bars
- Display unlocked achievements
- Show achievement rewards

---

### 3.2.4 Hidden Locations

**Current State:**
- Discovery system supports hidden locations
- No content generation yet

**Implementation:**
- Generate hidden locations on planet maps
- Hidden locations require investigation/search to discover
- Higher rewards for hidden locations
- Special loot/quests in hidden locations

**Content:**
- Create hidden location templates
- Integrate with planet map generation
- Add visual indicators (subtle hints)

---

## 🔗 3.3 Quest Integration Polish

### Timeline: Throughout Phase 3

### 3.3.1 Combat Quest Objectives

**Quest Objective Types:**
- `defeat_enemy` - Defeat specific enemy type
- `defeat_boss` - Defeat boss enemy
- `defeat_count` - Defeat X enemies
- `survive_combat` - Survive combat encounter
- `protect_npc` - Protect NPC during combat

**Implementation:**
- Add combat objective types to quest system
- Track combat progress in quest objectives
- Update quest progress after combat
- Complete quest when combat objectives met

---

### 3.3.2 Quest Rewards Integration

**Reward Types:**
- XP rewards
- Credit rewards
- Item rewards (add to inventory)
- Faction reputation rewards
- Discovery unlocks

**Implementation:**
- Integrate quest completion with all reward systems
- Show reward summary after quest completion
- Update character stats/inventory automatically

---

### 3.3.3 Quest Chain Integration

**Features:**
- Quest chains (series of related quests)
- Quest prerequisites
- Quest branching (choices affect outcomes)

**Implementation:**
- Add `questChain` and `prerequisites` to quest data
- Check prerequisites before offering quest
- Auto-offer next quest in chain after completion
- Track quest choices in quest progress

---

## 📊 Implementation Checklist

### Week 1-2: Combat Foundation
- [ ] Create combat database migration
- [ ] Create CombatEncounter model
- [ ] Create combat service (core methods)
- [ ] Create enemy templates
- [ ] Create combat controller and routes
- [ ] Test backend combat logic

### Week 3-4: Combat Frontend
- [ ] Create combat API service
- [ ] Create combat Zustand store
- [ ] Create CombatView component
- [ ] Create CombatantDisplay component
- [ ] Create ActionMenu component
- [ ] Create TurnOrder component
- [ ] Create CombatLog component
- [ ] Test combat UI flow

### Week 5-6: Combat Integration
- [ ] Integrate combat with inventory (equipment)
- [ ] Integrate combat with character stats
- [ ] Add combat encounter triggers
- [ ] Add random encounter system
- [ ] Add quest combat objectives
- [ ] Add combat rewards
- [ ] Test full combat flow

### Week 7: POI Interactions
- [ ] Add POI interaction types
- [ ] Create POI interaction menu
- [ ] Integrate POI interactions with combat
- [ ] Integrate POI interactions with quests
- [ ] Add POI state tracking
- [ ] Test POI interactions

### Week 8: Fast Travel
- [ ] Add fast travel points to planet data
- [ ] Create fast travel menu
- [ ] Add fast travel API endpoint
- [ ] Integrate with discovery system
- [ ] Add travel restrictions
- [ ] Test fast travel system

### Week 9: Polish & Integration
- [ ] Add exploration achievements
- [ ] Polish combat UI/UX
- [ ] Add combat animations/effects
- [ ] Test all integration points
- [ ] Bug fixes and optimization
- [ ] Final testing

---

## 🎯 Success Criteria

### Combat System
- [ ] Player can initiate combat
- [ ] Turn-based combat works correctly
- [ ] Player can attack, defend, use items, flee
- [ ] Enemy AI takes turns
- [ ] Victory/defeat conditions work
- [ ] Rewards distributed correctly
- [ ] Equipment affects combat stats

### Exploration
- [ ] POI interactions work
- [ ] Fast travel functional
- [ ] Hidden locations discoverable
- [ ] Exploration achievements track progress

### Integration
- [ ] Combat integrates with inventory
- [ ] Combat integrates with quests
- [ ] Combat integrates with discovery
- [ ] All systems work together

---

## 🚀 Ready to Begin

**Phase 2 Status:** ✅ Complete  
**Phase 3 Plan:** ✅ Ready  
**Next Step:** Begin Week 1-2 implementation (Combat Foundation)

---

**Document Created:** Current Date  
**Status:** Ready for Implementation  
**Timeline:** 9 weeks to 1.0 Launch Candidate


