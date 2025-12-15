# Scenario 05: Missing Subledger Data

## Purpose
Test reconciliation where GL has a balance but the subledger is incomplete or missing, indicating a data integrity issue.

## Scenario Description
This represents a serious accounting issue where:
- GL shows Account 20100 has a balance of -$1,185,000
- Subledger only shows -$800,000 in detailed invoices
- Missing $385,000 in subledger detail
- This indicates either:
  - Missing invoices in AP system
  - Journal entries posted to GL without subledger support
  - Data extraction/export failure from AP system

## Accounting Period
**October 2025 (2025-10)**

## The Problem

**Account 20100 Discrepancy:**
- **GL Balance**: -$1,185,000 (what the books say)
- **Subledger Detail**: -$800,000 (what we can prove with invoices)
- **Missing Detail**: -$385,000 (**unexplained!**)

**Possible Causes:**
1. **Missing Invoices**: Some invoices not entered in AP system
2. **Manual GL Entries**: Journal entries bypassing AP system
3. **Data Export Failure**: AP report missing transactions
4. **Prior Period Adjustments**: Corrections not reflected in subledger
5. **System Integration Issues**: GL and AP not syncing properly

## Beginning Balances (Sep 30, 2025)
| Account | Account Name               | Opening Balance |
|---------|---------------------------|-----------------|
| 20100   | Accounts Payable Control  | -$750,000       |
| 22010   | Accrued Expenses          | -$150,000       |

## October 2025 Activity

### GL Transactions (Complete)
| Date       | Description              | Debit     | Credit    | Net        |
|------------|-------------------------|-----------|-----------|------------|
| 2025-10-05 | Invoice INV-55490       | 0         | 335,000   | -335,000   |
| 2025-10-10 | Payment CHK-9001        | 150,000   | 0         | +150,000   |
| 2025-10-15 | Invoice INV-45021       | 0         | 420,000   | -420,000   |
| 2025-10-20 | Payment CHK-9002        | 200,000   | 0         | +200,000   |
| 2025-10-25 | **JE-2025-1045 Manual** | 0         | 385,000   | **-385,000**|
| 2025-10-28 | Payment CHK-9003        | 145,000   | 0         | +145,000   |

**Net Activity**: -$435,000
**Closing Balance**: -$750,000 + (-$435,000) = -$1,185,000 ✅

### Subledger Invoices (Incomplete)
| Vendor              | Invoice    | Amount      | Notes                    |
|---------------------|------------|-------------|--------------------------|
| Global Staffing     | INV-55490  | -$335,000   | ✅ Matches GL            |
| Northwind Components| INV-45021  | -$420,000   | ✅ Matches GL            |
| Prior Invoices      | VARIOUS    | -$45,000    | Old unpaid invoices      |

**Subledger Total**: -$800,000
**Missing**: -$385,000 ⚠️ **NOT EXPLAINED BY INVOICES**

### The Missing Entry

**Journal Entry JE-2025-1045** posted on Oct 25:
- **Debit**: Expense account $385,000
- **Credit**: Account 20100 (AP) $385,000
- **Description**: "Accrual for construction project - Oct 2025"
- **Problem**: **NOT reflected in AP subledger!**

This represents a manual accrual that bypassed the AP invoice system.

## Expected Balances

### GL Balance (October 2025)
| Account | Ending Balance |
|---------|----------------|
| 20100   | -$1,185,000    |
| 22010   | -$185,000      |

### Subledger Balance (October 2025) - INCOMPLETE
| Account | Ending Balance | Missing |
|---------|----------------|---------|
| 20100   | -$800,000      | -$385,000 ⚠️ |
| 22010   | -$185,000      | $0 ✅     |

## Expected Reconciliation Results

### Account 20100 (Missing Subledger Detail)
- **GL Balance**: -$1,185,000
- **Subledger Balance**: -$800,000
- **Variance**: **-$385,000** (GL higher than subledger)
- **Status**: ⚠️ Material Variance
- **Root Cause**: Manual journal entry not reflected in subledger
- **Resolution**: Either:
  1. Create offsetting invoice in AP system for the accrual
  2. Accept as known difference and document
  3. Investigate if this should be in Account 22010 (Accrued Expenses) instead

### Account 22010 (Balanced)
- **GL Balance**: -$185,000
- **Subledger Balance**: -$185,000
- **Variance**: $0
- **Status**: ✅ Balanced

## Transaction Detail

See `transactions.csv` for complete GL activity including:
- All invoices
- All payments
- **The manual journal entry JE-2025-1045** (the culprit!)

