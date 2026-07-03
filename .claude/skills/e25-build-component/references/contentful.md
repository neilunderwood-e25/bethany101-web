# Contentful cookbook (CMA + GraphQL + entries)

Operational details for the build-component skill on the **Contentful** base. Architecture
(registry, recipe) is in `components/ARCHITECTURE.md`; this is the CMS API.

## Key difference from Contentstack: hydrate, don't compose

Contentful does **not** resolve references inline. The page query
(`flexiblePageCollection`) fetches section **stubs** (`__typename` + `sys.id`); each section's
`SectionDefinition.hydrate(id, options)` runs a **second** GraphQL query to fetch that section's
full data. So a `SectionDefinition` here is:
```ts
{ contentfulTypename: "Hero", type: "hero", hydrate(id, options) => Promise<Section|null>, render }
```
The "GraphQL" step of the recipe = write the per-type hydrate query + mapper (not a fragment
spread into the page query). Field ids and content-type ids are **camelCase**
(`flexiblePage`, `seoOgImage`). The GraphQL `__typename` is the PascalCase of the id.

## Auth / hosts

From `.env.local`: `CONTENTFUL_SPACE_ID`, `CONTENTFUL_ENVIRONMENT` (default `master`),
`CONTENTFUL_DELIVERY_TOKEN` (read), `CONTENTFUL_PREVIEW_TOKEN`, `CONTENTFUL_MANAGEMENT_TOKEN`
(CMA, `CFPAT-…`, write). Default locale is usually **`en-US`**.

- **CMA** — `https://api.contentful.com/spaces/{SPACE}/environments/{ENV}`. Headers:
  `Authorization: Bearer {CMA}`, `Content-Type: application/vnd.contentful.management.v1+json`.
  Mutations need `X-Contentful-Version: <current sys.version>`.
- **Delivery GraphQL (verify)** —
  `https://graphql.contentful.com/content/v1/spaces/{SPACE}/environments/{ENV}`,
  header `Authorization: Bearer {DELIVERY_TOKEN}`. Returns **published** content (pass
  `preview: true` + the preview token via the preview host for drafts).

## Content types  (create/update, then PUBLISH)

`PUT /content_types/{id}` (include `X-Contentful-Version` when updating an existing one) body:
```jsonc
{ "name":"Cards", "description":"…", "displayField":"internalTitle",
  "fields":[ /* see below */ ] }
```
Then publish it: `PUT /content_types/{id}/published` with `X-Contentful-Version:
<result.sys.version>`. **Both steps are required** — an unpublished content type/field won't
appear in the delivery GraphQL schema.

Field shapes (the `fields` array):
```jsonc
{ "id":"heading","name":"Heading","type":"Symbol" }            // short text
{ "id":"body","name":"Body","type":"Text" }                    // long text
{ "id":"answer","name":"Answer","type":"RichText" }            // rich text
{ "id":"sticky","name":"Sticky","type":"Boolean" }
{ "id":"frontEndComponent","name":"Front End Component","type":"Symbol",
  "validations":[{"in":["Default","Four feature cards"]}] }    // dropdown
{ "id":"sectionId","name":"Section ID","type":"Symbol" }
{ "id":"image","name":"Image","type":"Link","linkType":"Asset" }      // single asset
{ "id":"cta","name":"CTA","type":"Link","linkType":"Entry",
  "validations":[{"linkContentType":["cta"]}] }                       // single ref
{ "id":"sections","name":"Sections","type":"Array",
  "items":{"type":"Link","linkType":"Entry","validations":[{"linkContentType":["hero","cards"]}]} } // multi ref
{ "id":"cards","name":"Cards","type":"Array","items":{"type":"Symbol"} }  // string list
```
- **Repeating rows** (Contentstack "group") are modeled as an **Array of Links to a small child
  content type** (e.g. a `card` type), each card an entry. (There is no inline group type.)
- **New variant of an existing type:** GET `/content_types/{id}`, add the choice to the
  `frontEndComponent` field's `validations[].in`, add new fields, PUT (+ publish).
- **New content type:** create + publish it, then **allow it as a section** by editing
  `flexiblePage`'s `sections` field `items.validations[].linkContentType` to include the new id
  (PUT + publish flexiblePage).

## GraphQL (in `lib/contentful/graphql/...` + the section's hydrate)

- Page query: `flexiblePageCollection(where:{slug:$slug}, limit:1, preview:$preview){ items {
  sys{id} … sectionsCollection(limit:20){ items { __typename ... on Entry { sys{id} } } } } }`.
- Per-section hydrate query: `query($id:String!,$preview:Boolean){ cards(id:$id, preview:$preview)
  { sys{id} frontEndComponent heading cardItemsCollection(limit:10){ items { heading body
  icon{ url } cta { ... on Cta { text href } } } } } }`.
  - Single ref → the linked type directly (`cta { ... }`, `image { url width height }`).
  - Multiple ref → `<field>Collection(limit:N){ items { ... } }`.
  - Asset fields expose `url`, `title`, `width`, `height`, `description`.
- Map the result to the typed `Section` in the hydrate function; `id` = `sys.id`.

## Entries  (create/update, then PUBLISH)

- Create with an explicit id (re-runnable): `PUT /entries/{id}` headers
  `X-Contentful-Content-Type: {ct}` (+ `X-Contentful-Version` if it exists), body:
  ```jsonc
  { "fields": { "heading": { "en-US": "…" },
                "cta":     { "en-US": { "sys":{"type":"Link","linkType":"Entry","id":"<ctaId>"} } },
                "image":   { "en-US": { "sys":{"type":"Link","linkType":"Asset","id":"<assetId>"} } },
                "sections":{ "en-US": [ {"sys":{"type":"Link","linkType":"Entry","id":"…"}} ] } } }
  ```
  (Auto-id alternative: `POST /entries` with the `X-Contentful-Content-Type` header.)
  **Every field value is keyed by locale** (`"en-US"`).
- Publish: `PUT /entries/{id}/published` with `X-Contentful-Version: <result.sys.version>`.
- Attach to a page: GET the `flexiblePage` entry, append the new section link to
  `fields.sections["en-US"]`, PUT (with version) + publish.

## Assets  (create → process → publish)

1. `PUT /assets/{id}` body `{ "fields": { "title":{"en-US":"…"},
   "file":{"en-US":{"contentType":"image/png","fileName":"x.png","upload":"<public URL>"}} } }`
   (`upload` = a URL Contentful can fetch; or use the Upload API for local bytes).
2. Process: `PUT /assets/{id}/files/en-US/process` with `X-Contentful-Version`; then GET-poll
   until `fields.file["en-US"].url` exists.
3. Publish: `PUT /assets/{id}/published` with `X-Contentful-Version`. Link it from entries via
   `{sys:{type:"Link",linkType:"Asset",id}}`.

## Verify via delivery GraphQL

POST the page query (and/or a hydrate query) to the delivery endpoint and confirm the section +
fields resolve. Remember: content types, fields, entries, AND assets each need **publishing**
before they appear.
