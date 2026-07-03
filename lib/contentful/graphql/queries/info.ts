/**
 * Per-section hydrate query for the `info` content type. Fetched by the Info
 * SectionDefinition's `hydrate()`.
 */
export const INFO_BY_ID = /* GraphQL */ `
  query InfoById($id: String!, $preview: Boolean, $locale: String) {
    info(id: $id, preview: $preview, locale: $locale) {
      sys {
        id
      }
      frontEndComponent
      sectionId
      heading
      secondaryHeading
      body
      amenities
      image {
        url
        width
        height
        title
      }
      secondaryImage {
        url
        width
        height
        title
      }
      ctaLabel
      ctaHref
    }
  }
`;
