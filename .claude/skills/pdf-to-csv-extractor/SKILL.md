---
name: pdf-to-csv-extractor
description: Extract data from PDF documents (GL reports, AP aging, trial balances) and convert to CSV format for reconciliation. Use when users upload PDF files instead of CSV, or when extracting data from financial reports.
allowed-tools: Read, Write, Bash, Glob
---

# PDF to CSV Extractor for Reconciliation

Extracts financial data from PDF documents and converts them into properly formatted CSV files compatible with the reconciliation system.

## When to use this Skill

Invoke this Skill when:
- User uploads a PDF file instead of CSV
- User wants to extract data from accounting system PDF exports
- User has GL reports, AP aging reports, or trial balances in PDF format
- Need to convert legacy/archive PDF reports to CSV
- Extracting data from scanned or image-based PDFs (with OCR)

## Supported PDF types

### Text-based PDFs (Best quality)
- **GL Balance Reports**: General ledger account balances
- **AP Aging Reports**: Accounts payable aging with vendor details
- **Trial Balance**: Account code, description, debits, credits
- **Subledger Detail**: Invoice-level detail reports
- **Transaction Listings**: GL transaction journals

### Scanned/Image PDFs (Requires OCR)
- Scanned accounting reports
- Photos of reports
- Image-based PDFs without embedded text

## Installation & Dependencies

### Required Python packages
```bash
pip install pdfplumber pypdf tabula-py pandas
```

### Optional (for OCR support)
```bash
pip install pytesseract
# Also requires Tesseract OCR engine installed on system
```

### Java requirement (for tabula-py)
Tabula requires Java Runtime Environment (JRE) 8+

## Extraction methods

This Skill uses multiple extraction strategies:

### 1. **pdfplumber** (Default - Best for most PDFs)
- Extracts text with layout preservation
- Good for columnar data
- Handles tables well

### 2. **tabula-py** (For complex tables)
- Uses Java-based Tabula library
- Best for PDFs with clear table structures
- Can detect table boundaries automatically

### 3. **pypdf** (Fallback)
- Basic text extraction
- Works when layout doesn't matter
- Fastest but least accurate for tables

### 4. **OCR (pytesseract)** (For scanned PDFs)
- Optical Character Recognition
- Converts images to text
- Slower but handles scanned documents

## Output CSV formats

The Skill outputs CSV files matching reconciliation schema:

### GL Balance CSV
```csv
account_code,account_name,period,currency,amount
20100,Accounts Payable Control,2025-10,USD,-1185000.00
22010,Accrued Expenses,2025-10,USD,-215000.00
```

### Subledger Balance CSV
```csv
vendor,invoice_number,invoice_date,due_date,aging_bucket,currency,amount,account_code,period
Acme Corp,INV-12345,2025-10-05,2025-11-04,Current,USD,-500000.00,20100,2025-10
```

### Transactions CSV
```csv
account_code,booked_at,debit,credit,amount,narrative,source_period
20100,2025-10-05,0,335000,-335000,Invoice INV-55490 - Vendor Name,2025-10
```

## Process flow

### Step 1: Analyze the PDF
1. Check if PDF is text-based or scanned
2. Identify the report type (GL, AP aging, transactions)
3. Detect table structure and columns
4. Preview extraction to confirm data quality

### Step 2: Extract data
1. Use appropriate extraction method
2. Parse into structured data (pandas DataFrame)
3. Clean and normalize data:
   - Remove header/footer rows
   - Handle multi-line entries
   - Parse currency and number formats
   - Extract dates properly

### Step 3: Map to reconciliation schema
1. Identify which columns map to canonical fields
2. Apply sign conventions (liabilities negative)
3. Format amounts (remove commas, 2 decimals)
4. Add period field if missing
5. Standardize date formats (YYYY-MM-DD)

### Step 4: Generate CSV
1. Write to properly formatted CSV
2. Validate required fields present
3. Check data quality (no nulls in required fields)
4. Preview first 5 rows for user confirmation

### Step 5: Save and confirm
1. Save CSV to appropriate location
2. Show extraction summary (rows extracted, fields mapped)
3. Provide preview for user validation
4. Suggest column mappings for reconciliation

## Common PDF layouts

### GL Balance Report
```
Account Code  Description                  Period    Amount
20100        Accounts Payable Control     2025-10   (1,185,000.00)
22010        Accrued Expenses            2025-10     (215,000.00)
```

**Extraction strategy**:
- Parse fixed-width columns or tab-delimited
- Convert parentheses to negative numbers
- Remove commas from amounts
- Extract period from header or column

### AP Aging Report
```
Vendor Name    Invoice#   Date       Due Date   Current    30 Days   60+ Days
Acme Corp      INV-001   10/5/2025  11/4/2025  500,000.00    -         -
Tech Inc       INV-002   9/15/2025  10/15/2025    -      100,000.00   -
```

**Extraction strategy**:
- Identify aging buckets (Current, 30, 60, 90+)
- Sum amounts across buckets per invoice
- Parse dates (handle various formats)
- Map vendor to vendor field

### Transaction Journal
```
Date       Account  Debit         Credit        Description
10/5/2025  20100               335,000.00    Invoice INV-55490
10/10/2025 20100    150,000.00                Payment CHK-9001
```

**Extraction strategy**:
- Parse debit/credit columns
- Calculate net amount (debit - credit)
- Extract narrative from description
- Parse dates consistently

## Handling special cases

### Parentheses for negative numbers
```python
# (1,185,000.00) → -1185000.00
amount = amount.replace('(', '-').replace(')', '')
```

