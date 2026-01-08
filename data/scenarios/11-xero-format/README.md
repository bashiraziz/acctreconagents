# Scenario 11: Xero Format

## Overview
This scenario tests Rowshni's ability to handle Xero cloud accounting exports with their characteristic format and conventions.

## Scenario Type
**System Format Validation**: Xero

## Expected Outcome
✅ **Balanced reconciliation** (zero variances across all accounts)

## Key Characteristics

### Xero Export Format
- **Account Code**: Simple numeric codes (2000, 2100, etc.)
- **Account Name**: Separate column with descriptive name
- **Debit/Credit Columns**: Separate columns showing movement
- **Net Movement**: Pre-calculated net (Debit - Credit)
- **Date Format**: "DD MMM YYYY" (e.g., "31 Dec 2025")
- **Sign Convention**: Natural accounting (liabilities negative, assets positive)
- **No reversal needed**: Xero exports use correct accounting convention

### What This Tests
- ✅ Simple account code parsing (no extraction needed)
- ✅ Debit/Credit column handling
- ✅ Xero date format conversion: "31 Dec 2025" → "2025-12"
- ✅ Clean, straightforward column mapping
- ✅ No sign reversal requirement
- ✅ Natural accounting sign convention

## Files Included

### 1. `gl_balance.csv`
General ledger balances exported from Xero:
- Account Code: 2000, 2100, 1400, 5000
- Debit/Credit columns
- Net Movement pre-calculated
- Date: 31 Dec 2025

### 2. `subledger_balance.csv`
Subledger details matching GL totals:
- Same accounts as GL
- Vendor/category breakdown
- Matches GL amounts exactly

## Account Details

| Account Code | Account Name | GL Amount | Subledger Amount | Type |
|-------------|--------------|-----------|-----------------|------|
| 2000 | Accounts Payable | -42,850 | -42,850 | Liability |
| 2100 | Accrued Expenses | -7,200 | -7,200 | Liability |
| 1400 | Inventory | 98,750 | 98,750 | Asset |
| 5000 | Cost of Sales | 67,300 | 67,300 | Expense |

## Expected Variances
**NONE** - All accounts should reconcile to zero variance.

## Column Mapping Guide

### For GL Balance File:
- **Account Code** → account_code
- **Account Name** → account_name (optional)
- **Debit** → debit (used for calculation)
- **Credit** → credit (used for calculation)
- **Net Movement** → amount (or calculate from Debit - Credit)
- **Date** → period (convert "31 Dec 2025" to "2025-12")

### For Subledger File:
- Same mapping as GL
- **Vendor** → description (optional)

## System-Specific Settings

### Upload Settings:
- **Accounting System**: Select "Xero" (or "Auto" for auto-detection)
- **Period**: Use metadata "2025-12" or map from Date column
- **Currency**: USD
- **Reverse Signs**: ❌ **NO** (Xero uses natural accounting convention)

### Auto-Detection Criteria:
Xero format is detected when CSV contains:
- "Account Code" column (exact match)
- "Debit" and "Credit" columns
- Simple numeric account codes
- Date format matching "DD MMM YYYY"

## Testing Instructions

### 1. Upload Files
- Upload `gl_balance.csv` as GL Balance
- Upload `subledger_balance.csv` as Subledger Balance

### 2. Apply System Selection
- Select "Xero" from accounting system dropdown
- Or use "Auto" to test auto-detection

### 3. Map Columns
- Account Code → account_code
- Net Movement → amount (or let parser calculate from Debit/Credit)
- Date → period
- **DO NOT check "Reverse signs"** (already correct)

### 4. Verify Results
All accounts should show:
- **Variance**: 0.00
- **GL Amount**: Matches table above
- **Subledger Amount**: Matches table above
- **Signs**: Liabilities negative, assets/expenses positive

## Comparison with Other Systems

### vs QuickBooks:
- ✅ Similar simplicity
- ✅ Both use natural sign convention
- ❌ Different account format (Xero: separate code/name; QB: parenthetical)
- ❌ Different date format (Xero: "31 Dec 2025"; QB: "12/31/2025")

### vs NetSuite:
- ✅ Both have separate account code column
- ✅ Both use natural sign convention
- ❌ Xero simpler (no multi-currency, no dimensions)
- ❌ Xero uses Debit/Credit columns; NetSuite uses net amount

### vs Costpoint:
- ✅ Both have Debit/Credit columns
- ❌ Xero uses natural signs; Costpoint needs reversal
- ❌ Xero simpler (no org/project dimensions)
- ❌ Different date formats

## Common Pitfalls

### ❌ Don't Do This:
1. Check "Reverse signs" (Xero is already correct)
2. Map "Debit" column directly to amount (need to calculate Debit - Credit)
3. Ignore the date format conversion
4. Assume parenthetical account format (Xero uses separate columns)

### ✅ Do This:
1. Use "Net Movement" column or let parser calculate from Debit/Credit
2. Convert date format properly
3. Map Account Code and Account Name separately
4. Keep natural sign convention

## Xero-Specific Features

### Tracking Categories
Xero supports optional tracking categories (dimensions):
- Region
- Department
- Project
- Custom categories

These would appear as additional columns in more detailed exports.

### Multi-Currency
Xero supports multi-currency but exports in base currency by default.
If multi-currency export:
- Look for "Home Currency Amount" column
- Use home currency, not foreign currency

### Report Types
Common Xero reports:
- **Trial Balance**: Account balances (what this scenario uses)
- **General Ledger**: Detailed transactions
- **Aged Payables**: AP aging by vendor
- **P&L**: Income statement format

## Success Criteria

✅ **Auto-Detection**: System correctly identifies format as "Xero"
✅ **Date Conversion**: "31 Dec 2025" → "2025-12"
✅ **Account Parsing**: Account codes extracted correctly
✅ **Amount Calculation**: Debit - Credit = Net Movement
✅ **Sign Convention**: Natural accounting (no reversal)
✅ **Zero Variances**: All accounts reconcile perfectly
✅ **Agent Recognition**: AI agents acknowledge Xero format in report

## Real-World Xero Exports

In practice, Xero exports may include:
- More detailed transaction data
- Tracking category columns
- Tax columns (GST, VAT)
- Journal reference numbers
- Contact names (vendors/customers)
- Custom fields

This scenario uses a simplified version focusing on core reconciliation data.

---

**Test Status**: ⏳ Ready for testing
**Complexity**: ⭐ Simple (similar to QuickBooks)
**Sign Reversal**: ❌ Not needed
**Date Conversion**: ✅ Required ("31 Dec 2025" → "2025-12")
