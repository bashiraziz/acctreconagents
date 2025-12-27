# Automated Testing Guide

## Overview

Rowshni includes a comprehensive automated testing framework that validates both reconciliation accuracy and AI agent behavior.

---

## Quick Start

### 1. Start the Orchestrator

```bash
cd services/orchestrator
npm run dev
```

The orchestrator must be running on `http://localhost:4100` (default).

### 2. Install Test Dependencies

```bash
cd tests
npm install
```

### 3. Run Tests

```bash
# From project root:
npm run test:scenarios              # Run all scenarios
npm run test:scenarios -- --verbose # Detailed output with AI validation
npm run test:watch                  # Watch mode

# Run specific scenarios:
npm run test:scenarios -- --scenario=09-multiple-variance-types
npm run test:scenarios -- --scenario=systematic
```

---

## What Gets Tested

### Reconciliation Accuracy ✅

For every scenario:
- **Variance amounts** match expected (±$0.01 tolerance)
- **Status** (balanced/variance) matches
- **Materiality flags** match
- **Account count** correct

### AI Agent Behavior ✅ (NEW!)

For variance scenarios (09, 10):

**Data Validation Agent**
- Appropriate confidence levels
- Relevant warnings

**Reconciliation Analyst Agent**
- Correct risk level
- Pattern recognition
- Material variance detection

**Variance Investigator Agent**
- Root cause keywords
- Process-level thinking (for systematic errors)
- Appropriate actions

**Report Generator Agent**
- Contains expected phrases
- Avoids "consider automation"
- Process-level language for systematic errors

---

## Test Output Examples

### Standard Output

```
🧪 Automated Scenario Testing Framework

Found 10 scenario(s) to test

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ 09-multiple-variance-types - PASSED (2.3s)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ 10-systematic-errors - PASSED (2.8s)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TEST SUMMARY
Total:    10 scenarios
Passed:   10 ✅
Failed:   0 ❌
Duration: 18234ms

✅ All tests passed!
```

### Verbose Output (with AI Validation)

```
✅ 10-systematic-errors - PASSED (2834ms)

Reconciliation Results:
  ✓ Account 2000 (2025-12)
     Expected: variance=46800, status=variance
     Actual:   variance=46800, status=variance
  ✓ Account 4100 (2025-12)
     Expected: variance=46000, status=variance
     Actual:   variance=46000, status=variance

AI Behavior Validation:
  Score: 82% (✅ PASSED)

  Checks:
    ✓ [Analysis Agent] Pattern: should mention SYSTEMATIC or PATTERN
      → Pattern detected
    ✓ [Investigation Agent] Root cause analysis for 2000
      → Found 5/7 keywords: systematic, pattern, techstaff, interface, week 4
    ✓ [Investigation Agent] Process-level thinking for 2000
      → Uses process-level language
    ✓ [Report Generator] Contains: "systematic"
      → Found in report
    ✓ [Report Generator] Avoids: "consider automation"
      → Correctly avoided
```

---

## Test Scenarios

| # | Scenario | Tests | AI Validation |
|---|----------|-------|---------------|
| 01 | simple-balanced | Basic reconciliation | Basic |
| 02 | material-variance | Duplicate detection | Basic |
| 03 | timing-differences | Period cutoff | Basic |
| 04 | roll-forward-multi-period | Multi-period | Basic |
| 05 | missing-subledger-data | Error handling | Basic |
| 06 | quickbooks-format | Format parsing | Basic |
| 07 | costpoint-format | Sign reversal | Basic |
| 08 | netsuite-format | Multi-currency | Basic |
| **09** | **multiple-variance-types** | **Individual variances** | **Advanced** ⭐ |
| **10** | **systematic-errors** | **Pattern detection** | **Advanced** ⭐ |

---

## AI Validation Scoring

### How It Works

1. **Each check** is pass/fail
2. **Score** = (passed / total) × 100
3. **Pass threshold**: 70%

### What's Checked

**Validation Agent** (15-20%)
- Confidence levels
- Warnings

