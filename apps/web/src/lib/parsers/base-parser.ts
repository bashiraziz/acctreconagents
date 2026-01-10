/**
 * Base Accounting Parser
 * Abstract base class for all accounting system parsers
 */

import type { RawCSVRow, ParsedCSVRow, CSVValue } from "@/types/csv";
import type { AccountingSystem } from "@/types/reconciliation";

/**
 * Detection result from parser
 */
export interface DetectionResult {
  /** Confidence score 0-1 (1 = very confident) */
  confidence: number;
  /** Reasoning for the detection */
  reason?: string;
}

/**
 * Abstract base class for accounting system parsers
 *
 * Each parser must implement:
 * - name: Unique identifier for the system
 * - detect(): Returns confidence score for system detection
 * - parseRow(): Transforms raw CSV row to standardized format
 */
export abstract class BaseAccountingParser {
  /** Unique name for this parser */
  abstract readonly name: AccountingSystem;

  /** Display name for UI */
  abstract readonly displayName: string;

  /** Description of the system */
  abstract readonly description: string;

  /**
   * Detect if this parser can handle the given CSV data
   *
   * @param headers - Column headers from CSV
   * @param firstRow - First data row for pattern matching
   * @returns Detection result with confidence 0-1
   *
   * @example
   * ```ts
   * detect(['Account', 'Amount'], { Account: 'Cash (1000)', Amount: '1000.00' })
   * // Returns: { confidence: 0.9, reason: 'Parenthetical account format detected' }
   * ```
   */
  abstract detect(headers: string[], firstRow: RawCSVRow): DetectionResult;

  /**
   * Parse a raw CSV row into standardized format
   *
   * @param row - Raw CSV row with original column names
   * @returns Parsed row with standardized fields
   *
   * @example
   * ```ts
   * parseRow({ Account: 'Cash (1000)', Amount: '1,000.00' })
   * // Returns: { account_code: '1000', account_name: 'Cash', amount: 1000, ...row }
   * ```
   */
  abstract parseRow(row: RawCSVRow): ParsedCSVRow;

  // ============================================
  // Protected Helper Methods
  // ============================================

  /**
   * Extract numeric value from various formats
   * Handles: commas, parentheses (negative), currency symbols
   *
   * @param value - Value to parse (string or number)
   * @returns Parsed number or undefined if invalid
   *
   * @example
   * extractNumber('1,234.56')      // 1234.56
   * extractNumber('(500.00)')      // -500
   * extractNumber('$1,000')        // 1000
   * extractNumber('N/A')           // undefined
   */
  protected extractNumber(value: CSVValue): number | undefined {
    if (typeof value === "number") {
      return value;
    }

    if (typeof value !== "string") {
      return undefined;
    }

    // Remove currency symbols, commas, and whitespace
    let cleaned = value.replace(/[$€£¥,\s]/g, "");

    // Handle parentheses as negative
    if (cleaned.startsWith("(") && cleaned.endsWith(")")) {
      cleaned = "-" + cleaned.slice(1, -1);
    }

    const num = parseFloat(cleaned);
    return isNaN(num) ? undefined : num;
  }

