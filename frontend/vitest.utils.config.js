/**
 * Vitest config for pure-logic util tests that need no React/DOM setup.
 * The main vitest.config.js loads a React testing setup that requires
 * @testing-library/react; these tests don't, so they run standalone:
 *   npm run test:utils
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/utils/**/*.test.js'],
    setupFiles: []
  }
});
