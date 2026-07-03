import type { SectionDefinition } from "./config";
import { heroDefinition } from "./definitions/hero";
import { infoDefinition } from "./definitions/info";
import { featuresDefinition } from "./definitions/features";

/**
 * Central section registry.
 *
 * To add a section, create:
 *   - components/sections/YourSection/index.tsx
 *   - lib/sections/definitions/yourSection.tsx (hydrate + render)
 * …then import and append the definition here.
 *
 * See `components/ARCHITECTURE.md` for the full walkthrough and the
 * switch-case mental model used inside variant routers.
 */
export const sectionRegistry: SectionDefinition[] = [
  heroDefinition,
  infoDefinition,
  featuresDefinition,
];
