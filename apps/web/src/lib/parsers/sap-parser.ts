/**
 * SAP ERP Parser Plugin
 * Handles SAP CSV format with Company Code and G/L Account structure
 */

import { BaseAccountingParser, type DetectionResult } from "./base-parser";
import type { RawCSVRow, ParsedCSVRow, CSVValue } from "@/types/csv";
import type { AccountingSystem } from "@/types/reconciliation";

export class SAPParser extends BaseAccountingParser {
  readonly name: AccountingSystem = "sap";
  readonly displayName = "SAP ERP";
  readonly description = "SAP ECC and S/4HANA systems";

  /**
   * Detect SAP format by looking for Company Code and G/L Account columns
   */
  detect(headers: string[], firstRow: RawCSVRow): DetectionResult {
    const hasCompanyCode = this.hasHeaders(headers, [
      "company code",
      "co cd",
      "co. code"
    ]);

    const hasGLAccount = this.hasHeaders(headers, [
      "g/l account",
      "gl account",
      "account"
    ]);

    const hasGCAmount = this.hasHeaders(headers, [
      "gc amount",
      "group currency",
      "amount in group currency"
    ]);

    if ((hasCompanyCode || hasGLAccount) && hasGCAmount) {
      return {
        confidence: 0.95,
        reason: "SAP-specific columns detected (Company Code/GL Account + GC Amount)"
      };
    }

    if (hasCompanyCode || hasGLAccount || hasGCAmount) {
      return {
        confidence: 0.6,
        reason: "Partial SAP column match"
      };
    }

    return { confidence: 0 };
  }

  /**
   * Parse SAP CSV row
   * - Handles Company Code + G/L Account structure
   * - Multi-currency support (LC Amount + GC Amount)
   * - Date format: YYYYMMDD or DD.MM.YYYY
   * - Document number tracking
   * - Debit/Credit indicator (S = Credit, H = Debit)
   */
  parseRow(row: RawCSVRow): ParsedCSVRow {
    const parsed: ParsedCSVRow = { ...row };

    for (const [key, value] of Object.entries(row)) {
      const keyLower = key.toLowerCase();

      // Handle Company Code + G/L Account combination
      if (keyLower.includes("company code") || keyLower.includes("co cd")) {
        parsed.company_code = value;
      } else if (keyLower.includes("g/l account") || keyLower.includes("gl account")) {
        // SAP often uses leading zeros, keep them
        parsed.account_code = String(value).trim();
      } else if (keyLower.includes("account") && !keyLower.includes("amount")) {
        if (!parsed.account_code) {
          parsed.account_code = String(value).trim();
        }
      }

      // Multi-currency: Prefer Group Currency (GC) over Local Currency (LC)
      if (keyLower.includes("gc amount") || keyLower.includes("group currency amount")) {
        const amount = this.extractNumber(value);
        if (amount !== undefined) {
          parsed.amount = amount;
        }
      } else if (!parsed.amount && (keyLower.includes("amount in loc.cur") || keyLower.includes("lc amount"))) {
        // Use local currency as fallback if no GC amount
        const amount = this.extractNumber(value);
        if (amount !== undefined) {
          parsed.amount = amount;
        }
      }

      // Handle SAP date formats
      if (keyLower.includes("posting date") || keyLower.includes("date")) {
        const period = this.parseSAPDate(value);
        if (period) {
          parsed.period = period;
        }
      }

      // Handle Debit/Credit indicator (S = Credit, H = Debit in some SAP exports)
      if (keyLower.includes("debit/credit") || keyLower.includes("d/c") || keyLower === "dc") {
        if (value === "S" || value === "C") {
          // Credit indicator - amount should be negative for liabilities
          if (parsed.amount && parsed.amount > 0) {
            parsed.amount = -parsed.amount;
          }
        }
      }

      // Store document number if present
      if (keyLower.includes("document number") || keyLower.includes("doc no")) {
        parsed.document_number = String(value);
      }
    }

    return parsed;
  }

  /**
   * Parse SAP-specific date formats
   * - YYYYMMDD (compact format)
   * - DD.MM.YYYY (German format)
   */
  private parseSAPDate(value: CSVValue): string | undefined {
    if (typeof value !== "string") {
      return undefined;
    }

    // Format: YYYYMMDD
    if (/^\d{8}$/.test(value)) {
      const year = value.substring(0, 4);
      const month = value.substring(4, 6);
      return `${year}-${month}`;
    }

    // Format: DD.MM.YYYY
    if (/^\d{2}\.\d{2}\.\d{4}$/.test(value)) {
      const parts = value.split(".");
      return `${parts[2]}-${parts[1]}`;
    }

    return undefined;
  }
}
