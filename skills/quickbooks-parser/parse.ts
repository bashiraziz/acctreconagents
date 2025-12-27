/**
 * QuickBooks CSV Parser Skill
 *
 * Parses QuickBooks exports and converts them to canonical Spec-Kit format.
 *
 * QuickBooks Format Characteristics:
 * - Account codes in parentheses: "Accounts Payable (2000)"
 * - Comma-formatted numbers: "-52,850.00"
 * - US date format: "12/31/2025"
 * - Natural language headers: "Account", "Balance", "Open Balance"
 */

export interface QuickBooksParseResult {
  data: CanonicalBalance[];
  warnings: string[];
  metadata: {
    accountsExtracted: number;
    formatConfidence: number;
    transformationsApplied: string[];
  };
}

export interface CanonicalBalance {
  account_code: string;
  amount: number;
  period?: string;
  currency?: string;
  [key: string]: any; // Allow additional fields
}

/**
 * Main parsing function
 */
export function parseQuickBooks(
  csvContent: string,
  fileType: 'gl_balance' | 'subledger_balance' | 'transactions' = 'gl_balance'
): QuickBooksParseResult {
  const warnings: string[] = [];
  const transformations: string[] = [];

  try {
    const lines = csvContent.trim().split('\n').filter(line => line.trim());

    if (lines.length < 2) {
      warnings.push('File appears empty or has only headers');
      return {
        data: [],
        warnings,
        metadata: { accountsExtracted: 0, formatConfidence: 0, transformationsApplied: [] }
      };
    }

    // Parse CSV with QuickBooks-specific rules
    const headers = parseCSVLine(lines[0]);
    const rows = lines.slice(1);

    // Validate QuickBooks format
    const confidence = validateQuickBooksFormat(headers);
    if (confidence < 0.5) {
      warnings.push(`Low confidence this is QuickBooks format (${Math.round(confidence * 100)}%)`);
      warnings.push(`Expected headers like: Account, Balance, As of`);
      warnings.push(`Found: ${headers.join(', ')}`);
    }

    // Parse each row
    const data: CanonicalBalance[] = [];

    for (let i = 0; i < rows.length; i++) {
      const rowNum = i + 2; // +2 for 1-based and header row
      const values = parseCSVLine(rows[i]);

      if (values.length === 0 || values.every(v => !v.trim())) {
        continue; // Skip empty rows
      }

      try {
        const parsed = parseRow(headers, values, transformations);
        if (parsed) {
          data.push(parsed);
        }
      } catch (error: any) {
        warnings.push(`Row ${rowNum}: ${error.message}`);
      }
    }

    return {
      data,
      warnings,
      metadata: {
        accountsExtracted: data.length,
        formatConfidence: confidence,
        transformationsApplied: transformations,
      }
    };

  } catch (error: any) {
    warnings.push(`Parse error: ${error.message}`);
    return {
      data: [],
      warnings,
      metadata: { accountsExtracted: 0, formatConfidence: 0, transformationsApplied: [] }
    };
  }
}

/**
 * Parse a single CSV line handling quoted values
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result.map(v => v.replace(/^"|"$/g, ''));
}

/**
 * Parse a single row into canonical format
 */
function parseRow(
  headers: string[],
  values: string[],
  transformations: string[]
): CanonicalBalance | null {
  const row: any = {};

  for (let i = 0; i < headers.length; i++) {
    const header = headers[i];
    const value = values[i] || '';
    const headerLower = header.toLowerCase();

    // Account code extraction
    if (headerLower === 'account' || headerLower.includes('account')) {
      const extracted = extractAccountCode(value);
      if (extracted.code !== value) {
        transformations.push(
          `Extracted account code "${extracted.code}" from "${value}"`
        );
      }
      row.account_code = extracted.code;
      if (extracted.name) {
        row.account_name = extracted.name;
      }
    }

    // Amount fields (Balance, Open Balance, Amount)
    else if (
      headerLower === 'balance' ||
      headerLower === 'open balance' ||
      headerLower === 'amount' ||
      headerLower === 'debit' ||
      headerLower === 'credit'
    ) {
      const amount = parseQuickBooksNumber(value);
      row.amount = amount;

      if (value.includes(',')) {
        transformations.push(
          `Parsed comma-formatted number: "${value}" → ${amount}`
        );
      }
    }

    // Period/Date fields
    else if (
      headerLower === 'as of' ||
      headerLower === 'date' ||
      headerLower === 'period'
    ) {
      const period = parseQuickBooksDate(value);
      if (period) {
        row.period = period;
        if (value !== period) {
          transformations.push(
            `Converted date: "${value}" → "${period}"`
          );
        }
      }
    }

    // Other fields (vendor, invoice number, etc.)
    else {
      row[header.toLowerCase().replace(/\s+/g, '_')] = value;
    }
  }

  // Validation
  if (!row.account_code) {
    throw new Error('Missing account code');
  }

  if (row.amount === undefined) {
    throw new Error('Missing amount');
  }

  return row as CanonicalBalance;
}

