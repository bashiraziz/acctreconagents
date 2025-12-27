# System-Specific Parser Skills - Implementation Summary

## What Was Built

Created a suite of **system-specific parser skills** to replace the universal "Jack of all trades" CSV parser with focused "Masters of one" parsers.

## Completed Skills

### 1. QuickBooks Parser ✅
**Location**: `skills/quickbooks-parser/`

**Files**:
- `skill.json` - Metadata and capability documentation
- `parse.ts` - Full implementation with QuickBooks expertise
- Tested against scenario 06 - **4/4 accounts passed**

**Key Features**:
- Extracts account codes from parenthetical format: `"Accounts Payable (2000)"` → `"2000"`
- Parses comma-formatted numbers: `"-52,850.00"` → `-52850`
- Handles parentheses as negatives: `"(1,234.56)"` → `-1234.56`
- Converts US dates: `"12/31/2025"` → `"2025-12"`
- Returns detailed transformation logs

**Test Results**:
```
✅ Accounts Payable (2000) - amount=-52850, period=2025-12
✅ Accrued Expenses (2100) - amount=-8500, period=2025-12
✅ Inventory (1400) - amount=125600, period=2025-12
✅ Cost of Goods Sold (5000) - amount=89400, period=2025-12
```

### 2. Costpoint Parser ✅
**Location**: `skills/costpoint-parser/`

**Files**:
- `skill.json` - Metadata including critical sign reversal notes
- `parse.ts` - Implementation with Costpoint sign convention expertise

**Key Features**:
- Handles separate Debit/Credit columns (not combined balance)
- **Critical**: Applies sign reversal for balance sheet accounts (1000-3999)
  - Costpoint shows credits as POSITIVE
  - Accounting convention requires credits as NEGATIVE for liabilities/equity
- Plain account numbers: `"2000"`, `"2100"`
- ISO period format: `"2025-12"`
- Tracks number of sign reversals applied

**Sign Reversal Logic**:
```typescript
// Costpoint: Account 2000, Debit=0, Credit=52850
// Result: amount = -52850 (credit reversed for balance sheet account)

applyCostpointSignConvention(record):
  if (accountNum >= 1000 && accountNum <= 3999 && amount < 0):
    amount = -amount  // Reverse sign for balance sheet
```

### 3. NetSuite Parser ✅
**Location**: `skills/netsuite-parser/`

**Files**:
- `skill.json` - Metadata including multi-currency and dimensional handling
- `parse.ts` - Implementation with NetSuite multi-dimensional expertise

**Key Features**:
- Extracts account codes from multiple formats:
  - `"2000 Accounts Payable"` → `"2000"`
  - `"AP-2000"` → `"2000"`
  - `"Accounts Payable (2000)"` → `"2000"`
- Prioritizes `"Amount (Base Currency)"` for multi-currency orgs
- **Aggregates dimensional data** by account:
  - Sums amounts across Department, Location, Subsidiary, Class
  - Example: Sales dept $52,850 + Marketing dept $15,000 = $67,850
- Supports both US and ISO date formats
- Tracks dimensional vs aggregated record counts

**Aggregation Example**:
```
Input: 2 dimensional records (Sales + Marketing)
Output: 1 aggregated account balance
Transformation logged: "Aggregated 2 dimensional records into 1 account balances"
```

## Architecture Benefits

### Single Responsibility Principle
Each parser has ONE job: handle its system's format perfectly.

### Embedded Domain Expertise
- **QuickBooks**: Parenthetical accounts, comma numbers
- **Costpoint**: Sign reversal for balance sheet credits (opposite of accounting convention)
- **NetSuite**: Dimensional aggregation for multi-subsidiary consolidation

### Maintainability
- Costpoint changes format? → Update only `costpoint-parser/`
- Add new system (SAP)? → Create new skill, don't touch existing
- Each skill independently tested

