# Testing Infrastructure Setup

## Overview

Successfully set up comprehensive testing infrastructure using Vitest for the accounting reconciliation application.

## Test Framework: Vitest

**Why Vitest?**
- Fast and modern (built on Vite)
- Native ESM and TypeScript support
- Compatible with Jest API
- Excellent DX with hot module reload
- Built-in coverage reporting

## Setup Summary

### 1. Dependencies Installed

```json
{
  "devDependencies": {
    "vitest": "^4.0.16",
    "@vitest/ui": "^4.0.16",
    "@testing-library/react": "^16.3.1",
    "@testing-library/jest-dom": "^6.9.1",
    "@vitejs/plugin-react": "^5.1.2",
    "happy-dom": "^20.1.0"
  }
}
```

### 2. Configuration Files Created

#### `vitest.config.ts`
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    setupFiles: ['./src/__tests__/setup.ts'],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

#### `src/__tests__/setup.ts`
```typescript
import '@testing-library/jest-dom'
```

### 3. NPM Scripts Added

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

## Test Coverage

### Parser System Tests (55 tests - All Passing ✅)

#### Base Parser Tests (39 tests)

**File**: `src/__tests__/parsers/base-parser.test.ts`

**Coverage**:
- ✅ `extractNumber()` - 10 tests
  - Number types, strings with commas
  - Parentheses as negative
  - Currency symbols ($, €, £, ¥)
  - Whitespace handling
  - Edge cases (N/A, null, undefined)
  - Negative numbers, decimals

- ✅ `parseDate()` - 8 tests
  - ISO format (YYYY-MM-DD, YYYY-MM)
  - US format (MM/DD/YYYY)
  - UK format (DD-MM-YYYY)
  - Month name format (Dec 2025, December 2025)
  - Compact format (YYYYMMDD)
  - Invalid formats

- ✅ `extractAccountCode()` - 6 tests
  - Parenthetical format ("Cash (1000)")
  - Segmented format ("1000-01-001")
  - Plain codes ("1000")
  - Various formats
  - Edge cases

- ✅ `hasHeaders()` - 6 tests
  - Case-insensitive matching
  - Partial matches
  - Multiple keyword matching
  - Empty arrays

- ✅ `findHeader()` - 4 tests
  - First match finding
  - Case-insensitive search
  - No match cases
  - Empty arrays

- ✅ `ParserRegistry` - 5 tests
  - Parser registration
  - Parser lookup
  - Get all parsers
  - Auto-detection with confidence scoring
  - Threshold validation (> 0.5)

#### QuickBooks Parser Tests (16 tests)

**File**: `src/__tests__/parsers/quickbooks-parser.test.ts`

**Coverage**:
- ✅ Metadata validation (1 test)
  - name, displayName, description

- ✅ Detection logic (3 tests)
  - Parenthetical format detection
  - Multiple variations
  - Non-matching formats
  - Missing columns

- ✅ Account code extraction (2 tests)
  - Parenthetical format parsing
  - Various account types

- ✅ Amount parsing (4 tests)
  - Comma-formatted numbers
  - Negative amounts
  - Parentheses as negative
  - Balance columns

- ✅ Date parsing (3 tests)
  - US format (MM/DD/YYYY)
  - Single-digit months/days
  - Period columns

- ✅ Full row parsing (3 tests)
  - Complete row transformation
  - Field preservation
  - Custom fields

### Test Results

```
✓ src/__tests__/parsers/quickbooks-parser.test.ts (16 tests)
✓ src/__tests__/parsers/base-parser.test.ts (39 tests)

Test Files  2 passed (2)
Tests       55 passed (55)
Start at    21:09:58
Duration    2.21s
```

## Running Tests

### Watch Mode (Development)
```bash
npm test
```

### Run Once
```bash
npm run test:run
```

### UI Mode
```bash
npm run test:ui
```

### With Coverage
```bash
npm run test:coverage
```

## Test Organization

```
apps/web/
├── src/
│   ├── __tests__/
│   │   ├── setup.ts              # Test setup file
│   │   └── parsers/
│   │       ├── base-parser.test.ts      # Base class tests (39 tests)
│   │       └── quickbooks-parser.test.ts # QuickBooks tests (16 tests)
│   └── lib/
│       └── parsers/
│           ├── base-parser.ts
│           └── quickbooks-parser.ts
├── vitest.config.ts              # Vitest configuration
└── package.json                  # Test scripts
```

## Testing Best Practices

### 1. Test Structure

