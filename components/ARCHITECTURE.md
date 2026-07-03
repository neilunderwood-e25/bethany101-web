# Components Architecture

> **For any agent working in this repo:** this is the canonical explanation of
> how Contentful sections become rendered React components. Read this first.

## The data flow

```
URL: /es/products/widgets
     │
     ▼
app/[[...slug]]/page.tsx                  ← catch-all route
     │
     ├─ splitLocaleFromSlug(["es","products","widgets"])
     │     → { locale: es, rest: ["products","widgets"] }
     │
     ├─ getFlexiblePageBySlug("/products/widgets", { locale: "es-US" })
     │     │
     │     ├─ FLEXIBLE_PAGE_BY_SLUG  (one Contentful round-trip — page + SEO + section stubs)
     │     │
     │     └─ hydrateSections(stubs)
     │           │
     │           └─ for each stub: sectionRegistry.find(__typename).hydrate(id)
     │                 → one Contentful round-trip per section
     │
     ▼
<SectionsRenderer sections={page.sections} />
     │
     └─ for each section: sectionRegistry.find(type).render(section)
           → returns the matching React component
```

Two registry lookups happen: **once on the server** (to hydrate full section
data) and **once during render** (to dispatch to the right component).

## The dispatch is a switch statement

The `sectionRegistry` array in `lib/sections/registry.ts` is just a lookup
table. Mentally you can model it as a `switch` over `__typename` on the server
and `type` in the renderer:

```ts
// Conceptual model — the real code uses sectionRegistry.find() for extensibility.
async function hydrate(stub: SectionStub, opts: HydrateOptions): Promise<Section | null> {
  switch (stub.__typename) {
    case "Hero":
      return hydrateHero(stub.sys.id, opts);
    case "CardGroups":
      return hydrateCardGroups(stub.sys.id, opts);
    case "Slider":
      return hydrateSlider(stub.sys.id, opts);
    default:
      return { id: stub.sys.id, type: "unknown", raw: stub };
  }
}

function render(section: Section): ReactNode {
  switch (section.type) {
    case "hero":
      return <Hero section={section} />;
    case "cardGroups":
      return <CardGroups section={section} />;
    case "slider":
      return <Slider section={section} />;
    default:
      return null;
  }
}
```

The registry pattern (`SectionDefinition[]` of `{ contentfulTypename, type,
hydrate, render }`) is the same logic expressed as data so adding a new
section is "add one entry to the array" instead of "edit two switch
statements."

## Variant routing inside a section: always switch-case

When a section has multiple visual variants (controlled by a
`frontEndComponent` field on the Contentful entry), use a **switch statement**
inside the section's `index.tsx`. Do not use a `Record<string, Component>`
map — switch is easier to skim, gives exhaustiveness checking if you type
the field as a union, and points your reader straight at each variant.

```tsx
// components/sections/Hero/index.tsx
import type { HeroSection } from "@/lib/sections/types";
import { HeroDefault } from "./HeroDefault";
import { HeroImage } from "./HeroImage";
import { HeroSecondary } from "./HeroSecondary";

type HeroProps = { section: HeroSection };

export function Hero({ section }: HeroProps) {
  switch (section.frontEndComponent) {
    case "Hero - Default":
      return <HeroDefault section={section} />;
    case "Hero Image":
      return <HeroImage section={section} />;
    case "Hero Secondary":
      return <HeroSecondary section={section} />;
    default:
      return <HeroDefault section={section} />;
  }
}
```

## Adding a new section: the six-step recipe

1. **Contentful model** — create a new content type (e.g. `Hero`) in the space.
   If it has visual variants, add a `frontEndComponent` short-text field.
2. **GraphQL query** — `lib/contentful/graphql/queries/hero.ts`. Create
   fragments for any reusable nested entries (Image, Video, Cta, …) under
   `lib/contentful/graphql/fragments/`.
3. **Section type** — add `HeroSection` to `lib/sections/types.ts` and union
   it into `Section`.
4. **Section component** — `components/sections/Hero/index.tsx` (plus variant
   files like `HeroDefault/index.tsx`). Use the switch-case pattern above for
   variant routing.
5. **Section definition** — `lib/sections/definitions/hero.tsx`. Export a
   `SectionDefinition` with `contentfulTypename: "Hero"`, `type: "hero"`,
   `hydrate()`, and `render()`.
6. **Register** — push the definition onto `sectionRegistry` in
   `lib/sections/registry.ts`.

That's the whole pattern. No other wiring is needed.

## Theming

Components must reference brand tokens via CSS variables defined in
`app/globals.css`:

| Variable                 | Used for                                |
| ------------------------ | --------------------------------------- |
| `--brand-primary`        | Primary CTA background, accent color    |
| `--brand-primary-hover`  | Primary CTA hover state                 |
| `--text-default`         | Default body and heading text           |
| `--text-muted`           | Captions, eyebrows, disclaimer text     |
| `--bg-muted`             | Section backgrounds                     |

Tailwind 4 arbitrary-value syntax: `bg-[var(--brand-primary)]`. Do not
hard-code hex values inside components — extend the variable set instead.

## Adding a locale

Append a new entry to `LOCALE_MAP` in `lib/i18n/locale.ts` (URL slug,
Contentful code, display name, HTML `lang`). The catch-all route picks the
locale off the first path segment automatically.
