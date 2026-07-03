import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFlexiblePageBySlug } from "@/lib/contentful/pages";
import { SectionsRenderer } from "@/lib/sections/SectionsRenderer";
import { splitLocaleFromSlug } from "@/lib/i18n/locale";

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

  const seo = page.seo;
  const title = seo?.seoTitle ?? page.pageTitle ?? undefined;
  const description = seo?.seoDescription ?? undefined;
  const ogImage = seo?.seoOgImage?.url ?? null;

  return {
    title,
    description,
    alternates: seo?.seoCanonicalUrl ? { canonical: seo.seoCanonicalUrl } : undefined,
    openGraph: ogImage
      ? {
          title,
          description,
          images: [
            {
              url: ogImage,
              width: seo?.seoOgImage?.width ?? undefined,
              height: seo?.seoOgImage?.height ?? undefined,
            },
          ],
        }
      : undefined,
    robots:
      seo?.seoNoIndex || seo?.seoNoFollow
        ? { index: !seo.seoNoIndex, follow: !seo.seoNoFollow }
        : undefined,
  };
};

export default async function FlexiblePageRoute({ params }: PageProps) {
  const { slug } = await params;
  const { locale, rest } = splitLocaleFromSlug(slug);
  const slugPath = slugPathFrom(rest);
  const page = await getFlexiblePageBySlug(slugPath, {
    locale: locale.contentfulCode,
  });
  if (!page) notFound();

  return (
    <main lang={locale.htmlLang}>
      <SectionsRenderer sections={page.sections} />
    </main>
  );
}
