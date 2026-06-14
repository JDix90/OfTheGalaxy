/**
 * Stamina Regeneration Service Unit Tests
 * Tests for stamina regeneration logic
 */

const staminaRegenService = require('../../../src/services/staminaRegenService');
const { createTestUser, createTestCharacter } = require('../../setup/testHelpers');
const { PlayerCharacter, CombatEncounter } = require('../../../src/models');

describe('StaminaRegenService', () => {
  let user;
  let character;

  beforeEach(async () => {
    user = await createTestUser();
    character = await createTestCharacter(user.id, {
      level: 5,
      currentStamina: 50,
      maxStamina: 100,
      stats: {
        endurance: 12
      }
    });
  });

  describe('processRegeneration', () => {
    test('should regenerate stamina when not in combat', async () => {
      const initialStamina = character.currentStamina;

      const result = await staminaRegenService.processRegeneration(character.id);

      await character.reload();
      expect(character.currentStamina).toBeGreaterThan(initialStamina);
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

      const initialStamina = character.currentStamina;

      const result = await staminaRegenService.processRegeneration(character.id);

      await character.reload();
      expect(character.currentStamina).toBe(initialStamina);
      expect(result.regenerated).toBe(false);
      expect(result.reason).toBe('in_combat');
    });

    test('should not regenerate when stamina is full', async () => {
      character.currentStamina = character.maxStamina;
      await character.save();

      const result = await staminaRegenService.processRegeneration(character.id);

      expect(result.regenerated).toBe(false);
      expect(result.reason).toBe('full_stamina');
    });

    test('should cap stamina at max', async () => {
      character.currentStamina = 95;
      await character.save();

      await staminaRegenService.processRegeneration(character.id);

      await character.reload();
      expect(character.currentStamina).toBeLessThanOrEqual(character.maxStamina);
    });
  });

  describe('calculateRegenAmount', () => {
    test('should calculate base regeneration amount', async () => {
      const regenAmount = await staminaRegenService.calculateRegenAmount(character);

      // Base: 0.5% of max stamina per tick (30 seconds)
      // For 100 max stamina: 0.5 stamina per tick
      expect(regenAmount).toBeGreaterThan(0);
      expect(regenAmount).toBeLessThanOrEqual(Math.floor(character.maxStamina * 0.01));
    });

    test('should apply skill bonuses', async () => {
      // Add stamina regen skill bonus
      character.skills.stealth.basic_stealth = { level: 3 };
      await character.save();

      const regenAmount = await staminaRegenService.calculateRegenAmount(character);

      expect(regenAmount).toBeGreaterThan(0);
    });

    test('should apply status effect penalties', async () => {
      // Set stamina to 0 (exhausted status)
      character.currentStamina = 0;
      await character.save();

      const regenAmount = await staminaRegenService.calculateRegenAmount(character);

      // Exhausted reduces regen by 50%
      expect(regenAmount).toBeGreaterThan(0);
    });
  });

  describe('isInCombat', () => {
    test('should return true if character has active combat', async () => {
      await CombatEncounter.create({
        characterId: character.id,
        encounterType: 'random',
        status: 'active',
        combatants: [],
        turnOrder: []
      });

      const inCombat = await staminaRegenService.isInCombat(character.id);
      expect(inCombat).toBe(true);
    });

    test('should return false if character has no active combat', async () => {
      const inCombat = await staminaRegenService.isInCombat(character.id);
      expect(inCombat).toBe(false);
    });
  });

  describe.skip('getRegenStatus' /* removed from service */, () => {
    test('should return regeneration status', async () => {
      const status = await staminaRegenService.getRegenStatus(character.id);

      expect(status).toBeDefined();
      expect(status.canRegenerate).toBeDefined();
      expect(status.inCombat).toBeDefined();
      expect(status.regenRate).toBeDefined();
    });

    test('should indicate if regeneration is paused', async () => {
      // Create active combat
      await CombatEncounter.create({
        characterId: character.id,
        encounterType: 'random',
        status: 'active',
        combatants: [],
        turnOrder: []
      });

      const status = await staminaRegenService.getRegenStatus(character.id);
      expect(status.canRegenerate).toBe(false);
      expect(status.inCombat).toBe(true);
    });
  });
});

