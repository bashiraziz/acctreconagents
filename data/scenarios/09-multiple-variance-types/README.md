# Multiple Variance Types Test Scenario

## Purpose
Test the system's ability to detect, analyze, and investigate multiple different types of variances in a single reconciliation. This scenario validates:
- Variance detection across multiple accounts
- Materiality threshold application
- Root cause classification
- AI agent investigation prioritization
- Report generation for mixed results

## Scenario Overview

This scenario contains **4 accounts** with **4 different variance types**:
1. **Account 2000**: Duplicate invoice (material variance)
2. **Account 2100**: Missing invoice (material variance)
3. **Account 2200**: Data entry error (immaterial variance)
4. **Account 3000**: Perfect reconciliation (control)

**Materiality Threshold**: $50 (default)

## Account-by-Account Analysis

### Account 2000: Accounts Payable - DUPLICATE INVOICE

**GL Balance**: -$125,450.00
**Subledger Balance**: -$147,950.00
**Variance**: **$22,500.00** (material ✅)

**Root Cause**: Duplicate entry
- Invoice GC-4401 from Global Consulting appears **TWICE** in subledger
- Amount: -$22,500.00 duplicated
- Same invoice number, date, vendor, amount

**Subledger Detail:**
```
TechCorp Solutions     INV-5521      -32,500.00
Office Suppliers Inc   OS-9912       -18,750.00
Widget Manufacturing   WM-7845       -22,500.00
Global Consulting      GC-4401       -22,500.00  ← First entry
Global Consulting      GC-4401       -22,500.00  ← DUPLICATE!
IT Services Co         IT-2025-145    -6,700.00
                                    -----------
Total                              -147,950.00
```

**Expected Agent Behavior:**
- **Validation Agent**: Flag duplicate invoice number
- **Analysis Agent**: Classify as HIGH priority, data entry error
- **Investigation Agent**: Identify exact duplicate (same invoice twice)
- **Report Generator**: Recommend removing one instance of GC-4401

**Resolution**: Remove duplicate entry → Variance becomes $0.00

---

### Account 2100: Accrued Expenses - MISSING INVOICE

**GL Balance**: -$45,600.00
**Subledger Balance**: -$47,000.00
**Variance**: **$1,400.00** (material ✅)

**Root Cause**: Amount mismatch in GL
- Payroll accrual: GL shows -$35,000.00 but should be -$35,000.00 ✓
- Benefits accrual: GL shows part of total, but calculation error

**Calculation:**
```
GL Total:        -45,600.00
Subledger Total: -47,000.00
Variance:         1,400.00 (GL understated)
```

**Expected Variance Source:**
The GL accrual journal entry was $1,400 less than the actual accrued amounts.

**Expected Agent Behavior:**
- **Validation Agent**: Note variance exists
- **Analysis Agent**: Classify as MEDIUM priority
- **Investigation Agent**: Identify accrual calculation discrepancy
- **Report Generator**: Recommend adjusting journal entry by $1,400

**Resolution**: Post adjustment for $1,400 → Variance becomes $0.00

---

### Account 2200: Sales Tax Payable - DATA ENTRY ERROR

**GL Balance**: -$8,950.75
**Subledger Balance**: -$8,950.75
**Variance**: **$0.00** (balanced ✅)

**Status**: Perfect reconciliation - no issues

**Subledger Detail:**
```
State Sales Tax  TAX-CA-DEC   -5,200.50
Local Sales Tax  TAX-SF-DEC   -3,750.25
                             ---------
Total                        -8,950.75 ✅
```

**Expected Agent Behavior:**
- **Validation Agent**: Confirm balanced status
- **Analysis Agent**: No variance to analyze
- **Investigation Agent**: No investigation needed
- **Report Generator**: Note clean reconciliation

---

### Account 3000: Deferred Revenue - PERFECT RECONCILIATION

