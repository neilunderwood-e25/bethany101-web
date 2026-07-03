#!/usr/bin/env node
/*
 * Build the global Header content model in Contentful:
 *   - creates + publishes the `navigationLink` and `header` content types
 *   - uploads + publishes the lotus logo asset
 *   - creates + publishes three nav-link entries and a singleton `header` entry
 *
 * The header is layout chrome (rendered on every page — top of the page, or
 * under the hero on the homepage), NOT a page section, so it is NOT attached to
 * flexiblePage.sections.
 *
 * Re-runnable: everything is upserted by fixed id. Reads .env.local next to it.
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
if (!SPACE || !CMA) {
  console.error("✗ CONTENTFUL_SPACE_ID and CONTENTFUL_MANAGEMENT_TOKEN required in .env.local.");
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
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const upsertContentType = async (id, spec) => {
  let version;
  try {
    version = (await api(`/content_types/${id}`)).sys.version;
  } catch (e) {
    if (e.status !== 404) throw e;
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
  console.log(`✓ content type "${id}" published`);
};

const L = (v) => ({ "en-US": v });
const entryLink = (id) => ({ sys: { type: "Link", linkType: "Entry", id } });
const assetLink = (id) => ({ sys: { type: "Link", linkType: "Asset", id } });

const upsertEntry = async (contentType, id, fields) => {
  let version;
  try {
    version = (await api(`/entries/${id}`)).sys.version;
  } catch (e) {
    if (e.status !== 404) throw e;
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
  console.log(`✓ entry "${id}" published`);
};

// Upload local file bytes → create/process/publish an asset. Re-runnable.
const upsertAssetFromFile = async (id, { title, fileName, contentType, filePath }) => {
  try {
    const existing = await api(`/assets/${id}`);
    if (existing.fields?.file?.["en-US"]?.url) {
      console.log(`✓ asset "${id}" already present`);
      return;
    }
  } catch (e) {
    if (e.status !== 404) throw e;
  }
  // 1) upload raw bytes to the Upload API
  const bytes = readFileSync(filePath);
  const upRes = await fetch(`https://upload.contentful.com/spaces/${SPACE}/uploads`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${CMA}`,
      "Content-Type": "application/octet-stream",
    },
    body: bytes,
  });
  if (!upRes.ok) throw new Error(`upload failed: ${upRes.status}\n${await upRes.text()}`);
  const uploadId = (await upRes.json()).sys.id;

  // 2) create the asset referencing the upload
  const created = await api(`/assets/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      fields: {
        title: { "en-US": title },
        file: {
          "en-US": {
            contentType,
            fileName,
            uploadFrom: { sys: { type: "Link", linkType: "Upload", id: uploadId } },
          },
        },
      },
    }),
  });
  // 3) process, poll until the file url appears, then publish
  await api(`/assets/${id}/files/en-US/process`, {
    method: "PUT",
    headers: { "X-Contentful-Version": String(created.sys.version) },
  });
  let asset;
  for (let i = 0; i < 20; i++) {
    await sleep(1000);
    asset = await api(`/assets/${id}`);
    if (asset.fields?.file?.["en-US"]?.url) break;
  }
  if (!asset?.fields?.file?.["en-US"]?.url) throw new Error(`asset "${id}" did not process`);
  await api(`/assets/${id}/published`, {
    method: "PUT",
    headers: { "X-Contentful-Version": String(asset.sys.version) },
  });
  console.log(`✓ asset "${id}" uploaded + published`);
};

// ---- content types ---------------------------------------------------------
await upsertContentType("navigationLink", {
  name: "Navigation Link",
  description: "A single navigation link: a label and an href.",
  displayField: "label",
  fields: [
    { id: "label", name: "Label", type: "Symbol", required: true },
    { id: "href", name: "Href", type: "Symbol" },
  ],
});

await upsertContentType("header", {
  name: "Header",
  description:
    "Global site header (singleton layout entry): logo, navigation links + a CTA. Rendered on every page — under the hero on the homepage, on top elsewhere. Not a page section.",
  displayField: "internalTitle",
  fields: [
    { id: "internalTitle", name: "Internal Title", type: "Symbol", required: true },
    { id: "logo", name: "Logo", type: "Link", linkType: "Asset" },
    {
      id: "navLinks",
      name: "Nav Links",
      type: "Array",
      items: {
        type: "Link",
        linkType: "Entry",
        validations: [{ linkContentType: ["navigationLink"] }],
      },
    },
    { id: "ctaLabel", name: "CTA Label", type: "Symbol" },
    { id: "ctaHref", name: "CTA Href", type: "Symbol" },
  ],
});

// ---- assets + entries ------------------------------------------------------
await upsertAssetFromFile("headerLogoWebp", {
  title: "VillaBliss logo",
  fileName: "logo.webp",
  contentType: "image/webp",
  filePath: join(scriptDir, "..", "public/assets/images/logo.webp"),
});

const links = [
  { id: "navLinkHome", label: "Home", href: "/" },
  { id: "navLinkActivities", label: "Activities", href: "/activities" },
  { id: "navLinkContact", label: "Contact", href: "/contact" },
];
for (const l of links) {
  await upsertEntry("navigationLink", l.id, { label: L(l.label), href: L(l.href) });
}

await upsertEntry("header", "siteHeader", {
  internalTitle: L("Site Header"),
  logo: L(assetLink("headerLogoWebp")),
  navLinks: L(links.map((l) => entryLink(l.id))),
  ctaLabel: L("Book now"),
  ctaHref: L("/contact"),
});

console.log("\nDone. Header content model + logo asset + singleton entry created.");
