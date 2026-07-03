import type { InfoSection } from "@/lib/sections/types";

type InfoDefaultProps = { section: InfoSection };

/**
 * Info — "Default" variant. Figma 726:5598 (desktop 1920×1426) /
 * 726:5579 (mobile 390×1345).
 *
 * Desktop (≥lg): a large Cormorant heading (top-left), a full-bleed landscape
 * image absolutely anchored top-right, then a two-column row — a tall portrait
 * image (left) beside the body copy + CTA (right, aligned to the row bottom).
 * Mobile (<lg): a simple stack — heading, portrait image, body, CTA, then a
 * full-bleed landscape image.
 */
export function InfoDefault({ section }: InfoDefaultProps) {
  const { heading, body, image, secondaryImage, ctaLabel, ctaHref, sectionId } =
    section;

  return (
    <section
      id={sectionId ?? undefined}
      className="relative flex w-full flex-col items-center gap-[30px] bg-[var(--background)] pt-[50px] pb-[70px] lg:gap-0 lg:pt-[100px] lg:pb-[140px]"
    >
      <div className="flex w-full max-w-[1780px] flex-col items-start gap-[20px] px-[15px] lg:gap-0 lg:px-[30px]">
        {/* Desktop geometry is fluid: min(Xvw, Ypx) equals the Figma px at
            1920 and scales proportionally below it, so the fixed-width columns
            and the absolute right image never collide on narrower desktops. */}
        {heading && (
          <h2 className="font-semibold text-[40px] leading-[40px] text-[var(--info-heading)] lg:max-w-[min(40.3125vw,774px)] lg:pb-[min(6.25vw,120px)] lg:text-[72px] lg:leading-[72px]">
            {heading}
          </h2>
        )}

        <div className="flex w-full flex-col items-end gap-[29.25px] lg:flex-row lg:justify-center lg:gap-[min(7.8125vw,150px)]">
          {image?.url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image.url}
              alt={image.title ?? ""}
              className="h-[400px] w-full shrink-0 object-cover lg:h-[min(44.270833vw,850px)] lg:w-[min(38.28125vw,735px)]"
            />
          )}

          <div className="flex w-full flex-col items-start gap-[20px] lg:w-[min(43.489583vw,835px)] lg:gap-[40px] lg:pb-[min(6.25vw,120px)] lg:pr-[min(5.208333vw,100px)]">
            {body && (
              <p className="text-[21px] leading-[31.5px] text-[var(--info-text)] lg:text-[22px] lg:leading-[33px]">
                {body}
              </p>
            )}
            {ctaLabel && (
              <a
                href={ctaHref || "#"}
                className="rounded-[100px] border border-[var(--header-fg)] px-[50px] py-[15px] text-[17px] font-medium leading-[20.4px] text-[var(--header-fg)] transition-colors duration-200 hover:bg-[var(--header-fg)] hover:text-white lg:text-[18px] lg:leading-[21.6px]"
              >
                {ctaLabel}
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Secondary landscape image: full-bleed block on mobile (bottom);
          absolutely anchored top-right on desktop. */}
      {secondaryImage?.url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={secondaryImage.url}
          alt={secondaryImage.title ?? ""}
          className="aspect-[390/240] w-full object-cover lg:absolute lg:top-[100px] lg:right-0 lg:aspect-auto lg:h-[min(28.645833vw,550px)] lg:w-[min(40vw,768px)]"
        />
      )}
    </section>
  );
}
