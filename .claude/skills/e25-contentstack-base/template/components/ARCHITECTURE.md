# Components Architecture

> **For any agent working in this repo:** this is the canonical explanation of
> how Contentstack entries become rendered React components. Read this first.

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
     ├─ getFlexiblePageByUrl("/products/widgets", { locale: "es" })
     │     │
     │     ├─ buildFlexiblePageByUrlQuery(...)   ← composes the page query from
     │     │     the section registry's fragments
     │     │
     │     └─ contentstackFetch(query)           ← ONE Contentstack round-trip:
     │           page + SEO + every section, resolved inline via connections
     │
     │     └─ mapSections(page)
     │           └─ for each section node:
     │                 sectionRegistry.find(__typename).transform(node)
     │
     ▼
<SectionsRenderer sections={page.sections} />
     │
     └─ for each section: sectionRegistry.find(type).render(section)
           → returns the matching React component
```

Unlike a CMS that needs a second request to hydrate each referenced entry,
Contentstack resolves references **inline** in the same query. So there is one
round-trip, and the registry's job is to (a) tell the page query which fields
to ask for on each section type and (b) dispatch the result to a component.

## How references come back: connections + unions

In Contentstack GraphQL:

- A content type with uid `flexible_page` is queried as `all_flexible_page { items { ... } }`.
- Its GraphQL **type name** is the PascalCase form of the uid: `FlexiblePage`.
- **Reference and file fields** are exposed as `<field>Connection`, returning
  `{ edges { node { ... } } }`.
- A reference field that points at **multiple content types** resolves as a
  **union**. On the union `node` you may only select `__typename` and inline
  fragments `... on <TypeName> { ... }`.

So the section list on a page looks like:

```graphql
sectionsConnection(limit: 20) {
  edges {
    node {
      __typename
      ...HeroFields
      ...CardGroupFields
    }
  }
}
```

`__typename` (e.g. `"Hero"`) is the discriminant. Each `...XFields` is a
fragment a section definition contributed.

## The dispatch is a switch statement

The `sectionRegistry` array in `lib/sections/registry.ts` is just a lookup
table. Mentally you can model it as a `switch` over `__typename` when mapping
and over `type` when rendering:

```ts
// Conceptual model — the real code uses sectionRegistry.find() for extensibility.
function transform(node: RawSectionNode): Section {
  switch (node.__typename) {
    case "Hero":
      return transformHero(node);
    case "CardGroup":
      return transformCardGroup(node);
    case "Slider":
      return transformSlider(node);
    default:
      return { id: "unknown", type: "unknown", raw: node };
  }
}

function render(section: Section): ReactNode {
  switch (section.type) {
    case "hero":
      return <Hero section={section} />;
    case "cardGroup":
      return <CardGroup section={section} />;
    case "slider":
      return <Slider section={section} />;
    default:
      return null;
  }
}
```

The registry pattern (`SectionDefinition[]` of `{ contentstackTypename, type,
fragment, fragmentName, transform, render }`) is the same logic expressed as
data, so adding a new section is "add one entry to the array" instead of
"edit two switch statements and the page query."

## Variant routing inside a section: always switch-case

When a section has multiple visual variants, model the choice as a
`front_end_component` **Select (dropdown)** field on the Contentstack entry
(see "Modeling variants" below), then use a **switch statement** inside the
section's `index.tsx` to route on it. The dropdown's choice values must match
the `case` labels exactly — the dropdown is the single source of truth for
which variant an entry renders as. Do not use a `Record<string, Component>`
map — switch is easier to skim, gives exhaustiveness checking if you type the
field as a union, and points your reader straight at each variant.

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

## Modeling variants: dropdown + field visibility rules

Two pieces of content modeling make the switch-case above clean for editors.

**1. `front_end_component` is a Select (dropdown), not free text.** Its choice
values are the variant labels and must match the `case` strings exactly. CMA
schema:

```json
{
  "data_type": "text",
  "display_name": "Front End Component",
  "uid": "front_end_component",
  "display_type": "dropdown",
  "enum": {
    "advanced": false,
    "choices": [
      { "value": "Hero - Default" },
      { "value": "Hero Image" },
      { "value": "Hero Secondary" }
    ]
  },
  "field_metadata": { "default_value": "Hero - Default" },
  "multiple": false,
  "mandatory": true,
  "unique": false
}
```

**2. Field visibility rules hide the fields that don't belong to the selected
variant.** Model the content type with *every* field across all variants, then
add `field_rules` at the **content-type level** (not on the field) so an editor
who picks "Hero Image" only sees the image field — not the fields that belong
to other variants. This is the "rules that hide fields so we only see relevant
fields per selected front-end component" pattern:

```json
"field_rules": [
  {
    "conditions": [
      { "operand_field": "front_end_component", "operator": "equals", "value": "Hero Image" }
    ],
    "match_type": "all",
    "actions": [
      { "action": "show", "target_field": "image" }
    ]
  }
]
```

A `show` rule keeps its target field hidden until the condition matches, so add
one `show` rule (or one rule listing several `target_field` actions) per
variant. `match_type` is `all` or `any`; operators include `equals`,
`not_equals`, and `contains`. Contentstack caps a content type at **10 rules, 5
conditions per rule, and 5 target fields per rule**, so group a variant's
fields into a single rule to stay under the limit.

**Important — rules are authoring UX only.** Field visibility rules affect just
the entry editor. The Content Delivery API (and therefore your GraphQL
fragment) still returns every field regardless of which variant is selected. So
the fragment can safely query all variant fields, and the component's
switch-case is what actually decides which ones to read and render per variant.

## Adding a new section: the six-step recipe

1. **Contentstack model** — create a new content type (e.g. uid `hero`) in the
   stack. Then add a **`sections` multiple-reference field** to `flexible_page`
   (create it if this is your first section) and list `hero` in its
   `reference_to`. If the section has visual variants, add a
   `front_end_component` **Select (dropdown)** field whose choices are the
   variant labels, and add **field visibility rules** so editors only see the
   fields relevant to the chosen variant (see "Modeling variants" above).
2. **GraphQL fragment** — `lib/contentstack/graphql/fragments/hero.ts`. Define
   `fragment HeroFields on Hero { system { uid } ... }`. Select nested
   reference/file fields via their `<field>Connection { edges { node { ... } } }`.
   Create shared fragments for reusable nested entries (Image, Video, Cta, …)
   under `lib/contentstack/graphql/fragments/`.
3. **Section type** — add `HeroSection` to `lib/sections/types.ts` and union it
   into `Section`.
4. **Section component** — `components/sections/Hero/index.tsx` (plus variant
   files like `HeroDefault/index.tsx`). Use the switch-case pattern above for
   variant routing.
5. **Section definition** — `lib/sections/definitions/hero.tsx`. Export a
   `SectionDefinition` with `contentstackTypename: "Hero"`, `type: "hero"`,
   `fragment: HERO_FRAGMENT`, `fragmentName: "HeroFields"`, a `transform(node)`
   that maps the raw node (set `id` from `node.system.uid`), and `render()`.
6. **Register** — push the definition onto `sectionRegistry` in
   `lib/sections/registry.ts`. `pages.ts` automatically folds your fragment
   into the page query.

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
Contentstack code, display name, HTML `lang`). Contentstack locale codes are
lowercase (`en-us`, `es`). The catch-all route picks the locale off the first
path segment automatically and passes it as the `locale` argument on the query;
untranslated fields fall back to the master locale.
