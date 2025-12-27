# Systematic Errors Test Scenario

## Purpose
Test the system's ability to detect **patterns** and **systematic issues** rather than random individual variances. This scenario validates:
- Pattern recognition across multiple transactions
- Systematic error detection (e.g., missing all invoices from one vendor)
- Process failure identification
- Interface/integration error detection
- AI agent ability to identify root causes beyond individual transactions

## Scenario Overview

This scenario contains **3 accounts** with **3 different systematic error patterns**:
1. **Account 2000 (AP)**: Missing vendor invoices (interface failure pattern)
2. **Account 4100 (Contract Labor)**: Rounding/calculation errors (systematic process issue)
3. **Account 1300 (Prepaid)**: Perfect reconciliation (control)

**Materiality Threshold**: $50 (default)

---

## Account-by-Account Analysis

### Account 2000: Accounts Payable - MISSING VENDOR PATTERN

**GL Balance**: -$285,600.00
**Subledger Balance**: -$238,800.00
**Variance**: **$46,800.00** (material ✅)

**Root Cause**: SYSTEMATIC - All invoices from TechStaff Solutions missing from GL

**Pattern Detected:**
- TechStaff Solutions has 4 weekly invoices in subledger: -$45,600 each
- **ONLY 3 invoices** recorded in GL
- Missing invoice: **INV-2025-1222** (December Week 4) = -$45,600
- **Plus**: Additional small variance of $1,200 (other vendors)

**The Pattern:**
```
Subledger has:
  INV-2025-1201 (Week 1)  -45,600.00  ✅ In GL
  INV-2025-1208 (Week 2)  -45,600.00  ✅ In GL
  INV-2025-1215 (Week 3)  -45,600.00  ✅ In GL
  INV-2025-1222 (Week 4)  -45,600.00  ❌ MISSING FROM GL!

GL only has 3 invoices totaling: -136,800.00
Subledger has 4 invoices totaling: -182,400.00
Pattern variance: -45,600.00 (one missing invoice)
```

**Additional Variances:**
- Other vendors: Small $1,200 variance (timing/rounding)

**Total Variance**: $46,800.00

**Expected Agent Behavior:**
- **Validation Agent**: Flag significant variance
- **Analysis Agent**: Detect pattern - TechStaff invoices always weekly
- **Investigation Agent**: Identify **SYSTEMATIC MISSING** invoice from recurring vendor
- **Report Generator**: Recommend checking interface between AP system and GL, investigate why Week 4 invoice didn't transfer

**This tests**: Pattern recognition - not just "there's a variance" but "invoices from this vendor are systematically missing"

**Resolution**:
1. Investigate interface between AP and GL
2. Check if INV-2025-1222 was approved/posted in AP
3. Manually post missing journal entry or re-run interface
4. Review controls for recurring vendor processing

---

### Account 4100: Contract Labor - CALCULATION/ROUNDING ERRORS

**GL Balance**: $125,800.00
**Subledger Balance**: $79,800.00
**Variance**: **$46,000.00** (material ✅)

**Root Cause**: SYSTEMATIC - Contract labor expense interface has calculation error

**Pattern Detected:**
All contract labor invoices processed through different system with conversion error.

**The Issue:**
```
Subledger Detail (Correct):
  Freelancer A          -8,500.00
  Freelancer B         -12,300.00
  Contractor Corp      -25,600.00
  Specialist Services  -18,900.00
  Independent Pro      -14,500.00
  Total:               -79,800.00

GL shows expenses as POSITIVE (correct) but amount is WRONG:
  GL Debit:            125,800.00 (should be 79,800.00)
  Difference:           46,000.00

Pattern: GL amount is approximately 158% of actual
Hypothesis: Currency conversion applied incorrectly? OR
           Tax/burden loaded that shouldn't be? OR
           Duplicate batches posted?
```

**Expected Agent Behavior:**
- **Validation Agent**: Flag large variance
- **Analysis Agent**: Detect that ALL contract labor is overstated
- **Investigation Agent**: Identify systematic overstatement pattern
- **Report Generator**: Recommend reviewing GL posting interface, checking if burden/taxes incorrectly applied

**This tests**: Detection of systematic calculation errors affecting all transactions in a category

**Resolution**:
1. Review contract labor posting interface
2. Check if burden allocation incorrectly applied to GL
3. Verify no duplicate batches posted
4. Post correcting journal entry: CR Contract Labor $46,000, DR [error account]

---

### Account 1300: Prepaid Expenses - PERFECT RECONCILIATION

