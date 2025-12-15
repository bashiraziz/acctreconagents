# Quick Reference: Creating Reconciliation Scenarios

## Common Commands to Trigger This Skill

Just ask naturally:
- "Create a new reconciliation scenario for [error type]"
- "Build a test case where [describe variance]"
- "I need a scenario showing [accounting situation]"
- "Add a test for [specific error condition]"

## Scenario Ideas to Request

### Easy (Good for Practice)
- "Create a scenario with a small $25 rounding difference"
- "Build a test where all accounts balance perfectly"
- "Make a scenario with a single invoice and payment"

### Medium (Common Errors)
- "Create a scenario where an invoice is missing from the subledger"
- "Build a test case with a $100,000 duplicate invoice"
- "Make a scenario where a payment is posted to the wrong period"
- "Create a test with an invoice in Oct but GL entry in Nov"

### Advanced (Complex Situations)
- "Build a 6-month roll-forward scenario"
- "Create a scenario with multiple timing differences across 3 accounts"
- "Make a test case with both duplicates and missing entries"
- "Build a scenario showing accrual reversal across periods"

### Critical Issues (Month-End Blockers)
- "Create a scenario where $500k in GL has no subledger support"
- "Build a test showing manual journal entries bypassing AP"
- "Make a critical data integrity scenario"

## Sign Convention Cheat Sheet

**For Accounts Payable and Accrued Expenses (Liabilities):**

| Transaction Type | Amount Sign | Effect |
|-----------------|-------------|--------|
| New invoice | **Negative** | Increases liability |
| Payment made | **Positive** | Decreases liability |
| Accrual | **Negative** | Increases liability |
| Accrual reversal | **Positive** | Decreases liability |
| Normal balance | **Negative** | Credit balance |

**Examples:**
- Invoice for $500k: `-500000.00`
- Payment of $300k: `+300000.00`
- Ending AP balance: `-1185000.00`

## Quick Calculation Check

**For a balanced scenario:**
```
GL Balance = Subledger Balance
Variance = 0
Status = balanced
```

**For variance scenario:**
```
GL Balance = X
Subledger Balance = Y
Variance = X - Y

If |Variance| >= $50 → material_variance
If |Variance| < $50 → immaterial_variance
```

## File Naming Pattern

```
data/scenarios/XX-error-type-description/
```

Examples:
- `06-rounding-difference/`
- `07-missing-invoice/`
- `08-wrong-period-posting/`
- `09-manual-journal-entry/`

## Variance Direction Guide

**Positive Variance (GL > Subledger):**
- GL has more liability than subledger shows
- Possible causes:
  - Missing subledger invoices
  - Manual GL entry without AP invoice
  - Data export failure from AP system

**Negative Variance (Subledger > GL):**
- Subledger has more detail than GL
- Possible causes:
  - Duplicate subledger entry
  - Invoice in AP not posted to GL
  - GL entry reversed but subledger not updated

## Accounts Reference

| Code | Name | Type | Normal Balance |
|------|------|------|----------------|
| 20100 | Accounts Payable Control | Liability | Negative (credit) |
| 22010 | Accrued Expenses | Liability | Negative (credit) |

## Testing Your New Scenario

After creating, test it:

1. Upload the CSV files to the web app
2. Map columns (include the `period` field!)
3. Run reconciliation
4. Verify:
   - Variance matches expected
   - Status is correct
   - Gemini agents detect the issue
   - Suggested actions make sense

## Common Mistakes to Avoid

❌ **Wrong sign**: Using positive for invoices (should be negative for liabilities)
❌ **Missing period field**: Subledger CSV must have `period` column
❌ **No calculations**: README must show the math
❌ **Round numbers only**: Use realistic amounts like $385,247.50
❌ **Missing agent expectations**: Document all 4 agents (validation, analysis, investigation, report)
❌ **No test assertions**: Include code snippets for validation
❌ **Forgetting transactions.csv**: For complex scenarios, transaction file is critical

## Good Practices

✅ **Show your work**: Include calculation tables in README
✅ **Use narratives**: Transaction descriptions should be specific
✅ **Reference real issues**: Base on actual errors you've encountered
✅ **Test immediately**: Verify scenario works after creating
✅ **Document resolution**: Show how to fix the error
✅ **Vary the data**: Different vendors, amounts, dates across scenarios

## Next Available Scenario Number

Check existing scenarios:
```bash
ls data/scenarios/
```

Use the next sequential number (currently should be `06-`).
