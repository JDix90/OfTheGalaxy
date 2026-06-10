/**
 * Health Regeneration Service Unit Tests
 * Tests for health regeneration logic
 */

const healthRegenService = require('../../../src/services/healthRegenService');
const { createTestUser, createTestCharacter } = require('../../setup/testHelpers');
const { PlayerCharacter, CombatEncounter } = require('../../../src/models');

describe('HealthRegenService', () => {
  let user;
  let character;

  beforeEach(async () => {
    user = await createTestUser();
    character = await createTestCharacter(user.id, {
      level: 5,
      currentHealth: 50,
      maxHealth: 100
    });
  });

  describe('processRegeneration', () => {
    test('should regenerate health when not in combat', async () => {
      const initialHealth = character.currentHealth;

      const result = await healthRegenService.processRegeneration(character.id);

      await character.reload();
      expect(character.currentHealth).toBeGreaterThan(initialHealth);
      expect(result.regenerated).toBe(true);
      expect(result.amount).toBeGreaterThan(0);
    });

    test('should not regenerate when in combat', async () => {
      // Create active combat encounter
      await CombatEncounter.create({
        characterId: character.id,
        encounterType: 'random',
        status: 'active',
        combatants: [],
        turnOrder: []
      });

      const initialHealth = character.currentHealth;

      const result = await healthRegenService.processRegeneration(character.id);

      await character.reload();
      expect(character.currentHealth).toBe(initialHealth);
      expect(result.regenerated).toBe(false);
      expect(result.reason).toBe('in_combat');
    });

    test('should not regenerate when health is full', async () => {
      character.currentHealth = character.maxHealth;
      await character.save();

      const result = await healthRegenService.processRegeneration(character.id);

      expect(result.regenerated).toBe(false);
      expect(result.reason).toBe('full_health');
    });

    test('should cap health at max', async () => {
      character.currentHealth = 95;
      await character.save();

      await healthRegenService.processRegeneration(character.id);

      await character.reload();
      expect(character.currentHealth).toBeLessThanOrEqual(character.maxHealth);
    });
  });
});

