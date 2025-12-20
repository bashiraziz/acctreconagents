# Automated Scenario Testing Framework

Automated test runner for reconciliation scenarios.

## Quick Start

### 1. Install Dependencies

```bash
cd tests
npm install
```

### 2. Start the Orchestrator

In a separate terminal:

```bash
cd services/orchestrator
npm run dev
```

Wait until you see: `Server listening on port 4100`

### 3. Run Tests

```bash
npm test
```

---

## Usage

### Run All Scenarios

```bash
npm test
```

Output:
```
🧪 Automated Scenario Testing Framework

Found 5 scenario(s) to test

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ 01-simple-balanced - PASSED (234ms)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ 02-material-variance - PASSED (189ms)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
...
```

### Run Specific Scenario

```bash
npm test -- --scenario=01-simple-balanced
```

or

```bash
npm test -- --scenario=material-variance
```

### Verbose Output

```bash
npm test -- --verbose
```

Shows detailed reconciliation comparisons for all tests.

### Run in Watch Mode

```bash
npm run test:watch
```

Automatically reruns tests when files change.

---

## How It Works

### Test Execution Flow

```
1. Load scenario data from data/scenarios/XX-name/
   ├── gl_balance.csv
   ├── subledger_balance.csv
   ├── transactions.csv (optional)
   └── expected_results.json

2. Parse CSV files → JSON

3. Send to orchestrator:
   POST http://localhost:4100/agent/runs
   {
     "userPrompt": "Reconcile scenario: XX-name",
     "payload": {
       "glBalances": [...],
       "subledgerBalances": [...],
       "transactions": [...]
     }
   }

4. Compare API response with expected_results.json:
   - Variance matches?
   - Status matches?
   - Materiality matches?

5. Generate test report
```

### Expected Results Format

Each scenario must have an `expected_results.json` file:

```json
{
  "scenario": "01-simple-balanced",
  "description": "Basic balanced reconciliation",
  "materiality_threshold": 50,
  "reconciliations": [
    {
      "account": "20100",
      "period": "2025-10",
      "glBalance": -1185000,
      "subledgerBalance": -1185000,
      "variance": 0,
      "status": "balanced",
      "material": false
    }
  ]
}
```

### Test Assertions

For each reconciliation, the framework validates:

| Field | Type | Comparison |
|-------|------|------------|
| `account` | string | Exact match |
| `period` | string | Exact match |
| `variance` | number | Within ±$0.01 |
| `status` | string | Exact match (`"balanced"`, `"immaterial_variance"`, `"material_variance"`) |
| `material` | boolean | Exact match |

---

## Configuration

### Environment Variables

Set these in `.env` or pass when running:

```bash
# Orchestrator URL (default: http://localhost:4100)
ORCHESTRATOR_URL=http://localhost:4100

# Materiality threshold in dollars (default: 50)
MATERIALITY_THRESHOLD=50
```

Example:
```bash
ORCHESTRATOR_URL=http://localhost:3001 npm test
```

---

## Exit Codes

- **0**: All tests passed ✅
- **1**: One or more tests failed ❌

Use in CI/CD:
```bash
npm test || echo "Tests failed!"
```

---

## Adding New Test Scenarios

1. Create scenario directory:
   ```bash
   mkdir data/scenarios/06-new-test
   ```

2. Add required files:
   ```
   06-new-test/
   ├── README.md                 # Scenario documentation
   ├── gl_balance.csv           # GL balances
   ├── subledger_balance.csv    # Subledger detail
   ├── transactions.csv         # (Optional) Transactions
   └── expected_results.json    # Expected outcomes
   ```

3. Run tests:
   ```bash
   npm test -- --scenario=06-new-test
   ```

---

## Troubleshooting

### Tests fail with "Cannot reach orchestrator"

**Problem:** Orchestrator service not running

**Solution:**
```bash
cd services/orchestrator
npm run dev
```

### Tests fail with variance mismatches

**Problem:** Calculation difference or wrong expected values

**Solution:**
1. Run with `--verbose` to see detailed comparison
2. Check expected_results.json matches actual calculations
3. Verify CSV data is correct

### "Reconciliation count mismatch"

**Problem:** Expected results don't match number of account+period combinations

**Solution:**
- Count unique account+period pairs in CSV files
- Update expected_results.json to include all reconciliations

### Scenario skipped with warning

**Problem:** Missing required files

**Solution:**
Ensure these files exist:
- `gl_balance.csv` (required)
- `subledger_balance.csv` (required)
- `expected_results.json` (required)
- `transactions.csv` (optional)

---

## Test Coverage

Current scenarios (5):

| Scenario | Purpose | Expected Result |
|----------|---------|-----------------|
| 01-simple-balanced | Basic balanced reconciliation | All accounts balanced |
| 02-material-variance | Duplicate invoice detection | Material variance detected |
| 03-timing-differences | Wrong period posting | Timing variance |
| 04-roll-forward-multi-period | Multi-period roll-forward | 6-month progression |
| 05-missing-subledger-data | Missing subledger support | Critical variance |

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Scenario Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
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

      - name: Wait for orchestrator
        run: sleep 5

      - name: Run tests
        run: cd tests && npm test
```

---

## Future Enhancements

- [ ] JSON test report export
- [ ] HTML test report generation
- [ ] Performance benchmarking
- [ ] Parallel test execution
- [ ] Code coverage tracking
- [ ] Integration with Jest/Vitest
- [ ] Screenshot comparison for UI tests

---

## Related Documentation

- [Testing Guide](../data/scenarios/TESTING_GUIDE.md) - Manual testing guide
- [Scenario Summary](../data/scenarios/SCENARIO_SUMMARY.md) - Scenario descriptions
- [Data Dictionary](../specs/data-dictionary.md) - Field definitions
- [Reconciliation Logic](../specs/reconciliation-logic.md) - Algorithm docs
