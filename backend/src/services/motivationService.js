/**
 * Motivation Service
 * Handles NPC motivations, goals, needs, fears, and values
 * Phase 2: Motivation System
 */

class MotivationService {
  /**
   * Generate motivations for a new NPC
   * @param {Object} npcData - NPC data (species, occupation, faction, location)
   * @param {Function} randomFn - Optional seeded random function
   * @returns {Object} Motivation structure
   */
  generateMotivations(npcData = {}, randomFn = null) {
    const rnd = randomFn || (() => Math.random());
    
    const goalType = this.selectGoalType(npcData, rnd);
    
    return {
      primaryGoal: {
        type: goalType,
        description: this.generateGoalDescription(goalType, npcData),
        urgency: this.calculateUrgency(goalType, npcData, rnd)
      },
      immediateNeeds: this.generateImmediateNeeds(npcData, rnd),
      fears: this.generateFears(npcData, rnd),
      values: this.generateValues(npcData, rnd)
    };
  }

  /**
   * Select goal type based on NPC characteristics
   * @param {Object} npcData - NPC data
   * @param {Function} rnd - Random function
   * @returns {string} Goal type
   */
  selectGoalType(npcData, rnd) {
    const occupation = (npcData.occupation || '').toLowerCase();
    const npcType = (npcData.npcType || '').toLowerCase();
    const factionId = npcData.factionId;
    
    // Occupation-based goals
    if (occupation.includes('vendor') || occupation.includes('merchant') || occupation.includes('trader')) {
      return 'wealth';
    }
    if (occupation.includes('scholar') || occupation.includes('researcher') || occupation.includes('historian')) {
      return 'knowledge';
    }
    if (occupation.includes('guard') || occupation.includes('soldier') || occupation.includes('officer')) {
      return 'duty';
    }
    if (occupation.includes('smuggler') || occupation.includes('pirate') || occupation.includes('criminal')) {
      return 'survival';
    }
    if (occupation.includes('farmer') || occupation.includes('settler')) {
      return 'survival';
    }
    
    // NPC type-based goals
    if (npcType === 'quest_giver') {
      const goalTypes = ['duty', 'freedom', 'revenge', 'knowledge'];
      return goalTypes[Math.floor(rnd() * goalTypes.length)];
    }
    if (npcType === 'vendor') {
      return 'wealth';
    }
    if (npcType === 'faction_leader') {
      return 'power';
    }
    
    // Faction-based goals
    if (factionId === 'free_worlds' || factionId === 'uprising') {
      return rnd() > 0.5 ? 'freedom' : 'revenge';
    }
    if (factionId === 'iron_dominion' || factionId === 'ascendancy') {
      return rnd() > 0.5 ? 'power' : 'duty';
    }
    if (factionId === 'keeper_order') {
      return rnd() > 0.5 ? 'knowledge' : 'duty';
    }
    if (factionId === 'hollow') {
      return rnd() > 0.5 ? 'power' : 'revenge';
    }
    if (factionId === 'vorr' || factionId === 'vorr_cartel') {
      return 'wealth';
    }
    if (factionId === 'ironkin') {
      return rnd() > 0.5 ? 'duty' : 'honor';
    }
    
    // Default random
    const goalTypes = ['survival', 'wealth', 'knowledge', 'duty', 'freedom'];
    return goalTypes[Math.floor(rnd() * goalTypes.length)];
  }

