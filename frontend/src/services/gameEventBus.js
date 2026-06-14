/**
 * gameEventBus — general-purpose pub/sub for non-tutorial gameplay feedback
 * (standing changes, combat juice, loot drama). Kept separate from
 * tutorialEventBus so tutorial-tracking concerns stay isolated.
 *
 *   import { gameEventBus, GAME_EVENTS } from '../services/gameEventBus';
 *   gameEventBus.emit(GAME_EVENTS.COMBAT_HIT, { damage: 42, critical: true, targetId });
 *   const off = gameEventBus.on(GAME_EVENTS.COMBAT_LEVEL_UP, (d) => {...});
 */

class GameEventBus {
  constructor() {
    this.listeners = new Map(); // event -> Set<callback>
  }

  on(event, callback) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event).add(callback);
    return () => this.off(event, callback); // unsubscribe handle
  }

  off(event, callback) {
    this.listeners.get(event)?.delete(callback);
  }

  emit(event, data) {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const cb of set) {
      try {
        cb(data);
      } catch (err) {
        console.error(`[gameEventBus] listener for "${event}" threw:`, err);
      }
    }
  }

  removeAllListeners(event) {
    if (event) this.listeners.delete(event);
    else this.listeners.clear();
  }
}

export const gameEventBus = new GameEventBus();

export const GAME_EVENTS = {
  // Standing
  REP_CHANGED: 'rep.changed',                 // { factionId, factionName, delta, oldTier, newTier }
  RELATIONSHIP_CHANGED: 'relationship.changed', // { npcId, npcName, delta, oldTier, newTier }
  // Combat juice
  COMBAT_HIT: 'combat.hit',                    // { attackerId, targetId, damage, critical, dodged, hit }
  COMBAT_LEVEL_UP: 'combat.levelUp',           // { fromLevel, toLevel, skillPoints, attributePoints }
  // Loot
  LOOT_DROPPED: 'loot.dropped'                 // { itemId, name, rarity, quantity }
};

export default gameEventBus;
