# Accounting System Parser Skills

This directory contains system-specific CSV parser skills for different accounting systems. Each skill is an expert at parsing that system's export format and converting to canonical Spec-Kit format.

## Architecture Philosophy

**Problem**: A universal "Jack of all trades" CSV parser becomes complex, fragile, and difficult to maintain when trying to handle every accounting system's unique format.

**Solution**: System-specific parser skills that are "Masters of one" - each skill deeply understands one accounting system's quirks and conventions.

## Available Parser Skills

### 1. QuickBooks Parser (`quickbooks-parser/`)

**Format Expertise**:
- **Account Format**: Parenthetical format `"Accounts Payable (2000)"` → extracts `"2000"`
- **Numbers**: Comma-formatted `"-52,850.00"` → parses to `-52850`
- **Negative Convention**: Parentheses `"(1,234.56)"` → `-1234.56`
- **Dates**: US format `"12/31/2025"` → converts to `"2025-12"`
- **Headers**: Natural language like `"Account"`, `"Balance"`, `"As of"`

**Usage**:
```typescript
import { parseQuickBooks } from './skills/quickbooks-parser/parse';

const result = parseQuickBooks(csvContent, 'gl_balance');

console.log(result.data); // Canonical format
console.log(result.metadata.transformationsApplied); // What was converted
```

**Output**:
```json
{
  "data": [
    {
      "account_code": "2000",
      "account_name": "Accounts Payable",
      "amount": -52850,
      "period": "2025-12"
    }
  ],
  "warnings": [],
  "metadata": {
    "accountsExtracted": 1,
    "formatConfidence": 0.8,
    "transformationsApplied": [
      "Extracted account code \"2000\" from \"Accounts Payable (2000)\"",
      "Parsed comma-formatted number: \"-52,850.00\" → -52850",
      "Converted date: \"12/31/2025\" → \"2025-12\""
    ]
  }
}
```

### 2. Costpoint Parser (`costpoint-parser/`)

**Format Expertise**:
- **Account Format**: Plain numeric `"2000"`, `"2100"`
- **Amount Columns**: Separate `Debit` and `Credit` columns (NOT combined balance)
- **Sign Convention**: ⚠️ **CRITICAL** - Costpoint shows credits as POSITIVE
  - Balance sheet accounts (1000-3999): Credit balances must be negated
  - Revenue/Expense (4000+): Credits stay positive
- **Dates**: ISO format `"2025-12"` or `"2025-12-31"`
- **Headers**: Technical like `"Account Number"`, `"Debit"`, `"Credit"`, `"Period"`

**Usage**:
```typescript
import { parseCostpoint } from './skills/costpoint-parser/parse';

const result = parseCostpoint(csvContent, 'gl_balance');

console.log(result.metadata.signReversals); // How many accounts had sign reversed
```

**Sign Reversal Example**:
```
Input CSV:
Account Number,Account Name,Debit,Credit,Period
2000,Accounts Payable,0,52850,2025-12

Output:
{
  "account_code": "2000",
  "amount": -52850,  // Credit reversed for liability account
  "period": "2025-12"
}

Transformation logged:
"Applied Costpoint sign reversal for balance sheet account 2000:
 Debit 0 - Credit 52850 → -52850 (credit balance shown as negative)"
```

### 3. NetSuite Parser (`netsuite-parser/`)

**Format Expertise**:
- **Account Format**: Multiple patterns:
  - `"2000 Accounts Payable"` → extracts `"2000"`
  - `"AP-2000"` → extracts `"2000"`
  - `"Accounts Payable (2000)"` → extracts `"2000"`
  - Plain `"2000"` → uses as-is
- **Multi-Currency**: Prioritizes `"Amount (Base Currency)"` column for consolidated reporting
- **Dimensional Data**: Aggregates across Department, Location, Subsidiary, Class
- **Dates**: Both US `"12/31/2025"` and ISO `"2025-12-31"` formats
- **Headers**: Can include `"Account"`, `"Amount (Base Currency)"`, `"Department"`, `"Period"`

**Usage**:
```typescript
import { parseNetSuite } from './skills/netsuite-parser/parse';

const result = parseNetSuite(csvContent, 'gl_balance', true); // aggregate=true

console.log(result.metadata.dimensionalRecords); // How many dimensional records
console.log(result.metadata.aggregatedRecords); // How many accounts after aggregation
```

**Dimensional Aggregation Example**:
```
Input CSV:
Account,Account Name,Department,Amount (Base Currency),Period
2000,Accounts Payable,Sales,52850.00,12/31/2025
2000,Accounts Payable,Marketing,15000.00,12/31/2025

Output (with aggregateDimensions=true):
{
  "data": [
    {
      "account_code": "2000",
      "account_name": "Accounts Payable",
      "amount": 67850,  // Sum of Sales + Marketing
      "period": "2025-12"
    }
  ],
  "metadata": {
    "dimensionalRecords": 2,
    "aggregatedRecords": 1
  }
}

Transformation logged:
"Aggregated 2 dimensional records into 1 account balances"
```

## Common Interface

All parser skills implement a consistent interface:

