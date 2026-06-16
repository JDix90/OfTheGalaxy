/**
 * Quest `collect`-objective POI flow (DB-free, mocked). Regression for the play-test bug where a
 * collect quest's POI ("Supply Cache") never let the objective complete:
 *   - collectQuestItemsFromPOI hard-coded `completed:false` → objective soft-locked even after
 *     collecting (now: completes when the accumulated count meets the target);
 *   - the objective credit lived inside the addItem try → a non-DB/flavor item id silently skipped
 *     it (now: best-effort grant, always credit);
 *   - EXPLORE (handleDiscoveryPOI) never collected at all (now it does).
 * Run: npm run test:logic
 */

const poiService = require('../../../src/services/poiService');
const questService = require('../../../src/services/questService');
const inventoryService = require('../../../src/services/inventoryService');
const discoveryService = require('../../../src/services/discoveryService');
const { QuestProgress, Quest } = require('../../../src/models');

const character = { id: 'c1' };
const collectPOI = (over = {}) => ({
  id: 'poi1', name: 'Supply Cache', type: 'storage_facility',
  questItems: [{ itemId: 'stolen_datapad', count: 1, questId: 'q1', objectiveId: 'o1' }],
  ...over,
});
const activeQuest = (objective, progress = {}) => ([{
  quest: { id: 'q1', title: 'Theft for Hera', objectives: [objective] },
  objectivesCompleted: {}, objectiveProgress: progress,
}]);

afterEach(() => jest.restoreAllMocks());

describe('collectQuestItemsFromPOI', () => {
  test('marks the collect objective COMPLETE when the granted count meets the target', async () => {
    jest.spyOn(QuestProgress, 'findAll').mockResolvedValue(activeQuest({ id: 'o1', type: 'collect', target: 'stolen_datapad', count: 1 }));
    jest.spyOn(inventoryService, 'addItem').mockResolvedValue();
    const upd = jest.spyOn(questService, 'updateObjective').mockResolvedValue();

    const res = await poiService.collectQuestItemsFromPOI(character, collectPOI());

    expect(upd).toHaveBeenCalledWith('c1', 'q1', 'o1', true, 1); // completed=true (was hard-coded false)
    expect(res.objectivesCredited[0].completed).toBe(true);
    expect(res.itemsGranted).toEqual([{ itemId: 'stolen_datapad', count: 1 }]);
  });

  test('credits the objective even when the item is NOT grantable (flavor / non-DB target)', async () => {
    jest.spyOn(QuestProgress, 'findAll').mockResolvedValue(activeQuest({ id: 'o1', type: 'collect', target: 'stolen_datapad', count: 1 }));
    jest.spyOn(inventoryService, 'addItem').mockRejectedValue(new Error('item not found'));
    const upd = jest.spyOn(questService, 'updateObjective').mockResolvedValue();

    const res = await poiService.collectQuestItemsFromPOI(character, collectPOI());

    expect(upd).toHaveBeenCalledWith('c1', 'q1', 'o1', true, 1); // still credited despite grant failure
    expect(res.itemsGranted).toEqual([]);                         // nothing added to inventory
    expect(res.objectivesCredited[0].completed).toBe(true);
  });

  test('accumulates partial progress without completing when target > granted', async () => {
    jest.spyOn(QuestProgress, 'findAll').mockResolvedValue(activeQuest({ id: 'o1', type: 'collect', target: 'x', count: 5 }, { o1: 1 }));
    jest.spyOn(inventoryService, 'addItem').mockResolvedValue();
    const upd = jest.spyOn(questService, 'updateObjective').mockResolvedValue();

    await poiService.collectQuestItemsFromPOI(character, collectPOI({ questItems: [{ itemId: 'x', count: 2, questId: 'q1', objectiveId: 'o1' }] }));

    expect(upd).toHaveBeenCalledWith('c1', 'q1', 'o1', false, 3); // prev 1 + 2 = 3 < 5 → still incomplete
  });

  test('skips an already-completed objective', async () => {
    jest.spyOn(QuestProgress, 'findAll').mockResolvedValue([{ quest: { id: 'q1', title: 'X', objectives: [{ id: 'o1', type: 'collect', count: 1 }] }, objectivesCompleted: { o1: true }, objectiveProgress: {} }]);
    const upd = jest.spyOn(questService, 'updateObjective').mockResolvedValue();
    const add = jest.spyOn(inventoryService, 'addItem').mockResolvedValue();

    const res = await poiService.collectQuestItemsFromPOI(character, collectPOI({ questItems: [{ itemId: 'x', count: 1, questId: 'q1', objectiveId: 'o1' }] }));

    expect(upd).not.toHaveBeenCalled();
    expect(add).not.toHaveBeenCalled();
    expect(res.objectivesCredited).toEqual([]);
  });

  test('a POI with no questItems is a no-op', async () => {
    const res = await poiService.collectQuestItemsFromPOI(character, { id: 'p', name: 'Empty', type: 'landmark' });
    expect(res).toEqual({ itemsGranted: [], objectivesCredited: [] });
  });
});