## Agent Expected Behavior

### Validation Agent
- Should flag data incompleteness
- Warning: "GL balance not fully supported by subledger detail"
- Confidence: 0.5-0.6 (lower due to missing data)
- May detect: "Possible data extraction issue"

### Analysis Agent
- **Risk level**: HIGH (missing subledger data is serious)
- **Material variances**: 1 (Account 20100, -$385k)
- **Patterns**:
  - "Significant subledger shortfall"
  - "Manual GL entries detected"
  - "Data completeness issue"
- **Overall health**: 30-50% (major data integrity concern)

### Investigation Agent
Should identify:
- **Account**: 20100
- **Variance**: -$385,000
- **Possible Causes**:
  - "Manual journal entries bypassing AP system"
  - "Missing invoice data in subledger extract"
  - "Accrual posted to GL but not entered as invoice in AP"
  - "Data export failure from AP system"
  - "Prior period adjustments not reflected in current subledger"
  - "GL and AP system integration issue"
- **Suggested Actions**:
  - "**URGENT**: Review journal entry JE-2025-1045 for $385k"
  - "Verify if this is a legitimate accrual requiring AP invoice entry"
  - "Confirm AP system export is complete and accurate"
  - "Reconcile all manual GL entries to subledger support"
  - "Consider moving accrual to Account 22010 if appropriate"
  - "Implement controls requiring subledger support for AP entries"
- **Confidence Level**: HIGH
- **Needs Manual Review**: TRUE (critical issue)

### Report Agent
Should state:
- "**CRITICAL**: Material variance of $385,000 in Account 20100"
- "GL balance significantly exceeds subledger detail"
- "Subledger is incomplete - missing $385k in supporting documentation"
- "Investigation reveals manual journal entry JE-2025-1045 without AP invoice"
- "**Immediate action required** - cannot close month without resolution"
- "Recommend full review of GL entries vs AP system integration"

## Resolution Steps

### Step 1: Investigate the Journal Entry
1. Review JE-2025-1045 documentation
2. Determine if $385k accrual is legitimate
3. Verify expense account and approval

### Step 2: Determine Proper Treatment

**Option A: Create AP Invoice (if recurring payable)**
- Enter invoice/accrual in AP system
- Subledger will match GL
- Proper audit trail established

**Option B: Reclassify to Accrued Expenses (if one-time accrual)**
- Move to Account 22010
- Update subledger for 22010
- Document as accrual, not trade payable

**Option C: Reverse and Re-enter (if error)**
- Reverse the manual entry
- Process correctly through AP system
- Ensure subledger support

### Step 3: Implement Controls
1. **Require subledger support** for all AP GL entries
2. **Automated reconciliation** - daily GL to AP sync check
3. **Exception reporting** - flag manual entries to AP accounts
4. **Monthly sign-off** - AP manager certifies subledger completeness

## Test Assertions

```javascript
assert(reconciliation[0].variance === -385000, "Account 20100 should have -$385k variance")
assert(reconciliation[0].status === "material_variance", "Should flag as material")
assert(reconciliation[0].material === true, "Should be material")

assert(investigation.investigations[0].needsManualReview === true,
  "Should require manual review")

assert(investigation.investigations[0].possibleCauses.some(c =>
  c.toLowerCase().includes("manual") || c.toLowerCase().includes("missing")),
  "Should identify manual entry or missing data")

assert(investigation.investigations[0].suggestedActions.some(a =>
  a.toLowerCase().includes("je-2025-1045") || a.toLowerCase().includes("journal entry")),
  "Should specifically mention the journal entry")

// Check that variance direction is correct (GL > Subledger)
assert(reconciliation[0].glBalance < reconciliation[0].subledgerBalance,
  "GL should be more negative than subledger (liability increased)")
```

## Lessons Learned

### Red Flags for Missing Subledger Data:
1. **Manual journal entries** to subsidiary ledger control accounts
2. **Large variances** where GL > Subledger detail
3. **Round numbers** in GL (often indicate estimates/accruals)
4. **Period-end adjustments** without supporting documentation
5. **Unexplained prior period balances** in current reconciliation

### Best Practices:
- **Daily reconciliation** - catch issues early
- **Restrict manual entries** to AP accounts - require approval workflow
- **Automated validation** - GL posting should require subledger reference
- **Complete data exports** - validate AP exports match system totals
- **Documentation requirements** - every GL entry needs supporting detail

## Severity

🔴 **CRITICAL** - This scenario represents a **month-end blocker**. The reconciliation cannot be approved until the missing $385k is explained and resolved.