**GL Balance**: $45,600.00
**Subledger Balance**: $45,600.00
**Variance**: **$0.00** (balanced ✅)

**Status**: Perfect reconciliation - control account

**Subledger Detail:**
```
Software Licenses  LIC-2026-ANNUAL   -22,800.00
Insurance Prepaid  INS-2026-H1       -22,800.00
                                     ----------
Total                                -45,600.00 ✅
```

Note: Amounts show as negative in subledger (credits to AP) but GL shows as positive debit to Prepaid Expenses asset account. **This is normal** - the transformation handles the account type correctly.

**Expected Agent Behavior:**
- **Validation Agent**: Confirm balanced status
- **Analysis Agent**: No variance
- **Investigation Agent**: No investigation needed
- **Report Generator**: Acknowledge clean reconciliation

---

## Summary of Variances

| Account | Account Name | GL Balance | Subledger Balance | Variance | Material? | Pattern Type |
|---------|-------------|-----------|-------------------|----------|-----------|--------------|
| 2000 | Accounts Payable | -$285,600 | -$238,800 | **$46,800** | ✅ Yes | Missing invoices (interface) |
| 4100 | Contract Labor | $125,800 | $79,800 | **$46,000** | ✅ Yes | Calculation error (systematic) |
| 1300 | Prepaid Expenses | $45,600 | $45,600 | $0.00 | ❌ No | Balanced |

**Total Material Variances**: 2
**Systematic Patterns**: 2
**Reconciliation Success Rate**: 33%

---

## Expected AI Agent Analysis

### Data Validation Agent
**Should produce:**
```json
{
  "isValid": true,
  "confidence": 0.6,
  "warnings": [
    "Account 2000 variance of $46,800 - significant for recurring vendor",
    "Account 4100 variance of $46,000 - all contract labor affected",
    "Pattern detected: Missing transactions from TechStaff Solutions"
  ],
  "errors": [],
  "dataQualityScore": 60,
  "suggestions": [
    "Review AP-to-GL interface for TechStaff Solutions invoices",
    "Investigate contract labor posting calculation",
    "Check for systematic interface or process failures"
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
      "variance": 46800.00,
      "percentage": 16.4,
      "pattern": "Missing recurring vendor invoices - interface failure suspected",
      "priority": "high"
    },
    {
      "account": "4100",
      "variance": 46000.00,
      "percentage": 57.6,
      "pattern": "Systematic overstatement - calculation or burden error",
      "priority": "high"
    }
  ],
  "patterns": [
    "SYSTEMATIC: TechStaff Solutions invoices incomplete in GL",
    "SYSTEMATIC: All contract labor expenses overstated by ~58%",
    "Both variances suggest PROCESS failures, not one-off errors"
  ],
  "flags": [
    "HIGH: Missing invoice pattern for TechStaff Solutions",
    "HIGH: Contract labor systematically overstated",
    "PROCESS: AP-to-GL interface needs review",
    "PROCESS: Contract labor posting logic requires investigation"
  ],
  "overallHealth": 40
}
```

### Variance Investigator Agent
**Should produce:**
```json
{
  "investigations": [
    {
      "account": "2000",
      "variance": 46800.00,
      "possibleCauses": [
        "AP-to-GL interface failed to transfer one TechStaff invoice",
        "Week 4 invoice not approved before GL cutoff",
        "Batch processing error in interface",
        "Manual entry missed for recurring vendor"
      ],
      "suggestedActions": [
        "Check AP system for invoice INV-2025-1222 status",
        "Review interface logs for December batch transfers",
        "Manually post missing invoice to GL",
        "Implement reconciliation of recurring vendors before close"
      ],
      "confidenceLevel": "high",
      "needsManualReview": true,
      "auditNotes": "Pattern: 3 of 4 weekly invoices posted suggests systematic interface issue, not random error"
    },
    {
      "account": "4100",
      "variance": 46000.00,
      "possibleCauses": [
        "GL posting includes burden/overhead that shouldn't",
        "Currency conversion error applied incorrectly",
        "Duplicate batch posted to GL",
        "Tax calculation included in GL but not subledger"
      ],
      "suggestedActions": [
        "Review GL entry for contract labor posting - compare to source",
        "Check if burden allocation incorrectly applied",
        "Verify only one batch posted for each contractor invoice",
        "Post correcting journal entry for $46,000 overstatement"
      ],
      "confidenceLevel": "high",
      "needsManualReview": true,
      "auditNotes": "ALL contract labor overstated by similar percentage - systematic issue, not isolated error"
    }
  ]
}
```

