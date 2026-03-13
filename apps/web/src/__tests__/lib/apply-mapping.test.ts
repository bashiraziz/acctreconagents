import { describe, it, expect } from "vitest";
import { applyMapping } from "@/lib/transformData";

describe("applyMapping", () => {
  it("maps source columns to canonical fields", () => {
    const rows = [{ "Account Code": "1000", "Balance": 5000 }];
    const mapping = { account_code: "Account Code", amount: "Balance" };
    const result = applyMapping(rows, mapping);
    expect(result[0].account_code).toBe("1000");
    expect(result[0].amount).toBe(5000);
  });

  it("coerces numeric account codes to strings", () => {
    const rows = [{ "Acct": 1000, "Bal": 500 }];
    const mapping = { account_code: "Acct", amount: "Bal" };
    const result = applyMapping(rows, mapping);
    expect(result[0].account_code).toBe("1000");
  });

  it("applies metadata account_code when no mapping exists", () => {
    const rows = [{ "Balance": 100 }];
    const mapping = { amount: "Balance" };
    const result = applyMapping(rows, mapping, { accountCode: "9999" });
    expect(result[0].account_code).toBe("9999");
  });

  it("applies metadata period", () => {
    const rows = [{ "Balance": 200 }];
    const mapping = { amount: "Balance" };
    const result = applyMapping(rows, mapping, { period: "2026-01" });
    expect(result[0].period).toBe("2026-01");
  });

  it("reverses sign when reverseSign is true", () => {
    const rows = [{ "Balance": 1000 }];
    const mapping = { amount: "Balance" };
    const result = applyMapping(rows, mapping, { reverseSign: true });
    expect(result[0].amount).toBe(-1000);
  });

  it("handles comma-formatted number strings in amount", () => {
    const rows = [{ "Balance": "1,500.00" }];
    const mapping = { amount: "Balance" };
    const result = applyMapping(rows, mapping);
    expect(result[0].amount).toBe(1500);
  });

  it("skips unmapped columns", () => {
    const rows = [{ "Account Code": "1000", "Unmapped": "ignore" }];
    const mapping = { account_code: "Account Code" };
    const result = applyMapping(rows, mapping);
    expect(result[0].Unmapped).toBeUndefined();
  });

  it("returns one output row per input row", () => {
    const rows = [
      { "Acct": "1000", "Bal": 100 },
      { "Acct": "2000", "Bal": 200 },
      { "Acct": "3000", "Bal": 300 },
    ];
    const mapping = { account_code: "Acct", amount: "Bal" };
    const result = applyMapping(rows, mapping);
    expect(result).toHaveLength(3);
  });
});