describe('creditQuestPOIObjective — discover/travel objectives complete on POI interaction', () => {
  const poiFor = (oType) => ({ id: 'p', name: 'X', type: 'landmark', questRelated: { questId: 'q1', objectiveId: 'o1', questTitle: 'Q' } });
  const mockQuest = (oType) => jest.spyOn(Quest, 'findByPk').mockResolvedValue({ id: 'q1', title: 'Q', objectives: [{ id: 'o1', type: oType }] });

  test('completes a discover objective bound via questRelated', async () => {
    jest.spyOn(QuestProgress, 'findOne').mockResolvedValue({ objectivesCompleted: {} });
    mockQuest('discover');
    const upd = jest.spyOn(questService, 'updateObjective').mockResolvedValue();
    const res = await poiService.creditQuestPOIObjective(character, poiFor('discover'));
    expect(upd).toHaveBeenCalledWith('c1', 'q1', 'o1', true, 1);
    expect(res[0].completed).toBe(true);
  });

  test('completes a travel objective', async () => {
    jest.spyOn(QuestProgress, 'findOne').mockResolvedValue({ objectivesCompleted: {} });
    mockQuest('travel');
    const upd = jest.spyOn(questService, 'updateObjective').mockResolvedValue();
    await poiService.creditQuestPOIObjective(character, poiFor('travel'));
    expect(upd).toHaveBeenCalledWith('c1', 'q1', 'o1', true, 1);
  });

  test('does NOT auto-complete a collect/defeat objective here (handled by their own funnels)', async () => {
    jest.spyOn(QuestProgress, 'findOne').mockResolvedValue({ objectivesCompleted: {} });
    mockQuest('collect');
    const upd = jest.spyOn(questService, 'updateObjective').mockResolvedValue();
    const res = await poiService.creditQuestPOIObjective(character, poiFor('collect'));
    expect(upd).not.toHaveBeenCalled();
    expect(res).toEqual([]);
  });

  test('no questRelated → no-op', async () => {
    const res = await poiService.creditQuestPOIObjective(character, { id: 'p', name: 'X', type: 'landmark' });
    expect(res).toEqual([]);
  });

  test('already-complete objective → no-op', async () => {
    jest.spyOn(QuestProgress, 'findOne').mockResolvedValue({ objectivesCompleted: { o1: true } });
    const upd = jest.spyOn(questService, 'updateObjective').mockResolvedValue();
    const res = await poiService.creditQuestPOIObjective(character, poiFor('discover'));
    expect(upd).not.toHaveBeenCalled();
    expect(res).toEqual([]);
  });
});

describe('handleDiscoveryPOI (EXPLORE) now collects quest items', () => {
  test('Explore credits the collect objective (was a no-op before)', async () => {
    jest.spyOn(discoveryService, 'recordDiscovery').mockResolvedValue();
    jest.spyOn(QuestProgress, 'findAll').mockResolvedValue(activeQuest({ id: 'o1', type: 'collect', target: 'stolen_datapad', count: 1 }));
    jest.spyOn(inventoryService, 'addItem').mockResolvedValue();
    const upd = jest.spyOn(questService, 'updateObjective').mockResolvedValue();

    const res = await poiService.handleDiscoveryPOI(character, { id: 'planet1' }, collectPOI(), { metadata: {} });

    expect(upd).toHaveBeenCalledWith('c1', 'q1', 'o1', true, 1);
    expect(res.objectivesCredited[0].completed).toBe(true);
    expect(res.success).toBe(true);
  });
});
