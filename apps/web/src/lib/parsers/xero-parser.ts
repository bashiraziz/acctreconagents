/**
 * Xero Parser Plugin
 * Handles Xero cloud accounting CSV format
 */

import { BaseAccountingParser, type DetectionResult } from "./base-parser";
import type { RawCSVRow, ParsedCSVRow, CSVValue } from "@/types/csv";
import type { AccountingSystem } from "@/types/reconciliation";

export class XeroParser extends BaseAccountingParser {
  readonly name: AccountingSystem = "xero";
  readonly displayName = "Xero";
  readonly description = "Xero cloud accounting software";

  /**
   * Detect Xero format by looking for Account Code + Debit + Credit pattern
   */
  detect(headers: string[], firstRow: RawCSVRow): DetectionResult {
    void firstRow;
    const hasAccountCode = this.hasHeaders(headers, ["account code", "code"]);
    const hasDebit = this.hasHeaders(headers, ["debit"]);
    const hasCredit = this.hasHeaders(headers, ["credit"]);

    if (hasAccountCode && hasDebit && hasCredit) {
      return {
        confidence: 0.9,
        reason: "Account Code with Debit/Credit columns detected"
      };
    }

    if (hasAccountCode) {
      return {
        confidence: 0.5,
        reason: "Account Code column detected"
      };
    }

    return { confidence: 0 };
  }

  /**
   * Parse Xero CSV row
   * - Simple cloud accounting format
   * - Account Code + Account Name columns
   * - Debit/Credit columns or Net Movement
   * - Date format: DD MMM YYYY (e.g., "31 Dec 2025")
   * - Tracking categories for dimensional data
   */
  parseRow(row: RawCSVRow): ParsedCSVRow {
    const parsed: ParsedCSVRow = { ...row };
    let debit: number | undefined;
    let credit: number | undefined;

    for (const [key, value] of Object.entries(row)) {
      const keyLower = key.toLowerCase();

      // Account Code is typically a separate column
      if (keyLower === "account code" || keyLower === "code") {
        parsed.account_code = String(value).trim();
      }

      // Account Name
      if (keyLower === "account name" || keyLower === "account") {
        parsed.account_name = String(value).trim();
      }

      // Handle Debit column
      if (keyLower === "debit") {
        const num = this.extractNumber(value);
        debit = num !== undefined ? Math.abs(num) : 0;
      }

      // Handle Credit column
      if (keyLower === "credit") {
        const num = this.extractNumber(value);
        credit = num !== undefined ? Math.abs(num) : 0;
      }

      // Handle Net Movement or Balance
      if (keyLower.includes("net movement") || keyLower.includes("balance") ||
          (keyLower === "amount" && debit === undefined && credit === undefined)) {
        const amount = this.extractNumber(value);
        if (amount !== undefined) {
          parsed.amount = amount;
        }
      }

      // Handle Xero date format: "31 Dec 2025"
      if (keyLower.includes("date") || keyLower.includes("period")) {
        const period = this.parseXeroDate(value);
        if (period) {
          parsed.period = period;
        }
      }

      // Tracking categories (Xero's dimensional data)
      if (keyLower.includes("tracking") || keyLower.includes("category")) {
        parsed[key] = value;
      }
    }

    // Calculate amount from Debit - Credit if we have those
    if (debit !== undefined && credit !== undefined && parsed.amount === undefined) {
      parsed.amount = debit - credit;
    }

    return parsed;
  }

  /**
   * Parse Xero-specific date format: "31 Dec 2025" → "2025-12"
   */
  private parseXeroDate(value: CSVValue): string | undefined {
    if (typeof value !== "string") {
      return undefined;
    }

    const monthMap: Record<string, string> = {
      jan: "01", feb: "02", mar: "03", apr: "04",
      may: "05", jun: "06", jul: "07", aug: "08",
      sep: "09", oct: "10", nov: "11", dec: "12",
    };

    // Match format: DD MMM YYYY or D MMM YYYY
    const match = value.match(/^\d{1,2}\s+([A-Za-z]{3})\s+(\d{4})$/);
    if (match) {
      const month = monthMap[match[1].toLowerCase()];
      if (month) {
        return `${match[2]}-${month}`;
      }
    }

    return undefined;
  }
}
