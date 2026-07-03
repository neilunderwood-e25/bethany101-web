import type { SectionDefinition, HydrateOptions } from "@/lib/sections/config";
import type { InfoSection, ImageAsset, AmenityRow } from "@/lib/sections/types";
import { contentfulFetch } from "@/lib/contentful/client";
import { INFO_BY_ID } from "@/lib/contentful/graphql/queries/info";
import { Info } from "@/components/sections/Info";

type RawAsset = {
  url?: string | null;
  width?: number | null;
  height?: number | null;
  title?: string | null;
} | null;

type RawInfo = {
  sys: { id: string };
  frontEndComponent?: string | null;
  sectionId?: string | null;
  heading?: string | null;
  secondaryHeading?: string | null;
  body?: string | null;
  image?: RawAsset;
  secondaryImage?: RawAsset;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  amenities?: unknown;
} | null;

/** Narrow the raw `amenities` JSON field to well-formed label/value rows. */
const mapAmenities = (raw: unknown): AmenityRow[] | null => {
  if (!Array.isArray(raw)) return null;
  const rows = raw.filter(
    (r): r is AmenityRow =>
      !!r && typeof r.label === "string" && typeof r.value === "string"
  );
  return rows.length ? rows : null;
};

const mapAsset = (asset: RawAsset): ImageAsset | null =>
  asset
    ? {
        url: asset.url ?? null,
        width: asset.width ?? null,
        height: asset.height ?? null,
        title: asset.title ?? null,
      }
    : null;

async function hydrateInfo(
  id: string,
  options: HydrateOptions
): Promise<InfoSection | null> {
  const data = await contentfulFetch<{ info: RawInfo }>(
    INFO_BY_ID,
    { id, preview: options.preview ?? false, locale: options.locale },
    { preview: options.preview }
  );
  const node = data.info;
  if (!node) return null;

  return {
    id: node.sys.id,
    type: "info",
    frontEndComponent: node.frontEndComponent ?? "Default",
    sectionId: node.sectionId ?? null,
    heading: node.heading ?? "",
    secondaryHeading: node.secondaryHeading ?? null,
    body: node.body ?? null,
    image: mapAsset(node.image ?? null),
    secondaryImage: mapAsset(node.secondaryImage ?? null),
    ctaLabel: node.ctaLabel ?? null,
    ctaHref: node.ctaHref ?? null,
    amenities: mapAmenities(node.amenities),
  };
}

export const infoDefinition: SectionDefinition = {
  contentfulTypename: "Info",
  type: "info",
  hydrate: hydrateInfo,
  render: (section) => <Info section={section as InfoSection} />,
};
