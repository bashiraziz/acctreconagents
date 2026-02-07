/**
 * NetSuite/Oracle Parser Plugin
 * Handles NetSuite CSV format with multi-currency and dimensional data
 */

import { BaseAccountingParser, type DetectionResult } from "./base-parser";
import type { RawCSVRow, ParsedCSVRow, CSVValue } from "@/types/csv";
import type { AccountingSystem } from "@/types/reconciliation";

export class NetSuiteParser extends BaseAccountingParser {
  readonly name: AccountingSystem = "netsuite";
  readonly displayName = "NetSuite / Oracle";
  readonly description = "Oracle NetSuite ERP and Cloud Platform";

  /**
   * Detect NetSuite format by looking for dimensional columns and base currency
   */
  detect(headers: string[], firstRow: RawCSVRow): DetectionResult {
    void firstRow;
    const hasDimensional = this.hasHeaders(headers, [
      "subsidiary",
      "department",
      "class",
      "location"
    ]);

    const hasBaseCurrency = this.hasHeaders(headers, [
      "base currency",
      "amount (base currency)"
    ]);

    if (hasDimensional && hasBaseCurrency) {
      return {
        confidence: 0.95,
        reason: "Dimensional columns and base currency detected"
      };
    }

    if (hasDimensional || hasBaseCurrency) {
      return {
        confidence: 0.7,
        reason: "NetSuite-style columns detected"
      };
    }

    return { confidence: 0 };
  }

  /**
   * Parse NetSuite CSV row
   * - Handles multi-currency (prefers "Amount (Base Currency)")
   * - Aggregates dimensional data (Subsidiary, Department, Class)
   * - Supports both detailed and aggregated views
   */
  parseRow(row: RawCSVRow): ParsedCSVRow {
    const parsed: ParsedCSVRow = { ...row };

    for (const [key, value] of Object.entries(row)) {
      const keyLower = key.toLowerCase();

      // Prefer base currency amount over local currency
      if (keyLower.includes("base currency") && keyLower.includes("amount")) {
        const amount = this.extractNumber(value);
        if (amount !== undefined) {
          parsed.amount = amount;
        }
      }
      // Handle account code/name
      else if (keyLower.includes("account") && !keyLower.includes("amount")) {
        const accountCode = this.extractAccountCode(value);
        if (accountCode) {
          parsed.account_code = accountCode;
        }
        if (typeof value === "string") {
          parsed.account_name = value;
        }
      }
      // Handle period format (NetSuite may use "Dec 2025" format)
      else if (keyLower.includes("period")) {
        const period = this.parseNetSuitePeriod(value);
        if (period) {
          parsed.period = period;
        }
      }
      // Handle date fields
      else if (keyLower.includes("date")) {
        const period = this.parseDate(value);
        if (period) {
          parsed.period = period;
        }
      }
      // Store dimensional data
      else if (keyLower.includes("subsidiary") || keyLower.includes("department") ||
               keyLower.includes("class") || keyLower.includes("location")) {
        parsed[key] = value;
      }
    }

    return parsed;
  }

  /**
   * Parse NetSuite-specific period format: "Dec 2025" → "2025-12"
   */
  private parseNetSuitePeriod(value: CSVValue): string | undefined {
    if (typeof value !== "string") {
      return undefined;
    }

    const monthMap: Record<string, string> = {
      jan: "01", feb: "02", mar: "03", apr: "04",
      may: "05", jun: "06", jul: "07", aug: "08",
      sep: "09", oct: "10", nov: "11", dec: "12",
    };

    const match = value.match(/^([A-Za-z]{3})\s+(\d{4})$/);
    if (match) {
      const month = monthMap[match[1].toLowerCase()];
      if (month) {
        return `${match[2]}-${month}`;
      }
    }

    return undefined;
  }
}
