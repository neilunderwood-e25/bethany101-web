export type ImageAsset = {
  url: string | null;
  title?: string | null;
};

export type SeoEntry = {
  uid?: string;
  title?: string | null;
  description?: string | null;
  ogImage?: ImageAsset | null;
  noIndex?: boolean | null;
  noFollow?: boolean | null;
  canonicalUrl?: string | null;
  /** Raw JSON string from the SEO `schema_markup` field; parse before use. */
  schemaMarkup?: string | null;
};

/**
 * Every concrete section extends BaseSection and sets a unique `type` literal.
 * Add your section types to the `Section` union below as you build them out.
 * See `components/ARCHITECTURE.md` for the full pattern.
 *
 * `id` is the entry's `system.uid` (each section's fragment should select
 * `system { uid }` and map it through here) so React keys stay stable.
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