**GL Balance**: -$156,000.00
**Subledger Balance**: -$156,000.00
**Variance**: **$0.00** (balanced ✅)

**Status**: Perfect reconciliation - control account

**Subledger Detail:**
```
Customer A - Annual Support  SUB-CUST-A-2026  -78,000.00
Customer B - License Fees    SUB-CUST-B-2026  -78,000.00
                                             -----------
Total                                        -156,000.00 ✅
```

**Expected Agent Behavior:**
- **Validation Agent**: Confirm balanced status
- **Analysis Agent**: No variance
- **Investigation Agent**: No investigation needed
- **Report Generator**: Acknowledge clean status

---

## Summary of Variances

| Account | Account Name | GL Balance | Subledger Balance | Variance | Material? | Type |
|---------|-------------|-----------|-------------------|----------|-----------|------|
| 2000 | Accounts Payable | -$125,450.00 | -$147,950.00 | **$22,500.00** | ✅ Yes | Duplicate |
| 2100 | Accrued Expenses | -$45,600.00 | -$47,000.00 | **$1,400.00** | ✅ Yes | Amount Error |
| 2200 | Sales Tax Payable | -$8,950.75 | -$8,950.75 | $0.00 | ❌ No | Balanced |
| 3000 | Deferred Revenue | -$156,000.00 | -$156,000.00 | $0.00 | ❌ No | Balanced |

**Total Material Variances**: 2
**Total Accounts**: 4
**Reconciliation Success Rate**: 50%

---

## Expected AI Agent Analysis

### Data Validation Agent
**Should produce:**
```json
{
  "isValid": true,
  "confidence": 0.7,
  "warnings": [
    "Duplicate invoice detected: GC-4401 appears twice in Account 2000",
    "Account 2100 has variance of $1,400.00",
    "Account 2000 has material variance of $22,500.00"
  ],
  "errors": [],
  "dataQualityScore": 70,
  "suggestions": [
    "Investigate duplicate invoice GC-4401",
    "Review accrual calculations for Account 2100"
  ]
}
```

### Reconciliation Analyst Agent
**Should produce:**
```json
{
  "riskLevel": "high",
  "materialVariances": [
    {
      "account": "2000",
      "variance": 22500.00,
      "percentage": 17.9,
      "pattern": "Duplicate invoice entry",
      "priority": "high"
    },
    {
      "account": "2100",
      "variance": 1400.00,
      "percentage": 3.1,
      "pattern": "Accrual calculation error",
      "priority": "medium"
    }
  ],
  "patterns": [
    "Duplicate transaction in AP",
    "Accrual variance suggests calculation review needed"
  ],
  "flags": [
    "HIGH: Duplicate invoice GC-4401 in Account 2000",
    "MEDIUM: Accrual discrepancy in Account 2100"
  ],
  "overallHealth": 50
}
```

### Variance Investigator Agent
**Should produce:**
```json
{
  "investigations": [
    {
      "account": "2000",
      "variance": 22500.00,
      "possibleCauses": [
        "Invoice GC-4401 entered twice in AP system",
        "Duplicate payment processing",
        "Interface error from source system"
      ],
      "suggestedActions": [
        "Remove duplicate entry for invoice GC-4401",
        "Verify only one payment was made to Global Consulting",
        "Review AP entry controls to prevent future duplicates"
      ],
      "confidenceLevel": "high",
      "needsManualReview": true,
      "auditNotes": "Clear duplicate - same invoice number, vendor, date, and amount"
    },
    {
      "account": "2100",
      "variance": 1400.00,
      "possibleCauses": [
        "Accrual calculation spreadsheet error",
        "Incomplete payroll data when accrual posted",
        "Benefits rate change not reflected in accrual"
      ],
      "suggestedActions": [
        "Post adjusting journal entry for $1,400",
        "Review accrual calculation methodology",
        "Verify source data for December payroll and benefits"
      ],
      "confidenceLevel": "medium",
      "needsManualReview": true,
      "auditNotes": "Small variance suggests calculation or data input error"
    }
  ]
}
```

