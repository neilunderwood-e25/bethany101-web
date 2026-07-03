import type { HeroSection } from "@/lib/sections/types";

type HeroDefaultProps = { section: HeroSection };

/**
 * Hero — "Default" variant. Figma 714:5498 (desktop 1920×840) /
 * 714:5488 (mobile 390×390).
 *
 * A full-bleed background photo under a 35% dark-brown overlay, with a huge
 * Cormorant SemiBold wordmark anchored bottom-center. All display metrics use
 * fluid `calc()` interpolated between the two Figma frames, so the section is
 * pixel-exact at 1920px and 390px and scales smoothly between (matching the
 * live site). Values were derived linearly from the two frames:
 *   font-size   470px@1920 → 90px@390
 *   line-height 360px@1920 → 80px@390
 *   height      840px@1920 → 390px@390
 *   padding-x   100px@1920 → 15px@390 ; padding-bottom 20px@1920 → 15px@390
 */
export function HeroDefault({ section }: HeroDefaultProps) {
  const { heading, sectionId, backgroundImage, mobileImage } = section;
  const desktopSrc = backgroundImage?.url ?? null;
  const mobileSrc = mobileImage?.url ?? desktopSrc;

  return (
    <section
      id={sectionId ?? undefined}
      className="relative w-full overflow-hidden bg-[var(--background)]"
      style={{ height: "calc(29.4118vw + 275.294px)" }}
    >
      {/* Background photo (separate desktop / mobile crops), with a slow
          zoom-out fade-in on load. */}
      <div
        data-hero-image
        className="absolute inset-0 z-0 [animation:hero-image-in_1.2s_ease-out_both]"
      >
        {desktopSrc && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={desktopSrc}
            alt={backgroundImage?.title ?? ""}
            className="hidden size-full object-cover object-center sm:block"
          />
        )}
        {mobileSrc && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={mobileSrc}
            alt={mobileImage?.title ?? backgroundImage?.title ?? ""}
            className="size-full object-cover object-center sm:hidden"
          />
        )}
      </div>

      {/* Dark-brown overlay at 35%. z-10 so it composites above the
          transformed (animated) image layer. */}
      <div className="absolute inset-0 z-10 bg-[var(--hero-overlay)] opacity-[0.35]" />

      {/* Wordmark, anchored to the bottom, centered. */}
      <div
        className="absolute inset-x-0 bottom-0 z-20 flex justify-center"
        style={{
          paddingLeft: "calc(5.5556vw - 6.667px)",
          paddingRight: "calc(5.5556vw - 6.667px)",
          // Lifted from the ~20px Figma value so descenders (e.g. the "y" in
          // "Bethany") clear the section's bottom edge instead of clipping.
          paddingBottom: "calc(3.1373vw + 9.76px)",
        }}
      >
        <h1
          data-hero-word
          className="whitespace-nowrap text-center font-semibold text-[var(--header-bg)] [animation:hero-word-in_0.9s_ease-out_0.15s_both]"
          // Fluid constants scaled ×0.786 from the original 10-glyph wordmark
          // so the wider "Bethany 101" spans the same edge-to-edge width.
          style={{
            fontSize: "calc(19.5354vw - 5.398px)",
            lineHeight: "calc(14.3935vw + 6.785px)",
          }}
        >
          {heading}
        </h1>
      </div>
    </section>
  );
}
