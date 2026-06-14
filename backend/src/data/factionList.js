/**
 * Faction List
 * Common factions for NPC assignment
 */

const factions = [
  'old_concord',
  'iron_dominion',
  'free_worlds',
  'concord',
  'ascendancy',
  'uprising',
  'keeper_order',
  'hollow',
  'ironkin',
  'vorr',
  'umbra',
  'scarlet_tide',
  'independent',
  'neutral',
  'smugglers',
  'the_tally',
  'commerce_league',
  'secession',
  'vorne_ascendancy',
  'hesperan_consortium'
];

/**
 * Get faction for NPC based on context
 */
function getFactionForNPC(planet, npcType, rnd) {
  // If planet has faction control, use it as primary
  if (planet.factionControl) {
    // 70% chance to match planet faction, 30% chance for other
    if (rnd() < 0.7) {
      return planet.factionControl;
    }
  }

  // Assign faction based on NPC type
  if (npcType === 'faction_leader') {
    // Faction leaders always match planet control or major factions
    return planet.factionControl || getMajorFaction(rnd);
  }

  if (npcType === 'vendor' || npcType === 'generic') {
    // Vendors and generic NPCs can be independent/neutral
    const independentChance = rnd();
    if (independentChance < 0.3) {
      return 'independent';
    } else if (independentChance < 0.5) {
      return 'neutral';
    }
  }

  if (npcType === 'quest_giver') {
    // Quest givers often align with major factions
    return getMajorFaction(rnd);
  }

  // Default: assign random faction
  return factions[Math.floor(rnd() * factions.length)];
}

/**
 * Get a major faction
 */
function getMajorFaction(rnd) {
  const majorFactions = [
    'old_concord',
    'iron_dominion',
    'free_worlds',
    'concord',
    'independent',
    'neutral'
  ];
  return majorFactions[Math.floor(rnd() * majorFactions.length)];
}

/**
 * Get faction display name
 */
function getFactionDisplayName(factionId) {
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
}

module.exports = {
  factions,
  getFactionForNPC,
  getFactionDisplayName
};


