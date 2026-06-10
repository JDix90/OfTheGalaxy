/**
 * Faction Personality Profiles
 * Defines personality traits, rhetoric, and dialogue styles for each faction
 * Phase 1: Faction-Driven Dialogue
 */

const factionProfiles = {
  galactic_republic: {
    name: 'Galactic Republic',
    personality: {
      authorityRespect: 85,
      agreeableness: 70,
      conscientiousness: 80,
      riskTolerance: 40,
      directness: 65,
      forceAlignment: 60
    },
    rhetoric: {
      commonPhrases: [
        'for the greater good',
        'democracy and freedom',
        'the will of the people',
        'justice and order',
        'republican values'
      ],
      formalAddress: true,
      respectTitles: true,
      emphasizeUnity: true
    },
    dialogueStyle: {
      formality: 'high',
      tone: 'diplomatic',
      topics: ['politics', 'law', 'democracy', 'justice', 'order']
    },
    relationshipModifiers: {
      neutral: { trustBonus: 0, suspicionLevel: 0.3 },
      friendly: { trustBonus: 10, suspicionLevel: 0.1 },
      hostile: { trustBonus: -20, suspicionLevel: 0.8 }
    }
  },

  galactic_empire: {
    name: 'Galactic Empire',
    personality: {
      authorityRespect: 95,
      agreeableness: 30,
      conscientiousness: 85,
      riskTolerance: 60,
      directness: 80,
      forceAlignment: 40
    },
    rhetoric: {
      commonPhrases: [
        'order and security',
        'imperial might',
        'the Emperor\'s will',
        'strength through unity',
        'peace through power'
      ],
      formalAddress: true,
      respectTitles: true,
      emphasizeStrength: true
    },
    dialogueStyle: {
      formality: 'very_high',
      tone: 'authoritarian',
      topics: ['order', 'discipline', 'loyalty', 'strength', 'control']
    },
    relationshipModifiers: {
      neutral: { trustBonus: -10, suspicionLevel: 0.5 },
      friendly: { trustBonus: 5, suspicionLevel: 0.3 },
      hostile: { trustBonus: -30, suspicionLevel: 0.9 }
    }
  },

  rebel_alliance: {
    name: 'Rebel Alliance',
    personality: {
      authorityRespect: 20,
      agreeableness: 75,
      conscientiousness: 70,
      riskTolerance: 80,
      directness: 75,
      forceAlignment: 65
    },
    rhetoric: {
      commonPhrases: [
        'freedom fighters',
        'hope and resistance',
        'against tyranny',
        'the people\'s cause',
        'liberty or death'
      ],
      formalAddress: false,
      respectTitles: false,
      emphasizeFreedom: true
    },
    dialogueStyle: {
      formality: 'low',
      tone: 'passionate',
      topics: ['freedom', 'resistance', 'hope', 'justice', 'rebellion']
    },
    relationshipModifiers: {
      neutral: { trustBonus: 5, suspicionLevel: 0.4 },
      friendly: { trustBonus: 15, suspicionLevel: 0.2 },
      hostile: { trustBonus: -15, suspicionLevel: 0.7 }
    }
  },

  new_republic: {
    name: 'New Republic',
    personality: {
      authorityRespect: 70,
      agreeableness: 75,
      conscientiousness: 75,
      riskTolerance: 50,
      directness: 70,
      forceAlignment: 70
    },
    rhetoric: {
      commonPhrases: [
        'new era of peace',
        'democratic values',
        'lessons learned',
        'unity and cooperation',
        'hope for the future'
      ],
      formalAddress: true,
      respectTitles: true,
      emphasizeProgress: true
    },
    dialogueStyle: {
      formality: 'medium',
      tone: 'optimistic',
      topics: ['peace', 'democracy', 'reconstruction', 'hope', 'unity']
    },
    relationshipModifiers: {
      neutral: { trustBonus: 5, suspicionLevel: 0.2 },
      friendly: { trustBonus: 15, suspicionLevel: 0.1 },
      hostile: { trustBonus: -10, suspicionLevel: 0.6 }
    }
  },

  jedi_order: {
    name: 'Jedi Order',
    personality: {
      authorityRespect: 60,
      agreeableness: 80,
      conscientiousness: 85,
      riskTolerance: 45,
      directness: 60,
      forceAlignment: 95
    },
    rhetoric: {
      commonPhrases: [
        'may the Force be with you',
        'peace and knowledge',
        'the will of the Force',
        'wisdom and patience',
        'balance in all things'
      ],
      formalAddress: true,
      respectTitles: true,
      emphasizeWisdom: true
    },
    dialogueStyle: {
      formality: 'high',
      tone: 'wise',
      topics: ['the Force', 'wisdom', 'peace', 'balance', 'knowledge']
    },
    relationshipModifiers: {
      neutral: { trustBonus: 10, suspicionLevel: 0.2 },
      friendly: { trustBonus: 20, suspicionLevel: 0.1 },
      hostile: { trustBonus: -10, suspicionLevel: 0.5 }
    }
  },

  sith: {
    name: 'Sith',
    personality: {
      authorityRespect: 50,
      agreeableness: 20,
      conscientiousness: 70,
      riskTolerance: 85,
      directness: 90,
      forceAlignment: 95
    },
    rhetoric: {
      commonPhrases: [
        'power through passion',
        'strength and dominance',
        'the dark side',
        'unlimited power',
        'peace is a lie'
      ],
      formalAddress: true,
      respectTitles: true,
      emphasizePower: true
    },
    dialogueStyle: {
      formality: 'high',
      tone: 'intimidating',
      topics: ['power', 'strength', 'dominance', 'the dark side', 'passion']
    },
    relationshipModifiers: {
      neutral: { trustBonus: -15, suspicionLevel: 0.6 },
      friendly: { trustBonus: -5, suspicionLevel: 0.4 },
      hostile: { trustBonus: -40, suspicionLevel: 0.95 }
    }
  },

  mandalorians: {
    name: 'Mandalorians',
    personality: {
      authorityRespect: 40,
      agreeableness: 50,
      conscientiousness: 80,
      riskTolerance: 75,
      directness: 85,
      forceAlignment: 30
    },
    rhetoric: {
      commonPhrases: [
        'this is the way',
        'honor and strength',
        'clan and family',
        'warrior\'s code',
        'mandalorian honor'
      ],
      formalAddress: false,
      respectTitles: false,
      emphasizeHonor: true
    },
    dialogueStyle: {
      formality: 'low',
      tone: 'direct',
      topics: ['honor', 'strength', 'clan', 'combat', 'tradition']
    },
    relationshipModifiers: {
      neutral: { trustBonus: 0, suspicionLevel: 0.3 },
      friendly: { trustBonus: 20, suspicionLevel: 0.1 },
      hostile: { trustBonus: -25, suspicionLevel: 0.8 }
    }
  },

  hutts: {
    name: 'Hutts',
    personality: {
      authorityRespect: 30,
      agreeableness: 20,
      conscientiousness: 40,
      riskTolerance: 70,
      directness: 60,
      forceAlignment: 20
    },
    rhetoric: {
      commonPhrases: [
        'profit and opportunity',
        'business is business',
        'credits talk',
        'mutually beneficial',
        'a deal is a deal'
      ],
      formalAddress: false,
      respectTitles: false,
      emphasizeProfit: true
    },
    dialogueStyle: {
      formality: 'low',
      tone: 'calculating',
      topics: ['credits', 'business', 'deals', 'profit', 'opportunity']
    },
    relationshipModifiers: {
      neutral: { trustBonus: -5, suspicionLevel: 0.5 },
      friendly: { trustBonus: 0, suspicionLevel: 0.4 },
      hostile: { trustBonus: -20, suspicionLevel: 0.7 }
    }
  },

  smugglers: {
    name: 'Smugglers',
    personality: {
      authorityRespect: 10,
      agreeableness: 45,
      conscientiousness: 50,
      riskTolerance: 90,
      directness: 70,
      forceAlignment: 30
    },
    rhetoric: {
      commonPhrases: [
        'fast credits',
        'no questions asked',
        'mutual benefit',
        'trust is earned',
        'keep it simple'
      ],
      formalAddress: false,
      respectTitles: false,
      emphasizePragmatism: true
    },
    dialogueStyle: {
      formality: 'very_low',
      tone: 'casual',
      topics: ['credits', 'jobs', 'opportunities', 'risks', 'deals']
    },
    relationshipModifiers: {
      neutral: { trustBonus: 0, suspicionLevel: 0.4 },
      friendly: { trustBonus: 10, suspicionLevel: 0.2 },
      hostile: { trustBonus: -15, suspicionLevel: 0.7 }
    }
  },

  bounty_hunters: {
    name: 'Bounty Hunters',
    personality: {
      authorityRespect: 25,
      agreeableness: 30,
      conscientiousness: 70,
      riskTolerance: 85,
      directness: 90,
      forceAlignment: 25
    },
    rhetoric: {
      commonPhrases: [
        'credits are credits',
        'job is a job',
        'no personal feelings',
        'professional standards',
        'target acquired'
      ],
      formalAddress: false,
      respectTitles: false,
      emphasizeProfessionalism: true
    },
    dialogueStyle: {
      formality: 'low',
      tone: 'businesslike',
      topics: ['bounties', 'targets', 'credits', 'jobs', 'reputation']
    },
    relationshipModifiers: {
      neutral: { trustBonus: -5, suspicionLevel: 0.5 },
      friendly: { trustBonus: 5, suspicionLevel: 0.3 },
      hostile: { trustBonus: -20, suspicionLevel: 0.8 }
    }
  },

  neutral: {
    name: 'Neutral',
    personality: {
      authorityRespect: 50,
      agreeableness: 50,
      conscientiousness: 50,
      riskTolerance: 50,
      directness: 50,
      forceAlignment: 50
    },
    rhetoric: {
      commonPhrases: [
        'live and let live',
        'neutral ground',
        'no sides taken',
        'peaceful coexistence',
        'mutual respect'
      ],
      formalAddress: false,
      respectTitles: false,
      emphasizeNeutrality: true
    },
    dialogueStyle: {
      formality: 'medium',
      tone: 'neutral',
      topics: ['peace', 'neutrality', 'coexistence', 'respect', 'balance']
    },
    relationshipModifiers: {
      neutral: { trustBonus: 0, suspicionLevel: 0.3 },
      friendly: { trustBonus: 10, suspicionLevel: 0.2 },
      hostile: { trustBonus: -10, suspicionLevel: 0.6 }
    }
  }
};

