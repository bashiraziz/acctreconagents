import Link from "next/link";

const integrations = [
  {
    id: "xero",
    name: "Xero",
    description:
      "Pull trial balance and journal transactions directly from Xero via the Xero API. Supports OAuth authentication.",
    status: "available" as const,
    href: "/integrations/xero",
    docsHref:
      "https://github.com/bashiraziz/acctreconagents/blob/main/docs/INTEGRATION_GUIDE.md",
  },
];

const planned = [
  { name: "QuickBooks Online", description: "Direct API integration via Intuit OAuth." },
  { name: "Odoo", description: "Pull GL and journal entries via the Odoo JSON-RPC or REST API." },
  { name: "Microsoft Dynamics 365", description: "Pull trial balance and transactions via the Dynamics 365 Finance OData API." },
  { name: "NetSuite", description: "SuiteAnalytics or SuiteTalk REST API integration with multi-currency and dimensional data support." },
  { name: "MYOB", description: "Pull GL and transactions via the MYOB AccountRight API." },
  { name: "Sage Intacct", description: "Pull GL balances and journal entries via the Sage Intacct XML API." },
  { name: "SAP S/4HANA", description: "Pull trial balance and journal entries via SAP OData APIs." },
];

export default function IntegrationsPage() {
  return (
    <div className="min-h-screen theme-bg">
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-10">
        {/* Header */}
        <header className="mb-8">
          <Link href="/" className="btn btn-secondary btn-sm">
            ← Back to app
          </Link>
          <h1 className="mt-4 text-2xl font-bold theme-text sm:text-3xl">
            Accounting System Integrations
          </h1>
          <p className="mt-2 theme-text-muted">
            Connect your accounting system to pull data directly into Rowshni. Integrations are
            optional — you can always upload CSV or Excel files manually.
          </p>
        </header>

        {/* PoC notice */}
        <div className="mb-8 rounded-xl border theme-border theme-muted px-4 py-3 text-sm theme-text-muted">
          <span className="font-semibold theme-text">Open source:</span> Rowshni is designed to
          work with any accounting system via file upload. Direct API integrations are optional
          connectors — Xero is the reference implementation showing how to build one. See the{" "}
          <a
            href="https://github.com/bashiraziz/acctreconagents/blob/main/docs/INTEGRATION_GUIDE.md"
            target="_blank"
            rel="noopener noreferrer"
            className="underline theme-text hover:opacity-80"
          >
            Integration Guide
          </a>{" "}
          to contribute an integration for your system.
        </div>

        {/* Available integrations */}
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide theme-text-muted">
            Available
          </h2>
          <div className="space-y-3">
            {integrations.map((integration) => (
              <div
                key={integration.id}
                className="rounded-xl border theme-border theme-card p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold theme-text">{integration.name}</h3>
                      <span className="rounded-full border theme-border px-2 py-0.5 text-xs theme-text-muted">
                        Reference implementation
                      </span>
                    </div>
                    <p className="mt-1 text-sm theme-text-muted">{integration.description}</p>
                  </div>
                  <Link
                    href={integration.href}
                    className="btn btn-primary btn-sm shrink-0"
                  >
                    Open
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Planned integrations */}
        <section className="mt-8">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide theme-text-muted">
            Planned / Community contributions welcome
          </h2>
          <div className="space-y-3">
            {planned.map((item) => (
              <div
                key={item.name}
                className="rounded-xl border theme-border theme-muted p-5 opacity-60"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold theme-text">{item.name}</h3>
                    <p className="mt-1 text-sm theme-text-muted">{item.description}</p>
                  </div>
                  <span className="shrink-0 rounded-full border theme-border px-2 py-0.5 text-xs theme-text-muted">
                    Not yet available
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Contribute CTA */}
        <section className="mt-8 rounded-xl border theme-border theme-muted p-6 text-center">
          <h2 className="font-semibold theme-text">Use a different system?</h2>
          <p className="mt-1 text-sm theme-text-muted">
            Any accounting system that exports CSV, TSV, TXT, or Excel works with Rowshni out of
            the box via file upload. For a direct API integration, follow the Integration Guide.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Link href="/" className="btn btn-primary btn-sm">
              Upload files manually
            </Link>
            <a
              href="https://github.com/bashiraziz/acctreconagents/blob/main/docs/INTEGRATION_GUIDE.md"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-sm"
            >
              Integration Guide
            </a>
            <a
              href="https://github.com/bashiraziz/acctreconagents/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-sm"
            >
              Request an integration
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}
