/**
 * Vitest Configuration
 * Testing framework configuration for frontend
 */

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    // A concrete origin so jsdom exposes a working localStorage (the opaque
    // about:blank origin makes localStorage unavailable -> "not a function").
    environmentOptions: { jsdom: { url: 'http://localhost/' } },
    globals: true,
    setupFiles: ['./tests/setup/testUtils.jsx'],
    // Unit/component tests only. Playwright e2e specs (tests/e2e/**) run via
    // `npm run test:e2e`, not vitest.
    include: ['tests/unit/**/*.{test,spec}.{js,jsx}'],
    exclude: ['node_modules/**', 'tests/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'tests/',
        '*.config.js',
        '*.config.ts',
        'src/main.jsx',
        'src/App.jsx',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData.*',
        '**/testUtils.*'
      ],
      thresholds: {
        // Realistic floors at ~current coverage so the gate passes on green tests
        // while preventing regression. Raise these as suite coverage grows.
        lines: 8,
        functions: 15,
        branches: 45,
        statements: 8
      },
      include: ['src/**/*.{js,jsx}']
    },
    testTimeout: 10000
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});

