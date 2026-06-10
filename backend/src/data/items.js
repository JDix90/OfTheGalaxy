/**
 * Item Definitions
 * Defines all items available in the game
 */

const ITEM_TYPES = {
  WEAPON: 'weapon',
  ARMOR: 'armor',
  ACCESSORY: 'accessory',
  CONSUMABLE: 'consumable',
  RESOURCE: 'resource',
  QUEST_ITEM: 'quest_item',
  MISC: 'misc'
};

const ITEM_RARITIES = {
  COMMON: 'common',
  UNCOMMON: 'uncommon',
  RARE: 'rare',
  EPIC: 'epic',
  LEGENDARY: 'legendary'
};

/**
 * Item definitions
 * Each item has: id, name, type, rarity, description, stats, value, weight
 */
const itemDefinitions = {
  // Weapons
  'blaster_pistol_01': {
    id: 'blaster_pistol_01',
    name: 'DL-44 Heavy Blaster Pistol',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.UNCOMMON,
    description: 'A reliable heavy blaster pistol favored by smugglers and bounty hunters.',
    stats: {
      damage: 25,
      range: 30,
      accuracy: 75
    },
    equipmentSlot: 'weapon',
    value: 500,
    weight: 2.5,
    factionId: null
  },
  'blaster_rifle_01': {
    id: 'blaster_rifle_01',
    name: 'E-11 Blaster Rifle',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.COMMON,
    description: 'Standard issue Imperial blaster rifle.',
    stats: {
      damage: 30,
      range: 50,
      accuracy: 70
    },
    equipmentSlot: 'weapon',
    value: 450,
    weight: 4.0,
    factionId: 'imperial_remnant',
    minReputationTier: null
  },
  'lightsaber_01': {
    id: 'lightsaber_01',
    name: 'Lightsaber',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.LEGENDARY,
    description: 'An elegant weapon for a more civilized age.',
    stats: {
      damage: 50,
      range: 2,
      accuracy: 95,
      forcePower: 15
    },
    equipmentSlot: 'weapon',
    value: 10000,
    weight: 1.0,
    factionId: 'jedi_seekers',
    minReputationTier: 'trusted',
    specialEffects: ['force_enhancement', 'lightsaber_mastery']
  },
  
  // ========== PRIORITY 1: EXPANDED WEAPONS ==========
  
  // Blaster Pistols - Common Tier
  'blaster_pistol_imperial': {
    id: 'blaster_pistol_imperial',
    name: 'SE-14r Blaster Pistol',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.COMMON,
    description: 'Standard issue Imperial sidearm. Reliable and accurate.',
    stats: {
      damage: 23,
      range: 28,
      accuracy: 78
    },
    equipmentSlot: 'weapon',
    value: 450,
    weight: 2.3,
    factionId: 'imperial_remnant',
    minReputationTier: null
  },
  'blaster_pistol_rebel': {
    id: 'blaster_pistol_rebel',
    name: 'A-180 Blaster Pistol',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.COMMON,
    description: 'New Republic standard issue blaster pistol. Versatile and dependable.',
    stats: {
      damage: 24,
      range: 32,
      accuracy: 76
    },
    equipmentSlot: 'weapon',
    value: 480,
    weight: 2.4,
    factionId: 'new_republic',
    minReputationTier: null
  },
  
  // Blaster Rifles - Common Tier
  'blaster_rifle_generic': {
    id: 'blaster_rifle_generic',
    name: 'DC-15A Blaster Rifle',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.COMMON,
    description: 'A common blaster rifle found throughout the galaxy. No faction affiliation.',
    stats: {
      damage: 28,
      range: 45,
      accuracy: 68
    },
    equipmentSlot: 'weapon',
    value: 400,
    weight: 3.8,
    factionId: null
  },
  'blaster_rifle_rebel': {
    id: 'blaster_rifle_rebel',
    name: 'A280 Blaster Rifle',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.COMMON,
    description: 'New Republic standard issue blaster rifle. Reliable and effective.',
    stats: {
      damage: 29,
      range: 48,
      accuracy: 72
    },
    equipmentSlot: 'weapon',
    value: 420,
    weight: 3.9,
    factionId: 'new_republic',
    minReputationTier: null
  },
  
  // Melee Weapons - Common Tier
  'vibroblade': {
    id: 'vibroblade',
    name: 'Vibroblade',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.COMMON,
    description: 'A basic vibroblade. Simple but effective in close combat.',
    stats: {
      damage: 20,
      range: 1,
      accuracy: 85
    },
    equipmentSlot: 'weapon',
    value: 200,
    weight: 1.5,
    factionId: null
  },
  'vibroblade_imperial': {
    id: 'vibroblade_imperial',
    name: 'Imperial Vibroblade',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.COMMON,
    description: 'Standard issue Imperial vibroblade. Durable and reliable.',
    stats: {
      damage: 21,
      range: 1,
      accuracy: 83
    },
    equipmentSlot: 'weapon',
    value: 220,
    weight: 1.6,
    factionId: 'imperial_remnant',
    minReputationTier: null
  },
  
  // Blaster Pistols - Uncommon Tier
  'blaster_pistol_02': {
    id: 'blaster_pistol_02',
    name: 'DL-18 Blaster Pistol',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.UNCOMMON,
    description: 'An upgraded version of the DL-44. Improved accuracy and range.',
    stats: {
      damage: 32,
      range: 35,
      accuracy: 80
    },
    equipmentSlot: 'weapon',
    value: 800,
    weight: 2.6,
    factionId: null
  },
  'blaster_pistol_smuggler': {
    id: 'blaster_pistol_smuggler',
    name: 'DT-12 Blaster Pistol',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.UNCOMMON,
    description: 'A compact blaster favored by smugglers. Easy to conceal and reliable.',
    stats: {
      damage: 28,
      range: 30,
      accuracy: 82
    },
    equipmentSlot: 'weapon',
    value: 750,
    weight: 2.0,
    factionId: 'smugglers_guild',
    minReputationTier: 'friendly'
  },
  'blaster_pistol_corporate': {
    id: 'blaster_pistol_corporate',
    name: 'Czerka C-10 Blaster Pistol',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.UNCOMMON,
    description: 'Corporate Sector security weapon. High damage, moderate accuracy.',
    stats: {
      damage: 35,
      range: 28,
      accuracy: 72
    },
    equipmentSlot: 'weapon',
    value: 900,
    weight: 2.8,
    factionId: 'corporate_sector',
    minReputationTier: 'friendly'
  },
  'blaster_pistol_bounty': {
    id: 'blaster_pistol_bounty',
    name: 'EE-3 Blaster Pistol',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.UNCOMMON,
    description: 'Popular among bounty hunters. Balanced stats and reliable performance.',
    stats: {
      damage: 30,
      range: 33,
      accuracy: 78
    },
    equipmentSlot: 'weapon',
    value: 850,
    weight: 2.5,
    factionId: null
  },
  
  // Blaster Rifles - Uncommon Tier
  'blaster_rifle_02': {
    id: 'blaster_rifle_02',
    name: 'E-11 Enhanced Blaster Rifle',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.UNCOMMON,
    description: 'Enhanced version of the standard E-11. Improved damage and accuracy.',
    stats: {
      damage: 35,
      range: 55,
      accuracy: 75
    },
    equipmentSlot: 'weapon',
    value: 900,
    weight: 4.2,
    factionId: 'imperial_remnant',
    minReputationTier: null
  },
  'blaster_rifle_rebel_enhanced': {
    id: 'blaster_rifle_rebel_enhanced',
    name: 'A280 Enhanced Blaster Rifle',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.UNCOMMON,
    description: 'Enhanced New Republic blaster rifle. Improved range and accuracy.',
    stats: {
      damage: 33,
      range: 58,
      accuracy: 77
    },
    equipmentSlot: 'weapon',
    value: 850,
    weight: 4.0,
    factionId: 'new_republic',
    minReputationTier: null
  },
  'blaster_rifle_corporate': {
    id: 'blaster_rifle_corporate',
    name: 'Czerka C-20 Blaster Rifle',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.UNCOMMON,
    description: 'Corporate Sector security rifle. High damage output.',
    stats: {
      damage: 36,
      range: 50,
      accuracy: 70
    },
    equipmentSlot: 'weapon',
    value: 950,
    weight: 4.5,
    factionId: 'corporate_sector',
    minReputationTier: 'friendly'
  },
  'blaster_rifle_scout': {
    id: 'blaster_rifle_scout',
    name: 'Scout Rifle',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.UNCOMMON,
    description: 'A lightweight rifle favored by scouts and explorers.',
    stats: {
      damage: 31,
      range: 52,
      accuracy: 76
    },
    equipmentSlot: 'weapon',
    value: 1000,
    weight: 3.5,
    factionId: null
  },
  
  // Melee Weapons - Uncommon Tier
  'vibrosword': {
    id: 'vibrosword',
    name: 'Vibrosword',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.UNCOMMON,
    description: 'A standard vibrosword. Effective melee weapon with good reach.',
    stats: {
      damage: 30,
      range: 1,
      accuracy: 80
    },
    equipmentSlot: 'weapon',
    value: 400,
    weight: 2.0,
    factionId: null
  },
  'vibrosword_rebel': {
    id: 'vibrosword_rebel',
    name: 'Rebel Vibrosword',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.UNCOMMON,
    description: 'New Republic vibrosword. Lightweight and effective.',
    stats: {
      damage: 29,
      range: 1,
      accuracy: 82
    },
    equipmentSlot: 'weapon',
    value: 420,
    weight: 1.9,
    factionId: 'new_republic',
    minReputationTier: null
  },
  'vibroknife': {
    id: 'vibroknife',
    name: 'Vibroknife',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.UNCOMMON,
    description: 'A compact vibroknife. Quick and deadly in close quarters.',
    stats: {
      damage: 25,
      range: 1,
      accuracy: 88
    },
    equipmentSlot: 'weapon',
    value: 350,
    weight: 0.8,
    factionId: null
  },
  
  // Blaster Pistols - Rare Tier
  'blaster_pistol_03': {
    id: 'blaster_pistol_03',
    name: 'DL-44 Custom Blaster Pistol',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.RARE,
    description: 'A custom-tuned DL-44. Maximum performance for the discerning shooter.',
    stats: {
      damage: 40,
      range: 38,
      accuracy: 85
    },
    equipmentSlot: 'weapon',
    value: 1500,
    weight: 2.7,
    factionId: null
  },
  'blaster_pistol_imperial_elite': {
    id: 'blaster_pistol_imperial_elite',
    name: 'SE-14r Elite Blaster Pistol',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.RARE,
    description: 'Elite Imperial sidearm. Issued to officers and special forces.',
    stats: {
      damage: 38,
      range: 35,
      accuracy: 83
    },
    equipmentSlot: 'weapon',
    value: 1400,
    weight: 2.4,
    factionId: 'imperial_remnant',
    minReputationTier: 'friendly'
  },
  'blaster_pistol_rebel_elite': {
    id: 'blaster_pistol_rebel_elite',
    name: 'A-180 Modified Blaster Pistol',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.RARE,
    description: 'Modified New Republic blaster. Enhanced for special operations.',
    stats: {
      damage: 39,
      range: 36,
      accuracy: 84
    },
    equipmentSlot: 'weapon',
    value: 1450,
    weight: 2.5,
    factionId: 'new_republic',
    minReputationTier: 'friendly'
  },
  'blaster_pistol_mandalorian': {
    id: 'blaster_pistol_mandalorian',
    name: 'Westar-35 Blaster Pistol',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.RARE,
    description: 'Mandalorian blaster pistol. Exceptional craftsmanship and power.',
    stats: {
      damage: 42,
      range: 40,
      accuracy: 86
    },
    equipmentSlot: 'weapon',
    value: 2000,
    weight: 2.6,
    factionId: null,
    specialEffects: ['mandalorian_craftsmanship']
  },
  
  // Blaster Rifles - Rare Tier
  'blaster_rifle_03': {
    id: 'blaster_rifle_03',
    name: 'E-11 Elite Blaster Rifle',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.RARE,
    description: 'Elite version of the E-11. Maximum Imperial firepower.',
    stats: {
      damage: 40,
      range: 60,
      accuracy: 80
    },
    equipmentSlot: 'weapon',
    value: 1800,
    weight: 4.5,
    factionId: 'imperial_remnant',
    minReputationTier: 'friendly'
  },
  'blaster_rifle_rebel_elite': {
    id: 'blaster_rifle_rebel_elite',
    name: 'A280 Elite Blaster Rifle',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.RARE,
    description: 'Elite New Republic blaster rifle. Superior range and accuracy.',
    stats: {
      damage: 38,
      range: 62,
      accuracy: 82
    },
    equipmentSlot: 'weapon',
    value: 1700,
    weight: 4.3,
    factionId: 'new_republic',
    minReputationTier: 'friendly'
  },
  'blaster_rifle_mandalorian': {
    id: 'blaster_rifle_mandalorian',
    name: 'Mandalorian Blaster Rifle',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.RARE,
    description: 'Mandalorian-crafted blaster rifle. Exceptional quality and power.',
    stats: {
      damage: 42,
      range: 58,
      accuracy: 84
    },
    equipmentSlot: 'weapon',
    value: 2200,
    weight: 4.2,
    factionId: null,
    specialEffects: ['mandalorian_craftsmanship']
  },
  'blaster_rifle_heavy': {
    id: 'blaster_rifle_heavy',
    name: 'Heavy Blaster Rifle',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.RARE,
    description: 'A heavy blaster rifle. High damage but slower rate of fire.',
    stats: {
      damage: 45,
      range: 55,
      accuracy: 72
    },
    equipmentSlot: 'weapon',
    value: 2000,
    weight: 5.5,
    factionId: null
  },
  'blaster_rifle_precision': {
    id: 'blaster_rifle_precision',
    name: 'Precision Blaster Rifle',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.RARE,
    description: 'A precision-engineered rifle. High accuracy and range.',
    stats: {
      damage: 36,
      range: 65,
      accuracy: 88
    },
    equipmentSlot: 'weapon',
    value: 1900,
    weight: 4.8,
    factionId: null
  },
  
  // Heavy Weapons - Rare Tier
  'heavy_blaster': {
    id: 'heavy_blaster',
    name: 'Heavy Blaster',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.RARE,
    description: 'A heavy blaster weapon. High damage but lower accuracy.',
    stats: {
      damage: 55,
      range: 40,
      accuracy: 65
    },
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
    stats: {
      damage: 58,
      range: 42,
      accuracy: 63
    },
    equipmentSlot: 'weapon',
    value: 2200,
    weight: 8.5,
    factionId: 'imperial_remnant',
    minReputationTier: 'friendly'
  },
  'heavy_blaster_rebel': {
    id: 'heavy_blaster_rebel',
    name: 'T-21 Heavy Blaster',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.RARE,
    description: 'New Republic heavy blaster. Powerful and reliable.',
    stats: {
      damage: 56,
      range: 41,
      accuracy: 67
    },
    equipmentSlot: 'weapon',
    value: 2100,
    weight: 8.2,
    factionId: 'new_republic',
    minReputationTier: 'friendly'
  },
  
  // Sniper Rifles - Rare Tier
  'sniper_rifle': {
    id: 'sniper_rifle',
    name: 'Sniper Rifle',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.RARE,
    description: 'Long-range precision weapon. High accuracy and range.',
    stats: {
      damage: 60,
      range: 100,
      accuracy: 90
    },
    equipmentSlot: 'weapon',
    value: 2500,
    weight: 6.0,
    factionId: null
  },
  'sniper_rifle_imperial': {
    id: 'sniper_rifle_imperial',
    name: 'E-11s Sniper Rifle',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.RARE,
    description: 'Imperial sniper variant. Maximum range and precision.',
    stats: {
      damage: 62,
      range: 105,
      accuracy: 88
    },
    equipmentSlot: 'weapon',
    value: 2400,
    weight: 6.2,
    factionId: 'imperial_remnant',
    minReputationTier: 'friendly'
  },
  
  // Melee Weapons - Rare Tier
  'electrostaff': {
    id: 'electrostaff',
    name: 'Electrostaff',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.RARE,
    description: 'An electrostaff. Extended reach and electrical damage.',
    stats: {
      damage: 40,
      range: 2,
      accuracy: 75
    },
    equipmentSlot: 'weapon',
    value: 1200,
    weight: 3.5,
    factionId: null
  },
  'electrostaff_magnaguard': {
    id: 'electrostaff_magnaguard',
    name: 'Magnaguard Electrostaff',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.RARE,
    description: 'A rare electrostaff from a Magnaguard. Exceptional quality.',
    stats: {
      damage: 45,
      range: 2,
      accuracy: 78
    },
    equipmentSlot: 'weapon',
    value: 1800,
    weight: 3.8,
    factionId: null
  },
  'vibroaxe': {
    id: 'vibroaxe',
    name: 'Vibroaxe',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.RARE,
    description: 'A heavy vibroaxe. Devastating melee weapon.',
    stats: {
      damage: 48,
      range: 1,
      accuracy: 70
    },
    equipmentSlot: 'weapon',
    value: 1500,
    weight: 4.5,
    factionId: null
  },
  'vibrosword_mandalorian': {
    id: 'vibrosword_mandalorian',
    name: 'Mandalorian Vibrosword',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.RARE,
    description: 'Mandalorian-crafted vibrosword. Exceptional craftsmanship.',
    stats: {
      damage: 42,
      range: 1,
      accuracy: 82
    },
    equipmentSlot: 'weapon',
    value: 2000,
    weight: 2.2,
    factionId: null,
    specialEffects: ['mandalorian_craftsmanship']
  },
  
  // Blaster Pistols - Epic Tier
  'blaster_pistol_legendary': {
    id: 'blaster_pistol_legendary',
    name: 'DL-44 Masterwork Blaster Pistol',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.EPIC,
    description: 'A masterwork DL-44. The pinnacle of blaster pistol craftsmanship.',
    stats: {
      damage: 50,
      range: 45,
      accuracy: 90
    },
    equipmentSlot: 'weapon',
    value: 5000,
    weight: 2.8,
    factionId: null,
    specialEffects: ['masterwork_quality']
  },
  'blaster_pistol_imperial_master': {
    id: 'blaster_pistol_imperial_master',
    name: 'SE-14r Master Blaster Pistol',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.EPIC,
    description: 'Master-crafted Imperial sidearm. The finest Imperial weaponry.',
    stats: {
      damage: 48,
      range: 42,
      accuracy: 88
    },
    equipmentSlot: 'weapon',
    value: 4800,
    weight: 2.5,
    factionId: 'imperial_remnant',
    minReputationTier: 'trusted'
  },
  'blaster_pistol_rebel_master': {
    id: 'blaster_pistol_rebel_master',
    name: 'A-180 Master Blaster Pistol',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.EPIC,
    description: 'Master-crafted New Republic blaster. Exceptional quality.',
    stats: {
      damage: 49,
      range: 43,
      accuracy: 89
    },
    equipmentSlot: 'weapon',
    value: 4900,
    weight: 2.6,
    factionId: 'new_republic',
    minReputationTier: 'trusted'
  },
  'blaster_pistol_bespin': {
    id: 'blaster_pistol_bespin',
    name: 'Bespin Special Blaster Pistol',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.EPIC,
    description: 'A unique blaster from Bespin. Rare and powerful.',
    stats: {
      damage: 47,
      range: 44,
      accuracy: 87
    },
    equipmentSlot: 'weapon',
    value: 5200,
    weight: 2.7,
    factionId: null
  },
  
  // Blaster Rifles - Epic Tier
  'sniper_rifle_elite': {
    id: 'sniper_rifle_elite',
    name: 'Elite Sniper Rifle',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.EPIC,
    description: 'An elite sniper rifle. Maximum range and precision.',
    stats: {
      damage: 75,
      range: 120,
      accuracy: 95
    },
    equipmentSlot: 'weapon',
    value: 6000,
    weight: 6.5,
    factionId: null
  },
  'blaster_rifle_imperial_master': {
    id: 'blaster_rifle_imperial_master',
    name: 'E-11 Master Blaster Rifle',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.EPIC,
    description: 'Master-crafted Imperial rifle. The finest Imperial weaponry.',
    stats: {
      damage: 48,
      range: 65,
      accuracy: 85
    },
    equipmentSlot: 'weapon',
    value: 5500,
    weight: 4.8,
    factionId: 'imperial_remnant',
    minReputationTier: 'trusted'
  },
  'blaster_rifle_rebel_master': {
    id: 'blaster_rifle_rebel_master',
    name: 'A280 Master Blaster Rifle',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.EPIC,
    description: 'Master-crafted New Republic rifle. Exceptional quality.',
    stats: {
      damage: 46,
      range: 68,
      accuracy: 87
    },
    equipmentSlot: 'weapon',
    value: 5400,
    weight: 4.6,
    factionId: 'new_republic',
    minReputationTier: 'trusted'
  },
  'blaster_rifle_ancient': {
    id: 'blaster_rifle_ancient',
    name: 'Ancient Blaster Rifle',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.EPIC,
    description: 'An ancient blaster rifle. Rare find with unique properties.',
    stats: {
      damage: 50,
      range: 70,
      accuracy: 90
    },
    equipmentSlot: 'weapon',
    value: 7000,
    weight: 5.0,
    factionId: null
  },
  
  // Heavy Weapons - Epic Tier
  'heavy_blaster_elite': {
    id: 'heavy_blaster_elite',
    name: 'Elite Heavy Blaster',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.EPIC,
    description: 'An elite heavy blaster. Maximum firepower.',
    stats: {
      damage: 70,
      range: 45,
      accuracy: 70
    },
    equipmentSlot: 'weapon',
    value: 5000,
    weight: 9.0,
    factionId: null
  },
  'repeating_blaster': {
    id: 'repeating_blaster',
    name: 'Repeating Blaster',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.EPIC,
    description: 'A repeating blaster. High rate of fire and damage.',
    stats: {
      damage: 65,
      range: 50,
      accuracy: 68
    },
    equipmentSlot: 'weapon',
    value: 5500,
    weight: 8.5,
    factionId: null
  },
  'plasma_cannon': {
    id: 'plasma_cannon',
    name: 'Plasma Cannon',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.EPIC,
    description: 'A rare plasma cannon. Devastating energy weapon.',
    stats: {
      damage: 80,
      range: 55,
      accuracy: 65
    },
    equipmentSlot: 'weapon',
    value: 8000,
    weight: 12.0,
    factionId: null
  },
  
  // Sniper Rifles - Epic Tier
  'sniper_rifle_mandalorian': {
    id: 'sniper_rifle_mandalorian',
    name: 'Mandalorian Sniper Rifle',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.EPIC,
    description: 'Mandalorian-crafted sniper rifle. Exceptional precision.',
    stats: {
      damage: 78,
      range: 125,
      accuracy: 96
    },
    equipmentSlot: 'weapon',
    value: 7000,
    weight: 6.8,
    factionId: null,
    specialEffects: ['mandalorian_craftsmanship']
  },
  'sniper_rifle_ancient': {
    id: 'sniper_rifle_ancient',
    name: 'Ancient Sniper Rifle',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.EPIC,
    description: 'An ancient sniper rifle. Rare find with unique properties.',
    stats: {
      damage: 80,
      range: 130,
      accuracy: 98
    },
    equipmentSlot: 'weapon',
    value: 9000,
    weight: 7.0,
    factionId: null
  },
  
  // Melee Weapons - Epic Tier
  'electrostaff_elite': {
    id: 'electrostaff_elite',
    name: 'Elite Electrostaff',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.EPIC,
    description: 'An elite electrostaff. Maximum reach and power.',
    stats: {
      damage: 55,
      range: 2,
      accuracy: 82
    },
    equipmentSlot: 'weapon',
    value: 4000,
    weight: 4.0,
    factionId: null
  },
  'vibrosword_ancient': {
    id: 'vibrosword_ancient',
    name: 'Ancient Vibrosword',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.EPIC,
    description: 'An ancient vibrosword. Rare find with unique properties.',
    stats: {
      damage: 52,
      range: 1,
      accuracy: 88
    },
    equipmentSlot: 'weapon',
    value: 5000,
    weight: 2.5,
    factionId: null
  },
  'force_pike': {
    id: 'force_pike',
    name: 'Force Pike',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.EPIC,
    description: 'A rare force pike. Extended reach and electrical damage.',
    stats: {
      damage: 58,
      range: 3,
      accuracy: 80
    },
    equipmentSlot: 'weapon',
    value: 6000,
    weight: 4.5,
    factionId: null
  },
  
  // Special Weapons - Epic Tier
  'ion_blaster': {
    id: 'ion_blaster',
    name: 'Ion Blaster',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.EPIC,
    description: 'An ion blaster. Extra effective against droids and electronic systems.',
    stats: {
      damage: 45,
      range: 35,
      accuracy: 80
    },
    equipmentSlot: 'weapon',
    value: 4000,
    weight: 3.0,
    factionId: null,
    specialEffects: ['ion_damage', 'droid_bonus']
  },
  'stun_blaster': {
    id: 'stun_blaster',
    name: 'Stun Blaster',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.EPIC,
    description: 'A stun blaster. Non-lethal but effective.',
    stats: {
      damage: 20,
      range: 30,
      accuracy: 85
    },
    equipmentSlot: 'weapon',
    value: 3500,
    weight: 2.5,
    factionId: null,
    specialEffects: ['stun_effect']
  },
  'flame_thrower': {
    id: 'flame_thrower',
    name: 'Flamethrower',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.EPIC,
    description: 'A flamethrower. Area damage and fire effects.',
    stats: {
      damage: 60,
      range: 25,
      accuracy: 70
    },
    equipmentSlot: 'weapon',
    value: 5000,
    weight: 10.0,
    factionId: null,
    specialEffects: ['area_damage', 'fire_effect']
  },
  
  // Legendary Weapons
  'blaster_pistol_han_solo': {
    id: 'blaster_pistol_han_solo',
    name: 'Han Solo\'s DL-44',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.LEGENDARY,
    description: 'The legendary blaster pistol of Han Solo. A piece of galactic history.',
    stats: {
      damage: 55,
      range: 50,
      accuracy: 95
    },
    equipmentSlot: 'weapon',
    value: 15000,
    weight: 2.5,
    factionId: null,
    specialEffects: ['legendary_weapon', 'luck_bonus']
  },
  'blaster_pistol_ancient': {
    id: 'blaster_pistol_ancient',
    name: 'Ancient Blaster Pistol',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.LEGENDARY,
    description: 'An ancient blaster pistol. Rare find with unique properties.',
    stats: {
      damage: 58,
      range: 52,
      accuracy: 96
    },
    equipmentSlot: 'weapon',
    value: 18000,
    weight: 2.6,
    factionId: null
  },
  'blaster_rifle_legendary': {
    id: 'blaster_rifle_legendary',
    name: 'Legendary Blaster Rifle',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.LEGENDARY,
    description: 'A legendary blaster rifle. The pinnacle of weaponry.',
    stats: {
      damage: 65,
      range: 80,
      accuracy: 95
    },
    equipmentSlot: 'weapon',
    value: 20000,
    weight: 5.5,
    factionId: null,
    specialEffects: ['legendary_weapon']
  },
  'blaster_rifle_force_enhanced': {
    id: 'blaster_rifle_force_enhanced',
    name: 'Force-Enhanced Blaster Rifle',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.LEGENDARY,
    description: 'A blaster rifle enhanced with the Force. Unique and powerful.',
    stats: {
      damage: 60,
      range: 75,
      accuracy: 98,
      forcePower: 10
    },
    equipmentSlot: 'weapon',
    value: 25000,
    weight: 5.0,
    factionId: 'jedi_seekers',
    minReputationTier: 'allied',
    specialEffects: ['force_enhancement', 'legendary_weapon']
  },
  'legendary_heavy_weapon': {
    id: 'legendary_heavy_weapon',
    name: 'Legendary Heavy Weapon',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.LEGENDARY,
    description: 'A legendary heavy weapon. Maximum firepower.',
    stats: {
      damage: 90,
      range: 60,
      accuracy: 80
    },
    equipmentSlot: 'weapon',
    value: 30000,
    weight: 15.0,
    factionId: null,
    specialEffects: ['legendary_weapon']
  },
  'legendary_sniper': {
    id: 'legendary_sniper',
    name: 'Legendary Sniper Rifle',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.LEGENDARY,
    description: 'A legendary sniper rifle. The ultimate precision weapon.',
    stats: {
      damage: 95,
      range: 150,
      accuracy: 99
    },
    equipmentSlot: 'weapon',
    value: 35000,
    weight: 7.5,
    factionId: null,
    specialEffects: ['legendary_weapon']
  },
  'legendary_melee': {
    id: 'legendary_melee',
    name: 'Legendary Melee Weapon',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.LEGENDARY,
    description: 'A legendary melee weapon. The ultimate close combat tool.',
    stats: {
      damage: 70,
      range: 2,
      accuracy: 95
    },
    equipmentSlot: 'weapon',
    value: 25000,
    weight: 3.0,
    factionId: null,
    specialEffects: ['legendary_weapon']
  },
  'dark_saber': {
    id: 'dark_saber',
    name: 'Darksaber',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.LEGENDARY,
    description: 'The legendary Darksaber. A unique Mandalorian weapon.',
    stats: {
      damage: 65,
      range: 2,
      accuracy: 97,
      forcePower: 20
    },
    equipmentSlot: 'weapon',
    value: 40000,
    weight: 1.2,
    factionId: null,
    specialEffects: ['legendary_weapon', 'force_enhancement', 'mandalorian_craftsmanship']
  },
  'ancient_weapon': {
    id: 'ancient_weapon',
    name: 'Ancient Weapon',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.LEGENDARY,
    description: 'An ancient weapon of unknown origin. Rare find with unique properties.',
    stats: {
      damage: 68,
      range: 3,
      accuracy: 96
    },
    equipmentSlot: 'weapon',
    value: 30000,
    weight: 2.5,
    factionId: null,
    specialEffects: ['legendary_weapon', 'ancient_power']
  },
  
  // Armor
  'armor_light_01': {
    id: 'armor_light_01',
    name: 'Light Combat Armor',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.COMMON,
    description: 'Basic protective gear for space travelers.',
    stats: {
      defense: 10,
      mobility: 5
    },
    equipmentSlot: 'armor',
    value: 300,
    weight: 5.0,
    factionId: null
  },
  'armor_medium_01': {
    id: 'armor_medium_01',
    name: 'Medium Combat Armor',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.UNCOMMON,
    description: 'Sturdy armor providing good protection.',
    stats: {
      defense: 20,
      mobility: 0
    },
    equipmentSlot: 'armor',
    value: 600,
    weight: 10.0,
    factionId: null
  },
  'armor_heavy_01': {
    id: 'armor_heavy_01',
    name: 'Heavy Combat Armor',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.RARE,
    description: 'Heavy armor offering maximum protection.',
    stats: {
      defense: 35,
      mobility: -5
    },
    equipmentSlot: 'armor',
    value: 1200,
    weight: 20.0,
    factionId: null
  },
  
  // ========== PRIORITY 1: EXPANDED ARMORS ==========
  
  // Light Armor - Common Tier
  'armor_light_imperial': {
    id: 'armor_light_imperial',
    name: 'Imperial Light Armor',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.COMMON,
    description: 'Light armor worn by Imperial personnel. Standard issue.',
    stats: {
      defense: 12,
      mobility: 3
    },
    equipmentSlot: 'armor',
    value: 350,
    weight: 5.5,
    factionId: 'imperial_remnant',
    minReputationTier: null
  },
  'armor_light_rebel': {
    id: 'armor_light_rebel',
    name: 'Rebel Light Armor',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.COMMON,
    description: 'Light armor used by New Republic forces. Flexible and durable.',
    stats: {
      defense: 11,
      mobility: 6
    },
    equipmentSlot: 'armor',
    value: 320,
    weight: 4.8,
    factionId: 'new_republic',
    minReputationTier: null
  },
  
  // Medium Armor - Common Tier
  'armor_medium_imperial': {
    id: 'armor_medium_imperial',
    name: 'Imperial Medium Armor',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.COMMON,
    description: 'Medium armor for Imperial troops. Good balance of protection and mobility.',
    stats: {
      defense: 22,
      mobility: -1
    },
    equipmentSlot: 'armor',
    value: 450,
    weight: 11.0,
    factionId: 'imperial_remnant',
    minReputationTier: null
  },
  'armor_medium_rebel': {
    id: 'armor_medium_rebel',
    name: 'Rebel Medium Armor',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.COMMON,
    description: 'Medium armor used by New Republic forces. Balanced protection.',
    stats: {
      defense: 21,
      mobility: 2
    },
    equipmentSlot: 'armor',
    value: 420,
    weight: 10.5,
    factionId: 'new_republic',
    minReputationTier: null
  },
  
  // Heavy Armor - Common Tier
  'armor_heavy_imperial': {
    id: 'armor_heavy_imperial',
    name: 'Imperial Heavy Armor',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.COMMON,
    description: 'Heavy armor for Imperial troops. Maximum protection.',
    stats: {
      defense: 33,
      mobility: -4
    },
    equipmentSlot: 'armor',
    value: 480,
    weight: 19.0,
    factionId: 'imperial_remnant',
    minReputationTier: null
  },
  
  // Light Armor - Uncommon Tier
  'armor_light_02': {
    id: 'armor_light_02',
    name: 'Enhanced Light Armor',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.UNCOMMON,
    description: 'Enhanced light armor with improved protection while maintaining mobility.',
    stats: {
      defense: 15,
      mobility: 7
    },
    equipmentSlot: 'armor',
    value: 500,
    weight: 5.5,
    factionId: null
  },
  'armor_light_smuggler': {
    id: 'armor_light_smuggler',
    name: 'Smuggler\'s Vest',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.UNCOMMON,
    description: 'A reinforced vest favored by smugglers. Lightweight and protective.',
    stats: {
      defense: 14,
      mobility: 8
    },
    equipmentSlot: 'armor',
    value: 550,
    weight: 4.5,
    factionId: 'smugglers_guild',
    minReputationTier: 'friendly'
  },
  'armor_light_corporate': {
    id: 'armor_light_corporate',
    name: 'Corporate Security Armor',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.UNCOMMON,
    description: 'Light armor used by Corporate Sector security forces.',
    stats: {
      defense: 16,
      mobility: 4
    },
    equipmentSlot: 'armor',
    value: 600,
    weight: 6.0,
    factionId: 'corporate_sector',
    minReputationTier: 'friendly'
  },
  'armor_light_scout': {
    id: 'armor_light_scout',
    name: 'Scout Armor',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.UNCOMMON,
    description: 'Light armor designed for scouts and explorers. High mobility.',
    stats: {
      defense: 13,
      mobility: 9
    },
    equipmentSlot: 'armor',
    value: 480,
    weight: 4.2,
    factionId: null
  },
  
  // Medium Armor - Uncommon Tier
  'armor_medium_02': {
    id: 'armor_medium_02',
    name: 'Enhanced Medium Armor',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.UNCOMMON,
    description: 'Enhanced medium armor with improved protection.',
    stats: {
      defense: 25,
      mobility: 2
    },
    equipmentSlot: 'armor',
    value: 900,
    weight: 11.5,
    factionId: null
  },
  'armor_medium_corporate': {
    id: 'armor_medium_corporate',
    name: 'Corporate Medium Armor',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.UNCOMMON,
    description: 'Medium armor used by Corporate Sector security.',
    stats: {
      defense: 24,
      mobility: 1
    },
    equipmentSlot: 'armor',
    value: 950,
    weight: 12.0,
    factionId: 'corporate_sector',
    minReputationTier: 'friendly'
  },
  'armor_medium_bounty': {
    id: 'armor_medium_bounty',
    name: 'Bounty Hunter Armor',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.UNCOMMON,
    description: 'Medium armor favored by bounty hunters. Balanced and practical.',
    stats: {
      defense: 23,
      mobility: 3
    },
    equipmentSlot: 'armor',
    value: 880,
    weight: 10.8,
    factionId: null
  },
  'armor_medium_outer_rim': {
    id: 'armor_medium_outer_rim',
    name: 'Outer Rim Settler Armor',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.UNCOMMON,
    description: 'Practical armor used by Outer Rim settlers. Durable and resourceful.',
    stats: {
      defense: 22,
      mobility: 4
    },
    equipmentSlot: 'armor',
    value: 750,
    weight: 10.0,
    factionId: 'outer_rim_settlers',
    minReputationTier: 'friendly'
  },
  'blaster_pistol_outer_rim': {
    id: 'blaster_pistol_outer_rim',
    name: 'Outer Rim Blaster Pistol',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.UNCOMMON,
    description: 'A reliable blaster pistol favored by Outer Rim settlers. Built for harsh conditions.',
    stats: {
      damage: 28,
      range: 32,
      accuracy: 76
    },
    equipmentSlot: 'weapon',
    value: 700,
    weight: 2.4,
    factionId: 'outer_rim_settlers',
    minReputationTier: 'friendly'
  },
  'armor_medium_tactical': {
    id: 'armor_medium_tactical',
    name: 'Tactical Armor',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.UNCOMMON,
    description: 'Tactical medium armor. Optimized for combat effectiveness.',
    stats: {
      defense: 26,
      mobility: 1
    },
    equipmentSlot: 'armor',
    value: 1000,
    weight: 11.8,
    factionId: null
  },
  
  // Heavy Armor - Uncommon Tier
  'armor_heavy_02': {
    id: 'armor_heavy_02',
    name: 'Enhanced Heavy Armor',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.UNCOMMON,
    description: 'Enhanced heavy armor with improved protection.',
    stats: {
      defense: 38,
      mobility: -4
    },
    equipmentSlot: 'armor',
    value: 900,
    weight: 21.0,
    factionId: null
  },
  'armor_heavy_imperial_standard': {
    id: 'armor_heavy_imperial_standard',
    name: 'Stormtrooper Armor',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.UNCOMMON,
    description: 'Standard issue Stormtrooper armor. Iconic white plating with good protection.',
    stats: {
      defense: 25,
      mobility: -2
    },
    equipmentSlot: 'armor',
    value: 800,
    weight: 15.0,
    factionId: 'imperial_remnant',
    minReputationTier: null,
    specialEffects: ['imperial_identification']
  },
  'armor_heavy_rebel': {
    id: 'armor_heavy_rebel',
    name: 'Rebel Heavy Armor',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.UNCOMMON,
    description: 'Heavy armor used by New Republic forces. Strong protection.',
    stats: {
      defense: 37,
      mobility: -3
    },
    equipmentSlot: 'armor',
    value: 850,
    weight: 20.5,
    factionId: 'new_republic',
    minReputationTier: null
  },
  'armor_heavy_corporate': {
    id: 'armor_heavy_corporate',
    name: 'Corporate Heavy Armor',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.UNCOMMON,
    description: 'Heavy armor used by Corporate Sector security.',
    stats: {
      defense: 36,
      mobility: -4
    },
    equipmentSlot: 'armor',
    value: 950,
    weight: 20.0,
    factionId: 'corporate_sector',
    minReputationTier: 'friendly'
  },
  
  // Light Armor - Rare Tier
  'armor_light_03': {
    id: 'armor_light_03',
    name: 'Advanced Light Armor',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.RARE,
    description: 'Advanced light armor with superior materials and design.',
    stats: {
      defense: 20,
      mobility: 10
    },
    equipmentSlot: 'armor',
    value: 1000,
    weight: 6.0,
    factionId: null
  },
  'armor_light_imperial_elite': {
    id: 'armor_light_imperial_elite',
    name: 'Imperial Scout Armor',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.RARE,
    description: 'Elite Imperial scout armor. High mobility and protection.',
    stats: {
      defense: 18,
      mobility: 8
    },
    equipmentSlot: 'armor',
    value: 1200,
    weight: 5.8,
    factionId: 'imperial_remnant',
    minReputationTier: 'friendly'
  },
  'armor_light_rebel_elite': {
    id: 'armor_light_rebel_elite',
    name: 'Rebel Scout Armor',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.RARE,
    description: 'Elite New Republic scout armor. Superior mobility.',
    stats: {
      defense: 17,
      mobility: 11
    },
    equipmentSlot: 'armor',
    value: 1100,
    weight: 5.5,
    factionId: 'new_republic',
    minReputationTier: 'friendly'
  },
  'armor_light_mandalorian': {
    id: 'armor_light_mandalorian',
    name: 'Mandalorian Light Armor',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.RARE,
    description: 'Light armor crafted by Mandalorian artisans. Exceptional quality.',
    stats: {
      defense: 22,
      mobility: 8
    },
    equipmentSlot: 'armor',
    value: 1500,
    weight: 5.5,
    factionId: null,
    specialEffects: ['mandalorian_craftsmanship']
  },
  'armor_light_jedi': {
    id: 'armor_light_jedi',
    name: 'Jedi Robes',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.RARE,
    description: 'Traditional Jedi robes. Light protection with Force enhancement.',
    stats: {
      defense: 18,
      mobility: 12,
      forcePower: 5
    },
    equipmentSlot: 'armor',
    value: 1200,
    weight: 3.0,
    factionId: 'jedi_seekers',
    minReputationTier: 'friendly',
    specialEffects: ['force_enhancement']
  },
  
  // Medium Armor - Rare Tier
  'armor_medium_03': {
    id: 'armor_medium_03',
    name: 'Advanced Medium Armor',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.RARE,
    description: 'Advanced medium armor with superior protection.',
    stats: {
      defense: 30,
      mobility: 3
    },
    equipmentSlot: 'armor',
    value: 1800,
    weight: 12.5,
    factionId: null
  },
  'armor_medium_imperial_elite': {
    id: 'armor_medium_imperial_elite',
    name: 'Imperial Elite Armor',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.RARE,
    description: 'Elite Imperial medium armor. Superior protection.',
    stats: {
      defense: 32,
      mobility: 1
    },
    equipmentSlot: 'armor',
    value: 2000,
    weight: 13.0,
    factionId: 'imperial_remnant',
    minReputationTier: 'friendly'
  },
  'armor_medium_rebel_elite': {
    id: 'armor_medium_rebel_elite',
    name: 'Rebel Elite Armor',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.RARE,
    description: 'Elite New Republic medium armor. Superior protection and mobility.',
    stats: {
      defense: 31,
      mobility: 4
    },
    equipmentSlot: 'armor',
    value: 1900,
    weight: 12.8,
    factionId: 'new_republic',
    minReputationTier: 'friendly'
  },
  'armor_medium_mandalorian': {
    id: 'armor_medium_mandalorian',
    name: 'Mandalorian Medium Armor',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.RARE,
    description: 'Mandalorian-crafted medium armor. Exceptional quality.',
    stats: {
      defense: 33,
      mobility: 2
    },
    equipmentSlot: 'armor',
    value: 2500,
    weight: 12.0,
    factionId: null,
    specialEffects: ['mandalorian_craftsmanship']
  },
  'armor_medium_jedi': {
    id: 'armor_medium_jedi',
    name: 'Jedi Knight Robes',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.RARE,
    description: 'Robes worn by Jedi Knights. Enhanced protection with Force properties.',
    stats: {
      defense: 25,
      mobility: 8,
      forcePower: 8
    },
    equipmentSlot: 'armor',
    value: 2200,
    weight: 4.0,
    factionId: 'jedi_seekers',
    minReputationTier: 'friendly',
    specialEffects: ['force_enhancement']
  },
  
  // Heavy Armor - Rare Tier
  'armor_heavy_03': {
    id: 'armor_heavy_03',
    name: 'Advanced Heavy Armor',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.RARE,
    description: 'Advanced heavy armor with superior protection.',
    stats: {
      defense: 42,
      mobility: -3
    },
    equipmentSlot: 'armor',
    value: 2500,
    weight: 22.0,
    factionId: null
  },
  'armor_heavy_imperial_elite': {
    id: 'armor_heavy_imperial_elite',
    name: 'Stormtrooper Elite Armor',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.RARE,
    description: 'Elite Stormtrooper armor. Enhanced protection and durability.',
    stats: {
      defense: 40,
      mobility: -3
    },
    equipmentSlot: 'armor',
    value: 2400,
    weight: 21.5,
    factionId: 'imperial_remnant',
    minReputationTier: 'friendly',
    specialEffects: ['imperial_identification']
  },
  'armor_heavy_rebel_elite': {
    id: 'armor_heavy_rebel_elite',
    name: 'Rebel Heavy Elite Armor',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.RARE,
    description: 'Elite New Republic heavy armor. Superior protection.',
    stats: {
      defense: 41,
      mobility: -2
    },
    equipmentSlot: 'armor',
    value: 2400,
    weight: 21.0,
    factionId: 'new_republic',
    minReputationTier: 'friendly'
  },
  'armor_heavy_mandalorian': {
    id: 'armor_heavy_mandalorian',
    name: 'Mandalorian Heavy Armor',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.RARE,
    description: 'Mandalorian-crafted heavy armor. Exceptional protection.',
    stats: {
      defense: 44,
      mobility: -2
    },
    equipmentSlot: 'armor',
    value: 2400,
    weight: 20.0,
    factionId: null,
    specialEffects: ['mandalorian_craftsmanship']
  },
  'armor_heavy_beskar': {
    id: 'armor_heavy_beskar',
    name: 'Beskar Armor',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.RARE,
    description: 'Mandalorian armor forged from beskar. Exceptional protection.',
    stats: {
      defense: 42,
      mobility: -3
    },
    equipmentSlot: 'armor',
    value: 2400,
    weight: 18.0,
    factionId: null,
    specialEffects: ['beskar_quality', 'energy_resistance']
  },
  
  // Light Armor - Epic Tier
  'armor_light_masterwork': {
    id: 'armor_light_masterwork',
    name: 'Masterwork Light Armor',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.EPIC,
    description: 'Masterwork light armor. The pinnacle of light armor craftsmanship.',
    stats: {
      defense: 28,
      mobility: 15
    },
    equipmentSlot: 'armor',
    value: 3000,
    weight: 6.5,
    factionId: null,
    specialEffects: ['masterwork_quality']
  },
  'armor_light_imperial_master': {
    id: 'armor_light_imperial_master',
    name: 'Imperial Master Light Armor',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.EPIC,
    description: 'Master-crafted Imperial light armor. The finest Imperial protection.',
    stats: {
      defense: 26,
      mobility: 12
    },
    equipmentSlot: 'armor',
    value: 3500,
    weight: 6.2,
    factionId: 'imperial_remnant',
    minReputationTier: 'trusted'
  },
  'armor_light_rebel_master': {
    id: 'armor_light_rebel_master',
    name: 'Rebel Master Light Armor',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.EPIC,
    description: 'Master-crafted New Republic light armor. Exceptional quality.',
    stats: {
      defense: 25,
      mobility: 14
    },
    equipmentSlot: 'armor',
    value: 3400,
    weight: 6.0,
    factionId: 'new_republic',
    minReputationTier: 'trusted'
  },
  'armor_light_ancient': {
    id: 'armor_light_ancient',
    name: 'Ancient Light Armor',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.EPIC,
    description: 'Ancient light armor. Rare find with unique properties.',
    stats: {
      defense: 30,
      mobility: 16
    },
    equipmentSlot: 'armor',
    value: 5000,
    weight: 5.5,
    factionId: null
  },
  
  // Medium Armor - Epic Tier
  'armor_medium_masterwork': {
    id: 'armor_medium_masterwork',
    name: 'Masterwork Medium Armor',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.EPIC,
    description: 'Masterwork medium armor. The pinnacle of medium armor craftsmanship.',
    stats: {
      defense: 38,
      mobility: 5
    },
    equipmentSlot: 'armor',
    value: 4000,
    weight: 13.5,
    factionId: null,
    specialEffects: ['masterwork_quality']
  },
  'armor_medium_imperial_master': {
    id: 'armor_medium_imperial_master',
    name: 'Imperial Master Medium Armor',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.EPIC,
    description: 'Master-crafted Imperial medium armor. The finest Imperial protection.',
    stats: {
      defense: 40,
      mobility: 3
    },
    equipmentSlot: 'armor',
    value: 4500,
    weight: 14.0,
    factionId: 'imperial_remnant',
    minReputationTier: 'trusted'
  },
  'armor_medium_rebel_master': {
    id: 'armor_medium_rebel_master',
    name: 'Rebel Master Medium Armor',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.EPIC,
    description: 'Master-crafted New Republic medium armor. Exceptional quality.',
    stats: {
      defense: 39,
      mobility: 5
    },
    equipmentSlot: 'armor',
    value: 4400,
    weight: 13.8,
    factionId: 'new_republic',
    minReputationTier: 'trusted'
  },
  'armor_medium_ancient': {
    id: 'armor_medium_ancient',
    name: 'Ancient Medium Armor',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.EPIC,
    description: 'Ancient medium armor. Rare find with unique properties.',
    stats: {
      defense: 42,
      mobility: 6
    },
    equipmentSlot: 'armor',
    value: 6000,
    weight: 13.0,
    factionId: null
  },
  
  // Heavy Armor - Epic Tier
  'armor_heavy_masterwork': {
    id: 'armor_heavy_masterwork',
    name: 'Masterwork Heavy Armor',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.EPIC,
    description: 'Masterwork heavy armor. The pinnacle of heavy armor craftsmanship.',
    stats: {
      defense: 48,
      mobility: -2
    },
    equipmentSlot: 'armor',
    value: 5000,
    weight: 23.0,
    factionId: null,
    specialEffects: ['masterwork_quality']
  },
  'armor_heavy_imperial_master': {
    id: 'armor_heavy_imperial_master',
    name: 'Imperial Master Heavy Armor',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.EPIC,
    description: 'Master-crafted Imperial heavy armor. The finest Imperial protection.',
    stats: {
      defense: 50,
      mobility: -3
    },
    equipmentSlot: 'armor',
    value: 5500,
    weight: 23.5,
    factionId: 'imperial_remnant',
    minReputationTier: 'trusted'
  },
  'armor_heavy_rebel_master': {
    id: 'armor_heavy_rebel_master',
    name: 'Rebel Master Heavy Armor',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.EPIC,
    description: 'Master-crafted New Republic heavy armor. Exceptional quality.',
    stats: {
      defense: 49,
      mobility: -2
    },
    equipmentSlot: 'armor',
    value: 5400,
    weight: 23.0,
    factionId: 'new_republic',
    minReputationTier: 'trusted'
  },
  'armor_heavy_ancient': {
    id: 'armor_heavy_ancient',
    name: 'Ancient Heavy Armor',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.EPIC,
    description: 'Ancient heavy armor. Rare find with unique properties.',
    stats: {
      defense: 52,
      mobility: -1
    },
    equipmentSlot: 'armor',
    value: 7000,
    weight: 22.0,
    factionId: null
  },
  
  // Special Armor - Epic Tier
  'armor_stealth': {
    id: 'armor_stealth',
    name: 'Stealth Armor',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.EPIC,
    description: 'Advanced stealth armor. Reduces detection and improves sneaking.',
    stats: {
      defense: 24,
      mobility: 12
    },
    equipmentSlot: 'armor',
    value: 4000,
    weight: 5.0,
    factionId: null,
    specialEffects: ['stealth_bonus', 'detection_reduction']
  },
  'armor_environmental': {
    id: 'armor_environmental',
    name: 'Environmental Suit',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.EPIC,
    description: 'Environmental protection suit. Protects against harsh conditions.',
    stats: {
      defense: 22,
      mobility: 8
    },
    equipmentSlot: 'armor',
    value: 3500,
    weight: 6.0,
    factionId: null,
    specialEffects: ['environmental_protection']
  },
  'armor_energy_shield': {
    id: 'armor_energy_shield',
    name: 'Energy Shield Generator',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.EPIC,
    description: 'Armor with integrated energy shield. Provides energy resistance.',
    stats: {
      defense: 30,
      mobility: 5
    },
    equipmentSlot: 'armor',
    value: 5000,
    weight: 8.0,
    factionId: null,
    specialEffects: ['energy_resistance', 'shield_generator']
  },
  
  // Legendary Armor
  'armor_light_legendary': {
    id: 'armor_light_legendary',
    name: 'Legendary Light Armor',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.LEGENDARY,
    description: 'Legendary light armor. The ultimate in light protection.',
    stats: {
      defense: 35,
      mobility: 20
    },
    equipmentSlot: 'armor',
    value: 15000,
    weight: 7.0,
    factionId: null,
    specialEffects: ['legendary_armor']
  },
  'armor_light_force_enhanced': {
    id: 'armor_light_force_enhanced',
    name: 'Force-Enhanced Robes',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.LEGENDARY,
    description: 'Robes enhanced with the Force. Ultimate Jedi protection.',
    stats: {
      defense: 32,
      mobility: 18,
      forcePower: 25
    },
    equipmentSlot: 'armor',
    value: 20000,
    weight: 4.5,
    factionId: 'jedi_seekers',
    minReputationTier: 'allied',
    specialEffects: ['force_mastery', 'jedi_enhancement', 'legendary_armor']
  },
  'armor_medium_legendary': {
    id: 'armor_medium_legendary',
    name: 'Legendary Medium Armor',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.LEGENDARY,
    description: 'Legendary medium armor. The ultimate in balanced protection.',
    stats: {
      defense: 45,
      mobility: 10
    },
    equipmentSlot: 'armor',
    value: 20000,
    weight: 14.0,
    factionId: null,
    specialEffects: ['legendary_armor']
  },
  'armor_medium_force_enhanced': {
    id: 'armor_medium_force_enhanced',
    name: 'Force-Enhanced Medium Armor',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.LEGENDARY,
    description: 'Medium armor enhanced with the Force. Ultimate Jedi protection.',
    stats: {
      defense: 42,
      mobility: 12,
      forcePower: 20
    },
    equipmentSlot: 'armor',
    value: 25000,
    weight: 5.0,
    factionId: 'jedi_seekers',
    minReputationTier: 'allied',
    specialEffects: ['force_mastery', 'jedi_enhancement', 'legendary_armor']
  },
  'armor_heavy_legendary': {
    id: 'armor_heavy_legendary',
    name: 'Legendary Heavy Armor',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.LEGENDARY,
    description: 'Legendary heavy armor. The ultimate in protection.',
    stats: {
      defense: 60,
      mobility: 5
    },
    equipmentSlot: 'armor',
    value: 30000,
    weight: 25.0,
    factionId: null,
    specialEffects: ['legendary_armor']
  },
  'armor_heavy_beskar_pure': {
    id: 'armor_heavy_beskar_pure',
    name: 'Pure Beskar Armor',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.LEGENDARY,
    description: 'Armor forged from pure beskar. The ultimate Mandalorian protection.',
    stats: {
      defense: 50,
      mobility: 0
    },
    equipmentSlot: 'armor',
    value: 20000,
    weight: 20.0,
    factionId: null,
    specialEffects: ['pure_beskar', 'energy_resistance', 'legendary_armor']
  },
  'armor_mandalorian_legendary': {
    id: 'armor_mandalorian_legendary',
    name: 'Legendary Mandalorian Armor',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.LEGENDARY,
    description: 'Legendary Mandalorian armor. The pinnacle of Mandalorian craftsmanship.',
    stats: {
      defense: 55,
      mobility: 3
    },
    equipmentSlot: 'armor',
    value: 35000,
    weight: 22.0,
    factionId: null,
    specialEffects: ['mandalorian_craftsmanship', 'legendary_armor']
  },
  'armor_jedi_master': {
    id: 'armor_jedi_master',
    name: 'Jedi Master Robes',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.LEGENDARY,
    description: 'Robes worn by Jedi Masters. Infused with the Force.',
    stats: {
      defense: 30,
      mobility: 15,
      forcePower: 20
    },
    equipmentSlot: 'armor',
    value: 25000,
    weight: 4.0,
    factionId: 'jedi_seekers',
    minReputationTier: 'allied',
    specialEffects: ['force_mastery', 'jedi_enhancement', 'legendary_armor']
  },
  'armor_ancient_artifact': {
    id: 'armor_ancient_artifact',
    name: 'Ancient Artifact Armor',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.LEGENDARY,
    description: 'Ancient artifact armor. Rare find with unique properties.',
    stats: {
      defense: 58,
      mobility: 8
    },
    equipmentSlot: 'armor',
    value: 40000,
    weight: 18.0,
    factionId: null,
    specialEffects: ['ancient_power', 'legendary_armor']
  },
  
  // Consumables
  'medpac_01': {
    id: 'medpac_01',
    name: 'Medpac',
    type: ITEM_TYPES.CONSUMABLE,
    rarity: ITEM_RARITIES.COMMON,
    description: 'Restores 50 health points.',
    stats: {
      healthRestore: 50
    },
    value: 50,
    weight: 0.5
  },
  'stimpack_01': {
    id: 'stimpack_01',
    name: 'Stimpack',
    type: ITEM_TYPES.CONSUMABLE,
    rarity: ITEM_RARITIES.COMMON,
    description: 'Restores 25 stamina points.',
    stats: {
      staminaRestore: 25
    },
    value: 30,
    weight: 0.3
  },
  'ration_01': {
    id: 'ration_01',
    name: 'Ration Pack',
    type: ITEM_TYPES.CONSUMABLE,
    rarity: ITEM_RARITIES.COMMON,
    description: 'Basic food supply. Restores 10 health and 10 stamina.',
    stats: {
      healthRestore: 10,
      staminaRestore: 10
    },
    value: 10,
    weight: 0.5
  },
  
  // ========== PRIORITY 2: EXPANDED CONSUMABLES ==========
  
  // Medpacs - Uncommon Tier
  'medpac_02': {
    id: 'medpac_02',
    name: 'Advanced Medpac',
    type: ITEM_TYPES.CONSUMABLE,
    rarity: ITEM_RARITIES.UNCOMMON,
    description: 'An advanced medpac that restores more health than standard models.',
    stats: {
      healthRestore: 100
    },
    value: 100,
    weight: 0.6
  },
  'medpac_advanced': {
    id: 'medpac_advanced',
    name: 'Rapid Medpac',
    type: ITEM_TYPES.CONSUMABLE,
    rarity: ITEM_RARITIES.UNCOMMON,
    description: 'A fast-acting medpac. Restores health quickly during combat.',
    stats: {
      healthRestore: 75,
      useSpeed: 'fast'
    },
    value: 120,
    weight: 0.5
  },
  
  // Medpacs - Rare Tier
  'medpac_03': {
    id: 'medpac_03',
    name: 'Superior Medpac',
    type: ITEM_TYPES.CONSUMABLE,
    rarity: ITEM_RARITIES.RARE,
    description: 'A superior medpac with enhanced healing capabilities.',
    stats: {
      healthRestore: 200
    },
    value: 800,
    weight: 0.7
  },
  'bacta_patch': {
    id: 'bacta_patch',
    name: 'Bacta Patch',
    type: ITEM_TYPES.CONSUMABLE,
    rarity: ITEM_RARITIES.RARE,
    description: 'A bacta-infused patch. Instantly restores significant health.',
    stats: {
      healthRestore: 150,
      useSpeed: 'instant'
    },
    value: 700,
    weight: 0.4
  },
  
  // Medpacs - Epic Tier
  'bacta_tank': {
    id: 'bacta_tank',
    name: 'Bacta Tank Treatment',
    type: ITEM_TYPES.CONSUMABLE,
    rarity: ITEM_RARITIES.EPIC,
    description: 'A full bacta tank treatment. Completely restores health to maximum.',
    stats: {
      healthRestore: 999,
      useSpeed: 'instant',
      fullHeal: true
    },
    value: 3000,
    weight: 1.0
  },
  'kolto_injection': {
    id: 'kolto_injection',
    name: 'Kolto Injection',
    type: ITEM_TYPES.CONSUMABLE,
    rarity: ITEM_RARITIES.EPIC,
    description: 'A powerful kolto injection. Restores massive amounts of health.',
    stats: {
      healthRestore: 250
    },
    value: 2500,
    weight: 0.3
  },
  
  // Stimpacks - Uncommon Tier
  'stimpack_02': {
    id: 'stimpack_02',
    name: 'Advanced Stimpack',
    type: ITEM_TYPES.CONSUMABLE,
    rarity: ITEM_RARITIES.UNCOMMON,
    description: 'An advanced stimpack that restores more stamina.',
    stats: {
      staminaRestore: 50
    },
    value: 150,
    weight: 0.4
  },
  'stimpack_advanced': {
    id: 'stimpack_advanced',
    name: 'Rapid Stimpack',
    type: ITEM_TYPES.CONSUMABLE,
    rarity: ITEM_RARITIES.UNCOMMON,
    description: 'A fast-acting stimpack. Restores stamina quickly.',
    stats: {
      staminaRestore: 40,
      useSpeed: 'fast'
    },
    value: 130,
    weight: 0.3
  },
  
  // Stimpacks - Rare Tier
  'stimpack_03': {
    id: 'stimpack_03',
    name: 'Superior Stimpack',
    type: ITEM_TYPES.CONSUMABLE,
    rarity: ITEM_RARITIES.RARE,
    description: 'A superior stimpack with enhanced stamina restoration.',
    stats: {
      staminaRestore: 100
    },
    value: 600,
    weight: 0.5
  },
  'adrenaline_shot': {
    id: 'adrenaline_shot',
    name: 'Adrenaline Shot',
    type: ITEM_TYPES.CONSUMABLE,
    rarity: ITEM_RARITIES.RARE,
    description: 'An adrenaline injection. Instantly restores significant stamina.',
    stats: {
      staminaRestore: 75,
      useSpeed: 'instant'
    },
    value: 650,
    weight: 0.2
  },
  
  // Combo Items - Uncommon Tier
  'medkit': {
    id: 'medkit',
    name: 'Medkit',
    type: ITEM_TYPES.CONSUMABLE,
    rarity: ITEM_RARITIES.UNCOMMON,
    description: 'A comprehensive medkit. Restores both health and stamina.',
    stats: {
      healthRestore: 75,
      staminaRestore: 50
    },
    value: 150,
    weight: 0.8
  },
  
  // Combo Items - Rare Tier
  'survival_kit': {
    id: 'survival_kit',
    name: 'Survival Kit',
    type: ITEM_TYPES.CONSUMABLE,
    rarity: ITEM_RARITIES.RARE,
    description: 'A complete survival kit. Restores significant health and stamina.',
    stats: {
      healthRestore: 150,
      staminaRestore: 100
    },
    value: 900,
    weight: 1.2
  },
  
  // Combo Items - Epic Tier
  'emergency_kit': {
    id: 'emergency_kit',
    name: 'Emergency Kit',
    type: ITEM_TYPES.CONSUMABLE,
    rarity: ITEM_RARITIES.EPIC,
    description: 'An emergency medical kit. Restores large amounts of health and stamina.',
    stats: {
      healthRestore: 200,
      staminaRestore: 150
    },
    value: 3000,
    weight: 1.5
  },
  
  // Special Consumables - Rare Tier
  'shield_booster': {
    id: 'shield_booster',
    name: 'Shield Booster',
    type: ITEM_TYPES.CONSUMABLE,
    rarity: ITEM_RARITIES.RARE,
    description: 'Temporarily generates a protective energy shield.',
    stats: {
      temporaryShield: 50,
      duration: 300
    },
    value: 1000,
    weight: 0.5
  },
  'accuracy_booster': {
    id: 'accuracy_booster',
    name: 'Accuracy Booster',
    type: ITEM_TYPES.CONSUMABLE,
    rarity: ITEM_RARITIES.RARE,
    description: 'Temporarily increases accuracy for a short duration.',
    stats: {
      temporaryAccuracy: 15,
      duration: 180
    },
    value: 350,
    weight: 0.3
  },
  
  // Special Consumables - Epic Tier
  'berserker_stim': {
    id: 'berserker_stim',
    name: 'Berserker Stim',
    type: ITEM_TYPES.CONSUMABLE,
    rarity: ITEM_RARITIES.EPIC,
    description: 'A powerful stimulant that temporarily increases damage output.',
    stats: {
      temporaryDamage: 20,
      duration: 240
    },
    value: 2500,
    weight: 0.4
  },
  'stealth_pack': {
    id: 'stealth_pack',
    name: 'Stealth Pack',
    type: ITEM_TYPES.CONSUMABLE,
    rarity: ITEM_RARITIES.EPIC,
    description: 'Temporarily enhances stealth capabilities.',
    stats: {
      temporaryStealth: 25,
      duration: 300
    },
    value: 2500,
    weight: 0.3
  },
  
  // Resources
  'credits_01': {
    id: 'credits_01',
    name: 'Credits',
    type: ITEM_TYPES.RESOURCE,
    rarity: ITEM_RARITIES.COMMON,
    description: 'Galactic standard currency.',
    value: 1,
    weight: 0
  },
  'scrap_metal_01': {
    id: 'scrap_metal_01',
    name: 'Scrap Metal',
    type: ITEM_TYPES.RESOURCE,
    rarity: ITEM_RARITIES.COMMON,
    description: 'Useful for repairs and crafting.',
    value: 5,
    weight: 1.0,
    stackSize: 100
  },
  'energy_cell_01': {
    id: 'energy_cell_01',
    name: 'Energy Cell',
    type: ITEM_TYPES.RESOURCE,
    rarity: ITEM_RARITIES.UNCOMMON,
    description: 'Power source for various devices.',
    value: 25,
    weight: 0.5,
    stackSize: 50
  },
  
  // Accessories
  'datapad_01': {
    id: 'datapad_01',
    name: 'Datapad',
    type: ITEM_TYPES.ACCESSORY,
    rarity: ITEM_RARITIES.COMMON,
    description: 'A basic datapad for storing information.',
    stats: {
      intelligence: 2
    },
    equipmentSlot: 'accessory',
    value: 100,
    weight: 0.5,
    factionId: null
  },
  'comlink_01': {
    id: 'comlink_01',
    name: 'Comlink',
    type: ITEM_TYPES.ACCESSORY,
    rarity: ITEM_RARITIES.COMMON,
    description: 'Communication device for long-range contact.',
    stats: {
      charisma: 1
    },
    equipmentSlot: 'accessory',
    value: 75,
    weight: 0.2,
    factionId: null
  },
  
  // ========== PRIORITY 2: EXPANDED ACCESSORIES ==========
  
  // Datapads - Uncommon Tier
  'datapad_02': {
    id: 'datapad_02',
    name: 'Enhanced Datapad',
    type: ITEM_TYPES.ACCESSORY,
    rarity: ITEM_RARITIES.UNCOMMON,
    description: 'An enhanced datapad with improved processing capabilities.',
    stats: {
      intelligence: 5
    },
    equipmentSlot: 'accessory',
    value: 250,
    weight: 0.6,
    factionId: null
  },
  'datapad_corporate': {
    id: 'datapad_corporate',
    name: 'Corporate Datapad',
    type: ITEM_TYPES.ACCESSORY,
    rarity: ITEM_RARITIES.UNCOMMON,
    description: 'A corporate-grade datapad with data analysis capabilities.',
    stats: {
      intelligence: 4
    },
    equipmentSlot: 'accessory',
    value: 300,
    weight: 0.5,
    factionId: 'corporate_sector',
    minReputationTier: 'friendly',
    specialEffects: ['data_analysis']
  },
  
  // Datapads - Rare Tier
  'datapad_03': {
    id: 'datapad_03',
    name: 'Advanced Datapad',
    type: ITEM_TYPES.ACCESSORY,
    rarity: ITEM_RARITIES.RARE,
    description: 'An advanced datapad with superior data processing and analysis.',
    stats: {
      intelligence: 10
    },
    equipmentSlot: 'accessory',
    value: 800,
    weight: 0.7,
    factionId: null,
    specialEffects: ['data_analysis']
  },
  'datapad_jedi': {
    id: 'datapad_jedi',
    name: 'Jedi Datapad',
    type: ITEM_TYPES.ACCESSORY,
    rarity: ITEM_RARITIES.RARE,
    description: 'A datapad enhanced with Force-sensitive technology. Improves Force perception.',
    stats: {
      intelligence: 8,
      forcePower: 3
    },
    equipmentSlot: 'accessory',
    value: 1000,
    weight: 0.6,
    factionId: 'jedi_seekers',
    minReputationTier: 'friendly',
    specialEffects: ['force_insight']
  },
  
  // Comlinks - Uncommon Tier
  'comlink_02': {
    id: 'comlink_02',
    name: 'Enhanced Comlink',
    type: ITEM_TYPES.ACCESSORY,
    rarity: ITEM_RARITIES.UNCOMMON,
    description: 'An enhanced comlink with improved communication range.',
    stats: {
      charisma: 3
    },
    equipmentSlot: 'accessory',
    value: 200,
    weight: 0.3,
    factionId: null
  },
  'comlink_long_range': {
    id: 'comlink_long_range',
    name: 'Long-Range Comlink',
    type: ITEM_TYPES.ACCESSORY,
    rarity: ITEM_RARITIES.UNCOMMON,
    description: 'A long-range comlink capable of interstellar communication.',
    stats: {
      charisma: 2
    },
    equipmentSlot: 'accessory',
    value: 250,
    weight: 0.4,
    factionId: null,
    specialEffects: ['long_range_comm']
  },
  
  // Comlinks - Rare Tier
  'comlink_03': {
    id: 'comlink_03',
    name: 'Advanced Comlink',
    type: ITEM_TYPES.ACCESSORY,
    rarity: ITEM_RARITIES.RARE,
    description: 'An advanced comlink with superior communication capabilities.',
    stats: {
      charisma: 5
    },
    equipmentSlot: 'accessory',
    value: 600,
    weight: 0.4,
    factionId: null,
    specialEffects: ['long_range_comm']
  },
  'comlink_secure': {
    id: 'comlink_secure',
    name: 'Secure Comlink',
    type: ITEM_TYPES.ACCESSORY,
    rarity: ITEM_RARITIES.RARE,
    description: 'A secure, encrypted comlink for confidential communications.',
    stats: {
      charisma: 4
    },
    equipmentSlot: 'accessory',
    value: 700,
    weight: 0.3,
    factionId: null,
    specialEffects: ['secure_comm']
  },
  
  // Scanners - Uncommon Tier
  'scanner': {
    id: 'scanner',
    name: 'Scanner',
    type: ITEM_TYPES.ACCESSORY,
    rarity: ITEM_RARITIES.UNCOMMON,
    description: 'A basic scanner that improves perception and detection.',
    stats: {
      perception: 5
    },
    equipmentSlot: 'accessory',
    value: 200,
    weight: 0.5,
    factionId: null
  },
  'scanner_medical': {
    id: 'scanner_medical',
    name: 'Medical Scanner',
    type: ITEM_TYPES.ACCESSORY,
    rarity: ITEM_RARITIES.UNCOMMON,
    description: 'A medical scanner for diagnosing injuries and health conditions.',
    stats: {
      perception: 3,
      medical: 5
    },
    equipmentSlot: 'accessory',
    value: 300,
    weight: 0.6,
    factionId: null,
    specialEffects: ['medical_scan']
  },
  
  // Scanners - Rare Tier
  'scanner_advanced': {
    id: 'scanner_advanced',
    name: 'Advanced Scanner',
    type: ITEM_TYPES.ACCESSORY,
    rarity: ITEM_RARITIES.RARE,
    description: 'An advanced scanner with superior detection capabilities.',
    stats: {
      perception: 10
    },
    equipmentSlot: 'accessory',
    value: 800,
    weight: 0.7,
    factionId: null
  },
  'scanner_force': {
    id: 'scanner_force',
    name: 'Force Scanner',
    type: ITEM_TYPES.ACCESSORY,
    rarity: ITEM_RARITIES.RARE,
    description: 'A scanner enhanced with Force-sensitive technology. Detects Force signatures.',
    stats: {
      perception: 8,
      forcePower: 2
    },
    equipmentSlot: 'accessory',
    value: 1200,
    weight: 0.6,
    factionId: 'jedi_seekers',
    minReputationTier: 'friendly',
    specialEffects: ['force_detection']
  },
  
  // Special Accessories - Rare Tier
  'security_keycard': {
    id: 'security_keycard',
    name: 'Security Keycard',
    type: ITEM_TYPES.ACCESSORY,
    rarity: ITEM_RARITIES.RARE,
    description: 'A security keycard that improves lockpicking and security bypass capabilities.',
    stats: {
      lockpicking: 15
    },
    equipmentSlot: 'accessory',
    value: 500,
    weight: 0.1,
    factionId: null
  },
  
  // Special Accessories - Legendary Tier
  'ancient_artifact': {
    id: 'ancient_artifact',
    name: 'Ancient Artifact',
    type: ITEM_TYPES.ACCESSORY,
    rarity: ITEM_RARITIES.LEGENDARY,
    description: 'An ancient artifact of unknown origin. Possesses multiple powerful properties.',
    stats: {
      intelligence: 10,
      charisma: 10,
      perception: 10,
      forcePower: 15
    },
    equipmentSlot: 'accessory',
    value: 30000,
    weight: 1.0,
    factionId: null,
    specialEffects: ['ancient_power', 'legendary_artifact']
  },
  
  // ========== PRIORITY 2: TOOL EQUIPMENT SLOT ITEMS ==========
  
  // Repair Tools - Common Tier
  'repair_toolkit': {
    id: 'repair_toolkit',
    name: 'Repair Toolkit',
    type: ITEM_TYPES.ACCESSORY,
    rarity: ITEM_RARITIES.COMMON,
    description: 'A basic toolkit for repairs and maintenance.',
    stats: {
      repair: 5
    },
    equipmentSlot: 'tool',
    value: 150,
    weight: 2.0,
    factionId: null
  },
  
  // Repair Tools - Uncommon Tier
  'advanced_toolkit': {
    id: 'advanced_toolkit',
    name: 'Advanced Toolkit',
    type: ITEM_TYPES.ACCESSORY,
    rarity: ITEM_RARITIES.UNCOMMON,
    description: 'An advanced toolkit with specialized repair tools.',
    stats: {
      repair: 15
    },
    equipmentSlot: 'tool',
    value: 400,
    weight: 3.0,
    factionId: null
  },
  'specialized_toolkit': {
    id: 'specialized_toolkit',
    name: 'Specialized Toolkit',
    type: ITEM_TYPES.ACCESSORY,
    rarity: ITEM_RARITIES.UNCOMMON,
    description: 'A specialized toolkit for specific repair tasks.',
    stats: {
      repair: 10
    },
    equipmentSlot: 'tool',
    value: 350,
    weight: 2.5,
    factionId: null,
    specialEffects: ['specialized_repair']
  },
  
  // Repair Tools - Rare Tier
  'master_toolkit': {
    id: 'master_toolkit',
    name: 'Master Toolkit',
    type: ITEM_TYPES.ACCESSORY,
    rarity: ITEM_RARITIES.RARE,
    description: 'A master craftsman\'s toolkit. Exceptional repair capabilities.',
    stats: {
      repair: 25
    },
    equipmentSlot: 'tool',
    value: 1200,
    weight: 4.0,
    factionId: null
  },
  'beskar_tools': {
    id: 'beskar_tools',
    name: 'Beskar Tools',
    type: ITEM_TYPES.ACCESSORY,
    rarity: ITEM_RARITIES.RARE,
    description: 'Tools forged from beskar. Exceptional durability and effectiveness.',
    stats: {
      repair: 20,
      durability: 10
    },
    equipmentSlot: 'tool',
    value: 2000,
    weight: 3.5,
    factionId: null,
    specialEffects: ['beskar_quality', 'durability_bonus']
  },
  
  // Slicing Tools - Uncommon Tier
  'slicer_toolkit': {
    id: 'slicer_toolkit',
    name: 'Slicer Toolkit',
    type: ITEM_TYPES.ACCESSORY,
    rarity: ITEM_RARITIES.UNCOMMON,
    description: 'A toolkit for slicing into computer systems and security networks.',
    stats: {
      hacking: 10
    },
    equipmentSlot: 'tool',
    value: 500,
    weight: 1.5,
    factionId: null
  },
  
  // Slicing Tools - Rare Tier
  'slicer_toolkit_advanced': {
    id: 'slicer_toolkit_advanced',
    name: 'Advanced Slicer Toolkit',
    type: ITEM_TYPES.ACCESSORY,
    rarity: ITEM_RARITIES.RARE,
    description: 'An advanced slicing toolkit for complex security systems.',
    stats: {
      hacking: 20
    },
    equipmentSlot: 'tool',
    value: 1500,
    weight: 2.0,
    factionId: null
  },
  'slicer_toolkit_elite': {
    id: 'slicer_toolkit_elite',
    name: 'Elite Slicer Toolkit',
    type: ITEM_TYPES.ACCESSORY,
    rarity: ITEM_RARITIES.RARE,
    description: 'An elite slicing toolkit for the most secure systems.',
    stats: {
      hacking: 30
    },
    equipmentSlot: 'tool',
    value: 2500,
    weight: 2.5,
    factionId: null
  },
  
  // Slicing Tools - Epic Tier
  'slicer_toolkit_master': {
    id: 'slicer_toolkit_master',
    name: 'Master Slicer Toolkit',
    type: ITEM_TYPES.ACCESSORY,
    rarity: ITEM_RARITIES.EPIC,
    description: 'The ultimate slicing toolkit. Can breach any security system.',
    stats: {
      hacking: 40
    },
    equipmentSlot: 'tool',
    value: 5000,
    weight: 3.0,
    factionId: null
  },
  
  // Medical Tools - Uncommon Tier
  'medical_scanner': {
    id: 'medical_scanner',
    name: 'Medical Scanner',
    type: ITEM_TYPES.ACCESSORY,
    rarity: ITEM_RARITIES.UNCOMMON,
    description: 'A medical scanner for diagnosing and treating injuries.',
    stats: {
      medical: 10
    },
    equipmentSlot: 'tool',
    value: 300,
    weight: 1.0,
    factionId: null
  },
  'medical_kit': {
    id: 'medical_kit',
    name: 'Medical Kit',
    type: ITEM_TYPES.ACCESSORY,
    rarity: ITEM_RARITIES.UNCOMMON,
    description: 'A comprehensive medical kit with healing supplies.',
    stats: {
      medical: 8
    },
    equipmentSlot: 'tool',
    value: 350,
    weight: 1.5,
    factionId: null,
    specialEffects: ['healing_bonus']
  },
  
  // Medical Tools - Rare Tier
  'medical_scanner_advanced': {
    id: 'medical_scanner_advanced',
    name: 'Advanced Medical Scanner',
    type: ITEM_TYPES.ACCESSORY,
    rarity: ITEM_RARITIES.RARE,
    description: 'An advanced medical scanner with superior diagnostic capabilities.',
    stats: {
      medical: 20
    },
    equipmentSlot: 'tool',
    value: 1200,
    weight: 1.5,
    factionId: null
  },
  'bacta_applicator': {
    id: 'bacta_applicator',
    name: 'Bacta Applicator',
    type: ITEM_TYPES.ACCESSORY,
    rarity: ITEM_RARITIES.RARE,
    description: 'A specialized tool for applying bacta treatments. Enables instant healing.',
    stats: {
      medical: 15
    },
    equipmentSlot: 'tool',
    value: 1500,
    weight: 1.2,
    factionId: null,
    specialEffects: ['instant_heal']
  },
  
  // Specialized Tools - Rare Tier
  'archaeology_toolkit': {
    id: 'archaeology_toolkit',
    name: 'Archaeology Toolkit',
    type: ITEM_TYPES.ACCESSORY,
    rarity: ITEM_RARITIES.RARE,
    description: 'A toolkit for archaeological research and artifact analysis.',
    stats: {
      archaeology: 15
    },
    equipmentSlot: 'tool',
    value: 1000,
    weight: 2.5,
    factionId: null
  },
  'mining_toolkit': {
    id: 'mining_toolkit',
    name: 'Mining Toolkit',
    type: ITEM_TYPES.ACCESSORY,
    rarity: ITEM_RARITIES.RARE,
    description: 'A toolkit for mining operations and resource extraction.',
    stats: {
      mining: 20
    },
    equipmentSlot: 'tool',
    value: 1100,
    weight: 3.0,
    factionId: null
  },
  
  // Specialized Tools - Epic Tier
  'master_craftsman_tools': {
    id: 'master_craftsman_tools',
    name: 'Master Craftsman Tools',
    type: ITEM_TYPES.ACCESSORY,
    rarity: ITEM_RARITIES.EPIC,
    description: 'The ultimate toolkit for all crafting operations. Enhances all crafting skills.',
    stats: {
      crafting: 10,
      repair: 15,
      hacking: 10,
      medical: 10
    },
    equipmentSlot: 'tool',
    value: 6000,
    weight: 5.0,
    factionId: null,
    specialEffects: ['master_craftsmanship']
  },
  
  // ========== PHASE 1 QUEST ITEMS - RYLOTH ==========
  'ryll_spice_sample': {
    id: 'ryll_spice_sample',
    name: 'Ryll Spice Sample',
    type: ITEM_TYPES.QUEST_ITEM,
    rarity: ITEM_RARITIES.COMMON,
    description: 'A sample of Ryll spice from Ryloth mines. Evidence in the Compound 7-Alpha investigation.',
    value: 150,
    weight: 0.5,
    stackSize: 1
  },
  'mine_foreman_datapad': {
    id: 'mine_foreman_datapad',
    name: 'Mine Foreman\'s Datapad',
    type: ITEM_TYPES.QUEST_ITEM,
    rarity: ITEM_RARITIES.UNCOMMON,
    description: 'Datapad containing evidence of Compound 7-Alpha connection. Key evidence in the investigation.',
    value: 0,
    weight: 0.3,
    stackSize: 1
  },
  'refugee_gratitude': {
    id: 'refugee_gratitude',
    name: 'Refugee Leader\'s Gratitude',
    type: ITEM_TYPES.QUEST_ITEM,
    rarity: ITEM_RARITIES.RARE,
    description: 'A token of gratitude from refugee camp leader. Provides reputation bonus when displayed.',
    value: 0,
    weight: 0.1,
    stackSize: 1,
    stats: {
      reputationBonus: 10
    }
  },
  'syndicate_bounty': {
    id: 'syndicate_bounty',
    name: 'Syndicate Leader\'s Bounty',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.RARE,
    description: 'Custom blaster taken from syndicate leader. High damage, unique appearance.',
    stats: {
      damage: 40,
      range: 35,
      accuracy: 80
    },
    equipmentSlot: 'weapon',
    value: 1500,
    weight: 2.8
  },
  'corporate_intel': {
    id: 'corporate_intel',
    name: 'Corporate Intelligence',
    type: ITEM_TYPES.QUEST_ITEM,
    rarity: ITEM_RARITIES.UNCOMMON,
    description: 'Intelligence about Corporate Sector operations on Ryloth.',
    value: 0,
    weight: 0.2,
    stackSize: 1
  },
  'smuggler_badge': {
    id: 'smuggler_badge',
    name: 'Master Smuggler\'s Badge',
    type: ITEM_TYPES.ACCESSORY,
    rarity: ITEM_RARITIES.RARE,
    description: 'Badge recognizing mastery in smuggling operations. Provides smuggling bonuses.',
    stats: {
      charisma: 5,
      smugglingBonus: 15
    },
    equipmentSlot: 'accessory',
    value: 800,
    weight: 0.1,
    factionId: 'smugglers_guild',
    minReputationTier: 'friendly'
  },
  'imperial_commendation': {
    id: 'imperial_commendation',
    name: 'Imperial Commendation',
    type: ITEM_TYPES.ACCESSORY,
    rarity: ITEM_RARITIES.RARE,
    description: 'Commendation for service to the Imperial Remnant. Provides accuracy and defense bonuses.',
    stats: {
      accuracy: 3,
      defense: 2
    },
    equipmentSlot: 'accessory',
    value: 800,
    weight: 0.1,
    factionId: 'imperial_remnant',
    minReputationTier: null
  },
  'bounty_hunter_badge': {
    id: 'bounty_hunter_badge',
    name: 'Bounty Hunter\'s Badge',
    type: ITEM_TYPES.ACCESSORY,
    rarity: ITEM_RARITIES.RARE,
    description: 'Badge recognizing a skilled bounty hunter. Provides combat bonuses.',
    stats: {
      damage: 5,
      accuracy: 3
    },
    equipmentSlot: 'accessory',
    value: 800,
    weight: 0.1,
    factionId: null
  },
  'corporate_commendation': {
    id: 'corporate_commendation',
    name: 'Corporate Sector Commendation',
    type: ITEM_TYPES.ACCESSORY,
    rarity: ITEM_RARITIES.RARE,
    description: 'Commendation for service to the Corporate Sector Authority. Provides intelligence and defense bonuses.',
    stats: {
      intelligence: 5,
      defense: 3
    },
    equipmentSlot: 'accessory',
    value: 800,
    weight: 0.1,
    factionId: 'corporate_sector',
    minReputationTier: 'friendly'
  },
  'outer_rim_commendation': {
    id: 'outer_rim_commendation',
    name: 'Outer Rim Settler\'s Commendation',
    type: ITEM_TYPES.ACCESSORY,
    rarity: ITEM_RARITIES.RARE,
    description: 'Commendation from Outer Rim settlers. Provides survival and crafting bonuses.',
    stats: {
      crafting: 5,
      repair: 5
    },
    equipmentSlot: 'accessory',
    value: 800,
    weight: 0.1,
    factionId: 'outer_rim_settlers',
    minReputationTier: 'friendly'
  },
  'twi_lek_artifact': {
    id: 'twi_lek_artifact',
    name: 'Twi\'lek Cultural Artifact',
    type: ITEM_TYPES.QUEST_ITEM,
    rarity: ITEM_RARITIES.UNCOMMON,
    description: 'A cultural artifact from a liberated Twi\'lek village.',
    value: 200,
    weight: 0.5,
    stackSize: 1
  },
  'lost_spice_cargo': {
    id: 'lost_spice_cargo',
    name: 'Lost Spice Cargo',
    type: ITEM_TYPES.QUEST_ITEM,
    rarity: ITEM_RARITIES.UNCOMMON,
    description: 'Recovered spice cargo from a missing runner.',
    value: 500,
    weight: 5.0,
    stackSize: 1
  },
  
  // ========== PHASE 1 QUEST ITEMS - TATOOINE ==========
  'krayt_report': {
    id: 'krayt_report',
    name: 'Krayt Dragon Sighting Report',
    type: ITEM_TYPES.QUEST_ITEM,
    rarity: ITEM_RARITIES.COMMON,
    description: 'Report of recent krayt dragon sightings in the Jundland Wastes.',
    value: 0,
    weight: 0.1,
    stackSize: 1
  },
  'dragon_scale': {
    id: 'dragon_scale',
    name: 'Dragon Scale Fragment',
    type: ITEM_TYPES.QUEST_ITEM,
    rarity: ITEM_RARITIES.RARE,
    description: 'Fragment from a krayt dragon, proves encounter. Can be used in crafting.',
    value: 300,
    weight: 0.5,
    stackSize: 5
  },
  'krayt_pearl': {
    id: 'krayt_pearl',
    name: 'Krayt Dragon Pearl',
    type: ITEM_TYPES.ACCESSORY,
    rarity: ITEM_RARITIES.LEGENDARY,
    description: 'Legendary pearl from a krayt dragon, extremely valuable. Possesses unique Force properties.',
    stats: {
      forcePower: 20,
      damage: 10,
      specialEffects: ['force_enhancement']
    },
    equipmentSlot: 'accessory',
    value: 10000,
    weight: 0.1,
    factionId: 'jedi_seekers',
    minReputationTier: 'friendly'
  },
  'dragon_bones': {
    id: 'dragon_bones',
    name: 'Krayt Dragon Bones',
    type: ITEM_TYPES.RESOURCE,
    rarity: ITEM_RARITIES.RARE,
    description: 'Bones from a krayt dragon. Extremely valuable crafting material with unique properties.',
    value: 500,
    weight: 3.0,
    stackSize: 10
  },
  'race_badge': {
    id: 'race_badge',
    name: 'Race Entry Badge',
    type: ITEM_TYPES.QUEST_ITEM,
    rarity: ITEM_RARITIES.COMMON,
    description: 'Badge granting entry to Beggar\'s Canyon race.',
    value: 0,
    weight: 0.1,
    stackSize: 1
  },
  'championship_trophy': {
    id: 'championship_trophy',
    name: 'Championship Trophy',
    type: ITEM_TYPES.QUEST_ITEM,
    rarity: ITEM_RARITIES.RARE,
    description: 'Trophy from winning Beggar\'s Canyon race. Provides reputation bonus.',
    value: 0,
    weight: 2.0,
    stackSize: 1,
    stats: {
      reputationBonus: 15
    }
  },
  'custom_swoop': {
    id: 'custom_swoop',
    name: 'Custom Swoop Bike',
    type: ITEM_TYPES.QUEST_ITEM,
    rarity: ITEM_RARITIES.EPIC,
    description: 'Custom-built swoop bike from race victory. Enhanced speed and maneuverability.',
    value: 5000,
    weight: 50.0,
    stackSize: 1,
    stats: {
      speed: 150,
      maneuverability: 120
    }
  },
  'skywalker_datapad': {
    id: 'skywalker_datapad',
    name: 'Skywalker Family Datapad',
    type: ITEM_TYPES.QUEST_ITEM,
    rarity: ITEM_RARITIES.UNCOMMON,
    description: 'Datapad from Lars Homestead, contains Skywalker history.',
    value: 300,
    weight: 0.3,
    stackSize: 1
  },
  'hutt_treasure': {
    id: 'hutt_treasure',
    name: 'Hutt Treasure',
    type: ITEM_TYPES.QUEST_ITEM,
    rarity: ITEM_RARITIES.EPIC,
    description: 'Treasure recovered from Jabba\'s Palace. High value, can be sold or kept.',
    value: 5000,
    weight: 10.0,
    stackSize: 1
  },
  
  // ========== PHASE 1 QUEST ITEMS - DANTOOINE ==========
  'ancient_map_fragment': {
    id: 'ancient_map_fragment',
    name: 'Ancient Map Fragment',
    type: ITEM_TYPES.QUEST_ITEM,
    rarity: ITEM_RARITIES.UNCOMMON,
    description: 'Fragment of ancient Jedi map leading to hidden temples.',
    value: 0,
    weight: 0.1,
    stackSize: 1
  },
  'holocron_fragment': {
    id: 'holocron_fragment',
    name: 'Jedi Holocron Fragment',
    type: ITEM_TYPES.QUEST_ITEM,
    rarity: ITEM_RARITIES.RARE,
    description: 'Fragment of ancient Jedi Holocron. Contains Force knowledge.',
    value: 1000,
    weight: 0.2,
    stackSize: 1,
    stats: {
      forcePower: 5
    }
  },
  'dantari_crystals': {
    id: 'dantari_crystals',
    name: 'Dantari Crystals',
    type: ITEM_TYPES.RESOURCE,
    rarity: ITEM_RARITIES.RARE,
    description: 'Force-sensitive crystals from Dantooine. Used in lightsaber construction and Force enhancements.',
    value: 800,
    weight: 0.3,
    stackSize: 5
  },
  'jedi_teaching': {
    id: 'jedi_teaching',
    name: 'Ancient Jedi Teaching',
    type: ITEM_TYPES.QUEST_ITEM,
    rarity: ITEM_RARITIES.EPIC,
    description: 'Ancient Force teaching received from Enclave. Unlocks permanent Force ability.',
    value: 0,
    weight: 0,
    stackSize: 1,
    stats: {
      permanentAbility: 'force_insight'
    }
  },
  'lightsaber_crystal': {
    id: 'lightsaber_crystal',
    name: 'Lightsaber Crystal',
    type: ITEM_TYPES.QUEST_ITEM,
    rarity: ITEM_RARITIES.EPIC,
    description: 'Crystal for lightsaber construction. Obtained through light side choices.',
    value: 2000,
    weight: 0.1,
    stackSize: 1
  },
  'base_map': {
    id: 'base_map',
    name: 'Base Layout Map',
    type: ITEM_TYPES.QUEST_ITEM,
    rarity: ITEM_RARITIES.COMMON,
    description: 'Map of abandoned Rebel base layout.',
    value: 0,
    weight: 0.1,
    stackSize: 1
  },
  'security_key': {
    id: 'security_key',
    name: 'Security Override Key',
    type: ITEM_TYPES.QUEST_ITEM,
    rarity: ITEM_RARITIES.UNCOMMON,
    description: 'Key to override base security systems.',
    value: 0,
    weight: 0.1,
    stackSize: 1
  },
  'rebel_datapads': {
    id: 'rebel_datapads',
    name: 'Rebel Intelligence Datapads',
    type: ITEM_TYPES.QUEST_ITEM,
    rarity: ITEM_RARITIES.UNCOMMON,
    description: 'Classified intelligence from abandoned Rebel base.',
    value: 0,
    weight: 0.5,
    stackSize: 1
  },
  'imperial_report': {
    id: 'imperial_report',
    name: 'Imperial Activity Report',
    type: ITEM_TYPES.QUEST_ITEM,
    rarity: ITEM_RARITIES.UNCOMMON,
    description: 'Report of Imperial Remnant activity on Dantooine.',
    value: 0,
    weight: 0.2,
    stackSize: 1
  },
  'nr_commendation': {
    id: 'nr_commendation',
    name: 'New Republic Commendation',
    type: ITEM_TYPES.QUEST_ITEM,
    rarity: ITEM_RARITIES.RARE,
    description: 'Commendation for service to New Republic. Provides reputation bonus.',
    value: 0,
    weight: 0.2,
    stackSize: 1,
    stats: {
      reputationBonus: 20
    },
    factionId: 'new_republic',
    minReputationTier: null
  },
  'kinrath_eggs': {
    id: 'kinrath_eggs',
    name: 'Kinrath Eggs',
    type: ITEM_TYPES.RESOURCE,
    rarity: ITEM_RARITIES.UNCOMMON,
    description: 'Eggs from kinrath creatures. Used in alchemy and crafting.',
    value: 200,
    weight: 0.5,
    stackSize: 10
  },
  'settler_gift': {
    id: 'settler_gift',
    name: 'Settler\'s Gift',
    type: ITEM_TYPES.QUEST_ITEM,
    rarity: ITEM_RARITIES.COMMON,
    description: 'A gift from grateful settlers.',
    value: 50,
    weight: 0.3,
    stackSize: 1
  },
  
  // ========== PHASE 1 QUEST ITEMS - CORUSCANT ==========
  'corruption_evidence': {
    id: 'corruption_evidence',
    name: 'Corruption Evidence',
    type: ITEM_TYPES.QUEST_ITEM,
    rarity: ITEM_RARITIES.UNCOMMON,
    description: 'Initial evidence of senator corruption.',
    value: 0,
    weight: 0.2,
    stackSize: 1
  },
  'bribery_records': {
    id: 'bribery_records',
    name: 'Bribery Records',
    type: ITEM_TYPES.QUEST_ITEM,
    rarity: ITEM_RARITIES.RARE,
    description: 'Records of bribery transactions. Key evidence in corruption case.',
    value: 0,
    weight: 0.3,
    stackSize: 1
  },
  'underworld_evidence': {
    id: 'underworld_evidence',
    name: 'Underworld Evidence',
    type: ITEM_TYPES.QUEST_ITEM,
    rarity: ITEM_RARITIES.UNCOMMON,
    description: 'Evidence from underworld connections.',
    value: 0,
    weight: 0.2,
    stackSize: 1
  },
  'senate_commendation': {
    id: 'senate_commendation',
    name: 'Senate Commendation',
    type: ITEM_TYPES.QUEST_ITEM,
    rarity: ITEM_RARITIES.RARE,
    description: 'Commendation from Senate for exposing corruption. Provides reputation bonus.',
    value: 0,
    weight: 0.2,
    stackSize: 1,
    stats: {
      reputationBonus: 25
    }
  },
  'senator_assets': {
    id: 'senator_assets',
    name: 'Exposed Senator\'s Assets',
    type: ITEM_TYPES.QUEST_ITEM,
    rarity: ITEM_RARITIES.EPIC,
    description: 'Confiscated assets from corrupt senator. High value, can be sold or returned.',
    value: 8000,
    weight: 5.0,
    stackSize: 1
  },
  'temple_map': {
    id: 'temple_map',
    name: 'Temple Map Fragment',
    type: ITEM_TYPES.QUEST_ITEM,
    rarity: ITEM_RARITIES.UNCOMMON,
    description: 'Map fragment of Jedi Temple layout.',
    value: 0,
    weight: 0.1,
    stackSize: 1
  },
  'ancient_key': {
    id: 'ancient_key',
    name: 'Ancient Key',
    type: ITEM_TYPES.QUEST_ITEM,
    rarity: ITEM_RARITIES.RARE,
    description: 'Ancient key to artifact chamber in Jedi Temple.',
    value: 0,
    weight: 0.1,
    stackSize: 1
  },
  'jedi_artifact': {
    id: 'jedi_artifact',
    name: 'Jedi Artifact',
    type: ITEM_TYPES.ACCESSORY,
    rarity: ITEM_RARITIES.EPIC,
    description: 'Powerful artifact from Jedi Temple. Possesses significant Force power.',
    value: 15000,
    weight: 1.0,
    stats: {
      forcePower: 30,
      intelligence: 5,
      charisma: 5
    },
    equipmentSlot: 'accessory',
    factionId: 'jedi_seekers',
    minReputationTier: 'allied',
    specialEffects: ['force_mastery', 'force_enhancement']
  },
  'artifact_power': {
    id: 'artifact_power',
    name: 'Artifact Power',
    type: ITEM_TYPES.QUEST_ITEM,
    rarity: ITEM_RARITIES.EPIC,
    description: 'Power gained from artifact. Unlocks permanent Force ability.',
    value: 0,
    weight: 0,
    stackSize: 1,
    stats: {
      permanentAbility: 'force_artifact_mastery'
    }
  },
  'artifact_fragment': {
    id: 'artifact_fragment',
    name: 'Artifact Fragment',
    type: ITEM_TYPES.QUEST_ITEM,
    rarity: ITEM_RARITIES.RARE,
    description: 'Fragment of destroyed artifact. Represents a different path taken.',
    value: 500,
    weight: 0.2,
    stackSize: 1
  },
  'valuable_info': {
    id: 'valuable_info',
    name: 'Valuable Information',
    type: ITEM_TYPES.QUEST_ITEM,
    rarity: ITEM_RARITIES.UNCOMMON,
    description: 'Valuable information from broker. Can be sold or used in other quests.',
    value: 500,
    weight: 0,
    stackSize: 1
  },
  'political_favor': {
    id: 'political_favor',
    name: 'Political Favor',
    type: ITEM_TYPES.QUEST_ITEM,
    rarity: ITEM_RARITIES.UNCOMMON,
    description: 'Favor owed by political figure. Can be called in for future quests.',
    value: 0,
    weight: 0,
    stackSize: 1,
    stats: {
      reputationBonus: 10
    }
  },
  
  // ========== PLANET RESOURCES ==========
  // Ryloth Resources
  'resource_ryll_spice': {
    id: 'resource_ryll_spice',
    name: 'Ryll Spice',
    type: ITEM_TYPES.RESOURCE,
    rarity: ITEM_RARITIES.UNCOMMON,
    description: 'A valuable spice native to Ryloth, highly sought after in galactic trade. The primary export of the planet.',
    value: 150,
    weight: 0.5,
    stackSize: 100
  },
  'resource_doonium': {
    id: 'resource_doonium',
    name: 'Doonium',
    type: ITEM_TYPES.RESOURCE,
    rarity: ITEM_RARITIES.COMMON,
    description: 'A durable metal ore found in Ryloth\'s mines. Used in ship construction and industrial applications.',
    value: 50,
    weight: 2.0,
    stackSize: 50
  },
  // Tatooine Resources
  'resource_krayt_pearl': {
    id: 'resource_krayt_pearl',
    name: 'Krayt Dragon Pearl',
    type: ITEM_TYPES.RESOURCE,
    rarity: ITEM_RARITIES.RARE,
    description: 'A rare and valuable pearl from a Krayt Dragon. Extremely valuable and sought after.',
    value: 5000,
    weight: 0.1,
    stackSize: 1
  },
  'resource_bantha_hide': {
    id: 'resource_bantha_hide',
    name: 'Bantha Hide',
    type: ITEM_TYPES.RESOURCE,
    rarity: ITEM_RARITIES.COMMON,
    description: 'Tough hide from a bantha. Used in crafting and leatherworking.',
    value: 30,
    weight: 1.5,
    stackSize: 20
  },
  'resource_dragon_bones': {
    id: 'resource_dragon_bones',
    name: 'Dragon Bones',
    type: ITEM_TYPES.RESOURCE,
    rarity: ITEM_RARITIES.UNCOMMON,
    description: 'Bones from a Krayt Dragon. Used in crafting and as decorative materials.',
    value: 200,
    weight: 3.0,
    stackSize: 10
  },
  // Dantooine Resources
  'resource_dantari_crystals': {
    id: 'resource_dantari_crystals',
    name: 'Dantari Crystals',
    type: ITEM_TYPES.RESOURCE,
    rarity: ITEM_RARITIES.RARE,
    description: 'Force-sensitive crystals found in the Kinrath Cave. Possess unique properties and are highly sought after by Jedi Seekers.',
    value: 800,
    weight: 0.3,
    stackSize: 5
  },
  'resource_kinrath_eggs': {
    id: 'resource_kinrath_eggs',
    name: 'Kinrath Eggs',
    type: ITEM_TYPES.RESOURCE,
    rarity: ITEM_RARITIES.UNCOMMON,
    description: 'Eggs from kinrath creatures. Used in alchemy and crafting, though dangerous to obtain.',
    value: 200,
    weight: 0.5,
    stackSize: 10
  },
  // Coruscant Resources
  'resource_political_favors': {
    id: 'resource_political_favors',
    name: 'Political Favors',
    type: ITEM_TYPES.RESOURCE,
    rarity: ITEM_RARITIES.UNCOMMON,
    description: 'Favors owed by political figures. Can be called in for future assistance or used to influence decisions.',
    value: 0,
    weight: 0,
    stackSize: 1
  },
  'resource_information': {
    id: 'resource_information',
    name: 'Information',
    type: ITEM_TYPES.RESOURCE,
    rarity: ITEM_RARITIES.UNCOMMON,
    description: 'Valuable information obtained from brokers, spies, or investigations. Can be traded or used in quests.',
    value: 100,
    weight: 0,
    stackSize: 1
  }
};

/**
 * Get item definition by ID
 */
function getItemDefinition(itemId) {
  return itemDefinitions[itemId] || null;
}

/**
 * Get all item definitions
 */
function getAllItemDefinitions() {
  return itemDefinitions;
}

/**
 * Get items by type
 */
function getItemsByType(type) {
  return Object.values(itemDefinitions).filter(item => item.type === type);
}

/**
 * Get items by rarity
 */
function getItemsByRarity(rarity) {
  return Object.values(itemDefinitions).filter(item => item.rarity === rarity);
}

module.exports = {
  ITEM_TYPES,
  ITEM_RARITIES,
  itemDefinitions,
  getItemDefinition,
  getAllItemDefinitions,
  getItemsByType,
  getItemsByRarity
};


