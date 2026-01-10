/**
 * Type definitions for CSV data processing
 * Replaces unsafe Record<string, any> with properly typed interfaces
 */

/**
 * Represents a value that can appear in a CSV cell
 */
export type CSVValue = string | number | null | undefined;

/**
 * Raw CSV row as parsed from the file
 * Keys are column names, values can be strings, numbers, or null
 */
export interface RawCSVRow {
  [key: string]: CSVValue;
}

/**
 * Parsed CSV row after accounting system-specific transformations
 * Contains standardized fields that all parsers should produce
 */
export interface ParsedCSVRow extends RawCSVRow {
  /** Standardized account code */
  account_code?: string;
  /** Account name/description */
  account_name?: string;
  /** Monetary amount (positive = debit, negative = credit) */
  amount?: number;
  /** Accounting period (YYYY-MM format) */
  period?: string;
  /** Transaction date (ISO 8601 format) */
  transaction_date?: string;
  /** Entity or subsidiary identifier */
  entity?: string;
  /** Any additional metadata */
  [key: string]: CSVValue;
}

/**
 * CSV file parse result
 */
export interface CSVParseResult {
  /** Column headers from the CSV file */
  headers: string[];
  /** Parsed data rows */
  rows: RawCSVRow[];
  /** Total number of rows (excluding header) */
  rowCount: number;
}

/**
 * Type guard to check if a value is a valid CSV value
 */
export function isCSVValue(value: unknown): value is CSVValue {
  return (
    typeof value === 'string' ||
    typeof value === 'number' ||
    value === null ||
    value === undefined
  );
}

/**
 * Type guard to check if an object is a valid CSV row
 */
export function isCSVRow(obj: unknown): obj is RawCSVRow {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }
  return Object.values(obj).every(isCSVValue);
}
