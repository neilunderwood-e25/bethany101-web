#!/usr/bin/env node
/*
 * One-shot seed script for the Contentful space.
 *
 * Creates (or updates) two content types:
 *   - seo
 *   - flexiblePage
 *
 * Then creates and publishes two sample entries so the `/` route renders:
 *   - entry id "seo-home"  (seo)
 *   - entry id "home"      (flexiblePage, slug = "/")
 *
 * Env vars (read from .env.local, which sits in the project root next to package.json):
 *   CONTENTFUL_SPACE_ID            required
 *   CONTENTFUL_MANAGEMENT_TOKEN    required — CMA token, starts with CFPAT-, write access
 *   CONTENTFUL_ENVIRONMENT         optional, defaults to "master"
 *
 * Usage (from anywhere):
 *   node /path/to/project/scripts/seed-contentful.mjs
 *
 * The script resolves .env.local from its own location, so CWD doesn't matter.
 * Re-runnable: existing content types / entries are updated in place, not duplicated.
 */

import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const envFile = join(scriptDir, "..", ".env.local");
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf-8").split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const SPACE = process.env.CONTENTFUL_SPACE_ID;
const ENV = process.env.CONTENTFUL_ENVIRONMENT || "master";
const CMA = process.env.CONTENTFUL_MANAGEMENT_TOKEN;

if (!SPACE) {
  console.error("✗ CONTENTFUL_SPACE_ID missing from .env.local.");
  process.exit(1);
}
if (!CMA) {
  console.error(
    "✗ CONTENTFUL_MANAGEMENT_TOKEN missing from .env.local.\n" +
      "  Generate a CMA token at:\n" +
      "    Contentful → Settings → API keys → Content management tokens\n" +
      "  Then add it to .env.local as:\n" +
      "    CONTENTFUL_MANAGEMENT_TOKEN=CFPAT-xxx"
  );
  process.exit(1);
}

const BASE = `https://api.contentful.com/spaces/${SPACE}/environments/${ENV}`;

