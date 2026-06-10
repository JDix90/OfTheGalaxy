# Integration Guide: Connecting New RPG Systems to Existing Code

This guide explains how to integrate the new RPG foundation with your existing *Of the Galaxy* codebase, particularly the faction and galaxy map systems.

## Overview

The Phase 1 Foundation Package is designed to work **alongside** your existing code. You don't need to delete anything—instead, you'll be connecting new systems to existing ones.

## Integration Steps

### 1. Preserve Existing Faction System

Your existing faction system (`source_code/state/factionSlice.js`) is excellent and should be kept intact. The new RPG system references factions but doesn't replace your implementation.

**What to do:**
- Keep your existing `factionSlice.js`
- Keep all faction data files in `backend/data/factions/`
- The new `Quest` and `NPC` models reference `factionId` as a string, which maps to your existing faction IDs

**Example Integration:**
```javascript
// In your existing factionSlice.js, add a helper to get quests for a faction
import { useQuestStore } from './questSlice'; // New RPG system

export const useFactionStore = create((set, get) => ({
  // ... your existing faction state ...
  
  // New helper method
  getFactionsWithQuests: () => {
    const factions = get().factions;
    const questStore = useQuestStore.getState();
    
    return factions.map(faction => ({
      ...faction,
      quests: questStore.getQuestsByFaction(faction.id)
    }));
  }
}));
```

### 2. Integrate Galaxy Map with Character Location

Your existing galaxy map (`source_code/components/ui/EnhancedGalaxyMap.jsx`) should be enhanced to show the player's current location and allow travel.

**What to do:**
- Import `useCharacterStore` into your galaxy map component
- Display the player's current planet
- Add click handlers to allow planet travel

**Example Integration:**
```javascript
// In EnhancedGalaxyMap.jsx
import { useCharacterStore } from '../../state/characterSlice';

export default function EnhancedGalaxyMap() {
  const { currentCharacter, updateLocation } = useCharacterStore();
  
  // ... existing map code ...
  
  const handlePlanetClick = async (planet) => {
    if (currentCharacter) {
      await updateLocation(planet.id, { x: 0, y: 0, area: 'landing_zone' });
      // Show planet surface view
    }
  };
  
  return (
    <div className="galaxy-map">
      {/* Show current location */}
      {currentCharacter && (
        <div className="current-location">
          Current Location: {currentCharacter.currentPlanet}
        </div>
      )}
      
      {/* Your existing map rendering */}
      {planets.map(planet => (
        <Planet
          key={planet.id}
          {...planet}
          isCurrent={planet.id === currentCharacter?.currentPlanet}
          onClick={() => handlePlanetClick(planet)}
        />
      ))}
    </div>
  );
}
```

### 3. Convert Refugee Storyline to Independent Investigators Faction Quest

Your exceptional refugee narrative (Mira Kess, Dr. Senna Voss, Jax Riven, etc.) becomes the main questline for the "Independent Investigators Alliance" faction.

**What to do:**
- Create quest data files in `backend/data/quests/independent_investigators/`
- Convert your existing survivors to NPCs
- Map evidence discovery to quest objectives

**Example Quest Structure:**
```json
{
  "id": "iia_main_01_compound_investigation",
  "factionId": "independent_investigators",
  "questType": "main",
  "title": "Echoes from Compound 7-Alpha",
  "description": "Investigate the mysterious refugees from Compound 7-Alpha...",
  "objectives": [
    {
      "id": "meet_mira",
      "type": "interact",
      "description": "Speak with Mira Kess at the settlement",
      "target": "npc_mira_kess"
    },
    {
      "id": "discover_evidence_1",
      "type": "discover",
      "description": "Uncover evidence about the compound's past",
      "evidenceId": "evidence_mira_t1_childhood"
    }
  ],
  "rewards": {
    "xp": 500,
    "credits": 200,
    "reputation": {
      "independent_investigators": 25
    }
  }
}
```

**Example NPC Conversion:**
```json
{
  "id": "npc_mira_kess",
  "name": "Mira Kess",
  "species": "human",
  "occupation": "Former Compound Resident",
  "factionId": "independent_investigators",
  "location": {
    "planet": "chandrila",
    "area": "refugee_settlement",
    "x": 120,
    "y": 85
  },
  "npcType": "quest_giver",
  "isCompanion": true,
  "dialogue": {
    "greeting": {
      "stranger": "I don't know you. What do you want?",
      "acquaintance": "Oh, you again. What is it?",
      "friend": "Good to see a friendly face.",
      "confidant": "I'm glad you're here. I need to tell you something..."
    }
  },
  "quests": ["iia_main_01_compound_investigation"],
  "biography": "Mira Kess survived the horrors of Compound 7-Alpha...",
  "personalityTraits": {
    "empathy": 75,
    "formality": 30,
    "humor": 20,
    "trust": 40
  }
}
```

