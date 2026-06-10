/**
 * NPC Service Unit Tests
 * Tests for NPC interactions and dialogue
 */

const npcService = require('../../../src/services/npcService');
const { createTestUser, createTestCharacter } = require('../../setup/testHelpers');
const { NPC, NPCRelationship } = require('../../../src/models');

describe('NPCService', () => {
  let user;
  let character;
  let npc;

  beforeEach(async () => {
    user = await createTestUser();
    character = await createTestCharacter(user.id);

    npc = await NPC.create({
      id: `test-npc-${Date.now()}`,
      name: 'Test NPC',
      npcType: 'quest_giver',
      factionId: 'independent_investigators',
      planetId: 'chandrila',
      location: { x: 50, y: 50, area: 'surface' },
      personality: {
        traits: ['friendly', 'helpful']
      }
    });
  });

  describe('getNPCsByLocation', () => {
    test('should get NPCs at specific location', async () => {
      const npcs = await npcService.getNPCsByLocation('chandrila', {
        x: 50,
        y: 50,
        area: 'surface'
      });

      expect(Array.isArray(npcs)).toBe(true);
      const testNPC = npcs.find(n => n.id === npc.id);
      expect(testNPC).toBeDefined();
    });

    test('should return empty array if no NPCs at location', async () => {
      const npcs = await npcService.getNPCsByLocation('chandrila', {
        x: 10,
        y: 10,
        area: 'surface'
      });

      expect(npcs).toEqual([]);
    });
  });

  describe('getNPCRelationship', () => {
    test('should get relationship between character and NPC', async () => {
      const relationship = await npcService.getNPCRelationship(character.id, npc.id);

      expect(relationship).toBeDefined();
      expect(relationship.characterId).toBe(character.id);
      expect(relationship.npcId).toBe(npc.id);
    });

    test('should create relationship if it does not exist', async () => {
      const newNPC = await NPC.create({
        id: `new-npc-${Date.now()}`,
        name: 'New NPC',
        npcType: 'vendor',
        factionId: 'independent_investigators',
        planetId: 'chandrila',
        location: { x: 50, y: 50, area: 'surface' }
      });

      const relationship = await npcService.getNPCRelationship(character.id, newNPC.id);

      expect(relationship).toBeDefined();
      expect(relationship.tier).toBe('neutral');
    });
  });

  describe('updateRelationship', () => {
    test('should update relationship tier', async () => {
      await npcService.updateRelationship(character.id, npc.id, 10);

      const relationship = await NPCRelationship.findOne({
        where: {
          characterId: character.id,
          npcId: npc.id
        }
      });

      expect(relationship.reputation).toBeGreaterThan(0);
    });
  });
});