### Multi-page reports
- Extract all pages
- Combine into single DataFrame
- Remove duplicate headers
- Maintain row continuity

### Subtotals and totals
- Identify and skip total rows
- Detect based on keywords: "Total", "Subtotal", "TOTAL"
- Or detect by indentation/formatting

### Missing data
- Handle blank cells
- Infer period from report header if not in rows
- Default currency to USD if not specified

## Sign convention handling

**Critical**: Apply correct signs for liabilities!

```python
def apply_sign_convention(account_code, amount):
    """
    Apply sign convention based on account type.
    Liabilities (20100, 22010) should be negative.
    """
    liability_accounts = ['20100', '22010']

    if account_code in liability_accounts:
        # Ensure amount is negative for credit balance
        if amount > 0:
            amount = -amount

    return amount
```

## Example extraction scripts

See supporting files:
- `scripts/extract_gl_balance.py` - GL balance extraction
- `scripts/extract_ap_aging.py` - AP aging extraction
- `scripts/extract_transactions.py` - Transaction journal extraction
- `scripts/pdf_analyzer.py` - PDF type detection and preview

## Usage examples

### Basic extraction
```bash
# User uploads PDF
python scripts/extract_gl_balance.py --input "GL_Report_Oct2025.pdf" --output "gl_balance.csv" --period "2025-10"
```

### With OCR (scanned PDF)
```bash
python scripts/extract_ap_aging.py --input "AP_Aging_Scan.pdf" --output "ap_aging.csv" --ocr --period "2025-10"
```

### Preview before extraction
```bash
python scripts/pdf_analyzer.py --input "report.pdf"
# Shows: PDF type, page count, detected tables, sample data
```

## Quality checks

After extraction, verify:
- [ ] All required fields present
- [ ] Amounts have correct signs (liabilities negative)
- [ ] No null values in required fields
- [ ] Dates in YYYY-MM-DD format
- [ ] Period field included
- [ ] Account codes are strings, not numbers
- [ ] Amounts are numbers with 2 decimals
- [ ] Row count matches expectation

## Troubleshooting

### Problem: Extraction produces gibberish
**Cause**: PDF is scanned/image-based
**Solution**: Use `--ocr` flag to enable OCR

### Problem: Table columns misaligned
**Cause**: Variable-width fonts or poor table detection
**Solution**: Try different extraction method (tabula vs pdfplumber)

### Problem: Numbers have wrong signs
**Cause**: Parentheses or CR notation not parsed
**Solution**: Check sign conversion logic, manually verify first few rows

### Problem: Missing data in some columns
**Cause**: PDF uses merged cells or spans columns
**Solution**: Manual review and correction may be needed

### Problem: Dates in wrong format
**Cause**: Various date formats in PDF
**Solution**: Use robust date parsing (pandas.to_datetime with multiple formats)

## Integration with reconciliation workflow

### Proposed user flow:

1. **Upload PDF** (instead of CSV)
   ```
   User: Upload GL balance PDF
   → System detects PDF format
   → Triggers this Skill
   ```

2. **Analyze & Preview**
   ```
   Skill: "I've detected a GL Balance Report PDF with 2 pages"
   Skill: [Shows preview of extracted data]
   User: "Looks good, proceed"
   ```

3. **Extract & Convert**
   ```
   Skill: Extracting...
   Skill: ✅ Extracted 50 accounts
   Skill: ✅ Created gl_balance.csv
   ```

4. **Map Columns** (existing workflow)
   ```
   User: Maps columns in UI
   User: Applies mappings
   ```

5. **Reconcile** (existing workflow)
   ```
   User: Runs agents
   → Normal reconciliation process
   ```

## Future enhancements

- [ ] **Auto-detect report type**: GL vs AP vs Transactions
- [ ] **Template library**: Pre-configured extraction rules for common systems (SAP, Oracle, QuickBooks)
- [ ] **Interactive column mapping**: Let user select which PDF columns map to CSV fields
- [ ] **Batch processing**: Upload multiple PDFs, extract all at once
- [ ] **Quality scoring**: Confidence score for extraction accuracy
- [ ] **Machine learning**: Learn from user corrections to improve extraction
- [ ] **Support more formats**: Excel, HTML exports, screenshot images

## Template configurations

Store extraction templates for common systems:

**File**: `templates/sap_gl_balance.json`
```json
{
  "system": "SAP",
  "report_type": "GL Balance",
  "extraction_method": "pdfplumber",
  "column_mappings": {
    "G/L Account": "account_code",
    "G/L Account Description": "account_name",
    "Amount in LC": "amount"
  },
  "sign_indicators": {
    "negative_format": "parentheses"
  },
  "date_format": "%m/%d/%Y"
}
```

Users can select template or create custom mappings.

## Testing

Test with variety of PDFs:
- Clean, well-formatted reports
- Poor quality scans
- Multi-page documents
- Various number formats (commas, decimals, parentheses)
- Different date formats
- Mixed fonts and sizes

## References

- **pdfplumber docs**: https://github.com/jsvine/pdfplumber
- **tabula-py docs**: https://tabula-py.readthedocs.io/
- **pypdf docs**: https://pypdf.readthedocs.io/
- **pytesseract**: https://github.com/madmaze/pytesseract

## Notes

- Always preview extracted data before finalizing
- Keep original PDF for reference
- Document any manual corrections needed
- Build template library over time as you process different PDF formats
- Consider adding validation step where user confirms extracted data matches PDF
