# Testing Guide: How to Use the Test Scenarios

## Quick Start

### 1. Start the Services

**Terminal 1 - Orchestrator:**
```bash
cd services/orchestrator
npm run dev
```

**Terminal 2 - Web App:**
```bash
cd apps/web
npm run dev
```

**Access**: Open browser to `http://localhost:3000` or `http://localhost:3100`

---

## Testing Scenario 01: Simple Balanced

### Goal
Verify basic reconciliation works and returns $0 variance.

### Steps

1. **Navigate to Upload Section**
   - Go to "Upload & Map Data" section

2. **Upload Files**
   - Upload `data/scenarios/01-simple-balanced/gl_balance.csv` as **GL Balance**
   - Upload `data/scenarios/01-simple-balanced/subledger_balance.csv` as **Subledger Balance**
   - (Optional) Upload `data/scenarios/01-simple-balanced/transactions.csv` as **Transactions**

3. **Map Columns**
   - Click "Auto-Suggest Mappings" button
   - Verify all columns mapped correctly:
     - `account_code` → `account_code`
     - `period` → `period`
     - `amount` → `amount`
   - Click "Apply Mappings"

4. **Run Reconciliation**
   - Scroll to "Multi-agent console"
   - Click "🤖 Run Agents"
   - Wait for completion (watch timeline)

5. **Verify Results**

   **Timeline Should Show:**
   - ✅ Data Upload
   - ✅ Local Reconciliation - COMPLETED
   - ✅ Gemini Agents Complete - COMPLETED

   **Expected Output:**
   ```
   Account 20100:
   - GL Balance: -$1,185,000
   - Subledger Balance: -$1,185,000
   - Variance: $0
   - Status: Balanced ✅

   Account 22010:
   - GL Balance: -$215,000
   - Subledger Balance: -$215,000
   - Variance: $0
   - Status: Balanced ✅
   ```

   **Gemini Agent Results:**
   - Validation: High confidence (>90%), no warnings
   - Analysis: Risk Level = LOW, 0 material variances
   - Investigation: "No material variances to investigate"
   - Report: Should state "In balance", "No corrective actions required"

---

## Testing Scenario 02: Duplicate Invoice

### Goal
Verify system detects duplicate invoice and suggests corrective action.

### Steps

1. **Clear Previous Data**
   - Click "Clear All" in Active Files section

2. **Upload Files**
   - Upload `data/scenarios/02-material-variance/gl_balance.csv`
   - Upload `data/scenarios/02-material-variance/subledger_balance.csv`

3. **Map & Run**
   - Auto-suggest mappings
   - Apply mappings
   - Run agents

4. **Verify Results**

   **Expected Output:**
   ```
   Account 20100:
   - GL Balance: -$1,185,000
   - Subledger Balance: -$1,460,000 (includes duplicate!)
   - Variance: +$275,000
   - Status: Material Variance ⚠️

   Account 22010:
   - GL Balance: -$215,000
   - Subledger Balance: -$215,000
   - Variance: $0
   - Status: Balanced ✅
   ```

   **Gemini Agent Results:**
   - Validation: Should flag potential duplicate
   - Analysis: Risk Level = MEDIUM/HIGH, 1 material variance
   - Investigation: Should identify duplicate invoice INV-99302
   - Possible Causes: "Duplicate invoice entry", "Same vendor/amount"
   - Suggested Actions: "Review subledger for duplicate", "Reverse duplicate entry"
   - Report: Should recommend corrective action

---

## Testing Scenario 03: Timing Differences

### Goal
Verify system identifies period cutoff errors using transaction detail.

### Steps

1. **Clear & Upload**
   - Clear previous files
   - Upload `data/scenarios/03-timing-differences/gl_balance.csv`
   - Upload `data/scenarios/03-timing-differences/subledger_balance.csv`
   - **Important**: Upload `data/scenarios/03-timing-differences/transactions.csv`

