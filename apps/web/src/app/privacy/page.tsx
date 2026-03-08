import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — Rowshni",
  description: "How Rowshni collects, uses, and protects your data.",
};

const EFFECTIVE_DATE = "6 March 2026";
const CONTACT_EMAIL = "bashiraziz+rowshni@gmail.com"
const APP_NAME = "Rowshni";
const APP_URL = "https://www.rowshni.xyz";

type SectionProps = {
  title: string;
  children: React.ReactNode;
};

function Section({ title, children }: SectionProps) {
  return (
    <section className="rounded-3xl border theme-border theme-card p-6 space-y-3">
      <h2 className="text-base font-semibold uppercase tracking-[0.3em] theme-text">
        {title}
      </h2>
      <div className="space-y-3 text-sm theme-text-muted leading-relaxed">
        {children}
      </div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen theme-bg">
      <main className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-10">

        <header className="theme-card theme-border border-b p-6">
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] theme-text-muted">
              Legal
            </p>
            <Link
              href="/"
              className="text-xs font-semibold uppercase tracking-[0.3em] theme-text-muted transition hover:underline"
            >
              Back to home
            </Link>
          </div>
          <h1 className="mt-2 text-3xl font-semibold theme-text">Privacy Policy</h1>
          <p className="mt-2 text-sm theme-text-muted">
            Effective date: {EFFECTIVE_DATE}
          </p>
        </header>

        <Section title="Who we are">
          <p>
            {APP_NAME} (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) operates the
            application available at{" "}
            <span className="theme-text font-medium">{APP_URL}</span>. We provide AI-powered
            accounting reconciliation services that help finance teams match general ledger
            balances against subledger records and external data sources.
          </p>
          <p>
            Questions about this policy can be sent to{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="theme-text underline underline-offset-2 hover:opacity-75"
            >
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </Section>

        <Section title="Data we collect">
          <p>We collect the following categories of data:</p>
          <ul className="list-disc list-inside space-y-2 pl-2">
            <li>
              <span className="theme-text font-medium">Account information</span> — your name,
              email address, and password (hashed) when you create an account.
            </li>
            <li>
              <span className="theme-text font-medium">Xero accounting data</span> — trial balance
              figures, account codes, account names, and your Xero organisation name,
              fetched on your request via the Xero API. We do not collect transaction-level
              detail, customer records, or bank feeds unless you explicitly request a report
              that includes them.
            </li>
            <li>
              <span className="theme-text font-medium">Uploaded files</span> — CSV, TSV, or TXT
              files you upload for reconciliation (GL exports, subledger exports,
              transaction files).
            </li>
            <li>
              <span className="theme-text font-medium">OAuth tokens</span> — access and refresh
              tokens issued by Xero when you connect your account. These are stored
              encrypted at rest and used solely to retrieve data on your behalf.
            </li>
            <li>
              <span className="theme-text font-medium">Usage data</span> — basic request logs
              (route, timestamp, status code) for operational monitoring. We do not sell or
              share this data.
            </li>
          </ul>
        </Section>

        <Section title="How we use your data">
          <p>We use the data we collect to:</p>
          <ul className="list-disc list-inside space-y-2 pl-2">
            <li>Authenticate you and maintain your session.</li>
            <li>
              Fetch accounting reports from Xero on your behalf and present them within
              the application.
            </li>
            <li>
              Run AI-assisted reconciliation analysis against data you upload or import.
            </li>
            <li>Save your column mappings and reconciliation history so you do not have
              to reconfigure on each session.</li>
            <li>Send transactional emails related to your account (password reset, etc.).</li>
            <li>Monitor application health and diagnose errors.</li>
          </ul>
          <p>
            We do not use your accounting data to train AI models, sell to third parties,
            or for any purpose other than providing the service to you.
          </p>
        </Section>

        <Section title="Xero integration">
          <p>
            When you connect your Xero account, you authorise {APP_NAME} to access your
            Xero data under the following scopes:
          </p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>openid, profile, email — to identify your Xero account</li>
            <li>accounting.reports.read — to fetch trial balance and financial reports</li>
            <li>accounting.transactions.read — to fetch transaction-level data when requested</li>
            <li>offline_access — to refresh your access token without requiring you to re-authenticate</li>
          </ul>
          <p>
            You can disconnect {APP_NAME} from your Xero account at any time from the
            Integrations page. Disconnecting immediately invalidates your stored tokens.
            You can also revoke access from within Xero at{" "}
            <span className="theme-text font-medium">My Xero &rarr; Connected Apps</span>.
          </p>
          <p>
            {APP_NAME} is built on the Xero API. Your use of the Xero integration is also
            subject to{" "}
            <a
              href="https://developer.xero.com/documentation/api/developer-agreements-and-policies/"
              target="_blank"
              rel="noopener noreferrer"
              className="theme-text underline underline-offset-2 hover:opacity-75"
            >
              Xero&apos;s developer agreements and policies
            </a>
            .
          </p>
        </Section>

        <Section title="Data storage and security">
          <p>
            Your data is stored on infrastructure operated by our sub-processors:
          </p>
          <ul className="list-disc list-inside space-y-2 pl-2">
            <li>
              <span className="theme-text font-medium">Vercel</span> — application hosting and
              serverless functions (United States).
            </li>
            <li>
              <span className="theme-text font-medium">Vercel Postgres (Neon)</span> — database
              storing your account, mappings, Xero tokens, and reconciliation history.
              Data is encrypted at rest and in transit.
            </li>
            <li>
              <span className="theme-text font-medium">Vercel Blob / AWS S3</span> — file storage
              for uploaded CSVs. Files are stored with access controls scoped to your
              account.
            </li>
            <li>
              <span className="theme-text font-medium">Anthropic / OpenAI</span> — AI providers
              used to analyse reconciliation results. Data sent to these providers is
              governed by their respective data processing agreements and is not used to
              train their models under our agreements.
            </li>
          </ul>
          <p>
            All data is transmitted over HTTPS/TLS. OAuth tokens are stored encrypted.
            We apply the principle of least privilege — each system component accesses
            only the data it needs to function.
          </p>
        </Section>

        <Section title="Data retention">
          <ul className="list-disc list-inside space-y-2 pl-2">
            <li>
              <span className="theme-text font-medium">Xero OAuth tokens</span> — retained while
              your Xero integration is active. Deleted immediately on disconnect.
            </li>
            <li>
              <span className="theme-text font-medium">Uploaded files</span> — retained for 30
              days after upload, then automatically deleted.
            </li>
            <li>
              <span className="theme-text font-medium">Reconciliation history</span> — retained
              for 12 months, then purged.
            </li>
            <li>
              <span className="theme-text font-medium">Account data</span> — retained while your
              account is active. Deleted within 30 days of a verified account deletion
              request.
            </li>
          </ul>
        </Section>

        <Section title="Cookies">
          <p>
            We use strictly necessary session cookies to maintain your login state and
            OAuth flow security (CSRF state tokens). We do not use advertising or
            tracking cookies. Our analytics provider (Vercel Analytics) collects
            aggregate, anonymised page view data only — no individual tracking.
          </p>
        </Section>

        <Section title="Changes to this policy">
          <p>
            We may update this policy from time to time. Material changes will be
            communicated by updating the effective date above and, where appropriate,
            by email. Continued use of the service after changes take effect constitutes
            acceptance of the updated policy.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            For privacy-related questions or requests, contact us at{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="theme-text underline underline-offset-2 hover:opacity-75"
            >
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </Section>

        <footer className="pb-4 text-center text-xs theme-text-muted">
          &copy; {new Date().getFullYear()} {APP_NAME}. All rights reserved.
        </footer>

      </main>
    </div>
  );
}
