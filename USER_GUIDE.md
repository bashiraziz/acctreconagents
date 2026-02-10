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
- **Illuminates hidden variances** – AI-powered detection with zero manual work
- **Brings clarity to complex data** – See what others miss
- **Lights the way to resolution** – Smart insights and recommendations
- **Multi-period visibility** – Track reconciliations across accounting periods
- **Audit-ready reports** – Professional documentation with AI analysis
- **Smart sign conventions** – Automatically handles credit/debit balances

**Who is this for?**
- Accountants performing monthly/quarterly close
- Controllers reviewing reconciliations
- Finance teams analyzing account variances
- Anyone tired of working in the dark with manual spreadsheets

---

## Getting Started

### Access Rowshni

**Live URL:** https://www.rowshni.xyz

**Local Development:** http://localhost:3000 (default). If 3000 is busy, the dev server falls back to 3100, then 3200.

> **Pronunciation:** ROHSH-nee

### What You'll Need

1. **GL Balance File** (CSV/TSV/TXT format)
   - Contains your general ledger account balances
   - Must include: account code, period, amount

2. **Subledger Balance File** (CSV/TSV/TXT format)
   - Contains detailed transactions (invoices, payments, etc.)
   - Must include: account code, period, amount

3. **(Optional) Transaction File** (CSV/TSV/TXT format)
   - Journal entries and GL transactions
   - Helps explain timing differences

### Supported File Formats

**CSV/TSV/TXT files** - exported from:
- Unanet
- SAP
- Oracle Financials
- QuickBooks (with specialized parser for parenthetical account codes)
- NetSuite (with specialized parser for multi-currency and dimensional data)
- Costpoint (with specialized parser for debit/credit columns)
- Microsoft Dynamics
- Any accounting system that exports delimited text files

**PDF files** - Can be converted to CSV using the PDF-to-CSV extractor:
- GL reports, AP aging, trial balances from any system
- See [PDF Conversion Guide](PDF_CONVERSION_GUIDE.md) for details

**File size limit:** 20 MB per file

**System-Specific Parsers:** Rowshni includes Claude skills that automatically detect and parse format-specific data from QuickBooks, Costpoint, and NetSuite exports, handling account code extraction, sign conventions, and dimensional aggregation.

---

## Step-by-Step: Running a Reconciliation

### Step 1: Upload Your Files

1. **Select File Type**
   - Choose "GL Trial Balance", "Subledger Balance", or "Transactions"

2. **Upload File**
   - Click "Choose File" or drag and drop your file (CSV/TSV/TXT)
   - File uploads instantly
   - You'll see a preview of the data

3. **Select Accounting System (for better parsing)**
   - After uploading, you'll see an **Accounting System** dropdown
   - Options:
     - **Auto-detect (recommended)**: Automatically detects your system from CSV patterns
     - **QuickBooks**: For files with parenthetical account codes like "Accounts Payable (2000)"
     - **Costpoint / Deltek**: For files with separate Debit and Credit columns
     - **NetSuite / Oracle**: For files with multi-currency or dimensional data
     - **SAP ERP**: Reserved for SAP-specific formats
     - **Generic / Other**: Universal CSV parser (works with any system)
   - **Tip**: Leave it on "Auto-detect" unless you know your specific system
   - The app will automatically handle account code extraction, sign conventions, and format-specific parsing

4. **Fill in Metadata (if needed)**
   - If your CSV is missing required fields, you can provide them as metadata:
     - **Account Code**: If all rows in the file are for the same account
     - **Period**: If all rows are for the same period (e.g., "2025-10")
     - **Currency**: If all amounts are in the same currency (e.g., "USD")
     - **Report Date**: Optional date for documentation

5. **Sign Reversal (for accounting system differences)**
   - Some systems show credit balances as positive, others as negative
   - Check **"Reverse signs"** if your GL and subledger use opposite sign conventions
   - Example: GL shows -10,768.63 but subledger shows 10,768.63
   - This multiplies all amounts by -1 for proper reconciliation

