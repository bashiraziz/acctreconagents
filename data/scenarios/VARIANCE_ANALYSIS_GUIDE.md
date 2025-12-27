# Variance Analysis Testing Guide

## Overview

Scenarios 09-10 test Rowshni's ability to not just **detect** variances, but **analyze WHY they exist** and **recommend how to fix them**. This validates the AI investigation and root cause analysis capabilities.

---

## Quick Comparison

| Scenario | Focus | AI Challenge | Real-World Analogy |
|----------|-------|--------------|-------------------|
| **09: Multiple Variance Types** | Individual errors | Classify and prioritize | "Found 3 errors in the month-end" |
| **10: Systematic Errors** | Pattern detection | Identify root processes | "The AP interface is broken" |

---

## Scenario 09: Multiple Variance Types

### What It Tests
- ✅ **Duplicate Detection**: Same invoice appears twice
- ✅ **Amount Discrepancies**: GL vs subledger mismatch
- ✅ **Mixed Results**: Both problems and clean data
- ✅ **Prioritization**: Which variance is most critical?

### The Variances

**Account 2000** - Duplicate Invoice: **$22,500**
```
Problem: Invoice GC-4401 from Global Consulting appears TWICE
Why:     Data entry error - invoice posted twice to subledger
Fix:     Remove one instance of GC-4401
```

**Account 2100** - Amount Error: **$1,400**
```
Problem: Accrual calculation off by $1,400
Why:     GL accrual journal entry incorrect
Fix:     Post adjusting entry for $1,400
```

**Accounts 2200 & 3000** - Balanced: **$0**
```
Status: Perfect reconciliation
Purpose: Control accounts to test mixed results
```

### Expected AI Behavior
The AI should:
1. Identify the duplicate by matching invoice numbers
2. Calculate variance amounts correctly
3. Prioritize by dollar amount (duplicate is larger)
4. Provide specific resolution steps for each
5. Acknowledge balanced accounts as clean

**Key Phrase to Look For**: "Invoice GC-4401 appears twice"

---

## Scenario 10: Systematic Errors

### What It Tests
- ✅ **Pattern Recognition**: Recurring vendor with missing invoice
- ✅ **Systematic Detection**: Entire category affected
- ✅ **Process-Level Thinking**: Interface/calculation failures
- ✅ **Root Cause Depth**: Beyond individual transactions

### The Patterns

**Account 2000** - Missing Vendor Pattern: **$46,800**
```
Problem: TechStaff Solutions has 4 weekly invoices in subledger, only 3 in GL
Pattern: Week 1 ✅, Week 2 ✅, Week 3 ✅, Week 4 ❌ (missing)
Why:     AP-to-GL interface failed to transfer Week 4
Fix:     Fix interface, post missing invoice, prevent recurrence
```

**Account 4100** - Calculation Error Pattern: **$46,000**
```
Problem: ALL contract labor expenses overstated by ~58%
Pattern: Every contractor invoice affected by same error
Why:     GL posting logic has systematic error (burden/tax/conversion?)
Fix:     Fix posting calculation, post correction, review process
```

**Account 1300** - Balanced: **$0**
```
Status: Perfect reconciliation
Purpose: Control account for comparison
```

### Expected AI Behavior
The AI should:
1. **Recognize the pattern** - Not just "variance exists" but "recurring vendor has systematic issue"
2. **Think process-level** - Suggest "interface failure" not just "missing invoice"
3. **Analyze category** - Notice ALL contract labor is affected
4. **Recommend process fixes** - "Review posting logic" not just "post correction"
5. Use language like "systematic", "pattern", "interface", "process"

**Key Phrases to Look For**:
- "Systematic issue with TechStaff Solutions"
- "Pattern of missing invoices from recurring vendor"
- "Interface failure suspected"
- "All contract labor affected"
- "Process-level error"

---

## Testing Progression

### Level 1: Basic Detection (Scenario 09)
**Question**: Can the AI find variances?
**Expected**: Yes - finds 2 material variances

### Level 2: Classification (Scenario 09)
**Question**: Can the AI distinguish duplicate from amount error?
**Expected**: Yes - identifies duplicate by invoice #, amount error by calculation

### Level 3: Pattern Recognition (Scenario 10)
**Question**: Can the AI see TechStaff has 3 of 4 invoices?
**Expected**: Yes - recognizes weekly recurring pattern with one missing

### Level 4: Systematic Thinking (Scenario 10)
**Question**: Can the AI realize ALL contract labor is affected?
**Expected**: Yes - analyzes category, not just individual amounts

### Level 5: Process Recommendations (Scenario 10)
**Question**: Does the AI recommend fixing processes vs. transactions?
**Expected**: Yes - suggests "review interface" and "fix posting logic"

---

## Success Criteria Matrix

| Capability | Scenario 09 | Scenario 10 | How to Verify |
|------------|-------------|-------------|---------------|
| **Variance Detection** | 2 variances | 2 variances | Check reconciliation results |
| **Root Cause** | Duplicate + Amount error | Interface + Calculation | Check investigation report |
| **Pattern Recognition** | N/A | TechStaff pattern | Look for "pattern" or "systematic" |
| **Recommendations** | Fix each transaction | Fix processes | Check suggested actions |
| **Language Used** | Transaction-focused | Process-focused | Read report carefully |

---

## Report Language Comparison

### Scenario 09 Report Should Say:
❌ **DON'T**: "There are variances"
✅ **DO**: "Duplicate invoice GC-4401 detected ($22,500) and accrual calculation error ($1,400)"

❌ **DON'T**: "Investigate Account 2000"
✅ **DO**: "Remove duplicate entry for invoice GC-4401 from Global Consulting"

