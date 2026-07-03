import { Fragment } from "react";
import type { FeaturesSection } from "@/lib/sections/types";

type FeaturesDefaultProps = { section: FeaturesSection };

/**
 * Features — "Default" variant. Figma 728:5619 (desktop 1920×1130) /
 * 728:5690 (mobile 390×1151).
 *
 * A dark full-bleed band: a looping, muted background video (the fallback
 * image renders beneath it, so it shows until the video loads or when no
 * video is set) under a bottom-heavy brown gradient. Content: a large
 * Cormorant heading, then a row of icon feature cards separated by hairline
 * dividers on desktop; a vertical stack on mobile.
 *
 * Desktop geometry uses min(Xvw, Ypx) — exact Figma px at 1920, scaling
 * proportionally below so the fixed columns never collide.
 */
export function FeaturesDefault({ section }: FeaturesDefaultProps) {
  const { heading, backgroundVideoUrl, backgroundImage, items, sectionId } =
    section;

  return (
    <section
      id={sectionId ?? undefined}
      className="relative flex w-full flex-col items-center overflow-hidden bg-[var(--background)] py-[70px] lg:py-[140px]"
    >
      {/* Background: fallback image underneath, video above it, gradient on
          top. Bleeds ~1% outside the section (like the Figma node) so the
          cover-crop matches the design exactly. */}
      <div className="absolute inset-[-1%]" aria-hidden>
        {backgroundImage?.url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={backgroundImage.url}
            alt=""
            className="absolute inset-0 size-full object-cover"
          />
        )}
        {backgroundVideoUrl && (
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            poster={backgroundImage?.url ?? undefined}
            className="absolute inset-0 size-full object-cover"
          >
            <source src={backgroundVideoUrl} type="video/mp4" />
          </video>
        )}
        {/* Bottom-heavy brown gradient (transparent → 97% at ~64% → solid). */}
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(38,24,15,0)_0%,rgba(38,24,15,0.97)_63.847%,var(--hero-bg)_100%)]" />
      </div>

      <div className="relative flex w-full max-w-[1780px] flex-col items-start gap-[60px] px-[15px] lg:gap-[min(20.833333vw,400px)] lg:px-[30px]">
        {heading && (
          <h2 className="font-semibold text-[36px] leading-[36px] text-white lg:w-[min(44.791667vw,860px)] lg:text-[60px] lg:leading-[60px]">
            {heading}
          </h2>
        )}

        {/* Feature cards: stacked on mobile; a divider-separated row on desktop. */}
        <div className="flex w-full flex-col items-start gap-[50px] lg:flex-row lg:gap-[min(2.604167vw,50px)]">
          {items.map((item, i) => (
            <Fragment key={item.id}>
              {i > 0 && (
                <div
                  aria-hidden
                  className="hidden w-px self-stretch bg-[var(--header-fg-muted)] lg:block"
                />
              )}
              <div className="flex flex-col items-start gap-[9.3px] lg:w-[min(18.450521vw,354.25px)] lg:gap-[30px]">
                {item.icon?.url && (
                  // Figma's mobile icon block is 50.8px tall (50px icon +
                  // 0.8px bottom padding); match it so stack heights line up.
                  <div className="pb-[0.8px] lg:pb-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.icon.url}
                      alt=""
                      width={50}
                      height={50}
                      className="size-[50px]"
                    />
                  </div>
                )}
                <h3 className="font-semibold text-[26px] leading-[26px] text-white lg:text-[34px] lg:leading-[34px]">
                  {item.title}
                </h3>
                {item.body && (
                  <p className="text-[17px] leading-[23.8px] text-[var(--features-text)] lg:text-[18px] lg:leading-[25.2px]">
                    {item.body}
                  </p>
                )}
              </div>
            </Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}
