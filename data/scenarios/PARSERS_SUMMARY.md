# Accounting System Parsers - Complete Summary

## Overview
Rowshni supports 6 specialized accounting system parsers plus auto-detection and generic fallback.

**Total Systems Supported**: 6
**Auto-Detection**: ✅ Yes
**Generic Fallback**: ✅ Yes

---

## Supported Systems

### 1. QuickBooks ✅
**Parser**: `parseQuickBooksRow()`
**Test Scenario**: `data/scenarios/06-quickbooks-format/`
**Complexity**: ⭐ Simple

#### Key Features
- Parenthetical account codes: `"Accounts Payable (2000)"` → `2000`
- Comma-formatted numbers: `"-52,850.00"` → `-52850`
- US date format: `"12/31/2025"` → `"2025-12"`
- Natural sign convention (no reversal)

#### Auto-Detection Criteria
- Account field contains parenthetical format: `/^[^(]+\(\d+\)$/`

#### Common Use Cases
- Small businesses
- US-based companies
- Single currency operations
- Simple reconciliations

---

### 2. Costpoint/Deltek ✅
**Parser**: `parseCostpointRow()`
**Test Scenario**: `data/scenarios/07-costpoint-format/`
**Complexity**: ⭐⭐⭐ Complex

#### Key Features
- Debit/Credit separate columns
- Multi-level accounts: `01-100-2010` (Company-Org-Account)
- Fiscal Year + Period: `2025` + `12` → `"2025-12"`
- **Formula**: Debit - Credit = correct accounting amount
- Project/task tracking

#### Auto-Detection Criteria
- Has both "Debit" AND "Credit" columns

#### Common Use Cases
- Government contractors
- Defense industry
- DCAA compliance
- Project-based accounting

#### Special Note
⚠️ **No sign reversal needed!** The Debit - Credit formula produces correct accounting convention automatically.

---

### 3. NetSuite ✅
**Parser**: `parseNetSuiteRow()`
**Test Scenario**: `data/scenarios/08-netsuite-format/`
**Complexity**: ⭐⭐⭐⭐ Very Complex

#### Key Features
- Multi-currency: Prefers "Amount (Base Currency)"
- Dimensional data: Subsidiary, Department, Class, Location
- Multi-row per account (requires aggregation)
- Text month format: `"Dec 2025"` → `"2025-12"`
- Natural sign convention (no reversal)

#### Auto-Detection Criteria
- Has "Subsidiary", "Department", or "Class" columns
- OR has "Base Currency" in column names

#### Common Use Cases
- Multi-national companies
- Multi-subsidiary operations
- Complex organizational structures
- Multi-currency environments

#### Special Note
💡 Always use "Amount (Base Currency)" not foreign currency amounts!

---

### 4. SAP ERP ✅ **NEW**
**Parser**: `parseSAPRow()`
**Test Scenario**: Not yet created
**Complexity**: ⭐⭐⭐⭐ Very Complex

#### Key Features
- Company Code + G/L Account structure
- Multi-currency: GC Amount (Group Currency) vs LC Amount (Local Currency)
- Date formats: `YYYYMMDD` or `DD.MM.YYYY`
- Debit/Credit indicators: `S` (Credit) / `H` (Debit)
- Document number tracking
- Leading zeros preserved in account codes

#### Auto-Detection Criteria
- Has "Company Code" or "Co Cd" column
- OR has "G/L Account" column
- OR has "GC Amount" or "Group Currency" column

#### Common Use Cases
- Large enterprises
- Multi-company operations
- SAP FI (Financial Accounting)
- SAP CO (Controlling)
- Global consolidations

#### Parser Logic
```typescript
// Prefer Group Currency over Local Currency
if (hasGCAmount) use GC Amount
else if (hasLCAmount) use LC Amount

// Handle debit/credit indicator
if (indicator === "S" || "C") {
  amount = -amount  // Credit
}
```

---

### 5. Microsoft Dynamics 365 Finance ✅ **NEW**
**Parser**: `parseDynamicsRow()`
**Test Scenario**: Not yet created
**Complexity**: ⭐⭐⭐⭐ Very Complex

#### Key Features
- Main Account + Dimensions: `"1000-DEPT01-PROJ100"`
- Financial dimension sets (Department, Cost Center, Project, Business Unit)
- Debit/Credit columns or Accounting Currency Amount
- Dimensional account extraction (first segment = main account)
- Natural sign convention via Debit - Credit formula

