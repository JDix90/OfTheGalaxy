/**
 * NPC Templates
 * Defines NPC generation templates for different contexts
 */

/**
 * Seeded random number generator
 */
function seededRandom(seed) {
  let value = seed;
  return function() {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}

/**
 * Get seed from string
 */
function getSeed(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash) || 12345;
}

/**
 * Planet-based NPC templates
 */
const planetTemplates = {
  desert: {
    species: ['human', 'skritcher', 'dune_nomad_raider', 'skarn'],
    speciesWeights: [0.4, 0.3, 0.2, 0.1],
    npcTypes: ['vendor', 'quest_giver', 'generic'],
    npcTypeWeights: [0.3, 0.2, 0.5],
    occupations: ['moisture_farmer', 'trader', 'scavenger', 'smuggler', 'settler'],
    minNPCs: 5,
    maxNPCs: 15
  },
  jungle: {
    species: ['human', 'ursk', 'brindle', 'skrag'],
    speciesWeights: [0.4, 0.2, 0.2, 0.2],
    npcTypes: ['quest_giver', 'companion', 'generic', 'vendor'],
    npcTypeWeights: [0.3, 0.1, 0.4, 0.2],
    occupations: ['hunter', 'guide', 'settler', 'scout', 'trader'],
    minNPCs: 8,
    maxNPCs: 20
  },
  urban: {
    species: ['human', 'sytheen', 'karnaki', 'renai', 'jeharu'],
    speciesWeights: [0.5, 0.15, 0.1, 0.1, 0.15],
    npcTypes: ['vendor', 'quest_giver', 'generic', 'faction_leader'],
    npcTypeWeights: [0.3, 0.25, 0.4, 0.05],
    occupations: ['merchant', 'official', 'guard', 'citizen', 'diplomat', 'trader'],
    minNPCs: 15,
    maxNPCs: 50
  },
  ocean: {
    species: ['human', 'sennari', 'dovrek', 'marrow'],
    speciesWeights: [0.3, 0.3, 0.2, 0.2],
    npcTypes: ['vendor', 'quest_giver', 'generic'],
    npcTypeWeights: [0.3, 0.2, 0.5],
    occupations: ['fisher', 'trader', 'explorer', 'settler'],
    minNPCs: 5,
    maxNPCs: 15
  },
  volcanic: {
    species: ['human', 'karnaki', 'dell'],
    speciesWeights: [0.5, 0.3, 0.2],
    npcTypes: ['vendor', 'generic', 'quest_giver'],
    npcTypeWeights: [0.2, 0.6, 0.2],
    occupations: ['miner', 'trader', 'settler'],
    minNPCs: 3,
    maxNPCs: 10
  },
  ice: {
    species: ['human', 'ursk', 'ridgeback_herder'],
    speciesWeights: [0.6, 0.2, 0.2],
    npcTypes: ['vendor', 'quest_giver', 'generic'],
    npcTypeWeights: [0.3, 0.2, 0.5],
    occupations: ['researcher', 'trader', 'settler'],
    minNPCs: 3,
    maxNPCs: 10
  },
  barren: {
    species: ['human', 'skritcher', 'dune_nomad_raider'],
    speciesWeights: [0.4, 0.3, 0.3],
    npcTypes: ['vendor', 'generic', 'quest_giver'],
    npcTypeWeights: [0.2, 0.6, 0.2],
    occupations: ['scavenger', 'trader', 'settler'],
    minNPCs: 2,
    maxNPCs: 8
  },
  terrestrial: {
    species: ['human', 'sytheen', 'karnaki', 'renai'],
    speciesWeights: [0.5, 0.2, 0.15, 0.15],
    npcTypes: ['vendor', 'quest_giver', 'generic', 'companion'],
    npcTypeWeights: [0.25, 0.25, 0.4, 0.1],
    occupations: ['farmer', 'trader', 'settler', 'guard', 'citizen'],
    minNPCs: 8,
    maxNPCs: 25
  },
  gas_giant: {
    species: ['human', 'dell'],
    speciesWeights: [0.7, 0.3],
    npcTypes: ['vendor', 'generic'],
    npcTypeWeights: [0.3, 0.7],
    occupations: ['researcher', 'trader'],
    minNPCs: 2,
    maxNPCs: 5
  }
};

/**
 * Sub-map based NPC templates
 */
