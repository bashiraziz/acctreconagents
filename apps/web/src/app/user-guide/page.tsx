import Link from "next/link";
import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { promises as fs } from "fs";
import path from "path";

type GuideHeading = {
  id: string;
  level: number;
  text: string;
  displayText: string;
};

async function loadUserGuide(): Promise<string> {
  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, "USER_GUIDE.md"),
    path.join(cwd, "..", "..", "USER_GUIDE.md"),
  ];

  for (const candidate of candidates) {
    try {
      return await fs.readFile(candidate, "utf8");
    } catch {
      // try next location
    }
  }

  return "# User Guide\n\nUser guide file not found in this build.";
}

function slugifyHeading(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}

function cleanHeadingText(text: string) {
  let cleaned = text.replace(/\*\*/g, "").trim();
  cleaned = cleaned.replace(/^"+|"+$/g, "");
  cleaned = cleaned.replace(/^\d+\.\s+/, "");
  return cleaned;
}

function createSlugger() {
  const counts = new Map<string, number>();
  return (text: string) => {
    const base = slugifyHeading(text);
    const nextCount = (counts.get(base) ?? 0) + 1;
    counts.set(base, nextCount);
    return nextCount > 1 ? `${base}-${nextCount}` : base;
  };
}

function extractHeadings(markdown: string): GuideHeading[] {
  const headings: GuideHeading[] = [];
  const slugger = createSlugger();
  const lines = markdown.split("\n");

  for (const line of lines) {
    const match = line.match(/^(#{1,3})\s+(.*)$/);
    if (!match) continue;
    const level = match[1].length;
    const text = match[2].trim();
    if (!text) continue;
    headings.push({
      id: slugger(text),
      level,
      text,
      displayText: cleanHeadingText(text),
    });
  }

  return headings;
}

function extractText(node: ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (node && typeof node === "object" && "props" in node) {
    const props = node.props as { children?: React.ReactNode };
    return extractText(props.children);
  }
  return "";
}

export default async function UserGuidePage() {
  const content = await loadUserGuide();
  const headings = extractHeadings(content);
  const slugger = createSlugger();

  return (
    <div className="min-h-screen theme-bg">
      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
        <header className="theme-card theme-border rounded-3xl border p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Link
                href="/"
                className="text-sm font-medium text-amber-500 hover:text-amber-400"
              >
                ← Back to app
              </Link>
              <h1 className="mt-2 text-2xl font-bold theme-text sm:text-3xl">
                User Guide
              </h1>
              <p className="mt-1 text-sm theme-text-muted">
                Read the guide here and return without using the browser back button.
              </p>
              <p className="mt-2 text-xs theme-text-muted">
                Prefer the repo view? Use “View on GitHub”.
              </p>
            </div>
            <Link
              href="https://github.com/bashiraziz/acctreconagents/blob/main/USER_GUIDE.md"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border theme-border theme-card px-4 py-2 text-sm font-medium theme-text transition-colors hover:theme-muted"
            >
              View on GitHub
            </Link>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1fr_240px]">
          <div className="theme-card theme-border rounded-3xl border p-6">
            <article className="guide-content">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children }) => (
                    <h1 id={slugger(extractText(children))} className="scroll-mt-24">
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => (
                    <h2 id={slugger(extractText(children))} className="scroll-mt-24">
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 id={slugger(extractText(children))} className="scroll-mt-24">
                      {children}
                    </h3>
                  ),
                }}
              >
                {content}
              </ReactMarkdown>
            </article>
          </div>

          <aside className="theme-card theme-border rounded-3xl border p-5 lg:sticky lg:top-6 lg:self-start">
            <p className="text-xs font-semibold uppercase theme-text-muted">
              On this page
            </p>
            {headings.length === 0 ? (
              <p className="mt-3 text-sm theme-text-muted">No sections found.</p>
            ) : (
              <nav className="mt-3 space-y-2 text-sm">
                {headings.map((heading) => (
                  <a
                    key={heading.id}
                    href={`#${heading.id}`}
                    className={`block rounded-lg px-2 py-1 transition hover:theme-muted ${
                      heading.level === 1
                        ? "font-semibold theme-text"
                        : heading.level === 2
                          ? "theme-text"
                          : "pl-4 text-xs theme-text-muted"
                    }`}
                  >
                    {heading.displayText}
                  </a>
                ))}
              </nav>
            )}
          </aside>
        </section>
      </main>
    </div>
  );
}
