const XERO_API_BASE = "https://api.xero.com";

export type XeroAgedReportType = "ar" | "ap";

export type XeroNormalizedSubledgerRow = {
  contact_name: string;
  due_date: string | null;
  current: number;
  days_1_30: number;
  days_31_60: number;
  days_61_90: number;
  older: number;
  total: number;
  period: string;
  as_of_date: string;
  type: "ar" | "ap";
};

export type XeroInvoice = {
  InvoiceID?: string;
  CreditNoteID?: string;
  Contact?: { ContactID?: string; Name?: string };
  Date?: string;
  DueDate?: string;
  FullyPaidOnDate?: string;
  Total?: number;
  AmountDue?: number;
  Status?: string;
  Type?: string;
  /** Internal marker: true for credit notes (they reduce the contact's balance) */
  _isCreditNote?: boolean;
};

function parseXeroDateField(value: string | undefined | null): string | null {
  if (!value) return null;
  // /Date(epoch+offset)/ format used by Xero
  const match = /\/Date\((-?\d+)([+-]\d{4})?\)\//.exec(value);
  if (match) {
    return new Date(Number(match[1])).toISOString().slice(0, 10);
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  return null;
}

function daysBetween(fromIso: string, toIso: string): number {
  const from = Date.parse(`${fromIso}T00:00:00.000Z`);
  const to = Date.parse(`${toIso}T00:00:00.000Z`);
  return Math.floor((to - from) / 86_400_000);
}

/**
 * Compute the outstanding balance as of a specific date.
 *
 * The /Invoices and /CreditNotes list endpoints do NOT return the Payments
 * array, so we rely on FullyPaidOnDate (which is in the list response):
 *
 * - FullyPaidOnDate <= asOfDate  → 0 (settled before or on asOfDate)
 * - FullyPaidOnDate > asOfDate   → Total (was fully outstanding at asOfDate,
 *                                    settled since — critical for recons done
 *                                    weeks after month-end)
 * - No FullyPaidOnDate           → AmountDue (currently open)
 *
 * Limitation: PARTIAL items with additional payments after asOfDate will
 * slightly understate the balance. Fixing this requires per-item payment
 * history (a separate API call per item), which is impractical at scale.
 */
function computeOutstandingAsOf(item: XeroInvoice, asOfDate: string): number {
  const fullyPaidOn = parseXeroDateField(item.FullyPaidOnDate);
  if (fullyPaidOn) {
    if (fullyPaidOn <= asOfDate) return 0;
    return Math.max(0, Number(item.Total ?? 0));
  }
  return Math.max(0, Number(item.AmountDue ?? 0));
}

type ContactIdSets = {
  /** All contacts with the primary role (IsCustomer for AR, IsSupplier for AP). */
  ids: Set<string>;
  /** Subset of ids that also have the opposite role (both customer AND supplier). */
  dualIds: Set<string>;
};

/**
 * Returns the set of ContactIDs that match the primary role for this report type,
 * plus a subset of those that are dual-role (both customer and supplier).
 * Dual-role contacts need AP/AR netting before appearing in the aging report.
 */
async function fetchValidContactIds(
  accessToken: string,
  tenantId: string,
  type: XeroAgedReportType
): Promise<ContactIdSets> {
  const filter = type === "ar" ? "IsCustomer==true" : "IsSupplier==true";
  const ids = new Set<string>();
  const dualIds = new Set<string>();
  for (let page = 1; page <= 20; page++) {
    const params = new URLSearchParams({
      where: filter,
      page: String(page),
    });
    const url = `${XERO_API_BASE}/api.xro/2.0/Contacts?${params}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Xero-tenant-id": tenantId,
        Accept: "application/json",
      },
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) break;
    const contacts: Array<{ ContactID?: string; IsCustomer?: boolean; IsSupplier?: boolean }> =
      Array.isArray(payload?.Contacts) ? payload.Contacts : [];
    for (const c of contacts) {
      if (!c.ContactID) continue;
      ids.add(c.ContactID);
      if (c.IsCustomer && c.IsSupplier) dualIds.add(c.ContactID);
    }
    if (contacts.length < 100) break;
  }
  return { ids, dualIds };
}

/**
 * Fetches invoices for a specific set of ContactIDs, used to pull the "opposite side"
 * invoices for dual-role contacts so we can net AR vs AP.
 */
async function fetchInvoicesForContacts(
  accessToken: string,
  tenantId: string,
  invoiceType: "ACCREC" | "ACCPAY",
  contactIds: string[],
  page: number,
  statuses = "AUTHORISED,PARTIAL,PAID"
): Promise<{ items: XeroInvoice[]; hasMore: boolean }> {
  const params = new URLSearchParams({
    Type: invoiceType,
    Statuses: statuses,
    ContactIDs: contactIds.join(","),
    order: "Date DESC",
    page: String(page),
  });
  const url = `${XERO_API_BASE}/api.xro/2.0/Invoices?${params}`;
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
      `Xero ${invoiceType} invoices (dual contacts) fetch failed (${response.status}): ${JSON.stringify(payload)}`
    );
  }
  const items: XeroInvoice[] = Array.isArray(payload?.Invoices) ? payload.Invoices : [];
  return { items, hasMore: items.length === 100 };
}

async function fetchInvoicesPage(
  accessToken: string,
  tenantId: string,
  invoiceType: "ACCREC" | "ACCPAY",
  page: number
): Promise<{ items: XeroInvoice[]; hasMore: boolean }> {
  const params = new URLSearchParams({
    Type: invoiceType,
    Statuses: "AUTHORISED,PARTIAL,PAID",
    order: "Date DESC",
    page: String(page),
  });
  const url = `${XERO_API_BASE}/api.xro/2.0/Invoices?${params}`;
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
      `Xero ${invoiceType} invoices fetch failed (${response.status}): ${JSON.stringify(payload)}`
    );
  }
  const items: XeroInvoice[] = Array.isArray(payload?.Invoices)
    ? payload.Invoices
    : [];
  return { items, hasMore: items.length === 100 };
}

async function fetchCreditNotesPage(
  accessToken: string,
  tenantId: string,
  creditNoteType: "ACCREC" | "ACCPAY",
  page: number
): Promise<{ items: XeroInvoice[]; hasMore: boolean }> {
  const params = new URLSearchParams({
    Type: creditNoteType,
    Statuses: "AUTHORISED,PARTIAL,PAID",
    order: "Date DESC",
    page: String(page),
  });
  const url = `${XERO_API_BASE}/api.xro/2.0/CreditNotes?${params}`;
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
      `Xero ${creditNoteType} credit notes fetch failed (${response.status}): ${JSON.stringify(payload)}`
    );
  }
  const items: XeroInvoice[] = Array.isArray(payload?.CreditNotes)
    ? payload.CreditNotes.map((cn: XeroInvoice) => ({ ...cn, _isCreditNote: true }))
    : [];
  return { items, hasMore: items.length === 100 };
}

async function fetchOverpaymentsPage(
  accessToken: string,
  tenantId: string,
  overpaymentType: "RECEIVE" | "PAY",
  page: number
): Promise<{ items: XeroInvoice[]; hasMore: boolean }> {
  const params = new URLSearchParams({
    Type: overpaymentType,
    Statuses: "AUTHORISED",
    order: "Date DESC",
    page: String(page),
  });
  const url = `${XERO_API_BASE}/api.xro/2.0/Overpayments?${params}`;
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
      `Xero overpayments fetch failed (${response.status}): ${JSON.stringify(payload)}`
    );
  }
  type RawOverpayment = { Contact?: { Name?: string }; Date?: string; RemainingCredit?: number };
  const items: XeroInvoice[] = Array.isArray(payload?.Overpayments)
    ? payload.Overpayments.filter((op: RawOverpayment) => (op.RemainingCredit ?? 0) > 0).map(
        (op: RawOverpayment) => ({
          Contact: op.Contact,
          Date: op.Date,
          AmountDue: op.RemainingCredit,
          _isCreditNote: true,
        })
      )
    : [];
  return { items, hasMore: items.length === 100 };
}

async function fetchPrepaymentsPage(
  accessToken: string,
  tenantId: string,
  prepaymentType: "RECEIVE" | "PAY",
  page: number
): Promise<{ items: XeroInvoice[]; hasMore: boolean }> {
  const params = new URLSearchParams({
    Type: prepaymentType,
    Statuses: "AUTHORISED",
    order: "Date DESC",
    page: String(page),
  });
  const url = `${XERO_API_BASE}/api.xro/2.0/Prepayments?${params}`;
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
      `Xero prepayments fetch failed (${response.status}): ${JSON.stringify(payload)}`
    );
  }
  type RawPrepayment = { Contact?: { Name?: string }; Date?: string; RemainingCredit?: number };
  const items: XeroInvoice[] = Array.isArray(payload?.Prepayments)
    ? payload.Prepayments.filter((pp: RawPrepayment) => (pp.RemainingCredit ?? 0) > 0).map(
        (pp: RawPrepayment) => ({
          Contact: pp.Contact,
          Date: pp.Date,
          AmountDue: pp.RemainingCredit,
          _isCreditNote: true,
        })
      )
    : [];
  return { items, hasMore: items.length === 100 };
}

async function paginateItems(
  fetchPage: (page: number) => Promise<{ items: XeroInvoice[]; hasMore: boolean }>,
  asOfDate: string,
  cutoffIso: string,
  maxPages: number
): Promise<XeroInvoice[]> {
  const all: XeroInvoice[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const { items, hasMore } = await fetchPage(page);
    if (items.length === 0) break;
    let hitCutoff = false;
    for (const item of items) {
      const itemDate = parseXeroDateField(item.Date);
      if (!itemDate) continue;
      if (itemDate > asOfDate) continue;
      if (itemDate < cutoffIso) { hitCutoff = true; break; }
      all.push(item);
    }
    if (hitCutoff || !hasMore) break;
  }
  return all;
}

export async function fetchXeroInvoicesForAging(
  accessToken: string,
  tenantId: string,
  type: XeroAgedReportType,
  asOfDate: string,
  maxPages = 50
): Promise<XeroInvoice[]> {
  const invoiceType = type === "ar" ? "ACCREC" : "ACCPAY";

  // Stop paginating once we reach items older than 24 months
  const cutoff = new Date(asOfDate);
  cutoff.setMonth(cutoff.getMonth() - 24);
  const cutoffIso = cutoff.toISOString().slice(0, 10);

  const overpaymentType = type === "ar" ? "RECEIVE" : "PAY";

  if (type === "ap") {
    // AP: fetch all ACCPAY bills with no contact-type filter.
    // Contact flags (IsSupplier) are unreliable — e.g. US Treasury and State Taxing Authority
    // have outstanding bills but IsSupplier=false in the demo company.
    //
    // To exclude customer contacts (DIISR, Ridgeway University, etc.) that may have AP bills,
    // we fetch ACCREC invoices restricted to customer contacts only and treat them as negatives.
    // Customer contacts with outstanding AR >= AP net to zero or below and are filtered out.
    // Supplier-only contacts (SMART Agency, ABC Furniture) are not in the customer set so their
    // ACCREC invoices are never fetched and their AP balances remain intact.
    const [{ ids: customerIds }, invoices, creditNotes, overpayments, prepayments] =
      await Promise.all([
        fetchValidContactIds(accessToken, tenantId, "ar"),
        paginateItems(
          (page) => fetchInvoicesPage(accessToken, tenantId, invoiceType, page),
          asOfDate,
          cutoffIso,
          maxPages
        ),
        paginateItems(
          (page) => fetchCreditNotesPage(accessToken, tenantId, invoiceType, page),
          asOfDate,
          cutoffIso,
          maxPages
        ),
        paginateItems(
          (page) => fetchOverpaymentsPage(accessToken, tenantId, overpaymentType, page),
          asOfDate,
          cutoffIso,
          maxPages
        ),
        paginateItems(
          (page) => fetchPrepaymentsPage(accessToken, tenantId, overpaymentType, page),
          asOfDate,
          cutoffIso,
          maxPages
        ),
      ]);

    // Fetch ACCREC invoices for customer contacts only, in batches to avoid URL length limits.
    let customerArAsCredits: XeroInvoice[] = [];
    if (customerIds.size > 0) {
      const customerIdList = [...customerIds];
      const BATCH_SIZE = 100;
      const batches: string[][] = [];
      for (let i = 0; i < customerIdList.length; i += BATCH_SIZE) {
        batches.push(customerIdList.slice(i, i + BATCH_SIZE));
      }
      const batchResults = await Promise.all(
        batches.map((batch) =>
          paginateItems(
            // Only AUTHORISED/PARTIAL — PAID ACCREC invoices must not cancel AP balances.
            // A contact whose AR invoices are fully paid should still appear in AP.
            (page) =>
              fetchInvoicesForContacts(
                accessToken,
                tenantId,
                "ACCREC",
                batch,
                page,
                "AUTHORISED,PARTIAL"
              ),
            asOfDate,
            cutoffIso,
            maxPages
          )
        )
      );
      customerArAsCredits = batchResults
        .flat()
        .map((inv) => ({ ...inv, _isCreditNote: true }));
    }

    return [
      ...invoices,
      ...creditNotes,
      ...customerArAsCredits,
      ...overpayments,
      ...prepayments,
    ];
  }

  // AR path: filter to customer contacts only, then net dual-role contacts' AP bills
  // so that contacts where AP >= AR are excluded (matching Xero's AR aging behaviour).
  const [{ ids: validContactIds, dualIds }, invoices, creditNotes, overpayments, prepayments] =
    await Promise.all([
      fetchValidContactIds(accessToken, tenantId, type),
      paginateItems(
        (page) => fetchInvoicesPage(accessToken, tenantId, invoiceType, page),
        asOfDate,
        cutoffIso,
        maxPages
      ),
      paginateItems(
        (page) => fetchCreditNotesPage(accessToken, tenantId, invoiceType, page),
        asOfDate,
        cutoffIso,
        maxPages
      ),
      paginateItems(
        (page) => fetchOverpaymentsPage(accessToken, tenantId, overpaymentType, page),
        asOfDate,
        cutoffIso,
        maxPages
      ),
      paginateItems(
        (page) => fetchPrepaymentsPage(accessToken, tenantId, overpaymentType, page),
        asOfDate,
        cutoffIso,
        maxPages
      ),
    ]);

  const filterByContact = (items: XeroInvoice[]) =>
    validContactIds.size === 0
      ? items
      : items.filter(
          (item) => !item.Contact?.ContactID || validContactIds.has(item.Contact.ContactID)
        );

  // For dual-role contacts, fetch their ACCPAY bills and include as negatives so
  // normalization nets AR vs AP. Contacts where AP >= AR drop to zero and are filtered out.
  let dualApBills: XeroInvoice[] = [];
  if (dualIds.size > 0) {
    const dualContactIdList = [...dualIds];
    dualApBills = (
      await paginateItems(
        (page) => fetchInvoicesForContacts(accessToken, tenantId, "ACCPAY", dualContactIdList, page),
        asOfDate,
        cutoffIso,
        maxPages
      )
    ).map((inv) => ({ ...inv, _isCreditNote: true }));
  }

  return [
    ...filterByContact(invoices),
    ...filterByContact(creditNotes),
    ...overpayments,
    ...prepayments,
    ...dualApBills,
  ];
}

export function normalizeXeroInvoicesForAging(
  items: XeroInvoice[],
  type: XeroAgedReportType,
  asOfDate: string
): XeroNormalizedSubledgerRow[] {
  const period = asOfDate.slice(0, 7);
  const byContact = new Map<string, XeroNormalizedSubledgerRow>();

  for (const item of items) {
    const outstandingAsOf = computeOutstandingAsOf(item, asOfDate);
    if (outstandingAsOf < 0.005) continue;

    // Credit notes reduce the contact's AR/AP balance
    const signedAmount = item._isCreditNote ? -outstandingAsOf : outstandingAsOf;

    const contactName = item.Contact?.Name?.trim() || "Unknown Contact";
    const dueDateStr = parseXeroDateField(item.DueDate);
    const daysOverdue = dueDateStr ? daysBetween(dueDateStr, asOfDate) : 0;

    let row = byContact.get(contactName);
    if (!row) {
      row = {
        contact_name: contactName,
        due_date: dueDateStr,
        current: 0,
        days_1_30: 0,
        days_31_60: 0,
        days_61_90: 0,
        older: 0,
        total: 0,
        period,
        as_of_date: asOfDate,
        type,
      };
      byContact.set(contactName, row);
    }

    if (daysOverdue <= 0) {
      row.current += signedAmount;
    } else if (daysOverdue <= 30) {
      row.days_1_30 += signedAmount;
    } else if (daysOverdue <= 60) {
      row.days_31_60 += signedAmount;
    } else if (daysOverdue <= 90) {
      row.days_61_90 += signedAmount;
    } else {
      row.older += signedAmount;
    }
    row.total += signedAmount;

    // Track earliest due date per contact for display
    if (dueDateStr && (!row.due_date || dueDateStr < row.due_date)) {
      row.due_date = dueDateStr;
    }
  }

  // Filter out contacts where credit notes fully offset all invoices
  return [...byContact.values()]
    .filter((row) => Math.abs(row.total) >= 0.005)
    .sort((a, b) => b.total - a.total);
}
