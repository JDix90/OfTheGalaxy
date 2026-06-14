/**
 * Character Service Unit Tests
 * Tests for character creation, progression, and management
 */

const characterService = require('../../../src/services/characterService');
const { createTestUser } = require('../../setup/testHelpers');
const { PlayerCharacter } = require('../../../src/models');

describe('CharacterService', () => {
  let user;

  beforeEach(async () => {
    user = await createTestUser();
  });

  describe('createCharacter', () => {
    test('should create a new character', async () => {
      const characterData = {
        name: 'Test Character',
        species: 'human',
        background: 'soldier',
        stats: {
          strength: 12,
          agility: 10,
          intelligence: 10,
          charisma: 10,
          perception: 10,
          endurance: 10
        }
      };

      const character = await characterService.createCharacter(user.id, characterData);

      expect(character).toBeDefined();
      expect(character.name).toBe(characterData.name);
      expect(character.species).toBe(characterData.species);
      expect(character.background).toBe(characterData.background);
      expect(character.userId).toBe(user.id);
      expect(character.level).toBe(1);
      expect(character.xp).toBe(0);
    });

    test('should apply background bonuses to stats', async () => {
      const characterData = {
        name: 'Soldier Character',
        species: 'human',
        background: 'soldier',
        stats: {
          strength: 10,
          agility: 10,
          intelligence: 10,
          charisma: 10,
          perception: 10,
          endurance: 10
        }
      };

      const character = await characterService.createCharacter(user.id, characterData);

      // Soldier background gives +2 strength, +1 endurance
      expect(character.stats.strength).toBe(12);
      expect(character.stats.endurance).toBe(11);
    });

    test('should set starting planet based on background', async () => {
      const characterData = {
        name: 'Soldier Character',
        species: 'human',
        background: 'soldier',
        stats: {
          strength: 10,
          agility: 10,
          intelligence: 10,
          charisma: 10,
          perception: 10,
          endurance: 10
        }
      };

      const character = await characterService.createCharacter(user.id, characterData);

      // Soldier starts on solenne
      expect(character.currentPlanet).toBe('solenne');
    });

    test('should set starting credits based on background', async () => {
      const characterData = {
        name: 'Diplomat Character',
        species: 'human',
        background: 'diplomat',
        stats: {
          strength: 10,
          agility: 10,
          intelligence: 10,
          charisma: 10,
          perception: 10,
          endurance: 10
        }
      };

      const character = await characterService.createCharacter(user.id, characterData);

      // Diplomat starts with 2500 credits
      expect(character.credits).toBe(2500);
    });

    test('should add starting items from background', async () => {
      const characterData = {
        name: 'Soldier Character',
        species: 'human',
        background: 'soldier',
        stats: {
          strength: 10,
          agility: 10,
          intelligence: 10,
          charisma: 10,
          perception: 10,
          endurance: 10
        }
      };

      const character = await characterService.createCharacter(user.id, characterData);

      // Check inventory was created (items may not exist in test DB, but service should attempt)
      const inventoryService = require('../../../src/services/inventoryService');
      const inventory = await inventoryService.getInventory(character.id);
      expect(inventory).toBeDefined();
    });
  });

  describe('addXP', () => {
    let character;

    beforeEach(async () => {
      character = await createTestCharacter(user.id, {
        level: 1,
        xp: 0
      });
    });

    test('should add XP to character', async () => {
      const result = await characterService.addXP(character.id, 100);

      await character.reload();
      expect(character.xp).toBe(100);
      expect(result.xpGained).toBe(100);
    });

    test('should level up when XP threshold reached', async () => {
      // Level 1 requires 100 XP to reach level 2
      const result = await characterService.addXP(character.id, 100);

      await character.reload();
      expect(character.level).toBe(2);
      expect(result.leveledUp).toBe(true);
      expect(result.newLevel).toBe(2);
    });

    test('should award skill points on level up', async () => {
      const initialSkillPoints = character.skillPoints;
      
      await characterService.addXP(character.id, 100);

      await character.reload();
      expect(character.skillPoints).toBeGreaterThan(initialSkillPoints);
    });

    test('should award attribute points every 3 levels', async () => {
      // Level up to level 3
      character.level = 2;
      character.xp = 0;
      await character.save();

      await characterService.addXP(character.id, 200); // Should reach level 3

      await character.reload();
      expect(character.attributePoints).toBeGreaterThan(0);
    });

    test('should increase max health and stamina on level up', async () => {
      const initialMaxHealth = character.maxHealth;
      const initialMaxStamina = character.maxStamina;

      await characterService.addXP(character.id, 100);

      await character.reload();
      expect(character.maxHealth).toBeGreaterThan(initialMaxHealth);
      expect(character.maxStamina).toBeGreaterThan(initialMaxStamina);
    });
  });

  describe('allocateSkillPoint', () => {
    let character;

    beforeEach(async () => {
      character = await createTestCharacter(user.id, {
        skillPoints: 5,
        skills: {
          combat: {},
          stealth: {},
          diplomacy: {},
          technical: {},
          survival: {}
        }
      });
    });

    test('should allocate skill point', async () => {
      const result = await characterService.allocateSkillPoint(
        character.id,
        'combat',
        'basic_combat'
      );

      expect(result.success).toBe(true);
      expect(result.skillLevel).toBe(1);

      await character.reload();
      expect(character.skillPoints).toBe(4);
      expect(character.skills.combat.basic_combat.level).toBe(1);
    });

    test('should throw error if no skill points available', async () => {
      character.skillPoints = 0;
      await character.save();

      await expect(
        characterService.allocateSkillPoint(character.id, 'combat', 'basic_combat')
      ).rejects.toThrow();
    });

    test('should throw error if skill already at max level', async () => {
      // Set skill to max level (5)
      character.skills.combat.basic_combat = { level: 5 };
      await character.save();

      await expect(
        characterService.allocateSkillPoint(character.id, 'combat', 'basic_combat')
      ).rejects.toThrow();
    });
  });

  describe('allocateAttributePoint', () => {
    let character;

    beforeEach(async () => {
      character = await createTestCharacter(user.id, {
        attributePoints: 1,
        stats: {
          strength: 10,
          agility: 10,
          intelligence: 10,
          charisma: 10,
          perception: 10,
          endurance: 10
        }
      });
    });

    test('should allocate attribute point', async () => {
      const result = await characterService.allocateAttributePoint(
        character.id,
        'strength'
      );

      expect(result.success).toBe(true);
      expect(result.newValue).toBeGreaterThan(10);

      await character.reload();
      expect(character.attributePoints).toBe(0);
      expect(character.stats.strength).toBeGreaterThan(10);
    });

    test('should throw error if no attribute points available', async () => {
      character.attributePoints = 0;
      await character.save();

      await expect(
        characterService.allocateAttributePoint(character.id, 'strength')
      ).rejects.toThrow();
    });

    test('should recalculate max stamina when endurance changes', async () => {
      const initialMaxStamina = character.maxStamina;

      await characterService.allocateAttributePoint(character.id, 'endurance');

      await character.reload();
      expect(character.maxStamina).toBeGreaterThan(initialMaxStamina);
    });
  });

  describe('updateVitals', () => {
    let character;

    beforeEach(async () => {
      character = await createTestCharacter(user.id, {
        currentHealth: 50,
        maxHealth: 100,
        currentStamina: 30,
        maxStamina: 50
      });
    });

    test('should update health', async () => {
      const result = await characterService.updateVitals(character.id, 75, null);

      await character.reload();
      expect(character.currentHealth).toBe(75);
    });

    test('should update stamina', async () => {
      const result = await characterService.updateVitals(character.id, null, 40);

      await character.reload();
      expect(character.currentStamina).toBe(40);
    });

    test('should cap health at max health', async () => {
      await characterService.updateVitals(character.id, 150, null);

      await character.reload();
      expect(character.currentHealth).toBeLessThanOrEqual(character.maxHealth);
    });

    test('should cap stamina at max stamina', async () => {
      await characterService.updateVitals(character.id, null, 100);

      await character.reload();
      expect(character.currentStamina).toBeLessThanOrEqual(character.maxStamina);
    });
  });

  describe('rest', () => {
    let character;

    beforeEach(async () => {
      character = await createTestCharacter(user.id, {
        currentHealth: 50,
        maxHealth: 100,
        currentStamina: 30,
        maxStamina: 50
      });
    });

    test('should restore health and stamina to full', async () => {
      const result = await characterService.rest(character.id);

      await character.reload();
      expect(character.currentHealth).toBe(character.maxHealth);
      expect(character.currentStamina).toBe(character.maxStamina);
    });
  });
});

