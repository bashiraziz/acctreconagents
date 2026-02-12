import { describe, expect, it } from "vitest";
import {
  cleanHeadingText,
  extractMarkdownHeadings,
  extractUserGuideTocHeadings,
} from "@/lib/user-guide-headings";

const mixedLineEndingMarkdown = [
  "# Guide Title\r\n",
  "## Table of Contents\r\n",
  "## Understanding Your Results\r\n",
  "### Reconciliation Summary\n",
  "### \"Amounts are wrong sign\"\r\n",
  "### \u201cI did not receive a reset email\u201d\r\n",
  "### 1. **Simple Balanced (Perfect Reconciliation)**\n",
  "## FAQ\r\n",
  "## FAQ\r\n",
].join("");

describe("user-guide heading extraction", () => {
  it("extracts all headings with stable unique ids across mixed line endings", () => {
    const headings = extractMarkdownHeadings(mixedLineEndingMarkdown);

    expect(headings).toHaveLength(9);
    expect(headings.map((heading) => heading.id)).toEqual([
      "guide-title",
      "table-of-contents",
      "understanding-your-results",
      "reconciliation-summary",
      "amounts-are-wrong-sign",
      "i-did-not-receive-a-reset-email",
      "1-simple-balanced-perfect-reconciliation",
      "faq",
      "faq-2",
    ]);
  });

  it("builds TOC entries from only H2 and H3 headings and excludes meta sections", () => {
    const toc = extractUserGuideTocHeadings(mixedLineEndingMarkdown);

    expect(toc.every((heading) => heading.level === 2 || heading.level === 3)).toBe(
      true
    );
    expect(toc.map((heading) => heading.displayText)).toEqual([
      "Understanding Your Results",
      "Reconciliation Summary",
      "Amounts are wrong sign",
      "I did not receive a reset email",
      "Simple Balanced (Perfect Reconciliation)",
      "FAQ",
      "FAQ",
    ]);
  });

  it("normalizes quotes and numeric prefixes for display text", () => {
    expect(cleanHeadingText("\"Quoted heading\"")).toBe("Quoted heading");
    expect(cleanHeadingText("\u201cCurly quoted heading\u201d")).toBe(
      "Curly quoted heading"
    );
    expect(cleanHeadingText("1. **Simple Balanced**")).toBe("Simple Balanced");
  });
});
