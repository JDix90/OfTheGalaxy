/**
 * Tutorial follow-on quests — the "first real quest" spawned by the golden-path
 * closing choice (see content/tutorial/golden_path.json -> closingChoice).
 *
 * When Jax hands the player the Veil resonance fragment and they choose where to
 * take it, the matching quest below is upserted into the Quest table and started
 * for the character. They are deliberately small, objective-driven hand-offs:
 *
 *   1. a `travel` objective (auto-completes on arrival via
 *      galaxyService.trackTravelObjectives) — the immediate, always-valid next step
 *   2. a `custom` narrative beat (no fragile NPC/POI dependency) — the payoff that
 *      deeper faction content will pick up later
 *
 * questGiverId is intentionally null: these are granted by the tutorial, not by an
 * in-world NPC, which keeps questService.startQuest from trying to anchor POIs to a
 * giver (and sidesteps the stale dev-DB NPC data on Caldon/Sinkport).
 *
 * Faction ids (keeper_order / drift_cartel) match the closing-choice reputation
 * lean so the quest reward reinforces the standing the player just earned.
 */

const KEEPER_FRAGMENT_QUEST = {
  id: 'mq_keeper_fragment_01',
  factionId: 'keeper_order',
  questType: 'main',
  title: 'What Sleeps in the Shard',
  shortDescription: 'Take the Veil resonance fragment to the Keeper contact on Caldon.',
  description:
    "Jax pulled a resonance fragment from the training drone's core — and it lit up against something in you. He's pointed you to a Keeper contact on Caldon, an Order world where they live and breathe Veil-resonance. Carry the shard to them, tell them Jax sent you, and find out what it is that woke when you fought.",
  prerequisites: { level: 1, reputation: {}, completedQuests: [], items: [] },
  objectives: [
    {
      id: 'travel_caldon',
      type: 'travel',
      description: 'Travel to Caldon, the quiet Order world Jax marked on your map.',
      location: { planet: 'caldon' }
    },
    {
      id: 'find_keeper_contact',
      type: 'custom',
      description: "Find Jax's Keeper contact and show them the resonance fragment.",
      target: 'keeper_contact_caldon'
    }
  ],
  rewards: {
    xp: 200,
    credits: 150,
    reputation: { keeper_order: 10 },
    items: [],
    unlocks: []
  },
  questGiverId: null,
  startLocation: { planet: 'caldon', area: 'settlement' },
  estimatedTime: 30,
  difficulty: 'easy',
  isActive: true,
  chainId: 'mq_keeper_fragment',
  chainOrder: 1
};

const CARTEL_FRAGMENT_QUEST = {
  id: 'mq_cartel_fragment_01',
  factionId: 'drift_cartel',
  questType: 'main',
  title: 'No Questions Asked',
  shortDescription: 'Take the Veil resonance fragment to the Drift Cartel buyer on Sinkport.',
  description:
    "Jax pulled a resonance fragment from the training drone's core — and it lit up against something in you. You've decided coin beats mystery. He's named a Drift Cartel buyer on Sinkport who pays in full and asks nothing. Carry the shard to Sinkport, tell them Jax vouched, and don't count your fingers after you shake hands.",
  prerequisites: { level: 1, reputation: {}, completedQuests: [], items: [] },
  objectives: [
    {
      id: 'travel_sinkport',
      type: 'travel',
      description: 'Travel to Sinkport, the Drift Cartel port Jax marked on your map.',
      location: { planet: 'sinkport' }
    },
    {
      id: 'meet_cartel_buyer',
      type: 'custom',
      description: 'Make contact with the Drift Cartel buyer and sell the resonance fragment.',
      target: 'cartel_buyer_sinkport'
    }
  ],
  rewards: {
    xp: 200,
    credits: 250,
    reputation: { drift_cartel: 10 },
    items: [],
    unlocks: []
  },
  questGiverId: null,
  startLocation: { planet: 'sinkport', area: 'spaceport' },
  estimatedTime: 30,
  difficulty: 'easy',
  isActive: true,
  chainId: 'mq_cartel_fragment',
  chainOrder: 1
};

const FOLLOW_ON_QUESTS = {
  mq_keeper_fragment_01: KEEPER_FRAGMENT_QUEST,
  mq_cartel_fragment_01: CARTEL_FRAGMENT_QUEST
};

module.exports = { FOLLOW_ON_QUESTS, KEEPER_FRAGMENT_QUEST, CARTEL_FRAGMENT_QUEST };
