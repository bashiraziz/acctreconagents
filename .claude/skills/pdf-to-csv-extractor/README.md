# PDF to CSV Extractor for Reconciliation

Extract financial data from PDF reports and convert to reconciliation-ready CSV files.

## Overview

This Skill enables the reconciliation system to accept PDF uploads instead of CSV files. It extracts data from accounting system PDF exports (GL reports, AP aging, trial balances) and converts them into properly formatted CSV files compatible with the reconciliation agents.

## Features

- **Multiple extraction methods**: pdfplumber, tabula-py, pypdf, OCR (pytesseract)
- **Multiple PDF types supported**: GL balance reports, AP aging, trial balances, transaction journals
- **Automatic sign convention handling**: Properly formats liability accounts (negative balances)
- **Date parsing**: Handles various date formats from different systems
- **Template library**: Pre-configured extraction rules for SAP, Oracle, QuickBooks
- **PDF analyzer**: Preview PDF structure before extraction

## Installation

### Required Python packages

```bash
pip install pdfplumber pypdf pandas
```

### Optional (for complex tables)

```bash
pip install tabula-py
# Requires Java Runtime Environment (JRE) 8+
```

### Optional (for OCR support)

```bash
pip install pytesseract
# Also requires Tesseract OCR engine installed on system
```

## Quick Start

### 1. Analyze PDF first (recommended)

```bash
python scripts/pdf_analyzer.py --input your_report.pdf
```

This shows:
- PDF type detection (GL balance, AP aging, etc.)
- Table structure preview
- Whether OCR is needed
- Recommended extraction script

### 2. Extract GL Balance

```bash
python scripts/extract_gl_balance.py \
  --input "GL_Report_Oct2025.pdf" \
  --output "gl_balance.csv" \
  --period "2025-10"
```

**Output**: `gl_balance.csv` ready for upload as "GL Balance"

### 3. Extract AP Aging (Subledger)

```bash
python scripts/extract_ap_aging.py \
  --input "AP_Aging_Oct2025.pdf" \
  --output "subledger_balance.csv" \
  --period "2025-10"
```

**Output**: `subledger_balance.csv` ready for upload as "Subledger Balance"

### 4. Extract Transactions

```bash
python scripts/extract_transactions.py \
  --input "GL_Journal_Oct2025.pdf" \
  --output "transactions.csv" \
  --period "2025-10"
```

**Output**: `transactions.csv` for variance investigation

### 5. For scanned PDFs (OCR)

```bash
python scripts/extract_gl_balance.py \
  --input "Scanned_Report.pdf" \
  --output "gl_balance.csv" \
  --period "2025-10" \
  --ocr
```

## Scripts

### `pdf_analyzer.py`

Preview and analyze PDF structure before extraction.

**Usage**:
```bash
python scripts/pdf_analyzer.py --input report.pdf [--page 1]
```

**Output**:
- Report type detection
- Text extractability check
- Table structure analysis
- Data preview
- Extraction recommendations

### `extract_gl_balance.py`

Extract GL account balances from PDF reports.

**Usage**:
```bash
python scripts/extract_gl_balance.py \
  --input <pdf_file> \
  --output <csv_file> \
  --period <YYYY-MM> \
  [--currency USD] \
  [--ocr]
```

**Output CSV format**:
```csv
account_code,account_name,period,currency,amount
20100,Accounts Payable Control,2025-10,USD,-1185000.00
22010,Accrued Expenses,2025-10,USD,-215000.00
```

### `extract_ap_aging.py`

Extract AP aging reports to subledger CSV format.

**Usage**:
```bash
python scripts/extract_ap_aging.py \
  --input <pdf_file> \
  --output <csv_file> \
  --period <YYYY-MM> \
  [--account 20100] \
  [--currency USD]
```

**Output CSV format**:
```csv
vendor,invoice_number,invoice_date,due_date,aging_bucket,currency,amount,account_code,period
Acme Corp,INV-001,2025-10-05,2025-11-04,Current,USD,-500000.00,20100,2025-10
```

### `extract_transactions.py`

Extract transaction journal data from PDFs.

**Usage**:
```bash
python scripts/extract_transactions.py \
  --input <pdf_file> \
  --output <csv_file> \
  --period <YYYY-MM>
```

**Output CSV format**:
```csv
account_code,booked_at,debit,credit,amount,narrative,source_period
20100,2025-10-05,0,335000,-335000,Invoice INV-001 - Acme Corp,2025-10
20100,2025-10-10,150000,0,150000,Payment CHK-001 - Acme Corp,2025-10
```

## Templates

Pre-configured extraction rules for common accounting systems.

### Available Templates

Located in `templates/` directory:

- **SAP**:
  - `sap_gl_balance.json` - S_ALR_87012284 G/L Account Balances
  - `sap_ap_aging.json` - S_ALR_87012104 Vendor Balances

- **Oracle E-Business Suite**:
  - `oracle_gl_balance.json` - General Ledger Trial Balance

- **QuickBooks**:
  - `quickbooks_gl_balance.json` - Trial Balance
  - `quickbooks_ap_aging.json` - A/P Aging Detail

### Template Structure

Each template defines:
- **System name and report type**
- **Column mappings**: PDF columns → CSV fields
- **Sign indicators**: How negatives are represented
- **Date format**: Expected date format in PDF
- **Amount format**: Thousands separator, decimal places
- **Skip patterns**: Regex patterns for rows to ignore

### Using Templates

Templates can be used to configure extraction for specific accounting systems. Future enhancement will allow loading templates to auto-configure extraction parameters.

## Sign Convention Handling

**Critical**: The scripts automatically apply correct sign conventions for liability accounts.

