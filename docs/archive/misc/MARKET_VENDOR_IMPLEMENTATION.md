# Market Vendor Implementation

**Date:** 2024  
**Status:** ✅ Complete

---

## Overview

Market submaps now guarantee specific vendor types to provide players with a reliable location for purchasing items.

---

## Requirements

When a player enters a Market submap, there should be:
1. **One of each kind of vendor** (4 vendors):
   - Medical vendor (medpacs, medical tools)
   - Tech vendor (datapads, scanners, slicing tools)
   - Communication vendor (comlinks)
   - General vendor (basic consumables, common tools)

2. **3 faction vendors** per market submap:
   - Each from different factions (imperial_remnant, new_republic, smugglers_guild, jedi_seekers, corporate_sector)
   - Sell faction-specific items

**Total:** Minimum 7 vendors per market submap

---

## Implementation

### Changes Made

#### 1. Market Template Update
**File:** `backend/src/data/npcTemplates.js`

- Updated `market` template:
  - `minNPCs: 7` (was 4)
  - `maxNPCs: 15` (was 12)

#### 2. NPC Generation Logic
**File:** `backend/src/services/npcGenerator.js`

**Market-Specific Logic:**
- First 4 NPCs: One of each vendor category
  - NPC 0: Medical vendor (category: 'medical')
  - NPC 1: Tech vendor (category: 'tech')
  - NPC 2: Communication vendor (category: 'communication')
  - NPC 3: General vendor (category: 'general')
  
- Next 3 NPCs: Faction vendors
  - NPC 4-6: Random factions from game factions list
  - Each faction vendor gets assigned a faction ID
  - Faction vendors sell faction-specific items

- Remaining NPCs: Use template distribution (can be vendors or generic)

**Vendor Category Assignment:**
- Category vendors are non-faction (factionId: null)
- Faction vendors have factionId assigned
- Vendor category passed to `generateVendorInventory()` via `template.vendorCategory`

**Spawn Points:**
- If market has fewer than 7 spawn points, additional spawn points are generated
- Ensures all required vendors have spawn locations

#### 3. Vendor Inventory Generation
**File:** `backend/src/services/npcGenerator.js`

- Updated `generateVendorInventory()` to use `template.vendorCategory` if provided
- Category vendors stock items based on their category:
  - Medical: medpacs, medical tools, medical scanners
  - Tech: datapads, scanners, slicing tools
  - Communication: comlinks
  - General: basic consumables, common tools, non-specialized items

---

## Vendor Categories

### Medical Vendor
- **Items:** medpacs, medical tools, medical scanners, bacta items
- **Faction:** None (non-faction vendor)
- **Inventory:** Medical consumables and tools

### Tech Vendor
- **Items:** datapads, scanners, slicing tools
- **Faction:** None (non-faction vendor)
- **Inventory:** Technology and hacking equipment

### Communication Vendor
- **Items:** comlinks (all tiers)
- **Faction:** None (non-faction vendor)
- **Inventory:** Communication devices

### General Vendor
- **Items:** basic consumables, common tools, non-specialized items
- **Faction:** None (non-faction vendor)
- **Inventory:** General purpose items

### Faction Vendors (3 per market)
- **Factions:** imperial_remnant, new_republic, smugglers_guild, jedi_seekers, corporate_sector
- **Items:** Faction-specific weapons, armors, and items
- **Inventory:** 70% faction items, 30% non-aligned items

---

## Testing Checklist

- [ ] Market submap generates with at least 7 NPCs
- [ ] First 4 NPCs are category vendors (one of each type)
- [ ] Next 3 NPCs are faction vendors (different factions)
- [ ] Medical vendor stocks medpacs and medical tools
- [ ] Tech vendor stocks datapads and scanners
- [ ] Communication vendor stocks comlinks
- [ ] General vendor stocks basic consumables
- [ ] Faction vendors stock faction-appropriate items
- [ ] All vendors are accessible via Shop button
- [ ] Vendor inventories are correctly filtered

---

## Files Modified

1. `backend/src/data/npcTemplates.js` - Updated market template minNPCs
2. `backend/src/services/npcGenerator.js` - Added market-specific vendor generation logic

---

**Status:** ✅ Complete  
**Ready for:** Testing and Priority 3 implementation


