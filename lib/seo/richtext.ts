import type { RichTextField } from "@/lib/sections/types";

/**
 * Flattens a Contentful RichText document to a single plain-text string.
 *
 * RichText fields are structured JSON, but `<meta>` tags and JSON-LD need
 * plain strings — so SEO/OG descriptions and answer summaries are run through
 * this before they reach the document head. Returns `undefined` when empty.
 */
export function richTextToPlainText(
  field: RichTextField | null | undefined
): string | undefined {
  const root = field?.json;
  if (!root) return undefined;

  const walk = (node: { nodeType?: string; value?: string; content?: unknown }): string => {
    if (typeof node?.value === "string") return node.value;
    if (Array.isArray(node?.content)) {
      // Separate top-level blocks (paragraphs, headings) with a space.
      const sep = node.nodeType === "document" ? " " : "";
      return node.content.map((c) => walk(c as never)).join(sep);
    }
    return "";
  };

  const text = walk(root).replace(/\s+/g, " ").trim();
  return text.length ? text : undefined;
}
