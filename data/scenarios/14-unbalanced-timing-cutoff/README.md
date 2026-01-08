# Scenario 14: Unbalanced - Period Cutoff / Timing Differences

## Overview
This scenario tests reconciliation where transactions dated November 30th were **posted to December** instead of November, creating period cutoff variances.

## Scenario Type
**Unbalanced Test**: Timing differences / Period cutoff errors

## Expected Outcome
⚠️ **UNBALANCED** - Material variances due to wrong period posting

## The Problem

**Month-End Cutoff Issue**: Three transactions dated **November 30, 2025** were not processed until December 1st and were posted to the **wrong accounting period** (December instead of November):

1. **Account 2000 (AP)**:
   - Invoice INV-66789 (YearEnd Corp): $89,500 - Posted to Dec instead of Nov
   - Invoice INV-77901 (LastMinute LLC): $68,000 - Posted to Dec instead of Nov
   - **Total Missing from Nov**: $157,500

2. **Account 5000 (COGS)**:
   - COGS-1130 (Plant A Nov 30 shipments): $67,500 - Posted to Dec instead of Nov
   - **Total Missing from Nov**: $67,500

**Total Impact**: $225,000 missing from November GL

## Account Details

### Account 2000 (Accounts Payable) - HAS VARIANCE

**GL Balance for November** (INCOMPLETE):
- Amount: -$925,000
- Missing 2 invoices dated Nov 30 totaling $157,500

**Actual November Transactions** (from subledger):
```
Nov 5:  Standard Suppliers   $145,000 ✅ In GL
Nov 10: Quality Parts        $178,000 ✅ In GL
Nov 15: Express Shipping      $89,000 ✅ In GL
Nov 22: Tech Vendors         $234,000 ✅ In GL
Nov 28: Office Depot          $56,000 ✅ In GL
Nov 29: Normal Vendor        $223,000 ✅ In GL
Nov 30: YearEnd Corp          $89,500 ❌ POSTED TO DEC
Nov 30: LastMinute LLC        $68,000 ❌ POSTED TO DEC
---------------------------------------------
Total Actual (Nov):        $1,082,500
GL Balance (Nov):            $925,000
Missing from Nov:            $157,500
```

**Expected Variance**:
- GL (Nov): -$925,000 (incomplete)
- Subledger (Nov): -$1,082,500 (correct)
- **Variance: -$157,500** (GL understated for November)
- **Material**: YES

### Account 5000 (Cost of Goods Sold) - HAS VARIANCE

**GL Balance for November** (INCOMPLETE):
- Amount: $456,000
- Missing Nov 30 shipments totaling $67,500

**Actual November Transactions** (from subledger):
```
Nov 8:  Plant A (materials)  $145,000 ✅ In GL
Nov 15: Plant B (labor)      $123,000 ✅ In GL
Nov 22: Plant C (overhead)   $188,000 ✅ In GL
Nov 30: Plant A (shipments)   $67,500 ❌ POSTED TO DEC
---------------------------------------------
Total Actual (Nov):          $523,500
GL Balance (Nov):            $456,000
Missing from Nov:             $67,500
```

**Expected Variance**:
- GL (Nov): $456,000 (incomplete)
- Subledger (Nov): $523,500 (correct)
- **Variance: -$67,500** (GL understated for November)
- **Material**: YES

### Account 1200 (Accounts Receivable) - BALANCED ✅

**Both GL and Subledger** (No cutoff issues):
- Amount: $678,000
- **Variance**: $0 ✅
- No transactions on Nov 30 for this account

## Root Cause: Period Cutoff Procedures

### What Happened?
1. **November 30, 2025** (Friday):
   - Three late-arriving documents:
     - 2 AP invoices received at 4:45 PM
     - 1 COGS shipment report received at 5:15 PM
   - Accounting staff had already started month-end close
   - Documents set aside for "next day" processing

2. **December 1, 2025** (Monday):
   - Staff processed the Nov 30 documents
   - System default period was December
   - No one checked transaction dates vs posting period
   - Transactions posted to **December** instead of **November**

3. **Result**:
   - November GL understated by $225,000
   - December GL will be overstated by $225,000
   - Period misstatement affects:
     - Month-end balances
     - Financial statements
     - Trend analysis
     - Budget vs actual comparisons

### Why It Wasn't Caught?
- No cutoff procedures documented
- Staff unaware of accrual accounting requirements
- No review of transaction dates vs posting periods
- GL system doesn't warn about backdated transactions
- Monthly reconciliation happens after close (too late)

## Transaction Analysis

The `transactions.csv` file shows actual transaction dates vs GL posting periods:

