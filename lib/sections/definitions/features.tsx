import type { SectionDefinition, HydrateOptions } from "@/lib/sections/config";
import type { FeaturesSection, FeatureItem, ImageAsset } from "@/lib/sections/types";
import { contentfulFetch } from "@/lib/contentful/client";
import { FEATURES_BY_ID } from "@/lib/contentful/graphql/queries/features";
import { Features } from "@/components/sections/Features";

type RawAsset = {
  url?: string | null;
  width?: number | null;
  height?: number | null;
  title?: string | null;
} | null;

type RawFeatures = {
  sys: { id: string };
  frontEndComponent?: string | null;
  sectionId?: string | null;
  heading?: string | null;
  backgroundVideo?: { url?: string | null } | null;
  backgroundImage?: RawAsset;
  itemsCollection?: {
    items?: Array<{
      sys: { id: string };
      title?: string | null;
      body?: string | null;
      icon?: { url?: string | null; title?: string | null } | null;
    } | null> | null;
  } | null;
} | null;

const mapAsset = (asset: RawAsset): ImageAsset | null =>
  asset
    ? {
        url: asset.url ?? null,
        width: asset.width ?? null,
        height: asset.height ?? null,
        title: asset.title ?? null,
      }
    : null;

async function hydrateFeatures(
  id: string,
  options: HydrateOptions
): Promise<FeaturesSection | null> {
  const data = await contentfulFetch<{ features: RawFeatures }>(
    FEATURES_BY_ID,
    { id, preview: options.preview ?? false, locale: options.locale },
    { preview: options.preview }
  );
  const node = data.features;
  if (!node) return null;

  const items: FeatureItem[] = (node.itemsCollection?.items ?? [])
    .filter((i): i is NonNullable<typeof i> => !!i)
    .map((i) => ({
      id: i.sys.id,
      title: i.title ?? "",
      body: i.body ?? null,
      icon: i.icon?.url ? { url: i.icon.url, title: i.icon.title ?? null } : null,
    }));

  return {
    id: node.sys.id,
    type: "features",
    frontEndComponent: node.frontEndComponent ?? "Default",
    sectionId: node.sectionId ?? null,
    heading: node.heading ?? "",
    backgroundVideoUrl: node.backgroundVideo?.url ?? null,
    backgroundImage: mapAsset(node.backgroundImage ?? null),
    items,
  };
}

export const featuresDefinition: SectionDefinition = {
  contentfulTypename: "Features",
  type: "features",
  hydrate: hydrateFeatures,
  render: (section) => <Features section={section as FeaturesSection} />,
};
