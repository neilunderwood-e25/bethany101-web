import type { FeaturesSection } from "@/lib/sections/types";
import { FeaturesDefault } from "./FeaturesDefault";

type FeaturesProps = { section: FeaturesSection };

/**
 * Features section — routes to a visual variant on `frontEndComponent`.
 * See components/ARCHITECTURE.md for the switch-case convention.
 */
export function Features({ section }: FeaturesProps) {
  switch (section.frontEndComponent) {
    case "Default":
      return <FeaturesDefault section={section} />;
    default:
      return <FeaturesDefault section={section} />;
  }
}
