# Accounting System Parser Plugin Architecture

This directory contains the parser plugin system for handling CSV files from different accounting systems.

## Architecture Overview

The parser plugin system uses an **abstract base class** pattern with a **registry** for managing parsers. This makes it easy to:

- Add new accounting systems without modifying existing code
- Test parsers in isolation
- Auto-detect accounting systems from CSV structure
- Maintain consistent parsing behavior across systems

## File Structure

```
parsers/
├── base-parser.ts           # Abstract base class + registry
├── quickbooks-parser.ts     # QuickBooks plugin
├── costpoint-parser.ts      # Costpoint/Deltek plugin
├── netsuite-parser.ts       # NetSuite/Oracle plugin
├── sap-parser.ts            # SAP ERP plugin
├── dynamics-parser.ts       # Dynamics 365 plugin
├── xero-parser.ts           # Xero plugin
├── generic-parser.ts        # Generic/fallback plugin
└── README.md                # This file
```

## How It Works

### 1. Base Parser Class

All parsers extend `BaseAccountingParser`:

```typescript
export abstract class BaseAccountingParser {
  abstract readonly name: AccountingSystem;
  abstract readonly displayName: string;
  abstract readonly description: string;

  abstract detect(headers: string[], firstRow: RawCSVRow): DetectionResult;
  abstract parseRow(row: RawCSVRow): ParsedCSVRow;

  // Helper methods available to all parsers:
  protected extractNumber(value: CSVValue): number | undefined;
  protected parseDate(value: CSVValue, format?: string): string | undefined;
  protected extractAccountCode(value: CSVValue): string | undefined;
  protected hasHeaders(headers: string[], keywords: string[]): boolean;
  protected findHeader(headers: string[], keywords: string[]): string | undefined;
}
```

### 2. Parser Registry

The global `parserRegistry` manages all registered parsers:

```typescript
export class ParserRegistry {
  register(parser: BaseAccountingParser): void;
  get(name: AccountingSystem): BaseAccountingParser | undefined;
  getAll(): BaseAccountingParser[];
  detect(headers: string[], firstRow: RawCSVRow): { parser, confidence, reason } | null;
}
```

### 3. Auto-Registration

Parsers are automatically registered when the module loads:

```typescript
// In accountingSystemParsers.ts
parserRegistry.register(new QuickBooksParser());
parserRegistry.register(new CostpointParser());
// ... etc
```

## Adding a New Parser

### Step 1: Create Parser File

Create a new file: `parsers/your-system-parser.ts`

```typescript
import { BaseAccountingParser, type DetectionResult } from "./base-parser";
import type { RawCSVRow, ParsedCSVRow } from "@/types/csv";
import type { AccountingSystem } from "@/types/reconciliation";

export class YourSystemParser extends BaseAccountingParser {
  readonly name: AccountingSystem = "yoursystem";
  readonly displayName = "Your System Name";
  readonly description = "Description of your system";

  /**
   * Detect if CSV is from your system
   * Return confidence 0-1 (1 = very confident)
   */
  detect(headers: string[], firstRow: RawCSVRow): DetectionResult {
    // Check for distinctive columns or patterns
    const hasSpecialColumn = this.hasHeaders(headers, ["special_column"]);

    if (hasSpecialColumn) {
      return {
        confidence: 0.9,
        reason: "Special column detected"
      };
    }

    return { confidence: 0 };
  }

  /**
   * Parse a row from your system's CSV format
   */
  parseRow(row: RawCSVRow): ParsedCSVRow {
    const parsed: ParsedCSVRow = { ...row };

    for (const [key, value] of Object.entries(row)) {
      const keyLower = key.toLowerCase();

      // Use helper methods:
      if (keyLower.includes("account")) {
        parsed.account_code = this.extractAccountCode(value);
      }

      if (keyLower.includes("amount")) {
        parsed.amount = this.extractNumber(value);
      }

      if (keyLower.includes("date")) {
        parsed.period = this.parseDate(value);
      }
    }

    return parsed;
  }
}
```

### Step 2: Register Parser

Add to `accountingSystemParsers.ts`:

```typescript
import { YourSystemParser } from "./parsers/yoursystem-parser";

// Register it
parserRegistry.register(new YourSystemParser());
```

### Step 3: Update Type Definition

Add to `types/reconciliation.ts`:

```typescript
export type AccountingSystem =
  | "auto"
  | "generic"
  | "quickbooks"
  // ... existing systems
  | "yoursystem"  // Add this
```

That's it! Your parser is now integrated.

## Helper Methods

The base class provides several helper methods:

### `extractNumber(value)`

Extracts numeric values from various formats:

```typescript
this.extractNumber("1,234.56")      // 1234.56
this.extractNumber("(500.00)")      // -500
this.extractNumber("$1,000")        // 1000
this.extractNumber("N/A")           // undefined
```

### `parseDate(value, format?)`

Parses dates to YYYY-MM format:

```typescript
this.parseDate("12/31/2025", "US")  // "2025-12"
this.parseDate("2025-12-31")        // "2025-12"
this.parseDate("31-Dec-2025")       // "2025-12"
this.parseDate("20251231")          // "2025-12"
```

### `extractAccountCode(value)`

Extracts account codes from various formats:

```typescript
this.extractAccountCode("Cash (1000)")       // "1000"
this.extractAccountCode("1000-01-001")      // "1000"
this.extractAccountCode("1000")             // "1000"
```

### `hasHeaders(headers, keywords)`

Check if any keyword exists in headers (case-insensitive):

```typescript
this.hasHeaders(["Account", "Amount"], ["account", "balance"])  // true
```

### `findHeader(headers, keywords)`

Find first matching header:

```typescript
this.findHeader(["GL Account", "Amount"], ["account"])  // "GL Account"
```

