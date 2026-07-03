import type { SeoEntry, SeoFaq } from "@/lib/sections/types";
import { richTextToPlainText } from "./richtext";

type JsonLd = Record<string, unknown>;

/**
 * Builds the JSON-LD structured-data graph from a Contentful `seo` entry.
 *
 * This is the primary AEO (Answer Engine Optimization) lever: search and
 * answer engines (Google AI Overviews, Perplexity, ChatGPT, voice assistants)
 * parse these blocks to extract direct answers, FAQs, authorship, and
 * speakable regions. Emits:
 *   - WebPage / Article  (with author, dates, keywords, abstract)
 *   - FAQPage            (from seoFaqs → featured-snippet / voice answers)
 *   - SpeakableSpecification embedded on the page node
 *   - any custom seoSchemaMarkup, appended verbatim
 *
 * Render each returned object in a <script type="application/ld+json">.
 */
export function buildJsonLd(
  seo: SeoEntry | null | undefined,
  ctx: { url?: string | null; title?: string | null; description?: string | null } = {}
): JsonLd[] {
  const graph: JsonLd[] = [];
  if (!seo) return graph;

  const isArticle = seo.seoOgType === "article";
  const url = ctx.url ?? seo.seoCanonicalUrl ?? undefined;
  const keywords = (seo.seoKeywords ?? []).filter(
    (k): k is string => typeof k === "string" && k.length > 0
  );

  const page: JsonLd = {
    "@context": "https://schema.org",
    "@type": isArticle ? "Article" : "WebPage",
  };
  if (url) {
    page["@id"] = url;
    page.url = url;
  }
  const name = ctx.title ?? seo.seoTitle ?? undefined;
  if (name) {
    page.name = name;
    if (isArticle) page.headline = name;
  }
  const description = ctx.description ?? seo.seoDescription ?? undefined;
  if (description) page.description = description;
  const answerSummary = richTextToPlainText(seo.seoAnswerSummary);
  if (answerSummary) page.abstract = answerSummary;
  if (keywords.length) page.keywords = keywords.join(", ");
  if (seo.seoArticleSection) page.articleSection = seo.seoArticleSection;
  if (seo.seoDatePublished) page.datePublished = seo.seoDatePublished;
  if (seo.seoDateModified) page.dateModified = seo.seoDateModified;
  if (seo.seoAuthorName)
    page.author = { "@type": "Person", name: seo.seoAuthorName };
  if (seo.seoOgImage?.url) page.image = seo.seoOgImage.url;

  const speakable = (seo.seoSpeakableSelectors ?? []).filter(
    (s): s is string => typeof s === "string" && s.length > 0
  );
  if (speakable.length) {
    page.speakable = {
      "@type": "SpeakableSpecification",
      cssSelector: speakable,
    };
  }
  graph.push(page);

  const faqs = (seo.seoFaqs ?? []).filter(
    (f): f is SeoFaq =>
      !!f && typeof f.question === "string" && typeof f.answer === "string"
  );
  if (faqs.length) {
    graph.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: { "@type": "Answer", text: f.answer },
      })),
    });
  }

  // Custom override / extra JSON-LD, appended as-is (object or array of objects).
  const custom = seo.seoSchemaMarkup;
  if (Array.isArray(custom)) {
    graph.push(...(custom.filter((c) => c && typeof c === "object") as JsonLd[]));
  } else if (custom && typeof custom === "object") {
    graph.push(custom as JsonLd);
  }

  return graph;
}