  /**
   * Generate goal description
   * @param {string} goalType - Goal type
   * @param {Object} npcData - NPC data
   * @param {Function} rnd - Random function
   * @returns {string} Goal description
   */
  generateGoalDescription(goalType, npcData, rnd = null) {
    const r = rnd || (() => Math.random());
    const planetName = npcData.location?.planet || 'this planet';
    const area = npcData.location?.area || 'this area';
    
    const descriptions = {
      survival: [
        `Earn enough credits to leave ${planetName} and start a new life`,
        `Protect my family from the dangers on ${planetName}`,
        `Find a safe place to settle down away from ${planetName}`,
        `Survive the harsh conditions on ${planetName}`,
        `Escape the criminal elements controlling ${area}`
      ],
      wealth: [
        'Accumulate enough credits to start my own business',
        'Build a trading empire across the Outer Rim',
        'Pay off my debts and become financially independent',
        'Acquire rare artifacts and valuable goods',
        'Establish a profitable operation in this sector'
      ],
      knowledge: [
        'Learn more about the Veil and ancient Keeper teachings',
        'Discover the secrets of the Hollow and Torn Veil powers',
        'Study the history and cultures of the galaxy',
        'Uncover lost technologies and ancient artifacts',
        'Understand the true nature of the Veil'
      ],
      revenge: [
        'Find and confront those who wronged my family',
        'Seek justice for the crimes committed against my people',
        'Avenge the death of someone I cared about',
        'Bring down those who betrayed my trust',
        'Make those who harmed me pay for their actions'
      ],
      duty: [
        `Protect ${area} from threats and maintain order`,
        'Serve my faction with honor and loyalty',
        'Fulfill my responsibilities to my people',
        'Maintain peace and security in this region',
        'Carry out my mission with unwavering dedication'
      ],
      freedom: [
        'Help liberate this sector from Dominion control',
        'Fight for the freedom of oppressed peoples',
        'Break free from the chains of tyranny',
        'Support the cause of liberty and justice',
        'Resist authoritarian control and oppression'
      ],
      power: [
        'Rise through the ranks and gain influence',
        'Establish my authority and command respect',
        'Build a power base in this sector',
        'Control resources and expand my domain',
        'Become a force to be reckoned with'
      ],
      honor: [
        'Uphold the honor of my clan and traditions',
        'Prove myself worthy of Ironkin heritage',
        'Restore honor to my family name',
        'Live by the warrior code and ancient ways',
        'Earn respect through honorable actions'
      ]
    };
    
    const goalDescriptions = descriptions[goalType] || descriptions.survival;
    return goalDescriptions[Math.floor(r() * goalDescriptions.length)];
  }

  /**
   * Calculate goal urgency
   * @param {string} goalType - Goal type
   * @param {Object} npcData - NPC data
   * @param {Function} rnd - Random function
   * @returns {number} Urgency (0.0-1.0)
   */
  calculateUrgency(goalType, npcData, rnd) {
    // Base urgency varies significantly by goal type and random chance
    // Wider range: 0.2-0.9 for more diversity
    let urgency = 0.2 + (rnd() * 0.7); // 0.2-0.9 base range
    
    // Increase if location is dangerous
    if (npcData.location?.dangerLevel > 7) {
      urgency += 0.15;
    }
    
    // Increase for survival goals (more urgent)
    if (goalType === 'survival') {
      urgency += 0.1 + (rnd() * 0.1); // Additional 0.1-0.2
    }
    
    // Increase for revenge goals (very urgent)
    if (goalType === 'revenge') {
      urgency += 0.15 + (rnd() * 0.1); // Additional 0.15-0.25
    }
    
    // Decrease for knowledge goals (less urgent, but still variable)
    if (goalType === 'knowledge') {
      urgency -= 0.1 + (rnd() * 0.1); // Reduce by 0.1-0.2
    }
    
    // Decrease for wealth goals (can be long-term)
    if (goalType === 'wealth') {
      urgency -= 0.05 + (rnd() * 0.1); // Reduce by 0.05-0.15
    }
    
    // Additional random variation for more diversity
    urgency += (rnd() - 0.5) * 0.3; // ±0.15 variation
    
    return this.clamp(0.0, 1.0, urgency);
  }

  /**
   * Generate immediate needs
   * @param {Object} npcData - NPC data
   * @param {Function} rnd - Random function
   * @returns {Array} Immediate needs
   */
  generateImmediateNeeds(npcData, rnd) {
    const needs = [];
    const needTypes = ['food', 'safety', 'information', 'medical', 'credits', 'transport', 'supplies'];
    
    // Generate 1-3 immediate needs
    const count = Math.floor(rnd() * 3) + 1;
    const selected = [];
    
    for (let i = 0; i < count && selected.length < needTypes.length; i++) {
      const available = needTypes.filter(t => !selected.includes(t));
      if (available.length === 0) break;
      
      const needType = available[Math.floor(rnd() * available.length)];
      selected.push(needType);
      
      needs.push({
        type: needType,
        urgency: 0.5 + (rnd() * 0.4), // 0.5-0.9
        description: this.generateNeedDescription(needType, npcData, rnd)
      });
    }
    
    return needs;
  }

