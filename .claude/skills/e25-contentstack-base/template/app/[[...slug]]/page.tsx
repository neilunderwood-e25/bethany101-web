import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFlexiblePageByUrl } from "@/lib/contentstack/pages";
import { SectionsRenderer } from "@/lib/sections/SectionsRenderer";
import { splitLocaleFromSlug } from "@/lib/i18n/locale";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug?: string[] }>;
};

const urlPathFrom = (segments: string[]) =>
  segments.length ? `/${segments.join("/")}` : "/";

export const generateMetadata = async ({
  params,
}: PageProps): Promise<Metadata> => {
  const { slug } = await params;
  const { locale, rest } = splitLocaleFromSlug(slug);
  const page = await getFlexiblePageByUrl(urlPathFrom(rest), {
    locale: locale.contentstackCode,
  });
  if (!page) return {};

  const seo = page.seo;
  const title = seo?.title ?? page.pageTitle ?? undefined;
  const description = seo?.description ?? undefined;
  const ogImage = seo?.ogImage?.url ?? null;

  return {
    title,
    description,
    alternates: seo?.canonicalUrl ? { canonical: seo.canonicalUrl } : undefined,
    openGraph: ogImage
      ? {
          title,
          description,
          images: [{ url: ogImage }],
        }
      : undefined,
    robots:
      seo?.noIndex || seo?.noFollow
        ? { index: !seo.noIndex, follow: !seo.noFollow }
        : undefined,
  };
};

export default async function FlexiblePageRoute({ params }: PageProps) {
  const { slug } = await params;
  const { locale, rest } = splitLocaleFromSlug(slug);
  const page = await getFlexiblePageByUrl(urlPathFrom(rest), {
    locale: locale.contentstackCode,
  });
  if (!page) notFound();

  return (
    <main lang={locale.htmlLang}>
      <SectionsRenderer sections={page.sections} />
    </main>
  );
}
