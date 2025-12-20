# Testing Framework Overview

Comprehensive automated testing system for reconciliation scenarios.

## Quick Start

```bash
# Install test dependencies
cd tests && npm install

# Start orchestrator (in separate terminal)
cd services/orchestrator && npm run dev

# Run all tests
npm test

# Run specific scenario
npm test -- --scenario=01-simple-balanced

# Verbose output
npm test -- --verbose
```

---

## What's Included

### 1. Automated Test Runner

**Location:** `tests/scenario-runner.ts`

Features:
- ✅ Automatically discovers all scenarios in `data/scenarios/`
- ✅ Parses CSV files and converts to JSON
- ✅ Calls orchestrator API with scenario data
- ✅ Compares actual vs expected results
- ✅ Generates pass/fail reports
- ✅ Supports filtering by scenario name
- ✅ Verbose mode for detailed output
- ✅ Watch mode for continuous testing

### 2. Test Data Validation

Each scenario includes:
- `gl_balance.csv` - GL control balances
- `subledger_balance.csv` - Subledger detail
- `transactions.csv` - Transaction activity (optional)
- `expected_results.json` - Expected outcomes

### 3. Test Assertions

For each reconciliation, validates:
| Field | Comparison |
|-------|------------|
| Account | Exact match |
| Period | Exact match |
| Variance | Within ±$0.01 |
| Status | Exact match |
| Material | Boolean match |

---

## File Structure

```
acctreconagents/
├── tests/
│   ├── scenario-runner.ts    # Main test runner (TypeScript)
│   ├── run-tests.sh          # Quick bash script version
│   ├── package.json          # Test dependencies
│   └── README.md             # Test documentation
│
├── data/scenarios/
│   ├── 01-simple-balanced/
│   │   ├── gl_balance.csv
│   │   ├── subledger_balance.csv
│   │   ├── transactions.csv
│   │   ├── expected_results.json
│   │   └── README.md
│   ├── 02-material-variance/
│   ├── 03-timing-differences/
│   ├── 04-roll-forward-multi-period/
│   └── 05-missing-subledger-data/
│
└── specs/
    ├── data-dictionary.md       # Field definitions
    └── reconciliation-logic.md  # Algorithm documentation
```

---

## Running Tests

### From Root Directory

```bash
npm test                  # Run all scenarios
npm run test:verbose      # Verbose output
npm run test:watch        # Watch mode
```

### From Tests Directory

```bash
cd tests
npm test                         # All scenarios
npm test -- --scenario=balanced  # Filter by name
npm test -- --verbose            # Detailed output
```

### Using Bash Script (No npm install)

```bash
cd tests
chmod +x run-tests.sh
./run-tests.sh                   # All scenarios
./run-tests.sh 01-simple         # Filter by name
VERBOSE=true ./run-tests.sh      # Verbose output
```

---

## Test Output

### Success

```
🧪 Automated Scenario Testing Framework

Orchestrator URL: http://localhost:4100
Materiality Threshold: $50

Found 5 scenario(s) to test

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ 01-simple-balanced - PASSED (234ms)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ 02-material-variance - PASSED (189ms)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
...

════════════════════════════════════════════════════════════════════════════════
TEST SUMMARY
════════════════════════════════════════════════════════════════════════════════
Total:    5 scenarios
Passed:   5 ✅
Failed:   0 ❌
Duration: 1256ms
════════════════════════════════════════════════════════════════════════════════

✅ All tests passed!
```

### Failure (with verbose)

```
❌ 02-material-variance - FAILED (189ms)

Reconciliation Results:
  ✓ Account 20100 (2025-10)
     Expected: variance=100000, status=material_variance
     Actual:   variance=100000, status=material_variance
  ✗ Account 22010 (2025-10)
     Expected: variance=0, status=balanced
     Actual:   variance=15000, status=material_variance

Errors:
  ❌ Variance mismatch for 22010: expected 0, got 15000
  ❌ Status mismatch for 22010: expected "balanced", got "material_variance"
```

---

## Adding New Scenarios

1. **Create scenario directory:**
   ```bash
   mkdir data/scenarios/06-new-test
   ```

2. **Add CSV files:**
   ```bash
   touch data/scenarios/06-new-test/gl_balance.csv
   touch data/scenarios/06-new-test/subledger_balance.csv
   touch data/scenarios/06-new-test/transactions.csv  # optional
   ```

3. **Create expected results:**
   ```json
   {
     "scenario": "06-new-test",
     "description": "Test description",
     "materiality_threshold": 50,
     "reconciliations": [
       {
         "account": "20100",
         "period": "2025-10",
         "glBalance": -1000000,
         "subledgerBalance": -1000000,
         "variance": 0,
         "status": "balanced",
         "material": false
       }
     ]
   }
   ```

4. **Run test:**
   ```bash
   npm test -- --scenario=06-new-test
   ```

---

## CI/CD Integration

### GitHub Actions

```yaml
name: Reconciliation Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: |
          cd services/orchestrator && npm install
          cd ../../tests && npm install

      - name: Start orchestrator
        run: cd services/orchestrator && npm run dev &
        env:
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}

      - name: Wait for service
        run: sleep 5

      - name: Run tests
        run: npm test
```

### Exit Codes

- **0**: All tests passed
- **1**: One or more tests failed

---

## Configuration

### Environment Variables

```bash
# Orchestrator URL
ORCHESTRATOR_URL=http://localhost:4100

# Materiality threshold
MATERIALITY_THRESHOLD=50
```

Example:
```bash
MATERIALITY_THRESHOLD=100 npm test
```

---

## Test Coverage

Current scenarios: **5**

| Scenario | Description | Key Feature |
|----------|-------------|-------------|
| 01-simple-balanced | Perfect reconciliation | Baseline validation |
| 02-material-variance | Duplicate invoice | Variance detection |
| 03-timing-differences | Wrong period posting | Timing analysis |
| 04-roll-forward-multi-period | 6-month progression | Multi-period calc |
| 05-missing-subledger-data | Missing GL support | Critical variance |

---

## Troubleshooting

### Cannot reach orchestrator

**Symptom:** Tests fail immediately

**Fix:**
```bash
cd services/orchestrator
npm run dev
```

Wait for: `Server listening on port 4100`

### Variance mismatches

**Symptom:** Test shows different variance than expected

**Fix:**
1. Run with `--verbose` flag
2. Check CSV data format (amounts should be numbers, not strings)
3. Verify sign conventions (liabilities should be negative)
4. Update expected_results.json if reconciliation logic changed

### Scenario skipped

**Symptom:** "Skipping XX-name: Missing file"

**Fix:** Ensure these files exist:
- `gl_balance.csv` ✅
- `subledger_balance.csv` ✅
- `expected_results.json` ✅

---

## Future Enhancements

- [ ] JSON/HTML test reports
- [ ] Performance benchmarking
- [ ] Parallel test execution
- [ ] Code coverage tracking
- [ ] Integration with Jest/Vitest
- [ ] API mocking for offline testing
- [ ] Test data generators

---

## Related Documentation

- [Test Runner README](../tests/README.md) - Detailed test docs
- [Data Dictionary](../specs/data-dictionary.md) - Field definitions
- [Reconciliation Logic](../specs/reconciliation-logic.md) - Algorithm docs
- [Testing Guide](../data/scenarios/TESTING_GUIDE.md) - Manual testing
- [Scenario Summary](../data/scenarios/SCENARIO_SUMMARY.md) - Scenario catalog