```typescript
describe('ComponentName', () => {
  let instance: ComponentClass

  beforeEach(() => {
    instance = new ComponentClass()
  })

  describe('method', () => {
    it('should do something specific', () => {
      // Arrange
      const input = 'test'

      // Act
      const result = instance.method(input)

      // Assert
      expect(result).toBe('expected')
    })
  })
})
```

### 2. Test Coverage Guidelines

- **Helper Methods**: Test all edge cases
  - Valid inputs
  - Invalid inputs
  - Null/undefined
  - Type variations
  - Edge cases

- **Parsers**: Test both detection and parsing
  - Detection confidence scores
  - Various input formats
  - Field extraction
  - Full row transformation

- **Aim for**:
  - 80%+ code coverage
  - All critical paths tested
  - Edge cases covered

### 3. What to Test

✅ **Do Test**:
- Public methods
- Edge cases
- Error conditions
- Type conversions
- Critical business logic

❌ **Don't Test**:
- Private implementation details
- Third-party libraries
- Simple getters/setters
- Framework code

## Next Steps

### Immediate
- [x] Base parser helper methods - DONE (39 tests)
- [x] QuickBooks parser - DONE (16 tests)
- [ ] Costpoint parser tests
- [ ] NetSuite parser tests
- [ ] SAP parser tests
- [ ] Dynamics parser tests
- [ ] Xero parser tests
- [ ] Generic parser tests

### Short Term
- [ ] ParserRegistry integration tests
- [ ] transformData.ts tests
- [ ] API route tests (/api/uploads, /api/agent/runs)
- [ ] File upload hook tests

### Medium Term
- [ ] Component tests (React Testing Library)
- [ ] E2E tests (Playwright)
- [ ] Performance tests
- [ ] Integration tests with database

## Test Utilities

### Custom Matchers

You can add custom matchers in `src/__tests__/setup.ts`:

```typescript
import { expect } from 'vitest'

expect.extend({
  toBeValidPeriod(received: string) {
    const pass = /^\d{4}-\d{2}$/.test(received)
    return {
      pass,
      message: () => `expected ${received} to be valid YYYY-MM period`
    }
  }
})
```

### Test Fixtures

Create test data in `src/__tests__/fixtures/`:

```typescript
// fixtures/csv-data.ts
export const mockQuickBooksRow = {
  Account: 'Cash (1000)',
  Amount: '1,234.56',
  Date: '12/31/2025'
}

export const mockSAPRow = {
  'Company Code': '1000',
  'G/L Account': '100000',
  'GC Amount': '1,234,567.89',
  'Posting Date': '20251231'
}
```

## Coverage Report

Run with coverage:
```bash
npm run test:coverage
```

Output:
- Console: Text summary
- HTML: `coverage/index.html` (open in browser)
- JSON: `coverage/coverage-final.json` (for CI/CD)

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run test:run
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
```

## Debugging Tests

### VS Code Configuration

Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Vitest Tests",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["run", "test"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

### Debug Specific Test

```bash
npx vitest run --reporter=verbose --grep "should detect parenthetical"
```

## Troubleshooting

### Issue: Tests hanging
**Solution**: Check for async operations without await

### Issue: Module not found
**Solution**: Verify path aliases in `vitest.config.ts`

### Issue: Types not recognized
**Solution**: Add to `tsconfig.json`:
```json
{
  "compilerOptions": {
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  }
}
```

## Metrics

| Metric | Value |
|--------|-------|
| **Total Tests** | 55 |
| **Passing** | 55 (100%) |
| **Test Files** | 2 |
| **Test Suites** | 13 |
| **Avg Test Duration** | 0.6ms |
| **Total Duration** | 2.21s |
| **Setup Time** | 619ms |
| **Coverage** | TBD (run coverage report) |

## Benefits

### 1. Confidence ✅
- Catch bugs early
- Safe refactoring
- Regression prevention

### 2. Documentation ✅
- Tests serve as examples
- Clear API contracts
- Living documentation

### 3. Quality ✅
- Better code design
- Modular architecture
- Edge case handling

### 4. Velocity ✅
- Faster debugging
- Quick validation
- Automated checks

## Summary

Successfully set up comprehensive testing infrastructure with:

- ✅ **Vitest** testing framework configured
- ✅ **55 tests** for parser system (100% passing)
- ✅ **Test scripts** in package.json
- ✅ **CI/CD ready** configuration
- ✅ **Coverage reporting** enabled
- ✅ **Best practices** documented

The testing foundation is now in place for:
- Remaining parser plugins (6 more)
- Data transformation logic
- API routes
- React components
- Integration tests

---

**Setup Time**: ~1 hour
**Tests Created**: 55 tests
**Test Files**: 2 files
**Pass Rate**: 100%
**Status**: ✅ Complete and Operational
