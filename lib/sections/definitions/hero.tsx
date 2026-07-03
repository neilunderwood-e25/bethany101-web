import type { SectionDefinition, HydrateOptions } from "@/lib/sections/config";
import type { HeroSection, ImageAsset } from "@/lib/sections/types";
import { contentfulFetch } from "@/lib/contentful/client";
import { HERO_BY_ID } from "@/lib/contentful/graphql/queries/hero";
import { Hero } from "@/components/sections/Hero";

type RawAsset = {
  url?: string | null;
  width?: number | null;
  height?: number | null;
  title?: string | null;
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

type RawHero = {
  sys: { id: string };
  frontEndComponent?: string | null;
  sectionId?: string | null;
  heading?: string | null;
  backgroundImage?: RawAsset;
  mobileImage?: RawAsset;
} | null;

async function hydrateHero(
  id: string,
  options: HydrateOptions
): Promise<HeroSection | null> {
  const data = await contentfulFetch<{ hero: RawHero }>(
    HERO_BY_ID,
    { id, preview: options.preview ?? false, locale: options.locale },
    { preview: options.preview }
  );
  const node = data.hero;
  if (!node) return null;

  return {
    id: node.sys.id,
    type: "hero",
    frontEndComponent: node.frontEndComponent ?? "Default",
    sectionId: node.sectionId ?? null,
    heading: node.heading ?? "",
    backgroundImage: mapAsset(node.backgroundImage ?? null),
    mobileImage: mapAsset(node.mobileImage ?? null),
  };
}

export const heroDefinition: SectionDefinition = {
  contentfulTypename: "Hero",
  type: "hero",
  hydrate: hydrateHero,
  render: (section) => <Hero section={section as HeroSection} />,
};