### Scenario 10 Report Should Say:
❌ **DON'T**: "Account 2000 has variance"
✅ **DO**: "Systematic pattern detected: TechStaff Solutions Week 4 invoice missing from GL, suggesting interface failure"

❌ **DON'T**: "Post correction for $46,000"
✅ **DO**: "ALL contract labor overstated by 58% - review GL posting logic, fix systematic calculation error, then post correction"

---

## Real-World Value

### Why Scenario 09 Matters
**Accountant's Perspective**: "At month-end, I have a list of variances. Help me prioritize and resolve them."

**What AI Should Do**:
- Identify each issue clearly
- Suggest resolution for each
- Prioritize by amount/risk
- Provide actionable steps

**Value**: Saves time investigating individual variances

---

### Why Scenario 10 Matters
**Accountant's Perspective**: "Something's wrong with our processes. Help me find the root cause so I can fix it permanently."

**What AI Should Do**:
- Recognize patterns across transactions
- Identify system/process failures
- Suggest process improvements
- Prevent future occurrences

**Value**: Prevents recurring errors, improves processes

---

## Common Testing Mistakes

### ❌ Wrong: Only Check Variance Amounts
The dollar amounts are less important than the AI's analysis.
✅ **Right**: Check if AI explains WHY variance exists

### ❌ Wrong: Expect Same Report for Both Scenarios
These test different capabilities.
✅ **Right**: Expect Scenario 10 to use more sophisticated language

### ❌ Wrong: Focus on Resolution Steps Only
Anyone can say "post correction."
✅ **Right**: Check if AI identifies ROOT CAUSE

### ❌ Wrong: Ignore the Balanced Accounts
These are important controls.
✅ **Right**: Verify AI correctly reports them as balanced

---

## Advanced Testing Ideas

### Test 1: Upload Scenario 09, Then Ask Follow-Up
**Upload**: Scenario 09 files
**Run**: Reconciliation
**Then Ask**: "Which variance should I fix first?"
**Expected**: "Fix the duplicate ($22,500) first - it's larger and easier to resolve"

### Test 2: Upload Scenario 10, Then Ask About Patterns
**Upload**: Scenario 10 files
**Run**: Reconciliation
**Then Ask**: "Are there any patterns in these variances?"
**Expected**: "Yes - TechStaff Solutions has systematic missing invoice pattern, and all contract labor is overstated"

### Test 3: Compare Reports Side-by-Side
**Upload Both**: Run both scenarios
**Compare**: Language used in each report
**Look For**: Different sophistication levels

---

## Variance Type Quick Reference

### Individual Errors (Test with Scenario 09)
| Error Type | Detection Method | Resolution |
|------------|-----------------|------------|
| Duplicate | Match invoice numbers | Remove duplicate |
| Amount Wrong | Compare GL vs subledger | Post correction |
| Missing Entry | Compare transaction lists | Add missing item |

### Systematic Errors (Test with Scenario 10)
| Error Type | Detection Method | Resolution |
|------------|-----------------|------------|
| Interface Failure | Pattern in missing data | Fix interface + add missing |
| Calculation Error | Category analysis | Fix logic + post correction |
| Cutoff Issue | Timing pattern | Fix cutoff process |

---

## Files Location

```
data/scenarios/
├── 09-multiple-variance-types/
│   ├── gl_balance.csv
│   ├── subledger_balance.csv
│   └── README.md (detailed variance analysis)
│
└── 10-systematic-errors/
    ├── gl_balance.csv
    ├── subledger_balance.csv
    └── README.md (pattern detection guide)
```

---

## Testing Checklist

### Before Testing
- [ ] Read both README files
- [ ] Understand the difference (individual vs systematic)
- [ ] Review expected AI behavior

### During Testing - Scenario 09
- [ ] Upload files
- [ ] Map columns
- [ ] Run reconciliation
- [ ] Check: 2 variances detected?
- [ ] Check: Duplicate identified by invoice #?
- [ ] Check: Both balanced accounts show $0?

### During Testing - Scenario 10
- [ ] Upload files
- [ ] **Important**: Map vendor column
- [ ] Run reconciliation
- [ ] Check: 2 variances detected?
- [ ] **Check: Report mentions "pattern" or "systematic"?** (Critical!)
- [ ] **Check: Recommends process fixes?** (Critical!)

### After Testing
- [ ] Compare reports from both scenarios
- [ ] Verify language differences
- [ ] Check investigation depth
- [ ] Validate recommendations appropriate to error type

---

## Expected Results Summary

### Scenario 09
```
✅ Account 2000: $22,500 variance (duplicate)
✅ Account 2100: $1,400 variance (amount error)
✅ Account 2200: $0 (balanced)
✅ Account 3000: $0 (balanced)

AI Report Should:
- List each variance separately
- Identify duplicate by invoice number
- Suggest fixing each transaction
- Prioritize by amount
```

### Scenario 10
```
✅ Account 2000: $46,800 variance (missing pattern)
✅ Account 4100: $46,000 variance (calculation error)
✅ Account 1300: $0 (balanced)

AI Report Should:
- Use words: "systematic", "pattern", "interface"
- Identify TechStaff missing invoice pattern
- Note ALL contract labor affected
- Recommend process fixes, not just transaction fixes
```

---

## Success Definition

**You've validated the variance analysis if**:

✅ **Scenario 09**: AI correctly identifies and classifies individual errors
✅ **Scenario 10**: AI recognizes PATTERNS and suggests PROCESS fixes
✅ **Both**: AI doesn't recommend automation (already automated!)
✅ **Both**: Reports are clear, actionable, and accurate

**The ultimate test**: Would a real accountant reading the report understand what to do next?

---

**Ready to test the AI's analytical capabilities!** 🔍

These scenarios move beyond basic reconciliation to test true variance investigation and root cause analysis.
