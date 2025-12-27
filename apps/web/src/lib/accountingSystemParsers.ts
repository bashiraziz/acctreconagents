/**
 * System-specific CSV parsers for different accounting platforms
 * Ported from Claude Skills (skills/ directory) for frontend use
 */

import type { AccountingSystem } from "@/types/reconciliation";

// ============================================
// Auto-Detection Logic
// ============================================

/**
 * Auto-detect accounting system based on CSV headers and content patterns
 */
export function detectAccountingSystem(
  headers: string[],
  firstRow: Record<string, any>
): AccountingSystem {
  const headerLower = headers.map((h) => h.toLowerCase());

  // QuickBooks: Look for parenthetical account codes
  if (headerLower.some((h) => h.includes("account"))) {
    const accountField = headers.find((h) => h.toLowerCase().includes("account"));
    if (accountField && firstRow[accountField]) {
      const value = String(firstRow[accountField]);
      // QuickBooks uses format: "Accounts Payable (2000)"
      if (/^[^(]+\(\d+\)$/.test(value)) {
        return "quickbooks";
      }
    }
  }

  // Costpoint: Look for Debit and Credit columns
  const hasDebit = headerLower.some((h) => h === "debit" || h === "debit amount");
  const hasCredit = headerLower.some((h) => h === "credit" || h === "credit amount");
  if (hasDebit && hasCredit) {
    return "costpoint";
  }

  // NetSuite: Look for dimensional columns (Subsidiary, Department, Class)
  const hasDimensional = headerLower.some((h) =>
    h.includes("subsidiary") || h.includes("department") || h.includes("class")
  );
  const hasBaseCurrency = headerLower.some((h) => h.includes("base currency"));
  if (hasDimensional || hasBaseCurrency) {
    return "netsuite";
  }

  // Default to generic
  return "generic";
}

// ============================================
// QuickBooks Parser
// ============================================

/**
 * Parse QuickBooks CSV format
 * - Extracts account codes from parenthetical format: "Accounts Payable (2000)" → "2000"
 * - Handles comma-formatted numbers: "-52,850.00" → -52850
 * - Converts US date format: "12/31/2025" → "2025-12"
 */
export function parseQuickBooksRow(row: Record<string, any>): Record<string, any> {
  const parsed: Record<string, any> = { ...row };

  // Extract account code from parenthetical format
  for (const [key, value] of Object.entries(row)) {
    const keyLower = key.toLowerCase();

    if (keyLower.includes("account")) {
      if (typeof value === "string") {
        // Extract code from "Account Name (CODE)" format
        const match = value.match(/\((\d+)\)/);
        if (match) {
          parsed.account_code = match[1];
          parsed.account_name = value.replace(/\s*\(\d+\)/, "").trim();
        }
      }
    } else if (keyLower.includes("amount") || keyLower.includes("balance")) {
      // Parse comma-formatted numbers
      if (typeof value === "string") {
        const cleaned = value.replace(/,/g, "");
        const num = parseFloat(cleaned);
        if (!isNaN(num)) {
          parsed[key] = num;
        }
      }
    } else if (keyLower.includes("date") || keyLower.includes("period")) {
      // Convert US date format to YYYY-MM
      if (typeof value === "string" && value.match(/\d{1,2}\/\d{1,2}\/\d{4}/)) {
        const parts = value.split("/");
        if (parts.length === 3) {
          const month = parts[0].padStart(2, "0");
          const year = parts[2];
          parsed.period = `${year}-${month}`;
        }
      }
    }
  }

  return parsed;
}

// ============================================
// Costpoint Parser
// ============================================

/**
 * Parse Costpoint/Deltek CSV format
 * - Handles Debit/Credit columns with sign conventions
 * - Supports both GL (Debit/Credit) and subledger (Amount) formats
 * - Formula: Debit - Credit gives correct accounting convention
 */
export function parseCostpointRow(row: Record<string, any>): Record<string, any> {
  const parsed: Record<string, any> = { ...row };

  let debit: number | undefined;
  let credit: number | undefined;
  let hasDebitCredit = false;

  for (const [key, value] of Object.entries(row)) {
    const keyLower = key.toLowerCase();

    // Parse Debit column
    if (keyLower === "debit" || keyLower === "debit amount") {
      hasDebitCredit = true;
      if (value !== null && value !== undefined && value !== "") {
        const num = typeof value === "string"
          ? parseFloat(value.replace(/,/g, ""))
          : Number(value);
        debit = isNaN(num) ? 0 : Math.abs(num);
      } else {
        debit = 0;
      }
    }
    // Parse Credit column
    else if (keyLower === "credit" || keyLower === "credit amount") {
      hasDebitCredit = true;
      if (value !== null && value !== undefined && value !== "") {
        const num = typeof value === "string"
          ? parseFloat(value.replace(/,/g, ""))
          : Number(value);
        credit = isNaN(num) ? 0 : Math.abs(num);
      } else {
        credit = 0;
      }
    }
    // Handle Amount column (for subledger files)
    else if (keyLower === "amount") {
      if (value !== null && value !== undefined && value !== "") {
        const num = typeof value === "string"
          ? parseFloat(value.replace(/,/g, ""))
          : Number(value);
        // Costpoint subledgers show amounts as positive, but they represent liabilities
        // We need to negate them to match accounting convention
        parsed.amount = isNaN(num) ? value : -Math.abs(num);
      }
    }
  }

  // Calculate amount from Debit - Credit if we have those columns
  if (hasDebitCredit && debit !== undefined && credit !== undefined) {
    parsed.amount = debit - credit;
  }

  return parsed;
}

// ============================================
// NetSuite Parser
// ============================================

/**
 * Parse NetSuite/Oracle CSV format
 * - Handles multi-currency (prefers "Amount (Base Currency)")
 * - Aggregates dimensional data (Subsidiary, Department, Class)
 * - Supports both detailed and aggregated views
 */
export function parseNetSuiteRow(row: Record<string, any>): Record<string, any> {
  const parsed: Record<string, any> = { ...row };

  for (const [key, value] of Object.entries(row)) {
    const keyLower = key.toLowerCase();

    // Prefer base currency amount over local currency
    if (keyLower.includes("base currency") && keyLower.includes("amount")) {
      if (value !== null && value !== undefined) {
        const num = typeof value === "string"
          ? parseFloat(value.replace(/,/g, ""))
          : Number(value);
        if (!isNaN(num)) {
          parsed.amount = num;
        }
      }
    }
    // Handle period format (NetSuite may use "Dec 2025" format)
    else if (keyLower.includes("period") && typeof value === "string") {
      // Convert "Dec 2025" to "2025-12"
      const monthMap: Record<string, string> = {
        jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
        jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
      };
      const match = value.match(/^([A-Za-z]{3})\s+(\d{4})$/);
      if (match) {
        const month = monthMap[match[1].toLowerCase()];
        if (month) {
          parsed.period = `${match[2]}-${month}`;
        }
      }
    }
  }

  return parsed;
}

// ============================================
// Main Parser Selection Function
// ============================================

/**
 * Apply system-specific parsing to a row based on detected/selected accounting system
 */
export function parseRowForAccountingSystem(
  row: Record<string, any>,
  accountingSystem: AccountingSystem
): Record<string, any> {
  switch (accountingSystem) {
    case "quickbooks":
      return parseQuickBooksRow(row);
    case "costpoint":
      return parseCostpointRow(row);
    case "netsuite":
      return parseNetSuiteRow(row);
    case "auto":
    case "generic":
    case "sap":
    default:
      // Generic parser - just return the row as-is
      return row;
  }
}