/**
 * Get faction profile by ID
 * @param {string} factionId - Faction identifier
 * @returns {Object|null} Faction profile or null
 */
function getFactionProfile(factionId) {
  if (!factionId) return null;
  return factionProfiles[factionId] || factionProfiles.neutral;
}

/**
 * Get faction personality modifiers
 * @param {string} factionId - Faction identifier
 * @returns {Object} Personality modifiers
 */
function getFactionPersonalityModifiers(factionId) {
  const profile = getFactionProfile(factionId);
  return profile ? profile.personality : {};
}

/**
 * Get faction rhetoric for dialogue
 * @param {string} factionId - Faction identifier
 * @returns {Object} Rhetoric information
 */
function getFactionRhetoric(factionId) {
  const profile = getFactionProfile(factionId);
  return profile ? profile.rhetoric : {};
}

/**
 * Get faction dialogue style
 * @param {string} factionId - Faction identifier
 * @returns {Object} Dialogue style
 */
function getFactionDialogueStyle(factionId) {
  const profile = getFactionProfile(factionId);
  return profile ? profile.dialogueStyle : {};
}

/**
 * Get relationship modifiers based on faction and reputation tier
 * @param {string} factionId - Faction identifier
 * @param {string} tier - Reputation tier (neutral, friendly, hostile, etc.)
 * @returns {Object} Modifiers
 */
function getRelationshipModifiers(factionId, tier) {
  const profile = getFactionProfile(factionId);
  if (!profile) return { trustBonus: 0, suspicionLevel: 0.3 };
  
  return profile.relationshipModifiers[tier] || profile.relationshipModifiers.neutral;
}

module.exports = {
  factionProfiles,
  getFactionProfile,
  getFactionPersonalityModifiers,
  getFactionRhetoric,
  getFactionDialogueStyle,
  getRelationshipModifiers
};








