#!/usr/bin/env node
/*
 * Extend the Info content type with the "Aminities" variant and build its
 * sample entry:
 *   - adds the "Aminities" frontEndComponent choice + secondaryHeading and
 *     amenities (JSON [{label,value}]) fields to `info`
 *   - uploads + publishes the villa image
 *   - creates + publishes the `infoAmenities` entry
 *   - appends it to the `home` flexiblePage and republishes the page
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

// ---- extend the info content type (fetch current, merge, publish) ----------
const info = await api(`/content_types/info`);
const fields = info.fields;

// 1) add the variant choice
const fec = fields.find((f) => f.id === "frontEndComponent");
const inRule = fec.validations.find((v) => v.in);
if (!inRule.in.includes("Aminities")) inRule.in.push("Aminities");

// 2) add new fields (idempotent)
const addField = (field) => {
  if (!fields.some((f) => f.id === field.id)) fields.push(field);
};
addField({ id: "secondaryHeading", name: "Secondary Heading", type: "Symbol" });
addField({
  id: "amenities",
  name: "Amenities — JSON: [{ label, value }]",
  type: "Object",
});

const updated = await api(`/content_types/info`, {
  method: "PUT",
  headers: { "X-Contentful-Version": String(info.sys.version) },
  body: JSON.stringify({
    name: info.name,
    description: info.description,
    displayField: info.displayField,
    fields,
  }),
});
await api(`/content_types/info/published`, {
  method: "PUT",
  headers: { "X-Contentful-Version": String(updated.sys.version) },
});
console.log(`✓ content type "info" extended + published (Aminities variant)`);

// ---- villa image asset -------------------------------------------------------
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

await upsertAsset("amenitiesVilla", {
  title: "Villa bedroom skyline",
  fileName: "amenities-villa.jpg",
  contentType: "image/jpeg",
  upload: "https://www.figma.com/api/mcp/asset/4f49a454-a26b-4400-a72d-113d4fe136c4",
});

// ---- entry -------------------------------------------------------------------
const upsertEntry = async (contentType, id, entryFields) => {
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
    body: JSON.stringify({ fields: entryFields }),
  });
  await api(`/entries/${id}/published`, {
    method: "PUT",
    headers: { "X-Contentful-Version": String(result.sys.version) },
  });
  console.log(`✓ entry "${id}" published`);
};

await upsertEntry("info", "infoAmenities", {
  internalTitle: L("Info — Amenities (Aminities)"),
  frontEndComponent: L("Aminities"),
  heading: L("Discover the unique features of your perfect getaway"),
  secondaryHeading: L("Villa details at a glance"),
  image: L(assetLink("amenitiesVilla")),
  ctaLabel: L("Reserve your stay"),
  ctaHref: L("#reserve"),
  amenities: L([
    { label: "Location", value: "Beverly Hills, California" },
    { label: "Total area", value: "4,500 sq ft" },
    { label: "Living space", value: "3,200 sq ft" },
    { label: "Floors", value: "2 Floors" },
    { label: "Built-in year", value: "2018" },
    { label: "Bathrooms", value: "4 Modern Bathrooms" },
    { label: "Bedrooms", value: "5 Luxurious Bedrooms" },
    { label: "Private pool", value: "Infinity Pool (15 x 30 ft)" },
    { label: "Outdoor space", value: "1,200 sq ft of garden and patio areas" },
  ]),
});

// ---- attach to home page ------------------------------------------------------
const home = await api(`/entries/home`);
const current = home.fields?.sections?.["en-US"] ?? [];
const without = current.filter((l) => l?.sys?.id !== "infoAmenities");
const upd = await api(`/entries/home`, {
  method: "PUT",
  headers: {
    "X-Contentful-Content-Type": "flexiblePage",
    "X-Contentful-Version": String(home.sys.version),
  },
  body: JSON.stringify({
    fields: { ...home.fields, sections: L([...without, entryLink("infoAmenities")]) },
  }),
});
await api(`/entries/home/published`, {
  method: "PUT",
  headers: { "X-Contentful-Version": String(upd.sys.version) },
});
console.log("✓ home page updated + published (amenities appended)");
console.log("\nDone.");
