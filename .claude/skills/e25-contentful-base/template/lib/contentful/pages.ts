import { contentfulFetch } from "./client";
import { FLEXIBLE_PAGE_BY_SLUG } from "./graphql/queries/flexiblePage";
import { sectionRegistry } from "@/lib/sections/registry";
import type { HydrateOptions } from "@/lib/sections/config";
import type { Section, SeoEntry, UnknownSection } from "@/lib/sections/types";

type SectionStub = {
  __typename: string;
  sys: { id: string };
};

export type FlexiblePage = {
  sys: { id: string };
  slug: string;
  pageTitle: string | null;
  seo: SeoEntry | null;
  sections: Section[];
};

type FlexiblePageBySlugResponse = {
  flexiblePageCollection?: {
    items?: Array<{
      sys: { id: string };
      slug: string;
      pageTitle?: string | null;
      seo?: SeoEntry | null;
      sectionsCollection?: {
        items?: Array<SectionStub | null> | null;
      } | null;
    }>;
  };
};

type FetchOptions = {
  preview?: boolean;
  locale?: string;
};

async function hydrateSections(
  stubs: SectionStub[],
  options: HydrateOptions
): Promise<Section[]> {
  const results = await Promise.all(
    stubs.map(async (stub) => {
      const config = sectionRegistry.find(
        (s) => s.contentfulTypename === stub.__typename
      );
      if (!config) {
        return {
          id: stub.sys.id,
          type: "unknown",
          raw: stub,
        } satisfies UnknownSection;
      }
      return config.hydrate(stub.sys.id, options);
    })
  );
  return results.filter((s): s is Section => s !== null);
}

export const getFlexiblePageBySlug = async (
  slug: string,
  options: FetchOptions = {}
): Promise<FlexiblePage | null> => {
  const requestPage = async (requestedSlug: string) => {
    try {
      const data = await contentfulFetch<FlexiblePageBySlugResponse>(
        FLEXIBLE_PAGE_BY_SLUG,
        { slug: requestedSlug, preview: options.preview ?? false },
        { preview: options.preview }
      );
      return data.flexiblePageCollection?.items?.[0] ?? null;
    } catch (error) {
      console.error(`Failed to fetch page with slug "${requestedSlug}":`, error);
      return null;
    }
  };

  let page = await requestPage(slug);
  if (!page && slug.startsWith("/")) page = await requestPage(slug.slice(1));
  else if (!page && !slug.startsWith("/")) page = await requestPage(`/${slug}`);
  if (!page) return null;

  const stubs = (page.sectionsCollection?.items ?? []).filter(
    (s): s is SectionStub => s !== null
  );
  const sections = await hydrateSections(stubs, {
    preview: options.preview,
    locale: options.locale,
  });

  return {
    sys: page.sys,
    slug: page.slug,
    pageTitle: page.pageTitle ?? null,
    seo: page.seo ?? null,
    sections,
  };
};
