export type ImageAsset = {
  url: string | null;
  width?: number | null;
  height?: number | null;
  title?: string | null;
};

export type SeoFaq = {
  question: string;
  answer: string;
};

export type RichTextNode = {
  nodeType: string;
  value?: string;
  content?: RichTextNode[];
  data?: Record<string, unknown>;
  marks?: { type: string }[];
};

/** GraphQL shape of a Contentful RichText field. */
export type RichTextField = {
  json: RichTextNode;
};

export type SeoEntry = {
  sys: { id: string };
  // Core meta
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoKeywords?: (string | null)[] | null;
  // Indexing / canonical
  seoCanonicalUrl?: string | null;
  seoNoIndex?: boolean | null;
  seoNoFollow?: boolean | null;
  seoMaxImagePreview?: "none" | "standard" | "large" | null;
  // Social
  seoOgTitle?: string | null;
  seoOgDescription?: RichTextField | null;
  seoOgImage?: ImageAsset | null;
  seoOgType?: "website" | "article" | "product" | "profile" | null;
  seoTwitterCard?: "summary" | "summary_large_image" | null;
  // Answer Engine Optimization (AEO)
  seoAnswerSummary?: RichTextField | null;
  seoFaqs?: SeoFaq[] | null;
  seoSpeakableSelectors?: (string | null)[] | null;
  // E-E-A-T / freshness
  seoAuthorName?: string | null;
  seoArticleSection?: string | null;
  seoDatePublished?: string | null;
  seoDateModified?: string | null;
  // Custom structured-data override
  seoSchemaMarkup?: unknown | null;
};

/**
 * Every concrete section extends BaseSection and sets a unique `type` literal.
 * Add your section types to the `Section` union below as you build them out.
 * See `components/ARCHITECTURE.md` for the full pattern.
 */
export type BaseSection = {
  id: string;
  type: string;
};

export type UnknownSection = BaseSection & {
  type: "unknown";
  raw: unknown;
};

/**
 * Hero — full-bleed banner: a background image (separate desktop/mobile crops)
 * under a dark overlay, with a large display wordmark anchored bottom-center.
 * Routed to a visual variant by `frontEndComponent`. Figma 714:5498 (desktop
 * 1920×840) / 714:5488 (mobile 390×390).
 */
export type HeroSection = BaseSection & {
  type: "hero";
  frontEndComponent: string;
  sectionId?: string | null;
  heading: string;
  backgroundImage?: ImageAsset | null;
  mobileImage?: ImageAsset | null;
};

/**
 * Info — editorial section: a large Cormorant heading, a portrait image, a body
 * paragraph + CTA pill, and a full-bleed landscape image. Routed by
 * `frontEndComponent`. Figma 726:5598 (desktop 1920×1426) / 726:5579 (mobile
 * 390×1345).
 */
/** One label/value row in the Info "Aminities" spec table. */
export type AmenityRow = {
  label: string;
  value: string;
};

export type InfoSection = BaseSection & {
  type: "info";
  frontEndComponent: string;
  sectionId?: string | null;
  heading: string;
  /** Right-column heading in the "Aminities" variant. */
  secondaryHeading?: string | null;
  body?: string | null;
  image?: ImageAsset | null;
  secondaryImage?: ImageAsset | null;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  /** Label/value rows for the "Aminities" spec table. */
  amenities?: AmenityRow[] | null;
};

/** One card in the Features section (maps the `featureItem` content type). */
export type FeatureItem = {
  id: string;
  title: string;
  body?: string | null;
  icon?: ImageAsset | null;
};

/**
 * Features — dark full-bleed band: a looping background video (with an image
 * fallback/poster) under a brown gradient overlay, a large Cormorant heading,
 * and a row of icon feature cards separated by hairline dividers (stacked on
 * mobile). Routed by `frontEndComponent`. Figma 728:5619 (desktop 1920×1130) /
 * 728:5690 (mobile 390×1151).
 */
export type FeaturesSection = BaseSection & {
  type: "features";
  frontEndComponent: string;
  sectionId?: string | null;
  heading: string;
  backgroundVideoUrl?: string | null;
  backgroundImage?: ImageAsset | null;
  items: FeatureItem[];
};

export type Section =
  | UnknownSection
  | HeroSection
  | InfoSection
  | FeaturesSection;
