# Scenario 04: Multi-Period Roll-Forward

## Purpose
Test multi-period reconciliation showing how account balances roll forward from month to month, verifying: **Opening Balance + Activity = Closing Balance**

## Scenario Description
This represents a complete quarterly reconciliation where:
- Account 20100 (Accounts Payable) reconciled for 3 months: Aug, Sep, Oct 2025
- Each month's closing balance becomes next month's opening balance
- All activity is tracked via detailed transactions
- Demonstrates clean roll-forward with no variances

## Accounting Periods
**Q3 2025: August, September, October**

## Roll-Forward Formula
```
Closing Balance = Opening Balance + Credits (new invoices) - Debits (payments)
```

For Accounts Payable (Liability):
- **Opening Balance**: Prior month's closing (negative)
- **New Invoices**: Credits (negative = increase liability)
- **Payments**: Debits (positive = decrease liability)
- **Closing Balance**: Should match GL

## Account Activity Summary

### Account 20100 - Accounts Payable Control

#### August 2025
- **Opening Balance** (Aug 1): -$500,000
- **Activity**:
  - New invoices: -$450,000
  - Payments: +$300,000
- **Net Activity**: -$150,000
- **Closing Balance** (Aug 31): -$650,000

#### September 2025
- **Opening Balance** (Sep 1): -$650,000 (= Aug closing)
- **Activity**:
  - New invoices: -$520,000
  - Payments: -$350,000
- **Net Activity**: -$170,000
- **Closing Balance** (Sep 30): -$820,000

#### October 2025
- **Opening Balance** (Oct 1): -$820,000 (= Sep closing)
- **Activity**:
  - New invoices: -$755,000
  - Payments: +$390,000
- **Net Activity**: -$365,000
- **Closing Balance** (Oct 31): -$1,185,000

### Account 22010 - Accrued Expenses

#### August 2025
- **Opening Balance** (Aug 1): -$120,000
- **Activity**: -$15,000 (new accruals)
- **Closing Balance** (Aug 31): -$135,000

#### September 2025
- **Opening Balance** (Sep 1): -$135,000
- **Activity**: -$15,000
- **Closing Balance** (Sep 30): -$150,000

#### October 2025
- **Opening Balance** (Oct 1): -$150,000
- **Activity**: -$35,000
- **Closing Balance** (Oct 31): -$185,000

## Detailed Transaction Log

See `transactions.csv` for complete activity including:
- Every invoice received with dates and amounts
- Every payment made with check numbers
- Every accrual entry
- Organized by period for roll-forward analysis

## Expected GL Balances (Month-End)

| Period  | Account | Opening    | Activity   | Closing      |
|---------|---------|------------|------------|--------------|
| 2025-08 | 20100   | -$500,000  | -$150,000  | -$650,000    |
| 2025-09 | 20100   | -$650,000  | -$170,000  | -$820,000    |
| 2025-10 | 20100   | -$820,000  | -$365,000  | -$1,185,000  |
| 2025-08 | 22010   | -$120,000  | -$15,000   | -$135,000    |
| 2025-09 | 22010   | -$135,000  | -$15,000   | -$150,000    |
| 2025-10 | 22010   | -$150,000  | -$35,000   | -$185,000    |

## Expected Subledger Balances

**Account 20100** - Shows all **unpaid** invoices at each month-end

**August 31:**
- Unpaid invoices: -$650,000
- Total: -$650,000

**September 30:**
- Unpaid invoices: -$820,000
- Total: -$820,000

**October 31:**
- Unpaid invoices: -$1,185,000
- Total: -$1,185,000

**Account 22010** - Shows all accruals at each month-end

**August 31:** -$135,000
**September 30:** -$150,000
**October 31:** -$185,000

## Expected Reconciliation Results

### All Periods Should Balance

**August 2025:**
- 20100: Variance $0 ✅
- 22010: Variance $0 ✅

**September 2025:**
- 20100: Variance $0 ✅
- 22010: Variance $0 ✅

**October 2025:**
- 20100: Variance $0 ✅
- 22010: Variance $0 ✅

## Roll-Forward Verification

The system should verify:

1. **Opening Balance Continuity:**
   - Sep opening = Aug closing ✅
   - Oct opening = Sep closing ✅

2. **Activity Reconciliation:**
   - Sum of transactions = Net activity ✅
   - Net activity = Closing - Opening ✅

3. **Period Consistency:**
   - No gaps in period sequence ✅
   - All transactions allocated to correct period ✅

## Agent Expected Behavior

### Validation Agent
- Should validate data across all 3 periods
- Confidence score: > 0.9 (clean data)
- No warnings or errors
- Should note: "Multi-period data set detected"

### Analysis Agent
- **Risk level**: LOW
- **Material variances**: 0 across all periods
- **Patterns**: "Consistent month-over-month activity"
- **Overall health**: 95-100%
- Should highlight: "Clean roll-forward across 3 periods"

### Investigation Agent
- Should return: "No material variances to investigate"
- May note: "All periods reconcile successfully"

### Report Agent
Should state:
- "Multi-period reconciliation complete for Aug-Oct 2025"
- "All accounts balanced across all periods"
- "Opening balances roll forward correctly"
- "No corrective actions required"

Should include roll-forward table showing:
- Period-over-period movement
- Opening → Activity → Closing for each month
- Verification that closing = next month's opening

## Test Assertions

```javascript
// Test all periods balance
assert(reconciliations.every(r => r.variance === 0), "All periods should be balanced")
assert(reconciliations.every(r => r.status === "balanced"), "All should show balanced status")

// Test roll-forward continuity
const periods = ['2025-08', '2025-09', '2025-10']
for (let i = 0; i < periods.length - 1; i++) {
  const currentClosing = reconciliations.find(r =>
    r.account === '20100' && r.period === periods[i]
  ).glBalance

  const nextOpening = rollForward.find(r =>
    r.account === '20100' && r.period === periods[i+1]
  ).opening

  assert(currentClosing === nextOpening,
    `${periods[i]} closing should equal ${periods[i+1]} opening`)
}

// Test activity calculation
reconciliations.forEach(rec => {
  const rf = rollForward.find(r =>
    r.account === rec.account && r.period === rec.period
  )
  assert(rf.closing === rf.opening + rf.activity,
    "Closing = Opening + Activity")
})
```

## Use Cases

This scenario demonstrates:

1. **Quarterly Reconciliation**: How to reconcile 3 months at once
2. **Roll-Forward Analysis**: Verifying period-to-period continuity
3. **Activity Tracking**: Complete transaction audit trail
4. **Opening Balance Validation**: Ensuring no gaps or breaks in roll-forward
5. **Multi-Period Reporting**: Comprehensive reconciliation across time

## Files in This Scenario

- `README.md` - This file
- `gl_balance.csv` - GL balances for all 3 periods
- `subledger_balance.csv` - Subledger details at each month-end
- `transactions.csv` - **Complete transaction log for all 3 months**
- `expected_results.json` - Expected reconciliation for all periods

## Notes

- This is a "perfect" scenario with no errors
- Useful for testing multi-period logic
- Validates roll-forward calculations
- Tests that opening balances properly carry forward
- Demonstrates how to track activity across quarters