### 4. Integrate 2D Planet Maps with NPC Placement

Your existing 2D planet exploration should be enhanced to show NPCs at specific coordinates.

**What to do:**
- Query NPCs by location when entering a planet
- Display NPC markers on the 2D map
- Allow clicking NPCs to initiate dialogue

**Example Integration:**
```javascript
// In your 2D planet map component
import { useState, useEffect } from 'react';
import { npcApi } from '../../services/api/npcApi';
import { useCharacterStore } from '../../state/characterSlice';
import DialogueInterface from '../dialogue/DialogueInterface';

export default function PlanetSurface({ planet }) {
  const { currentCharacter } = useCharacterStore();
  const [npcs, setNpcs] = useState([]);
  const [selectedNPC, setSelectedNPC] = useState(null);
  
  useEffect(() => {
    loadNPCs();
  }, [planet]);
  
  const loadNPCs = async () => {
    try {
      const response = await npcApi.getByLocation(planet.id);
      setNpcs(response.data);
    } catch (error) {
      console.error('Failed to load NPCs:', error);
    }
  };
  
  return (
    <div className="planet-surface">
      {/* Your existing 2D map rendering */}
      <canvas ref={mapCanvasRef} />
      
      {/* NPC markers */}
      {npcs.map(npc => (
        <div
          key={npc.id}
          className="npc-marker"
          style={{
            left: `${npc.location.x}px`,
            top: `${npc.location.y}px`
          }}
          onClick={() => setSelectedNPC(npc)}
        >
          {npc.name}
        </div>
      ))}
      
      {/* Dialogue interface */}
      {selectedNPC && (
        <DialogueInterface
          npc={selectedNPC}
          onClose={() => setSelectedNPC(null)}
        />
      )}
    </div>
  );
}
```

### 5. Integrate Mission System with Quest System

Your existing mission system (`backend/data/missions/`) can coexist with the new quest system.

**Options:**
1. **Keep both separate**: Missions are combat/objective-based, quests are narrative-driven
2. **Convert missions to quests**: Migrate mission data to quest format
3. **Hybrid approach**: Missions become a quest objective type

**Recommended: Hybrid Approach**
```javascript
// Quest objective that triggers a mission
{
  "id": "complete_ryloth_mission",
  "type": "mission",
  "description": "Complete the Ryloth liberation mission",
  "missionId": "E1_GCW_Ryloth",
  "target": null
}
```

### 6. Database Migration Strategy

**Important:** The new RPG tables are separate from your existing tables. They won't conflict.

**Migration Steps:**
1. Run the migration to create new tables: `npm run migrate`
2. Your existing tables (`users`, `factions`, `achievements`, etc.) remain unchanged
3. New tables are added: `player_characters`, `quests`, `quest_progress`, `npcs`, `npc_relationships`, `player_inventory`

**Foreign Key Connections:**
- `player_characters.user_id` → `users.id` (connects to your existing user system)
- All other new tables reference the new RPG tables only

### 7. UI Navigation Integration

Add the new RPG features to your existing navigation.

**Example:**
```javascript
// In your AppRouter or navigation component
import CharacterCreation from './features/character-creation/CharacterCreation';
import QuestLog from './features/quests/QuestLog';

// Add new routes
<Route path="/character/create" element={<CharacterCreation />} />
<Route path="/quests" element={<QuestLog />} />

// Update your dashboard/hub to show new features
<Link to="/quests">Quest Log</Link>
<Link to="/character">Character Sheet</Link>
```

## Data Migration Checklist

- [ ] Copy existing faction data to new quest `factionId` fields
- [ ] Convert survivor personas to NPC JSON files
- [ ] Map evidence trees to quest objective chains
- [ ] Create quest data for Independent Investigators faction
- [ ] Test faction reputation integration
- [ ] Verify galaxy map shows player location
- [ ] Test NPC placement on 2D planet maps

## Testing Integration

1. **Create a test character** through the new character creation flow
2. **Verify faction data** appears in quest listings
3. **Test planet travel** updates character location
4. **Load NPCs on planet surface** and initiate dialogue
5. **Start a quest** and verify objectives track properly
6. **Complete a quest** and verify faction reputation updates

## Rollback Plan

If you need to revert:
1. The new tables are separate—drop them without affecting existing data
2. Remove new routes from your router
3. Remove imports of new state slices
4. Your original code remains intact

## Next Steps

After integration:
1. Create content for other factions (New Republic, Imperial Remnant, etc.)
2. Expand NPC dialogue with AI integration
3. Add more quest types and objectives
4. Enhance 2D maps with quest markers
5. Build companion management UI

## Support

If you encounter issues during integration, check:
- Database connection strings match
- API endpoints are correctly proxied
- State management doesn't have naming conflicts
- File paths are correct for your project structure
