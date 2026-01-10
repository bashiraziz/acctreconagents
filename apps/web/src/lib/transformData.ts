/**
 * Data transformation utility
 * Applies column mappings and validates with Zod
 * Integrates system-specific parsers for accounting platforms
 */

import { z } from "zod";
import type {
  UploadedFile,
  ColumnMapping,
  Balance,
  Transaction,
  ReconciliationPayload,
  AccountingSystem,
} from "@/types/reconciliation";
import type { RawCSVRow, ParsedCSVRow } from "@/types/csv";
import {
  detectAccountingSystem,
  parseRowForAccountingSystem,
} from "./accountingSystemParsers";
import {
  processBatchWithValidation,
  shouldUseBatching,
  calculateOptimalBatchSize,
  type BatchOptions,
} from "./batch-processor";

// ============================================
// Zod Schemas (flexible to handle various CSV formats)
// ============================================

// Helper to coerce any value to number (handles strings with commas, parentheses for negatives, etc.)
const coerceToNumber = z.preprocess((val) => {
  if (val == null || val === "") return undefined;
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    let cleaned = val.trim();

    // Handle parentheses for negative numbers: (95.50) -> -95.50
    const isNegative = cleaned.startsWith("(") && cleaned.endsWith(")");
    if (isNegative) {
      cleaned = "-" + cleaned.slice(1, -1);
    }

    // Remove commas
    cleaned = cleaned.replace(/,/g, "");

    const num = parseFloat(cleaned);
    return isNaN(num) ? val : num;
  }
  return val;
}, z.number());

// Helper to coerce any value to string (handles numbers, nulls)
const coerceToString = z.preprocess((val) => {
  if (val == null || val === "") return undefined;
  return String(val);
}, z.string().optional());

// Helper to coerce to optional number (same logic as coerceToNumber but for optional fields)
const coerceToOptionalNumber = z.preprocess((val) => {
  if (val == null || val === "") return undefined;
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    let cleaned = val.trim();

    // Handle parentheses for negative numbers: (95.50) -> -95.50
    const isNegative = cleaned.startsWith("(") && cleaned.endsWith(")");
    if (isNegative) {
      cleaned = "-" + cleaned.slice(1, -1);
    }

    // Remove commas
    cleaned = cleaned.replace(/,/g, "");

    const num = parseFloat(cleaned);
    return isNaN(num) ? undefined : num;
  }
  return undefined;
}, z.number().optional());

const balanceSchema = z.object({
  account_code: z.preprocess((val) => {
    if (val == null || val === "" || String(val).trim() === "") return undefined;
    return String(val).trim();
  }, z.string().min(1, "Account code is required")),
  period: coerceToString,
  amount: coerceToNumber,
  currency: coerceToString,
});

const transactionSchema = z.object({
  account_code: z.preprocess((val) => {
    if (val == null || val === "" || String(val).trim() === "") return undefined;
    return String(val).trim();
  }, z.string().min(1, "Account code is required")),
  booked_at: z.union([z.string(), z.date()]),
  debit: coerceToOptionalNumber,
  credit: coerceToOptionalNumber,
  amount: coerceToOptionalNumber,
  narrative: coerceToString,
  source_period: coerceToString,
});

// ============================================
// Transform Functions
// ============================================

/**
 * Apply column mapping to raw CSV data and inject metadata
 * Also applies system-specific parsing if accounting system is specified
 */
