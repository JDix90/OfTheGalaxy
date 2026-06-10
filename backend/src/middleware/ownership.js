/**
 * Ownership Middleware
 *
 * Verifies that the authenticated user (req.user.id, set by `authenticate`) owns
 * the character / encounter being acted upon. Closes IDOR holes where controllers
 * previously took a characterId / encounterId straight from the request and
 * mutated it without an ownership check.
 *
 * Must run AFTER `authenticate`. On success it attaches `req.character` (a lean
 * { id, userId } record) so downstream handlers can reuse it without re-querying.
 */

const { PlayerCharacter, CombatEncounter } = require('../models');

const DEFAULT_SOURCES = ['params.characterId', 'body.characterId', 'query.characterId'];

/**
 * Pull the first non-empty id from the given request locations.
 * @param {object} req
 * @param {string[]} sources - e.g. ['params.id', 'body.characterId']
 */
function resolveId(req, sources) {
  for (const source of sources) {
    const dot = source.indexOf('.');
    const bag = source.slice(0, dot);   // 'params' | 'body' | 'query'
    const key = source.slice(dot + 1);
    const value = req[bag] && req[bag][key];
    if (value) return value;
  }
  return null;
}

async function assertCharacterOwned(characterId, userId, res) {
  const character = await PlayerCharacter.findByPk(characterId, {
    attributes: ['id', 'userId'],
  });
  if (!character) {
    res.status(404).json({ success: false, message: 'Character not found' });
    return null;
  }
  if (character.userId !== userId) {
    res.status(403).json({ success: false, message: 'Forbidden: you do not own this character' });
    return null;
  }
  return character;
}

/**
 * Require that the resolved characterId belongs to the authenticated user.
 * @param {string[]} [sources] - where to look for the characterId, in priority order.
 */
function ensureCharacterOwnership(sources = DEFAULT_SOURCES) {
  return async (req, res, next) => {
    try {
      const characterId = resolveId(req, sources);
      if (!characterId) {
        return res.status(400).json({ success: false, message: 'characterId is required' });
      }
      const character = await assertCharacterOwned(characterId, req.user.id, res);
      if (!character) return; // response already sent
      req.character = character;
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Like ensureCharacterOwnership, but if no characterId is present in the request
 * the check is skipped (the route is usable without a character context, e.g.
 * fetching a quest definition). If a characterId IS supplied it must be owned.
 */
function ensureCharacterOwnershipOptional(sources = DEFAULT_SOURCES) {
  return async (req, res, next) => {
    try {
      const characterId = resolveId(req, sources);
      if (!characterId) return next();
      const character = await assertCharacterOwned(characterId, req.user.id, res);
      if (!character) return;
      req.character = character;
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Require that the combat encounter (identified by :encounterId) belongs to a
 * character owned by the authenticated user.
 */
function ensureEncounterOwnership(sources = ['params.encounterId', 'body.encounterId']) {
  return async (req, res, next) => {
    try {
      const encounterId = resolveId(req, sources);
      if (!encounterId) {
        return res.status(400).json({ success: false, message: 'encounterId is required' });
      }
      const encounter = await CombatEncounter.findByPk(encounterId, {
        attributes: ['id', 'characterId'],
      });
      if (!encounter) {
        return res.status(404).json({ success: false, message: 'Combat encounter not found' });
      }
      const character = await assertCharacterOwned(encounter.characterId, req.user.id, res);
      if (!character) return;
      req.character = character;
      req.encounterId = encounterId;
      next();
    } catch (error) {
      next(error);
    }
  };
}

module.exports = {
  ensureCharacterOwnership,
  ensureCharacterOwnershipOptional,
  ensureEncounterOwnership,
};
