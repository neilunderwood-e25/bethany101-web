#!/usr/bin/env node
/*
 * Build the Info (Default) section in Contentful:
 *   - creates + publishes the `info` content type
 *   - uploads + publishes the portrait + landscape images
 *   - creates + publishes a sample `info` entry
 *   - appends it to the `home` flexiblePage's sections and republishes the page
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
  console.error("✗ CONTENTFUL_SPACE_ID and CONTENTFUL_MANAGEMENT_TOKEN required.");
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
const L = (v) => ({ "en-US": v });
const assetLink = (id) => ({ sys: { type: "Link", linkType: "Asset", id } });
const entryLink = (id) => ({ sys: { type: "Link", linkType: "Entry", id } });

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

const upsertAsset = async (id, { title, fileName, contentType, upload }) => {
  try {
    const existing = await api(`/assets/${id}`);
    if (existing.fields?.file?.["en-US"]?.url) {
      console.log(`✓ asset "${id}" already present`);
      return;
    }
  } catch (e) {
    if (e.status !== 404) throw e;
  }
  const created = await api(`/assets/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      fields: {
        title: { "en-US": title },
        file: { "en-US": { contentType, fileName, upload } },
      },
    }),
  });
  await api(`/assets/${id}/files/en-US/process`, {
    method: "PUT",
    headers: { "X-Contentful-Version": String(created.sys.version) },
  });
  let asset;
  for (let i = 0; i < 25; i++) {
    await sleep(1000);
    asset = await api(`/assets/${id}`);
    if (asset.fields?.file?.["en-US"]?.url) break;
  }
  if (!asset?.fields?.file?.["en-US"]?.url) throw new Error(`asset "${id}" did not process`);
  await api(`/assets/${id}/published`, {
    method: "PUT",
    headers: { "X-Contentful-Version": String(asset.sys.version) },
  });
  console.log(`✓ asset "${id}" processed + published`);
};

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

// ---- content type ----------------------------------------------------------
await upsertContentType("info", {
  name: "Info",
  description:
    "Editorial info section: a large heading, a portrait image, body copy + CTA, and a full-bleed secondary image. Variants via frontEndComponent.",
  displayField: "internalTitle",
  fields: [
    { id: "internalTitle", name: "Internal Title", type: "Symbol", required: true },
    {
      id: "frontEndComponent",
      name: "Front End Component",
      type: "Symbol",
      validations: [{ in: ["Default"] }],
    },
    { id: "sectionId", name: "Section ID", type: "Symbol" },
    { id: "heading", name: "Heading", type: "Symbol" },
    { id: "body", name: "Body", type: "Text" },
    {
      id: "image",
      name: "Image (Portrait)",
      type: "Link",
      linkType: "Asset",
      validations: [{ linkMimetypeGroup: ["image"] }],
    },
    {
      id: "secondaryImage",
      name: "Secondary Image (Landscape)",
      type: "Link",
      linkType: "Asset",
      validations: [{ linkMimetypeGroup: ["image"] }],
    },
    { id: "ctaLabel", name: "CTA Label", type: "Symbol" },
    { id: "ctaHref", name: "CTA Href", type: "Symbol" },
  ],
});

// ---- assets ----------------------------------------------------------------
await upsertAsset("infoBedroom", {
  title: "Villa bedroom",
  fileName: "info-bedroom.png",
  contentType: "image/png",
  upload: "https://www.figma.com/api/mcp/asset/ab26f6ca-d14e-449d-a89c-ea5f00a36bb9",
});
await upsertAsset("infoLiving", {
  title: "Villa living space",
  fileName: "info-living.jpg",
  contentType: "image/jpeg",
  upload: "https://www.figma.com/api/mcp/asset/68354b3a-e8f9-4142-8733-2e99e20d0cb6",
});

// ---- entry -----------------------------------------------------------------
await upsertEntry("info", "infoWelcome", {
  internalTitle: L("Info — Welcome (Default)"),
  frontEndComponent: L("Default"),
  heading: L("Welcome to a villa where every detail inspires relaxation"),
  body: L(
    "Nestled in the heart of tranquility, our villa offers a perfect escape from " +
      "the ordinary. Designed with elegance and comfort in mind, it features luxurious " +
      "interiors, breathtaking views, and top-tier amenities to make your stay " +
      "unforgettable. Whether you are seeking a serene getaway or a place to celebrate " +
      "life's special moments, our villa is your ultimate destination."
  ),
  image: L(assetLink("infoBedroom")),
  secondaryImage: L(assetLink("infoLiving")),
  ctaLabel: L("View Image Gallery"),
  ctaHref: L("#gallery"),
});

// ---- attach to home page (append after existing sections, de-duped) --------
const home = await api(`/entries/home`);
const current = home.fields?.sections?.["en-US"] ?? [];
const withoutInfo = current.filter((l) => l?.sys?.id !== "infoWelcome");
const nextSections = [...withoutInfo, entryLink("infoWelcome")];
const updated = await api(`/entries/home`, {
  method: "PUT",
  headers: {
    "X-Contentful-Content-Type": "flexiblePage",
    "X-Contentful-Version": String(home.sys.version),
  },
  body: JSON.stringify({ fields: { ...home.fields, sections: L(nextSections) } }),
});
await api(`/entries/home/published`, {
  method: "PUT",
  headers: { "X-Contentful-Version": String(updated.sys.version) },
});
console.log("✓ home page updated + published (info appended)");
console.log("\nDone.");
