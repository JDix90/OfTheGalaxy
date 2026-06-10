/**
 * Derived Stats Utility
 * Calculates derived stats from centralized formulas
 */

const derivedStatsDefs = require('../data/derivedStats.json');
const { ProgressionSystem } = require('./progressionSystem');
const { applyDR: applyDRFromModule, calculateLogistic: calculateLogisticFromModule } = require('./diminishingReturns');

/**
 * Evaluate a formula with given variables
 * @param {string} formula - Formula string
 * @param {Object} variables - Variable values
 * @returns {number} Calculated value
 */
function evaluateFormula(formula, variables) {
  // Replace variables with values
  let evaluated = formula;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\b${key}\\b`, 'g');
    evaluated = evaluated.replace(regex, value);
  }
  
  // Evaluate (safe eval with only math operations)
  try {
    // Use Function constructor for safer evaluation
    return Function('"use strict"; return (' + evaluated + ')')();
  } catch (error) {
    console.error('Formula evaluation error:', error, 'Formula:', formula, 'Variables:', variables);
    return 0;
  }
}

// Use DR function from diminishingReturns module
const applyDR = applyDRFromModule;

/**
 * Calculate logistic success function
 * @param {number} raw - Raw value (skill + attribute - difficulty)
 * @param {number} k - Curve steepness (default 0.35)
 * @returns {number} Success chance (0-1)
 */
function calculateLogistic(raw, k = 0.35) {
  const logistic = 1 / (1 + Math.exp(-k * raw));
  return Math.max(0.1, Math.min(0.95, logistic));
}

/**
 * Calculate a derived stat
 * @param {string} category - Stat category (combat, stealth, technical)
 * @param {string} statName - Stat name (attackRating, defenseRating, etc.)
 * @param {Object} context - Context with character, equipment, skills, difficulty
 * @returns {Object} {value: number, breakdown: Object, description: string, formula: string}
 */
function calculateDerivedStat(category, statName, context) {
  const statDef = derivedStatsDefs[category]?.[statName];
  if (!statDef) {
    throw new Error(`Derived stat not found: ${category}.${statName}`);
  }
  
  const { character, equipment = {}, skills = {}, difficulty = 0 } = context;
  const stats = character.stats || {};
  
  // Build variables object
  const variables = {};
  const breakdown = {};
  
  // Process components
  for (const component of statDef.components || []) {
    let value = 0;
    
    if (component.source === 'attribute') {
      value = stats[component.name] || 10;
    } else if (component.source === 'skill') {
      value = skills[component.name] || 0;
    } else if (component.source === 'equipment') {
      value = equipment[component.name] || 0;
    } else if (component.source === 'context') {
      value = difficulty;
    } else if (component.source === 'calculated') {
      // Handle calculated values (baseAttack, baseDefense, etc.)
      // These should be passed in equipment object
      if (component.name === 'baseAttack') {
        value = equipment.baseAttack || 0;
      } else if (component.name === 'baseDefense') {
        value = equipment.baseDefense || 0;
      } else {
        value = 0;
      }
    } else if (component.value !== undefined) {
      value = component.value;
    }
    
    variables[component.name] = value;
    breakdown[component.name] = {
      value,
      description: component.description,
      source: component.source
    };
  }
  
  // Calculate value
  let calculatedValue = 0;
  
  if (statDef.usesDR) {
    // Extract raw value from formula (before DR)
    const rawValue = evaluateFormula(statDef.formula, variables);
    const drParams = statDef.drParams;
    calculatedValue = applyDR(rawValue, drParams.cap, drParams.threshold, drParams.power);
  } else if (statDef.usesLogistic) {
    // Extract raw value from formula (before logistic)
    const rawValue = evaluateFormula(statDef.formula, variables);
    const k = statDef.logisticParams.k || 0.35;
    calculatedValue = calculateLogistic(rawValue, k);
  } else {
    // Regular formula
    calculatedValue = evaluateFormula(statDef.formula, variables);
  }
  
  return {
    value: calculatedValue,
    breakdown,
    description: statDef.description,
    formula: statDef.formula
  };
}

/**
 * Calculate all combat derived stats
 * @param {Object} context - Context with character, equipment
 * @returns {Object} All combat stats with breakdowns
 */
function calculateCombatStats(context) {
  const { character, equipment = {} } = context;
  const stats = character.stats || {};
  
  // Calculate base stats from attributes (matching combatService logic)
  const baseAttack = Math.floor((stats.strength || 10) / 2) + Math.floor((stats.agility || 10) / 4);
  const baseDefense = Math.floor((stats.endurance || 10) / 2);
  
  // Get skill levels
  const progressionSystem = new ProgressionSystem(character);
  
  const skillLevels = {
    advWeapons: progressionSystem.getSkillLevel('combat', 'advanced_weapons'),
    tacticalAwareness: progressionSystem.getSkillLevel('combat', 'tactical_awareness'),
    basicCombat: progressionSystem.getSkillLevel('combat', 'basic_combat')
  };
  
  // Get passive bonuses for crit chance (from skills)
  const passiveBonuses = progressionSystem.getPassiveBonuses();
  const skillCritBonus = (passiveBonuses.combat.critChance || 0) / 100; // Convert to decimal
  
  // Build context with skills and calculated values
  const combatContext = {
    ...context,
    equipment: {
      ...equipment,
      baseAttack, // Add calculated baseAttack
      baseDefense // Add calculated baseDefense
    },
    skills: {
      ...skillLevels,
      // Add crit bonus from other sources if needed
      critBonus: skillCritBonus
    }
  };
  
  // Calculate individual stats
  const attackRating = calculateDerivedStat('combat', 'attackRating', combatContext);
  const defenseRating = calculateDerivedStat('combat', 'defenseRating', combatContext);
  
  // For crit chance, we need to handle the skill bonus separately
  // since it comes from passive bonuses, not skill level
  const critContext = {
    ...combatContext,
    skills: {
      advWeapons: skillLevels.advWeapons
    }
  };
  let critChance = calculateDerivedStat('combat', 'critChance', critContext);
  
  // Add skill crit bonus from passive bonuses (if any from other skills)
  if (skillCritBonus > 0) {
    // Recalculate with skill bonus added to raw value
    const rawCrit = critChance.breakdown.base.value + 
                    (critChance.breakdown.perception.value - 10) * 0.01 + 
                    critChance.breakdown.advWeapons.value * 0.01 + 
                    skillCritBonus;
    const drParams = derivedStatsDefs.combat.critChance.drParams;
    critChance.value = applyDR(rawCrit, drParams.cap, drParams.threshold, drParams.power);
    
    // Update breakdown
    critChance.breakdown.skillBonus = {
      value: skillCritBonus,
      description: "Additional crit bonus from skills",
      source: "skill"
    };
  }
  
  // Calculate dodge chance
  const dodgeChance = calculateDerivedStat('combat', 'dodgeChance', combatContext);
  
  return {
    attackRating,
    defenseRating,
    critChance,
    dodgeChance
  };
}

/**
 * Calculate stealth power
 * @param {Object} context - Context with character
 * @returns {Object} Stealth power with breakdown
 */
function calculateStealthPower(context) {
  const { character } = context;
  const progressionSystem = new ProgressionSystem(character);
  
  const skillLevels = {
    basicStealth: progressionSystem.getSkillLevel('stealth', 'basic_stealth')
  };
  
  const stealthContext = {
    ...context,
    skills: skillLevels
  };
  
  return calculateDerivedStat('stealth', 'stealthPower', stealthContext);
}

/**
 * Calculate tech success chance
 * @param {Object} context - Context with character, difficulty
 * @returns {Object} Tech success chance with breakdown
 */
function calculateTechSuccess(context) {
  const { character, difficulty = 0 } = context;
  const progressionSystem = new ProgressionSystem(character);
  
  const skillLevels = {
    hacking: progressionSystem.getSkillLevel('technical', 'hacking')
  };
  
  const techContext = {
    ...context,
    skills: skillLevels,
    difficulty
  };
  
  return calculateDerivedStat('technical', 'techSuccess', techContext);
}

/**
 * Get stat definition for UI display
 * @param {string} category - Stat category
 * @param {string} statName - Stat name
 * @returns {Object|null} Stat definition or null
 */
function getStatDefinition(category, statName) {
  return derivedStatsDefs[category]?.[statName] || null;
}

module.exports = {
  calculateDerivedStat,
  calculateCombatStats,
  calculateStealthPower,
  calculateTechSuccess,
  getStatDefinition,
  applyDR,
  calculateLogistic
};

