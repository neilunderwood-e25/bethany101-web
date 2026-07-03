export const SEO_FRAGMENT = /* GraphQL */ `
  fragment SeoFields on Seo {
    system {
      uid
    }
    title
    description
    og_imageConnection {
      edges {
        node {
          url
          title
        }
      }
    }
    no_index
    no_follow
    canonical_url
    schema_markup
  }
`;
