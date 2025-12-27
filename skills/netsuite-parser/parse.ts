/**
 * Oracle NetSuite CSV Parser Skill
 *
 * Parses NetSuite exports and converts them to canonical Spec-Kit format.
 *
 * NetSuite Format Characteristics:
 * - Multi-currency support with "Amount (Base Currency)" column
 * - Dimensional data (Department, Location, Subsidiary, Class)
 * - Various account formats: "2000 Accounts Payable", "AP-2000", "2000"
 * - Both US and ISO date formats
 * - Requires aggregation across dimensions for GL reconciliation
 */

export interface NetSuiteParseResult {
  data: CanonicalBalance[];
  warnings: string[];
  metadata: {
    accountsExtracted: number;
    formatConfidence: number;
    transformationsApplied: string[];
    dimensionalRecords: number;
    aggregatedRecords: number;
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
export function parseNetSuite(
  csvContent: string,
  fileType: 'gl_balance' | 'subledger_balance' | 'transactions' = 'gl_balance',
  aggregateDimensions: boolean = true
): NetSuiteParseResult {
  const warnings: string[] = [];
  const transformations: string[] = [];

  try {
    const lines = csvContent.trim().split('\n').filter(line => line.trim());

    if (lines.length < 2) {
      warnings.push('File appears empty or has only headers');
      return {
        data: [],
        warnings,
        metadata: {
          accountsExtracted: 0,
          formatConfidence: 0,
          transformationsApplied: [],
          dimensionalRecords: 0,
          aggregatedRecords: 0
        }
      };
    }

    // Parse CSV with NetSuite-specific rules
    const headers = parseCSVLine(lines[0]);
    const rows = lines.slice(1);

    // Validate NetSuite format
    const confidence = validateNetSuiteFormat(headers);
    if (confidence < 0.5) {
      warnings.push(`Low confidence this is NetSuite format (${Math.round(confidence * 100)}%)`);
      warnings.push(`Expected headers like: Account, Amount (Base Currency), Period`);
      warnings.push(`Found: ${headers.join(', ')}`);
    }

    // Parse each row
    const rawRecords: CanonicalBalance[] = [];

    for (let i = 0; i < rows.length; i++) {
      const rowNum = i + 2; // +2 for 1-based and header row
      const values = parseCSVLine(rows[i]);

      if (values.length === 0 || values.every(v => !v.trim())) {
        continue; // Skip empty rows
      }

      try {
        const parsed = parseRow(headers, values, transformations);
        if (parsed) {
          rawRecords.push(parsed);
        }
      } catch (error: any) {
        warnings.push(`Row ${rowNum}: ${error.message}`);
      }
    }

    // Aggregate dimensional data if needed
    let finalData: CanonicalBalance[];
    let dimensionalRecords = 0;
    let aggregatedRecords = 0;

    if (aggregateDimensions && hasDimensionalData(headers)) {
      const aggregationResult = aggregateByAccount(rawRecords, transformations);
      finalData = aggregationResult.data;
      dimensionalRecords = rawRecords.length;
      aggregatedRecords = finalData.length;
    } else {
      finalData = rawRecords;
    }

    return {
      data: finalData,
      warnings,
      metadata: {
        accountsExtracted: finalData.length,
        formatConfidence: confidence,
        transformationsApplied: transformations,
        dimensionalRecords,
        aggregatedRecords,
      }
    };

  } catch (error: any) {
    warnings.push(`Parse error: ${error.message}`);
    return {
      data: [],
      warnings,
      metadata: {
        accountsExtracted: 0,
        formatConfidence: 0,
        transformationsApplied: [],
        dimensionalRecords: 0,
        aggregatedRecords: 0
      }
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
  let hasBaseCurrency = false;

  for (let i = 0; i < headers.length; i++) {
    const header = headers[i];
    const value = values[i] || '';
    const headerLower = header.toLowerCase();

    // Account code extraction
    if (headerLower === 'account' || headerLower === 'account number' || headerLower.includes('gl_account')) {
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

    // Account name (if separate column)
    else if (headerLower === 'account name' || headerLower === 'account_name') {
      if (!row.account_name) {
        row.account_name = value.trim();
      }
    }

    // Amount fields - prefer Base Currency for multi-currency orgs
    else if (headerLower === 'amount (base currency)' || headerLower === 'amount__base_currency_') {
      const amount = parseNetSuiteNumber(value);
      row.amount = amount;
      hasBaseCurrency = true;

      if (value.includes(',')) {
        transformations.push(
          `Parsed base currency amount: "${value}" → ${amount}`
        );
      }
    }
    // Regular amount (use only if no base currency)
    else if (!hasBaseCurrency && (
      headerLower === 'amount' ||
      headerLower === 'balance' ||
      headerLower === 'debit' ||
      headerLower === 'credit'
    )) {
      const amount = parseNetSuiteNumber(value);
      row.amount = amount;
    }

    // Period/Date fields
    else if (
      headerLower === 'period' ||
      headerLower === 'accounting period' ||
      headerLower === 'date' ||
      headerLower === 'posting period'
    ) {
      const period = parseNetSuitePeriod(value);
      if (period) {
        row.period = period;
        if (value !== period) {
          transformations.push(
            `Converted period: "${value}" → "${period}"`
          );
        }
      }
    }

    // Dimensional fields (preserve for aggregation)
    else if (
      headerLower === 'department' ||
      headerLower === 'location' ||
      headerLower === 'subsidiary' ||
      headerLower === 'class'
    ) {
      row[headerLower] = value.trim();
    }

    // Other fields
    else {
      row[header.toLowerCase().replace(/\s+/g, '_').replace(/[()]/g, '')] = value;
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
 * Extract account code from various NetSuite formats
 * Examples:
 *   "2000 Accounts Payable" → { code: "2000", name: "Accounts Payable" }
 *   "AP-2000" → { code: "2000", name: null }
 *   "2000" → { code: "2000", name: null }
 */
function extractAccountCode(value: string): { code: string; name: string | null } {
  // Pattern 1: Code followed by name (space-separated)
  const match1 = value.match(/^(\d+)\s+(.+)$/);
  if (match1) {
    return {
      code: match1[1],
      name: match1[2].trim()
    };
  }

  // Pattern 2: Prefix-Code format (e.g., "AP-2000")
  const match2 = value.match(/^[A-Z]+-(\d+)$/);
  if (match2) {
    return {
      code: match2[1],
      name: null
    };
  }

  // Pattern 3: Name followed by code in parentheses (like QuickBooks)
  const match3 = value.match(/^(.+?)\s*\((\d+)\)$/);
  if (match3) {
    return {
      code: match3[2],
      name: match3[1].trim()
    };
  }

  // Default: Use as-is
  return {
    code: value.trim(),
    name: null
  };
}

/**
 * Parse NetSuite number format
 * Examples:
 *   "52,850.00" → 52850
 *   "52850.00" → 52850
 *   "-1,234.56" → -1234.56
 */
function parseNetSuiteNumber(value: string): number {
  // Remove commas and parse
  const cleaned = value.replace(/,/g, '').trim();
  const num = parseFloat(cleaned);

  if (isNaN(num)) {
    throw new Error(`Invalid number format: "${value}"`);
  }

  return num;
}

/**
 * Parse NetSuite period/date format
 * Examples:
 *   "12/31/2025" → "2025-12"
 *   "2025-12-31" → "2025-12"
 *   "Jan 2025" → "2025-01"
 */
function parseNetSuitePeriod(value: string): string | null {
  // US date format: MM/DD/YYYY
  const match1 = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match1) {
    const month = match1[1].padStart(2, '0');
    const year = match1[3];
    return `${year}-${month}`;
  }

  // ISO date format: YYYY-MM-DD
  const match2 = value.match(/^(\d{4})-(\d{2})-\d{2}$/);
  if (match2) {
    return `${match2[1]}-${match2[2]}`;
  }

  // Already in YYYY-MM format
  if (value.match(/^\d{4}-\d{2}$/)) {
    return value;
  }

  // Month name format: "Jan 2025"
  const monthMap: { [key: string]: string } = {
    'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
    'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
    'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
  };
  const match3 = value.match(/^([a-z]{3})\s+(\d{4})$/i);
  if (match3) {
    const monthNum = monthMap[match3[1].toLowerCase()];
    if (monthNum) {
      return `${match3[2]}-${monthNum}`;
    }
  }

  return null;
}

/**
 * Check if headers indicate dimensional data
 */
function hasDimensionalData(headers: string[]): boolean {
  const headerLower = headers.map(h => h.toLowerCase());
  const dimensionalHeaders = ['department', 'location', 'subsidiary', 'class'];
  return dimensionalHeaders.some(dim => headerLower.includes(dim));
}

/**
 * Aggregate records by account code (sum amounts across dimensions)
 */
function aggregateByAccount(
  records: CanonicalBalance[],
  transformations: string[]
): { data: CanonicalBalance[] } {
  const accountMap = new Map<string, CanonicalBalance>();

  for (const record of records) {
    const key = `${record.account_code}|${record.period || 'no-period'}`;

    if (accountMap.has(key)) {
      const existing = accountMap.get(key)!;
      existing.amount += record.amount;
    } else {
      // Create new aggregated record
      accountMap.set(key, {
        account_code: record.account_code,
        account_name: record.account_name,
        amount: record.amount,
        period: record.period,
      });
    }
  }

  const aggregated = Array.from(accountMap.values());

  if (aggregated.length < records.length) {
    transformations.push(
      `Aggregated ${records.length} dimensional records into ${aggregated.length} account balances`
    );
  }

  return { data: aggregated };
}

/**
 * Validate that this looks like NetSuite format
 * Returns confidence score 0-1
 */
function validateNetSuiteFormat(headers: string[]): number {
  let score = 0;
  const headerLower = headers.map(h => h.toLowerCase());

  // Check for NetSuite-specific headers
  const netsuiteHeaders = [
    'amount (base currency)',
    'amount__base_currency_',
    'subsidiary',
    'accounting period',
    'posting period',
    'gl_account',
    'document number'
  ];

  for (const expected of netsuiteHeaders) {
    if (headerLower.some(h => h.includes(expected))) {
      score += 0.25;
    }
  }

  // Generic headers that could be NetSuite
  const genericHeaders = ['account', 'amount', 'period', 'department', 'location'];
  for (const expected of genericHeaders) {
    if (headerLower.some(h => h.includes(expected))) {
      score += 0.1;
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
  aggregateDimensions?: boolean;
}) {
  const result = parseNetSuite(
    args.csvContent,
    args.fileType,
    args.aggregateDimensions ?? true
  );

  // Print results
  console.log('\n📊 NetSuite Parser Results\n');
  console.log(`Accounts extracted: ${result.metadata.accountsExtracted}`);
  console.log(`Format confidence: ${Math.round(result.metadata.formatConfidence * 100)}%`);

  if (result.metadata.dimensionalRecords > 0) {
    console.log(`Dimensional records: ${result.metadata.dimensionalRecords}`);
    console.log(`Aggregated to: ${result.metadata.aggregatedRecords} accounts`);
  }

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
