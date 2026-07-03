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
  description: "SEO metadata reused on FlexiblePage entries.",
  displayField: "seoTitle",
  fields: [
    { id: "seoTitle", name: "SEO Title", type: "Symbol" },
    { id: "seoDescription", name: "SEO Description", type: "Symbol" },
    { id: "seoOgImage", name: "OG Image", type: "Link", linkType: "Asset" },
    { id: "seoNoIndex", name: "No Index", type: "Boolean" },
    { id: "seoNoFollow", name: "No Follow", type: "Boolean" },
    { id: "seoCanonicalUrl", name: "Canonical URL", type: "Symbol" },
    { id: "seoSchemaMarkup", name: "Schema Markup (JSON)", type: "Object" },
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

const upsertContentType = async (id, spec) => {
  let version;
  try {
    const existing = await api(`/content_types/${id}`);
    version = existing.sys.version;
    console.log(`• content type "${id}" exists (v${version}) → updating`);
  } catch (e) {
    if (e.status !== 404) throw e;
    console.log(`• content type "${id}" → creating`);
  }
  const result = await api(`/content_types/${id}`, {
    method: "PUT",
    headers: version ? { "X-Contentful-Version": String(version) } : {},
    body: JSON.stringify(spec),
  });
  await api(`/content_types/${id}/published`, {
    method: "PUT",
    headers: { "X-Contentful-Version": String(result.sys.version) },
  });
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