| Transaction ID | Account | Date | Should Be In | Actually In | Status |
|---------------|---------|------|--------------|-------------|---------|
| TXN-2511-001 | 2000 | Nov 5 | Nov | Nov | ✅ OK |
| TXN-2511-003 | 2000 | Nov 10 | Nov | Nov | ✅ OK |
| TXN-2511-007 | 2000 | Nov 15 | Nov | Nov | ✅ OK |
| TXN-2511-010 | 2000 | Nov 22 | Nov | Nov | ✅ OK |
| TXN-2511-015 | 2000 | Nov 28 | Nov | Nov | ✅ OK |
| **TXN-2511-018** | **2000** | **Nov 30** | **Nov** | **Dec** | ❌ **WRONG PERIOD** |
| **TXN-2511-020** | **2000** | **Nov 30** | **Nov** | **Dec** | ❌ **WRONG PERIOD** |
| TXN-2511-025 | 2000 | Nov 29 | Nov | Nov | ✅ OK |
| TXN-2511-030 | 5000 | Nov 8 | Nov | Nov | ✅ OK |
| TXN-2511-032 | 5000 | Nov 15 | Nov | Nov | ✅ OK |
| TXN-2511-034 | 5000 | Nov 22 | Nov | Nov | ✅ OK |
| **TXN-2511-038** | **5000** | **Nov 30** | **Nov** | **Dec** | ❌ **WRONG PERIOD** |
| TXN-2511-040 | 1200 | Nov 10 | Nov | Nov | ✅ OK |
| TXN-2511-042 | 1200 | Nov 18 | Nov | Nov | ✅ OK |
| TXN-2511-044 | 1200 | Nov 25 | Nov | Nov | ✅ OK |

## Expected AI Agent Behavior

### Data Validation Agent
- **Status**: Valid data structure
- **Warning**: "Significant variances detected at period end"
- **Confidence**: 0.5-0.6 (low confidence due to material variance)

### Reconciliation Analyst
- **Risk Level**: HIGH
- **Material Variances**: 2 (Accounts 2000 and 5000)
- **Total Variance Amount**: -$225,000
- **Pattern**: "Period-end cutoff issue - November understated"
- **Timing**: "All variances relate to November 30 transactions"
- **Health Score**: 25-35% (serious period-end problem)

### Variance Investigator

**Account 2000 Analysis**:
- **Variance Type**: Period Cutoff Error
- **Amount**: -$157,500
- **Transaction Dates**: November 30, 2025
- **Possible Causes**:
  - "November 30 transactions posted to December"
  - "Period cutoff procedures not followed"
  - "Late-arriving invoices processed in wrong period"
  - "System default period not validated"

**Specific Findings**:
- Invoice INV-66789 (YearEnd Corp) - $89,500 - Nov 30 date, Dec posting
- Invoice INV-77901 (LastMinute LLC) - $68,000 - Nov 30 date, Dec posting

**Account 5000 Analysis**:
- **Variance Type**: Period Cutoff Error
- **Amount**: -$67,500
- **Transaction Dates**: November 30, 2025
- **Possible Causes**:
  - "November 30 shipments posted to December COGS"
  - "Period cutoff not properly executed"
  - "Inventory system vs GL timing mismatch"

**Specific Finding**: COGS-1130 (Plant A shipments) - $67,500 - Nov 30 date, Dec posting

**Recommended Actions**:
1. **Immediate**:
   - Review all December transactions for Nov 30 dates
   - Create reversing entries in December
   - Re-post transactions to November (correct period)
   - Re-run November month-end close

2. **Preventive**:
   - Implement cutoff checklist
   - Train staff on period cutoff procedures
   - Add system warnings for backdated transactions
   - Require supervisor approval for transactions >3 days old
   - Perform daily cut-off review for last 3 days of month

### Report Generator
Should state:
- "Material period cutoff errors identified totaling $225,000"
- "November 30 transactions incorrectly posted to December"
- "November financial statements understated"
- "Reclassification entries required before financial statement release"
- "Cutoff procedures need immediate implementation"

## Testing Instructions

### 1. Upload Files
- `gl_balance.csv` - November GL (missing Nov 30 transactions)
- `subledger_balance.csv` - Complete November subledger (includes Nov 30)
- `transactions.csv` - Shows actual dates vs GL posting periods

### 2. Expected Results

**Account 2000 Reconciliation**:
```
GL Balance (Nov):        -$925,000
Subledger Balance (Nov): -$1,082,500
Variance:                -$157,500 ❌ MATERIAL
Status:                  UNBALANCED
Issue:                   Nov 30 transactions in Dec
```

**Account 5000 Reconciliation**:
```
GL Balance (Nov):        $456,000
Subledger Balance (Nov): $523,500
Variance:                -$67,500 ❌ MATERIAL
Status:                  UNBALANCED
Issue:                   Nov 30 COGS in Dec
```

**Account 1200 Reconciliation**:
```
Variance: $0 ✅ BALANCED
```

