import type { HeroSection } from "@/lib/sections/types";
import { HeroDefault } from "./HeroDefault";

type HeroProps = { section: HeroSection };

/**
 * Hero section — routes to a visual variant on `frontEndComponent`.
 * See components/ARCHITECTURE.md for the switch-case convention.
 */
export function Hero({ section }: HeroProps) {
  switch (section.frontEndComponent) {
    case "Default":
      return <HeroDefault section={section} />;
    default:
      return <HeroDefault section={section} />;
  }
}
