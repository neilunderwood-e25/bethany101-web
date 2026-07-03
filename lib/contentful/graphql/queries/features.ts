/**
 * Per-section hydrate query for the `features` content type. Fetched by the
 * Features SectionDefinition's `hydrate()`.
 */
export const FEATURES_BY_ID = /* GraphQL */ `
  query FeaturesById($id: String!, $preview: Boolean, $locale: String) {
    features(id: $id, preview: $preview, locale: $locale) {
      sys {
        id
      }
      frontEndComponent
      sectionId
      heading
      backgroundVideo {
        url
        contentType
      }
      backgroundImage {
        url
        width
        height
        title
      }
      itemsCollection(limit: 8) {
        items {
          sys {
            id
          }
          title
          body
          icon {
            url
            title
          }
        }
      }
    }
  }
`;