  /**
   * Generate need description
   * @param {string} needType - Need type
   * @param {Object} npcData - NPC data
   * @param {Function} rnd - Random function
   * @returns {string} Need description
   */
  generateNeedDescription(needType, npcData, rnd) {
    const planetName = npcData.location?.planet || 'this planet';
    const area = npcData.location?.area || 'this area';
    
    const descriptions = {
      food: [
        'Need to find food for my family',
        'Running low on supplies, need to restock',
        'Food shortage in the area, need to find sources',
        'Need to secure food before supplies run out'
      ],
      safety: [
        'Raiders spotted nearby, need protection',
        'This area is becoming too dangerous',
        'Need to find a safer location',
        'Threats are increasing, need security'
      ],
      information: [
        'Need to know if the spaceport is safe',
        'Looking for information about recent events',
        'Need intelligence about local factions',
        'Seeking news about the situation here'
      ],
      medical: [
        'Need medical supplies for injured friend',
        'Someone in my group needs medical attention',
        'Running low on medical supplies',
        'Need a medic or medical equipment'
      ],
      credits: [
        'Need credits to pay off debts',
        'Running low on funds, need income',
        'Need credits for essential supplies',
        'Financial situation is dire, need help'
      ],
      transport: [
        'Need transport off this planet',
        'Looking for a ship to leave this system',
        'Need to get to another location',
        'Transportation is critical right now'
      ],
      supplies: [
        'Need essential supplies for survival',
        'Running low on critical resources',
        'Need to restock basic necessities',
        'Supplies are running dangerously low'
      ]
    };
    
    const needDescriptions = descriptions[needType] || ['Need assistance'];
    return needDescriptions[Math.floor(rnd() * needDescriptions.length)];
  }

  /**
   * Generate fears
   * @param {Object} npcData - NPC data
   * @param {Function} rnd - Random function
   * @returns {Array} Fears
   */
  generateFears(npcData, rnd) {
    const allFears = [
      'dominion_discovery',
      'losing_family',
      'starvation',
      'being_betrayed',
      'faction_attack',
      'slavery',
      'death',
      'isolation',
      'poverty',
      'violence',
      'disease',
      'capture'
    ];
    
    // Faction-specific fears
    if (npcData.factionId === 'free_worlds' || npcData.factionId === 'uprising') {
      allFears.push('dominion_capture', 'torture', 'execution');
    }
    if (npcData.factionId === 'iron_dominion' || npcData.factionId === 'ascendancy') {
      allFears.push('rebellion', 'insubordination', 'failure');
    }
    
    // Select 2-4 fears
    const count = Math.floor(rnd() * 3) + 2;
    const selected = [];
    const available = [...allFears];
    
    for (let i = 0; i < count && available.length > 0; i++) {
      const index = Math.floor(rnd() * available.length);
      selected.push(available.splice(index, 1)[0]);
    }
    
    return selected;
  }

  /**
   * Generate values
   * @param {Object} npcData - NPC data
   * @param {Function} rnd - Random function
   * @returns {Array} Values with importance
   */
  generateValues(npcData, rnd) {
    const allValues = [
      { name: 'family', importance: 0.9 },
      { name: 'freedom', importance: 0.8 },
      { name: 'honesty', importance: 0.6 },
      { name: 'wealth', importance: 0.3 },
      { name: 'loyalty', importance: 0.7 },
      { name: 'justice', importance: 0.8 },
      { name: 'survival', importance: 0.9 },
      { name: 'honor', importance: 0.7 },
      { name: 'tradition', importance: 0.6 },
      { name: 'knowledge', importance: 0.5 },
      { name: 'power', importance: 0.4 },
      { name: 'peace', importance: 0.7 }
    ];
    
    // Faction-specific values
    if (npcData.factionId === 'free_worlds' || npcData.factionId === 'uprising') {
      allValues.push({ name: 'uprising', importance: 0.9 });
      allValues.push({ name: 'hope', importance: 0.8 });
    }
    if (npcData.factionId === 'iron_dominion' || npcData.factionId === 'ascendancy') {
      allValues.push({ name: 'order', importance: 0.9 });
      allValues.push({ name: 'discipline', importance: 0.8 });
    }
    if (npcData.factionId === 'keeper_order') {
      allValues.push({ name: 'balance', importance: 0.9 });
      allValues.push({ name: 'wisdom', importance: 0.8 });
    }
    if (npcData.factionId === 'hollow') {
      allValues.push({ name: 'passion', importance: 0.9 });
      allValues.push({ name: 'strength', importance: 0.8 });
    }
    if (npcData.factionId === 'ironkin') {
      allValues.push({ name: 'honor', importance: 0.95 });
      allValues.push({ name: 'strength', importance: 0.8 });
    }
    
    // Select 3-5 values
    const count = Math.floor(rnd() * 3) + 3;
    const selected = [];
    const available = [...allValues];
    
    for (let i = 0; i < count && available.length > 0; i++) {
      const index = Math.floor(rnd() * available.length);
      selected.push(available.splice(index, 1)[0]);
    }
    
    // Sort by importance
    return selected.sort((a, b) => b.importance - a.importance);
  }

