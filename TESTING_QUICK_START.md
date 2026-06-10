# Testing Quick Start Guide

## Overview

This guide will help you get started with the testing infrastructure quickly.

---

## Prerequisites

1. **Node.js 18+** installed
2. **PostgreSQL 14+** running (for backend tests)
3. **Test database** created (optional, tests will use separate test DB)

---

## Backend Testing

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Set Up Test Database

Create a `.env.test` file in the `backend` directory:

```env
NODE_ENV=test
DATABASE_URL=postgres://postgres:password@localhost:5432/test_db
JWT_SECRET=test-secret-key
```

### 3. Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration
```

### 4. View Coverage Report

After running `npm run test:coverage`, open:
```
backend/coverage/index.html
```

---

## Frontend Testing

### 1. Install Dependencies

```bash
cd frontend
npm install
```

**Note:** You may need to install additional testing dependencies:

```bash
npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event @tanstack/react-query jsdom @vitest/ui @vitest/coverage-v8
```

### 2. Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

### 3. View Coverage Report

After running `npm run test:coverage`, open:
```
frontend/coverage/index.html
```

---

## Writing Your First Test

### Backend Unit Test Example

```javascript
// backend/tests/unit/services/exampleService.test.js
const ExampleService = require('../../../src/services/exampleService');
const { createTestUser } = require('../../setup/testHelpers');

describe('ExampleService', () => {
  test('should do something', async () => {
    const user = await createTestUser();
    // Your test code here
    expect(true).toBe(true);
  });
});
```

### Frontend Component Test Example

```javascript
// frontend/tests/unit/components/ExampleComponent.test.jsx
import { describe, test, expect } from 'vitest';
import { renderWithProviders, screen } from '../../setup/testUtils';
import ExampleComponent from '../../../src/components/ExampleComponent';

describe('ExampleComponent', () => {
  test('should render', () => {
    renderWithProviders(<ExampleComponent />);
    expect(screen.getByText(/example/i)).toBeInTheDocument();
  });
});
```

---

## Test Structure

### Backend Tests

```
backend/
├── tests/
│   ├── setup/
│   │   ├── testDatabase.js      # Database setup
│   │   └── testHelpers.js       # Helper functions
│   ├── unit/
│   │   ├── services/            # Service tests
│   │   └── utils/               # Utility tests
│   └── integration/
│       └── api/                 # API endpoint tests
```

### Frontend Tests

```
frontend/
├── tests/
│   ├── setup/
│   │   └── testUtils.jsx        # Testing utilities
│   ├── unit/
│   │   └── components/          # Component tests
│   └── e2e/                     # E2E tests (Playwright)
```

---

## Running Specific Tests

### Backend

```bash
# Run specific test file
npm test -- exampleService.test.js

# Run tests matching pattern
npm test -- --testNamePattern="should create"

# Run tests in specific directory
npm test -- tests/unit/services
```

### Frontend

```bash
# Run specific test file
npm test -- ExampleComponent.test.jsx

# Run tests matching pattern
npm test -- -t "should render"
```

---

## Coverage Goals

### Current Goals
- **Backend:** 80%+ overall, 85%+ for services
- **Frontend:** 75%+ overall, 80%+ for components

### Viewing Coverage

**Backend:**
```bash
cd backend
npm run test:coverage
open coverage/index.html
```

**Frontend:**
```bash
cd frontend
npm run test:coverage
open coverage/index.html
```

---

## CI/CD Integration

Tests run automatically on:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`

View results in GitHub Actions tab.

---

## Troubleshooting

### Backend Tests Failing

1. **Database connection issues:**
   - Check `.env.test` file exists
   - Verify PostgreSQL is running
   - Check database credentials

2. **Migration errors:**
   - Run `npm run migrate` manually
   - Check migration files are valid

3. **Test timeout:**
   - Increase timeout in `jest.config.js`
   - Check for hanging async operations

### Frontend Tests Failing

1. **Module not found:**
   - Run `npm install` again
   - Check import paths

2. **jsdom issues:**
   - Verify `jsdom` is installed
   - Check `vitest.config.js` environment setting

3. **React rendering errors:**
   - Check component imports
   - Verify test utilities are set up

---

## Next Steps

1. Read `COMPREHENSIVE_TESTING_IMPLEMENTATION_PLAN.md` for full details
2. Start with critical path tests (combat, quests, character creation)
3. Add tests as you develop new features
4. Maintain coverage goals

---

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Playwright Documentation](https://playwright.dev/)

