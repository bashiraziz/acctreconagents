# Scenario 02: Material Variance - Duplicate Invoice

## Purpose
Test reconciliation where a material variance exists due to a duplicate invoice in the subledger.

## Scenario Description
This represents a common error where:
- An invoice was entered twice in the AP subledger
- GL only recorded the invoice once (correct)
- Variance exceeds materiality threshold
- Investigation should identify the duplicate

## Accounting Period
**October 2025 (2025-10)**

## The Error
**Invoice INV-99302 from Radius Labs** was entered twice in the AP system:
- First entry: 2025-10-01 (correct)
- Second entry: 2025-10-03 (duplicate)
- Invoice amount: $275,000
- GL only recorded once (correct)

## Expected Balances

### GL Balances (Correct)
| Account | Account Name               | Amount       |
|---------|---------------------------|--------------|
| 20100   | Accounts Payable Control  | -$1,185,000  |
| 22010   | Accrued Expenses          | -$215,000    |

### Subledger Balances (Contains Duplicate)
| Account | Amount       | Notes                          |
|---------|--------------|--------------------------------|
| 20100   | -$1,460,000  | Includes duplicate -$275k      |
| 22010   | -$215,000    | Correct                        |

## Expected Reconciliation Results

### Account 20100 (Has Variance)
- **GL Balance**: -$1,185,000
- **Subledger Balance**: -$1,460,000
- **Variance**: **+$275,000** (subledger overstated)
- **Status**: ⚠️ Material Variance
- **Materiality**: Yes (exceeds $50 threshold)
- **Root Cause**: Duplicate invoice INV-99302

### Account 22010 (Balanced)
- **GL Balance**: -$215,000
- **Subledger Balance**: -$215,000
- **Variance**: $0
- **Status**: ✅ Balanced
- **Materiality**: No

## Agent Expected Behavior

### Validation Agent
- Should mark as valid (data structure is correct)
- May flag warning: "Potential duplicate detected"
- Confidence score: 0.7-0.8 (lower due to anomaly)

### Analysis Agent
- **Risk level**: MEDIUM or HIGH
- **Material variances**: 1 (Account 20100)
- **Patterns**: Should detect "duplicate entry pattern"
- **Overall health**: 50-70%

### Investigation Agent
Should identify:
- **Account**: 20100
- **Variance**: +$275,000
- **Possible Causes**:
  - "Duplicate invoice entry in AP system"
  - "Same vendor, invoice number, and amount detected"
  - "Invoice INV-99302 appears twice with same date"
- **Suggested Actions**:
  - "Review AP subledger for duplicate invoice INV-99302"
  - "Verify with vendor if invoice was received twice"
  - "Reverse duplicate entry if confirmed"
  - "Update GL if invoice legitimately recorded twice"

### Report Agent
Should state:
- "Material variance identified in Account 20100"
- "Variance of $275,000 exceeds materiality threshold"
- "Investigation reveals potential duplicate invoice"
- "Corrective action required before month-end close"

## Test Assertions
```javascript
assert(reconciliation[0].variance === 275000, "Account 20100 should have $275k variance")
assert(reconciliation[0].status === "material_variance", "Should flag as material")
assert(reconciliation[0].material === true, "Should be material")
assert(investigation.investigations.length > 0, "Should have investigation results")
assert(investigation.investigations[0].possibleCauses.some(c => c.includes("duplicate")),
       "Should identify duplicate as possible cause")
```

## Resolution Steps
1. **Investigate**: Review AP system for INV-99302 entries
2. **Verify**: Confirm with Radius Labs they only sent one invoice
3. **Correct**: Reverse the duplicate subledger entry
4. **Re-reconcile**: Run reconciliation again to confirm balance
