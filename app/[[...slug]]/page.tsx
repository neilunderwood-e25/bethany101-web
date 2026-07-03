import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFlexiblePageBySlug } from "@/lib/contentful/pages";
import { getHeader } from "@/lib/contentful/header";
import { SectionsRenderer } from "@/lib/sections/SectionsRenderer";
import { Header } from "@/components/layout/Header";
import { splitLocaleFromSlug } from "@/lib/i18n/locale";
import { buildMetadata } from "@/lib/seo/metadata";
import { buildJsonLd } from "@/lib/seo/jsonld";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug?: string[] }>;
};

const slugPathFrom = (segments: string[]) =>
  segments.length ? `/${segments.join("/")}` : "/";

export const generateMetadata = async ({
  params,
}: PageProps): Promise<Metadata> => {
  const { slug } = await params;
  const { locale, rest } = splitLocaleFromSlug(slug);
  const page = await getFlexiblePageBySlug(slugPathFrom(rest), {
    locale: locale.contentfulCode,
  });
  if (!page) return {};

  return buildMetadata(page.seo, { title: page.pageTitle });
};

export default async function FlexiblePageRoute({ params }: PageProps) {
  const { slug } = await params;
  const { locale, rest } = splitLocaleFromSlug(slug);
  const slugPath = slugPathFrom(rest);
  const page = await getFlexiblePageBySlug(slugPath, {
    locale: locale.contentfulCode,
  });
  if (!page) notFound();

  const jsonLd = buildJsonLd(page.seo, { title: page.pageTitle });

  // The header is global layout chrome shown on every page. On the homepage it
  // sits under the hero (the first section); on every other page it sits on top.
  const isHome = slugPath === "/";
  const header = await getHeader({ locale: locale.contentfulCode });
  const headerEl = header ? <Header header={header} /> : null;

  return (
    <>
      {jsonLd.map((node, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(node) }}
        />
      ))}
      {!isHome && headerEl}
      <main lang={locale.htmlLang}>
        <SectionsRenderer
          sections={page.sections}
          afterFirstSection={isHome ? headerEl : null}
        />
      </main>
    </>
  );
}
