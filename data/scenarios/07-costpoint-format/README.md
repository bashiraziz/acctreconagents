# Costpoint Format Test Scenario

## Purpose
Test the system's ability to parse and reconcile Deltek Costpoint exports. Costpoint is specialized government contract accounting software with DCAA compliance requirements.

## Costpoint-Specific Format Characteristics

### 1. Multi-Level Chart of Accounts
Costpoint uses a hierarchical structure:
```
Company > Organization > Account
01 > 100 > 6210
```

**Challenge**: Account code alone isn't unique - need Company+Org+Account

### 2. Debit/Credit Columns
Unlike other systems, Costpoint exports separate debit and credit columns:
- `Debit`: Debit balance (positive for assets/expenses)
- `Credit`: Credit balance (positive for liabilities/revenue)
- `Net_Balance`: The net of debits minus credits

**Important**: For liabilities like Accounts Payable:
- Debit = 0.00
- Credit = 156890.75
- Net_Balance = 156890.75 (shown as positive, but it's a credit)

### 3. Fiscal Period System
- `Fiscal_Year`: 2025
- `Period`: 12 (December)
- Combined: "2025-12"

### 4. Project/Task Tracking
Every transaction tagged with:
- `Project`: e.g., "PROJ-001"
- `Task`: e.g., "1.1", "1.2", "0.0" (0.0 = overhead/admin)

### 5. Sign Convention (Critical!)
Costpoint shows Net_Balance as positive for BOTH debits and credits:
- Account 6210 (Expense): Net_Balance = 245680.50 (debit - shown positive)
- Account 2010 (AP Liability): Net_Balance = 156890.75 (credit - shown positive)

**To reconcile**: Must apply sign convention based on account type:
- If Credit > Debit → multiply by -1 for liabilities
- Or use "reverse sign" feature

### 6. Vendor ID System
- Alphanumeric vendor codes: `V00125`, `V00298`
- Special codes: `PAYROLL`, `BENEFITS` (for accruals)

## Test Data Overview

### GL Trial Balance

**Organization 100:**
| Account | Description | Debit | Credit | Net Balance |
|---------|------------|-------|--------|-------------|
| 6210 | Labor-Direct | 245,680.50 | 0.00 | 245,680.50 |
| 6220 | Labor-Overhead | 89,234.25 | 0.00 | 89,234.25 |
| 2010 | Accounts Payable | 0.00 | 156,890.75 | 156,890.75 |
| 2015 | Accrued Payroll | 0.00 | 45,200.00 | 45,200.00 |

**Organization 200:**
| Account | Description | Debit | Credit | Net Balance |
|---------|------------|-------|--------|-------------|
| 6210 | Labor-Direct | 125,400.00 | 0.00 | 125,400.00 |
| 2010 | Accounts Payable | 0.00 | 78,945.50 | 78,945.50 |

### AP Subledger Detail

**Org 100, Account 2010 (Accounts Payable):**
- TechStaff Solutions: 85,400.00
- Engineering Consultants: 45,890.75
- Office Supplies Inc: 25,600.00
- **Total**: 156,890.75 ✅

**Org 100, Account 2015 (Accrued Payroll):**
- Accrued Salaries: 32,500.00
- Accrued Benefits: 12,700.00
- **Total**: 45,200.00 ✅

**Org 200, Account 2010 (Accounts Payable):**
- TechStaff Solutions: 52,345.50
- Materials Supply Co: 26,600.00
- **Total**: 78,945.50 ✅

## Column Mapping Instructions

### GL Balance File

**Critical**: Costpoint shows liabilities as positive Net_Balance, but they should be negative in reconciliation.

**Option 1 - Use Debit/Credit columns:**
```
Account → account_code
Credit → amount (for liability accounts)
  - Will be positive in file
  - Check "Reverse signs" in metadata to make negative

Fiscal_Year + Period → period
  - Combine to "2025-12"
  - Or use metadata
```

**Option 2 - Use Net_Balance with sign reversal:**
```
Account → account_code
Net_Balance → amount
  - ✅ Check "Reverse signs (multiply all amounts by -1)"
  - This converts positive credit balances to negative

Metadata:
  - period: "2025-12"
  - currency: "USD"
  - reverseSign: ✅ true
```

### Subledger File
```
Account → account_code
Amount → amount
  - Already in correct format (positive numbers)
  - ✅ Check "Reverse signs" to match GL convention

Invoice_Num → invoice_number (optional)
Vendor_Name → vendor (optional)

Metadata:
  - period: "2025-12"
  - currency: "USD"
  - reverseSign: ✅ true
```

## Expected Reconciliation Results

### Org 100, Account 2010 (Accounts Payable)
- GL Balance: -156,890.75 (after sign reversal)
- Subledger Balance: -156,890.75 (after sign reversal)
- Variance: $0.00
- Status: ✅ Balanced

### Org 100, Account 2015 (Accrued Payroll)
- GL Balance: -45,200.00 (after sign reversal)
- Subledger Balance: -45,200.00 (after sign reversal)
- Variance: $0.00
- Status: ✅ Balanced

### Org 200, Account 2010 (Accounts Payable)
- GL Balance: -78,945.50 (after sign reversal)
- Subledger Balance: -78,945.50 (after sign reversal)
- Variance: $0.00
- Status: ✅ Balanced

## Testing Focus

### Sign Convention Handling
✅ **Critical Test**: Verify "Reverse signs" checkbox properly handles Costpoint's positive credit balances

### Multi-Level Account Structure
✅ Test that Company+Org+Account combinations are handled correctly
- Should treat "01-100-2010" as different from "01-200-2010"

### Debit/Credit Parsing
✅ Test ability to use Credit column for liability accounts
✅ Test that Net_Balance can be used with sign reversal

### Project/Task Metadata
✅ Test that additional columns (Project, Task) don't interfere with reconciliation

## Common Costpoint Export Issues

1. **Positive Credits**: Most confusing aspect - credits shown as positive Net_Balance
2. **Org-Level Data**: Each org may have same account numbers but different balances
3. **DCAA Requirements**: Often includes audit trail fields that should be ignored
4. **Fiscal Year Rollover**: Period 13 often exists for adjustments
5. **Burden Allocations**: Overhead accounts may have complex relationships

## Government Contract Accounting Notes

**Why Costpoint is Different:**
- Designed for FAR/DFAR compliance
- Tracks direct vs. indirect costs
- Project-centric (not just account-centric)
- Audit trail requirements are extensive
- Time-phased budgeting and accruals

## Agent Expected Behavior

**Data Validation Agent:**
- Should note the debit/credit column structure
- Should flag if sign reversal wasn't applied
- Should confirm all balances reconcile

**Analysis Agent:**
- Risk Level: Low (all accounts balanced)
- Should note this is project-based accounting
- Should not flag the positive credit amounts if sign reversal is enabled

**Report Generator:**
- Should confirm clean reconciliation across all orgs
- Should note the project tracking dimension
- Should acknowledge DCAA-compliant format
- Should NOT recommend automation (already automated)

## Testing Checklist

- [ ] Test with "Reverse signs" checked for both GL and subledger
- [ ] Test without sign reversal (should show large variances)
- [ ] Verify account code extraction from multi-level structure
- [ ] Test that project/task columns don't cause mapping issues
- [ ] Verify period concatenation (Fiscal_Year + Period)
