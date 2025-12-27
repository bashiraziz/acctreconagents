# QuickBooks Format Test Scenario

## Purpose
Test the system's ability to parse and reconcile QuickBooks-formatted exports.

## QuickBooks-Specific Format Characteristics

### 1. Account Name Format
QuickBooks exports often include account numbers in parentheses:
```
"Accounts Payable (2000)"
"Cash - Operating (1000)"
```

**Challenge**: Need to extract account code `2000` from `"Accounts Payable (2000)"`

### 2. Number Formatting
- Amounts include comma separators: `"-52,850.00"`
- Negative amounts use minus sign (not parentheses)
- Always 2 decimal places

### 3. Date Format
- US format: `MM/DD/YYYY` (e.g., `12/31/2025`)
- Not ISO format
- Column header: "As of" instead of "Period"

### 4. Sign Convention
- **Liabilities**: Negative (credit balance)
- **Assets**: Positive (debit balance)
- **Expenses**: Positive (debit balance)

### 5. Column Names
QuickBooks uses natural language:
- "Account" (not "account_code")
- "Open Balance" (not "amount")
- "Num" (for invoice numbers, not "invoice_number")

## Test Data Overview

### GL Trial Balance
| Account | Code | Balance |
|---------|------|---------|
| Accounts Payable | 2000 | -$52,850.00 |
| Accrued Expenses | 2100 | -$8,500.00 |
| Inventory | 1400 | $125,600.00 |
| Cost of Goods Sold | 5000 | $89,400.00 |

### AP Aging (Subledger)
6 vendors/accruals totaling **-$61,350.00**

**Expected Variance**: -$8,500.00
- Account 2000: GL = -$52,850.00, Subledger = -$52,850.00 ✅ Balanced
- Account 2100: GL = -$8,500.00, Subledger = -$8,500.00 ✅ Balanced

## Column Mapping Instructions

### GL Balance File
```
Account → Extract account code from parentheses
  - "Accounts Payable (2000)" → account_code: "2000"
  - Use regex: \((\d+)\)

Balance → amount

As of → period
  - Convert "12/31/2025" to "2025-12"
  - Or use metadata: period = "2025-12"
```

### Subledger File
```
Account → Extract account code from parentheses
  - Same regex pattern as GL

Open Balance → amount

Metadata:
  - period: "2025-12"
  - currency: "USD"
```

## Expected Reconciliation Results

### Account 2000 (Accounts Payable)
- GL Balance: -$52,850.00
- Subledger Balance: -$52,850.00
- Variance: $0.00
- Status: ✅ Balanced

**Subledger Detail:**
- ABC Supplies: -$15,200.00
- Widget Corp: -$22,650.00
- Office Depot: -$8,500.00
- Tech Solutions: -$6,500.00
- **Total**: -$52,850.00

### Account 2100 (Accrued Expenses)
- GL Balance: -$8,500.00
- Subledger Balance: -$8,500.00
- Variance: $0.00
- Status: ✅ Balanced

**Subledger Detail:**
- Payroll Accrual: -$5,200.00
- Benefits Accrual: -$3,300.00
- **Total**: -$8,500.00

## Testing Focus

### Column Extraction
✅ Test ability to extract account codes from text like `"Account Name (####)"`

### Number Parsing
✅ Test parsing of comma-formatted numbers: `"-52,850.00"` → `-52850.00`

### Date Conversion
✅ Test converting US date format to period: `"12/31/2025"` → `"2025-12"`

### Natural Language Headers
✅ Test mapping "Open Balance" to canonical "amount"
✅ Test mapping "Account" to canonical "account_code"

## Common QuickBooks Export Issues

1. **Inconsistent Account Format**: Sometimes exports include just numbers, sometimes "Name (Number)"
2. **Memo Field**: Often includes extra descriptions that should be ignored
3. **Multiple Currencies**: QuickBooks can handle multi-currency but exports may not clearly separate
4. **Subreports**: Detail reports may include subtotals that need to be filtered out

## Agent Expected Behavior

**Data Validation Agent:**
- Should note the comma-formatted numbers
- Should validate account code extraction
- Should confirm balanced status

**Analysis Agent:**
- Risk Level: Low (perfect reconciliation)
- No material variances

**Report Generator:**
- Should confirm both accounts reconcile cleanly
- Should note this is a QuickBooks export format
- Should NOT recommend automation (system is already automated)
