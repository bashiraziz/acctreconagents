import Link from "next/link";
import { UserMenu } from "@/components/auth/user-menu";

export default function LandingPage() {
  return (
    <div className="min-h-screen theme-bg">

      {/* ── Hero (always dark, brand moment) ─────────────────────────── */}
      <section
        style={{ background: "#08121f", color: "#f8fafc" }}
        className="relative overflow-hidden"
      >
        {/* Nav */}
        <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-5">
          <span className="text-xl font-bold tracking-tight" style={{ color: "#f8fafc" }}>
            Rowshni
          </span>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link
              href="https://github.com/bashiraziz/acctreconagents"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline text-sm transition-opacity hover:opacity-70"
              style={{ color: "#94a3b8" }}
            >
              GitHub
            </Link>
            <Link
              href="/user-guide"
              className="hidden sm:inline text-sm transition-opacity hover:opacity-70"
              style={{ color: "#94a3b8" }}
            >
              User Guide
            </Link>
            <UserMenu />
          </div>
        </nav>

        {/* Hero copy */}
        <div className="mx-auto max-w-4xl px-6 pb-32 pt-20 text-center sm:pt-28">
          <p
            className="text-xs font-semibold uppercase tracking-[0.22em]"
            style={{ color: "#f59e0b" }}
          >
            Agentic AI · GL-to-subledger reconciliation
          </p>

          <h1
            className="mt-5 text-6xl font-bold tracking-tight sm:text-7xl lg:text-8xl"
            style={{ color: "#f8fafc", lineHeight: 1.05 }}
          >
            Rowshni
          </h1>

          <p
            className="mt-5 text-2xl font-medium sm:text-3xl"
            style={{ color: "#cbd5e1" }}
          >
            Shedding{" "}
            <span style={{ color: "#f59e0b" }}>light</span>
            {" "}on your ledger
          </p>

          <p
            className="mx-auto mt-6 max-w-2xl text-base leading-relaxed sm:text-lg"
            style={{ color: "#94a3b8" }}
          >
            Four AI agents work in sequence —{" "}
            <span style={{ color: "#f8fafc" }}>Validate</span>,{" "}
            <span style={{ color: "#f8fafc" }}>Analyse</span>,{" "}
            <span style={{ color: "#f8fafc" }}>Investigate</span>,{" "}
            <span style={{ color: "#f8fafc" }}>Report</span>{" "}
            — to illuminate your GL-to-subledger variances in minutes.
          </p>

          <div className="mt-10 flex justify-center">
            <Link
              href="/app"
              style={{
                background: "#f59e0b",
                borderColor: "#f59e0b",
                color: "#08121f",
                fontSize: "1rem",
                padding: "0.8rem 2.2rem",
                borderRadius: "9999px",
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
              }}
            >
              Start reconciling →
            </Link>
          </div>
        </div>

        {/* Subtle gradient fade to page background */}
        <div
          className="pointer-events-none absolute bottom-0 left-0 right-0 h-24"
          style={{
            background:
              "linear-gradient(to bottom, transparent, #08121f)",
          }}
        />
      </section>

      {/* ── Features ──────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-6 py-20 sm:py-28">
        <div className="text-center">
          <p className="ui-kicker">How it works</p>
          <h2 className="mt-2 text-3xl font-bold theme-text sm:text-4xl">
            Four steps to a clear close
          </h2>
          <p className="ui-copy mx-auto mt-3 max-w-xl">
            Rowshni means <span className="font-medium theme-text">light</span> — and that&apos;s what it brings to your month-end close.
            No accounting system connection required. Just upload your files.
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => (
            <div key={f.title} className="ui-panel flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold"
                  style={{ background: "#f59e0b22", color: "#f59e0b" }}
                >
                  {i + 1}
                </span>
                <h3 className="text-sm font-semibold theme-text">{f.title}</h3>
              </div>
              <p className="text-sm theme-text-muted leading-relaxed">{f.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Why Rowshni ───────────────────────────────────────────────── */}
      <section className="border-t theme-border">
        <div className="mx-auto max-w-7xl px-6 py-20 sm:py-28">
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-20 lg:items-center">
            <div>
              <p className="ui-kicker">Built for accountants</p>
              <h2 className="mt-2 text-3xl font-bold theme-text sm:text-4xl">
                Month-end close,{" "}
                <span style={{ color: "#f59e0b" }}>illuminated</span>
              </h2>
              <p className="ui-copy mt-4 max-w-lg">
                Rowshni means &ldquo;light&rdquo;. It gives your reconciliation team
                the clarity they need — surfacing variances, flagging material
                differences, and generating a full report automatically.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/app" className="btn btn-primary btn-md btn-pill">
                  Start reconciling
                </Link>
                <Link href="/user-guide" className="btn btn-secondary btn-md btn-pill">
                  Read the guide
                </Link>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {whyItems.map((item) => (
                <div key={item.label} className="rounded-2xl border theme-border theme-muted p-5">
                  <p
                    className="text-lg font-bold"
                    style={{ color: "#f59e0b" }}
                  >
                    {item.stat}
                  </p>
                  <p className="mt-1 text-sm font-semibold theme-text">{item.label}</p>
                  <p className="mt-1 text-xs theme-text-muted leading-relaxed">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ────────────────────────────────────────────────── */}
      <section
        style={{ background: "#08121f", borderColor: "#1e293b" }}
        className="border-t"
      >
        <div className="mx-auto max-w-3xl px-6 py-24 text-center">
          <h2
            className="text-3xl font-bold sm:text-4xl"
            style={{ color: "#f8fafc" }}
          >
            Ready to{" "}
            <span style={{ color: "#f59e0b" }}>illuminate</span>
            ?
          </h2>
          <p className="mt-4 text-base" style={{ color: "#94a3b8" }}>
            Free to use. No accounting system connection required.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/app"
              style={{
                background: "#f59e0b",
                borderColor: "#f59e0b",
                color: "#08121f",
                fontSize: "1rem",
                padding: "0.8rem 2.2rem",
                borderRadius: "9999px",
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              Start reconciling →
            </Link>
            <Link
              href="/sign-in"
              style={{
                border: "1px solid #334155",
                background: "transparent",
                color: "#cbd5e1",
                fontSize: "1rem",
                padding: "0.8rem 2rem",
                borderRadius: "9999px",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <footer
        style={{ background: "#08121f", borderColor: "#1e293b" }}
        className="border-t px-6 py-8"
      >
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
          <span className="text-sm font-medium" style={{ color: "#cbd5e1" }}>
            Rowshni — Shedding light on your ledger
          </span>
          <div className="flex items-center gap-4">
            <Link
              href="https://github.com/bashiraziz/acctreconagents"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm transition-opacity hover:opacity-70"
              style={{ color: "#94a3b8" }}
            >
              GitHub
            </Link>
            <span style={{ color: "#334155" }}>|</span>
            <Link
              href="/user-guide"
              className="text-sm transition-opacity hover:opacity-70"
              style={{ color: "#94a3b8" }}
            >
              User Guide
            </Link>
            <span style={{ color: "#334155" }}>|</span>
            <Link
              href="/privacy"
              className="text-sm transition-opacity hover:opacity-70"
              style={{ color: "#94a3b8" }}
            >
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

const features = [
  {
    title: "Upload",
    detail:
      "GL trial balance and subledger in CSV, TSV, TXT, or Excel. Period and currency auto-detected.",
  },
  {
    title: "Map",
    detail:
      "Match your column headers to canonical fields. Auto-Suggest handles most of it. Mappings are saved.",
  },
  {
    title: "Preview",
    detail:
      "Review transformed records and fix validation issues before running. Sortable tables with variance drill-down.",
  },
  {
    title: "Illuminate",
    detail:
      "Four AI agents — Validate, Analyse, Investigate, Report — produce a full reconciliation report.",
  },
];

const whyItems = [
  {
    stat: "4 agents",
    label: "Agentic AI pipeline",
    detail: "Validate → Analyse → Investigate → Report. Each agent hands off to the next automatically.",
  },
  {
    stat: "Any CSV",
    label: "No lock-in",
    detail: "Works with exports from any accounting system — QuickBooks, Xero, SAP, NetSuite.",
  },
  {
    stat: "Seconds",
    label: "Time to first insight",
    detail: "From file upload to AI-generated variance report in under a minute.",
  },
  {
    stat: "Open source",
    label: "Fully transparent",
    detail: "Self-host it, fork it, or use the hosted version. MIT licensed.",
  },
];
