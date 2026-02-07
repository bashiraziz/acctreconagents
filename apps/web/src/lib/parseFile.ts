/**
 * CSV/TSV/TXT parsing utility using PapaParse
 */

import Papa from "papaparse";
import type { UploadedFile, FileType } from "@/types/reconciliation";
import type { RawCSVRow } from "@/types/csv";

export type ParseResult = {
  success: boolean;
  data?: UploadedFile;
  error?: string;
};

/**
 * Parse a CSV, TSV, or TXT file
 */
export async function parseCSVFile(
  file: File,
  fileType: FileType,
): Promise<ParseResult> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true, // First row is headers
      dynamicTyping: true, // Auto-convert numbers
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim(), // Clean headers
      complete: (results) => {
        if (results.errors.length > 0) {
          const errorMessages = results.errors
            .map((err) => `Row ${err.row}: ${err.message}`)
            .join(", ");
          resolve({
            success: false,
            error: `Parse errors: ${errorMessages}`,
          });
          return;
        }

        if (!results.data || results.data.length === 0) {
          resolve({
            success: false,
            error: "File is empty or has no data rows",
          });
          return;
        }

        const headers = results.meta.fields || [];
        const rows = results.data as RawCSVRow[];

        const uploadedFile: UploadedFile = {
          id: `file_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          name: file.name,
          type: fileType,
          size: file.size,
          uploadedAt: Date.now(),
          rowCount: rows.length,
          columnCount: headers.length,
          headers,
          rows,
        };

        resolve({
          success: true,
          data: uploadedFile,
        });
      },
      error: (error) => {
        resolve({
          success: false,
          error: `Failed to parse file: ${error.message}`,
        });
      },
    });
  });
}

/**
 * Get first N rows for preview
 */
export function getPreviewRows(
  file: UploadedFile,
  limit: number = 5,
): RawCSVRow[] {
  return file.rows.slice(0, limit);
}

/**
 * Detect likely column mappings based on header names
 */
export function suggestColumnMappings(
  headers: string[],
  canonicalFields: string[],
): Record<string, string> {
  const suggestions: Record<string, string> = {};
  const allowedFields = new Set(canonicalFields);

  // Common patterns for account code
  const accountPatterns = [
    /account.*code/i,
    /account.*number/i,
    /account.*no/i,
    /^account$/i,
    /acct.*code/i,
    /gl.*account/i,
  ];

  // Common patterns for period
  const periodPatterns = [
    /period/i,
    /month/i,
    /date/i,
    /posting.*date/i,
    /fiscal.*period/i,
  ];

  // Common patterns for amount
  const amountPatterns = [
    /^amount$/i,
    /balance/i,
    /total/i,
    /value/i,
    /debit/i,
    /credit/i,
  ];

  // Common patterns for currency
  const currencyPatterns = [
    /currency/i,
    /curr/i,
    /ccy/i,
  ];

  // Common patterns for description/narrative
  const descriptionPatterns = [
    /description/i,
    /narrative/i,
    /memo/i,
    /comment/i,
    /note/i,
  ];

  // Common patterns for booked_at
  const bookedAtPatterns = [
    /booked.*at/i,
    /transaction.*date/i,
    /posting.*date/i,
    /entry.*date/i,
    /date/i,
  ];

  for (const header of headers) {
    // Try to match account_code
    if (
      allowedFields.has("account_code") &&
      accountPatterns.some((pattern) => pattern.test(header))
    ) {
      suggestions.account_code = header;
    }

    // Try to match period
    if (allowedFields.has("period") && periodPatterns.some((pattern) => pattern.test(header))) {
      suggestions.period = header;
    }

    // Try to match amount
    if (
      allowedFields.has("amount") &&
      amountPatterns.some((pattern) => pattern.test(header))
    ) {
      if (!suggestions.amount) {
        suggestions.amount = header;
      }
    }

    // Try to match currency
    if (
      allowedFields.has("currency") &&
      currencyPatterns.some((pattern) => pattern.test(header))
    ) {
      suggestions.currency = header;
    }

    // Try to match description
    if (
      allowedFields.has("description") &&
      descriptionPatterns.some((pattern) => pattern.test(header))
    ) {
      suggestions.description = header;
    }

    // Try to match booked_at
    if (
      allowedFields.has("booked_at") &&
      bookedAtPatterns.some((pattern) => pattern.test(header))
    ) {
      suggestions.booked_at = header;
    }
  }

  return suggestions;
}

/**
 * Validate that required fields are mappable
 */
export function validateHeaders(
  headers: string[],
  requiredFields: string[],
): { valid: boolean; missing: string[] } {
  const suggestions = suggestColumnMappings(headers, requiredFields);
  const mappedFields = Object.keys(suggestions);
  const missing = requiredFields.filter((field) => !mappedFields.includes(field));

  return {
    valid: missing.length === 0,
    missing,
  };
}
