import type { InfoSection } from "@/lib/sections/types";
import { InfoDefault } from "./InfoDefault";
import { InfoAmenities } from "./InfoAmenities";

type InfoProps = { section: InfoSection };

/**
 * Info section — routes to a visual variant on `frontEndComponent`.
 * See components/ARCHITECTURE.md for the switch-case convention.
 */
export function Info({ section }: InfoProps) {
  switch (section.frontEndComponent) {
    case "Default":
      return <InfoDefault section={section} />;
    case "Aminities":
      return <InfoAmenities section={section} />;
    default:
      return <InfoDefault section={section} />;
  }
}
