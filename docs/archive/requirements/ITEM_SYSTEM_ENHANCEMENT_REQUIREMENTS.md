# Item System Enhancement Requirements & Implementation Plan

**Document Version:** 1.0  
**Date:** 2024  
**Status:** Requirements & Implementation Plan  
**Total Priorities:** 4 (16 sub-tasks)

---

## Executive Summary

This document provides comprehensive requirements and detailed implementation plans for enhancing the item system across four priority levels. The enhancements will transform the current 77-item system into an expansive, immersive galaxy-spanning equipment system with faction-specific items, non-aligned options, and deep integration with game systems.

### Key Goals:
- **Expand from 3 to 50+ weapons** with faction and non-aligned variants
- **Expand from 3 to 30+ armors** with faction and non-aligned variants
- **Add faction associations** to 20+ existing items
- **Implement special effects system** for unique item properties
- **Create crafting system** integration
- **Add ability system** for permanent unlocks

---

## Faction Reference

### Primary Factions (Used in Quests/NPCs):
- `independent_investigators` - Independent Investigators Alliance
- `new_republic` - New Republic
- `imperial_remnant` - Imperial Remnant
- `smugglers_guild` - Smugglers Guild
- `jedi_seekers` - Jedi Seekers
- `corporate_sector` - Corporate Sector Authority
- `outer_rim_settlers` - Outer Rim Settlers

### Extended Factions (Available for Future Use):
- `galactic_republic`, `galactic_empire`, `rebel_alliance`
- `first_order`, `resistance`
- `jedi_order`, `sith`
- `mandalorians`, `hutts`, `black_sun`, `crimson_dawn`
- `bounty_hunters`, `trade_federation`, `separatists`
- `chiss_ascendancy`, `hapes_consortium`

---

## PRIORITY 1: Critical Improvements

**Timeline:** Week 1 (5 days)  
**Impact:** High  
**Effort:** Low-Medium

---

### Task 1.1: Add Faction Associations to Existing Items

#### Requirements

**Objective:** Add `factionId` and `minReputationTier` to existing items that should have faction restrictions.

**Items to Update:**

1. **Imperial Remnant Items:**
   - `blaster_rifle_01` (E-11 Blaster Rifle)
     - `factionId: 'imperial_remnant'`
     - `minReputationTier: null` (common item, no restriction)
     - **Rationale:** Standard Imperial weapon

2. **Jedi Seekers Items:**
   - `lightsaber_01` (Lightsaber)
     - `factionId: 'jedi_seekers'`
     - `minReputationTier: 'trusted'`
     - `stats.forcePower: 15` (add Force power bonus)
     - `stats.specialEffects: ['force_enhancement', 'lightsaber_mastery']`
     - **Rationale:** Requires Jedi training and Force sensitivity
   
   - `jedi_artifact` (Jedi Artifact)
     - `factionId: 'jedi_seekers'`
     - `minReputationTier: 'allied'`
     - Make equippable: `equipmentSlot: 'accessory'`
     - **Rationale:** Powerful artifact requires high Jedi standing
   
   - `krayt_pearl` (Krayt Dragon Pearl)
     - `factionId: 'jedi_seekers'` (optional - could be neutral)
     - `minReputationTier: 'friendly'` (if Force-related)
     - **Rationale:** Used in lightsaber construction

3. **New Republic Items:**
   - `nr_commendation` (New Republic Commendation)
     - `factionId: 'new_republic'`
     - `minReputationTier: null` (reward item, no restriction)
     - **Rationale:** New Republic recognition

