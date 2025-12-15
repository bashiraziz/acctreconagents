# Scenario 03: Timing Differences - Period Cutoff Error

## Purpose
Test reconciliation where transactions are recorded in the wrong accounting period, causing a timing difference between GL and subledger.

## Scenario Description
This represents a common month-end cutoff error where:
- An October invoice was recorded in the AP subledger in October (correct)
- But the GL entry was accidentally dated November (wrong period)
- This creates a timing difference requiring investigation

## Accounting Period
**October 2025 (2025-10)**

## The Error

**Invoice INV-77845 from Tech Solutions:**
- **Amount**: $180,000
- **Invoice Date**: October 28, 2025
- **Received in AP**: October 29, 2025 (entered in subledger as October)
- **GL Entry Date**: November 2, 2025 (wrong - entered as November transaction)

**Result**: October subledger includes the invoice, but October GL does not.

## Beginning Balances (Sep 30, 2025)
| Account | Account Name               | Opening Balance |
|---------|---------------------------|-----------------|
| 20100   | Accounts Payable Control  | -$750,000       |
| 22010   | Accrued Expenses          | -$150,000       |

## October 2025 Activity

### Invoices Received (AP Subledger)
| Date       | Vendor            | Invoice    | Amount      | GL Posted | Subledger Period | GL Period |
|------------|------------------|------------|-------------|-----------|------------------|-----------|
| 2025-10-05 | Global Staffing  | INV-55490  | -$335,000   | Oct 5     | 2025-10          | 2025-10   |
| 2025-10-15 | Northwind Comp.  | INV-45021  | -$420,000   | Oct 15    | 2025-10          | 2025-10   |
| 2025-10-28 | Tech Solutions   | INV-77845  | -$180,000   | Nov 2 ❌  | 2025-10          | 2025-11   |

### Payments Made
| Date       | Vendor           | Check #  | Amount    | Description              |
|------------|------------------|----------|-----------|--------------------------|
| 2025-10-10 | Acme Corp        | CHK-9001 | +$150,000 | Payment for Sep invoice  |
| 2025-10-20 | Bolt Industries  | CHK-9002 | +$200,000 | Payment for Sep invoice  |

### Accruals
| Date       | Description      | Amount      | Account | Notes                    |
|------------|------------------|-------------|---------|--------------------------|
| 2025-10-31 | Accrued Payroll  | -$35,000    | 22010   | Oct payroll accrual      |

## Expected Balances

### GL Balance (October 2025) - Missing Nov-dated entry
| Account | Ending Balance | Calculation                                           |
|---------|----------------|-------------------------------------------------------|
| 20100   | -$1,005,000    | -750k - 335k - 420k + 150k + 200k = -1,005k          |
| 22010   | -$185,000      | -150k - 35k = -185k                                  |

**Note**: GL does NOT include the -$180k Tech Solutions invoice (posted in Nov)

### Subledger Balance (October 2025) - Includes all Oct invoices
| Account | Ending Balance | Calculation                                           |
|---------|----------------|-------------------------------------------------------|
| 20100   | -$1,185,000    | -400k (prior) + (-335k - 420k - 180k) + (150k + 200k)|
| 22010   | -$185,000      | -150k - 35k = -185k                                  |

**Note**: Subledger INCLUDES the -$180k Tech Solutions invoice (received in Oct)

## Expected Reconciliation Results

### Account 20100 (Has Timing Difference)
- **GL Balance**: -$1,005,000
- **Subledger Balance**: -$1,185,000
- **Variance**: **+$180,000** (subledger higher than GL)
- **Status**: ⚠️ Material Variance
- **Root Cause**: Timing difference - invoice dated in wrong period
- **Resolution**: Either reclassify GL entry to October OR accrue in October

### Account 22010 (Balanced)
- **GL Balance**: -$185,000
- **Subledger Balance**: -$185,000
- **Variance**: $0
- **Status**: ✅ Balanced

## Transaction Detail

See `transactions.csv` for complete activity log showing:
- All invoices received with posting dates
- All payments made
- All accruals
- The problematic Nov-dated GL entry

## Agent Expected Behavior

### Validation Agent
- Should mark as valid (data is structurally correct)
- May warn: "Period cutoff issue detected"
- Confidence: 0.7-0.8

### Analysis Agent
- **Risk level**: MEDIUM
- **Material variances**: 1 (Account 20100)
- **Patterns**: "Timing difference detected", "Period-end cutoff issue"
- **Overall health**: 60-75%

### Investigation Agent
Should identify:
- **Account**: 20100
- **Variance**: +$180,000
- **Possible Causes**:
  - "Timing difference - transaction recorded in wrong period"
  - "Invoice INV-77845 recorded in subledger Oct but GL Nov"
  - "Period cutoff error at month-end"
  - "Accrual may be required if invoice received before Oct 31"
- **Suggested Actions**:
  - "Review GL transaction dates for INV-77845"
  - "Verify invoice received date vs GL posting date"
  - "If received in October, reclassify GL entry from Nov to Oct"
  - "Alternative: Accrue $180k in October, reverse in November"
  - "Implement period cutoff controls to prevent future occurrences"

### Report Agent
Should state:
- "Material variance of $180,000 identified in Account 20100"
- "Investigation reveals timing difference between GL and subledger"
- "Invoice INV-77845 recorded in different periods"
- "Recommend period cutoff review and corrective entry"

## Resolution Steps

### Option 1: Reclassify GL Entry (Preferred if error)
1. Review original invoice date: Oct 28, 2025
2. Confirm invoice was received in October
3. Journal entry to reclassify:
   - **Debit**: AP (Nov) +$180,000
   - **Credit**: AP (Oct) -$180,000
4. Re-run reconciliation - should now balance

### Option 2: Accrual (If invoice legitimately Nov)
1. If invoice actually received Nov 2, subledger should be Nov
2. Update subledger: Move INV-77845 from Oct to Nov
3. Re-run reconciliation - should now balance

## Test Assertions
```javascript
assert(reconciliation[0].variance === 180000, "Account 20100 should have $180k variance")
assert(reconciliation[0].status === "material_variance", "Should flag as material")
assert(investigation.investigations[0].possibleCauses.some(c =>
  c.toLowerCase().includes("timing") || c.toLowerCase().includes("period")),
  "Should identify timing/period issue")
assert(investigation.investigations[0].suggestedActions.some(a =>
  a.toLowerCase().includes("reclassify") || a.toLowerCase().includes("accrue")),
  "Should suggest reclassification or accrual")
```

## Lessons Learned

### Common Causes of Timing Differences:
1. **Period cutoff errors**: Transactions dated after month-end but for current month
2. **Accrual failures**: Not accruing for goods/services received but not invoiced
3. **Manual entry errors**: Wrong date entered in GL system
4. **System delays**: AP system posts faster than GL system
5. **Backdating**: Adjusting transaction dates after-the-fact

### Prevention:
- Implement period cutoff procedures
- Daily reconciliation of AP posting dates
- Automated date validation in GL system
- Clear communication between AP and accounting teams
- Review all transactions around month-end (Oct 28-Nov 5)
