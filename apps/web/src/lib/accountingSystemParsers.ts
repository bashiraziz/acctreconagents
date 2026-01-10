/**
 * Accounting System Parsers - Plugin Registry
 * Centralized parser management using the plugin system
 */

import { parserRegistry } from "./parsers/base-parser";
import { QuickBooksParser } from "./parsers/quickbooks-parser";
import { CostpointParser } from "./parsers/costpoint-parser";
import { NetSuiteParser } from "./parsers/netsuite-parser";
import { SAPParser } from "./parsers/sap-parser";
import { DynamicsParser } from "./parsers/dynamics-parser";
import { XeroParser } from "./parsers/xero-parser";
import { GenericParser } from "./parsers/generic-parser";
import type { AccountingSystem } from "@/types/reconciliation";
import type { RawCSVRow, ParsedCSVRow } from "@/types/csv";

// ============================================
// Register All Parsers
// ============================================

// Register all parsers in the global registry
parserRegistry.register(new QuickBooksParser());
parserRegistry.register(new CostpointParser());
parserRegistry.register(new NetSuiteParser());
parserRegistry.register(new SAPParser());
parserRegistry.register(new DynamicsParser());
parserRegistry.register(new XeroParser());
parserRegistry.register(new GenericParser());

// ============================================
// Public API (Backward Compatible)
// ============================================

/**
 * Auto-detect accounting system based on CSV headers and content patterns
 * Uses the parser registry to find the best match
 */
export function detectAccountingSystem(
  headers: string[],
  firstRow: RawCSVRow
): AccountingSystem {
  const result = parserRegistry.detect(headers, firstRow);

  if (result) {
    return result.parser.name;
  }

  // Fallback to generic if no parser detected
  return "generic";
}

/**
 * Apply system-specific parsing to a row based on detected/selected accounting system
 * Uses the parser registry to look up the appropriate parser
 */
export function parseRowForAccountingSystem(
  row: RawCSVRow,
  accountingSystem: AccountingSystem
): ParsedCSVRow {
  // Handle "auto" by using the generic parser
  if (accountingSystem === "auto") {
    accountingSystem = "generic";
  }

  // Get parser from registry
  const parser = parserRegistry.get(accountingSystem);

  if (parser) {
    return parser.parseRow(row);
  }

  // Fallback to generic parser
  const genericParser = parserRegistry.get("generic");
  if (genericParser) {
    return genericParser.parseRow(row);
  }

  // Ultimate fallback - return row as-is
  return row;
}

// ============================================
// Backward Compatible Individual Parser Functions
// (Deprecated - Use parseRowForAccountingSystem instead)
// ============================================

/**
 * @deprecated Use parseRowForAccountingSystem with "quickbooks" instead
 */
export function parseQuickBooksRow(row: RawCSVRow): ParsedCSVRow {
  return parseRowForAccountingSystem(row, "quickbooks");
}

/**
 * @deprecated Use parseRowForAccountingSystem with "costpoint" instead
 */
export function parseCostpointRow(row: RawCSVRow): ParsedCSVRow {
  return parseRowForAccountingSystem(row, "costpoint");
}

/**
 * @deprecated Use parseRowForAccountingSystem with "netsuite" instead
 */
export function parseNetSuiteRow(row: RawCSVRow): ParsedCSVRow {
  return parseRowForAccountingSystem(row, "netsuite");
}

/**
 * @deprecated Use parseRowForAccountingSystem with "sap" instead
 */
export function parseSAPRow(row: RawCSVRow): ParsedCSVRow {
  return parseRowForAccountingSystem(row, "sap");
}

/**
 * @deprecated Use parseRowForAccountingSystem with "dynamics" instead
 */
export function parseDynamicsRow(row: RawCSVRow): ParsedCSVRow {
  return parseRowForAccountingSystem(row, "dynamics");
}

/**
 * @deprecated Use parseRowForAccountingSystem with "xero" instead
 */
export function parseXeroRow(row: RawCSVRow): ParsedCSVRow {
  return parseRowForAccountingSystem(row, "xero");
}

// ============================================
// Export Registry for Advanced Use
// ============================================

/**
 * Export the parser registry for advanced usage
 * Allows direct access to parser detection and registration
 */
export { parserRegistry };
