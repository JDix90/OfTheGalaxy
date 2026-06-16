/**
 * Combat Service Unit Tests
 * Tests for combat encounter creation, turn management, and combat resolution
 */

const combatService = require('../../../src/services/combatService');
const { createTestUser, createTestCharacter } = require('../../setup/testHelpers');
const { CombatEncounter, PlayerCharacter } = require('../../../src/models');

describe('CombatService', () => {
  let user;
  let character;

  beforeEach(async () => {
    user = await createTestUser();
    character = await createTestCharacter(user.id, {
      level: 5,
      currentHealth: 100,
      maxHealth: 100,
      currentStamina: 50,
      maxStamina: 50,
      stats: {
        strength: 14,
        agility: 12,
        endurance: 13,
        perception: 15,
        intelligence: 11,
        charisma: 10
      }
    });
  });

  describe('buildPlayerCombatant', () => {
    test('should build player combatant with correct stats', async () => {
      const playerCombatant = await combatService.buildPlayerCombatant(character);

      expect(playerCombatant).toBeDefined();
      expect(playerCombatant.id).toContain(character.id);
      expect(playerCombatant.name).toBe(character.name);
      expect(playerCombatant.type).toBe('player');
      expect(playerCombatant.stats).toBeDefined();
      expect(playerCombatant.stats.health).toBe(character.currentHealth);
      expect(playerCombatant.stats.maxHealth).toBe(character.maxHealth);
      expect(playerCombatant.stats.stamina).toBe(character.currentStamina);
      expect(playerCombatant.stats.maxStamina).toBe(character.maxStamina);
      expect(playerCombatant.stats.attack).toBeGreaterThan(0);
      expect(playerCombatant.stats.defense).toBeGreaterThanOrEqual(0);
    });

    test('should apply stamina status effects when stamina is low', async () => {
      // Set character to low stamina
      character.currentStamina = 10;
      character.maxStamina = 100;
      await character.save();

      const playerCombatant = await combatService.buildPlayerCombatant(character);

      // Should have fatigued status effect
      expect(playerCombatant.statusEffects).toContain('fatigued');
    });

    test('should apply exhausted status effect when stamina is 0', async () => {
      // Set character to 0 stamina
      character.currentStamina = 0;
      character.maxStamina = 100;
      await character.save();

      const playerCombatant = await combatService.buildPlayerCombatant(character);

      // Should have exhausted status effect
      expect(playerCombatant.statusEffects).toContain('exhausted');
    });
  });
});