6. **Repeat for Each File**
   - Upload GL balance file (with metadata if needed)
   - Upload subledger balance file (with metadata if needed)
   - (Optional) Upload transactions file

**✔ Progress indicator** shows which files you've uploaded.

---

### Step 2: Map Your Columns

After uploading, you'll see the **Column Mapping** screen.

**What is column mapping?**
The app needs to know which columns in your CSV contain the account code, period, amount, etc.

**How to map:**

1. **GL Balance Columns**
   ```
   Account Code    → Select column with account numbers (e.g., "20100")
                      OR provide in metadata if all rows are same account
   Account Name    → Select column with account names (optional)
   Period          → Select column with period (e.g., "2025-10")
                      OR provide in metadata if all rows are same period
   Amount          → Select column with dollar amounts
   Currency        → (Optional) OR provide in metadata
   ```

2. **Subledger Balance Columns**
   ```
   Account Code    → Must match GL account codes
                      OR provide in metadata if all rows are same account
   Period          → Must match GL period format
                      OR provide in metadata
   Amount          → Invoice/transaction amounts
   Currency        → (Optional) OR provide in metadata
   Vendor/Customer → (Optional) For better reporting
   Invoice Number  → (Optional) For traceability
   ```

3. **Transaction Columns** (if uploaded)
   ```
   Account Code    → GL account
   Booked Date     → When posted to GL
   Debit/Credit    → Or single "Amount" column
   ```

**Missing field indicators:**
- If required fields are not mapped, you'll see a message like:
  - "GL Missing: Account Code, Period"
  - Hint: You can fill these in via metadata instead of mapping columns

**Tip:** The app remembers your mappings for next time!

---

### Step 3: Preview Your Data

After mapping, click **"Preview Data"** to see:
- ✔ How many GL accounts were loaded
- ✔ How many subledger records were loaded
- ✔ Sample of the transformed data

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

2. **Select Organization (Optional, signed-in users)**
   - If you have multiple organizations saved, use the dropdown to choose which one prints above the report title
   - The selection applies to this run only (overrides the default organization)
   - Anonymous users won't see this dropdown

3. **Simple Mode (Optional)**
   - Use the Simple toggle in the header to reduce colors and visual noise
   - This does not change calculations or results, only the display

4. **Enter Analysis Prompt**
   - Provide instructions for the AI agents
   - **Account filtering options**:
     - **Specific accounts**: "Reconcile account 200" → reconciles only account 200
     - **Multiple accounts**: "Reconcile accounts 1000, 2000, and 3000" → reconciles those three
     - **All GL accounts**: "Reconcile all accounts" → reconciles every GL account (even without subledger data)
     - **Default** (just "Reconcile"): Automatically reconciles only accounts present in BOTH GL and subledger
   - General instructions work too:
     - Example: "Reconcile inventory for October close"
     - Example: "Focus on material variances above $1,000"

   **Smart Default**: If you don't specify accounts, the system automatically reconciles only accounts that exist in both your GL and subledger files. This prevents false variances for GL accounts that don't have supporting detail.

5. **Click "Illuminate ✨"**
   - Rowshni's AI agents start analyzing your data
   - Progress shown in real-time with a glowing progress indicator
   - You'll see which agent is currently working (Data Validation → Analysis → Investigation → Report)

6. **Watch the Timeline**
   ```
   ✔ Spec Validation     - Data validated
   ▶ Data Validation Agent - Validating data quality
   ▶ Reconciliation Analyst Agent - Analyzing variances
   ▶ Variance Investigator Agent - Investigating material variances
   ▶ Report Generator Agent - Creating final report
   ```

7. **Wait for Completion** (usually 10-30 seconds)

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