2. **Map Columns**
   - **For transactions.csv**, map:
     - `account_code` → `account_code`
     - `booked_at` → `booked_at`
     - `debit` → `debit`
     - `credit` → `credit`
     - `amount` → `amount`
     - `narrative` → `narrative`
     - `source_period` → `source_period`

3. **Run & Verify**

   **Expected Output:**
   ```
   Account 20100:
   - GL Balance: -$1,005,000 (missing Oct invoice!)
   - Subledger Balance: -$1,185,000 (includes all Oct invoices)
   - Variance: +$180,000
   - Status: Material Variance ⚠️
   ```

   **Gemini Agent Results:**
   - Should detect timing/period issue
   - Should mention invoice INV-77845
   - Should suggest reclassification or accrual
   - Should reference the Nov-dated GL entry visible in transactions

4. **Review Transaction File**
   - Look for the transaction with narrative mentioning "POSTED IN NOV - SHOULD BE OCT"
   - This is the smoking gun!

---

## Testing Scenario 04: Multi-Period Roll-Forward

### Goal
Verify multi-period reconciliation and roll-forward calculations across 3 months.

### Steps

1. **Clear & Upload**
   - Clear previous files
   - Upload `data/scenarios/04-roll-forward-multi-period/gl_balance.csv`
     - Note: Contains **3 periods** (Aug, Sep, Oct) for 2 accounts = 6 rows
   - Upload `data/scenarios/04-roll-forward-multi-period/subledger_balance.csv`
   - **Upload transactions file** to see complete 3-month activity

2. **Run & Verify**

   **Expected Output:**
   ```
   All 6 account-period combinations should show $0 variance:

   August 2025:
   - 20100: Variance $0 ✅
   - 22010: Variance $0 ✅

   September 2025:
   - 20100: Variance $0 ✅
   - 22010: Variance $0 ✅

   October 2025:
   - 20100: Variance $0 ✅
   - 22010: Variance $0 ✅
   ```

   **Gemini Agent Results:**
   - Should recognize multi-period dataset
   - Should mention "3 periods" or "quarterly reconciliation"
   - Risk Level = LOW
   - Should highlight clean roll-forward

3. **Review Roll-Forward**
   - Check that Sep opening = Aug closing
   - Check that Oct opening = Sep closing
   - Transaction file shows complete audit trail for all 3 months

---

## Testing Scenario 05: Missing Subledger Data (CRITICAL)

### Goal
Verify system flags critical data integrity issues and emphasizes urgency.

### Steps

1. **Clear & Upload**
   - Upload `data/scenarios/05-missing-subledger-data/gl_balance.csv`
   - Upload `data/scenarios/05-missing-subledger-data/subledger_balance.csv` (incomplete!)
   - **Upload transactions** to reveal the manual journal entry

2. **Run & Verify**

   **Expected Output:**
   ```
   Account 20100:
   - GL Balance: -$1,185,000
   - Subledger Balance: -$800,000 (MISSING $385k!)
   - Variance: -$385,000
   - Status: Material Variance 🔴 CRITICAL
   ```

   **Gemini Agent Results:**
   - Should flag as **HIGH RISK** or **CRITICAL**
   - Should detect missing subledger data
   - Should identify manual journal entry as possible cause
   - Should mention JE-2025-1045 (visible in transactions file)
   - Should emphasize **URGENCY**
   - Should state "cannot close month" or similar blocker language
   - Needs Manual Review: TRUE

3. **Review Transaction File**
   - Find the Oct 25 entry: "JE-2025-1045 - Manual accrual for construction project (NO AP INVOICE!)"
   - This is the $385k that's missing from subledger

4. **Verify Severity**
   - Report should emphasize this is a month-end blocker
   - Should recommend immediate investigation
   - Different tone than other scenarios (more urgent)

---

## Common Testing Patterns

### Test Agent Behavior

**For Each Scenario:**

1. **Check Validation Agent**
   - Confidence score appropriate?
   - Warnings/errors match expected?

