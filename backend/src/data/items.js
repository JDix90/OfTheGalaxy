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
  'pulser_pistol_01': {
    id: 'pulser_pistol_01',
    name: 'VK-7 Heavy Pulser Pistol',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.UNCOMMON,
    description: 'A reliable heavy pulser pistol favored by smugglers and bounty hunters.',
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
  'pulser_rifle_01': {
    id: 'pulser_rifle_01',
    name: 'L-11 Pulser Rifle',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.COMMON,
    description: 'Standard issue Dominion pulser rifle.',
    stats: {
      damage: 30,
      range: 50,
      accuracy: 70
    },
    equipmentSlot: 'weapon',
    value: 450,
    weight: 4.0,
    factionId: 'dominion_remnant',
    minReputationTier: null
  },
  'arcblade_01': {
    id: 'arcblade_01',
    name: 'Arcblade',
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
    factionId: 'keeper_seekers',
    minReputationTier: 'trusted',
    specialEffects: ['veil_enhancement', 'arcblade_mastery']
  },
  
  // ========== PRIORITY 1: EXPANDED WEAPONS ==========
  
  // Pulser Pistols - Common Tier
  'pulser_pistol_dominion': {
    id: 'pulser_pistol_dominion',
    name: 'SE-14r Pulser Pistol',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.COMMON,
    description: 'Standard issue Dominion sidearm. Reliable and accurate.',
    stats: {
      damage: 23,
      range: 28,
      accuracy: 78
    },
    equipmentSlot: 'weapon',
    value: 450,
    weight: 2.3,
    factionId: 'dominion_remnant',
    minReputationTier: null
  },
  'pulser_pistol_rebel': {
    id: 'pulser_pistol_rebel',
    name: 'A-180 Pulser Pistol',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.COMMON,
    description: 'Concord standard issue pulser pistol. Versatile and dependable.',
    stats: {
      damage: 24,
      range: 32,
      accuracy: 76
    },
    equipmentSlot: 'weapon',
    value: 480,
    weight: 2.4,
    factionId: 'concord',
    minReputationTier: null
  },
  
  // Pulser Rifles - Common Tier
  'pulser_rifle_generic': {
    id: 'pulser_rifle_generic',
    name: 'DC-15A Pulser Rifle',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.COMMON,
    description: 'A common pulser rifle found throughout the galaxy. No faction affiliation.',
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
  'pulser_rifle_rebel': {
    id: 'pulser_rifle_rebel',
    name: 'RK-9 Pulser Rifle',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.COMMON,
    description: 'Concord standard issue pulser rifle. Reliable and effective.',
    stats: {
      damage: 29,
      range: 48,
      accuracy: 72
    },
    equipmentSlot: 'weapon',
    value: 420,
    weight: 3.9,
    factionId: 'concord',
    minReputationTier: null
  },
  
  // Melee Weapons - Common Tier
  'shock_blade': {
    id: 'shock_blade',
    name: 'Shock-blade',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.COMMON,
    description: 'A basic shock_blade. Simple but effective in close combat.',
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
  'shock_blade_dominion': {
    id: 'shock_blade_dominion',
    name: 'Dominion Shock-blade',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.COMMON,
    description: 'Standard issue Dominion shock_blade. Durable and reliable.',
    stats: {
      damage: 21,
      range: 1,
      accuracy: 83
    },
    equipmentSlot: 'weapon',
    value: 220,
    weight: 1.6,
    factionId: 'dominion_remnant',
    minReputationTier: null
  },
  
  // Pulser Pistols - Uncommon Tier
  'pulser_pistol_02': {
    id: 'pulser_pistol_02',
    name: 'DL-18 Pulser Pistol',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.UNCOMMON,
    description: 'An upgraded version of the VK-7. Improved accuracy and range.',
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
  'pulser_pistol_smuggler': {
    id: 'pulser_pistol_smuggler',
    name: 'DT-12 Pulser Pistol',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.UNCOMMON,
    description: 'A compact pulser favored by smugglers. Easy to conceal and reliable.',
    stats: {
      damage: 28,
      range: 30,
      accuracy: 82
    },
    equipmentSlot: 'weapon',
    value: 750,
    weight: 2.0,
    factionId: 'drift_cartel',
    minReputationTier: 'friendly'
  },
  'pulser_pistol_corporate': {
    id: 'pulser_pistol_corporate',
    name: 'Czerka C-10 Pulser Pistol',
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
  'pulser_pistol_bounty': {
    id: 'pulser_pistol_bounty',
    name: 'EE-3 Pulser Pistol',
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
  
  // Pulser Rifles - Uncommon Tier
  'pulser_rifle_02': {
    id: 'pulser_rifle_02',
    name: 'L-11 Enhanced Pulser Rifle',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.UNCOMMON,
    description: 'Enhanced version of the standard L-11. Improved damage and accuracy.',
    stats: {
      damage: 35,
      range: 55,
      accuracy: 75
    },
    equipmentSlot: 'weapon',
    value: 900,
    weight: 4.2,
    factionId: 'dominion_remnant',
    minReputationTier: null
  },
  'pulser_rifle_rebel_enhanced': {
    id: 'pulser_rifle_rebel_enhanced',
    name: 'RK-9 Enhanced Pulser Rifle',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.UNCOMMON,
    description: 'Enhanced Concord pulser rifle. Improved range and accuracy.',
    stats: {
      damage: 33,
      range: 58,
      accuracy: 77
    },
    equipmentSlot: 'weapon',
    value: 850,
    weight: 4.0,
    factionId: 'concord',
    minReputationTier: null
  },
  'pulser_rifle_corporate': {
    id: 'pulser_rifle_corporate',
    name: 'Czerka C-20 Pulser Rifle',
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
  'pulser_rifle_scout': {
    id: 'pulser_rifle_scout',
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
    description: 'Concord vibrosword. Lightweight and effective.',
    stats: {
      damage: 29,
      range: 1,
      accuracy: 82
    },
    equipmentSlot: 'weapon',
    value: 420,
    weight: 1.9,
    factionId: 'concord',
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
  
  // Pulser Pistols - Rare Tier
  'pulser_pistol_03': {
    id: 'pulser_pistol_03',
    name: 'VK-7 Custom Pulser Pistol',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.RARE,
    description: 'A custom-tuned VK-7. Maximum performance for the discerning shooter.',
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
  'pulser_pistol_dominion_elite': {
    id: 'pulser_pistol_dominion_elite',
    name: 'SE-14r Elite Pulser Pistol',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.RARE,
    description: 'Elite Dominion sidearm. Issued to officers and special forces.',
    stats: {
      damage: 38,
      range: 35,
      accuracy: 83
    },
    equipmentSlot: 'weapon',
    value: 1400,
    weight: 2.4,
    factionId: 'dominion_remnant',
    minReputationTier: 'friendly'
  },
  'pulser_pistol_rebel_elite': {
    id: 'pulser_pistol_rebel_elite',
    name: 'A-180 Modified Pulser Pistol',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.RARE,
    description: 'Modified Concord pulser. Enhanced for special operations.',
    stats: {
      damage: 39,
      range: 36,
      accuracy: 84
    },
    equipmentSlot: 'weapon',
    value: 1450,
    weight: 2.5,
    factionId: 'concord',
    minReputationTier: 'friendly'
  },
  'pulser_pistol_ironkin': {
    id: 'pulser_pistol_ironkin',
    name: 'Westar-35 Pulser Pistol',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.RARE,
    description: 'Ironkin pulser pistol. Exceptional craftsmanship and power.',
    stats: {
      damage: 42,
      range: 40,
      accuracy: 86
    },
    equipmentSlot: 'weapon',
    value: 2000,
    weight: 2.6,
    factionId: null,
    specialEffects: ['ironkin_craftsmanship']
  },
  
  // Pulser Rifles - Rare Tier
  'pulser_rifle_03': {
    id: 'pulser_rifle_03',
    name: 'L-11 Elite Pulser Rifle',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.RARE,
    description: 'Elite version of the L-11. Maximum Dominion firepower.',
    stats: {
      damage: 40,
      range: 60,
      accuracy: 80
    },
    equipmentSlot: 'weapon',
    value: 1800,
    weight: 4.5,
    factionId: 'dominion_remnant',
    minReputationTier: 'friendly'
  },
  'pulser_rifle_rebel_elite': {
    id: 'pulser_rifle_rebel_elite',
    name: 'RK-9 Elite Pulser Rifle',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.RARE,
    description: 'Elite Concord pulser rifle. Superior range and accuracy.',
    stats: {
      damage: 38,
      range: 62,
      accuracy: 82
    },
    equipmentSlot: 'weapon',
    value: 1700,
    weight: 4.3,
    factionId: 'concord',
    minReputationTier: 'friendly'
  },
  'pulser_rifle_ironkin': {
    id: 'pulser_rifle_ironkin',
    name: 'Ironkin Pulser Rifle',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.RARE,
    description: 'Ironkin-crafted pulser rifle. Exceptional quality and power.',
    stats: {
      damage: 42,
      range: 58,
      accuracy: 84
    },
    equipmentSlot: 'weapon',
    value: 2200,
    weight: 4.2,
    factionId: null,
    specialEffects: ['ironkin_craftsmanship']
  },
  'pulser_rifle_heavy': {
    id: 'pulser_rifle_heavy',
    name: 'Heavy Pulser Rifle',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.RARE,
    description: 'A heavy pulser rifle. High damage but slower rate of fire.',
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
  'pulser_rifle_precision': {
    id: 'pulser_rifle_precision',
    name: 'Precision Pulser Rifle',
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
  'heavy_pulser': {
    id: 'heavy_pulser',
    name: 'Heavy Pulser',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.RARE,
    description: 'A heavy pulser weapon. High damage but lower accuracy.',
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
  'heavy_pulser_dominion': {
    id: 'heavy_pulser_dominion',
    name: 'RT-97C Heavy Pulser',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.RARE,
    description: 'Dominion heavy pulser. Devastating firepower.',
    stats: {
      damage: 58,
      range: 42,
      accuracy: 63
    },
    equipmentSlot: 'weapon',
    value: 2200,
    weight: 8.5,
    factionId: 'dominion_remnant',
    minReputationTier: 'friendly'
  },
  'heavy_pulser_rebel': {
    id: 'heavy_pulser_rebel',
    name: 'T-21 Heavy Pulser',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.RARE,
    description: 'Concord heavy pulser. Powerful and reliable.',
    stats: {
      damage: 56,
      range: 41,
      accuracy: 67
    },
    equipmentSlot: 'weapon',
    value: 2100,
    weight: 8.2,
    factionId: 'concord',
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
  'sniper_rifle_dominion': {
    id: 'sniper_rifle_dominion',
    name: 'L-11s Sniper Rifle',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.RARE,
    description: 'Dominion sniper variant. Maximum range and precision.',
    stats: {
      damage: 62,
      range: 105,
      accuracy: 88
    },
    equipmentSlot: 'weapon',
    value: 2400,
    weight: 6.2,
    factionId: 'dominion_remnant',
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
  'vibrosword_ironkin': {
    id: 'vibrosword_ironkin',
    name: 'Ironkin Vibrosword',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.RARE,
    description: 'Ironkin-crafted vibrosword. Exceptional craftsmanship.',
    stats: {
      damage: 42,
      range: 1,
      accuracy: 82
    },
    equipmentSlot: 'weapon',
    value: 2000,
    weight: 2.2,
    factionId: null,
    specialEffects: ['ironkin_craftsmanship']
  },
  
  // Pulser Pistols - Epic Tier
  'pulser_pistol_legendary': {
    id: 'pulser_pistol_legendary',
    name: 'VK-7 Masterwork Pulser Pistol',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.EPIC,
    description: 'A masterwork VK-7. The pinnacle of pulser pistol craftsmanship.',
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
  'pulser_pistol_dominion_master': {
    id: 'pulser_pistol_dominion_master',
    name: 'SE-14r Master Pulser Pistol',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.EPIC,
    description: 'Master-crafted Dominion sidearm. The finest Dominion weaponry.',
    stats: {
      damage: 48,
      range: 42,
      accuracy: 88
    },
    equipmentSlot: 'weapon',
    value: 4800,
    weight: 2.5,
    factionId: 'dominion_remnant',
    minReputationTier: 'trusted'
  },
  'pulser_pistol_rebel_master': {
    id: 'pulser_pistol_rebel_master',
    name: 'A-180 Master Pulser Pistol',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.EPIC,
    description: 'Master-crafted Concord pulser. Exceptional quality.',
    stats: {
      damage: 49,
      range: 43,
      accuracy: 89
    },
    equipmentSlot: 'weapon',
    value: 4900,
    weight: 2.6,
    factionId: 'concord',
    minReputationTier: 'trusted'
  },
  'pulser_pistol_cirruan': {
    id: 'pulser_pistol_cirruan',
    name: 'Cirruan Special Pulser Pistol',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.EPIC,
    description: 'A unique pulser from Cirruan. Rare and powerful.',
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
  
  // Pulser Rifles - Epic Tier
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
  'pulser_rifle_dominion_master': {
    id: 'pulser_rifle_dominion_master',
    name: 'L-11 Master Pulser Rifle',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.EPIC,
    description: 'Master-crafted Dominion rifle. The finest Dominion weaponry.',
    stats: {
      damage: 48,
      range: 65,
      accuracy: 85
    },
    equipmentSlot: 'weapon',
    value: 5500,
    weight: 4.8,
    factionId: 'dominion_remnant',
    minReputationTier: 'trusted'
  },
  'pulser_rifle_rebel_master': {
    id: 'pulser_rifle_rebel_master',
    name: 'RK-9 Master Pulser Rifle',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.EPIC,
    description: 'Master-crafted Concord rifle. Exceptional quality.',
    stats: {
      damage: 46,
      range: 68,
      accuracy: 87
    },
    equipmentSlot: 'weapon',
    value: 5400,
    weight: 4.6,
    factionId: 'concord',
    minReputationTier: 'trusted'
  },
  'pulser_rifle_ancient': {
    id: 'pulser_rifle_ancient',
    name: 'Ancient Pulser Rifle',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.EPIC,
    description: 'An ancient pulser rifle. Rare find with unique properties.',
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
  'heavy_pulser_elite': {
    id: 'heavy_pulser_elite',
    name: 'Elite Heavy Pulser',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.EPIC,
    description: 'An elite heavy pulser. Maximum firepower.',
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
  'repeating_pulser': {
    id: 'repeating_pulser',
    name: 'Repeating Pulser',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.EPIC,
    description: 'A repeating pulser. High rate of fire and damage.',
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
  'sniper_rifle_ironkin': {
    id: 'sniper_rifle_ironkin',
    name: 'Ironkin Sniper Rifle',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.EPIC,
    description: 'Ironkin-crafted sniper rifle. Exceptional precision.',
    stats: {
      damage: 78,
      range: 125,
      accuracy: 96
    },
    equipmentSlot: 'weapon',
    value: 7000,
    weight: 6.8,
    factionId: null,
    specialEffects: ['ironkin_craftsmanship']
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
  'veil_pike': {
    id: 'veil_pike',
    name: 'Veil Pike',
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
  'ion_pulser': {
    id: 'ion_pulser',
    name: 'Ion Pulser',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.EPIC,
    description: 'An ion pulser. Extra effective against droids and electronic systems.',
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
  'stun_pulser': {
    id: 'stun_pulser',
    name: 'Stun Pulser',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.EPIC,
    description: 'A stun pulser. Non-lethal but effective.',
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
  'pulser_pistol_vetch': {
    id: 'pulser_pistol_vetch',
    name: 'Rann Vetch\'s VK-7',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.LEGENDARY,
    description: 'The legendary pulser pistol of Rann Vetch. A piece of galactic history.',
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
  'pulser_pistol_ancient': {
    id: 'pulser_pistol_ancient',
    name: 'Ancient Pulser Pistol',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.LEGENDARY,
    description: 'An ancient pulser pistol. Rare find with unique properties.',
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
  'pulser_rifle_legendary': {
    id: 'pulser_rifle_legendary',
    name: 'Legendary Pulser Rifle',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.LEGENDARY,
    description: 'A legendary pulser rifle. The pinnacle of weaponry.',
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
  'pulser_rifle_force_enhanced': {
    id: 'pulser_rifle_force_enhanced',
    name: 'Veil-Enhanced Pulser Rifle',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.LEGENDARY,
    description: 'A pulser rifle enhanced with the Veil. Unique and powerful.',
    stats: {
      damage: 60,
      range: 75,
      accuracy: 98,
      forcePower: 10
    },
    equipmentSlot: 'weapon',
    value: 25000,
    weight: 5.0,
    factionId: 'keeper_seekers',
    minReputationTier: 'allied',
    specialEffects: ['veil_enhancement', 'legendary_weapon']
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
    description: 'The legendary Darksaber. A unique Ironkin weapon.',
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
    specialEffects: ['legendary_weapon', 'veil_enhancement', 'ironkin_craftsmanship']
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
  // Salvaged armor worn by common enemies — looted from their corpses, so it
  // resolves to a real definition instead of a generic "Unknown item" at vendors.
  'leather_armor': {
    id: 'leather_armor',
    name: 'Leather Armor',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.COMMON,
    description: 'Crude hide-and-leather protection. Cheap, but better than nothing.',
    stats: {
      defense: 10,
      mobility: 6
    },
    equipmentSlot: 'armor',
    value: 150,
    weight: 4.0,
    factionId: null
  },
  'reinforced_armor': {
    id: 'reinforced_armor',
    name: 'Reinforced Armor',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.UNCOMMON,
    description: 'Combat plating reinforced with salvaged composite panels.',
    stats: {
      defense: 25,
      mobility: 2
    },
    equipmentSlot: 'armor',
    value: 650,
    weight: 7.0,
    factionId: null
  },
  'droid_armor': {
    id: 'droid_armor',
    name: 'Droid Plating',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.UNCOMMON,
    description: 'Stripped armor plating from a combat droid chassis. Heavy but durable.',
    stats: {
      defense: 25,
      mobility: 1
    },
    equipmentSlot: 'armor',
    value: 600,
    weight: 8.0,
    factionId: null
  },
  'bounty_hunter_armor': {
    id: 'bounty_hunter_armor',
    name: "Bounty Hunter's Rig",
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.UNCOMMON,
    description: 'Lightweight tactical armor favored by bounty hunters — balanced for mobility and protection.',
    stats: {
      defense: 22,
      mobility: 8
    },
    equipmentSlot: 'armor',
    value: 700,
    weight: 5.5,
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
  'armor_light_dominion': {
    id: 'armor_light_dominion',
    name: 'Dominion Light Armor',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.COMMON,
    description: 'Light armor worn by Dominion personnel. Standard issue.',
    stats: {
      defense: 12,
      mobility: 3
    },
    equipmentSlot: 'armor',
    value: 350,
    weight: 5.5,
    factionId: 'dominion_remnant',
    minReputationTier: null
  },
  'armor_light_rebel': {
    id: 'armor_light_rebel',
    name: 'Rebel Light Armor',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.COMMON,
    description: 'Light armor used by Concord forces. Flexible and durable.',
    stats: {
      defense: 11,
      mobility: 6
    },
    equipmentSlot: 'armor',
    value: 320,
    weight: 4.8,
    factionId: 'concord',
    minReputationTier: null
  },
  
  // Medium Armor - Common Tier
  'armor_medium_dominion': {
    id: 'armor_medium_dominion',
    name: 'Dominion Medium Armor',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.COMMON,
    description: 'Medium armor for Dominion troops. Good balance of protection and mobility.',
    stats: {
      defense: 22,
      mobility: -1
    },
    equipmentSlot: 'armor',
    value: 450,
    weight: 11.0,
    factionId: 'dominion_remnant',
    minReputationTier: null
  },
  'armor_medium_rebel': {
    id: 'armor_medium_rebel',
    name: 'Rebel Medium Armor',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.COMMON,
    description: 'Medium armor used by Concord forces. Balanced protection.',
    stats: {
      defense: 21,
      mobility: 2
    },
    equipmentSlot: 'armor',
    value: 420,
    weight: 10.5,
    factionId: 'concord',
    minReputationTier: null
  },
  
  // Heavy Armor - Common Tier
  'armor_heavy_dominion': {
    id: 'armor_heavy_dominion',
    name: 'Dominion Heavy Armor',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.COMMON,
    description: 'Heavy armor for Dominion troops. Maximum protection.',
    stats: {
      defense: 33,
      mobility: -4
    },
    equipmentSlot: 'armor',
    value: 480,
    weight: 19.0,
    factionId: 'dominion_remnant',
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
    factionId: 'drift_cartel',
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
  'pulser_pistol_outer_rim': {
    id: 'pulser_pistol_outer_rim',
    name: 'Outer Rim Pulser Pistol',
    type: ITEM_TYPES.WEAPON,
    rarity: ITEM_RARITIES.UNCOMMON,
    description: 'A reliable pulser pistol favored by Outer Rim settlers. Built for harsh conditions.',
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
  'armor_heavy_dominion_standard': {
    id: 'armor_heavy_dominion_standard',
    name: 'Ironclad Armor',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.UNCOMMON,
    description: 'Standard issue Ironclad armor. Iconic white plating with good protection.',
    stats: {
      defense: 25,
      mobility: -2
    },
    equipmentSlot: 'armor',
    value: 800,
    weight: 15.0,
    factionId: 'dominion_remnant',
    minReputationTier: null,
    specialEffects: ['dominion_identification']
  },
  'armor_heavy_rebel': {
    id: 'armor_heavy_rebel',
    name: 'Rebel Heavy Armor',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.UNCOMMON,
    description: 'Heavy armor used by Concord forces. Strong protection.',
    stats: {
      defense: 37,
      mobility: -3
    },
    equipmentSlot: 'armor',
    value: 850,
    weight: 20.5,
    factionId: 'concord',
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
  'armor_light_dominion_elite': {
    id: 'armor_light_dominion_elite',
    name: 'Dominion Scout Armor',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.RARE,
    description: 'Elite Dominion scout armor. High mobility and protection.',
    stats: {
      defense: 18,
      mobility: 8
    },
    equipmentSlot: 'armor',
    value: 1200,
    weight: 5.8,
    factionId: 'dominion_remnant',
    minReputationTier: 'friendly'
  },
  'armor_light_rebel_elite': {
    id: 'armor_light_rebel_elite',
    name: 'Rebel Scout Armor',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.RARE,
    description: 'Elite Concord scout armor. Superior mobility.',
    stats: {
      defense: 17,
      mobility: 11
    },
    equipmentSlot: 'armor',
    value: 1100,
    weight: 5.5,
    factionId: 'concord',
    minReputationTier: 'friendly'
  },
  'armor_light_ironkin': {
    id: 'armor_light_ironkin',
    name: 'Ironkin Light Armor',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.RARE,
    description: 'Light armor crafted by Ironkin artisans. Exceptional quality.',
    stats: {
      defense: 22,
      mobility: 8
    },
    equipmentSlot: 'armor',
    value: 1500,
    weight: 5.5,
    factionId: null,
    specialEffects: ['ironkin_craftsmanship']
  },
  'armor_light_keeper': {
    id: 'armor_light_keeper',
    name: 'Keeper Robes',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.RARE,
    description: 'Traditional Keeper robes. Light protection with Veil enhancement.',
    stats: {
      defense: 18,
      mobility: 12,
      forcePower: 5
    },
    equipmentSlot: 'armor',
    value: 1200,
    weight: 3.0,
    factionId: 'keeper_seekers',
    minReputationTier: 'friendly',
    specialEffects: ['veil_enhancement']
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
  'armor_medium_dominion_elite': {
    id: 'armor_medium_dominion_elite',
    name: 'Dominion Elite Armor',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.RARE,
    description: 'Elite Dominion medium armor. Superior protection.',
    stats: {
      defense: 32,
      mobility: 1
    },
    equipmentSlot: 'armor',
    value: 2000,
    weight: 13.0,
    factionId: 'dominion_remnant',
    minReputationTier: 'friendly'
  },
  'armor_medium_rebel_elite': {
    id: 'armor_medium_rebel_elite',
    name: 'Rebel Elite Armor',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.RARE,
    description: 'Elite Concord medium armor. Superior protection and mobility.',
    stats: {
      defense: 31,
      mobility: 4
    },
    equipmentSlot: 'armor',
    value: 1900,
    weight: 12.8,
    factionId: 'concord',
    minReputationTier: 'friendly'
  },
  'armor_medium_ironkin': {
    id: 'armor_medium_ironkin',
    name: 'Ironkin Medium Armor',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.RARE,
    description: 'Ironkin-crafted medium armor. Exceptional quality.',
    stats: {
      defense: 33,
      mobility: 2
    },
    equipmentSlot: 'armor',
    value: 2500,
    weight: 12.0,
    factionId: null,
    specialEffects: ['ironkin_craftsmanship']
  },
  'armor_medium_keeper': {
    id: 'armor_medium_keeper',
    name: 'Keeper Knight Robes',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.RARE,
    description: 'Robes worn by Keeper Knights. Enhanced protection with Veil properties.',
    stats: {
      defense: 25,
      mobility: 8,
      forcePower: 8
    },
    equipmentSlot: 'armor',
    value: 2200,
    weight: 4.0,
    factionId: 'keeper_seekers',
    minReputationTier: 'friendly',
    specialEffects: ['veil_enhancement']
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
  'armor_heavy_dominion_elite': {
    id: 'armor_heavy_dominion_elite',
    name: 'Ironclad Elite Armor',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.RARE,
    description: 'Elite Ironclad armor. Enhanced protection and durability.',
    stats: {
      defense: 40,
      mobility: -3
    },
    equipmentSlot: 'armor',
    value: 2400,
    weight: 21.5,
    factionId: 'dominion_remnant',
    minReputationTier: 'friendly',
    specialEffects: ['dominion_identification']
  },
  'armor_heavy_rebel_elite': {
    id: 'armor_heavy_rebel_elite',
    name: 'Rebel Heavy Elite Armor',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.RARE,
    description: 'Elite Concord heavy armor. Superior protection.',
    stats: {
      defense: 41,
      mobility: -2
    },
    equipmentSlot: 'armor',
    value: 2400,
    weight: 21.0,
    factionId: 'concord',
    minReputationTier: 'friendly'
  },
  'armor_heavy_ironkin': {
    id: 'armor_heavy_ironkin',
    name: 'Ironkin Heavy Armor',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.RARE,
    description: 'Ironkin-crafted heavy armor. Exceptional protection.',
    stats: {
      defense: 44,
      mobility: -2
    },
    equipmentSlot: 'armor',
    value: 2400,
    weight: 20.0,
    factionId: null,
    specialEffects: ['ironkin_craftsmanship']
  },
  'armor_heavy_beskar': {
    id: 'armor_heavy_beskar',
    name: 'Beskar Armor',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.RARE,
    description: 'Ironkin armor forged from beskar. Exceptional protection.',
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
  'armor_light_dominion_master': {
    id: 'armor_light_dominion_master',
    name: 'Dominion Master Light Armor',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.EPIC,
    description: 'Master-crafted Dominion light armor. The finest Dominion protection.',
    stats: {
      defense: 26,
      mobility: 12
    },
    equipmentSlot: 'armor',
    value: 3500,
    weight: 6.2,
    factionId: 'dominion_remnant',
    minReputationTier: 'trusted'
  },
  'armor_light_rebel_master': {
    id: 'armor_light_rebel_master',
    name: 'Rebel Master Light Armor',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.EPIC,
    description: 'Master-crafted Concord light armor. Exceptional quality.',
    stats: {
      defense: 25,
      mobility: 14
    },
    equipmentSlot: 'armor',
    value: 3400,
    weight: 6.0,
    factionId: 'concord',
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
  'armor_medium_dominion_master': {
    id: 'armor_medium_dominion_master',
    name: 'Dominion Master Medium Armor',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.EPIC,
    description: 'Master-crafted Dominion medium armor. The finest Dominion protection.',
    stats: {
      defense: 40,
      mobility: 3
    },
    equipmentSlot: 'armor',
    value: 4500,
    weight: 14.0,
    factionId: 'dominion_remnant',
    minReputationTier: 'trusted'
  },
  'armor_medium_rebel_master': {
    id: 'armor_medium_rebel_master',
    name: 'Rebel Master Medium Armor',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.EPIC,
    description: 'Master-crafted Concord medium armor. Exceptional quality.',
    stats: {
      defense: 39,
      mobility: 5
    },
    equipmentSlot: 'armor',
    value: 4400,
    weight: 13.8,
    factionId: 'concord',
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
  'armor_heavy_dominion_master': {
    id: 'armor_heavy_dominion_master',
    name: 'Dominion Master Heavy Armor',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.EPIC,
    description: 'Master-crafted Dominion heavy armor. The finest Dominion protection.',
    stats: {
      defense: 50,
      mobility: -3
    },
    equipmentSlot: 'armor',
    value: 5500,
    weight: 23.5,
    factionId: 'dominion_remnant',
    minReputationTier: 'trusted'
  },
  'armor_heavy_rebel_master': {
    id: 'armor_heavy_rebel_master',
    name: 'Rebel Master Heavy Armor',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.EPIC,
    description: 'Master-crafted Concord heavy armor. Exceptional quality.',
    stats: {
      defense: 49,
      mobility: -2
    },
    equipmentSlot: 'armor',
    value: 5400,
    weight: 23.0,
    factionId: 'concord',
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
    name: 'Veil-Enhanced Robes',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.LEGENDARY,
    description: 'Robes enhanced with the Veil. Ultimate Keeper protection.',
    stats: {
      defense: 32,
      mobility: 18,
      forcePower: 25
    },
    equipmentSlot: 'armor',
    value: 20000,
    weight: 4.5,
    factionId: 'keeper_seekers',
    minReputationTier: 'allied',
    specialEffects: ['veil_mastery', 'keeper_enhancement', 'legendary_armor']
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
    name: 'Veil-Enhanced Medium Armor',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.LEGENDARY,
    description: 'Medium armor enhanced with the Veil. Ultimate Keeper protection.',
    stats: {
      defense: 42,
      mobility: 12,
      forcePower: 20
    },
    equipmentSlot: 'armor',
    value: 25000,
    weight: 5.0,
    factionId: 'keeper_seekers',
    minReputationTier: 'allied',
    specialEffects: ['veil_mastery', 'keeper_enhancement', 'legendary_armor']
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
    description: 'Armor forged from pure beskar. The ultimate Ironkin protection.',
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
  'armor_ironkin_legendary': {
    id: 'armor_ironkin_legendary',
    name: 'Legendary Ironkin Armor',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.LEGENDARY,
    description: 'Legendary Ironkin armor. The pinnacle of Ironkin craftsmanship.',
    stats: {
      defense: 55,
      mobility: 3
    },
    equipmentSlot: 'armor',
    value: 35000,
    weight: 22.0,
    factionId: null,
    specialEffects: ['ironkin_craftsmanship', 'legendary_armor']
  },
  'armor_keeper_master': {
    id: 'armor_keeper_master',
    name: 'Keeper Master Robes',
    type: ITEM_TYPES.ARMOR,
    rarity: ITEM_RARITIES.LEGENDARY,
    description: 'Robes worn by Keeper Masters. Infused with the Veil.',
    stats: {
      defense: 30,
      mobility: 15,
      forcePower: 20
    },
    equipmentSlot: 'armor',
    value: 25000,
    weight: 4.0,
    factionId: 'keeper_seekers',
    minReputationTier: 'allied',
    specialEffects: ['veil_mastery', 'keeper_enhancement', 'legendary_armor']
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
  'regen_patch': {
    id: 'regen_patch',
    name: 'Regen Patch',
    type: ITEM_TYPES.CONSUMABLE,
    rarity: ITEM_RARITIES.RARE,
    description: 'A regen-infused patch. Instantly restores significant health.',
    stats: {
      healthRestore: 150,
      useSpeed: 'instant'
    },
    value: 700,
    weight: 0.4
  },
  
  // Medpacs - Epic Tier
  'regen_tank': {
    id: 'regen_tank',
    name: 'Regen Tank Treatment',
    type: ITEM_TYPES.CONSUMABLE,
    rarity: ITEM_RARITIES.EPIC,
    description: 'A full regen tank treatment. Completely restores health to maximum.',
    stats: {
      healthRestore: 999,
      useSpeed: 'instant',
      fullHeal: true
    },
    value: 3000,
    weight: 1.0
  },
  'hexol_injection': {
    id: 'hexol_injection',
    name: 'Hexol Injection',
    type: ITEM_TYPES.CONSUMABLE,
    rarity: ITEM_RARITIES.EPIC,
    description: 'A powerful hexol injection. Restores massive amounts of health.',
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
  // Salvage & creature materials dropped by enemies. Defined so looted drops
  // (and the tutorial's "sell droid parts" beat) show a real name/value at vendors
  // instead of falling back to a generic value-10 "Unknown item".
  'droid_parts': {
    id: 'droid_parts',
    name: 'Droid Parts',
    type: ITEM_TYPES.RESOURCE,
    rarity: ITEM_RARITIES.COMMON,
    description: 'Salvaged servos, actuators, and circuitry from a disassembled droid. A staple of any scrapper\'s trade.',
    value: 30,
    weight: 2.0,
    stackSize: 50
  },
  'animal_parts': {
    id: 'animal_parts',
    name: 'Animal Parts',
    type: ITEM_TYPES.RESOURCE,
    rarity: ITEM_RARITIES.COMMON,
    description: 'Assorted parts harvested from a wild creature. Sells to vendors and crafters.',
    value: 12,
    weight: 1.0,
    stackSize: 100
  },
  'hide': {
    id: 'hide',
    name: 'Beast Hide',
    type: ITEM_TYPES.RESOURCE,
    rarity: ITEM_RARITIES.COMMON,
    description: 'Tough hide stripped from a wild beast. Used in leatherworking and crude armor.',
    value: 15,
    weight: 1.5,
    stackSize: 100
  },
  'claws': {
    id: 'claws',
    name: 'Beast Claws',
    type: ITEM_TYPES.RESOURCE,
    rarity: ITEM_RARITIES.COMMON,
    description: 'Sharp claws taken from a predator. A modest trophy and a crafting material.',
    value: 18,
    weight: 0.5,
    stackSize: 100
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
  'datapad_keeper': {
    id: 'datapad_keeper',
    name: 'Keeper Datapad',
    type: ITEM_TYPES.ACCESSORY,
    rarity: ITEM_RARITIES.RARE,
    description: 'A datapad enhanced with Veil-touched technology. Improves Veil perception.',
    stats: {
      intelligence: 8,
      forcePower: 3
    },
    equipmentSlot: 'accessory',
    value: 1000,
    weight: 0.6,
    factionId: 'keeper_seekers',
    minReputationTier: 'friendly',
    specialEffects: ['veil_insight']
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
    name: 'Veil Scanner',
    type: ITEM_TYPES.ACCESSORY,
    rarity: ITEM_RARITIES.RARE,
    description: 'A scanner enhanced with Veil-touched technology. Detects Veil signatures.',
    stats: {
      perception: 8,
      forcePower: 2
    },
    equipmentSlot: 'accessory',
    value: 1200,
    weight: 0.6,
    factionId: 'keeper_seekers',
    minReputationTier: 'friendly',
    specialEffects: ['veil_detection']
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
  'regen_applicator': {
    id: 'regen_applicator',
    name: 'Regen Applicator',
    type: ITEM_TYPES.ACCESSORY,
    rarity: ITEM_RARITIES.RARE,
    description: 'A specialized tool for applying regen treatments. Enables instant healing.',
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
  
  // ========== PHASE 1 QUEST ITEMS - SYTHA ==========
  'ryll_spice_sample': {
    id: 'ryll_spice_sample',
    name: 'Ryll Spice Sample',
    type: ITEM_TYPES.QUEST_ITEM,
    rarity: ITEM_RARITIES.COMMON,
    description: 'A sample of Ryll spice from Sytha mines. Evidence in the Compound 7-Alpha investigation.',
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
    description: 'Custom pulser taken from syndicate leader. High damage, unique appearance.',
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
    description: 'Intelligence about Corporate Sector operations on Sytha.',
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
    factionId: 'drift_cartel',
    minReputationTier: 'friendly'
  },
  'dominion_commendation': {
    id: 'dominion_commendation',
    name: 'Dominion Commendation',
    type: ITEM_TYPES.ACCESSORY,
    rarity: ITEM_RARITIES.RARE,
    description: 'Commendation for service to the Dominion Remnant. Provides accuracy and defense bonuses.',
    stats: {
      accuracy: 3,
      defense: 2
    },
    equipmentSlot: 'accessory',
    value: 800,
    weight: 0.1,
    factionId: 'dominion_remnant',
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
  'sytheen_artifact': {
    id: 'sytheen_artifact',
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
  
  // ========== PHASE 1 QUEST ITEMS - GRAVENMOOR ==========
  'wyrm_report': {
    id: 'wyrm_report',
    name: 'Dune Wyrm Sighting Report',
    type: ITEM_TYPES.QUEST_ITEM,
    rarity: ITEM_RARITIES.COMMON,
    description: 'Report of recent wyrm dragon sightings in the Sunder Wastes.',
    value: 0,
    weight: 0.1,
    stackSize: 1
  },
  'dragon_scale': {
    id: 'dragon_scale',
    name: 'Dragon Scale Fragment',
    type: ITEM_TYPES.QUEST_ITEM,
    rarity: ITEM_RARITIES.RARE,
    description: 'Fragment from a wyrm dragon, proves encounter. Can be used in crafting.',
    value: 300,
    weight: 0.5,
    stackSize: 5
  },
  'wyrm_pearl': {
    id: 'wyrm_pearl',
    name: 'Dune Wyrm Pearl',
    type: ITEM_TYPES.ACCESSORY,
    rarity: ITEM_RARITIES.LEGENDARY,
    description: 'Legendary pearl from a wyrm dragon, extremely valuable. Possesses unique Veil properties.',
    stats: {
      forcePower: 20,
      damage: 10,
      specialEffects: ['veil_enhancement']
    },
    equipmentSlot: 'accessory',
    value: 10000,
    weight: 0.1,
    factionId: 'keeper_seekers',
    minReputationTier: 'friendly'
  },
  'dragon_bones': {
    id: 'dragon_bones',
    name: 'Dune Wyrm Bones',
    type: ITEM_TYPES.RESOURCE,
    rarity: ITEM_RARITIES.RARE,
    description: 'Bones from a wyrm dragon. Extremely valuable crafting material with unique properties.',
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
  'marn_datapad': {
    id: 'marn_datapad',
    name: 'Marn Family Datapad',
    type: ITEM_TYPES.QUEST_ITEM,
    rarity: ITEM_RARITIES.UNCOMMON,
    description: 'Datapad from Marn Homestead, contains Marn history.',
    value: 300,
    weight: 0.3,
    stackSize: 1
  },
  'vorr_treasure': {
    id: 'vorr_treasure',
    name: 'Vorr Treasure',
    type: ITEM_TYPES.QUEST_ITEM,
    rarity: ITEM_RARITIES.EPIC,
    description: 'Treasure recovered from Vorga\'s Palace. High value, can be sold or kept.',
    value: 5000,
    weight: 10.0,
    stackSize: 1
  },
  
  // ========== PHASE 1 QUEST ITEMS - CALDON ==========
  'ancient_map_fragment': {
    id: 'ancient_map_fragment',
    name: 'Ancient Map Fragment',
    type: ITEM_TYPES.QUEST_ITEM,
    rarity: ITEM_RARITIES.UNCOMMON,
    description: 'Fragment of ancient Keeper map leading to hidden temples.',
    value: 0,
    weight: 0.1,
    stackSize: 1
  },
  'holocron_fragment': {
    id: 'holocron_fragment',
    name: 'Keeper Holocron Fragment',
    type: ITEM_TYPES.QUEST_ITEM,
    rarity: ITEM_RARITIES.RARE,
    description: 'Fragment of ancient Keeper Holocron. Contains Veil knowledge.',
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
    description: 'Veil-touched crystals from Caldon. Used in arcblade construction and Veil enhancements.',
    value: 800,
    weight: 0.3,
    stackSize: 5
  },
  'keeper_teaching': {
    id: 'keeper_teaching',
    name: 'Ancient Keeper Teaching',
    type: ITEM_TYPES.QUEST_ITEM,
    rarity: ITEM_RARITIES.EPIC,
    description: 'Ancient Veil teaching received from Enclave. Unlocks permanent Veil ability.',
    value: 0,
    weight: 0,
    stackSize: 1,
    stats: {
      permanentAbility: 'veil_insight'
    }
  },
  'arcblade_crystal': {
    id: 'arcblade_crystal',
    name: 'Arcblade Crystal',
    type: ITEM_TYPES.QUEST_ITEM,
    rarity: ITEM_RARITIES.EPIC,
    description: 'Crystal for arcblade construction. Obtained through Woven Veil choices.',
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
  'dominion_report': {
    id: 'dominion_report',
    name: 'Dominion Activity Report',
    type: ITEM_TYPES.QUEST_ITEM,
    rarity: ITEM_RARITIES.UNCOMMON,
    description: 'Report of Dominion Remnant activity on Caldon.',
    value: 0,
    weight: 0.2,
    stackSize: 1
  },
  'nr_commendation': {
    id: 'nr_commendation',
    name: 'Concord Commendation',
    type: ITEM_TYPES.QUEST_ITEM,
    rarity: ITEM_RARITIES.RARE,
    description: 'Commendation for service to Concord. Provides reputation bonus.',
    value: 0,
    weight: 0.2,
    stackSize: 1,
    stats: {
      reputationBonus: 20
    },
    factionId: 'concord',
    minReputationTier: null
  },
  'venox_eggs': {
    id: 'venox_eggs',
    name: 'Venox Eggs',
    type: ITEM_TYPES.RESOURCE,
    rarity: ITEM_RARITIES.UNCOMMON,
    description: 'Eggs from venox creatures. Used in alchemy and crafting.',
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
  
  // ========== PHASE 1 QUEST ITEMS - CENTRALIS ==========
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
    name: 'Assembly Commendation',
    type: ITEM_TYPES.QUEST_ITEM,
    rarity: ITEM_RARITIES.RARE,
    description: 'Commendation from Assembly for exposing corruption. Provides reputation bonus.',
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
    description: 'Map fragment of Keeper Sanctum layout.',
    value: 0,
    weight: 0.1,
    stackSize: 1
  },
  'ancient_key': {
    id: 'ancient_key',
    name: 'Ancient Key',
    type: ITEM_TYPES.QUEST_ITEM,
    rarity: ITEM_RARITIES.RARE,
    description: 'Ancient key to artifact chamber in Keeper Sanctum.',
    value: 0,
    weight: 0.1,
    stackSize: 1
  },
  'keeper_artifact': {
    id: 'keeper_artifact',
    name: 'Keeper Artifact',
    type: ITEM_TYPES.ACCESSORY,
    rarity: ITEM_RARITIES.EPIC,
    description: 'Powerful artifact from Keeper Sanctum. Possesses significant Veil power.',
    value: 15000,
    weight: 1.0,
    stats: {
      forcePower: 30,
      intelligence: 5,
      charisma: 5
    },
    equipmentSlot: 'accessory',
    factionId: 'keeper_seekers',
    minReputationTier: 'allied',
    specialEffects: ['veil_mastery', 'veil_enhancement']
  },
  'artifact_power': {
    id: 'artifact_power',
    name: 'Artifact Power',
    type: ITEM_TYPES.QUEST_ITEM,
    rarity: ITEM_RARITIES.EPIC,
    description: 'Power gained from artifact. Unlocks permanent Veil ability.',
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
  // Sytha Resources
  'resource_ryll_spice': {
    id: 'resource_ryll_spice',
    name: 'Ryll Spice',
    type: ITEM_TYPES.RESOURCE,
    rarity: ITEM_RARITIES.UNCOMMON,
    description: 'A valuable spice native to Sytha, highly sought after in galactic trade. The primary export of the planet.',
    value: 150,
    weight: 0.5,
    stackSize: 100
  },
  'resource_doonium': {
    id: 'resource_doonium',
    name: 'Doonium',
    type: ITEM_TYPES.RESOURCE,
    rarity: ITEM_RARITIES.COMMON,
    description: 'A durable metal ore found in Sytha\'s mines. Used in ship construction and industrial applications.',
    value: 50,
    weight: 2.0,
    stackSize: 50
  },
  // Gravenmoor Resources
  'resource_wyrm_pearl': {
    id: 'resource_wyrm_pearl',
    name: 'Dune Wyrm Pearl',
    type: ITEM_TYPES.RESOURCE,
    rarity: ITEM_RARITIES.RARE,
    description: 'A rare and valuable pearl from a Dune Wyrm. Extremely valuable and sought after.',
    value: 5000,
    weight: 0.1,
    stackSize: 1
  },
  'resource_grazer_hide': {
    id: 'resource_grazer_hide',
    name: 'Grazer Hide',
    type: ITEM_TYPES.RESOURCE,
    rarity: ITEM_RARITIES.COMMON,
    description: 'Tough hide from a grazer. Used in crafting and leatherworking.',
    value: 30,
    weight: 1.5,
    stackSize: 20
  },
  'resource_dragon_bones': {
    id: 'resource_dragon_bones',
    name: 'Dragon Bones',
    type: ITEM_TYPES.RESOURCE,
    rarity: ITEM_RARITIES.UNCOMMON,
    description: 'Bones from a Dune Wyrm. Used in crafting and as decorative materials.',
    value: 200,
    weight: 3.0,
    stackSize: 10
  },
  // Caldon Resources
  'resource_dantari_crystals': {
    id: 'resource_dantari_crystals',
    name: 'Dantari Crystals',
    type: ITEM_TYPES.RESOURCE,
    rarity: ITEM_RARITIES.RARE,
    description: 'Veil-touched crystals found in the Venox Cave. Possess unique properties and are highly sought after by Keeper Seekers.',
    value: 800,
    weight: 0.3,
    stackSize: 5
  },
  'resource_venox_eggs': {
    id: 'resource_venox_eggs',
    name: 'Venox Eggs',
    type: ITEM_TYPES.RESOURCE,
    rarity: ITEM_RARITIES.UNCOMMON,
    description: 'Eggs from venox creatures. Used in alchemy and crafting, though dangerous to obtain.',
    value: 200,
    weight: 0.5,
    stackSize: 10
  },
  // Centralis Resources
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

// ===== Weapon range → world range =====================================================
// Weapons carry a `stats.range` on a data scale (blades 1–2, pistols ~30, rifles ~50,
// snipers 100–150). The realtime sim works in world units (melee ~2.8). These pure helpers
// classify a weapon and map its data range to a world distance so the sim can gate attacks
// by the equipped weapon instead of a hardcoded melee reach. RANGED_WORLD_MAX is kept at/below
// PlanetWorld's AGGRO_RADIUS (16) so a ranged target is actually streamed to the client.
const MELEE_DATA_MAX = 5;        // data range ≤ this → melee weapon
const MELEE_WORLD_RANGE = 2.8;   // world units a melee weapon reaches (unchanged from prior)
const RANGED_WORLD_BASE = 8;     // shortest ranged reach (just past the melee threshold)
const RANGED_WORLD_SCALE = 0.07; // world units gained per point of data range above the threshold
const RANGED_WORLD_MIN = 8;
const RANGED_WORLD_MAX = 15;

/** Numeric data range from either a full item def (`stats.range`) or a combatant weapon block
 *  (`range`). Returns null when unknown/unarmed. */
function weaponDataRange(weapon) {
  if (!weapon) return null;
  const r = weapon.stats ? weapon.stats.range : weapon.range;
  return Number.isFinite(r) ? r : null;
}

/** 'melee' | 'ranged' for a weapon (or unarmed → 'melee'). */
function weaponClass(weapon) {
  const r = weaponDataRange(weapon);
  return r !== null && r > MELEE_DATA_MAX ? 'ranged' : 'melee';
}

/** World-unit attack range for a weapon. Melee (or unarmed) → MELEE_WORLD_RANGE; ranged maps the
 *  data range onto [RANGED_WORLD_MIN, RANGED_WORLD_MAX]. Pure + deterministic. */
function weaponWorldRange(weapon) {
  const r = weaponDataRange(weapon);
  if (r === null || r <= MELEE_DATA_MAX) return MELEE_WORLD_RANGE;
  const scaled = RANGED_WORLD_BASE + (r - MELEE_DATA_MAX) * RANGED_WORLD_SCALE;
  return Math.min(RANGED_WORLD_MAX, Math.max(RANGED_WORLD_MIN, scaled));
}

module.exports = {
  ITEM_TYPES,
  ITEM_RARITIES,
  itemDefinitions,
  getItemDefinition,
  getAllItemDefinitions,
  getItemsByType,
  getItemsByRarity,
  weaponDataRange,
  weaponClass,
  weaponWorldRange,
  MELEE_WORLD_RANGE,
  RANGED_WORLD_MAX
};