Status: ✔ BALANCED
```

### Status Types

| Status | Meaning | Action Needed |
|--------|---------|---------------|
| **✔ Balanced** | GL = Subledger (variance < $0.01) | None - reconciliation complete |
| **☑ Immaterial Variance** | Variance below your materiality threshold | Review but likely acceptable |
| **✖ Material Variance** | Variance ≥ your materiality threshold | **Investigation required** |

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

### Export Your Report

After reconciliation completes, you can export the report:
- **Copy** - Copy report to clipboard
- **MD** - Download as Markdown (.md file)
- **TXT** - Download as plain text (.txt file)

Report headers include:
- **Organization** (if selected or defaulted)
- **Reporting Period** (Month YYYY)
- **Report Generated On** (today's date)

All numbers in reports are rounded to 2 decimal places for accounting precision.

---

## Rate Limits

**Anonymous users** are limited to:
- **30 reconciliations per hour**
- **50 reconciliations per 2 hours**
- **70 reconciliations per 3 hours**

**Authenticated users** get doubled limits:
- **60 reconciliations per hour**
- **100 reconciliations per 2 hours**
- **140 reconciliations per 3 hours**

**Your remaining usage** is shown at the top of the page:

```
┌─────────────────────────────────┐
│ 30 reconciliations remaining     │
│ per hour for anonymous users    │
│ Resets in 45 minutes            │
└─────────────────────────────────┘
```

**Tip:** If you hit the limit, wait for the timer to reset or sign in to get doubled limits.

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
- ✔ Proper sign conventions (negative for liabilities)
- ✔ Realistic vendor names and invoice numbers
- ✔ Actual accounting periods (YYYY-MM format)
- ✔ Account codes with descriptive names
- ✔ Documented expected results for each scenario

**How to use:** Download all 3 files for a scenario, upload them to the app, and run the reconciliation to see how the AI agents analyze different situations.

---

## Troubleshooting

### "Column mapping failed" or "Apply Mappings button is disabled"
**Problem:** Your CSV structure doesn't match expected format or required fields are missing

**Fix:**
- Ensure CSV has headers in first row
- Map all required fields OR provide them in metadata:
  - Account Code (can be in metadata if all rows are same account)
  - Period (can be in metadata if all rows are same period)
  - Amount (must be mapped from CSV column)
- Check for missing field messages below the mapping section
- Amounts can be numbers OR text (app handles both)
- Amounts can use commas (e.g., "1,234.56") - app handles them
- Negative amounts can use parentheses (e.g., "(95.50)") - app converts to -95.50
- Dates should be YYYY-MM-DD or YYYY-MM

### "Reconciliation shows all variances"
**Problem:** Account codes don't match between GL and subledger

**Fix:**
- Check account code format (some systems use leading zeros: "01000" vs "1000")
- Verify you mapped the correct columns
- Ensure GL and subledger use same chart of accounts

### "Amounts are wrong sign"
**Problem:** GL shows negative balance but subledger shows positive (or vice versa)

**Fix:**
- Different accounting systems use different sign conventions
- Use the **"Reverse signs"** checkbox in the upload metadata section
- This multiplies all amounts by -1 to match your GL convention
- Common scenario: GL shows credit as -10,768.63, subledger shows 10,768.63
- Check the box for the file that needs sign reversal

### "I did not receive a reset email"
**Problem:** No password reset email arrives after requesting one

**Fix:**
- Confirm you used an email address that already has a Rowshni account
- Check spam or junk folders
- Request a new reset link from **Sign in → Forgot your password?**
- If the email still does not arrive, contact support

### "Upload failed - file too large"
**Problem:** File exceeds 20 MB limit

**Fix:**
- Filter to specific accounts or periods
- Remove unnecessary columns before export
- Split into multiple reconciliations by period

### "Rate limit exceeded"
**Problem:** You've used all 30 reconciliations in the last hour

**Fix:**
- Wait for the timer to reset (shown on screen)
- Or sign in to get doubled limits

---

## FAQ

### Q: I forgot my password. What should I do?
**A:** Use the "Forgot your password?" link on the sign-in page. We'll email a reset link to the address on file. If you no longer have access to that email, contact support.

### Q: Can I reconcile multiple accounts at once?
**A:** Yes! Upload a GL file with multiple accounts and a subledger file with detail. The system intelligently determines which accounts to reconcile:

**Smart Default Behavior:**
- If you just say "Reconcile" without specifying accounts, the system reconciles only accounts that exist in BOTH GL and subledger
- This prevents false variances for GL accounts without supporting detail

**Account Filtering Options:**
- **Specific accounts**: "Reconcile account 200" → reconciles only that account
- **Multiple accounts**: "Reconcile accounts 1000, 2000, and 3000" → reconciles those three
- **All GL accounts**: "Reconcile all accounts" → forces reconciliation of every GL account (even those without subledger data)

**Example:** If your GL has accounts [100, 200, 300] but your subledger only has data for account [200], the default behavior reconciles only account 200. To force reconciliation of all three GL accounts (showing variances for 100 and 300), say "Reconcile all accounts".

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
**A:** Yes! Use the export buttons at the top of the report:
- **Copy** - Copy the full report to your clipboard
- **MD** - Download as Markdown file (opens in any text editor)
- **TXT** - Download as plain text file
- Reports are named with the date (e.g., `reconciliation-report-2025-12-26.md`)
- You can also take screenshots for quick reference

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

**Tip:** Start with the default ($50) and adjust based on results. You can always re-run with a different threshold.

### Q: Can I schedule automated reconciliations?
**A:** Not yet - this is a manual, on-demand tool. Automated scheduling is on the roadmap.

### Q: What accounting systems are supported?
**A:** Any system that exports CSV/TSV/TXT files. Rowshni includes specialized parsers for:
- ✔ **QuickBooks** (Desktop & Online) - Automatic parsing of parenthetical account codes
- ✔ **Costpoint / Deltek** - Handles Debit/Credit columns with proper sign conventions
- ✔ **NetSuite / Oracle Financials** - Multi-currency and dimensional data support
- ✔ **SAP** (reserved for future enhancements)
- ✔ **Generic / Other**: Microsoft Dynamics, Sage Intacct, Xero, custom systems

**During upload**, select your accounting system from the dropdown, or use "Auto-detect" to let the app figure it out automatically. The app will apply system-specific parsing for better accuracy.

---

## Need Help?

**Issues or questions?**
- Report bugs: https://github.com/bashiraziz/acctreconagents/issues
- Email support: bashiraziz+rowshni@gmail.com

**Want to learn more about the reconciliation logic?**
- See: `specs/reconciliation-logic.md` for detailed algorithm documentation
- See: `specs/data-dictionary.md` for field definitions

---

**Let Rowshni shed light on your ledger! ✨**

---

*Rowshni - Shedding light on your ledger*

---

## Recent Updates (February 2026)

**New Features:**
- **Organization Settings**: Add multiple organizations, pick a default, and select per run
- **Report header fields**: Organization (if set), Reporting Period (Month YYYY), Report Generated On (today)
- **Report resilience**: If AI output is incomplete, the system generates a fallback report from reconciliation data
- **Simple Mode**: Toggle a reduced-color UI for less visual noise

*Last updated: February 10, 2026*

## Recent Updates (December 2025)

**New Features:**
- ✨ **Metadata support**: Provide account code, period, or currency as metadata instead of mapping columns
- **Sign reversal**: Checkbox to reverse signs for different accounting system conventions
- **Smart account filtering**:
  - Default: Automatically reconciles only accounts in BOTH GL and subledger (prevents false variances)
  - Specific: "Reconcile account 200" → reconciles only that account
  - Override: "Reconcile all accounts" → forces all GL accounts even without subledger data
- **Flexible CSV parsing**: Handles both text and numbers, commas (1,234.56), and parentheses for negatives (95.50)
- **Claude Skills Integration**: System-specific parsers for QuickBooks, Costpoint, and NetSuite
  - **UI selector**: Choose your accounting system during file upload (or use auto-detect)
  - Automatically handles parenthetical account codes, debit/credit columns, multi-currency
  - PDF-to-CSV conversion for financial reports
  - Comprehensive automated testing (10 scenarios, all passing)
- **Report export**: Copy, download as Markdown, or download as text
- **Better error messages**: User-friendly validation messages and missing field indicators
- **Accounting precision**: All numbers rounded to 2 decimal places

*Last updated: December 27, 2025*

