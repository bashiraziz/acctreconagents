# Accounting System Format Guide

## Overview
This guide documents the unique characteristics and quirks of different accounting system exports. Use these test scenarios to validate Rowshni's ability to handle real-world data from various ERP systems.

---

## Quick Reference: Format Differences

| Feature | QuickBooks | Costpoint | NetSuite |
|---------|-----------|-----------|----------|
| **Account Format** | "Name (Code)" | Multi-level hierarchy | Numeric code |
| **Sign Convention** | Natural | Positive credits (reverse needed) | Natural (correct) |
| **Currency** | Single | USD only (typically) | Multi-currency native |
| **Dimensions** | None | Org + Project/Task | Subsidiary + Dept + Class |
| **Date Format** | MM/DD/YYYY | Fiscal Year + Period | Text months ("Dec 2025") |
| **Number Format** | Commas + decimals | Decimals only | Commas + decimals |
| **Debit/Credit** | Net only | Separate columns | Net only |
| **Complexity** | ⭐ Simple | ⭐⭐⭐ Complex | ⭐⭐⭐⭐ Very Complex |

---

## Scenario 06: QuickBooks Format

**File**: `data/scenarios/06-quickbooks-format/`

### Key Characteristics
- **Account extraction**: Must parse `"Accounts Payable (2000)"` to get code `2000`
- **Natural language headers**: "Open Balance", "As of", "Num"
- **Comma-formatted numbers**: `"-52,850.00"`
- **US date format**: `12/31/2025`
- **Simple structure**: One account = one row

### What This Tests
✅ Regex account code extraction from text
✅ Comma number parsing
✅ Date format conversion
✅ Natural language column mapping

### Best For
- Small businesses
- Simple reconciliations
- Single currency
- US-based companies

### Common Issues
- Account format inconsistency (sometimes just numbers)
- Memo fields with extra data
- Subtotals in detail reports

---

## Scenario 07: Costpoint Format

**File**: `data/scenarios/07-costpoint-format/`

### Key Characteristics
- **Multi-level accounts**: Company-Org-Account (01-100-6210)
- **Debit/Credit columns**: Separate instead of net
- **CRITICAL**: Credits shown as positive Net_Balance → **MUST use sign reversal**
- **Project/Task tracking**: Every transaction tagged
- **Government compliance**: DCAA audit trail fields

### What This Tests
✅ **Sign reversal requirement** (most important!)
✅ Debit/Credit column handling
✅ Multi-level account structure
✅ Project dimension handling
✅ Fiscal period concatenation

### Best For
- Government contractors
- Defense industry
- Companies needing DCAA compliance
- Project-based accounting

### Common Issues
- **Forgetting sign reversal** (biggest gotcha!)
- Org-level duplication
- Period 13 adjustments
- Burden allocation complexity

### Sign Convention Alert
```
Costpoint GL Export:
Account 2010 (AP Liability)
  Debit: 0.00
  Credit: 156,890.75
  Net_Balance: 156,890.75 ← Shown as POSITIVE!

Must check "Reverse signs" to get: -156,890.75 ✅
```

---

## Scenario 08: NetSuite Format

**File**: `data/scenarios/08-netsuite-format/`

### Key Characteristics
- **Multi-dimensional**: Subsidiary + Department + Class + Location
- **Multi-currency**: Foreign currency + Base currency columns
- **Same account, multiple rows**: Different subsidiaries/departments
- **Text period format**: "Dec 2025" not "2025-12"
- **Internal IDs**: Unique transaction identifiers
- **Saved search exports**: Custom column names

### What This Tests
✅ **Multi-row aggregation** for same account
✅ Multi-currency base currency selection
✅ Dimensional column handling
✅ Text month conversion
✅ Internal ID field ignoring
✅ No sign reversal (NetSuite is correct)

### Best For
- Multi-national companies
- Multi-subsidiary businesses
- Complex organizational structures
- Multi-currency operations

### Common Issues
- Using foreign currency instead of base currency
- Not aggregating multiple rows per account
- Dimensional explosion (too many rows)
- Custom field overload
- Intercompany eliminations

### Multi-Currency Alert
```
NetSuite GL Export:
Account 2000 - UK Operations
  Amount (Foreign Currency): -15,600.00 GBP
  Amount (Base Currency): -19,812.00 USD ← Use this!

Always map "Amount (Base Currency)" column.
```

---

## Testing Workflow

### 1. Choose Your System
Pick the scenario that matches your accounting system:
- Small business → QuickBooks
- Government contractor → Costpoint
- Enterprise/Multi-national → NetSuite

### 2. Upload Files
Upload the GL balance and subledger files from the scenario folder.

### 3. Apply System-Specific Settings

