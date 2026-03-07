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
    <section className="rounded-3xl border theme-border bg-slate-950/60 p-6 space-y-3">
      <h2 className="text-base font-semibold uppercase tracking-[0.3em] text-slate-300">
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
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-300">
              Legal
            </p>
            <Link
              href="/"
              className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400 transition hover:text-slate-200"
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
            <span className="text-slate-300">{APP_URL}</span>. We provide AI-powered
            accounting reconciliation services that help finance teams match general ledger
            balances against subledger records and external data sources.
          </p>
          <p>
            Questions about this policy can be sent to{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-slate-300 underline underline-offset-2 hover:text-white"
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
              <span className="text-slate-300">Account information</span> — your name,
              email address, and password (hashed) when you create an account.
            </li>
            <li>
              <span className="text-slate-300">Xero accounting data</span> — trial balance
              figures, account codes, account names, and your Xero organisation name,
              fetched on your request via the Xero API. We do not collect transaction-level
              detail, customer records, or bank feeds unless you explicitly request a report
              that includes them.
            </li>
            <li>
              <span className="text-slate-300">Uploaded files</span> — CSV, TSV, or TXT
              files you upload for reconciliation (GL exports, subledger exports,
              transaction files).
            </li>
            <li>
              <span className="text-slate-300">OAuth tokens</span> — access and refresh
              tokens issued by Xero when you connect your account. These are stored
              encrypted at rest and used solely to retrieve data on your behalf.
            </li>
            <li>
              <span className="text-slate-300">Usage data</span> — basic request logs
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
            <span className="text-slate-300">My Xero &rarr; Connected Apps</span>.
          </p>
          <p>
            {APP_NAME} is built on the Xero API. Your use of the Xero integration is also
            subject to{" "}
            <a
              href="https://developer.xero.com/documentation/api/developer-agreements-and-policies/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-300 underline underline-offset-2 hover:text-white"
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
              <span className="text-slate-300">Vercel</span> — application hosting and
              serverless functions (United States).
            </li>
            <li>
              <span className="text-slate-300">Vercel Postgres (Neon)</span> — database
              storing your account, mappings, Xero tokens, and reconciliation history.
              Data is encrypted at rest and in transit.
            </li>
            <li>
              <span className="text-slate-300">Vercel Blob / AWS S3</span> — file storage
              for uploaded CSVs. Files are stored with access controls scoped to your
              account.
            </li>
            <li>
              <span className="text-slate-300">Anthropic / OpenAI</span> — AI providers
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
              <span className="text-slate-300">Xero OAuth tokens</span> — retained while
              your Xero integration is active. Deleted immediately on disconnect.
            </li>
            <li>
              <span className="text-slate-300">Uploaded files</span> — retained for 30
              days after upload, then automatically deleted.
            </li>
            <li>
              <span className="text-slate-300">Reconciliation history</span> — retained
              for 12 months, then purged.
            </li>
            <li>
              <span className="text-slate-300">Account data</span> — retained while your
              account is active. Deleted within 30 days of a verified account deletion
              request.
            </li>
          </ul>
        </Section>

        {/* <Section title="Your rights">
          <p>You have the right to:</p>
          <ul className="list-disc list-inside space-y-2 pl-2">
            <li>
              <span className="text-slate-300">Access</span> — request a copy of the
              personal data we hold about you.
            </li>
            <li>
              <span className="text-slate-300">Correction</span> — ask us to correct
              inaccurate data.
            </li>
            <li>
              <span className="text-slate-300">Deletion</span> — request deletion of your
              account and all associated data.
            </li>
            <li>
              <span className="text-slate-300">Portability</span> — request your data in
              a machine-readable format.
            </li>
            <li>
              <span className="text-slate-300">Objection</span> — object to processing in
              certain circumstances.
            </li>
          </ul>
          <p>
            To exercise any of these rights, email{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-slate-300 underline underline-offset-2 hover:text-white"
            >
              {CONTACT_EMAIL}
            </a>
            . We will respond within 30 days.
          </p>
        </Section> */}

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
              className="text-slate-300 underline underline-offset-2 hover:text-white"
            >
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </Section>

        <footer className="pb-4 text-center text-xs text-slate-600">
          &copy; {new Date().getFullYear()} {APP_NAME}. All rights reserved.
        </footer>

      </main>
    </div>
  );
}
