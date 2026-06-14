/**
 * Quest Service Unit Tests
 * Tests for quest management, progression, and completion
 */

const questService = require('../../../src/services/questService');
const { createTestUser, createTestCharacter } = require('../../setup/testHelpers');
const { Quest, QuestProgress, PlayerCharacter, NPC } = require('../../../src/models');

describe('QuestService', () => {
  let user;
  let character;
  let quest;
  let npc;

  beforeEach(async () => {
    user = await createTestUser();
    character = await createTestCharacter(user.id, {
      level: 5
    });

    // Create test NPC
    npc = await NPC.create({
      id: `test-npc-${Date.now()}`,
      name: 'Test Quest Giver',
      npcType: 'quest_giver',
      species: 'human',      factionId: 'independent_investigators',
      planetId: 'solenne',
      location: { x: 50, y: 50, area: 'surface' }
    });

    // Create test quest
    quest = await Quest.create({
      id: `test-quest-${Date.now()}`,
      title: 'Test Quest',
      description: 'A test quest',
      questGiverId: npc.id,
      factionId: 'independent_investigators',
      questType: 'main',
      objectives: [
        {
          id: 'obj1',
          type: 'interact',
          target: npc.id,
          description: 'Talk to NPC'
        }
      ],
      rewards: {
        xp: 100,
        credits: 500,
        items: []
      },
      isActive: true
    });
  });

  describe('getAvailableQuests', () => {
    test('should return available quests for character', async () => {
      const availableQuests = await questService.getAvailableQuests(character.id);

      expect(Array.isArray(availableQuests)).toBe(true);
      expect(availableQuests.length).toBeGreaterThan(0);
      const testQuest = availableQuests.find(q => q.id === quest.id);
      expect(testQuest).toBeDefined();
    });

    test('should exclude completed quests', async () => {
      // Complete the quest
      await QuestProgress.create({
        characterId: character.id,
        questId: quest.id,
        status: 'completed',
        objectiveProgress: {}
      });

      const availableQuests = await questService.getAvailableQuests(character.id);
      const testQuest = availableQuests.find(q => q.id === quest.id);
      expect(testQuest).toBeUndefined();
    });

    test('should exclude active quests', async () => {
      // Start the quest
      await QuestProgress.create({
        characterId: character.id,
        questId: quest.id,
        status: 'active',
        objectiveProgress: {}
      });

      const availableQuests = await questService.getAvailableQuests(character.id);
      const testQuest = availableQuests.find(q => q.id === quest.id);
      expect(testQuest).toBeUndefined();
    });

    test('should check prerequisites', async () => {
      // Create quest with level prerequisite
      const levelQuest = await Quest.create({
        id: `level-quest-${Date.now()}`,
        title: 'Level Quest',
        description: 'Requires level 10',
        questGiverId: npc.id,
        factionId: 'independent_investigators',
        questType: 'main',
        prerequisites: {
          level: 10
        },
        objectives: [],
        rewards: { xp: 100, credits: 500 },
        isActive: true
      });

      const availableQuests = await questService.getAvailableQuests(character.id);
      const levelQuestAvailable = availableQuests.find(q => q.id === levelQuest.id);
      expect(levelQuestAvailable).toBeUndefined(); // Character is level 5
    });

    test('should throw error if character not found', async () => {
      await expect(
        questService.getAvailableQuests('invalid-id')
      ).rejects.toThrow('Character not found');
    });
  });

  describe('getQuestsByNPC', () => {
    test('should return quests from specific NPC', async () => {
      const npcQuests = await questService.getQuestsByNPC(npc.id, character.id);

      expect(Array.isArray(npcQuests)).toBe(true);
      const testQuest = npcQuests.find(q => q.id === quest.id);
      expect(testQuest).toBeDefined();
    });

    test('should return empty array if NPC has no quests', async () => {
      const emptyNPC = await NPC.create({
        id: `empty-npc-${Date.now()}`,
        name: 'Empty NPC',
        npcType: 'vendor',
        species: 'human',        factionId: 'independent_investigators',
        planetId: 'solenne',
        location: { x: 50, y: 50, area: 'surface' }
      });

      const npcQuests = await questService.getQuestsByNPC(emptyNPC.id, character.id);
      expect(npcQuests).toEqual([]);
    });
  });

  describe('startQuest', () => {
    test('should start a quest for character', async () => {
      const result = await questService.startQuest(character.id, quest.id);

      expect(result.success).toBe(true);
      expect(result.questProgress).toBeDefined();
      expect(result.questProgress.status).toBe('active');
      expect(result.questProgress.characterId).toBe(character.id);
      expect(result.questProgress.questId).toBe(quest.id);
    });

    test('should throw error if quest not found', async () => {
      await expect(
        questService.startQuest(character.id, 'invalid-quest-id')
      ).rejects.toThrow();
    });

    test('should throw error if quest already active', async () => {
      await questService.startQuest(character.id, quest.id);

      await expect(
        questService.startQuest(character.id, quest.id)
      ).rejects.toThrow();
    });
  });

  describe('updateObjective', () => {
    let questProgress;

    beforeEach(async () => {
      questProgress = await questService.startQuest(character.id, quest.id);
    });

    test('should update objective progress', async () => {
      const result = await questService.updateObjective(
        character.id,
        quest.id,
        'obj1',
        true,
        { interacted: true }
      );

      expect(result.success).toBe(true);
      
      const updated = await QuestProgress.findOne({
        where: {
          characterId: character.id,
          questId: quest.id
        }
      });

      expect(updated.isObjectiveComplete('obj1')).toBe(true);
    });

    test('should complete quest when all objectives complete', async () => {
      // Complete all objectives
      for (const objective of quest.objectives) {
        await questService.updateObjective(
          character.id,
          quest.id,
          objective.id,
          true,
          {}
        );
      }

      const updated = await QuestProgress.findOne({
        where: {
          characterId: character.id,
          questId: quest.id
        }
      });

      expect(updated.status).toBe('completed');
    });
  });

  describe('completeQuest', () => {
    let questProgress;

    beforeEach(async () => {
      questProgress = await questService.startQuest(character.id, quest.id);
      
      // Complete all objectives
      for (const objective of quest.objectives) {
        await questService.updateObjective(
          character.id,
          quest.id,
          objective.id,
          true,
          {}
        );
      }
    });

    test('should complete quest and award rewards', async () => {
      const initialXP = character.xp;
      const initialCredits = character.credits;

      const result = await questService.completeQuest(character.id, quest.id);

      expect(result.success).toBe(true);
      expect(result.rewards).toBeDefined();

      // Reload character to check rewards
      await character.reload();
      expect(character.xp).toBe(initialXP + quest.rewards.xp);
      expect(character.credits).toBe(initialCredits + quest.rewards.credits);
    });

    test('should throw error if quest not active', async () => {
      // Try to complete quest that hasn't been started
      const newQuest = await Quest.create({
        id: `new-quest-${Date.now()}`,
        title: 'New Quest',
        description: 'A new quest',
        questGiverId: npc.id,
        factionId: 'independent_investigators',
        questType: 'main',
        objectives: [],
        rewards: { xp: 100, credits: 500 },
        isActive: true
      });

      await expect(
        questService.completeQuest(character.id, newQuest.id)
      ).rejects.toThrow();
    });
  });
});

