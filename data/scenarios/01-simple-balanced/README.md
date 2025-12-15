# Scenario 01: Simple Balanced Reconciliation

## Purpose
Test basic reconciliation where GL and subledger perfectly match with no variances.

## Scenario Description
This represents a clean reconciliation at month-end where:
- All subledger invoices are properly recorded in GL
- No timing differences
- No missing or duplicate entries
- All amounts match exactly

## Accounting Period
**October 2025 (2025-10)**

## Beginning Balances (Sep 30, 2025)
| Account | Account Name               | Opening Balance |
|---------|---------------------------|-----------------|
| 20100   | Accounts Payable Control  | -$850,000       |
| 22010   | Accrued Expenses          | -$180,000       |

## Activity During October 2025

### New Invoices Received
| Date       | Vendor                | Invoice    | Amount      | Account | Description           |
|------------|----------------------|------------|-------------|---------|----------------------|
| 2025-10-05 | Global Staffing      | INV-55490  | -$335,000   | 20100   | Contract labor       |
| 2025-10-15 | Northwind Components | INV-45021  | -$420,000   | 20100   | Raw materials        |

### Payments Made
| Date       | Vendor           | Check #  | Amount    | Account | Description              |
|------------|------------------|----------|-----------|---------|-------------------------|
| 2025-10-10 | TruVista Logistics| CHK-8901 | +$155,000 | 20100   | Payment for prior period|
| 2025-10-20 | Radius Labs      | CHK-8902 | +$275,000 | 20100   | Payment for prior period|

### Accruals
| Date       | Description      | Amount      | Account | Notes                    |
|------------|------------------|-------------|---------|--------------------------|
| 2025-10-31 | Accrued Payroll  | -$35,000    | 22010   | Oct payroll accrual      |

## Ending Balances (Oct 31, 2025)

### Expected GL Balances
| Account | Account Name               | Ending Balance | Calculation                                    |
|---------|---------------------------|----------------|------------------------------------------------|
| 20100   | Accounts Payable Control  | -$1,185,000    | -850k - 335k - 420k + 155k + 275k = -1,185k   |
| 22010   | Accrued Expenses          | -$215,000      | -180k - 35k = -215k                            |

### Expected Subledger Balances
Subledger should show all **unpaid** invoices and accruals:

**Account 20100 (Accounts Payable):**
- INV-55490: -$335,000 (new, unpaid)
- INV-45021: -$420,000 (new, unpaid)
- Prior period invoices: -$430,000 (old invoices not yet paid)
- **Total: -$1,185,000**

**Account 22010 (Accrued Expenses):**
- Accrued Payroll Oct: -$35,000
- Prior accruals: -$180,000
- **Total: -$215,000**

## Expected Reconciliation Results

### Account 20100
- **GL Balance**: -$1,185,000
- **Subledger Balance**: -$1,185,000
- **Variance**: $0
- **Status**: ✅ Balanced
- **Materiality**: No

### Account 22010
- **GL Balance**: -$215,000
- **Subledger Balance**: -$215,000
- **Variance**: $0
- **Status**: ✅ Balanced
- **Materiality**: No

## Files in This Scenario
- `gl_balance.csv` - GL ending balances for Oct 2025
- `subledger_balance.csv` - Detailed AP aging at Oct 31, 2025
- `transactions.csv` - (Optional) Detailed activity during October
- `expected_results.json` - Expected reconciliation output

## Test Assertions
```javascript
assert(reconciliation[0].variance === 0, "Account 20100 should have zero variance")
assert(reconciliation[0].status === "balanced", "Account 20100 should be balanced")
assert(reconciliation[1].variance === 0, "Account 22010 should have zero variance")
assert(reconciliation[1].status === "balanced", "Account 22010 should be balanced")
```

## Agent Expected Behavior

### Validation Agent
- Should confirm data is valid
- Confidence score > 0.9
- No warnings or errors

### Analysis Agent
- Risk level: LOW
- Material variances: 0
- Overall health: 95-100%

### Investigation Agent
- Should return: "No material variances to investigate"

### Report Agent
- Should state: "Reconciliation is in balance"
- Should confirm: "No corrective actions required"
