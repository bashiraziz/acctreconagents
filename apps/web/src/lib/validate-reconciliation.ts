import type { ReconciliationPayload } from "@/types/reconciliation";

export type ValidationIssue = {
  dataset: "glBalances" | "subledgerBalances" | "transactions";
  row: number;
  field: string;
  message: string;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isValidDate(value: unknown): boolean {
  if (value instanceof Date) {
    return !Number.isNaN(value.getTime());
  }
  if (typeof value === "string") {
    const parsed = new Date(value);
    return !Number.isNaN(parsed.getTime());
  }
  return false;
}

function validateBalanceRow(
  dataset: "glBalances" | "subledgerBalances",
  row: Record<string, unknown>,
  rowIndex: number,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!isNonEmptyString(row.account_code)) {
    issues.push({
      dataset,
      row: rowIndex,
      field: "account_code",
      message: "Account code is required.",
    });
  }
  if (!isFiniteNumber(row.amount)) {
    issues.push({
      dataset,
      row: rowIndex,
      field: "amount",
      message: "Amount must be a number.",
    });
  }
  if (row.period !== undefined && !isNonEmptyString(row.period)) {
    issues.push({
      dataset,
      row: rowIndex,
      field: "period",
      message: "Period must be a non-empty string if provided.",
    });
  }
  if (row.currency !== undefined && !isNonEmptyString(row.currency)) {
    issues.push({
      dataset,
      row: rowIndex,
      field: "currency",
      message: "Currency must be a non-empty string if provided.",
    });
  }
  return issues;
}

function validateTransactionRow(
  row: Record<string, unknown>,
  rowIndex: number,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!isNonEmptyString(row.account_code)) {
    issues.push({
      dataset: "transactions",
      row: rowIndex,
      field: "account_code",
      message: "Account code is required.",
    });
  }
  if (!isValidDate(row.booked_at)) {
    issues.push({
      dataset: "transactions",
      row: rowIndex,
      field: "booked_at",
      message: "Booked date is required and must be a valid date.",
    });
  }
  if (row.debit !== undefined && !isFiniteNumber(row.debit)) {
    issues.push({
      dataset: "transactions",
      row: rowIndex,
      field: "debit",
      message: "Debit must be a number when provided.",
    });
  }
  if (row.credit !== undefined && !isFiniteNumber(row.credit)) {
    issues.push({
      dataset: "transactions",
      row: rowIndex,
      field: "credit",
      message: "Credit must be a number when provided.",
    });
  }
  if (row.amount !== undefined && !isFiniteNumber(row.amount)) {
    issues.push({
      dataset: "transactions",
      row: rowIndex,
      field: "amount",
      message: "Amount must be a number when provided.",
    });
  }
  return issues;
}

export function validateReconciliationPayload(payload: ReconciliationPayload | null) {
  if (!payload) {
    return { issues: [] as ValidationIssue[] };
  }

  const issues: ValidationIssue[] = [];

  payload.glBalances?.forEach((row, index) => {
    issues.push(...validateBalanceRow("glBalances", row as Record<string, unknown>, index));
  });
  payload.subledgerBalances?.forEach((row, index) => {
    issues.push(...validateBalanceRow("subledgerBalances", row as Record<string, unknown>, index));
  });
  payload.transactions?.forEach((row, index) => {
    issues.push(...validateTransactionRow(row as Record<string, unknown>, index));
  });

  return { issues };
}
