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

  describe('createEncounter', () => {
    test('should create a new combat encounter', async () => {
      const encounter = await combatService.createEncounter(
        character.id,
        'random',
        ['ironclad']
      );

      expect(encounter).toBeDefined();
      expect(encounter.characterId).toBe(character.id);
      expect(encounter.encounterType).toBe('random');
      expect(encounter.status).toBe('active');
      expect(encounter.combatants).toBeDefined();
      expect(Array.isArray(encounter.combatants)).toBe(true);
      expect(encounter.combatants.length).toBeGreaterThan(0);
      
      // Should have player combatant
      const playerCombatant = encounter.combatants.find(c => c.type === 'player');
      expect(playerCombatant).toBeDefined();
      expect(playerCombatant.name).toBe(character.name);
      
      // Should have enemy combatant
      const enemyCombatant = encounter.combatants.find(c => c.type === 'enemy');
      expect(enemyCombatant).toBeDefined();
    });

    test('should return existing encounter if character has active encounter', async () => {
      const encounter1 = await combatService.createEncounter(
        character.id,
        'random',
        ['ironclad']
      );

      const encounter2 = await combatService.createEncounter(
        character.id,
        'random',
        ['ironclad']
      );

      expect(encounter1.id).toBe(encounter2.id);
    });

    test('should throw error if character not found', async () => {
      await expect(
        combatService.createEncounter('00000000-0000-0000-0000-000000000000', 'random', ['ironclad'])
      ).rejects.toThrow('Character not found');
    });

    test('should generate random enemy if none provided', async () => {
      const encounter = await combatService.createEncounter(
        character.id,
        'random',
        null
      );

      expect(encounter).toBeDefined();
      expect(encounter.combatants.length).toBeGreaterThan(1);
      const enemyCombatant = encounter.combatants.find(c => c.type === 'enemy');
      expect(enemyCombatant).toBeDefined();
    });

    test('should create dungeon encounter with dungeon enemy', async () => {
      const dungeonEnemy = {
        id: 'dungeon-enemy-1',
        name: 'Dungeon Guard',
        level: 5,
        stats: {
          health: 80,
          maxHealth: 80,
          attack: 15,
          defense: 10,
          speed: 8,
          accuracy: 70
        }
      };

      const encounter = await combatService.createEncounter(
        character.id,
        'dungeon',
        null,
        { dungeonEnemy, subMapId: 'test-submap' }
      );

      expect(encounter).toBeDefined();
      expect(encounter.encounterType).toBe('dungeon');
      const enemyCombatant = encounter.combatants.find(c => c.type === 'enemy');
      expect(enemyCombatant.dungeonEnemyId).toBe(dungeonEnemy.id);
      expect(enemyCombatant.subMapId).toBe('test-submap');
    });
  });

  describe('executeAction', () => {
    let encounter;

    beforeEach(async () => {
      encounter = await combatService.createEncounter(
        character.id,
        'random',
        ['ironclad']
      );
    });

    test.skip('should execute attack action', async () => {
      const playerCombatant = encounter.combatants.find(c => c.type === 'player');
      const enemyCombatant = encounter.combatants.find(c => c.type === 'enemy');

      const result = await combatService.executeAction(
        encounter.id,
        playerCombatant.id,
        'attack',
        enemyCombatant.id
      );

      expect(result.success).toBe(true);
      expect(result.action).toBe('attack');
      expect(result.damage).toBeGreaterThanOrEqual(0);
      expect(result.targetId).toBe(enemyCombatant.id);
    });

    test.skip('should handle defend action', async () => {
      const playerCombatant = encounter.combatants.find(c => c.type === 'player');

      const result = await combatService.executeAction(
        encounter.id,
        playerCombatant.id,
        'defend'
      );

      expect(result.success).toBe(true);
      expect(result.action).toBe('defend');
    });

    test.skip('should handle flee action', async () => {
      const playerCombatant = encounter.combatants.find(c => c.type === 'player');

      const result = await combatService.executeAction(
        encounter.id,
        playerCombatant.id,
        'flee'
      );

      expect(result.success).toBe(true);
      expect(result.action).toBe('fled');
      
      // Encounter should be marked as fled
      const updatedEncounter = await CombatEncounter.findByPk(encounter.id);
      expect(updatedEncounter.status).toBe('fled');
    });

    test('should throw error if encounter not found', async () => {
      await expect(
        combatService.executeAction('00000000-0000-0000-0000-000000000000', 'combatant-id', 'attack', 'target-id')
      ).rejects.toThrow();
    });

    test('should throw error if combatant not found', async () => {
      await expect(
        combatService.executeAction(encounter.id, 'invalid-combatant', 'attack', 'target-id')
      ).rejects.toThrow();
    });
  });

  describe('advanceTurn', () => {
    let encounter;

    beforeEach(async () => {
      encounter = await combatService.createEncounter(
        character.id,
        'random',
        ['ironclad']
      );
    });

    test.skip('should advance to next turn', async () => {
      const initialTurn = encounter.currentTurn;
      const result = await combatService.advanceTurn(encounter);

      expect(result.currentTurn).toBe(initialTurn + 1);
    });

    test.skip('should cycle back to first combatant', async () => {
      const turnOrderLength = encounter.turnOrder.length;
      
      // Advance to last turn
      for (let i = 0; i < turnOrderLength - 1; i++) {
        await combatService.advanceTurn(encounter);
      }

      const result = await combatService.advanceTurn(encounter);
      expect(result.currentTurn).toBe(0);
    });

    test.skip('should process enemy turns automatically', async () => {
      // Set player as current turn
      const playerCombatant = encounter.combatants.find(c => c.type === 'player');
      const playerIndex = encounter.turnOrder.indexOf(playerCombatant.id);
      
      // Advance to player turn
      while (encounter.currentTurn !== playerIndex) {
        encounter = await combatService.advanceTurn(encounter);
      }

      // Execute player action
      const enemyCombatant = encounter.combatants.find(c => c.type === 'enemy');
      await combatService.executeAction(
        encounter.id,
        playerCombatant.id,
        'attack',
        enemyCombatant.id
      );

      // Advance turn (should process enemy)
      const result = await combatService.advanceTurn(encounter);
      expect(result).toBeDefined();
    });
  });

  describe('checkVictoryConditions', () => {
    let encounter;

    beforeEach(async () => {
      encounter = await combatService.createEncounter(
        character.id,
        'random',
        ['ironclad']
      );
    });

    test.skip('should detect player victory when all enemies defeated', async () => {
      // Defeat all enemies
      const enemies = encounter.combatants.filter(c => c.type === 'enemy');
      for (const enemy of enemies) {
        enemy.stats.health = 0;
      }

      // Update encounter
      await CombatEncounter.update(
        { combatants: encounter.combatants },
        { where: { id: encounter.id } }
      );

      const result = await combatService.checkVictoryConditions(encounter);
      expect(result.victory).toBe(true);
      expect(result.winner).toBe('player');
    });

    test.skip('should detect player defeat when health reaches 0', async () => {
      // Set player health to 0
      const player = encounter.combatants.find(c => c.type === 'player');
      player.stats.health = 0;

      // Update encounter
      await CombatEncounter.update(
        { combatants: encounter.combatants },
        { where: { id: encounter.id } }
      );

      const result = await combatService.checkVictoryConditions(encounter);
      expect(result.victory).toBe(true);
      expect(result.winner).toBe('enemy');
    });

    test.skip('should return no victory if combat continues', async () => {
      const result = await combatService.checkVictoryConditions(encounter);
      expect(result.victory).toBe(false);
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

