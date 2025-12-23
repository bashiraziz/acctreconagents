# PDF to CSV Conversion Guide

## Quick Answer: How to Convert PDF to CSV

You have **two options** for working with PDFs:

### Option 1: Upload PDF Directly (Recommended for CSVs extracted from PDFs)
If you already have the data in CSV format (exported from Xero, QuickBooks, etc.):
1. Just upload the CSV file to Rowshni
2. Period will auto-extract from filename
3. Add metadata (account code, period) as needed
4. Done!

### Option 2: Use PDF-to-CSV Extractor Skill (For actual PDF files)
If you have a **true PDF** that needs table extraction:

#### Step 1: Analyze the PDF
```bash
cd .claude/skills/pdf-to-csv-extractor
python scripts/pdf_analyzer.py --input "path/to/your/report.pdf"
```

This will show you:
- PDF type (GL Balance, AP Aging, etc.)
- Number of pages
- Detected tables
- Sample data preview

#### Step 2: Extract GL Balance from PDF
```bash
python scripts/extract_gl_balance.py \
  --input "GL_Summary_Dec_2025.pdf" \
  --output "gl_balance.csv" \
  --period "2025-12"
```

#### Step 3: Extract AP Aging from PDF
```bash
python scripts/extract_ap_aging.py \
  --input "AP_Aging_Dec_2025.pdf" \
  --output "ap_aging.csv" \
  --period "2025-12" \
  --account-code "200"
```

#### Step 4: Extract Transactions from PDF
```bash
python scripts/extract_transactions.py \
  --input "Transaction_Journal_Dec_2025.pdf" \
  --output "transactions.csv" \
  --period "2025-12"
```

---

## Installation (First Time Setup)

### Prerequisites
1. **Python 3.8+** installed
2. **Java Runtime Environment (JRE) 8+** for tabula-py

### Install Python Packages
```bash
# Navigate to the skill directory
cd .claude/skills/pdf-to-csv-extractor

# Install required packages
pip install -r requirements.txt
```

The `requirements.txt` includes:
- `pdfplumber` - Best for most PDFs
- `tabula-py` - For complex tables
- `pypdf` - Basic extraction
- `pandas` - Data processing
- `pytesseract` (optional) - For scanned PDFs/OCR

