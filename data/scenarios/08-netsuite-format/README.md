# NetSuite Format Test Scenario

## Purpose
Test the system's ability to parse and reconcile NetSuite exports with multi-subsidiary, multi-currency, and dimensional complexity.

## NetSuite-Specific Format Characteristics

### 1. Multi-Dimensional Structure
NetSuite tracks multiple dimensions simultaneously:
- **Subsidiary**: Legal entity (US Operations, UK Operations, etc.)
- **Department**: Organizational unit (Finance, Operations, Sales)
- **Class**: Business segment (Corporate, Direct, Revenue)
- **Location**: Physical location (optional, not in this example)

**Challenge**: Same account number can appear multiple times with different dimensional combinations.

### 2. Multi-Currency Native
NetSuite is built for multi-currency:
- `Amount (Foreign Currency)`: Original transaction currency
- `Currency`: Transaction currency code (USD, GBP, EUR)
- `Amount (Base Currency)`: Converted to company base currency

**Example:**
- UK vendor invoice: -15,600.00 GBP
- Converted to base (USD): -19,812.00 USD
- Exchange rate: ~1.27

### 3. Internal ID System
Every record has a unique Internal ID:
- `Internal ID`: NetSuite's unique transaction identifier
- Used for lookups, not for reconciliation
- Should be ignored during reconciliation

### 4. Period Format
NetSuite uses text month format:
- `"Dec 2025"` instead of `"2025-12"`
- `"Jan 2025"` instead of `"2025-01"`

**Challenge**: Need to convert "Dec 2025" → "2025-12"

### 5. Transaction Number Format
Different prefixes for different transaction types:
- `Bill-10245`: Vendor bill
- `Journal-5124`: Journal entry
- `Invoice-20456`: Customer invoice (not in this example)

### 6. Sign Convention
NetSuite shows amounts in their natural form:
- Liabilities: Negative (credits)
- Assets: Positive (debits)
- **No reversal needed** - NetSuite matches Rowshni convention

### 7. Custom Saved Searches
NetSuite exports are usually from "Saved Searches" which can have:
- Custom column names
- Calculated fields
- Formulas
- Multi-level grouping

## Test Data Overview

### GL Trial Balance

| Account | Subsidiary | Department | Currency | Amount (FC) | Amount (Base USD) |
|---------|-----------|-----------|----------|-------------|-------------------|
| 2000 AP | US Ops | Finance | USD | -125,450.75 | -125,450.75 |
| 2000 AP | UK Ops | Finance | GBP | -15,600.00 | -19,812.00 |
| 2100 Accrued | US Ops | Finance | USD | -32,500.00 | -32,500.00 |
| 2100 Accrued | US Ops | Operations | USD | -18,750.00 | -18,750.00 |

**Key Points:**
- Account 2000 has TWO entries (US and UK subsidiaries)
- Account 2100 has TWO entries (Finance and Operations departments)
- Currency conversion already applied in base currency column

### AP Subledger Detail

**Account 2000 - US Operations:**
- Acme Corporation: -45,600.00 USD
- Global Tech Solutions: -52,850.75 USD
- Widget Distributors: -27,000.00 USD
- **Subtotal**: -125,450.75 USD ✅

**Account 2000 - UK Operations:**
- UK Supplier Ltd: -15,600.00 GBP = -19,812.00 USD
- **Subtotal**: -19,812.00 USD ✅

**Account 2100 - US Operations Finance:**
- Payroll Accrual: -22,500.00 USD
- Benefits Accrual: -10,000.00 USD
- **Subtotal**: -32,500.00 USD ✅

**Account 2100 - US Operations Operations:**
- Vacation Accrual: -18,750.00 USD
- **Subtotal**: -18,750.00 USD ✅

## Column Mapping Instructions

### GL Balance File

**Use Base Currency for reconciliation:**
```
Account Number → account_code

Amount (Base Currency) → amount
  - Already in USD (base currency)
  - Already has correct signs (negative for liabilities)
  - No reversal needed

Period → period
  - Convert "Dec 2025" to "2025-12"
  - Or use metadata

Metadata:
  - period: "2025-12"
  - currency: "USD" (base currency)
  - reverseSign: false (NetSuite signs are correct)
```

**Important**: If using "Amount (Foreign Currency)", you'll get mixed currencies. Always use "Amount (Base Currency)" for reconciliation.

### Subledger File

**Map to base currency:**
```
Account Number → account_code

Amount (Base Currency) → amount
  - Use base currency column, not foreign currency
  - This handles the GBP→USD conversion automatically

Transaction Number → invoice_number (optional)
Vendor Name → vendor (optional)

Metadata:
  - period: "2025-12"
  - currency: "USD"
  - reverseSign: false
```

