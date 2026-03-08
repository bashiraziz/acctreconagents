import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchXeroJournals,
  getXeroJournalsPagesFetched,
  normalizeXeroJournals,
  parseXeroDate,
  type XeroJournal,
} from "@/lib/xero-journals";

function makeJournal(
  id: string,
  rawDate: string,
  accountCode: string,
  netAmount: number
): XeroJournal {
  return {
    JournalID: id,
    JournalDate: rawDate,
    JournalNumber: 1,
    CreatedDateUTC: rawDate,
    SourceID: "SRC1",
    SourceType: "MANJOURNAL",
    Narration: "Narration",
    JournalLines: [
      {
        JournalLineID: `${id}-L1`,
        AccountID: "A1",
        AccountCode: accountCode,
        AccountName: "Cash",
        AccountType: "ASSET",
        NetAmount: netAmount,
        GrossAmount: netAmount,
        TaxAmount: 0,
      },
    ],
  };
}

describe("xero-journals", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("parses Xero /Date(...) timestamps", () => {
    expect(parseXeroDate("/Date(1704067200000+0000)/")).toBe("2024-01-01");
  });

  it("normalizes journals and skips lines with empty account code", () => {
    const journals: XeroJournal[] = [
      makeJournal("J1", "/Date(1704067200000+0000)/", "100", 25),
      makeJournal("J2", "/Date(1704067200000+0000)/", "", 10),
    ];

    const normalized = normalizeXeroJournals(journals);
    expect(normalized).toHaveLength(1);
    expect(normalized[0]).toMatchObject({
      journal_id: "J1",
      account_code: "100",
      net_amount: 25,
      period: "2024-01",
      source_type: "MANJOURNAL",
    });
  });

  it("paginates journals and filters by date range", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          Journals: [
            makeJournal("J1", "/Date(1704067200000+0000)/", "100", 50), // 2024-01-01
            makeJournal("J2", "/Date(1706745600000+0000)/", "200", 60), // 2024-02-01
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          Journals: [
            makeJournal("J3", "/Date(1709251200000+0000)/", "300", 70), // 2024-03-01
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          Journals: [],
        }),
      });

    vi.stubGlobal("fetch", fetchMock);

    const journals = await fetchXeroJournals("token", "tenant", {
      fromDate: "2024-02-01",
      toDate: "2024-03-31",
      maxPages: 10,
    });

    expect(journals.map((journal) => journal.JournalID)).toEqual(["J2", "J3"]);
    expect(getXeroJournalsPagesFetched(journals)).toBe(2);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});

