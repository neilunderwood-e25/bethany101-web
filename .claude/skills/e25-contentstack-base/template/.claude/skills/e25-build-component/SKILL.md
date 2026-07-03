---
name: e25-build-component
description: Build a Figma design as a CMS-backed section/component on an E25 Next.js base — works on BOTH the Contentstack and Contentful scaffolds. Detects the base, models the content type/variant, wires the GraphQL query + transform + React component per the section-registry "switch-case" architecture, creates and publishes a sample entry, then visually verifies pixel-perfect against the Figma node in headless Chrome. Invoked when the user types `/e25-build-component`, or asks to "build this component / section from Figma", "implement this Figma design", "add a <Cards/Banner/Hero/...> variant / frontend component", or "build this using the <content type> content type" on a Contentstack or Contentful project, usually with a figma.com node link.
---

# e25-build-component

Builds one Figma design into a CMS-backed **section** (a new content type, or a new
`front_end_component` **variant** of an existing one) on an E25 Next.js base, then proves it
**pixel-perfect** by rendering it in a headless browser and diffing against the Figma node.

It works on **both** E25 bases — they share one architecture (a catch-all `FlexiblePage`
route → a **section registry** → switch-case variant routing → the **six-step recipe** for
adding a section). Only the CMS API and the GraphQL query shape differ; those live in the
two reference files.

`${SKILL_DIR}` = the directory containing this file. Supporting files:
- `${SKILL_DIR}/references/contentstack.md` — Contentstack CMA + GraphQL + entry/asset cookbook
- `${SKILL_DIR}/references/contentful.md` — Contentful CMA + GraphQL + entry/asset cookbook
- `${SKILL_DIR}/scripts/shot.mjs` — self-contained headless-Chrome screenshot/clip/click tool

**Use absolute paths in Bash; never `cd`** (the working dir bleeds between calls).

---

## Inputs you need

- A **Figma node URL** (`figma.com/design/:fileKey/...?node-id=:a-:b`). Extract `fileKey` and
  `nodeId` (convert `a-b` → `a:b`). If no `node-id`, ask for a node-specific link.
- The **content type** and/or **frontend-component (variant) name**, if the user gave them
  (e.g. "content type: Cards, frontend component: Four feature cards"). If they didn't name
  the variant, you pick one (Step 3). If they say "make pp 100%", treat pixel-perfection +
  visual verification as required.

---

## Step 0 — Detect the base, load the cookbook

Decide CMS from the repo, in order:
1. `lib/contentstack/` exists → **contentstack**. `lib/contentful/` exists → **contentful**.
2. Else read `.env.local`: `CONTENTSTACK_*` → contentstack; `CONTENTFUL_*` → contentful.

Read `${SKILL_DIR}/references/<cms>.md` now — it has the exact CMA endpoints/headers, field
schemas, GraphQL query shape, and entry/asset/publish flow for that base. Read `.env.local`
for the credentials (api key / space id, delivery token, management/CMA token, environment,
branch).

## Step 1 — Read the architecture (always, first)

Never guess the pattern — read it:
- `components/ARCHITECTURE.md` (canonical) and `AGENTS.md` / `CLAUDE.md`.
- `lib/sections/{registry,config,types}.ts`, `lib/sections/SectionsRenderer.tsx`,
  `lib/<cms>/pages.ts`, and the SEO fragment/query.
- **One existing section as an exemplar**: its definition (`lib/sections/definitions/*.tsx`),
  its query fragment (`lib/<cms>/graphql/...`), and its component
  (`components/sections/<Name>/`). Copy its conventions exactly.
- Shared/common components + mappers (`components/common/{Cta,Image,Video}`,
  `lib/<cms>/{cta,image,video}.ts`).
- If extending an existing content type, fetch its current schema from the CMS (see cookbook)
  so you use exact field ids and existing variant choices.

## Step 2 — Read the Figma design

- `get_design_context(nodeId, fileKey)` — the structure + reference code (MANDATORY before
  building). `get_screenshot(nodeId, fileKey, maxDimension: 1600)` — download the PNG as the
  visual reference and **note the node's exact width × height** (your build's clipped section
  should match it).
- Decide: **new content type** or **new variant of an existing one**? (The user usually says.)
- Extract, precisely: text content, font family + **weight** (Poppins Light=300, Regular=400,
  Medium=500, SemiBold=600), sizes/line-heights, colors (→ map to CSS tokens in
  `app/globals.css`, never raw hex), paddings/gaps, card/column **pixel widths**, border radii,
  and any **interactions** (accordion, slider, toggle, hover).

## Step 3 — Plan the content model

- **Content type**: reuse the named one, or create a new one (snake_case uid for CS / camelCase
  id for CF). 
- **Variant**: every section routes on a `front_end_component` dropdown via switch-case. Reuse
  the exact choice value the user named; otherwise pick a clear, presentational name (e.g.
  "Three feature cards dark", "Centered Text", "Banner / Right Image") — describe the layout,
  not the page's copy.
- **Fields**: reuse existing fields and shared reference types (Cta/Image/Video, a testimonials
  or items group, an RTE `footnote`/`consent`) wherever possible. Add **only** the new fields
  the design genuinely needs. Long copy → an RTE field rendered as HTML. Repeating rows → a
  multiple **group** field.
- State the plan in 2–4 lines (content type, variant name, fields added, fields reused) before
  touching the CMS. Use `AskUserQuestion` only for a genuine fork (e.g. who owns a cross-cutting
  field); otherwise pick the obvious option and proceed.

