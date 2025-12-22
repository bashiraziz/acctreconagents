# Rowshni - User Guide

**Welcome to Rowshni!** (meaning "light")

This guide will help you perform GL-to-subledger reconciliations using AI-powered analysis that sheds light on your ledger, illuminates variances, and brings clarity to your month-end close.

---

## Table of Contents

1. [What This App Does](#what-this-app-does)
2. [Getting Started](#getting-started)
3. [Step-by-Step: Running a Reconciliation](#step-by-step-running-a-reconciliation)
4. [Understanding Your Results](#understanding-your-results)
5. [Rate Limits](#rate-limits)
6. [Sample Data](#sample-data)
7. [Troubleshooting](#troubleshooting)
8. [FAQ](#faq)

---

## What Rowshni Does

**Rowshni** automatically reconciles your **General Ledger (GL) balances** with your **subledger details** (like AP aging reports or AR invoices) and identifies variances—shedding light on discrepancies and illuminating the path to balanced books.

**Benefits:**
- ✨ **Illuminates hidden variances** - AI-powered detection with zero manual work
- 🔍 **Brings clarity to complex data** - See what others miss
- 💡 **Lights the way to resolution** - Smart insights and recommendations
- 📊 **Multi-period visibility** - Track reconciliations across accounting periods
- ⚖️ **Audit-ready reports** - Professional documentation with AI analysis
- 🎯 **Smart sign conventions** - Automatically handles credit/debit balances

**Who is this for?**
- Accountants performing monthly/quarterly close
- Controllers reviewing reconciliations
- Finance teams analyzing account variances
- Anyone tired of working in the dark with manual spreadsheets

---

## Getting Started

### Access Rowshni

**Live URL:** https://acctreconagents.vercel.app

**Local Development:** http://localhost:3100 (if running locally)

> 💡 **Pronunciation:** ROHSH-nee

### What You'll Need

1. **GL Balance File** (CSV format)
   - Contains your general ledger account balances
   - Must include: account code, period, amount

2. **Subledger Balance File** (CSV format)
   - Contains detailed transactions (invoices, payments, etc.)
   - Must include: account code, period, amount

3. **(Optional) Transaction File** (CSV format)
   - Journal entries and GL transactions
   - Helps explain timing differences

### Supported File Formats

**CSV files only** - exported from:
- Unanet
- SAP
- Oracle Financials
- QuickBooks
- NetSuite
- Microsoft Dynamics
- Any accounting system that exports to CSV

**File size limit:** 20 MB per file

---

## Step-by-Step: Running a Reconciliation

### Step 1: Upload Your Files

1. **Select File Type**
   - Choose "GL Trial Balance", "Subledger Balance", or "Transactions"

2. **Upload File**
   - Click "Choose File" or drag and drop your CSV
   - File uploads instantly
   - You'll see a preview of the data

3. **Repeat for Each File**
   - Upload GL balance file
   - Upload subledger balance file
   - (Optional) Upload transactions file

**✅ Progress indicator** shows which files you've uploaded.

---

### Step 2: Map Your Columns

After uploading, you'll see the **Column Mapping** screen.

**What is column mapping?**
The app needs to know which columns in your CSV contain the account code, period, amount, etc.

**How to map:**

1. **GL Balance Columns**
   ```
   Account Code    → Select column with account numbers (e.g., "20100")
   Account Name    → Select column with account names (optional)
   Period          → Select column with period (e.g., "2025-10")
   Amount          → Select column with dollar amounts
   ```

2. **Subledger Balance Columns**
   ```
   Account Code    → Must match GL account codes
   Period          → Must match GL period format
   Amount          → Invoice/transaction amounts
   Vendor/Customer → (Optional) For better reporting
   Invoice Number  → (Optional) For traceability
   ```

3. **Transaction Columns** (if uploaded)
   ```
   Account Code    → GL account
   Booked Date     → When posted to GL
   Debit/Credit    → Or single "Amount" column
   ```

**💡 Tip:** The app remembers your mappings for next time!

---

### Step 3: Preview Your Data

After mapping, click **"Preview Data"** to see:
- ✅ How many GL accounts were loaded
- ✅ How many subledger records were loaded
- ✅ Sample of the transformed data

**Check for:**
- Account codes match between GL and subledger
- Amounts are in the correct format (negative for credits)
- Periods are formatted consistently

---

### Step 4: Run Reconciliation

1. **Set Materiality Threshold (Optional)**
   - Enter the dollar amount that defines a "material" variance
   - Default: $50
   - Example: Enter $100 if you only want to investigate variances above $100
   - **Lower values** = stricter reconciliation (more variances flagged)
   - **Higher values** = more lenient (only large variances flagged)
   - Your setting is saved for future reconciliations

2. **Enter Analysis Prompt (Optional)**
   - Add specific instructions for the AI agents
   - Example: "Reconcile account 1000 inventory for October close"
   - Leave blank for standard analysis

3. **Click "Illuminate ✨"**
   - Rowshni's AI agents start analyzing your data
   - Progress shown in real-time with a glowing progress indicator
   - You'll see which agent is currently working (Data Validation → Analysis → Investigation → Report)

4. **Watch the Timeline**
   ```
   ✅ Spec Validation     - Data validated
   ⏳ Data Validation Agent - Validating data quality
   ⏳ Reconciliation Analyst Agent - Analyzing variances
   ⏳ Variance Investigator Agent - Investigating material variances
   ⏳ Report Generator Agent - Creating final report
   ```

5. **Wait for Completion** (usually 10-30 seconds)

---

## Understanding Your Results

### Reconciliation Summary

After completion, you'll see:

```
Account: 20100 - Accounts Payable Control
Period: 2025-10

GL Balance:        -$1,185,000.00
Subledger Balance: -$1,185,000.00
Variance:          $0.00

Status: ✅ BALANCED
```

### Status Types

| Status | Meaning | Action Needed |
|--------|---------|---------------|
| **✅ Balanced** | GL = Subledger (variance < $0.01) | None - reconciliation complete |
| **⚠️ Immaterial Variance** | Variance below your materiality threshold | Review but likely acceptable |
| **❌ Material Variance** | Variance ≥ your materiality threshold | **Investigation required** |

**Note:** The threshold that determines "Material" vs "Immaterial" is set by you in Step 4 (default $50).

### Variance Analysis

For accounts with variances, the AI provides:

1. **Root Cause Analysis**
   - Timing differences
   - Missing subledger entries
   - GL journal entries not in subledger
   - Sign convention issues

2. **Recommended Actions**
   - "Review invoice #INV-12345 dated 10/15"
   - "Check for manual GL adjustment on 10/31"
   - "Verify subledger export includes all October invoices"

3. **Transaction Matching**
   - Lists which transactions matched
   - Highlights unmatched items

### Roll-Forward Analysis

Shows account movement:

```
Opening Balance:    -$900,000
Activity (debits):  +$250,000
Activity (credits): -$535,000
Adjustments:        $0
Closing Balance:    -$1,185,000
```

### AI Commentary

Gemini provides:
- **Executive Summary** - High-level overview
- **Risk Assessment** - Low/Medium/High risk rating
- **Data Quality Score** - Confidence in the data
- **Detailed Report** - Full markdown report with tables

---

## Rate Limits

**Anonymous users** are limited to:
- **5 reconciliations per hour**
- **8 reconciliations per 2 hours**
- **10 reconciliations per 3 hours**

**Your remaining usage** is shown at the top of the page:

```
┌─────────────────────────────────┐
│ 5 reconciliations remaining     │
│ per hour for anonymous users    │
│ Resets in 45 minutes            │
└─────────────────────────────────┘
```

**💡 Tip:** If you hit the limit, wait for the timer to reset or sign in for unlimited access (when available).

### AI Analysis Quotas

In addition to reconciliation rate limits, **AI analysis** (Gemini agents) has usage quotas:
- Shared quota for all anonymous users
- Automatic retries if quota is temporarily exceeded
- May use fallback analysis if quota fully exhausted

**Want unlimited AI analysis?**

Use your own free Google Gemini API key:
1. Get a free key at: [ai.google.dev/gemini-api](https://ai.google.dev/gemini-api/docs/api-key)
2. Set the `GEMINI_API_KEY` environment variable (see developer docs)
3. No more quota limits on AI analysis!

**Note:** Google's free tier includes generous quotas that are usually more than enough for individual use.

---

## Sample Data

**Don't have data to test with?** Click **"Show Sample Files"** to download realistic test scenarios:

### 1. **Simple Balanced (Perfect Reconciliation)**
   - GL and subledger match perfectly (variance = $0)
   - Tests basic functionality and workflow
   - Good for first-time users
   - **Files**: gl_balance.csv, subledger_balance.csv, transactions.csv

### 2. **Material Variance (Duplicate Invoice)**
   - Intentional $275k variance from duplicate invoice
   - Shows how AI agents detect and investigate errors
   - Tests materiality threshold logic
   - **Files**: gl_balance.csv, subledger_balance.csv

### 3. **Timing Differences (Period Cutoff)**
   - October invoices posted in November
   - Demonstrates period cutoff and accrual analysis
   - Shows how transactions explain variances
   - **Files**: gl_balance.csv, subledger_balance.csv, transactions.csv

### 4. **Multi-Period Roll-Forward**
   - January through March data
   - Shows roll-forward schedule with opening/closing balances
   - Tests period-over-period reconciliation
   - **Files**: gl_balance.csv, subledger_balance.csv, transactions.csv

### 5. **Missing Subledger Data**
   - Subledger missing critical entries
   - Demonstrates how system flags incomplete data
   - Shows data quality validation
   - **Files**: gl_balance.csv, subledger_balance.csv, transactions.csv

**What makes these scenarios realistic:**
- ✅ Proper sign conventions (negative for liabilities)
- ✅ Realistic vendor names and invoice numbers
- ✅ Actual accounting periods (YYYY-MM format)
- ✅ Account codes with descriptive names
- ✅ Documented expected results for each scenario

**How to use:** Download all 3 files for a scenario, upload them to the app, and run the reconciliation to see how the AI agents analyze different situations.

---

## Troubleshooting

### "Column mapping failed"
**Problem:** Your CSV structure doesn't match expected format

**Fix:**
- Ensure CSV has headers in first row
- Account codes should be in a single column
- Amounts should be numeric (no $ signs or commas in data)
- Dates should be YYYY-MM-DD or YYYY-MM

### "Reconciliation shows all variances"
**Problem:** Account codes don't match between GL and subledger

**Fix:**
- Check account code format (some systems use leading zeros: "01000" vs "1000")
- Verify you mapped the correct columns
- Ensure GL and subledger use same chart of accounts

### "Amounts are wrong sign"
**Problem:** System expecting liabilities to be negative, but yours are positive

**Fix:**
- This is expected! Different accounting systems use different conventions
- The system will note sign mismatches in the report
- Variance calculation is still correct

### "Upload failed - file too large"
**Problem:** File exceeds 20 MB limit

**Fix:**
- Filter to specific accounts or periods
- Remove unnecessary columns before export
- Split into multiple reconciliations by period

### "Rate limit exceeded"
**Problem:** You've used all 5 reconciliations in the last hour

**Fix:**
- Wait for the timer to reset (shown on screen)
- Or sign in for unlimited access (when available)

---

## FAQ

### Q: Can I reconcile multiple accounts at once?
**A:** Yes! Upload a GL file with multiple accounts and a subledger file with all the detail. The system will reconcile each account separately.

### Q: What period formats are supported?
**A:**
- `YYYY-MM` (e.g., `2025-10`) - recommended
- `YYYY-MM-DD` (e.g., `2025-10-31`)
- `MM/YYYY` (e.g., `10/2025`)
- Any consistent format works - just be consistent across files

### Q: Can I use this for AR (Accounts Receivable)?
**A:** Absolutely! Upload:
- GL: AR control account balance
- Subledger: Customer invoices (AR aging report)
- Works the same way as AP reconciliation

### Q: What about inventory or other accounts?
**A:** Yes! The system works for ANY account type:
- Inventory (GL vs inventory listing)
- Fixed Assets (GL vs asset register)
- Prepaid Expenses (GL vs amortization schedule)
- Any subledger-supported account

### Q: Does my data leave the browser?
**A:** Yes, files are sent to the server for processing. Data is not permanently stored - it's processed and then discarded.

### Q: Can I save my reconciliation results?
**A:** Currently, results are displayed but not saved. We recommend:
- Taking screenshots
- Copying the markdown report
- Exporting results (feature coming soon)

### Q: Do you support multi-currency reconciliations?
**A:** Yes, as long as all amounts for a given account are in the same currency. For multi-currency accounts, reconcile each currency separately.

### Q: How do I choose the right materiality threshold?
**A:** The materiality threshold determines which variances need investigation. Consider:
- **Company size:** Larger companies typically use higher thresholds ($500-$5,000)
- **Account size:** For a $10M account, $50 might be too strict; try $500 or $1,000
- **Risk tolerance:** Month-end close = stricter; preliminary review = more lenient
- **Industry standards:** Consult your audit requirements or internal controls policies

**Examples:**
- Small business (< $1M revenue): $25-$100
- Mid-size company ($1M-$50M): $100-$1,000
- Large enterprise (> $50M): $1,000-$10,000
- Audit reconciliation: Lower threshold for critical accounts

**💡 Tip:** Start with the default ($50) and adjust based on results. You can always re-run with a different threshold.

### Q: Can I schedule automated reconciliations?
**A:** Not yet - this is a manual, on-demand tool. Automated scheduling is on the roadmap.

### Q: What accounting systems are supported?
**A:** Any system that exports to CSV:
- ✅ SAP
- ✅ Oracle Financials / NetSuite
- ✅ QuickBooks (Desktop & Online)
- ✅ Microsoft Dynamics
- ✅ Sage Intacct
- ✅ Xero
- ✅ Custom/homegrown systems

---

## Need Help?

**Issues or questions?**
- Report bugs: https://github.com/bashiraziz/acctreconagents/issues
- Email support: (add your email here)

**Want to learn more about the reconciliation logic?**
- See: `specs/reconciliation-logic.md` for detailed algorithm documentation
- See: `specs/data-dictionary.md` for field definitions

---

**Let Rowshni shed light on your ledger! ✨**

---

*Rowshni - Shedding light on your ledger*
*Last updated: December 2025*
