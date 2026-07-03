/**
 * Locale config. URL slugs appear as the first path segment
 * (e.g. `/es/some-page`). The slug maps to a Contentful locale code that is
 * sent on every CDA request. Non-default locales fall back to the default at
 * the Contentful level, so a partially translated space still renders without
 * blanks. To add a locale, append a new entry to LOCALE_MAP.
 */

export type LocaleConfig = {
  urlSlug: string;
  contentfulCode: string;
  displayName: string;
  htmlLang: string;
};

export const LOCALE_MAP: LocaleConfig[] = [
  {
    urlSlug: "en",
    contentfulCode: "en-US",
    displayName: "English",
    htmlLang: "en-US",
  },
  {
    urlSlug: "es",
    contentfulCode: "es-US",
    displayName: "Español",
    htmlLang: "es-US",
  },
];

export const DEFAULT_LOCALE = LOCALE_MAP[0];

export function getLocaleFromSlug(slug: string | undefined | null): LocaleConfig {
  if (!slug) return DEFAULT_LOCALE;
  return (
    LOCALE_MAP.find((l) => l.urlSlug === slug.toLowerCase()) ?? DEFAULT_LOCALE
  );
}

/**
 * Pulls a locale prefix off the front of a URL slug array.
 * - `["es", "some-page"]` → { locale: es, rest: ["some-page"] }
 * - `["some-page"]`       → { locale: en (default), rest: ["some-page"] }
 * - `[]`                  → { locale: en (default), rest: [] }
 */
export function splitLocaleFromSlug(
  slug: string[] | undefined
): { locale: LocaleConfig; rest: string[] } {
  if (!slug || slug.length === 0) {
    return { locale: DEFAULT_LOCALE, rest: [] };
  }
  const first = slug[0]?.toLowerCase();
  const match = LOCALE_MAP.find((l) => l.urlSlug === first);
  if (match) {
    return { locale: match, rest: slug.slice(1) };
  }
  return { locale: DEFAULT_LOCALE, rest: slug };
}
