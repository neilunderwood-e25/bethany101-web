import { SEO_FRAGMENT } from "../fragments/seo";

/**
 * The section parts the page query needs from the registry:
 *   - `definitions`: every registered section's GraphQL fragment text,
 *     concatenated. Prepended to the query so the spreads resolve.
 *   - `spreads`: `...FragmentName` for each registered section, dropped into
 *     the `sectionsConnection` node selection.
 *
 * Built in `lib/contentstack/pages.ts` from `sectionRegistry`.
 */
export type SectionFragmentParts = {
  definitions: string;
  spreads: string;
};

/**
 * Builds the FlexiblePage-by-URL query.
 *
 * Contentstack resolves references inline, so sections come back in the same
 * round-trip via `sectionsConnection { edges { node { __typename ... } } }`.
 * Each registered section contributes a fragment on its own GraphQL type (the
 * PascalCase form of its content-type uid), so the union node only ever
 * selects fields that actually exist on each member.
 *
 * When the registry is empty, `spreads` is blank and the whole
 * `sectionsConnection` selection is omitted — that way the query stays valid
 * even before a `sections` reference field has been added to the
 * `flexible_page` content type.
 */
export const buildFlexiblePageByUrlQuery = ({
  definitions,
  spreads,
}: SectionFragmentParts) => {
  const sectionsSelection = spreads.trim()
    ? `
        sectionsConnection(limit: 20) {
          edges {
            node {
              __typename
              ${spreads}
            }
          }
        }`
    : "";

  return /* GraphQL */ `
    ${SEO_FRAGMENT}
    ${definitions}
    query FlexiblePageByUrl($url: String!, $locale: String) {
      all_flexible_page(where: { url: $url }, locale: $locale, limit: 1) {
        items {
          system {
            uid
            content_type_uid
          }
          title
          url
          seoConnection {
            edges {
              node {
                ... on Seo {
                  ...SeoFields
                }
              }
            }
          }${sectionsSelection}
        }
      }
    }
  `;
};
