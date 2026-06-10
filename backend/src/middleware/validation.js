/**
 * Validation Middleware
 * Request validation using express-validator
 */

const { body, param, query, validationResult } = require('express-validator');

/**
 * Handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
        value: err.value
      }))
    });
  }
  
  next();
};

/**
 * Character creation validation
 */
const validateCharacterCreation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z0-9\s'-]+$/)
    .withMessage('Name can only contain letters, numbers, spaces, hyphens, and apostrophes'),
  
  body('species')
    .isIn(['human', 'twilek', 'rodian', 'wookiee', 'zabrak', 'togruta', 'mirialan', 'chiss'])
    .withMessage('Invalid species'),
  
  body('background')
    .isIn(['smuggler', 'scholar', 'soldier', 'medic', 'engineer', 'diplomat', 'pilot'])
    .withMessage('Invalid background'),
  
  body('stats')
    .isObject()
    .withMessage('Stats must be an object'),
  
  body('stats.strength')
    .isInt({ min: 5, max: 20 })
    .withMessage('Strength must be between 5 and 20'),
  
  body('stats.agility')
    .isInt({ min: 5, max: 20 })
    .withMessage('Agility must be between 5 and 20'),
  
  body('stats.intelligence')
    .isInt({ min: 5, max: 20 })
    .withMessage('Intelligence must be between 5 and 20'),
  
  body('stats.charisma')
    .isInt({ min: 5, max: 20 })
    .withMessage('Charisma must be between 5 and 20'),
  
  body('stats.perception')
    .isInt({ min: 5, max: 20 })
    .withMessage('Perception must be between 5 and 20'),
  
  body('stats.endurance')
    .isInt({ min: 5, max: 20 })
    .withMessage('Endurance must be between 5 and 20'),
  
  handleValidationErrors
];

/**
 * XP addition validation
 */
const validateAddXP = [
  body('amount')
    .isInt({ min: 1, max: 10000 })
    .withMessage('XP amount must be between 1 and 10000'),
  
  body('source')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Source must be a string with max 100 characters'),
  
  handleValidationErrors
];

/**
 * Skill allocation validation
 */
const validateSkillAllocation = [
  body('tree')
    .isIn(['combat', 'stealth', 'diplomacy', 'technical', 'survival'])
    .withMessage('Invalid skill tree'),
  
  body('skillId')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Skill ID is required'),
  
  handleValidationErrors
];

/**
 * Attribute allocation validation
 */
const validateAttributeAllocation = [
  body('attribute')
    .isIn(['strength', 'agility', 'intelligence', 'charisma', 'perception', 'endurance'])
    .withMessage('Invalid attribute'),
  
  handleValidationErrors
];

/**
 * Location update validation
 */
const validateLocationUpdate = [
  body('planet')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Planet is required'),
  
  body('location')
    .optional()
    .isObject()
    .withMessage('Location must be an object'),
  
  handleValidationErrors
];

/**
 * Quest start validation
 */
const validateQuestStart = [
  body('characterId')
    .isUUID()
    .withMessage('Invalid character ID'),
  
  body('questId')
    .isUUID()
    .withMessage('Invalid quest ID'),
  
  handleValidationErrors
];

/**
 * Quest objective update validation
 */
const validateObjectiveUpdate = [
  body('characterId')
    .isUUID()
    .withMessage('Invalid character ID'),
  
  body('questId')
    .isUUID()
    .withMessage('Invalid quest ID'),
  
  body('objectiveId')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Objective ID is required'),
  
  body('completed')
    .optional()
    .isBoolean()
    .withMessage('Completed must be a boolean'),
  
  body('progress')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Progress must be between 0 and 100'),
  
  handleValidationErrors
];

/**
 * NPC dialogue validation
 */
const validateDialogue = [
  body('characterId')
    .isUUID()
    .withMessage('Invalid character ID'),
  
  body('message')
    .isString()
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Message must be between 1 and 1000 characters'),
  
  handleValidationErrors
];

/**
 * UUID parameter validation
 */
const validateUUIDParam = (paramName = 'id') => [
  param(paramName)
    .isUUID()
    .withMessage(`Invalid ${paramName}`),
  
  handleValidationErrors
];

module.exports = {
  validateCharacterCreation,
  validateAddXP,
  validateSkillAllocation,
  validateAttributeAllocation,
  validateLocationUpdate,
  validateQuestStart,
  validateObjectiveUpdate,
  validateDialogue,
  validateUUIDParam,
  handleValidationErrors
};
