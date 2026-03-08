const XERO_API_BASE = "https://api.xero.com";
const JOURNALS_PAGE_SIZE = 100;
const XERO_PAGES_FETCHED_SYMBOL = Symbol("xero_pages_fetched");

export type XeroJournalLine = {
  JournalLineID: string;
  AccountID: string;
  AccountCode: string;
  AccountName: string;
  AccountType: string;
  NetAmount: number;
  GrossAmount: number;
  TaxAmount: number;
  TaxType?: string;
  TaxName?: string;
  Description?: string;
};

export type XeroJournal = {
  JournalID: string;
  JournalDate: string;
  JournalNumber: number;
  CreatedDateUTC: string;
  Reference?: string;
  SourceID?: string;
  SourceType?: string;
  Narration?: string;
  JournalLines: XeroJournalLine[];
};

export type XeroJournalsResponse = {
  Journals: XeroJournal[];
};

export type XeroNormalizedTransaction = {
  journal_id: string;
  journal_number: number;
  date: string;
  period: string;
  account_code: string;
  account_name: string;
  description: string;
  reference: string;
  net_amount: number;
  gross_amount: number;
  source_type: string;
};

type JournalsWithMeta = XeroJournal[] & {
  [XERO_PAGES_FETCHED_SYMBOL]?: number;
};

function parseDateToEpoch(dateString: string): number {
  const epoch = Date.parse(`${dateString}T00:00:00.000Z`);
  if (!Number.isFinite(epoch)) {
    throw new Error(`Invalid date value: ${dateString}`);
  }
  return epoch;
}

export function parseXeroDate(raw: string): string {
  const match = raw.match(/\/Date\((\d+)(?:[+-]\d+)?\)\//);
  if (!match) {
    const fallback = new Date(raw);
    if (!Number.isNaN(fallback.getTime())) {
      return fallback.toISOString().slice(0, 10);
    }
    throw new Error(`Invalid Xero date format: ${raw}`);
  }
  const millis = Number(match[1]);
  if (!Number.isFinite(millis)) {
    throw new Error(`Invalid Xero date epoch: ${raw}`);
  }
  return new Date(millis).toISOString().slice(0, 10);
}

export async function fetchXeroJournalsPage(
  accessToken: string,
  tenantId: string,
  offset: number
): Promise<XeroJournalsResponse> {
  const url = `${XERO_API_BASE}/api.xro/2.0/Journals?offset=${offset}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Xero-tenant-id": tenantId,
      Accept: "application/json",
    },
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      `Xero journals fetch failed (${response.status}): ${JSON.stringify(payload)}`
    );
  }

  return (payload ?? { Journals: [] }) as XeroJournalsResponse;
}

export async function fetchXeroJournals(
  accessToken: string,
  tenantId: string,
  options: {
    fromDate?: string;
    toDate?: string;
    maxPages?: number;
  } = {}
): Promise<XeroJournal[]> {
  const maxPages = Math.max(1, options.maxPages ?? 50);
  let offset = 0;
  let pagesFetched = 0;
  const journals: JournalsWithMeta = [];

  for (let page = 0; page < maxPages; page += 1) {
    const pageResponse = await fetchXeroJournalsPage(accessToken, tenantId, offset);
    const pageJournals = Array.isArray(pageResponse.Journals)
      ? pageResponse.Journals
      : [];
    if (pageJournals.length === 0) {
      break;
    }
    pagesFetched += 1;
    journals.push(...pageJournals);
    offset += JOURNALS_PAGE_SIZE;
  }

  const fromEpoch = options.fromDate ? parseDateToEpoch(options.fromDate) : null;
  const toEpoch = options.toDate ? parseDateToEpoch(options.toDate) : null;

  const filtered = journals.filter((journal) => {
    const day = parseXeroDate(journal.JournalDate);
    const epoch = parseDateToEpoch(day);
    if (fromEpoch !== null && epoch < fromEpoch) {
      return false;
    }
    if (toEpoch !== null && epoch > toEpoch) {
      return false;
    }
    return true;
  });

  const result: JournalsWithMeta = [...filtered];
  result[XERO_PAGES_FETCHED_SYMBOL] = pagesFetched;
  return result;
}

export function getXeroJournalsPagesFetched(journals: XeroJournal[]): number {
  return (journals as JournalsWithMeta)[XERO_PAGES_FETCHED_SYMBOL] ?? 0;
}

export function normalizeXeroJournals(
  journals: XeroJournal[]
): XeroNormalizedTransaction[] {
  const normalized: XeroNormalizedTransaction[] = [];

  for (const journal of journals) {
    const date = parseXeroDate(journal.JournalDate);
    const period = date.slice(0, 7);
    const sourceType = journal.SourceType ?? "";
    const reference = [journal.SourceType, journal.SourceID]
      .filter((part): part is string => Boolean(part))
      .join("-");

    for (const line of journal.JournalLines ?? []) {
      const accountCode = String(line.AccountCode ?? "").trim();
      if (!accountCode) {
        continue;
      }
      normalized.push({
        journal_id: journal.JournalID,
        journal_number: journal.JournalNumber,
        date,
        period,
        account_code: accountCode,
        account_name: String(line.AccountName ?? ""),
        description:
          String(line.Description ?? "").trim() ||
          String(journal.Narration ?? "").trim() ||
          sourceType,
        reference,
        net_amount: Number(line.NetAmount ?? 0),
        gross_amount: Number(line.GrossAmount ?? line.NetAmount ?? 0),
        source_type: sourceType,
      });
    }
  }

  return normalized;
}