  /**
   * Parse date string to YYYY-MM period format
   *
   * @param value - Date string in various formats
   * @param format - Optional format hint ('US', 'ISO', 'UK')
   * @returns Period string in YYYY-MM format
   *
   * @example
   * parseDate('12/31/2025', 'US')     // '2025-12'
   * parseDate('2025-12-31')           // '2025-12'
   * parseDate('31-Dec-2025')          // '2025-12'
   */
  protected parseDate(value: CSVValue, format?: string): string | undefined {
    if (typeof value !== "string") {
      return undefined;
    }

    // ISO format: YYYY-MM-DD or YYYY-MM
    const isoMatch = value.match(/(\d{4})-(\d{2})(?:-\d{2})?/);
    if (isoMatch) {
      return `${isoMatch[1]}-${isoMatch[2]}`;
    }

    // US format: MM/DD/YYYY or M/D/YYYY
    if (format === "US" || value.includes("/")) {
      const usMatch = value.match(/(\d{1,2})\/\d{1,2}\/(\d{4})/);
      if (usMatch) {
        const month = usMatch[1].padStart(2, "0");
        return `${usMatch[2]}-${month}`;
      }
    }

    // UK format: DD/MM/YYYY or DD-MM-YYYY
    const ukMatch = value.match(/\d{1,2}[-/](\d{1,2})[-/](\d{4})/);
    if (ukMatch) {
      const month = ukMatch[1].padStart(2, "0");
      return `${ukMatch[2]}-${month}`;
    }

    // Month name format: "Dec 2025" or "December 2025" or "31 Dec 2025"
    const monthNameMatch = value.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})/i);
    if (monthNameMatch) {
      const monthMap: Record<string, string> = {
        jan: "01", feb: "02", mar: "03", apr: "04",
        may: "05", jun: "06", jul: "07", aug: "08",
        sep: "09", oct: "10", nov: "11", dec: "12",
      };
      const month = monthMap[monthNameMatch[1].toLowerCase().slice(0, 3)];
      return `${monthNameMatch[2]}-${month}`;
    }

    // Compact format: YYYYMMDD
    const compactMatch = value.match(/^(\d{4})(\d{2})\d{2}$/);
    if (compactMatch) {
      return `${compactMatch[1]}-${compactMatch[2]}`;
    }

    return undefined;
  }

  /**
   * Extract account code from various formats
   *
   * @param value - Account string or code
   * @returns Account code or undefined
   *
   * @example
   * extractAccountCode('Cash (1000)')       // '1000'
   * extractAccountCode('1000-01-001')      // '1000'
   * extractAccountCode('1000')             // '1000'
   */
  protected extractAccountCode(value: CSVValue): string | undefined {
    if (typeof value !== "string") {
      return undefined;
    }

    // Parenthetical format: "Account Name (CODE)"
    const parenMatch = value.match(/\(([^)]+)\)$/);
    if (parenMatch) {
      return parenMatch[1].trim();
    }

    // Segmented format: "CODE-SEGMENT-SEGMENT"
    const segmentMatch = value.match(/^(\d+)/);
    if (segmentMatch) {
      return segmentMatch[1];
    }

    // Already a code
    if (/^\d+$/.test(value)) {
      return value;
    }

    return undefined;
  }

  /**
   * Check if headers contain specific keywords (case-insensitive)
   *
   * @param headers - Column headers
   * @param keywords - Keywords to search for
   * @returns True if any keyword found
   */
  protected hasHeaders(headers: string[], keywords: string[]): boolean {
    const lowerHeaders = headers.map((h) => h.toLowerCase());
    return keywords.some((keyword) =>
      lowerHeaders.some((h) => h.includes(keyword.toLowerCase()))
    );
  }

  /**
   * Find header that matches keywords
   *
   * @param headers - Column headers
   * @param keywords - Keywords to search for
   * @returns Matching header or undefined
   */
  protected findHeader(headers: string[], keywords: string[]): string | undefined {
    const lowerHeaders = headers.map((h) => h.toLowerCase());
    for (const keyword of keywords) {
      const keywordLower = keyword.toLowerCase();
      const index = lowerHeaders.findIndex((h) => h.includes(keywordLower));
      if (index !== -1) {
        return headers[index];
      }
    }
    return undefined;
  }
}

/**
 * Parser registry for managing all parsers
 */
export class ParserRegistry {
  private parsers: Map<AccountingSystem, BaseAccountingParser> = new Map();

  /**
   * Register a parser
   */
  register(parser: BaseAccountingParser): void {
    this.parsers.set(parser.name, parser);
  }

  /**
   * Get parser by name
   */
  get(name: AccountingSystem): BaseAccountingParser | undefined {
    return this.parsers.get(name);
  }

  /**
   * Get all registered parsers
   */
  getAll(): BaseAccountingParser[] {
    return Array.from(this.parsers.values());
  }

  /**
   * Auto-detect best parser for given CSV data
   *
   * @param headers - Column headers
   * @param firstRow - First data row
   * @returns Best matching parser and confidence score
   */
  detect(headers: string[], firstRow: RawCSVRow): {
    parser: BaseAccountingParser;
    confidence: number;
    reason?: string;
  } | null {
    let bestParser: BaseAccountingParser | null = null;
    let bestConfidence = 0;
    let bestReason: string | undefined;

    for (const parser of this.parsers.values()) {
      const result = parser.detect(headers, firstRow);
      if (result.confidence > bestConfidence) {
        bestConfidence = result.confidence;
        bestParser = parser;
        bestReason = result.reason;
      }
    }

    if (bestParser && bestConfidence > 0.5) {
      return {
        parser: bestParser,
        confidence: bestConfidence,
        reason: bestReason,
      };
    }

    return null;
  }
}

/**
 * Global parser registry instance
 */
export const parserRegistry = new ParserRegistry();