2. **Check Analysis Agent**
   - Risk level correct?
   - Material variances identified?
   - Patterns detected?

3. **Check Investigation Agent**
   - Possible causes make sense?
   - Suggested actions actionable?
   - Confidence level appropriate?
   - Needs manual review flagged correctly?

4. **Check Report Agent**
   - Clear, readable markdown?
   - Appropriate severity/urgency?
   - Actionable recommendations?

### Compare to Expected Results

Each scenario has `expected_results.json` - compare actual to expected:

```javascript
// Check variance
assert(actual.variance === expected.variance)

// Check status
assert(actual.status === expected.status)

// Check agent behavior
assert(actual.riskLevel === expected.riskLevel)
```

---

## Troubleshooting

### Problem: All subledger balances show $0

**Cause**: Missing `period` field in subledger CSV

**Fix**: Ensure subledger_balance.csv has `period` column and it's mapped

### Problem: Gemini agents return null

**Cause**: Gemini API key not initialized

**Fix**:
1. Check `services/orchestrator/.env` has `GEMINI_API_KEY`
2. Restart orchestrator service
3. Check orchestrator logs for "✅ Gemini client initialized successfully"

### Problem: Variances doubling up

**Cause**: Sign convention issue

**Fix**: Ensure liability accounts (20100, 22010) have **negative** amounts

### Problem: Can't find transaction details

**Cause**: Transactions file not uploaded or mapped

**Fix**:
1. Upload the transactions.csv file
2. Map all columns (especially booked_at, debit, credit, narrative)
3. Re-run reconciliation

---

## Advanced Testing

### Test Performance
- Use Scenario 04 (multi-period) for performance testing
- Larger dataset with 6 reconciliations
- Complete transaction log

### Test Error Handling
- Upload invalid CSV (wrong format)
- Upload mismatched periods
- Skip required field mapping
- Verify friendly error messages

### Test Edge Cases
- Single transaction
- Very large amounts
- Zero amounts
- Missing fields (after validation)

---

## Automated Testing (Future)

### Unit Tests
```javascript
describe('Scenario 01 - Simple Balanced', () => {
  it('should return zero variance', () => {
    const result = runReconciliation(scenario01Data)
    expect(result.variance).toBe(0)
  })

  it('should show balanced status', () => {
    const result = runReconciliation(scenario01Data)
    expect(result.status).toBe('balanced')
  })
})
```

### Integration Tests
```bash
npm run test:scenarios
```

This would:
1. Load each scenario automatically
2. Run reconciliation
3. Assert results match expected_results.json
4. Report pass/fail for each scenario

---

## Test Reporting

### Create Test Report

After testing each scenario, document:

| Scenario | Expected | Actual | Pass/Fail | Notes |
|----------|----------|--------|-----------|-------|
| 01 | $0 variance | $0 | ✅ PASS | - |
| 02 | $275k variance | $275k | ✅ PASS | Duplicate detected |
| 03 | $180k variance | $180k | ✅ PASS | Timing issue found |
| 04 | All balanced | All $0 | ✅ PASS | Roll-forward OK |
| 05 | $385k variance | $385k | ✅ PASS | Critical flagged |

---

## Next Steps After Testing

1. **Create More Scenarios**
   - Use existing scenarios as templates
   - Add scenarios for your specific business needs

2. **Customize Agent Prompts**
   - Adjust agent prompts in `services/orchestrator/src/agents/gemini-agents.ts`
   - Tailor to your industry/accounting practices

3. **Build Automated Tests**
   - Set up Jest/Vitest
   - Automate scenario testing
   - CI/CD integration

4. **Production Data**
   - Test with anonymized real data
   - Create scenarios from actual month-end issues you've encountered

---

## Questions?

- Review README.md in each scenario folder
- Check SCENARIO_SUMMARY.md for quick reference
- See DOCUMENTATION_STANDARDS.md for creating new scenarios
