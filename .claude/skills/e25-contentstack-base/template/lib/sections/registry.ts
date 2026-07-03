import type { SectionDefinition } from "./config";

/**
 * Central section registry. Empty by default.
 *
 * To add a section, create:
 *   - components/sections/YourSection/index.tsx
 *   - lib/sections/definitions/yourSection.tsx (fragment + transform + render)
 * …then import and append the definition here.
 *
 * `pages.ts` reads every definition's `fragment`/`fragmentName` to compose the
 * FlexiblePage query, so registering a section is all the wiring needed — no
 * separate query edit. See `components/ARCHITECTURE.md` for the full
 * walkthrough and the switch-case mental model used inside variant routers.
 */
export const sectionRegistry: SectionDefinition[] = [];
