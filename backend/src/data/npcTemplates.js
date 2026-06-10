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
    species: ['human', 'jawa', 'tusken_raider', 'rodian'],
    speciesWeights: [0.4, 0.3, 0.2, 0.1],
    npcTypes: ['vendor', 'quest_giver', 'generic'],
    npcTypeWeights: [0.3, 0.2, 0.5],
    occupations: ['moisture_farmer', 'trader', 'scavenger', 'smuggler', 'settler'],
    minNPCs: 5,
    maxNPCs: 15
  },
  jungle: {
    species: ['human', 'wookiee', 'ewok', 'trandoshan'],
    speciesWeights: [0.4, 0.2, 0.2, 0.2],
    npcTypes: ['quest_giver', 'companion', 'generic', 'vendor'],
    npcTypeWeights: [0.3, 0.1, 0.4, 0.2],
    occupations: ['hunter', 'guide', 'settler', 'scout', 'trader'],
    minNPCs: 8,
    maxNPCs: 20
  },
  urban: {
    species: ['human', 'twilek', 'zabrak', 'bothan', 'mirialan'],
    speciesWeights: [0.5, 0.15, 0.1, 0.1, 0.15],
    npcTypes: ['vendor', 'quest_giver', 'generic', 'faction_leader'],
    npcTypeWeights: [0.3, 0.25, 0.4, 0.05],
    occupations: ['merchant', 'official', 'guard', 'citizen', 'diplomat', 'trader'],
    minNPCs: 15,
    maxNPCs: 50
  },
  ocean: {
    species: ['human', 'mon_calamari', 'quarren', 'gungan'],
    speciesWeights: [0.3, 0.3, 0.2, 0.2],
    npcTypes: ['vendor', 'quest_giver', 'generic'],
    npcTypeWeights: [0.3, 0.2, 0.5],
    occupations: ['fisher', 'trader', 'explorer', 'settler'],
    minNPCs: 5,
    maxNPCs: 15
  },
  volcanic: {
    species: ['human', 'zabrak', 'sullustan'],
    speciesWeights: [0.5, 0.3, 0.2],
    npcTypes: ['vendor', 'generic', 'quest_giver'],
    npcTypeWeights: [0.2, 0.6, 0.2],
    occupations: ['miner', 'trader', 'settler'],
    minNPCs: 3,
    maxNPCs: 10
  },
  ice: {
    species: ['human', 'wookiee', 'tauntaun_herder'],
    speciesWeights: [0.6, 0.2, 0.2],
    npcTypes: ['vendor', 'quest_giver', 'generic'],
    npcTypeWeights: [0.3, 0.2, 0.5],
    occupations: ['researcher', 'trader', 'settler'],
    minNPCs: 3,
    maxNPCs: 10
  },
  barren: {
    species: ['human', 'jawa', 'tusken_raider'],
    speciesWeights: [0.4, 0.3, 0.3],
    npcTypes: ['vendor', 'generic', 'quest_giver'],
    npcTypeWeights: [0.2, 0.6, 0.2],
    occupations: ['scavenger', 'trader', 'settler'],
    minNPCs: 2,
    maxNPCs: 8
  },
  terrestrial: {
    species: ['human', 'twilek', 'zabrak', 'bothan'],
    speciesWeights: [0.5, 0.2, 0.15, 0.15],
    npcTypes: ['vendor', 'quest_giver', 'generic', 'companion'],
    npcTypeWeights: [0.25, 0.25, 0.4, 0.1],
    occupations: ['farmer', 'trader', 'settler', 'guard', 'citizen'],
    minNPCs: 8,
    maxNPCs: 25
  },
  gas_giant: {
    species: ['human', 'sullustan'],
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
const nameGenerators = {
  human: (rnd) => {
    const firstNames = ['Owen', 'Beru', 'Luke', 'Leia', 'Han', 'Lando', 'Wedge', 'Biggs', 'Jek', 'Porkins', 'Derek', 'Carlist', 'Mon', 'Bail', 'Padme', 'Anakin', 'Obi-Wan', 'Qui-Gon', 'Mace', 'Yoda'];
    const lastNames = ['Lars', 'Organa', 'Solo', 'Calrissian', 'Antilles', 'Tarkin', 'Mothma', 'Rieekan', 'Skywalker', 'Kenobi', 'Jinn', 'Windu', 'Fett', 'Dameron', 'Rey'];
    return `${firstNames[Math.floor(rnd() * firstNames.length)]} ${lastNames[Math.floor(rnd() * lastNames.length)]}`;
  },
  jawa: (rnd) => {
    const prefixes = ['Jek', 'Tek', 'Rek', 'Mek', 'Nek', 'Kek'];
    const suffixes = ['-Tik', '-Tak', '-Tuk', '-Tik', '-Tuk', '-Tik'];
    return `${prefixes[Math.floor(rnd() * prefixes.length)]}${suffixes[Math.floor(rnd() * suffixes.length)]}`;
  },
  tusken_raider: (rnd) => {
    const names = ['A\'Sharad', 'Krayt', 'Bantha', 'Sand', 'Dune', 'Krayt'];
    return names[Math.floor(rnd() * names.length)];
  },
  wookiee: (rnd) => {
    const names = ['Chewbacca', 'Tarfful', 'Lumpawaroo', 'Attichitcuk', 'Mallatobuck', 'Ralrracheen'];
    return names[Math.floor(rnd() * names.length)];
  },
  ewok: (rnd) => {
    const names = ['Wicket', 'Teebo', 'Logray', 'Chirpa', 'Kneesaa', 'Paploo'];
    return names[Math.floor(rnd() * names.length)];
  },
  twilek: (rnd) => {
    const names = ['Aayla', 'Bib', 'Cham', 'Hera', 'Orn', 'Ryl'];
    return names[Math.floor(rnd() * names.length)];
  },
  zabrak: (rnd) => {
    const names = ['Darth', 'Maul', 'Eeth', 'Koth', 'Savage', 'Feral'];
    return names[Math.floor(rnd() * names.length)];
  },
  rodian: (rnd) => {
    const names = ['Greedo', 'Navik', 'Neela', 'Wald', 'Reegesk'];
    return names[Math.floor(rnd() * names.length)];
  },
  mon_calamari: (rnd) => {
    const names = ['Ackbar', 'Tarpals', 'Tikkes', 'Meena', 'Lee-Char'];
    return names[Math.floor(rnd() * names.length)];
  },
  quarren: (rnd) => {
    const names = ['Tikkes', 'Dac', 'Quarren', 'Mon', 'Calamari'];
    return names[Math.floor(rnd() * names.length)];
  },
  gungan: (rnd) => {
    const names = ['Jar', 'Jar', 'Binks', 'Boss', 'Nass', 'Roos', 'Tarpals'];
    return names[Math.floor(rnd() * names.length)];
  },
  bothan: (rnd) => {
    const names = ['Borsk', 'Fey\'lya', 'Koth', 'Mel', 'Koth'];
    return names[Math.floor(rnd() * names.length)];
  },
  sullustan: (rnd) => {
    const names = ['Nien', 'Nunb', 'Lando', 'Calrissian', 'Dengar'];
    return names[Math.floor(rnd() * names.length)];
  },
  trandoshan: (rnd) => {
    const names = ['Bossk', 'Cradossk', 'Dengar', 'Zuckuss'];
    return names[Math.floor(rnd() * names.length)];
  },
  mirialan: (rnd) => {
    const names = ['Luminara', 'Unduli', 'Barriss', 'Offee'];
    return names[Math.floor(rnd() * names.length)];
  },
  generic: (rnd) => {
    // Fallback for unknown species
    const names = ['Citizen', 'Local', 'Resident', 'Settler', 'Trader'];
    const numbers = Math.floor(rnd() * 999) + 1;
    return `${names[Math.floor(rnd() * names.length)]} ${numbers}`;
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
    `May the Force be with you.`
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

