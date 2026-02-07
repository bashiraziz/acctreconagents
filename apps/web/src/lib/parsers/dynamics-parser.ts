/**
 * Microsoft Dynamics 365 Finance Parser Plugin
 * Handles Dynamics CSV format with Main Account and Financial Dimensions
 */

import { BaseAccountingParser, type DetectionResult } from "./base-parser";
import type { RawCSVRow, ParsedCSVRow } from "@/types/csv";
import type { AccountingSystem } from "@/types/reconciliation";

export class DynamicsParser extends BaseAccountingParser {
  readonly name: AccountingSystem = "dynamics";
  readonly displayName = "Microsoft Dynamics 365";
  readonly description = "Microsoft Dynamics 365 Finance and Operations";

  /**
   * Detect Dynamics format by looking for Ledger Account with dimensions
   */
  detect(headers: string[], firstRow: RawCSVRow): DetectionResult {
    void firstRow;
    const hasLedgerAccount = this.hasHeaders(headers, [
      "ledger account",
      "main account"
    ]);

    const hasDimensionSet = this.hasHeaders(headers, [
      "costcenter",
      "cost center",
      "businessunit",
      "business unit",
      "dimension",
      "department"
    ]);

    const hasAccountingCurrency = this.hasHeaders(headers, [
      "accounting currency",
      "accounting currency amount"
    ]);

    if (hasLedgerAccount && hasDimensionSet) {
      return {
        confidence: 0.95,
        reason: "Ledger account and financial dimensions detected"
      };
    }

    if (hasLedgerAccount || hasAccountingCurrency) {
      return {
        confidence: 0.7,
        reason: "Dynamics-style columns detected"
      };
    }

    return { confidence: 0 };
  }

  /**
   * Parse Dynamics CSV row
   * - Handles Main Account + Dimensions (separated by -)
   * - Financial dimension sets (Department, Cost Center, Project)
   * - Supports both detailed and summarized exports
   * - Calculates amount from Debit - Credit
   */
  parseRow(row: RawCSVRow): ParsedCSVRow {
    const parsed: ParsedCSVRow = { ...row };
    let debit: number | undefined;
    let credit: number | undefined;

    for (const [key, value] of Object.entries(row)) {
      const keyLower = key.toLowerCase();

      // Handle "Ledger account" or "Main account" field
      if (keyLower.includes("ledger account") || keyLower.includes("main account")) {
        if (typeof value === "string") {
          // Dynamics often uses format: "MainAccount-Dimension1-Dimension2-..."
          // Extract just the main account (first segment)
          const segments = value.split("-");
          parsed.account_code = segments[0].trim();

          // Store full dimensional account if needed
          if (segments.length > 1) {
            parsed.dimensional_account = value;
          }
        } else {
          parsed.account_code = String(value).trim();
        }
      }

      // Handle Debit/Credit columns
      if (keyLower === "debit" || keyLower === "debit amount") {
        const num = this.extractNumber(value);
        debit = num !== undefined ? Math.abs(num) : 0;
        parsed.debit = debit;
      } else if (keyLower === "credit" || keyLower === "credit amount") {
        const num = this.extractNumber(value);
        credit = num !== undefined ? Math.abs(num) : 0;
        parsed.credit = credit;
      }

      // Handle "Accounting currency amount" (standard amount column)
      if (keyLower.includes("accounting currency amount") ||
          (keyLower.includes("amount") && !keyLower.includes("reporting") && !parsed.amount)) {
        const amount = this.extractNumber(value);
        if (amount !== undefined) {
          parsed.amount = amount;
        }
      }

      // Financial dimensions - store for aggregation
      if (keyLower.includes("department") || keyLower.includes("costcenter") ||
          keyLower.includes("cost center") || keyLower.includes("project") ||
          keyLower.includes("businessunit") || keyLower.includes("business unit")) {
        parsed[key] = value;
      }

      // Handle dates
      if (keyLower.includes("date") || keyLower.includes("period")) {
        const period = this.parseDate(value);
        if (period) {
          parsed.period = period;
        }
      }
    }

    // Calculate amount from Debit - Credit if we have those
    if (debit !== undefined && credit !== undefined && parsed.amount === undefined) {
      parsed.amount = debit - credit;
    }

    return parsed;
  }
}
