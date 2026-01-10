/**
 * Costpoint/Deltek Parser Plugin
 * Handles Costpoint CSV format with Debit/Credit columns
 */

import { BaseAccountingParser, type DetectionResult } from "./base-parser";
import type { RawCSVRow, ParsedCSVRow } from "@/types/csv";
import type { AccountingSystem } from "@/types/reconciliation";

export class CostpointParser extends BaseAccountingParser {
  readonly name: AccountingSystem = "costpoint";
  readonly displayName = "Costpoint / Deltek";
  readonly description = "Deltek Costpoint ERP system";

  /**
   * Detect Costpoint format by looking for Debit and Credit columns
   */
  detect(headers: string[], firstRow: RawCSVRow): DetectionResult {
    const hasDebit = this.hasHeaders(headers, ["debit", "debit amount"]);
    const hasCredit = this.hasHeaders(headers, ["credit", "credit amount"]);

    if (hasDebit && hasCredit) {
      return {
        confidence: 0.9,
        reason: "Debit and Credit columns detected"
      };
    }

    if (hasDebit || hasCredit) {
      return {
        confidence: 0.4,
        reason: "Partial Debit/Credit column match"
      };
    }

    return { confidence: 0 };
  }

  /**
   * Parse Costpoint CSV row
   * - Handles Debit/Credit columns with sign conventions
   * - Supports both GL (Debit/Credit) and subledger (Amount) formats
   * - Formula: Debit - Credit gives correct accounting convention
   */
  parseRow(row: RawCSVRow): ParsedCSVRow {
    const parsed: ParsedCSVRow = { ...row };

    let debit: number | undefined;
    let credit: number | undefined;
    let hasDebitCredit = false;

    for (const [key, value] of Object.entries(row)) {
      const keyLower = key.toLowerCase();

      // Parse Debit column
      if (keyLower === "debit" || keyLower === "debit amount") {
        hasDebitCredit = true;
        const num = this.extractNumber(value);
        debit = num !== undefined ? Math.abs(num) : 0;
      }
      // Parse Credit column
      else if (keyLower === "credit" || keyLower === "credit amount") {
        hasDebitCredit = true;
        const num = this.extractNumber(value);
        credit = num !== undefined ? Math.abs(num) : 0;
      }
      // Handle Amount column (for subledger files)
      else if (keyLower === "amount") {
        const num = this.extractNumber(value);
        if (num !== undefined) {
          // Costpoint subledgers show amounts as positive, but they represent liabilities
          // We need to negate them to match accounting convention
          parsed.amount = -Math.abs(num);
        }
      }
      // Handle account codes
      else if (keyLower.includes("account")) {
        const accountCode = this.extractAccountCode(value);
        if (accountCode) {
          parsed.account_code = accountCode;
        }
      }
      // Handle dates
      else if (keyLower.includes("date") || keyLower.includes("period")) {
        const period = this.parseDate(value);
        if (period) {
          parsed.period = period;
        }
      }
    }

    // Calculate amount from Debit - Credit if we have those columns
    if (hasDebitCredit && debit !== undefined && credit !== undefined) {
      parsed.amount = debit - credit;
    }

    return parsed;
  }
}
