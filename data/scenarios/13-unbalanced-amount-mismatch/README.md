# Scenario 13: Unbalanced - Amount Mismatch (Data Entry Errors)

## Overview
This scenario tests reconciliation where GL journal entries were posted with **incorrect amounts** due to data entry errors, causing material variances.

## Scenario Type
**Unbalanced Test**: GL amounts don't match actual transaction amounts

## Expected Outcome
⚠️ **UNBALANCED** - Material variances in 2 accounts

## The Problem

Two journal entries were posted to the GL with **incorrect amounts** (transposition/typo errors):

1. **Account 2000 (AP)**: Invoice INV-70456 posted as $100,000 instead of $149,500
   - **Error**: -$49,500 (GL understated)

2. **Account 6000 (Expenses)**: Invoice INV-MKT-4501 posted as $34,000 instead of $67,500
   - **Error**: -$33,500 (GL understated)

**Total GL Understatement**: -$83,000

## Account Details

### Account 2000 (Accounts Payable) - HAS VARIANCE

**GL Balance** (INCORRECT):
- Amount: -$845,000
- Understated by $49,500 due to data entry error

**Actual Transactions**:
```
Alpha Suppliers:     $125,000 ✅ Correct in GL
Beta Manufacturing:  $245,000 ✅ Correct in GL
Gamma Industries:    $149,500 ❌ Posted as $100,000 (ERROR!)
Delta Logistics:     $178,000 ✅ Correct in GL
Epsilon Tech:        $197,000 ✅ Correct in GL
-----------------------------------------
Total (Actual):      $894,500
GL Balance:          $845,000
Error:               -$49,500
```

**Expected Variance**:
- GL: -$845,000 (incorrect)
- Subledger: -$894,500 (correct)
- **Variance: -$49,500** (GL understated)
- **Material**: YES

### Account 1400 (Inventory) - BALANCED ✅

**Both GL and Subledger**:
- Amount: $567,000
- **Variance**: $0 ✅

### Account 6000 (Operating Expenses) - HAS VARIANCE

**GL Balance** (INCORRECT):
- Amount: $234,000
- Understated by $33,500 due to data entry error

**Actual Transactions**:
```
Office Supplies Plus:  $12,500 ✅ Correct in GL
Utility Company:       $45,000 ✅ Correct in GL
Marketing Agency:      $67,500 ❌ Posted as $34,000 (ERROR!)
Legal Services:        $58,000 ✅ Correct in GL
Insurance Corp:        $84,500 ✅ Correct in GL
-----------------------------------------
Total (Actual):        $267,500
GL Balance:            $234,000
Error:                 -$33,500
```

**Expected Variance**:
- GL: $234,000 (incorrect)
- Subledger: $267,500 (correct)
- **Variance: -$33,500** (GL understated)
- **Material**: YES

## Transaction Analysis

The `transactions.csv` shows both actual amounts and what was posted to GL:

### Account 2000 Error Details
| Invoice | Vendor | Actual Amount | GL Posted | Error | Type |
|---------|--------|--------------|-----------|-------|------|
| INV-50001 | Alpha | $125,000 | $125,000 | $0 | ✅ OK |
| INV-60234 | Beta | $245,000 | $245,000 | $0 | ✅ OK |
| **INV-70456** | **Gamma** | **$149,500** | **$100,000** | **-$49,500** | ❌ **ERROR** |
| INV-80567 | Delta | $178,000 | $178,000 | $0 | ✅ OK |
| INV-90678 | Epsilon | $197,000 | $197,000 | $0 | ✅ OK |

**Root Cause**: Clerk transposed digits: $149,500 → $100,000 (possible typo or rushed entry)

### Account 6000 Error Details
| Invoice | Vendor | Actual Amount | GL Posted | Error | Type |
|---------|--------|--------------|-----------|-------|------|
| INV-OS-1201 | Office Supplies | $12,500 | $12,500 | $0 | ✅ OK |
| INV-UTIL-DEC | Utility | $45,000 | $45,000 | $0 | ✅ OK |
| **INV-MKT-4501** | **Marketing** | **$67,500** | **$34,000** | **-$33,500** | ❌ **ERROR** |
| INV-LEG-8901 | Legal | $58,000 | $58,000 | $0 | ✅ OK |
| INV-INS-2025 | Insurance | $84,500 | $84,500 | $0 | ✅ OK |

**Root Cause**: Clerk entered half the amount: $67,500 → $34,000 (perhaps confused by partial payment or discount)

## Expected AI Agent Behavior

### Data Validation Agent
- **Status**: Valid data structure
- **Warning**: "Multiple variances detected"
- **Confidence**: 0.6-0.7 (lower due to variances)

### Reconciliation Analyst
- **Risk Level**: HIGH
- **Material Variances**: 2 (Accounts 2000 and 6000)
- **Total Variance Amount**: -$83,000
- **Pattern**: "GL understated across multiple accounts"
- **Health Score**: 35-45% (significant problems)

### Variance Investigator

**Account 2000 Analysis**:
- **Variance Type**: GL Understatement
- **Amount**: -$49,500
- **Possible Causes**:
  - "Data entry error in journal posting"
  - "Invoice INV-70456 posted with incorrect amount"
  - "Amount $100,000 posted vs actual $149,500"
  - "Transposition or typo error"

**Specific Finding**: Invoice INV-70456 from Gamma Industries

**Account 6000 Analysis**:
- **Variance Type**: GL Understatement
- **Amount**: -$33,500
- **Possible Causes**:
  - "Data entry error in journal posting"
  - "Invoice INV-MKT-4501 posted with incorrect amount"
  - "Amount $34,000 posted vs actual $67,500"
  - "Possible confusion with partial payment or discount"

