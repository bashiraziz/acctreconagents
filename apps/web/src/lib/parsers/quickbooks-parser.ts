/**
 * QuickBooks Parser Plugin
 * Handles QuickBooks CSV format with parenthetical account codes
 */

import { BaseAccountingParser, type DetectionResult } from "./base-parser";
import type { RawCSVRow, ParsedCSVRow } from "@/types/csv";
import type { AccountingSystem } from "@/types/reconciliation";

export class QuickBooksParser extends BaseAccountingParser {
  readonly name: AccountingSystem = "quickbooks";
  readonly displayName = "QuickBooks";
  readonly description = "Intuit QuickBooks Online and Desktop";

  /**
   * Detect QuickBooks format by looking for parenthetical account codes
   * Format: "Accounts Payable (2000)"
   */
  detect(headers: string[], firstRow: RawCSVRow): DetectionResult {
    const accountField = this.findHeader(headers, ["account"]);

    if (!accountField || !firstRow[accountField]) {
      return { confidence: 0, reason: "No account column found" };
    }

    const value = String(firstRow[accountField]);

    // QuickBooks uses format: "Account Name (CODE)"
    if (/^[^(]+\(\d+\)$/.test(value)) {
      return {
        confidence: 0.95,
        reason: "Parenthetical account code format detected"
      };
    }

    // Partial match: has account column but format doesn't match perfectly
    if (this.hasHeaders(headers, ["account"])) {
      return {
        confidence: 0.3,
        reason: "Has account column but format uncertain"
      };
    }

    return { confidence: 0 };
  }

  /**
   * Parse QuickBooks CSV row
   * - Extracts account codes from parenthetical format: "Accounts Payable (2000)" → "2000"
   * - Handles comma-formatted numbers: "-52,850.00" → -52850
   * - Converts US date format: "12/31/2025" → "2025-12"
   */
  parseRow(row: RawCSVRow): ParsedCSVRow {
    const parsed: ParsedCSVRow = { ...row };

    for (const [key, value] of Object.entries(row)) {
      const keyLower = key.toLowerCase();

      if (keyLower.includes("account")) {
        // Extract code from "Account Name (CODE)" format
        const accountCode = this.extractAccountCode(value);
        if (accountCode) {
          parsed.account_code = accountCode;

          // Extract account name by removing the code part
          if (typeof value === "string") {
            parsed.account_name = value.replace(/\s*\(\d+\)/, "").trim();
          }
        }
      } else if (keyLower.includes("amount") || keyLower.includes("balance")) {
        // Parse comma-formatted numbers
        const amount = this.extractNumber(value);
        if (amount !== undefined) {
          parsed.amount = amount;
        }
      } else if (keyLower.includes("date") || keyLower.includes("period")) {
        // Convert US date format to YYYY-MM
        const period = this.parseDate(value, "US");
        if (period) {
          parsed.period = period;
        }
      }
    }

    return parsed;
  }
}