const api = async (path, opts = {}) => {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${CMA}`,
      "Content-Type": "application/vnd.contentful.management.v1+json",
      ...(opts.headers || {}),
    },
  });
  const text = await res.text();
  if (!res.ok) {
    const err = new Error(`${opts.method || "GET"} ${path} → ${res.status}\n${text}`);
    err.status = res.status;
    throw err;
  }
  return text ? JSON.parse(text) : null;
};

const SEO_TYPE = {
  name: "SEO",
  description:
    "SEO + AEO metadata reused on FlexiblePage entries. Drives <head> meta, " +
    "Open Graph / Twitter cards, robots directives, and JSON-LD structured " +
    "data (Article / WebPage, FAQPage, Speakable) for search and answer engines.",
  displayField: "seoTitle",
  fields: [
    // --- Core meta ---
    { id: "seoTitle", name: "SEO Title", type: "Symbol" },
    { id: "seoDescription", name: "SEO Description", type: "Symbol" },
    {
      id: "seoKeywords",
      name: "Focus Keywords / Topics",
      type: "Array",
      items: { type: "Symbol" },
    },

    // --- Indexing / canonical ---
    { id: "seoCanonicalUrl", name: "Canonical URL", type: "Symbol" },
    { id: "seoNoIndex", name: "No Index", type: "Boolean" },
    { id: "seoNoFollow", name: "No Follow", type: "Boolean" },
    {
      id: "seoMaxImagePreview",
      name: "Max Image Preview",
      type: "Symbol",
      validations: [{ in: ["none", "standard", "large"] }],
    },

    // --- Social (Open Graph + Twitter/X) ---
    { id: "seoOgTitle", name: "OG Title", type: "Symbol" },
    { id: "seoOgDescription", name: "OG Description", type: "RichText" },
    { id: "seoOgImage", name: "OG Image", type: "Link", linkType: "Asset" },
    {
      id: "seoOgType",
      name: "OG Type",
      type: "Symbol",
      validations: [{ in: ["website", "article", "product", "profile"] }],
    },
    {
      id: "seoTwitterCard",
      name: "Twitter Card Type",
      type: "Symbol",
      validations: [{ in: ["summary", "summary_large_image"] }],
    },

    // --- Answer Engine Optimization (AEO) ---
    { id: "seoAnswerSummary", name: "Answer Summary (TL;DR)", type: "RichText" },
    {
      id: "seoFaqs",
      name: "FAQs — JSON: [{ question, answer }]",
      type: "Object",
    },
    {
      id: "seoSpeakableSelectors",
      name: "Speakable CSS Selectors",
      type: "Array",
      items: { type: "Symbol" },
    },

    // --- E-E-A-T / freshness (Article schema) ---
    { id: "seoAuthorName", name: "Author Name", type: "Symbol" },
    {
      id: "seoArticleSection",
      name: "Article Section / Primary Topic",
      type: "Symbol",
    },
    { id: "seoDatePublished", name: "Date Published", type: "Date" },
    { id: "seoDateModified", name: "Date Modified", type: "Date" },

    // --- Custom structured-data override ---
    {
      id: "seoSchemaMarkup",
      name: "Custom Schema Markup (JSON-LD)",
      type: "Object",
    },
  ],
};

const FLEXIBLE_PAGE_TYPE = {
  name: "Flexible Page",
  description: "A page assembled from a list of section entries, addressed by slug.",
  displayField: "pageTitle",
  fields: [
    {
      id: "slug",
      name: "Slug",
      type: "Symbol",
      required: true,
      validations: [{ unique: true }],
    },
    { id: "pageTitle", name: "Page Title", type: "Symbol", required: true },
    {
      id: "seo",
      name: "SEO",
      type: "Link",
      linkType: "Entry",
      validations: [{ linkContentType: ["seo"] }],
    },
    {
      id: "sections",
      name: "Sections",
      type: "Array",
      items: { type: "Link", linkType: "Entry", validations: [] },
    },
  ],
};

const getContentType = async (id) => {
  try {
    return await api(`/content_types/${id}`);
  } catch (e) {
    if (e.status === 404) return null;
    throw e;
  }
};

// PUT a content type at a given version, then publish it. Returns the new
// (published) version so callers can chain further updates.
const putAndPublish = async (id, body, version) => {
  const result = await api(`/content_types/${id}`, {
    method: "PUT",
    headers: version != null ? { "X-Contentful-Version": String(version) } : {},
    body: JSON.stringify(body),
  });
  const published = await api(`/content_types/${id}/published`, {
    method: "PUT",
    headers: { "X-Contentful-Version": String(result.sys.version) },
  });
  return published.sys.version;
};

// Contentful forbids changing an existing field's type in place. Detect that.
const fieldTypeChanged = (a, b) =>
  a.type !== b.type ||
  (a.linkType ?? null) !== (b.linkType ?? null) ||
  (a.items?.type ?? null) !== (b.items?.type ?? null) ||
  (a.items?.linkType ?? null) !== (b.items?.linkType ?? null);

const upsertContentType = async (id, spec) => {
  const existing = await getContentType(id);
  if (!existing) {
    console.log(`• content type "${id}" → creating`);
    await putAndPublish(id, spec, undefined);
    console.log(`  ✓ published "${id}"`);
    return;
  }

  let version = existing.sys.version;
  const desiredById = new Map(spec.fields.map((f) => [f.id, f]));
  const changedIds = new Set(
    existing.fields
      .filter((f) => {
        const d = desiredById.get(f.id);
        return d && fieldTypeChanged(f, d);
      })
      .map((f) => f.id)
  );

  if (changedIds.size) {
    console.log(
      `• content type "${id}": type change for [${[...changedIds].join(", ")}] → recreating those fields`
    );
    const base = {
      name: existing.name,
      description: existing.description,
      displayField: existing.displayField,
    };
    // Phase 1 — omit the changed fields (publish so the omit takes effect).
    version = await putAndPublish(
      id,
      {
        ...base,
        fields: existing.fields.map((f) =>
          changedIds.has(f.id) ? { ...f, omitted: true } : f
        ),
      },
      version
    );
    // Phase 2 — delete the omitted fields, freeing their ids.
    version = await putAndPublish(
      id,
      {
        ...base,
        fields: existing.fields.map((f) =>
          changedIds.has(f.id) ? { ...f, omitted: true, deleted: true } : f
        ),
      },
      version
    );
  } else {
    console.log(`• content type "${id}" exists (v${version}) → updating`);
  }

  // Apply the desired spec (re-adds recreated fields with their new type).
  await putAndPublish(id, spec, version);
  console.log(`  ✓ published "${id}"`);
};

await upsertContentType("seo", SEO_TYPE);
await upsertContentType("flexiblePage", FLEXIBLE_PAGE_TYPE);

const locales = await api("/locales");
const defaultLocale =
  locales.items.find((l) => l.default)?.code ||
  locales.items[0]?.code ||
  "en-US";
const L = (v) => ({ [defaultLocale]: v });

// Minimal single-paragraph Contentful RichText document from a plain string.
const richText = (text) => ({
  nodeType: "document",
  data: {},
  content: [
    {
      nodeType: "paragraph",
      data: {},
      content: [{ nodeType: "text", value: text, marks: [], data: {} }],
    },
  ],
});

const upsertEntry = async (contentType, id, fields) => {
  let version;
  try {
    const existing = await api(`/entries/${id}`);
    version = existing.sys.version;
    console.log(`• entry "${id}" exists (v${version}) → updating`);
  } catch (e) {
    if (e.status !== 404) throw e;
    console.log(`• entry "${id}" → creating`);
  }
  const result = await api(`/entries/${id}`, {
    method: "PUT",
    headers: {
      "X-Contentful-Content-Type": contentType,
      ...(version ? { "X-Contentful-Version": String(version) } : {}),
    },
    body: JSON.stringify({ fields }),
  });
  await api(`/entries/${id}/published`, {
    method: "PUT",
    headers: { "X-Contentful-Version": String(result.sys.version) },
  });
  console.log(`  ✓ published "${id}"`);
};

await upsertEntry("seo", "seo-home", {
  seoTitle: L("Welcome"),
  seoDescription: L(
    "Sample home page generated by the e25-contentful-base skill."
  ),
  seoKeywords: L(["contentful", "next.js", "headless cms", "e25"]),
  seoMaxImagePreview: L("large"),
  seoOgTitle: L("Welcome to the E25 Contentful Starter"),
  seoOgDescription: L(
    richText(
      "A production-ready Next.js + Contentful starter with an SEO/AEO content model built in."
    )
  ),
  seoOgType: L("website"),
  seoTwitterCard: L("summary_large_image"),
  seoAnswerSummary: L(
    richText(
      "A starter Next.js + Contentful site scaffolded by the e25-contentful-base skill. " +
        "It ships a FlexiblePage model, an SEO/AEO content type, and an empty section " +
        "registry ready for you to add components."
    )
  ),
  seoFaqs: L([
    {
      question: "What is this project?",
      answer:
        "A Next.js + Contentful starter scaffolded by the e25-contentful-base skill.",
    },
    {
      question: "How do I add a section?",
      answer:
        "Follow the six-step recipe in components/ARCHITECTURE.md to register a new section component.",
    },
  ]),
  seoSpeakableSelectors: L(["h1", "main"]),
  seoAuthorName: L("E25"),
  seoArticleSection: L("Documentation"),
});

await upsertEntry("flexiblePage", "home", {
  slug: L("/"),
  pageTitle: L("Home"),
  seo: L({ sys: { type: "Link", linkType: "Entry", id: "seo-home" } }),
  sections: L([]),
});

console.log(
  "\nDone. The space has FlexiblePage + Seo content types and one sample entry at slug `/`."
);
console.log("Run `npm run dev` and visit http://localhost:3000 to see it.");