const subMapTemplates = {
  city: {
    npcTypes: ['vendor', 'quest_giver', 'generic'],
    npcTypeWeights: [0.3, 0.2, 0.5],
    spawnDistribution: {
      vendor: 0.3,
      quest_giver: 0.2,
      generic: 0.5
    },
    minNPCs: 5,
    maxNPCs: 15
  },
  spaceport: {
    npcTypes: ['vendor', 'quest_giver', 'generic'],
    npcTypeWeights: [0.4, 0.3, 0.3],
    spawnDistribution: {
      vendor: 0.4,
      quest_giver: 0.3,
      generic: 0.3
    },
    minNPCs: 3,
    maxNPCs: 10
  },
  market: {
    npcTypes: ['vendor', 'generic'],
    npcTypeWeights: [0.7, 0.3],
    spawnDistribution: {
      vendor: 0.7,
      generic: 0.3
    },
    minNPCs: 7, // Minimum: 4 category vendors + 3 faction vendors
    maxNPCs: 15
  },
  cantina: {
    npcTypes: ['quest_giver', 'companion', 'generic', 'vendor'],
    npcTypeWeights: [0.4, 0.2, 0.3, 0.1],
    spawnDistribution: {
      quest_giver: 0.4,
      companion: 0.2,
      generic: 0.3,
      vendor: 0.1
    },
    minNPCs: 3,
    maxNPCs: 8
  },
  palace: {
    npcTypes: ['faction_leader', 'quest_giver', 'generic'],
    npcTypeWeights: [0.1, 0.3, 0.6],
    spawnDistribution: {
      faction_leader: 0.1,
      quest_giver: 0.3,
      generic: 0.6
    },
    minNPCs: 5,
    maxNPCs: 15
  },
  residential: {
    npcTypes: ['generic', 'quest_giver'],
    npcTypeWeights: [0.8, 0.2],
    spawnDistribution: {
      generic: 0.8,
      quest_giver: 0.2
    },
    minNPCs: 2,
    maxNPCs: 6
  },
  commercial: {
    npcTypes: ['vendor', 'generic'],
    npcTypeWeights: [0.6, 0.4],
    spawnDistribution: {
      vendor: 0.6,
      generic: 0.4
    },
    minNPCs: 3,
    maxNPCs: 8
  },
  medical_center: {
    npcTypes: ['vendor', 'generic'],
    npcTypeWeights: [0.5, 0.5],
    spawnDistribution: {
      vendor: 0.5,
      generic: 0.5
    },
    minNPCs: 3,
    maxNPCs: 8
  },
  hospital: {
    npcTypes: ['vendor', 'generic'],
    npcTypeWeights: [0.5, 0.5],
    spawnDistribution: {
      vendor: 0.5,
      generic: 0.5
    },
    minNPCs: 3,
    maxNPCs: 8
  }
};

/**
 * Name generators by species
 */
const pick = (arr, rnd) => arr[Math.floor(rnd() * arr.length)];

const nameGenerators = {
  human: (rnd) => {
    const firstNames = ['Kael', 'Renn', 'Soren', 'Mira', 'Dax', 'Tovan', 'Elin', 'Cass', 'Bram', 'Nyla', 'Jor', 'Vesa', 'Theo', 'Marek', 'Sela', 'Orin', 'Tamsin', 'Roen', 'Lira', 'Cael'];
    const lastNames = ['Marn', 'Vance', 'Holt', 'Dray', 'Voss', 'Karr', 'Senne', 'Tarn', 'Reyes', 'Calder', 'Brenn', 'Adair', 'Mero', 'Locke', 'Faye'];
    return `${pick(firstNames, rnd)} ${pick(lastNames, rnd)}`;
  },
  skritcher: (rnd) => {
    const prefixes = ['Jek', 'Tek', 'Rek', 'Mek', 'Nek', 'Kek'];
    const suffixes = ['-Tik', '-Tak', '-Tuk', '-Rek', '-Vik', '-Zuk'];
    return `${pick(prefixes, rnd)}${pick(suffixes, rnd)}`;
  },
  dune_nomad_raider: (rnd) => {
    const names = ['Vharn', 'Rok-Tann', 'Kessa', 'Tharn', "Ssk'rah", 'Vurek'];
    return pick(names, rnd);
  },
  ursk: (rnd) => {
    const names = ['Grawl', 'Mohrrak', 'Brundwa', 'Korrtak', 'Throgg', 'Wulvane'];
    return pick(names, rnd);
  },
  brindle: (rnd) => {
    const names = ['Pip', 'Tobble', 'Nim', 'Brisk', 'Tully', 'Fenn'];
    return pick(names, rnd);
  },
  sytheen: (rnd) => {
    const names = ['Aeryn', 'Sora', 'Vael', 'Lysa', 'Niri', 'Tael'];
    return pick(names, rnd);
  },
  karnaki: (rnd) => {
    const names = ['Korr', 'Vahn', 'Draggo', 'Skahl', 'Tervek', 'Morrn'];
    return pick(names, rnd);
  },
  skarn: (rnd) => {
    const names = ['Sresh', 'Vossk', 'Neeza', 'Greezl', 'Raskk'];
    return pick(names, rnd);
  },
  vorne: (rnd) => {
    const names = ['Vex', 'Sorath', 'Nuvar', 'Iress', 'Kaeril', 'Threll'];
    return pick(names, rnd);
  },
  sethari: (rnd) => {
    const names = ['Shaa', 'Resh', 'Sekka', 'Vurl', 'Tessan', 'Orla'];
    return pick(names, rnd);
  },
  sennari: (rnd) => {
    const names = ['Maren', 'Selka', 'Dorin', 'Lumeen', 'Vasha'];
    return pick(names, rnd);
  },
  dovrek: (rnd) => {
    const names = ['Quell', 'Sevak', 'Tharessa', 'Vorlun', 'Dree'];
    return pick(names, rnd);
  },
  marrow: (rnd) => {
    const names = ['Jabo', 'Tull', 'Nessa', 'Brullo', 'Pann', 'Roon'];
    return pick(names, rnd);
  },
  renai: (rnd) => {
    const names = ['Velya', 'Konn', 'Mell', 'Drax', 'Sann'];
    return pick(names, rnd);
  },
  dell: (rnd) => {
    const names = ['Nevin', 'Brunn', 'Lassa', 'Corrin', 'Denn'];
    return pick(names, rnd);
  },
  skrag: (rnd) => {
    const names = ['Krassk', 'Vorgan', 'Dratt', 'Sesska', 'Hurokk'];
    return pick(names, rnd);
  },
  jeharu: (rnd) => {
    const names = ['Vela', 'Saru', 'Mirin', 'Ossa', 'Tann'];
    return pick(names, rnd);
  },
  generic: (rnd) => {
    // Fallback for unknown species
    const names = ['Citizen', 'Local', 'Resident', 'Settler', 'Trader'];
    const numbers = Math.floor(rnd() * 999) + 1;
    return `${pick(names, rnd)} ${numbers}`;
  }
};

