import { describe, expect, it } from "vitest";
import { normalizeXeroAgedReport, type XeroAgedReportResponse } from "@/lib/xero-aged";

describe("xero-aged", () => {
  it("normalizes report rows with dynamic column order and skips empty contacts", () => {
    const payload: XeroAgedReportResponse = {
      Reports: [
        {
          Rows: [
            {
              RowType: "Header",
              Cells: [
                { Value: "Current" },
                { Value: "Contact" },
                { Value: "Total" },
                { Value: "31-60" },
                { Value: "1-30" },
                { Value: "Due Date" },
                { Value: "61-90" },
                { Value: "Older" },
              ],
            },
            {
              RowType: "Section",
              Rows: [
                {
                  RowType: "Row",
                  Cells: [
                    { Value: "100.00" },
                    { Value: "Acme Ltd" },
                    { Value: "(50.00)" },
                    { Value: "10.00" },
                    { Value: "20.00" },
                    { Value: "2026-02-28" },
                    { Value: "5.00" },
                    { Value: "15.00" },
                  ],
                },
                {
                  RowType: "Row",
                  Cells: [
                    { Value: "1.00" },
                    { Value: "" },
                    { Value: "1.00" },
                    { Value: "0.00" },
                    { Value: "0.00" },
                    { Value: "" },
                    { Value: "0.00" },
                    { Value: "0.00" },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    const rows = normalizeXeroAgedReport(payload, "ar", "2026-02-28");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      contact_name: "Acme Ltd",
      due_date: "2026-02-28",
      current: 100,
      days_1_30: 20,
      days_31_60: 10,
      days_61_90: 5,
      older: 15,
      total: -50,
      period: "2026-02",
      as_of_date: "2026-02-28",
      type: "ar",
    });
  });

  it("computes total from buckets when total column is absent", () => {
    const payload: XeroAgedReportResponse = {
      Reports: [
        {
          Rows: [
            {
              RowType: "Header",
              Cells: [
                { Value: "Contact" },
                { Value: "Current" },
                { Value: "1 - 30" },
                { Value: "31 - 60" },
                { Value: "61 - 90" },
                { Value: "Older" },
              ],
            },
            {
              RowType: "Row",
              Cells: [
                { Value: "Vendor A" },
                { Value: "50" },
                { Value: "10" },
                { Value: "15" },
                { Value: "5" },
                { Value: "20" },
              ],
            },
          ],
        },
      ],
    };

    const rows = normalizeXeroAgedReport(payload, "ap", "2026-03-31");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      contact_name: "Vendor A",
      total: 100,
      type: "ap",
      period: "2026-03",
      as_of_date: "2026-03-31",
    });
  });
});