4. **Smugglers Guild Items:**
   - `smuggler_badge` (Master Smuggler's Badge)
     - `factionId: 'smugglers_guild'`
     - `minReputationTier: 'friendly'`
     - **Rationale:** Guild recognition badge

#### Implementation Steps

1. **Update `backend/src/data/items.js`:**
   - Add `factionId` field to specified items
   - Add `minReputationTier` where appropriate
   - Update stats for lightsaber and jedi_artifact

2. **Update `backend/src/services/inventoryService.js`:**
   - Verify `canEquipItem()` method handles faction checks
   - Test reputation tier validation

3. **Update Frontend:**
   - Display faction requirement in item tooltips
   - Show reputation tier requirement
   - Disable equip button if requirements not met

4. **Testing:**
   - Test equipping items with faction requirements
   - Test reputation tier validation
   - Test vendor restrictions (faction vendors only sell to members)

#### Acceptance Criteria

- [ ] All specified items have `factionId` set
- [ ] Reputation tier checks work correctly
- [ ] Frontend displays faction requirements
- [ ] Items cannot be equipped without meeting requirements
- [ ] Error messages are clear and helpful

---

### Task 1.2: Expand Weapon Variety (Galaxy-Wide)

#### Requirements

**Objective:** Create an expansive weapon system with multiple options at each tier, including faction-specific and non-aligned weapons.

**Design Philosophy:**
- **Multiple options per tier:** Players should have 3-5 weapon choices at each rarity level
- **Faction variety:** Each major faction should have 2-3 unique weapons
- **Non-aligned options:** Generic weapons available to all players
- **Progression:** Clear stat progression from Common to Legendary
- **Galactic diversity:** Weapons from different manufacturers and worlds

#### Weapon Categories

**1. Blaster Pistols (Close-Medium Range)**
- **Common Tier (3 options):**
  - `blaster_pistol_01` (DL-44) - Existing, keep as non-aligned
  - `blaster_pistol_imperial` (SE-14r) - Imperial Remnant
  - `blaster_pistol_rebel` (A-180) - New Republic
  
- **Uncommon Tier (4 options):**
  - `blaster_pistol_02` (DL-18) - Non-aligned, upgrade of DL-44
  - `blaster_pistol_smuggler` (DT-12) - Smugglers Guild
  - `blaster_pistol_corporate` (Czerka C-10) - Corporate Sector
  - `blaster_pistol_bounty` (EE-3) - Bounty Hunter (non-aligned)

- **Rare Tier (5 options):**
  - `blaster_pistol_03` (DL-44 Custom) - Non-aligned, high-end
  - `blaster_pistol_imperial_elite` (SE-14r Elite) - Imperial Remnant
  - `blaster_pistol_rebel_elite` (A-180 Modified) - New Republic
  - `blaster_pistol_mandalorian` (Westar-35) - Mandalorian (rare drop)
  - `blaster_pistol_jedi` (Jedi Blaster) - Jedi Seekers (if non-Force user)

- **Epic Tier (4 options):**
  - `blaster_pistol_legendary` (DL-44 Masterwork) - Non-aligned
  - `blaster_pistol_imperial_master` (SE-14r Master) - Imperial Remnant
  - `blaster_pistol_rebel_master` (A-180 Master) - New Republic
  - `blaster_pistol_bespin` (Bespin Special) - Non-aligned, unique

- **Legendary Tier (2 options):**
  - `blaster_pistol_han_solo` (Han Solo's DL-44) - Quest reward, non-aligned
  - `blaster_pistol_ancient` (Ancient Blaster) - Rare find, non-aligned

**2. Blaster Rifles (Medium-Long Range)**
- **Common Tier (3 options):**
  - `blaster_rifle_01` (E-11) - Existing, set to Imperial Remnant
  - `blaster_rifle_rebel` (A280) - New Republic
  - `blaster_rifle_generic` (DC-15A) - Non-aligned

- **Uncommon Tier (4 options):**
  - `blaster_rifle_02` (E-11 Enhanced) - Imperial Remnant
  - `blaster_rifle_rebel_enhanced` (A280 Enhanced) - New Republic
  - `blaster_rifle_corporate` (Czerka C-20) - Corporate Sector
  - `blaster_rifle_scout` (Scout Rifle) - Non-aligned

- **Rare Tier (5 options):**
  - `blaster_rifle_03` (E-11 Elite) - Imperial Remnant
  - `blaster_rifle_rebel_elite` (A280 Elite) - New Republic
  - `blaster_rifle_mandalorian` (Mandalorian Rifle) - Mandalorian
  - `blaster_rifle_heavy` (Heavy Blaster) - Non-aligned
  - `blaster_rifle_precision` (Precision Rifle) - Non-aligned

- **Epic Tier (4 options):**
  - `blaster_rifle_sniper` (Sniper Rifle) - Non-aligned
  - `blaster_rifle_imperial_master` (E-11 Master) - Imperial Remnant
  - `blaster_rifle_rebel_master` (A280 Master) - New Republic
  - `blaster_rifle_ancient` (Ancient Rifle) - Rare find

- **Legendary Tier (2 options):**
  - `blaster_rifle_legendary` (Legendary Rifle) - Quest reward
  - `blaster_rifle_force_enhanced` (Force-Enhanced Rifle) - Jedi Seekers

**3. Heavy Weapons (High Damage, Lower Accuracy)**
- **Rare Tier (3 options):**
  - `heavy_blaster` (Heavy Blaster) - Non-aligned
  - `heavy_blaster_imperial` (RT-97C) - Imperial Remnant
  - `heavy_blaster_rebel` (T-21) - New Republic

- **Epic Tier (3 options):**
  - `heavy_blaster_elite` (Elite Heavy) - Non-aligned
  - `repeating_blaster` (Repeating Blaster) - Non-aligned
  - `plasma_cannon` (Plasma Cannon) - Rare drop

- **Legendary Tier (1 option):**
  - `legendary_heavy_weapon` (Legendary Heavy) - Quest reward

**4. Sniper Rifles (Long Range, High Accuracy)**
- **Rare Tier (2 options):**
  - `sniper_rifle` (Sniper Rifle) - Non-aligned
  - `sniper_rifle_imperial` (E-11s) - Imperial Remnant

- **Epic Tier (3 options):**
  - `sniper_rifle_elite` (Elite Sniper) - Non-aligned
  - `sniper_rifle_mandalorian` (Mandalorian Sniper) - Mandalorian
  - `sniper_rifle_ancient` (Ancient Sniper) - Rare find

- **Legendary Tier (1 option):**
  - `legendary_sniper` (Legendary Sniper) - Quest reward

**5. Melee Weapons (Close Range, High Accuracy)**
- **Common Tier (2 options):**
  - `vibroblade` (Vibroblade) - Non-aligned
  - `vibroblade_imperial` (Imperial Vibroblade) - Imperial Remnant

- **Uncommon Tier (3 options):**
  - `vibrosword` (Vibrosword) - Non-aligned
  - `vibrosword_rebel` (Rebel Vibrosword) - New Republic
  - `vibroknife` (Vibroknife) - Non-aligned

- **Rare Tier (4 options):**
  - `electrostaff` (Electrostaff) - Non-aligned
  - `electrostaff_magnaguard` (Magnaguard Staff) - Rare drop
  - `vibroaxe` (Vibroaxe) - Non-aligned
  - `vibrosword_mandalorian` (Mandalorian Sword) - Mandalorian

- **Epic Tier (3 options):**
  - `electrostaff_elite` (Elite Electrostaff) - Non-aligned
  - `vibrosword_ancient` (Ancient Vibrosword) - Rare find
  - `force_pike` (Force Pike) - Rare drop

- **Legendary Tier (1 option):**
  - `legendary_melee` (Legendary Melee) - Quest reward

**6. Special Weapons (Unique Properties)**
- **Epic Tier:**
  - `ion_blaster` (Ion Blaster) - Non-aligned, extra damage to droids
  - `stun_blaster` (Stun Blaster) - Non-aligned, stun effect
  - `flame_thrower` (Flamethrower) - Non-aligned, area damage

- **Legendary Tier:**
  - `lightsaber_01` (Lightsaber) - Existing, Jedi Seekers
  - `dark_saber` (Darksaber) - Quest reward, Mandalorian
  - `ancient_weapon` (Ancient Weapon) - Rare find, non-aligned

#### Detailed Weapon Specifications

**Common Tier Weapons:**

```javascript
// Non-Aligned
'blaster_pistol_01': {
  id: 'blaster_pistol_01',
  name: 'DL-44 Heavy Blaster Pistol',
  type: ITEM_TYPES.WEAPON,
  rarity: ITEM_RARITIES.COMMON,
  description: 'A reliable heavy blaster pistol favored by smugglers and bounty hunters.',
  stats: { damage: 25, range: 30, accuracy: 75 },
  equipmentSlot: 'weapon',
  value: 500,
  weight: 2.5,
  factionId: null
},

// Imperial Remnant
'blaster_pistol_imperial': {
  id: 'blaster_pistol_imperial',
  name: 'SE-14r Blaster Pistol',
  type: ITEM_TYPES.WEAPON,
  rarity: ITEM_RARITIES.COMMON,
  description: 'Standard issue Imperial sidearm. Reliable and accurate.',
  stats: { damage: 23, range: 28, accuracy: 78 },
  equipmentSlot: 'weapon',
  value: 450,
  weight: 2.3,
  factionId: 'imperial_remnant',
  minReputationTier: null
},

// New Republic
'blaster_pistol_rebel': {
  id: 'blaster_pistol_rebel',
  name: 'A-180 Blaster Pistol',
  type: ITEM_TYPES.WEAPON,
  rarity: ITEM_RARITIES.COMMON,
  description: 'New Republic standard issue blaster pistol. Versatile and dependable.',
  stats: { damage: 24, range: 32, accuracy: 76 },
  equipmentSlot: 'weapon',
  value: 480,
  weight: 2.4,
  factionId: 'new_republic',
  minReputationTier: null
},

// Non-Aligned Generic
'blaster_rifle_generic': {
  id: 'blaster_rifle_generic',
  name: 'DC-15A Blaster Rifle',
  type: ITEM_TYPES.WEAPON,
  rarity: ITEM_RARITIES.COMMON,
  description: 'A common blaster rifle found throughout the galaxy. No faction affiliation.',
  stats: { damage: 28, range: 45, accuracy: 68 },
  equipmentSlot: 'weapon',
  value: 700,
  weight: 3.8,
  factionId: null
},

// Non-Aligned Melee
'vibroblade': {
  id: 'vibroblade',
  name: 'Vibroblade',
  type: ITEM_TYPES.WEAPON,
  rarity: ITEM_RARITIES.COMMON,
  description: 'A basic vibroblade. Simple but effective in close combat.',
  stats: { damage: 20, range: 1, accuracy: 85 },
  equipmentSlot: 'weapon',
  value: 200,
  weight: 1.5,
  factionId: null
}
```

**Uncommon Tier Weapons:**

```javascript
// Non-Aligned Upgrade
'blaster_pistol_02': {
  id: 'blaster_pistol_02',
  name: 'DL-18 Blaster Pistol',
  type: ITEM_TYPES.WEAPON,
  rarity: ITEM_RARITIES.UNCOMMON,
  description: 'An upgraded version of the DL-44. Improved accuracy and range.',
  stats: { damage: 32, range: 35, accuracy: 80 },
  equipmentSlot: 'weapon',
  value: 800,
  weight: 2.6,
  factionId: null
},

// Smugglers Guild
'blaster_pistol_smuggler': {
  id: 'blaster_pistol_smuggler',
  name: 'DT-12 Blaster Pistol',
  type: ITEM_TYPES.WEAPON,
  rarity: ITEM_RARITIES.UNCOMMON,
  description: 'A compact blaster favored by smugglers. Easy to conceal and reliable.',
  stats: { damage: 28, range: 30, accuracy: 82 },
  equipmentSlot: 'weapon',
  value: 750,
  weight: 2.0,
  factionId: 'smugglers_guild',
  minReputationTier: 'friendly'
},

// Corporate Sector
'blaster_pistol_corporate': {
  id: 'blaster_pistol_corporate',
  name: 'Czerka C-10 Blaster Pistol',
  type: ITEM_TYPES.WEAPON,
  rarity: ITEM_RARITIES.UNCOMMON,
  description: 'Corporate Sector security weapon. High damage, moderate accuracy.',
  stats: { damage: 35, range: 28, accuracy: 72 },
  equipmentSlot: 'weapon',
  value: 900,
  weight: 2.8,
  factionId: 'corporate_sector',
  minReputationTier: 'friendly'
},

// Bounty Hunter (Non-Aligned)
'blaster_pistol_bounty': {
  id: 'blaster_pistol_bounty',
  name: 'EE-3 Blaster Pistol',
  type: ITEM_TYPES.WEAPON,
  rarity: ITEM_RARITIES.UNCOMMON,
  description: 'Popular among bounty hunters. Balanced stats and reliable performance.',
  stats: { damage: 30, range: 33, accuracy: 78 },
  equipmentSlot: 'weapon',
  value: 850,
  weight: 2.5,
  factionId: null
},

// Non-Aligned Rifle Upgrade
'blaster_rifle_02': {
  id: 'blaster_rifle_02',
  name: 'E-11 Enhanced Blaster Rifle',
  type: ITEM_TYPES.WEAPON,
  rarity: ITEM_RARITIES.UNCOMMON,
  description: 'Enhanced version of the standard E-11. Improved damage and accuracy.',
  stats: { damage: 35, range: 55, accuracy: 75 },
  equipmentSlot: 'weapon',
  value: 1100,
  weight: 4.2,
  factionId: 'imperial_remnant',
  minReputationTier: null
},

// New Republic Rifle
'blaster_rifle_rebel_enhanced': {
  id: 'blaster_rifle_rebel_enhanced',
  name: 'A280 Enhanced Blaster Rifle',
  type: ITEM_TYPES.WEAPON,
  rarity: ITEM_RARITIES.UNCOMMON,
  description: 'Enhanced New Republic blaster rifle. Improved range and accuracy.',
  stats: { damage: 33, range: 58, accuracy: 77 },
  equipmentSlot: 'weapon',
  value: 1050,
  weight: 4.0,
  factionId: 'new_republic',
  minReputationTier: null
},

// Non-Aligned Melee
'vibrosword': {
  id: 'vibrosword',
  name: 'Vibrosword',
  type: ITEM_TYPES.WEAPON,
  rarity: ITEM_RARITIES.UNCOMMON,
  description: 'A standard vibrosword. Effective melee weapon with good reach.',
  stats: { damage: 30, range: 1, accuracy: 80 },
  equipmentSlot: 'weapon',
  value: 400,
  weight: 2.0,
  factionId: null
}
```

**Rare Tier Weapons:**

```javascript
// Non-Aligned High-End
'blaster_pistol_03': {
  id: 'blaster_pistol_03',
  name: 'DL-44 Custom Blaster Pistol',
  type: ITEM_TYPES.WEAPON,
  rarity: ITEM_RARITIES.RARE,
  description: 'A custom-tuned DL-44. Maximum performance for the discerning shooter.',
  stats: { damage: 40, range: 38, accuracy: 85 },
  equipmentSlot: 'weapon',
  value: 1500,
  weight: 2.7,
  factionId: null
},

// Imperial Elite
'blaster_pistol_imperial_elite': {
  id: 'blaster_pistol_imperial_elite',
  name: 'SE-14r Elite Blaster Pistol',
  type: ITEM_TYPES.WEAPON,
  rarity: ITEM_RARITIES.RARE,
  description: 'Elite Imperial sidearm. Issued to officers and special forces.',
  stats: { damage: 38, range: 35, accuracy: 83 },
  equipmentSlot: 'weapon',
  value: 1400,
  weight: 2.4,
  factionId: 'imperial_remnant',
  minReputationTier: 'friendly'
},

// New Republic Elite
'blaster_pistol_rebel_elite': {
  id: 'blaster_pistol_rebel_elite',
  name: 'A-180 Modified Blaster Pistol',
  type: ITEM_TYPES.WEAPON,
  rarity: ITEM_RARITIES.RARE,
  description: 'Modified New Republic blaster. Enhanced for special operations.',
  stats: { damage: 39, range: 36, accuracy: 84 },
  equipmentSlot: 'weapon',
  value: 1450,
  weight: 2.5,
  factionId: 'new_republic',
  minReputationTier: 'friendly'
},

// Mandalorian (Rare Drop)
'blaster_pistol_mandalorian': {
  id: 'blaster_pistol_mandalorian',
  name: 'Westar-35 Blaster Pistol',
  type: ITEM_TYPES.WEAPON,
  rarity: ITEM_RARITIES.RARE,
  description: 'Mandalorian blaster pistol. Exceptional craftsmanship and power.',
  stats: { damage: 42, range: 40, accuracy: 86 },
  equipmentSlot: 'weapon',
  value: 2000,
  weight: 2.6,
  factionId: null, // Rare drop, no faction requirement
  specialEffects: ['mandalorian_craftsmanship']
},

// Heavy Weapons
'heavy_blaster': {
  id: 'heavy_blaster',
  name: 'Heavy Blaster',
  type: ITEM_TYPES.WEAPON,
  rarity: ITEM_RARITIES.RARE,
  description: 'A heavy blaster weapon. High damage but lower accuracy.',
  stats: { damage: 55, range: 40, accuracy: 65 },
  equipmentSlot: 'weapon',
  value: 2000,
  weight: 8.0,
  factionId: null
},

'heavy_blaster_imperial': {
  id: 'heavy_blaster_imperial',
  name: 'RT-97C Heavy Blaster',
  type: ITEM_TYPES.WEAPON,
  rarity: ITEM_RARITIES.RARE,
  description: 'Imperial heavy blaster. Devastating firepower.',
  stats: { damage: 58, range: 42, accuracy: 63 },
  equipmentSlot: 'weapon',
  value: 2200,
  weight: 8.5,
  factionId: 'imperial_remnant',
  minReputationTier: 'friendly'
},

// Sniper Rifles
'sniper_rifle': {
  id: 'sniper_rifle',
  name: 'Sniper Rifle',
  type: ITEM_TYPES.WEAPON,
  rarity: ITEM_RARITIES.RARE,
  description: 'Long-range precision weapon. High accuracy and range.',
  stats: { damage: 60, range: 100, accuracy: 90 },
  equipmentSlot: 'weapon',
  value: 2500,
  weight: 6.0,
  factionId: null
},

// Melee Weapons
'electrostaff': {
  id: 'electrostaff',
  name: 'Electrostaff',
  type: ITEM_TYPES.WEAPON,
  rarity: ITEM_RARITIES.RARE,
  description: 'An electrostaff. Extended reach and electrical damage.',
  stats: { damage: 40, range: 2, accuracy: 75 },
  equipmentSlot: 'weapon',
  value: 1200,
  weight: 3.5,
  factionId: null
}
```

**Epic Tier Weapons:**

```javascript
// Non-Aligned Masterwork
'blaster_pistol_legendary': {
  id: 'blaster_pistol_legendary',
  name: 'DL-44 Masterwork Blaster Pistol',
  type: ITEM_TYPES.WEAPON,
  rarity: ITEM_RARITIES.EPIC,
  description: 'A masterwork DL-44. The pinnacle of blaster pistol craftsmanship.',
  stats: { damage: 50, range: 45, accuracy: 90 },
  equipmentSlot: 'weapon',
  value: 5000,
  weight: 2.8,
  factionId: null,
  specialEffects: ['masterwork_quality']
},

// Sniper Elite
'sniper_rifle_elite': {
  id: 'sniper_rifle_elite',
  name: 'Elite Sniper Rifle',
  type: ITEM_TYPES.WEAPON,
  rarity: ITEM_RARITIES.EPIC,
  description: 'An elite sniper rifle. Maximum range and precision.',
  stats: { damage: 75, range: 120, accuracy: 95 },
  equipmentSlot: 'weapon',
  value: 6000,
  weight: 6.5,
  factionId: null
},

// Special Weapons
'ion_blaster': {
  id: 'ion_blaster',
  name: 'Ion Blaster',
  type: ITEM_TYPES.WEAPON,
  rarity: ITEM_RARITIES.EPIC,
  description: 'An ion blaster. Extra effective against droids and electronic systems.',
  stats: { damage: 45, range: 35, accuracy: 80 },
  equipmentSlot: 'weapon',
  value: 4000,
  weight: 3.0,
  factionId: null,
  specialEffects: ['ion_damage', 'droid_bonus']
}
```

**Legendary Tier Weapons:**

```javascript
// Quest Reward
'blaster_pistol_han_solo': {
  id: 'blaster_pistol_han_solo',
  name: 'Han Solo\'s DL-44',
  type: ITEM_TYPES.WEAPON,
  rarity: ITEM_RARITIES.LEGENDARY,
  description: 'The legendary blaster pistol of Han Solo. A piece of galactic history.',
  stats: { damage: 55, range: 50, accuracy: 95 },
  equipmentSlot: 'weapon',
  value: 15000,
  weight: 2.5,
  factionId: null,
  specialEffects: ['legendary_weapon', 'luck_bonus']
}
```

#### Implementation Steps

1. **Create Weapon Definition File:**
   - File: `backend/src/data/weapons.js`
   - Organize by category and tier
   - Include all stat specifications

2. **Update `backend/src/data/items.js`:**
   - Import weapons from `weapons.js`
   - Merge into `itemDefinitions` object
   - Maintain backward compatibility

3. **Update Vendor System:**
   - Faction vendors only sell faction weapons to members
   - Non-aligned vendors sell generic weapons
   - Add weapon filtering by faction reputation

4. **Update Loot Tables:**
   - Add new weapons to enemy loot tables
   - Faction enemies drop faction weapons
   - Rare weapons have lower drop rates

5. **Frontend Updates:**
   - Update weapon display in inventory
   - Add faction filter to weapon vendors
   - Show faction requirements in tooltips

6. **Testing:**
   - Test all weapon tiers
   - Test faction restrictions
   - Test vendor availability
   - Test loot drops

#### Acceptance Criteria

- [ ] 50+ weapons implemented across all tiers
- [ ] Each tier has 3-5 weapon options
- [ ] Faction weapons properly restricted
- [ ] Non-aligned weapons available to all
- [ ] Stat progression is balanced
- [ ] All weapons appear in appropriate vendors
- [ ] Loot tables updated with new weapons

---

### Task 1.3: Expand Armor Variety (Galaxy-Wide)

#### Requirements

**Objective:** Create an expansive armor system with multiple options at each tier, including faction-specific and non-aligned armors.

**Design Philosophy:**
- **Multiple options per tier:** Players should have 3-5 armor choices at each rarity level
- **Faction variety:** Each major faction should have 2-3 unique armors
- **Non-aligned options:** Generic armors available to all players
- **Progression:** Clear stat progression from Common to Legendary
- **Trade-offs:** Defense vs. Mobility balance
- **Galactic diversity:** Armors from different manufacturers and worlds

#### Armor Categories

**1. Light Armor (High Mobility, Lower Defense)**
- **Common Tier (3 options):**
  - `armor_light_01` (Light Combat Armor) - Existing, keep as non-aligned
  - `armor_light_imperial` (Imperial Light Armor) - Imperial Remnant
  - `armor_light_rebel` (Rebel Light Armor) - New Republic

- **Uncommon Tier (4 options):**
  - `armor_light_02` (Enhanced Light Armor) - Non-aligned
  - `armor_light_smuggler` (Smuggler's Vest) - Smugglers Guild
  - `armor_light_corporate` (Corporate Security Armor) - Corporate Sector
  - `armor_light_scout` (Scout Armor) - Non-aligned

- **Rare Tier (5 options):**
  - `armor_light_03` (Advanced Light Armor) - Non-aligned
  - `armor_light_imperial_elite` (Imperial Scout Armor) - Imperial Remnant
  - `armor_light_rebel_elite` (Rebel Scout Armor) - New Republic
  - `armor_light_mandalorian` (Mandalorian Light Armor) - Mandalorian (rare drop)
  - `armor_light_jedi` (Jedi Robes) - Jedi Seekers

- **Epic Tier (4 options):**
  - `armor_light_masterwork` (Masterwork Light Armor) - Non-aligned
  - `armor_light_imperial_master` (Imperial Master Armor) - Imperial Remnant
  - `armor_light_rebel_master` (Rebel Master Armor) - New Republic
  - `armor_light_ancient` (Ancient Light Armor) - Rare find

- **Legendary Tier (2 options):**
  - `armor_light_legendary` (Legendary Light Armor) - Quest reward
  - `armor_light_force_enhanced` (Force-Enhanced Robes) - Jedi Seekers

**2. Medium Armor (Balanced Defense and Mobility)**
- **Common Tier (3 options):**
  - `armor_medium_01` (Medium Combat Armor) - Existing, keep as non-aligned
  - `armor_medium_imperial` (Imperial Medium Armor) - Imperial Remnant
  - `armor_medium_rebel` (Rebel Medium Armor) - New Republic

- **Uncommon Tier (4 options):**
  - `armor_medium_02` (Enhanced Medium Armor) - Non-aligned
  - `armor_medium_corporate` (Corporate Medium Armor) - Corporate Sector
  - `armor_medium_bounty` (Bounty Hunter Armor) - Non-aligned
  - `armor_medium_tactical` (Tactical Armor) - Non-aligned

- **Rare Tier (5 options):**
  - `armor_medium_03` (Advanced Medium Armor) - Non-aligned
  - `armor_medium_imperial_elite` (Imperial Elite Armor) - Imperial Remnant
  - `armor_medium_rebel_elite` (Rebel Elite Armor) - New Republic
  - `armor_medium_mandalorian` (Mandalorian Medium Armor) - Mandalorian
  - `armor_medium_jedi` (Jedi Knight Robes) - Jedi Seekers

- **Epic Tier (4 options):**
  - `armor_medium_masterwork` (Masterwork Medium Armor) - Non-aligned
  - `armor_medium_imperial_master` (Imperial Master Armor) - Imperial Remnant
  - `armor_medium_rebel_master` (Rebel Master Armor) - New Republic
  - `armor_medium_ancient` (Ancient Medium Armor) - Rare find

- **Legendary Tier (2 options):**
  - `armor_medium_legendary` (Legendary Medium Armor) - Quest reward
  - `armor_medium_force_enhanced` (Force-Enhanced Armor) - Jedi Seekers

**3. Heavy Armor (High Defense, Lower Mobility)**
- **Common Tier (2 options):**
  - `armor_heavy_01` (Heavy Combat Armor) - Existing, keep as non-aligned
  - `armor_heavy_imperial` (Imperial Heavy Armor) - Imperial Remnant

- **Uncommon Tier (4 options):**
  - `armor_heavy_02` (Enhanced Heavy Armor) - Non-aligned
  - `armor_heavy_imperial_standard` (Stormtrooper Armor) - Imperial Remnant
  - `armor_heavy_rebel` (Rebel Heavy Armor) - New Republic
  - `armor_heavy_corporate` (Corporate Heavy Armor) - Corporate Sector

- **Rare Tier (5 options):**
  - `armor_heavy_03` (Advanced Heavy Armor) - Non-aligned
  - `armor_heavy_imperial_elite` (Stormtrooper Elite Armor) - Imperial Remnant
  - `armor_heavy_rebel_elite` (Rebel Heavy Elite) - New Republic
  - `armor_heavy_mandalorian` (Mandalorian Heavy Armor) - Mandalorian
  - `armor_heavy_beskar` (Beskar Armor) - Mandalorian (rare drop)

- **Epic Tier (4 options):**
  - `armor_heavy_masterwork` (Masterwork Heavy Armor) - Non-aligned
  - `armor_heavy_imperial_master` (Imperial Master Armor) - Imperial Remnant
  - `armor_heavy_rebel_master` (Rebel Master Armor) - New Republic
  - `armor_heavy_ancient` (Ancient Heavy Armor) - Rare find

- **Legendary Tier (2 options):**
  - `armor_heavy_legendary` (Legendary Heavy Armor) - Quest reward
  - `armor_heavy_beskar_pure` (Pure Beskar Armor) - Mandalorian quest reward

**4. Special Armor (Unique Properties)**
- **Epic Tier:**
  - `armor_stealth` (Stealth Armor) - Non-aligned, stealth bonus
  - `armor_environmental` (Environmental Suit) - Non-aligned, environmental protection
  - `armor_energy_shield` (Energy Shield Generator) - Non-aligned, energy resistance

- **Legendary Tier:**
  - `armor_mandalorian_legendary` (Legendary Mandalorian Armor) - Quest reward
  - `armor_jedi_master` (Jedi Master Robes) - Jedi Seekers quest reward
  - `armor_ancient_artifact` (Ancient Artifact Armor) - Rare find

#### Detailed Armor Specifications

**Common Tier Armors:**

```javascript
// Non-Aligned Light (Existing)
'armor_light_01': {
  id: 'armor_light_01',
  name: 'Light Combat Armor',
  type: ITEM_TYPES.ARMOR,
  rarity: ITEM_RARITIES.COMMON,
  description: 'Basic protective gear for space travelers.',
  stats: { defense: 10, mobility: 5 },
  equipmentSlot: 'armor',
  value: 300,
  weight: 5.0,
  factionId: null
},

// Imperial Light
'armor_light_imperial': {
  id: 'armor_light_imperial',
  name: 'Imperial Light Armor',
  type: ITEM_TYPES.ARMOR,
  rarity: ITEM_RARITIES.COMMON,
  description: 'Light armor worn by Imperial personnel. Standard issue.',
  stats: { defense: 12, mobility: 3 },
  equipmentSlot: 'armor',
  value: 350,
  weight: 5.5,
  factionId: 'imperial_remnant',
  minReputationTier: null
},

// New Republic Light
'armor_light_rebel': {
  id: 'armor_light_rebel',
  name: 'Rebel Light Armor',
  type: ITEM_TYPES.ARMOR,
  description: 'Light armor used by New Republic forces. Flexible and durable.',
  stats: { defense: 11, mobility: 6 },
  equipmentSlot: 'armor',
  value: 320,
  weight: 4.8,
  factionId: 'new_republic',
  minReputationTier: null
},

// Non-Aligned Medium (Existing)
'armor_medium_01': {
  id: 'armor_medium_01',
  name: 'Medium Combat Armor',
  type: ITEM_TYPES.ARMOR,
  rarity: ITEM_RARITIES.UNCOMMON,
  description: 'Sturdy armor providing good protection.',
  stats: { defense: 20, mobility: 0 },
  equipmentSlot: 'armor',
  value: 600,
  weight: 10.0,
  factionId: null
},

// Imperial Medium
'armor_medium_imperial': {
  id: 'armor_medium_imperial',
  name: 'Imperial Medium Armor',
  type: ITEM_TYPES.ARMOR,
  rarity: ITEM_RARITIES.COMMON,
  description: 'Medium armor for Imperial troops. Good balance of protection and mobility.',
  stats: { defense: 22, mobility: -1 },
  equipmentSlot: 'armor',
  value: 650,
  weight: 11.0,
  factionId: 'imperial_remnant',
  minReputationTier: null
},

// Non-Aligned Heavy (Existing)
'armor_heavy_01': {
  id: 'armor_heavy_01',
  name: 'Heavy Combat Armor',
  type: ITEM_TYPES.ARMOR,
  rarity: ITEM_RARITIES.RARE,
  description: 'Heavy armor offering maximum protection.',
  stats: { defense: 35, mobility: -5 },
  equipmentSlot: 'armor',
  value: 1200,
  weight: 20.0,
  factionId: null
}
```

**Uncommon Tier Armors:**

```javascript
// Non-Aligned Light Upgrade
'armor_light_02': {
  id: 'armor_light_02',
  name: 'Enhanced Light Armor',
  type: ITEM_TYPES.ARMOR,
  rarity: ITEM_RARITIES.UNCOMMON,
  description: 'Enhanced light armor with improved protection while maintaining mobility.',
  stats: { defense: 15, mobility: 7 },
  equipmentSlot: 'armor',
  value: 500,
  weight: 5.5,
  factionId: null
},

// Smugglers Guild
'armor_light_smuggler': {
  id: 'armor_light_smuggler',
  name: 'Smuggler\'s Vest',
  type: ITEM_TYPES.ARMOR,
  rarity: ITEM_RARITIES.UNCOMMON,
  description: 'A reinforced vest favored by smugglers. Lightweight and protective.',
  stats: { defense: 14, mobility: 8 },
  equipmentSlot: 'armor',
  value: 550,
  weight: 4.5,
  factionId: 'smugglers_guild',
  minReputationTier: 'friendly'
},

// Corporate Sector
'armor_light_corporate': {
  id: 'armor_light_corporate',
  name: 'Corporate Security Armor',
  type: ITEM_TYPES.ARMOR,
  rarity: ITEM_RARITIES.UNCOMMON,
  description: 'Light armor used by Corporate Sector security forces.',
  stats: { defense: 16, mobility: 4 },
  equipmentSlot: 'armor',
  value: 600,
  weight: 6.0,
  factionId: 'corporate_sector',
  minReputationTier: 'friendly'
},

// Stormtrooper Armor (Uncommon)
'armor_heavy_imperial_standard': {
  id: 'armor_heavy_imperial_standard',
  name: 'Stormtrooper Armor',
  type: ITEM_TYPES.ARMOR,
  rarity: ITEM_RARITIES.UNCOMMON,
  description: 'Standard issue Stormtrooper armor. Iconic white plating with good protection.',
  stats: { defense: 25, mobility: -2 },
  equipmentSlot: 'armor',
  value: 800,
  weight: 15.0,
  factionId: 'imperial_remnant',
  minReputationTier: null,
  specialEffects: ['imperial_identification']
}
```

**Rare Tier Armors:**

```javascript
// Non-Aligned Light Advanced
'armor_light_03': {
  id: 'armor_light_03',
  name: 'Advanced Light Armor',
  type: ITEM_TYPES.ARMOR,
  rarity: ITEM_RARITIES.RARE,
  description: 'Advanced light armor with superior materials and design.',
  stats: { defense: 20, mobility: 10 },
  equipmentSlot: 'armor',
  value: 1000,
  weight: 6.0,
  factionId: null
},

// Mandalorian Light (Rare Drop)
'armor_light_mandalorian': {
  id: 'armor_light_mandalorian',
  name: 'Mandalorian Light Armor',
  type: ITEM_TYPES.ARMOR,
  rarity: ITEM_RARITIES.RARE,
  description: 'Light armor crafted by Mandalorian artisans. Exceptional quality.',
  stats: { defense: 22, mobility: 8 },
  equipmentSlot: 'armor',
  value: 1500,
  weight: 5.5,
  factionId: null, // Rare drop, no faction requirement
  specialEffects: ['mandalorian_craftsmanship']
},

// Jedi Robes
'armor_light_jedi': {
  id: 'armor_light_jedi',
  name: 'Jedi Robes',
  type: ITEM_TYPES.ARMOR,
  rarity: ITEM_RARITIES.RARE,
  description: 'Traditional Jedi robes. Light protection with Force enhancement.',
  stats: { defense: 18, mobility: 12, forcePower: 5 },
  equipmentSlot: 'armor',
  value: 1200,
  weight: 3.0,
  factionId: 'jedi_seekers',
  minReputationTier: 'friendly',
  specialEffects: ['force_enhancement']
},

// Mandalorian Heavy (Beskar)
'armor_heavy_beskar': {
  id: 'armor_heavy_beskar',
  name: 'Beskar Armor',
  type: ITEM_TYPES.ARMOR,
  rarity: ITEM_RARITIES.RARE,
  description: 'Mandalorian armor forged from beskar. Exceptional protection.',
  stats: { defense: 42, mobility: -3 },
  equipmentSlot: 'armor',
  value: 3000,
  weight: 18.0,
  factionId: null, // Rare drop
  specialEffects: ['beskar_quality', 'energy_resistance']
}
```

**Epic Tier Armors:**

```javascript
// Non-Aligned Masterwork
'armor_light_masterwork': {
  id: 'armor_light_masterwork',
  name: 'Masterwork Light Armor',
  type: ITEM_TYPES.ARMOR,
  rarity: ITEM_RARITIES.EPIC,
  description: 'Masterwork light armor. The pinnacle of light armor craftsmanship.',
  stats: { defense: 28, mobility: 15 },
  equipmentSlot: 'armor',
  value: 3000,
  weight: 6.5,
  factionId: null,
  specialEffects: ['masterwork_quality']
},

// Stealth Armor
'armor_stealth': {
  id: 'armor_stealth',
  name: 'Stealth Armor',
  type: ITEM_TYPES.ARMOR,
  rarity: ITEM_RARITIES.EPIC,
  description: 'Advanced stealth armor. Reduces detection and improves sneaking.',
  stats: { defense: 24, mobility: 12 },
  equipmentSlot: 'armor',
  value: 4000,
  weight: 5.0,
  factionId: null,
  specialEffects: ['stealth_bonus', 'detection_reduction']
}
```

**Legendary Tier Armors:**

```javascript
// Pure Beskar
'armor_heavy_beskar_pure': {
  id: 'armor_heavy_beskar_pure',
  name: 'Pure Beskar Armor',
  type: ITEM_TYPES.ARMOR,
  rarity: ITEM_RARITIES.LEGENDARY,
  description: 'Armor forged from pure beskar. The ultimate Mandalorian protection.',
  stats: { defense: 50, mobility: 0 },
  equipmentSlot: 'armor',
  value: 20000,
  weight: 20.0,
  factionId: null,
  specialEffects: ['pure_beskar', 'energy_resistance', 'legendary_armor']
},

// Jedi Master Robes
'armor_jedi_master': {
  id: 'armor_jedi_master',
  name: 'Jedi Master Robes',
  type: ITEM_TYPES.ARMOR,
  rarity: ITEM_RARITIES.LEGENDARY,
  description: 'Robes worn by Jedi Masters. Infused with the Force.',
  stats: { defense: 30, mobility: 15, forcePower: 20 },
  equipmentSlot: 'armor',
  value: 25000,
  weight: 4.0,
  factionId: 'jedi_seekers',
  minReputationTier: 'allied',
  specialEffects: ['force_mastery', 'jedi_enhancement']
}
```

#### Implementation Steps

1. **Create Armor Definition File:**
   - File: `backend/src/data/armors.js`
   - Organize by category and tier
   - Include all stat specifications

2. **Update `backend/src/data/items.js`:**
   - Import armors from `armors.js`
   - Merge into `itemDefinitions` object

3. **Update Vendor System:**
   - Faction vendors sell faction armors
   - Non-aligned vendors sell generic armors
   - Add armor filtering by faction reputation

4. **Update Loot Tables:**
   - Add new armors to enemy loot tables
   - Faction enemies drop faction armors
   - Rare armors have lower drop rates

5. **Frontend Updates:**
   - Update armor display in inventory
   - Add faction filter to armor vendors
   - Show faction requirements in tooltips

6. **Testing:**
   - Test all armor tiers
   - Test faction restrictions
   - Test vendor availability
   - Test loot drops
   - Test defense/mobility balance

#### Acceptance Criteria

- [ ] 30+ armors implemented across all tiers
- [ ] Each tier has 3-5 armor options
- [ ] Faction armors properly restricted
- [ ] Non-aligned armors available to all
- [ ] Stat progression is balanced
- [ ] Defense/mobility trade-offs are meaningful
- [ ] All armors appear in appropriate vendors
- [ ] Loot tables updated with new armors

---

### Task 1.4: Fix Stack Sizes for Resources

#### Requirements

**Objective:** Ensure all resources have appropriate stack sizes defined.

**Resources to Update:**

1. **`scrap_metal_01`** - Scrap Metal
   - Current: No stack size (defaults to 1)
   - Update: `stackSize: 100`
   - Rationale: Common crafting material, should stack high

2. **`energy_cell_01`** - Energy Cell
   - Current: No stack size (defaults to 1)
   - Update: `stackSize: 50`
   - Rationale: Common power source, moderate stack

3. **Verify Planet Resources:**
   - All planet resources already have stack sizes ✅
   - No changes needed

#### Implementation Steps

1. **Update `backend/src/data/items.js`:**
   - Add `stackSize: 100` to `scrap_metal_01`
   - Add `stackSize: 50` to `energy_cell_01`

2. **Testing:**
   - Test stacking in inventory
   - Test vendor transactions with stacks
   - Test loot drops with stacks

#### Acceptance Criteria

- [ ] All resources have stack sizes defined
- [ ] Stack sizes are appropriate for item type
- [ ] Stacking works correctly in inventory
- [ ] Vendor transactions handle stacks properly

---

## PRIORITY 2: Feature Enhancements

**Timeline:** Weeks 2-3 (10 days)  
**Impact:** Medium  
**Effort:** Low-Medium

---

### Task 2.1: Expand Consumable Variety

#### Requirements

**Objective:** Add tiered consumables with multiple options at each tier.

**Consumable Categories:**

**1. Medpacs (Health Restoration)**
- **Common:** `medpac_01` (existing - 50 health)
- **Uncommon:** `medpac_02` (100 health), `medpac_advanced` (75 health, faster use)
- **Rare:** `medpac_03` (200 health), `bacta_patch` (150 health, instant)
- **Epic:** `bacta_tank` (full heal), `kolto_injection` (250 health)

**2. Stimpacks (Stamina Restoration)**
- **Common:** `stimpack_01` (existing - 25 stamina)
- **Uncommon:** `stimpack_02` (50 stamina), `stimpack_advanced` (40 stamina, faster)
- **Rare:** `stimpack_03` (100 stamina), `adrenaline_shot` (75 stamina, instant)

**3. Combo Items (Health + Stamina)**
- **Uncommon:** `medkit` (75 health, 50 stamina)
- **Rare:** `survival_kit` (150 health, 100 stamina)
- **Epic:** `emergency_kit` (200 health, 150 stamina)

**4. Special Consumables**
- **Rare:** `shield_booster` (temporary shield), `accuracy_booster` (temporary accuracy)
- **Epic:** `berserker_stim` (temporary damage boost), `stealth_pack` (temporary stealth)

#### Implementation Steps

1. **Create Consumable Definitions:**
   - Add all new consumables to `items.js`
   - Ensure proper stat definitions
   - Set appropriate values and weights

2. **Update Combat System:**
   - Support instant vs. gradual healing
   - Support temporary stat boosts
   - Support shield generation

3. **Update Vendor System:**
   - Medical vendors sell medpacs
   - General vendors sell basic consumables
   - Rare consumables from specialty vendors

4. **Testing:**
   - Test all consumable effects
   - Test stacking in inventory
   - Test vendor availability

#### Acceptance Criteria

- [ ] 15+ consumables implemented
- [ ] Tiered progression works
- [ ] All consumable effects function correctly
- [ ] Vendors stock appropriate consumables

---

### Task 2.2: Expand Accessory Variety

#### Requirements

**Objective:** Add more accessories with varied stat bonuses and special effects.

**Accessory Categories:**

**1. Datapads (Intelligence Bonus)**
- **Common:** `datapad_01` (existing - +2 intelligence)
- **Uncommon:** `datapad_02` (+5 intelligence), `datapad_corporate` (+4 intelligence, data_analysis)
- **Rare:** `datapad_03` (+10 intelligence, data_analysis), `datapad_jedi` (+8 intelligence, force_insight)

**2. Comlinks (Charisma Bonus)**
- **Common:** `comlink_01` (existing - +1 charisma)
- **Uncommon:** `comlink_02` (+3 charisma), `comlink_long_range` (+2 charisma, long_range_comm)
- **Rare:** `comlink_03` (+5 charisma, long_range_comm), `comlink_secure` (+4 charisma, secure_comm)

**3. Scanners (Perception Bonus)**
- **Uncommon:** `scanner` (+5 perception), `scanner_medical` (+3 perception, medical_scan)
- **Rare:** `scanner_advanced` (+10 perception), `scanner_force` (+8 perception, force_detection)

**4. Special Accessories**
- **Rare:** `security_keycard` (lockpicking +15), `smuggler_badge` (existing)
- **Epic:** `krayt_pearl` (existing), `jedi_artifact` (make equippable)
- **Legendary:** `ancient_artifact` (multiple bonuses)

#### Implementation Steps

1. **Create Accessory Definitions:**
   - Add all new accessories to `items.js`
   - Define stat bonuses
   - Add special effects where appropriate

2. **Update Equipment System:**
   - Ensure accessories can be equipped
   - Apply stat bonuses correctly
   - Support special effects

3. **Update Vendor System:**
   - Tech vendors sell datapads and scanners
   - Communication vendors sell comlinks
   - Specialty vendors sell rare accessories

4. **Testing:**
   - Test all accessory stat bonuses
   - Test special effects
   - Test vendor availability

#### Acceptance Criteria

- [ ] 12+ accessories implemented
- [ ] All stat bonuses work correctly
- [ ] Special effects function properly
- [ ] Vendors stock appropriate accessories

---

### Task 2.3: Add Tool Equipment Slot Items

#### Requirements

**Objective:** Create items for the tool equipment slot.

**Tool Categories:**

**1. Repair Tools**
- **Common:** `repair_toolkit` (repair +5)
- **Uncommon:** `advanced_toolkit` (repair +15), `specialized_toolkit` (repair +10, specific_bonus)
- **Rare:** `master_toolkit` (repair +25), `beskar_tools` (repair +20, durability_bonus)

**2. Slicing Tools (Hacking)**
- **Uncommon:** `slicer_toolkit` (hacking +10)
- **Rare:** `slicer_toolkit_advanced` (hacking +20), `slicer_toolkit_elite` (hacking +30)
- **Epic:** `slicer_toolkit_master` (hacking +40)

**3. Medical Tools**
- **Uncommon:** `medical_scanner` (medical +10), `medical_kit` (medical +8, healing_bonus)
- **Rare:** `medical_scanner_advanced` (medical +20), `bacta_applicator` (medical +15, instant_heal)

**4. Specialized Tools**
- **Rare:** `archaeology_toolkit` (archaeology +15), `mining_toolkit` (mining +20)
- **Epic:** `master_craftsman_tools` (all crafting +10)

#### Implementation Steps

1. **Create Tool Definitions:**
   - Add all tools to `items.js`
   - Set `equipmentSlot: 'tool'`
   - Define appropriate stat bonuses

2. **Update Equipment System:**
   - Ensure tool slot works
   - Apply tool bonuses to relevant actions
   - Support tool-specific actions

3. **Update Action System:**
   - Repair actions check for repair tools
   - Hacking actions check for slicing tools
   - Medical actions check for medical tools

4. **Testing:**
   - Test tool equipping
   - Test tool bonuses in actions
   - Test vendor availability

#### Acceptance Criteria

- [ ] 10+ tools implemented
- [ ] Tool slot functions correctly
- [ ] Tool bonuses apply to relevant actions
- [ ] Vendors stock appropriate tools

---

## PRIORITY 3: System Integration

**Timeline:** Weeks 4-5 (10 days)  
**Impact:** High  
**Effort:** High

---

### Task 3.1: Implement Special Effects System

#### Requirements

**Objective:** Create a framework for item special effects that modify gameplay.

**Special Effects to Implement:**

1. **Force Effects:**
   - `force_enhancement` - Increases Force power by 10%
   - `force_mastery` - Unlocks Force abilities
   - `force_insight` - Improves Force perception
   - `lightsaber_mastery` - +10% damage with lightsabers

2. **Combat Effects:**
   - `ion_damage` - Extra damage to droids (+50%)
   - `droid_bonus` - +25% damage to droids
   - `energy_resistance` - -20% energy damage taken
   - `masterwork_quality` - +5% to all combat stats

3. **Utility Effects:**
   - `data_analysis` - Unlocks information from datapads
   - `long_range_comm` - Enables long-distance communication
   - `secure_comm` - Encrypted communication
   - `stealth_bonus` - +15% stealth effectiveness
   - `detection_reduction` - -20% detection chance

4. **Faction Effects:**
   - `imperial_identification` - Recognized as Imperial (access benefits)
   - `mandalorian_craftsmanship` - +10% durability
   - `beskar_quality` - +25% durability, energy resistance
   - `smuggling_bonus` - +15% smuggling success

5. **Legendary Effects:**
   - `legendary_weapon` - +10% to all stats
   - `luck_bonus` - +5% to all random rolls
   - `legendary_armor` - +15% defense, +10% durability

#### Implementation Steps

1. **Create Special Effects Framework:**
   - File: `backend/src/services/specialEffectsService.js`
   - Define effect handlers
   - Create effect registry

2. **Update Combat System:**
   - Apply combat effects in damage calculation
   - Apply resistance effects in damage taken
   - Apply accuracy bonuses

3. **Update Item System:**
   - Parse specialEffects array
   - Apply effects when item is equipped
   - Remove effects when item is unequipped

4. **Update Frontend:**
   - Display special effects in tooltips
   - Show active effects in character sheet
   - Highlight special effects in inventory

5. **Testing:**
   - Test all special effects
   - Test effect stacking
   - Test effect removal

#### Acceptance Criteria

- [ ] Special effects framework implemented
- [ ] All defined effects work correctly
- [ ] Effects apply/remove correctly on equip/unequip
- [ ] Frontend displays effects properly
- [ ] Effect stacking rules are clear

---

### Task 3.2: Implement Ability System

#### Requirements

**Objective:** Create a system for permanent ability unlocks from items.

**Abilities to Implement:**

1. **Force Abilities:**
   - `force_insight` - Unlocks Force perception
   - `force_artifact_mastery` - Unlocks artifact-related abilities
   - `force_mastery` - Unlocks advanced Force abilities

2. **Combat Abilities:**
   - `weapon_mastery` - Unlocks weapon specialization
   - `armor_mastery` - Unlocks armor specialization

3. **Utility Abilities:**
   - `data_analysis_mastery` - Unlocks advanced data analysis
   - `slicing_mastery` - Unlocks advanced hacking

#### Implementation Steps

1. **Create Ability Model:**
   - File: `backend/src/models/CharacterAbility.js`
   - Store abilities in character model
   - Track ability unlocks

2. **Create Ability Service:**
   - File: `backend/src/services/abilityService.js`
   - Handle ability unlocking
   - Apply ability effects

3. **Update Item System:**
   - Detect `permanentAbility` in item stats
   - Unlock ability when item is used/equipped
   - Remove item after ability unlock (if consumable)

4. **Update Character Model:**
   - Add `abilities` JSONB field
   - Store unlocked abilities
   - Track ability progression

5. **Update Frontend:**
   - Display abilities in character sheet
   - Show ability requirements
   - Highlight unlockable abilities

6. **Testing:**
   - Test ability unlocking
   - Test ability effects
   - Test ability persistence

#### Acceptance Criteria

- [ ] Ability system implemented
- [ ] Abilities unlock correctly from items
- [ ] Ability effects apply correctly
- [ ] Abilities persist in character data
- [ ] Frontend displays abilities properly

---

### Task 3.3: Add Crafting System Integration

#### Requirements

**Objective:** Create a crafting system that uses resources to create items.

**Crafting Categories:**

**1. Weapon Crafting:**
- Lightsaber: `lightsaber_crystal` + `dantari_crystals` × 3 + `scrap_metal_01` × 5
- Custom Blaster: `blaster_pistol_01` + `energy_cell_01` × 3 + `scrap_metal_01` × 2
- Enhanced Rifle: `blaster_rifle_01` + `energy_cell_01` × 5 + `scrap_metal_01` × 3

**2. Armor Crafting:**
- Heavy Armor: `scrap_metal_01` × 10 + `energy_cell_01` × 2
- Faction Armor: Base armor + faction-specific materials
- Beskar Armor: `beskar_ingot` × 5 + `scrap_metal_01` × 3

**3. Consumable Crafting:**
- Advanced Medpac: `medpac_01` × 2 + `energy_cell_01` × 1
- Survival Kit: `medpac_01` + `stimpack_01` + `ration_01`

**4. Tool Crafting:**
- Advanced Toolkit: `repair_toolkit` + `scrap_metal_01` × 3
- Slicer Toolkit: `energy_cell_01` × 2 + `scrap_metal_01` × 2

#### Implementation Steps

1. **Create Crafting Service:**
   - File: `backend/src/services/craftingService.js`
   - Define recipe system
   - Handle crafting logic

2. **Create Recipe Definitions:**
   - File: `backend/src/data/craftingRecipes.js`
   - Define all recipes
   - Set requirements and results

3. **Update Inventory Service:**
   - Check recipe requirements
   - Consume materials
   - Add crafted items

4. **Create Crafting UI:**
   - File: `frontend/src/features/crafting/CraftingView.jsx`
   - Display available recipes
   - Show requirements
   - Handle crafting actions

5. **Testing:**
   - Test all recipes
   - Test material consumption
   - Test crafted item quality

#### Acceptance Criteria

- [ ] Crafting system implemented
- [ ] 20+ recipes defined
- [ ] Crafting UI functional
- [ ] Material consumption works
- [ ] Crafted items have correct stats

---

### Task 3.4: Add Item Sets

#### Requirements

**Objective:** Create item sets that provide bonuses when multiple pieces are equipped.

**Item Sets to Implement:**

1. **Imperial Set:**
   - Pieces: Stormtrooper Armor + E-11 Rifle + Imperial Accessory
   - 2-piece bonus: +5% accuracy
   - 3-piece bonus: +10% accuracy, +5% defense

2. **Jedi Set:**
   - Pieces: Lightsaber + Jedi Robes + Holocron
   - 2-piece bonus: +10 Force Power
   - 3-piece bonus: +20 Force Power, +15% Force ability effectiveness

3. **Smuggler Set:**
   - Pieces: Blaster Pistol + Light Armor + Smuggler Badge
   - 2-piece bonus: +10% smuggling success
   - 3-piece bonus: +20% smuggling success, +5% charisma

4. **Mandalorian Set:**
   - Pieces: Mandalorian Weapon + Beskar Armor + Mandalorian Accessory
   - 2-piece bonus: +10% damage, +10% defense
   - 3-piece bonus: +20% damage, +20% defense, energy resistance

#### Implementation Steps

1. **Create Item Set Definitions:**
   - File: `backend/src/data/itemSets.js`
   - Define set pieces
   - Define set bonuses

2. **Update Equipment System:**
   - Track equipped set pieces
   - Calculate set bonuses
   - Apply bonuses to character stats

3. **Update Frontend:**
   - Display set information in tooltips
   - Show set progress (X/3 pieces)
   - Highlight active set bonuses

4. **Testing:**
   - Test set detection
   - Test bonus application
   - Test set completion

#### Acceptance Criteria

- [ ] Item set system implemented
- [ ] 4+ item sets defined
- [ ] Set bonuses apply correctly
- [ ] Frontend displays set information
- [ ] Set completion is tracked

---

## PRIORITY 4: Quality of Life

**Timeline:** Week 6 (5 days)  
**Impact:** Medium  
**Effort:** Low-Medium

---

### Task 4.1: Standardize Rarity/Value Relationships

#### Requirements

**Objective:** Ensure item values align with rarity tiers.

**Value Ranges by Rarity:**
- **Common:** 10-500 credits
- **Uncommon:** 100-1,000 credits
- **Rare:** 500-2,500 credits
- **Epic:** 2,000-10,000 credits
- **Legendary:** 5,000+ credits

#### Implementation Steps

1. **Audit All Items:**
   - Check current values
   - Identify outliers
   - Create adjustment list

2. **Update Item Values:**
   - Adjust values to fit ranges
   - Maintain relative pricing
   - Update quest rewards if needed

3. **Testing:**
   - Test vendor pricing
   - Test quest rewards
   - Test loot values

#### Acceptance Criteria

- [ ] All items fit rarity value ranges
- [ ] Pricing is consistent
- [ ] No outliers remain

---

### Task 4.2: Add Item Icons/Sprites

#### Requirements

**Objective:** Add visual icons for all items.

#### Implementation Steps

1. **Create Icon System:**
   - Define icon naming convention: `item_${itemId}.png`
   - Create sprite sheet structure
   - Set up icon loading

2. **Create Icons:**
   - Design icons for each item category
   - Create unique icons for legendary items
   - Ensure consistent style

3. **Update Frontend:**
   - Load and display icons
   - Add icon fallbacks
   - Update inventory UI

4. **Testing:**
   - Test icon loading
   - Test icon display
   - Test fallbacks

#### Acceptance Criteria

- [ ] Icons system implemented
- [ ] All items have icons
- [ ] Icons display correctly
- [ ] Fallbacks work

---

### Task 4.3: Add Item Lore/Flavor Text

#### Requirements

**Objective:** Expand item descriptions with rich lore and context.

#### Implementation Steps

1. **Expand Descriptions:**
   - Add manufacturer information
   - Add historical context
   - Add cultural significance
   - Add usage tips

2. **Create Lore Database:**
   - File: `backend/src/data/itemLore.js`
   - Store extended descriptions
   - Link to items

3. **Update Frontend:**
   - Display extended descriptions in tooltips
   - Add "More Info" button
   - Show lore in item details

4. **Testing:**
   - Test description display
   - Test lore loading
   - Test UI responsiveness

#### Acceptance Criteria

- [ ] All items have expanded descriptions
- [ ] Lore system functional
- [ ] Frontend displays lore properly

---

### Task 4.4: Add Item Tooltips with Full Stats

#### Requirements

**Objective:** Create comprehensive tooltips showing all item information.

#### Implementation Steps

1. **Create Tooltip Component:**
   - File: `frontend/src/components/ItemTooltip.jsx`
   - Display all item stats
   - Show faction requirements
   - Show special effects
   - Show set information

2. **Update Inventory UI:**
   - Add tooltips to all item displays
   - Show tooltips on hover
   - Support keyboard navigation

3. **Testing:**
   - Test tooltip display
   - Test tooltip positioning
   - Test tooltip content

#### Acceptance Criteria

- [ ] Tooltip system implemented
- [ ] All item information displayed
- [ ] Tooltips are responsive
- [ ] Tooltips are accessible

---

## Implementation Timeline

### Week 1: Priority 1 (Critical Improvements)
- **Day 1-2:** Task 1.1 - Faction Associations
- **Day 3-4:** Task 1.2 - Weapon Expansion (Part 1: Common-Uncommon)
- **Day 5:** Task 1.2 - Weapon Expansion (Part 2: Rare-Epic-Legendary)
- **Day 6-7:** Task 1.3 - Armor Expansion (Part 1: Common-Uncommon)
- **Day 8-9:** Task 1.3 - Armor Expansion (Part 2: Rare-Epic-Legendary)
- **Day 10:** Task 1.4 - Stack Sizes

### Week 2-3: Priority 2 (Feature Enhancements)
- **Week 2, Day 1-3:** Task 2.1 - Consumable Expansion
- **Week 2, Day 4-5:** Task 2.2 - Accessory Expansion
- **Week 3, Day 1-3:** Task 2.3 - Tool Items
- **Week 3, Day 4-5:** Testing and polish

### Week 4-5: Priority 3 (System Integration)
- **Week 4, Day 1-3:** Task 3.1 - Special Effects System
- **Week 4, Day 4-5:** Task 3.2 - Ability System
- **Week 5, Day 1-3:** Task 3.3 - Crafting System
- **Week 5, Day 4-5:** Task 3.4 - Item Sets

### Week 6: Priority 4 (Quality of Life)
- **Day 1:** Task 4.1 - Standardize Values
- **Day 2-3:** Task 4.2 - Item Icons
- **Day 4:** Task 4.3 - Item Lore
- **Day 5:** Task 4.4 - Item Tooltips

---

## Technical Requirements

### Database Changes

**No schema changes required** - All fields already exist:
- `factionId` (STRING, nullable)
- `minReputationTier` (STRING, nullable)
- `stats` (JSONB)
- `specialEffects` (in stats JSONB)
- `equipmentSlot` (STRING, nullable)

### API Changes

**New Endpoints:**
- `GET /api/items/by-faction/:factionId` - Get items by faction
- `GET /api/items/by-rarity/:rarity` - Get items by rarity
- `POST /api/crafting/craft` - Craft an item
- `GET /api/crafting/recipes` - Get available recipes
- `GET /api/items/sets` - Get item set information

### Frontend Changes

**New Components:**
- `ItemTooltip.jsx` - Comprehensive item tooltip
- `CraftingView.jsx` - Crafting interface
- `ItemSetDisplay.jsx` - Item set information
- `FactionFilter.jsx` - Filter items by faction

**Updated Components:**
- `InventoryView.jsx` - Show faction requirements, set info
- `TradingView.jsx` - Filter by faction
- `EquipmentView.jsx` - Show set bonuses

---

## Testing Requirements

### Unit Tests
- Item definitions are valid
- Faction restrictions work
- Stat calculations are correct
- Special effects apply correctly

### Integration Tests
- Vendor filtering by faction
- Equipment restrictions
- Crafting recipes
- Item set bonuses

### User Acceptance Tests
- Players can find appropriate items
- Faction restrictions are clear
- Crafting is intuitive
- Item sets provide meaningful bonuses

---

## Success Metrics

### Quantitative
- **50+ weapons** implemented
- **30+ armors** implemented
- **15+ consumables** implemented
- **12+ accessories** implemented
- **10+ tools** implemented
- **20+ crafting recipes** defined
- **4+ item sets** created

### Qualitative
- Players have meaningful choices at each tier
- Faction items feel distinct and valuable
- Non-aligned items are competitive
- Special effects add depth
- Crafting system is engaging
- Item sets provide build variety

---

## Risk Mitigation

### Risk 1: Item Balance
**Mitigation:** Extensive playtesting, stat review, iterative adjustments

### Risk 2: Faction Lock-in
**Mitigation:** Ensure non-aligned items are competitive, allow faction switching

### Risk 3: Implementation Complexity
**Mitigation:** Phased implementation, thorough testing at each phase

### Risk 4: Performance Impact
**Mitigation:** Efficient data structures, lazy loading, caching

---

## Conclusion

This comprehensive enhancement plan will transform the item system from a basic 77-item collection into an expansive, immersive galaxy-spanning equipment system. With 100+ new items, faction integration, special effects, crafting, and quality-of-life improvements, players will have meaningful choices and engaging progression throughout their journey across the galaxy.

**Next Steps:**
1. Review and approve this document
2. Begin Priority 1 implementation
3. Set up testing framework
4. Create item asset pipeline (icons, descriptions)

---

**Document Version:** 1.0  
**Last Updated:** 2024  
**Status:** Ready for Implementation