### Input
```typescript
{
  csvContent: string;           // Raw CSV content
  fileType: 'gl_balance'        // Type of report
    | 'subledger_balance'
    | 'transactions';
  // ... system-specific options
}
```

### Output
```typescript
{
  data: CanonicalBalance[];     // Parsed records in Spec-Kit format
  warnings: string[];           // Non-fatal issues detected
  metadata: {
    accountsExtracted: number;  // Count of accounts parsed
    formatConfidence: number;   // 0-1 score for format detection
    transformationsApplied: string[]; // Detailed log of conversions
    // ... system-specific metrics
  };
}
```

### Canonical Output Format
```typescript
interface CanonicalBalance {
  account_code: string;   // Always present
  amount: number;         // Always present (accounting convention: liabilities negative)
  period?: string;        // YYYY-MM format
  account_name?: string;  // Extracted when available
  currency?: string;      // For multi-currency systems
  [key: string]: any;     // Other fields preserved
}
```

## Benefits of System-Specific Skills

### 1. Single Responsibility
Each skill has ONE job: parse its system's format perfectly.

### 2. Embedded Domain Expertise
- QuickBooks skill "knows" about parenthetical account codes
- Costpoint skill "knows" about sign reversal rules for balance sheet accounts
- NetSuite skill "knows" about dimensional aggregation for multi-subsidiary orgs

### 3. Better User Experience
User explicitly selects their accounting system:
```typescript
const parser = selectParser(userSelectedSystem);
// OR
const parser = detectParser(csvHeaders); // Auto-detect with confidence score
```

### 4. Maintainability
- Costpoint changes their format? Update only `costpoint-parser/`
- Add new system (SAP, Oracle)? Create new skill without touching existing ones
- Each skill can be tested independently

### 5. Transparency
Each skill returns detailed transformation logs:
```json
"transformationsApplied": [
  "Extracted account code \"2000\" from \"Accounts Payable (2000)\"",
  "Applied Costpoint sign reversal for balance sheet account 2000",
  "Aggregated 2 dimensional records into 1 account balance"
]
```

Users see exactly what happened to their data.

## How to Add a New System Parser

1. **Create skill directory**: `skills/mysystem-parser/`

2. **Create `skill.json`** with metadata:
```json
{
  "name": "mysystem-parser",
  "description": "Parse MySystem CSV exports",
  "capabilities": ["..."],
  "systemSpecifics": {
    "accountFormat": "...",
    "numberFormat": "...",
    "signConvention": "...",
    "criticalNotes": ["..."]
  },
  "examples": [...]
}
```

3. **Create `parse.ts`** with implementation:
```typescript
export function parseMySystem(
  csvContent: string,
  fileType: 'gl_balance' | 'subledger_balance' | 'transactions'
): MySystemParseResult {
  // Implement parsing logic with system-specific expertise
}

export default function main(args) {
  // CLI interface
}
```

4. **Test with real exports** from MySystem

5. **Document quirks** in skill.json's `criticalNotes`

## Integration with Reconciliation System

### Option 1: User-Specified Parser
```typescript
// In orchestrator or upload UI
const userSystem = "quickbooks"; // User selects from dropdown

const parser = {
  "quickbooks": parseQuickBooks,
  "costpoint": parseCostpoint,
  "netsuite": parseNetSuite,
}[userSystem];

const result = parser(csvContent, 'gl_balance');
```

### Option 2: Auto-Detection
```typescript
// Parse headers and run format confidence checks
const scores = {
  quickbooks: validateQuickBooksFormat(headers),
  costpoint: validateCostpointFormat(headers),
  netsuite: validateNetSuiteFormat(headers),
};

const bestMatch = Object.entries(scores)
  .sort((a, b) => b[1] - a[1])[0];

if (bestMatch[1] >= 0.7) {
  console.log(`Detected ${bestMatch[0]} format with ${bestMatch[1] * 100}% confidence`);
  // Use detected parser
} else {
  // Ask user to specify system
}
```

## Testing with Scenarios

The test scenarios in `data/scenarios/` use these skills:
- **Scenario 06**: QuickBooks format
- **Scenario 07**: Costpoint format
- **Scenario 08**: NetSuite format

Run tests:
```bash
npm run test:scenarios -- --scenario=06-quickbooks
npm run test:scenarios -- --scenario=07-costpoint
npm run test:scenarios -- --scenario=08-netsuite
```

## Summary

**Before** (Universal Parser):
- ❌ Complex if/else chains trying to handle all formats
- ❌ Fragile - change breaks multiple systems
- ❌ Hard to test - need data from all systems
- ❌ Poor error messages - "parsing failed" doesn't help
- ❌ No transparency - user doesn't know what happened to their data

**After** (System-Specific Skills):
- ✅ Each skill is simple and focused
- ✅ Change isolation - Costpoint changes don't affect QuickBooks
- ✅ Easy to test - one system per skill
- ✅ Great error messages - "Expected QuickBooks format with Account (Code) pattern"
- ✅ Full transparency - detailed transformation logs
- ✅ Extensible - add new systems without risk
- ✅ Domain expertise embedded - sign reversals, aggregation rules, etc.

**Architecture Principle**: Prefer composition of specialized skills over monolithic universal parsers.
