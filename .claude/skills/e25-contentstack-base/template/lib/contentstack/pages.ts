import { contentstackFetch } from "./client";
import { buildFlexiblePageByUrlQuery } from "./graphql/queries/flexiblePage";
import { sectionRegistry } from "@/lib/sections/registry";
import type { RawSectionNode } from "@/lib/sections/config";
import type { Section, SeoEntry, UnknownSection } from "@/lib/sections/types";

type RawSeoNode = {
  system?: { uid: string } | null;
  title?: string | null;
  description?: string | null;
  og_imageConnection?: {
    edges?: Array<{ node?: { url?: string | null; title?: string | null } | null } | null> | null;
  } | null;
  no_index?: boolean | null;
  no_follow?: boolean | null;
  canonical_url?: string | null;
  schema_markup?: string | null;
} | null;

type RawFlexiblePage = {
  system: { uid: string; content_type_uid: string };
  title?: string | null;
  url: string;
  seoConnection?: {
    edges?: Array<{ node?: RawSeoNode } | null> | null;
  } | null;
  sectionsConnection?: {
    edges?: Array<{ node?: RawSectionNode | null } | null> | null;
  } | null;
};

type FlexiblePageResponse = {
  all_flexible_page?: {
    items?: RawFlexiblePage[] | null;
  };
};

export type FlexiblePage = {
  uid: string;
  url: string;
  pageTitle: string | null;
  seo: SeoEntry | null;
  sections: Section[];
};

type FetchOptions = {
  preview?: boolean;
  locale?: string;
};

const mapSeo = (node: RawSeoNode): SeoEntry | null => {
  if (!node) return null;
  const og = node.og_imageConnection?.edges?.[0]?.node ?? null;
  return {
    uid: node.system?.uid,
    title: node.title ?? null,
    description: node.description ?? null,
    ogImage: og ? { url: og.url ?? null, title: og.title ?? null } : null,
    noIndex: node.no_index ?? null,
    noFollow: node.no_follow ?? null,
    canonicalUrl: node.canonical_url ?? null,
    schemaMarkup: node.schema_markup ?? null,
  };
};

const mapSections = (page: RawFlexiblePage): Section[] => {
  const nodes = (page.sectionsConnection?.edges ?? [])
    .map((edge) => edge?.node ?? null)
    .filter((node): node is RawSectionNode => node !== null);

  return nodes.map((node, index) => {
    const config = sectionRegistry.find(
      (s) => s.contentstackTypename === node.__typename
    );
    if (!config) {
      return {
        id: `unknown-${index}`,
        type: "unknown",
        raw: node,
      } satisfies UnknownSection;
    }
    return config.transform(node);
  });
};

export const getFlexiblePageByUrl = async (
  url: string,
  options: FetchOptions = {}
): Promise<FlexiblePage | null> => {
  const query = buildFlexiblePageByUrlQuery({
    definitions: sectionRegistry.map((s) => s.fragment).join("\n"),
    spreads: sectionRegistry.map((s) => `...${s.fragmentName}`).join("\n"),
  });

  const requestPage = async (requestedUrl: string) => {
    try {
      const data = await contentstackFetch<FlexiblePageResponse>(
        query,
        { url: requestedUrl, locale: options.locale ?? null },
        { preview: options.preview }
      );
      return data.all_flexible_page?.items?.[0] ?? null;
    } catch (error) {
      console.error(`Failed to fetch page with url "${requestedUrl}":`, error);
      return null;
    }
  };

  let page = await requestPage(url);
  if (!page && url.startsWith("/")) page = await requestPage(url.slice(1));
  else if (!page && !url.startsWith("/")) page = await requestPage(`/${url}`);
  if (!page) return null;

  return {
    uid: page.system.uid,
    url: page.url,
    pageTitle: page.title ?? null,
    seo: mapSeo(page.seoConnection?.edges?.[0]?.node ?? null),
    sections: mapSections(page),
  };
};
