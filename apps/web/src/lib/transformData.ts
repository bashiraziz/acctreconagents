/**
 * Data transformation utility
 * Applies column mappings and validates with Zod
 */

import { z } from "zod";
import type {
  UploadedFile,
  ColumnMapping,
  Balance,
  Transaction,
  ReconciliationPayload,
} from "@/types/reconciliation";

// ============================================
// Zod Schemas (same as backend)
// ============================================

const balanceSchema = z.object({
  account_code: z.string().min(1, "Account code is required"),
  period: z.string().optional(),
  amount: z.number(),
  currency: z.string().optional(),
});

const transactionSchema = z.object({
  account_code: z.string().min(1, "Account code is required"),
  booked_at: z.union([z.string(), z.date()]),
  debit: z.number().optional(),
  credit: z.number().optional(),
  amount: z.number().optional(),
  narrative: z.string().optional(),
  source_period: z.string().optional(),
});

// ============================================
// Transform Functions
// ============================================

/**
 * Apply column mapping to raw CSV data and inject metadata
 */
export function applyMapping(
  rows: Record<string, any>[],
  mapping: ColumnMapping,
  metadata?: { accountCode?: string; period?: string },
): Record<string, any>[] {
  return rows.map((row) => {
    const transformed: Record<string, any> = {};

    for (const [canonicalField, sourceColumn] of Object.entries(mapping)) {
      if (sourceColumn && row[sourceColumn] !== undefined) {
        let value = row[sourceColumn];

        // Type conversions to ensure data matches schema
        if (canonicalField === "account_code" && value !== null && value !== undefined) {
          // Ensure account_code is always a string (PapaParse may convert numeric codes to numbers)
          value = String(value);
        } else if (canonicalField === "amount" && value !== null && value !== undefined) {
          // Ensure amount is always a number
          const num = typeof value === "string" ? parseFloat(value.replace(/,/g, "")) : Number(value);
          value = isNaN(num) ? value : num;
        } else if ((canonicalField === "debit" || canonicalField === "credit") && value !== null && value !== undefined) {
          // Ensure debit/credit are numbers
          const num = typeof value === "string" ? parseFloat(value.replace(/,/g, "")) : Number(value);
          value = isNaN(num) ? undefined : num;
        }

        transformed[canonicalField] = value;
      }
    }

    // Inject metadata for fields not mapped from source columns
    if (metadata) {
      // Add account_code from metadata if not already mapped
      if (metadata.accountCode && !transformed.account_code) {
        transformed.account_code = metadata.accountCode;
      }

      // Add period from metadata if not already mapped
      if (metadata.period && !transformed.period) {
        transformed.period = metadata.period;
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

  const transformed = applyMapping(file.rows, mapping, file.metadata);
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

  const transformed = applyMapping(file.rows, mapping, file.metadata);
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