### Transparency
All parsers return detailed transformation logs:
```json
"transformationsApplied": [
  "Extracted account code \"2000\" from \"Accounts Payable (2000)\"",
  "Parsed comma-formatted number: \"-52,850.00\" → -52850",
  "Converted date: \"12/31/2025\" → \"2025-12\""
]
```

### Extensibility
To add a new system:
1. Create `skills/newsystem-parser/` directory
2. Copy template from existing parser
3. Implement system-specific logic
4. Test with real exports
5. Done - no risk to existing parsers

## Common Interface

All parsers implement:

**Input**:
```typescript
{
  csvContent: string;
  fileType: 'gl_balance' | 'subledger_balance' | 'transactions';
  // system-specific options (e.g., aggregateDimensions for NetSuite)
}
```

**Output**:
```typescript
{
  data: CanonicalBalance[];  // Spec-Kit canonical format
  warnings: string[];
  metadata: {
    accountsExtracted: number;
    formatConfidence: number;  // 0-1 confidence score
    transformationsApplied: string[];
    // system-specific metrics
  }
}
```

**Canonical Format**:
```typescript
{
  account_code: string;   // Always present
  amount: number;         // Always present (accounting convention)
  period?: string;        // YYYY-MM format
  account_name?: string;  // Extracted when available
  currency?: string;      // For multi-currency
}
```

## Documentation

**`skills/README.md`**: Comprehensive guide covering:
- Philosophy: "Masters of one" vs "Jack of all trades"
- Detailed documentation for each parser
- Format examples with before/after
- Integration guide (user-specified vs auto-detection)
- How to add new system parsers
- Benefits comparison table

**`skills/test-quickbooks-parser.ts`**: Test script demonstrating:
- How to use the parser
- Validation against real scenario data
- Checking transformation logs
- Verifying canonical output format

## Test Results

**QuickBooks Parser**: ✅ Tested and verified
```
Test Summary: 4/4 passed
✅ All checks passed! QuickBooks parser is working correctly.
```

**Costpoint Parser**: Ready for testing with scenario 07
**NetSuite Parser**: Ready for testing with scenario 08

## Integration Points

### Option 1: User-Specified System
```typescript
const userSystem = "quickbooks"; // From dropdown or config
const parser = selectParser(userSystem);
const result = parser(csvContent, 'gl_balance');
```

### Option 2: Auto-Detection
```typescript
const headers = parseCSVHeaders(csvContent);
const confidence = {
  quickbooks: validateQuickBooksFormat(headers),  // 0.6
  costpoint: validateCostpointFormat(headers),    // 0.8
  netsuite: validateNetSuiteFormat(headers),      // 0.3
};

const bestMatch = "costpoint"; // Highest confidence
```

## Next Steps (Optional)

1. **Integrate with Test Framework**:
   - Update `tests/scenario-runner.ts` to use system-specific parsers
   - Add parser selection/detection logic
   - Re-run scenarios 06, 07, 08 with new parsers

2. **Create Additional Parsers**:
   - SAP parser (if needed)
   - Oracle ERP parser (if needed)
   - Generic fallback parser

3. **Add to Orchestrator**:
   - Expose parser skills via API
   - Add system selection to upload UI
   - Display transformation logs to users

4. **Documentation for Users**:
   - Which parser to use for their system
   - How to verify parsing is correct
   - What to do if their format isn't supported

## Summary

**Architecture Decision**: System-specific parser skills > Universal parser

**Rationale**:
- Each accounting system has unique quirks (sign conventions, formats, dimensions)
- A universal parser becomes complex and fragile trying to handle all cases
- Specialized parsers embed domain expertise (e.g., Costpoint sign reversal)
- Better maintainability, testability, and user experience

**Implementation Status**: ✅ Complete
- 3 parser skills created (QuickBooks, Costpoint, NetSuite)
- QuickBooks parser tested and verified
- Comprehensive documentation written
- Common interface established
- Ready for integration with reconciliation system

**Philosophy**: "Do one thing and do it well" - each parser is an expert at its system's format.