## Detection Algorithm

When auto-detecting the accounting system:

1. All parsers run their `detect()` method
2. Parser with **highest confidence score** is selected
3. Must have confidence > 0.5 to be used
4. Falls back to `generic` parser if no match

### Confidence Guidelines

- **0.95**: Very distinctive pattern (e.g., QuickBooks parenthetical codes)
- **0.9**: Multiple distinctive columns (e.g., SAP Company Code + GL Account)
- **0.7**: Some distinctive columns (e.g., NetSuite dimensional data)
- **0.5**: Minimal match (threshold for acceptance)
- **0.1**: Fallback parser (generic)

## Best Practices

### 1. Detection Strategy

- Look for **multiple** distinctive patterns
- Check both headers **and** data format
- Use specific column names (e.g., "G/L Account" for SAP)
- Avoid generic patterns that match multiple systems

### 2. Parsing Strategy

- Use helper methods instead of reimplementing
- Handle both uppercase and lowercase column names
- Support multiple column name variations
- Preserve original row data with `{ ...row }`

### 3. Error Handling

- Return `undefined` from helpers on invalid input
- Don't throw errors - fail gracefully
- Validate types before operations

### 4. Testing

Test with:
- Typical CSV structure
- Edge cases (empty values, special characters)
- Multiple date/number formats
- Different column name variations

## Backward Compatibility

The old API is still supported but deprecated:

```typescript
// Old (deprecated)
parseQuickBooksRow(row)

// New (recommended)
parseRowForAccountingSystem(row, "quickbooks")
```

## Current Parsers

| Parser | System | Key Patterns |
|--------|--------|-------------|
| QuickBooks | QB Online/Desktop | Parenthetical account codes: "Cash (1000)" |
| Costpoint | Deltek Costpoint | Debit + Credit columns |
| NetSuite | Oracle NetSuite | Subsidiary, Department, Base Currency |
| SAP | SAP ECC/S/4HANA | Company Code, G/L Account, GC Amount |
| Dynamics | MS Dynamics 365 | Ledger Account, Financial Dimensions |
| Xero | Xero | Account Code + Debit/Credit |
| Generic | Any system | Fallback parser |

## Examples

### Example 1: QuickBooks Detection

**CSV Headers:**
```
Account, Amount, Date
```

**First Row:**
```
"Accounts Payable (2000)", "-52,850.00", "12/31/2025"
```

**Detection:** ✅ Confidence 0.95 (parenthetical code detected)

**Parsed Output:**
```typescript
{
  account_code: "2000",
  account_name: "Accounts Payable",
  amount: -52850,
  period: "2025-12",
  ...originalRow
}
```

### Example 2: SAP Detection

**CSV Headers:**
```
Company Code, G/L Account, GC Amount, Posting Date
```

**First Row:**
```
"1000", "100000", "1,234,567.89", "20251231"
```

**Detection:** ✅ Confidence 0.95 (SAP-specific columns)

**Parsed Output:**
```typescript
{
  company_code: "1000",
  account_code: "100000",
  amount: 1234567.89,
  period: "2025-12",
  ...originalRow
}
```

## Extending Functionality

### Add Custom Helper Method

To add a new helper method available to all parsers:

1. Add to `BaseAccountingParser` class in `base-parser.ts`
2. Mark as `protected` so subclasses can use it
3. Document with JSDoc comments

```typescript
/**
 * Extract entity code from value
 */
protected extractEntityCode(value: CSVValue): string | undefined {
  // Implementation
}
```

### Add Parser-Specific Logic

For system-specific logic, add private methods to your parser:

```typescript
export class YourSystemParser extends BaseAccountingParser {
  // ... abstract methods ...

  /**
   * Parse your system's special date format
   */
  private parseYourSystemDate(value: CSVValue): string | undefined {
    // System-specific logic
  }
}
```

## Performance Considerations

- Parsers run on **every row** of large CSV files
- Keep `parseRow()` logic efficient
- Avoid complex regex in hot paths
- Cache computed values when possible
- Use helper methods (they're optimized)

## Testing

```typescript
import { QuickBooksParser } from "./parsers/quickbooks-parser";

describe("QuickBooksParser", () => {
  const parser = new QuickBooksParser();

  it("should detect QuickBooks format", () => {
    const headers = ["Account", "Amount"];
    const firstRow = { Account: "Cash (1000)", Amount: "1000.00" };

    const result = parser.detect(headers, firstRow);
    expect(result.confidence).toBeGreaterThan(0.9);
  });

  it("should parse parenthetical account codes", () => {
    const row = { Account: "Cash (1000)", Amount: "1000.00" };
    const parsed = parser.parseRow(row);

    expect(parsed.account_code).toBe("1000");
    expect(parsed.account_name).toBe("Cash");
    expect(parsed.amount).toBe(1000);
  });
});
```

## Troubleshooting

### Parser Not Detected

- Check confidence score is > 0.5
- Verify column names match (case-insensitive)
- Look at first row data format
- Check detection order (higher confidence wins)

### Incorrect Parsing

- Verify helper method usage
- Check for null/undefined values
- Test with edge cases
- Review column name matching logic

### Type Errors

- Ensure parsed values match `ParsedCSVRow` interface
- Use type guards for `CSVValue` checks
- Handle `null` and `undefined` explicitly

## Future Enhancements

Potential improvements:

1. **Caching**: Cache parser detection results
2. **Validation**: Add schema validation to detect()
3. **Metrics**: Track parser usage and accuracy
4. **Configuration**: Allow parser customization via config
5. **ML Detection**: Use ML for more accurate detection

---

**Version**: 1.0.0
**Last Updated**: January 2026
**Maintainer**: Claude Code