### Install Java (for tabula-py)
- **Windows**: Download from [java.com](https://www.java.com)
- **Mac**: `brew install openjdk`
- **Linux**: `sudo apt-get install default-jre`

---

## Extraction Examples

### Example 1: Xero GL Summary
**Your file**: `Demo Company _US_ - General Ledger Summary Dec 31, 2025.pdf`

```bash
python scripts/extract_gl_balance.py \
  --input "tmp/xero-testing/Demo Company _US_ - General Ledger Summary Dec 31, 2025.pdf" \
  --output "tmp/xero-testing/gl_balance.csv" \
  --period "2025-12"
```

**What it does**:
- Extracts Account Code, Account Name, Closing Balance
- Handles parentheses as negative numbers: `(1,185,000.00)` → `-1185000.00`
- Removes commas from numbers
- Adds period column: `2025-12`
- Outputs CSV ready for Rowshni

### Example 2: Xero AP Aging
**Your file**: `Demo Company _US_ - Accounts Payable Aging Summary Dec 31, 2025.pdf`

```bash
python scripts/extract_ap_aging.py \
  --input "tmp/xero-testing/Demo Company _US_ - Accounts Payable Aging Summary Dec 31, 2025.pdf" \
  --output "tmp/xero-testing/ap_aging.csv" \
  --period "2025-12" \
  --account-code "200"
```

**What it does**:
- Extracts Contact/Vendor, Current, 30 Days, 60 Days, 90+ Days, Total
- Sums aging buckets into Total column
- Adds account_code column: `200`
- Adds period column: `2025-12`
- Outputs subledger-ready CSV

---

## Advanced Options

### OCR for Scanned PDFs
If your PDF is a scanned image:
```bash
python scripts/extract_gl_balance.py \
  --input "Scanned_GL_Report.pdf" \
  --output "gl_balance.csv" \
  --period "2025-12" \
  --ocr
```

Requires: `pip install pytesseract` + Tesseract OCR installed

### Custom Templates
Create extraction templates for recurring report formats:

**File**: `templates/xero_gl_balance.json`
```json
{
  "system": "Xero",
  "report_type": "GL Summary",
  "extraction_method": "pdfplumber",
  "column_mappings": {
    "Account Code": "account_code",
    "Account": "account_name",
    "Closing Balance": "amount"
  },
  "sign_indicators": {
    "negative_format": "parentheses"
  },
  "skip_rows": ["Total"]
}
```

Use template:
```bash
python scripts/extract_gl_balance.py \
  --input "GL_Report.pdf" \
  --output "gl_balance.csv" \
  --template "templates/xero_gl_balance.json"
```

---

## Troubleshooting

### Problem: "No tables detected"
**Cause**: PDF uses images or irregular layout
**Solution**: Try different extraction method or use OCR
```bash
python scripts/extract_gl_balance.py --input report.pdf --output out.csv --ocr
```

### Problem: "Columns misaligned"
**Cause**: Variable-width fonts or complex formatting
**Solution**: Use tabula instead of pdfplumber
```bash
python scripts/extract_gl_balance.py --input report.pdf --output out.csv --method tabula
```

### Problem: "Numbers have wrong signs"
**Cause**: Parentheses not detected correctly
**Solution**: Check extraction preview and adjust sign convention
```bash
python scripts/pdf_analyzer.py --input report.pdf
# Review output, then adjust extraction script if needed
```

### Problem: "Missing Java error"
**Cause**: tabula-py requires Java
**Solution**: Install JRE 8+ from java.com

---

## Best Practices

1. **Always analyze first**
   ```bash
   python scripts/pdf_analyzer.py --input report.pdf
   ```
   This shows you what data will be extracted

2. **Name files with dates**
   - Good: `GL_Summary_2025-12.csv`
   - Better: Period auto-extracts in Rowshni!

3. **Keep original PDFs**
   - Store in `supporting_documents/` for audit trail
   - Upload to Rowshni as supporting documents

4. **Build template library**
   - Create templates for recurring reports (SAP, Oracle, QuickBooks)
   - Reuse templates each month

5. **Validate extraction**
   - Check row counts match PDF
   - Verify totals match
   - Spot-check a few accounts

---

## Integration with Rowshni Workflow

### Complete Process

1. **Extract PDF to CSV** (if needed)
   ```bash
   python scripts/extract_gl_balance.py --input GL.pdf --output gl.csv --period "2025-12"
   ```

2. **Upload CSV to Rowshni**
   - Period auto-detected from filename
   - Or manually enter in metadata field

3. **Add Metadata** (if needed)
   - GL files: Period
   - Subledger files: Account code + Period

4. **Map Columns**
   - Use Rowshni column mapper
   - Apply suggested mappings

5. **Run Reconciliation**
   - Click "Illuminate ✨"
   - Review AI analysis

---

## Script Reference

### extract_gl_balance.py
Extracts GL account balances from PDFs

**Required arguments**:
- `--input`: PDF file path
- `--output`: Output CSV file path
- `--period`: Accounting period (YYYY-MM)

**Optional arguments**:
- `--ocr`: Enable OCR for scanned PDFs
- `--method`: Extraction method (pdfplumber, tabula, pypdf)
- `--template`: Template file for custom extraction rules

### extract_ap_aging.py
Extracts AP aging reports with vendor details

**Required arguments**:
- `--input`: PDF file path
- `--output`: Output CSV file path
- `--period`: Accounting period (YYYY-MM)
- `--account-code`: GL account code (e.g., "200")

**Optional arguments**:
- `--ocr`: Enable OCR
- `--aging-buckets`: Custom aging bucket names

### extract_transactions.py
Extracts transaction journals/details

**Required arguments**:
- `--input`: PDF file path
- `--output`: Output CSV file path
- `--period`: Accounting period (YYYY-MM)

**Optional arguments**:
- `--ocr`: Enable OCR
- `--account-filter`: Extract only specific account codes

### pdf_analyzer.py
Analyzes PDF structure before extraction

**Arguments**:
- `--input`: PDF file path
- `--page`: Analyze specific page (default: all pages)

**Output**:
- Report type detection
- Page count
- Table detection
- Sample data preview
- Recommended extraction method

---

## Support

For issues or questions:
- Check extraction scripts: `.claude/skills/pdf-to-csv-extractor/scripts/`
- Review templates: `.claude/skills/pdf-to-csv-extractor/templates/`
- See full documentation: `.claude/skills/pdf-to-csv-extractor/SKILL.md`
