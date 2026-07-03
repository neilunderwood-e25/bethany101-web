import { contentfulFetch } from "./client";
import { HEADER_QUERY } from "./graphql/queries/header";

/** One navigation link (maps the `navigationLink` content type). */
export type HeaderNavLink = {
  id: string;
  label: string;
  href: string;
};

/** Global header content (singleton `header` entry). */
export type HeaderData = {
  id: string;
  logoUrl: string | null;
  navLinks: HeaderNavLink[];
  ctaLabel: string | null;
  ctaHref: string | null;
};

type RawHeaderResponse = {
  headerCollection?: {
    items?: Array<{
      sys: { id: string };
      logo?: { url?: string | null } | null;
      ctaLabel?: string | null;
      ctaHref?: string | null;
      navLinksCollection?: {
        items?: Array<{
          sys: { id: string };
          label?: string | null;
          href?: string | null;
        } | null> | null;
      } | null;
    } | null> | null;
  } | null;
};

type FetchOptions = { preview?: boolean; locale?: string };

/** Fetch the global header. Returns null when no header entry exists. */
export async function getHeader(
  options: FetchOptions = {}
): Promise<HeaderData | null> {
  try {
    const data = await contentfulFetch<RawHeaderResponse>(
      HEADER_QUERY,
      { preview: options.preview ?? false, locale: options.locale },
      { preview: options.preview }
    );
    const node = data.headerCollection?.items?.[0];
    if (!node) return null;

    const navLinks = (node.navLinksCollection?.items ?? [])
      .filter(
        (i): i is { sys: { id: string }; label?: string | null; href?: string | null } =>
          !!i
      )
      .map((i) => ({ id: i.sys.id, label: i.label ?? "", href: i.href ?? "#" }))
      .filter((l) => l.label.length > 0);

    return {
      id: node.sys.id,
      logoUrl: node.logo?.url ?? null,
      navLinks,
      ctaLabel: node.ctaLabel ?? null,
      ctaHref: node.ctaHref ?? null,
    };
  } catch (error) {
    console.error("Failed to fetch header:", error);
    return null;
  }
}
