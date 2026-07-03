import type { Metadata } from "next";
import type { SeoEntry } from "@/lib/sections/types";
import { richTextToPlainText } from "./richtext";

/**
 * Maps a Contentful `seo` entry onto a Next.js `Metadata` object:
 * title/description, keywords, canonical, Open Graph, Twitter card, and robots
 * directives (including `max-image-preview: large`, which unlocks rich results
 * and AI-overview image previews).
 */
export function buildMetadata(
  seo: SeoEntry | null | undefined,
  fallback: { title?: string | null } = {}
): Metadata {
  const title = seo?.seoTitle ?? fallback.title ?? undefined;
  const description =
    seo?.seoDescription ?? richTextToPlainText(seo?.seoAnswerSummary) ?? undefined;
  // Social overrides fall back to the SEO title/description when unset.
  const ogTitle = seo?.seoOgTitle ?? title;
  const ogDescription = richTextToPlainText(seo?.seoOgDescription) ?? description;
  const ogImageUrl = seo?.seoOgImage?.url ?? null;
  const keywords = (seo?.seoKeywords ?? []).filter(
    (k): k is string => typeof k === "string" && k.length > 0
  );
  const isArticle = seo?.seoOgType === "article";

  const images = ogImageUrl
    ? [
        {
          url: ogImageUrl,
          width: seo?.seoOgImage?.width ?? undefined,
          height: seo?.seoOgImage?.height ?? undefined,
        },
      ]
    : undefined;

  const openGraph: Metadata["openGraph"] = isArticle
    ? {
        type: "article",
        title: ogTitle,
        description: ogDescription,
        images,
        publishedTime: seo?.seoDatePublished ?? undefined,
        modifiedTime: seo?.seoDateModified ?? undefined,
        section: seo?.seoArticleSection ?? undefined,
        authors: seo?.seoAuthorName ? [seo.seoAuthorName] : undefined,
      }
    : {
        type: "website",
        title: ogTitle,
        description: ogDescription,
        images,
      };

  const twitter: Metadata["twitter"] = {
    card: seo?.seoTwitterCard ?? (ogImageUrl ? "summary_large_image" : "summary"),
    title: ogTitle,
    description: ogDescription,
    images: ogImageUrl ? [ogImageUrl] : undefined,
  };

  return {
    title,
    description,
    keywords: keywords.length ? keywords : undefined,
    authors: seo?.seoAuthorName ? [{ name: seo.seoAuthorName }] : undefined,
    alternates: seo?.seoCanonicalUrl
      ? { canonical: seo.seoCanonicalUrl }
      : undefined,
    openGraph,
    twitter,
    robots: {
      index: !(seo?.seoNoIndex ?? false),
      follow: !(seo?.seoNoFollow ?? false),
      "max-image-preview": seo?.seoMaxImagePreview ?? "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  };
}
