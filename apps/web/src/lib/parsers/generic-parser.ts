/**
 * Generic Parser Plugin
 * Handles generic CSV format and serves as fallback for unknown systems
 */

import { BaseAccountingParser, type DetectionResult } from "./base-parser";
import type { RawCSVRow, ParsedCSVRow } from "@/types/csv";
import type { AccountingSystem } from "@/types/reconciliation";

export class GenericParser extends BaseAccountingParser {
  readonly name: AccountingSystem = "generic";
  readonly displayName = "Generic / Other";
  readonly description = "Generic CSV format or unknown accounting system";

  /**
   * Generic parser has low confidence - only used as fallback
   */
  detect(headers: string[], firstRow: RawCSVRow): DetectionResult {
    void headers;
    void firstRow;
    // Always return low confidence - this is a fallback parser
    return {
      confidence: 0.1,
      reason: "Fallback parser for unrecognized formats"
    };
  }

  /**
   * Parse generic CSV row
   * - Attempts to detect common patterns
   * - Extracts numbers from amount/balance columns
   * - Tries to parse dates in various formats
   * - Looks for account codes in account columns
   */
  parseRow(row: RawCSVRow): ParsedCSVRow {
    const parsed: ParsedCSVRow = { ...row };

    for (const [key, value] of Object.entries(row)) {
      const keyLower = key.toLowerCase();

      // Try to extract account code from any "account" column
      if (keyLower.includes("account") && !keyLower.includes("amount")) {
        const accountCode = this.extractAccountCode(value);
        if (accountCode) {
          parsed.account_code = accountCode;
        }

        // Store account name if it's a string
        if (typeof value === "string") {
          parsed.account_name = value;
        }
      }

      // Try to extract amount from any "amount" or "balance" column
      if (keyLower.includes("amount") || keyLower.includes("balance")) {
        const amount = this.extractNumber(value);
        if (amount !== undefined && parsed.amount === undefined) {
          parsed.amount = amount;
        }
      }

      // Try to parse dates from any "date" or "period" column
      if (keyLower.includes("date") || keyLower.includes("period")) {
        const period = this.parseDate(value);
        if (period && !parsed.period) {
          parsed.period = period;
        }
      }

      // Handle Debit/Credit columns if present
      if (keyLower === "debit" || keyLower === "debit amount") {
        const debit = this.extractNumber(value);
        if (debit !== undefined) {
          parsed.debit = Math.abs(debit);
        }
      }

      if (keyLower === "credit" || keyLower === "credit amount") {
        const credit = this.extractNumber(value);
        if (credit !== undefined) {
          parsed.credit = Math.abs(credit);
        }
      }

      // Store entity/company information
      if (keyLower.includes("entity") || keyLower.includes("company")) {
        parsed.entity = String(value);
      }

      // Store currency information
      if (keyLower.includes("currency") && !keyLower.includes("amount")) {
        parsed.currency = String(value);
      }
    }

    // Calculate amount from Debit - Credit if we have those and no amount
    if (typeof parsed.debit === "number" && typeof parsed.credit === "number" && parsed.amount === undefined) {
      parsed.amount = parsed.debit - parsed.credit;
    }

    return parsed;
  }
}