### Report Generator Agent
**Should generate report noting:**
- **CRITICAL**: TWO systematic process failures identified
- **Pattern 1**: Recurring vendor invoices not fully transferred from AP to GL
- **Pattern 2**: Contract labor posting has systematic calculation error
- **Risk Level**: High - these are PROCESS issues, not one-off mistakes
- **Recommendations**:
  - Review and fix AP-to-GL interface
  - Audit contract labor posting logic
  - Implement automated reconciliation before month-end close
  - **NOT**: "Consider automation" (already automated!)

---

## Testing Focus

### Pattern Recognition
✅ System identifies missing invoice from RECURRING vendor (not just "missing invoice")
✅ System detects ALL contract labor is overstated (not just variance amount)
✅ AI agents identify SYSTEMATIC vs. RANDOM errors

### Root Cause Classification
✅ Interface failure (missing data transfer)
✅ Calculation/posting error (systematic overstatement)
✅ Process failure vs. data entry error

### Investigation Depth
✅ AI agents look beyond individual transactions
✅ AI agents identify process/system issues
✅ AI agents recommend process improvements, not just journal entries

### Reporting Quality
✅ Report emphasizes SYSTEMATIC nature
✅ Report prioritizes process fixes over transaction fixes
✅ Report clearly explains patterns detected

---

## Column Mapping Instructions

### GL Balance File
```
account_code → account_code
amount → amount
period → "2025-12" (metadata)
currency → "USD" (metadata)
```

### Subledger File
```
account_code → account_code
amount → amount
invoice_number → invoice_number (helps identify pattern)
vendor → vendor (critical for pattern detection!)

Metadata:
  period: "2025-12"
  currency: "USD"
```

**Note**: Make sure to map "vendor" field - it's needed for AI agents to detect the TechStaff pattern!

---

## Expected Reconciliation Output

```
Account 2000 (Accounts Payable):
  GL:         -$285,600.00
  Subledger:  -$238,800.00
  Variance:     $46,800.00 ❌ MATERIAL
  Status:      Variance
  Pattern:     Missing invoices from TechStaff Solutions

Account 4100 (Contract Labor):
  GL:          $125,800.00
  Subledger:    $79,800.00
  Variance:     $46,000.00 ❌ MATERIAL
  Status:      Variance
  Pattern:     Systematic overstatement of all contract labor

Account 1300 (Prepaid Expenses):
  GL:           $45,600.00
  Subledger:    $45,600.00
  Variance:         $0.00 ✅ BALANCED
  Status:      Balanced
```

---

## Success Criteria

The system passes if:
- ✅ Detects 2 material variances
- ✅ Identifies 1 balanced account
- ✅ AI agents recognize TechStaff Solutions missing invoice PATTERN
- ✅ AI agents recognize contract labor SYSTEMATIC overstatement
- ✅ Report emphasizes PROCESS failures, not just amounts
- ✅ Investigation identifies interface/calculation issues
- ✅ Recommendations focus on FIXING PROCESSES
- ✅ Report uses words like "systematic", "pattern", "all affected"
- ✅ Report doesn't just say "variance exists" but explains WHY pattern matters

---

## Pattern Types Tested

| Pattern Type | Example | Detection Method | Business Impact |
|--------------|---------|-----------------|-----------------|
| **Missing Data** | TechStaff Week 4 | Recurring vendor, regular amounts | Interface failure |
| **Calculation Error** | Contract labor +58% | All items in category affected | Posting logic error |
| **Clean Control** | Prepaid Expenses | N/A | Process working |

---

## What Makes This Different from Scenario 09

**Scenario 09**: Random individual errors (duplicate, missing invoice, amount error)
- Each variance is INDEPENDENT
- No pattern across variances
- Resolution: Fix individual transactions

**Scenario 10**: Systematic process failures
- Variances show PATTERNS
- Same root cause affects multiple transactions
- Resolution: Fix the PROCESS, not just transactions

**This tests AI's ability to think at the PROCESS level, not just transaction level.**

---

## Real-World Learning

This scenario simulates real issues accountants face:

1. **Interface Failures**: Systems don't always transfer all data (AP → GL)
2. **Recurring Vendors**: Missing patterns from weekly/monthly vendors harder to spot
3. **Calculation Errors**: Posting logic bugs affect entire categories
4. **Process vs. Transaction**: Some errors need process fixes, not just journal entries

**The AI should help identify WHICH type of issue exists so you can fix the root cause.**