  /**
   * Build motivation prompt for AI
   * @param {Object} npc - NPC instance
   * @returns {string} Motivation prompt
   */
  buildMotivationPrompt(npc) {
    const motivations = npc.motivations || {};
    const goal = motivations.primaryGoal;
    
    if (!goal) return '';
    
    let prompt = `\n\nYOUR PRIMARY MOTIVATION:\n`;
    prompt += `- Goal: ${goal.description}\n`;
    
    // Urgency description
    if (goal.urgency > 0.7) {
      prompt += `- This is EXTREMELY URGENT. You're actively seeking help.\n`;
    } else if (goal.urgency > 0.4) {
      prompt += `- This is moderately important to you.\n`;
    } else {
      prompt += `- This is a long-term goal, not immediately pressing.\n`;
    }
    
    // Add immediate needs (only urgent ones)
    const urgentNeeds = motivations.immediateNeeds?.filter(n => n.urgency > 0.6) || [];
    if (urgentNeeds.length > 0) {
      prompt += `\nIMMEDIATE CONCERNS:\n`;
      urgentNeeds.slice(0, 3).forEach(need => {
        prompt += `- ${need.description}\n`;
      });
    }
    
    // Add fears (top 3)
    if (motivations.fears && motivations.fears.length > 0) {
      prompt += `\nYOU ARE AFRAID OF:\n`;
      motivations.fears.slice(0, 3).forEach(fear => {
        prompt += `- ${fear.replace(/_/g, ' ')}\n`;
      });
    }
    
    // Add top values (top 3)
    const topValues = motivations.values?.slice(0, 3) || [];
    if (topValues.length > 0) {
      prompt += `\nYOUR CORE VALUES:\n`;
      topValues.forEach(value => {
        prompt += `- ${value.name} (very important to you)\n`;
      });
    }
    
    // Hint at quest opportunity
    if (goal.urgency > 0.6 || urgentNeeds.length > 0) {
      prompt += `\n- You're looking for help. If the player seems willing and trustworthy, you might ask for assistance.\n`;
    }
    
    return prompt;
  }

  /**
   * Get motivation summary for dialogue
   * @param {Object} npc - NPC instance
   * @returns {string} Motivation summary
   */
  getMotivationSummary(npc) {
    const motivations = npc.motivations || {};
    const goal = motivations.primaryGoal;
    
    if (!goal) return '';
    
    const urgencyDesc = goal.urgency > 0.7 ? 'urgently' : goal.urgency > 0.4 ? 'actively' : 'eventually';
    return `${urgencyDesc} seeking to ${goal.description.toLowerCase()}`;
  }

  /**
   * Check if NPC has urgent need
   * @param {Object} npc - NPC instance
   * @returns {boolean} True if has urgent need
   */
  hasUrgentNeed(npc) {
    const motivations = npc.motivations || {};
    const needs = motivations.immediateNeeds || [];
    return needs.some(need => need.urgency > 0.8);
  }

  /**
   * Get urgent needs
   * @param {Object} npc - NPC instance
   * @returns {Array} Urgent needs
   */
  getUrgentNeeds(npc) {
    const motivations = npc.motivations || {};
    const needs = motivations.immediateNeeds || [];
    return needs.filter(need => need.urgency > 0.6).sort((a, b) => b.urgency - a.urgency);
  }

  /**
   * Clamp value between min and max
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @param {number} value - Value to clamp
   * @returns {number} Clamped value
   */
  clamp(min, max, value) {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * Get default motivation structure
   * @returns {Object} Default motivations
   */
  getDefaultMotivations() {
    return {
      primaryGoal: {
        type: 'survival',
        description: 'Survive and provide for my family',
        urgency: 0.5
      },
      immediateNeeds: [],
      fears: [],
      values: []
    };
  }
}

module.exports = new MotivationService();

