/**
 * Tutorial state contract (no DB).
 *
 * The frontend state machine (tutorialStateMachine.js) drives tutorial progress
 * and persists each state to the backend, where TutorialProgress.state has an
 * `isIn` validator. If the frontend can emit a state the backend rejects, the
 * tutorial silently breaks mid-flow with a validation error. This test reads
 * both source files and asserts they stay in sync, guarding that bug class.
 */

const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '../../../..');
const BACKEND_MODEL = path.join(REPO, 'backend/src/models/TutorialProgress.js');
const FRONTEND_SM = path.join(REPO, 'frontend/src/services/tutorialStateMachine.js');

function backendValidStates() {
  const src = fs.readFileSync(BACKEND_MODEL, 'utf8');
  const block = src.slice(src.indexOf('isIn: [['));
  const end = block.indexOf(']]');
  return new Set((block.slice(0, end).match(/'([a-z_]+)'/g) || []).map((s) => s.replace(/'/g, '')));
}

function frontendStates() {
  const src = fs.readFileSync(FRONTEND_SM, 'utf8');
  const block = src.slice(src.indexOf('TUTORIAL_STATES = {'));
  const end = block.indexOf('};');
  return new Set((block.slice(0, end).match(/:\s*'([a-z_]+)'/g) || []).map((s) => s.replace(/.*'([a-z_]+)'/, '$1')));
}

describe('tutorial state contract', () => {
  const backend = backendValidStates();
  const frontend = frontendStates();

  test('both sides define a non-trivial number of states', () => {
    expect(backend.size).toBeGreaterThan(20);
    expect(frontend.size).toBeGreaterThan(20);
  });

  test('every frontend state is accepted by the backend validator', () => {
    const missing = [...frontend].filter((s) => !backend.has(s));
    expect(missing).toEqual([]); // any miss here = tutorial save would 400 mid-flow
  });

  test('the backend validator has no orphan states the frontend never emits', () => {
    const orphans = [...backend].filter((s) => !frontend.has(s));
    expect(orphans).toEqual([]);
  });
});
