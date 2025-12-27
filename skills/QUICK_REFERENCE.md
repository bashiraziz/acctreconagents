# Parser Skills Quick Reference

## Which Parser Should I Use?

### QuickBooks Parser
**Use when you see**:
- ✅ Account names with codes in parentheses: `"Accounts Payable (2000)"`
- ✅ Comma-formatted numbers: `"-52,850.00"`
- ✅ US date format: `"12/31/2025"`
- ✅ Column headers: `Account`, `Balance`, `As of`

**Command**:
```typescript
import { parseQuickBooks } from './quickbooks-parser/parse';
const result = parseQuickBooks(csvContent, 'gl_balance');
```

**Confidence**: 60%+ if headers include "Account", "Balance", "As of"

---

### Costpoint Parser
**Use when you see**:
- ✅ Separate `Debit` and `Credit` columns (NOT combined balance)
- ✅ Plain account numbers: `2000`, `2100`
- ✅ ISO period format: `2025-12`
- ✅ Column headers: `Account Number`, `Debit`, `Credit`, `Period`

**Command**:
```typescript
import { parseCostpoint } from './costpoint-parser/parse';
const result = parseCostpoint(csvContent, 'gl_balance');
```

**Confidence**: 60%+ if headers include both "Debit" and "Credit"

**⚠️ CRITICAL**: Costpoint credits are POSITIVE - parser automatically reverses sign for balance sheet accounts

---

### NetSuite Parser
**Use when you see**:
- ✅ `Amount (Base Currency)` column
- ✅ Dimensional columns: `Department`, `Location`, `Subsidiary`
- ✅ Various account formats: `2000 Accounts Payable` or `AP-2000`
- ✅ Multiple rows per account (by department/location)

**Command**:
```typescript
import { parseNetSuite } from './netsuite-parser/parse';
const result = parseNetSuite(csvContent, 'gl_balance', true); // true = aggregate
```

**Confidence**: 25%+ if headers include "Amount (Base Currency)" or dimensional fields

**Note**: Set `aggregateDimensions=true` to sum amounts by account (recommended for GL reconciliation)

---

## Output Format (All Parsers)

All parsers return the same canonical format:

```typescript
{
  data: [
    {
      account_code: "2000",
      account_name: "Accounts Payable",
      amount: -52850,
      period: "2025-12"
    }
  ],
  warnings: [],
  metadata: {
    accountsExtracted: 1,
    formatConfidence: 0.8,
    transformationsApplied: [
      "Extracted account code \"2000\" from \"Accounts Payable (2000)\"",
      "Parsed comma-formatted number: \"-52,850.00\" → -52850"
    ]
  }
}
```

## Auto-Detection Example

```typescript
function detectParser(csvContent: string) {
  const headers = csvContent.split('\n')[0].split(',');

  const scores = {
    quickbooks: validateQuickBooksFormat(headers),
    costpoint: validateCostpointFormat(headers),
    netsuite: validateNetSuiteFormat(headers)
  };

  const bestMatch = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])[0];

  if (bestMatch[1] >= 0.6) {
    return bestMatch[0]; // Use detected parser
  } else {
    return 'ask_user'; // Confidence too low, ask user
  }
}
```

## Testing Your Parser

```bash
# Test QuickBooks parser
cd skills
npx tsx test-quickbooks-parser.ts

# Test with your own CSV
cat > test.csv << EOF
Account,Balance,As of
"Accounts Payable (2000)","-52,850.00","12/31/2025"
EOF

npx tsx -e "
import { parseQuickBooks } from './quickbooks-parser/parse.js';
import fs from 'fs';
const csv = fs.readFileSync('test.csv', 'utf-8');
const result = parseQuickBooks(csv, 'gl_balance');
console.log(JSON.stringify(result, null, 2));
"
```

## Common Issues

### "Missing account code"
**Cause**: Parser couldn't identify account column
**Fix**: Check that your CSV has a column like `Account`, `Account Number`, or `GL Account`

### "Missing amount"
**Cause**: Parser couldn't identify amount column
**Fix**:
- QuickBooks: Check for `Balance` or `Amount` column
- Costpoint: Check for both `Debit` AND `Credit` columns
- NetSuite: Check for `Amount` or `Amount (Base Currency)` column

### Wrong amounts
**Cause**: May be using wrong parser (e.g., Costpoint data with QuickBooks parser)
**Fix**: Verify you're using correct parser for your system format

### "Low confidence" warning
**Cause**: Headers don't match expected format
**Fix**: Either use correct parser OR update expected headers in skill's `validate...Format()` function

## Need Help?

1. Check transformation logs in `metadata.transformationsApplied`
2. Verify format confidence score in `metadata.formatConfidence`
3. Review warnings in `warnings` array
4. Compare your CSV headers against parser's expected headers (see `skills/README.md`)
