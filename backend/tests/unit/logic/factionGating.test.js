/**
 * Faction reputation gating (no DB).
 * checkPrerequisites is a pure function over (quest, character, completedIds, reputationMap).
 */

const questService = require('../../../src/services/questService');

const character = { level: 10 };

describe('questService.checkPrerequisites - faction reputation', () => {
  test('passes when reputation meets the minimum', () => {
    const quest = { prerequisites: { reputation: { concord: 50 } } };
    expect(questService.checkPrerequisites(quest, character, [], { concord: 60 })).toBe(true);
  });

  test('blocks when reputation is below the minimum', () => {
    const quest = { prerequisites: { reputation: { concord: 50 } } };
    expect(questService.checkPrerequisites(quest, character, [], { concord: 40 })).toBe(false);
  });

  test('treats a missing faction as 0 reputation', () => {
    const quest = { prerequisites: { reputation: { dominion_remnant: 30 } } };
    expect(questService.checkPrerequisites(quest, character, [], {})).toBe(false);
  });

  test('empty reputation requirement imposes no gate', () => {
    const quest = { prerequisites: { reputation: {} } };
    expect(questService.checkPrerequisites(quest, character, [], {})).toBe(true);
  });

  test('requires ALL listed factions to meet their minimums', () => {
    const quest = { prerequisites: { reputation: { concord: 50, keeper_seekers: 20 } } };
    expect(questService.checkPrerequisites(quest, character, [], { concord: 60, keeper_seekers: 10 })).toBe(false);
    expect(questService.checkPrerequisites(quest, character, [], { concord: 60, keeper_seekers: 25 })).toBe(true);
  });

  test('still enforces level and completed-quest prerequisites alongside reputation', () => {
    const quest = { prerequisites: { level: 12, reputation: { concord: 10 } } };
    expect(questService.checkPrerequisites(quest, character, [], { concord: 99 })).toBe(false); // level 10 < 12
    const quest2 = { prerequisites: { completedQuests: ['q_intro'] } };
    expect(questService.checkPrerequisites(quest2, character, [], {})).toBe(false);
    expect(questService.checkPrerequisites(quest2, character, ['q_intro'], {})).toBe(true);
  });
});