/**
 * Extract account code from QuickBooks parenthetical format
 * Examples:
 *   "Accounts Payable (2000)" → { code: "2000", name: "Accounts Payable" }
 *   "2000" → { code: "2000", name: null }
 */
function extractAccountCode(value: string): { code: string; name: string | null } {
  const match = value.match(/^(.+?)\s*\((\d+)\)$/);

  if (match) {
    return {
      code: match[2],
      name: match[1].trim()
    };
  }

  return {
    code: value.trim(),
    name: null
  };
}

/**
 * Parse QuickBooks number format (with commas)
 * Examples:
 *   "-52,850.00" → -52850
 *   "1,234.56" → 1234.56
 *   "(1,234.56)" → -1234.56 (parentheses = negative)
 */
function parseQuickBooksNumber(value: string): number {
  // Handle parentheses as negative
  const isNegative = value.startsWith('(') && value.endsWith(')');

  // Remove commas, parentheses, and parse
  const cleaned = value.replace(/[,()]/g, '');
  const num = parseFloat(cleaned);

  if (isNaN(num)) {
    throw new Error(`Invalid number format: "${value}"`);
  }

  return isNegative ? -Math.abs(num) : num;
}

/**
 * Parse QuickBooks date format to period
 * Examples:
 *   "12/31/2025" → "2025-12"
 *   "01/15/2025" → "2025-01"
 */
function parseQuickBooksDate(value: string): string | null {
  // Match MM/DD/YYYY format
  const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

  if (match) {
    const month = match[1].padStart(2, '0');
    const year = match[3];
    return `${year}-${month}`;
  }

  // If already in YYYY-MM format, return as-is
  if (value.match(/^\d{4}-\d{2}$/)) {
    return value;
  }

  return null;
}

/**
 * Validate that this looks like QuickBooks format
 * Returns confidence score 0-1
 */
function validateQuickBooksFormat(headers: string[]): number {
  let score = 0;
  const headerLower = headers.map(h => h.toLowerCase());

  // Check for common QuickBooks headers
  const commonHeaders = [
    'account',
    'balance',
    'as of',
    'vendor',
    'open balance',
    'num',
    'due date'
  ];

  for (const expected of commonHeaders) {
    if (headerLower.some(h => h.includes(expected))) {
      score += 0.2;
    }
  }

  return Math.min(score, 1.0);
}

/**
 * CLI-friendly interface
 */
export default function main(args: {
  csvContent: string;
  fileType?: 'gl_balance' | 'subledger_balance' | 'transactions';
}) {
  const result = parseQuickBooks(args.csvContent, args.fileType);

  // Print results
  console.log('\n📊 QuickBooks Parser Results\n');
  console.log(`Accounts extracted: ${result.metadata.accountsExtracted}`);
  console.log(`Format confidence: ${Math.round(result.metadata.formatConfidence * 100)}%`);

  if (result.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    result.warnings.forEach(w => console.log(`  - ${w}`));
  }

  if (result.metadata.transformationsApplied.length > 0) {
    console.log('\n🔄 Transformations:');
    result.metadata.transformationsApplied.slice(0, 5).forEach(t => console.log(`  - ${t}`));
    if (result.metadata.transformationsApplied.length > 5) {
      console.log(`  ... and ${result.metadata.transformationsApplied.length - 5} more`);
    }
  }

  console.log('\n📋 Parsed Data:');
  console.log(JSON.stringify(result.data, null, 2));

  return result;
}