export function applyMapping(
  rows: RawCSVRow[],
  mapping: ColumnMapping,
  metadata?: { accountCode?: string; period?: string; currency?: string; reverseSign?: boolean },
  accountingSystem?: AccountingSystem,
): ParsedCSVRow[] {
  return rows.map((row) => {
    // Step 1: Apply system-specific parsing first (if specified)
    let parsedRow = row;
    if (accountingSystem && accountingSystem !== "generic") {
      parsedRow = parseRowForAccountingSystem(row, accountingSystem);
    }

    const transformed: ParsedCSVRow = {};

    // Pre-populate metadata fields to ensure they exist as properties
    // This ensures they appear in data previews and Object.keys()
    if (metadata) {
      if (metadata.accountCode) transformed.account_code = metadata.accountCode;
      if (metadata.period) transformed.period = metadata.period;
      if (metadata.currency) transformed.currency = metadata.currency;
    }

    // Step 2: Apply column mapping
    for (const [canonicalField, sourceColumn] of Object.entries(mapping)) {
      if (sourceColumn && parsedRow[sourceColumn] !== undefined) {
        let value = parsedRow[sourceColumn];

        // Type conversions to ensure data matches schema
        if (canonicalField === "account_code" && value !== null && value !== undefined) {
          // Ensure account_code is always a string (PapaParse may convert numeric codes to numbers)
          value = String(value);
        } else if (canonicalField === "amount" && value !== null && value !== undefined) {
          // Ensure amount is always a number
          const num = typeof value === "string" ? parseFloat(value.replace(/,/g, "")) : Number(value);
          value = isNaN(num) ? value : num;
          // Apply sign reversal if specified
          if (typeof value === "number" && metadata?.reverseSign) {
            value = value * -1;
          }
        } else if ((canonicalField === "debit" || canonicalField === "credit") && value !== null && value !== undefined) {
          // Ensure debit/credit are numbers
          const num = typeof value === "string" ? parseFloat(value.replace(/,/g, "")) : Number(value);
          value = isNaN(num) ? undefined : num;
          // Apply sign reversal if specified
          if (typeof value === "number" && metadata?.reverseSign) {
            value = value * -1;
          }
        }

        transformed[canonicalField] = value;
      }
    }

    // Re-apply metadata for fields that were mapped to empty/undefined values
    // This ensures metadata takes precedence over empty mapped values
    if (metadata) {
      // Restore account_code from metadata if it became empty
      if (metadata.accountCode && (!transformed.account_code || transformed.account_code === "")) {
        transformed.account_code = metadata.accountCode;
      }

      // Restore period from metadata if it became empty
      if (metadata.period && (!transformed.period || transformed.period === "")) {
        transformed.period = metadata.period;
      }

      // Restore currency from metadata if it became empty
      if (metadata.currency && (!transformed.currency || transformed.currency === "")) {
        transformed.currency = metadata.currency;
      }
    }

    return transformed;
  });
}

/**
 * Transform and validate balance data
 */
export function transformBalances(
  file: UploadedFile | null,
  mapping: ColumnMapping,
): { data: Balance[]; errors: string[] } {
  if (!file) {
    return { data: [], errors: [] };
  }

  // Auto-detect accounting system if not specified
  let accountingSystem = file.accountingSystem || "auto";
  if (accountingSystem === "auto" && file.rows.length > 0) {
    accountingSystem = detectAccountingSystem(file.headers, file.rows[0]);
  }

  const transformed = applyMapping(file.rows, mapping, file.metadata, accountingSystem);
  const errors: string[] = [];
  const validated: Balance[] = [];

  transformed.forEach((row, index) => {
    const result = balanceSchema.safeParse(row);

    if (result.success) {
      validated.push(result.data);
    } else {
      const fieldErrors = result.error.issues
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join(", ");
      errors.push(`Row ${index + 1}: ${fieldErrors}`);
    }
  });

  return { data: validated, errors };
}

/**
 * Transform and validate transaction data
 */
export function transformTransactions(
  file: UploadedFile | null,
  mapping: ColumnMapping,
): { data: Transaction[]; errors: string[] } {
  if (!file) {
    return { data: [], errors: [] };
  }

  // Auto-detect accounting system if not specified
  let accountingSystem = file.accountingSystem || "auto";
  if (accountingSystem === "auto" && file.rows.length > 0) {
    accountingSystem = detectAccountingSystem(file.headers, file.rows[0]);
  }

  const transformed = applyMapping(file.rows, mapping, file.metadata, accountingSystem);
  const errors: string[] = [];
  const validated: Transaction[] = [];

  transformed.forEach((row, index) => {
    const result = transactionSchema.safeParse(row);

    if (result.success) {
      validated.push(result.data);
    } else {
      const fieldErrors = result.error.issues
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join(", ");
      errors.push(`Row ${index + 1}: ${fieldErrors}`);
    }
  });

  return { data: validated, errors };
}

/**
 * Create complete reconciliation payload
 */
