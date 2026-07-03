/**
 * Global site header query. The header is a singleton layout entry (not a page
 * section), so we fetch the first `header` entry plus its linked
 * `navigationLink` entries (label + href) and the CTA.
 */
export const HEADER_QUERY = /* GraphQL */ `
  query HeaderData($preview: Boolean, $locale: String) {
    headerCollection(limit: 1, preview: $preview, locale: $locale) {
      items {
        sys {
          id
        }
        logo {
          url
        }
        ctaLabel
        ctaHref
        navLinksCollection(limit: 12) {
          items {
            sys {
              id
            }
            label
            href
          }
        }
      }
    }
  }
`;
