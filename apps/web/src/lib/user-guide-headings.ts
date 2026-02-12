import { unified } from "unified";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";

export type GuideHeading = {
  id: string;
  level: number;
  text: string;
  displayText: string;
};

type MarkdownNode = {
  type?: string;
  depth?: number;
  value?: string;
  children?: MarkdownNode[];
};

export function slugifyHeading(text: string) {
  return text
    .replace(/\uFEFF/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}

export function cleanHeadingText(text: string) {
  let cleaned = text.replace(/\*\*/g, "").replace(/\uFEFF/g, "").trim();
  cleaned = cleaned.replace(/^[\"'“”]+|[\"'“”]+$/g, "");
  cleaned = cleaned.replace(/^\d+\.\s+/, "");
  return cleaned;
}

export function createSlugger() {
  const counts = new Map<string, number>();
  return (text: string) => {
    const base = slugifyHeading(text);
    const nextCount = (counts.get(base) ?? 0) + 1;
    counts.set(base, nextCount);
    return nextCount > 1 ? `${base}-${nextCount}` : base;
  };
}

function extractNodeText(node: MarkdownNode): string {
  if (node.type === "text" || node.type === "inlineCode") {
    return node.value ?? "";
  }

  if (!Array.isArray(node.children) || node.children.length === 0) {
    return "";
  }

  return node.children.map(extractNodeText).join("");
}

function walkForHeadings(node: MarkdownNode, visitor: (node: MarkdownNode) => void) {
  visitor(node);
  if (!Array.isArray(node.children)) return;
  for (const child of node.children) {
    walkForHeadings(child, visitor);
  }
}

export function extractMarkdownHeadings(markdown: string): GuideHeading[] {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(markdown) as MarkdownNode;
  const slugger = createSlugger();
  const headings: GuideHeading[] = [];

  walkForHeadings(tree, (node) => {
    const depth = node.depth;
    if (node.type !== "heading" || typeof depth !== "number") return;
    if (depth < 1 || depth > 3) return;

    const text = extractNodeText(node).trim();
    if (!text) return;

    headings.push({
      id: slugger(text),
      level: depth,
      text,
      displayText: cleanHeadingText(text),
    });
  });

  return headings;
}

export function extractUserGuideTocHeadings(markdown: string): GuideHeading[] {
  return extractMarkdownHeadings(markdown).filter((heading) => {
    if (heading.level !== 2 && heading.level !== 3) {
      return false;
    }
    return heading.displayText.toLowerCase() !== "table of contents";
  });
}