### 3. Verification Checks

✅ **Agent should detect**:
- Two material variances (Accounts 2000 and 5000)
- Period cutoff as root cause
- Specific Nov 30 transactions
- High risk level
- Need for reclassification entries

✅ **Agent should identify pattern**:
- All variances are November 30 dated
- All missing transactions posted to December
- Systematic cutoff procedure failure

## Resolution Steps

### Step 1: Confirm the Issue
Review December GL for Nov 30 transactions:
```sql
SELECT * FROM gl_transactions
WHERE posting_period = '2025-12'
AND transaction_date = '2025-11-30'
```

### Step 2: Create Reclassification Entries

**For Account 2000** (Accounts Payable):
```
December Entry (Reverse):
DR: Accounts Payable      $157,500
CR: Accounts Payable      $157,500
Description: Reverse Nov 30 invoices posted to Dec

November Entry (Correct Posting):
DR: [Expense/Asset]       $157,500
CR: Accounts Payable      $157,500
Description: Correct posting - Nov 30 invoices to Nov period
```

**For Account 5000** (COGS):
```
December Entry (Reverse):
DR: Cost of Goods Sold    $67,500
CR: Cost of Goods Sold    $67,500
Description: Reverse Nov 30 COGS posted to Dec

November Entry (Correct Posting):
DR: Cost of Goods Sold    $67,500
CR: Inventory             $67,500
Description: Correct posting - Nov 30 COGS to Nov period
```

### Step 3: Re-reconcile
- Run November reconciliation again
- Verify all variances resolved
- Confirm December is now correctly stated

### Step 4: Implement Controls
Create cutoff procedures manual:
1. Final 3 days of month require special handling
2. All transactions dated in current month must be processed before close
3. Daily review of transaction dates vs posting periods
4. Supervisor sign-off on month-end cutoff certification

## Test Assertions

```javascript
// Account 2000 variance
assert(account2000.variance === -157500, "Should detect -$157,500 variance in AP");
assert(account2000.status === "material_variance", "AP should flag as material");
assert(account2000.cutoffIssue === true, "Should identify as cutoff issue");
assert(account2000.missingTransactions.filter(t => t.date === "2025-11-30").length === 2,
       "Should find 2 Nov 30 transactions");

// Account 5000 variance
assert(account5000.variance === -67500, "Should detect -$67,500 variance in COGS");
assert(account5000.status === "material_variance", "COGS should flag as material");
assert(account5000.cutoffIssue === true, "Should identify as cutoff issue");
assert(account5000.missingTransactions.filter(t => t.date === "2025-11-30").length === 1,
       "Should find 1 Nov 30 transaction");

// Account 1200 balanced
assert(account1200.variance === 0, "AR should balance");

// Investigation findings
assert(investigation.rootCause === "period_cutoff_error", "Should identify cutoff as root cause");
assert(investigation.affectedPeriods.includes("2025-11"), "Should identify Nov as affected");
assert(investigation.affectedPeriods.includes("2025-12"), "Should identify Dec as affected");
assert(investigation.totalVariance === -225000, "Total variance should be -$225,000");
```

## Scenario Statistics

- **Period Analyzed**: November 2025
- **Affected Period**: December 2025 (has transactions that belong in Nov)
- **Accounts**: 3
- **Material Variances**: 2
- **Balanced Accounts**: 1
- **Cutoff Errors**: 3 transactions
- **Transaction Date**: All Nov 30, 2025
- **Total Transactions**: 15
- **Correct Period**: 12 (80%)
- **Wrong Period**: 3 (20%)
- **Total Variance Amount**: -$225,000
- **Materiality**: HIGH
- **Impact**: Both November and December financials affected

## Key Learning Points

### Importance of Cutoff Procedures
- **For Auditors**: Period cutoff is a critical audit area
- **For Accountants**: Must understand accrual accounting
- **For Controllers**: Need formal cutoff procedures
- **For CFOs**: Material misstatement risk

### Common Cutoff Scenarios
1. **Goods received but not invoiced**: Accrue in receiving period
2. **Invoices dated last day of month**: Post to correct period even if received late
3. **Shipments dated last day**: COGS recognition in shipping period
4. **Service completion**: Revenue/expense in performance period

### Best Practices
1. **Cutoff checklist**: Formalize month-end procedures
2. **Transaction date validation**: System controls
3. **Daily monitoring**: Last 3 days of month
4. **Training**: Staff understanding of cutoff importance
5. **Reconciliation timing**: Before closing period

---

**Test Status**: ✅ Ready for testing
**Complexity**: ⭐⭐⭐⭐ High (period-end procedures)
**Variance Type**: Period Cutoff / Timing Difference
**Root Cause**: Nov 30 transactions posted to December
**Resolution**: Reclassification entries required
**Impact**: Material misstatement of both periods
