import type { InfoSection } from "@/lib/sections/types";

type InfoAmenitiesProps = { section: InfoSection };

/**
 * Info — "Aminities" variant. Figma 733:5846 (desktop 1920×867) /
 * 733:5751 (mobile 390×1007).
 *
 * A two-column spec table on the cream page background:
 *   left  — villa image, a small Cormorant heading, and a pill CTA
 *   right — a large Cormorant heading over label/value rows separated by
 *           hairline borders
 * A vertical hairline divides the columns on desktop; on mobile the layout
 * stacks with a horizontal divider. Desktop geometry uses min(Xvw, Ypx) —
 * exact Figma px at 1920, scaling proportionally below.
 */
export function InfoAmenities({ section }: InfoAmenitiesProps) {
  const {
    heading,
    secondaryHeading,
    image,
    ctaLabel,
    ctaHref,
    amenities,
    sectionId,
  } = section;

  return (
    <section
      id={sectionId ?? undefined}
      className="flex w-full flex-col items-center bg-[var(--background)] pt-[70px] lg:pt-[140px]"
    >
      <div className="flex w-full max-w-[1780px] flex-col items-start gap-[30px] px-[15px] lg:flex-row lg:gap-[min(2.604167vw,50px)] lg:px-[30px]">
        {/* Left column: image + heading + CTA */}
        <div className="flex w-full flex-col gap-[10px] lg:w-[min(31.621354vw,607.13px)] lg:shrink-0">
          {image?.url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image.url}
              alt={image.title ?? ""}
              className="aspect-[360/200] w-full object-cover lg:aspect-auto lg:h-[min(22.357813vw,429.27px)]"
            />
          )}
          <div className="flex flex-col items-start gap-[15px] lg:gap-[40px]">
            {heading && (
              <h2 className="font-semibold text-[26px] leading-[26px] text-[var(--info-heading)] lg:text-[34px] lg:leading-[34px]">
                {heading}
              </h2>
            )}
            {ctaLabel && (
              <a
                href={ctaHref || "#"}
                className="rounded-[100px] border border-[var(--header-fg)] px-[50px] pt-[14px] pb-[15px] text-[17px] font-medium leading-[20.4px] text-[var(--header-fg)] transition-colors duration-200 hover:bg-[var(--header-fg)] hover:text-white lg:py-[15px] lg:text-[18px] lg:leading-[21.6px]"
              >
                {ctaLabel}
              </a>
            )}
          </div>
        </div>

        {/* Divider: horizontal on mobile, vertical hairline on desktop. */}
        <div
          aria-hidden
          className="h-px w-full bg-[var(--info-divider)] lg:h-auto lg:w-px lg:self-stretch"
        />

        {/* Right column: heading + spec rows */}
        <div className="flex w-full flex-col gap-[20px] lg:w-[min(52.702083vw,1011.88px)] lg:gap-[min(5.208333vw,100px)]">
          {secondaryHeading && (
            <h3 className="font-semibold text-[36px] leading-[36px] text-[var(--info-heading)] lg:text-[60px] lg:leading-[60px]">
              {secondaryHeading}
            </h3>
          )}
          {!!amenities?.length && (
            <dl className="flex w-full flex-col gap-[15px] lg:gap-[20px]">
              {/* Figma's row height includes the hairline (border drawn inside
                  the box), so the padding is 1px less than the design's
                  15/20px gap to keep the row pitch exact. */}
              {amenities.map((row) => (
                <div
                  key={row.label}
                  className="grid w-full grid-cols-[minmax(0,0.5fr)_minmax(0,1fr)] items-center border-b border-[var(--info-divider)] pb-[14px] lg:pb-[19px]"
                >
                  <dt className="text-[17px] leading-[23.8px] text-[var(--info-text)] lg:text-[18px] lg:leading-[25.2px]">
                    {row.label}
                  </dt>
                  {/* Desktop: Figma anchors the value block 20px short of the
                      row's right edge (fixed-width block, justify-self-start). */}
                  <dd className="text-right text-[17px] leading-[23.8px] text-[var(--info-heading)] lg:pr-[20px] lg:text-[18px] lg:leading-[25.2px]">
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>
    </section>
  );
}
