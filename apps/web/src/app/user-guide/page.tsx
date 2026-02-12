import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { promises as fs } from "fs";
import path from "path";

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

export default async function UserGuidePage() {
  const content = await loadUserGuide();

  return (
    <div className="min-h-screen theme-bg">
      <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
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

        <section className="theme-card theme-border rounded-3xl border p-6">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {content}
          </ReactMarkdown>
        </section>
      </main>
    </div>
  );
}