**Specific Finding**: Invoice INV-MKT-4501 from Marketing Agency

**Recommended Actions**:
1. Review original invoices INV-70456 and INV-MKT-4501
2. Compare invoice amounts to GL journal entries
3. Create correcting journal entries:
   - Account 2000: Increase by $49,500
   - Account 6000: Increase by $33,500
4. Implement dual verification for large transactions
5. Add amount validation controls in GL posting process

### Report Generator
Should state:
- "Material variances totaling $83,000 identified across 2 accounts"
- "GL balances understated due to data entry errors"
- "Two specific invoices posted with incorrect amounts"
- "Correcting journal entries required before close"
- "Root cause: Manual data entry without verification"

## Testing Instructions

### 1. Upload Files
- `gl_balance.csv` - GL with incorrect amounts
- `subledger_balance.csv` - Correct subledger amounts
- `transactions.csv` - Detailed transactions showing actual vs posted amounts

### 2. Expected Results

**Account 2000 Reconciliation**:
```
GL Balance:        -$845,000
Subledger Balance: -$894,500
Variance:          -$49,500 ❌ MATERIAL
Status:            UNBALANCED
Error:             Data entry - INV-70456 posted incorrectly
```

**Account 1400 Reconciliation**:
```
Variance: $0 ✅ BALANCED
```

**Account 6000 Reconciliation**:
```
GL Balance:        $234,000
Subledger Balance: $267,500
Variance:          -$33,500 ❌ MATERIAL
Status:            UNBALANCED
Error:             Data entry - INV-MKT-4501 posted incorrectly
```

### 3. Verification Checks

✅ **Agent should detect**:
- Two material variances (Accounts 2000 and 6000)
- Specific invoices with amount errors
- Pattern of GL understatement
- High risk level
- Need for correcting entries

✅ **Agent should NOT**:
- Suggest automated correction without investigation
- Adjust subledger to match incorrect GL
- Ignore variance as immaterial

## Root Cause Analysis

### What Happened?
1. Accounting clerk posted multiple journal entries
2. Two entries had incorrect amounts (typos/transposition)
3. No secondary verification was performed
4. Errors not caught until month-end reconciliation

### Why Weren't They Caught?
- Manual data entry without validation
- No dual verification for large amounts
- No automated checks comparing to source documents
- Monthly reconciliation cycle (errors sat for weeks)

### How to Prevent?
- **Immediate**:
  - Implement dual verification for amounts >$50k
  - Add validation checks in GL system
  - Compare posted amounts to source documents

- **Long-term**:
  - Automate AP invoice posting
  - Implement OCR for invoice scanning
  - Real-time reconciliation alerts
  - Daily variance monitoring

## Resolution Steps

1. **Verify Errors**: Pull original invoices to confirm actual amounts
2. **Create Correcting Entries**:

   **For Account 2000** (Accounts Payable):
   ```
   DR: [Expense Account]     $49,500
   CR: Accounts Payable      $49,500
   Description: Correct INV-70456 - posted $100k, actual $149.5k
   ```

   **For Account 6000** (Operating Expenses):
   ```
   DR: Operating Expenses    $33,500
   CR: Cash or AP            $33,500
   Description: Correct INV-MKT-4501 - posted $34k, actual $67.5k
   ```

3. **Re-reconcile**: Run reconciliation to confirm variances resolved
4. **Document**: Add to error log with prevention measures

## Test Assertions

```javascript
// Account 2000 variance
assert(account2000.variance === -49500, "Should detect -$49,500 variance in AP");
assert(account2000.status === "material_variance", "AP should flag as material");
assert(account2000.gl_balance === -845000, "GL should be -$845,000");
assert(account2000.subledger_balance === -894500, "Subledger should be -$894,500");

// Account 6000 variance
assert(account6000.variance === -33500, "Should detect -$33,500 variance in Expenses");
assert(account6000.status === "material_variance", "Expenses should flag as material");
assert(account6000.gl_balance === 234000, "GL should be $234,000");
assert(account6000.subledger_balance === 267500, "Subledger should be $267,500");

// Account 1400 balanced
assert(account1400.variance === 0, "Inventory should balance");

// Investigation findings
assert(investigation.errorInvoices.length === 2, "Should find 2 erroneous invoices");
assert(investigation.errorInvoices.includes("INV-70456"), "Should identify INV-70456");
assert(investigation.errorInvoices.includes("INV-MKT-4501"), "Should identify INV-MKT-4501");
assert(investigation.totalVariance === -83000, "Total variance should be -$83,000");
```

## Scenario Statistics

- **Period**: December 2025
- **Accounts**: 3
- **Material Variances**: 2
- **Balanced Accounts**: 1
- **Data Entry Errors**: 2
- **Total Transactions**: 13
- **Correct in GL**: 11 (85%)
- **Incorrect in GL**: 2 (15%)
- **Total Variance Amount**: -$83,000
- **Materiality**: HIGH

## Key Learning Points

### For Accountants:
1. Always verify large transaction amounts before posting
2. Implement dual verification controls
3. Compare GL postings to source documents
4. Don't rush journal entries during busy periods

### For Auditors:
1. Data entry errors are common in manual systems
2. Focus testing on high-value transactions
3. Sample test GL postings against source documents
4. Check for patterns of understatement/overstatement

### For System Designers:
1. Add amount validation in GL systems
2. Implement warning for unusual amount patterns
3. Require dual approval for amounts over threshold
4. Automate posting where possible

---

**Test Status**: ✅ Ready for testing
**Complexity**: ⭐⭐⭐ Medium-High
**Variance Type**: GL Understatement (Multiple Accounts)
**Root Cause**: Data entry errors (typos/transposition)
**Resolution**: Correcting journal entries required
