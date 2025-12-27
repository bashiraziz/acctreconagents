/**
 * Deltek Costpoint CSV Parser Skill
 *
 * Parses Costpoint exports and converts them to canonical Spec-Kit format.
 *
 * Costpoint Format Characteristics:
 * - Separate Debit/Credit columns (not combined Balance)
 * - Credits shown as POSITIVE (opposite of accounting convention)
 * - Plain account numbers: "2000", "5100"
 * - ISO period format: "2025-12"
 * - Requires sign reversal for balance sheet credits
 */

export interface CostpointParseResult {
  data: CanonicalBalance[];
  warnings: string[];
  metadata: {
    accountsExtracted: number;
    formatConfidence: number;
    transformationsApplied: string[];
    signReversals: number;
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
export function parseCostpoint(
  csvContent: string,
  fileType: 'gl_balance' | 'subledger_balance' | 'transactions' = 'gl_balance'
): CostpointParseResult {
  const warnings: string[] = [];
  const transformations: string[] = [];
  let signReversals = 0;

  try {
    const lines = csvContent.trim().split('\n').filter(line => line.trim());

    if (lines.length < 2) {
      warnings.push('File appears empty or has only headers');
      return {
        data: [],
        warnings,
        metadata: { accountsExtracted: 0, formatConfidence: 0, transformationsApplied: [], signReversals: 0 }
      };
    }

    // Parse CSV with Costpoint-specific rules
    const headers = parseCSVLine(lines[0]);
    const rows = lines.slice(1);

    // Validate Costpoint format
    const confidence = validateCostpointFormat(headers);
    if (confidence < 0.5) {
      warnings.push(`Low confidence this is Costpoint format (${Math.round(confidence * 100)}%)`);
      warnings.push(`Expected headers like: Account Number, Debit, Credit, Period`);
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
          // Apply Costpoint sign convention (credits positive -> accounting negative)
          const adjusted = applyCostpointSignConvention(parsed, transformations);
          if (adjusted.signReversed) {
            signReversals++;
          }
          data.push(adjusted.record);
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
        signReversals,
      }
    };

  } catch (error: any) {
    warnings.push(`Parse error: ${error.message}`);
    return {
      data: [],
      warnings,
      metadata: { accountsExtracted: 0, formatConfidence: 0, transformationsApplied: [], signReversals: 0 }
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
  let debit = 0;
  let credit = 0;
  let fiscalYear = '';
  let period = '';

  for (let i = 0; i < headers.length; i++) {
    const header = headers[i];
    const value = values[i] || '';
    const headerLower = header.toLowerCase();

    // Account code/number
    if (headerLower.includes('account') && (headerLower.includes('number') || headerLower.includes('code') || headerLower === 'account')) {
      row.account_code = value.trim();
    }

    // Account name/description
    else if (headerLower.includes('account') && (headerLower.includes('name') || headerLower.includes('desc'))) {
      row.account_name = value.trim();
    }

    // Debit column
    else if (headerLower === 'debit' || headerLower === 'dr') {
      debit = parseCostpointNumber(value);
    }

    // Credit column
    else if (headerLower === 'credit' || headerLower === 'cr') {
      credit = parseCostpointNumber(value);
    }

    // Amount column (for subledger files that don't have Debit/Credit)
    else if (headerLower === 'amount') {
      // Costpoint subledgers show amounts as positive, but they represent liabilities
      // We need to negate them to match accounting convention
      row.amount = -Math.abs(parseCostpointNumber(value));
    }

    // Fiscal Year (separate column)
    else if (headerLower === 'fiscal_year' || headerLower === 'year') {
      fiscalYear = value.trim();
    }

    // Period field (may be separate or combined)
    else if (
      headerLower === 'period' ||
      headerLower === 'fiscal_period' ||
      headerLower === 'accounting_period'
    ) {
      // If it looks like a full period (YYYY-MM), use it directly
      const parsedPeriod = parseCostpointPeriod(value);
      if (parsedPeriod) {
        row.period = parsedPeriod;
      } else {
        // Otherwise it's just the month number
        period = value.trim();
      }
    }

    // Other fields (vendor, invoice, org, etc.)
    else {
      row[header.toLowerCase().replace(/\s+/g, '_')] = value;
    }
  }

  // Combine fiscal_year + period if they were separate columns
  if (fiscalYear && period && !row.period) {
    row.period = `${fiscalYear}-${period.padStart(2, '0')}`;
  }

  // Calculate net amount (Debit - Credit in Costpoint's convention)
  // Note: We'll reverse the sign later for balance sheet accounts
  if (debit !== 0 || credit !== 0) {
    row.amount = debit - credit;
    row._costpoint_debit = debit;
    row._costpoint_credit = credit;

    if (debit !== 0 && credit !== 0) {
      transformations.push(
        `Calculated net amount: Debit ${debit} - Credit ${credit} = ${row.amount}`
      );
    } else if (debit !== 0) {
      transformations.push(`Debit amount: ${debit}`);
    } else {
      transformations.push(`Credit amount: ${credit} (will apply sign convention)`);
    }
  }
  // If no Debit/Credit but have a direct Amount field (subledger files)
  else if (row.amount !== undefined) {
    // Amount already set from the loop above, keep it
    transformations.push(`Direct amount: ${row.amount}`);
  }

  // Validation
  if (!row.account_code) {
    throw new Error('Missing account code');
  }

  if (row.amount === undefined) {
    throw new Error('Missing amount (no Debit/Credit or Amount value)');
  }

  return row as CanonicalBalance;
}

/**
 * Apply Costpoint sign convention
 *
 * Costpoint DISPLAYS credits as POSITIVE in their UI, but when we calculate
 * using the standard formula (Debit - Credit), we automatically get the
 * correct accounting convention:
 * - Assets (1000-1999): Debit balance → positive
 * - Liabilities (2000-2999): Credit balance → negative ✓
 * - Equity (3000-3999): Credit balance → negative ✓
 * - Revenue (4000-4999): Credit balance → negative (needs reversal!)
 * - Expenses (5000-9999): Debit balance → positive
 *
 * Only Revenue accounts (4000-4999) need sign reversal to be positive.
 */
function applyCostpointSignConvention(
  record: CanonicalBalance,
  transformations: string[]
): { record: CanonicalBalance; signReversed: boolean } {
  const accountCode = record.account_code;
  const accountNum = parseInt(accountCode);
  let signReversed = false;

  // Revenue accounts: Credit balances should be POSITIVE (reverse the negative from debit-credit)
  if (record.amount < 0 && accountNum >= 4000 && accountNum <= 4999) {
    record.amount = -record.amount;
    signReversed = true;

    transformations.push(
      `Applied sign reversal for revenue account ${accountCode}: ` +
      `Debit ${record._costpoint_debit} - Credit ${record._costpoint_credit} ` +
      `→ ${record.amount} (revenue credit balance shown as positive)`
    );
  }
  // Balance sheet accounts: Keep as calculated (Debit - Credit)
  else if (accountNum >= 1000 && accountNum <= 3999) {
    // No reversal needed - debit-credit formula already correct
    if (record.amount < 0) {
      transformations.push(
        `Balance sheet account ${accountCode}: ` +
        `Debit ${record._costpoint_debit} - Credit ${record._costpoint_credit} = ${record.amount} ` +
        `(credit balance correctly negative)`
      );
    }
  }

  // Clean up temporary fields
  delete record._costpoint_debit;
  delete record._costpoint_credit;

  return { record, signReversed };
}

/**
 * Parse Costpoint number format (plain numbers, no special formatting)
 */
function parseCostpointNumber(value: string): number {
  if (!value || value.trim() === '') {
    return 0;
  }

  // Remove any commas that might be present
  const cleaned = value.replace(/,/g, '').trim();
  const num = parseFloat(cleaned);

  if (isNaN(num)) {
    throw new Error(`Invalid number format: "${value}"`);
  }

  return num;
}

/**
 * Parse Costpoint period format
 * Costpoint typically uses ISO format already: "2025-12" or "2025-12-31"
 */
function parseCostpointPeriod(value: string): string | null {
  // If already in YYYY-MM format, return as-is
  if (value.match(/^\d{4}-\d{2}$/)) {
    return value;
  }

  // If in YYYY-MM-DD format, extract YYYY-MM
  if (value.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return value.substring(0, 7);
  }

  // Try to parse other formats if needed
  return null;
}

/**
 * Validate that this looks like Costpoint format
 * Returns confidence score 0-1
 */
function validateCostpointFormat(headers: string[]): number {
  let score = 0;
  const headerLower = headers.map(h => h.toLowerCase());

  // Strong indicators of Costpoint format
  const hasDebit = headerLower.some(h => h === 'debit' || h === 'dr');
  const hasCredit = headerLower.some(h => h === 'credit' || h === 'cr');
  const hasSeparateColumns = hasDebit && hasCredit;

  if (hasSeparateColumns) {
    score += 0.6; // Very strong indicator
  }

  // Check for other Costpoint-specific headers
  const costpointHeaders = [
    'account number',
    'account_number',
    'fiscal_period',
    'accounting_period',
    'org',
    'organization'
  ];

  for (const expected of costpointHeaders) {
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
}) {
  const result = parseCostpoint(args.csvContent, args.fileType);

  // Print results
  console.log('\n📊 Costpoint Parser Results\n');
  console.log(`Accounts extracted: ${result.metadata.accountsExtracted}`);
  console.log(`Format confidence: ${Math.round(result.metadata.formatConfidence * 100)}%`);
  console.log(`Sign reversals applied: ${result.metadata.signReversals}`);

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
