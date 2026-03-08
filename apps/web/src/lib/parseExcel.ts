/**
 * Excel (.xlsx) parsing utility using SheetJS.
 * Handles generic Excel files and auto-detects Xero aging report format.
 */

import * as XLSX from "xlsx";
import type { UploadedFile, FileType } from "@/types/reconciliation";
import type { RawCSVRow } from "@/types/csv";

export type ParseResult = {
  success: boolean;
  data?: UploadedFile;
  error?: string;
};

/**
 * Xero aging reports have 4 metadata rows then a blank row before headers.
 * Row layout:
 *   1: Report title  (e.g. "Accounts Receivable Aging Summary")
 *   2: Company name  (e.g. "Demo Company (US)")
 *   3: As-of date    (e.g. "As of February 28, 2026")
 *   4: Aging method  (e.g. "Aging by due date")
 *   5: blank
 *   6: Headers       (Contact | Total  or  Contact | Current | 1-30 | ...)
 *   7+: Data rows
 *   n: "Total" row   ← stop here
 *   n+1: blank
 *   n+2: "Percentage of total"
 *
 * Returns { rows, headers, reportDate } or null if not detected.
 */
function tryParseXeroAgingFormat(
  sheet: XLSX.WorkSheet
): { headers: string[]; rows: RawCSVRow[]; reportDate?: string } | null {
  const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1");
  const totalRows = range.e.r + 1;

  // Read all rows as raw arrays
  const raw: (string | number | null)[][] = [];
  for (let r = 0; r <= range.e.r; r++) {
    const row: (string | number | null)[] = [];
    for (let c = 0; c <= range.e.c; c++) {
      const cell = sheet[XLSX.utils.encode_cell({ r, c })];
      if (!cell) {
        row.push(null);
      } else if (cell.t === "n") {
        row.push(cell.v as number);
      } else {
        row.push(cell.v !== undefined && cell.v !== null ? String(cell.v).trim() : null);
      }
    }
    raw.push(row);
  }

  if (totalRows < 6) return null;

  // Row 0 (1-indexed: row 1) must look like a report title string
  const titleCell = raw[0]?.[0];
  if (typeof titleCell !== "string") return null;
  const titleLower = titleCell.toLowerCase();
  if (
    !titleLower.includes("aging") &&
    !titleLower.includes("ageing") &&
    !titleLower.includes("receivable") &&
    !titleLower.includes("payable")
  ) {
    return null;
  }

  // Extract report date from row 2 (0-indexed) — "As of February 28, 2026"
  let reportDate: string | undefined;
  const dateCell = raw[2]?.[0];
  if (typeof dateCell === "string") {
    const match = dateCell.match(
      /(\d{1,2})\s+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{4})/i
    );
    if (match) {
      const monthMap: Record<string, string> = {
        jan: "01", feb: "02", mar: "03", apr: "04",
        may: "05", jun: "06", jul: "07", aug: "08",
        sep: "09", oct: "10", nov: "11", dec: "12",
      };
      const month = monthMap[match[2].toLowerCase().slice(0, 3)];
      reportDate = `${match[3]}-${month}`;
    }
  }

  // Find header row — look for a row where first cell is "Contact" (case-insensitive)
  let headerRowIdx = -1;
  for (let r = 0; r < Math.min(10, totalRows); r++) {
    const first = raw[r]?.[0];
    if (typeof first === "string" && first.toLowerCase() === "contact") {
      headerRowIdx = r;
      break;
    }
  }
  if (headerRowIdx === -1) return null;

  // Build headers from header row (skip nulls)
  const headerRow = raw[headerRowIdx];
  const headers: string[] = headerRow
    .map((cell) => (cell !== null ? String(cell) : ""))
    .filter((h) => h !== "");

  if (headers.length < 2) return null;

  // Build data rows — stop at "Total" row or blank row
  const rows: RawCSVRow[] = [];
  for (let r = headerRowIdx + 1; r < totalRows; r++) {
    const rowData = raw[r];
    const firstCell = rowData?.[0];

    // Stop at "Total" row
    if (typeof firstCell === "string" && firstCell.toLowerCase() === "total") break;
    // Skip blank rows
    if (firstCell === null || firstCell === "") continue;
    // Skip "Percentage of total"
    if (typeof firstCell === "string" && firstCell.toLowerCase().startsWith("percentage")) continue;

    const rowObj: RawCSVRow = {};
    headers.forEach((header, colIdx) => {
      const val = rowData?.[colIdx] ?? null;
      rowObj[header] = val as string | number;
    });
    rows.push(rowObj);
  }

  if (rows.length === 0) return null;
  return { headers, rows, reportDate };
}

/**
 * Generic Excel parser — reads the first sheet as a flat table.
 * Uses the first non-empty row as headers.
 */
function parseGenericExcelSheet(
  sheet: XLSX.WorkSheet
): { headers: string[]; rows: RawCSVRow[] } | null {
  const jsonRows = XLSX.utils.sheet_to_json<RawCSVRow>(sheet, {
    defval: "",
    raw: false,
  });
  if (jsonRows.length === 0) return null;
  const headers = Object.keys(jsonRows[0]);
  return { headers, rows: jsonRows };
}

/**
 * Parse an Excel (.xlsx / .xls) file.
 * Auto-detects Xero aging format; falls back to generic sheet parsing.
 */
export async function parseExcelFile(
  file: File,
  fileType: FileType
): Promise<ParseResult> {
  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array", cellDates: false });

    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      return { success: false, error: "Excel file has no sheets." };
    }
    const sheet = workbook.Sheets[firstSheetName];

    // Try Xero aging format first
    const xeroResult = tryParseXeroAgingFormat(sheet);
    const parsed = xeroResult ?? parseGenericExcelSheet(sheet);

    if (!parsed || parsed.rows.length === 0) {
      return { success: false, error: "No data rows found in Excel file." };
    }

    const metadata = xeroResult?.reportDate
      ? { period: xeroResult.reportDate }
      : undefined;

    const uploadedFile: UploadedFile = {
      id: `file_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      name: file.name,
      type: fileType,
      size: file.size,
      uploadedAt: Date.now(),
      rowCount: parsed.rows.length,
      columnCount: parsed.headers.length,
      headers: parsed.headers,
      rows: parsed.rows,
      ...(metadata ? { metadata } : {}),
    };

    return { success: true, data: uploadedFile };
  } catch (err) {
    return {
      success: false,
      error: `Failed to parse Excel file: ${err instanceof Error ? err.message : "Unknown error"}`,
    };
  }
}