## Step 4 — Apply content-model changes (CMS)

Per `references/<cms>.md`:
- New content type → create it (and publish it on Contentful), then register it as an allowed
  section on the page (`flexible_page.sections.reference_to` on CS / the `sections` Array-of-
  Links `linkContentType` validation on CF).
- Existing content type → add the new `front_end_component` choice, and any new fields
  (group sub-fields, file/asset, reference/link, RTE, boolean toggle).
- Naming: CS field uids are **snake_case** (and the GraphQL type is the PascalCase of the uid);
  CF field ids are **camelCase**. Avoid reserved uids (CS rejects field uid `options` → use
  `choices`).

## Step 5 — Build the section (six-step recipe)

Mirror the exemplar you read in Step 1:
1. **GraphQL** — add the query fragment/selection for the type's fields (CS: `<field>Connection
   { edges { node { ... } } }` for refs/files, single-ref connections reject `limit`; CF:
   linked types / `...Collection { items { } }`). See the cookbook for the exact shape.
2. **Type** — add `XSection` to `lib/sections/types.ts` and add it to the `Section` union.
3. **Transform/mapper** — map the raw node → typed section in
   `lib/sections/definitions/<x>.tsx`; reuse shared mappers (`mapCta`/`mapImage`); set `id` from
   the system uid/`sys.id`.
4. **Component** — `components/sections/<X>/index.tsx` routes on `frontEndComponent` with a
   **switch** (case label === the dropdown choice **exactly**); one variant = one file under
   `components/sections/<X>/<Variant>/index.tsx`. Use Tailwind arbitrary values to match the
   Figma; reference CSS token vars for color.
5. **Definition** — export the `SectionDefinition` (typename/type, fragment + name +
   `fragmentDeps` for shared fragments, transform, render); register in
   `lib/sections/registry.ts`.
6. Interactions: prefer **no client JS** when native HTML suffices (e.g. `<details name>` for an
   exclusive accordion; CSS `group-open:` for +/− icons; `<html class="scroll-smooth">` + a
   `scroll-mt` anchor for in-page nav). Reach for `"use client"` only when state is required.

## Step 6 — Create + publish a sample entry

So the section actually renders and can be verified:
- Upload any images/icons as assets (download the Figma asset URLs first).
- Create the entry with the design's real content; set the `front_end_component` choice.
- Attach it to a page's `sections` list (append; fetch current sections first so you don't drop
  existing ones).
- **Publish** assets + the entry + the page to the environment/locale. (CF: publish the content
  type too. CS: entry PUT *merges*, so single-field updates are safe.)

## Step 7 — Verify (build + pixel-perfect + interactions)

1. `npx tsc --noEmit` and `npm run lint` — clean (no new errors/warnings).
2. Make sure the dev server is running (`npm run dev`; reuse one already on :3000). If the site
   is behind an auth gate, get a session cookie (e.g. POST the login endpoint with a cookie jar,
   or mint it) and pass it to the screenshot tool.
3. Render + clip the new section and compare to the Figma reference:
   ```
   node ${SKILL_DIR}/scripts/shot.mjs --url <pageURL> --out /tmp/build.png \
     --clip "<css selector for the section>" --width 1920 [--cookie 'name=value'] \
     [--click "<selector>"]   # to test an interaction, capture after a click
   ```
   Read `/tmp/build.png` and the Figma PNG and diff them. **Clip at the design's native width**
   (usually 1920) so margins/wrapping match; the clipped section's W×H should equal the node's.
4. Iterate until it matches, using the **pixel-perfect checklist** below. Then stop Chrome
   (the script does on exit) and report what you built + the before/after comparison.

### Pixel-perfect checklist (hard-won)
- **Clip width = the Figma node width** (usually 1920). A narrower viewport shrinks side margins
  and shifts inset elements, faking a mismatch.
- **Content width / box model.** `mx-auto max-w-[1200px] px-6` yields **1152** content, not 1200
  — and that 48px can flip text wrapping. When wrapping must match, give cards/columns their
  exact Figma pixel width (e.g. `md:w-[380px]` → 280px body) so natural wrap matches; widen the
  container (`max-w-[1248px] px-6`) if you need true 1200 content.
- **Fixed heights include padding** (Tailwind is `border-box`). A Figma "card row `h-[668px]`
  with `pt-30 pb-100`" means the **card** is ~518px, not 668. Compute the real element height.
- **Fonts**: `next/font` only loads the listed weights — add the weight you need (e.g. `"300"`)
  to `app/layout.tsx` or `font-light` silently falls back to 400.
- **Equal-height cards**: `items-stretch` + `min-h-[<real card px>]`; decide **top-aligned vs
  justify-center** per the design (icons aligned across cards ⇒ top-align).
- **Colors via CSS vars** (`bg-[var(--card-blue)]`, `text-[var(--link)]`), never raw hex.
- **Sticky sections** must not be trapped in a short wrapper — they only pin within their parent
  block; render them as direct flow children of `<main>` (see `SectionsRenderer`).
- Re-screenshot after every fix; don't declare done from code alone.

## Output

Report: the base detected, the content type + variant name, fields added vs reused, the files
touched (six-step), the entry created + published, and the visual-verify result (section
clipped W×H vs the Figma node, and any iterations). Note anything you intentionally deviated on.