/**
 * Get weighted random choice
 */
function weightedRandom(choices, weights, rnd) {
  const total = weights.reduce((sum, w) => sum + w, 0);
  let random = rnd() * total;
  
  for (let i = 0; i < choices.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      return choices[i];
    }
  }
  
  return choices[choices.length - 1];
}

/**
 * Get NPC template for planet
 */
function getPlanetTemplate(planet) {
  const planetType = planet.planetType || 'terrestrial';
  return planetTemplates[planetType] || planetTemplates.terrestrial;
}

/**
 * Get NPC template for sub-map
 */
function getSubMapTemplate(subMapType) {
  // Handle sub-map type variations (e.g., 'city_district' -> 'city')
  const normalizedType = subMapType.includes('city') ? 'city' :
                         subMapType.includes('spaceport') ? 'spaceport' :
                         subMapType.includes('market') ? 'market' :
                         subMapType.includes('cantina') ? 'cantina' :
                         subMapType.includes('palace') ? 'palace' :
                         subMapType.includes('residential') ? 'residential' :
                         subMapType.includes('commercial') ? 'commercial' :
                         subMapType;
  
  return subMapTemplates[normalizedType] || subMapTemplates.city;
}

/**
 * Generate NPC name
 */
function generateName(species, seed) {
  const rnd = seededRandom(seed);
  const generator = nameGenerators[species] || nameGenerators.generic;
  return generator(rnd);
}

/**
 * Generate dialogue for NPC
 */
function generateDialogue(npcType, species, occupation, rnd) {
  const greetings = {
    stranger: [
      "Hello there.",
      "Can I help you?",
      "What do you want?",
      "Greetings, traveler.",
      "Hello, stranger."
    ],
    acquaintance: [
      "Oh, hello again.",
      "Good to see you.",
      "Back again?",
      "Welcome back."
    ],
    friend: [
      "Good to see you, friend!",
      "Welcome, friend!",
      "Hey there!",
      "Always good to see you."
    ],
    confidant: [
      "My trusted friend, welcome!",
      "You're always welcome here.",
      "It's great to see you again!",
      "Welcome, my dear friend."
    ]
  };

  const general = [
    `I'm a ${occupation} here.`,
    `This place has its challenges.`,
    `Be careful out there.`,
    `May the Veil be with you.`
  ];

  return {
    greeting: {
      stranger: greetings.stranger[Math.floor(rnd() * greetings.stranger.length)],
      acquaintance: greetings.acquaintance[Math.floor(rnd() * greetings.acquaintance.length)],
      friend: greetings.friend[Math.floor(rnd() * greetings.friend.length)],
      confidant: greetings.confidant[Math.floor(rnd() * greetings.confidant.length)]
    },
    questRelated: {},
    general: [general[Math.floor(rnd() * general.length)]]
  };
}

/**
 * Generate personality traits
 */
function generatePersonalityTraits(npcType, rnd) {
  const base = {
    empathy: 50,
    formality: 50,
    humor: 50,
    trust: 50
  };

  // Adjust based on NPC type
  if (npcType === 'vendor') {
    base.empathy = 40 + Math.floor(rnd() * 30);
    base.formality = 30 + Math.floor(rnd() * 40);
    base.trust = 30 + Math.floor(rnd() * 40);
  } else if (npcType === 'quest_giver') {
    base.empathy = 50 + Math.floor(rnd() * 30);
    base.formality = 40 + Math.floor(rnd() * 30);
    base.trust = 40 + Math.floor(rnd() * 30);
  } else if (npcType === 'companion') {
    base.empathy = 60 + Math.floor(rnd() * 30);
    base.formality = 30 + Math.floor(rnd() * 30);
    base.trust = 50 + Math.floor(rnd() * 30);
  }

  return base;
}

module.exports = {
  planetTemplates,
  subMapTemplates,
  nameGenerators,
  getPlanetTemplate,
  getSubMapTemplate,
  generateName,
  generateDialogue,
  generatePersonalityTraits,
  weightedRandom,
  seededRandom,
  getSeed
};

