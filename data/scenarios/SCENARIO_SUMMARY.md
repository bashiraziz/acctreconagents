# Test Scenario Summary

## Quick Reference Guide

All scenarios include comprehensive transaction detail files showing the complete audit trail.

---

## Scenario 01: Simple Balanced ✅
**Category**: Baseline / Happy Path
**Complexity**: ⭐ Simple
**Files**: gl_balance.csv, subledger_balance.csv, transactions.csv

### What It Tests
- Perfect reconciliation with no variances
- Basic GL to subledger matching
- Standard month-end close process

### Expected Results
- All variances: $0
- Status: Balanced
- Risk Level: LOW
- Agent behavior: "No issues found"

### Use This For
- Verifying basic functionality works
- Testing agent responses to clean data
- Baseline performance benchmarking
- Training new users

---

## Scenario 02: Material Variance - Duplicate Invoice ⚠️
**Category**: Error Detection
**Complexity**: ⭐⭐ Medium
**Files**: gl_balance.csv, subledger_balance.csv, expected_results.json

### What It Tests
- Duplicate data entry detection
- Material variance identification
- Root cause analysis capabilities

### The Error
- Invoice INV-99302 entered twice in subledger
- GL correctly has single entry
- Creates $275k variance

### Expected Results
- Variance: +$275,000
- Status: Material Variance
- Risk Level: MEDIUM/HIGH
- Agent behavior: Should detect duplicate and suggest removal

### Use This For
- Testing error detection logic
- Validating investigation suggestions
- Demonstrating variance analysis
- Showing how agents identify duplicates

---

## Scenario 03: Timing Differences - Period Cutoff ⏰
**Category**: Period Accounting
**Complexity**: ⭐⭐⭐ Medium-Complex
**Files**: gl_balance.csv, subledger_balance.csv, **transactions.csv**

### What It Tests
- Period cutoff controls
- Timing difference identification
- Transaction posting date vs period allocation

### The Error
- Invoice INV-77845 dated Oct 28
- Entered in AP subledger as October (correct)
- GL entry accidentally posted November 2 (wrong)
- Creates $180k timing variance

### Key Feature: Transaction Detail
The `transactions.csv` file shows:
- All October activity with posting dates
- The problematic Nov-dated entry highlighted
- Clear audit trail of the error
- Enables period cutoff analysis

### Expected Results
- Variance: +$180,000
- Status: Material Variance
- Risk Level: MEDIUM
- Agent behavior: Should identify timing/period issue and suggest reclassification

### Use This For
- Testing period cutoff logic
- Demonstrating timing difference analysis
- Training on month-end procedures
- Showing transaction-level reconciliation

---

## Scenario 04: Multi-Period Roll-Forward 📊
**Category**: Complex / Multi-Period
**Complexity**: ⭐⭐⭐⭐ Complex
**Files**: gl_balance.csv, subledger_balance.csv, **transactions.csv**

### What It Tests
- Multi-period reconciliation (3 months)
- Roll-forward calculations
- Opening balance continuity
- Period-over-period analysis

### Coverage
**Three Months**: August, September, October 2025
**Two Accounts**: 20100 (AP), 22010 (Accrued Expenses)
**Complete Transaction Log**: Every invoice, payment, accrual

### Key Feature: Comprehensive Transaction File
The `transactions.csv` file includes:
- **All transactions for all 3 months**
- Opening balance entries for each period
- Invoice receipts with dates
- Payment activity with check numbers
- Accrual entries
- Organized chronologically for roll-forward tracing

### Roll-Forward Verification
- Aug closing = Sep opening ✅
- Sep closing = Oct closing ✅
- Activity = Closing - Opening ✅

### Expected Results
- All 6 account-periods: $0 variance
- Status: All Balanced
- Risk Level: LOW
- Agent behavior: Should confirm clean roll-forward across periods

### Use This For
- Testing multi-period reconciliation logic
- Validating roll-forward calculations
- Demonstrating quarterly close process
- Training on period continuity
- Performance testing (larger dataset)

---

## Scenario 05: Missing Subledger Data 🔴
**Category**: Data Integrity / Critical
**Complexity**: ⭐⭐⭐ Medium-Complex
**Severity**: **CRITICAL - Month-End Blocker**
**Files**: gl_balance.csv, subledger_balance.csv, **transactions.csv**

### What It Tests
- Data completeness validation
- Manual journal entry detection
- Missing documentation identification
- Critical variance handling

### The Problem
- GL shows -$1,185,000 balance
- Subledger only shows -$800,000 in invoices
- **Missing $385,000 in supporting detail**
- Caused by manual journal entry bypassing AP system

### Key Feature: The Smoking Gun Transaction
The `transactions.csv` file reveals:
- **JE-2025-1045**: Manual accrual for $385k
- Posted directly to GL on Oct 25
- Description: "Construction project accrual"
- **NOT reflected in AP subledger** (the problem!)
- Clear annotation showing this is the culprit

### Expected Results
- Variance: -$385,000 (GL > Subledger)
- Status: Material Variance
- Risk Level: **HIGH**
- Severity: **CRITICAL**
- Agent behavior:
  - Should flag as urgent/critical
  - Identify manual journal entry as cause
  - Recommend immediate investigation
  - Flag as month-end blocker

### Use This For
- Testing data completeness validation
- Demonstrating serious accounting issues
- Training on journal entry controls
- Showing when reconciliation blocks month-end close
- Testing agent severity assessment

---

## Scenario Comparison Matrix

