/**
 * Faction List
 * Common Star Wars factions for NPC assignment
 */

const factions = [
  'galactic_republic',
  'galactic_empire',
  'rebel_alliance',
  'new_republic',
  'first_order',
  'resistance',
  'jedi_order',
  'sith',
  'mandalorians',
  'hutts',
  'black_sun',
  'crimson_dawn',
  'independent',
  'neutral',
  'smugglers',
  'bounty_hunters',
  'trade_federation',
  'separatists',
  'chiss_ascendancy',
  'hapes_consortium'
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
    'galactic_republic',
    'galactic_empire',
    'rebel_alliance',
    'new_republic',
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
    'galactic_republic': 'Galactic Republic',
    'galactic_empire': 'Galactic Empire',
    'rebel_alliance': 'Rebel Alliance',
    'new_republic': 'New Republic',
    'first_order': 'First Order',
    'resistance': 'Resistance',
    'jedi_order': 'Jedi Order',
    'sith': 'Sith',
    'mandalorians': 'Mandalorians',
    'hutts': 'Hutts',
    'black_sun': 'Black Sun',
    'crimson_dawn': 'Crimson Dawn',
    'independent': 'Independent',
    'neutral': 'Neutral',
    'smugglers': 'Smugglers',
    'bounty_hunters': 'Bounty Hunters',
    'trade_federation': 'Trade Federation',
    'separatists': 'Separatists',
    'chiss_ascendancy': 'Chiss Ascendancy',
    'hapes_consortium': 'Hapes Consortium'
  };

  return displayNames[factionId] || factionId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

module.exports = {
  factions,
  getFactionForNPC,
  getFactionDisplayName
};