export function createReconciliationPayload(
  glBalanceFile: UploadedFile | null,
  glBalanceMapping: ColumnMapping,
  subledgerBalanceFile: UploadedFile | null,
  subledgerBalanceMapping: ColumnMapping,
  transactionsFile: UploadedFile | null,
  transactionsMapping: ColumnMapping,
): {
  payload: ReconciliationPayload | null;
  errors: string[];
} {
  const allErrors: string[] = [];

  // Transform GL balances
  const glResult = transformBalances(glBalanceFile, glBalanceMapping);
  if (glResult.errors.length > 0) {
    allErrors.push(...glResult.errors.map((err) => `GL Balance: ${err}`));
  }

  // Transform subledger balances
  const subledgerResult = transformBalances(
    subledgerBalanceFile,
    subledgerBalanceMapping,
  );
  if (subledgerResult.errors.length > 0) {
    allErrors.push(
      ...subledgerResult.errors.map((err) => `Subledger Balance: ${err}`),
    );
  }

  // Transform transactions (optional)
  const transactionsResult = transformTransactions(
    transactionsFile,
    transactionsMapping,
  );
  if (transactionsResult.errors.length > 0) {
    allErrors.push(
      ...transactionsResult.errors.map((err) => `Transaction: ${err}`),
    );
  }

  // Check minimum requirements
  if (glResult.data.length === 0) {
    allErrors.push("GL Balance: No valid rows found");
  }

  if (subledgerResult.data.length === 0) {
    allErrors.push("Subledger Balance: No valid rows found");
  }

  // If critical errors, return null
  if (
    glResult.data.length === 0 ||
    subledgerResult.data.length === 0
  ) {
    return { payload: null, errors: allErrors };
  }

  // Extract unique periods
  const periods = new Set<string>();
  glResult.data.forEach((row) => {
    if (row.period) periods.add(row.period);
  });
  subledgerResult.data.forEach((row) => {
    if (row.period) periods.add(row.period);
  });

  const orderedPeriods = Array.from(periods).sort();

  const payload: ReconciliationPayload = {
    glBalances: glResult.data,
    subledgerBalances: subledgerResult.data,
    transactions: transactionsResult.data.length > 0 ? transactionsResult.data : undefined,
    orderedPeriods: orderedPeriods.length > 0 ? orderedPeriods : undefined,
  };

  return { payload, errors: allErrors };
}

/**
 * Validate that mappings are sufficient
 */
export function validateMappings(mapping: ColumnMapping, requiredFields: string[]): {
  valid: boolean;
  missingFields: string[];
} {
  const mappedFields = new Set(Object.keys(mapping).filter((key) => mapping[key]));
  const missing = requiredFields.filter((field) => !mappedFields.has(field));

  return {
    valid: missing.length === 0,
    missingFields: missing,
  };
}

/**
 * Get mapping completion percentage
 */
export function getMappingCompletion(
  mapping: ColumnMapping,
  totalFields: number,
): number {
  const mappedCount = Object.values(mapping).filter(Boolean).length;
  return Math.round((mappedCount / totalFields) * 100);
}

// ============================================
// Optimized Batch Processing Functions
// ============================================

/**
 * Transform and validate balance data with batching (optimized for large datasets)
 * Uses batch processing to avoid blocking the event loop
 *
 * @param file - Uploaded file with rows
 * @param mapping - Column mapping
 * @param options - Batch processing options
 * @returns Promise with validated data and errors
 */
export async function transformBalancesBatched(
  file: UploadedFile | null,
  mapping: ColumnMapping,
  options?: BatchOptions,
): Promise<{ data: Balance[]; errors: string[] }> {
  if (!file) {
    return { data: [], errors: [] };
  }

  // For small datasets, use synchronous version
  if (!shouldUseBatching(file.rows.length)) {
    return transformBalances(file, mapping);
  }

  // Auto-detect accounting system if not specified
  let accountingSystem = file.accountingSystem || "auto";
  if (accountingSystem === "auto" && file.rows.length > 0) {
    accountingSystem = detectAccountingSystem(file.headers, file.rows[0]);
  }

  // Transform rows (still synchronous, but fast)
  const transformed = applyMapping(file.rows, mapping, file.metadata, accountingSystem);

  // Validate in batches (this is where batching helps most)
  const batchSize = options?.batchSize || calculateOptimalBatchSize(transformed.length);

  const result = await processBatchWithValidation(
    transformed,
    (row, index) => {
      const validationResult = balanceSchema.safeParse(row);

      if (validationResult.success) {
        return { success: true, data: validationResult.data };
      } else {
        const fieldErrors = validationResult.error.issues
          .map((err) => `${err.path.join(".")}: ${err.message}`)
          .join(", ");
        return { success: false, error: `Row ${index + 1}: ${fieldErrors}` };
      }
    },
    { batchSize, ...options }
  );

  return {
    data: result.data,
    errors: result.errors.map(e => e.error),
  };
}

/**
 * Transform and validate transaction data with batching (optimized for large datasets)
 * Uses batch processing to avoid blocking the event loop
 *
 * @param file - Uploaded file with rows
 * @param mapping - Column mapping
 * @param options - Batch processing options
 * @returns Promise with validated data and errors
 */