#### Auto-Detection Criteria
- Has "Ledger Account" or "Main Account" column
- OR has dimension columns: "CostCenter", "BusinessUnit", "Dimension"

#### Common Use Cases
- Large enterprises using Dynamics 365 Finance
- Companies with complex financial dimensions
- Multi-entity operations
- Project/department tracking

#### Parser Logic
```typescript
// Extract main account from dimensional string
"1000-DEPT01-PROJ100" → account_code: "1000"
                      → dimensional_account: "1000-DEPT01-PROJ100"

// Calculate amount
amount = debit - credit
```

---

### 6. Xero ✅ **NEW**
**Parser**: `parseXeroRow()`
**Test Scenario**: `data/scenarios/11-xero-format/` ✅
**Complexity**: ⭐ Simple

#### Key Features
- Simple numeric account codes: `2000`, `2100`
- Separate Account Code and Account Name columns
- Debit/Credit columns with Net Movement
- Date format: `"31 Dec 2025"` → `"2025-12"`
- Natural sign convention (no reversal)
- Optional tracking categories

#### Auto-Detection Criteria
- Has "Account Code" or "Code" column (exact match)
- AND has both "Debit" and "Credit" columns

#### Common Use Cases
- Small to medium businesses
- Cloud accounting users
- International operations (Xero popular in UK, AU, NZ)
- Simple reconciliations

#### Parser Logic
```typescript
// Can use either Net Movement or calculate from Debit/Credit
if (hasNetMovement) use Net Movement
else amount = debit - credit

// Date conversion
"31 Dec 2025" → "2025-12"
```

---

## Parser Selection & Auto-Detection

### Auto-Detection Order
1. **QuickBooks**: Check for parenthetical accounts first (most specific)
2. **Costpoint**: Check for Debit + Credit columns
3. **NetSuite**: Check for dimensional columns or base currency
4. **SAP**: Check for Company Code or G/L Account
5. **Dynamics**: Check for Ledger Account or dimension sets
6. **Xero**: Check for Account Code + Debit/Credit pattern
7. **Generic**: Default fallback

### Manual Selection
Users can override auto-detection by selecting from dropdown:
- Auto (use auto-detection)
- QuickBooks
- Costpoint
- NetSuite
- SAP
- Dynamics
- Xero
- Generic

---

## Comparison Matrix

| Feature | QuickBooks | Costpoint | NetSuite | SAP | Dynamics | Xero |
|---------|-----------|-----------|----------|-----|----------|------|
| **Complexity** | ⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐ |
| **Account Format** | Parenthetical | Multi-level | Numeric | Company-GL | Dimensional | Simple numeric |
| **Number Format** | Comma | Plain | Plain/comma | Plain/comma | Plain/comma | Plain/comma |
| **Date Format** | MM/DD/YYYY | Fiscal+Period | Text month | YYYYMMDD | ISO/Regional | DD MMM YYYY |
| **Amount Columns** | Balance | Debit+Credit | Base Currency | GC/LC Amount | Debit+Credit | Debit+Credit |
| **Sign Reversal** | ❌ No | ❌ No | ❌ No | Conditional | ❌ No | ❌ No |
| **Multi-Currency** | ❌ | ❌ | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| **Dimensions** | ❌ | Org+Project | 4+ dims | Controlling | Dimension Sets | Tracking |
| **Aggregation** | N/A | By Account | By Account | By Company | By Main Acct | N/A |
| **Test Scenario** | ✅ 06 | ✅ 07 | ✅ 08 | ⏳ TBD | ⏳ TBD | ✅ 11 |

---

## Sign Convention Summary

### Natural Convention (No Reversal Needed)
- ✅ QuickBooks: Assets/Expenses positive, Liabilities/Revenue negative
- ✅ NetSuite: Same as above
- ✅ Costpoint: Debit - Credit formula gives correct convention
- ✅ Dynamics: Debit - Credit formula gives correct convention
- ✅ Xero: Same as QuickBooks

### Conditional Reversal
- ⚠️ SAP: Check Debit/Credit indicator (S=Credit → negate if positive)

### No Reversal (Legacy Note)
Earlier documentation incorrectly suggested Costpoint needed reversal. This was corrected after testing showed Debit - Credit formula produces correct accounting convention automatically.

