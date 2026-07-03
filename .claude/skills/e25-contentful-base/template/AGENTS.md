# Agent Guide

**Always start here:** [`components/ARCHITECTURE.md`](./components/ARCHITECTURE.md).

That doc is the canonical explanation of how Contentful sections become
rendered React components — data flow, dispatch logic (switch-case mental
model), variant routing, the six-step recipe for adding a section, theming
rules, locale extension. Read it before changing anything in `lib/sections/`,
`lib/contentful/`, or `components/sections/`.

**Building a section from a Figma design? Use the `/e25-build-component` skill**
(bundled at `.claude/skills/e25-build-component/`). It runs the whole recipe end to end
for this base — models the content type / `frontEndComponent` variant, wires the
per-section `hydrate` query + transform + component, creates and publishes a sample
entry, and verifies it pixel-perfect against the Figma node in headless Chrome.

## What ships in this scaffold

- **FlexiblePage + SEO** — the only Contentful queries the skill installs:
  `lib/contentful/graphql/queries/flexiblePage.ts` and
  `lib/contentful/graphql/fragments/seo.ts`. Everything else (sections,
  reusable entries like Card, Cta, Image, Video) is left to the consuming
  project to add per the recipe in [`components/ARCHITECTURE.md`](./components/ARCHITECTURE.md).
- **Catch-all route** at `app/[[...slug]]/page.tsx` — fetches the
  `FlexiblePage` by slug and hands its sections to `SectionsRenderer`.
- **Section registry** at `lib/sections/registry.ts` — starts empty. Add
  entries here as you build sections.
- **Locale** at `lib/i18n/locale.ts` — English + Spanish by default.

Nothing else ships. There is no Header, Footer, Breadcrumbs, or example
section in the scaffold — those are added per project.

## Conventions to follow

- Use **switch-case** for variant routing inside section components (see the
  architecture doc).
- Reference brand colors via CSS variables in `app/globals.css`, not hex
  literals.
- Put long copy in Contentful using Rich Text, never the Long Text field
  type — see the repo-level instructions.
