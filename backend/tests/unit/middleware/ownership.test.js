/**
 * Ownership middleware tests (DB-backed; runs in CI with the test database).
 * Verifies the IDOR guards: a user can only act on characters/encounters they own.
 */

const { ensureCharacterOwnership, ensureEncounterOwnership } = require('../../../src/middleware/ownership');
const { createTestUser, createTestCharacter } = require('../../setup/testHelpers');
const { CombatEncounter } = require('../../../src/models');

function mockRes() {
  return {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; }
  };
}

describe('ensureCharacterOwnership', () => {
  let owner, character;

  beforeEach(async () => {
    owner = await createTestUser();
    character = await createTestCharacter(owner.id);
  });

  test('calls next and attaches req.character for the owner', async () => {
    const mw = ensureCharacterOwnership(['params.id']);
    const req = { user: { id: owner.id }, params: { id: character.id } };
    const res = mockRes();
    let called = false;
    await mw(req, res, () => { called = true; });
    expect(called).toBe(true);
    expect(req.character.id).toBe(character.id);
  });

  test('returns 403 for a non-owner', async () => {
    const attacker = await createTestUser();
    const mw = ensureCharacterOwnership(['params.id']);
    const req = { user: { id: attacker.id }, params: { id: character.id } };
    const res = mockRes();
    let called = false;
    await mw(req, res, () => { called = true; });
    expect(called).toBe(false);
    expect(res.statusCode).toBe(403);
  });

  test('returns 404 when the character does not exist', async () => {
    const mw = ensureCharacterOwnership(['params.id']);
    const req = { user: { id: owner.id }, params: { id: '00000000-0000-0000-0000-000000000000' } };
    const res = mockRes();
    await mw(req, res, () => {});
    expect(res.statusCode).toBe(404);
  });

  test('returns 400 when no id is present', async () => {
    const mw = ensureCharacterOwnership(['body.characterId']);
    const req = { user: { id: owner.id }, body: {} };
    const res = mockRes();
    await mw(req, res, () => {});
    expect(res.statusCode).toBe(400);
  });

  test('resolves the id from the body', async () => {
    const mw = ensureCharacterOwnership(); // defaults include body.characterId
    const req = { user: { id: owner.id }, params: {}, body: { characterId: character.id }, query: {} };
    const res = mockRes();
    let called = false;
    await mw(req, res, () => { called = true; });
    expect(called).toBe(true);
  });
});

describe('ensureEncounterOwnership', () => {
  let owner, character, encounter;

  beforeEach(async () => {
    owner = await createTestUser();
    character = await createTestCharacter(owner.id);
    encounter = await CombatEncounter.create({
      characterId: character.id,
      encounterType: 'random',
      status: 'active',
      combatants: [],
      turnOrder: [],
      currentTurn: 0
    });
  });

  test('allows the owner of the encounter through', async () => {
    const mw = ensureEncounterOwnership();
    const req = { user: { id: owner.id }, params: { encounterId: encounter.id } };
    const res = mockRes();
    let called = false;
    await mw(req, res, () => { called = true; });
    expect(called).toBe(true);
    expect(req.character.id).toBe(character.id);
  });

  test('blocks a non-owner with 403', async () => {
    const attacker = await createTestUser();
    const mw = ensureEncounterOwnership();
    const req = { user: { id: attacker.id }, params: { encounterId: encounter.id } };
    const res = mockRes();
    let called = false;
    await mw(req, res, () => { called = true; });
    expect(called).toBe(false);
    expect(res.statusCode).toBe(403);
  });
});