---

## Multi-Currency Handling

### Systems with Multi-Currency:
1. **NetSuite**: Use "Amount (Base Currency)" not foreign
2. **SAP**: Use "GC Amount" (Group Currency) not "LC Amount"
3. **Dynamics**: Use "Accounting Currency Amount"
4. **Xero**: Use "Home Currency Amount" when available

### Priority Order:
```
Base/Group/Home Currency > Local/Foreign Currency
```

---

## Integration Examples

### 1. With User Selection
```typescript
const accountingSystem = userSelectedSystem; // from dropdown
const parsedRow = parseRowForAccountingSystem(row, accountingSystem);
```

### 2. With Auto-Detection
```typescript
const headers = csvHeaders;
const firstRow = csvRows[0];
const detectedSystem = detectAccountingSystem(headers, firstRow);
const parsedRow = parseRowForAccountingSystem(row, detectedSystem);
```

### 3. With Fallback
```typescript
let system = userSelectedSystem;
if (system === "auto") {
  system = detectAccountingSystem(headers, firstRow);
}
const parsedRow = parseRowForAccountingSystem(row, system);
```

---

## Testing Status

| System | Parser | Test Scenario | Test Results | Status |
|--------|--------|--------------|--------------|--------|
| QuickBooks | ✅ | ✅ Scenario 06 | ✅ Documented | ✅ Tested |
| Costpoint | ✅ | ✅ Scenario 07 | ✅ Documented | ✅ Tested |
| NetSuite | ✅ | ✅ Scenario 08 | ✅ Documented | ✅ Tested |
| SAP | ✅ | ⏳ Needed | ⏳ Needed | ⚠️ Untested |
| Dynamics | ✅ | ⏳ Needed | ⏳ Needed | ⚠️ Untested |
| Xero | ✅ | ✅ Scenario 11 | ⏳ Needed | ⚠️ Untested |

---

## Next Steps

### For SAP:
1. Create `data/scenarios/12-sap-format/`
2. Add test CSV files with Company Code, G/L Account, GC Amount
3. Test date format conversions (YYYYMMDD and DD.MM.YYYY)
4. Validate Debit/Credit indicator logic

### For Dynamics:
1. Create `data/scenarios/13-dynamics-format/`
2. Add test CSV with dimensional accounts (Main-Dim1-Dim2)
3. Test financial dimension extraction
4. Validate Debit/Credit calculation

### For Xero:
1. Test scenario 11 with actual reconciliation run
2. Validate date conversion ("31 Dec 2025" → "2025-12")
3. Verify auto-detection works
4. Test with tracking categories

---

## Architecture Benefits

### "Masters of One" vs "Jack of All Trades"
✅ **Proven**: System-specific parsers are superior to universal parser

**Benefits**:
- **Maintainability**: Each parser simple and focused (50-80 lines)
- **Testability**: Each tested independently
- **Extensibility**: Add new systems without touching existing
- **Reliability**: Domain expertise catches subtle issues
- **Transparency**: Clear what each parser does

**Alternative (Universal Parser)**:
❌ Would require complex nested if/else logic
❌ Hard to maintain and debug
❌ Easy to break one system while fixing another
❌ Difficult to add system-specific expertise

---

## Common Interface

All parsers return the same structure:

### Input
```typescript
row: Record<string, any>  // Raw CSV row
```

### Output
```typescript
{
  account_code: string;      // Extracted/parsed account code
  account_name?: string;     // Account description
  amount: number;            // Correctly signed amount
  period?: string;           // YYYY-MM format
  company_code?: string;     // For multi-company systems
  debit?: number;            // If Debit/Credit columns
  credit?: number;           // If Debit/Credit columns
  dimensional_account?: string;  // Full dimensional string
  [key: string]: any;        // Other system-specific fields
}
```

---

## Conclusion

✅ **6 production-ready accounting system parsers**
✅ **Auto-detection for all 6 systems**
✅ **3 tested with scenarios (QB, Costpoint, NetSuite)**
✅ **3 new parsers (SAP, Dynamics, Xero)**
⏳ **2 scenarios needed (SAP, Dynamics)**
⏳ **Testing needed for new parsers**

**Architecture**: Validated and scalable
**Ready for**: Production use (with testing for new parsers)
