/**
 * Jest config for pure-logic unit tests that do NOT require a database.
 * These run without the global DB setup (no Postgres needed):
 *   npm run test:logic
 */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/unit/logic/**/*.test.js'],
  testTimeout: 10000,
  clearMocks: true
};
