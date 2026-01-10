# API Route Tests

Comprehensive test coverage for Next.js API routes.

## Test Files

### 1. `/api/uploads` Tests (19 tests)
**File**: `src/__tests__/api/uploads.test.ts`

Tests for file upload endpoint with validation and security checks.

#### Test Coverage:

**File Validation** (4 tests):
- Missing file rejection
- File size limit (50MB max)
- MIME type validation (CSV/TXT only)
- File extension validation

**Valid Uploads** (6 tests):
- CSV file acceptance
- TXT file acceptance
- Multiple MIME type support (text/csv, application/csv, application/vnd.ms-excel)
- Default kind value handling
- Custom kind value support

**Filename Sanitization** (3 tests):
- Special character replacement
- Dot and hyphen preservation
- Timestamp prefix addition

**File System Operations** (1 test):
- File path in response

**Error Handling** (1 test):
- Timestamp in error responses

**Edge Cases** (4 tests):
- Very small files
- Files with only extension
- Maximum size files (50MB)
- Unicode characters in filename

### 2. `/api/agent/runs` Tests (19 tests)
**File**: `src/__tests__/api/agent-runs.test.ts`

Tests for agent execution endpoint with authentication and rate limiting.

#### Test Coverage:

**Rate Limiting** (3 tests):
- Allowed requests within limit
- Rate limit exceeded rejection
- Rate limit headers in responses

**Authentication** (4 tests):
- IP-based identifier for anonymous users
- User-based identifier for authenticated users
- Auth service failure handling
- Higher limits for authenticated users

**Orchestrator Communication** (5 tests):
- Request forwarding to orchestrator
- Default URL handling
- Response passthrough
- Error response forwarding
- Rate limit headers in error responses

**Error Handling** (4 tests):
- Orchestrator unavailability (503)
- Helpful development error messages
- Network connection errors
- Malformed JSON handling

**Edge Cases** (3 tests):
- Empty request body
- Large payload handling
- Orchestrator timeout

## Running Tests

### All API Tests
```bash
npm run test:run -- src/__tests__/api/
```

### Specific Test File
```bash
npm run test:run -- src/__tests__/api/uploads.test.ts
npm run test:run -- src/__tests__/api/agent-runs.test.ts
```

### Watch Mode
```bash
npm test -- src/__tests__/api/
```

## Test Statistics

```
Test Files:  2 files
Tests:       38 tests
Duration:    ~6-7 seconds
Status:      ✅ All passing
```

## Mock Strategy

### Uploads Route
- **node:fs**: Mocked file system operations (mkdir, writeFile)
- Real file operations allowed for integration testing

### Agent Runs Route
- **@/lib/rate-limit**: Mocked rate limiting logic
- **@/lib/get-client-ip**: Mocked IP extraction
- **@/lib/auth**: Mocked authentication session
- **global.fetch**: Mocked orchestrator communication

## Key Features Tested

### `/api/uploads`
✅ File size validation (50MB limit)
✅ MIME type validation (CSV/TXT only)
✅ Extension validation (.csv, .txt)
✅ Filename sanitization
✅ Security: Special character filtering
✅ Error handling with helpful messages
✅ Timestamp-based unique filenames
✅ Unicode character handling

### `/api/agent/runs`
✅ Rate limiting (30/hr anonymous, 60/hr authenticated)
✅ Authentication integration (optional)
✅ IP-based vs user-based rate limiting
✅ Request forwarding to orchestrator
✅ Error response passthrough
✅ Service unavailability handling
✅ Rate limit headers (X-RateLimit-*)
✅ Retry-After header support

## Test Quality Metrics

### Coverage
- **Unit Tests**: All validation logic
- **Integration Tests**: Full request/response cycle
- **Error Scenarios**: Validation failures, service unavailability
- **Edge Cases**: Large files, empty data, unicode, timeouts

### Test Structure
- Consistent describe/it blocks
- Clear, descriptive test names
- Comprehensive mocking strategy
- Isolated tests (no dependencies)
- Fast execution (~150ms average per test)

## Benefits

### 1. Confidence ✅
- Catch validation bugs before production
- Safe refactoring of API routes
- Regression prevention for security checks
- Type safety validation

### 2. Documentation ✅
- Tests serve as API usage examples
- Clear request/response contracts
- Living documentation for developers
- Security requirements documented

### 3. Quality ✅
- Better API design
- Comprehensive error handling
- Security best practices enforced
- Edge case coverage

### 4. Velocity ✅
- Faster debugging
- Quick validation of changes
- Automated checks
- CI/CD ready

## Example Test Pattern

```typescript
describe('/api/uploads', () => {
  describe('POST - File validation', () => {
    it('should reject file exceeding size limit', async () => {
      const largeFile = new File([...], 'large.csv', { type: 'text/csv' })
      const formData = new FormData()
      formData.append('file', largeFile)

      const request = new Request('http://localhost:3000/api/uploads', {
        method: 'POST',
        body: formData,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(413)
      expect(data.error).toBe('payload_too_large')
    })
  })
})
```

## Security Testing

### File Upload Security
✅ Size limits enforced
✅ MIME type whitelist
✅ Extension whitelist
✅ Filename sanitization (special chars removed)
✅ No path traversal vulnerabilities
✅ Unicode character handling

### Rate Limiting Security
✅ Anonymous user limits enforced (30/hr)
✅ Authenticated user limits enforced (60/hr)
✅ IP-based tracking for anonymous
✅ User-based tracking for authenticated
✅ Rate limit headers exposed
✅ Retry-After header support

## CI/CD Integration

Tests are ready for CI/CD:

```yaml
# .github/workflows/test.yml
name: API Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:run -- src/__tests__/api/
```

## Debugging Tests

### Command Line
```bash
# Run specific test
npx vitest run -t "should reject file exceeding size limit"

# Run with verbose output
npm run test:run -- --reporter=verbose src/__tests__/api/

# Run single file
npx vitest run src/__tests__/api/uploads.test.ts
```

### VS Code
1. Set breakpoints in test files
2. Run "Debug Vitest Tests" configuration
3. Step through code and inspect variables

## Test Maintenance

### Adding New Tests
1. Create test file in `src/__tests__/api/`
2. Follow existing patterns (describe/it blocks)
3. Mock external dependencies
4. Test success + error scenarios
5. Include edge cases

### Updating Tests
- Update when API logic changes
- Keep tests aligned with implementation
- Maintain test coverage
- Update documentation

## Summary

**API Test Suite Status**: ✅ Fully Operational

- **38 tests** covering both API routes
- **100% pass rate**
- **2 test files** organized by route
- **Fast execution** (~6-7 seconds)
- **CI/CD ready**
- **Well documented**
- **Comprehensive mocking**
- **Security focused**

The API test suite provides confidence for:
- Safe deployments
- API contract stability
- Security validation
- Error handling verification
- Rate limiting enforcement

---

**Created**: January 2026
**Test Framework**: Vitest 4.0
**Status**: ✅ Complete and Operational
**Coverage**: File Uploads + Agent Runs Routes
