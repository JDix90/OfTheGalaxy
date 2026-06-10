/**
 * PlayerCharacter Model
 * Stores player character data including stats, level, skills, and location
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PlayerCharacter = sequelize.define('PlayerCharacter', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
      references: {
        model: 'users',
        key: 'id'
      }
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        len: [2, 100]
      }
    },
    species: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        isIn: [['human', 'twilek', 'rodian', 'wookiee', 'zabrak', 'togruta', 'mirialan', 'chiss']]
      }
    },
    background: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        isIn: [['smuggler', 'scholar', 'soldier', 'medic', 'engineer', 'diplomat', 'pilot']]
      }
    },
    level: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      validate: {
        min: 1,
        max: 50
      }
    },
    xp: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    skillPoints: {
      type: DataTypes.INTEGER,
      defaultValue: 5,
      field: 'skill_points',
      validate: {
        min: 0
      }
    },
    attributePoints: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'attribute_points',
      validate: {
        min: 0
      }
    },
    // Core stats
    stats: {
      type: DataTypes.JSONB,
      defaultValue: {
        strength: 10,
        agility: 10,
        intelligence: 10,
        charisma: 10,
        perception: 10,
        endurance: 10
      },
      validate: {
        isValidStats(value) {
          const requiredStats = ['strength', 'agility', 'intelligence', 'charisma', 'perception', 'endurance'];
          for (const stat of requiredStats) {
            if (!value[stat] || value[stat] < 1 || value[stat] > 100) {
              throw new Error(`Invalid stat value for ${stat}`);
            }
          }
        }
      }
    },
    // Skill trees
    skills: {
      type: DataTypes.JSONB,
      defaultValue: {
        combat: {},
        stealth: {},
        diplomacy: {},
        technical: {},
        survival: {}
      }
    },
    // Current location
    currentPlanet: {
      type: DataTypes.STRING(100),
      defaultValue: 'chandrila',
      field: 'current_planet'
    },
    currentLocation: {
      type: DataTypes.JSONB,
      defaultValue: {
        x: 0,
        y: 0,
        area: 'landing_zone'
      },
      field: 'current_location'
    },
    // Appearance customization
    appearance: {
      type: DataTypes.JSONB,
      defaultValue: {}
    },
    // Credits (currency)
    credits: {
      type: DataTypes.INTEGER,
      defaultValue: 1000,
      validate: {
        min: 0
      }
    },
    // Health and stamina
    currentHealth: {
      type: DataTypes.INTEGER,
      defaultValue: 100,
      field: 'current_health'
    },
    maxHealth: {
      type: DataTypes.INTEGER,
      defaultValue: 100,
      field: 'max_health'
    },
    currentStamina: {
      type: DataTypes.INTEGER,
      defaultValue: 100,
      field: 'current_stamina'
    },
    maxStamina: {
      type: DataTypes.INTEGER,
      defaultValue: 100,
      field: 'max_stamina'
    },
    // Unlocked abilities (from items)
    abilities: {
      type: DataTypes.JSONB,
      defaultValue: []
    }
  }, {
    tableName: 'player_characters',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['user_id']
      },
      {
        fields: ['level']
      }
    ]
  });

  // Instance methods
  PlayerCharacter.prototype.getXPForNextLevel = function() {
    return Math.floor(100 * Math.pow(this.level, 1.5));
  };

  PlayerCharacter.prototype.canLevelUp = function() {
    return this.xp >= this.getXPForNextLevel();
  };

  /**
   * Calculate max stamina based on Endurance, level, and skill bonuses
   * Formula: 100 + (endurance - 10) * 5 + (level - 1) * 5 + skillBonuses
   * This ensures level 1 with endurance 10 = 100 stamina
   */
  PlayerCharacter.prototype.getMaxStamina = function() {
    const endurance = this.stats?.endurance || 10;
    const baseMax = 100 + ((endurance - 10) * 5) + ((this.level - 1) * 5);
    
    // Add skill bonuses
    const { ProgressionSystem } = require('../utils/progressionSystem');
    const progressionSystem = new ProgressionSystem(this);
    const passiveBonuses = progressionSystem.getPassiveBonuses();
    const skillBonus = passiveBonuses.other?.maxStamina || 0;
    
    return baseMax + skillBonus;
  };

  /**
   * Recalculate max stamina (useful when Endurance changes)
   * Maintains current stamina percentage if max increases
   */
  PlayerCharacter.prototype.recalculateMaxStamina = function() {
    const newMax = this.getMaxStamina();
    const oldMax = this.maxStamina;
    this.maxStamina = newMax;
    
    // If current stamina exceeds new max, cap it
    if (this.currentStamina > newMax) {
      this.currentStamina = newMax;
    }
    
    // If max increased, maintain percentage
    if (newMax > oldMax && oldMax > 0) {
      const staminaPercent = this.currentStamina / oldMax;
      this.currentStamina = Math.floor(newMax * staminaPercent);
    }
    
    return this.maxStamina;
  };

  PlayerCharacter.prototype.addXP = async function(amount, options = {}) {
    this.xp += amount;
    const leveledUp = [];
    
    while (this.canLevelUp()) {
      this.xp -= this.getXPForNextLevel();
      this.level += 1;
      this.skillPoints += 1;
      
      // Award attribute points every 3 levels (updated from Phase 1)
      if (this.level % 3 === 0) {
        this.attributePoints += 2;
      }
      
      // Award specialization points every 5 levels
      if (this.level % 5 === 0 && this.specializationPoints !== undefined) {
        this.specializationPoints = (this.specializationPoints || 0) + 1;
      }
      
      // Update max health and stamina using calculated values
      // Formula: 100 base + (endurance - 10) * scaling + (level - 1) * 5
      // This ensures level 1 with endurance 10 = 100 health/stamina
      const endurance = this.stats?.endurance || 10;
      this.maxHealth = 100 + ((endurance - 10) * 10) + ((this.level - 1) * 5);
      this.maxStamina = this.getMaxStamina();
      
      // Restore to new maximums
      this.currentHealth = this.maxHealth;
      this.currentStamina = this.maxStamina;
      
      leveledUp.push(this.level);
    }

    await this.save({ transaction: options.transaction });
    return leveledUp;
  };

  PlayerCharacter.prototype.getCarryWeight = function() {
    return 50 + (this.stats.strength * 5);
  };

  return PlayerCharacter;
};
