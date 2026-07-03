export const SEO_FRAGMENT = /* GraphQL */ `
  fragment SeoFields on Seo {
    sys {
      id
    }
    seoTitle
    seoDescription
    seoKeywords
    seoCanonicalUrl
    seoNoIndex
    seoNoFollow
    seoMaxImagePreview
    seoOgTitle
    seoOgDescription {
      json
    }
    seoOgImage {
      url
      width
      height
    }
    seoOgType
    seoTwitterCard
    seoAnswerSummary {
      json
    }
    seoFaqs
    seoSpeakableSelectors
    seoAuthorName
    seoArticleSection
    seoDatePublished
    seoDateModified
    seoSchemaMarkup
  }
`;