**Analysis Agent** (25-30%)
- Risk level
- Pattern keywords
- Material variances

**Investigation Agent** (30-35%)
- Root cause keywords (≥50%)
- Process-level thinking
- Suggested actions

**Report Generator** (20-25%)
- Expected phrases (100%)
- Avoids inappropriate (100%)
- Critical phrases (≥50%)

---

## Configuration

### Environment Variables

```bash
ORCHESTRATOR_URL=http://localhost:4100  # Default
MATERIALITY_THRESHOLD=50                # Default
```

### Custom Settings

```bash
# Use different orchestrator
ORCHESTRATOR_URL=https://staging.example.com npm run test:scenarios

# Different materiality threshold
MATERIALITY_THRESHOLD=100 npm run test:scenarios
```

---

## Creating New Scenarios

### 1. Create Directory

```bash
mkdir data/scenarios/11-your-scenario
```

### 2. Add Files

Required:
- `gl_balance.csv`
- `subledger_balance.csv`
- `expected_results.json` ⚠️ **Critical!**

Optional:
- `transactions.csv`
- `README.md`

### 3. Define Expected Results

`expected_results.json`:

```json
{
  "scenario": "11-your-scenario",
  "description": "What this tests",
  "materiality_threshold": 50,
  "reconciliations": [
    {
      "account": "2000",
      "period": "2025-12",
      "variance": 0,
      "status": "balanced",
      "material": false
    }
  ],
  "gemini_agent_expectations": {
    "report": {
      "should_contain": ["in balance"],
      "should_not_contain": ["consider automation"]
    }
  }
}
```

### 4. Test It

```bash
npm run test:scenarios -- --scenario=11-your-scenario --verbose
```

---

## Troubleshooting

### ❌ Connection Refused

**Problem**: Orchestrator not running

**Fix**:
```bash
cd services/orchestrator
npm run dev
```

### ❌ Low AI Score

**Problem**: AI not using expected language

**Fixes**:
1. Run `--verbose` to see failed checks
2. Review `expected_results.json` keywords
3. Check agent prompts in `services/orchestrator/src/agents/gemini-agents.ts`
4. Adjust expectations if too strict

### ❌ Variance Mismatch

**Problem**: Amounts don't match

**Fixes**:
1. Check sign conventions (credits = negative)
2. Verify calculations in scenario README
3. Use 2 decimal places exactly
4. Check for rounding errors

---

## Files

### Core Files

- **`scenario-runner.ts`** - Main test orchestrator
- **`ai-behavior-validator.ts`** - AI output validation
- **`package.json`** - Dependencies and scripts

### New Files Created

- **Scenario 09**: `expected_results.json` - Individual variance testing
- **Scenario 10**: `expected_results.json` - Systematic error testing
- **This guide**: Testing documentation

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Test Scenarios

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install
        run: npm install && cd tests && npm install

      - name: Start orchestrator
        run: |
          cd services/orchestrator
          npm install && npm run dev &
          sleep 10

      - name: Test
        run: npm run test:scenarios
```

---

## Success Metrics

### Scenario Passes If:
✅ All reconciliations match expected
✅ AI score ≥ 70% (if expectations defined)
✅ No critical errors

### Scenario Fails If:
❌ Any reconciliation differs
❌ API error
❌ Test exception

---

## Next Steps

1. **Run your first test**:
   ```bash
   npm run test:scenarios -- --scenario=01
   ```

2. **Test variance scenarios**:
   ```bash
   npm run test:scenarios -- --scenario=09 --verbose
   npm run test:scenarios -- --scenario=10 --verbose
   ```

3. **Run full suite**:
   ```bash
   npm run test:scenarios
   ```

4. **Review results** and adjust as needed

---

## Questions?

See:
- **Scenario docs**: `data/scenarios/README.md`
- **Variance guide**: `data/scenarios/VARIANCE_ANALYSIS_GUIDE.md`
- **User guide**: `USER_GUIDE.md`
