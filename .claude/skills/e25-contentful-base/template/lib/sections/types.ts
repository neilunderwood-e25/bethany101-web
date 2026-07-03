export type ImageAsset = {
  url: string | null;
  width?: number | null;
  height?: number | null;
};

export type SeoEntry = {
  sys: { id: string };
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoOgImage?: ImageAsset | null;
  seoNoIndex?: boolean | null;
  seoNoFollow?: boolean | null;
  seoCanonicalUrl?: string | null;
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

export type Section = UnknownSection;