| Scenario | Variance | Status | Risk | Complexity | Has Transactions | Key Learning |
|----------|----------|--------|------|------------|-----------------|--------------|
| 01 - Balanced | $0 | ✅ Balanced | LOW | ⭐ | ✅ Yes | Baseline functionality |
| 02 - Duplicate | $275k | ⚠️ Material | MED/HIGH | ⭐⭐ | ❌ No | Error detection |
| 03 - Timing | $180k | ⚠️ Material | MEDIUM | ⭐⭐⭐ | ✅ **Yes** | Period cutoff controls |
| 04 - Multi-Period | $0 | ✅ Balanced | LOW | ⭐⭐⭐⭐ | ✅ **Yes** | Roll-forward logic |
| 05 - Missing Data | $385k | 🔴 Critical | **HIGH** | ⭐⭐⭐ | ✅ **Yes** | Data integrity |

---

## Transaction File Features

### What's Included in transactions.csv

**Standard Fields:**
- `account_code`: GL account number
- `booked_at`: Transaction date (YYYY-MM-DD format)
- `debit`: Debit amount (positive for payments)
- `credit`: Credit amount (positive for new invoices/accruals)
- `amount`: Net amount (debit - credit)
- `narrative`: Description of the transaction
- `source_period`: Accounting period (YYYY-MM)

**Special Annotations:**
- Opening balance entries for each period
- Clear descriptions identifying invoice numbers
- Check numbers for payments
- Accrual references
- **Highlighted problem transactions** (see Scenario 05)
- Period markers for multi-period scenarios

### Why Transaction Files Matter

1. **Complete Audit Trail**: Shows every entry affecting the account
2. **Root Cause Analysis**: Agents can trace variance to specific transaction
3. **Period Analysis**: Enables timing difference detection
4. **Roll-Forward Support**: Shows opening → activity → closing
5. **Investigation Evidence**: Provides detail for agent recommendations
6. **Realistic Testing**: Mirrors real-world month-end reconciliation packets

---

## Testing Workflow

### Basic Test (Scenario 01)
1. Upload gl_balance.csv and subledger_balance.csv
2. Map columns
3. Run reconciliation
4. Verify variance = $0
5. **Optional**: Upload transactions.csv to see activity detail

### Error Detection Test (Scenario 02, 03, 05)
1. Upload files
2. Run reconciliation
3. Verify variance matches expected
4. **Check transaction file** to trace root cause
5. Review agent investigation results
6. Compare to expected_results.json

### Multi-Period Test (Scenario 04)
1. Upload files (includes 3 periods)
2. Run reconciliation
3. **Review transaction file** showing 3 months of activity
4. Verify roll-forward calculations
5. Confirm opening balances carry forward correctly

---

## File Upload Order

### Recommended Upload Sequence:
1. **gl_balance.csv** (required)
2. **subledger_balance.csv** (required)
3. **transactions.csv** (optional but recommended)

### Why Upload Transactions?
Even though it's optional, the transaction file enables:
- Better root cause identification
- More detailed agent analysis
- Period-level activity breakdown
- Complete reconciliation documentation
- Enhanced investigation suggestions

---

## Agent Testing Guide

### Validation Agent Tests
- **Scenario 01**: Should score > 0.9 confidence
- **Scenario 02**: Should detect duplicate entries
- **Scenario 03**: Should flag period cutoff issue
- **Scenario 05**: Should warn about data completeness

### Analysis Agent Tests
- **Scenario 02-05**: Should identify material variances
- **Scenario 04**: Should recognize multi-period dataset
- **All Scenarios**: Risk level should match expected

### Investigation Agent Tests
- **Scenario 02**: Should suggest removing duplicate
- **Scenario 03**: Should recommend reclassification
- **Scenario 05**: Should flag as urgent/critical

### Report Agent Tests
- **All Scenarios**: Should generate clear, actionable reports
- **Scenario 05**: Should emphasize severity and urgency

---

## Recommended Testing Sequence

1. **Start Here**: Scenario 01 (verify system works)
2. **Simple Error**: Scenario 02 (test error detection)
3. **Timing Issues**: Scenario 03 (test period logic)
4. **Advanced**: Scenario 04 (test multi-period)
5. **Critical Issues**: Scenario 05 (test severity handling)

---

## Creating New Scenarios

### Required Files
1. **README.md**: Narrative explanation
2. **gl_balance.csv**: GL balances
3. **subledger_balance.csv**: Supporting detail
4. **transactions.csv**: Activity log (**recommended**)
5. **expected_results.json**: Test assertions

### Transaction File Template
```csv
account_code,booked_at,debit,credit,amount,narrative,source_period
20100,2025-10-01,0,0,0,Opening balance October 2025,2025-10
20100,2025-10-05,0,335000,-335000,Invoice INV-12345 - Vendor Name,2025-10
20100,2025-10-10,150000,0,150000,Payment CHK-001 - Vendor Name,2025-10
```

### Best Practices
- Include opening balance entries
- Reference invoice/check numbers
- Use clear, descriptive narratives
- Highlight problem transactions
- Organize chronologically
- Include period markers

---

## Summary

With these 5 scenarios, you can test:
- ✅ Basic reconciliation (Scenario 01)
- ✅ Error detection (Scenario 02)
- ✅ Period cutoff controls (Scenario 03)
- ✅ Multi-period logic (Scenario 04)
- ✅ Data integrity issues (Scenario 05)

**Transaction files** in Scenarios 03, 04, and 05 provide the complete audit trail needed for thorough reconciliation analysis and agent training.
