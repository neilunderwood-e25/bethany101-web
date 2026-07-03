export const SEO_FRAGMENT = /* GraphQL */ `
  fragment SeoFields on Seo {
    sys {
      id
    }
    seoTitle
    seoDescription
    seoOgImage {
      url
      width
      height
    }
    seoNoIndex
    seoNoFollow
    seoCanonicalUrl
    seoSchemaMarkup
  }
`;
