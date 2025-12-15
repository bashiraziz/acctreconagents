# Test Data Sets for AcctRecon

This folder contains two complete test scenarios for the reconciliation application.

## Scenario 1: BALANCED (Perfect Match)

**Location**: `balanced/`

### Files:
- `gl_balance.csv` - General Ledger balances for October 2025
- `subledger_balance.csv` - AP Aging detail that perfectly reconciles

### Expected Result:
✅ **RECONCILIATION PASSES** - No variances

**GL Total**: $1,400,000.00
- Account 20100 (AP Control): $1,185,000.00
- Account 22010 (Accrued Expenses): $215,000.00

**Subledger Total**: $1,400,000.00
- Northwind Components: $420,000.00
- Radius Labs: $275,000.00
- TruVista Logistics: $155,000.00
- Global Staffing: $335,000.00
- Accrued Payroll: $215,000.00

**Variance**: $0 ✓

---

## Scenario 2: UNBALANCED (With Variances)

**Location**: `unbalanced/`

### Files:
- `gl_balance.csv` - General Ledger balances (missing Orion accrual)
- `subledger_balance.csv` - AP Aging detail (has duplicate + missing GL entry)

### Expected Result:
⚠️ **RECONCILIATION FAILS** - Multiple variances detected

**GL Total**: $1,355,000.00
- Account 20100 (AP Control): $1,185,000.00
- Account 22010 (Accrued Expenses): $170,000.00 ⚠️ UNDERSTATED by $45k

**Subledger Total**: $1,675,000.00
- Northwind Components: $420,000.00
- Radius Labs: $275,000.00
- Radius Labs (DUPLICATE): $275,000.00 ⚠️ DUPLICATE ENTRY
- TruVista Logistics: $155,000.00
- Global Staffing: $335,000.00
- Accrued Payroll: $170,000.00
- Orion Research Accrual: $45,000.00 ⚠️ MISSING FROM GL

**Gross Variance**: Subledger $1,675,000 - GL $1,355,000 = **$320,000 overstated**

### Variance Analysis:

The AI agents should identify and explain:

1. **Duplicate Invoice (Account 20100)**
   - Vendor: Radius Labs
   - Invoice: INV-99302
   - Amount: $275,000.00
   - Issue: Entered twice in aging
   - Action: Remove duplicate from subledger
   - Impact: Reduces subledger by $275,000

2. **Missing GL Accrual (Account 22010)**
   - Vendor: Orion Research
   - Invoice: ACCR-ORION-2025-10
   - Amount: $45,000.00
   - Issue: Accrual exists in subledger but not in GL
   - Action: Add accrual entry to GL
   - Impact: Increases GL by $45,000

### After Adjustments:
- Subledger adjusted: $1,675,000 - $275,000 = **$1,400,000**
- GL adjusted: $1,355,000 + $45,000 = **$1,400,000**
- **RECONCILED** ✓

---

## How to Use

### Testing Balanced Scenario:
1. Upload `balanced/gl_balance.csv` as **GL Balance**
2. Upload `balanced/subledger_balance.csv` as **Subledger Balance**
3. Map columns using auto-suggest
4. Run reconciliation
5. **Expected**: Green status, no variances, agents confirm clean reconciliation

### Testing Unbalanced Scenario:
1. Upload `unbalanced/gl_balance.csv` as **GL Balance**
2. Upload `unbalanced/subledger_balance.csv` as **Subledger Balance**
3. Map columns using auto-suggest
4. Run reconciliation
5. **Expected**:
   - Validation Agent: Flags data quality issues
   - Analysis Agent: Identifies $320k gross variance
   - Investigator Agent: Finds duplicate Radius Labs + missing Orion accrual
   - Report Agent: Provides detailed variance explanation with recommended adjustments