### Report Generator Agent
**Should generate report with:**
- Executive summary noting 2 material variances
- Risk level: High (duplicate invoice)
- Clear documentation of each variance
- Prioritized action items
- No "consider automation" recommendations

---

## Testing Focus

### Variance Detection
✅ System detects duplicate invoice GC-4401
✅ System calculates correct variance amounts
✅ System applies materiality threshold ($50)
✅ System identifies balanced vs. variance accounts

### Root Cause Analysis
✅ AI agents identify duplicate as root cause for Account 2000
✅ AI agents suggest accrual error for Account 2100
✅ AI agents prioritize by variance amount
✅ AI agents provide actionable recommendations

### Report Quality
✅ Report clearly explains each variance
✅ Report prioritizes material items
✅ Report provides resolution steps
✅ Report doesn't contradict reconciliation data

### Mixed Results Handling
✅ System handles mix of balanced and variance accounts
✅ Report acknowledges both problems and successes
✅ Investigation focuses on variance accounts only

---

## Resolution Steps

### To Fix Account 2000 (Duplicate)
1. Review AP system for invoice GC-4401
2. Confirm only ONE invoice exists from Global Consulting
3. Remove duplicate subledger entry
4. Re-run reconciliation → should balance

### To Fix Account 2100 (Amount Error)
1. Review accrual calculation workpapers
2. Verify actual payroll and benefits amounts
3. Post adjusting journal entry:
   ```
   DR Accrued Expenses  $1,400
   CR [Expense Account]  $1,400
   ```
4. Re-run reconciliation → should balance

---

## Column Mapping Instructions

### GL Balance File
```
account_code → account_code
account_name → (optional, for reference)
period → period (or use metadata: "2025-12")
currency → currency (or use metadata: "USD")
amount → amount
```

### Subledger File
```
account_code → account_code
amount → amount
invoice_number → invoice_number (optional, helps identify duplicate)
vendor → vendor (optional, for reporting)

Metadata:
  period: "2025-12"
  currency: "USD"
```

---

## Expected Reconciliation Output

```
Account 2000 (Accounts Payable):
  GL:         -$125,450.00
  Subledger:  -$147,950.00
  Variance:    $22,500.00 ❌ MATERIAL
  Status:      Variance

Account 2100 (Accrued Expenses):
  GL:         -$45,600.00
  Subledger:  -$47,000.00
  Variance:     $1,400.00 ❌ MATERIAL
  Status:      Variance

Account 2200 (Sales Tax Payable):
  GL:          -$8,950.75
  Subledger:   -$8,950.75
  Variance:        $0.00 ✅ BALANCED
  Status:      Balanced

Account 3000 (Deferred Revenue):
  GL:        -$156,000.00
  Subledger: -$156,000.00
  Variance:        $0.00 ✅ BALANCED
  Status:      Balanced
```

---

## Success Criteria

The system passes if:
- ✅ Detects 2 material variances
- ✅ Identifies 2 balanced accounts
- ✅ Flags duplicate invoice GC-4401
- ✅ Calculates variance amounts correctly
- ✅ Applies materiality threshold properly
- ✅ AI agents provide distinct root causes
- ✅ AI agents prioritize high-value variance
- ✅ Report includes actionable recommendations
- ✅ Report doesn't recommend automation

---

## Variance Type Classification

| Type | Example | Detectability | Priority |
|------|---------|--------------|----------|
| **Duplicate Entry** | GC-4401 twice | Easy (same invoice #) | HIGH |
| **Amount Error** | Accrual $1,400 off | Medium (calculation check) | MEDIUM |
| **Perfect Match** | Tax & Revenue | N/A | N/A |

This scenario tests the full spectrum of reconciliation outcomes!
