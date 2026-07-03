/**
 * Per-section hydrate query for the `hero` content type. Fetched by the Hero
 * SectionDefinition's `hydrate()` (a second round-trip after the page stubs).
 * Asset fields expose `url`/`width`/`height`/`title`.
 */
export const HERO_BY_ID = /* GraphQL */ `
  query HeroById($id: String!, $preview: Boolean, $locale: String) {
    hero(id: $id, preview: $preview, locale: $locale) {
      sys {
        id
      }
      frontEndComponent
      sectionId
      heading
      backgroundImage {
        url
        width
        height
        title
      }
      mobileImage {
        url
        width
        height
        title
      }
    }
  }
`;