export async function transformTransactionsBatched(
  file: UploadedFile | null,
  mapping: ColumnMapping,
  options?: BatchOptions,
): Promise<{ data: Transaction[]; errors: string[] }> {
  if (!file) {
    return { data: [], errors: [] };
  }

  // For small datasets, use synchronous version
  if (!shouldUseBatching(file.rows.length)) {
    return transformTransactions(file, mapping);
  }

  // Auto-detect accounting system if not specified
  let accountingSystem = file.accountingSystem || "auto";
  if (accountingSystem === "auto" && file.rows.length > 0) {
    accountingSystem = detectAccountingSystem(file.headers, file.rows[0]);
  }

  // Transform rows
  const transformed = applyMapping(file.rows, mapping, file.metadata, accountingSystem);

  // Validate in batches
  const batchSize = options?.batchSize || calculateOptimalBatchSize(transformed.length);

  const result = await processBatchWithValidation(
    transformed,
    (row, index) => {
      const validationResult = transactionSchema.safeParse(row);

      if (validationResult.success) {
        return { success: true, data: validationResult.data };
      } else {
        const fieldErrors = validationResult.error.issues
          .map((err) => `${err.path.join(".")}: ${err.message}`)
          .join(", ");
        return { success: false, error: `Row ${index + 1}: ${fieldErrors}` };
      }
    },
    { batchSize, ...options }
  );

  return {
    data: result.data,
    errors: result.errors.map(e => e.error),
  };
}

/**
 * Create complete reconciliation payload with batching (optimized for large datasets)
 * Uses async batch processing for better performance with large files
 *
 * @param glBalanceFile - GL balance file
 * @param glBalanceMapping - GL balance mapping
 * @param subledgerBalanceFile - Subledger balance file
 * @param subledgerBalanceMapping - Subledger balance mapping
 * @param transactionsFile - Transactions file (optional)
 * @param transactionsMapping - Transactions mapping
 * @param options - Batch processing options
 * @returns Promise with payload and errors
 */
export async function createReconciliationPayloadBatched(
  glBalanceFile: UploadedFile | null,
  glBalanceMapping: ColumnMapping,
  subledgerBalanceFile: UploadedFile | null,
  subledgerBalanceMapping: ColumnMapping,
  transactionsFile: UploadedFile | null,
  transactionsMapping: ColumnMapping,
  options?: BatchOptions,
): Promise<{
  payload: ReconciliationPayload | null;
  errors: string[];
}> {
  const allErrors: string[] = [];

  // Transform GL balances (with batching if large)
  const glResult = await transformBalancesBatched(glBalanceFile, glBalanceMapping, options);
  if (glResult.errors.length > 0) {
    allErrors.push(...glResult.errors.map((err) => `GL Balance: ${err}`));
  }

  // Transform subledger balances (with batching if large)
  const subledgerResult = await transformBalancesBatched(
    subledgerBalanceFile,
    subledgerBalanceMapping,
    options,
  );
  if (subledgerResult.errors.length > 0) {
    allErrors.push(
      ...subledgerResult.errors.map((err) => `Subledger Balance: ${err}`),
    );
  }

  // Transform transactions (with batching if large, optional)
  const transactionsResult = await transformTransactionsBatched(
    transactionsFile,
    transactionsMapping,
    options,
  );
  if (transactionsResult.errors.length > 0) {
    allErrors.push(
      ...transactionsResult.errors.map((err) => `Transaction: ${err}`),
    );
  }

  // Check minimum requirements
  if (glResult.data.length === 0) {
    allErrors.push("GL Balance: No valid rows found");
  }

  if (subledgerResult.data.length === 0) {
    allErrors.push("Subledger Balance: No valid rows found");
  }

  // If critical errors, return null
  if (
    glResult.data.length === 0 ||
    subledgerResult.data.length === 0
  ) {
    return { payload: null, errors: allErrors };
  }

  // Extract unique periods
  const periods = new Set<string>();
  glResult.data.forEach((row) => {
    if (row.period) periods.add(row.period);
  });
  subledgerResult.data.forEach((row) => {
    if (row.period) periods.add(row.period);
  });

  const orderedPeriods = Array.from(periods).sort();

  const payload: ReconciliationPayload = {
    glBalances: glResult.data,
    subledgerBalances: subledgerResult.data,
    transactions: transactionsResult.data.length > 0 ? transactionsResult.data : undefined,
    orderedPeriods: orderedPeriods.length > 0 ? orderedPeriods : undefined,
  };

  return { payload, errors: allErrors };
}
