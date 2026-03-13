import { describe, it, expect } from "vitest";
import { validateReconciliationPayload } from "@/lib/validate-reconciliation";
import type { ReconciliationPayload } from "@/types/reconciliation";

const basePayload: ReconciliationPayload = {
  glBalances: [{ account_code: "1000", amount: 5000, period: "2026-01", currency: "USD" }],
  subledgerBalances: [{ account_code: "1000", amount: 5000, period: "2026-01", currency: "USD" }],
  transactions: [],
  orderedPeriods: ["2026-01"],
};

describe("validateReconciliationPayload", () => {
  it("returns no issues for a clean payload", () => {
    const result = validateReconciliationPayload(basePayload);
    expect(result.issues).toHaveLength(0);
  });

  it("returns no issues for null payload", () => {
    const result = validateReconciliationPayload(null);
    expect(result.issues).toHaveLength(0);
  });

  it("flags missing account_code in GL balances", () => {
    const payload: ReconciliationPayload = {
      ...basePayload,
      glBalances: [{ account_code: "", amount: 100, period: "2026-01" }],
    };
    const result = validateReconciliationPayload(payload);
    const issue = result.issues.find(
      (i) => i.dataset === "glBalances" && i.field === "account_code"
    );
    expect(issue).toBeDefined();
  });

  it("flags non-numeric amount in subledger balances", () => {
    const payload: ReconciliationPayload = {
      ...basePayload,
      subledgerBalances: [{ account_code: "2000", amount: NaN, period: "2026-01" }],
    };
    const result = validateReconciliationPayload(payload);
    const issue = result.issues.find(
      (i) => i.dataset === "subledgerBalances" && i.field === "amount"
    );
    expect(issue).toBeDefined();
  });

  it("flags missing account_code in transactions", () => {
    const payload: ReconciliationPayload = {
      ...basePayload,
      transactions: [{ account_code: "", amount: 50, booked_at: "2026-01-15" }],
    };
    const result = validateReconciliationPayload(payload);
    const issue = result.issues.find(
      (i) => i.dataset === "transactions" && i.field === "account_code"
    );
    expect(issue).toBeDefined();
  });

  it("accumulates issues across multiple rows", () => {
    const payload: ReconciliationPayload = {
      ...basePayload,
      glBalances: [
        { account_code: "", amount: 100 },
        { account_code: "", amount: 200 },
      ],
    };
    const result = validateReconciliationPayload(payload);
    const glIssues = result.issues.filter((i) => i.dataset === "glBalances");
    expect(glIssues.length).toBeGreaterThanOrEqual(2);
  });
});
