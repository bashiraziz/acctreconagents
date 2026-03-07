import { describe, expect, it } from "vitest";
import { normalizeXeroTrialBalance } from "@/lib/xero";

describe("normalizeXeroTrialBalance", () => {
  it("prefers debit-credit YTD over opening balance date columns", () => {
    const payload = {
      Reports: [
        {
          Rows: [
            {
              RowType: "Header",
              Cells: [
                { Value: "Account Code" },
                { Value: "Account" },
                { Value: "Debit - Year to date" },
                { Value: "Credit - Year to date" },
                { Value: "Dec 31, 2025" },
              ],
            },
            {
              RowType: "Section",
              Rows: [
                {
                  RowType: "Row",
                  Cells: [
                    { Value: "120" },
                    { Value: "Accounts Receivable" },
                    { Value: "9,172.63" },
                    { Value: "" },
                    { Value: "579.80" },
                  ],
                },
                {
                  RowType: "Row",
                  Cells: [
                    { Value: "400" },
                    { Value: "Sales" },
                    { Value: "" },
                    { Value: "18,775.05" },
                    { Value: "(12,764.15)" },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    const balances = normalizeXeroTrialBalance(payload, "2025-12");
    const ar = balances.find((row) => row.account_code === "120");
    const sales = balances.find((row) => row.account_code === "400");

    expect(ar?.amount).toBe(9172.63);
    expect(ar?.balanceSide).toBe("debit");
    expect(ar?.debit).toBe(9172.63);
    expect(ar?.credit).toBe(0);

    expect(sales?.amount).toBe(-18775.05);
    expect(sales?.balanceSide).toBe("credit");
    expect(sales?.debit).toBe(0);
    expect(sales?.credit).toBe(18775.05);
  });

  it("uses YTD columns when month and YTD columns are both present", () => {
    const payload = {
      Reports: [
        {
          Rows: [
            {
              RowType: "Header",
              Cells: [
                { Value: "Account Code" },
                { Value: "Debit - Month" },
                { Value: "Credit - Month" },
                { Value: "Debit - Year to date" },
                { Value: "Credit - Year to date" },
              ],
            },
            {
              RowType: "Row",
              Cells: [
                { Value: "120" },
                { Value: "630.00" },
                { Value: "" },
                { Value: "9,172.63" },
                { Value: "" },
              ],
            },
          ],
        },
      ],
    };

    const balances = normalizeXeroTrialBalance(payload, "2026-03");
    expect(balances[0]?.amount).toBe(9172.63);
    expect(balances[0]?.debit).toBe(9172.63);
    expect(balances[0]?.credit).toBe(0);
    expect(balances[0]?.balanceSide).toBe("debit");
  });

  it("falls back to debit-credit when no balance column exists", () => {
    const payload = {
      Reports: [
        {
          Rows: [
            {
              RowType: "Header",
              Cells: [
                { Value: "Account Code" },
                { Value: "Debit" },
                { Value: "Credit" },
              ],
            },
            {
              RowType: "Row",
              Cells: [
                { Value: "500" },
                { Value: "2,340.00" },
                { Value: "0.00" },
              ],
            },
          ],
        },
      ],
    };

    const balances = normalizeXeroTrialBalance(payload, "2025-12");
    expect(balances[0]?.amount).toBe(2340);
    expect(balances[0]?.balanceSide).toBe("debit");
  });

  it("supports MCP-style camelCase row keys", () => {
    const payload = {
      Reports: [
        {
          Rows: [
            {
              rowType: "header",
              cells: [
                { value: "Account Code" },
                { value: "Debit - Year to date" },
                { value: "Credit - Year to date" },
              ],
            },
            {
              rowType: "row",
              cells: [
                { value: "120" },
                { value: "9,172.63" },
                { value: "0.00" },
              ],
            },
          ],
        },
      ],
    };

    const balances = normalizeXeroTrialBalance(payload, "2026-03");
    expect(balances).toHaveLength(1);
    expect(balances[0]?.account_code).toBe("120");
    expect(balances[0]?.amount).toBe(9172.63);
    expect(balances[0]?.debit).toBe(9172.63);
    expect(balances[0]?.credit).toBe(0);
  });
});
