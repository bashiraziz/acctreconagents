# Scenario 12: Unbalanced - Missing Invoices Not Posted to GL

## Overview
This scenario tests reconciliation where invoices exist in the subledger and transaction system but were never posted to the GL, creating material variances.

## Scenario Type
**Unbalanced Test**: GL missing transactions that exist in subledger

## Expected Outcome
⚠️ **UNBALANCED** - Material variances detected

## The Problem

Two invoices were entered in the AP subledger but **never posted to the GL**:
1. **MissingGL Corp** - Invoice INV-99401 - $125,000
2. **Tech Vendors LLC** - Invoice INV-44590 - $67,500

**Total Missing from GL**: $192,500

## Account Details

### Account 2000 (Accounts Payable) - HAS VARIANCE

**GL Balance** (UNDERSTATED):
- Amount: -$485,000
- Missing 2 invoices totaling -$192,500

**Subledger Balance** (CORRECT):
- Strategic Suppliers Inc: -$485,000
- MissingGL Corp: -$125,000 ❌ NOT IN GL
- Tech Vendors LLC: -$67,500 ❌ NOT IN GL
- **Total**: -$677,500

**Expected Variance**:
- GL: -$485,000
- Subledger: -$677,500
- **Variance: -$192,500** (GL understated)
- **Material**: YES (exceeds $50 threshold)

### Account 1200 (Accounts Receivable) - BALANCED

**Both GL and Subledger**:
- Amount: $725,000
- **Variance**: $0 ✅

### Account 5000 (Cost of Goods Sold) - BALANCED

**Both GL and Subledger**:
- Amount: $345,000
- **Variance**: $0 ✅

## Transaction Analysis

The `transactions.csv` file includes a `gl_posted` column showing which transactions made it to GL:

| Invoice | Vendor | Amount | GL Posted | Issue |
|---------|--------|--------|-----------|-------|
| INV-80001 | Strategic Suppliers | $125,000 | YES | ✅ OK |
| INV-80045 | Strategic Suppliers | $89,000 | YES | ✅ OK |
| INV-99401 | **MissingGL Corp** | $125,000 | **NO** | ❌ Missing |
| INV-80102 | Strategic Suppliers | $156,000 | YES | ✅ OK |
| INV-44590 | **Tech Vendors LLC** | $67,500 | **NO** | ❌ Missing |
| INV-80156 | Strategic Suppliers | $115,000 | YES | ✅ OK |

**Root Cause**: Posting batch failed or was interrupted, leaving 2 invoices unposted

## Expected AI Agent Behavior

### Data Validation Agent
- **Status**: Valid data structure
- **Warning**: "Variance detected - GL may be incomplete"
- **Confidence**: 0.6-0.7 (lower due to unexplained variance)

### Reconciliation Analyst
- **Risk Level**: HIGH
- **Material Variances**: 1 (Account 2000)
- **Variance Amount**: -$192,500
- **Pattern**: "GL understated relative to subledger"
- **Health Score**: 30-40% (significant problem)

### Variance Investigator
Should identify:
- **Account**: 2000 (Accounts Payable)
- **Variance Type**: GL Understatement
- **Amount**: -$192,500
- **Possible Causes**:
  - "Invoices recorded in AP subledger but not posted to GL"
  - "Posting batch failure or interruption"
  - "Journal entries awaiting approval"
  - "System interface error between subledger and GL"

**Specific Findings**:
- Invoice INV-99401 (MissingGL Corp) - $125,000 missing
- Invoice INV-44590 (Tech Vendors LLC) - $67,500 missing
- Both invoices dated November 2025
- Combined impact: $192,500 GL understatement

**Recommended Actions**:
1. Review posting batch logs for November 2025
2. Verify invoices INV-99401 and INV-44590 in AP system
3. Create manual journal entry to post missing invoices
4. Investigate why posting batch failed
5. Implement controls to prevent future posting failures

### Report Generator
Should state:
- "Material variance of $192,500 identified in Accounts Payable"
- "GL balance is understated relative to AP subledger"
- "Two invoices found in subledger not reflected in GL"
- "Corrective action required before financial statement preparation"
- "Month-end close cannot proceed until variance is resolved"

## Testing Instructions

### 1. Upload Files
- `gl_balance.csv` - GL balances (missing 2 invoices)
- `subledger_balance.csv` - Complete AP subledger
- `transactions.csv` - Detailed transactions with GL posted status

### 2. Expected Results

**Account 2000 Reconciliation**:
```
GL Balance:        -$485,000
Subledger Balance: -$677,500
Variance:          -$192,500 ❌ MATERIAL
Status:            UNBALANCED
```

**Account 1200 & 5000**:
```
Variance: $0 ✅ BALANCED
```

### 3. Verification Checks

✅ **Agent should detect**:
- Material variance in Account 2000
- Specific invoices missing from GL
- Pattern of GL understatement
- High risk level

✅ **Agent should NOT**:
- Suggest automated correction (requires investigation)
- Ignore the variance as immaterial
- Recommend adjusting subledger to match GL

## Root Cause Analysis

### What Happened?
1. AP clerk entered invoices in November
2. Posting batch was scheduled for night processing
3. Batch encountered an error and stopped mid-process
4. Some invoices posted to GL, others did not
5. Error was not noticed until month-end reconciliation

### Why It Wasn't Caught Earlier?
- No real-time GL integration
- AP system doesn't verify GL posting
- No automated alerts for posting failures
- Manual reconciliation only done monthly

### How to Prevent?
- Implement automated posting verification
- Daily reconciliation of AP to GL
- Real-time alerts for failed batches
- Exception reporting for unposted transactions

## Resolution Steps

1. **Confirm Issue**: Verify invoices exist in AP system
2. **Gather Documentation**: Pull invoice copies and approvals
3. **Create Journal Entry**:
   ```
   DR: Expense Account    $192,500
   CR: Accounts Payable   $192,500
   Description: Post missing invoices INV-99401 and INV-44590
   ```
4. **Re-reconcile**: Run reconciliation again to confirm balance
5. **Document**: Record in variance log with resolution details

## Test Assertions

```javascript
// Variance detection
assert(account2000.variance === -192500, "Should detect -$192,500 variance");
assert(account2000.status === "material_variance", "Should flag as material");
assert(account2000.gl_balance === -485000, "GL should be -$485,000");
assert(account2000.subledger_balance === -677500, "Subledger should be -$677,500");

// Investigation results
assert(investigation.missingInvoices.length === 2, "Should find 2 missing invoices");
assert(investigation.missingInvoices.includes("INV-99401"), "Should identify INV-99401");
assert(investigation.missingInvoices.includes("INV-44590"), "Should identify INV-44590");

// Other accounts
assert(account1200.variance === 0, "AR should balance");
assert(account5000.variance === 0, "COGS should balance");
```

## Scenario Statistics

- **Period**: November 2025
- **Accounts**: 3
- **Material Variances**: 1
- **Balanced Accounts**: 2
- **Missing Invoices**: 2
- **Total Transactions**: 13
- **Posted to GL**: 11 (85%)
- **Missing from GL**: 2 (15%)
- **Variance Amount**: -$192,500
- **Materiality**: HIGH

---

**Test Status**: ✅ Ready for testing
**Complexity**: ⭐⭐⭐ Medium-High
**Variance Type**: GL Understatement
**Root Cause**: Posting batch failure
**Resolution**: Manual journal entry required