**QuickBooks:**
- Map "Account" → Extract code with regex
- Map "Open Balance" → amount
- Map "As of" → period (or use metadata)
- Reverse signs: ❌ No

**Costpoint:**
- Map "Account" → account_code
- Map "Credit" → amount (for liabilities)
- Map "Fiscal_Year" + "Period" → period
- Reverse signs: ✅ **YES** (critical!)

**NetSuite:**
- Map "Account Number" → account_code
- Map "Amount (Base Currency)" → amount
- Convert "Dec 2025" → "2025-12"
- Reverse signs: ❌ No

### 4. Run Reconciliation
All three scenarios should reconcile cleanly (zero variances).

### 5. Validate Agent Behavior
Check that AI agents:
- Correctly identify the system format
- Handle sign conventions properly
- Aggregate multi-row GL entries (NetSuite)
- Don't recommend automation

---

## Format Comparison Tables

### Account Code Formats

| System | Example | Pattern |
|--------|---------|---------|
| QuickBooks | `"Accounts Payable (2000)"` | Name (Code) |
| Costpoint | `01-100-2010` | Company-Org-Account |
| NetSuite | `2000` | Simple numeric |

### Sign Conventions

| System | Assets | Liabilities | Reversal Needed? |
|--------|--------|-------------|------------------|
| QuickBooks | Positive | Negative | ❌ No |
| Costpoint | Positive | **Positive** | ✅ **YES** |
| NetSuite | Positive | Negative | ❌ No |

### Period Formats

| System | Format | Example | Conversion |
|--------|--------|---------|------------|
| QuickBooks | US Date | `12/31/2025` | → `2025-12` |
| Costpoint | Fiscal Year + Period | `2025` + `12` | Concatenate |
| NetSuite | Text Month | `Dec 2025` | Convert to `2025-12` |

### Currency Handling

| System | Capability | Column Names |
|--------|-----------|--------------|
| QuickBooks | Single currency | `Balance` |
| Costpoint | Single (typically USD) | `Debit`, `Credit` |
| NetSuite | Multi-currency native | `Amount (Foreign Currency)`, `Amount (Base Currency)` |

---

## Common Pitfalls by System

### QuickBooks
1. ❌ Forgetting to extract account code from parentheses
2. ❌ Not handling comma-formatted numbers
3. ❌ Mapping memo fields as account codes

### Costpoint
1. ❌ **Not checking "Reverse signs"** (accounts won't reconcile!)
2. ❌ Using Net_Balance without sign reversal
3. ❌ Not handling multi-level account structure
4. ❌ Treating different orgs as same account

### NetSuite
1. ❌ **Mapping foreign currency instead of base currency** (wrong totals!)
2. ❌ Not aggregating multiple GL rows for same account
3. ❌ Applying sign reversal when not needed
4. ❌ Getting confused by dimensional columns

---

## Validation Checklist

### Before Uploading
- [ ] Identify which accounting system the data came from
- [ ] Review the system-specific README
- [ ] Check if sign reversal is needed
- [ ] Identify the correct amount column (especially for multi-currency)

### During Column Mapping
- [ ] Map account code correctly (may need extraction)
- [ ] Map amount column (not foreign currency for NetSuite)
- [ ] Set period via mapping or metadata
- [ ] Set currency via metadata
- [ ] Check/uncheck "Reverse signs" as needed

### After Reconciliation
- [ ] All accounts show variance = 0
- [ ] Signs are correct (liabilities should be negative)
- [ ] Totals match between GL and subledger
- [ ] Agent report acknowledges system format
- [ ] No automation recommendations in report

---

## Advanced Testing

### Mix and Match
Try uploading:
- QuickBooks GL + NetSuite subledger (different formats)
- Costpoint GL with sign reversal + QuickBooks subledger without

### Edge Cases
- Upload files with missing columns (use metadata)
- Upload multi-currency NetSuite without base currency column
- Upload Costpoint with only Net_Balance column

### Error Scenarios
- Forget to check "Reverse signs" for Costpoint (should show large variances)
- Map foreign currency column in NetSuite (totals won't match)
- Don't extract account code from QuickBooks format (mapping will fail)

---

## Next Steps

### More System Formats Needed?
- SAP (complex, multi-company, controlling area)
- Dynamics 365 Finance (dimension sets, financial tags)
- Oracle Financials (segment-based COA, ledger sets)
- Sage Intacct (location entities, dimensional approach)
- Workday Financials (worktags, custom objects)

### Enhancement Ideas
- Auto-detect system format from column headers
- Suggest sign reversal if pattern detected
- Warn when foreign currency mapped instead of base
- Auto-extract account codes from text patterns
- Template library for each system format

---

**Remember**: The complexity isn't in Rowshni - it's in the wild variety of accounting system export formats. These scenarios help ensure Rowshni handles real-world data correctly!