### Liability Accounts (AP, Accrued Expenses)

| Transaction Type | PDF Format | Extracted Sign | Effect |
|-----------------|------------|----------------|--------|
| New invoice | (500,000.00) or 500,000.00 CR | **-500000.00** | Increases liability |
| Payment | 300,000.00 or (300,000.00) DR | **+300000.00** | Decreases liability |
| Normal balance | (1,185,000.00) | **-1185000.00** | Credit balance |

The scripts handle:
- Parentheses `(1,185,000.00)` → negative
- CR notation `1,185,000.00 CR` → negative
- Minus signs `-1,185,000.00` → negative
- Auto-detection for accounts starting with "2" (liability accounts)

## Common PDF Layouts

### GL Balance Report
```
Account Code  Description                  Period    Amount
20100        Accounts Payable Control     2025-10   (1,185,000.00)
22010        Accrued Expenses            2025-10     (215,000.00)
```

### AP Aging Report
```
Vendor Name    Invoice#   Date       Due Date   Current    30 Days   60+ Days
Acme Corp      INV-001   10/5/2025  11/4/2025  500,000.00    -         -
Tech Inc       INV-002   9/15/2025  10/15/2025    -      100,000.00   -
```

### Transaction Journal
```
Date       Account  Debit         Credit        Description
10/5/2025  20100               335,000.00    Invoice INV-001
10/10/2025 20100    150,000.00                Payment CHK-001
```

## Workflow Integration

### Proposed User Flow

1. **User uploads PDF** (instead of CSV)
   - System detects PDF format
   - Triggers this Skill

2. **Analyze & Preview**
   - PDF analyzer identifies report type
   - Shows preview of extracted data
   - User confirms or adjusts settings

3. **Extract & Convert**
   - Appropriate script runs based on report type
   - Data extracted and converted to CSV
   - Sign conventions applied
   - CSV file created

4. **Upload to Reconciliation** (existing workflow)
   - User uploads generated CSV
   - Maps columns in UI
   - Applies mappings

5. **Reconcile** (existing workflow)
   - Agents run reconciliation
   - Variances detected
   - Investigation and reporting

## Quality Checks

After extraction, the scripts verify:
- ✅ All required fields present
- ✅ Amounts have correct signs (liabilities negative)
- ✅ No null values in required fields
- ✅ Dates in YYYY-MM-DD format
- ✅ Period field included
- ✅ Account codes are strings
- ✅ Amounts are numbers with 2 decimals

## Troubleshooting

### Problem: Extraction produces gibberish
**Cause**: PDF is scanned/image-based
**Solution**: Use `--ocr` flag

### Problem: Table columns misaligned
**Cause**: Variable-width fonts or poor table detection
**Solution**: Try pdf_analyzer.py first to preview structure

### Problem: Numbers have wrong signs
**Cause**: Parentheses or CR notation not parsed
**Solution**: Check script output, verify liability accounts are negative

### Problem: Missing data in some columns
**Cause**: PDF uses merged cells or spans columns
**Solution**: May require manual adjustment after extraction

### Problem: Dates in wrong format
**Cause**: Various date formats in PDF
**Solution**: Scripts handle multiple formats automatically

## Examples

### Example 1: Extract GL Balance from SAP PDF

```bash
# Analyze first
python scripts/pdf_analyzer.py --input SAP_GL_Oct2025.pdf

# Extract
python scripts/extract_gl_balance.py \
  --input SAP_GL_Oct2025.pdf \
  --output gl_balance.csv \
  --period 2025-10

# Output:
# ✅ Extraction complete!
#    Rows extracted: 50
#    Output file: gl_balance.csv
#
# Preview of extracted data:
# account_code  account_name              period    currency  amount
# 20100        Accounts Payable Control   2025-10   USD       -1185000.00
# 22010        Accrued Expenses          2025-10   USD       -215000.00
```

### Example 2: Extract AP Aging from QuickBooks PDF

```bash
python scripts/extract_ap_aging.py \
  --input QB_AP_Aging_Oct2025.pdf \
  --output subledger_balance.csv \
  --period 2025-10 \
  --account 20100

# Output:
# ✅ Extraction complete!
#    Invoices extracted: 25
#    Total amount: $-1,185,000.00
#    Output file: subledger_balance.csv
```

### Example 3: Extract from Scanned PDF (OCR)

```bash
python scripts/extract_gl_balance.py \
  --input Scanned_Report.pdf \
  --output gl_balance.csv \
  --period 2025-10 \
  --ocr

# OCR processing may take longer...
```

## Future Enhancements

- [ ] Auto-detect report type and auto-select extraction script
- [ ] Interactive column mapping for non-standard PDFs
- [ ] Template manager to load/save custom extraction rules
- [ ] Batch processing for multiple PDFs
- [ ] Quality scoring with confidence levels
- [ ] Machine learning to improve extraction accuracy
- [ ] Support for Excel, HTML exports
- [ ] Web interface for PDF upload and preview

## References

- **pdfplumber**: https://github.com/jsvine/pdfplumber
- **tabula-py**: https://tabula-py.readthedocs.io/
- **pypdf**: https://pypdf.readthedocs.io/
- **pytesseract**: https://github.com/madmaze/pytesseract

## Notes

- Always preview extracted data before finalizing
- Keep original PDF for reference
- Document any manual corrections needed
- Build template library over time for different PDF formats
- Consider adding user confirmation step for extraction accuracy

## Support

For issues or questions:
1. Check troubleshooting section above
2. Run pdf_analyzer.py for diagnostic information
3. Review extraction script output for errors
4. Check that dependencies are installed correctly