## Expected Reconciliation Results

### Account 2000 (Accounts Payable) - Consolidated
- GL Balance: -145,262.75 USD (US: -125,450.75 + UK: -19,812.00)
- Subledger Balance: -145,262.75 USD
- Variance: $0.00
- Status: ✅ Balanced

**Note**: GL has TWO rows for account 2000 (different subsidiaries). System should aggregate them.

### Account 2100 (Accrued Liabilities) - Consolidated
- GL Balance: -51,250.00 USD (Finance: -32,500.00 + Operations: -18,750.00)
- Subledger Balance: -51,250.00 USD
- Variance: $0.00
- Status: ✅ Balanced

**Note**: GL has TWO rows for account 2100 (different departments). System should aggregate them.

## Testing Focus

### Multi-Currency Handling
✅ Test that base currency column is used correctly
✅ Test that GBP transaction is properly converted
✅ Verify that subledger matches GL after currency conversion

### Dimensional Aggregation
✅ **Critical**: System must aggregate multiple GL rows for same account
- Account 2000: 2 rows (US + UK subsidiaries)
- Account 2100: 2 rows (Finance + Operations departments)

### Period Format Conversion
✅ Test conversion of "Dec 2025" → "2025-12"
✅ Test that text month format doesn't cause errors

### Internal ID Handling
✅ Verify Internal ID column doesn't interfere with reconciliation

### Sign Convention
✅ Verify NO sign reversal needed
✅ NetSuite liabilities are already negative

## Common NetSuite Export Issues

1. **Multi-Currency Confusion**: Users export foreign currency instead of base currency
2. **Dimensional Explosion**: Same account appears many times (each subsidiary, department, class combo)
3. **Period Formats**: Text months, fiscal periods, or custom formats
4. **Custom Fields**: Saved searches can include hundreds of custom fields
5. **Transaction Type Mix**: Bills, Journal Entries, Credit Memos all in one export
6. **Intercompany Transactions**: May need elimination entries

## NetSuite Advanced Features

**Why NetSuite is Complex:**
- True multi-currency (not just reporting currency)
- Multi-subsidiary with intercompany eliminations
- Dimensional tracking (up to 10 custom segments)
- Workflow approvals affect transaction status
- Advanced revenue recognition
- SuiteTax for complex tax jurisdictions

## Saved Search Tips

NetSuite exports usually come from "Saved Searches" which means:
- Column names are user-defined
- Formulas can create calculated columns
- Grouping can create subtotals (need to exclude)
- Criteria can filter to specific date ranges

## Agent Expected Behavior

**Data Validation Agent:**
- Should note multi-currency structure
- Should validate that base currency is being used
- Should confirm dimensional aggregation is needed
- Should flag if foreign currency column is mapped (wrong!)

**Analysis Agent:**
- Risk Level: Low (all accounts balanced)
- Should note multi-subsidiary structure
- Should confirm aggregation worked correctly
- Should handle UK subsidiary currency conversion

**Investigation Agent:**
- No variances to investigate (balanced scenario)

**Report Generator:**
- Should confirm clean reconciliation across all dimensions
- Should note multi-currency handling
- Should acknowledge NetSuite's dimensional complexity
- Should mention subsidiary/department segments
- Should NOT recommend automation (already automated)

## Testing Checklist

- [ ] Test with "Amount (Base Currency)" column (correct)
- [ ] Test with "Amount (Foreign Currency)" column (should fail - mixed currencies)
- [ ] Verify GL aggregation for multiple rows per account
- [ ] Test period conversion from "Dec 2025" to "2025-12"
- [ ] Verify GBP transaction properly handled
- [ ] Confirm no sign reversal needed
- [ ] Test that Internal ID doesn't interfere
- [ ] Verify dimensional columns don't cause mapping issues

## Multi-Currency Reconciliation Notes

**Important**: Always reconcile in BASE CURRENCY:
- Base Currency (USD): -145,262.75 ✅ Reconciles
- Foreign Currencies Mixed: -141,050.75 (wrong - can't add USD + GBP)

**Formula:**
```
GL Account 2000 Base USD:
  US Operations:  -125,450.75 USD
  UK Operations:   -19,812.00 USD (converted from -15,600 GBP @ 1.27)
  Total:          -145,262.75 USD ✅

Subledger Base USD:
  Acme (USD):      -45,600.00 USD
  Global (USD):    -52,850.75 USD
  Widget (USD):    -27,000.00 USD
  UK Supplier:     -19,812.00 USD (converted from GBP)
  Total:          -145,262.75 USD ✅
```
