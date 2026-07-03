import type { ReactNode } from "react";
import type { Section } from "./types";

/**
 * One entry per section type. Unlike a CMS that needs a second round-trip to
 * hydrate each reference, Contentstack returns section data inline, so a
 * definition contributes:
 *
 *   - `contentstackTypename` — the GraphQL `__typename` of the section's
 *     content type (PascalCase of the content-type uid, e.g. `Hero`). Used to
 *     match a raw union node to this definition.
 *   - `type` — the internal discriminant on the mapped `Section` (e.g. `hero`).
 *   - `fragment` / `fragmentName` — a GraphQL fragment on the section's type
 *     and its name. `pages.ts` prepends every `fragment` to the page query and
 *     spreads every `fragmentName` into the `sectionsConnection` node.
 *   - `transform` — maps the raw GraphQL node to a typed `Section`.
 *   - `render` — renders the mapped `Section` to React.
 *
 * See `components/ARCHITECTURE.md` for the end-to-end walkthrough.
 */
export type SectionDefinition = {
  contentstackTypename: string;
  type: Section["type"];
  fragment: string;
  fragmentName: string;
  transform: (node: RawSectionNode) => Section;
  render: (section: Section) => ReactNode;
};

/** A section node off `sectionsConnection.edges[].node` — `__typename` plus
 * whatever fields the matching fragment selected. */
export type RawSectionNode = {
  __typename: string;
} & Record<string, unknown>;
