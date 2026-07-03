#!/usr/bin/env node
/*
 * One-shot seed script for the Contentstack stack.
 *
 * Creates (or updates) two content types:
 *   - seo
 *   - flexible_page   (title, url, seo reference — NO sections field; see below)
 *
 * Then creates and publishes two sample entries so the `/` route renders:
 *   - an seo entry         (title "Welcome")
 *   - a flexible_page entry (url = "/", linked to the seo entry)
 *
 * About the missing `sections` field: this scaffold ships no sections, and a
 * Contentstack reference field must list at least one content type in
 * `reference_to`. So we leave `sections` off the seeded content type. When you
 * add your first section (see components/ARCHITECTURE.md), add a `sections`
 * multiple-reference field to `flexible_page` listing your section content
 * types. The page GraphQL query only asks for `sectionsConnection` once the
 * section registry is non-empty, so `/` renders cleanly in the meantime.
 *
 * Env vars (read from .env.local, which sits in the project root next to package.json):
 *   CONTENTSTACK_API_KEY            required — stack API key
 *   CONTENTSTACK_MANAGEMENT_TOKEN   required — CMA management token, write access
 *   CONTENTSTACK_ENVIRONMENT        required — environment to publish to (e.g. development)
 *   CONTENTSTACK_API_HOST           optional, defaults to "api.contentstack.io" (US region)
 *   CONTENTSTACK_BRANCH             optional — stack branch
 *
 * Usage (from anywhere):
 *   node /path/to/project/scripts/seed-contentstack.mjs
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

const API_KEY = process.env.CONTENTSTACK_API_KEY;
const MGMT = process.env.CONTENTSTACK_MANAGEMENT_TOKEN;
const ENVIRONMENT = process.env.CONTENTSTACK_ENVIRONMENT;
const API_HOST = process.env.CONTENTSTACK_API_HOST || "api.contentstack.io";
const BRANCH = process.env.CONTENTSTACK_BRANCH;

if (!API_KEY) {
  console.error("✗ CONTENTSTACK_API_KEY missing from .env.local.");
  process.exit(1);
}
if (!MGMT) {
  console.error(
    "✗ CONTENTSTACK_MANAGEMENT_TOKEN missing from .env.local.\n" +
      "  Generate a management token at:\n" +
      "    Contentstack → Settings → Tokens → Management Tokens\n" +
      "  Then add it to .env.local as:\n" +
      "    CONTENTSTACK_MANAGEMENT_TOKEN=..."
  );
  process.exit(1);
}
if (!ENVIRONMENT) {
  console.error(
    "✗ CONTENTSTACK_ENVIRONMENT missing from .env.local.\n" +
      "  Set it to the environment you publish to, e.g.:\n" +
      "    CONTENTSTACK_ENVIRONMENT=development"
  );
  process.exit(1);
}

const BASE = `https://${API_HOST}/v3`;

const api = async (path, opts = {}) => {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      api_key: API_KEY,
      authorization: MGMT,
      "Content-Type": "application/json",
      ...(BRANCH ? { branch: BRANCH } : {}),
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
  title: "SEO",
  uid: "seo",
  description: "SEO metadata reused on Flexible Page entries.",
  schema: [
    {
      display_name: "Title",
      uid: "title",
      data_type: "text",
      mandatory: true,
      unique: false,
      field_metadata: { _default: true },
      multiple: false,
    },
    {
      display_name: "Description",
      uid: "description",
      data_type: "text",
      field_metadata: { description: "", multiline: true },
      multiple: false,
      mandatory: false,
      unique: false,
    },
    {
      display_name: "OG Image",
      uid: "og_image",
      data_type: "file",
      extensions: [],
      field_metadata: { description: "", rich_text_type: "standard" },
      multiple: false,
      mandatory: false,
      unique: false,
    },
    {
      display_name: "No Index",
      uid: "no_index",
      data_type: "boolean",
      field_metadata: { description: "", default_value: false },
      multiple: false,
      mandatory: false,
      unique: false,
    },
    {
      display_name: "No Follow",
      uid: "no_follow",
      data_type: "boolean",
      field_metadata: { description: "", default_value: false },
      multiple: false,
      mandatory: false,
      unique: false,
    },
    {
      display_name: "Canonical URL",
      uid: "canonical_url",
      data_type: "text",
      field_metadata: { description: "" },
      multiple: false,
      mandatory: false,
      unique: false,
    },
    {
      display_name: "Schema Markup (JSON)",
      uid: "schema_markup",
      data_type: "text",
      field_metadata: { description: "Raw JSON-LD string", multiline: true },
      multiple: false,
      mandatory: false,
      unique: false,
    },
  ],
  options: { is_page: false, singleton: false, title: "title", sub_title: [] },
};

const FLEXIBLE_PAGE_TYPE = {
  title: "Flexible Page",
  uid: "flexible_page",
  description: "A page assembled from a list of section entries, addressed by url.",
  schema: [
    {
      display_name: "Title",
      uid: "title",
      data_type: "text",
      mandatory: true,
      unique: false,
      field_metadata: { _default: true },
      multiple: false,
    },
    {
      display_name: "URL",
      uid: "url",
      data_type: "text",
      mandatory: true,
      unique: true,
      field_metadata: { _default: true },
      multiple: false,
    },
    {
      display_name: "SEO",
      uid: "seo",
      data_type: "reference",
      reference_to: ["seo"],
      field_metadata: { ref_multiple: false },
      mandatory: false,
      multiple: false,
      unique: false,
    },
  ],
  options: {
    is_page: true,
    singleton: false,
    title: "title",
    sub_title: [],
    url_pattern: "/:title",
    url_prefix: "/",
  },
};

const upsertContentType = async (uid, spec) => {
  let exists = false;
  try {
    await api(`/content_types/${uid}`);
    exists = true;
  } catch (e) {
    if (e.status !== 404 && e.status !== 422) throw e;
  }
  if (exists) {
    console.log(`• content type "${uid}" exists → updating`);
    await api(`/content_types/${uid}`, {
      method: "PUT",
      body: JSON.stringify({ content_type: spec }),
    });
  } else {
    console.log(`• content type "${uid}" → creating`);
    await api(`/content_types`, {
      method: "POST",
      body: JSON.stringify({ content_type: spec }),
    });
  }
  console.log(`  ✓ saved "${uid}"`);
};

await upsertContentType("seo", SEO_TYPE);
await upsertContentType("flexible_page", FLEXIBLE_PAGE_TYPE);

// Resolve the stack's master locale (the one with no fallback).
const localesResp = await api("/locales");
const masterLocale =
  localesResp.locales?.find((l) => !l.fallback_locale)?.code ||
  localesResp.locales?.[0]?.code ||
  "en-us";

const findEntryUid = async (contentType, query) => {
  const q = encodeURIComponent(JSON.stringify(query));
  const resp = await api(
    `/content_types/${contentType}/entries?query=${q}&locale=${masterLocale}&limit=1`
  );
  return resp.entries?.[0]?.uid ?? null;
};

const upsertEntry = async (contentType, matchQuery, fields) => {
  const existingUid = await findEntryUid(contentType, matchQuery);
  let uid;
  if (existingUid) {
    console.log(`• ${contentType} entry ${existingUid} exists → updating`);
    await api(
      `/content_types/${contentType}/entries/${existingUid}?locale=${masterLocale}`,
      { method: "PUT", body: JSON.stringify({ entry: fields }) }
    );
    uid = existingUid;
  } else {
    console.log(`• ${contentType} entry → creating`);
    const resp = await api(
      `/content_types/${contentType}/entries?locale=${masterLocale}`,
      { method: "POST", body: JSON.stringify({ entry: fields }) }
    );
    uid = resp.entry.uid;
  }
  await api(`/content_types/${contentType}/entries/${uid}/publish`, {
    method: "POST",
    body: JSON.stringify({
      entry: { environments: [ENVIRONMENT], locales: [masterLocale] },
    }),
  });
  console.log(`  ✓ published ${contentType} entry ${uid}`);
  return uid;
};

const seoUid = await upsertEntry(
  "seo",
  { title: "Welcome" },
  {
    title: "Welcome",
    description: "Sample home page generated by the e25-contentstack-base skill.",
  }
);

await upsertEntry(
  "flexible_page",
  { url: "/" },
  {
    title: "Home",
    url: "/",
    seo: [{ uid: seoUid, _content_type_uid: "seo" }],
  }
);

console.log(
  "\nDone. The stack has Flexible Page + SEO content types and one sample entry at url `/`."
);
console.log("Run `npm run dev` and visit http://localhost:3000 to see it.");
